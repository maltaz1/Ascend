import React, { useMemo, useEffect, useState } from "react";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import {
  Zap,
  CheckSquare,
  Flame,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Target,
  Wallet,
  Calendar,
} from "lucide-react";

import { useStore } from "@/hooks/useStore";
import { getTodayString, toYYYYMMDD } from "@/store/utils";

import { getFinancialData } from "@/store/financial.store";
import {
  generateInsights,
  getBestDayOfWeek,
  getCompletionTrend,
  getHabitAdherence,
  getPriorityDistribution,
} from "@/utils/analytics";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

// =========================
// STREAK BADGE
// =========================
function ExpandableSection({
  icon: Icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="fz-card"
      style={{
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "18px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--foreground)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(139, 92, 246, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} color="#8B5CF6" />
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          {subtitle && (
            <div
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
        {open ? (
          <ChevronUp size={18} color="var(--muted-foreground)" />
        ) : (
          <ChevronDown size={18} color="var(--muted-foreground)" />
        )}
      </button>
      <div
        style={{
          maxHeight: open ? 2000 : 0,
          overflow: "hidden",
          transition: "max-height 0.3s ease",
          padding: open ? "0 20px 20px" : "0 20px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =========================
// METRIC CARD
// =========================
function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  trend?: "up" | "down";
}) {
  return (
    <div
      className="fz-card"
      style={{
        padding: "20px 22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: color,
          opacity: 0.06,
          filter: "blur(20px)",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={color} />
        </div>

        {trend === "up" && <TrendingUp size={14} color="#10B981" />}
        {trend === "down" && <TrendingDown size={14} color="#EF4444" />}
      </div>

      <div
        className="fz-metric-number"
        style={{
          fontSize: 32,
          color: "var(--foreground)",
          marginBottom: 4,
        }}
      >
        {typeof value === "number" ? <AnimatedCounter value={value} /> : value}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "var(--muted-foreground)",
        }}
      >
        {label}
      </div>

      {sub && (
        <div
          style={{
            fontSize: 12,
            color,
            marginTop: 4,
            fontWeight: 500,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// =========================
// STREAK BADGE
// =========================
function StreakBadge({ streak }: { streak: number }) {
  const milestones = [
    { at: 100, label: "Centurião", color: "#F59E0B" },
    { at: 30, label: "Mensal", color: "#A855F7" },
    { at: 7, label: "Semana", color: "#10B981" },
    { at: 3, label: "Trio", color: "#06B6D4" },
  ];

  const currentMilestone = milestones.find((m) => streak >= m.at);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 18px",
        background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(168,85,247,0.1))",
        borderRadius: 14,
        border: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "rgba(245,158,11,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Flame size={22} color="#F59E0B" />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#F59E0B" }}>
          {streak}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          dias seguidos
          {currentMilestone && (
            <span style={{ color: currentMilestone.color, fontWeight: 600 }}>
              {" "}
              • {currentMilestone.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================
// HEATMAP
// =========================
function StreakHeatmap({ tasks, habits }: { tasks: any[]; habits: any[] }) {
  const days = 90;

  const { weeks, maxCount } = useMemo(() => {
    const heatmapData: { date: string; count: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = toYYYYMMDD(d);
      const completedTasksCount = tasks.filter((t) => t.completed && t.date === ds).length;
      const completedHabitsCount = habits.filter(
        (h) => h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(ds)
      ).length;
      heatmapData.push({ date: ds, count: completedTasksCount + completedHabitsCount });
    }

    const max = Math.max(...heatmapData.map((d) => d.count), 1);
    const resultWeeks: { date: string; count: number }[][] = [];
    let currentWeek: { date: string; count: number }[] = [];

    const firstDay = new Date(today);
    firstDay.setDate(firstDay.getDate() - days + 1);
    const startDayOfWeek = firstDay.getDay();

    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({ date: "", count: -1 });
    }
    for (const day of heatmapData) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        resultWeeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push({ date: "", count: -1 });
      resultWeeks.push(currentWeek);
    }

    return { weeks: resultWeeks, maxCount: max };
  }, [tasks, habits]);

  const getColor = (count: number) => {
    if (count === -1) return "rgba(255,255,255,0.03)";
    if (count === 0) return "rgba(139,92,246,0.08)";
    const intensity = count / maxCount;
    if (intensity < 0.25) return "rgba(139,92,246,0.2)";
    if (intensity < 0.5) return "rgba(139,92,246,0.4)";
    if (intensity < 0.75) return "rgba(139,92,246,0.6)";
    return "rgba(139,92,246,0.9)";
  };

  // Células: 16px de largura + 4px de gap entre colunas
  const CELL = 16;
  const CELL_GAP = 4;

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Rótulos dos meses — largura alinhada às colunas (16 + 4 por coluna, exceto a última) */}
      <div
        style={{
          display: "flex",
          marginBottom: 8,
        }}
      >
        <div style={{ width: 20, flexShrink: 0 }} />
        {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => (
          <span
            key={i}
            style={{
              fontSize: 10,
              color: "var(--muted-foreground)",
              width: CELL,
              minWidth: CELL,
              marginRight: i < 11 ? CELL_GAP : 0,
              visibility: i % 2 === 0 ? "visible" : "hidden",
              textAlign: "left",
            }}
          >
            {m}
          </span>
        ))}
      </div>
      <div style={{ display: "flex" }}>
        {/* Rótulos dos dias da semana — altura alinhada às linhas (16 + 4 por linha) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 20,
            flexShrink: 0,
          }}
        >
          {(["D", "S", "T", "Q", "Q", "S", "S"] as const).map((d, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                color: "var(--muted-foreground)",
                height: CELL,
                lineHeight: `${CELL}px`,
                visibility: i % 2 === 1 ? "visible" : "hidden",
              }}
            >
              {d}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: CELL_GAP }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day.date ? `${day.date}: ${day.count} atividades` : ""}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 4,
                    background: getColor(day.count),
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 10,
          justifyContent: "flex-end",
          paddingRight: 4,
        }}
      >
        <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginRight: 4 }}>
          Menos
        </span>
        {[
          "rgba(139,92,246,0.08)",
          "rgba(139,92,246,0.2)",
          "rgba(139,92,246,0.4)",
          "rgba(139,92,246,0.6)",
          "rgba(139,92,246,0.9)",
        ].map((c, i) => (
          <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: "var(--muted-foreground)", marginLeft: 4 }}>
          Mais
        </span>
      </div>
    </div>
  );
}

// =========================
// CUSTOM TOOLTIP
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
        <p style={{ color: "var(--muted-foreground)", fontSize: 12, marginBottom: 4 }}>
          {label}
        </p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// =========================
// MAIN DASHBOARD
// =========================
export default function Dashboard() {
  const store = useStore();
  const { user: profile, tasks, habits } = store;
  const today = getTodayString();

  const completedToday = useMemo(() => tasks.filter((t) => t.completed && t.date === today).length, [tasks, today]);
  const habitsToday = useMemo(() => habits.filter(
    (h) => h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(today)
  ).length, [habits, today]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today).length, [tasks, today]);
  const overdueTasks = useMemo(() => tasks.filter((t) => !t.completed && t.date < today).length, [tasks, today]);

  // --- Activity 30 days ---
  const activityData = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = toYYYYMMDD(d);
      const completedTasksCount = tasks.filter((t) => t.completed && t.date === ds).length;
      const completedHabitsCount = habits.filter(
        (h) => h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(ds)
      ).length;
      result.push({
        day: d.getDate(),
        tasks: completedTasksCount,
        habits: completedHabitsCount,
      });
    }
    return result;
  }, [tasks, habits]);

  // --- Weekly data ---
  const weeklyData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const now = new Date();
    return days.map((day, index) => {
      const currentDay = new Date(now);
      currentDay.setDate(now.getDate() - now.getDay() + index);
      const ds = toYYYYMMDD(currentDay);
      const completedTasksCount = tasks.filter((t) => t.completed && t.date === ds).length;
      const completedHabitsCount = habits.filter(
        (h) => h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(ds)
      ).length;
      return { day, tasks: completedTasksCount, habits: completedHabitsCount };
    });
  }, [tasks, habits]);

  const totalXP = useMemo(() => {
    if (!profile) return 0;
    let total = profile.xp;
    for (let i = 1; i < profile.level; i++) {
      total += i * 100;
    }
    return total;
  }, [profile]);

  const levelXP = (profile?.level || 1) * 100;
  const xpPercent = profile?.xp ? Math.min((profile.xp / levelXP) * 100, 100) : 0;

  // --- Calculate global streak from tasks + habits (Supabase data) ---
  const globalStreak = useMemo(() => {
    let streak = 0;
    const todayDate = new Date();
    for (let offset = 0; offset < 365; offset++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - offset);
      const ds = toYYYYMMDD(d);
      const completedTask = tasks.some((t) => t.completed && t.date === ds);
      const completedHabit = habits.some(
        (h) => h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(ds)
      );
      if (completedTask || completedHabit) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }, [tasks, habits]);

  // --- Habit streaks from Supabase data (normalized) ---
  const habitStreaks = useMemo(() => {
    const todayDate = new Date();
    return habits.map((h: any) => {
      const completedDates = h.completedDates || [];
      let streak = 0;
      for (let offset = 0; offset < 365; offset++) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() - offset);
        const dateKey = toYYYYMMDD(d);
        if (completedDates.includes(dateKey)) {
          streak++;
        } else {
          break;
        }
      }
      return {
        name: h.title || "Hábito",
        streak,
      };
    });
  }, [habits]);

  // =========================
  // ANALYTICS AVANÇADAS
  // =========================
  // Evolução mensal — últimos 12 meses (tarefas + hábitos concluídos por mês)
  const monthlyTrend = useMemo(() => {
    const result = [];
    const now = new Date();
    const monthNames = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez",
    ];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
      const tasksCompleted = tasks.filter(
        (t) => t.completed && t.date.startsWith(prefix)
      ).length;
      const habitsCompleted = habits.reduce(
        (sum, h) =>
          sum +
          (h.completedDates || []).filter((ds) => ds.startsWith(prefix)).length,
        0
      );
      result.push({
        month: `${monthNames[month]}/${String(year).slice(2)}`,
        tasks: tasksCompleted,
        habits: habitsCompleted,
      });
    }
    return result;
  }, [tasks, habits]);

  const completionTrend = useMemo(() => getCompletionTrend(tasks), [tasks]);
  const bestDaysOfWeek = useMemo(() => getBestDayOfWeek(tasks), [tasks]);
  const priorityDistribution = useMemo(() => getPriorityDistribution(tasks), [tasks]);
  const habitAdherence = useMemo(() => getHabitAdherence(habits), [habits]);
  const insights = useMemo(
    () => generateInsights(tasks, habits, globalStreak, weeklyData),
    [tasks, habits, globalStreak, weeklyData]
  );

  const bestHabitStreak = useMemo(() => {
    if (habitStreaks.length === 0) return { name: "-", streak: 0 };
    return habitStreaks.reduce(
      (max: any, h: any) => (h.streak > max.streak ? h : max),
      habitStreaks[0]
    );
  }, [habitStreaks]);

  // --- Financial data from store (income/expense model) ---
  const financialData = useMemo(() => getFinancialData(), [store.financial]);
  const financialTransactions = financialData.transactions || [];

  const monthlyExpenses = useMemo(() => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    return financialTransactions
      .filter((t: any) => {
        const d = new Date(t.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && t.type === "expense";
      })
      .reduce((sum: number, t: any) => sum + t.amount, 0);
  }, [financialTransactions]);

  const monthlyIncome = useMemo(() => {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    return financialTransactions
      .filter((t: any) => {
        const d = new Date(t.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && t.type === "income";
      })
      .reduce((sum: number, t: any) => sum + t.amount, 0);
  }, [financialTransactions]);

  const balanceEvolution = useMemo(() => {
    const sorted = [...financialTransactions].sort(
      (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const map = new Map<string, { date: string; balance: number }>();
    let balance = 0;
    sorted.forEach((t: any) => {
      const value = t.type === "income" ? t.amount : -t.amount;
      balance += value;
      const dateStr = new Date(t.date).toLocaleDateString("pt-BR");
      const existing = map.get(dateStr);
      if (existing) {
        existing.balance = balance;
      } else {
        map.set(dateStr, { date: dateStr, balance });
      }
    });
    return Array.from(map.values());
  }, [financialTransactions]);

  const expensesByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    financialTransactions
      .filter((t: any) => t.type === "expense")
      .forEach((t: any) => {
        const cat = t.category || "Outros";
        categories[cat] = (categories[cat] || 0) + t.amount;
      });
    return Object.entries(categories)
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
  }, [financialTransactions]);

  // --- Consistency ---
  const monthlyCompletionRate = useMemo(() => {
    const now = new Date();
    const todayStr = toYYYYMMDD(now);
    // Only consider tasks from days that have already passed (or today) in the current month
    const monthTasks = tasks.filter((t) => {
      const tDate = new Date(t.date);
      const tMonth = tDate.getMonth();
      const tYear = tDate.getFullYear();
      return (
        tMonth === now.getMonth() &&
        tYear === now.getFullYear() &&
        t.date <= todayStr
      );
    });
    const completed = monthTasks.filter((t) => t.completed).length;
    const total = monthTasks.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [tasks]);

  if (!profile) {
    return (
      <div style={{ color: "white", padding: 20 }}>Carregando dashboard...</div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ===== HERO ===== */}
      <div
        style={{
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          marginBottom: 28,
          height: 180,
          background: "linear-gradient(135deg, #0B1020 0%, #111827 40%, #1E1B4B 100%)",
        }}
      >
        <img
          src="/fundo-dashboard.jpg"
          alt="Fundo do Dashboard"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(88,28,135,0.45) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            padding: "28px 32px",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "white", marginBottom: 6 }}>
              Olá, {profile?.name || "Usuário"} 👋
            </h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
              Continue evoluindo hoje.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
              Nível {profile?.level || 1} • {profile?.xp || 0}/{levelXP} XP
            </div>
            <div
              style={{
                width: 240,
                height: 8,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${xpPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg,#38BDF8 0%, #8B5CF6 45%, #A855F7 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== METRICS ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <MetricCard
          icon={Zap}
          label="XP Total"
          value={totalXP}
          sub={`Nível ${profile?.level || 1}`}
          color="#8B5CF6"
          trend="up"
        />
        <MetricCard
          icon={CheckSquare}
          label="Tarefas Hoje"
          value={completedToday}
          sub={`de ${todayTasks} tarefas`}
          color="#10B981"
          trend="up"
        />
        <MetricCard
          icon={Flame}
          label="Hábitos Hoje"
          value={habitsToday}
          sub="hábitos concluídos"
          color="#F97316"
          trend="up"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Atrasadas"
          value={overdueTasks}
          sub="tarefas pendentes"
          color="#A855F7"
          trend={overdueTasks > 0 ? "down" : "up"}
        />
      </div>

      {/* ===== STREAK BADGE ===== */}
      <div style={{ marginBottom: 20 }}>
        <StreakBadge streak={globalStreak} />
      </div>

      {/* ===== HEATMAP + MENSAL (lado a lado) ===== */}
      <ExpandableSection
        icon={Calendar}
        title="Atividade — Últimos 90 dias"
        subtitle="Heatmap de atividades diárias e evolução mensal"
        defaultOpen={true}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--muted-foreground)",
                marginBottom: 8,
              }}
            >
              Heatmap diário
            </div>
            <StreakHeatmap tasks={tasks} habits={habits} />
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "var(--muted-foreground)",
                marginBottom: 8,
              }}
            >
              Evolução — últimos 12 meses
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="gradMonthly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMonthlyHabits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  name="Tarefas"
                  stroke="#8B5CF6"
                  fill="url(#gradMonthly)"
                />
                <Area
                  type="monotone"
                  dataKey="habits"
                  name="Hábitos"
                  stroke="#A855F7"
                  fill="url(#gradMonthlyHabits)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ExpandableSection>

      {/* ===== MAIN CHARTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
        <div className="fz-card p-5 lg:p-6" style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <TrendingUp size={16} color="#8B5CF6" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>
              Atividade — Últimos 30 dias
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradHabits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="tasks"
                name="Tarefas"
                stroke="#8B5CF6"
                fill="url(#gradTasks)"
              />
              <Area
                type="monotone"
                dataKey="habits"
                name="Hábitos"
                stroke="#A855F7"
                fill="url(#gradHabits)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="fz-card p-5 lg:p-6" style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Award size={16} color="#A855F7" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Semana Atual</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="tasks"
                name="Tarefas"
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="habits"
                name="Hábitos"
                fill="#A855F7"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== INSIGHTS ===== */}
      <ExpandableSection
        icon={Zap}
        title="Insights"
        subtitle="Análises automáticas do seu desempenho"
        defaultOpen={true}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.map((insight, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(139, 92, 246, 0.06)",
                border: `1px solid ${insight.color}25`,
              }}
            >
              <span style={{ fontSize: 18 }}>{insight.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: insight.color }}>
                  {insight.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                  {insight.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* ===== TENDÊNCIA DE PRODUTIVIDADE ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
        <div className="fz-card p-5 lg:p-6" style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <TrendingUp size={16} color="#06B6D4" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Tendência de Conclusão</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <CircularProgress
              value={completionTrend.currentRate}
              size={90}
              strokeWidth={6}
              color={
                completionTrend.direction === "up"
                  ? "#10B981"
                  : completionTrend.direction === "down"
                  ? "#EF4444"
                  : "#06B6D4"
              }
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color:
                    completionTrend.direction === "up"
                      ? "#10B981"
                      : completionTrend.direction === "down"
                      ? "#EF4444"
                      : "#06B6D4",
                }}
              >
                {completionTrend.currentRate}%
              </span>
            </CircularProgress>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 4 }}>
                Últimos 7 dias vs 7 dias anteriores
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color:
                    completionTrend.direction === "up"
                      ? "#10B981"
                      : completionTrend.direction === "down"
                      ? "#EF4444"
                      : "var(--foreground)",
                }}
              >
                {completionTrend.direction === "up" && "▲"}
                {completionTrend.direction === "down" && "▼"}
                {completionTrend.direction === "stable" && "●"} {Math.abs(completionTrend.delta)}{" "}
                pontos ({completionTrend.previousRate}% → {completionTrend.currentRate}%)
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>
                Comparação da taxa de conclusão entre as duas janelas
              </div>
            </div>
          </div>
        </div>

        <div className="fz-card p-5 lg:p-6" style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Calendar size={16} color="#F59E0B" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Produtividade por Dia da Semana</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={bestDaysOfWeek}
              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="completed"
                name="Concluídas"
                fill="#8B5CF6"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="total"
                name="Total agendadas"
                fill="rgba(139, 92, 246, 0.25)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== CONSISTÊNCIA (ADERÊNCIA DE HÁBITOS + PRIORIDADES) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
        <div className="fz-card p-5 lg:p-6">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Target size={16} color="#10B981" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Aderência de Hábitos — 30 dias</h3>
          </div>
          {habitAdherence.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {habitAdherence.map((h, index) => (
                <div key={index}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{h.name}</span>
                    <span
                      style={{
                        color:
                          h.trend === "up" ? "#10B981" : h.trend === "down" ? "#EF4444" : "var(--muted-foreground)",
                        fontWeight: 600,
                      }}
                    >
                      {h.trend === "up" ? "▲" : h.trend === "down" ? "▼" : "●"} {h.rate}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "rgba(255,255,255,0.08)",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${h.rate}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #10B981 0%, #8B5CF6 100%)",
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 12, color: "var(--muted-foreground)", fontSize: 13 }}>
              Adicione hábitos para acompanhar sua aderência.
            </div>
          )}
        </div>

        <div className="fz-card p-5 lg:p-6">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Award size={16} color="#A855F7" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Tarefas por Prioridade — 30 dias</h3>
          </div>
          {priorityDistribution.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={priorityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {priorityDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {priorityDistribution.map((entry, index) => (
                  <div
                    key={index}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                  >
                    <div
                      style={{ width: 12, height: 12, borderRadius: 4, background: entry.color }}
                    />
                    <span style={{ fontWeight: 600 }}>{entry.name}</span>
                    <span style={{ color: "var(--muted-foreground)", marginLeft: "auto" }}>
                      {entry.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 12, color: "var(--muted-foreground)", fontSize: 13 }}>
              Complete tarefas nos últimos 30 dias para ver a distribuição por prioridade.
            </div>
          )}
        </div>
      </div>

      {/* ===== CONSISTÊNCIA ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
        <div className="fz-card p-5 lg:p-6">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Target size={16} color="#10B981" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Taxa de Consistência</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <CircularProgress value={monthlyCompletionRate} size={90} strokeWidth={6} color="#10B981">
              <span style={{ fontSize: 18, fontWeight: 800, color: "#10B981" }}>
                {monthlyCompletionRate}%
              </span>
            </CircularProgress>
            <div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
                Tarefas do mês
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>
                {monthlyCompletionRate >= 80
                  ? "Excelente!"
                  : monthlyCompletionRate >= 50
                  ? "Bom ritmo"
                  : "Pode melhorar"}
              </div>
            </div>
          </div>
        </div>

        <div className="fz-card p-5 lg:p-6">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Flame size={16} color="#F59E0B" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Melhor Hábito</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                background: "rgba(245,158,11,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              🔥
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{bestHabitStreak.name}</div>
              <div style={{ fontSize: 13, color: "#F59E0B", fontWeight: 600 }}>
                {bestHabitStreak.streak} dias seguidos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FINANÇAS ===== */}
      <ExpandableSection
        icon={Wallet}
        title="Finanças"
        subtitle={`Saldo: R$ ${(monthlyIncome - monthlyExpenses).toFixed(2)} • Gastos: R$ ${monthlyExpenses.toFixed(2)}`}
        defaultOpen={false}
      >
        {balanceEvolution.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                Evolução do Saldo
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={balanceEvolution}>
                  <defs>
                    <linearGradient id="gradBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Saldo"
                    stroke="#10B981"
                    fill="url(#gradBalance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {expensesByCategory.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                  Gastos por Categoria
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                      nameKey="category"
                      stroke="none"
                    >
                      {expensesByCategory.map((entry: any, index: number) => (
                        <Cell key={index} fill={`hsl(${index * 50}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, justifyContent: "center" }}>
                  {expensesByCategory.map((entry: any, index: number) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: `hsl(${index * 50}, 70%, 60%)`,
                        }}
                      />
                      {entry.category}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: 20,
              color: "var(--muted-foreground)",
              fontSize: 13,
            }}
          >
            Nenhuma transação financeira registrada.
          </div>
        )}
      </ExpandableSection>
    </div>
  );
}
