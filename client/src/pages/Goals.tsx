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
  TrendingUp,
  Crown,
} from "lucide-react";

import { useXPAnimation } from "@/hooks/useStore";

import { CircularProgress } from "@/components/ui/CircularProgress";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/FlowToast";

import { supabase } from "@/lib/supabase";
import { FREE_LIMITS } from "@/config/planLimits";

import {
  WEEKDAY_LABELS,
  COMMON_FREQUENCIES,
  getMondayOfDate,
  normalizeWeeklyGoalWeek,
  getWeeklyCompletedCount,
  getWeeklyRemaining,
  isWeeklyGoalHit,
  getWeeklyConsistency,
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

function generateId() {
  return crypto.randomUUID();
}

function getGoalProgress(goal: Goal) {
  if (!goal.steps || goal.steps.length === 0) {
    return 0;
  }

  const completed = goal.steps.filter(s => s.completed).length;

  return (completed / goal.steps.length) * 100;
}

/** Normaliza as metas semanais para a semana atual (reseta em segunda-feira) */
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
// CONSTANTS
// =========================

const EMOJIS = [
  "🎯",
  "🚀",
  "💪",
  "📚",
  "💰",
  "🏃",
  "🎨",
  "🧠",
  "❤️",
  "🌟",
  "🏆",
  "⚡",
  "🔥",
  "💎",
  "🌙",
  "🎵",
  "✈️",
  "🏠",
  "💻",
  "🌱",
];

const COLORS = [
  "#F59E0B",
  "#A855F7",
  "#10B981",
  "#8B5CF6",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const GOAL_COLORS_MAP: Record<
  string,
  {
    gradient: string;
    glow: string;
    light: string;
    dark: string;
  }
> = {
  "#F59E0B": {
    gradient: "linear-gradient(135deg, #F59E0B, #FCD34D)",
    glow: "rgba(245,158,11,0.25)",
    light: "rgba(245,158,11,0.06)",
    dark: "rgba(245,158,11,0.15)",
  },
  "#A855F7": {
    gradient: "linear-gradient(135deg, #A855F7, #C084FC)",
    glow: "rgba(168,85,247,0.25)",
    light: "rgba(168,85,247,0.06)",
    dark: "rgba(168,85,247,0.15)",
  },
  "#10B981": {
    gradient: "linear-gradient(135deg, #10B981, #34D399)",
    glow: "rgba(16,185,129,0.25)",
    light: "rgba(16,185,129,0.06)",
    dark: "rgba(16,185,129,0.15)",
  },
  "#8B5CF6": {
    gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
    glow: "rgba(139,92,246,0.25)",
    light: "rgba(139,92,246,0.06)",
    dark: "rgba(139,92,246,0.15)",
  },
  "#EF4444": {
    gradient: "linear-gradient(135deg, #EF4444, #F87171)",
    glow: "rgba(239,68,68,0.25)",
    light: "rgba(239,68,68,0.06)",
    dark: "rgba(239,68,68,0.15)",
  },
  "#EC4899": {
    gradient: "linear-gradient(135deg, #EC4899, #F472B6)",
    glow: "rgba(236,72,153,0.25)",
    light: "rgba(236,72,153,0.06)",
    dark: "rgba(236,72,153,0.15)",
  },
  "#06B6D4": {
    gradient: "linear-gradient(135deg, #06B6D4, #22D3EE)",
    glow: "rgba(6,182,212,0.25)",
    light: "rgba(6,182,212,0.06)",
    dark: "rgba(6,182,212,0.15)",
  },
  "#84CC16": {
    gradient: "linear-gradient(135deg, #84CC16, #A3E635)",
    glow: "rgba(132,204,22,0.25)",
    light: "rgba(132,204,22,0.06)",
    dark: "rgba(132,204,22,0.15)",
  },
};

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
// STYLE OBJECTS (centralizado para o redesign)
// =========================

const S = {
  glassCard: {
    background: "var(--card)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    backdropFilter: "blur(20px)",
    boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  } as React.CSSProperties,
  glassCardHover: {
    borderColor: "rgba(255,255,255,0.15)",
    boxShadow: "0 8px 48px rgba(0,0,0,0.2)",
    transform: "translateY(-2px)",
  } as React.CSSProperties,
  tag: {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    borderRadius: 999,
    padding: "4px 10px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--foreground)",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: "var(--muted-foreground)",
    marginBottom: 8,
  } as React.CSSProperties,
};

// =========================
// WEEKLY SPARKLINE
// =========================

function WeeklySparkline({ data, color }: { data: number[]; color: string }) {
  const width = 72;
  const height = 22;
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / 100) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block" }}
      aria-label="Consistência das últimas 4 semanas"
    >
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * width;
        const y = height - (v / 100) * height;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2"
            fill={color}
            opacity={i === data.length - 1 ? 1 : 0.5}
          />
        );
      })}
    </svg>
  );
}

