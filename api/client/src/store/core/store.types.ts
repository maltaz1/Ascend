import type {
  Achievement,
  DietSettings,
  FinancialTransaction,
  Goal,
  Habit,
  Meal,
  Workout,
  WorkoutSession,
  UserProfile,
} from "../types";

export type EntityState<T extends { id: string }> = {
  byId: Record<string, T>;
  allIds: string[];
  loading: boolean;
  syncing: boolean;
  initialized: boolean;
  error: string | null;
  lastSync?: number;
};

export type SyncStatus = "idle" | "syncing" | "failed" | "offline";

export type StoreMeta = {
  online: boolean;
  lastHeartbeat?: number;
  version: number;
  syncStatus: SyncStatus;
};

export type AppCoreState = {
  user: UserProfile;
  achievements: Achievement[];
  tasks: EntityState<import("../types").Task>;
  goals: EntityState<Goal>;
  habits: EntityState<Habit>;
  workouts: EntityState<Workout>;
  workoutSessions: EntityState<WorkoutSession>;
  meals: EntityState<Meal>;
  financialTransactions: EntityState<FinancialTransaction>;
  dietSettings: DietSettings;
  hydration: import("../types").HydrationLog[];
  dietPoints: number;
  dietStreak: number;
  prayerConversations: import("../types").PrayerConversation[];
  favoritePrayers: import("../types").FavoritePrayer[];
  meta: StoreMeta;
};

export type OptimisticAction<T = unknown> = {
  id: string;
  label: string;
  slice: keyof AppCoreState;
  apply: (state: AppCoreState) => void;
  rollback: (state: AppCoreState) => void;
  sync: () => Promise<T>;
  snapshot: () => AppCoreState;
  onConflict?: (error: unknown, state: AppCoreState) => void;
};

export type OptimisticActionResult<T> = {
  payload: T;
  success: boolean;
  error?: unknown;
};

export type Selector<T> = (state: AppCoreState) => T;

export type EntityActionPayload<T> = {
  entity: T;
  patch?: Partial<T>;
};
