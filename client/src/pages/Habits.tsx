// =========================
// IMPORTS
// =========================

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";

import {
 Plus,
 Trash2,
 ChevronLeft,
 ChevronRight,
 TrendingUp,
 Search,
 Download,
 Flame,
 LayoutGrid,
 Table2,
} from "lucide-react";

import { addXP } from "@/lib/store";
import { notifyError } from "@/lib/notifications";

import {
 AreaChart,
 Area,
 BarChart,
 Bar,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
} from "recharts";

import { useXPAnimation } from "@/hooks/useStore";
import { useIsMobile } from "@/hooks/useMobile";

import {
 getHabitMonthProgress,
 getHabitMonthRate,
 getHabitStreak,
 getDailyHabitData,
 getWeeklyHabitData,
 getTodayString,
} from "@/lib/store";

import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/FlowToast";

import { FREE_LIMITS } from "@/config/planLimits";
import type { Habit } from "@/lib/store";

import { supabase } from "@/lib/supabase";
import { syncHabitToGoals } from "@/lib/syncHabitGoals";

// =========================
// CONSTANTS
// =========================

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

const EMOJIS = [
 "🏃",
 "📚",
 " ",
 "🧘",
 "💧",
 "🥗",
 "😴",
 " ",
 "🎵",
 "🧹",
 "💊",
 "🌿",
 "🧠",
 " ",
 " ",
];

const COLORS = [
 "#F59E0B",
 "#A855F7",
 "#10B981",
 "#8B5CF6",
 "#EF4444",
 "#EC4899",
 "#06B6D4",
];

const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

// =========================
// TOOLTIP
// =========================

const CustomTooltip = ({ active, payload, label }: any) => {
 if (active && payload && payload.length) {
 return (
 <div
 style={{
 background: "#1A1A24",
 border: "1px solid var(--border)",
 borderRadius: 10,
 padding: "10px 14px",
 }}
 ><p
 style={{
 color: "var(--muted-foreground)",
 fontSize: 12,
 marginBottom: 4,
 }}
 >
 {label}
 </p>

 {payload.map((p: any, i: number) => (
 <p
 key={i}
 style={{
 color: p.color || "#F59E0B",
 fontSize: 13,
 fontWeight: 600,
 }}
 >
 {p.value} hábitos
 </p>
 ))}
 </div>
 );
 }

 return null;
};

// =========================
// HABIT CARD — faixa de atividade do mês com rolagem horizontal
// =========================

function getMonthDaysRail(year: number, month: number, daysInMonth: number): {
 day: number;
 dateStr: string;
 weekday: number;
}[] {
 return Array.from({ length: daysInMonth }, (_, index) => {
 const day = index + 1;
 return {
 day,
 dateStr: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
 weekday: new Date(year, month, day).getDay(),
 };
 });
}

