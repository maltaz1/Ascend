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
// CONSTANTS & THEME
// =========================

const EMOJIS = [
  "🎯", "🚀", "💪", "📚", "💰", "🏃", "🎨", "🧠", "❤️", "🌟",
  "🏆", "⚡", "🔥", "💎", "🌙", "🎵", "✈️", "🏠", "💻", "🌱",
];

const COLORS = [
  "#8B5CF6", // violet
  "#F59E0B", // amber
  "#10B981", // emerald
  "#EF4444", // red
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#6B7280", // gray
];

const COLOR_MAP: Record<string, { gradient: string; glow: string; light: string; dark: string }> = {
  "#F59E0B": { gradient: "linear-gradient(135deg, #F59E0B, #FCD34D)", glow: "rgba(245,158,11,0.25)", light: "rgba(245,158,11,0.08)", dark: "rgba(245,158,11,0.15)" },
  "#A855F7": { gradient: "linear-gradient(135deg, #A855F7, #C084FC)", glow: "rgba(168,85,247,0.25)", light: "rgba(168,85,247,0.08)", dark: "rgba(168,85,247,0.15)" },
  "#10B981": { gradient: "linear-gradient(135deg, #10B981, #34D399)", glow: "rgba(16,185,129,0.25)", light: "rgba(16,185,129,0.08)", dark: "rgba(16,185,129,0.15)" },
  "#8B5CF6": { gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)", glow: "rgba(139,92,246,0.25)", light: "rgba(139,92,246,0.08)", dark: "rgba(139,92,246,0.15)" },
  "#EF4444": { gradient: "linear-gradient(135deg, #EF4444, #F87171)", glow: "rgba(239,68,68,0.25)", light: "rgba(239,68,68,0.08)", dark: "rgba(239,68,68,0.15)" },
  "#EC4899": { gradient: "linear-gradient(135deg, #EC4899, #F472B6)", glow: "rgba(236,72,153,0.25)", light: "rgba(236,72,153,0.08)", dark: "rgba(236,72,153,0.15)" },
  "#06B6D4": { gradient: "linear-gradient(135deg, #06B6D4, #22D3EE)", glow: "rgba(6,182,212,0.25)", light: "rgba(6,182,212,0.08)", dark: "rgba(6,182,212,0.15)" },
  "#84CC16": { gradient: "linear-gradient(135deg, #84CC16, #A3E635)", glow: "rgba(132,204,22,0.25)", light: "rgba(132,204,22,0.08)", dark: "rgba(132,204,22,0.15)" },
  "#6B7280": { gradient: "linear-gradient(135deg, #6B7280, #9CA3AF)", glow: "rgba(107,114,128,0.25)", light: "rgba(107,114,128,0.08)", dark: "rgba(107,114,128,0.15)" },
};

