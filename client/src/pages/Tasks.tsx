// Calendário integrado + tarefas por dia + status visual + filtros + ocorrências recorrentes

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertCircle,
  CheckCircle2,
  RotateCw,
  History,
  Info,
} from "lucide-react";

import { RecurrenceSection } from "@/components/RecurrenceSection";
import { RecurrenceIndicator } from "@/components/RecurrenceIndicator";
import { RecurrenceTaskMenu } from "@/components/RecurrenceTaskMenu";
import type { RecurrenceConfig } from "@/types/recurrence";

import { FREE_LIMITS } from "@/config/planLimits";
import { addXP } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { useXPAnimation } from "@/hooks/useStore";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/FlowToast";
import { generateAllRecurringOccurrences, generateOccurrenceForNewTask } from "@/lib/recurrence";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const PRIORITIES = [
  { value: "low", label: "Baixa", color: "#10B981" },
  { value: "medium", label: "Média", color: "#F59E0B" },
  { value: "high", label: "Alta", color: "#EF4444" },
] as const;

type Task = {
  id: string;
  title: string;
  description?: string;
  date: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  category?: string;
  createdAt: string;
  recurrence?: RecurrenceConfig;
  isRecurring?: boolean;
  parentId?: string;
};

function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function normalizeTask(task: Record<string, unknown>): Task {
  const createdAt = typeof task.createdAt === "string" && task.createdAt
    ? task.createdAt
    : typeof task.created_at === "string" && task.created_at
      ? task.created_at
      : new Date().toISOString();

  return {
    id: String(task.id ?? ""),
    title: String(task.title ?? ""),
    description: typeof task.description === "string" ? task.description : undefined,
    date: String(task.date ?? ""),
    completed: Boolean(task.completed),
    priority:
      task.priority === "low" || task.priority === "medium" || task.priority === "high"
        ? (task.priority as "low" | "medium" | "high")
        : "medium",
    category: typeof task.category === "string" ? task.category : undefined,
    createdAt,
    isRecurring: Boolean(task.is_recurring),
    recurrence: task.recurrence as RecurrenceConfig | undefined,
    parentId: typeof task.parent_id === "string" ? task.parent_id : undefined,
  };
}