function HabitRow({
 habit,
 year,
 month,
 daysInMonth,
 onHabitUpdated,
 onHabitDeleted,
 onHabitRestored,
}: {
 habit: any;
 year: number;
 month: number;
 daysInMonth: number;
 onHabitUpdated: (habitId: string, completedDates: string[]) => void;
 onHabitDeleted: (habitId: string) => void;
 onHabitRestored: (habit: any) => void;
}) {
 const { showXP } = useXPAnimation();
 const [animatingDate, setAnimatingDate] = useState<string | null>(null);
 const today = getTodayString();
 const progress = getHabitMonthProgress(habit, year, month);
 const streak = getHabitStreak(habit);
 const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

 const handleToggle = (
 day: number,
 event: React.MouseEvent<HTMLButtonElement>
 ) => {
 const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
 const previousDates = habit.completedDates || [];
 const wasCompleted = previousDates.includes(dateStr);
 const updatedDates = wasCompleted
 ? previousDates.filter((date: string) => date !== dateStr)
 : [...previousDates, dateStr];

 onHabitUpdated(habit.id, updatedDates);

 if (!wasCompleted) {
 void addXP(5);
 showXP(5, event.clientX, event.clientY);
 setAnimatingDate(dateStr);
 window.setTimeout(() => setAnimatingDate(null), 260);
 }

 void (async () => {
 await syncHabitToGoals({ id: habit.id, completed_dates: updatedDates });
 const { error } = await supabase
 .from("habits")
 .update({ completed_dates: updatedDates })
 .eq("id", habit.id);
 if (error) {
 onHabitUpdated(habit.id, previousDates);
 showToast("Erro ao atualizar", "info", "❌");
 }
 })();
 };

 const handleDelete = () => {
 onHabitDeleted(habit.id);
 showToast("Hábito removido", "info", "🗑 ");

 void (async () => {
 const { error } = await supabase.from("habits").delete().eq("id", habit.id);
 if (error) {
 onHabitRestored(habit);
 showToast("Erro ao remover", "info", "❌");
 }
 })();
 };

 return (
 <div className="habit-row"><div className="habit-row-info"><div className="habit-row-title"><span style={{ fontSize: 16 }}>{habit.emoji}</span><span
 style={{
 fontWeight: 500,
 fontSize: 12,
 color: "var(--foreground)",
 }}
 >
 {habit.title}
 </span><button
 onClick={handleDelete}
 className="habit-row-delete"
 aria-label={`Remover hábito ${habit.title}`}
 type="button"
 ><Trash2 size={14} /></button></div><div className="habit-row-meta"><span style={{ color: habit.color, fontWeight: 600 }}>
 {progress}/{daysInMonth}
 </span><span style={{ color: "var(--muted-foreground)" }}>•</span><span style={{ color: "var(--muted-foreground)" }}> {streak}d</span></div></div><div className="habit-row-days">
 {days.map(day => {
 const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
 const isCompleted = habit.completedDates.includes(dateStr);
 const isFuture = dateStr > today;
 const isCurrentDay = dateStr === today;
 const weekDay = WEEK_DAYS[new Date(year, month, day).getDay()];
 const dayLabel = `${habit.title} — ${weekDay} ${day}/${String(month + 1).padStart(2, "0")}`;

 return (
 <button
 key={day}
 type="button"
 onClick={event => !isFuture && handleToggle(day, event)}
 className={`habit-day-button${isCurrentDay ? " current-day" : ""}`}
 aria-label={dayLabel}
 aria-pressed={isCompleted}
 title={dayLabel}
 disabled={isFuture}
 ><div
 className={`habit-day-dot${isCompleted ? " completed" : ""}${
 animatingDate === dateStr ? " animate" : ""
 }`}
 style={{
 background: isCompleted ? habit.color : "var(--border)",
 }}
 /></button>
 );
 })}
 </div></div>
 );
}

