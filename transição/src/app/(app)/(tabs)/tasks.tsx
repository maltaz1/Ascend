import { useState } from "react";
import { Alert, View } from "react-native";
import { deleteTask, getTodayString, type Task } from "@/lib/store";
import { saveTask } from "@/store/tasks.store";
import { countTasksCreatedThisWeek, FREE_LIMITS } from "@/config/planLimits";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, EmptyState, IconButton, Input, Screen, SectionTitle, Segmented, Sheet, Txt } from "@/components/ui";
import { TaskRow } from "@/components/rows";
import { DateStrip } from "@/components/DateStrip";
import type { RecurrenceConfig, RecurrenceType } from "@/types/recurrence";

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

type Filter = "all" | "pending" | "completed";

export default function TasksScreen() {
  const data = useStore();
  const { isPro } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Task | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  const dayTasks = data.tasks
    .filter(task => task.date === selectedDate)
    .filter(task => (filter === "pending" ? !task.completed : filter === "completed" ? task.completed : true))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || (a.priority === "high" ? -1 : 1));
  const marks = new Set(data.tasks.filter(t => !t.completed).map(t => t.date));
  const createdThisWeek = countTasksCreatedThisWeek(data.tasks);

  const openNew = () => {
    if (!isPro && createdThisWeek >= FREE_LIMITS.tasksPerWeek) {
      notifyInfo(`Plano grátis permite apenas ${FREE_LIMITS.tasksPerWeek} tarefas por semana`);
      return;
    }
    setEditing(null);
    setShowSheet(true);
  };

  const confirmDelete = (task: Task) => {
    Alert.alert("Excluir tarefa", `Excluir "${task.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Editar", onPress: () => { setEditing(task); setShowSheet(true); } },
      { text: "Excluir", style: "destructive", onPress: () => void deleteTask(task.id) },
    ]);
  };

  const label =
    selectedDate === getTodayString()
      ? "Hoje"
      : new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Screen title="Tarefas" right={<IconButton icon="add" label="Nova tarefa" onPress={openNew} filled />}>
      <DateStrip value={selectedDate} onChange={setSelectedDate} marks={marks} />
      <Segmented
        options={[
          { value: "all", label: "Todas" },
          { value: "pending", label: "Pendentes" },
          { value: "completed", label: "Concluídas" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <SectionTitle>{label}</SectionTitle>
      <Card>
        {dayTasks.length === 0 ? (
          <View style={{ gap: 10 }}>
            <EmptyState icon="checkbox-outline" text="Nenhuma tarefa neste dia." />
            <Button label="Nova tarefa" variant="soft" icon="add" onPress={openNew} />
          </View>
        ) : (
          dayTasks.map(task => (
            <TaskRow
              key={task.id}
              task={task}
              onPress={() => {
                setEditing(task);
                setShowSheet(true);
              }}
              onLongPress={() => confirmDelete(task)}
            />
          ))
        )}
      </Card>

      {!isPro && (
        <Txt variant="caption" muted style={{ textAlign: "center" }}>
          {createdThisWeek}/{FREE_LIMITS.tasksPerWeek} tarefas criadas nesta semana (plano grátis)
        </Txt>
      )}
      <Txt variant="caption" muted style={{ textAlign: "center" }}>
        Toque no círculo para concluir · toque na tarefa para editar · segure para excluir
      </Txt>

      <TaskSheet
        visible={showSheet}
        task={editing}
        defaultDate={selectedDate}
        isPro={isPro}
        onClose={() => setShowSheet(false)}
      />
    </Screen>
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
    <Sheet visible={visible} onClose={onClose} title={task ? "Editar tarefa" : "Nova tarefa"}>
      <Input label="Título *" placeholder="O que precisa ser feito?" value={title} onChangeText={setTitle} />
      <Input label="Descrição (opcional)" placeholder="Detalhes..." value={description} onChangeText={setDescription} multiline />
      <Txt variant="label" muted>
        Data
      </Txt>
      <DateStrip value={date} onChange={setDate} daysBefore={1} daysAfter={60} />
      <Txt variant="label" muted>
        Prioridade
      </Txt>
      <Segmented options={PRIORITIES} value={priority} onChange={setPriority} />
      <Txt variant="label" muted>
        Repetir {!isPro ? "(PRO)" : ""}
      </Txt>
      <Segmented options={RECURRENCES} value={recurrenceType} onChange={setRecurrenceType} wrap />
      <Button label={task ? "Salvar" : "Criar tarefa"} onPress={handleSave} loading={saving} disabled={!title.trim()} />
    </Sheet>
  );
}
