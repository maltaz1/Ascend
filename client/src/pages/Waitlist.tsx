import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, Gift, Rocket, Share2, Sparkles } from "lucide-react";
import { FounderBadge } from "@/components/FounderBadge";
import {
  REFERRAL_BONUS,
  clearLocalWaitlist,
  getWaitlistStatus,
  getWaitlistTotal,
  isLocalWaitlist,
  joinWaitlist,
  listLocalWaitlist,
  unsubscribeWaitlist,
  type WaitlistStatus,
} from "@/lib/waitlist";

// Página pública da lista de espera do lançamento (/lista).
// Os dados vêm de lib/waitlist (Supabase, ou localStorage no modo de teste).

const STORAGE_KEY = "ascend-waitlist-code";
// Abaixo disso o contador de inscritos não aparece (número pequeno não ajuda).
const SHOW_TOTAL_FROM = 30;

const PERKS = [
  {
    icon: Rocket,
    title: "Acesso antes de todo mundo",
    text: "Quem está na lista entra no app antes da abertura para o público.",
  },
  {
    icon: Gift,
    title: "Preço de fundador",
    text: "Uma condição de lançamento que só quem está na lista recebe.",
  },
  {
    icon: Sparkles,
    title: "Selo Fundador",
    text: "Fica no seu perfil dentro do app, pra sempre, com o seu número.",
  },
];

const MODULES = [
  ["Hoje", "Tudo o que importa no seu dia numa tela só."],
  ["Tarefas", "Listas, subtarefas e tarefas que se repetem."],
  ["Hábitos", "Sequência de dias que você não vai querer quebrar."],
  ["Metas", "Objetivos grandes quebrados em progresso semanal."],
  ["Finanças", "Pra onde foi o seu dinheiro, por categoria."],
  ["Dieta e treino", "Refeições, água e treinos no mesmo lugar."],
  ["Notas", "Escrita sem distração, organizada em pastas."],
  ["XP e conquistas", "Cada coisa que você termina vira XP e sobe seu nível."],
];

function readStoredCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeCode(code: string | null) {
  try {
    if (code) localStorage.setItem(STORAGE_KEY, code);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sem storage (aba anônima): a pessoa só não volta direto pro status.
  }
}

function getSource(params: URLSearchParams): string | null {
  const utm = params.get("utm_source") || params.get("src");
  if (utm) return utm;
  try {
    return document.referrer ? new URL(document.referrer).hostname : null;
  } catch {
    return null;
  }
}