function HabitCard({
 habit,
 year,
 month,
 daysInMonth,
 onHabitUpdated,
 onHabitDeleted,
 onHabitRestored,
 addXPAmount,
}: {
 habit: any;
 year: number;
 month: number;
 daysInMonth: number;
 onHabitUpdated: (habitId: string, completedDates: string[]) => void;
 onHabitDeleted: (habitId: string) => void;
 onHabitRestored: (habit: any) => void;
 addXPAmount: (amount: number, x: number, y: number) => void;
}) {
 const [animatingDate, setAnimatingDate] = useState<string | null>(null);

 const today = getTodayString();

 const progress = getHabitMonthProgress(habit, year, month);
 const rate = getHabitMonthRate(habit, year, month);
 const streak = getHabitStreak(habit);
 const activityRail = getMonthDaysRail(year, month, daysInMonth);

 const handleToggle = (
 dateStr: string,
 e: React.MouseEvent<HTMLButtonElement>
 ) => {
 if (dateStr > today) return;
 const previousDates = habit.completedDates || [];
 const wasCompleted = previousDates.includes(dateStr);
 const updatedDates = wasCompleted
 ? previousDates.filter((d: string) => d !== dateStr)
 : [...previousDates, dateStr];
 onHabitUpdated(habit.id, updatedDates);
 if (!wasCompleted) {
 void addXP(5);
 addXPAmount(5, e.clientX, e.clientY);
 setAnimatingDate(dateStr);
 window.setTimeout(() => setAnimatingDate(null), 260);
 }
 void (async () => {
 await syncHabitToGoals({ id: habit.id, completed_dates: updatedDates });
 const { error } = await supabase
 .from("habits")
 .update({ completed_dates: updatedDates })
 .eq("id", habit.id);
 if (error) {
 onHabitUpdated(habit.id, previousDates);
 showToast("Erro ao atualizar", "info", "❌");
 }
 })();
 };

 const handleDelete = () => {
 onHabitDeleted(habit.id);
 showToast("Hábito removido", "info", "🗑 ");

 void (async () => {
 const { error } = await supabase.from("habits").delete().eq("id", habit.id);
 if (error) {
 onHabitRestored(habit);
 showToast("Erro ao remover", "info", "❌");
 }
 })();
 };

 const rateLabel = `${progress}/${daysInMonth}`;
 const activityRailRef = useRef<HTMLDivElement>(null);
 const wheelAnimationFrameRef = useRef<number | null>(null);
 const wheelTargetScrollRef = useRef<number | null>(null);

 useEffect(() => {
 const rail = activityRailRef.current;
 if (!rail) return;

 const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

 const animateWheelScroll = () => {
 const targetScrollLeft = wheelTargetScrollRef.current;
 if (targetScrollLeft === null) {
 wheelAnimationFrameRef.current = null;
 return;
 }

 const distance = targetScrollLeft - rail.scrollLeft;
 if (Math.abs(distance) < 0.5) {
 rail.scrollLeft = targetScrollLeft;
 wheelAnimationFrameRef.current = null;
 return;
 }

 rail.scrollLeft += distance * 0.22;
 wheelAnimationFrameRef.current = requestAnimationFrame(animateWheelScroll);
 };

 const handleActivityWheel = (event: WheelEvent) => {
 // A escuta em captura no window evita que o scroll da página consuma a roda
 // antes da faixa receber o evento. O handler só atua sobre a faixa em hover.
 if (!rail.matches(":hover")) return;

 const rawDelta = event.deltaX !== 0 ? event.deltaX : event.deltaY;
 if (!rawDelta || rail.scrollWidth <= rail.clientWidth) return;

 const delta = event.deltaMode === 1 ? rawDelta * 20 : rawDelta;
 const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
 const currentTarget = wheelTargetScrollRef.current ?? rail.scrollLeft;
 const nextScrollLeft = Math.max(
 0,
 Math.min(maxScrollLeft, currentTarget + delta)
 );

 // Mantém o scroll normal da página ao atingir o início ou o fim da faixa.
 if (nextScrollLeft === currentTarget) return;

 event.preventDefault();
 wheelTargetScrollRef.current = nextScrollLeft;

 if (prefersReducedMotion) {
 rail.scrollLeft = nextScrollLeft;
 return;
 }

 if (wheelAnimationFrameRef.current === null) {
 wheelAnimationFrameRef.current = requestAnimationFrame(animateWheelScroll);
 }
 };

 const syncWheelTarget = () => {
 if (wheelAnimationFrameRef.current === null) {
 wheelTargetScrollRef.current = rail.scrollLeft;
 }
 };

 rail.addEventListener("scroll", syncWheelTarget, { passive: true });
 window.addEventListener("wheel", handleActivityWheel, {
 passive: false,
 capture: true,
 });

 return () => {
 rail.removeEventListener("scroll", syncWheelTarget);
 window.removeEventListener("wheel", handleActivityWheel, { capture: true });
 if (wheelAnimationFrameRef.current !== null) {
 cancelAnimationFrame(wheelAnimationFrameRef.current);
 }
 };
 }, []);

 return (
 <div className="habit-card" style={{ borderColor: "var(--border)" }}><div className="habit-card-header"><div className="habit-card-title-row"><span
 className="habit-card-emoji"
 style={{ background: `${habit.color}1A`, color: habit.color }}
 >
 {habit.emoji}
 </span><div className="habit-card-title-text"><span className="habit-card-name">{habit.title}</span><span className="habit-card-meta"><Flame size={12} style={{ color: "#F59E0B" }} /><span style={{ color: "#F59E0B", fontWeight: 700 }}>{streak}d</span><span className="habit-card-dot">•</span><span style={{ color: habit.color, fontWeight: 700 }}>{rateLabel}</span><span className="habit-card-dot">•</span><span>{rate}% no mês</span></span></div><button
 onClick={handleDelete}
 className="habit-card-delete"
 aria-label={`Remover hábito ${habit.title}`}
 type="button"
 ><Trash2 size={15} /></button></div></div><div className="habit-card-activity" role="group" aria-label={`Atividade de ${habit.title} em ${MONTHS[month]}`}><div className="habit-card-activity-label"><span>Atividade no mês</span><span>Passe o mouse e use a roda para ver os dias</span></div><div
 ref={activityRailRef}
 className="habit-card-activity-rail"
 >
 {activityRail.map(cell => {
 const isCompleted = habit.completedDates.includes(cell.dateStr);
 const isFuture = cell.dateStr > today;
 const isCurrentDay = cell.dateStr === today;
 const dayLabel = `${habit.title} — ${WEEK_DAYS[cell.weekday]}, dia ${cell.day}`;

 return (
 <button
 key={cell.dateStr}
 type="button"
 onClick={e => !isFuture && handleToggle(cell.dateStr, e)}
 className={`habit-activity-cell${isCurrentDay ? " current" : ""}`}
 aria-label={dayLabel}
 aria-pressed={isCompleted}
 disabled={isFuture}
 ><span className="habit-activity-weekday">{WEEK_DAYS[cell.weekday]}</span><span className="habit-activity-day">{cell.day}</span><span
 className={`habit-activity-dot${isCompleted ? " completed" : ""}${
 animatingDate === cell.dateStr ? " animate" : ""
 }`}
 style={{ background: isCompleted ? habit.color : "var(--border)" }}
 /></button>
 );
 })}
 </div></div><div className="habit-card-progress-track"><div
 className="habit-card-progress-fill"
 style={{
 width: `${daysInMonth > 0 ? Math.round((progress / daysInMonth) * 100) : 0}%`,
 background: habit.color,
 }}
 /></div></div>
 );
}

