import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type {
  TaskDatabaseRow,
  GoalDatabaseRow,
  WorkoutDatabaseRow,
  WorkoutSessionDatabaseRow,
  MealDatabaseRow,
  FinancialTransactionDatabaseRow,
} from "./types";

export async function loadTasks(userId: string) {
  const { data, error } = await supabase.from("tasks").select("*").eq("user_id", userId);
  if (error) {
    logger.error("database", "Failed to load tasks", error);
    return [];
  }
  return data || [];
}

export async function loadGoals(userId: string) {
  const { data, error } = await supabase.from("goals").select("*").eq("user_id", userId);
  if (error) {
    logger.error("database", "Failed to load goals", error);
    return [];
  }
  return data || [];
}

export async function loadWorkouts(userId: string) {
  const { data, error } = await supabase.from("workouts").select("*").eq("user_id", userId);
  if (error) {
    logger.error("database", "Failed to load workouts", error);
    return [];
  }
  return data || [];
}

export async function loadWorkoutSessions(userId: string) {
  const { data, error } = await supabase.from("workout_sessions").select("*").eq("user_id", userId);
  if (error) {
    logger.error("database", "Failed to load workout sessions", error);
    return [];
  }
  return data || [];
}

export async function loadMeals(userId: string) {
  const { data, error } = await supabase.from("meals").select("*").eq("user_id", userId);
  if (error) {
    logger.error("database", "Failed to load meals", error);
    return [];
  }
  return data || [];
}

export async function loadFinancialTransactions(userId: string) {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("user_id", userId);
  if (error) {
    logger.error("database", "Failed to load financial transactions", error);
    return [];
  }
  return data || [];
}
