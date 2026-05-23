import type { AppCoreState, OptimisticAction, OptimisticActionResult } from "./store.types";

const pendingQueue: OptimisticAction[] = [];
let processing = false;

function cloneSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function executeOptimisticAction<T>(
  state: AppCoreState,
  action: OptimisticAction<T>
): Promise<OptimisticActionResult<T>> {
  const snapshot = cloneSnapshot(state);
  pendingQueue.push(action);

  try {
    action.apply(state);
    const result = await action.sync();

    if (pendingQueue[0]?.id === action.id) {
      pendingQueue.shift();
    }

    return { payload: result, success: true };
  } catch (error) {
    action.rollback(snapshot);
    if (pendingQueue[0]?.id === action.id) {
      pendingQueue.shift();
    }
    return { payload: undefined as unknown as T, success: false, error };
  }
}

export async function flushPendingActions(): Promise<void> {
  if (processing || pendingQueue.length === 0) return;
  processing = true;

  while (pendingQueue.length > 0) {
    const action = pendingQueue[0];
    try {
      await action.sync();
      pendingQueue.shift();
    } catch {
      break;
    }
  }

  processing = false;
}

export function enqueueOfflineAction(action: OptimisticAction): void {
  pendingQueue.push(action);
}

export function getPendingActions(): ReadonlyArray<OptimisticAction> {
  return pendingQueue;
}