// =========================
// WEEKLY GOAL CARD — Redesign
// =========================

function WeeklyGoalCard({
  goal,
  linkedHabits,
  reloadGoals,
}: {
  goal: Goal;
  linkedHabits: { id: string; title: string; emoji: string; completed_dates?: string[] | null }[];
  reloadGoals: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { showXP } = useXPAnimation();

  const colorInfo = GOAL_COLORS_MAP[goal.color] || GOAL_COLORS_MAP["#A855F7"];

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

  const persistWeek = async (
    newDays: boolean[],
    newStreak: number,
    newRecordStreak?: number
  ) => {
    const weekStart = getMondayOfDate(new Date());
    const payload: any = {
      days_completed_week: newDays,
      week_start: weekStart,
      streak: newStreak,
    };
    if (newRecordStreak !== undefined) payload.record_streak = newRecordStreak;

    const { error } = await supabase
      .from("goals")
      .update(payload)
      .eq("id", goal.id);

    if (error) {
      showToast("Erro ao atualizar meta", "info", "❌");
      return;
    }

    reloadGoals();
  };

  const handleToggleDay = async (dayIndex: number) => {
    const monday = new Date(`${getMondayOfDate(new Date())}T12:00:00`);
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayIndex);
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayStr = d.toISOString().slice(0, 10);
    if (dayStr > todayStr) {
      showToast("Você só pode marcar dias até hoje", "info", "📅");
      return;
    }

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
  const hit = isWeeklyGoalHit({
    ...norm.goal,
    daysCompletedWeek: days,
  });
  const sparklineData = getWeeklySparkline({
    ...norm.goal,
    daysCompletedWeek: days,
    weeklyHistory: norm.goal.weeklyHistory,
  });

  const todayIdx = (() => {
    const d = new Date();
    const jsDay = d.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  })();

  return (
    <div
      ref={cardRef}
      className="animate-fade-in"
      style={{
        ...S.glassCard,
        padding: 24,
        position: "relative",
        overflow: "hidden",
        background: hit
          ? `linear-gradient(145deg, rgba(16,185,129,0.08), var(--card))`
          : `linear-gradient(145deg, ${colorInfo.light}, var(--card))`,
        borderColor: hit ? "rgba(16,185,129,0.3)" : `rgba(${hexToRgb(goal.color)},0.2)`,
        boxShadow: hit
          ? `0 4px 32px rgba(16,185,129,0.12)`
          : `0 4px 32px rgba(0,0,0,0.08)`,
      }}
    >
      {/* Glow top accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: hit
            ? "linear-gradient(90deg, #10B981, #34D399)"
            : colorInfo.gradient,
          borderRadius: "20px 20px 0 0",
          opacity: 0.8,
        }}
      />

      {/* Header */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${goal.color}, ${goal.color}CC)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            boxShadow: `0 4px 16px ${goal.color}40`,
            flexShrink: 0,
          }}
        >
          {goal.emoji}
        </div>

        {/* Title + tag */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              marginBottom: 6,
              fontFamily: "'Space Grotesk', sans-serif",
              color: "var(--foreground)",
            }}
          >
            {goal.title}
          </h3>
          <span
            style={{
              ...S.tag,
              color: hit ? "#10B981" : goal.color,
              background: hit ? "rgba(16,185,129,0.12)" : `${goal.color}15`,
              border: `1px solid ${hit ? "rgba(16,185,129,0.3)" : `${goal.color}35`}`,
            }}
          >
            {hit ? "✓ Meta atingida" : `${completedCount}/${target} esta semana`}
          </span>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            {habit
              ? `🔗 ${habit.emoji} ${habit.title}`
              : goal.description || `${target}x por semana`}
          </p>
        </div>

        {/* Streak badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(249,115,22,0.1)",
              border: "1px solid rgba(249,115,22,0.25)",
              borderRadius: 12,
              padding: "6px 10px",
            }}
          >
            <Flame size={16} color="#F97316" />
            <span style={{ fontSize: 15, fontWeight: 800, color: "#F97316" }}>
              {streak}
            </span>
          </div>
          {recordStreak > 0 && (
            <span
              style={{
                fontSize: 10,
                color: "#FCD34D",
                display: "flex",
                alignItems: "center",
                gap: 3,
                marginTop: 2,
              }}
            >
              <Trophy size={10} /> recorde {recordStreak}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          marginBottom: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, (completedCount / target) * 100)}%`,
            height: "100%",
            background: hit ? "linear-gradient(90deg, #10B981, #34D399)" : colorInfo.gradient,
            borderRadius: 999,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* 7 day indicators */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 5,
          marginBottom: 16,
        }}
      >
        {days.map((completed, i) => {
          const isToday = i === todayIdx;
          const monday = new Date(`${getMondayOfDate(new Date())}T12:00:00`);
          const dayDate = new Date(monday);
          dayDate.setDate(monday.getDate() + i);
          const dayStr = dayDate.toISOString().slice(0, 10);
          const isFuture = dayStr > new Date().toISOString().slice(0, 10);

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
                gap: 4,
                padding: "8px 2px",
                borderRadius: 10,
                border: completed
                  ? `1px solid ${goal.color}50`
                  : isToday
                    ? `2px solid ${goal.color}`
                    : "1px solid rgba(255,255,255,0.06)",
                background: completed
                  ? `${goal.color}25`
                  : isToday
                    ? `${goal.color}10`
                    : "transparent",
                opacity: isFuture ? 0.35 : 1,
                cursor: isFuture ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                transform: isToday ? "scale(1.02)" : "scale(1)",
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: completed ? goal.color : "transparent",
                  border: `2px solid ${completed ? goal.color : "rgba(255,255,255,0.12)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
              >
                {completed && <Check size={9} color="white" />}
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: isToday ? 800 : 500,
                  color: isToday ? goal.color : "var(--muted-foreground)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {WEEKDAY_LABELS[i].slice(0, 3)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sparkline */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--muted-foreground)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <TrendingUp size={11} />
          4 semanas
        </span>
        <WeeklySparkline data={sparklineData} color={hit ? "#10B981" : goal.color} />
      </div>
    </div>
  );
}

// =========================
// LONG-TERM GOAL CARD — Redesign
// =========================

function GoalCard({
  goal,
  reloadGoals,
}: {
  goal: Goal;
  reloadGoals: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const { showXP } = useXPAnimation();

  const cardRef = useRef<HTMLDivElement>(null);

  const progress = getGoalProgress(goal);

  const colorInfo = GOAL_COLORS_MAP[goal.color] || GOAL_COLORS_MAP["#A855F7"];

  const isCompleted = !!goal.completed_at;

  const handleToggleStep = async (stepId: string) => {
    const updatedSteps = goal.steps.map(step =>
      step.id === stepId
        ? {
            ...step,
            completed: !step.completed,
          }
        : step
    );

    const allCompleted = updatedSteps.every(s => s.completed);

    await supabase
      .from("goals")
      .update({
        steps: updatedSteps,
        completed_at: allCompleted ? new Date().toISOString() : null,
      })
      .eq("id", goal.id);

    const rect = cardRef.current?.getBoundingClientRect();

    if (rect) {
      showXP(10, rect.left + rect.width / 2, rect.top);
    }

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
      className="animate-fade-in"
      style={{
        ...S.glassCard,
        padding: 24,
        position: "relative",
        overflow: "hidden",
        background: isCompleted
          ? "linear-gradient(145deg, rgba(245,158,11,0.06), var(--card))"
          : `linear-gradient(145deg, ${colorInfo.light}, var(--card))`,
        borderColor: isCompleted ? `${GOLD_BORDER}50` : `rgba(${hexToRgb(goal.color)},0.2)`,
        boxShadow: isCompleted
          ? `0 4px 32px rgba(245,158,11,0.12)`
          : `0 4px 32px rgba(0,0,0,0.08)`,
      }}
    >
      {/* Gold accent top for completed */}
      {isCompleted && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, #F59E0B, #FCD34D)`,
            borderRadius: "20px 20px 0 0",
            opacity: 0.8,
          }}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 18,
          alignItems: "flex-start",
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: isCompleted
              ? `linear-gradient(135deg, #10B981, #34D399)`
              : `linear-gradient(135deg, ${goal.color}, ${goal.color}CC)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            boxShadow: isCompleted ? "0 4px 16px rgba(16,185,129,0.3)" : `0 4px 16px ${goal.color}30`,
            flexShrink: 0,
          }}
        >
          {goal.emoji}
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              marginBottom: 4,
              fontFamily: "'Space Grotesk', sans-serif",
              color: "var(--foreground)",
            }}
          >
            {goal.title}
          </h3>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
              lineHeight: 1.4,
            }}
          >
            {goal.description}
          </p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: 8,
            cursor: "pointer",
            color: "var(--muted-foreground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Completed badge */}
      {isCompleted && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: 999,
            padding: "5px 14px",
            marginBottom: 14,
          }}
        >
          <Crown size={12} color="#FCD34D" />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#FCD34D" }}>
            Concluída em {new Date(goal.completed_at!).toLocaleDateString("pt-BR")}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          marginBottom: 18,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: isCompleted
              ? "linear-gradient(90deg, #10B981, #34D399)"
              : colorInfo.gradient,
            borderRadius: 999,
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {goal.steps.map(step => (
            <button
              key={step.id}
              onClick={() => handleToggleStep(step.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${step.completed ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
                background: step.completed
                  ? "rgba(16,185,129,0.08)"
                  : "rgba(255,255,255,0.02)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "left",
                width: "100%",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: step.completed ? "#10B981" : "transparent",
                  border: `2px solid ${step.completed ? "#10B981" : goal.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
              >
                {step.completed && <Check size={11} color="white" />}
              </div>
              <span
                style={{
                  textDecoration: step.completed ? "line-through" : "none",
                  color: step.completed ? "var(--muted-foreground)" : "var(--foreground)",
                  fontSize: 14,
                }}
              >
                {step.title}
              </span>
            </button>
          ))}

          <button
            onClick={handleDelete}
            style={{
              marginTop: 8,
              padding: "12px",
              borderRadius: 12,
              border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.06)",
              color: "#EF4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontWeight: 600,
              fontSize: 13,
              transition: "all 0.2s ease",
            }}
          >
            <Trash2 size={14} />
            Deletar meta
          </button>
        </div>
      )}
    </div>
  );
}

