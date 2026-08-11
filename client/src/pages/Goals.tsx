import React, { useState, useRef, useEffect, useMemo } from "react";

import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  Trophy,
  Flame,
  Sparkles,
  CalendarDays,
  Crown,
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
// CONSTANTS — Original app colors (no gradients)
// =========================

const EMOJIS = [
  "🎯", "🚀", "💪", "📚", "💰", "🏃", "🎨", "🧠", "❤️", "🌟",
  "🏆", "⚡", "🔥", "💎", "🌙", "🎵", "✈️", "🏠", "💻", "🌱",
];

const COLORS = [
  "#8B5CF6", // violet (primary — original)
  "#F59E0B", // amber
  "#10B981", // emerald
  "#EF4444", // red
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#6B7280", // gray
];

// Original app palette
const PRIMARY = "#8B5CF6";
const PRIMARY_DARK = "#7C3AED";
const PRIMARY_LIGHT = "rgba(139,92,246,0.12)";
const PRIMARY_BORDER = "rgba(139,92,246,0.3)";

const AMBER = "#F59E0B";
const AMBER_LIGHT = "rgba(245,158,11,0.12)";
const AMBER_BORDER = "rgba(245,158,11,0.3)";

const EMERALD = "#10B981";
const EMERALD_LIGHT = "rgba(16,185,129,0.12)";
const EMERALD_BORDER = "rgba(16,185,129,0.3)";

const ORANGE = "#F97316";

const NEUTRAL_BORDER = "rgba(255,255,255,0.08)";
const WHITE = "#FFFFFF";
const MUTED = "var(--muted-foreground)";
const FOREGROUND = "var(--foreground)";
const GOLD = "#FCD34D";
const GOLD_BORDER = "#f59e0b";

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
// STYLE FACTORIES (responsive)
// =========================

function S_card(isMobile: boolean): React.CSSProperties {
  return {
    background: "var(--card)",
    border: `1px solid ${NEUTRAL_BORDER}`,
    borderRadius: isMobile ? 10 : 12,
    transition: "all 0.15s ease",
  };
}

function S_btnPrimary(isMobile: boolean): React.CSSProperties {
  return {
    padding: isMobile ? "10px 16px" : "10px 20px",
    borderRadius: 10,
    background: PRIMARY,
    color: WHITE,
    fontWeight: 600,
    fontSize: isMobile ? 13 : 14,
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap" as const,
  };
}

function S_btnSecondary(isMobile: boolean): React.CSSProperties {
  return {
    padding: isMobile ? "7px 12px" : "8px 14px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.03)",
    color: MUTED,
    fontWeight: 600,
    fontSize: isMobile ? 11 : 12,
    border: `1px solid ${NEUTRAL_BORDER}`,
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap" as const,
  };
}

function S_input(isMobile: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: isMobile ? "10px 12px" : "10px 14px",
    borderRadius: 8,
    border: `1px solid ${NEUTRAL_BORDER}`,
    background: "rgba(255,255,255,0.03)",
    color: FOREGROUND,
    fontSize: isMobile ? 13 : 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    transition: "border-color 0.15s ease",
    boxSizing: "border-box" as const,
  };
}

function S_label(): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: MUTED,
    marginBottom: 6,
  };
}

function S_tag(isMobile: boolean): React.CSSProperties {
  return {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    gap: 4,
    fontSize: isMobile ? 9 : 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    borderRadius: 6,
    padding: "3px 8px",
    whiteSpace: "nowrap" as const,
  };
}

// =========================
// WEEKLY SPARKLINE
// =========================

