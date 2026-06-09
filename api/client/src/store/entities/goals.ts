import { supabase } from "@/lib/supabase";
import { getData, store } from "../store";
import { normalizeEntities, entityToArray, upsertEntity, removeEntity, setLoading, setError } from "../core/entity";
import { generateId } from "../utils";
import { loadGoals, createGoalRow } from "@/lib/database";
import { evaluateAchievements } from "../achievements";
import { awardXp, createXpPayload } from "../xp-engine";
import type { Goal } from "../types";

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function loadGoalsData(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  store.update(state => {
    state.goals = setLoading(state.goals, true);
  });

  const rows = await loadGoals(userId);
  const goals = rows.map(goal => ({
    id: goal.id,
    title: goal.title,
    emoji: goal.emoji,
    description: goal.description,
    steps: goal.steps || [],
    deadline: goal.deadline,
    color: goal.color,
    createdAt: goal.created_at,
    completedAt: goal.completed_at,
  }));

  store.update(state => {
    state.goals = normalizeEntities(goals);
    state.goals.error = null;
  });
}

export function addGoal(goal: Omit<Goal, "id" | "createdAt">): Goal {
  const newGoal: Goal = {
    ...goal,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  store.update(state => {
    state.goals = upsertEntity(state.goals, newGoal);
  });

  return newGoal;
}

export function updateGoal(id: string, updates: Partial<Goal>): void {
  const state = store.getState();
  const current = state.goals.byId[id];
  if (!current) return;

  store.update(storeState => {
    storeState.goals = upsertEntity(storeState.goals, { ...current, ...updates });
  });
}

export function deleteGoal(id: string): void {
  store.update(state => {
    state.goals = removeEntity(state.goals, id);
  });
}

export async function toggleGoalStep(goalId: string, stepId: string): Promise<{ xpGained: number; goalCompleted: boolean; newAchievements: string[] }> {
  const state = store.getState();
  const goal = state.goals.byId[goalId];
  if (!goal) return { xpGained: 0, goalCompleted: false, newAchievements: [] };

  const step = goal.steps.find(item => item.id === stepId);
  if (!step) return { xpGained: 0, goalCompleted: false, newAchievements: [] };

  const updatedSteps = goal.steps.map(item =>
    item.id === stepId ? { ...item, completed: !item.completed } : item
  );

  const allCompleted = updatedSteps.length > 0 && updatedSteps.every(item => item.completed);
  const completedAt = allCompleted ? new Date().toISOString() : undefined;

  store.update(storeState => {
    storeState.goals = upsertEntity(storeState.goals, {
      ...goal,
      steps: updatedSteps,
      completedAt,
    });
    if (allCompleted && !goal.completedAt) {
      storeState.user.totalGoalsCompleted += 1;
    } else if (!allCompleted && goal.completedAt) {
      storeState.user.totalGoalsCompleted = Math.max(0, storeState.user.totalGoalsCompleted - 1);
    }
  });

  let xpGained = 0;
  if (allCompleted && !goal.completedAt) {
    xpGained = await awardXp(createXpPayload("GOAL_COMPLETED", 50));
  }

  const newAchievements = evaluateAchievements(getData());
  return { xpGained, goalCompleted: allCompleted, newAchievements };
}

export function getGoalProgress(goal: Goal): number {
  if (goal.steps.length === 0) return 0;
  return Math.round((goal.steps.filter(step => step.completed).length / goal.steps.length) * 100);
}
