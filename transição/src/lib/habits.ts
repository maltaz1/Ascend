/**
 * Habit Tracker Logic
 * Estrutura de dados, cálculos e persistência para gerenciamento de hábitos
 */

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  color: string;
  frequency: 'daily' | 'weekly';
  completedDates: string[]; // ISO date strings
  createdAt: string;
  targetDays: number; // per month
}

export interface HabitStats {
  habitsCount: number;
  completedToday: number;
  averageConsistency: number;
  totalStreak: number;
}

export interface DailyProgress {
  day: number;
  completed: number;
  total: number;
  percentage: number;
}

export interface MonthlyProgress {
  completed: number;
  total: number;
  percentage: number;
}

export interface StreakInfo {
  current: number;
  longest: number;
  lastDate: string | null;
}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'flowzone_habits';
const DATE_FORMAT = 'YYYY-MM-DD';

// ─── UTILITÁRIOS DE DATA ───────────────────────────────────────────────────────

/**
 * Retorna a data atual no formato YYYY-MM-DD
 */
function toYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Retorna a data atual no formato YYYY-MM-DD
 */
export function getTodayString(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Retorna a data anterior no formato YYYY-MM-DD
 */
export function getYesterdayString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return toYYYYMMDD(date);
}

/**
 * Retorna o número de dias em um mês
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Converte uma string de data para objeto Date
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Calcula a diferença em dias entre duas datas
 */
