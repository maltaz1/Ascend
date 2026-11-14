import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getTodayString, type Task } from "@/lib/store";
import { deleteRecurringOccurrence, deleteRecurringSeries, generateRecurringForDate, saveTask } from "@/store/tasks.store";
import { countTasksCreatedThisWeek, FREE_LIMITS } from "@/config/planLimits";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, EmptyState, IconButton, Input, Marginalia, Screen, Segmented, Sheet, Stamp, Txt } from "@/components/ui";
import { longDate, TaskCard, toggleTask } from "@/components/rows";
import { DateStrip } from "@/components/DateStrip";
import { MonthCalendar } from "@/components/MonthCalendar";
import { RecurrenceSection } from "@/components/RecurrenceSection";
import type { RecurrenceConfig } from "@/types/recurrence";
import { fonts, useTheme } from "@/theme";
import { useNewParam } from "@/hooks/useNewParam";

const PRIORITIES: { value: Task["priority"]; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

const EMPTY_RECURRENCE: RecurrenceConfig = { type: "never", endType: "never", status: "active" };

type Filter = "all" | "pending" | "completed" | "overdue";
type HistoryFilter = "all" | "pending" | "completed";

const isRecurringTask = (task: Task) => task.isRecurring || !!task.parentId;

// Porta de pages/Tasks.tsx: calendário, histórico, filtros, busca, lista,
// geração de ocorrências recorrentes e exclusão de recorrentes.
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
  const [showHistory, setShowHistory] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [deleteRecurring, setDeleteRecurring] = useState<Task | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  const runGeneration = async (date: string) => {
    setGenerating(true);
    try {
      await generateRecurringForDate(date);
    } catch (err) {
      console.error("Erro ao gerar ocorrências:", err);
    } finally {
      setGenerating(false);
    }
  };

  // Ao abrir: gera as ocorrências recorrentes que faltam a partir de hoje (como no web).
  useEffect(() => {
    let active = true;
    generateRecurringForDate(today)
      .catch(err => console.error("Erro ao gerar ocorrências:", err))
      .finally(() => active && setGenerating(false));
    return () => {
      active = false;
    };
  }, [today]);

  const selectDate = (date: string) => {
    setSelectedDate(date);
    void runGeneration(date);
  };

  const q = search.trim().toLowerCase();
  const dayTasks = data.tasks.filter(task => {
    if (task.date !== selectedDate) return false;
    if (q && !task.title.toLowerCase().includes(q)) return false;
    if (filter === "pending") return !task.completed;
    if (filter === "completed") return task.completed;
    if (filter === "overdue") return !task.completed && task.date < today;
    return true;
  });
  const createdThisWeek = countTasksCreatedThisWeek(data.tasks);

  const openNew = () => {
    setEditing(null);
    setShowSheet(true);
  };
  useNewParam(openNew);

  const handleDeleteOccurrence = async () => {
    if (!deleteRecurring) return;
    const { error } = await deleteRecurringOccurrence(deleteRecurring);
    setDeleteRecurring(null);
    if (error) notifyError("Não foi possível remover a tarefa", error);
    else notifySuccess("Ocorrência excluída deste dia");
  };

  const handleDeleteAll = async () => {
    if (!deleteRecurring) return;
    setDeletingAll(true);
    const { error } = await deleteRecurringSeries(deleteRecurring);
    setDeletingAll(false);
    setDeleteRecurring(null);
    if (error) notifyError("Não foi possível remover a tarefa", error);
    else notifySuccess("Tarefa recorrente e todas as ocorrências excluídas");
  };

  const label = longDate(new Date(`${selectedDate}T12:00:00`));
  const title = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <Screen>
      <Card>
        <MonthCalendar
          value={selectedDate}
          onChange={selectDate}
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
          {title}
        </Txt>
        <IconButton icon="time-outline" label="Histórico" onPress={() => setShowHistory(true)} />
        <IconButton icon="add" label="Nova Tarefa" onPress={openNew} filled />
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

      {generating ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 }}>
          <ActivityIndicator size="small" color={theme.inkMuted} />
          <Txt variant="caption" muted>
            Gerando ocorrências recorrentes...
          </Txt>
        </View>
      ) : dayTasks.length === 0 ? (
        <Card>
          <EmptyState text={search ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa para este dia"} />
          <Txt variant="caption" muted style={{ textAlign: "center" }}>
            {search ? "Tente buscar por outro termo." : "Adicione uma tarefa para começar a evoluir. Cada tarefa concluída te dá XP!"}
          </Txt>
          {!search ? <Button label="+ Adicionar tarefa" onPress={openNew} /> : null}
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
              onDelete={isRecurringTask(task) ? () => setDeleteRecurring(task) : undefined}
            />
          ))}
        </View>
      )}

      {!isPro && (
        <Txt variant="caption" muted style={{ textAlign: "center" }}>
          {createdThisWeek}/{FREE_LIMITS.tasksPerWeek} tarefas criadas nesta semana (plano grátis)
        </Txt>
      )}

      <TaskSheet
        visible={showSheet}
        task={editing}
        defaultDate={selectedDate}
        isPro={isPro}
        tasks={data.tasks}
        onClose={() => {
          setShowSheet(false);
          setEditing(null);
        }}
      />

      <HistorySheet visible={showHistory} onClose={() => setShowHistory(false)} tasks={data.tasks} today={today} onSelectDate={selectDate} />

      <Sheet visible={!!deleteRecurring} onClose={() => setDeleteRecurring(null)} title="Excluir tarefa recorrente">
        <Txt variant="body" muted>
          “{deleteRecurring?.title}” é uma tarefa recorrente. O que você quer excluir?
        </Txt>
        <Button label="Excluir de todos os dias" variant="danger" icon="trash-outline" onPress={handleDeleteAll} loading={deletingAll} />
        <Button label="Excluir apenas esta ocorrência" variant="ghost" icon="calendar-outline" onPress={handleDeleteOccurrence} />
        <Button label="Cancelar" variant="soft" onPress={() => setDeleteRecurring(null)} />
      </Sheet>
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

