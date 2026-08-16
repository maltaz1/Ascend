import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

import {
 Plus,
 Trash2,
 ChevronDown,
 ChevronUp,
 Check,
 Target,
 Trophy,
 Flame,
 CalendarDays,
 Zap,
 Rocket,
} from "lucide-react";

import { useXPAnimation } from "@/hooks/useStore";
import { useIsMobile } from "@/hooks/useMobile";

import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/FlowToast";

import { supabase } from "@/lib/supabase";
import { FREE_LIMITS } from "@/config/planLimits";

import {
 WEEKDAY_LABELS,
 COMMON_FREQUENCIES,
 getMondayOfDate,
 normalizeWeeklyGoalWeek,
 isWeeklyGoalHit,
 getWeekConsistencyAverage,
 countActiveWeeklyGoals,
 getWeeklySparkline,
 getLinkedHabitWeekCheckins,
} from "@/lib/weeklyGoals";
import { syncGoalToHabit } from "@/lib/syncHabitGoals";

// =========================
// TYPES
// =========================

type GoalStep = {
 id: string;
 title: string;
 completed: boolean;
};

type GoalType = "semanal" | "longo_prazo";

type Goal = {
 id: string;
 title: string;
 description?: string;
 emoji: string;
 color: string;
 deadline?: string;
 steps: GoalStep[];
 completed_at?: string | null;
 type?: GoalType;
 target_frequency?: number;
 days_completed_week?: boolean[];
 streak?: number;
 record_streak?: number;
 linked_habit_id?: string | null;
 week_start?: string | null;
 weekly_history?: number[];
};

// =========================
// HELPERS
// =========================

function getGoalProgress(goal: Goal) {
 if (!goal.steps || goal.steps.length === 0) return 0;
 const completed = goal.steps.filter(s => s.completed).length;
 return (completed / goal.steps.length) * 100;
}

function normalizeWeeklyGoals(goals: Goal[]): { normalized: Goal[]; changed: boolean } {
 let changed = false;
 const normalized = goals.map(g => {
 if (g.type !== "semanal") return g;
 const wg = normalizeWeeklyGoalWeek({
 id: g.id,
 title: g.title,
 emoji: g.emoji,
 color: g.color,
 description: g.description,
 targetFrequency: g.target_frequency ?? 1,
 daysCompletedWeek: g.days_completed_week ?? [false, false, false, false, false, false, false],
 weekStart: g.week_start ?? null,
 streak: g.streak ?? 0,
 recordStreak: g.record_streak ?? 0,
 linkedHabitId: g.linked_habit_id ?? null,
 weeklyHistory: g.weekly_history ?? [],
 createdAt: "",
 });
 if (wg.changed) changed = true;
 if (!wg.changed) return g;
 return {
 ...g,
 days_completed_week: wg.goal.daysCompletedWeek,
 week_start: wg.goal.weekStart,
 streak: wg.goal.streak,
 record_streak: wg.goal.recordStreak,
 weekly_history: wg.goal.weeklyHistory,
 };
 });
 return { normalized, changed };
}

// =========================
// CONSTANTS & THEME
// =========================


const COLORS = [
 "var(--primary)", // violet
 "var(--accent)", // amber
 "#10B981", // emerald
 "#EF4444", // red
 "#EC4899", // pink
 "#06B6D4", // cyan
 "#84CC16", // lime
 "#6B7280", // gray
];

// Tintas sólidas — sem gradientes nem glow (registro de caderno, não sticker)
const COLOR_TINT: Record<string, { light: string; dark: string }> = {
 "var(--accent)": { light: "rgba(245,158,11,0.08)", dark: "rgba(245,158,11,0.15)" },
 "var(--primary)": { light: "rgba(168,85,247,0.08)", dark: "rgba(168,85,247,0.15)" },
 "#10B981": { light: "rgba(16,185,129,0.08)", dark: "rgba(16,185,129,0.15)" },
 "#8B5CF6": { light: "rgba(139,92,246,0.08)", dark: "rgba(139,92,246,0.15)" },
 "#EF4444": { light: "rgba(239,68,68,0.08)", dark: "rgba(239,68,68,0.15)" },
 "#EC4899": { light: "rgba(236,72,153,0.08)", dark: "rgba(236,72,153,0.15)" },
 "#06B6D4": { light: "rgba(6,182,212,0.08)", dark: "rgba(6,182,212,0.15)" },
 "#84CC16": { light: "rgba(132,204,22,0.08)", dark: "rgba(132,204,22,0.15)" },
 "#6B7280": { light: "rgba(107,114,128,0.08)", dark: "rgba(107,114,128,0.15)" },
};

