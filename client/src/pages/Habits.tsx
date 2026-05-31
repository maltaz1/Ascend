// =========================
// IMPORTS
// =========================

import React, { useState, useMemo, useEffect } from "react";

import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Search,
  Download,
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
  "#3B82F6",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
];

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
  reloadHabits,
}: {
  habit: any;
  year: number;
  month: number;
  daysInMonth: number;
  reloadHabits: () => void;
}) {
  const { showXP } = useXPAnimation();

  const today = getTodayString();

  const progress = getHabitMonthProgress(habit, year, month);

  const streak = getHabitStreak(habit);

  const handleToggle = async (day: number, e: React.MouseEvent) => {
    const dateStr = `${year}-${String(month + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    const updatedDates = habit.completedDates.includes(dateStr)
      ? habit.completedDates.filter((d: string) => d !== dateStr)
      : [...habit.completedDates, dateStr];

    const { error } = await supabase
      .from("habits")
      .update({
        completed_dates: updatedDates,
      })
      .eq("id", habit.id);

    if (error) {
      showToast("Erro ao atualizar", "info", "❌");
      return;
    }

    const wasCompleted = habit.completedDates.includes(dateStr);

    if (!wasCompleted) {
      await addXP(5);

      showXP(5, e.clientX, e.clientY);
    }

    reloadHabits();
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("habits").delete().eq("id", habit.id);

    if (error) {
      showToast("Erro ao remover", "info", "❌");
      return;
    }

    showToast("Hábito removido", "info", "🗑️");

    reloadHabits();
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        minHeight: 48,
        paddingBottom: 10,
        paddingTop: 10,
        borderBottom: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* INFO */}

      <div style={{ width: 130, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 3,
          }}
        >
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
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            fontSize: 10,
          }}
        >
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

      {/* DAYS */}

      <div
        style={{
          display: "flex",
          gap: 3,
          flex: 1,
          alignItems: "center",
          overflowX: "auto",
          overflowY: "hidden",
          flexWrap: "nowrap",
          minWidth: 0,
          whiteSpace: "nowrap",
        }}
      >
        {days.map(day => {
          const dateStr = `${year}-${String(month + 1).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;

          const isCompleted = habit.completedDates.includes(dateStr);

          const isFuture = dateStr > today;

          return (
            <button
              key={day}
              onClick={e => !isFuture && handleToggle(day, e)}
              style={{
                background: isCompleted ? habit.color : "var(--border)",
                width: 14,
                height: 14,
                minWidth: 14,
                minHeight: 14,
                borderRadius: "50%",
                border: "none",
                cursor: isFuture ? "default" : "pointer",
                opacity: isFuture ? 0.2 : 1,
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>

      {/* DELETE */}

      <button
        onClick={handleDelete}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--muted-foreground)",
          cursor: "pointer",
        }}
      >
        <Trash2 size={12} />
      </button>
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

  // =========================
  // DATES
  // =========================

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

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
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            Hábitos
          </h1>

          <p
            style={{
              fontSize: 12,
              color: "var(--muted-foreground)",
            }}
          >
            Consistência é tudo 🔥
          </p>
        </div>

        <button className="fz-btn-primary" onClick={() => setShowModal(true)}>
          Novo hábito
        </button>
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
          gap: 20,
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => setViewMonth(prev => (prev === 0 ? 11 : prev - 1))}
        >
          <ChevronLeft size={16} />
        </button>

        <h2>
          {MONTHS[viewMonth]} {viewYear}
        </h2>

        <button
          onClick={() => setViewMonth(prev => (prev === 11 ? 0 : prev + 1))}
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

        <ResponsiveContainer width="100%" height={220}>
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
        className="fz-card"
        style={{
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        {filteredHabits.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 40,
            }}
          >
            Nenhum hábito criado
          </div>
        ) : (
          filteredHabits.map(habit => (
            <HabitRow
              key={habit.id}
              habit={habit}
              year={viewYear}
              month={viewMonth}
              daysInMonth={daysInMonth}
              reloadHabits={loadHabits}
            />
          ))
        )}
      </div>

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
