type EventName =
  | "TASK_COMPLETED"
  | "GOAL_COMPLETED"
  | "LEVEL_UP"
  | "ACHIEVEMENT_UNLOCKED"
  | "WORKOUT_FINISHED"
  | "MEAL_LOGGED"
  | "FINANCIAL_TRANSACTION_CREATED"
  | "XP_AWARDED";

type EventPayload = Record<string, unknown>;

type EventListener = (payload: EventPayload) => void;

class EventBus {
  private listeners: Map<EventName, Set<EventListener>> = new Map();

  on(event: EventName, listener: EventListener): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(listener);
    this.listeners.set(event, set);
    return () => set.delete(listener);
  }

  emit(event: EventName, payload: EventPayload = {}): void {
    const set = this.listeners.get(event);
    if (!set) return;
    set.forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.error("EventBus error", event, error);
      }
    });
  }
}

export const eventBus = new EventBus();
