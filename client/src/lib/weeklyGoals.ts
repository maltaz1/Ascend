/**
 * Utilitários para metas semanais do módulo Goals.
 *
 * Regras de negócio:
 * - Cada meta semanal controla `daysCompletedWeek` (array de 7 booleans, seg-dom).
 * - O array é vinculado à segunda-feira da semana atual (`weekStart`).
 * - Se hoje pertence a uma semana posterior à de `weekStart`, o array reseta
 *   (histórico das últimas semanas é salvo em `weeklyHistory` para a sparkline).
 * - Streak: incrementa no fechamento da semana quando a frequência-alvo é atingida;
 *   quebra quando a semana termina sem atingir a meta.
 * - `recordStreak` guarda o melhor streak já alcançado.
 * - Metas semanais podem referenciar um hábito (`linkedHabitId`); nesse caso os
 *   check-ins são lidos do módulo Habits (completed_dates) em vez de controle manual.
 */

import { toYYYYMMDD } from "@/store/utils";

export type WeeklyGoal = {
  id: string;
  title: string;
  emoji: string;
  color: string;
  description?: string;
  /** Frequência-alvo semanal (ex: 4x por semana) */
  targetFrequency: number;
  /** Check-ins da semana vinculada (0=segunda … 6=domingo) */
  daysCompletedWeek: boolean[];
  /** Segunda-feira da semana atualmente controlada (YYYY-MM-DD) */
  weekStart: string | null;
  /** Streak de semanas consecutivas batendo a meta */
  streak: number;
  /** Melhor streak já alcançado */
  recordStreak: number;
  /** (Opcional) Id de um hábito do módulo Habits */
  linkedHabitId?: string | null;
  /** Histórico de consistência das últimas semanas, em % (mais recente por último) */
  weeklyHistory?: number[];
  createdAt: string;
};

export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const WEEKDAY_LABELS_FULL = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export const COMMON_FREQUENCIES = [
  { label: "3x", value: 3 },
  { label: "4x", value: 4 },
  { label: "5x", value: 5 },
  { label: "Todo dia", value: 7 },
];

/** Retorna a data da segunda-feira da semana do dia informado (YYYY-MM-DD) */
export function getMondayOfDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom … 6=sáb
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return toYYYYMMDD(d);
}

/** Retorna as segundas-feira de cada uma das últimas N semanas (excluindo a semana atual) */
export function getLastWeekMondays(count: number): string[] {
  const now = new Date();
  const mondays: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i * 7);
    mondays.push(getMondayOfDate(d));
  }
  return mondays;
}