function getGoalColors(hex: string) {
  return COLOR_MAP[hex] || {
    gradient: `linear-gradient(135deg, ${hex}, ${hex}CC)`,
    glow: `${hex}40`,
    light: `${hex}15`,
    dark: `${hex}25`
  };
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
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
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
  const colorInfo = getGoalColors(goal.color);
  const hit = isWeeklyGoalHit(goalToWeekly(goal));

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
    if (dayStr > todayStr) { showToast("Somente dias passados ou hoje", "info", "📅"); return; }

    const newDays = days.map((v, i) => (i === dayIndex ? !v : v));
    setDays(newDays);

    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) showXP(5, rect.left + rect.width / 2, rect.top);
    await persistWeek(newDays, streak);
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
      style={{
        background: hit ? "linear-gradient(145deg, rgba(16,185,129,0.06), var(--card))" : `linear-gradient(145deg, ${colorInfo.light}, var(--card))`,
        border: `1px solid ${hit ? "rgba(16,185,129,0.25)" : colorInfo.glow}`,
        borderRadius: isMobile ? 16 : 20,
        padding: isMobile ? 14 : 20,
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: hit ? "linear-gradient(90deg, #10B981, #34D399)" : colorInfo.gradient, borderRadius: "20px 20px 0 0", opacity: 0.8 }} />

      <div style={{ display: "flex", gap: isMobile ? 10 : 12, marginBottom: 14, alignItems: "flex-start" }}>
        <div style={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: "50%", background: `linear-gradient(135deg, ${goal.color}, ${goal.color}CC)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 22, boxShadow: `0 4px 16px ${goal.color}40`, flexShrink: 0 }}>
          {goal.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: hit ? "#10B981" : goal.color, background: hit ? "rgba(16,185,129,0.1)" : colorInfo.light, padding: "2px 8px", borderRadius: 6 }}>
              {hit ? "Atingida" : `${completedCount}/${target}`}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 2, color: "#F97316" }}>
              <Flame size={12} fill="#F97316" />
              <span style={{ fontSize: 12, fontWeight: 800 }}>{streak}</span>
            </div>
            {habit && (
              <span style={{ fontSize: 10, color: "var(--muted-foreground)", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <CalendarDays size={10} /> {habit.emoji} {habit.title}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", marginBottom: 14, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (completedCount / target) * 100)}%`, height: "100%", background: hit ? "linear-gradient(90deg, #10B981, #34D399)" : colorInfo.gradient, borderRadius: 999, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: isMobile ? 3 : 4, marginBottom: 12 }}>
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
                borderRadius: 8,
                border: completed ? `1px solid ${goal.color}80` : isToday ? `2px solid ${goal.color}` : "1px solid rgba(255,255,255,0.06)",
                background: completed ? `${goal.color}20` : "transparent",
                opacity: isFuture ? 0.3 : 1,
                cursor: isFuture ? "not-allowed" : "pointer",
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: completed ? goal.color : "transparent", border: `1.5px solid ${completed ? goal.color : "rgba(255,255,255,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {completed && <Check size={8} color="white" />}
              </div>
              <span style={{ fontSize: 8, fontWeight: isToday ? 800 : 500, color: isToday ? goal.color : "var(--muted-foreground)" }}>{WEEKDAY_LABELS[i].slice(0, 2)}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <span style={{ fontSize: 10, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
          {norm.goal.recordStreak > 0 && <><Trophy size={10} color="#FCD34D" /> Recorde: {norm.goal.recordStreak}</>}
        </span>
        <WeeklySparkline data={sparklineData} color={hit ? "#10B981" : goal.color} />
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
  const colorInfo = getGoalColors(goal.color);
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
    if (!confirm("Deletar esta meta?")) return;
    await supabase.from("goals").delete().eq("id", goal.id);
    reloadGoals();
  };

  return (
    <div
      ref={cardRef}
      style={{
        background: isCompleted ? "linear-gradient(145deg, rgba(245,158,11,0.06), var(--card))" : `linear-gradient(145deg, ${colorInfo.light}, var(--card))`,
        border: `1px solid ${isCompleted ? "rgba(245,158,11,0.25)" : colorInfo.glow}`,
        borderRadius: isMobile ? 16 : 20,
        padding: isMobile ? 14 : 20,
        position: "relative",
        transition: "all 0.2s ease",
      }}
    >
      {isCompleted && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #F59E0B, #FCD34D)", borderRadius: "20px 20px 0 0", opacity: 0.8 }} />}

      <div style={{ display: "flex", gap: isMobile ? 10 : 12, marginBottom: 14, alignItems: "flex-start" }}>
        <div style={{ width: isMobile ? 40 : 48, height: isMobile ? 40 : 48, borderRadius: "50%", background: isCompleted ? "linear-gradient(135deg, #10B981, #34D399)" : `linear-gradient(135deg, ${goal.color}, ${goal.color}CC)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 18 : 22, boxShadow: isCompleted ? "0 4px 16px rgba(16,185,129,0.3)" : `0 4px 16px ${goal.color}30`, flexShrink: 0 }}>
          {goal.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h3 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal.title}</h3>
            <button onClick={() => setExpanded(!expanded)} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: 4, cursor: "pointer", color: "var(--muted-foreground)" }}>
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          <p style={{ fontSize: isMobile ? 11 : 12, color: "var(--muted-foreground)", marginTop: 4, lineHeight: 1.4, margin: 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{goal.description}</p>
        </div>
      </div>

      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", marginBottom: 14, overflow: "hidden" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: isCompleted ? "linear-gradient(90deg, #10B981, #34D399)" : colorInfo.gradient, borderRadius: 999, transition: "width 0.4s ease" }} />
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {goal.steps.map(step => (
            <button
              key={step.id}
              onClick={() => handleToggleStep(step.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${step.completed ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)"}`, background: step.completed ? "rgba(16,185,129,0.05)" : "rgba(255,255,255,0.02)", cursor: "pointer", textAlign: "left" }}
            >
              <div style={{ width: 18, height: 18, borderRadius: 5, background: step.completed ? "#10B981" : "transparent", border: `2px solid ${step.completed ? "#10B981" : goal.color}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {step.completed && <Check size={10} color="white" />}
              </div>
              <span style={{ textDecoration: step.completed ? "line-through" : "none", color: step.completed ? "var(--muted-foreground)" : "var(--foreground)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.title}</span>
            </button>
          ))}
          <button onClick={handleDelete} style={{ marginTop: 6, padding: "8px", borderRadius: 10, border: "none", background: "rgba(239,68,68,0.1)", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 600, fontSize: 12 }}>
            <Trash2 size={14} /> Deletar Meta
          </button>
        </div>
      )}
    </div>
  );
}

// =========================
// EMPTY SECTION
// =========================

function EmptySection({ icon, title, subtitle, onAction, actionLabel, isMobile }: { icon: React.ReactNode; title: string; subtitle: string; onAction?: () => void; actionLabel?: string; isMobile: boolean }) {
  return (
    <div style={{ padding: isMobile ? "30px 20px" : "50px 20px", textAlign: "center", background: "rgba(255,255,255,0.02)", borderRadius: 24, border: "2px dashed rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: isMobile ? 32 : 48, opacity: 0.5 }}>{icon}</div>
      <h4 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, margin: 0 }}>{title}</h4>
      <p style={{ fontSize: isMobile ? 12 : 14, color: "var(--muted-foreground)", maxWidth: 300, lineHeight: 1.5, margin: 0 }}>{subtitle}</p>
      {onAction && (
        <button onClick={onAction} style={{ marginTop: 8, padding: isMobile ? "8px 16px" : "10px 20px", borderRadius: 10, background: "#8B5CF6", color: "white", fontWeight: 600, fontSize: isMobile ? 12 : 13, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(139,92,246,0.2)" }}>
          <Plus size={isMobile ? 14 : 16} /> {actionLabel}
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
    { icon: Target, value: `${avgConsistency}%`, label: "Consistência", color: "#10B981" },
    { icon: CalendarDays, value: activeCount, label: "Ativas", color: "#8B5CF6" },
    { icon: Flame, value: totalStreak, label: "Streak Total", color: "#F97316" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: isMobile ? 8 : 16, marginBottom: 20 }}>
      {stats.map(({ icon: Icon, value, label, color }) => (
        <div key={label} style={{ background: "var(--card)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: isMobile ? 10 : 16, display: "flex", alignItems: "center", gap: isMobile ? 8 : 12 }}>
          <div style={{ width: isMobile ? 30 : 40, height: isMobile ? 30 : 40, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={isMobile ? 16 : 20} color={color} />
          </div>
          <div>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: "var(--foreground)" }}>{value}</div>
            <div style={{ fontSize: isMobile ? 9 : 11, color: "var(--muted-foreground)" }}>{label}</div>
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
  const [color, setColor] = useState("#8B5CF6");
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
    <Modal open={open} onClose={onClose} title="Nova Meta" maxWidth={isMobile ? "100%" : "480px"}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>Tipo de Meta</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {([
              { value: "longo_prazo", label: "Longo Prazo", icon: "🎯" },
              { value: "semanal", label: "Semanal", icon: "🔥" },
            ] as const).map(t => (
              <button
                key={t.value}
                onClick={() => setGoalType(t.value)}
                style={{
                  padding: "12px",
                  borderRadius: 12,
                  border: goalType === t.value ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.05)",
                  background: goalType === t.value ? `${color}15` : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ fontSize: 20 }}>{t.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: goalType === t.value ? color : "var(--foreground)" }}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>Emoji</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: emoji === e ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.05)",
                  background: emoji === e ? `${color}15` : "rgba(255,255,255,0.02)",
                  fontSize: 18,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                {e}
              </button>
            ))}
          </div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>Título</label>
          <input placeholder="Ex: Aprender React" value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", color: "white", outline: "none", boxSizing: "border-box" }} />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>Cor</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 30, height: 30, borderRadius: "50%", border: color === c ? "2px solid white" : "none", background: c, cursor: "pointer", transform: color === c ? "scale(1.1)" : "scale(1)", transition: "all 0.2s ease" }} />
            ))}
          </div>
        </div>

        {goalType === "semanal" ? (
          <>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>Frequência (vezes por semana)</label>
              <div style={{ display: "flex", gap: 6 }}>
                {COMMON_FREQUENCIES.map(f => (
                  <button key={f.value} type="button" onClick={() => setTargetFrequency(f.value)} style={{ padding: "8px 12px", borderRadius: 10, border: targetFrequency === f.value ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.05)", background: targetFrequency === f.value ? `${color}15` : "rgba(255,255,255,0.02)", color: "white", cursor: "pointer" }}>{f.label}</button>
                ))}
              </div>
            </div>
            {habits.length > 0 && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>Vincular a um Hábito (Opcional)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedHabitId(null)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: selectedHabitId === null ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.05)",
                      background: selectedHabitId === null ? `${color}15` : "rgba(255,255,255,0.02)",
                      color: "white",
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
                        setEmoji(h.emoji);
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: selectedHabitId === h.id ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.05)",
                        background: selectedHabitId === h.id ? `${color}15` : "rgba(255,255,255,0.02)",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      <span>{h.emoji}</span>
                      <span>{h.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", marginBottom: 6, display: "block" }}>Etapas</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((step, i) => (
                <input key={i} placeholder={`Etapa ${i + 1}`} value={step} onChange={e => setSteps(prev => { const u = [...prev]; u[i] = e.target.value; return u; })} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.02)", color: "white", outline: "none", boxSizing: "border-box" }} />
              ))}
              <button onClick={() => setSteps([...steps, ""])} style={{ padding: "8px", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.1)", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer", fontSize: 12 }}>+ Adicionar Etapa</button>
            </div>
          </div>
        )}

        <button onClick={handleSubmit} style={{ marginTop: 10, padding: "14px", borderRadius: 12, background: "#8B5CF6", color: "white", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(139,92,246,0.2)" }}>Criar Meta</button>
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
      const aHit = isWeeklyGoalHit(goalToWeekly(a));
      const bHit = isWeeklyGoalHit(goalToWeekly(b));
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
    <div style={{ paddingBottom: 40, width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? 20 : 30, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Target size={isMobile ? 24 : 32} color="#8B5CF6" />
            Metas
          </h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: isMobile ? 12 : 14, margin: "4px 0 0" }}>Transforme objetivos em conquistas diárias</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: isMobile ? "10px 18px" : "12px 24px", borderRadius: 14, background: "#8B5CF6", color: "white", fontWeight: 700, fontSize: isMobile ? 13 : 14, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 12px rgba(139,92,246,0.2)" }}>
          <Plus size={isMobile ? 16 : 18} /> Nova Meta
        </button>
      </div>

      {/* ==================== WEEKLY SECTION ==================== */}
      <section style={{ marginBottom: isMobile ? 30 : 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={18} color="#8B5CF6" />
          </div>
          <div>
            <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, margin: 0 }}>Metas Semanais</h3>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>Foco e consistência — resets a cada segunda-feira</p>
          </div>
        </div>

        {weeklyGoals.length > 0 && <WeeklySummaryBar weeklyGoals={weeklyGoals} isMobile={isMobile} />}

        {weeklyWithHabitCheckins.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 12 : 20 }}>
            {weeklyWithHabitCheckins.map(goal => (
              <WeeklyGoalCard key={goal.id} goal={goal} linkedHabits={habits} reloadGoals={loadGoals} isMobile={isMobile} />
            ))}
          </div>
        ) : (
          <EmptySection icon={<Zap size={48} />} title="Nenhuma meta semanal" subtitle="Crie metas que resetam toda semana para construir novos hábitos e consistência." onAction={() => setShowModal(true)} actionLabel="Criar Meta Semanal" isMobile={isMobile} />
        )}
      </section>

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.05)", marginBottom: isMobile ? 30 : 40 }} />

      {/* ==================== LONG-TERM SECTION ==================== */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Rocket size={18} color="#F59E0B" />
            </div>
            <div>
              <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, margin: 0 }}>Metas de Longo Prazo</h3>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>Objetivos maiores divididos em etapas</p>
            </div>
          </div>
          
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 12, padding: 4 }}>
            {longTermTabs.map(f => {
              const isActive = longTermFilter === f.value;
              const Icon = f.icon;
              return (
                <button
                  key={f.value}
                  onClick={() => setLongTermFilter(f.value as any)}
                  style={{
                    padding: isMobile ? "6px 10px" : "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background: isActive ? "#8B5CF6" : "transparent",
                    color: isActive ? "white" : "var(--muted-foreground)",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.2s ease",
                  }}
                >
                  <Icon size={14} />
                  {isMobile ? "" : f.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredLongTerm.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 12 : 20 }}>
            {filteredLongTerm.map(goal => (
              <GoalCard key={goal.id} goal={goal} reloadGoals={loadGoals} isMobile={isMobile} />
            ))}
          </div>
        ) : (
          <EmptySection icon={<Rocket size={48} />} title="Nenhuma meta de longo prazo" subtitle="Defina objetivos grandes e acompanhe seu progresso passo a passo." onAction={() => setShowModal(true)} actionLabel="Criar Meta" isMobile={isMobile} />
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