function getGoalColors(hex: string) {
 const tint = COLOR_TINT[hex] || { light: `${hex}15`, dark: `${hex}25` };
 return { ...tint, gradient: hex, glow: "transparent" };
}

function goalToWeekly(g: Goal): import("@/lib/weeklyGoals").WeeklyGoal {
 return {
 id: g.id,
 title: g.title,
 emoji: g.emoji,
 color: g.color,
 description: g.description,
 targetFrequency: g.target_frequency ?? 1,
 daysCompletedWeek: g.days_completed_week ?? [false, false, false, false, false, false, false],
 weekStart: g.week_start ?? null,
 streak: g.streak ?? 0,
 recordStreak: g.record_streak ?? 0,
 linkedHabitId: g.linked_habit_id ?? null,
 weeklyHistory: g.weekly_history ?? [],
 createdAt: "",
 };
}

// =========================
// WEEKLY SPARKLINE
// =========================

function WeeklySparkline({ data, color }: { data: number[]; color: string }) {
 const width = 64;
 const height = 18;
 const points = data.map((v, i) => {
 const x = (i / Math.max(data.length - 1, 1)) * width;
 const y = height - (v / 100) * height;
 return `${x},${y}`;
 }).join(" ");

 return (
 <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}><polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
 );
}

// =========================
// WEEKLY GOAL CARD
// =========================

