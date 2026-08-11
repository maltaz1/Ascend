/**
 * Sincronização bidirecional entre Hábitos e Metas Semanais.
 *
 * Quando um hábito é marcado/desmarcado (via Today, Habits ou Dashboard),
 * todas as metas semanais vinculadas a esse hábito são atualizadas.
 *
 * Quando uma meta semanal é marcada manualmente (via Goals), o hábito
 * vinculado também é atualizado.
 */

import { supabase } from "@/lib/supabase";
import { getMondayOfDate, dateToWeekdayIndex } from "@/lib/weeklyGoals";

/**
 * Atualiza a meta semanal vinculada quando o hábito é marcado/desmarcado.
 * Recebe o hábito completo com completed_dates atualizados (após o toggle).
 */
export async function syncHabitToGoals(habit: {
  id: string;
  completed_dates?: string[] | null;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Buscar todas as metas semanais vinculadas a este hábito
  const { data: goals } = await supabase
    .from("goals")
    .select("id, days_completed_week, week_start")
    .eq("user_id", user.id)
    .eq("type", "semanal")
    .eq("linked_habit_id", habit.id);

  if (!goals || goals.length === 0) return;

  const monday = getMondayOfDate(new Date());

  for (const goal of goals) {
    const daysCompletedWeek = goal.days_completed_week ?? [false, false, false, false, false, false, false];
    const checkins = habit.completed_dates || [];

    // Atualizar cada dia da semana atual
    const updatedDays = daysCompletedWeek.map((completed: boolean, i: number) => {
      const d = new Date(`${monday}T12:00:00`);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      return checkins.includes(key);
    });

    await supabase
      .from("goals")
      .update({ days_completed_week: updatedDays })
      .eq("id", goal.id);
  }
}

/**
 * Atualiza o hábito vinculado quando a meta semanal é marcada manualmente.
 * Recebe a data do dia marcado e se foi marcado ou desmarcado.
 */
export async function syncGoalToHabit(
  habitId: string,
  dayIndex: number,
  isMarked: boolean
) {
  if (!habitId) return;

  const monday = getMondayOfDate(new Date());
  const d = new Date(`${monday}T12:00:00`);
  d.setDate(d.getDate() + dayIndex);
  const dateStr = d.toISOString().slice(0, 10);

  // Buscar o hábito atual
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: habit } = await supabase
    .from("habits")
    .select("completed_dates")
    .eq("id", habitId)
    .eq("user_id", user.id)
    .single();

  if (!habit) return;

  const completedDates = habit.completed_dates || [];
  const alreadyIncluded = completedDates.includes(dateStr);

  let updatedDates: string[];
  if (isMarked && !alreadyIncluded) {
    updatedDates = [...completedDates, dateStr];
  } else if (!isMarked && alreadyIncluded) {
    updatedDates = completedDates.filter((d: string) => d !== dateStr);
  } else {
    return; // Não precisa atualizar
  }

  await supabase
    .from("habits")
    .update({ completed_dates: updatedDates })
    .eq("id", habitId);
}