// =========================
// EMPTY STATE — Redesign
// =========================

function EmptyGoalsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="animate-fade-in"
      style={{
        ...S.glassCard,
        padding: "64px 32px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      {/* Illustration */}
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: 28,
          background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(245,158,11,0.08))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 48,
          border: "1px solid rgba(139,92,246,0.2)",
        }}
      >
        🎯
      </div>

      <h3
        style={{
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        Nenhuma meta criada ainda
      </h3>

      <p
        style={{
          fontSize: 14,
          color: "var(--muted-foreground)",
          maxWidth: 340,
          lineHeight: 1.6,
        }}
      >
        Metas transformam objetivos em direção. Crie metas de longo prazo ou
        metas semanais para construir consistência dia após dia.
      </p>

      <button
        onClick={onCreate}
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "14px 28px",
          borderRadius: 14,
          background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
          color: "white",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(139,92,246,0.35)",
          transition: "all 0.2s ease",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Plus size={16} />
        Criar sua primeira meta
      </button>
    </div>
  );
}

// =========================
// WEEKLY SUMMARY BAR — Redesign
// =========================

function WeeklySummaryBar({
  weeklyGoals,
}: {
  weeklyGoals: Goal[];
}) {
  const asWeekly = weeklyGoals.map(goalToWeekly);
  const activeCount = countActiveWeeklyGoals(asWeekly);
  const avgConsistency = getWeekConsistencyAverage(asWeekly);
  const totalStreak = weeklyGoals.reduce((acc, g) => acc + (g.streak ?? 0), 0);

  const stats = [
    {
      icon: Target,
      value: `${avgConsistency}%`,
      label: "Consistência da semana",
      color: "#10B981",
    },
    {
      icon: CalendarDays,
      value: activeCount,
      label: "Metas semanais ativas",
      color: "#8B5CF6",
    },
    {
      icon: Flame,
      value: totalStreak,
      label: "Streak atual",
      color: "#F97316",
    },
  ];

  return (
    <div
      className="animate-fade-in"
      style={{
        ...S.glassCard,
        padding: 20,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 16,
        background: "linear-gradient(145deg, rgba(139,92,246,0.08), rgba(245,158,11,0.04), var(--card))",
        borderColor: "rgba(139,92,246,0.2)",
      }}
    >
      {stats.map(({ icon: Icon, value, label, color }) => (
        <div
          key={label}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: `${color}15`,
              border: `1px solid ${color}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={20} color={color} />
          </div>
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color,
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// =========================
// MODAL — Redesign
// =========================

function NewGoalModal({
  open,
  onClose,
  reloadGoals,
  habits,
  isPro,
  weeklyGoalsCount,
  onOpenUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  reloadGoals: () => void;
  habits: { id: string; title: string; emoji: string }[];
  isPro: boolean;
  weeklyGoalsCount: number;
  onOpenUpgrade: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState("#A855F7");
  const [deadline, setDeadline] = useState("");
  const [steps, setSteps] = useState<string[]>([""]);
  const [goalType, setGoalType] = useState<GoalType>("longo_prazo");
  const [targetFrequency, setTargetFrequency] = useState<number>(4);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const frequencyChips = COMMON_FREQUENCIES;

  const handleAddStep = () => {
    setSteps([...steps, ""]);
  };

  const handleStepChange = (i: number, value: string) => {
    const updated = [...steps];
    updated[i] = value;
    setSteps(updated);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast("Digite o nome da meta", "info", "⚠️");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showToast("Usuário não encontrado", "info", "❌");
      return;
    }

    if (goalType === "semanal" && !isPro && weeklyGoalsCount >= FREE_LIMITS.weeklyGoals) {
      showToast(
        `O plano Free permite até ${FREE_LIMITS.weeklyGoals} metas semanais simultâneas`,
        "info"
      );
      onOpenUpgrade();
      return;
    }

    if (goalType === "semanal") {
      const weekStart = getMondayOfDate(new Date());

      const { error } = await supabase.from("goals").insert({
        user_id: user.id,
        title: title.trim(),
        description: description || null,
        emoji,
        color,
        type: "semanal",
        target_frequency: targetFrequency,
        days_completed_week: [false, false, false, false, false, false, false],
        week_start: weekStart,
        streak: 0,
        record_streak: 0,
        linked_habit_id: selectedHabitId || null,
        weekly_history: [],
      });

      if (error) {
        console.log(error);
        showToast("Erro ao criar meta", "info", "❌");
        return;
      }

      showToast("Meta semanal criada!", "success", "🔥");
    } else {
      const validSteps = steps
        .filter(s => s.trim())
        .map(s => ({
          id: crypto.randomUUID(),
          title: s,
          completed: false,
        }));

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

      if (error) {
        console.log(error);
        showToast("Erro ao criar meta", "info", "❌");
        return;
      }

      showToast("Meta criada com sucesso!", "success", "🎯");
    }

    setTitle("");
    setDescription("");
    setEmoji("🎯");
    setColor("#A855F7");
    setDeadline("");
    setSteps([""]);
    setGoalType("longo_prazo");
    setTargetFrequency(4);
    setSelectedHabitId(null);

    onClose();
    await reloadGoals();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova Meta" maxWidth="520px">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Type selector */}
        <div>
          <p style={S.sectionLabel}>Tipo de meta</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {(
              [
                { value: "longo_prazo", label: "Longo prazo", icon: "🎯", desc: "Objetivos com etapas" },
                { value: "semanal", label: "Semanal", icon: "🔥", desc: "Consistência diária" },
              ] as const
            ).map(t => (
              <button
                key={t.value}
                onClick={() => setGoalType(t.value)}
                style={{
                  padding: "14px 12px",
                  borderRadius: 14,
                  border:
                    goalType === t.value
                      ? `2px solid #8B5CF6`
                      : "1px solid rgba(255,255,255,0.08)",
                  background:
                    goalType === t.value
                      ? "rgba(139,92,246,0.12)"
                      : "rgba(255,255,255,0.03)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: goalType === t.value ? "#C4B5FD" : "var(--foreground)",
                  }}
                >
                  {t.label}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <p style={S.sectionLabel}>Nome</p>
          <input
            placeholder="Ex: Ler 1 livro por mês"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={S.input}
          />
        </div>

        {/* Description */}
        <div>
          <p style={S.sectionLabel}>Descrição (opcional)</p>
          <textarea
            placeholder="Detalhes adicionais..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ ...S.input, minHeight: 60, resize: "vertical" }}
          />
        </div>

        {/* Emoji selector */}
        <div>
          <p style={S.sectionLabel}>Ícone</p>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {EMOJIS.map(e => {
              const selected = emoji === e;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    border: selected ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.08)",
                    background: selected ? `${color}20` : "rgba(255,255,255,0.04)",
                    cursor: "pointer",
                    fontSize: 20,
                    transition: "all 0.2s ease",
                    transform: selected ? "scale(1.1)" : "scale(1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {e}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color selector */}
        <div>
          <p style={S.sectionLabel}>Cor</p>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {COLORS.map(c => {
              const selected = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: selected ? "2px solid white" : "2px solid transparent",
                    background: c,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    transform: selected ? "scale(1.15)" : "scale(1)",
                    boxShadow: selected ? `0 0 12px ${c}60` : "none",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Weekly-specific fields */}
        {goalType === "semanal" ? (
          <>
            <div>
              <p style={S.sectionLabel}>Frequência por semana</p>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                {frequencyChips.map(chip => {
                  const selected = targetFrequency === chip.value;
                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setTargetFrequency(chip.value)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 12,
                        border: selected
                          ? "2px solid #F59E0B"
                          : "1px solid rgba(255,255,255,0.1)",
                        background: selected
                          ? "rgba(245,158,11,0.12)"
                          : "rgba(255,255,255,0.04)",
                        color: selected ? "#FCD34D" : "var(--muted-foreground)",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
              <input
                type="number"
                min={1}
                max={7}
                value={targetFrequency}
                onChange={e =>
                  setTargetFrequency(
                    Math.max(1, Math.min(7, Number(e.target.value)))
                  )
                }
                style={{ ...S.input, width: 120 }}
                placeholder="1–7"
              />
            </div>

            {habits.length > 0 && (
              <div>
                <p style={S.sectionLabel}>Vincular a um hábito (opcional)</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedHabitId(null)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 10,
                      border:
                        selectedHabitId === null
                          ? "2px solid #8B5CF6"
                          : "1px solid rgba(255,255,255,0.08)",
                      background:
                        selectedHabitId === null
                          ? "rgba(139,92,246,0.12)"
                          : "rgba(255,255,255,0.04)",
                      color: selectedHabitId === null ? "#C4B5FD" : "var(--muted-foreground)",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Manual
                  </button>
                  {habits.map(h => {
                    const selected = selectedHabitId === h.id;
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => setSelectedHabitId(h.id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 10,
                          border: selected
                            ? "2px solid #8B5CF6"
                            : "1px solid rgba(255,255,255,0.08)",
                          background: selected
                            ? "rgba(139,92,246,0.12)"
                            : "rgba(255,255,255,0.04)",
                          color: selected ? "#C4B5FD" : "var(--muted-foreground)",
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {h.emoji} {h.title}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
                  Ao vincular um hábito, os check-ins da semana vêm do módulo Habits automaticamente.
                </p>
              </div>
            )}
          </>
        ) : (
          <div>
            <p style={S.sectionLabel}>Prazo (opcional)</p>
            <input
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              style={S.input}
            />
          </div>
        )}

        {/* Steps (long-term only) */}
        {goalType === "longo_prazo" && (
          <div>
            <p style={S.sectionLabel}>Etapas</p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {steps.map((step, i) => (
                <input
                  key={i}
                  placeholder={`Etapa ${i + 1}`}
                  value={step}
                  onChange={e => handleStepChange(i, e.target.value)}
                  style={S.input}
                />
              ))}
              <button
                type="button"
                onClick={handleAddStep}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(139,92,246,0.3)",
                  background: "rgba(139,92,246,0.08)",
                  color: "#A78BFA",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s ease",
                }}
              >
                <Plus size={14} />
                Adicionar etapa
              </button>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          style={{
            padding: "14px 24px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
            transition: "all 0.2s ease",
            fontFamily: "'DM Sans', sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Sparkles size={16} />
          {goalType === "semanal" ? "Criar Meta Semanal" : "Criar Meta"}
        </button>
      </div>
    </Modal>
  );
}

// =========================
// MAIN — Redesign
// =========================

export default function Goals({
  isPro = false,
  onOpenUpgrade,
}: {
  isPro?: boolean;
  onOpenUpgrade?: () => void;
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<
    { id: string; title: string; emoji: string; completed_dates?: string[] | null }[]
  >([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "ongoing" | "completed" | "weekly">("all");

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.log(error);
      return;
    }

    const { normalized, changed } = normalizeWeeklyGoals(data || []);

    if (changed) {
      for (const g of normalized) {
        if (g.type !== "semanal") continue;
        await supabase
          .from("goals")
          .update({
            days_completed_week: g.days_completed_week,
            week_start: g.week_start,
            streak: g.streak,
            record_streak: g.record_streak,
            weekly_history: g.weekly_history,
          })
          .eq("id", g.id);
      }
    }

    setGoals(normalized);

    const { data: habitsData } = await supabase
      .from("habits")
      .select("id, title, emoji, completed_dates")
      .eq("user_id", user.id);

    setHabits(habitsData || []);
  };

  const weeklyGoals = goals.filter(g => g.type === "semanal");
  const longTermGoals = goals.filter(g => !g.type || g.type === "longo_prazo");

  const filteredGoals = useMemo(() => {
    switch (filter) {
      case "weekly":
        return weeklyGoals;
      case "completed":
        return longTermGoals.filter(g => g.completed_at);
      case "ongoing":
        return longTermGoals.filter(g => !g.completed_at);
      case "all":
      default:
        return goals;
    }
  }, [filter, weeklyGoals, longTermGoals, goals]);

  const orderedGoals = useMemo(() => {
    if (filter !== "weekly") return filteredGoals;
    const sortedWeekly = sortWeeklyGoalsForUI(filteredGoals as any);
    return sortedWeekly;
  }, [filteredGoals, filter]);

  const weeklyGoalsWithHabitCheckins = useMemo(() => {
    if (filter !== "weekly" && filter !== "all") return orderedGoals;
    return orderedGoals.map(g => {
      if (g.type !== "semanal" || !g.linked_habit_id) return g;
      const habit = habits.find(h => h.id === g.linked_habit_id);
      if (!habit) return g;
      const monday = getMondayOfDate(new Date());
      const checkins = getLinkedHabitWeekCheckins(habit, monday);
      const hasHabitCheckins = checkins.some(Boolean);
      if (hasHabitCheckins && !g.days_completed_week?.some(Boolean)) {
        return { ...g, days_completed_week: checkins };
      }
      if (hasHabitCheckins) {
        const merged = checkins.map((v, i) => v || (g.days_completed_week?.[i] ?? false));
        return { ...g, days_completed_week: merged };
      }
      return g;
    });
  }, [orderedGoals, habits, filter]);

  const tabs = [
    { value: "ongoing", label: "Em andamento", icon: Target },
    { value: "weekly", label: "Semanais", icon: Flame },
    { value: "completed", label: "Concluídas", icon: Trophy },
    { value: "all", label: "Todas", icon: Sparkles },
  ] as const;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "'Space Grotesk', sans-serif",
              margin: 0,
            }}
          >
            <Target size={24} color="#8B5CF6" />
            Metas
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
              marginTop: 4,
            }}
          >
            Transforme objetivos em conquistas diárias
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "12px 20px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #8B5CF6, #A855F7)",
            color: "white",
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s ease",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Plus size={16} />
          Nova Meta
        </button>
      </div>

      {/* Summary bar */}
      {(filter === "weekly" || weeklyGoals.length > 0) && (
        <WeeklySummaryBar weeklyGoals={weeklyGoals} />
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: 4,
        }}
      >
        {tabs.map(f => {
          const isActive = filter === f.value;
          const Icon = f.icon;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "none",
                background: isActive
                  ? "linear-gradient(135deg, #8B5CF6, #A855F7)"
                  : "transparent",
                color: isActive ? "white" : "var(--muted-foreground)",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s ease",
                boxShadow: isActive ? "0 2px 12px rgba(139,92,246,0.25)" : "none",
              }}
            >
              <Icon size={14} />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {filteredGoals.length === 0 ? (
        <EmptyGoalsState onCreate={() => setShowModal(true)} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 20,
          }}
        >
          {weeklyGoalsWithHabitCheckins.map(goal => {
            if (goal.type === "semanal") {
              return (
                <WeeklyGoalCard
                  key={goal.id}
                  goal={goal}
                  linkedHabits={habits}
                  reloadGoals={loadGoals}
                />
              );
            }
            return (
              <GoalCard key={goal.id} goal={goal} reloadGoals={loadGoals} />
            );
          })}
        </div>
      )}

      <NewGoalModal
        open={showModal}
        onClose={() => setShowModal(false)}
        reloadGoals={loadGoals}
        habits={habits}
        isPro={isPro}
        weeklyGoalsCount={weeklyGoals.length}
        onOpenUpgrade={onOpenUpgrade ?? (() => {})}
      />
    </div>
  );
}

// =========================
// UTILS
// =========================

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "139,92,246";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

function sortWeeklyGoalsForUI(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => {
    const aHit = (a.days_completed_week?.filter(Boolean).length ?? 0) >= (a.target_frequency ?? 1);
    const bHit = (b.days_completed_week?.filter(Boolean).length ?? 0) >= (b.target_frequency ?? 1);
    if (aHit !== bHit) return aHit ? 1 : -1;
    const aRemaining = (a.target_frequency ?? 1) - (a.days_completed_week?.filter(Boolean).length ?? 0);
    const bRemaining = (b.target_frequency ?? 1) - (b.days_completed_week?.filter(Boolean).length ?? 0);
    return aRemaining - bRemaining;
  });
}
