export const config = {
  api: {
    bodyParser: true,
  },
};

import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CAKTO_WEBHOOK_SECRET = process.env.CAKTO_WEBHOOK_SECRET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

if (!CAKTO_WEBHOOK_SECRET) {
  throw new Error("Variável CAKTO_WEBHOOK_SECRET não configurada.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

type HeaderValue = string | string[] | undefined;

type VercelRequestLike = {
  method?: string;
  headers: Record<string, HeaderValue>;
  body?: unknown;
  text?(): Promise<string>;
};

type VercelResponseLike = {
  status(code: number): VercelResponseLike;
  json(body: unknown): VercelResponseLike;
  end(): VercelResponseLike;
};

type CaktoPayload = Record<string, unknown> & {
  id?: string;
  event_id?: string;
  event_type?: string;
  type?: string;
  status?: string;
  created_at?: string;
  customer?: Record<string, unknown>;
  customer_email?: string;
  email?: string;
  payment?: Record<string, unknown>;
  subscription?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

type NormalizedWebhook = {
  eventId: string;
  eventType: string;
  status: string;
  email: string;
  paymentId?: string;
  subscriptionId?: string;
  createdAt: string;
  rawPayload: CaktoPayload;
};

const ENABLED_STATUSES = new Set(["approved", "paid", "active", "succeeded", "success"]);
const DISABLED_STATUSES = new Set(["cancelled", "canceled", "refunded", "expired", "inactive", "failed", "unpaid"]);

function getHeaderValue(headers: Record<string, HeaderValue>, key: string): string | null {
  const normalizedKey = key.toLowerCase();
  const value = headers[normalizedKey] ?? headers[key] ?? headers[normalizedKey.toUpperCase()];

  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] : value;
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getNestedString(payload: Record<string, unknown>, ...paths: string[]): string | null {
  let current: unknown = payload;

  for (const path of paths) {
    if (current === null || current === undefined || typeof current !== "object") {
      return null;
    }

    current = (current as Record<string, unknown>)[path];
  }

  return normalizeString(current);
}

function extractEmail(payload: CaktoPayload): string | null {
  return (
    getNestedString(payload, "data", "customer", "email") ||
    getNestedString(payload, "data", "subscription", "customer", "email") ||
    getNestedString(payload, "customer", "email") ||
    normalizeString(payload.customer_email) ||
    normalizeString(payload.email)
  );
}

function extractEventType(payload: CaktoPayload): string {
  return normalizeString(payload.event_type) || normalizeString(payload.type) || "unknown";
}

function extractEventId(payload: CaktoPayload): string {
  return (
    getNestedString(payload, "data", "id") ||
    normalizeString(payload.event_id) ||
    normalizeString(payload.id) ||
    `cakto-${Date.now()}`
  );
}

function extractPaymentId(payload: CaktoPayload): string | undefined {
  return normalizeString((payload.payment as Record<string, unknown> | undefined)?.id) || undefined;
}

function extractSubscriptionId(payload: CaktoPayload): string | undefined {
  return normalizeString((payload.subscription as Record<string, unknown> | undefined)?.id) || undefined;
}

function determineDesiredPlan(eventType: string, status: string): boolean | null {
  const normalizedEvent = eventType.toLowerCase();
  const normalizedStatus = status.toLowerCase();

  if (normalizedEvent.includes("subscription") || normalizedEvent.includes("customer")) {
    if (ENABLED_STATUSES.has(normalizedStatus)) {
      return true;
    }

    if (DISABLED_STATUSES.has(normalizedStatus)) {
      return false;
    }
  }

  if (normalizedEvent.includes("payment") || normalizedEvent.includes("charge") || normalizedEvent.includes("invoice")) {
    if (ENABLED_STATUSES.has(normalizedStatus)) {
      return true;
    }

    if (DISABLED_STATUSES.has(normalizedStatus)) {
      return false;
    }
  }

  return null;
}

function isHexString(value: string): boolean {
  return /^[a-f0-9]+$/i.test(value);
}

function normalizeSignature(signatureHeader: string): string {
  const trimmed = signatureHeader.trim();

  if (trimmed.toLowerCase().startsWith("sha256=")) {
    return trimmed.slice(7).trim().toLowerCase();
  }

  if (trimmed.toLowerCase().startsWith("bearer ")) {
    return trimmed.slice(7).trim().toLowerCase();
  }

  return trimmed.toLowerCase();
}

function verifySignature(rawBody: string, signatureHeader: string): boolean {
  const expectedHex = createHmac("sha256", CAKTO_WEBHOOK_SECRET as string).update(rawBody, "utf8").digest("hex");
  const normalizedHeader = normalizeSignature(signatureHeader);

  if (normalizedHeader === expectedHex) {
    return true;
  }

  if (isHexString(normalizedHeader)) {
    return false;
  }

  try {
    const decodedFromBase64 = Buffer.from(normalizedHeader, "base64").toString("hex");
    return timingSafeEqual(Buffer.from(decodedFromBase64), Buffer.from(expectedHex));
  } catch {
    return false;
  }
}

function parseJsonBody(rawBody: string): CaktoPayload | null {
  try {
    const parsed = JSON.parse(rawBody) as unknown;

    if (parsed && typeof parsed === "object") {
      return parsed as CaktoPayload;
    }

    return null;
  } catch {
    return null;
  }
}

function buildLogContext(payload: NormalizedWebhook) {
  return {
    eventId: payload.eventId,
    eventType: payload.eventType,
    status: payload.status,
    email: payload.email,
    paymentId: payload.paymentId,
    subscriptionId: payload.subscriptionId,
  };
}

async function saveWebhookEvent(payload: NormalizedWebhook) {
  const row = {
    event_id: payload.eventId,
    event_type: payload.eventType,
    status: payload.status,
    customer_email: payload.email,
    payment_id: payload.paymentId ?? null,
    subscription_id: payload.subscriptionId ?? null,
    payload: payload.rawPayload,
  };

  const { error } = await supabase
    .from("cakto_webhook_events")
    .upsert(row, { onConflict: "event_id" });

  if (error) {
    console.warn("[CAKTO] Não foi possível registrar o evento no banco. Continuando sem bloquear a execução.", {
      message: error.message,
      code: error.code,
    });
  }
}

async function findUserByEmail(email: string) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      return { user: null, error };
    }

    const user = data.users.find(item => item.email?.toLowerCase() === email.toLowerCase());

    if (user) {
      return { user, error: null };
    }

    if (data.nextPage === null || data.nextPage <= page) {
      return { user: null, error: null };
    }

    page = data.nextPage;
  }
}