// =========================
// NEW HABIT MODAL
// =========================

function NewHabitModal({
 open,
 onClose,
 reloadHabits,
 isPro,
 habits,
}: {
 open: boolean;
 onClose: () => void;
 reloadHabits: () => void;
 isPro: boolean;
 habits: any[];
}) {
 const [title, setTitle] = useState("");

 const [emoji, setEmoji] = useState("🏃");

 const [customColor, setCustomColor] = useState("#F59E0B");

 const [targetDays, setTargetDays] = useState(30);

 const handleSubmit = async () => {
 if (!title.trim()) return;

 if (!isPro && habits.length >= FREE_LIMITS.habits) {
 showToast("Plano grátis permite apenas 3 hábitos", "info");
 return;
 }

 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) {
 showToast("Usuário não encontrado", "info", "❌");
 return;
 }

 const { error } = await supabase.from("habits").insert({
 user_id: user.id,
 title: title.trim(),
 emoji,
 color: customColor,
 frequency: "daily",
 target_days: targetDays,
 completed_dates: [],
 });

 if (error) {
 console.log("SUPABASE ERROR:", error);

 notifyError("Erro ao criar hábito", error.message ?? JSON.stringify(error));

 showToast("Erro ao criar hábito", "info", "❌");

 return;
 }

 showToast("Hábito criado!", "success");

 setTitle("");
 setEmoji("🏃");
 setCustomColor("#F59E0B");
 setTargetDays(30);

 reloadHabits();

 onClose();
 };

 return (
 <Modal open={open} onClose={onClose} title="Novo Hábito"><div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
 {/* TITLE */}
 <div><div className="ledger-marginalia mb-2">Nome do hábito</div><input className="ledger-input" placeholder="Ex: Correr 30 minutos" value={title} onChange={e => setTitle(e.target.value)} /></div>

 {/* EMOJIS */}
 <div><div className="ledger-marginalia mb-2">Ícone</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
 {EMOJIS.map(e => (
 <button
 key={e}
 onClick={() => setEmoji(e)}
 style={{
 fontSize: 16,
 padding: "7px 9px",
 borderRadius: 3,
 border: emoji === e ? "2px solid #F59E0B" : "1px solid #33333f",
 background: emoji === e ? "rgba(245,158,11,0.15)" : "transparent",
 cursor: "pointer",
 fontFamily: "'Space Grotesk', sans-serif",
 fontWeight: 700,
 color: "#ededed",
 }}
 >
 {e}
 </button>
 ))}
 </div></div>

 {/* COLORS */}
 <div><div className="ledger-marginalia mb-2">Cor da tinta</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
 {COLORS.map(c => (
 <button
 key={c}
 onClick={() => setCustomColor(c)}
 style={{
 width: 26,
 height: 26,
 borderRadius: 3,
 background: c,
 border: customColor === c ? "2px solid #ededed" : "1px solid #33333f",
 cursor: "pointer",
 transform: customColor === c ? "scale(1.1)" : "scale(1)",
 transition: "all 0.2s ease",
 }}
 />
 ))}
 </div></div>

 {/* TARGET */}
 <div><div className="ledger-marginalia mb-2">Meta mensal · {targetDays} dias</div><input
 type="range"
 min={1}
 max={31}
 value={targetDays}
 onChange={e => setTargetDays(Number(e.target.value))}
 className="ledger-range"
 style={{ width: "100%" }}
 /></div>

 {/* BUTTON */}
 <button className="ledger-btn ledger-btn--violet" style={{ width: "100%" }} onClick={handleSubmit}>
 Criar Hábito
 </button></div></Modal>
 );
}

