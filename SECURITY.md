# Segurança do Ascend

Decisões de segurança do projeto. Última revisão: 14/11/2026.

## Como reportar uma falha
Mande um e-mail para **ascendprod1@gmail.com** com o assunto "Segurança". Não abra issue pública.

## Arquitetura (onde cada coisa roda)
- **Site** (Vite/React, Vercel) e **app** (Expo, pasta `transição/`) falam direto com o Supabase usando só a **chave anon**, que é pública. Quem protege os dados é o **RLS**.
- **Servidor**: funções da Vercel em `api/` (webhooks da Cakto e do RevenueCat) e Edge Functions do Supabase em `supabase/functions/`. Só elas usam a `service_role`.

## Segredos
- Nenhum segredo no código. Os nomes estão em `.env.example` (raiz) e `transição/.env.example`. Os valores ficam no painel da Vercel, nos secrets do Supabase e no `.env.local` (ignorado pelo git).
- Prefixos `VITE_` e `EXPO_PUBLIC_` vão para o navegador/app: **só valores públicos**.
- O hook `.githooks/pre-commit` (`scripts/check-secrets.mjs`) bloqueia commits com segredos. Ele é ativado sozinho no `npm install` (script `prepare`).
- O CI (`.github/workflows/security.yml`) roda gitleaks no histórico inteiro.
- Auditoria de 14/11/2026: nenhum segredo no histórico do git (só a chave anon, que é pública). Nada precisou ser rotacionado.

## Banco de dados
- RLS ligado em **todas** as tabelas. Cada usuário só vê e altera as próprias linhas (`auth.uid() = user_id`).
- Tabelas sem política (`*_webhook_events`, `waitlist`, `subscriptions`...) ficam fechadas: só o `service_role` acessa.
- `is_pro`, `pro_source`, `founder_*` e `cakto_subscription_id` só mudam pelo servidor (gatilho `prevent_is_pro_escalation`).
- Funções de gatilho não são chamáveis pela API. Funções `SECURITY DEFINER` têm `search_path` fixo.
- Os eventos de webhook guardam só os campos necessários (sem CPF, telefone ou endereço do comprador).

## Webhooks
- **Cakto**: assinatura HMAC-SHA256 comparada em tempo constante, janela anti-replay de 5 minutos e idempotência por `event_id`.
- **RevenueCat**: header `Authorization` comparado em tempo constante. O estado do PRO é consultado na API do RevenueCat.
- **notify-cancellation** (pública): não confia no corpo, só no `id`. Busca a solicitação no banco e envia uma vez só (`notified_at`).

## Uploads (bucket `Avatars`)
- Até 2 MB, só JPEG/PNG/WebP (limite do próprio bucket).
- Cada usuário só grava, troca e apaga na própria pasta `<user_id>/`. Os nomes dos arquivos são aleatórios.
- O site e o app conferem o tipo real do arquivo (magic bytes) antes de enviar.
- A leitura é pública por URL, porque são fotos de perfil.
- Ao excluir a conta, a `delete-account` apaga as fotos (pasta nova e caminhos antigos).

## Logs
- Sem senha, token ou e-mail completo nos logs (o e-mail aparece mascarado: `fu***@gmail.com`).
- O cliente recebe só mensagens de erro genéricas.

## Autenticação
- Supabase Auth (senhas com bcrypt). A sessão fica no armazenamento local do navegador/app, que é o padrão do Supabase para apps sem servidor próprio. Por isso o CSP é a principal defesa contra roubo de sessão por XSS.
- O login do site mostra mensagens genéricas, que não revelam se o e-mail tem conta, e tem um campo isca (honeypot) no cadastro.
- CAPTCHA: o site já tem o Cloudflare Turnstile (`VITE_TURNSTILE_SITE_KEY`). **Ainda não está exigido no Supabase**: ligar a exigência hoje quebraria o login do app mobile e o "redefinir senha" das Configurações, que ainda não mandam o token.

## Headers (vercel.json)
- CSP com lista fechada de origens: Supabase, Google Fonts, Turnstile, Vercel Analytics, USDA, QR code e o CDN das conquistas. Sem `unsafe-eval` e sem script inline.
- HSTS (2 anos), `X-Frame-Options: DENY`/`frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e COOP.
- Para adicionar um serviço externo novo, inclua a origem no CSP, senão o navegador bloqueia.

## Dependências
- `npm audit --audit-level=high` roda no CI. O Dependabot abre PRs semanais.

## Pendências conhecidas
- Exigir o CAPTCHA no Supabase depois que o app mobile e as Configurações enviarem o token.
- CAPTCHA e limite de cadastros na lista de espera (fica em outro projeto, `ascend-lista`).
- Proteção contra senhas vazadas no painel do Supabase.
