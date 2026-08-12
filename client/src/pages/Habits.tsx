// =========================
// IMPORTS
// =========================

import React, { useState, useMemo, useEffect, useCallback } from "react";

import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Search,
  Download,
  Flame,
  CalendarDays,
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
  "💪",
  "🧘",
  "💧",
  "🥗",
  "😴",
  "✍️",
  "🎵",
  "🧹",
  "💊",
  "🌿",
  "🧠",
  "❤️",
  "🔥",
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
      >
        <p
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
// HABIT ROW
// =========================

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

  const getWeekLetter = (day: number) =>
    WEEK_DAYS[new Date(year, month, day).getDay()];

  const handleToggle = (
    day: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const dateStr = `${year}-${String(month + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;
    const previousDates = habit.completedDates || [];
    const wasCompleted = previousDates.includes(dateStr);
    const updatedDates = wasCompleted
      ? previousDates.filter((d: string) => d !== dateStr)
      : [...previousDates, dateStr];

    onHabitUpdated(habit.id, updatedDates);

    if (!wasCompleted) {
      void addXP(5);
      showXP(5, e.clientX, e.clientY);
      setAnimatingDate(dateStr);
      window.setTimeout(() => setAnimatingDate(null), 260);
    }

    void (async () => {
      // Sincronizar com metas semanais vinculadas a este hábito
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
    showToast("Hábito removido", "info", "🗑️");

    void (async () => {
      const { error } = await supabase.from("habits").delete().eq("id", habit.id);
      if (error) {
        onHabitRestored(habit);
        showToast("Erro ao remover", "info", "❌");
      }
    })();
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="habit-row">
      <div className="habit-row-info">
        <div className="habit-row-title">
          <span style={{ fontSize: 16 }}>{habit.emoji}</span>

          <span
            style={{
              fontWeight: 500,
              fontSize: 12,
              color: "var(--foreground)",
            }}
          >
            {habit.title}
          </span>

          <button
            onClick={handleDelete}
            className="habit-row-delete"
            aria-label={`Remover hábito ${habit.title}`}
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="habit-row-meta">
          <span
            style={{
              color: habit.color,
              fontWeight: 600,
            }}
          >
            {progress}/{daysInMonth}
          </span>

          <span style={{ color: "var(--muted-foreground)" }}>•</span>

          <span style={{ color: "var(--muted-foreground)" }}>🔥 {streak}d</span>
        </div>
      </div>

      <div className="habit-row-days">
        {days.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;

          const isCompleted = habit.completedDates.includes(dateStr);

          const isFuture = dateStr > today;

          const isCurrentDay = dateStr === today;

          const dayLabel = `${habit.title} — ${getWeekLetter(day)} ${day}/${String(
            month + 1
          ).padStart(2, "0")}`;

          return (
            <button
              key={day}
              type="button"
              onClick={e => !isFuture && handleToggle(day, e)}
              className={`habit-day-button${isCurrentDay ? " current-day" : ""}`}
              aria-label={dayLabel}
              aria-pressed={isCompleted}
              title={dayLabel}
              disabled={isFuture}
            >
              <div
                className={`habit-day-dot${isCompleted ? " completed" : ""}${
                  animatingDate === dateStr ? " animate" : ""
                }`}
                style={{
                  background: isCompleted ? habit.color : "var(--border)",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =========================
// MOBILE CARD — grade da semana atual com toques maiores
// =========================

function getWeekDaysGrid(): {
  day: number;
  month: number;
  year: number;
  dateStr: string;
  weekday: number;
}[] {
  const now = new Date();
  const weekDay = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - weekDay);
  const grid = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    grid.push({
      day: d.getDate(),
      month: d.getMonth(),
      year: d.getFullYear(),
      dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      weekday: d.getDay(),
    });
  }
  return grid;
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
  const [expanding, setExpanding] = useState(false);

  const today = getTodayString();

  const progress = getHabitMonthProgress(habit, year, month);
  const rate = getHabitMonthRate(habit, year, month);
  const streak = getHabitStreak(habit);
  const weekGrid = getWeekDaysGrid();

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
    showToast("Hábito removido", "info", "🗑️");

    void (async () => {
      const { error } = await supabase.from("habits").delete().eq("id", habit.id);
      if (error) {
        onHabitRestored(habit);
        showToast("Erro ao remover", "info", "❌");
      }
    })();
  };

  const rateLabel = `${progress}/${daysInMonth}`;

  return (
    <div className="habit-card" style={{ borderColor: "var(--border)" }}>
      <div className="habit-card-header">
        <div className="habit-card-title-row">
          <span
            className="habit-card-emoji"
            style={{ background: `${habit.color}1A`, color: habit.color }}
          >
            {habit.emoji}
          </span>

          <div className="habit-card-title-text">
            <span className="habit-card-name">{habit.title}</span>

            <span className="habit-card-meta">
              <Flame size={12} style={{ color: "#F59E0B" }} />

              <span style={{ color: "#F59E0B", fontWeight: 700 }}>{streak}d</span>

              <span className="habit-card-dot">•</span>

              <span style={{ color: habit.color, fontWeight: 700 }}>{rateLabel}</span>

              <span className="habit-card-dot">•</span>

              <span>{rate}% no mês</span>
            </span>
          </div>

          <button
            onClick={handleDelete}
            className="habit-card-delete"
            aria-label={`Remover hábito ${habit.title}`}
            type="button"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="habit-card-week">
        {weekGrid.map(cell => {
          const isCompleted = habit.completedDates.includes(cell.dateStr);
          const isFuture = cell.dateStr > today;
          const isCurrentDay = cell.dateStr === today;
          const isTodayMonth = cell.month === month && cell.year === year;
          const dayLabel = `${habit.title} — ${WEEK_DAYS[cell.weekday]} ${cell.day}/${String(cell.month + 1).padStart(2, "0")}`;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={e => !isFuture && handleToggle(cell.dateStr, e)}
              className={`habit-week-cell${isCurrentDay ? " current" : ""}${isTodayMonth ? "" : " other-month"}`}
              aria-label={dayLabel}
              aria-pressed={isCompleted}
              disabled={isFuture}
            >
              <span className="habit-week-day-label">
                {WEEK_DAYS[cell.weekday]}
                <span className="habit-week-day-num">{cell.day}</span>
              </span>

              <span
                className={`habit-week-dot${isCompleted ? " completed" : ""}${
                  animatingDate === cell.dateStr ? " animate" : ""
                }`}
                style={{
                  background: isCompleted ? habit.color : "var(--border)",
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="habit-card-progress-track">
        <div
          className="habit-card-progress-fill"
          style={{
            width: `${daysInMonth > 0 ? Math.round((progress / daysInMonth) * 100) : 0}%`,
            background: habit.color,
          }}
        />
      </div>

      <button
        type="button"
        className="habit-card-expand"
        onClick={() => setExpanding(prev => !prev)}
      >
        <CalendarDays size={13} />

        {expanding ? "Ocultar tabela do mês" : "Ver tabela do mês"}

        <ChevronLeft
          size={13}
          className={`habit-card-expand-chevron${expanding ? " expanded" : ""}`}
        />
      </button>

      {expanding && (
        <div className="habit-card-month-table">
          <HabitRow
            habit={habit}
            year={year}
            month={month}
            daysInMonth={daysInMonth}
            onHabitUpdated={onHabitUpdated}
            onHabitDeleted={onHabitDeleted}
            onHabitRestored={onHabitRestored}
          />
        </div>
      )}
    </div>
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

    showToast("Hábito criado! 🔥", "success", "🔥");

    setTitle("");
    setEmoji("🏃");
    setCustomColor("#F59E0B");
    setTargetDays(30);

    reloadHabits();

    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo Hábito">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* TITLE */}

        <input
          className="fz-input"
          placeholder="Nome do hábito"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        {/* EMOJIS */}

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setEmoji(e)}
              style={{
                fontSize: 24,
                padding: 10,
                borderRadius: 10,
                border:
                  emoji === e ? "2px solid #F59E0B" : "1px solid var(--border)",
                background:
                  emoji === e ? "rgba(245,158,11,0.15)" : "transparent",
                cursor: "pointer",
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* COLORS */}

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setCustomColor(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: c,
                border: customColor === c ? "3px solid white" : "none",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        {/* TARGET */}

        <div>
          <p
            style={{
              marginBottom: 6,
              fontSize: 12,
              color: "var(--muted-foreground)",
            }}
          >
            Meta mensal: {targetDays} dias
          </p>

          <input
            type="range"
            min={1}
            max={31}
            value={targetDays}
            onChange={e => setTargetDays(Number(e.target.value))}
            style={{
              width: "100%",
            }}
          />
        </div>

        {/* BUTTON */}

        <button className="fz-btn-primary" onClick={handleSubmit}>
          Criar Hábito
        </button>
      </div>
    </Modal>
  );
}

// =========================
// MAIN
// =========================

export default function Habits({ isPro }: { isPro: boolean }) {
  const { showXP } = useXPAnimation();

  const isMobile = useIsMobile();

  const [showMonthTable, setShowMonthTable] = useState(false);

  const [habits, setHabits] = useState<any[]>([]);

  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());

  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [showModal, setShowModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const [chartType, setChartType] = useState<"daily" | "weekly">("daily");

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
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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
      >
        <div>
          <h1
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
              >
                <Flame size={15} style={{ color: "#A855F7" }} />
              </span>
            )}
            Hábitos
          </h1>

          <p
            style={{
              fontSize: isMobile ? 11 : 12,
              color: "var(--muted-foreground)",
              margin: isMobile ? "2px 0 0" : 0,
            }}
          >
            Consistência é tudo 🔥
          </p>
        </div>

        {!isMobile && (
          <button className="fz-btn-primary" onClick={() => setShowModal(true)}>
            Novo hábito
          </button>
        )}
      </div>

      {/* SEARCH */}

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
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
        >
          <Search size={14} />

          <input
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
          />
        </div>

        <button className="fz-btn-ghost" onClick={exportData}>
          <Download size={14} />
        </button>
      </div>

      {/* MONTH */}

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: isMobile ? 14 : 20,
          marginBottom: isMobile ? 14 : 20,
        }}
      >
        <button
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
        >
          <ChevronLeft size={16} />
        </button>

        <h2
          style={{
            fontSize: isMobile ? 15 : undefined,
            fontWeight: 700,
            margin: 0,
          }}
        >
          {MONTHS[viewMonth]} {viewYear}
        </h2>

        <button
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
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* CHART */}

      <div
        className="fz-card"
        style={{
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <button onClick={() => setChartType("daily")}>Diário</button>

          <button onClick={() => setChartType("weekly")}>Semanal</button>
        </div>

        <ResponsiveContainer width="100%" height={isMobile ? 150 : 220}>
          {chartType === "daily" ? (
            <AreaChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="day" />

              <YAxis />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="count"
                stroke="#A855F7"
                fill="#A855F733"
              />
            </AreaChart>
          ) : (
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="week" />

              <YAxis />

              <Tooltip content={<CustomTooltip />} />

              <Bar dataKey="count" fill="#A855F7" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* HABITS */}

      <div
        className="fz-card habit-table-card"
        style={{
          padding: isMobile && !showMonthTable ? "12px" : "0",
          marginBottom: 20,
        }}
      >
        {filteredHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-6">
              <Flame size={36} className="text-amber-500/50" />
            </div>
            <h3 className="text-white text-lg font-bold mb-2">
              {searchTerm ? "Nenhum hábito encontrado" : "Nenhum hábito criado"}
            </h3>
            <p className="text-zinc-400 text-sm mb-6 max-w-sm">
              {searchTerm
                ? "Tente buscar por outro termo."
                : "Hábitos são o alicerce da sua evolução. Comece criando seu primeiro hábito e construa sua streak!"
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-900/20"
              >
                + Criar primeiro hábito
              </button>
            )}
          </div>
        ) : isMobile && !showMonthTable ? (
          <div className="habit-cards">
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
          </div>
        ) : (
          <div className="habit-table-scroll">
            <div className="habit-table-head">
              <div className="habit-table-head-info">Hábito</div>

              <div className="habit-table-head-days">
                {dayNumbers.map(day => (
                  <div key={day} className="habit-day-header-item">
                    {day}
                  </div>
                ))}
              </div>
            </div>

            <div className="habit-table-body">
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
            </div>
          </div>
        )}
      </div>

      {/* MOBILE: toggle tabela completa + FAB novo hábito */}

      {isMobile && (
        <>
          {!showMonthTable ? (
            <button
              type="button"
              className="habit-table-toggle"
              onClick={() => setShowMonthTable(true)}
            >
              <CalendarDays size={14} />

              Ver tabela do mês
            </button>
          ) : (
            <button
              type="button"
              className="habit-table-toggle"
              onClick={() => setShowMonthTable(false)}
            >
              Voltar para a semana
            </button>
          )}

          <button
            type="button"
            className="habit-fab"
            onClick={() => setShowModal(true)}
            aria-label="Novo hábito"
          >
            <Plus size={22} />
          </button>
        </>
      )}

      {/* STATS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 10,
        }}
      >
        <div
          className="fz-card"
          style={{
            padding: 14,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#F59E0B",
            }}
          >
            {habitsToday}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
            }}
          >
            Hoje
          </div>
        </div>

        <div
          className="fz-card"
          style={{
            padding: 14,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#10B981",
            }}
          >
            {monthlyRate}%
          </div>

          <div
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
            }}
          >
            Taxa
          </div>
        </div>

        <div
          className="fz-card"
          style={{
            padding: 14,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#A855F7",
            }}
          >
            {filteredHabits.length}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
            }}
          >
            Hábitos
          </div>
        </div>
      </div>

      {/* MODAL */}

      <NewHabitModal
        open={showModal}
        onClose={() => setShowModal(false)}
        reloadHabits={loadHabits}
        isPro={isPro}
        habits={habits}
      />
    </div>
  );
}
