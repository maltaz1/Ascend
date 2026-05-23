import type { EntityState } from "./store.types";

export function createEntityState<T extends { id: string }>(): EntityState<T> {
  return {
    byId: {},
    allIds: [],
    loading: false,
    syncing: false,
    initialized: false,
    error: null,
    lastSync: undefined,
  };
}

export function normalizeEntities<T extends { id: string }>(items: T[]): EntityState<T> {
  const byId: Record<string, T> = {};
  const allIds: string[] = [];
  items.forEach(item => {
    byId[item.id] = item;
    if (!allIds.includes(item.id)) {
      allIds.push(item.id);
    }
  });
  return {
    byId,
    allIds,
    loading: false,
    syncing: false,
    initialized: true,
    error: null,
    lastSync: Date.now(),
  };
}

export function entityToArray<T extends { id: string }>(state: EntityState<T>): T[] {
  return state.allIds.map(id => state.byId[id]).filter(Boolean);
}

export function getEntityById<T extends { id: string }>(state: EntityState<T>, id: string): T | undefined {
  return state.byId[id];
}

export function upsertEntity<T extends { id: string }>(
  state: EntityState<T>,
  item: T
): EntityState<T> {
  const next = { ...state, byId: { ...state.byId, [item.id]: item } };
  if (!next.allIds.includes(item.id)) {
    next.allIds = [...next.allIds, item.id];
  }
  next.initialized = true;
  next.lastSync = Date.now();
  next.error = null;
  return next;
}

export function updateEntity<T extends { id: string }>(
  state: EntityState<T>,
  id: string,
  patch: Partial<T>
): EntityState<T> {
  const current = state.byId[id];
  if (!current) {
    return state;
  }
  return upsertEntity(state, { ...current, ...patch });
}

export function removeEntity<T extends { id: string }>(state: EntityState<T>, id: string): EntityState<T> {
  if (!state.byId[id]) {
    return state;
  }
  const nextById = { ...state.byId };
  delete nextById[id];
  return {
    ...state,
    byId: nextById,
    allIds: state.allIds.filter(itemId => itemId !== id),
    lastSync: Date.now(),
  };
}

export function setLoading<T extends { id: string }>(state: EntityState<T>, value: boolean): EntityState<T> {
  return { ...state, loading: value, error: value ? null : state.error };
}

export function setSyncing<T extends { id: string }>(state: EntityState<T>, value: boolean): EntityState<T> {
  return { ...state, syncing: value };
}

export function setError<T extends { id: string }>(state: EntityState<T>, error: string | null): EntityState<T> {
  return { ...state, error };
}
