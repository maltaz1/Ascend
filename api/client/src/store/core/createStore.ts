import { SubscriptionManager } from "./subscriptions";
import type { AppCoreState, Selector } from "./store.types";
import { StoreActions } from "./actions";

export function createStore(initialState: AppCoreState) {
  const subscriptions = new SubscriptionManager();
  const actions = new StoreActions(subscriptions, initialState);

  return {
    getState: () => initialState,
    subscribe: (listener: () => void) => subscriptions.subscribe(listener),
    update: actions.update.bind(actions),
    replace: actions.replace.bind(actions),
    select: actions.select.bind(actions) as (selector: Selector<unknown>) => unknown,
  };
}
