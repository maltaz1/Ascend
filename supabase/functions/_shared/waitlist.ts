// Código compartilhado pelas funções de e-mail da lista de espera
// (waitlist-welcome e waitlist-launch).
//
// Secrets usados (Supabase > Edge Functions > Secrets):
//   RESEND_API_KEY   chave do Resend (a mesma do notify-cancellation)
//   WAITLIST_FROM    remetente, ex.: "Ascend <ola@seudominio.com.br>".
//                    Sem domínio verificado no Resend, use o padrão abaixo:
//                    ele só entrega para o e-mail dono da conta do Resend.
//   SITE_URL         endereço do site (padrão: o da Vercel)

import { createClient } from "npm:@supabase/supabase-js@2";

export const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://ascend-lac-zeta.vercel.app").replace(/\/$/, "");
const FROM = Deno.env.get("WAITLIST_FROM") ?? "Ascend <onboarding@resend.dev>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export type WaitlistRow = {
  email: string;
  name: string | null;
  referral_code: string;
  unsubscribe_token: string;
};

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toResend(email: Email) {
  return {
    from: FROM,
    to: [email.to],
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: { "List-Unsubscribe": `<${email.unsubscribeUrl}>` },
  };
}

async function resend(path: string, body: unknown) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
  const res = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
  return res.json();
}

export function sendEmail(email: Email) {
  return resend("/emails", toResend(email));
}

// O Resend aceita até 100 e-mails por chamada de lote.
export function sendBatch(emails: Email[]) {
  return resend("/emails/batch", emails.map(toResend));
}

export function unsubscribeUrl(row: WaitlistRow) {
  return `${SITE_URL}/lista?sair=${row.unsubscribe_token}`;
}

export function referralUrl(row: WaitlistRow) {
  return `${SITE_URL}/lista?ref=${row.referral_code}`;
}

export function founderLabel(n: number) {
  return `#${String(n).padStart(4, "0")}`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

export function greeting(row: WaitlistRow) {
  const first = row.name?.trim().split(/\s+/)[0];
  return first ? `Oi, ${escapeHtml(first)}!` : "Oi!";
}

// Layout com as cores do app. Tabelas e estilos inline porque é o que os
// clientes de e-mail (Gmail, Outlook) entendem.
export function layout(opts: {
  preheader: string;
  body: string;
  cta?: { label: string; url: string };
  unsubscribeUrl: string;
}) {
  const cta = opts.cta
    ? `<tr><td style="padding:8px 0 4px">
        <a href="${opts.cta.url}" style="display:inline-block;background:#8b5cf6;color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;padding:14px 26px;border-radius:12px">${opts.cta.label}</a>
      </td></tr>`
    : "";
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:#12111a">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${opts.preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#12111a">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:Arial,Helvetica,sans-serif;color:#f5f5f5">
      <tr><td style="padding:0 0 24px"><img src="${SITE_URL}/ascend-logo-full.png" width="88" alt="Ascend" style="display:block;border:0"></td></tr>
      <tr><td style="background:#18181f;border:1px solid #262630;border-radius:18px;padding:28px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:16px;line-height:1.6;color:#f5f5f5">
          ${opts.body}
          ${cta}
        </table>
      </td></tr>
      <tr><td style="padding:20px 4px;font-size:12px;line-height:1.6;color:#9ca3af">
        Você recebeu este e-mail porque entrou na lista de espera do Ascend.<br>
        <a href="${opts.unsubscribeUrl}" style="color:#a78bfa">Não quero mais receber e-mails</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export function p(html: string) {
  return `<tr><td style="padding:0 0 16px">${html}</td></tr>`;
}