function WeeklyGoalCard({
 goal,
 linkedHabits,
 reloadGoals,
 isMobile,
 onDelete,
}: {
 goal: Goal;
 linkedHabits: { id: string; title: string; emoji: string; completed_dates?: string[] | null }[];
 reloadGoals: () => void;
 isMobile: boolean;
 onDelete: () => void;
}) {
 const cardRef = useRef<HTMLDivElement>(null);
 const { showXP } = useXPAnimation();
 const colorInfo = getGoalColors(goal.color);
 const hit = isWeeklyGoalHit(goalToWeekly(goal));
 const paperVariant = hit ? "ledger-paper--green" : goal.color === "var(--primary)" || goal.color === "var(--primary)" ? "ledger-paper--violet" : goal.color === "var(--accent)" ? "ledger-paper--amber" : goal.color === "#EF4444" ? "ledger-paper--red" : "";

 const norm = useMemo(
 () =>
 normalizeWeeklyGoalWeek({
 id: goal.id,
 title: goal.title,
 emoji: goal.emoji,
 color: goal.color,
 description: goal.description,
 targetFrequency: goal.target_frequency ?? 1,
 daysCompletedWeek: goal.days_completed_week ?? [false, false, false, false, false, false, false],
 weekStart: goal.week_start ?? null,
 streak: goal.streak ?? 0,
 recordStreak: goal.record_streak ?? 0,
 linkedHabitId: goal.linked_habit_id ?? null,
 weeklyHistory: goal.weekly_history ?? [],
 createdAt: "",
 }),
 [goal.id]
 );

 const [days, setDays] = useState<boolean[]>(norm.goal.daysCompletedWeek);
 const [streak, setStreak] = useState(norm.goal.streak);

 useEffect(() => {
 if (norm.changed) {
 setDays(norm.goal.daysCompletedWeek);
 setStreak(norm.goal.streak);
 persistWeek(norm.goal.daysCompletedWeek, norm.goal.streak);
 }
 }, [norm.changed]);

 const persistWeek = useCallback(async (newDays: boolean[], newStreak: number) => {
 const weekStart = getMondayOfDate(new Date());
 await supabase.from("goals").update({ days_completed_week: newDays, week_start: weekStart, streak: newStreak }).eq("id", goal.id);
 reloadGoals();
 }, [goal.id, reloadGoals]);

 const habit = linkedHabits.find(h => h.id === goal.linked_habit_id);

 useEffect(() => {
 if (!habit) return;
 const habitCheckins = getLinkedHabitWeekCheckins(habit, getMondayOfDate(new Date()));
 const merged = habitCheckins.map((v, i) => v || (goal.days_completed_week?.[i] ?? false));
 if (JSON.stringify(merged) !== JSON.stringify(goal.days_completed_week)) {
 persistWeek(merged, streak);
 }
 }, [habit, goal.days_completed_week, persistWeek, streak]);

 const handleToggleDay = async (dayIndex: number) => {
 const monday = new Date(`${getMondayOfDate(new Date())}T12:00:00`);
 const d = new Date(monday);
 d.setDate(monday.getDate() + dayIndex);
 const todayStr = new Date().toISOString().slice(0, 10);
 const dayStr = d.toISOString().slice(0, 10);
 if (dayStr > todayStr) { showToast("Somente dias passados ou hoje", "info", " "); return; }

 const newDays = days.map((v, i) => (i === dayIndex ? !v : v));
 const isMarked = newDays[dayIndex];
 setDays(newDays);

 const rect = cardRef.current?.getBoundingClientRect();
 if (rect) showXP(5, rect.left + rect.width / 2, rect.top);
 await persistWeek(newDays, streak);

 // Sincronizar com o hábito vinculado
 if (goal.linked_habit_id) {
 await syncGoalToHabit(goal.linked_habit_id, dayIndex, isMarked);
 }
 };

 const completedCount = days.filter(Boolean).length;
 const target = goal.target_frequency ?? 1;
 const sparklineData = getWeeklySparkline({ ...norm.goal, daysCompletedWeek: days });

 const todayIdx = (() => {
 const jsDay = new Date().getDay();
 return jsDay === 0 ? 6 : jsDay - 1;
 })();

 return (
 <div
 ref={cardRef}
 className={`ledger-paper ${paperVariant}`}
 style={{ padding: isMobile ? "14px 16px" : "18px 22px" }}
 ><div style={{ display: "flex", gap: isMobile ? 10 : 14, marginBottom: 14, alignItems: "flex-start" }}><div style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: 4, background: colorInfo.dark, border: `1px solid ${goal.color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 17 : 20, flexShrink: 0 }}>
 {goal.emoji || String(goal.title || "M").trim().charAt(0).toUpperCase()}
 </div><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><h3 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{goal.title}</h3><button
 onClick={(e) => {
 e.stopPropagation();
 if (window.confirm(`Excluir "${goal.title}"?`)) {
 onDelete();
 }
 }}
 style={{
 background: "transparent",
 border: "none",
 width: 24,
 height: 24,
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 cursor: "pointer",
 opacity: 0.55,
 transition: "opacity 0.2s",
 flexShrink: 0,
 marginLeft: 8
 }}
 onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
 onMouseLeave={e => (e.currentTarget.style.opacity = "0.55")}
 ><Trash2 size={13} color="#EF4444" /></button></div><div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}><span className={`ledger-stamp ${hit ? "ledger-stamp--green" : "ledger-stamp--violet"}`}>
 {hit ? "Atingida" : `${completedCount}/${target} sem.`}
 </span><span className={`ledger-stamp ${streak >= 7 ? "ledger-stamp--amber" : "ledger-stamp--ink"}`}><Flame size={10} fill={streak >= 7 ? "var(--accent)" : "var(--ink-muted)"} color={streak >= 7 ? "var(--accent)" : "var(--ink-muted)"} /> {streak} seg.</span>
 {habit && (
 <span style={{ fontSize: 10, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}><CalendarDays size={10} /> {habit.title}
 </span>
 )}
 </div></div></div><div style={{ height: 5, borderRadius: 0, background: "var(--ledger-paper-border)", marginBottom: 14, overflow: "hidden" }}><div style={{ width: `${Math.min(100, (completedCount / target) * 100)}%`, height: "100%", background: hit ? "#10B981" : goal.color, transition: "width 0.4s ease" }} /></div><div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: isMobile ? 3 : 4, marginBottom: 12 }}>
 {days.map((completed, i) => {
 const isToday = i === todayIdx;
 const monday = new Date(`${getMondayOfDate(new Date())}T12:00:00`);
 const d = new Date(monday);
 d.setDate(monday.getDate() + i);
 const isFuture = d.toISOString().slice(0, 10) > new Date().toISOString().slice(0, 10);

 return (
 <button
 key={i}
 onClick={() => handleToggleDay(i)}
 disabled={isFuture}
 style={{
 display: "flex",
 flexDirection: "column",
 alignItems: "center",
 gap: 3,
 padding: "6px 0",
 borderRadius: 3,
 border: completed ? `1.5px solid ${goal.color}` : isToday ? `1.5px solid ${goal.color}99` : "1.5px solid #3f3f4c",
 background: completed ? `${goal.color}22` : "transparent",
 opacity: isFuture ? 0.3 : 1,
 cursor: isFuture ? "not-allowed" : "pointer",
 }}
 ><div className={`ledger-check ${completed ? "ledger-check--done" : ""}`} style={completed ? { background: goal.color, borderColor: goal.color } : {}}><div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
 {completed && <Check size={8} color="white" />}
 </div></div><span style={{ fontSize: 8, fontWeight: isToday ? 800 : 500, color: isToday ? goal.color : "var(--muted-foreground)" }}>{WEEKDAY_LABELS[i].slice(0, 2)}</span></button>
 );
 })}
 </div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--ledger-paper-border)" }}><span style={{ fontSize: 10, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
 {norm.goal.recordStreak > 0 && <><Trophy size={10} color="#FCD34D" /> Recorde: {norm.goal.recordStreak}</>}
 </span><WeeklySparkline data={sparklineData} color={hit ? "#10B981" : goal.color} /></div></div>
 );
}

// =========================
// LONG-TERM GOAL CARD
// =========================

function GoalCard({
 goal,
 reloadGoals,
 isMobile,
 onGoalUpdated,
 onGoalDeleted,
 onGoalRestored,
}: {
 goal: Goal;
 reloadGoals: () => void;
 isMobile: boolean;
 onGoalUpdated: (goalId: string, steps: Goal["steps"], completedAt: string | null) => void;
 onGoalDeleted: (goalId: string) => void;
 onGoalRestored: (goal: Goal) => void;
}) {
 const [expanded, setExpanded] = useState(false);
 const { showXP } = useXPAnimation();
 const cardRef = useRef<HTMLDivElement>(null);
 const progress = getGoalProgress(goal);
 const colorInfo = getGoalColors(goal.color);
 const isCompleted = !!goal.completed_at;

 const handleToggleStep = (stepId: string) => {
 const updatedSteps = goal.steps.map(step =>
 step.id === stepId ? { ...step, completed: !step.completed } : step
 );
 const completedAt = updatedSteps.every(step => step.completed)
 ? new Date().toISOString()
 : null;
 onGoalUpdated(goal.id, updatedSteps, completedAt);
 const rect = cardRef.current?.getBoundingClientRect();
 if (rect) {
 showXP(10, rect.left + rect.width / 2, rect.top);
 }
 void (async () => {
 const { error } = await supabase
 .from("goals")
 .update({ steps: updatedSteps, completed_at: completedAt })
 .eq("id", goal.id);
 if (error) {
 onGoalUpdated(goal.id, goal.steps, goal.completed_at ?? null);
 showToast("Não foi possível atualizar a meta", "info");
 } else {
 // Recarregar para manter metas semanais vinculadas em sincronia
 reloadGoals();
 }
 })();
 };
 const handleDelete = () => {
 onGoalDeleted(goal.id);
 showToast("Meta deletada", "info");
 void (async () => {
 const { error } = await supabase.from("goals").delete().eq("id", goal.id);
 if (error) {
 onGoalRestored(goal);
 showToast("Não foi possível remover a meta", "info");
 } else {
 reloadGoals();
 }
 })();
 };

 const paperVariant = isCompleted ? "ledger-paper--green" : goal.color === "var(--primary)" || goal.color === "var(--primary)" ? "ledger-paper--violet" : goal.color === "var(--accent)" ? "ledger-paper--amber" : goal.color === "#EF4444" ? "ledger-paper--red" : "";

 return (
 <div
 ref={cardRef}
 className={`ledger-paper ${paperVariant}`}
 style={{ padding: isMobile ? "14px 16px" : "18px 22px" }}
 >
 <div style={{ display: "flex", gap: isMobile ? 10 : 14, marginBottom: 14, alignItems: "flex-start" }}><div style={{ width: isMobile ? 38 : 44, height: isMobile ? 38 : 44, borderRadius: 4, background: isCompleted ? "rgba(16,185,129,0.15)" : colorInfo.dark, border: `1px solid ${isCompleted ? "rgba(16,185,129,0.5)" : `${goal.color}66`}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 17 : 20, flexShrink: 0 }}>
 {goal.emoji || String(goal.title || "M").trim().charAt(0).toUpperCase()}
 </div><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><h3 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.title}</h3><button onClick={() => setExpanded(!expanded)} style={{ background: "transparent", border: "none", borderRadius: 3, padding: 4, cursor: "pointer", color: "var(--muted-foreground)" }}>
 {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 </button></div><div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}><span className={`ledger-stamp ${isCompleted ? "ledger-stamp--green" : "ledger-stamp--violet"}`}>
 {isCompleted ? "Concluída" : "Em curso"}
 </span><span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{goal.steps.filter(s => s.completed).length}/{goal.steps.length} etapas</span></div><p style={{ fontSize: isMobile ? 11 : 12, color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.4, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{goal.description}</p></div></div><div style={{ height: 5, borderRadius: 0, background: "var(--ledger-paper-border)", marginBottom: 14, overflow: "hidden" }}><div style={{ width: `${progress}%`, height: "100%", background: isCompleted ? "#10B981" : goal.color, borderRadius: 0, transition: "width 0.4s ease" }} /></div>

 {expanded && (
 <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
 {goal.steps.map(step => (
 <button
 key={step.id}
 onClick={() => handleToggleStep(step.id)}
 style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 3, border: `1px solid ${step.completed ? "rgba(16,185,129,0.4)" : "var(--ledger-paper-border)"}`, background: step.completed ? "rgba(16,185,129,0.06)" : "transparent", cursor: "pointer", textAlign: "left" }}
 ><div className={`ledger-check ${step.completed ? "ledger-check--done" : ""}`} style={step.completed ? { background: "#10B981", borderColor: "#10B981" } : { borderColor: goal.color }}><div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
 {step.completed && <Check size={9} color="white" />}
 </div></div><span style={{ textDecoration: step.completed ? "line-through" : "none", color: step.completed ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.title}</span></button>
 ))}
 <button onClick={handleDelete} className="ledger-btn ledger-btn--ghost" style={{ marginTop: 6, color: "#f87171", borderColor: "rgba(239,68,68,0.35)", fontSize: 12, padding: "9px 14px" }}><Trash2 size={12} color="#f87171" /> Deletar Meta
 </button></div>
 )}
 </div>
 );
}