// ---------------------------------------------------------------------------
// Histórico (TaskHistoryModal do web)
// ---------------------------------------------------------------------------

function HistorySheet({
  visible,
  onClose,
  tasks,
  today,
  onSelectDate,
}: {
  visible: boolean;
  onClose: () => void;
  tasks: Task[];
  today: string;
  onSelectDate: (date: string) => void;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const historyTasks = useMemo(() => tasks.filter(task => task.date < today), [tasks, today]);
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = historyTasks
      .filter(task => {
        if (q && !`${task.title} ${task.description || ""}`.toLowerCase().includes(q)) return false;
        if (filter === "pending") return !task.completed;
        if (filter === "completed") return task.completed;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const map = new Map<string, Task[]>();
    filtered.forEach(task => map.set(task.date, [...(map.get(task.date) || []), task]));
    return Array.from(map.entries());
  }, [historyTasks, search, filter]);

  const completedCount = historyTasks.filter(task => task.completed).length;
  const pendingCount = historyTasks.length - completedCount;

  return (
    <Sheet visible={visible} onClose={onClose} title="Histórico de tarefas">
      <View style={{ flexDirection: "row", gap: 8 }}>
        <CountBox label="Concluídas" value={completedCount} color={theme.success} />
        <CountBox label="Pendentes" value={pendingCount} color={theme.warning} />
        <CountBox label="Total" value={tasks.length} color={theme.inkMuted} />
      </View>
      <Input icon="search" placeholder="Buscar no histórico..." value={search} onChangeText={setSearch} />
      <Segmented
        kind="stamp"
        options={[
          { value: "all", label: "Todas" },
          { value: "pending", label: "Pendentes" },
          { value: "completed", label: "Concluídas" },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {groups.length === 0 ? (
        <Card style={{ alignItems: "center", gap: 6 }}>
          <Ionicons name="time-outline" size={28} color={theme.inkMuted} />
          <Txt variant="bodyStrong">Nenhum registro encontrado</Txt>
          <Txt variant="caption" muted style={{ textAlign: "center" }}>
            Tente ajustar a busca ou o filtro para ver outras tarefas.
          </Txt>
        </Card>
      ) : (
        groups.map(([date, dateTasks]) => {
          const done = dateTasks.filter(t => t.completed).length;
          const dayLabel = longDate(new Date(`${date}T12:00:00`));
          return (
            <Card key={date} style={{ gap: 0, padding: 0, overflow: "hidden" }}>
              <Pressable
                onPress={() => {
                  onSelectDate(date);
                  onClose();
                }}
                accessibilityLabel="Abrir este dia na lista de tarefas"
                style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primarySoft, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="calendar-outline" size={17} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong" numberOfLines={1}>
                    {dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)}
                  </Txt>
                  <Txt variant="caption" muted>
                    {dateTasks.length} {dateTasks.length === 1 ? "tarefa" : "tarefas"} · {done} concluída{done === 1 ? "" : "s"}
                  </Txt>
                </View>
              </Pressable>
              {dateTasks.map(task => (
                <View key={task.id} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Pressable
                    onPress={() => void toggleTask(task)}
                    accessibilityLabel={task.completed ? `Desmarcar ${task.title}` : `Marcar ${task.title} como concluída`}
                    style={{
                      marginTop: 2,
                      width: 24,
                      height: 24,
                      borderRadius: 8,
                      borderWidth: 2,
                      alignItems: "center",
                      justifyContent: "center",
                      borderColor: task.completed ? theme.success : theme.border,
                      backgroundColor: task.completed ? `${theme.success}1a` : "transparent",
                    }}
                  >
                    {task.completed ? <Ionicons name="checkmark" size={14} color={theme.success} /> : null}
                  </Pressable>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                      <Txt variant="bodyStrong" muted={task.completed} style={{ textDecorationLine: task.completed ? "line-through" : "none" }}>
                        {task.title}
                      </Txt>
                      {task.isRecurring && task.recurrence ? <Stamp label="Recorrente" tone="violet" icon="repeat" /> : null}
                      <Stamp label={task.completed ? "Concluída" : "Pendente"} tone={task.completed ? "green" : "amber"} />
                    </View>
                    {task.description ? (
                      <Txt variant="caption" muted>
                        {task.description}
                      </Txt>
                    ) : null}
                    <Txt variant="caption" muted style={{ fontSize: 10 }}>
                      Prioridade: {PRIORITIES.find(p => p.value === task.priority)?.label || "Média"}
                    </Txt>
                  </View>
                </View>
              ))}
            </Card>
          );
        })
      )}

      <Txt variant="caption" muted>
        O histórico mostra somente tarefas de dias anteriores a hoje. Toque no dia para abrir a lista correspondente ou use o botão ao lado da tarefa para marcar e desmarcar sem sair do histórico.
      </Txt>
    </Sheet>
  );
}

function CountBox({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: `${color}1a` }}>
      <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" }} color={color}>
        {label}
      </Txt>
      <Txt variant="h2">{value}</Txt>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Nova / editar tarefa (TaskModal do web)
// ---------------------------------------------------------------------------

function TaskSheet({
  visible,
  task,
  defaultDate,
  isPro,
  tasks,
  onClose,
}: {
  visible: boolean;
  task: Task | null;
  defaultDate: string;
  isPro: boolean;
  tasks: Task[];
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>(EMPTY_RECURRENCE);
  const [showRecurrence, setShowRecurrence] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "recurrence">("edit");
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
      setRecurrence(task?.recurrence ?? EMPTY_RECURRENCE);
      setShowRecurrence(!!task?.recurrence);
      setActiveTab("edit");
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !date) return;
    if (!task && !isPro && recurrence.type !== "never") {
      notifyInfo("Tarefas recorrentes são exclusivas do plano Pro");
      return;
    }
    if (!task && !isPro && countTasksCreatedThisWeek(tasks) >= FREE_LIMITS.tasksPerWeek) {
      notifyInfo(`Plano grátis permite apenas ${FREE_LIMITS.tasksPerWeek} tarefas por semana`);
      return;
    }
    // Sem a seção aberta numa tarefa nova, a recorrência não vale (o web zera ao remover).
    const finalRecurrence = !task && !showRecurrence ? null : recurrence.type !== "never" ? recurrence : null;

    setSaving(true);
    const { error } = await saveTask({ id: task?.id, title, description, date, priority, recurrence: finalRecurrence });
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
      {task?.isRecurring ? (
        <Segmented
          kind="stamp"
          options={[
            { value: "edit", label: "Detalhes", icon: "information-circle-outline" },
            { value: "recurrence", label: "Recorrência", icon: "repeat" },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      ) : null}

      {activeTab === "edit" ? (
        <>
          <Input label="Título *" placeholder="O que precisa ser feito?" value={title} onChangeText={setTitle} />
          <Input label="Descrição (opcional)" placeholder="Detalhes..." value={description} onChangeText={setDescription} multiline />
          <Marginalia>Data *</Marginalia>
          <DateStrip value={date} onChange={setDate} daysBefore={1} daysAfter={60} />
          <Marginalia>Prioridade</Marginalia>
          <Segmented kind="stamp" options={PRIORITIES} value={priority} onChange={setPriority} />

          {!task ? (
            <>
              {!isPro ? (
                <Button
                  label="Adicionar recorrência"
                  variant="ghost"
                  icon="lock-closed-outline"
                  onPress={() => notifyInfo("Tarefas recorrentes são exclusivas do plano Pro")}
                />
              ) : (
                <Button
                  label={showRecurrence ? "Remover recorrência" : "Adicionar recorrência"}
                  variant="ghost"
                  icon="repeat"
                  onPress={() => {
                    if (showRecurrence) setRecurrence(EMPTY_RECURRENCE);
                    setShowRecurrence(!showRecurrence);
                  }}
                />
              )}
              {showRecurrence ? <RecurrenceSection recurrence={recurrence} onChange={setRecurrence} /> : null}
            </>
          ) : null}
        </>
      ) : (
        <RecurrenceSection recurrence={recurrence} onChange={setRecurrence} />
      )}

      <Button label={task ? "Salvar Alterações" : "Criar Tarefa"} onPress={handleSave} loading={saving} disabled={!title.trim()} />
    </Sheet>
  );
}