/** Converte uma data (YYYY-MM-DD) em índice de dia da semana 0..6 (0=segunda) */
export function dateToWeekdayIndex(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00`);
  const jsDay = d.getDay(); // 0=dom
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Normaliza a semana de uma meta semanal para a semana atual.
 * - Se a meta já pertence à semana atual, retorna o estado intacto.
 * - Se a meta ficou uma ou mais semanas atrasada, arquivamos a consistência
 *   da(s) semana(s) em `weeklyHistory`, atualizamos streak/recordStreak e
 *   resetamos `daysCompletedWeek` para a nova semana.
 */
export function normalizeWeeklyGoalWeek(
  goal: WeeklyGoal
): { goal: WeeklyGoal; changed: boolean } {
  const todayMonday = getMondayOfDate(new Date());

  if (!goal.weekStart || goal.weekStart >= todayMonday) {
    return { goal, changed: false };
  }

  const history = [...(goal.weeklyHistory || [])];
  let streak = goal.streak;
  let recordStreak = goal.recordStreak;

  const target = goal.targetFrequency || 1;

  // Processa cada semana intermediária
  let currentMonday = goal.weekStart;
  while (currentMonday < todayMonday) {
    const completedCount = goal.daysCompletedWeek.filter(Boolean).length;
    const weekPct = Math.round((Math.min(completedCount, target) / target) * 100);
    history.push(Math.min(weekPct, 100));

    if (completedCount >= target) {
      streak += 1;
      recordStreak = Math.max(recordStreak, streak);
    } else {
      streak = 0;
    }

    // Avança uma semana
    const d = new Date(`${currentMonday}T12:00:00`);
    d.setDate(d.getDate() + 7);
    currentMonday = toYYYYMMDD(d);
    goal = {
      ...goal,
      weekStart: currentMonday,
      daysCompletedWeek: [false, false, false, false, false, false, false],
      streak,
      recordStreak,
      weeklyHistory: history,
    };
  }

  // Mantém apenas as últimas 4 semanas no histórico (mais recente por último)
  goal = {
    ...goal,
    weeklyHistory: history.slice(-4),
  };

  return { goal, changed: true };
}

/** Quantidade de dias concluídos na semana atual (ou 0 se nunca teve) */
export function getWeeklyCompletedCount(goal: WeeklyGoal): number {
  return (goal.daysCompletedWeek || []).filter(Boolean).length;
}

/** Quantos dias faltam para bater a meta na semana atual */
export function getWeeklyRemaining(goal: WeeklyGoal): number {
  return Math.max(0, (goal.targetFrequency || 0) - getWeeklyCompletedCount(goal));
}

/** Se a meta da semana já foi atingida */
export function isWeeklyGoalHit(goal: WeeklyGoal): boolean {
  return getWeeklyCompletedCount(goal) >= (goal.targetFrequency || 1);
}

/**
 * Consistência da semana atual em %: min(concluídos, alvo)/alvo.
 */
export function getWeeklyConsistency(goal: WeeklyGoal): number {
  const target = goal.targetFrequency || 1;
  const done = getWeeklyCompletedCount(goal);
  return Math.min(Math.round((done / target) * 100), 100);
}

/**
 * Consistência agregada da semana de todas as metas semanais (0..100).
 */
export function getWeekConsistencyAverage(goals: WeeklyGoal[]): number {
  const weekly = goals;
  if (weekly.length === 0) return 0;
  const avg = weekly.reduce((acc, g) => acc + getWeeklyConsistency(g), 0) / weekly.length;
  return Math.round(avg);
}

/**
 * Ordena metas semanais colocando primeiro as mais perto do prazo
 * (menos dias restantes para bater a meta). Metas já batidas ficam por último.
 */
export function sortWeeklyGoals(goals: WeeklyGoal[]): WeeklyGoal[] {
  return [...goals].sort((a, b) => {
    const aHit = isWeeklyGoalHit(a);
    const bHit = isWeeklyGoalHit(b);
    if (aHit !== bHit) return aHit ? 1 : -1;
    return getWeeklyRemaining(a) - getWeeklyRemaining(b);
  });
}

/**
 * Lê os check-ins da semana de um hábito vinculado.
 * Retorna um array de 7 booleans (seg-dom) da semana atual.
 */
export function getLinkedHabitWeekCheckins(
  habit: { id: string; completed_dates?: string[] | null } | undefined,
  monday: string
): boolean[] {
  const checkins = habit?.completed_dates || [];
  const result: boolean[] = [false, false, false, false, false, false, false];
  for (let i = 0; i < 7; i++) {
    const d = new Date(`${monday}T12:00:00`);
    d.setDate(d.getDate() + i);
    const key = toYYYYMMDD(d);
    if (checkins.includes(key)) result[i] = true;
  }
  return result;
}

/** Contador de metas semanais ativas (não concluídas de longo prazo) */
export function countActiveWeeklyGoals(goals: WeeklyGoal[]): number {
  return goals.length;
}

/** Sparkline data: percentuais das últimas 4 semanas + semana atual */
export function getWeeklySparkline(goal: WeeklyGoal): number[] {
  const history = [...(goal.weeklyHistory || [])];
  return [...history.slice(-4), getWeeklyConsistency(goal)];
}
