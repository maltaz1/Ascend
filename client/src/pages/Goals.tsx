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
  // Campos de metas semanais
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
  }
> = {
  "#F59E0B": {
    gradient: "linear-gradient(135deg, #F59E0B, #FCD34D)",
    glow: "rgba(245,158,11,0.2)",
    light: "rgba(245,158,11,0.08)",
  },

  "#A855F7": {
    gradient: "linear-gradient(135deg, #A855F7, #C084FC)",
    glow: "rgba(168,85,247,0.2)",
    light: "rgba(168,85,247,0.08)",
  },

  "#10B981": {
    gradient: "linear-gradient(135deg, #10B981, #34D399)",
    glow: "rgba(16,185,129,0.2)",
    light: "rgba(16,185,129,0.08)",
  },

  "#8B5CF6": {
    gradient: "linear-gradient(135deg, #8B5CF6, #A78BFA)",
    glow: "rgba(139,92,246,0.2)",
    light: "rgba(139,92,246,0.08)",
  },

  "#EF4444": {
    gradient: "linear-gradient(135deg, #EF4444, #F87171)",
    glow: "rgba(239,68,68,0.2)",
    light: "rgba(239,68,68,0.08)",
  },

  "#EC4899": {
    gradient: "linear-gradient(135deg, #EC4899, #F472B6)",
    glow: "rgba(236,72,153,0.2)",
    light: "rgba(236,72,153,0.08)",
  },

  "#06B6D4": {
    gradient: "linear-gradient(135deg, #06B6D4, #22D3EE)",
    glow: "rgba(6,182,212,0.2)",
    light: "rgba(6,182,212,0.08)",
  },

  "#84CC16": {
    gradient: "linear-gradient(135deg, #84CC16, #A3E635)",
    glow: "rgba(132,204,22,0.2)",
    light: "rgba(132,204,22,0.08)",
  },
};

const GOLD_BORDER = "#f59e0b";

/** Converte uma Goal do banco em WeeklyGoal para os helpers da lib */
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
// WEEKLY GOAL CARD
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

  // Normaliza a semana se necessário
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

  // Aplica mudanças de normalização no estado local
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
    // Dias futuros não podem ser marcados
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

    // XP ao completar um check-in
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) showXP(5, rect.left + rect.width / 2, rect.top);

    // Se acabou de bater a meta da semana, concede XP de meta semanal
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
  const consistency = getWeeklyConsistency({
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
      className="fz-card animate-fade-in"
      style={{
        padding: 24,
        borderRadius: 16,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${colorInfo.light}, rgba(255,255,255,0.02))`,
        border: hit
          ? "1px solid rgba(16,185,129,0.4)"
          : `1px solid ${goal.color}30`,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 18,
          alignItems: "flex-start",
        }}
      >
        <CircularProgress
          value={hit ? 100 : Math.round((completedCount / target) * 100)}
          size={60}
          strokeWidth={4}
          color={hit ? "#10B981" : goal.color}
        >
          <span style={{ fontSize: 24 }}>{goal.emoji}</span>
        </CircularProgress>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {goal.title}
          </h3>

          {/* Tag de categoria */}
          <span
            style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: goal.color,
              background: `${goal.color}18`,
              border: `1px solid ${goal.color}40`,
              borderRadius: 999,
              padding: "3px 10px",
              marginBottom: 6,
            }}
          >
            {hit ? "Meta atingida ✓" : `Semana ${completedCount}/${target}`}
          </span>

          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
            }}
          >
            {habit
              ? `Vinculada ao hábito ${habit.emoji} ${habit.title}`
              : goal.description || `${target}x por semana`}
          </p>
        </div>

        {/* Streak + recorde */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Flame size={20} color="#F97316" />
            <span style={{ fontSize: 18, fontWeight: 800, color: "#F97316" }}>
              {streak}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
            }}
          >
            semanas seguidas
          </span>
          {recordStreak > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "#FCD34D",
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              🏆 recorde: {recordStreak}
            </span>
          )}
        </div>
      </div>

      {/* 7 indicadores de dias */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
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
                gap: 6,
                padding: "8px 2px",
                borderRadius: 10,
                border: completed
                  ? `1px solid ${goal.color}80`
                  : isToday
                    ? `2px solid ${goal.color}`
                    : "1px solid rgba(255,255,255,0.08)",
                background: completed
                  ? `${goal.color}30`
                  : isToday
                    ? `${goal.color}15`
                    : "rgba(255,255,255,0.03)",
                opacity: isFuture ? 0.4 : 1,
                cursor: isFuture ? "not-allowed" : "pointer",
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: completed ? goal.color : "transparent",
                  border: `2px solid ${completed ? goal.color : "rgba(255,255,255,0.15)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all .2s ease",
                }}
              >
                {completed && <Check size={9} color="white" />}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? goal.color : "var(--muted-foreground)",
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
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          Consistência — 4 semanas
        </span>
        <WeeklySparkline data={sparklineData} color={hit ? "#10B981" : goal.color} />
      </div>
    </div>
  );
}

