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

  return digest === cleanSignature;
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
    
    console.log(`[CAKTO] Processando evento: ${event} | Status: ${status} | E-mail: ${email} | DesiredIsPro: ${desiredIsPro}`);

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
        payload: payload,
      });

    if (idempotencyError) {
      if (idempotencyError.code === "23505") { // Código Postgres para Unique Violation
        console.log(`[CAKTO] Evento ${eventId} já processado.`);
        return res.status(200).json({ ok: true, message: "Evento já processado" });
      }
      throw idempotencyError;
    }

    // 3. Localizar Usuário de forma confiável na versão 2.106.2
    // Como getUserByEmail não existe, usamos listUsers com paginação se necessário,
    // mas listUsers do Supabase Admin API suporta busca eficiente.
    const { data: usersData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("[CAKTO] Erro ao listar usuários no Auth:", authError.message);
      throw authError;
    }

    // Localiza o usuário pelo e-mail na lista retornada
    const targetUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!targetUser) {
      console.warn("[CAKTO] Usuário não encontrado no Supabase Auth para o email:", email);
      return res.status(200).json({ ok: true, ignored: true, reason: "user_not_found_in_auth" });
    }

    const userId = targetUser.id;

    // 4. Localizar/Criar Perfil de forma confiável
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, is_pro, name, level, xp, streak")
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
        name: targetUser.user_metadata?.name || email.split("@")[0] || "Usuário",
        level: 1,
        xp: 0,
        streak: 0,
      });
      if (insertError) throw insertError;
    } else {
      // Atualizar status PRO se o perfil já existir
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_pro: desiredIsPro })
        .eq("id", userId);
      if (updateError) throw updateError;
    }

    console.log(`[CAKTO] Sucesso: Perfil ${userId} (${email}) atualizado para PRO: ${desiredIsPro}`);
    return res.status(200).json({ ok: true, email, isPro: desiredIsPro });

  } catch (error: any) {
    console.error("[CAKTO ERROR]", error);
    return res.status(500).json({ ok: false, error: "Erro interno de processamento do webhook" });
  }
}
