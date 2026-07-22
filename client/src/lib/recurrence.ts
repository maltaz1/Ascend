// Lógica para calcular e gerar ocorrências de tarefas recorrentes
// Abordagem: gerar ocorrências individuais na tabela tasks com o mesmo
// recurrence config, diferenciando por parent_id

import type { RecurrenceConfig } from "@/types/recurrence";
import { supabase } from "@/lib/supabase";

export function getRecurrenceDates(
  recurrence: RecurrenceConfig,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  baseDate: string   // YYYY-MM-DD - data da tarefa original (primeira ocorrência)
): string[] {
  if (recurrence.type === "never") return [];
  if (recurrence.status === "paused") return [];

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

    case "monthly":
      // Mesmo dia do mês da tarefa original
      // Cuidado com meses que não têm o dia (ex: 31 em fevereiro)
      return currentDate.getDate() === baseDate.getDate();

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
        return monthsDiff % interval === 0 && currentDate.getDate() === baseDate.getDate();
      }

      if (unit === "years") {
        const yearsDiff = currentDate.getFullYear() - baseDate.getFullYear();
        return (
          yearsDiff % interval === 0 &&
          currentDate.getMonth() === baseDate.getMonth() &&
          currentDate.getDate() === baseDate.getDate()
        );
      }

      return false;
    }

    default:
      return false;
  }
}

function dateToString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Gera ocorrências faltantes para uma tarefa recorrente.
 * Procura tarefas com mesmo title+priority que são recorrentes
 * e gera ocorrências no range de datas se ainda não existirem.
 * 
 * Retorna array de datas das novas ocorrências criadas.
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
  if (task.recurrence.status === "paused") return [];

  // Calcular todas as datas de ocorrência no range
  const allDates = getRecurrenceDates(
    task.recurrence,
    rangeStart,
    rangeEnd,
    task.date // data base = data da primeira ocorrência
  );

  if (allDates.length === 0) return [];

  // Verificar quais datas já existem
  const { data: existingTasks } = await supabase
    .from("tasks")
    .select("date, parent_id")
    .eq("parent_id", task.id)
    .in("date", allDates);

  const existingDates = new Set(
    (existingTasks || []).map((t: { date: string }) => t.date)
  );

  const missingDates = allDates.filter(d => !existingDates.has(d));

  // Remover a data base (primeira ocorrência já existe como a tarefa original)
  const datesToCreate = missingDates.filter(d => d !== task.date);

  if (datesToCreate.length === 0) return [];

  // Criar as ocorrências faltantes
  const tasksToInsert = datesToCreate.map(date => ({
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

  return datesToCreate;
}

/**
 * Gera ocorrências para TODAS as tarefas recorrentes no range de datas.
 * Chamado quando o usuário navega para uma data ou carrega a página.
 */
export async function generateAllRecurringOccurrences(
  selectedDate: string
): Promise<number> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return 0;

  // Range: 30 dias a partir da data selecionada
  const start = new Date(selectedDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  const endDateStr = dateToString(end);

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
    if (recurrence.status === "paused") continue;

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
      selectedDate,
      endDateStr
    );

    totalGenerated += generated.length;
  }

  return totalGenerated;
}

/**
 * Gera ocorrências imediatamente após criar uma nova tarefa recorrente.
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

  // Gerar para os próximos 30 dias
  const start = new Date(task.date + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 30);
  const endDateStr = dateToString(end);

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
    task.date,
    endDateStr
  );
}