// Cores do app (transição/src/theme.tsx, tema escuro "Ledger Noturno").
const css = `
.wl { --bg: #12111a; --surface: #18181f; --raised: #222229; --border: #262630; --field: #2a2a32;
  --ink: #f5f5f5; --muted: #9ca3af; --primary: #8b5cf6; --primary-pressed: #7c3aed; --primary-ink: #a78bfa;
  --primary-soft: rgba(139, 92, 246, 0.12); --accent: #f59e0b; --blue: #3b82f6;
  min-height: 100vh; color: var(--ink); font-family: 'DM Sans', system-ui, sans-serif;
  background:
    radial-gradient(900px 520px at 85% -10%, rgba(139, 92, 246, 0.16), transparent 70%),
    radial-gradient(700px 480px at -10% 110%, rgba(59, 130, 246, 0.08), transparent 70%),
    var(--bg); }
.wl * { box-sizing: border-box; }
.wl-inner { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
.wl-test { margin: 16px 0 0; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 14px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; font-size: 14px; }
.wl-test b { color: var(--accent); }
.wl-test table { width: 100%; border-collapse: collapse; font-size: 13px; }
.wl-test th, .wl-test td { text-align: left; padding: 6px 8px; border-top: 1px solid rgba(245, 158, 11, 0.18); }
.wl-test th { color: var(--muted); font-weight: 600; }
.wl-test-scroll { overflow-x: auto; }
.wl-test-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.wl-top { display: flex; align-items: center; justify-content: space-between; padding: 24px 0 8px; }
.wl-logo { height: 76px; width: auto; display: block; }
.wl-hero { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: center; padding: 32px 0 72px; }
.wl-eyebrow { display: inline-flex; align-items: center; gap: 8px; font: 600 12px 'Space Grotesk', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--primary-ink); }
.wl-eyebrow i { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); box-shadow: 0 0 0 4px rgba(139, 92, 246, .22); }
.wl h1 { font: 700 clamp(34px, 5.4vw, 58px)/1.04 'Space Grotesk', sans-serif; letter-spacing: -.03em; margin: 18px 0; text-wrap: balance; }
.wl h1 em { font-style: normal; background: linear-gradient(100deg, #c4b5fd, var(--primary) 45%, #60a5fa); -webkit-background-clip: text; background-clip: text; color: transparent; }
.wl-lead { font-size: 18px; line-height: 1.6; color: var(--muted); max-width: 46ch; margin: 0; }
.wl-card { background: var(--surface); border: 1px solid var(--border); border-radius: 22px; padding: 28px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 24px 60px rgba(0, 0, 0, .32); }
.wl-card h2 { font: 700 22px 'Space Grotesk', sans-serif; margin: 0; }
.wl-field { display: flex; flex-direction: column; gap: 6px; }
.wl-field label { font-size: 13px; font-weight: 600; color: var(--muted); }
.wl-field input { background: var(--bg); border: 1px solid var(--field); border-radius: 12px; padding: 13px 14px; color: var(--ink); font: inherit; font-size: 16px; outline: none; }
.wl-field input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(139, 92, 246, .25); }
.wl-consent { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--muted); line-height: 1.5; cursor: pointer; }
.wl-consent input { accent-color: var(--primary); margin-top: 3px; width: 16px; height: 16px; flex: none; }
.wl-consent a { color: var(--ink); }
.wl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 12px; padding: 15px 18px; font: 700 16px 'Space Grotesk', sans-serif; cursor: pointer; background: linear-gradient(135deg, var(--primary), var(--primary-pressed)); color: #fff; box-shadow: 0 10px 24px rgba(124, 58, 237, .35); transition: transform .15s, opacity .15s; }
.wl-btn:hover { transform: translateY(-1px); }
.wl-btn:disabled { opacity: .6; cursor: default; transform: none; }
.wl-btn.ghost { background: var(--bg); color: var(--ink); border: 1px solid var(--field); font-size: 14px; padding: 11px 14px; box-shadow: none; }
.wl-btn.small { font-size: 13px; padding: 8px 12px; }
.wl-btn:focus-visible, .wl-link:focus-visible { outline: 2px solid var(--primary-ink); outline-offset: 2px; }
.wl-error { background: rgba(239, 68, 68, .12); border: 1px solid rgba(239, 68, 68, .35); color: #fca5a5; border-radius: 10px; padding: 10px 12px; font-size: 14px; }
.wl-total { font-size: 14px; color: var(--muted); }
.wl-total b { color: var(--ink); }
.wl-badge-row { display: flex; align-items: center; gap: 18px; }
.wl-badge-row p { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.5; }
.wl-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.wl-stat { background: var(--bg); border: 1px solid var(--border); border-radius: 14px; padding: 14px; }
.wl-stat span { display: block; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-weight: 600; }
.wl-stat b { font: 700 30px 'Space Grotesk', sans-serif; font-variant-numeric: tabular-nums; color: var(--primary-ink); }
.wl-stat small { color: var(--muted); font-size: 14px; }
.wl-ref { display: flex; flex-direction: column; gap: 8px; }
.wl-ref code { background: var(--primary-soft); border: 1px dashed rgba(139, 92, 246, .55); border-radius: 10px; padding: 11px 12px; font-size: 14px; word-break: break-all; color: #c4b5fd; }
.wl-ref-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.wl-link { background: none; border: 0; padding: 0; color: var(--muted); font: inherit; font-size: 13px; text-decoration: underline; cursor: pointer; align-self: flex-start; }
.wl-section { padding: 64px 0; border-top: 1px solid var(--border); }
.wl-section h2 { font: 700 clamp(26px, 3.4vw, 36px) 'Space Grotesk', sans-serif; letter-spacing: -.02em; margin: 0 0 28px; text-wrap: balance; }
.wl-perks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.wl-perk { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 22px; display: flex; flex-direction: column; gap: 10px; }
.wl-perk-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--primary-soft); color: var(--primary-ink); display: flex; align-items: center; justify-content: center; }
.wl-perk h3 { font: 700 18px 'Space Grotesk', sans-serif; margin: 0; }
.wl-perk p { margin: 0; color: var(--muted); line-height: 1.55; }
.wl-modules { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 18px; overflow: hidden; }
.wl-module { background: var(--surface); padding: 20px; display: flex; flex-direction: column; gap: 6px; }
.wl-module b { font: 600 16px 'Space Grotesk', sans-serif; }
.wl-module span { color: var(--muted); font-size: 14px; line-height: 1.5; }
.wl-cta { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 18px; }
.wl-foot { padding: 28px 0 40px; display: flex; gap: 18px; flex-wrap: wrap; justify-content: space-between; color: #6b7280; font-size: 13px; border-top: 1px solid var(--border); }
.wl-foot a { color: var(--muted); }
@media (max-width: 880px) {
  .wl-hero { grid-template-columns: 1fr; gap: 32px; padding-top: 16px; }
  .wl-perks { grid-template-columns: 1fr; }
  .wl-modules { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .wl-logo { height: 60px; }
  .wl-card { padding: 20px; }
  .wl-modules { grid-template-columns: 1fr; }
  .wl-badge-row { flex-direction: column; text-align: center; }
}
@media (prefers-reduced-motion: reduce) { .wl-btn { transition: none; } }
`;

