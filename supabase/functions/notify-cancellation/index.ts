// Edge Function: notify-cancellation
// Avisa o dono por e-mail quando alguém pede cancelamento da assinatura.
//
// Chamada pelo gatilho notify_cancellation_trigger (pg_net) com { id }.
// É pública (verify_jwt = false), então NÃO confia no corpo da requisição:
// só usa o id para buscar a solicitação no banco e "reivindica" o envio
// marcando notified_at. Uma chamada forjada não consegue inventar o
// conteúdo do e-mail nem fazer o mesmo aviso ser enviado de novo.

import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_TO = Deno.env.get("CANCELLATION_NOTIFY_TO") ?? "ascendprod1@gmail.com";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let id: unknown;
  try {
    id = (await req.json())?.id;
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    return json({ error: "invalid_id" }, 400);
  }

  // Reivindica o envio de forma atômica: só uma chamada consegue.
  const { data: request, error } = await supabase
    .from("cancellation_requests")
    .update({ notified_at: new Date().toISOString() })
    .eq("id", id)
    .is("notified_at", null)
    .select("id, user_id, email, reason, created_at")
    .maybeSingle();

  if (error) {
    console.error("[notify-cancellation] erro ao buscar solicitação", error.code);
    return json({ error: "internal_error" }, 500);
  }
  if (!request) return json({ skipped: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", request.user_id)
    .maybeSingle();

  const userName = profile?.name || "Não informado";
  const createdAt = new Date(request.created_at).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  try {
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Ascend <notifications@resend.dev>",
        to: [NOTIFY_TO],
        subject: "Nova solicitação de cancelamento",
        html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2>Nova Solicitação de Cancelamento</h2>
            <p>Um usuário solicitou o cancelamento da assinatura através do painel interno.</p>
            <div style="background: #fff; padding: 20px; border-radius: 8px; border: 1px solid #eee;">
              <p><strong>Nome:</strong> ${escapeHtml(userName)}</p>
              <p><strong>E-mail:</strong> ${escapeHtml(request.email)}</p>
              <p><strong>ID do Usuário:</strong> ${escapeHtml(request.user_id)}</p>
              <p><strong>Data da Solicitação:</strong> ${escapeHtml(createdAt)}</p>
              <p><strong>Motivo:</strong> ${escapeHtml(request.reason || "Nenhum motivo informado")}</p>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #777;">
              Este é um e-mail automático enviado pelo sistema Ascend. O cancelamento deve ser processado manualmente no gateway de pagamento.
            </p>
          </div>
        `,
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
  } catch (err) {
    // Libera para uma nova tentativa.
    await supabase.from("cancellation_requests").update({ notified_at: null }).eq("id", request.id);
    console.error("[notify-cancellation] falha no envio", String(err));
    return json({ error: "send_failed" }, 502);
  }

  return json({ success: true });
});
