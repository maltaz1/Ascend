import type { Habit, Task } from "../store/types";
import { toYYYYMMDD } from "../store/utils";

export interface DailyActivity {
  date: string;
  day: string; // número do dia para o gráfico
  tasks: number;
  habits: number;
}

export interface CompletionWindow {
  label: string;
  completed: number;
  total: number;
  rate: number; // percentual de conclusão
}

export interface BestDayResult {
  day: string; // "Seg", "Ter", ...
  completed: number;
  total: number;
  rate: number;
}

export interface PriorityDistribution {
  name: string;
  value: number;
  color: string;
}

export interface HabitAdherence {
  name: string;
  rate: number; // percentual de aderência no período
  daysCompleted: number;
  daysExpected: number;
  trend: "up" | "down" | "stable";
}

export interface TrendResult {
  delta: number; // pontos percentuais de diferença entre períodos
  direction: "up" | "down" | "stable";
  currentRate: number;
  previousRate: number;
}

export interface Insight {
  icon: string;
  title: string;
  detail: string;
  color: string;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

function countCompletedOnDate(
  tasks: Task[],
  habits: Habit[],
  dateStr: string
): { tasks: number; habits: number } {
  const tasksCompleted = tasks.filter((t) => t.completed && t.date === dateStr).length;
  const habitsCompleted = habits.filter(
    (h) =>
      h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(dateStr)
  ).length;
  return { tasks: tasksCompleted, habits: habitsCompleted };
}

/**
 * Retorna a atividade diária (tarefas concluídas + hábitos concluídos)
 * dos últimos `days` dias, incluindo hoje.
 */
export function getDailyActivity(
  tasks: Task[],
  habits: Habit[],
  days: number
): DailyActivity[] {
  const result: DailyActivity[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = toYYYYMMDD(d);
    const { tasks: t, habits: h } = countCompletedOnDate(tasks, habits, ds);
    result.push({
      date: ds,
      day: `${d.getDate()}/${d.getMonth() + 1}`,
      tasks: t,
      habits: h,
    });
  }
  return result;
}

/**
 * Calcula a taxa de conclusão de um período no passado (útil para comparar janelas).
 * Considera apenas tarefas agendadas até a data de referência do período.
 */
export function getWindowCompletion(
  tasks: Task[],
  daysAgoStart: number,
  daysAgoEnd: number,
  label: string
): CompletionWindow {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() - daysAgoStart);
  const start = new Date(now);
  start.setDate(start.getDate() - daysAgoEnd);

  const endStr = toYYYYMMDD(end);
  const startStr = toYYYYMMDD(start);

  const windowTasks = tasks.filter((t) => t.date >= startStr && t.date <= endStr);
  const completed = windowTasks.filter((t) => t.completed).length;
  const total = windowTasks.length;

  return {
    label,
    completed,
    total,
    rate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Compara os últimos 7 dias com os 7 dias anteriores e retorna a tendência.
 */
export function getCompletionTrend(tasks: Task[]): TrendResult {
  const current = getWindowCompletion(tasks, 0, 6, "últimos 7 dias");
  const previous = getWindowCompletion(tasks, 7, 13, "7 dias anteriores");

  const delta = current.rate - previous.rate;
  return {
    delta,
    direction: delta > 2 ? "up" : delta < -2 ? "down" : "stable",
    currentRate: current.rate,
    previousRate: previous.rate,
  };
}

/**
 * Identifica o dia da semana com maior produtividade (tarefas concluídas)
 * considerando as últimas 8 semanas.
 */
export function getBestDayOfWeek(tasks: Task[]): BestDayResult[] {
  const now = new Date();
  const daysBack = 56;
  const totals: { completed: number; total: number }[] = Array.from(
    { length: 7 },
    () => ({ completed: 0, total: 0 })
  );

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = toYYYYMMDD(d);
    const dayIndex = d.getDay();
    const dayTasks = tasks.filter((t) => t.date === ds);
    totals[dayIndex].total += dayTasks.length;
    totals[dayIndex].completed += dayTasks.filter((t) => t.completed).length;
  }

  return totals.map((t, index) => ({
    day: DAY_LABELS[index],
    completed: t.completed,
    total: t.total,
    rate: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
  }));
}

/**
 * Distribuição de tarefas concluídas por prioridade nos últimos 30 dias.
 */
export function getPriorityDistribution(tasks: Task[]): PriorityDistribution[] {
  const now = new Date();
  const cutoff = toYYYYMMDD(new Date(now.setDate(now.getDate() - 30)));
  const recentCompleted = tasks.filter(
    (t) => t.completed && t.date >= cutoff
  );

  const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
  recentCompleted.forEach((t) => {
    counts[t.priority] = (counts[t.priority] || 0) + 1;
  });

  return ["high", "medium", "low"]
    .map((p) => ({ name: PRIORITY_LABELS[p], value: counts[p], color: PRIORITY_COLORS[p] }))
    .filter((entry) => entry.value > 0);
}

/**
 * Aderência de cada hábito nos últimos 30 dias.
 * Hábitos diários esperam conclusão todos os dias desde a criação;
 * hábitos semanais esperam conclusão em pelo menos 1 dia por semana.
 * O trend compara a primeira metade do período com a segunda.
 */
export function getHabitAdherence(
  habits: Habit[],
  days = 30
): HabitAdherence[] {
  const now = new Date();
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(toYYYYMMDD(d));
  }

