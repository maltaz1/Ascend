// Teste de smoke manual do módulo de analytics (rodado via npx tsx)
import {
  getDailyActivity,
  getWindowCompletion,
  getCompletionTrend,
  getBestDayOfWeek,
  getPriorityDistribution,
  getHabitAdherence,
  getAveragePace,
  generateInsights,
} from "../client/src/utils/analytics";
import { toYYYYMMDD } from "../client/src/store/utils";

const today = new Date();
const makeDate = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return toYYYYMMDD(d);
};

const tasks = [
  { id: "1", title: "T1", date: makeDate(0), completed: true, priority: "high" as const, createdAt: makeDate(-40) },
  { id: "2", title: "T2", date: makeDate(0), completed: false, priority: "medium" as const, createdAt: makeDate(-40) },
  { id: "3", title: "T3", date: makeDate(-3), completed: true, priority: "low" as const, createdAt: makeDate(-40) },
  { id: "4", title: "T4", date: makeDate(-10), completed: true, priority: "high" as const, createdAt: makeDate(-40) },
  { id: "5", title: "T5", date: makeDate(-9), completed: false, priority: "medium" as const, createdAt: makeDate(-40) },
];

const habits = [
  {
    id: "h1",
    title: "Ler",
    emoji: "📚",
    color: "#8B5CF6",
    frequency: "daily" as const,
    completedDates: [makeDate(0), makeDate(-1), makeDate(-2), makeDate(-5)],
    createdAt: makeDate(-40),
    targetDays: 7,
  },
  {
    id: "h2",
    title: "Correr",
    emoji: "🏃",
    color: "#10B981",
    frequency: "weekly" as const,
    completedDates: [makeDate(-2)],
    createdAt: makeDate(-40),
    targetDays: 3,
  },
];

console.log("Daily activity (7d):", JSON.stringify(getDailyActivity(tasks, habits, 7)));
console.log("Window completion:", JSON.stringify(getWindowCompletion(tasks, 0, 6, "7d")));
console.log("Trend:", JSON.stringify(getCompletionTrend(tasks)));
console.log("Best days:", JSON.stringify(getBestDayOfWeek(tasks)));
console.log("Priority:", JSON.stringify(getPriorityDistribution(tasks)));
console.log("Habit adherence:", JSON.stringify(getHabitAdherence(habits)));
console.log("Avg pace:", getAveragePace(tasks, habits));
const weeklyData = getDailyActivity(tasks, habits, 7).map((d) => ({ tasks: d.tasks, habits: d.habits }));
console.log("Insights:", JSON.stringify(generateInsights(tasks, habits, 3, weeklyData)));
console.log("OK - todos os derivadores executaram sem erro");
