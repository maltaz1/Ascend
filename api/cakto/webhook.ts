import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CAKTO_WEBHOOK_SECRET = process.env.CAKTO_WEBHOOK_SECRET;

// Máximo de idade aceitável para o timestamp do evento (5 minutos).
// Impede replay attacks: um atacante que interceptar uma assinatura
// válida não consegue reutilizá-la após a janela expirar.
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function getRawBody(readable: any): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(payload).digest("hex");
  
  // Trata tanto a assinatura pura quanto a prefixada com 'sha256='
  const cleanSignature = signature.startsWith("sha256=") 
    ? signature.substring(7) 
    : signature;

  // Comparação em tempo constante (evita descobrir a assinatura por timing).
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(cleanSignature, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// "fulano@gmail.com" -> "fu***@gmail.com" (logs sem dado pessoal completo).
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

// Guarda só o necessário para auditoria/idempotência. O payload completo
// da Cakto traz dados pessoais do comprador (CPF, telefone, endereço...).
function minimalPayload(payload: any) {
  const data = payload?.data ?? {};
  return {
    id: payload?.id ?? null,
    event: payload?.event ?? null,
    status: data.status ?? null,
    order_id: data.id ?? null,
    product_id: data.product?.id ?? data.offer?.product ?? null,
    offer_id: data.offer?.id ?? null,
    amount: data.amount ?? data.baseAmount ?? null,
    payment_method: data.paymentMethod ?? null,
  };
}

function determineIsPro(event: string, status: string): boolean | null {
  const normalizedEvent = event.toLowerCase();
  const normalizedStatus = status.toLowerCase();

  if (
    normalizedEvent.includes("purchase") ||
    normalizedEvent.includes("payment") ||
    normalizedEvent.includes("subscription") ||
    normalizedEvent.includes("renew")
  ) {
    if (
      ["paid", "approved", "active", "completed"].includes(normalizedStatus)
    ) {
      return true;
    }
  }

  if (
    normalizedEvent.includes("refund") ||
    normalizedEvent.includes("cancel") ||
    normalizedEvent.includes("chargeback") ||
    normalizedEvent.includes("expired")
  ) {
    return false;
  }

  return null;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Método não permitido" });
    }

    // 1. Segurança Estrita (Obrigatória)
    if (!CAKTO_WEBHOOK_SECRET) {
      console.error("[CAKTO CRITICAL] CAKTO_WEBHOOK_SECRET não configurado.");
      return res.status(500).json({ ok: false, error: "Erro de configuração de segurança" });
    }

    const rawBody = await getRawBody(req);
    const bodyString = rawBody.toString("utf-8");
    const signature = req.headers["x-cakto-signature"];

    if (!signature || !verifySignature(bodyString, signature as string, CAKTO_WEBHOOK_SECRET)) {
      console.error("[CAKTO] Assinatura inválida ou ausente");
      return res.status(401).json({ ok: false, error: "Não autorizado" });
    }

    // 1b. Validação de timestamp (anti-replay).
    // O header X-Cakto-Timestamp é enviado pela Cakto em segundos.
    // Se ausente (proteção contra erros de integração), aceitamos o
    // evento mas registramos um aviso.
    const tsHeader = req.headers["x-cakto-timestamp"];
    if (tsHeader) {
      const eventTimeMs = Number(tsHeader) * 1000;
      if (!Number.isFinite(eventTimeMs) || eventTimeMs <= 0) {
        console.warn("[CAKTO] X-Cakto-Timestamp inválido:", tsHeader);
        return res
          .status(400)
          .json({ ok: false, error: "Timestamp do evento inválido" });
      }
      const ageMs = Math.abs(Date.now() - eventTimeMs);
      if (ageMs > MAX_TIMESTAMP_AGE_MS) {
        console.error(
          `[CAKTO] Evento muito antigo (${Math.round(
            ageMs / 1000
          )}s) — possível replay`
        );
        return res
          .status(400)
          .json({ ok: false, error: "Evento expirado (replay detectado)" });
      }
    } else {
      console.warn("[CAKTO] X-Cakto-Timestamp ausente — assumindo confiabilidade da fonte");
    }

    const payload = JSON.parse(bodyString);
    const event = (payload.event || "unknown").toLowerCase();
    const data = payload.data || {};
    const email = data.customer?.email?.trim();
    
    // Identificador único do evento na Cakto para idempotência
    const eventId = payload.id; 

    if (!eventId) {
      return res.status(400).json({ ok: false, error: "ID do evento ausente no payload" });
    }

    if (!email) {
      return res.status(400).json({ ok: false, error: "Email do cliente ausente" });
    }

    const status = (data.status || "unknown").toLowerCase();
    const desiredIsPro = determineIsPro(event, status);
    
    console.log(`[CAKTO] Processando evento: ${event} | Status: ${status} | E-mail: ${maskEmail(email)} | DesiredIsPro: ${desiredIsPro}`);

    if (desiredIsPro === null) {
      console.log(`[CAKTO] Evento ignorado (não relevante para status PRO): ${event}`);
      return res.status(200).json({ ok: true, ignored: true, reason: "event_not_relevant" });
    }

    // 2. Idempotência Robusta (Simultaneidade)
    // Tentamos inserir o evento primeiro. Se falhar por duplicidade (Unique Constraint), o evento já foi processado.
    const { error: idempotencyError } = await supabase
      .from("cakto_webhook_events")
      .insert({
        event_id: eventId,
        event_type: event,
        status: status,
        customer_email: email,
        payload: minimalPayload(payload),
      });

    if (idempotencyError) {
      if (idempotencyError.code === "23505") { // Código Postgres para Unique Violation
        console.log(`[CAKTO] Evento ${eventId} já processado.`);
        return res.status(200).json({ ok: true, message: "Evento já processado" });
      }
      throw idempotencyError;
    }

    // 3. Localizar o usuário pelo e-mail direto no auth.users.
    // (auth.admin.listUsers() é paginado e só devolvia os 50 primeiros.)
    const { data: userId, error: lookupError } = await supabase.rpc("get_user_id_by_email", {
      p_email: email,
    });

    if (lookupError) {
      console.error("[CAKTO] Erro ao buscar usuário por e-mail:", lookupError.code);
      throw lookupError;
    }

    if (!userId) {
      console.warn("[CAKTO] Usuário não encontrado no Supabase Auth para o email:", maskEmail(email));
      return res.status(200).json({ ok: true, ignored: true, reason: "user_not_found_in_auth" });
    }

    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    const targetUser = authData?.user;

    // 4. Localizar/Criar Perfil de forma confiável
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_pro, pro_source, name, level, xp, streak")
      .eq("id", userId)
      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      throw profileError;
    }

    if (!profile) {
      // Criar profile se não existir (garantir que todo usuário tenha um perfil)
      console.log("[CAKTO] Criando perfil para o usuário:", userId);
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        is_pro: desiredIsPro,
        pro_source: desiredIsPro ? "cakto" : null,
        name: targetUser?.user_metadata?.name || email.split("@")[0] || "Usuário",
        level: 1,
        xp: 0,
        streak: 0,
      });
      if (insertError) throw insertError;
    } else if (!desiredIsPro && (profile.pro_source === "store" || profile.pro_source === "founder")) {
      // PRO atual veio da loja (quem desliga é o webhook do RevenueCat) ou dos
      // mês grátis de fundador (quem desliga é o sync_founder no fim do prazo).
      console.log(`[CAKTO] Mantendo PRO de ${userId}: origem ${profile.pro_source}`);
      return res.status(200).json({ ok: true, ignored: true, reason: `pro_from_${profile.pro_source}` });
    } else {
      // Atualizar status PRO se o perfil já existir
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_pro: desiredIsPro, pro_source: desiredIsPro ? "cakto" : null })
        .eq("id", userId);
      if (updateError) throw updateError;
    }

    console.log(`[CAKTO] Sucesso: Perfil ${userId} atualizado para PRO: ${desiredIsPro}`);
    return res.status(200).json({ ok: true, isPro: desiredIsPro });

  } catch (error: any) {
    console.error("[CAKTO ERROR]", error?.code ?? error?.name ?? "erro", error?.message ?? "");
    return res.status(500).json({ ok: false, error: "Erro interno de processamento do webhook" });
  }
}
