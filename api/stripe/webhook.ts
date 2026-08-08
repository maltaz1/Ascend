import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false,
  },
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Variáveis obrigatórias da Stripe/Supabase não configuradas.");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia" as any,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function getRawBody(readable: AsyncIterable<Buffer | string>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

function getCustomerId(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

async function getCustomerEmail(payload: Record<string, any>): Promise<string | null> {
  const directEmail =
    payload.customer_details?.email ||
    payload.customer_email ||
    payload.email;

  if (typeof directEmail === "string" && directEmail.trim()) {
    return directEmail.trim().toLowerCase();
  }

  const customerId = getCustomerId(payload.customer);
  if (!customerId) return null;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  return customer.email?.trim().toLowerCase() || null;
}

function getDesiredIsPro(eventType: string, payload: Record<string, any>): boolean | null {
  switch (eventType) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const paymentStatus = payload.payment_status || payload.status;
      return ["paid", "complete"].includes(paymentStatus) ? true : null;
    }

    case "invoice.paid":
      return true;

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      if (["active", "trialing"].includes(payload.status)) return true;
      if (["canceled", "unpaid", "incomplete_expired"].includes(payload.status)) return false;
      return null;
    }

    case "customer.subscription.deleted":
    case "invoice.payment_failed":
      return false;

    default:
      return null;
  }
}

async function findAuthUserByEmail(email: string) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  return data.users.find(
    (user) => user.email?.trim().toLowerCase() === email,
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    return res.status(400).json({ error: "Missing Stripe signature" });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET!);
  } catch (error: any) {
    console.error(`[STRIPE] Falha na assinatura do webhook: ${error.message}`);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  const payload = event.data.object as Record<string, any>;
  const desiredIsPro = getDesiredIsPro(event.type, payload);

  // Eventos que não alteram o plano não precisam ser persistidos nem processados.
  if (desiredIsPro === null) {
    return res.status(200).json({ received: true, ignored: true });
  }

  try {
    // O Checkout Session usa customer_details.email. A versão anterior não lia esse campo.
    const email = await getCustomerEmail(payload);
    if (!email) {
      console.error(`[STRIPE] E-mail não encontrado para o evento ${event.id}.`);
      // Retorna 400 para que a Stripe tente novamente, em vez de marcar o evento como concluído.
      return res.status(400).json({ error: "Customer email not found" });
    }

    const targetUser = await findAuthUserByEmail(email);
    if (!targetUser) {
      console.error(`[STRIPE] Usuário não encontrado no Auth para ${email}.`);
      // Não devolver 200: o usuário pode ainda estar sendo criado e a Stripe deve reenviar.
      return res.status(500).json({ error: "User not found" });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_pro: desiredIsPro })
      .eq("id", targetUser.id);

    if (updateError) throw updateError;

    const { error: idempotencyError } = await supabase
      .from("stripe_webhook_events")
      .insert({
        event_id: event.id,
        event_type: event.type,
        status: payload.status || payload.payment_status || "unknown",
        customer_email: email,
        payload: event,
      });

    if (idempotencyError?.code === "23505") {
      return res.status(200).json({ received: true, message: "Already processed" });
    }
    if (idempotencyError) throw idempotencyError;

    console.log(
      `[STRIPE] Perfil ${targetUser.id} atualizado: is_pro=${desiredIsPro} (${event.type}).`,
    );
    return res.status(200).json({ received: true, isPro: desiredIsPro });
  } catch (error: any) {
    console.error(`[STRIPE ERROR] ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}
