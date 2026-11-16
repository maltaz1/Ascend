import { supabase } from "@/lib/supabase";
import { Habit } from "./types";
import { _data, notify, persistState, markActiveToday, markSelfWrite } from "./state";
import { generateId, getTodayString, toYYYYMMDD } from "./utils";
import { addXP } from "./xp-system";
import { evaluateAchievements } from "./achievements";

export function addHabit(habit: Omit<Habit, "id" | "createdAt" | "completedDates">): Habit {
  const newHabit: Habit = {
    ...habit,
    id: generateId(),
    createdAt: new Date().toISOString(),
    completedDates: [],
  };

  _data.habits.push(newHabit);
  notify();
  persistState();
  return newHabit;
}

// No web esta gravação ficava dentro de pages/Habits.tsx; trazida para o store
// para que qualquer tela do app crie hábitos do mesmo jeito.
export async function createHabit(input: {
  title: string;
  emoji: string;
  color: string;
  targetDays: number;
  category?: string | null;
}): Promise<{ error?: string }> {
  if (process.env.EXPO_PUBLIC_DEMO === "1") {
    addHabit({ title: input.title.trim(), emoji: input.emoji, color: input.color, frequency: "daily", targetDays: input.targetDays, category: input.category ?? undefined });
    return {};
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não encontrado" };

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    title: input.title.trim(),
    emoji: input.emoji,
    color: input.color,
    frequency: "daily",
    target_days: input.targetDays,
    completed_dates: [],
    // Só envia quando há etiqueta: sem ela o insert funciona mesmo antes da coluna existir no banco.
    ...(input.category ? { category: input.category } : {}),
  });

  if (error) return { error: error.message };

  await loadHabitsData();
  return {};
}

// Exclusão otimista, como em pages/Habits.tsx no web: some da tela na hora e
// volta se o Supabase recusar.
export async function removeHabit(id: string): Promise<{ error?: string }> {
  const habit = _data.habits.find(item => item.id === id);
  if (!habit) return {};

  deleteHabit(id);
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) {
    _data.habits.push(habit);
    notify();
    persistState();
    return { error: error.message };
  }
  return {};
}

// Edita um hábito existente (nome, ícone, cor, meta e atributo), com reversão se o banco recusar.
export async function editHabit(
  id: string,
  input: { title: string; emoji: string; color: string; targetDays: number; category: string | null }
): Promise<{ error?: string }> {
  const before = _data.habits.find(item => item.id === id);
  if (!before) return { error: "Hábito não encontrado" };
  const prev = { title: before.title, emoji: before.emoji, color: before.color, targetDays: before.targetDays, category: before.category };
  updateHabit(id, { title: input.title.trim(), emoji: input.emoji, color: input.color, targetDays: input.targetDays, category: input.category ?? undefined });
  if (process.env.EXPO_PUBLIC_DEMO === "1") return {};
  const { error } = await supabase
    .from("habits")
    .update({ title: input.title.trim(), emoji: input.emoji, color: input.color, target_days: input.targetDays, ...(input.category !== (prev.category ?? null) ? { category: input.category } : {}) })
    .eq("id", id);
  if (error) {
    updateHabit(id, prev);
    return { error: error.message };
  }
  markSelfWrite("habits", id);
  return {};
}

// Define (ou limpa) a etiqueta de atributo de um hábito já existente.
export async function setHabitCategory(id: string, category: string | null): Promise<{ error?: string }> {
  const before = _data.habits.find(item => item.id === id)?.category;
  updateHabit(id, { category: category ?? undefined });
  if (process.env.EXPO_PUBLIC_DEMO === "1") return {};
  const { error } = await supabase.from("habits").update({ category }).eq("id", id);
  if (error) {
    updateHabit(id, { category: before });
    return { error: error.message };
  }
  return {};
}

export function updateHabit(id: string, updates: Partial<Habit>): void {
  const index = _data.habits.findIndex(item => item.id === id);
  if (index === -1) return;

  _data.habits[index] = { ..._data.habits[index], ...updates };
  notify();
  persistState();
}

export function deleteHabit(id: string): void {
  _data.habits = _data.habits.filter(item => item.id !== id);
  notify();
  persistState();
}

export async function toggleHabitDate(
  habitId: string,
  date: string
): Promise<{ xpGained: number }> {
  const habit = _data.habits.find(item => item.id === habitId);
  if (!habit) return { xpGained: 0 };

  const previousCompletedDates = [...habit.completedDates];
  const existingIndex = previousCompletedDates.indexOf(date);
  let xpGained = 0;
  let newCompletedDates: string[];
  if (existingIndex === -1) {
    newCompletedDates = [...previousCompletedDates, date];
    markActiveToday();
    void addXP(5);
    xpGained = 5;
    evaluateAchievements(_data);
  } else {
    newCompletedDates = previousCompletedDates.filter((_, i) => i !== existingIndex);
  }
  _data.habits = _data.habits.map(item => (item.id === habitId ? { ...item, completedDates: newCompletedDates } : item));
  notify();
  persistState();
  markSelfWrite("habits", habitId);
  void (async () => {
    const { error } = await supabase
      .from("habits")
      .update({ completed_dates: newCompletedDates })
      .eq("id", habitId);
    if (error) {
      console.error("Erro ao salvar hábito:", error);
      _data.habits = _data.habits.map(item => (item.id === habitId ? { ...item, completedDates: previousCompletedDates } : item));
      notify();
      persistState();
    }
  })();return { xpGained };
}

export function getHabitMonthProgress(habit: Habit, year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let completed = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (habit.completedDates.includes(dateStr)) completed += 1;
  }

  return completed;
}

export function getHabitMonthRate(habit: Habit, year: number, month: number): number {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const daysToCount = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate();
  const completed = getHabitMonthProgress(habit, year, month);
  return Math.round((completed / Math.max(daysToCount, 1)) * 100);
}

export function getHabitStreak(habit: Habit): number {
  const today = new Date(getTodayString());
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const dateKey = toYYYYMMDD(date);
    if (habit.completedDates.includes(dateKey)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

export async function loadHabitsData(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from("habits")
    .select("id, title, emoji, color, frequency, completed_dates, created_at, target_days")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar hábitos:", error);
    return;
  }

  // Etiqueta de atributo em consulta à parte: se a coluna ainda não existir, os hábitos carregam normalmente.
  const tags = new Map<string, string>();
  const tagRes = await supabase.from("habits").select("id, category").eq("user_id", user.id);
  if (!tagRes.error) (tagRes.data || []).forEach((r: { id: string; category: string | null }) => r.category && tags.set(r.id, r.category));

  _data.habits = (data || []).map(habit => ({
    id: habit.id,
    title: habit.title,
    emoji: habit.emoji,
    color: habit.color,
    frequency: habit.frequency,
    completedDates: habit.completed_dates || [],
    createdAt: habit.created_at,
    targetDays: habit.target_days,
    category: tags.get(habit.id),
  }));

  notify();
  persistState();
}
