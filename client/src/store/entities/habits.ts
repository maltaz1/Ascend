import { getData, store } from "../store";
import { generateId, getTodayString, toYYYYMMDD } from "../utils";
import { upsertEntity, removeEntity, normalizeEntities, setLoading } from "../core/entity";
import { evaluateAchievements } from "../achievements";
import { awardXp, createXpPayload } from "../xp-engine";
import type { Habit } from "../types";

export function addHabit(habit: Omit<Habit, "id" | "createdAt" | "completedDates">): Habit {
  const newHabit: Habit = {
    ...habit,
    id: generateId(),
    createdAt: new Date().toISOString(),
    completedDates: [],
  };

  store.update(state => {
    state.habits = upsertEntity(state.habits, newHabit);
  });

  return newHabit;
}

export function updateHabit(id: string, updates: Partial<Habit>): void {
  const state = store.getState();
  const current = state.habits.byId[id];
  if (!current) return;

  store.update(storeState => {
    storeState.habits = upsertEntity(storeState.habits, { ...current, ...updates });
  });
}

export function deleteHabit(id: string): void {
  store.update(state => {
    state.habits = removeEntity(state.habits, id);
  });
}

export async function toggleHabitDate(habitId: string, date: string): Promise<{ xpGained: number }> {
  const state = store.getState();
  const habit = state.habits.byId[habitId];
  if (!habit) return { xpGained: 0 };

  const hasDate = habit.completedDates.includes(date);
  const completedDates = hasDate
    ? habit.completedDates.filter(item => item !== date)
    : [...habit.completedDates, date];

  store.update(storeState => {
    storeState.habits = upsertEntity(storeState.habits, { ...habit, completedDates });
  });

  let xpGained = 0;
  if (!hasDate) {
    xpGained = await awardXp(createXpPayload("HABIT_COMPLETED", 5));
    evaluateAchievements(getData());
  }

  return { xpGained };
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
