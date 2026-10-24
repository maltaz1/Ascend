// Edge Function: waitlist-welcome
// E-mail de boas-vindas da lista de espera. Chamada pelo trigger
// waitlist_welcome_after_insert (pg_net) com { code } a cada cadastro.
//
// Não exige login (verify_jwt = false), mas só envia uma vez por pessoa:
// ignora quem já recebeu (welcome_sent_at) ou saiu (unsubscribed_at).

import {
  admin,
  founderLabel,
  greeting,
  json,
  layout,
  p,
  referralUrl,
  sendEmail,
  SITE_URL,
  unsubscribeUrl,
  type WaitlistRow,
} from "../_shared/waitlist.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let code: string | undefined;
  try {
    ({ code } = await req.json());
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!code) return json({ error: "missing_code" }, 400);

  const { data: row } = await admin
    .from("waitlist")
    .select("email, name, referral_code, unsubscribe_token")
    .eq("referral_code", code)
    .is("welcome_sent_at", null)
    .is("unsubscribed_at", null)
    .maybeSingle<WaitlistRow>();
  if (!row) return json({ skipped: true });

  const { data: status } = await admin.rpc("_waitlist_status_by_code", { p_code: code });
  const founder = founderLabel(status?.founder_number ?? 0);
  const unsub = unsubscribeUrl(row);
  const ref = referralUrl(row);

  const html = layout({
    preheader: `Você é o Fundador ${founder}. Seu link pra subir na fila está aqui.`,
    unsubscribeUrl: unsub,
    body: [
      p(`<strong style="font-size:22px">${greeting(row)}</strong>`),
      p(`Você está na lista de espera do Ascend. Seu número de Fundador é
        <strong style="color:#a78bfa">${founder}</strong> e ele é seu pra sempre.`),
      p(`Hoje você está na posição <strong>#${status?.position ?? "?"}</strong>.
        Cada amigo que entrar pelo seu link te sobe 5 posições:`),
      p(`<a href="${ref}" style="color:#c4b5fd;word-break:break-all">${ref}</a>`),
      p(`Quando o app abrir, quem está na lista entra primeiro, com preço de fundador
        e o selo Fundador no perfil. A gente te avisa por aqui.`),
    ].join(""),
    cta: { label: "Ver minha posição", url: `${SITE_URL}/lista` },
  });

  const text = [
    `${greeting(row)}`,
    `Você está na lista de espera do Ascend. Seu número de Fundador é ${founder}.`,
    `Hoje você está na posição #${status?.position ?? "?"}. Cada amigo que entrar pelo seu link te sobe 5 posições:`,
    ref,
    `Quando o app abrir, quem está na lista entra primeiro, com preço de fundador e o selo Fundador no perfil.`,
    `Não quer mais e-mails? ${unsub}`,
  ].join("\n\n");

  try {
    await sendEmail({
      to: row.email,
      subject: `Você está na lista do Ascend, Fundador ${founder}`,
      html,
      text,
      unsubscribeUrl: unsub,
    });
  } catch (err) {
    console.error("waitlist-welcome: falha no envio", err);
    return json({ error: "send_failed" }, 502);
  }

  await admin
    .from("waitlist")
    .update({ welcome_sent_at: new Date().toISOString() })
    .eq("referral_code", code);

  return json({ sent: true });
});
