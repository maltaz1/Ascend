import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false,
  },
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia" as any,
});

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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig as string,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`[STRIPE] Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const eventId = event.id;
  const eventType = event.type;
  const payload = event.data.object as any;
  
  // Extrair e-mail do cliente
  let email = payload.customer_email || payload.email;
  
  // Se não houver e-mail direto, tentar buscar no objeto customer se for um ID
  if (!email && typeof payload.customer === "string") {
    try {
      const customer = await stripe.customers.retrieve(payload.customer) as Stripe.Customer;
      email = customer.email;
    } catch (e) {
      console.error("[STRIPE] Erro ao buscar cliente:", e);
    }
  }

  console.log(`[STRIPE] Processando evento: ${eventType} | ID: ${eventId}`);

  try {
    // 1. Idempotência
    const { error: idempotencyError } = await supabase
      .from("stripe_webhook_events")
      .insert({
        event_id: eventId,
        event_type: eventType,
        status: payload.status || "unknown",
        customer_email: email,
        payload: event,
      });

    if (idempotencyError) {
      if (idempotencyError.code === "23505") {
        return res.status(200).json({ received: true, message: "Already processed" });
      }
      throw idempotencyError;
    }

    // 2. Lógica de Negócio (Status PRO)
    let desiredIsPro: boolean | null = null;

    if (
      eventType === "checkout.session.completed" ||
      eventType === "invoice.paid" ||
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated"
    ) {
      // Verificar se o status da assinatura é ativo ou se o pagamento foi concluído
      const status = payload.status || payload.payment_status;
      if (["active", "paid", "complete", "trialing"].includes(status)) {
        desiredIsPro = true;
      }
    } else if (
      eventType === "customer.subscription.deleted" ||
      eventType === "invoice.payment_failed"
    ) {
      desiredIsPro = false;
    }

    if (desiredIsPro !== null && email) {
      // Localizar usuário pelo e-mail
      const { data: usersData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const targetUser = usersData.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (targetUser) {
        const userId = targetUser.id;
        
        // Atualizar perfil
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ is_pro: desiredIsPro })
          .eq("id", userId);
        
        if (updateError) throw updateError;
        console.log(`[STRIPE] Perfil ${userId} (${email}) atualizado para PRO: ${desiredIsPro}`);
      } else {
        console.warn(`[STRIPE] Usuário não encontrado para o e-mail: ${email}`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(`[STRIPE ERROR] ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}
