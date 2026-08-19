# Notas da correção do bug da aba "Hoje" (branch fix/today-tab-sync)

## Problema
A aba `/today` (client/src/pages/Today.tsx) usa `useStore()` → `subscribe/getData` do store legado em `client/src/store/state.ts` (`_data`, `notify()`). As páginas Tasks.tsx, Habits.tsx e Goals.tsx mantêm estado local (`useState`) e gravam direto no Supabase sem atualizar `_data`. O realtime engine (`store/realtime/realtime-engine.ts`) recarrega `loadTasksData/loadHabitsData/...` mas ignora echoes do próprio cliente (`self:false` + `isSelfWrite`). Resultado: Today só atualiza após reload da página.

## Arquitetura do store legado
- `client/src/store/state.ts`: `_data: AppData`, `listeners` Set, `notify()` (debounce 0), `replaceState()`, `markSelfWrite/isSelfWrite`.
- `client/src/store/tasks.store.ts`: `addTask/updateTask/deleteTask/loadTasksData` — já usam `_data` + `notify()` + `markSelfWrite`.
- `client/src/store/habits.store.ts`: `addHabit/updateHabit/deleteHabit/toggleHabitDate/loadHabitsData` — mesmos padrões.
- `client/src/store/goals.store.ts`: `addGoal/updateGoal/deleteGoal/toggleGoalStep/loadGoalsData`.
- `App.tsx`: `preloadStartupData()` roda loaders uma vez no boot; `initRealtimeSync` liga realtime em mount com usuário.

## Correção implementada (branch fix/today-tab-sync)
1. **`client/src/store/cross-tab-sync.ts`** (NOVO): BroadcastChannel "ascend-cross-tab". Quando outra aba/janela muta dados (outro contexto do mesmo usuário recebe eventos realtime e roda loaders), este módulo escuta mensagem `{type:"mutations", tables, ts}` e agenda reload dos loaders (loadTasksData/loadHabitsData/loadGoalsData/loadDietData/loadFinancialData + perfil via loadProfile/profileFromRow). Também escuta `{type:"reloaded"}`. `setupVisibilityReload()`: ao voltar visibilidade, roda reload se houve mutação.
2. Exports: `client/src/store/index.ts` e `client/src/lib/store.ts` exportam `markCrossTabMutations`, `broadcastReloadComplete`.
3. **App.tsx**: adicionado `import "./store/cross-tab-sync";` após imports de store.
4. **Tasks.tsx**:
   - `fetchTasks` agora reflete a lista no `_data.tasks` (mapeando campos do store, inclui parentId) + `notify()`.
   - `handleToggle`: update otimista em `_data.tasks` + `markSelfWrite("tasks", id)` + rollback em erro.
   - `handleDelete`: remove de `_data.tasks` com backup p/ rollback + `markSelfWrite`.
   - `handleDeleteAllOccurrences`: remove mãe+filhas do `_data` antes do fetchTasks.
   - Recorrência exceptions: `markCrossTabMutations(["tasks"])` após update no DB.
5. **Habits.tsx** (em progresso): sincronizar `loadHabits`, `updateHabitLocally`, `removeHabitLocally`, modal criação, `restoreHabitLocally` com o store global + `markSelfWrite("habits",id)` + `markCrossTabMutations(["habits"])`.
6. **Goals.tsx** (em progresso): sincronizar `loadGoals`, `updateGoalLocally`, `removeGoalLocally`, `restoreGoalLocally`, `onDelete` semanal, modal criação com store global + `markSelfWrite("goals",id)` + `markCrossTabMutations(["goals"])`.
7. Checar TS: `npx tsc --noEmit` (projeto usa npm; instalar deps com `npm install`; pnpm-lock presente mas usamos npm).

## Detalhes de mapeamento
- Task no store: `{id,title,description,date,completed,priority,category,createdAt,isRecurring,recurrence}` (sem parentId — mas Tasks.tsx usa parentId local; normalizeTask retorna parentId. Ao refletir, incluir parentId no _data.tasks é seguro? O tipo Task do store não tem parentId; usar spread + parentId ignorado é OK se usarmos asssign manual. NOTA: editar Tasks.tsx já usa assign manual SEM parentId — OK).
- Goal no store: `{id,title,emoji,description,steps,deadline,color,createdAt,completedAt,type,targetFrequency,daysCompletedWeek,streak,recordStreak,linkedHabitId,weekStart}`.
- Habit no store: `{id,title,emoji,color,frequency,completedDates,createdAt,targetDays}`.
- `normalizeWeeklyGoals` em Goals.tsx retorna Goal[] já com snake→camel; pode ser reaproveitado? Está como function local `normalizeWeeklyGoals` — verificar se exportável. Se não, mapear manualmente no Goals.tsx.
- `profileFromRow` em `client/src/lib/database/mappers.ts` linha 126; `loadProfile` em `queries.ts` linha 81.

## Status dos arquivos
- cross-tab-sync.ts: FEITO
- store/index.ts + lib/store.ts exports: FEITO
- App.tsx import: FEITO
- Tasks.tsx: FEITO (toggle, delete, deleteAll, exceptions, fetchTasks reflect)
- Habits.tsx: FEITO (loadHabits reflete no _data; updateHabitLocally/removeHabitLocally/restoreHabitLocally com markSelfWrite+notify; NewHabitModal e deletas com markCrossTabMutations(["habits"]))
- Nota: Habits.tsx handleToggle (HabitRow/HabitCard) chama onHabitUpdated = updateHabitLocally → já cobre toggle. Falta marcar cross-tab nos toggles dos componentes internos (syncHabitToGoals + supabase update) — os toggles já atualizam o store localmente via updateHabitLocally antes do call Supabase; adicionar markCrossTabMutations após sucesso do update no DB em ambos os handleToggle (HabitRow linha ~211-225, HabitCard ~334-347) para outros tabs verem o toggle imediatamente.
- Goals.tsx: PENDENTE
- Falta: rodar `npx tsc --noEmit`, commit, push branch, entregar.