function WeeklySparkline({ data, color }: { data: number[]; color: string }) {
  const width = 56;
  const height = 16;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / 100) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", flexShrink: 0 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
}: {
  goal: Goal;
  linkedHabits: { id: string; title: string; emoji: string; completed_dates?: string[] | null }[];
  reloadGoals: () => void;
  isMobile: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { showXP } = useXPAnimation();
  const color = goal.color;

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
  const [recordStreak] = useState(norm.goal.recordStreak);

  useEffect(() => {
    if (norm.changed) {
      setDays(norm.goal.daysCompletedWeek);
      setStreak(norm.goal.streak);
      persistWeek(norm.goal.daysCompletedWeek, norm.goal.streak);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [norm.changed]);

  const habit = linkedHabits.find(h => h.id === goal.linked_habit_id);

  const persistWeek = async (newDays: boolean[], newStreak: number, newRecordStreak?: number) => {
    const weekStart = getMondayOfDate(new Date());
    const payload: any = { days_completed_week: newDays, week_start: weekStart, streak: newStreak };
    if (newRecordStreak !== undefined) payload.record_streak = newRecordStreak;
    const { error } = await supabase.from("goals").update(payload).eq("id", goal.id);
    if (error) { showToast("Erro ao atualizar meta", "info", "❌"); return; }
    reloadGoals();
  };

  const handleToggleDay = async (dayIndex: number) => {
    const monday = new Date(`${getMondayOfDate(new Date())}T12:00:00`);
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayIndex);
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayStr = d.toISOString().slice(0, 10);
    if (dayStr > todayStr) { showToast("Você só pode marcar dias até hoje", "info", "📅"); return; }

    const newDays = days.map((v, i) => (i === dayIndex ? !v : v));
    setDays(newDays);

    const completedCount = newDays.filter(Boolean).length;
    const target = goal.target_frequency ?? 1;
    const wasHitBefore = days.filter(Boolean).length >= target;

    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) showXP(5, rect.left + rect.width / 2, rect.top);
    if (completedCount >= target && !wasHitBefore) {
      if (rect) showXP(25, rect.left + rect.width / 2, rect.top + 30);
      showToast(`Meta semanal atingida! 🔥 ${completedCount}/${target}`, "success", "🎉");
    }
    await persistWeek(newDays, streak);
  };

  const completedCount = days.filter(Boolean).length;
  const target = goal.target_frequency ?? 1;
  const hit = isWeeklyGoalHit({ ...norm.goal, daysCompletedWeek: days });
  const sparklineData = getWeeklySparkline({ ...norm.goal, daysCompletedWeek: days, weeklyHistory: norm.goal.weeklyHistory });

  const todayIdx = (() => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  })();

  return (
    <div
      ref={cardRef}
      style={{
        ...S_card(isMobile),
        padding: isMobile ? 14 : 18,
        position: "relative",
        borderColor: hit ? EMERALD_BORDER : `${color}30`,
      }}
    >
      {/* Top color bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: hit ? EMERALD : color, borderRadius: "12px 12px 0 0" }} />

      {/* Header */}
      <div style={{ display: "flex", gap: isMobile ? 10 : 12, marginBottom: 12, alignItems: "flex-start" }}>
        <div style={{ width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: "50%", background: `${color}20`, border: `2px solid ${color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 16 : 18, flexShrink: 0 }}>
          {goal.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <h3 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.title}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 3, color: ORANGE, flexShrink: 0 }}>
              <Flame size={13} />
              <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 800 }}>{streak}</span>
            </div>
          </div>
          <span style={{ ...S_tag(isMobile), color: hit ? EMERALD : color, background: hit ? EMERALD_LIGHT : `${color}15`, marginTop: 3 }}>
            {hit ? "✓ Atingida" : `${completedCount}/${target}`}
          </span>
          <p style={{ fontSize: isMobile ? 10 : 11, color: MUTED, marginTop: 3, lineHeight: 1.4, margin: 0 }}>
            {habit ? `${habit.emoji} ${habit.title}` : goal.description || `${target}x por semana`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.06)", marginBottom: 10, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (completedCount / target) * 100)}%`, height: "100%", background: hit ? EMERALD : color, borderRadius: 999, transition: "width 0.3s ease" }} />
      </div>

      {/* 7 day indicators */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: isMobile ? 2 : 3, marginBottom: 8 }}>
        {days.map((completed, i) => {
          const isToday = i === todayIdx;
          const monday = new Date(`${getMondayOfDate(new Date())}T12:00:00`);
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + i);
          const isFuture = dayDate.toISOString().slice(0, 10) > new Date().toISOString().slice(0, 10);

          return (
            <button
              key={i}
              onClick={() => handleToggleDay(i)}
              disabled={isFuture}
              aria-label={`${WEEKDAY_LABELS[i]} ${completed ? "concluído" : "pendente"}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: isMobile ? 2 : 3,
                padding: isMobile ? "4px 0" : "5px 1px",
                borderRadius: 6,
                border: completed ? `1px solid ${color}50` : isToday ? `1.5px solid ${color}` : "1px solid rgba(255,255,255,0.06)",
                background: completed ? `${color}20` : "transparent",
                opacity: isFuture ? 0.35 : 1,
                cursor: isFuture ? "not-allowed" : "pointer",
                minWidth: 0,
              }}
            >
              <div style={{ width: isMobile ? 10 : 12, height: isMobile ? 10 : 12, borderRadius: "50%", background: completed ? color : "transparent", border: `1.5px solid ${completed ? color : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {completed && <Check size={isMobile ? 6 : 7} color="white" />}
              </div>
              <span style={{ fontSize: isMobile ? 7 : 8, fontWeight: isToday ? 800 : 500, color: isToday ? color : MUTED, textTransform: "uppercase" }}>
                {WEEKDAY_LABELS[i].slice(0, 2)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Record streak + sparkline */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: `1px solid ${NEUTRAL_BORDER}` }}>
        {recordStreak > 0 ? (
          <span style={{ fontSize: 9, color: GOLD, display: "flex", alignItems: "center", gap: 3 }}>
            <Trophy size={9} /> {recordStreak}
          </span>
        ) : <span />}
        <WeeklySparkline data={sparklineData} color={hit ? EMERALD : color} />
      </div>
    </div>
  );
}

// =========================
// LONG-TERM GOAL CARD
// =========================

function GoalCard({ goal, reloadGoals, isMobile }: { goal: Goal; reloadGoals: () => void; isMobile: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const { showXP } = useXPAnimation();
  const cardRef = useRef<HTMLDivElement>(null);
  const progress = getGoalProgress(goal);
  const color = goal.color;
  const isCompleted = !!goal.completed_at;

  const handleToggleStep = async (stepId: string) => {
    const updatedSteps = goal.steps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    const allCompleted = updatedSteps.every(s => s.completed);
    await supabase.from("goals").update({ steps: updatedSteps, completed_at: allCompleted ? new Date().toISOString() : null }).eq("id", goal.id);
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) showXP(10, rect.left + rect.width / 2, rect.top);
    reloadGoals();
  };

  const handleDelete = async () => {
    await supabase.from("goals").delete().eq("id", goal.id);
    showToast("Meta deletada", "info", "🗑️");
    reloadGoals();
  };

  return (
    <div
      ref={cardRef}
      style={{
        ...S_card(isMobile),
        padding: isMobile ? 14 : 18,
        position: "relative",
        borderColor: isCompleted ? `${GOLD_BORDER}50` : `${color}30`,
      }}
    >
      {isCompleted && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GOLD_BORDER, borderRadius: "12px 12px 0 0" }} />}

      {/* Header */}
      <div style={{ display: "flex", gap: isMobile ? 10 : 12, marginBottom: 12, alignItems: "flex-start" }}>
        <div style={{ width: isMobile ? 36 : 40, height: isMobile ? 36 : 40, borderRadius: "50%", background: isCompleted ? `${EMERALD}20` : `${color}20`, border: `2px solid ${isCompleted ? EMERALD_BORDER : `${color}50`}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 16 : 18, flexShrink: 0 }}>
          {goal.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
            <h3 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.title}</h3>
            <button onClick={() => setExpanded(!expanded)} style={{ background: "transparent", border: `1px solid ${NEUTRAL_BORDER}`, borderRadius: 6, padding: 4, cursor: "pointer", color: MUTED, display: "flex", alignItems: "center", flexShrink: 0 }}>
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
          <p style={{ fontSize: isMobile ? 10 : 11, color: MUTED, lineHeight: 1.4, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{goal.description}</p>
          {isCompleted && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(245,158,11,0.12)", border: `1px solid ${AMBER_BORDER}`, borderRadius: 6, padding: "2px 8px", marginTop: 4, fontSize: 9, fontWeight: 700, color: GOLD }}>
              <Crown size={9} /> {new Date(goal.completed_at!).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 999, background: "rgba(255,255,255,0.06)", marginBottom: 12, overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: isCompleted ? EMERALD : color, borderRadius: 999, transition: "width 0.3s ease" }} />
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {goal.steps.map(step => (
            <button
              key={step.id}
              onClick={() => handleToggleStep(step.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: isMobile ? "8px 10px" : "8px 10px", borderRadius: 8, border: `1px solid ${step.completed ? EMERALD_BORDER : NEUTRAL_BORDER}`, background: step.completed ? EMERALD_LIGHT : "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "left", width: "100%" }}
            >
              <div style={{ width: 16, height: 16, borderRadius: 4, background: step.completed ? EMERALD : "transparent", border: `1.5px solid ${step.completed ? EMERALD : color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {step.completed && <Check size={9} color="white" />}
              </div>
              <span style={{ textDecoration: step.completed ? "line-through" : "none", color: step.completed ? MUTED : FOREGROUND, fontSize: isMobile ? 11 : 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.title}</span>
            </button>
          ))}
          <button onClick={handleDelete} style={{ marginTop: 4, padding: "8px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 600, fontSize: 11 }}>
            <Trash2 size={11} /> Deletar
          </button>
        </div>
      )}
    </div>
  );
}

// =========================
// EMPTY SECTION
// =========================

function EmptySection({ icon, title, subtitle, onAction, actionLabel, isMobile }: { icon: string; title: string; subtitle: string; onAction?: () => void; actionLabel?: string; isMobile: boolean }) {
  return (
    <div style={{ ...S_card(isMobile), padding: isMobile ? "24px 16px" : "32px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, borderStyle: "dashed" }}>
      <div style={{ fontSize: isMobile ? 24 : 28 }}>{icon}</div>
      <h4 style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, margin: 0 }}>{title}</h4>
      <p style={{ fontSize: isMobile ? 10 : 11, color: MUTED, maxWidth: isMobile ? 200 : 240, lineHeight: 1.5, margin: 0 }}>{subtitle}</p>
      {onAction && (
        <button onClick={onAction} style={{ ...S_btnPrimary(isMobile), marginTop: 4, padding: isMobile ? "8px 14px" : "8px 16px", fontSize: isMobile ? 11 : 12 }}>
          <Plus size={12} style={{ marginRight: 4 }} /> {actionLabel}
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
    { icon: Target, value: `${avgConsistency}%`, label: "Consistência", color: EMERALD },
    { icon: CalendarDays, value: activeCount, label: "Ativas", color: PRIMARY },
    { icon: Flame, value: totalStreak, label: "Streak", color: ORANGE },
  ];

  return (
    <div style={{ ...S_card(isMobile), padding: isMobile ? 10 : 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: isMobile ? 4 : 8, borderColor: PRIMARY_BORDER }}>
      {stats.map(({ icon: Icon, value, label, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8 }}>
          <div style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={isMobile ? 12 : 14} color={color} />
          </div>
          <div>
            <div style={{ fontSize: isMobile ? 14 : 16, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: isMobile ? 8 : 9, color: MUTED }}>{label}</div>
          </div>
        </div>
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
  onOpenUpgrade,
  isMobile,
}: {
  open: boolean;
  onClose: () => void;
  reloadGoals: () => void;
  habits: { id: string; title: string; emoji: string }[];
  isPro: boolean;
  weeklyGoalsCount: number;
  onOpenUpgrade: () => void;
  isMobile: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState(PRIMARY);
  const [deadline, setDeadline] = useState("");
  const [steps, setSteps] = useState<string[]>([""]);
  const [goalType, setGoalType] = useState<GoalType>("longo_prazo");
  const [targetFrequency, setTargetFrequency] = useState<number>(4);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const frequencyChips = COMMON_FREQUENCIES;

  const handleSubmit = async () => {
    if (!title.trim()) { showToast("Digite o nome da meta", "info", "⚠️"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { showToast("Usuário não encontrado", "info", "❌"); return; }

    if (goalType === "semanal" && !isPro && weeklyGoalsCount >= FREE_LIMITS.weeklyGoals) {
      showToast(`O plano Free permite até ${FREE_LIMITS.weeklyGoals} metas semanais simultâneas`, "info");
      onOpenUpgrade();
      return;
    }

    if (goalType === "semanal") {
      const { error } = await supabase.from("goals").insert({
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
      if (error) { console.log(error); showToast("Erro ao criar meta", "info", "❌"); return; }
      showToast("Meta semanal criada!", "success", "🔥");
    } else {
      const validSteps = steps.filter(s => s.trim()).map(s => ({ id: crypto.randomUUID(), title: s, completed: false }));
      const { error } = await supabase.from("goals").insert({
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
      if (error) { console.log(error); showToast("Erro ao criar meta", "info", "❌"); return; }
      showToast("Meta criada com sucesso!", "success", "🎯");
    }

    onClose();
    await reloadGoals();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova Meta" maxWidth={isMobile ? "100%" : "480px"}>
      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 14 }}>
        {/* Type selector */}
        <div>
          <p style={S_label()}>Tipo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {([
              { value: "longo_prazo", label: "Longo prazo", icon: "🎯" },
              { value: "semanal", label: "Semanal", icon: "🔥" },
            ] as const).map(t => (
              <button
                key={t.value}
                onClick={() => setGoalType(t.value)}
                style={{
                  padding: isMobile ? 10 : 12,
                  borderRadius: 8,
                  border: goalType === t.value ? `2px solid ${PRIMARY}` : `1px solid ${NEUTRAL_BORDER}`,
                  background: goalType === t.value ? PRIMARY_LIGHT : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: isMobile ? 18 : 20 }}>{t.icon}</span>
                <span style={{ fontWeight: 700, fontSize: isMobile ? 11 : 12, color: goalType === t.value ? PRIMARY : FOREGROUND }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p style={S_label()}>Nome</p>
          <input placeholder="Ex: Ler 1 livro por mês" value={title} onChange={e => setTitle(e.target.value)} style={S_input(isMobile)} />
        </div>

        <div>
          <p style={S_label()}>Descrição (opcional)</p>
          <textarea placeholder="Detalhes..." value={description} onChange={e => setDescription(e.target.value)} style={{ ...S_input(isMobile), minHeight: 44, resize: "vertical" }} />
        </div>

        {/* Emoji */}
        <div>
          <p style={S_label()}>Ícone</p>
          <div style={{ display: "flex", gap: isMobile ? 3 : 4, flexWrap: "wrap" }}>
            {EMOJIS.map(e => (
              <button key={e} type="button" onClick={() => setEmoji(e)} style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 8, border: emoji === e ? `2px solid ${color}` : `1px solid ${NEUTRAL_BORDER}`, background: emoji === e ? `${color}15` : "rgba(255,255,255,0.03)", cursor: "pointer", fontSize: isMobile ? 13 : 15, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <p style={S_label()}>Cor</p>
          <div style={{ display: "flex", gap: isMobile ? 5 : 6, flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{ width: isMobile ? 24 : 28, height: isMobile ? 24 : 28, borderRadius: "50%", border: color === c ? "2px solid white" : "2px solid transparent", background: c, cursor: "pointer", transform: color === c ? "scale(1.15)" : "scale(1)" }} />
            ))}
          </div>
        </div>

        {/* Weekly-specific */}
        {goalType === "semanal" ? (
          <>
            <div>
              <p style={S_label()}>Frequência por semana</p>
              <div style={{ display: "flex", gap: isMobile ? 3 : 4, flexWrap: "wrap" }}>
                {frequencyChips.map(chip => (
                  <button key={chip.value} type="button" onClick={() => setTargetFrequency(chip.value)} style={{ ...S_btnSecondary(isMobile), border: targetFrequency === chip.value ? `2px solid ${PRIMARY}` : `1px solid ${NEUTRAL_BORDER}`, color: targetFrequency === chip.value ? PRIMARY : MUTED, background: targetFrequency === chip.value ? PRIMARY_LIGHT : "rgba(255,255,255,0.03)" }}>
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
            {habits.length > 0 && (
              <div>
                <p style={S_label()}>Vincular hábito</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? 3 : 4 }}>
                  <button type="button" onClick={() => setSelectedHabitId(null)} style={{ ...S_btnSecondary(isMobile), border: selectedHabitId === null ? `2px solid ${PRIMARY}` : `1px solid ${NEUTRAL_BORDER}`, color: selectedHabitId === null ? PRIMARY : MUTED }}>Manual</button>
                  {habits.map(h => (
                    <button key={h.id} type="button" onClick={() => setSelectedHabitId(h.id)} style={{ ...S_btnSecondary(isMobile), border: selectedHabitId === h.id ? `2px solid ${PRIMARY}` : `1px solid ${NEUTRAL_BORDER}`, color: selectedHabitId === h.id ? PRIMARY : MUTED }}>
                      {h.emoji} {h.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <p style={S_label()}>Prazo (opcional)</p>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={S_input(isMobile)} />
          </div>
        )}

        {/* Steps */}
        {goalType === "longo_prazo" && (
          <div>
            <p style={S_label()}>Etapas</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {steps.map((step, i) => (
                <input key={i} placeholder={`Etapa ${i + 1}`} value={step} onChange={e => setSteps(prev => { const u = [...prev]; u[i] = e.target.value; return u; })} style={S_input(isMobile)} />
              ))}
              <button type="button" onClick={() => setSteps([...steps, ""])} style={{ ...S_btnSecondary(isMobile), color: PRIMARY, border: `1px solid ${PRIMARY_BORDER}` }}>
                <Plus size={12} style={{ marginRight: 4 }} /> Adicionar etapa
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} style={{ ...S_btnPrimary(isMobile), display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Sparkles size={14} />
          {goalType === "semanal" ? "Criar Meta Semanal" : "Criar Meta"}
        </button>
      </div>
    </Modal>
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
      const aHit = (a.days_completed_week?.filter(Boolean).length ?? 0) >= (a.target_frequency ?? 1);
      const bHit = (b.days_completed_week?.filter(Boolean).length ?? 0) >= (b.target_frequency ?? 1);
      if (aHit !== bHit) return aHit ? 1 : -1;
      const aRem = (a.target_frequency ?? 1) - (a.days_completed_week?.filter(Boolean).length ?? 0);
      const bRem = (b.target_frequency ?? 1) - (b.days_completed_week?.filter(Boolean).length ?? 0);
      return aRem - bRem;
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
    { value: "all", label: "Todas", icon: Sparkles },
    { value: "ongoing", label: "Em andamento", icon: Target },
    { value: "completed", label: "Concluídas", icon: Trophy },
  ] as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 18 : 24, maxWidth: 900 }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: isMobile ? 10 : 12 }}>
        <h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <Target size={isMobile ? 18 : 20} color={PRIMARY} />
          Metas
        </h2>
        <button onClick={() => setShowModal(true)} style={S_btnPrimary(isMobile)}>
          <Plus size={14} style={{ marginRight: 4 }} /> Nova Meta
        </button>
      </div>

      {/* ==================== WEEKLY SECTION ==================== */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: PRIMARY_LIGHT, border: `1px solid ${PRIMARY_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={14} color={PRIMARY} />
          </div>
          <div>
            <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, margin: 0 }}>Metas Semanais</h3>
            <p style={{ fontSize: isMobile ? 10 : 11, color: MUTED, margin: 0 }}>Consistência — reset toda segunda</p>
          </div>
        </div>

        {weeklyGoals.length > 0 && <WeeklySummaryBar weeklyGoals={weeklyGoals} isMobile={isMobile} />}

        {weeklyWithHabitCheckins.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: isMobile ? 10 : 12, marginTop: 10 }}>
            {weeklyWithHabitCheckins.map(goal => (
              <WeeklyGoalCard key={goal.id} goal={goal} linkedHabits={habits} reloadGoals={loadGoals} isMobile={isMobile} />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <EmptySection icon="🔥" title="Nenhuma meta semanal" subtitle="Crie metas semanais para construir consistência." onAction={() => setShowModal(true)} actionLabel="Criar meta semanal" isMobile={isMobile} />
          </div>
        )}
      </section>

      {/* Divider */}
      <div style={{ height: 1, background: NEUTRAL_BORDER }} />

      {/* ==================== LONG-TERM SECTION ==================== */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(139,92,246,0.12)", border: `1px solid ${PRIMARY_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Rocket size={14} color={PRIMARY} />
            </div>
            <div>
              <h3 style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, margin: 0 }}>Metas de Longo Prazo</h3>
              <p style={{ fontSize: isMobile ? 10 : 11, color: MUTED, margin: 0 }}>Objetivos com etapas e prazos</p>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 2, background: "rgba(255,255,255,0.03)", border: `1px solid ${NEUTRAL_BORDER}`, borderRadius: 8, padding: 2 }}>
            {longTermTabs.map(f => {
              const isActive = longTermFilter === f.value;
              const Icon = f.icon;
              return (
                <button
                  key={f.value}
                  onClick={() => setLongTermFilter(f.value as any)}
                  style={{
                    padding: isMobile ? "5px 8px" : "6px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: isActive ? PRIMARY : "transparent",
                    color: isActive ? WHITE : MUTED,
                    fontWeight: 600,
                    fontSize: isMobile ? 9 : 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Icon size={isMobile ? 10 : 11} />
                  {isMobile ? "" : f.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredLongTerm.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 10 : 12, marginTop: 10 }}>
            {filteredLongTerm.map(goal => (
              <GoalCard key={goal.id} goal={goal} reloadGoals={loadGoals} isMobile={isMobile} />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <EmptySection icon="🚀" title="Nenhuma meta de longo prazo" subtitle="Defina objetivos maiores com etapas." onAction={() => setShowModal(true)} actionLabel="Criar meta" isMobile={isMobile} />
          </div>
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
        onOpenUpgrade={onOpenUpgrade ?? (() => {})}
        isMobile={isMobile}
      />
    </div>
  );
}
