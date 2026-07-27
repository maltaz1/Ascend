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
    console.error(\`[STRIPE] Webhook signature verification failed: \${err.message}\`);
    return res.status(400).send(\`Webhook Error: \${err.message}\`);
  }

  const eventId = event.id;
  const eventType = event.type;
  const payload = event.data.object as any;
  
  console.log(\`[STRIPE] Evento recebido: \${eventType} | ID: \${eventId}\`);

  try {
    // 1. Idempotência
    const { error: idempotencyError } = await supabase
      .from("stripe_webhook_events")
      .insert({
        event_id: eventId,
        event_type: eventType,
        status: payload.status || "unknown",
        customer_email: payload.customer_email || payload.email || "unknown",
        payload: event,
      });

    if (idempotencyError && idempotencyError.code === "23505") {
      return res.status(200).json({ received: true, message: "Already processed" });
    }

    // 2. Determinar e-mail e status PRO
    let email = payload.customer_email || payload.email;
    
    // Se for um evento de assinatura, buscar o e-mail do cliente via ID do customer
    if (!email && payload.customer) {
      const customer = await stripe.customers.retrieve(payload.customer as string) as Stripe.Customer;
      email = customer.email;
    }

    if (!email) {
      console.error("[STRIPE] E-mail não encontrado no payload ou cliente.");
      return res.status(200).json({ received: true, error: "email_not_found" });
    }

    let desiredIsPro: boolean | null = null;

    // Lógica de Ativação
    if (
      eventType === "checkout.session.completed" ||
      eventType === "invoice.paid" ||
      eventType === "customer.subscription.created"
    ) {
      const status = payload.status || payload.payment_status;
      if (["active", "paid", "complete", "trialing"].includes(status)) {
        desiredIsPro = true;
      }
    } 
    
    // Lógica de Desativação
    if (
      eventType === "customer.subscription.deleted" || 
      eventType === "customer.subscription.updated" ||
      eventType === "invoice.payment_failed"
    ) {
      // Se a assinatura foi deletada ou o status mudou para algo não ativo
      const status = payload.status;
      if (eventType === "customer.subscription.deleted" || ["canceled", "unpaid", "incomplete_expired"].includes(status)) {
        desiredIsPro = false;
      } else if (["active", "trialing"].includes(status)) {
        desiredIsPro = true;
      }
    }

    if (desiredIsPro !== null) {
      console.log(\`[STRIPE] Atualizando status PRO para \${desiredIsPro} (Email: \${email})\`);
      
      // Buscar usuário no Supabase Auth
      const { data: usersData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const targetUser = usersData.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (targetUser) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ is_pro: desiredIsPro })
          .eq("id", targetUser.id);
        
        if (updateError) throw updateError;
        console.log(\`[STRIPE] Sucesso: Usuário \${targetUser.id} atualizado.\`);
      } else {
        console.warn(\`[STRIPE] Usuário com e-mail \${email} não encontrado no sistema.\`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error(\`[STRIPE ERROR] \${err.message}\`);
    return res.status(500).json({ error: "Internal server error" });
  }
}
