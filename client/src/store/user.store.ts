import { getData, store } from "./store";
import { notify, persistState, _data } from "./state";
import { getTodayString, toYYYYMMDD } from "./utils";
import { syncUserProfile } from "./xp-system";

export function updateUserName(name: string): void {
  store.update(state => {
    state.user.name = name;
  });
  _data.user.name = name; // Sync for safety
  persistState();
  notify();
  void syncUserProfile();
}

export function getLevelProgress(): { current: number; max: number; percent: number } {
  const data = getData();
  const max = data.user.level * 100;
  return {
    current: data.user.xp,
    max,
    percent: Math.round((data.user.xp / max) * 100),
  };
}

export function getTodayStats(): {
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
} {
  const data = getData();
  const today = getTodayString();
  const todayTasks = data.tasks.filter(task => task.date === today);
  const habitsCompleted = data.habits.filter(habit => habit.completedDates.includes(today)).length;

  return {
    tasksCompleted: todayTasks.filter(task => task.completed).length,
    tasksTotal: todayTasks.length,
    habitsCompleted,
    habitsTotal: data.habits.length,
  };
}

export function getWeeklyData(): { day: string; tasks: number; habits: number }[] {
  const data = getData();
  const result = [] as { day: string; tasks: number; habits: number }[];
  const today = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - offset);
    const dateStr = toYYYYMMDD(date);
    const dayName = date.toLocaleDateString("pt-BR", { weekday: "short" });

    result.push({
      day: dayName,
      tasks: data.tasks.filter(task => task.date === dateStr && task.completed).length,
      habits: data.habits.filter(habit => habit.completedDates.includes(dateStr)).length,
    });
  }

  return result;
}

export function getDailyHabitData(year: number, month: number, habits?: typeof _data.habits): { day: number; count: number }[] {
  const habitsToUse = habits || _data.habits;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: { day: number; count: number }[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    result.push({
      day,
      count: habitsToUse.filter(habit => habit.completedDates.includes(dateStr)).length,
    });
  }

  return result;
}

export function getWeeklyHabitData(year: number, month: number, habits?: typeof _data.habits): { week: string; count: number }[] {
  const habitsToUse = habits || _data.habits;
  const weeks = ["Sem 1", "Sem 2", "Sem 3", "Sem 4"];

  return weeks.map((week, index) => {
    const startDay = index * 7 + 1;
    const endDay = Math.min((index + 1) * 7, new Date(year, month + 1, 0).getDate());
    let count = 0;

    for (let day = startDay; day <= endDay; day += 1) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      count += habitsToUse.filter(habit => habit.completedDates.includes(dateStr)).length;
    }

    return { week, count };
  });
}
