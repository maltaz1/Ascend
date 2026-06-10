import { Habit } from "./types";
import { _data, notify, persistState, markActiveToday } from "./state";
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

  const existingIndex = habit.completedDates.indexOf(date);
  let xpGained = 0;

  if (existingIndex === -1) {
    habit.completedDates.push(date);
    markActiveToday();
    addXP(5);
    xpGained = 5;
    evaluateAchievements(_data);
  } else {
    habit.completedDates.splice(existingIndex, 1);
  }

  notify();
  persistState();
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
