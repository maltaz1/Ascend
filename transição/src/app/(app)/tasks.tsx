import { useState } from "react";
import { View } from "react-native";
import { getTodayString, type Task } from "@/lib/store";
import { saveTask } from "@/store/tasks.store";
import { countTasksCreatedThisWeek, FREE_LIMITS } from "@/config/planLimits";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, EmptyState, IconButton, Input, Marginalia, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { longDate, TaskCard } from "@/components/rows";
import { DateStrip } from "@/components/DateStrip";
import { MonthCalendar } from "@/components/MonthCalendar";
import type { RecurrenceConfig, RecurrenceType } from "@/types/recurrence";
import { useTheme } from "@/theme";

const PRIORITIES: { value: Task["priority"]; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

const RECURRENCES: { value: RecurrenceType; label: string }[] = [
  { value: "never", label: "Não repete" },
  { value: "daily", label: "Diária" },
  { value: "weekdays", label: "Dias úteis" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

type Filter = "all" | "pending" | "completed" | "overdue";

// Porta de pages/Tasks.tsx: mini calendário, filtros, busca e lista.
export default function TasksScreen() {
  const theme = useTheme();
  const data = useStore();
  const { isPro } = useAuth();
  const today = getTodayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const q = search.trim().toLowerCase();
  const dayTasks = data.tasks
    .filter(task => (filter === "overdue" ? !task.completed && task.date < today : task.date === selectedDate))
    .filter(task => (filter === "pending" ? !task.completed : filter === "completed" ? task.completed : true))
    .filter(task => !q || task.title.toLowerCase().includes(q))
    .sort((a, b) => Number(a.completed) - Number(b.completed));
  const createdThisWeek = countTasksCreatedThisWeek(data.tasks);

  const openNew = () => {
    if (!isPro && createdThisWeek >= FREE_LIMITS.tasksPerWeek) {
      notifyInfo(`Plano grátis permite apenas ${FREE_LIMITS.tasksPerWeek} tarefas por semana`);
      return;
    }
    setEditing(null);
    setShowSheet(true);
  };

  const label = longDate(new Date(`${selectedDate}T12:00:00`));
  const title = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <Screen>
      <Card>
        <MonthCalendar
          value={selectedDate}
          onChange={setSelectedDate}
          dots={key => {
            const list = data.tasks.filter(t => t.date === key);
            const marks: string[] = [];
            if (list.some(t => !t.completed)) marks.push(theme.primary);
            if (list.length > 0 && list.every(t => t.completed)) marks.push(theme.success);
            return marks;
          }}
        />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <View style={{ flexDirection: "row", gap: 16 }}>
          <LegendDot color={theme.primary} label="Com tarefas" />
          <LegendDot color={theme.success} label="Concluídas" />
        </View>
      </Card>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Txt variant="h2" style={{ flex: 1 }} numberOfLines={1}>
          {filter === "overdue" ? "Tarefas atrasadas" : title}
        </Txt>
        <IconButton icon="time-outline" label="Voltar para hoje" onPress={() => setSelectedDate(today)} />
        <IconButton icon="add" label="Nova tarefa" onPress={openNew} filled />
      </View>

      <Segmented
        kind="stamp"
        options={[
          { value: "all", label: "Todas" },
          { value: "pending", label: "Pendentes" },
          { value: "completed", label: "Concluídas" },
          { value: "overdue", label: "Atrasadas" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <Input icon="search" placeholder="Buscar tarefas..." value={search} onChangeText={setSearch} />

      {dayTasks.length === 0 ? (
        <Card>
          <EmptyState icon="checkbox-outline" text="Nenhuma tarefa por aqui." />
          <Button label="Nova tarefa" variant="soft" icon="add" onPress={openNew} />
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {dayTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onPress={() => {
                setEditing(task);
                setShowSheet(true);
              }}
            />
          ))}
        </View>
      )}

      {!isPro && (
        <Txt variant="caption" muted style={{ textAlign: "center" }}>
          {createdThisWeek}/{FREE_LIMITS.tasksPerWeek} tarefas criadas nesta semana (plano grátis)
        </Txt>
      )}

      <TaskSheet visible={showSheet} task={editing} defaultDate={selectedDate} isPro={isPro} onClose={() => setShowSheet(false)} />
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
}

function TaskSheet({
  visible,
  task,
  defaultDate,
  isPro,
  onClose,
}: {
  visible: boolean;
  task: Task | null;
  defaultDate: string;
  isPro: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("never");
  const [saving, setSaving] = useState(false);
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  // Preenche o formulário toda vez que a folha abre (como o useEffect do web).
  const openKey = visible ? task?.id ?? `new-${defaultDate}` : null;
  if (openKey !== lastOpened) {
    setLastOpened(openKey);
    if (visible) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setDate(task?.date ?? defaultDate);
      setPriority(task?.priority ?? "medium");
      setRecurrenceType(task?.recurrence?.type ?? "never");
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !date) return;
    if (!task && !isPro && recurrenceType !== "never") {
      notifyInfo("Tarefas recorrentes são exclusivas do plano Pro");
      return;
    }
    const recurrence: RecurrenceConfig | null =
      recurrenceType === "never"
        ? null
        : { ...(task?.recurrence ?? {}), type: recurrenceType, endType: task?.recurrence?.endType ?? "never", status: "active" };

    setSaving(true);
    const { error } = await saveTask({ id: task?.id, title, description, date, priority, recurrence });
    setSaving(false);
    if (error) {
      notifyError("Erro ao salvar tarefa", error);
      return;
    }
    notifySuccess(task ? "Tarefa atualizada!" : "Tarefa criada!");
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={task ? "Editar Tarefa" : "Nova Tarefa"}>
      <Input label="Título *" placeholder="O que precisa ser feito?" value={title} onChangeText={setTitle} />
      <Input label="Descrição (opcional)" placeholder="Detalhes..." value={description} onChangeText={setDescription} multiline />
      <Marginalia>Data *</Marginalia>
      <DateStrip value={date} onChange={setDate} daysBefore={1} daysAfter={60} />
      <Marginalia>Prioridade</Marginalia>
      <Segmented kind="stamp" options={PRIORITIES} value={priority} onChange={setPriority} />
      <Marginalia>Repetir {!isPro ? "(Pro)" : ""}</Marginalia>
      <Segmented kind="stamp" options={RECURRENCES} value={recurrenceType} onChange={setRecurrenceType} />
      <Button label={task ? "Salvar" : "Criar tarefa"} onPress={handleSave} loading={saving} disabled={!title.trim()} />
    </Sheet>
  );
}
