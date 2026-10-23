# Ascend Mobile (transição)

App de celular do Ascend em React Native com Expo (SDK 58) e Expo Router.
Usa o mesmo Supabase do site, então conta e dados são os mesmos nos dois.

## Como rodar

1. Copie `.env.example` para `.env.local` e preencha com os mesmos valores das variáveis `VITE_*` do site.
2. Instale as dependências: `npm install --legacy-peer-deps`
3. Rode `npx expo start` e leia o QR code com o app **Expo Go** no celular.

Pré-visualização no navegador com dados de exemplo (sem Supabase, PRO liberado): `npm run demo:web` e abra `http://localhost:8082`.

## Identidade visual

Mesma do site (`client/src/index.css`):

- Fontes Space Grotesk (títulos) e DM Sans (texto)
- Fundo de papel com luz: "Caderno Diurno" no claro, "Ledger Noturno" no escuro
- Roxo `#8b5cf6` com destaque âmbar `#f59e0b`, cartões tipo folha de caderno
- Ícone, ícone adaptativo do Android e marca no app vêm de `client/public/icons/icon-any-512.png` (mesmo símbolo das logos, já com fundo transparente)
- Splash: recorte da `Logo-principal.jpg` (pasta `D:\Ascend\Logos`)

## Telas

| Aba / menu | O que faz |
|---|---|
| Hoje | Progresso do dia, nível/XP, atrasadas, tarefas, hábitos e metas |
| Hábitos | Mês com navegação, gráfico de atividade, cartões com todos os dias do mês |
| Tarefas | Faixa de dias, filtros, criar/editar com prioridade e recorrência (PRO) |
| Metas | Semanais (com hábito vinculado) e de longo prazo (com etapas) |
| Mais → Dashboard | Sequência, métricas, gráficos, mapa de 90 dias, insights, prioridades |
| Mais → Calendário | Mês com marcadores, compromissos, tarefas e anotação do dia |
| Mais → Notas (PRO) | Busca, pastas, favoritas, fixadas, editor |
| Mais → Oração (PRO) | Intenções sugeridas, respostas e favoritas |
| Mais → Academia (PRO) | Fichas, treino do dia, sessão com séries, progresso |
| Mais → Dieta (PRO) | Calorias e macros, água, refeições com busca de alimentos, metas |
| Mais → Financeiro (PRO) | Saldo do mês, gastos por categoria, lançamentos |
| Mais → Evolução (PRO) | Carga e volume por exercício |
| Mais → Conquistas | Conquistas desbloqueadas e a desbloquear |
| Mais → Configurações | Perfil, plano, cancelamento, suporte, LGPD, sair, excluir conta |

Limites do plano grátis iguais ao site (5 tarefas/semana, 3 hábitos, 2 metas semanais, 1 meta de longo prazo). Áreas PRO mostram o convite de upgrade, que abre o checkout do Cakto.

## De onde veio cada parte

| Pasta | Origem |
|---|---|
| `src/store`, `src/lib`, `src/types`, `src/shared`, `src/utils` | Copiados do site, com ajustes para celular |
| `src/app`, `src/components`, `src/hooks`, `src/theme.ts`, `src/navigation.ts` | Novos — telas em componentes nativos |

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
