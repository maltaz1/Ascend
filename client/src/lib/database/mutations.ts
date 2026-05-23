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

export async function createTaskRow(payload: Omit<TaskDatabaseRow, "id">) {
  const { data, error } = await supabase.from("tasks").insert([payload]).select().single();
  if (error) {
    logger.error("database", "Failed to create task row", error);
    throw error;
  }
  return data;
}

export async function updateTaskRow(id: string, payload: Partial<Omit<TaskDatabaseRow, "id" | "user_id" | "created_at">>) {
  const { data, error } = await supabase.from("tasks").update(payload).eq("id", id).single();
  if (error) {
    logger.error("database", "Failed to update task row", error);
    throw error;
  }
  return data;
}

export async function deleteTaskRow(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) {
    logger.error("database", "Failed to delete task row", error);
    throw error;
  }
}

export async function createGoalRow(payload: Omit<GoalDatabaseRow, "id">) {
  const { data, error } = await supabase.from("goals").insert([payload]).select().single();
  if (error) {
    logger.error("database", "Failed to create goal row", error);
    throw error;
  }
  return data;
}

export async function updateGoalRow(id: string, payload: Partial<Omit<GoalDatabaseRow, "id" | "user_id" | "created_at">>) {
  const { data, error } = await supabase.from("goals").update(payload).eq("id", id).single();
  if (error) {
    logger.error("database", "Failed to update goal row", error);
    throw error;
  }
  return data;
}

export async function deleteGoalRow(id: string) {
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) {
    logger.error("database", "Failed to delete goal row", error);
    throw error;
  }
}

export async function createWorkoutRow(payload: Omit<WorkoutDatabaseRow, "id">) {
  const { data, error } = await supabase.from("workouts").insert([payload]).select().single();
  if (error) {
    logger.error("database", "Failed to create workout row", error);
    throw error;
  }
  return data;
}

export async function createWorkoutSessionRow(payload: Omit<WorkoutSessionDatabaseRow, "id">) {
  const { data, error } = await supabase.from("workout_sessions").insert([payload]).select().single();
  if (error) {
    logger.error("database", "Failed to create workout session row", error);
    throw error;
  }
  return data;
}

export async function createMealRow(payload: Omit<MealDatabaseRow, "id">) {
  const { data, error } = await supabase.from("meals").insert([payload]).select().single();
  if (error) {
    logger.error("database", "Failed to create meal row", error);
    throw error;
  }
  return data;
}

export async function deleteMealRow(id: string) {
  const { error } = await supabase.from("meals").delete().eq("id", id);
  if (error) {
    logger.error("database", "Failed to delete meal row", error);
    throw error;
  }
}

export async function createFinancialTransactionRow(payload: Omit<FinancialTransactionDatabaseRow, "id">) {
  const { data, error } = await supabase.from("financial_transactions").insert([payload]).select().single();
  if (error) {
    logger.error("database", "Failed to create financial transaction row", error);
    throw error;
  }
  return data;
}

export async function deleteFinancialTransactionRow(id: string) {
  const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
  if (error) {
    logger.error("database", "Failed to delete financial transaction row", error);
    throw error;
  }
}

export async function deleteWorkoutSessionRow(id: string) {
  const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
  if (error) {
    logger.error("database", "Failed to delete workout session row", error);
    throw error;
  }
}
