import { supabase } from "@/lib/supabase";
import { Goal } from "./types";
import { _data, notify, persistState } from "./state";
import { generateId, getTodayString, toYYYYMMDD } from "./utils";
import { addXP } from "./xp-system";
import { evaluateAchievements } from "./achievements";
import { getMondayOfDate, normalizeWeeklyGoalWeek } from "@/lib/weeklyGoals";
import { syncGoalToHabit } from "@/lib/syncHabitGoals";

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

// ---------------------------------------------------------------------------
// Gravações que no web ficavam dentro de pages/Goals.tsx. Trazidas para o
// store para que Hoje, Metas e Dashboard usem exatamente a mesma regra.
// ---------------------------------------------------------------------------

export type NewGoalInput =
  | {
      type: "semanal";
      title: string;
      description?: string;
      emoji: string;
      color: string;
      targetFrequency: number;
      linkedHabitId?: string | null;
    }
  | {
      type: "longo_prazo";
      title: string;
      description?: string;
      emoji: string;
      color: string;
      deadline?: string;
      steps: string[];
    };

export async function createGoal(input: NewGoalInput): Promise<{ error?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não encontrado" };

  const base = {
    user_id: user.id,
    title: input.title.trim(),
    description: input.description || null,
    emoji: input.emoji,
    color: input.color,
  };

  const { error } =
    input.type === "semanal"
      ? await supabase.from("goals").insert({
          ...base,
          type: "semanal",
          target_frequency: input.targetFrequency,
          days_completed_week: [false, false, false, false, false, false, false],
          week_start: getMondayOfDate(new Date()),
          streak: 0,
          record_streak: 0,
          linked_habit_id: input.linkedHabitId || null,
          weekly_history: [],
        })
      : await supabase.from("goals").insert({
          ...base,
          type: "longo_prazo",
          deadline: input.deadline || null,
          steps: input.steps
            .filter(step => step.trim())
            .map(step => ({ id: generateId(), title: step.trim(), completed: false })),
          completed_at: null,
        });

  if (error) return { error: error.message };
  await loadGoalsData();
  return {};
}

export async function removeGoal(id: string): Promise<{ error?: string }> {
  const goal = _data.goals.find(item => item.id === id);
  if (!goal) return {};
  deleteGoal(id);
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) {
    _data.goals.push(goal);
    notify();
    persistState();
    return { error: error.message };
  }
  return {};
}

// Marca/desmarca uma etapa e grava no Supabase (revertendo se falhar).
export async function toggleLongTermStep(goalId: string, stepId: string) {
  const previous = _data.goals.find(item => item.id === goalId);
  if (!previous) return { xpGained: 0, goalCompleted: false, newAchievements: [] as string[] };

  const result = await toggleGoalStep(goalId, stepId);
  const updated = _data.goals.find(item => item.id === goalId);
  if (!updated) return result;

  const { error } = await supabase
    .from("goals")
    .update({ steps: updated.steps, completed_at: updated.completedAt ?? null })
    .eq("id", goalId);

  if (error) {
    _data.goals = _data.goals.map(item => (item.id === goalId ? previous : item));
    notify();
    persistState();
    return { xpGained: 0, goalCompleted: false, newAchievements: [] as string[] };
  }
  return result;
}

// Marca/desmarca um dia da semana numa meta semanal (handleToggleDay do web).
export async function toggleWeeklyGoalDay(goalId: string, dayIndex: number): Promise<{ error?: string }> {
  const goal = _data.goals.find(item => item.id === goalId);
  if (!goal) return {};

  const monday = getMondayOfDate(new Date());
  const day = new Date(`${monday}T12:00:00`);
  day.setDate(day.getDate() + dayIndex);
  if (toYYYYMMDD(day) > getTodayString()) return { error: "Somente dias passados ou hoje" };

  const previousDays = goal.daysCompletedWeek ?? [false, false, false, false, false, false, false];
  const newDays = previousDays.map((value, index) => (index === dayIndex ? !value : value));
  const isMarked = newDays[dayIndex];

  goal.daysCompletedWeek = newDays;
  goal.weekStart = monday;
  notify();
  persistState();

  const { error } = await supabase
    .from("goals")
    .update({ days_completed_week: newDays, week_start: monday, streak: goal.streak ?? 0 })
    .eq("id", goalId);

  if (error) {
    goal.daysCompletedWeek = previousDays;
    notify();
    persistState();
    return { error: error.message };
  }

  if (goal.linkedHabitId) {
    await syncGoalToHabit(goal.linkedHabitId, dayIndex, isMarked);
  }
  return {};
}
