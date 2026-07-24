import type {
  TaskDatabaseRow,
  GoalDatabaseRow,
  WorkoutDatabaseRow,
  WorkoutSessionDatabaseRow,
  MealDatabaseRow,
  FinancialTransactionDatabaseRow,
} from "./types";
import type {
  Task,
  Goal,
  Workout,
  WorkoutSession,
  Meal,
  FinancialTransaction,
} from "@/store/types";
import type { RecurrenceConfig } from "@/types/recurrence";

export function taskFromRow(row: TaskDatabaseRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    completed: row.completed,
    priority: row.priority,
    category: row.category,
    createdAt: row.created_at,
    isRecurring: row.is_recurring ?? false,
    recurrence: row.recurrence as RecurrenceConfig | undefined,
  };
}

export function goalFromRow(row: GoalDatabaseRow): Goal {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    description: row.description,
    steps: row.steps || [],
    deadline: row.deadline,
    color: row.color,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function workoutFromRow(row: WorkoutDatabaseRow): Workout {
  return {
    id: row.id,
    name: row.name,
    dayOfWeek: row.day_of_week,
    exercises: Array.isArray(row.exercises) ? (row.exercises as Workout['exercises']) : [],
    createdAt: row.created_at,
  };
}

export function workoutSessionFromRow(row: WorkoutSessionDatabaseRow): WorkoutSession {
  return {
    id: row.id,
    workoutId: row.workout_id,
    workoutName: row.workout_name,
    date: row.date,
    durationMinutes: row.duration_minutes,
    exercises: Array.isArray(row.exercises) ? (row.exercises as WorkoutSession['exercises']) : [],
    totalVolume: row.total_volume,
    completedAt: row.completed_at,
  };
}

export function mealFromRow(row: MealDatabaseRow): Meal {
  return {
    id: row.id,
    type: row.type,
    date: row.date,
    foods: row.foods as Meal["foods"],
    totalCalories: row.total_calories,
    totalProtein: row.total_protein,
    totalCarbs: row.total_carbs,
    totalFat: row.total_fat,
    timestamp: row.timestamp,
  };
}

export function financialTransactionFromRow(row: FinancialTransactionDatabaseRow): FinancialTransaction {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    type: row.type,
    category: row.category,
    date: row.date,
    createdAt: row.created_at,
  };
}