  const firstHalf = dates.slice(0, Math.floor(days / 2));
  const secondHalf = dates.slice(Math.floor(days / 2));

  return habits.map((h) => {
    const completedDates = h.completedDates || [];
    const created = h.createdAt ? h.createdAt.slice(0, 10) : "";

    // Quantos dias do período são válidos (após a criação do hábito)
    const validDates = dates.filter((ds) => !created || ds >= created);
    const daysCompleted = validDates.filter((ds) => completedDates.includes(ds)).length;

    // Hábito semanal: espera-se ao menos 1 conclusão por semana (~4 no período)
    let daysExpected = validDates.length;
    if (h.frequency === "weekly") {
      daysExpected = Math.ceil(validDates.length / 7);
    }

    const rate =
      daysExpected > 0 ? Math.min(100, Math.round((daysCompleted / daysExpected) * 100)) : 0;

    // Tendência: compara segunda metade vs primeira metade do período
    const firstCompleted = firstHalf.filter((ds) => completedDates.includes(ds)).length;
    const secondCompleted = secondHalf.filter((ds) => completedDates.includes(ds)).length;
    const diff = secondCompleted - firstCompleted;
    const trend = diff > 0 ? "up" : diff < 0 ? "down" : "stable";

    return {
      name: h.title || "Hábito",
      rate,
      daysCompleted,
      daysExpected,
      trend,
    };
  });
}

/**
 * Calcula a quantidade média de atividades por dia nos últimos 30 dias
 * e verifica se o ritmo atual está acima dessa média.
 */
export function getAveragePace(tasks: Task[], habits: Habit[], days = 30): number {
  const activity = getDailyActivity(tasks, habits, days);
  const total = activity.reduce((sum, d) => sum + d.tasks + d.habits, 0);
  return Math.round((total / days) * 10) / 10;
}

/**
 * Gera insights automáticos a partir dos dados do usuário.
 */
export function generateInsights(
  tasks: Task[],
  habits: Habit[],
  globalStreak: number,
  weeklyData: { tasks: number; habits: number }[]
): Insight[] {
  const insights: Insight[] = [];

  const trend = getCompletionTrend(tasks);
  if (trend.direction !== "stable") {
    const directionText =
      trend.direction === "up"
        ? `taxa de conclusão subiu ${Math.abs(trend.delta)} pontos em relação à semana anterior`
        : `taxa de conclusão caiu ${Math.abs(trend.delta)} pontos em relação à semana anterior`;
    insights.push({
      icon: trend.direction === "up" ? "📈" : "📉",
      title: trend.direction === "up" ? "Evolução positiva" : "Atenção à consistência",
      detail: directionText,
      color: trend.direction === "up" ? "#10B981" : "#F59E0B",
    });
  }

  const bestDays = getBestDayOfWeek(tasks);
  const bestDay = bestDays.reduce(
    (max, d) => (d.total > max.total ? d : max),
    bestDays[0] || { day: "-", total: 0, completed: 0, rate: 0 }
  );
  if (bestDay.total > 0) {
    insights.push({
      icon: "🏆",
      title: `Seu melhor dia é ${bestDay.day}`,
      detail: `${bestDay.completed} de ${bestDay.total} tarefas concluídas (taxa de ${bestDay.rate}%) nas últimas 8 semanas`,
      color: "#8B5CF6",
    });
  }

  const pace = getAveragePace(tasks, habits);
  const todayTotal =
    weeklyData[weeklyData.length - 1]?.tasks + weeklyData[weeklyData.length - 1]?.habits || 0;
  if (pace >= 1 && todayTotal >= Math.ceil(pace)) {
    insights.push({
      icon: "⚡",
      title: "Ritmo acima da média",
      detail: `Você está completando em média ${pace} atividades por dia nos últimos 30 dias`,
      color: "#06B6D4",
    });
  }

  if (globalStreak >= 7) {
    insights.push({
      icon: "🔥",
      title: "Streak de destaque",
      detail: `${globalStreak} dias seguidos ativo${globalStreak > 1 ? "s" : ""} — continue assim!`,
      color: "#F59E0B",
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: "🌱",
      title: "Comece hoje",
      detail: "Complete tarefas e hábitos para receber insights personalizados",
      color: "var(--muted-foreground)",
    });
  }

  return insights;
}
