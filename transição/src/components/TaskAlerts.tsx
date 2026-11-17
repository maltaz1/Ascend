import { useEffect } from "react";
import { useStore } from "@/hooks/useStore";
import { syncTaskReminders } from "@/lib/reminders";

// Sem tela: mantém agendados os avisos das tarefas com horário sempre que a lista muda.
export function TaskAlerts() {
  const data = useStore();
  const key = data.tasks
    .filter(task => !task.completed && task.time)
    .map(task => `${task.id}@${task.date}@${task.time}`)
    .join("|");
  useEffect(() => {
    void syncTaskReminders(data.tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