function getWeekStartDate(date: Date): Date {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function countTasksCreatedThisWeek(tasks: Task[]): number {
  const now = new Date();
  const weekStart = getWeekStartDate(now);

  return tasks.filter(task => {
    const createdAt = new Date(task.createdAt);
    return !Number.isNaN(createdAt.getTime()) && createdAt >= weekStart;
  }).length;
}

function MiniCalendar({
  selectedDate,
  onSelectDate,
  tasks,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tasks: Task[];
}) {
  const today = getTodayString();
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const taskDates = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.date) {
        set.add(t.date);
      }
    });
    return set;
  }, [tasks]);

  const completedDates = useMemo(() => {
    const set = new Set<string>();
    tasks
      .filter(t => t.completed)
      .forEach(t => {
        if (t.date) {
          set.add(t.date);
        }
      });
    return set;
  }, [tasks]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else setViewMonth(m => m + 1);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const formatDate = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return (
    <div className="fz-card p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="fz-btn-ghost p-1.5 rounded-lg">
          <ChevronLeft size={16} className="text-muted-foreground" />
        </button>
        <h3 className="font-bold text-base text-foreground font-space">
          {MONTHS[viewMonth]} {viewYear}
        </h3>
        <button onClick={nextMonth} className="fz-btn-ghost p-1.5 rounded-lg">
          <ChevronRight size={16} className="text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center font-semibold text-[11px] text-muted-foreground py-1 font-space uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = formatDate(day);
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const hasTasks = taskDates.has(dateStr);
          const allCompleted = completedDates.has(dateStr) && hasTasks;

          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              className={`cal-day flex flex-col items-center justify-center gap-1 relative ${isToday ? "today" : ""} ${isSelected && !isToday ? "selected" : ""} ${hasTasks ? "has-tasks" : ""}`}
              style={{
                color: isSelected || isToday ? undefined : "var(--muted-foreground)",
                background: isSelected && !isToday ? "rgba(245,158,11,0.15)" : undefined,
              }}
            >
              <span className={`text-[13px] font-space ${isToday ? "font-bold" : "font-medium"}`}>
                {day}
              </span>
              {hasTasks && (
                <div className={`w-1 h-1 rounded-full ${allCompleted ? "bg-emerald-500" : "bg-primary"}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[11px] text-muted-foreground font-medium">Com tarefas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-muted-foreground font-medium">Concluídas</span>
        </div>
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  onEdit,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const priorityColor =
    task.priority === "high"
      ? "#EF4444"
      : task.priority === "low"
        ? "#10B981"
        : "#F59E0B";

  return (
    <div
      onClick={onEdit}
      className="flex items-start gap-3 p-3.5 bg-white/5 rounded-xl border-l-[3px] mb-2 transition-all hover:bg-white/10 cursor-pointer"
      style={{ borderLeftColor: priorityColor }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
          task.completed ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-transparent"
        }`}
      >
        {task.completed && <Check size={14} className="text-emerald-500" />}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className={`text-[14px] font-medium truncate ${
            task.completed ? "text-muted-foreground line-through" : "text-foreground"
          }`}>
            {task.title}
          </div>
          {task.isRecurring && task.recurrence && (
            <RecurrenceIndicator type={task.recurrence.type} size="sm" />
          )}
        </div>
        {task.description && (
          <div className="text-[12px] text-muted-foreground truncate">
            {task.description}
          </div>
        )}
      </div>

      <div className="flex gap-1 items-center self-center">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function TaskModal({
  open,
  onClose,
  task,
  defaultDate,
  isPro,
  tasks,
  onTaskSaved,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultDate: string;
  isPro: boolean;
  tasks: Task[];
  onTaskSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({
    type: "never",
    endType: "never",
    status: "active",
  });
  const [showRecurrenceSection, setShowRecurrenceSection] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "recurrence">("edit");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setDate(task.date);
      setPriority(task.priority);
      if (task.recurrence) {
        setRecurrence(task.recurrence);
        setShowRecurrenceSection(true);
      } else {
        setRecurrence({ type: "never", endType: "never", status: "active" });
        setShowRecurrenceSection(false);
      }
    } else {
      setTitle("");
      setDescription("");
      setDate(defaultDate);
      setPriority("medium");
      setRecurrence({ type: "never", endType: "never", status: "active" });
      setShowRecurrenceSection(false);
    }
    setActiveTab("edit");
  }, [task, open, defaultDate]);

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;

    if (!task && !isPro && countTasksCreatedThisWeek(tasks) >= FREE_LIMITS.tasksPerWeek) {
      showToast("Plano grátis permite apenas 1 tarefa por semana", "info");
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user?.id) return;

    const taskData = {
      title,
      description,
      date,
      priority,
      user_id: user.id,
      is_recurring: recurrence.type !== "never",
      recurrence: recurrence.type !== "never" ? recurrence : null,
    };

    let error;
    let insertedId: string | undefined;

    if (task) {
      const { error: updateError } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", task.id);
      error = updateError;
    } else {
      const { data, error: insertError } = await supabase
        .from("tasks")
        .insert({ ...taskData, completed: false })
        .select("id")
        .single();
      error = insertError;
      if (data) insertedId = data.id;
    }

    if (error) {
      showToast("Erro ao salvar tarefa", "info");
      return;
    }

    // Se é uma nova tarefa recorrente, gerar ocorrências automaticamente
    if (!task && recurrence.type !== "never" && insertedId) {
      const generated = await generateOccurrenceForNewTask(insertedId, user.id);
      if (generated.length > 0) {
        console.log(`Geradas ${generated.length} ocorrências recorrentes`);
      }
    }

    showToast(task ? "Tarefa atualizada!" : "Tarefa criada!", "success");
    onTaskSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? "Editar Tarefa" : "Nova Tarefa"}>
      <div className="flex flex-col gap-4">
        {/* Tabs for Recurring Task */}
        {task?.isRecurring && (
          <div className="flex gap-2 p-1 bg-muted rounded-xl mb-2">
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                activeTab === "edit" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Info size={14} /> Detalhes
            </button>
            <button
              onClick={() => setActiveTab("recurrence")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                activeTab === "recurrence" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <History size={14} /> Recorrência
            </button>
          </div>
        )}

        {activeTab === "edit" ? (
          <>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Título *</label>
              <input
                className="fz-input w-full"
                placeholder="O que precisa ser feito?"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Descrição (opcional)</label>
              <textarea
                className="fz-input w-full min-h-[80px] resize-none"
                placeholder="Detalhes..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Data *</label>
                <input
                  type="date"
                  className="fz-input w-full"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground mb-1.5 block">Prioridade</label>
                <div className="flex gap-1.5">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      className={`flex-1 py-2 rounded-lg border text-[12px] font-bold transition-all ${
                        priority === p.value 
                        ? 'border-current bg-current/10' 
                        : 'border-border bg-transparent text-muted-foreground hover:border-muted-foreground/30'
                      }`}
                      style={{ color: priority === p.value ? p.color : undefined }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!task && (
              <div className="mt-2">
                <button
                  onClick={() => setShowRecurrenceSection(!showRecurrenceSection)}
                  className={`w-full py-2.5 rounded-xl border text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                    showRecurrenceSection 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border bg-transparent text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  <RotateCw size={14} />
                  {showRecurrenceSection ? "Remover recorrência" : "Adicionar recorrência"}
                </button>
                {showRecurrenceSection && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <RecurrenceSection recurrence={recurrence} onChange={setRecurrence} />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <RecurrenceSection recurrence={recurrence} onChange={setRecurrence} />
            
            <div className="p-4 bg-white/5 rounded-2xl border border-border">
              <div className="flex items-center gap-2 mb-4">
                <History size={16} className="text-primary" />
                <span className="text-[14px] font-bold text-foreground font-space">Histórico Recente</span>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-[12px] text-foreground font-medium">15 Jul 2026</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Concluída</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl opacity-60">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-500" />
                    <span className="text-[12px] text-foreground font-medium">14 Jul 2026</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Atrasada</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          className="fz-btn-primary w-full py-3.5 text-[15px] font-bold mt-4 shadow-lg shadow-primary/20"
          onClick={handleSubmit}
        >
          {task ? "Salvar Alterações" : "Criar Tarefa"}
        </button>
      </div>
    </Modal>
  );
}

export default function Tasks({ isPro }: { isPro: boolean }) {
  const { showXP } = useXPAnimation();
  const today = getTodayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed" | "overdue">("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [generating, setGenerating] = useState(false);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTasks(data.map(task => normalizeTask(task as Record<string, unknown>)));
    }
  }, []);

  // Quando seleciona uma nova data, gerar ocorrências recorrentes para os próximos 30 dias
  const handleSelectDate = useCallback(async (date: string) => {
    setSelectedDate(date);
    setGenerating(true);
    try {
      const generated = await generateAllRecurringOccurrences(date);
      if (generated > 0) {
        console.log(`Geradas ${generated} ocorrências recorrentes para a data ${date}`);
        await fetchTasks();
      }
    } catch (err) {
      console.error("Erro ao gerar ocorrências:", err);
    } finally {
      setGenerating(false);
    }
  }, [fetchTasks]);

  useEffect(() => {
    // Ao carregar, gerar ocorrências para hoje e buscar tarefas
    const init = async () => {
      setGenerating(true);
      try {
        await generateAllRecurringOccurrences(today);
        await fetchTasks();
      } catch (err) {
        console.error("Erro ao inicializar:", err);
      } finally {
        setGenerating(false);
      }
    };
    init();
  }, [fetchTasks, today]);

  const selectedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.date !== selectedDate) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus === "pending") return !t.completed;
      if (filterStatus === "completed") return t.completed;
      if (filterStatus === "overdue") return !t.completed && t.date < today;
      return true;
    });
  }, [tasks, selectedDate, search, filterStatus, today]);

  const handleToggle = async (task: Task) => {
    const newCompleted = !task.completed;
    const { error } = await supabase.from("tasks").update({ completed: newCompleted }).eq("id", task.id);
    if (error) {
      showToast("Erro ao atualizar tarefa", "info");
      return;
    }
    if (newCompleted) await addXP(10);
    fetchTasks();
    showToast(newCompleted ? "Tarefa concluída!" : "Tarefa desmarcada", "success");
  };

  // Estado para modal de exclusão de recorrência
  const [deleteRecurringTask, setDeleteRecurringTask] = useState<Task | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // Quando clica em excluir uma tarefa recorrente (mãe ou ocorrência) → abre modal
  const handleDelete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    
    if (task?.isRecurring) {
      // Qualquer tarefa recorrente (mãe ou filha) → abrir modal de escolha
      setDeleteRecurringTask(task);
    } else {
      // Tarefa normal → deletar direto
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (!error) fetchTasks();
    }
  };

  const handleDeleteThisOccurrence = async () => {
    if (!deleteRecurringTask) return;
    // Deletar apenas esta ocorrência (seja mãe ou filha)
    const { error } = await supabase.from("tasks").delete().eq("id", deleteRecurringTask.id);
    if (!error) fetchTasks();
    setDeleteRecurringTask(null);
    showToast("Ocorrência excluída deste dia", "success");
  };

  const handleDeleteAllOccurrences = async () => {
    if (!deleteRecurringTask) return;
    setDeletingAll(true);
    // Precisa encontrar a mãe para deletar via cascade
    const taskToDelete = deleteRecurringTask.parentId
      ? tasks.find(t => t.id === deleteRecurringTask.parentId)
      : deleteRecurringTask;
    
    if (taskToDelete) {
      // Deletar a mãe → cascade deleta todas as ocorrências
      const { error } = await supabase.from("tasks").delete().eq("id", taskToDelete.id);
      if (!error) fetchTasks();
    } else {
      // Fallback: deletar apenas esta
      const { error } = await supabase.from("tasks").delete().eq("id", deleteRecurringTask.id);
      if (!error) fetchTasks();
    }
    setDeletingAll(false);
    setDeleteRecurringTask(null);
    showToast("Tarefa recorrente e todas as ocorrências excluídas", "success");
  };

  // handleDeleteOccurrence removido - agora tudo passa pelo handleDelete

  const selectedDateFormatted = new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex gap-6 p-5 max-w-full overflow-y-auto pb-10 flex-wrap">
      {/* Sidebar com Calendário */}
      <div className="hidden lg:block w-[280px] flex-shrink-0">
        <MiniCalendar selectedDate={selectedDate} onSelectDate={handleSelectDate} tasks={tasks} />
      </div>

      {/* Coluna Principal */}
      <div className="flex-1 min-w-0">
        {/* Mini Calendário em Mobile */}
        <div className="lg:hidden w-full mb-5">
          <MiniCalendar selectedDate={selectedDate} onSelectDate={handleSelectDate} tasks={tasks} />
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground font-space capitalize">
              {selectedDateFormatted}
            </h2>
            <button
              onClick={() => {
                setEditingTask(null);
                setShowModal(true);
              }}
              className="fz-btn-primary flex items-center gap-1.5 px-3 py-2 text-[13px] font-bold"
            >
              <Plus size={16} /> Nova Tarefa
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap mb-4">
            {(["all", "pending", "completed", "overdue"] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-all ${
                  filterStatus === status 
                  ? "border-primary bg-primary/10 text-primary" 
                  : "border-border bg-transparent text-muted-foreground hover:border-muted-foreground/30"
                }`}
              >
                {status === "all" ? "Todas" : status === "pending" ? "Pendentes" : status === "completed" ? "Concluídas" : "Atrasadas"}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="fz-input w-full pl-10"
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-1">
          {generating && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-[13px]">
              <RotateCw size={14} className="animate-spin" />
              Gerando ocorrências recorrentes...
            </div>
          )}
          {selectedTasks.length === 0 && !generating ? (
            <div className="text-center py-12 text-muted-foreground bg-white/5 rounded-3xl border border-dashed border-border">
              <CheckCircle2 size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-[14px] font-medium">
                {search ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa para este dia"}
              </p>
            </div>
          ) : (
            !generating && selectedTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggle(task)}
                onDelete={() => handleDelete(task.id)}
                onEdit={() => {
                  setEditingTask(task);
                  setShowModal(true);
                }}
              />
            ))
          )}
        </div>
      </div>

      <TaskModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTask(null);
        }}
        task={editingTask}
        defaultDate={selectedDate}
        isPro={isPro}
        tasks={tasks}
        onTaskSaved={fetchTasks}
      />

      {/* Modal de exclusão de tarefa recorrente */}
      <Modal
        open={!!deleteRecurringTask}
        onClose={() => {
          setDeleteRecurringTask(null);
          setDeletingAll(false);
        }}
        title="Excluir tarefa recorrente"
      >
        <div className="flex flex-col gap-5">
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Como você deseja excluir <strong className="text-foreground">{deleteRecurringTask?.title}</strong>?
          </p>

          <button
            onClick={() => {
              handleDeleteAllOccurrences();
            }}
            disabled={deletingAll}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 transition-all text-left group disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-destructive" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-destructive group-hover:text-destructive transition-colors">
                {deletingAll ? "Excluindo..." : "Excluir de todos os dias"}
              </div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                Remove a recorrência e todas as ocorrências já criadas
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              handleDeleteThisOccurrence();
            }}
            disabled={deletingAll}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-white/5 hover:bg-white/10 transition-all text-left group disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-bold text-foreground group-hover:text-foreground transition-colors">
                {deletingAll ? "Excluindo..." : "Excluir apenas esta ocorrência"}
              </div>
              <div className="text-[12px] text-muted-foreground mt-0.5">
                Remove apenas deste dia, mantém a recorrência nos demais
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              setDeleteRecurringTask(null);
              setDeletingAll(false);
            }}
            disabled={deletingAll}
            className="w-full py-3 rounded-xl border border-border text-[13px] font-bold text-muted-foreground hover:text-foreground hover:border-muted-foreground/50 transition-all disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
}
