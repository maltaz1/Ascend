import { createStore as createCoreStore } from "./core/createStore";
import { createEntityState } from "./core/entity";
import { persistence } from "./persistence/index";
import { DEFAULT_DATA, AppData } from "./types";
import type { AppCoreState } from "./core/store.types";

const initialState: AppCoreState = {
  user: DEFAULT_DATA.user,
  achievements: DEFAULT_DATA.achievements,
  tasks: createEntityState(),
  goals: createEntityState(),
  habits: createEntityState(),
  workouts: createEntityState(),
  workoutSessions: createEntityState(),
  meals: createEntityState(),
  financialTransactions: createEntityState(),
  dietSettings: DEFAULT_DATA.diet.settings,
  hydration: DEFAULT_DATA.diet.hydration,
  dietPoints: DEFAULT_DATA.diet.dietPoints,
  dietStreak: DEFAULT_DATA.diet.dietStreak,
  prayerConversations: DEFAULT_DATA.prayerConversations,
  favoritePrayers: DEFAULT_DATA.favoritePrayers,
  meta: {
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    lastHeartbeat: Date.now(),
    version: 1,
    syncStatus: "idle",
  },
};

export const store = createCoreStore(initialState);

let saveToken: number | undefined;

function saveStateDebounced() {
  if (saveToken) {
    window.clearTimeout(saveToken);
  }
  saveToken = window.setTimeout(() => {
    persistence.saveState(store.getState()).catch(() => {
      console.warn("Persistence save failed");
    });
  }, 120);
}

function buildAppData(): AppData {
  const state = store.getState();
  return {
    user: state.user,
    tasks: state.tasks.allIds.map(id => state.tasks.byId[id]),
    goals: state.goals.allIds.map(id => state.goals.byId[id]),
    habits: state.habits.allIds.map(id => state.habits.byId[id]),
    achievements: state.achievements,
    workouts: state.workouts.allIds.map(id => state.workouts.byId[id]),
    workoutSessions: state.workoutSessions.allIds.map(id => state.workoutSessions.byId[id]),
    diet: {
      meals: state.meals.allIds.map(id => state.meals.byId[id]),
      settings: state.dietSettings,
      hydration: state.hydration,
      dietPoints: state.dietPoints,
      dietStreak: state.dietStreak,
    },
    prayerConversations: state.prayerConversations,
    favoritePrayers: state.favoritePrayers,
    financial: {
      transactions: state.financialTransactions.allIds.map(id => state.financialTransactions.byId[id]),
    },
  };
}

store.subscribe(saveStateDebounced);

export async function initializeStore(): Promise<void> {
  try {
    const persisted = await persistence.loadState();
    if (persisted) {
      store.replace(persisted);
    }
  } catch (error) {
    console.error("Failed to initialize store", error);
  }
}

export function getData(): AppData {
  return buildAppData();
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => store.update(state => ({ ...state, meta: { ...state.meta, online: true } })));
  window.addEventListener("offline", () => store.update(state => ({ ...state, meta: { ...state.meta, online: false } })));
}