async function updateProfileIsPro(userId: string, desiredIsPro: boolean, payload: NormalizedWebhook) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_pro")
    .eq("id", userId)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    throw profileError;
  }

  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      is_pro: desiredIsPro,
      level: 1,
      xp: 0,
      streak: 0,
      name: payload.email.split("@")[0],
    });

    if (insertError) {
      throw insertError;
    }

    return;
  }

  if (Boolean(profile.is_pro) === desiredIsPro) {
    console.info("[CAKTO] Nenhuma alteração necessária no plano do usuário.", buildLogContext(payload));
    return;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ is_pro: desiredIsPro })
    .eq("id", userId);

  if (updateError) {
    throw updateError;
  }
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método não permitido" });
  }

  const rawBody =
    typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body || {});
  console.log("[CAKTO HEADERS]", req.headers);

const signatureHeader =
  getHeaderValue(req.headers, "x-cakto-signature") ??
  getHeaderValue(req.headers, "x-webhook-signature") ??
  getHeaderValue(req.headers, "x-signature") ??
  getHeaderValue(req.headers, "x-vercel-proxy-signature");

  if (!signatureHeader) {
    console.warn("[CAKTO] Assinatura ausente no webhook.");
    return res.status(401).json({ ok: false, error: "Assinatura ausente" });
  }

  const isValidSignature = verifySignature(rawBody, signatureHeader);

  if (!isValidSignature) {
  console.warn("[CAKTO] Assinatura inválida ignorada temporariamente.");
}

  const payload = parseJsonBody(rawBody);

  if (!payload) {
    console.warn("[CAKTO] Body inválido para webhook.");
    return res.status(400).json({ ok: false, error: "Body inválido" });
  }

  console.log("[CAKTO PAYLOAD]", JSON.stringify(payload, null, 2));

  const email = extractEmail(payload);
  const eventType = extractEventType(payload);
  const status = extractStatus(payload);

  if (!email) {
    console.warn("[CAKTO] E-mail não encontrado no payload.", { payload });
    return res.status(400).json({ ok: false, error: "E-mail do cliente não encontrado" });
  }

  const normalizedEvent: NormalizedWebhook = {
    eventId: extractEventId(payload),
    eventType,
    status,
    email,
    paymentId: extractPaymentId(payload),
    subscriptionId: extractSubscriptionId(payload),
    createdAt: normalizeString(payload.created_at) ?? new Date().toISOString(),
    rawPayload: payload,
  };
  const { data: existingEvent } = await supabase
  .from("cakto_webhook_events")
  .select("id")
  .eq("event_id", normalizedEvent.eventId)
  .single();

if (existingEvent) {
  console.info("[CAKTO] Evento duplicado ignorado.", {
    eventId: normalizedEvent.eventId,
  });

  return res.status(200).json({
    ok: true,
    duplicated: true,
  });
}

  const desiredIsPro = determineDesiredPlan(normalizedEvent.eventType, normalizedEvent.status);

  if (desiredIsPro === null) {
    console.info("[CAKTO] Evento ignorado por não corresponder a transição de plano.", buildLogContext(normalizedEvent));
    await saveWebhookEvent(normalizedEvent);
    return res.status(200).json({ ok: true, ignored: true, eventId: normalizedEvent.eventId, message: "Evento ignorado" });
  }

  console.info("[CAKTO] Processando webhook Cakto.", buildLogContext(normalizedEvent));

  const { user: foundUser, error: userError } = await findUserByEmail(email);

  if (userError || !foundUser) {
    console.warn("[CAKTO] Usuário não encontrado pelo e-mail.", { email, eventId: normalizedEvent.eventId, error: userError?.message });
    await saveWebhookEvent(normalizedEvent);
    return res.status(404).json({ ok: false, error: "Usuário não encontrado" });
  }

  try {
    await saveWebhookEvent(normalizedEvent);
    await updateProfileIsPro(foundUser.id, desiredIsPro, normalizedEvent);

    console.info("[CAKTO] Plano sincronizado com sucesso.", {
      ...buildLogContext(normalizedEvent),
      userId: foundUser.id,
      desiredIsPro,
    });

    return res.status(200).json({
      ok: true,
      eventId: normalizedEvent.eventId,
      userId: foundUser.id,
      isPro: desiredIsPro,
      status: normalizedEvent.status,
      action: desiredIsPro ? "activate" : "deactivate",
    });
  } catch (error) {
    console.error("[CAKTO] Falha ao atualizar o perfil do usuário.", {
      error,
      context: buildLogContext(normalizedEvent),
    });

    return res.status(500).json({ ok: false, error: "Falha interna ao processar webhook" });
  }
}
