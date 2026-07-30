# Relatório de Auditoria e Conformidade LGPD - Ascend

**Data do Relatório:** 30 de julho de 2026
**Autor:** Manus AI
**Branch de Implementação:** `policies` (A branch `main` permanece inalterada)

---

## 1. Resumo Executivo

Este relatório detalha a auditoria de segurança, privacidade e conformidade com a Lei Geral de Proteção de Dados (LGPD) realizada no aplicativo web "Ascend". Após a identificação dos dados coletados, armazenados e compartilhados, foram implementadas as medidas necessárias para garantir a conformidade do sistema. Todas as alterações foram realizadas em uma nova branch chamada `policies`, conforme solicitado, preservando a branch `main`.

As principais entregas incluem:
- Criação de páginas públicas de **Política de Privacidade** e **Termos de Uso**.
- Adição de uma nova seção de **"Privacidade e Dados"** na página de Configurações.
- Implementação de funcionalidades para **Exportação de Dados (Portabilidade)** e **Exclusão de Conta (Eliminação)**.
- Adição de um **checkbox de consentimento obrigatório** no processo de cadastro.
- Criação de uma migration SQL para habilitar **Row Level Security (RLS)** em todas as tabelas do Supabase.

---

## 2. Auditoria de Dados Pessoais

A análise do código-fonte e da estrutura do banco de dados (Supabase) revelou as seguintes categorias de dados pessoais coletados e processados pelo Ascend:

### 2.1 Dados Coletados

| Categoria de Dados | Dados Específicos | Finalidade | Base Legal |
| :--- | :--- | :--- | :--- |
| **Dados de Cadastro** | E-mail, Senha, Nome (opcional) | Autenticação e criação de conta | Execução de contrato |
| **Dados de Perfil** | Nome de exibição, Bio, URL da foto de perfil | Personalização da interface do usuário | Consentimento |
| **Dados de Uso (App)** | Tarefas, Hábitos, Metas, Streaks, XP | Funcionalidade principal do aplicativo | Execução de contrato |
| **Dados de Saúde/Fitness** | Registros de treinos, sessões, refeições, dieta, hidratação | Funcionalidade principal do aplicativo | Consentimento |
| **Dados Financeiros** | Transações financeiras, categorias | Funcionalidade principal do aplicativo | Consentimento |
| **Dados Pessoais (Notas)** | Notas, pastas de notas, conversas de oração (texto) | Funcionalidade principal do aplicativo | Consentimento |
| **Dados de Assinatura** | Status PRO (`is_pro`) | Controle de acesso ao plano pago | Execução de contrato |
| **Dados Técnicos** | IP, User-Agent, Páginas visitadas (via Vercel Analytics) | Análise de tráfego e melhorias | Interesse legítimo |

### 2.2 Armazenamento

- **Banco de Dados (Supabase PostgreSQL):** Armazena a maioria dos dados relacionais (perfil, tarefas, treinos, financeiro, etc.) e dados de autenticação.
- **Storage (Supabase):** Armazena a imagem de perfil do usuário (bucket `Avatars`).
- **Cliente (IndexedDB / LocalStorage):** Armazena cache local do estado do aplicativo (`flowzone_data`, `ascend_app_state`) para funcionamento offline e melhor performance.

### 2.3 Serviços Externos e Compartilhamento

- **Supabase:** Provedor de banco de dados e autenticação. Recebe todos os dados relacionais e de autenticação.
- **Cakto:** Plataforma de pagamentos. Recebe dados relacionados à transação financeira para processar a assinatura PRO.
- **Vercel Analytics:** Ferramenta de análise de tráfego. Recebe dados anonimizados de uso do site.
- **OpenAI (via API):** Processa o texto das conversas de oração para gerar respostas de IA.

---

## 3. Implementações Realizadas na Branch `policies`

Todas as alterações foram commitadas na branch `policies`. Abaixo detalhamos as implementações técnicas:

### 3.1 Páginas Públicas

