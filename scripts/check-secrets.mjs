#!/usr/bin/env node
// Bloqueia commits com segredos. Roda no pre-commit (.githooks/pre-commit)
// e olha só as linhas ADICIONADAS nos arquivos em stage.
//
// Para pular um falso positivo numa linha, acrescente o comentário
//   secret-scan:allow
// (a chave anon do Supabase é pública e já é aceita sozinha).
import { execFileSync } from "node:child_process";

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const staged = git("diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z")
  .split("\0")
  .filter(Boolean);

const problems = [];

// 1. Arquivos que nunca devem ser versionados.
const FORBIDDEN_FILE = /(^|\/)(\.env(\..+)?|.*\.(pem|p8|p12|jks|keystore|key)|google-services\.json|GoogleService-Info\.plist|service-account.*\.json)$/i;
for (const file of staged) {
  if (/(^|\/)\.env\.example$/.test(file)) continue;
  if (FORBIDDEN_FILE.test(file)) problems.push(`${file}: arquivo de segredo/ambiente não pode ser commitado`);
}

// 2. Padrões de segredo nas linhas adicionadas.
const PATTERNS = [
  ["Chave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["Chave secreta do Supabase", /\bsb_secret_[A-Za-z0-9_-]{10,}/],
  ["Chave secreta (sk_)", /\bsk_(live_|test_)?[A-Za-z0-9]{16,}/],
  ["Chave do Resend", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{8,}/],
  ["Webhook secret (whsec_)", /\bwhsec_[A-Za-z0-9]{16,}/],
  ["Token do GitHub", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["Chave AWS", /\bAKIA[0-9A-Z]{16}\b/],
  ["Chave do Google", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["URL de banco com senha", /\b(postgres(ql)?|mysql|mongodb(\+srv)?):\/\/[^:\s/]+:[^@\s]+@/],
  [
    "Segredo atribuído no código",
    /\b[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE_KEY|PASSWORD|API_KEY|AUTH_TOKEN)[A-Z0-9_]*\s*[:=]\s*["'`]?[A-Za-z0-9_\-+/=.]{16,}/,
  ],
];

function jwtRole(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

for (const file of staged) {
  let diff;
  try {
    diff = git("diff", "--cached", "-U0", "--no-color", "--", file);
  } catch {
    continue;
  }
  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) continue;
    if (line.includes("secret-scan:allow")) continue;
    const text = line.slice(1);

    for (const jwt of text.match(/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g) ?? []) {
      const role = jwtRole(jwt);
      if (role && role !== "anon") problems.push(`${file}: JWT com role "${role}" (só a chave anon pode aparecer no código)`);
    }
    for (const [name, re] of PATTERNS) {
      if (re.test(text)) problems.push(`${file}: ${name} → ${text.trim().slice(0, 80)}`);
    }
  }
}

if (problems.length) {
  console.error("\n✖ Commit bloqueado: possível segredo encontrado.\n");
  for (const p of problems) console.error("  - " + p);
  console.error(
    "\nMova o valor para uma variável de ambiente (.env.local / painel da Vercel / secrets do Supabase)." +
      "\nSe for falso positivo, adicione o comentário 'secret-scan:allow' na linha.\n",
  );
  process.exit(1);
}
