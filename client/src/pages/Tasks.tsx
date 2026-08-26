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
 CalendarDays,
 Lock,
} from "lucide-react";

import { RecurrenceSection } from "@/components/RecurrenceSection";
import { RecurrenceIndicator } from "@/components/RecurrenceIndicator";
import { RecurrenceTaskMenu } from "@/components/RecurrenceTaskMenu";
import type { RecurrenceConfig } from "@/types/recurrence";

import { FREE_LIMITS } from "@/config/planLimits";
import { addXP, markCrossTabMutations, broadcastReloadComplete } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { _data, markSelfWrite, notify } from "@/lib/store";
import { useStore, useXPAnimation } from "@/hooks/useStore";
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
 { value: "medium", label: "Média", color: "var(--accent)" },
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

function formatTaskDate(date: string): string {
 const parsedDate = new Date(`${date}T00:00:00`);
 if (Number.isNaN(parsedDate.getTime())) return date;
 return parsedDate.toLocaleDateString("pt-BR", {
 weekday: "long",
 day: "2-digit",
 month: "long",
 year: "numeric",
 });
}

function formatCreatedAt(date: string): string {
 const parsedDate = new Date(date);
 if (Number.isNaN(parsedDate.getTime())) return "Data de criação indisponível";
 return `Criada em ${parsedDate.toLocaleDateString("pt-BR", {
 day: "2-digit",
 month: "short",
 year: "numeric",
 })}`;
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
 <div className="ledger-paper p-5"><div className="flex items-center justify-between mb-4"><button onClick={prevMonth} className="ledger-btn ledger-btn--ghost p-1.5"><ChevronLeft size={16} className="text-muted-foreground" /></button><h3 className="font-bold text-base text-foreground font-space">
 {MONTHS[viewMonth]} {viewYear}
 </h3><button onClick={nextMonth} className="ledger-btn ledger-btn--ghost p-1.5"><ChevronRight size={16} className="text-muted-foreground" /></button></div><div className="grid grid-cols-7 gap-1 mb-2">
 {WEEKDAYS.map(d => (
 <div key={d} className="text-center font-semibold text-[11px] text-muted-foreground py-1 font-space uppercase tracking-wider">
 {d}
 </div>
 ))}
 </div><div className="grid grid-cols-7 gap-1">
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
 ><span className={`text-[13px] font-space ${isToday ? "font-bold" : "font-medium"}`}>
 {day}
 </span>
 {hasTasks && (
 <div className={`w-1 h-1 rounded-full ${allCompleted ? "bg-emerald-500" : "bg-primary"}`} />
 )}
 </button>
 );
 })}
 </div><div className="flex gap-4 mt-4 pt-4 border-t border-border"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary" /><span className="text-[11px] text-muted-foreground font-medium">Com tarefas</span></div><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[11px] text-muted-foreground font-medium">Concluídas</span></div></div></div>
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
 : "var(--accent)";

 return (
 <div
 onClick={onEdit}
 className="flex items-start gap-3 p-3.5 bg-[var(--ledger-paper-bg)] rounded-md border border-[var(--ledger-paper-border)] border-l-[3px] mb-2 transition-all hover:border-[#3b2a66] cursor-pointer"
 style={{ borderLeftColor: priorityColor }}
 ><button
 onClick={(e) => {
 e.stopPropagation();
 onToggle();
 }}
 className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
 task.completed ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-transparent"
 }`}
 >
 {task.completed && <Check size={14} className="text-emerald-500" />}
 </button><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><div className={`text-[14px] font-medium truncate ${
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
 </div><div className="flex gap-1 items-center self-center"><button
 onClick={(e) => {
 e.stopPropagation();
 onDelete();
 }}
 className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
 ><Trash2 size={16} /></button></div></div>
 );
}

type HistoryFilter = "all" | "pending" | "completed";

