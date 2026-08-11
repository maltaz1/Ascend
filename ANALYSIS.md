# Análise do Bug de Atualização Instantânea

## Problema Raiz

O projeto tem DOIS stores separados que não estão sincronizados:

### Store 1: Antigo (`client/src/store/state.ts`)
- Exporta: `_data`, `getData`, `subscribe`, `notify`, `persistState`
- Usado pelo `useStore` hook (`hooks/useStore.ts`) que faz `import { getData, subscribe } from '@/lib/store'`
- O `diet.store.ts` (legado) mutua `_data.diet.meals` e `_data.diet.hydration` IN-PLACE e chama `notify()`

### Store 2: Novo (`client/src/store/store.ts`)
- Exporta: `store`, `getData`, `initializeStore`, `buildAppData`
- Usa entidades (byId/allIds) e tem seu próprio subscribe via SubscriptionManager
- O `realtime-engine.ts` importa `loadDietData` de `../entities/diet` que atualiza o store NOVO
- O `entities/diet.ts` também atualiza o store NOVO

## O que acontece na prática

1. O `useStore` hook assina o store ANTIGO (`state.ts`)
2. Quando `addWaterMl` (diet.store.ts) é chamado, ele mutua `_data.diet.hydration` e chama `notify()` do store antigo
3. O `useStore` recebe o notify, faz `setData({ ...getData() })` - cria novo objeto raiz
4. MAS: `data.diet.meals` e `data.diet.hydration` são REFERÊNCIAS ao mesmo array mutado
5. Os `useMemo` com `[data.diet.meals]` NÃO detectam mudança porque a referência do array é a mesma

## Solução

A página Diet deve:
1. Usar `subscribe` + clonagem manual (padrão do Financial.tsx) OU
2. Calcular derivações direto no render sem useMemo em arrays mutáveis (padrão do CalendarView.tsx)

A abordagem mais robusta: subscrever ao store manualmente e clonar os arrays relevantes a cada notify,
depois derivar tudo a partir desses arrays clonados com useMemo.
