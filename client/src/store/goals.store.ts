import { supabase } from "@/lib/supabase";
import { Goal } from "./types";
import { _data, notify, persistState } from "./state";
import { generateId } from "./utils";
import { addXP } from "./xp-system";
import { evaluateAchievements } from "./achievements";
import { normalizeWeeklyGoalWeek } from "@/lib/weeklyGoals";

export function addGoal(goal: Omit<Goal, "id" | "createdAt">): Goal {
  const newGoal: Goal = {
    ...goal,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  _data.goals = [..._data.goals, newGoal];
  notify();
  persistState();
  return newGoal;
}

export function updateGoal(id: string, updates: Partial<Goal>): void {
  _data.goals = _data.goals.map(goal => (goal.id === id ? { ...goal, ...updates } : goal));
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

  const stepCompleted = !step.completed;
  const updatedGoal = {
    ...goal,
    steps: goal.steps.map(item => (item.id === stepId ? { ...item, completed: stepCompleted } : item)),
  };
  let xpGained = 0;
  let goalCompleted = false;
  const allCompleted = updatedGoal.steps.length > 0 && updatedGoal.steps.every(item => item.completed);
  if (allCompleted && !goal.completedAt) {
    updatedGoal.completedAt = new Date().toISOString();
    _data.user.totalGoalsCompleted += 1;
    addXP(50);
    xpGained = 50;
    goalCompleted = true;
  } else if (!allCompleted && goal.completedAt) {
    _data.user.totalGoalsCompleted = Math.max(0, _data.user.totalGoalsCompleted - 1);
  }
  _data.goals = _data.goals.map(item => (item.id === goalId ? updatedGoal : item));
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
  console.log("[loadGoalsData] Iniciando carregamento de metas...");
  const t0 = performance.now();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[loadGoalsData] Usuário não autenticado, abortando.");
    return;
  }

  console.log("[loadGoalsData] Buscando metas do usuário:", user.id);
  const t1 = performance.now();

  const { data, error } = await supabase.from("goals").select("*").eq("user_id", user.id);

  const t2 = performance.now();
  console.log(`[loadGoalsData] Metas retornaram em ${(t2 - t1).toFixed(0)}ms. Erro:`, error);

  if (error) {
    console.error("[loadGoalsData] Erro ao carregar metas:", error);
    return;
  }

  const mappedGoals = (data || []).map(item => ({
    id: item.id,
    title: item.title,
    emoji: item.emoji,
    description: item.description,
    steps: item.steps || [],
    deadline: item.deadline,
    color: item.color,
    createdAt: item.created_at,
    completedAt: item.completed_at,
    type: item.type,
    targetFrequency: item.target_frequency,
    daysCompletedWeek: item.days_completed_week,
    streak: item.streak,
    recordStreak: item.record_streak,
    linkedHabitId: item.linked_habit_id,
    weekStart: item.week_start,
    weeklyHistory: item.weekly_history || [],
    smartSpecific: item.smart_specific,
    smartMeasurable: item.smart_measurable,
    smartAchievable: item.smart_achievable,
    smartRelevant: item.smart_relevant,
  }));

  const normalizedGoals = mappedGoals.map(goal => {
    if (goal.type !== "semanal") return { goal, changed: false };

    const normalized = normalizeWeeklyGoalWeek({
      id: goal.id,
      title: goal.title,
      emoji: goal.emoji,
      color: goal.color,
      description: goal.description,
      targetFrequency: goal.targetFrequency ?? 1,
      daysCompletedWeek: goal.daysCompletedWeek ?? [false, false, false, false, false, false, false],
      weekStart: goal.weekStart ?? null,
      streak: goal.streak ?? 0,
      recordStreak: goal.recordStreak ?? 0,
      linkedHabitId: goal.linkedHabitId ?? null,
      weeklyHistory: goal.weeklyHistory ?? [],
      createdAt: goal.createdAt ?? "",
    });

    return {
      goal: {
        ...goal,
        daysCompletedWeek: normalized.goal.daysCompletedWeek,
        weekStart: normalized.goal.weekStart,
        streak: normalized.goal.streak,
        recordStreak: normalized.goal.recordStreak,
        weeklyHistory: normalized.goal.weeklyHistory,
      },
      changed: normalized.changed,
    };
  });

  const goalsToPersist = normalizedGoals.filter(({ changed }) => changed);
  if (goalsToPersist.length > 0) {
    await Promise.all(
      goalsToPersist.map(({ goal }) =>
        supabase
          .from("goals")
          .update({
            days_completed_week: goal.daysCompletedWeek,
            week_start: goal.weekStart,
            streak: goal.streak,
            record_streak: goal.recordStreak,
            weekly_history: goal.weeklyHistory,
          })
          .eq("id", goal.id)
          .eq("user_id", user.id),
      ),
    );
  }

  _data.goals = normalizedGoals.map(({ goal }) => goal);

  const t3 = performance.now();
  console.log(`[loadGoalsData] Concluído em ${(t3 - t0).toFixed(0)}ms total. Metas carregadas: ${_data.goals.length}`);

  notify();
  persistState();
}
