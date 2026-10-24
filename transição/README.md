# Ascend Mobile (transição)

App de celular do Ascend em React Native com Expo (SDK 58) e Expo Router.
Usa o mesmo Supabase do site, então conta e dados são os mesmos nos dois.

## Como rodar

1. Copie `.env.example` para `.env.local` e preencha com os mesmos valores das variáveis `VITE_*` do site.
2. Instale as dependências: `npm install --legacy-peer-deps`
3. Rode `npx expo start` e leia o QR code com o app **Expo Go** no celular.

Pré-visualização no navegador com dados de exemplo (sem Supabase, PRO liberado): `npm run demo:web` e abra `http://localhost:8082`.

## Identidade visual

Igual ao site no celular (conferido lado a lado com o site rodando localmente em 375 px):

- Menu lateral (☰) com o mesmo conteúdo e o item ativo em âmbar; botão de tema claro/escuro (padrão escuro, salvo na chave `theme` como no site)
- Fontes Space Grotesk (títulos), DM Sans (texto) e monoespaçada nos valores em dinheiro
- "Ledger" do `client/src/index.css`: folhas com borda de cima de 2 px, cantos de 6 px e sombra dura; rótulos de margem numerados ("01 — …"); carimbos em caixa alta; campos sublinhados
- Gráficos em SVG no estilo do recharts: curvas suaves com área em degradê, grade tracejada, eixos com números, barras arredondadas com o dia atual em destaque, rosca, sparkline e mapa de calor
- Logo do menu: `client/public/Logo-TaskBar.png`; ícone do app e marca: `client/public/icons/icon-any-512.png`; splash: recorte da `Logo-principal.jpg` (pasta `D:\Ascend\Logos`)

## Telas (menu lateral)

| Área | O que faz |
|---|---|
| Hoje | Progresso do dia, nível/XP, tarefas, hábitos e metas da semana / longo prazo |
| Hábitos | Busca, mês, gráfico "Consistência em foco" (diário/semanal), tabela com os dias do mês |
| Tarefas | Mini calendário, filtros (todas/pendentes/concluídas/atrasadas), busca, criar/editar com recorrência (PRO) |
| Metas | "Livro de objetivos": semanais com dias e consistência, longo prazo com etapas |
| Dashboard | Painel de nível, métricas, sequência, mapa de 90 dias, evolução, semana, insights, tendência |
| Oração (PRO) | Intenções sugeridas, respostas e favoritas |
| Academia (PRO) | Abas Treinos / Exercícios / Evolução, fichas e sessão com séries |
| Dieta (PRO) | Meta calórica, anéis de macros, hidratação, refeições com busca de alimentos |
| Financeiro (PRO) | Entradas/gastos/saldo, comparação com mês e semana anteriores, calendário, distribuição, lançamentos |
| Notas (PRO) | Busca, pastas, favoritas, fixadas, editor |
| Calendário | Grade do mês com marcadores, compromissos, tarefas e anotação do dia |
| Configurações | Perfil, plano, cancelamento, suporte, LGPD, sair, excluir conta |

Evolução e Conquistas também existem como telas (`/evolution`, `/achievements`), mas não aparecem no menu — como no site.

Limites do plano grátis iguais ao site (5 tarefas/semana, 3 hábitos, 2 metas semanais, 1 meta de longo prazo). Áreas PRO mostram o convite de upgrade, que abre o checkout do Cakto.

## De onde veio cada parte

| Pasta | Origem |
|---|---|
| `src/store`, `src/lib`, `src/types`, `src/shared`, `src/utils` | Copiados do site, com ajustes para celular |
| `src/app`, `src/components`, `src/hooks`, `src/theme.tsx`, `src/navigation.ts` | Novos — telas em componentes nativos |

Regras que no site ficavam dentro das páginas e vieram para a camada de lógica:

- `store/habits.store.ts`: `createHabit`, `removeHabit`
- `store/goals.store.ts`: `createGoal`, `removeGoal`, `toggleLongTermStep`, `toggleWeeklyGoalDay`
- `store/tasks.store.ts`: `saveTask` (com recorrência)
- `config/planLimits.ts`: contagem semanal de tarefas
- `lib/prayer.ts`, `lib/account.ts` (excluir conta), `lib/noteText.ts` (HTML das notas ↔ texto)

Outros ajustes: `lib/supabase.ts` usa `EXPO_PUBLIC_*` e `localStorage` do `expo-sqlite`; `lib/notifications.ts` usa o `<ToastHost />`; `store/cross-tab-sync.ts` virou no-op; `store/xp-engine.ts` soma XP na store das telas (no site somava numa store que nenhuma tela lia).

## Limitações conhecidas

- Notas: o site usa editor rico (HTML). No app a edição é em texto simples; negrito/listas feitos no site viram texto ao salvar pelo celular.
- Assinatura PRO: abre o checkout do Cakto no navegador. Apple e Google costumam exigir compra dentro do app para assinaturas digitais.
- Ainda sem notificações push (`expo-notifications`).
- A pasta tem espaço e acentos no caminho, o que pode quebrar builds nativos locais no Windows (`expo run:android`). Expo Go e EAS Build não são afetados.