export function daysBetween(date1: string, date2: string): number {
  const d1 = parseDate(date1);
  const d2 = parseDate(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Retorna o primeiro dia do mês
 */
export function getFirstDayOfMonth(month: number, year: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/**
 * Retorna o último dia do mês
 */
export function getLastDayOfMonth(month: number, year: number): string {
  const lastDay = getDaysInMonth(month, year);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

// ─── FUNCIONALIDADE 1: MARCAR / DESMARCAR HÁBITO ────────────────────────────────

/**
 * Marca ou desmarca um hábito em uma data específica (toggle)
 */
export function toggleHabitDate(habit: Habit, date: string): Habit {
  const index = habit.completedDates.indexOf(date);
  
  if (index === -1) {
    // Marcar como concluído
    return {
      ...habit,
      completedDates: [...habit.completedDates, date].sort(),
    };
  } else {
    // Desmarcar
    return {
      ...habit,
      completedDates: habit.completedDates.filter((d, i) => i !== index),
    };
  }
}

/**
 * Verifica se um hábito foi concluído em uma data específica
 */
export function isHabitCompletedOnDate(habit: Habit, date: string): boolean {
  return habit.completedDates.includes(date);
}

// ─── FUNCIONALIDADE 2: PROGRESSO MENSAL ───────────────────────────────────────

/**
 * Calcula o progresso mensal de um hábito
 */
export function getMonthlyProgress(
  habit: Habit,
  month: number,
  year: number
): MonthlyProgress {
  const daysInMonth = getDaysInMonth(month, year);
  let completed = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (habit.completedDates.includes(dateStr)) {
      completed++;
    }
  }

  return {
    completed,
    total: daysInMonth,
    percentage: Math.round((completed / daysInMonth) * 100),
  };
}

// ─── FUNCIONALIDADE 3: STREAK (SEQUÊNCIA) ─────────────────────────────────────

/**
 * Calcula o streak atual (dias consecutivos até hoje)
 */
export function getCurrentStreak(habit: Habit): number {
  const today = getTodayString();
  let streak = 0;
  let currentDate = new Date(today);

  // Começar do hoje e ir para trás
  while (true) {
    const dateStr = toYYYYMMDD(currentDate);
    
    if (habit.completedDates.includes(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calcula o streak mais longo histórico
 */
export function getLongestStreak(habit: Habit): number {
  if (habit.completedDates.length === 0) return 0;

  const sortedDates = [...habit.completedDates].sort();
  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = parseDate(sortedDates[i - 1]);
    const currDate = parseDate(sortedDates[i]);
    const daysDiff = daysBetween(sortedDates[i - 1], sortedDates[i]);

    if (daysDiff === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

/**
 * Retorna informações completas de streak
 */
export function getStreakInfo(habit: Habit): StreakInfo {
  const currentStreak = getCurrentStreak(habit);
  const longestStreak = getLongestStreak(habit);
  const lastDate = habit.completedDates.length > 0
    ? habit.completedDates[habit.completedDates.length - 1]
    : null;

  return {
    current: currentStreak,
    longest: longestStreak,
    lastDate,
  };
}

// ─── FUNCIONALIDADE 4: TAXA DE CONSISTÊNCIA ───────────────────────────────────

/**
 * Calcula a taxa de consistência (%) de um hábito no mês
 */
export function getConsistencyRate(
  habit: Habit,
  month: number,
  year: number
): number {
  const progress = getMonthlyProgress(habit, month, year);
  return progress.percentage;
}

/**
 * Calcula a taxa de consistência média de todos os hábitos
 */
export function getAverageConsistencyRate(habits: Habit[], month: number, year: number): number {
  if (habits.length === 0) return 0;

  const totalRate = habits.reduce((acc, habit) => {
    return acc + getConsistencyRate(habit, month, year);
  }, 0);

  return Math.round(totalRate / habits.length);
}

// ─── FUNCIONALIDADE 5: PROGRESSO DIÁRIO (PARA GRÁFICO) ───────────────────────

/**
 * Retorna o progresso diário de todos os hábitos para um mês
 */
export function getDailyProgress(
  habits: Habit[],
  month: number,
  year: number
): DailyProgress[] {
  const daysInMonth = getDaysInMonth(month, year);
  const result: DailyProgress[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const completed = habits.filter(h => h.completedDates.includes(dateStr)).length;
    const total = habits.length;

    result.push({
      day,
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  return result;
}

/**
 * Retorna o progresso semanal de todos os hábitos
 */
export function getWeeklyProgress(
  habits: Habit[],
  month: number,
  year: number
): Array<{ week: number; completed: number; total: number; percentage: number }> {
  const daysInMonth = getDaysInMonth(month, year);
  const weeks = 4;
  const result = [];

  for (let week = 0; week < weeks; week++) {
    const startDay = week * 7 + 1;
    const endDay = Math.min((week + 1) * 7, daysInMonth);
    let completed = 0;
    let total = 0;

    for (let day = startDay; day <= endDay; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayCompleted = habits.filter(h => h.completedDates.includes(dateStr)).length;
      completed += dayCompleted;
      total += habits.length;
    }

    result.push({
      week: week + 1,
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  return result;
}

// ─── FUNCIONALIDADE 6: ESTATÍSTICAS GERAIS ────────────────────────────────────

/**
 * Retorna estatísticas gerais de todos os hábitos
 */
export function getStats(habits: Habit[]): HabitStats {
  const today = getTodayString();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const completedToday = habits.filter(h => h.completedDates.includes(today)).length;
  const averageConsistency = getAverageConsistencyRate(habits, currentMonth, currentYear);
  const totalStreak = habits.reduce((acc, h) => acc + getCurrentStreak(h), 0);

  return {
    habitsCount: habits.length,
    completedToday,
    averageConsistency,
    totalStreak,
  };
}

// ─── FUNCIONALIDADE 7: PERSISTÊNCIA ───────────────────────────────────────────

/**
 * Salva hábitos no localStorage
 */
export function saveHabits(habits: Habit[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Erro ao salvar hábitos:', error);
  }
}

/**
 * Carrega hábitos do localStorage
 */
export function loadHabits(): Habit[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erro ao carregar hábitos:', error);
    return [];
  }
}

/**
 * Limpa todos os hábitos do localStorage
 */
export function clearHabits(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao limpar hábitos:', error);
  }
}

// ─── FUNCIONALIDADE 8: FILTROS DE TEMPO ───────────────────────────────────────

/**
 * Retorna hábitos completados em um dia específico
 */
export function getHabitsCompletedOnDate(habits: Habit[], date: string): Habit[] {
  return habits.filter(h => h.completedDates.includes(date));
}

/**
 * Retorna hábitos completados em uma semana específica
 */
export function getHabitsCompletedInWeek(
  habits: Habit[],
  startDate: string,
  endDate: string
): Habit[] {
  return habits.filter(h => {
    return h.completedDates.some(date => {
      return date >= startDate && date <= endDate;
    });
  });
}

/**
 * Retorna hábitos completados em um mês específico
 */
export function getHabitsCompletedInMonth(
  habits: Habit[],
  month: number,
  year: number
): Habit[] {
  const startDate = getFirstDayOfMonth(month, year);
  const endDate = getLastDayOfMonth(month, year);
  return getHabitsCompletedInWeek(habits, startDate, endDate);
}

/**
 * Retorna o progresso de um hábito em um período específico
 */
export function getHabitProgressInPeriod(
  habit: Habit,
  startDate: string,
  endDate: string
): { completed: number; total: number; percentage: number } {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const daysDiff = daysBetween(startDate, endDate) + 1;
  
  let completed = 0;
  let currentDate = new Date(start);

  while (currentDate <= end) {
    const dateStr = toYYYYMMDD(currentDate);
    if (habit.completedDates.includes(dateStr)) {
      completed++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    completed,
    total: daysDiff,
    percentage: Math.round((completed / daysDiff) * 100),
  };
}

// ─── FUNÇÕES AUXILIARES ───────────────────────────────────────────────────────

/**
 * Cria um novo hábito
 */
export function createHabit(
  title: string,
  emoji: string,
  color: string,
  frequency: 'daily' | 'weekly' = 'daily',
  targetDays: number = 30
): Habit {
  return {
    id: Math.random().toString(36).substring(2, 11) + Date.now().toString(36),
    title,
    emoji,
    color,
    frequency,
    targetDays,
    createdAt: new Date().toISOString(),
    completedDates: [],
  };
}

/**
 * Atualiza um hábito
 */
export function updateHabit(habit: Habit, updates: Partial<Habit>): Habit {
  return {
    ...habit,
    ...updates,
    id: habit.id, // Nunca alterar ID
    createdAt: habit.createdAt, // Nunca alterar data de criação
  };
}

/**
 * Deleta um hábito
 */
export function deleteHabit(habits: Habit[], habitId: string): Habit[] {
  return habits.filter(h => h.id !== habitId);
}

/**
 * Busca um hábito por ID
 */
export function findHabitById(habits: Habit[], habitId: string): Habit | undefined {
  return habits.find(h => h.id === habitId);
}

/**
 * Ordena hábitos por data de criação (mais recentes primeiro)
 */
export function sortHabitsByDate(habits: Habit[]): Habit[] {
  return [...habits].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Ordena hábitos por consistência (maior primeiro)
 */
export function sortHabitsByConsistency(
  habits: Habit[],
  month: number,
  year: number
): Habit[] {
  return [...habits].sort((a, b) => {
    const rateA = getConsistencyRate(a, month, year);
    const rateB = getConsistencyRate(b, month, year);
    return rateB - rateA;
  });
}

/**
 * Exporta hábitos como JSON
 */
export function exportHabitsAsJSON(habits: Habit[]): string {
  return JSON.stringify(habits, null, 2);
}

/**
 * Importa hábitos de JSON
 */
export function importHabitsFromJSON(jsonString: string): Habit[] {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Erro ao importar hábitos:', error);
    return [];
  }
}
