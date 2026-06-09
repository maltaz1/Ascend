import type { AppCoreState, Selector } from "./store.types";
import { SubscriptionManager } from "./subscriptions";

export type UpdateCallback<T> = (state: AppCoreState) => T;

export class StoreActions {
  constructor(private readonly subscriptions: SubscriptionManager, private state: AppCoreState) {}

  getState(): AppCoreState {
    return this.state;
  }

  update<T>(callback: UpdateCallback<T>): T {
    const result = callback(this.state);
    const hasPatch = result && typeof result === "object" && result !== (this.state as unknown);
    if (hasPatch) {
      Object.assign(this.state, result as Partial<AppCoreState>);
    }
    this.subscriptions.notify();
    return result;
  }

  replace(state: AppCoreState): void {
    Object.assign(this.state, state);
    this.subscriptions.notify();
  }

  select<T>(selector: Selector<T>): T {
    return selector(this.state);
  }
}
