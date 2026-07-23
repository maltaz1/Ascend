// Lógica para calcular e gerar ocorrências de tarefas recorrentes
// Abordagem: gerar ocorrências individuais na tabela tasks com o mesmo
// recurrence config, diferenciando por parent_id

import type { RecurrenceConfig } from "@/types/recurrence";
import { supabase } from "@/lib/supabase";

function dateToString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getRecurrenceDates(
  recurrence: RecurrenceConfig,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  baseDate: string   // YYYY-MM-DD - data da tarefa original (primeira ocorrência)
): string[] {
  if (recurrence.type === "never") return [];
  // Não verificar paused aqui - a geração deve rodar independente
  // O pause é verificado na UI, não na geração

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T23:59:59");
  const base = new Date(baseDate + "T00:00:00");

  // A data efetiva de início é o maior entre startDate e baseDate
  const effectiveStart = start < base ? new Date(base) : new Date(start);

  if (effectiveStart > end) return [];

  const dates: string[] = [];
  let occurrenceCount = 0;

  let current = new Date(effectiveStart);

  while (current <= end) {
    const currentStr = dateToString(current);

    // Verificar condições de término
    if (shouldStopRecurrence(recurrence, currentStr, occurrenceCount)) {
      break;
    }

    if (shouldGenerateOccurrence(recurrence, current, base, occurrenceCount)) {
      dates.push(currentStr);
      occurrenceCount++;
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function shouldStopRecurrence(
  recurrence: RecurrenceConfig,
  currentDateStr: string,
  occurrenceCount: number
): boolean {
  switch (recurrence.endType) {
    case "on_date":
      return recurrence.endDate != null && currentDateStr > recurrence.endDate;
    case "after_occurrences":
      return recurrence.occurrences != null && occurrenceCount >= recurrence.occurrences;
    default:
      return false;
  }
}

function shouldGenerateOccurrence(
  recurrence: RecurrenceConfig,
  currentDate: Date,
  baseDate: Date,
  occurrenceIndex: number
): boolean {
  const dayOfWeek = currentDate.getDay(); // 0=Dom, 1=Seg, ...

  switch (recurrence.type) {
    case "daily":
      return true;

    case "weekdays":
      return dayOfWeek !== 0 && dayOfWeek !== 6;

    case "weekly":
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        return recurrence.daysOfWeek.includes(dayOfWeek);
      }
      // Se não tem dias específicos, usa o dia da semana da tarefa original
      return dayOfWeek === baseDate.getDay();

    case "monthly": {
      // Mesmo dia do mês da tarefa original
      // Cuidado com meses que não têm o dia (ex: 31 em fevereiro)
      const lastDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      ).getDate();
      const baseDay = baseDate.getDate();
      // Se o mês não tem o dia base, usar o último dia do mês
      return currentDate.getDate() === Math.min(baseDay, lastDayOfMonth);
    }

    case "yearly":
      // Mesmo dia e mês da tarefa original
      return (
        currentDate.getDate() === baseDate.getDate() &&
        currentDate.getMonth() === baseDate.getMonth()
      );

    case "custom": {
      const interval = recurrence.interval ?? 1;
      const unit = recurrence.intervalUnit ?? "days";
      const daysSinceBase = Math.floor(
        (currentDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (unit === "days") {
        return daysSinceBase >= 0 && daysSinceBase % interval === 0;
      }

      if (unit === "weeks") {
        const weeksSinceBase = Math.floor(daysSinceBase / 7);
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          return weeksSinceBase % interval === 0 && recurrence.daysOfWeek.includes(dayOfWeek);
        }
        return weeksSinceBase % interval === 0 && dayOfWeek === baseDate.getDay();
      }

      if (unit === "months") {
        const monthsDiff =
          (currentDate.getFullYear() - baseDate.getFullYear()) * 12 +
          (currentDate.getMonth() - baseDate.getMonth());
        const lastDayOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate();
        return (
          monthsDiff >= 0 &&
          monthsDiff % interval === 0 &&
          currentDate.getDate() === Math.min(baseDate.getDate(), lastDayOfMonth)
        );
      }

      if (unit === "years") {
        const yearsDiff = currentDate.getFullYear() - baseDate.getFullYear();
        const lastDayOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate();
        return (
          yearsDiff >= 0 &&
          yearsDiff % interval === 0 &&
          currentDate.getMonth() === baseDate.getMonth() &&
          currentDate.getDate() === Math.min(baseDate.getDate(), lastDayOfMonth)
        );
      }

      return false;
    }

    default:
      return false;
  }
}

/**
 * Gera ocorrências faltantes para uma tarefa recorrente.
 */
export async function generateRecurringOccurrence(
  task: {
    id: string;
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    category?: string;
    date: string;
    recurrence: RecurrenceConfig;
  },
  userId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<string[]> {
  if (!task.recurrence || task.recurrence.type === "never") return [];

  // Calcular todas as datas de ocorrência no range
  const allDates = getRecurrenceDates(
    task.recurrence,
    rangeStart,
    rangeEnd,
    task.date // data base = data da primeira ocorrência
  );

  if (allDates.length === 0) return [];

  // Verificar quais datas já existem (como ocorrência filha ou como a tarefa mãe)
  const { data: existingTasks } = await supabase
    .from("tasks")
    .select("date")
    .eq("user_id", userId)
    .eq("parent_id", task.id)
    .in("date", allDates);

  const existingDates = new Set(
    (existingTasks || []).map((t: { date: string }) => t.date)
  );

  // A data base (primeira ocorrência) já existe como a tarefa mãe, não precisa criar
  const baseDateStr = task.date;
  const missingDates = allDates.filter(d => d !== baseDateStr && !existingDates.has(d));

  if (missingDates.length === 0) return [];

  // Criar as ocorrências faltantes
  const tasksToInsert = missingDates.map(date => ({
    user_id: userId,
    title: task.title,
    description: task.description,
    date,
    completed: false,
    priority: task.priority,
    category: task.category,
    is_recurring: true,
    parent_id: task.id,
    recurrence: task.recurrence,
  }));

  const { error } = await supabase.from("tasks").insert(tasksToInsert);

  if (error) {
    console.error("Erro ao gerar ocorrências recorrentes:", error);
    return [];
  }

  return missingDates;
}

/**
 * Gera ocorrências para TODAS as tarefas recorrentes no range de datas.
 * Chamado quando o usuário navega para uma data ou carrega a página.
 * Range: de hoje até 60 dias no futuro.
 */
export async function generateAllRecurringOccurrences(
  selectedDate: string
): Promise<number> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return 0;

  // Range: sempre de hoje até 60 dias no futuro
  // Isso garante que ocorrências futuras sejam geradas independente da data selecionada
  const today = new Date();
  const start = dateToString(today);
  const end = dateToString(addDays(today, 60));

  // Buscar apenas tarefas "mãe" (parent_id IS NULL) que são recorrentes
  const { data: recurringTasks, error } = await supabase
    .from("tasks")
    .select("id, title, description, priority, category, date, recurrence")
    .is("parent_id", null)
    .eq("is_recurring", true)
    .eq("user_id", userId);

  if (error || !recurringTasks) return 0;

  let totalGenerated = 0;

  for (const task of recurringTasks) {
    const recurrence = task.recurrence as RecurrenceConfig;
    if (!recurrence || recurrence.type === "never") continue;

    const generated = await generateRecurringOccurrence(
      {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        category: task.category,
        date: task.date,
        recurrence,
      },
      userId,
      start,
      end
    );

    totalGenerated += generated.length;
  }

  return totalGenerated;
}

/**
 * Gera ocorrências imediatamente após criar uma nova tarefa recorrente.
 * Gera para os próximos 60 dias a partir de hoje.
 */
export async function generateOccurrenceForNewTask(
  taskId: string,
  userId: string
): Promise<string[]> {
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, description, priority, category, date, recurrence")
    .eq("id", taskId)
    .single();

  if (!task) return [];

  const recurrence = task.recurrence as RecurrenceConfig;
  if (!recurrence || recurrence.type === "never") return [];

  // Gerar para os próximos 60 dias a partir de hoje
  const today = new Date();
  const start = dateToString(today);
  const end = dateToString(addDays(today, 60));

  return generateRecurringOccurrence(
    {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      category: task.category,
      date: task.date,
      recurrence,
    },
    userId,
    start,
    end
  );
}