Foram criados dois novos componentes de página para atender à transparência exigida pela LGPD:

1. **`client/src/pages/Privacy.tsx`**: Contém a Política de Privacidade completa, detalhando os dados coletados, finalidade, armazenamento, compartilhamento com terceiros, cookies e os direitos do titular (acesso, correção, eliminação, portabilidade, etc.).
2. **`client/src/pages/Terms.tsx`**: Contém os Termos de Uso do aplicativo, incluindo elegibilidade, descrições dos planos (Free e PRO), regras de pagamento/cancelamento, responsabilidades do usuário e limitação de responsabilidade.

### 3.2 Seção de Configurações

A página de configurações (`client/src/pages/Settings.tsx`) foi expandida com uma nova seção chamada **"Privacidade e Dados"**, que contém os seguintes controles:

- **Política de Privacidade:** Link para a página `/privacy`.
- **Termos de Uso:** Link para a página `/terms`.
- **Solicitar meus dados (Portabilidade):** Um botão que busca todos os dados do usuário no Supabase, agrupa-os em um arquivo JSON estruturado e força o download do navegador.
- **Excluir Conta (Eliminação):** Um botão de "zona de perigo" (vermelho) que, após uma confirmação via `window.confirm`, deleta os registros do usuário em todas as tabelas do banco de dados e faz o logout.

### 3.3 Fluxo de Cadastro

O componente `client/src/pages/Login.tsx` foi modificado para incluir um checkbox obrigatório no fluxo de criação de conta (sign up):

- Adicionado o estado `acceptTerms` (booleano).
- A função `handleSignup` agora verifica se `acceptTerms` é `true`. Caso contrário, exibe um aviso e bloqueia a criação da conta.
- Adicionado um elemento visual contendo o checkbox e links para os Termos de Uso e Política de Privacidade, com links abrindo em nova aba.

### 3.4 Segurança do Banco de Dados (RLS)

Para garantir que os dados de um usuário não possam ser acessados por outro usuário (isolamento de dados), foi criada a migration `supabase/migrations/20260730_add_rls_policies_lgpd.sql`. Esta migration:

1. Habilita o Row Level Security (RLS) em todas as tabelas do projeto (incluindo `profiles`, `tasks`, `goals`, `workouts`, `meals`, `notes`, etc.).
2. Cria políticas (policies) de `SELECT`, `INSERT`, `UPDATE` e `DELETE` que restringem o acesso estritamente ao `user_id` correspondente ao `auth.uid()` do usuário logado.
3. Bloqueia qualquer acesso direto à tabela `cakto_webhook_events` (restrita ao Service Role).
4. Cria políticas de segurança para o bucket de Storage `Avatars`.
5. Cria uma função `request_account_deletion()` (via Security Definer) para garantir a exclusão em cascata de todos os dados do usuário de forma segura.

---

## 4. Próximos Passos Recomendados

Para que essas alterações entrem em vigor no ambiente de produção, o seguinte fluxo deve ser seguido:

1. **Deploy do Frontend:**
   - Merge da branch `policies` para a `main`.
   - O Vercel (ou plataforma de deploy utilizada) fará o deploy automático das novas páginas `/privacy` e `/terms` e das atualizações em Configurações e Login.

2. **Aplicação da Migration no Supabase:**
   - O arquivo `supabase/migrations/20260730_add_rls_policies_lgpd.sql` deve ser executado no **SQL Editor** do dashboard do Supabase.
   - *Atenção:* Habilitar o RLS irá bloquear o acesso a usuários não autenticados. Certifique-se de que todas as consultas no frontend são feitas com o usuário logado. Se houver consultas anônimas (ex: páginas de marketing), elas precisarão de políticas específicas de permissão.

3. **Revisão Jurídica (Opcional mas Recomendado):**
   - Recomenda-se que um advogado revise os textos gerados para a Política de Privacidade e os Termos de Uso, garantindo que estejam perfeitamente alinhados com a legislação brasileira atualizada e com as práticas específicas do seu negócio.