// =========================
// EMPTY SECTION
// =========================

function EmptySection({ icon, title, subtitle, onAction, actionLabel, isMobile }: { icon: React.ReactNode; title: string; subtitle: string; onAction?: () => void; actionLabel?: string; isMobile: boolean }) {
 return (
 <div style={{ padding: isMobile ? "30px 20px" : "44px 20px", textAlign: "center", background: "var(--ledger-paper-bg)", borderRadius: 6, border: "2px dashed var(--ledger-paper-border)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}><div style={{ width: isMobile ? 52 : 64, height: isMobile ? 52 : 64, borderRadius: 4, background: "var(--ledger-paper-border)", border: "1px solid var(--ledger-paper-border)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>{icon}</div><h4 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>{title}</h4><p style={{ fontSize: isMobile ? 12 : 14, color: "var(--muted-foreground)", maxWidth: 300, lineHeight: 1.5, margin: 0 }}>{subtitle}</p>
 {onAction && (
 <button onClick={onAction} className="ledger-btn ledger-btn--violet" style={{ marginTop: 8, fontSize: isMobile ? 12 : 13 }}><Plus size={isMobile ? 14 : 16} /> {actionLabel}
 </button>
 )}
 </div>
 );
}

// =========================
// WEEKLY SUMMARY BAR
// =========================

function WeeklySummaryBar({ weeklyGoals, isMobile }: { weeklyGoals: Goal[]; isMobile: boolean }) {
 const asWeekly = weeklyGoals.map(goalToWeekly);
 const activeCount = countActiveWeeklyGoals(asWeekly);
 const avgConsistency = getWeekConsistencyAverage(asWeekly);
 const totalStreak = weeklyGoals.reduce((acc, g) => acc + (g.streak ?? 0), 0);

 const stats = [
 { value: `${avgConsistency}%`, label: "Consistência", variant: "ledger-metric--green" },
 { value: activeCount, label: "Ativas", variant: "ledger-metric--violet" },
 { value: totalStreak, label: "Streak total", variant: "ledger-metric--amber" },
 ];

 return (
 <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr 1fr", gap: isMobile ? 12 : 16, marginBottom: 20 }}>
 {stats.map(({ value, label, variant }) => (
 <div key={label} className={`ledger-metric ${variant}`} style={{ padding: isMobile ? "12px 14px" : "16px 18px" }}><div className="ledger-marginalia" style={{ marginBottom: 8 }}>{label}</div><div className="ledger-metric-value" style={{ fontSize: isMobile ? 22 : 28 }}>{value}</div></div>
 ))}
 </div>
 );
}

// =========================
// MODAL
// =========================

function NewGoalModal({
 open,
 onClose,
 reloadGoals,
 habits,
 isPro,
 weeklyGoalsCount,
 longTermGoalsCount,
 onOpenUpgrade,
 isMobile,
}: {
 open: boolean;
 onClose: () => void;
 reloadGoals: () => void;
 habits: { id: string; title: string; emoji: string }[];
 isPro: boolean;
 weeklyGoalsCount: number;
 longTermGoalsCount: number;
 onOpenUpgrade: () => void;
 isMobile: boolean;
}) {
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [emoji, setEmoji] = useState(" ");
 const [color, setColor] = useState("var(--primary)");
 const [deadline, setDeadline] = useState("");
 const [steps, setSteps] = useState<string[]>([""]);
 const [goalType, setGoalType] = useState<GoalType>("longo_prazo");
 const [targetFrequency, setTargetFrequency] = useState<number>(4);
 const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

 const handleSubmit = async () => {
 if (!title.trim()) return;

 const { data: { user } } = await supabase.auth.getUser();
 if (!user) return;

 if (goalType === "semanal" && !isPro && weeklyGoalsCount >= FREE_LIMITS.weeklyGoals) {
 showToast(`Limite de ${FREE_LIMITS.weeklyGoals} metas semanais atingido no plano Free`, "info");
 onOpenUpgrade();
 return;
 }

 if (goalType === "longo_prazo" && !isPro && longTermGoalsCount >= FREE_LIMITS.goals) {
 showToast(`Limite de ${FREE_LIMITS.goals} meta de longo prazo atingido no plano Free`, "info");
 onOpenUpgrade();
 return;
 }

 if (goalType === "semanal") {
 await supabase.from("goals").insert({
 user_id: user.id,
 title: title.trim(),
 description: description || null,
 emoji,
 color,
 type: "semanal",
 target_frequency: targetFrequency,
 days_completed_week: [false, false, false, false, false, false, false],
 week_start: getMondayOfDate(new Date()),
 streak: 0,
 record_streak: 0,
 linked_habit_id: selectedHabitId || null,
 weekly_history: [],
 });
 } else {
 const validSteps = steps.filter(s => s.trim()).map(s => ({ id: crypto.randomUUID(), title: s, completed: false }));
 await supabase.from("goals").insert({
 user_id: user.id,
 title: title.trim(),
 description: description || null,
 emoji,
 color,
 type: "longo_prazo",
 deadline: deadline || null,
 steps: validSteps,
 completed_at: null,
 });
 }

 onClose();
 reloadGoals();
 };

 return (
 <Modal open={open} onClose={onClose} title="Nova Meta" maxWidth={isMobile ? "100%" : "480px"}><div style={{ display: "flex", flexDirection: "column", gap: 18 }}><div><div className="ledger-marginalia mb-2">Tipo de Meta</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
 {([
 { value: "longo_prazo", label: "Longo Prazo", Icon: Target },
 { value: "semanal", label: "Semanal", Icon: CalendarDays },
 ] as const).map(({ value, label, Icon }) => (
 <button
 key={value}
 onClick={() => setGoalType(value)}
 style={{
 padding: "12px",
 borderRadius: 4,
 border: goalType === value ? `1.5px solid ${color}` : "1px solid var(--ledger-paper-border)",
 background: goalType === value ? `${color}15` : "transparent",
 cursor: "pointer",
 display: "flex",
 flexDirection: "column",
 alignItems: "center",
 gap: 6,
 transition: "all 0.2s ease",
 }}
 ><Icon size={16} color={goalType === value ? color : "var(--ink-muted)"} /><span style={{ fontWeight: 700, fontSize: 13, color: goalType === value ? color : "var(--foreground)" }}>{label}</span></button>
 ))}
 </div></div><div><div className="ledger-marginalia mb-2">Ícone</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
 {["📚", "🏃", "💼", "💰", "🎯", "💪", "🧘", "✈", "🎨", "💧", "📷", "🎓"].map(em => (
 <button key={em} type="button" onClick={() => setEmoji(em)} style={{ fontSize: 15, padding: "6px 8px", borderRadius: 3, border: emoji === em ? "2px solid var(--accent)" : "1px solid var(--ledger-paper-border)", background: emoji === em ? "rgba(245,158,11,0.15)" : "transparent", cursor: "pointer", transition: "all 0.15s ease" }}>{em}</button>
 ))}
 </div></div><div><div className="ledger-marginalia mb-2">Cor da tinta</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
 {COLORS.map(c => (
 <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: 3, border: color === c ? "2px solid var(--ink)" : "1px solid var(--ledger-paper-border)", background: c, cursor: "pointer", transform: color === c ? "scale(1.1)" : "scale(1)", transition: "all 0.2s ease" }} />
 ))}
 </div><div className="ledger-marginalia mb-2" style={{ marginTop: 14 }}>Título</div><input className="ledger-input" placeholder="Ex: Aprender React" value={title} onChange={e => setTitle(e.target.value)} /></div>

 {goalType === "semanal" ? (
 <><div><div className="ledger-marginalia mb-2">Frequência (vezes por semana)</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
 {COMMON_FREQUENCIES.map(f => (
 <button key={f.value} type="button" onClick={() => setTargetFrequency(f.value)} style={{ padding: "8px 12px", borderRadius: 4, border: targetFrequency === f.value ? `1.5px solid ${color}` : "1px solid var(--ledger-paper-border)", background: targetFrequency === f.value ? `${color}15` : "transparent", color: "var(--foreground)", cursor: "pointer", fontSize: 12 }}>{f.label}</button>
 ))}
 </div></div>
 {habits.length > 0 && (
 <div><div className="ledger-marginalia mb-2">Vincular a um hábito (opcional)</div><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}><button
 type="button"
 onClick={() => setSelectedHabitId(null)}
 style={{
 padding: "8px 12px",
 borderRadius: 4,
 border: selectedHabitId === null ? `1.5px solid ${color}` : "1px solid var(--ledger-paper-border)",
 background: selectedHabitId === null ? `${color}15` : "transparent",
 color: "var(--foreground)",
 cursor: "pointer",
 fontSize: 12
 }}
 >
 Manual
 </button>
 {habits.map(h => (
 <button
 key={h.id}
 type="button"
 onClick={() => {
 setSelectedHabitId(h.id);
 setTitle(h.title);
 }}
 style={{
 padding: "8px 12px",
 borderRadius: 4,
 border: selectedHabitId === h.id ? `1.5px solid ${color}` : "1px solid var(--ledger-paper-border)",
 background: selectedHabitId === h.id ? `${color}15` : "transparent",
 color: "var(--foreground)",
 cursor: "pointer",
 fontSize: 12
 }}
 ><span>{h.title}</span></button>
 ))}
 </div></div>
 )}
 </>
 ) : (
 <div><div className="ledger-marginalia mb-2">Etapas</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
 {steps.map((step, i) => (
 <input key={i} className="ledger-input" placeholder={`Etapa ${i + 1}`} value={step} onChange={e => setSteps(prev => { const u = [...prev]; u[i] = e.target.value; return u; })} />
 ))}
 <button onClick={() => setSteps([...steps, ""])} style={{ padding: "8px", borderRadius: 3, border: "1px dashed var(--ledger-paper-border)", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 12 }}>+ Adicionar Etapa</button></div></div>
 )}

 <button onClick={handleSubmit} className="ledger-btn ledger-btn--violet" style={{ marginTop: 6, width: "100%" }}>Criar Meta</button></div></Modal>
 );
}

