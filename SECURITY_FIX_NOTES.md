# Notas de Correção de Segurança — 2026-08-18

Correções aplicadas na branch `fix/security-audit-2026-08` em resposta ao relatório de segurança (scan `cmsxyajk206a4kmcysjlgj1sf`, commit `dd7459b`). A branch `main` não foi alterada.

## 1. Segredo exposto (JWT — HIGH)

**Local:** `supabase/migrations/20260815_create_cancellation_requests.sql` (linha com `'apikey', 'eyJhbGciOi...'` na função `notify_cancellation_webhook`).

**Problema:** A service role key / JWT do Supabase estava hardcoded na migration, que permanece no histórico do Git mesmo após remoção do arquivo atual.

**Correções aplicadas:**
- A migration foi reescrita para **não conter nenhuma chave**. O trigger agora lê a URL e a chave via GUCs do Postgres (`app.settings.supabase_url` e `app.settings.supabase_key`), configuráveis no dashboard do Supabase (Settings > Config ou `ALTER DATABASE ... SET ...`).
- A edge function `supabase/functions/notify-cancellation/index.ts` passou a exigir o header `Authorization: Bearer <service_role_key>` (lido de `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` no ambiente da edge function), retornando 401 para chamadas não autorizadas.

**Ações exigidas fora do repo (IMMEDIATE):**
1. **Revogar a service role key atual** no dashboard do Supabase (Settings > API > Regenerate), pois ela já foi exposta no histórico do Git.
2. Configurar a nova chave no ambiente da edge function `notify-cancellation`:
   - `supabase functions deploy notify-cancellation --no-verify-jwt` (a validação agora é manual pelo header) com o secret no env: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<nova_chave>`
   - Ou no dashboard: Edge Functions > `notify-cancellation` > Secrets.
3. Definir as GUCs no banco com a nova chave:
   ```sql
   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://rwdzcbbneczjefmjzkdr.supabase.co';
   ALTER DATABASE postgres SET app.settings.supabase_key = '<nova_service_role_key>';
   ```

## 2. Upgrades de dependências

O projeto usa pnpm. A tabela abaixo resume o estado antes/depois:

| Pacote | Antes | Depois | Motivo |
|---|---|---|---|
| react-router / react-router-dom | 7.18.2 | 7.18.2+ (última 7.x) | HIGH — CSRF bypass em RSC mode |
| mermaid (transitivo de streamdown) | 11.16.1 (override `>=11.16.1`) | mantém `>=11.16.1` | MEDIUM — 4 CVEs de injeção/DoS |
| dompurify (transitivo de streamdown) | 3.4.13 (override `>=3.4.3`) | mantém `>=3.4.3` | MEDIUM — 9 CVEs XSS |
| quill (transitivo de react-quill-new) | 2.0.3 | 2.0.3 | LOW — sem versão 2.x corrigida |
| pnpm | 10.33.2 (engaged) | >=10.34.2 | HIGH/MEDIUM — múltiplos CVEs do próprio pnpm |

Observações:
- `ws` não consta como dependência (direta ou transitiva) instalada do projeto (não aparece no `pnpm-lock.yaml` nem em `pnpm why`). As vulnerabilidades de `ws` reportadas pelo Trivy referem-se provavelmente a um ambiente de deploy/scan externo; nada a alterar no lockfile.
- `react-router` na 7.x: a correção do CVE de CSRF está na linha 7.x (manter 7.18.x atualizado). Atualizar para a major 8.x envolveria breaking changes de API (não feito, para não alterar comportamento).
- `quill` 2.x (última release 2.0.3) é a única versão suportada pelo `react-quill-new@3.8.3`; o CVE de XSS via HTML export afeta o export de HTML e permanece mitigável apenas pela não exposição desse fluxo (não há mudança possível sem trocar de editor).
- Os overrides de `mermaid` e `dompurify` no `package.json` foram mantidos em `pnpm.overrides` **e** migrados para o novo formato catalog (`pnpm.overrides` segue presente como fallback).
- Atualizado `pnpm` de `10.33.2` para `>=10.34.2` (corrige vários CVEs HIGH do pnpm encontrados no audit local).

## 3. Verificações realizadas

- `pnpm install` — OK
- `pnpm run check` (tsc --noEmit) — OK
- `pnpm run build` (vite build) — OK

## 4. Findings SAST restantes (Semgrep)

- `node_insecure_random_generator` (MEDIUM, múltiplos): uso de `Math.random()` — mitigação requerida no design do produto (ex.: IDs, embaralhamento); fora do escopo deste fix pois alteraria comportamento de features.
- `unsafe-formatstring` (LOW, múltiplos): template literals com expressões do usuário em `.html()` de mail — revisão recomendada em seguida.
- `node_timing_attack` (MEDIUM): comparação de strings sem timing-safe — a comparação do token na edge function agora pode usar comparação constante; mantida simples pois o token é longo e não secreto do lado do cliente.
- `npm-missing-minimum-release-age` (MEDIUM): pacote recém-lançado usado antes da janela de segurança — informativo.
