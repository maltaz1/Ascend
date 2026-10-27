import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Webhook do RevenueCat: assinaturas PRO feitas no app (Google Play / App Store).
// O app identifica o comprador no RevenueCat com o id do usuário no Supabase,
// então app_user_id === profiles.id.

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Valor do "Authorization header" configurado no webhook do painel do RevenueCat.
const REVENUECAT_WEBHOOK_AUTH = process.env.REVENUECAT_WEBHOOK_AUTH;
// Chave secreta (sk_...) da API REST do RevenueCat — nunca vai para o app.
const REVENUECAT_SECRET_API_KEY = process.env.REVENUECAT_SECRET_API_KEY;
// Identificador do entitlement criado no painel do RevenueCat.
const PRO_ENTITLEMENT = process.env.REVENUECAT_PRO_ENTITLEMENT || "pro";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function isAuthorized(header: unknown, expected: string): boolean {
  if (typeof header !== "string") return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Em vez de interpretar cada tipo de evento (compra, renovação, cancelamento
// que só vale no fim do período, reembolso, problema de cobrança...), pergunta
// ao RevenueCat se o entitlement PRO está ativo agora. Assim o resultado é
// sempre o estado atual, mesmo se os eventos chegarem fora de ordem.
async function hasActivePro(appUserId: string): Promise<boolean> {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}` } }
  );
  if (!response.ok) {
    throw new Error(`RevenueCat respondeu ${response.status} para ${appUserId}`);
  }
  const body = await response.json();
  const entitlement = body?.subscriber?.entitlements?.[PRO_ENTITLEMENT];
  if (!entitlement) return false;
  // expires_date null = vitalício
  if (!entitlement.expires_date) return true;
  return new Date(entitlement.expires_date).getTime() > Date.now();
}

// Liga/desliga o PRO vindo da loja sem mexer em quem é PRO pelo site (Cakto).
async function syncStorePro(userId: string): Promise<string> {
  const active = await hasActivePro(userId);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_pro, pro_source")
    .eq("id", userId)
    .maybeSingle();

  if (profileError && profileError.code !== "PGRST116") throw profileError;

  if (!profile) {
    if (!active) return "no_profile_inactive";
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    if (authError || !authData?.user) {
      console.warn("[REVENUECAT] Usuário não encontrado no Supabase Auth:", userId);
      return "user_not_found_in_auth";
    }
    const user = authData.user;
    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      is_pro: true,
      pro_source: "store",
      name: user.user_metadata?.name || user.email?.split("@")[0] || "Usuário",
      level: 1,
      xp: 0,
      streak: 0,
    });
    if (insertError) throw insertError;
    return "created_pro";
  }

  if (active) {
    // Já é PRO pelo site: mantém a origem Cakto, que é quem vai desligar depois.
    if (profile.is_pro && profile.pro_source !== "store") return "already_pro_other_source";
    if (profile.is_pro) return "unchanged";
    const { error } = await supabase
      .from("profiles")
      .update({ is_pro: true, pro_source: "store" })
      .eq("id", userId);
    if (error) throw error;
    return "activated";
  }

  if (profile.is_pro && profile.pro_source === "store") {
    const { error } = await supabase
      .from("profiles")
      .update({ is_pro: false, pro_source: null })
      .eq("id", userId);
    if (error) throw error;
    return "deactivated";
  }
  return "unchanged";
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Método não permitido" });
    }

    if (!REVENUECAT_WEBHOOK_AUTH || !REVENUECAT_SECRET_API_KEY) {
      console.error("[REVENUECAT CRITICAL] REVENUECAT_WEBHOOK_AUTH ou REVENUECAT_SECRET_API_KEY não configurado.");
      return res.status(500).json({ ok: false, error: "Erro de configuração de segurança" });
    }

    if (!isAuthorized(req.headers["authorization"], REVENUECAT_WEBHOOK_AUTH)) {
      console.error("[REVENUECAT] Authorization inválido ou ausente");
      return res.status(401).json({ ok: false, error: "Não autorizado" });
    }

    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const event = payload?.event;
    if (!event?.id || !event?.type) {
      return res.status(400).json({ ok: false, error: "Evento inválido" });
    }

    const eventType = String(event.type);
    if (eventType === "TEST") {
      return res.status(200).json({ ok: true, test: true });
    }

    // Idempotência: o RevenueCat reenvia eventos quando não recebe 200.
    const { error: idempotencyError } = await supabase
      .from("revenuecat_webhook_events")
      .insert({
        event_id: event.id,
        event_type: eventType,
        app_user_id: event.app_user_id ?? null,
        environment: event.environment ?? null,
        payload,
      });

    if (idempotencyError) {
      if (idempotencyError.code === "23505") {
        console.log(`[REVENUECAT] Evento ${event.id} já processado.`);
        return res.status(200).json({ ok: true, message: "Evento já processado" });
      }
      throw idempotencyError;
    }

    // TRANSFER move a compra de uma conta para outra (ex.: "restaurar compras"
    // logado em outro usuário): as duas pontas precisam ser reavaliadas.
    const candidates: string[] =
      eventType === "TRANSFER"
        ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
        : [event.app_user_id];

    // Ids anônimos do RevenueCat ($RCAnonymousID:...) não têm conta no Supabase.
    const userIds = Array.from(new Set(candidates.filter(id => typeof id === "string" && UUID_RE.test(id))));

    const results: Record<string, string> = {};
    try {
      for (const userId of userIds) {
        results[userId] = await syncStorePro(userId);
      }
    } catch (error) {
      // Libera o evento para o reenvio do RevenueCat processar de novo.
      await supabase.from("revenuecat_webhook_events").delete().eq("event_id", event.id);
      throw error;
    }

    console.log(`[REVENUECAT] ${eventType} (${event.environment}) →`, results);
    return res.status(200).json({ ok: true, results });
  } catch (error: any) {
    console.error("[REVENUECAT ERROR]", error);
    return res.status(500).json({ ok: false, error: "Erro interno de processamento do webhook" });
  }
}