// =========================
// MAIN
// =========================

export default function Habits({ isPro }: { isPro: boolean }) {
 const { showXP } = useXPAnimation();

 const isMobile = useIsMobile();

 const [habits, setHabits] = useState<any[]>([]);

 const today = new Date();

 const [viewYear, setViewYear] = useState(today.getFullYear());

 const [viewMonth, setViewMonth] = useState(today.getMonth());

 const [showModal, setShowModal] = useState(false);

 const [searchTerm, setSearchTerm] = useState("");

 const [chartType, setChartType] = useState<"daily" | "weekly">("daily");

 const [viewMode, setViewMode] = useState<"cards" | "table">(() => {
 if (typeof window === "undefined") return "table";
 return window.sessionStorage.getItem("habitsViewMode") === "cards"
 ? "cards"
 : "table";
 });

 const handleViewModeChange = (mode: "cards" | "table") => {
 setViewMode(mode);
 window.sessionStorage.setItem("habitsViewMode", mode);
 };

 // =========================
 // LOAD HABITS
 // =========================

 const loadHabits = async () => {
 const {
 data: { user },
 } = await supabase.auth.getUser();

 if (!user) return;

 const { data, error } = await supabase
 .from("habits")
 .select("*")
 .eq("user_id", user.id)
 .order("created_at", { ascending: true });

 if (error) {
 console.log(error);
 return;
 }

 setHabits(
 (data || []).map((habit: any) => ({
 ...habit,
 completedDates: habit.completed_dates || [],
 targetDays: habit.target_days || 30,
 }))
 );
 };

 useEffect(() => {
 loadHabits();
 }, []);

 const updateHabitLocally = (habitId: string, completedDates: string[]) => {
 setHabits(previous =>
 previous.map(habit =>
 habit.id === habitId ? { ...habit, completedDates } : habit
 )
 );
 };

 const removeHabitLocally = (habitId: string) => {
 setHabits(previous => previous.filter(habit => habit.id !== habitId));
 };

 const restoreHabitLocally = (habit: any) => {
 setHabits(previous => [...previous, habit]);
 };

 // =========================
 // DATES
 // =========================

 const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
 const dayNumbers = Array.from({ length: daysInMonth }, (_, index) => index + 1);

 // =========================
 // FILTER
 // =========================

 const filteredHabits = useMemo(
 () =>
 habits.filter(h =>
 h.title.toLowerCase().includes(searchTerm.toLowerCase())
 ),
 [habits, searchTerm]
 );

 // =========================
 // CHART DATA
 // =========================

 const dailyData = useMemo(
 () => getDailyHabitData(viewYear, viewMonth, filteredHabits),
 [filteredHabits, viewYear, viewMonth]
 );

 const weeklyData = useMemo(
 () => getWeeklyHabitData(viewYear, viewMonth, filteredHabits),
 [filteredHabits, viewYear, viewMonth]
 );

 // =========================
 // STATS
 // =========================

 const todayStr = getTodayString();

 const habitsToday = filteredHabits.filter(h =>
 h.completedDates.includes(todayStr)
 ).length;

 const monthlyRate =
 filteredHabits.length > 0
 ? Math.round(
 filteredHabits.reduce(
 (acc, h) => acc + getHabitMonthRate(h, viewYear, viewMonth),
 0
 ) / filteredHabits.length
 )
 : 0;

 // =========================
 // EXPORT
 // =========================

 const exportData = () => {
 const exportObj = {
 date: new Date().toISOString(),
 habits: filteredHabits,
 };

 const dataStr = JSON.stringify(exportObj, null, 2);

 const dataBlob = new Blob([dataStr], {
 type: "application/json",
 });

 const url = URL.createObjectURL(dataBlob);

 const link = document.createElement("a");

 link.href = url;

 link.download = "habits.json";

 link.click();
 };

 // =========================
 // RENDER
 // =========================

 return (
 <div className="animate-fade-in">
 {/* HEADER */}

 <div
 style={{
 display: "flex",
 justifyContent: "space-between",
 alignItems: isMobile ? "flex-start" : "center",
 gap: 12,
 marginBottom: isMobile ? 16 : 20,
 }}
 ><div><h1
 style={{
 fontSize: isMobile ? 22 : 26,
 fontWeight: 700,
 lineHeight: 1.2,
 display: "flex",
 alignItems: "center",
 gap: 8,
 }}
 >
 {isMobile && (
 <span
 style={{
 width: 28,
 height: 28,
 borderRadius: 8,
 background: "rgba(139,92,246,0.15)",
 display: "inline-flex",
 alignItems: "center",
 justifyContent: "center",
 flexShrink: 0,
 }}
 ><Flame size={15} style={{ color: "#A855F7" }} /></span>
 )}
 Hábitos
 </h1><p
 style={{
 fontSize: isMobile ? 11 : 12,
 color: "var(--muted-foreground)",
 margin: isMobile ? "2px 0 0" : 0,
 }}
 >
 Consistência é tudo 
 </p></div><div className="habit-header-actions"><div className="habit-view-switch" aria-label="Visualização dos hábitos"><button
 type="button"
 className={viewMode === "cards" ? "active" : ""}
 aria-label="Usar visão em cards"
 aria-pressed={viewMode === "cards"}
 onClick={() => handleViewModeChange("cards")}
 title="Usar visão em cards"
 ><LayoutGrid size={14} aria-hidden="true" /><span>Cards</span></button><button
 type="button"
 className={viewMode === "table" ? "active" : ""}
 aria-label="Usar visão clássica em tabela"
 aria-pressed={viewMode === "table"}
 onClick={() => handleViewModeChange("table")}
 title="Usar visão clássica em tabela"
 ><Table2 size={14} aria-hidden="true" /><span>Tabela</span></button></div>

 {!isMobile && (
 <button className="ledger-btn ledger-btn--violet" onClick={() => setShowModal(true)}>
 Novo hábito
 </button>
 )}
 </div></div>

 {/* SEARCH */}

 <div
 style={{
 display: "flex",
 gap: 10,
 marginBottom: 20,
 }}
 ><div
 style={{
 display: "flex",
 alignItems: "center",
 gap: 6,
 flex: 1,
 background: "var(--card)",
 border: "1px solid var(--border)",
 borderRadius: 8,
 padding: "8px 12px",
 }}
 ><Search size={14} /><input
 type="text"
 placeholder="Buscar..."
 value={searchTerm}
 onChange={e => setSearchTerm(e.target.value)}
 style={{
 background: "transparent",
 border: "none",
 outline: "none",
 flex: 1,
 }}
 /></div><button className="ledger-btn ledger-btn--ghost" onClick={exportData}><Download size={14} /></button></div>

 {/* MONTH */}

 <div
 style={{
 display: "flex",
 justifyContent: "center",
 alignItems: "center",
 gap: isMobile ? 14 : 20,
 marginBottom: isMobile ? 14 : 20,
 }}
 ><button
 onClick={() => setViewMonth(prev => (prev === 0 ? 11 : prev - 1))}
 style={{
 width: isMobile ? 34 : undefined,
 height: isMobile ? 34 : undefined,
 borderRadius: 10,
 border: "1px solid var(--border)",
 background: "var(--card)",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 }}
 aria-label="Mês anterior"
 type="button"
 ><ChevronLeft size={16} /></button><h2
 style={{
 fontSize: isMobile ? 15 : undefined,
 fontWeight: 700,
 margin: 0,
 }}
 >
 {MONTHS[viewMonth]} {viewYear}
 </h2><button
 onClick={() => setViewMonth(prev => (prev === 11 ? 0 : prev + 1))}
 style={{
 width: isMobile ? 34 : undefined,
 height: isMobile ? 34 : undefined,
 borderRadius: 10,
 border: "1px solid var(--border)",
 background: "var(--card)",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 }}
 aria-label="Próximo mês"
 type="button"
 ><ChevronRight size={16} /></button></div>

 {/* CHART */}

 <section className="ledger-paper ledger-paper--violet habit-insight-card"><div className="habit-insight-header"><div className="habit-insight-title"><span className="habit-insight-icon"><TrendingUp size={18} /></span><div><h2>Consistência em foco</h2><p>{chartType === "daily" ? "Seu ritmo dia a dia neste mês" : "Evolução semanal dos seus hábitos"}</p></div></div><div className="habit-chart-switch" aria-label="Período do gráfico"><button
 type="button"
 className={chartType === "daily" ? "active" : ""}
 aria-pressed={chartType === "daily"}
 onClick={() => setChartType("daily")}
 >
 Diário
 </button><button
 type="button"
 className={chartType === "weekly" ? "active" : ""}
 aria-pressed={chartType === "weekly"}
 onClick={() => setChartType("weekly")}
 >
 Semanal
 </button></div></div><ResponsiveContainer width="100%" height={isMobile ? 255 : 310}>
 {chartType === "daily" ? (
 <AreaChart data={dailyData} margin={{ top: 14, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="habitChartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A855F7" stopOpacity={0.42} /><stop offset="100%" stopColor="#A855F7" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickMargin={12} minTickGap={isMobile ? 18 : 10} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(168, 85, 247, 0.35)", strokeWidth: 1 }} /><Area type="monotone" dataKey="count" name="Hábitos concluídos" stroke="#C084FC" strokeWidth={3} fill="url(#habitChartGradient)" activeDot={{ r: 5, strokeWidth: 0, fill: "#F5F3FF" }} /></AreaChart>
 ) : (
 <BarChart data={weeklyData} margin={{ top: 14, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%"><defs><linearGradient id="habitBarGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C084FC" /><stop offset="100%" stopColor="#7C3AED" /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 6" /><XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickMargin={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} /><Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(168, 85, 247, 0.08)" }} /><Bar dataKey="count" name="Hábitos concluídos" fill="url(#habitBarGradient)" radius={[8, 8, 3, 3]} maxBarSize={52} /></BarChart>
 )}
 </ResponsiveContainer></section>

 {/* HABITS */}

 {filteredHabits.length === 0 ? (
 <div className="ledger-paper ledger-paper--violet flex flex-col items-center justify-center text-center py-16 px-6 mb-5"><div className="w-20 h-20 bg-[#261d14] border border-amber-500/30 rounded-md flex items-center justify-center mb-6"><Flame size={36} className="text-amber-500/50" /></div><h3 className="text-white text-lg font-bold mb-2">
 {searchTerm ? "Nenhum hábito encontrado" : "Nenhum hábito criado"}
 </h3><p className="text-zinc-400 text-sm mb-6 max-w-sm">
 {searchTerm
 ? "Tente buscar por outro termo."
 : "Hábitos são o alicerce da sua evolução. Comece criando seu primeiro hábito e construa sua streak!"
 }
 </p>
 {!searchTerm && (
 <button
 onClick={() => setShowModal(true)}
 className="px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white rounded-md text-sm font-bold transition-all shadow-[4px_4px_0_rgba(0,0,0,0.3)]"
 >
 + Criar primeiro hábito
 </button>
 )}
 </div>
 ) : viewMode === "cards" ? (
 <section className="habit-cards" aria-label="Seus hábitos em cards">
 {filteredHabits.map(habit => (
 <HabitCard
 key={habit.id}
 habit={habit}
 year={viewYear}
 month={viewMonth}
 daysInMonth={daysInMonth}
 onHabitUpdated={updateHabitLocally}
 onHabitDeleted={removeHabitLocally}
 onHabitRestored={restoreHabitLocally}
 addXPAmount={showXP}
 />
 ))}
 </section>
 ) : (
 <section
 className="ledger-paper ledger-paper--violet habit-table-card"
 style={{ padding: 0, marginBottom: 20 }}
 aria-label="Seus hábitos em tabela"
 ><div className="habit-table-scroll"><div className="habit-table-head"><div className="habit-table-head-info">Hábito</div><div className="habit-table-head-days">
 {dayNumbers.map(day => (
 <div key={day} className="habit-day-header-item">
 {day}
 </div>
 ))}
 </div></div><div className="habit-table-body">
 {filteredHabits.map(habit => (
 <HabitRow
 key={habit.id}
 habit={habit}
 year={viewYear}
 month={viewMonth}
 daysInMonth={daysInMonth}
 onHabitUpdated={updateHabitLocally}
 onHabitDeleted={removeHabitLocally}
 onHabitRestored={restoreHabitLocally}
 />
 ))}
 </div></div></section>
 )}

 {isMobile && (
 <button
 type="button"
 className="habit-fab"
 onClick={() => setShowModal(true)}
 aria-label="Novo hábito"
 ><Plus size={22} /></button>
 )}

 {/* STATS */}

 <div
 style={{
 display: "grid",
 gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
 gap: 10,
 }}
 ><div
 className="ledger-paper ledger-paper--violet"
 style={{
 padding: 14,
 textAlign: "center",
 }}
 ><div
 style={{
 fontSize: 18,
 fontWeight: 700,
 color: "#F59E0B",
 }}
 >
 {habitsToday}
 </div><div
 style={{
 fontSize: 11,
 color: "var(--muted-foreground)",
 }}
 >
 Hoje
 </div></div><div
 className="ledger-paper ledger-paper--violet"
 style={{
 padding: 14,
 textAlign: "center",
 }}
 ><div
 style={{
 fontSize: 18,
 fontWeight: 700,
 color: "#10B981",
 }}
 >
 {monthlyRate}%
 </div><div
 style={{
 fontSize: 11,
 color: "var(--muted-foreground)",
 }}
 >
 Taxa
 </div></div><div
 className="ledger-paper ledger-paper--violet"
 style={{
 padding: 14,
 textAlign: "center",
 }}
 ><div
 style={{
 fontSize: 18,
 fontWeight: 700,
 color: "#A855F7",
 }}
 >
 {filteredHabits.length}
 </div><div
 style={{
 fontSize: 11,
 color: "var(--muted-foreground)",
 }}
 >
 Hábitos
 </div></div></div>

 {/* MODAL */}

 <NewHabitModal
 open={showModal}
 onClose={() => setShowModal(false)}
 reloadHabits={loadHabits}
 isPro={isPro}
 habits={habits}
 /></div>
 );
}
