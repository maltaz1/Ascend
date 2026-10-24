// Edge Function: waitlist-launch
// Manda o e-mail de lançamento para toda a lista de espera.
//
// Protegida pelo secret WAITLIST_ADMIN_KEY, enviado no header x-admin-key.
// Corpo (JSON, tudo opcional):
//   test_to     envia só um e-mail de exemplo para esse endereço (não marca nada)
//   dry_run     true: só conta quantas pessoas ainda vão receber
//   limit       quantas enviar nesta chamada (padrão 100, máximo 1000)
//   subject     assunto do e-mail
//   cta_url     link do botão (padrão: o site)
//   extra_text  parágrafo extra, ex.: o cupom ou o preço de fundador
//
// Cada pessoa recebe uma vez só (launch_sent_at). Chame de novo até
// "remaining" chegar a 0. Quem saiu da lista (unsubscribed_at) é pulado.

import {
  admin,
  type Email,
  founderLabel,
  greeting,
  json,
  layout,
  p,
  sendBatch,
  sendEmail,
  SITE_URL,
  unsubscribeUrl,
  type WaitlistRow,
} from "../_shared/waitlist.ts";

const ADMIN_KEY = Deno.env.get("WAITLIST_ADMIN_KEY");
const BATCH = 100;

type Options = {
  test_to?: string;
  dry_run?: boolean;
  limit?: number;
  subject?: string;
  cta_url?: string;
  extra_text?: string;
};

function buildEmail(row: WaitlistRow, founderNumber: number, opts: Options): Email {
  const founder = founderLabel(founderNumber);
  const unsub = unsubscribeUrl(row);
  const ctaUrl = opts.cta_url ?? SITE_URL;
  const extra = opts.extra_text?.trim();

  const html = layout({
    preheader: "Seu acesso de Fundador chegou.",
    unsubscribeUrl: unsub,
    body: [
      p(`<strong style="font-size:22px">${greeting(row)}</strong>`),
      p(`O Ascend abriu. Como você estava na lista de espera, seu acesso de
        Fundador já está liberado.`),
      p(`Seu selo <strong style="color:#a78bfa">Fundador ${founder}</strong> vai
        aparecer no seu perfil assim que você criar a conta com este e-mail.`),
      extra ? p(extra.replace(/\n/g, "<br>")) : "",
    ].join(""),
    cta: { label: "Entrar no Ascend", url: ctaUrl },
  });

  const text = [
    greeting(row),
    "O Ascend abriu. Como você estava na lista de espera, seu acesso de Fundador já está liberado.",
    `Seu selo Fundador ${founder} vai aparecer no seu perfil assim que você criar a conta com este e-mail.`,
    extra ?? "",
    `Entrar no Ascend: ${ctaUrl}`,
    `Não quer mais e-mails? ${unsub}`,
  ].filter(Boolean).join("\n\n");

  return {
    to: row.email,
    subject: opts.subject ?? "O Ascend abriu. Seu acesso de Fundador chegou.",
    html,
    text,
    unsubscribeUrl: unsub,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!ADMIN_KEY) return json({ error: "WAITLIST_ADMIN_KEY não configurada" }, 503);
  if (req.headers.get("x-admin-key") !== ADMIN_KEY) return json({ error: "unauthorized" }, 401);

  let opts: Options = {};
  try {
    opts = await req.json();
  } catch {
    // Corpo vazio: usa os padrões.
  }

  if (opts.test_to) {
    const sample: WaitlistRow = {
      email: opts.test_to,
      name: "Fundador",
      referral_code: "TESTE1",
      unsubscribe_token: "00000000-0000-0000-0000-000000000000",
    };
    await sendEmail(buildEmail(sample, 1, opts));
    return json({ test_sent_to: opts.test_to });
  }

  const pending = () =>
    admin
      .from("waitlist")
      .select("seq", { count: "exact", head: true })
      .is("launch_sent_at", null)
      .is("unsubscribed_at", null);

  if (opts.dry_run) {
    const { count } = await pending();
    return json({ remaining: count ?? 0 });
  }

  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 1000);

  // Número de Fundador = ordem de cadastro entre todos os inscritos.
  const { data: all, error } = await admin
    .from("waitlist")
    .select("seq, email, name, referral_code, unsubscribe_token, launch_sent_at, unsubscribed_at")
    .order("seq");
  if (error) return json({ error: error.message }, 500);

  const targets = all
    .map((row, i) => ({ row, founder: i + 1 }))
    .filter(({ row }) => !row.launch_sent_at && !row.unsubscribed_at)
    .slice(0, limit);

  let sent = 0;
  for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    try {
      await sendBatch(chunk.map(({ row, founder }) => buildEmail(row, founder, opts)));
    } catch (err) {
      console.error("waitlist-launch: falha no lote", err);
      const { count } = await pending();
      return json({ sent, remaining: count ?? 0, error: String(err) }, 502);
    }
    await admin
      .from("waitlist")
      .update({ launch_sent_at: new Date().toISOString() })
      .in("seq", chunk.map(({ row }) => row.seq));
    sent += chunk.length;
  }

  const { count } = await pending();
  return json({ sent, remaining: count ?? 0 });
});