function TaskHistoryModal({
 open,
 onClose,
 tasks,
 today,
 onToggle,
 onSelectDate,
}: {
 open: boolean;
 onClose: () => void;
 tasks: Task[];
 today: string;
 onToggle: (task: Task) => void;
 onSelectDate: (date: string) => void;
}) {
 const [search, setSearch] = useState("");
 const [filter, setFilter] = useState<HistoryFilter>("all");

 const historyTasks = useMemo(() => tasks.filter(task => task.date < today), [tasks, today]);

 const groupedTasks = useMemo(() => {
 const normalizedSearch = search.trim().toLowerCase();
 const filteredTasks = historyTasks
 .filter(task => {
 if (normalizedSearch && !`${task.title} ${task.description || ""}`.toLowerCase().includes(normalizedSearch)) {
 return false;
 }
 if (filter === "pending") return !task.completed;
 if (filter === "completed") return task.completed;
 return true;
 })
 .sort((a, b) => {
 const dateComparison = b.date.localeCompare(a.date);
 if (dateComparison !== 0) return dateComparison;
 return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
 });

 const groups = new Map<string, Task[]>();
 filteredTasks.forEach(task => {
 const currentGroup = groups.get(task.date) || [];
 currentGroup.push(task);
 groups.set(task.date, currentGroup);
 });
 return Array.from(groups.entries());
 }, [historyTasks, search, filter]);

 const completedCount = historyTasks.filter(task => task.completed).length;
 const pendingCount = historyTasks.length - completedCount;

 return (
 <Modal open={open} onClose={onClose} title="Histórico de tarefas" maxWidth="720px">
 <div className="flex flex-col gap-4">
 <div className="grid grid-cols-3 gap-2">
 <div className="rounded-md border border-[var(--ledger-paper-border)] bg-emerald-500/10 p-3">
 <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Concluídas</div>
 <div className="mt-1 text-xl font-bold text-foreground font-space">{completedCount}</div>
 </div>
 <div className="rounded-md border border-[var(--ledger-paper-border)] bg-amber-500/10 p-3">
 <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pendentes</div>
 <div className="mt-1 text-xl font-bold text-foreground font-space">{pendingCount}</div>
 </div>
 <div className="rounded-md border border-[var(--ledger-paper-border)] bg-[var(--ledger-paper-bg)] p-3">
 <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total</div>
 <div className="mt-1 text-xl font-bold text-foreground font-space">{tasks.length}</div>
 </div>
 </div>

 <div className="relative">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <input
 type="text"
 placeholder="Buscar no histórico..."
 value={search}
 onChange={event => setSearch(event.target.value)}
 className="ledger-input w-full pl-10"
 />
 </div>

 <div className="flex gap-2 flex-wrap">
 {(["all", "pending", "completed"] as const).map(status => (
 <button
 key={status}
 onClick={() => setFilter(status)}
 className={`ledger-stamp text-[12px] font-bold ${filter === status ? "ledger-stamp--violet" : "ledger-stamp--ink"}`}
 >
 {status === "all" ? "Todas" : status === "pending" ? "Pendentes" : "Concluídas"}
 </button>
 ))}
 </div>

 <div className="max-h-[55vh] overflow-y-auto pr-1">
 {groupedTasks.length === 0 ? (
 <div className="rounded-md border-2 border-dashed border-[var(--ledger-paper-border)] py-12 text-center">
 <History size={28} className="mx-auto mb-3 text-muted-foreground/50" />
 <p className="text-sm font-semibold text-foreground">Nenhum registro encontrado</p>
 <p className="mt-1 text-xs text-muted-foreground">Tente ajustar a busca ou o filtro para ver outras tarefas.</p>
 </div>
 ) : (
 <div className="flex flex-col gap-4">
 {groupedTasks.map(([date, dateTasks]) => {
 const completedOnDate = dateTasks.filter(task => task.completed).length;
 return (
 <section key={date} className="overflow-hidden rounded-md border border-[var(--ledger-paper-border)] bg-[var(--ledger-paper-bg)]">
 <div className="flex items-center justify-between gap-3 border-b border-[var(--ledger-paper-border)] px-4 py-3">
 <button
 onClick={() => {
 onSelectDate(date);
 onClose();
 }}
 className="flex min-w-0 items-center gap-3 text-left transition-opacity hover:opacity-80"
 title="Abrir este dia na lista de tarefas"
 >
 <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-[var(--primary)]/10">
 <CalendarDays size={17} className="text-[var(--primary)]" />
 </div>
 <div className="min-w-0">
 <h3 className="truncate text-[13px] font-bold capitalize text-foreground font-space">{formatTaskDate(date)}</h3>
 <p className="mt-0.5 text-[11px] text-muted-foreground">
 {dateTasks.length} {dateTasks.length === 1 ? "tarefa" : "tarefas"} · {completedOnDate} concluída{completedOnDate === 1 ? "" : "s"}
 </p>
 </div>
 </button>
 <span className="hidden flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">{date}</span>
 </div>

 <div className="divide-y divide-[var(--ledger-paper-border)]">
 {dateTasks.map(task => (
 <div key={task.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
 <button
 onClick={() => onToggle(task)}
 aria-label={task.completed ? `Desmarcar ${task.title}` : `Marcar ${task.title} como concluída`}
 className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all active:scale-95 ${task.completed ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-transparent hover:border-[var(--primary)]"}`}
 >
 {task.completed && <Check size={14} className="text-emerald-500" />}
 </button>
 <div className="min-w-0 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <span className={`text-[13px] font-semibold ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</span>
 {task.isRecurring && task.recurrence && <RecurrenceIndicator type={task.recurrence.type} size="sm" />}
 <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${task.completed ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
 {task.completed ? "Concluída" : "Pendente"}
 </span>
 </div>
 {task.description && <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{task.description}</p>}
 <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
 <span>{formatCreatedAt(task.createdAt)}</span>
 <span>Prioridade: {PRIORITIES.find(priority => priority.value === task.priority)?.label || "Média"}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </section>
 );
 })}
 </div>
 )}
 </div>

 <p className="text-[11px] text-muted-foreground">O histórico mostra somente tarefas de dias anteriores a hoje. Clique no dia para abrir a lista correspondente ou use o botão ao lado da tarefa para marcar e desmarcar sem sair do histórico.</p>
 </div>
 </Modal>
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
 onOpenUpgrade,
}: {
 open: boolean;
 onClose: () => void;
 task?: Task | null;
 defaultDate: string;
 isPro: boolean;
 tasks: Task[];
 onTaskSaved: () => void;
 onOpenUpgrade?: () => void;
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
 if (!task && !isPro && recurrence.type !== "never") {
 showToast("Tarefas recorrentes são exclusivas do plano Pro", "info");
 onOpenUpgrade?.();
 return;
 }
 if (!task && !isPro && countTasksCreatedThisWeek(tasks) >= FREE_LIMITS.tasksPerWeek) {
 showToast(`Plano grátis permite apenas ${FREE_LIMITS.tasksPerWeek} tarefas por semana`, "info");
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
 <Modal open={open} onClose={onClose} title={task ? "Editar Tarefa" : "Nova Tarefa"}><div className="flex flex-col gap-5">
 {/* Tabs for Recurring Task */}
 {task?.isRecurring && (
 <div className="flex gap-2 mb-1"><button
 onClick={() => setActiveTab("edit")}
 className={`ledger-stamp flex-1 justify-center transition-all ${
 activeTab === "edit" ? "ledger-stamp--violet" : "ledger-stamp--ink"
 }`}
 ><Info size={12} /> Detalhes
 </button><button
 onClick={() => setActiveTab("recurrence")}
 className={`ledger-stamp flex-1 justify-center transition-all ${
 activeTab === "recurrence" ? "ledger-stamp--violet" : "ledger-stamp--ink"
 }`}
 ><History size={12} /> Recorrência
 </button></div>
 )}

 {activeTab === "edit" ? (
 <><div><div className="ledger-marginalia mb-2">Título *</div><input
 className="ledger-input"
 placeholder="O que precisa ser feito?"
 value={title}
 onChange={e => setTitle(e.target.value)}
 /></div><div><div className="ledger-marginalia mb-2">Descrição (opcional)</div><textarea
 className="ledger-input min-h-[80px] resize-none"
 placeholder="Detalhes..."
 value={description}
 onChange={e => setDescription(e.target.value)}
 /></div><div className="grid grid-cols-2 gap-4"><div><div className="ledger-marginalia mb-2">Data *</div><input
 type="date"
 className="ledger-input"
 value={date}
 onChange={e => setDate(e.target.value)}
 style={{ colorScheme: "dark" }}
 /></div><div><div className="ledger-marginalia mb-2">Prioridade</div><div className="flex gap-2 flex-wrap">
 {PRIORITIES.map(p => (
 <button
 key={p.value}
 onClick={() => setPriority(p.value)}
 className={`ledger-stamp flex-1 justify-center transition-all ${priority === p.value ? "" : "ledger-stamp--ink"}`}
 style={priority === p.value ? { borderColor: `${p.color}80`, color: p.color, background: `${p.color}15` } : undefined}
 >
 {p.label}
 </button>
 ))}
 </div></div></div>

 {!task && (
 <div className="mt-1">{!isPro ? (
 <button
 onClick={() => {
 showToast("Tarefas recorrentes são exclusivas do plano Pro", "info");
 onOpenUpgrade?.();
 }}
 className="ledger-btn ledger-btn--ghost w-full relative overflow-hidden"
 ><RotateCw size={14} className="opacity-60" />
 Adicionar recorrência
 <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2" />
 </button>
 ) : (
 <button
 onClick={() => setShowRecurrenceSection(!showRecurrenceSection)}
 className="ledger-btn ledger-btn--ghost w-full"
 ><RotateCw size={14} />
 {showRecurrenceSection ? "Remover recorrência" : "Adicionar recorrência"}
 </button>
 )}
 {showRecurrenceSection && (
 <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300"><RecurrenceSection recurrence={recurrence} onChange={setRecurrence} /></div>
 )}
 </div>
 )}
 </>
 ) : (
 <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-2 duration-300"><RecurrenceSection recurrence={recurrence} onChange={setRecurrence} /><div className="p-4 bg-[var(--ledger-paper-bg)] rounded-md border border-[var(--ledger-paper-border)]"><div className="flex items-center gap-2 mb-4"><History size={16} className="text-[var(--primary)]" /><span className="text-[14px] font-bold text-foreground font-space">Histórico Recente</span></div><div className="flex flex-col gap-2"><div className="flex items-center justify-between p-2.5 bg-[var(--ledger-paper-bg)] border border-[var(--ledger-paper-border)] rounded-md"><div className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500" /><span className="text-[12px] text-foreground font-medium">15 Jul 2026</span></div><span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Concluída</span></div><div className="flex items-center justify-between p-2.5 bg-[var(--ledger-paper-bg)] border border-[var(--ledger-paper-border)] rounded-md opacity-60"><div className="flex items-center gap-2"><AlertCircle size={14} className="text-amber-500" /><span className="text-[12px] text-foreground font-medium">14 Jul 2026</span></div><span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Atrasada</span></div></div></div></div>
 )}

 <button
 className="ledger-btn ledger-btn--violet w-full mt-2"
 onClick={handleSubmit}
 >
 {task ? "Salvar Alterações" : "Criar Tarefa"}
 </button></div></Modal>
 );
}

export default function Tasks({ isPro, onOpenUpgrade }: { isPro: boolean; onOpenUpgrade?: () => void }) {
 const { showXP } = useXPAnimation();
 const sharedTasks = useStore().tasks;
 const today = getTodayString();
 const [selectedDate, setSelectedDate] = useState(today);
 const [showModal, setShowModal] = useState(false);
 const [showHistory, setShowHistory] = useState(false);
 const [editingTask, setEditingTask] = useState<Task | null>(null);
 const [search, setSearch] = useState("");
 const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed" | "overdue">("all");
 const [tasks, setTasks] = useState<Task[]>([]);
 const [generating, setGenerating] = useState(false);

 const fetchTasks = useCallback(async () => {
 console.log("[fetchTasks] Iniciando busca de tarefas...");
 const t0 = performance.now();

 const { data: userData } = await supabase.auth.getUser();
 if (!userData.user) {
 console.log("[fetchTasks] Usuário não autenticado, abortando.");
 return;
 }

 const t1 = performance.now();
 console.log(`[fetchTasks] Auth resolvida em ${(t1 - t0).toFixed(0)}ms. Buscando tarefas...`);

 const { data, error } = await supabase
 .from("tasks")
 .select("*")
 .eq("user_id", userData.user.id)
 .order("created_at", { ascending: false });

 const t2 = performance.now();
 console.log(`[fetchTasks] Query retornou em ${(t2 - t1).toFixed(0)}ms. Total: ${(data || []).length} tarefas. Erro:`, error);

 if (!error && data) {
 const normalized = data.map(task => normalizeTask(task as Record<string, unknown>));
 setTasks(normalized);

 // Reflect the fresh list into the shared store observed by Today
 _data.tasks = normalized.map(task => {
 const shared = _data.tasks.find(t => t.id === task.id);
 return {
 id: task.id,
 title: task.title,
 description: task.description,
 date: task.date,
 completed: task.completed,
 priority: task.priority,
 category: task.category,
 createdAt: task.createdAt,
 isRecurring: task.isRecurring,
 recurrence: task.recurrence,
 };
 });
 notify();
 }

 console.log(`[fetchTasks] Concluído em ${(performance.now() - t0).toFixed(0)}ms total`);
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
 // IMPORTANTE: gerar ocorrências assíncronamente SEM bloquear a UI
 // e buscar tarefas localmente (que já inclui ocorrências existentes)
 const init = async () => {
 console.log("[Tasks] useEffect init - carregando tarefas locais...");
 // Primeiro carrega as tarefas que já existem
 await fetchTasks();

 console.log("[Tasks] useEffect init - gerando ocorrências recorrentes em background...");
 // Depois gera ocorrências faltantes em background (fire-and-forget)
 // Não bloqueia a UI, não espera o resultado
 const generatePromise = (async () => {
 const t0 = performance.now();
 setGenerating(true);
 try {
 const generated = await generateAllRecurringOccurrences(today);
 const elapsed = performance.now() - t0;
 console.log(`[Tasks] Ocorrências geradas: ${generated} em ${elapsed.toFixed(0)}ms`);
 if (generated > 0) {
 // Se gerou novas ocorrências, recarrega as tarefas
 await fetchTasks();
 }
 } catch (err) {
 console.error("[Tasks] Erro ao gerar ocorrências:", err);
 } finally {
 setGenerating(false);
 }
 })();

 // Não fazemos await aqui para não bloquear a renderização
 void generatePromise;
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

 const handleToggle = (task: Task) => {
 const newCompleted = !task.completed;
 setTasks(previous =>
 previous.map(item =>
 item.id === task.id ? { ...item, completed: newCompleted } : item
 )
 );

 // Optimistically update the shared store observed by Today
 const previousSharedCompleted = _data.tasks.find(t => t.id === task.id)?.completed;
 _data.tasks = _data.tasks.map(t =>
 t.id === task.id ? { ...t, completed: newCompleted } : t
 );
 markSelfWrite("tasks", task.id);
 notify();

 showToast(newCompleted ? "Tarefa concluída!" : "Tarefa desmarcada", "success");

 if (newCompleted) {
 void addXP(10);
 }

 void (async () => {
 const { error } = await supabase
 .from("tasks")
 .update({ completed: newCompleted })
 .eq("id", task.id);

 if (error) {
 setTasks(previous =>
 previous.map(item =>
 item.id === task.id ? { ...item, completed: task.completed } : item
 )
 );
 // Rollback the shared store as well
 _data.tasks = _data.tasks.map(t =>
 t.id === task.id ? { ...t, completed: previousSharedCompleted ?? task.completed } : t
 );
 notify();
 showToast("Não foi possível atualizar a tarefa", "info");
 } else {
 markCrossTabMutations(["tasks"]);
 }
 })();
 };

 // Estado para modal de exclusão de recorrência
 const [deleteRecurringTask, setDeleteRecurringTask] = useState<Task | null>(null);
 const [deletingAll, setDeletingAll] = useState(false);

 // Quando clica em excluir uma tarefa recorrente (mãe ou ocorrência) → abre modal
 const handleDelete = (id: string) => {
 const task = tasks.find(t => t.id === id);

 if (task?.isRecurring) {
 // Qualquer tarefa recorrente (mãe ou filha) → abrir modal de escolha
 setDeleteRecurringTask(task);
 return;
 }

 if (!task) return;
 setTasks(previous => previous.filter(item => item.id !== id));

 // Remove from the shared store observed by Today
 const previousSharedTasks = [..._data.tasks];
 _data.tasks = _data.tasks.filter(t => t.id !== id);
 markSelfWrite("tasks", id);
 notify();

 void (async () => {
 const { error } = await supabase.from("tasks").delete().eq("id", id);
 if (error) {
 setTasks(previous => [task, ...previous]);
 // Rollback the shared store as well
 _data.tasks = previousSharedTasks;
 notify();
 showToast("Não foi possível remover a tarefa", "info");
 }
 })();
 };

 const handleDeleteThisOccurrence = async () => {
 if (!deleteRecurringTask) return;

 // Se é uma tarefa filha (tem parentId), apenas deletar a ocorrência
 if (deleteRecurringTask.parentId) {
 const { error } = await supabase.from("tasks").delete().eq("id", deleteRecurringTask.id);
 if (!error) {
 // Adicionar a data às exceções da tarefa-mãe
 const parentTask = tasks.find(t => t.id === deleteRecurringTask.parentId);
 if (parentTask && parentTask.recurrence) {
 const updatedRecurrence = {
 ...parentTask.recurrence,
 exceptions: [...(parentTask.recurrence.exceptions || []), deleteRecurringTask.date]
 };
 await supabase
 .from("tasks")
 .update({ recurrence: updatedRecurrence })
 .eq("id", deleteRecurringTask.parentId);
 markCrossTabMutations(["tasks"]);
 }
 fetchTasks();
 }

 setDeleteRecurringTask(null);
 showToast("Ocorrência excluída deste dia", "success");
 return;
 }

 // Se é a tarefa-mãe (parentId é null) e é recorrente, registrar a data nas exceções
 if (deleteRecurringTask.isRecurring && deleteRecurringTask.recurrence) {
 const updatedRecurrence = {
 ...deleteRecurringTask.recurrence,
 exceptions: [...(deleteRecurringTask.recurrence.exceptions || []), deleteRecurringTask.date]
 };
 const { error } = await supabase
 .from("tasks")
 .update({ recurrence: updatedRecurrence })
 .eq("id", deleteRecurringTask.id);
 if (!error) {
 markCrossTabMutations(["tasks"]);
 fetchTasks();
 }
 setDeleteRecurringTask(null);
 showToast("Ocorrência excluída deste dia", "success");
 return;
 }

 // Fallback: deletar tarefa normal
 const { error } = await supabase.from("tasks").delete().eq("id", deleteRecurringTask.id);
 if (!error) fetchTasks();
 setDeleteRecurringTask(null);
 showToast("Ocorrência excluída deste dia", "success");
 };

 // Any task deletion/update below also needs the shared store updated.
 // fetchTasks() already reflects the fresh list into the shared store, so
 // these paths go through it. The cross-tab BroadcastChannel then lets
 // Today in OTHER tabs refresh as well.
 const handleDeleteAllOccurrences = async () => {
 if (!deleteRecurringTask) return;
 setDeletingAll(true);
 
 // Encontrar a tarefa-mãe (aquela com parentId === null)
 const parentTask = deleteRecurringTask.parentId
 ? tasks.find(t => t.id === deleteRecurringTask.parentId)
 : deleteRecurringTask.isRecurring ? deleteRecurringTask : null;
 
 if (parentTask) {
 // Deletar a tarefa-mãe → cascade deleta todas as ocorrências filhas
 const { error } = await supabase.from("tasks").delete().eq("id", parentTask.id);
 if (!error) {
 _data.tasks = _data.tasks.filter(t => {
 const withParent = t as Task & { parentId?: string };
 return t.id !== parentTask.id && withParent.parentId !== parentTask.id;
 });
 markSelfWrite("tasks", parentTask.id);
 notify();
 fetchTasks();
 }
 } else {
 // Fallback: deletar apenas esta tarefa (não recorrente)
 const { error } = await supabase.from("tasks").delete().eq("id", deleteRecurringTask.id);
 if (!error) {
 _data.tasks = _data.tasks.filter(t => t.id !== deleteRecurringTask.id);
 markSelfWrite("tasks", deleteRecurringTask.id);
 notify();
 fetchTasks();
 }
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
 <div className="hidden lg:block w-[280px] flex-shrink-0"><MiniCalendar selectedDate={selectedDate} onSelectDate={handleSelectDate} tasks={tasks} /></div>

 {/* Coluna Principal */}
 <div className="flex-1 min-w-0">
 {/* Mini Calendário em Mobile */}
 <div className="lg:hidden w-full mb-5"><MiniCalendar selectedDate={selectedDate} onSelectDate={handleSelectDate} tasks={tasks} /></div>

 {/* Header — folha solta de caderno */}
 <div className="notebook-sheet notebook-sheet--margined max-md:pl-4 mb-6">
 <div className="flex justify-between items-center gap-3 w-full min-w-0 mb-4"><h2 className="text-base sm:text-lg lg:text-xl font-bold text-foreground font-space capitalize min-w-0 truncate flex-1">
 {selectedDateFormatted}
 </h2><div className="flex items-center gap-2 flex-shrink-0"><button
 onClick={() => setShowHistory(true)}
 className="ledger-btn ledger-btn--ghost flex items-center gap-1.5 text-[13px] font-bold whitespace-nowrap"
 aria-label="Abrir histórico de tarefas"
 ><History size={16} /><span className="hidden min-[460px]:inline">Histórico</span>
 </button><button
 onClick={() => {
 setEditingTask(null);
 setShowModal(true);
 }}
 className="ledger-btn ledger-btn--violet flex items-center gap-1.5 text-[13px] font-bold whitespace-nowrap"
 ><Plus size={16} /><span className="hidden min-[400px]:inline">Nova Tarefa</span>
 </button></div></div>

 {/* Filtros */}
 <div className="flex gap-2 flex-wrap mb-4">
 {(["all", "pending", "completed", "overdue"] as const).map(status => (
 <button
 key={status}
 onClick={() => setFilterStatus(status)}
 className={`ledger-stamp text-[12px] font-bold ${filterStatus === status ? "ledger-stamp--violet" : "ledger-stamp--ink"}`}
 >
 {status === "all" ? "Todas" : status === "pending" ? "Pendentes" : status === "completed" ? "Concluídas" : "Atrasadas"}
 </button>
 ))}
 </div>

 {/* Search */}
 <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input
 type="text"
 placeholder="Buscar tarefas..."
 value={search}
 onChange={e => setSearch(e.target.value)}
 className="ledger-input w-full pl-10"
 /></div></div>

 {/* Tasks List */}
 <div className="space-y-1">
 {generating && (
 <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-[13px]"><RotateCw size={14} className="animate-spin" />
 Gerando ocorrências recorrentes...
 </div>
 )}
 {selectedTasks.length === 0 && !generating ? (
 <div className="text-center py-14 bg-[var(--ledger-paper-bg)] rounded-md border-2 border-dashed border-[var(--ledger-paper-border)]"><div className="w-16 h-16 bg-emerald-500/10 rounded-md flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} className="text-emerald-500/40" /></div><p className="text-[var(--ink)] text-[15px] font-semibold mb-1">
 {search ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa para este dia"}
 </p><p className="text-[var(--ink-muted)] text-xs mb-4">
 {search
 ? "Tente buscar por outro termo."
 : "Adicione uma tarefa para começar a evoluir. Cada tarefa concluída te dá XP!"
 }
 </p>
 {!search && (
 <button
 onClick={() => { setShowModal(true); setEditingTask(null); }}
 className="px-5 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all"
 >
 + Adicionar tarefa
 </button>
 )}
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
 </div></div><TaskModal
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
 onOpenUpgrade={onOpenUpgrade}
 />

 <TaskHistoryModal
 open={showHistory}
 onClose={() => setShowHistory(false)}
 tasks={tasks}
 today={today}
 onToggle={handleToggle}
 onSelectDate={handleSelectDate}
 />

 {/* Modal de exclusão de tarefa recorrente */}
 <Modal
 open={!!deleteRecurringTask}
 onClose={() => {
 setDeleteRecurringTask(null);
 setDeletingAll(false);
 }}
 title="Excluir tarefa recorrente"
 ><div className="flex flex-col"><p className="text-[13px] text-muted-foreground mb-3" style={{ color: 'var(--muted-foreground)' }}>
 Como excluir <span className="font-medium" style={{ color: 'var(--foreground)' }}>{deleteRecurringTask?.title}</span>?
 </p>

 {/* Container unificado estilo Raycast/Linear */}
 <div className="rounded-md border border-[var(--ledger-paper-border)] overflow-hidden">
 {/* Opção: Excluir de todos os dias */}
 <button
 onClick={() => {
 handleDeleteAllOccurrences();
 }}
 disabled={deletingAll}
 className="w-full flex items-center gap-3 py-3.5 px-4 hover:bg-[var(--muted)] transition-colors text-left disabled:opacity-60"
 ><Trash2 size={16} className="flex-shrink-0" style={{ color: '#ef4444' }} /><div className="flex-1 min-w-0"><div className="text-[13px] font-semibold" style={{ color: '#ef4444' }}>
 {deletingAll ? "Excluindo..." : "Excluir de todos os dias"}
 </div><div className="text-[12px] mt-0.5" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
 Remove a recorrência e as ocorrências já criadas
 </div></div></button>

 {/* Divisor */}
 <div className="ledger-rule mx-4" />

 {/* Opção: Excluir apenas esta ocorrência */}
 <button
 onClick={() => {
 handleDeleteThisOccurrence();
 }}
 disabled={deletingAll}
 className="w-full flex items-center gap-3 py-3.5 px-4 hover:bg-[var(--muted)] transition-colors text-left disabled:opacity-60"
 ><CalendarDays size={16} className="flex-shrink-0" style={{ color: 'var(--muted-foreground)' }} /><div className="flex-1 min-w-0"><div className="text-[13px] font-semibold" style={{ color: 'var(--foreground)' }}>
 {deletingAll ? "Excluindo..." : "Excluir apenas esta ocorrência"}
 </div><div className="text-[12px] mt-0.5" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
 Mantém a recorrência nos demais dias
 </div></div></button></div>

 {/* Botão Cancelar */}
 <button
 onClick={() => {
 setDeleteRecurringTask(null);
 setDeletingAll(false);
 }}
 disabled={deletingAll}
 className="ledger-btn ledger-btn--ghost w-full mt-3 disabled:opacity-60"
 >
 Cancelar
 </button></div></Modal></div>
 );
}
