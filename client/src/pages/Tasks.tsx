// Calendário integrado + tarefas por dia + status visual + filtros

import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import { RecurrenceSection } from "@/components/RecurrenceSection";
import { RecurrenceIndicator } from "@/components/RecurrenceIndicator";
import { RecurrenceTaskMenu } from "@/components/RecurrenceTaskMenu";
import type { RecurrenceConfig } from "@/types/recurrence";

import { FREE_LIMITS } from "@/config/planLimits";

import { addXP } from "@/lib/store";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

import { useStore, useXPAnimation } from "@/hooks/useStore";
import { addTask, completeTask, uncompleteTask, deleteTask } from "@/lib/store";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/FlowToast";

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
    <div className="fz-card" style={{ padding: "20px 22px" }}>
      {/* Month nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <button
          onClick={prevMonth}
          className="fz-btn-ghost"
          style={{ padding: "6px 8px", borderRadius: 8 }}
        >
          <ChevronLeft size={16} color="var(--muted-foreground)" />
        </button>
        <h3
          style={{
            fontFamily: "Space Grotesk",
            fontWeight: 700,
            fontSize: 16,
            color: "var(--foreground)",
          }}
        >
          {MONTHS[viewMonth]} {viewYear}
        </h3>
        <button
          onClick={nextMonth}
          className="fz-btn-ghost"
          style={{ padding: "6px 8px", borderRadius: 8 }}
        >
          <ChevronRight size={16} color="var(--muted-foreground)" />
        </button>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 8,
        }}
      >
        {WEEKDAYS.map(d => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontFamily: "Space Grotesk",
              fontWeight: 600,
              fontSize: 11,
              color: "var(--muted-foreground)",
              padding: "4px 0",
              letterSpacing: "0.05em",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
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
              className={`cal-day ${isToday ? "today" : ""} ${isSelected && !isToday ? "selected" : ""} ${hasTasks ? "has-tasks" : ""}`}
              style={{
                color:
                  isSelected || isToday ? undefined : "var(--muted-foreground)",
                background:
                  isSelected && !isToday ? "rgba(245,158,11,0.15)" : undefined,
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontFamily: "Space Grotesk",
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                {day}
              </span>
              {hasTasks && (
                <div
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: allCompleted ? "#10B981" : "#A855F7",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#A855F7",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              fontFamily: "DM Sans",
            }}
          >
            Com tarefas
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#10B981",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              fontFamily: "DM Sans",
            }}
          >
            Concluídas
          </span>
        </div>
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  onEditRecurrence,
  onSkipOccurrence,
  onTogglePause,
  onDeleteOccurrence,
  onDeleteRecurrence,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onEditRecurrence?: () => void;
  onSkipOccurrence?: () => void;
  onTogglePause?: () => void;
  onDeleteOccurrence?: () => void;
  onDeleteRecurrence?: () => void;
}) {
  const priorityColor =
    task.priority === "high"
      ? "#EF4444"
      : task.priority === "low"
        ? "#10B981"
        : "#F59E0B";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 8,
        borderLeft: `3px solid ${priorityColor}`,
        marginBottom: 8,
        transition: "all 0.2s",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: `2px solid ${task.completed ? "#10B981" : "var(--border)"}`,
          background: task.completed ? "#10B98115" : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        {task.completed && <Check size={14} color="#10B981" />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: task.description ? 4 : 0,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: task.completed
                ? "var(--muted-foreground)"
                : "var(--foreground)",
              textDecoration: task.completed ? "line-through" : "none",
              wordBreak: "break-word",
              flex: 1,
            }}
          >
            {task.title}
          </div>
          {task.isRecurring && task.recurrence && (
            <RecurrenceIndicator type={task.recurrence.type} size="sm" />
          )}
        </div>
        {task.description && (
          <div
            style={{
              fontSize: 12,
              color: "var(--muted-foreground)",
              marginTop: 4,
              wordBreak: "break-word",
            }}
          >
            {task.description}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
        {task.isRecurring && (
          <RecurrenceTaskMenu
            isRecurring={true}
            recurrenceStatus={task.recurrence?.status}
            onEditRecurrence={onEditRecurrence}
            onSkipOccurrence={onSkipOccurrence}
            onTogglePause={onTogglePause}
            onDeleteOccurrence={onDeleteOccurrence}
            onDeleteRecurrence={onDeleteRecurrence}
          />
        )}
        <button
          onClick={onDelete}
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted-foreground)",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "#EF4444")}
          onMouseLeave={e =>
            (e.currentTarget.style.color = "var(--muted-foreground)")
          }
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function NewTaskModal({
  open,
  onClose,
  defaultDate,
  isPro,
  tasks,
  onTaskCreated,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  isPro: boolean;
  tasks: Task[];
  onTaskCreated: (task: Task) => void;
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

  const handleSubmit = async () => {
    if (!title.trim() || !date) return;

    if (!isPro && countTasksCreatedThisWeek(tasks) >= FREE_LIMITS.tasksPerWeek) {
      showToast("Plano grátis permite apenas 1 tarefa por semana", "info");
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;

    if (!user?.id) {
      showToast("Erro ao criar tarefa", "info");
      return;
    }

    const { data: insertedTask, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description,
        date,
        priority,
        completed: false,
        user_id: user.id,
      })
      .select()
      .single();

    if (error || !insertedTask) {
      showToast("Erro ao criar tarefa", "info");
      return;
    }

    const normalizedTask = normalizeTask(insertedTask as Record<string, unknown>);
    if (recurrence.type !== "never") {
      normalizedTask.isRecurring = true;
      normalizedTask.recurrence = recurrence;
    }

    onTaskCreated(normalizedTask);
    showToast(recurrence.type !== "never" ? "Tarefa recorrente criada!" : "Tarefa criada!", "success");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova Tarefa">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label
            style={{
              fontFamily: "DM Sans",
              fontSize: 12,
              color: "var(--muted-foreground)",
              marginBottom: 6,
              display: "block",
            }}
          >
            Título *
          </label>
          <input
            className="fz-input"
            placeholder="O que precisa ser feito?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <div>
          <label
            style={{
              fontFamily: "DM Sans",
              fontSize: 12,
              color: "var(--muted-foreground)",
              marginBottom: 6,
              display: "block",
            }}
          >
            Descrição (opcional)
          </label>
          <textarea
            className="fz-input"
            placeholder="Detalhes..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ resize: "vertical", minHeight: 72 }}
          />
        </div>
        <div>
          <label
            style={{
              fontFamily: "DM Sans",
              fontSize: 12,
              color: "var(--muted-foreground)",
              marginBottom: 6,
              display: "block",
            }}
          >
            Data *
          </label>
          <input
            type="date"
            className="fz-input"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ colorScheme: "dark" }}
          />
        </div>
        <div>
          <label
            style={{
              fontFamily: "DM Sans",
              fontSize: 12,
              color: "var(--muted-foreground)",
              marginBottom: 8,
              display: "block",
            }}
          >
            Prioridade
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  border: `1px solid ${priority === p.value ? p.color : "var(--border)"}`,
                  background:
                    priority === p.value ? `${p.color}15` : "transparent",
                  color:
                    priority === p.value ? p.color : "var(--muted-foreground)",
                  fontFamily: "DM Sans",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <button
            onClick={() => setShowRecurrenceSection(!showRecurrenceSection)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${showRecurrenceSection ? "#3b82f6" : "var(--border)"}`,
              background: showRecurrenceSection ? "rgba(59, 130, 246, 0.1)" : "transparent",
              color: showRecurrenceSection ? "#3b82f6" : "var(--muted-foreground)",
              fontFamily: "DM Sans",
              fontWeight: 500,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {showRecurrenceSection ? "- Ocultar recorrência" : "+ Adicionar recorrência"}
          </button>
        </div>
        {showRecurrenceSection && (
          <RecurrenceSection recurrence={recurrence} onChange={setRecurrence} />
        )}
        <button
          className="fz-btn-primary"
          style={{ padding: "12px", fontSize: 14, marginTop: 4 }}
          onClick={handleSubmit}
        >
          Adicionar Tarefa
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
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "completed" | "overdue"
  >("all");

  // Fetch tasks from server
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleTaskCreated = (task: Task) => {
    setTasks(currentTasks => [task, ...currentTasks]);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTasks(data.map(task => normalizeTask(task as Record<string, unknown>)));
    }
  };

  const updateTaskMutation = {
    mutateAsync: async (data: any) => {
      /* noop */
    },
  };
  const deleteTaskMutation = {
    mutateAsync: async (id: string) => {
      /* noop */
    },
  };

  const selectedTasks = useMemo(() => {
    const tasksForDate = tasks.filter((t: any) => {
      if (!t.date) return false;
      return t.date === selectedDate;
    });

    return tasksForDate.filter((t: any) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (filterStatus === "pending") return !t.completed;
      if (filterStatus === "completed") return t.completed;
      if (filterStatus === "overdue") {
        return !t.completed && t.date < today;
      }
      return true;
    });
  }, [tasks, selectedDate, search, filterStatus, today]);

  const handleToggle = async (task: Task) => {
    const newCompleted = !task.completed;

    const { error } = await supabase
      .from("tasks")
      .update({
        completed: newCompleted,
      })
      .eq("id", task.id);

    if (error) {
      showToast("Erro ao atualizar tarefa", "info");
      return;
    }

    // ganha XP apenas quando completa
    if (newCompleted) {
      await addXP(10);
    }

    fetchTasks();

    showToast(
      newCompleted ? "Tarefa concluída!" : "Tarefa desmarcada",
      "success"
    );
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (!error) {
      fetchTasks();
    }
  };

  const selectedDateFormatted = new Date(
    selectedDate + "T00:00:00"
  ).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div
      style={{
        display: "flex",
        gap: "24px",
        padding: "20px",
        maxWidth: "100%",
        overflowY: "auto",
        paddingBottom: "40px",
        flexWrap: "wrap",
      }}
    >
      {/* Sidebar com Calendário */}
      <div
        style={{
          display: "none",
          width: "280px",
          flexShrink: 0,
        }}
        className="lg:block"
      >
        <MiniCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          tasks={tasks}
        />
      </div>

      {/* Coluna Principal */}
      <div
        style={{
          flex: "1 1 100%",
          minWidth: "0",
        }}
        className="lg:flex-1"
      >
        {/* Mini Calendário em Mobile */}
        <div
          style={{
            display: "block",
            width: "100%",
            marginBottom: "20px",
          }}
          className="lg:hidden"
        >
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            tasks={tasks}
          />
        </div>

        {/* Header */}
        <div style={{ marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--foreground)",
                fontFamily: "Space Grotesk",
              }}
            >
              {selectedDateFormatted}
            </h2>
            <button
              onClick={() => setShowModal(true)}
              className="fz-btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                fontSize: 13,
              }}
            >
              <Plus size={16} /> Nova Tarefa
            </button>
          </div>

          {/* Filtros */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["all", "pending", "completed", "overdue"] as const).map(
              status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: `1px solid ${filterStatus === status ? "var(--primary)" : "var(--border)"}`,
                    background:
                      filterStatus === status
                        ? "var(--primary)15"
                        : "transparent",
                    color:
                      filterStatus === status
                        ? "var(--primary)"
                        : "var(--muted-foreground)",
                    fontFamily: "DM Sans",
                    fontWeight: 500,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {status === "all"
                    ? "Todas"
                    : status === "pending"
                      ? "Pendentes"
                      : status === "completed"
                        ? "Concluídas"
                        : "Atrasadas"}
                </button>
              )
            )}
          </div>

          {/* Search */}
          <div style={{ marginTop: "12px", position: "relative" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted-foreground)",
              }}
            />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="fz-input"
              style={{ paddingLeft: "36px" }}
            />
          </div>
        </div>

        {/* Tasks List */}
        <div>
          {selectedTasks.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--muted-foreground)",
              }}
            >
              <CheckCircle2
                size={48}
                style={{ marginBottom: "12px", opacity: 0.5 }}
              />
              <p style={{ fontSize: 14 }}>
                {search
                  ? "Nenhuma tarefa encontrada"
                  : "Nenhuma tarefa para este dia"}
              </p>
            </div>
          ) : (
            selectedTasks.map((task: any) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={() => handleToggle(task)}
                onDelete={() => handleDelete(task.id)}
                onEditRecurrence={() => {
                  showToast("Editar recorrencia - em desenvolvimento", "info");
                }}
                onSkipOccurrence={() => {
                  showToast("Ocorrencia pulada", "success");
                }}
                onTogglePause={() => {
                  if (task.recurrence?.status === "active") {
                    showToast("Recorrencia pausada", "success");
                  } else {
                    showToast("Recorrencia retomada", "success");
                  }
                }}
                onDeleteOccurrence={() => {
                  showToast("Esta ocorrencia foi excluida", "success");
                }}
                onDeleteRecurrence={() => {
                  showToast("Toda a recorrencia foi excluida", "success");
                }}
              />
            ))
          )}
        </div>
      </div>

      <NewTaskModal
        open={showModal}
        onClose={() => setShowModal(false)}
        defaultDate={selectedDate}
        isPro={isPro}
        tasks={tasks}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  );
}
