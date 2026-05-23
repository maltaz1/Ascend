import { supabase } from "@/lib/supabase";
import { Goal } from "./types";
import { _data, notify, persistState } from "./state";
import { generateId } from "./utils";
import { addXP } from "./xp-system";
import { evaluateAchievements } from "./achievements";

export function addGoal(goal: Omit<Goal, "id" | "createdAt">): Goal {
  const newGoal: Goal = {
    ...goal,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  _data.goals.push(newGoal);
  notify();
  persistState();
  return newGoal;
}

export function updateGoal(id: string, updates: Partial<Goal>): void {
  const index = _data.goals.findIndex(goal => goal.id === id);
  if (index === -1) return;

  _data.goals[index] = { ..._data.goals[index], ...updates };
  notify();
  persistState();
}

export function deleteGoal(id: string): void {
  _data.goals = _data.goals.filter(goal => goal.id !== id);
  notify();
  persistState();
}

export async function toggleGoalStep(
  goalId: string,
  stepId: string
): Promise<{ xpGained: number; goalCompleted: boolean; newAchievements: string[] }> {
  const goal = _data.goals.find(item => item.id === goalId);
  if (!goal) return { xpGained: 0, goalCompleted: false, newAchievements: [] };

  const step = goal.steps.find(item => item.id === stepId);
  if (!step) return { xpGained: 0, goalCompleted: false, newAchievements: [] };

  step.completed = !step.completed;

  let xpGained = 0;
  let goalCompleted = false;

  const allCompleted = goal.steps.length > 0 && goal.steps.every(item => item.completed);

  if (allCompleted && !goal.completedAt) {
    goal.completedAt = new Date().toISOString();
    _data.user.totalGoalsCompleted += 1;
    addXP(50);
    xpGained = 50;
    goalCompleted = true;
  } else if (!allCompleted && goal.completedAt) {
    goal.completedAt = undefined;
    _data.user.totalGoalsCompleted = Math.max(0, _data.user.totalGoalsCompleted - 1);
  }

  const newAchievements = evaluateAchievements(_data);
  notify();
  persistState();

  return { xpGained, goalCompleted, newAchievements };
}

export function getGoalProgress(goal: Goal): number {
  if (goal.steps.length === 0) return 0;
  return Math.round((goal.steps.filter(step => step.completed).length / goal.steps.length) * 100);
}

export async function loadGoalsData(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase.from("goals").select("*").eq("user_id", user.id);
  if (error) {
    console.error("Erro ao carregar metas:", error);
    return;
  }

  _data.goals = (data || []).map(item => ({
    id: item.id,
    title: item.title,
    emoji: item.emoji,
    description: item.description,
    steps: item.steps || [],
    deadline: item.deadline,
    color: item.color,
    createdAt: item.created_at,
    completedAt: item.completed_at,
  }));

  notify();
  persistState();
}
