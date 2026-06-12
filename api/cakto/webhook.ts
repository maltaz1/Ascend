export const config = {
  api: {
    bodyParser: true,
  },
};

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
};

type VercelResponseLike = {
  status(code: number): VercelResponseLike;
  json(body: unknown): VercelResponseLike;
};

type PayloadData = {
  id?: string;
  status?: string;
  customer?: {
    email?: string;
  };
  subscription?: {
    id?: string;
  };
};

type CaktoPayload = {
  event?: string;
  secret?: string;
  data?: PayloadData;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
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
      normalizedStatus === "paid" ||
      normalizedStatus === "approved" ||
      normalizedStatus === "active"
    ) {
      return true;
    }
  }

  if (
    normalizedEvent.includes("refund") ||
    normalizedEvent.includes("cancel") ||
    normalizedEvent.includes("chargeback")
  ) {
    return false;
  }

  return null;
}

async function findUserByEmail(email: string) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (user) {
      return user;
    }

    if (!data.nextPage || data.nextPage <= page) {
      return null;
    }

    page = data.nextPage;
  }
}

export default async function handler(
  req: VercelRequestLike,
  res: VercelResponseLike
) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Método não permitido",
      });
    }

    console.log("[CAKTO HEADERS]", req.headers);
    console.log("[CAKTO PAYLOAD]", req.body);

    const payload = req.body as CaktoPayload;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({
        ok: false,
        error: "Payload inválido",
      });
    }

    const event = normalizeString(payload.event) || "unknown";

    const data = payload.data || {};

    const email = normalizeString(data.customer?.email);

    const status = normalizeString(data.status) || "unknown";

    if (!email) {
      console.warn("[CAKTO] Usuário sem email");

      return res.status(400).json({
        ok: false,
        error: "Email não encontrado",
      });
    }

    const desiredIsPro = determineIsPro(event, status);

    if (desiredIsPro === null) {
      console.log("[CAKTO] Evento ignorado", {
        event,
        status,
      });

      return res.status(200).json({
        ok: true,
        ignored: true,
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      console.warn("[CAKTO] Usuário não encontrado", {
        email,
      });

      return res.status(200).json({
        ok: true,
        ignored: true,
        reason: "user_not_found",
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_pro")
      .eq("id", user.id)
      .single();

    if (!profile) {
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        is_pro: desiredIsPro,
        level: 1,
        xp: 0,
        streak: 0,
        name: email.split("@")[0],
      });

      if (insertError) {
        throw insertError;
      }
    } else {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_pro: desiredIsPro,
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }
    }

    console.log("[CAKTO] Plano atualizado", {
      email,
      isPro: desiredIsPro,
    });

    return res.status(200).json({
      ok: true,
      email,
      isPro: desiredIsPro,
    });
  } catch (error) {
    console.error("[CAKTO ERROR]", error);

    return res.status(500).json({
      ok: false,
      error: "Erro interno",
    });
  }
}
