import React, { useMemo } from "react";

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

import { CircularProgress } from "@/components/ui/CircularProgress";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

// =========================
// COMPONENTS
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
  const [open, setOpen] = React.useState(defaultOpen);

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

function StreakHeatmap({ tasks, habits }: { tasks: any[]; habits: any[] }) {
  const days = 90;
  
  const { weeks, maxCount } = useMemo(() => {
    const heatmapData: { date: string; count: number }[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = toYYYYMMDD(d);
      const completedTasks = tasks.filter((t) => t.completed && t.date === ds).length;
      const completedHabits = habits.filter(
        (h) => h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(ds)
      ).length;
      heatmapData.push({ date: ds, count: completedTasks + completedHabits });
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

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 4, paddingLeft: 28, marginBottom: 8 }}>
        {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"].map((m, i) => (
          <span
            key={i}
            style={{
              fontSize: 10,
              color: "var(--muted-foreground)",
              width: 24,
              visibility: i % 2 === 0 ? "visible" : "hidden",
            }}
          >
            {m}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginRight: 4,
            paddingTop: 2,
          }}
        >
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                color: "var(--muted-foreground)",
                height: 16,
                lineHeight: "16px",
                visibility: i % 2 === 1 ? "visible" : "hidden",
              }}
            >
              {d}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={day.date ? `${day.date}: ${day.count} atividades` : ""}
                  style={{
                    width: 16,
                    height: 16,
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
  const { user: profile, tasks, habits, financial } = store;
  const today = getTodayString();

  const metrics = useMemo(() => {
    const completedToday = tasks.filter((t) => t.completed && t.date === today).length;
    const habitsToday = habits.filter(
      (h) => h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(today)
    ).length;
    const todayTasksCount = tasks.filter((t) => t.date === today).length;
    const overdueTasks = tasks.filter((t) => !t.completed && t.date < today).length;
    
    let totalXP = profile?.xp || 0;
    if (profile?.level) {
      for (let i = 1; i < profile.level; i++) {
        totalXP += i * 100;
      }
    }

    const levelXP = (profile?.level || 1) * 100;
    const xpPercent = profile?.xp ? Math.min((profile.xp / levelXP) * 100, 100) : 0;

    return {
      completedToday,
      habitsToday,
      todayTasksCount,
      overdueTasks,
      totalXP,
      levelXP,
      xpPercent
    };
  }, [tasks, habits, profile, today]);

  const activityData = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const ds = toYYYYMMDD(d);
      const completedTasks = tasks.filter((t) => t.completed && t.date === ds).length;
      const completedHabits = habits.filter(
        (h) => h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(ds)
      ).length;
      result.push({
        day: d.getDate(),
        tasks: completedTasks,
        habits: completedHabits,
      });
    }
    return result;
  }, [tasks, habits]);

  const weeklyData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    return days.map((day, index) => {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + index);
      const ds = toYYYYMMDD(currentDay);
      const completedTasks = tasks.filter((t) => t.completed && t.date === ds).length;
      const completedHabits = habits.filter(
        (h) => h.completedDates && Array.isArray(h.completedDates) && h.completedDates.includes(ds)
      ).length;
      return { day, tasks: completedTasks, habits: completedHabits };
    });
  }, [tasks, habits]);

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

  const habitStreaks = useMemo(() => {
    const todayDate = new Date();
    return habits.map((h) => {
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
      return { name: h.title || "Hábito", streak };
    });
  }, [habits]);

  const bestHabitStreak = useMemo(() => {
    if (habitStreaks.length === 0) return { name: "-", streak: 0 };
    return habitStreaks.reduce(
      (max, h) => (h.streak > max.streak ? h : max),
      habitStreaks[0]
    );
  }, [habitStreaks]);

  const financialStats = useMemo(() => {
    const transactions = financial.transactions || [];
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const monthlyExpenses = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && t.type === "expense";
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyIncome = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear && t.type === "income";
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const balanceMap = new Map<string, { date: string; balance: number }>();
    let balance = 0;
    sorted.forEach((t) => {
      balance += t.type === "income" ? t.amount : -t.amount;
      const dateStr = new Date(t.date).toLocaleDateString("pt-BR");
      balanceMap.set(dateStr, { date: dateStr, balance });
    });

    const categories: Record<string, number> = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = t.category || "Outros";
        categories[cat] = (categories[cat] || 0) + t.amount;
      });

    return {
      monthlyExpenses,
      monthlyIncome,
      balanceEvolution: Array.from(balanceMap.values()),
      expensesByCategory: Object.entries(categories)
        .map(([category, value]) => ({ category, value }))
        .sort((a, b) => b.value - a.value)
    };
  }, [financial.transactions]);

  const monthlyCompletionRate = useMemo(() => {
    const now = new Date();
    const monthTasks = tasks.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const completed = monthTasks.filter((t) => t.completed).length;
    const total = monthTasks.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [tasks]);

  if (!profile || !profile.name) {
    return (
      <div style={{ color: "white", padding: 20 }}>Carregando dashboard...</div>
    );
  }

  const COLORS = ["#8B5CF6", "#A855F7", "#D946EF", "#EC4899", "#F43F5E", "#F97316"];

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
              Olá, {profile.name} 👋
            </h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
              Continue evoluindo hoje.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
              Nível {profile.level} • {profile.xp}/{metrics.levelXP} XP
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
                  width: `${metrics.xpPercent}%`,
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
          value={metrics.totalXP}
          sub={`Nível ${profile.level}`}
          color="#8B5CF6"
          trend="up"
        />
        <MetricCard
          icon={CheckSquare}
          label="Tarefas Hoje"
          value={metrics.completedToday}
          sub={`de ${metrics.todayTasksCount} tarefas`}
          color="#10B981"
          trend="up"
        />
        <MetricCard
          icon={Flame}
          label="Hábitos Hoje"
          value={metrics.habitsToday}
          sub="hábitos concluídos"
          color="#F97316"
          trend="up"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Atrasadas"
          value={metrics.overdueTasks}
          sub="tarefas pendentes"
          color="#A855F7"
          trend={metrics.overdueTasks > 0 ? "down" : "up"}
        />
      </div>

      {/* ===== STREAK BADGE ===== */}
      <div style={{ marginBottom: 20 }}>
        <StreakBadge streak={globalStreak} />
      </div>

      {/* ===== HEATMAP ===== */}
      <ExpandableSection
        icon={Calendar}
        title="Atividade — Últimos 90 dias"
        subtitle="Heatmap de atividades diárias"
        defaultOpen={true}
      >
        <StreakHeatmap tasks={tasks} habits={habits} />
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

      {/* ===== CONSISTENCY & FINANCE ===== */}
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
            <Wallet size={16} color="#A855F7" />
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>Finanças Mensais</h3>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, padding: 12, background: "rgba(16,185,129,0.08)", borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: "#10B981", marginBottom: 4 }}>Receitas</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>R$ {financialStats.monthlyIncome.toFixed(2)}</div>
            </div>
            <div style={{ flex: 1, padding: 12, background: "rgba(239,68,68,0.08)", borderRadius: 12 }}>
              <div style={{ fontSize: 11, color: "#EF4444", marginBottom: 4 }}>Despesas</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>R$ {financialStats.monthlyExpenses.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== FINANCE CHARTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
        <div className="fz-card p-5 lg:p-6">
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Evolução do Saldo</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={financialStats.balanceEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
              <Area type="monotone" dataKey="balance" stroke="#8B5CF6" fill="#8B5CF620" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="fz-card p-5 lg:p-6">
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Gastos por Categoria</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={financialStats.expensesByCategory}
                dataKey="value"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={60}
                innerRadius={40}
              >
                {financialStats.expensesByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===== BEST STREAK ===== */}
      <div className="fz-card p-5 lg:p-6 mb-8">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(249,115,22,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Flame size={20} color="#F97316" />
          </div>
          <div>
            <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Melhor Streak de Hábito</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {bestHabitStreak.name}: {bestHabitStreak.streak} dias
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
