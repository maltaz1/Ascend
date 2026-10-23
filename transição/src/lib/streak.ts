import type { Habit, Task } from "@/store/types";
import { toYYYYMMDD } from "@/store/utils";

type StreakTask = Pick<Task, "completed" | "date">;
type StreakHabit = Pick<Habit, "completedDates">;

/**
 * Conta os dias consecutivos com pelo menos uma tarefa ou hábito concluído,
 * começando pelo dia atual e limitando a busca aos últimos 365 dias.
 */
export function getGlobalStreak(
  tasks: StreakTask[],
  habits: StreakHabit[],
  referenceDate = new Date(),
): number {
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(referenceDate);
    date.setDate(date.getDate() - offset);
    const dateKey = toYYYYMMDD(date);
    const hasCompletedTask = tasks.some(task => task.completed && task.date === dateKey);
    const hasCompletedHabit = habits.some(habit => habit.completedDates?.includes(dateKey));

    if (!hasCompletedTask && !hasCompletedHabit) break;
    streak += 1;
  }

  return streak;
}