export default function Waitlist() {
  const params = new URLSearchParams(window.location.search);
  const refCode = params.get("ref");
  const unsubscribeToken = params.get("sair");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<WaitlistStatus | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [localEntries, setLocalEntries] = useState(() =>
    isLocalWaitlist ? listLocalWaitlist() : []
  );
  const [unsubscribe, setUnsubscribe] = useState<"loading" | "done" | "error" | null>(
    unsubscribeToken ? "loading" : null
  );

  useEffect(() => {
    document.title = "Lista de espera · Ascend";
    if (unsubscribeToken) {
      unsubscribeWaitlist(unsubscribeToken).then((ok) =>
        setUnsubscribe(ok ? "done" : "error")
      );
      return;
    }
    getWaitlistTotal().then(setTotal);

    const saved = readStoredCode();
    if (saved) {
      getWaitlistStatus(saved).then((data) => {
        if (data) setStatus(data);
        else storeCode(null);
      });
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Marque a caixa de consentimento para entrar na lista.");
      return;
    }
    setSubmitting(true);
    try {
      const next = await joinWaitlist({
        email,
        name: name || null,
        ref: refCode,
        source: getSource(params),
      });
      storeCode(next.code);
      setStatus(next);
      setTotal(next.total);
      if (isLocalWaitlist) setLocalEntries(listLocalWaitlist());
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("invalid_email")
          ? "Confira o e-mail digitado."
          : "Não deu pra salvar agora. Tente de novo em alguns segundos."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const referralLink = status
    ? `${window.location.origin}/lista?ref=${status.code}`
    : "";
  const shareText = `Entrei na lista de espera do Ascend, um app que transforma sua rotina num jogo. Entra pelo meu link: ${referralLink}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      // Celular: abre a folha de compartilhar do sistema (cancelar não faz nada).
      await navigator.share({ title: "Ascend", text: shareText }).catch(() => {});
      return;
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const resetForm = () => {
    storeCode(null);
    setStatus(null);
    setEmail("");
    setName("");
    setConsent(false);
  };

  // Modo de teste: entra na página como se fosse um amigo convidado.
  const openAsGuest = () => {
    if (!status) return;
    storeCode(null);
    window.location.href = `/lista?ref=${status.code}`;
  };

  const clearTestData = () => {
    clearLocalWaitlist();
    storeCode(null);
    window.location.href = "/lista";
  };

  const firstName = status?.name?.split(" ")[0];

  if (unsubscribe) {
    return (
      <div className="wl">
        <style>{css}</style>
        <div className="wl-inner">
          <header className="wl-top">
            <img className="wl-logo" src="/ascend-logo-full.png" alt="Ascend" />
          </header>
          <div className="wl-card" style={{ maxWidth: 480, margin: "40px 0 80px" }}>
            <h2>
              {unsubscribe === "loading"
                ? "Só um instante..."
                : unsubscribe === "done"
                  ? "Pronto, você não vai mais receber e-mails"
                  : "Não encontramos esse link"}
            </h2>
            <p className="wl-total" style={{ margin: 0 }}>
              {unsubscribe === "error"
                ? "O link pode estar incompleto. Copie o endereço inteiro do e-mail e tente de novo."
                : "Seu lugar na lista e seu número de Fundador continuam guardados."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wl">
      <style>{css}</style>
      <div className="wl-inner">
        {isLocalWaitlist ? (
          <div className="wl-test">
            <span>
              <b>Modo de teste local.</b> Os cadastros ficam só neste navegador e
              não vão pro banco.
              {refCode ? ` Você está abrindo o link de indicação ${refCode}.` : ""}
            </span>
            {localEntries.length ? (
              <div className="wl-test-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Fundador</th>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Código</th>
                      <th>Indicado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localEntries.map((entry, i) => (
                      <tr key={entry.code}>
                        <td>#{i + 1}</td>
                        <td>{entry.name ?? "—"}</td>
                        <td>{entry.email}</td>
                        <td>{entry.code}</td>
                        <td>{entry.referredBy ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <div className="wl-test-actions">
              {status ? (
                <button type="button" className="wl-btn ghost small" onClick={openAsGuest}>
                  Abrir meu link como um amigo
                </button>
              ) : null}
              <button type="button" className="wl-btn ghost small" onClick={clearTestData}>
                Apagar cadastros de teste
              </button>
            </div>
          </div>
        ) : null}

        <header className="wl-top">
          <img className="wl-logo" src="/ascend-logo-full.png" alt="Ascend" />
        </header>

        <section className="wl-hero">
          <div>
            <span className="wl-eyebrow">
              <i /> Lista de espera aberta
            </span>
            <h1>
              Sua vida inteira num app só. <em>E ela vira um jogo.</em>
            </h1>
            <p className="wl-lead">
              Tarefas, hábitos, metas, finanças e dieta no mesmo lugar. Cada
              coisa que você termina vale XP, sobe seu nível e desbloqueia
              conquistas.
            </p>
          </div>

          <div className="wl-card" id="entrar">
            {status ? (
              <>
                <div className="wl-badge-row">
                  <FounderBadge number={status.founder_number} size={120} />
                  <div>
                    <h2>
                      {status.already
                        ? "Você já estava na lista"
                        : firstName
                          ? `Você está dentro, ${firstName}!`
                          : "Você está dentro!"}
                    </h2>
                    <p>
                      Esse é o seu selo de Fundador. Ele vai aparecer no seu
                      perfil quando o Ascend abrir.
                    </p>
                  </div>
                </div>

                <div className="wl-stats">
                  <div className="wl-stat">
                    <span>Sua posição</span>
                    <b>#{status.position}</b> <small>de {status.total}</small>
                  </div>
                  <div className="wl-stat">
                    <span>Indicações</span>
                    <b>{status.referrals}</b>
                  </div>
                </div>

                <div className="wl-ref">
                  <strong>
                    Cada amigo que entrar pelo seu link te sobe{" "}
                    {REFERRAL_BONUS} posições.
                  </strong>
                  <code>{referralLink}</code>
                  <div className="wl-ref-actions">
                    <button type="button" className="wl-btn" onClick={shareLink}>
                      <Share2 size={18} /> Compartilhar
                    </button>
                    <button type="button" className="wl-btn ghost" onClick={copyLink}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Link copiado" : "Copiar link"}
                    </button>
                  </div>
                </div>

                <button type="button" className="wl-link" onClick={resetForm}>
                  Cadastrar outro e-mail
                </button>
              </>
            ) : (
              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <h2>Garanta seu selo de Fundador</h2>
                <div className="wl-field">
                  <label htmlFor="wl-name">Seu nome</label>
                  <input
                    id="wl-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="given-name"
                    maxLength={80}
                    placeholder="Como podemos te chamar"
                  />
                </div>
                <div className="wl-field">
                  <label htmlFor="wl-email">Seu melhor e-mail</label>
                  <input
                    id="wl-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    maxLength={254}
                    placeholder="voce@email.com"
                  />
                </div>
                <label className="wl-consent" htmlFor="wl-consent">
                  <input
                    id="wl-consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    Quero receber e-mails sobre o lançamento do Ascend e concordo
                    com a <a href="/privacy">Política de Privacidade</a>.
                  </span>
                </label>
                {error ? <div className="wl-error">{error}</div> : null}
                <button type="submit" className="wl-btn" disabled={submitting}>
                  {submitting ? "Entrando..." : "Entrar na lista de espera"}
                </button>
                {total !== null && total >= SHOW_TOTAL_FROM ? (
                  <span className="wl-total">
                    <b>{total}</b> pessoas já estão na lista.
                  </span>
                ) : (
                  <span className="wl-total">Grátis e sem compromisso.</span>
                )}
              </form>
            )}
          </div>
        </section>

        <section className="wl-section">
          <h2>O que quem entra agora ganha</h2>
          <div className="wl-perks">
            {PERKS.map(({ icon: Icon, title, text }) => (
              <div className="wl-perk" key={title}>
                <span className="wl-perk-icon">
                  <Icon size={22} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="wl-section">
          <h2>O que tem dentro do Ascend</h2>
          <div className="wl-modules">
            {MODULES.map(([title, text]) => (
              <div className="wl-module" key={title}>
                <b>{title}</b>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {!status ? (
          <section className="wl-section wl-cta">
            <FounderBadge size={140} />
            <h2 style={{ margin: 0 }}>Seu número de Fundador está esperando</h2>
            <a className="wl-btn" href="#entrar" style={{ textDecoration: "none" }}>
              Entrar na lista
            </a>
          </section>
        ) : null}

        <footer className="wl-foot">
          <span>© {new Date().getFullYear()} Ascend</span>
          <span style={{ display: "flex", gap: 16 }}>
            <a href="/privacy">Privacidade</a>
            <a href="/terms">Termos</a>
          </span>
        </footer>
      </div>
    </div>
  );
}