// =========================
// MAIN
// =========================

export default function Goals({
 isPro = false,
 onOpenUpgrade,
}: {
 isPro?: boolean;
 onOpenUpgrade?: () => void;
}) {
 const isMobile = useIsMobile();
 const [goals, setGoals] = useState<Goal[]>([]);
 const [habits, setHabits] = useState<{ id: string; title: string; emoji: string; completed_dates?: string[] | null }[]>([]);
 const [showModal, setShowModal] = useState(false);
 const [longTermFilter, setLongTermFilter] = useState<"all" | "ongoing" | "completed">("all");

 useEffect(() => { loadGoals(); }, []);

 const loadGoals = async () => {
 const { data: { user } } = await supabase.auth.getUser();
 if (!user) return;

 const { data, error } = await supabase.from("goals").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
 if (error) { console.log(error); return; }

 const { normalized, changed } = normalizeWeeklyGoals(data || []);
 if (changed) {
 for (const g of normalized) {
 if (g.type !== "semanal") continue;
 await supabase.from("goals").update({ days_completed_week: g.days_completed_week, week_start: g.week_start, streak: g.streak, record_streak: g.record_streak, weekly_history: g.weekly_history }).eq("id", g.id);
 }
 }
 setGoals(normalized);

 const { data: habitsData } = await supabase.from("habits").select("id, title, emoji, completed_dates").eq("user_id", user.id);
 setHabits(habitsData || []);
 };

 const updateGoalLocally = (goalId: string, steps: Goal["steps"], completedAt: string | null) => {
 setGoals(previous =>
 previous.map(goal =>
 goal.id === goalId
 ? { ...goal, steps, completed_at: completedAt }
 : goal
 )
 );
 };
 const removeGoalLocally = (goalId: string) => {
 setGoals(previous => previous.filter(goal => goal.id !== goalId));
 };
 const restoreGoalLocally = (goal: Goal) => {
 setGoals(previous => [goal, ...previous]);
 };
 const weeklyGoals = goals.filter(g => g.type === "semanal");
 const longTermGoals = goals.filter(g => !g.type || g.type === "longo_prazo");
 const filteredLongTerm = useMemo(() => {
 switch (longTermFilter) {
 case "completed": return longTermGoals.filter(g => g.completed_at);
 case "ongoing": return longTermGoals.filter(g => !g.completed_at);
 default: return longTermGoals;
 }
 }, [longTermFilter, longTermGoals]);
 const sortedWeekly = useMemo(() => {
 return [...weeklyGoals].sort((a, b) => {
 return a.title.localeCompare(b.title);
 });
 }, [weeklyGoals]);
 const weeklyWithHabitCheckins = useMemo(() => {
 return sortedWeekly.map(g => {
 if (!g.linked_habit_id) return g;
 const habit = habits.find(h => h.id === g.linked_habit_id);
 if (!habit) return g;
 const monday = getMondayOfDate(new Date());
 const checkins = getLinkedHabitWeekCheckins(habit, monday);
 if (checkins.some(Boolean)) {
 const merged = checkins.map((v, i) => v || (g.days_completed_week?.[i] ?? false));
 return { ...g, days_completed_week: merged };
 }
 return g;
 });
 }, [sortedWeekly, habits]);
 const longTermTabs = [
 { value: "all", label: "Todas" },
 { value: "ongoing", label: "Em andamento" },
 { value: "completed", label: "Concluídas" },
 ] as const;

 return (
 <div style={{ paddingBottom: 40, width: "100%" }}>
 {/* Header — folha solta de caderno */}
 <div className="notebook-sheet notebook-sheet--margined"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: isMobile ? 24 : 34, flexWrap: "wrap", gap: 12 }}><div style={{ flex: 1 }}><div className="ledger-index" style={{ marginBottom: 10 }}>Metas · Livro de objetivos</div><h2 style={{ fontSize: isMobile ? 26 : 34, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", margin: 0, letterSpacing: "-0.02em" }}>O que você quer conquistar.</h2><p style={{ color: "var(--ink-muted)", fontSize: isMobile ? 12 : 14, margin: "8px 0 0", maxWidth: 420 }}>Metas anotadas a tinta: semanal, de longo prazo e tudo que fica pelo caminho.</p></div><button onClick={() => setShowModal(true)} className="ledger-btn ledger-btn--violet"><Plus size={isMobile ? 15 : 17} /> Nova Meta
 </button></div>
 </div>

 {/* ==================== WEEKLY SECTION ==================== */}
 <section style={{ marginBottom: isMobile ? 30 : 40 }}><div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}><div><div className="ledger-index" style={{ marginBottom: 8 }}>01 — Semanais</div><h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>Metas Semanais</h3></div><p style={{ fontSize: 11, color: "var(--ink-muted)", margin: 0, paddingBottom: 2 }}>Resets a cada segunda-feira</p></div>

 {weeklyGoals.length > 0 && <WeeklySummaryBar weeklyGoals={weeklyGoals} isMobile={isMobile} />}

 {weeklyWithHabitCheckins.length > 0 ? (
 <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 12 : 20 }}>
 {weeklyWithHabitCheckins.map(goal => (
 <WeeklyGoalCard
 key={goal.id}
 goal={goal}
 linkedHabits={habits}
 reloadGoals={loadGoals}
 isMobile={isMobile}
 onDelete={async () => {
 await supabase.from("goals").delete().eq("id", goal.id);
 loadGoals();
 showToast("Meta excluída", "success");
 }}
 />
 ))}
 </div>
 ) : (
 <EmptySection icon={<Zap size={22} />} title="Nenhuma meta semanal" subtitle="Crie metas que resetam toda semana para construir novos hábitos e consistência." onAction={() => setShowModal(true)} actionLabel="Criar Meta Semanal" isMobile={isMobile} />
 )}
 </section>

 {/* Divider */}
 <div className="ledger-rule" style={{ marginBottom: isMobile ? 28 : 36 }} />

 {/* ==================== LONG-TERM SECTION ==================== */}
 <section><div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}><div><div className="ledger-index" style={{ marginBottom: 8 }}>02 — Longo prazo</div><h3 style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>Metas de Longo Prazo</h3></div><div style={{ display: "flex", gap: 8 }}>
 {longTermTabs.map(f => {
 const isActive = longTermFilter === f.value;
 return (
 <button
 key={f.value}
 onClick={() => setLongTermFilter(f.value as any)}
 className={`ledger-stamp ${isActive ? "ledger-stamp--violet" : "ledger-stamp--ink"}`}
 style={{ fontSize: isMobile ? 9 : 10, padding: isMobile ? "3px 7px" : "4px 9px" }}
 >
 {f.label}
 </button>
 );
 })}
 </div></div>

 {filteredLongTerm.length > 0 ? (
 <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 12 : 20 }}>
 {filteredLongTerm.map(goal => (
 <GoalCard key={goal.id} goal={goal} reloadGoals={loadGoals} isMobile={isMobile} onGoalUpdated={updateGoalLocally} onGoalDeleted={removeGoalLocally} onGoalRestored={restoreGoalLocally} />
 ))}
 </div>
 ) : (
 <EmptySection icon={<Rocket size={22} />} title="Nenhuma meta de longo prazo" subtitle="Defina objetivos grandes e acompanhe seu progresso passo a passo." onAction={() => setShowModal(true)} actionLabel="Criar Meta" isMobile={isMobile} />
 )}
 </section>

 {/* Modal */}
 <NewGoalModal
 open={showModal}
 onClose={() => setShowModal(false)}
 reloadGoals={loadGoals}
 habits={habits}
 isPro={isPro}
 weeklyGoalsCount={weeklyGoals.length}
 longTermGoalsCount={longTermGoals.length}
 onOpenUpgrade={onOpenUpgrade ?? (() => {})}
 isMobile={isMobile}
 /></div>
 );
}