// =========================
// LONG-TERM GOAL CARD
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
      className="fz-card animate-fade-in"
      style={{
        padding: 24,
        borderRadius: 16,
        position: "relative",
        overflow: "hidden",
        background: isCompleted
          ? "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.04))"
          : `linear-gradient(135deg, ${colorInfo.light}, rgba(255,255,255,0.02))`,
        // Borda dourada sutil para metas de longo prazo concluídas
        border: isCompleted
          ? `1px solid ${GOLD_BORDER}`
          : `1px solid ${goal.color}30`,
        boxShadow: isCompleted ? `0 0 24px ${GOLD_BORDER}20` : undefined,
      }}
    >
      {/* Ícone de troféu para metas concluídas */}
      {isCompleted && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "#FCD34D",
              background: `${GOLD_BORDER}18`,
              border: `1px solid ${GOLD_BORDER}40`,
              borderRadius: 999,
              padding: "3px 10px",
              fontWeight: 600,
            }}
          >
            <Trophy size={12} color="#FCD34D" />
            Concluída em{" "}
            {new Date(goal.completed_at!).toLocaleDateString("pt-BR")}
          </span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 18,
          paddingRight: isCompleted ? 150 : 0,
        }}
      >
        <CircularProgress
          value={progress}
          size={60}
          strokeWidth={4}
          color={isCompleted ? "#10B981" : goal.color}
        >
          <span style={{ fontSize: 24 }}>{goal.emoji}</span>
        </CircularProgress>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {goal.title}
          </h3>

          <p
            style={{
              fontSize: 13,
              color: "var(--muted-foreground)",
            }}
          >
            {goal.description}
          </p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: goal.color,
          }}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(255,255,255,0.08)",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: colorInfo.gradient,
          }}
        />
      </div>

      {expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {goal.steps.map(step => (
            <button
              key={step.id}
              onClick={() => handleToggleStep(step.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${goal.color}20`,
                background: step.completed
                  ? "rgba(16,185,129,0.15)"
                  : "rgba(255,255,255,0.03)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: step.completed ? "#10B981" : "transparent",
                  border: `2px solid ${
                    step.completed ? "#10B981" : goal.color
                  }`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step.completed && <Check size={11} color="white" />}
              </div>

              <span
                style={{
                  textDecoration: step.completed ? "line-through" : "none",
                }}
              >
                {step.title}
              </span>
            </button>
          ))}

          <button
            onClick={handleDelete}
            style={{
              marginTop: 10,
              padding: "12px",
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.1)",
              color: "#EF4444",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontWeight: 600,
            }}
          >
            <Trash2 size={15} />
            Deletar meta
          </button>
        </div>
      )}
    </div>
  );
}

// =========================
// EMPTY STATE
// =========================

function EmptyGoalsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="fz-card"
      style={{
        padding: 60,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Ilustração simples */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 28,
          background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(245,158,11,0.1))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
          marginBottom: 8,
        }}
      >
        🎯
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 700 }}>
        Nenhuma meta criada ainda
      </h3>

      <p
        style={{
          fontSize: 13,
          color: "var(--muted-foreground)",
          maxWidth: 320,
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
          padding: "12px 24px",
          borderRadius: 12,
          background: "#8B5CF6",
          color: "white",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(139,92,246,0.35)",
        }}
      >
        <Plus size={16} />
        Criar sua primeira meta
      </button>
    </div>
  );
}

// =========================
// WEEKLY SUMMARY BAR
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
      className="fz-card animate-fade-in"
      style={{
        padding: 20,
        borderRadius: 16,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 16,
        background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(245,158,11,0.06))",
        border: "1px solid rgba(139,92,246,0.25)",
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
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `${color}18`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={18} color={color} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>
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

  // Campos de meta semanal
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

    // Plano Free: limitar a 2 metas semanais simultâneas (Upgrade Modal já padronizado)
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
        deadline: null,
        steps: [],
        completed_at: null,
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

    window.location.reload();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova Meta" maxWidth="480px">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Tipo de meta */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {(
            [
              { value: "longo_prazo", label: "Longo prazo", icon: "🎯" },
              { value: "semanal", label: "Semanal", icon: "🔥" },
            ] as const
          ).map(t => (
            <button
              key={t.value}
              onClick={() => setGoalType(t.value)}
              style={{
                padding: "12px 8px",
                borderRadius: 12,
                border:
                  goalType === t.value
                    ? "2px solid #8B5CF6"
                    : "1px solid rgba(255,255,255,0.08)",
                background:
                  goalType === t.value
                    ? "rgba(139,92,246,0.15)"
                    : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                fontWeight: 600,
                fontSize: 13,
                color: "var(--foreground)",
              }}
            >
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <input
          placeholder="Nome da meta"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="fz-input"
        />

        <textarea
          placeholder="Descrição"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="fz-input"
        />

        <div
          style={{
            display: "flex",
            gap: 10,
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
                  border: selected
                    ? `2px solid ${color}`
                    : "1px solid rgba(255,255,255,0.08)",

                  background: selected
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.04)",

                  cursor: "pointer",

                  fontSize: 22,

                  transition: "all .2s ease",

                  transform: selected ? "scale(1.08)" : "scale(1)",
                }}
              >
                {e}
              </button>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
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

                  border: selected
                    ? "1px solid white"
                    : "2px solid transparent",

                  background: c,

                  cursor: "pointer",

                  transition: "all .2s ease",

                  transform: selected ? "scale(1.15)" : "scale(1)",

                  boxShadow: selected ? `0 0 5px ${c}` : "0 0 0 transparent",
                }}
              />
            );
          })}
        </div>

        {/* Campos de meta semanal */}
        {goalType === "semanal" ? (
          <>
            <div>
              <p
                style={{
                  marginBottom: 8,
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                }}
              >
                Frequência-alvo por semana
              </p>

              {/* Chips de frequência comum */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 10,
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
                        padding: "8px 18px",
                        borderRadius: 999,
                        border: selected
                          ? "2px solid #F59E0B"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: selected
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(255,255,255,0.04)",
                        color: selected ? "#FCD34D" : "var(--muted-foreground)",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              {/* Input numérico alternativo */}
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
                className="fz-input"
                placeholder="Ou digite o número (1–7)"
              />
            </div>

            {/* Vínculo com hábito existente */}
            {habits.length > 0 && (
              <div>
                <p
                  style={{
                    marginBottom: 8,
                    fontSize: 12,
                    color: "var(--muted-foreground)",
                  }}
                >
                  Vincular a um hábito existente (opcional)
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedHabitId(null)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 999,
                    border:
                      selectedHabitId === null
                        ? "2px solid #8B5CF6"
                        : "1px solid rgba(255,255,255,0.08)",
                    background:
                      selectedHabitId === null
                        ? "rgba(139,92,246,0.15)"
                        : "rgba(255,255,255,0.04)",
                    color: selectedHabitId === null ? "#C4B5FD" : "var(--muted-foreground)",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    marginRight: 6,
                    marginBottom: 6,
                  }}
                >
                  Controle manual
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
                        borderRadius: 999,
                        border: selected
                          ? "2px solid #8B5CF6"
                          : "1px solid rgba(255,255,255,0.08)",
                        background: selected
                          ? "rgba(139,92,246,0.15)"
                          : "rgba(255,255,255,0.04)",
                        color: selected ? "#C4B5FD" : "var(--muted-foreground)",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                        marginRight: 6,
                        marginBottom: 6,
                      }}
                    >
                      {h.emoji} {h.title}
                    </button>
                  );
                })}

                <p
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                    lineHeight: 1.5,
                  }}
                >
                  Ao vincular um hábito, os check-ins da semana vêm do módulo
                  Habits automaticamente.
                </p>
              </div>
            )}
          </>
        ) : (
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="fz-input"
          />
        )}

        {/* Etapas (apenas longo prazo) */}
        {goalType === "longo_prazo" && (
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
                className="fz-input"
              />
            ))}

            <button
              type="button"
              onClick={handleAddStep}
              className="fz-btn-secondary"
            >
              <Plus size={14} />
              Adicionar etapa
            </button>
          </div>
        )}

        <button onClick={handleSubmit} className="fz-btn-primary">
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
  const [goals, setGoals] = useState<Goal[]>([]);

  const [habits, setHabits] = useState<
    { id: string; title: string; emoji: string; completed_dates?: string[] | null }[]
  >([]);

  const [showModal, setShowModal] = useState(false);

  const [filter, setFilter] = useState<
    "all" | "ongoing" | "completed" | "weekly"
  >("all");

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

    // Normaliza as semanas das metas semanais (reset a cada segunda-feira)
    const { normalized, changed } = normalizeWeeklyGoals(data || []);

    // Persiste as mudanças de virada de semana
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

    // Carrega hábitos para o vínculo de metas semanais
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

  // Ordenação: metas semanais primeiro pelas mais perto do prazo
  const orderedGoals = useMemo(() => {
    if (filter !== "weekly") return filteredGoals;
    const sortedWeekly = sortWeeklyGoalsForUI(filteredGoals as any);
    return sortedWeekly;
  }, [filteredGoals, filter]);

  // Sincroniza check-ins do hábito vinculado
  const weeklyGoalsWithHabitCheckins = useMemo(() => {
    if (filter !== "weekly" && filter !== "all") return orderedGoals;
    return orderedGoals.map(g => {
      if (g.type !== "semanal" || !g.linked_habit_id) return g;
      const habit = habits.find(h => h.id === g.linked_habit_id);
      if (!habit) return g;
      const monday = getMondayOfDate(new Date());
      const checkins = getLinkedHabitWeekCheckins(habit, monday);
      // Só atualiza se os check-ins do hábito forem mais recentes/completos
      const hasHabitCheckins = checkins.some(Boolean);
      if (hasHabitCheckins && !g.days_completed_week?.some(Boolean)) {
        return { ...g, days_completed_week: checkins };
      }
      if (hasHabitCheckins) {
        // Mescla: dias do hábito prevalecem
        const merged = checkins.map((v, i) => v || (g.days_completed_week?.[i] ?? false));
        return { ...g, days_completed_week: merged };
      }
      return g;
    });
  }, [orderedGoals, habits, filter]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Target size={26} />
          Metas
        </h2>

        <button onClick={() => setShowModal(true)} className="fz-btn-primary">
          Nova Meta
        </button>
      </div>

      {/* Bloco de resumo — aparece na aba Semanais ou quando há metas semanais */}
      {(filter === "weekly" || weeklyGoals.length > 0) && (
        <WeeklySummaryBar weeklyGoals={weeklyGoals} />
      )}

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {[
          {
            value: "ongoing",
            label: "Em andamento",
          },

          {
            value: "completed",
            label: "Concluídas",
          },

          {
            value: "weekly",
            label: "Semanais",
          },

          {
            value: "all",
            label: "Todas",
          },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value as any)}
            className={
              filter === f.value ? "fz-btn-primary" : "fz-btn-secondary"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredGoals.length === 0 ? (
        <EmptyGoalsState onCreate={() => setShowModal(true)} />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
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

/**
 * Ordena metas semanais: primeiro as mais perto de bater a meta
 * (menos dias restantes). Metas já batidas ficam por último.
 */
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
