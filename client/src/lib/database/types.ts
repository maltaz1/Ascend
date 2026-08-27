export interface TaskDatabaseRow {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  category?: string;
  is_recurring: boolean;
  recurrence?: Record<string, unknown>;
  parent_id?: string;
  created_at: string;
}

export interface GoalDatabaseRow {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  description?: string;
  steps: Array<{ id: string; title: string; completed: boolean }>;
  deadline?: string;
  color: string;
  created_at: string;
  completed_at?: string;
  // Campos de metas semanais
  type?: "semanal" | "longo_prazo";
  target_frequency?: number;
  days_completed_week?: boolean[];
  streak?: number;
  record_streak?: number;
  linked_habit_id?: string | null;
  week_start?: string | null;
  smart_specific?: string | null;
  smart_measurable?: string | null;
  smart_achievable?: string | null;
  smart_relevant?: string | null;
}

export interface WorkoutDatabaseRow {
  id: string;
  user_id: string;
  name: string;
  day_of_week: number;
  days_of_week?: number[];
  exercises?: unknown[];
  created_at: string;
}

export interface WorkoutSessionDatabaseRow {
  id: string;
  user_id: string;
  workout_id: string;
  workout_name: string;
  date: string;
  duration_minutes: number;
  exercises?: unknown[];
  total_volume: number;
  completed_at: string;
}

export interface MealDatabaseRow {
  id: string;
  user_id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  date: string;
  foods: unknown[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  timestamp: string;
}

export interface FinancialTransactionDatabaseRow {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  date: string;
  created_at: string;
}

export interface NoteDatabaseRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  favorite: boolean;
  fixed: boolean;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteFolderDatabaseRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface HabitDatabaseRow {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  color: string;
  frequency: "daily" | "weekly";
  completed_dates: string[];
  created_at: string;
  target_days: number;
}

export interface ProfileDatabaseRow {
  id: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
  last_active_date: string;
  total_tasks_completed: number;
  total_goals_completed: number;
  achievements: string[];
}
