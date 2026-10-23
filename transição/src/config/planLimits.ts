export const FREE_LIMITS = {
  tasksPerWeek: 5,
  habits: 3,
  goals: 1,
  weeklyGoals: 2,
};

export const FREE_TABS = [
  "today",
  "dashboard",
  "habits",
  "tasks",
  "goals",
  "calendar",
  "settings",
  "download",
];
// Regras que no web ficavam em pages/Tasks.tsx; trazidas para cá para valer em qualquer tela.
export function getWeekStartDate(date: Date): Date {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function countTasksCreatedThisWeek(tasks: { createdAt: string }[]): number {
  const weekStart = getWeekStartDate(new Date());
  return tasks.filter(task => {
    const createdAt = new Date(task.createdAt);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= weekStart;
  }).length;
}
