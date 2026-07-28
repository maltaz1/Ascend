import React, { useMemo, useEffect, useState } from "react";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  Dumbbell,
  Wallet,
  Droplets,
  Trophy,
  Calendar,
  Activity,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useStore } from "@/hooks/useStore";
import {
  getWorkoutProgressData,
  getWorkoutSessions,
  getGymStats,
} from "@/store/workouts.store";
import { getTodayString, toYYYYMMDD } from "@/store/utils";
import {
  getTodayMeals,
  getTodayNutrition,
  getTodayHydration,
} from "@/store/diet.store";
import { getFinancialData } from "@/store/financial.store";
import { getGoalProgress } from "@/store/goals.store";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { CircularProgress } from "@/components/ui/CircularProgress";

// =========================
// TYPES
// =========================
type Goal = {
  id: string;
  title: string;
  description?: string;
  emoji: string;
  color: string;
  deadline?: string;
  steps: { id: string; title: string; completed: boolean }[];
  completedAt?: string | null;
  createdAt: string;
};

// =========================
// EXPANDABLE SECTION
// =========================
function ExpandableSection({
  icon,
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
          <icon size={16} color="#8B5CF6" />
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
  const heatmapData: { date: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = toYYYYMMDD(d);
    const completedTasks = tasks.filter((t) => t.completed && t.date === ds).length;
    const completedHabits = habits.filter(
      (h) => h.completed_dates && Array.isArray(h.completed_dates) && h.completed_dates.includes(ds)
    ).length;
    heatmapData.push({ date: ds, count: completedTasks + completedHabits });
  }

  const maxCount = Math.max(...heatmapData.map((d) => d.count), 1);

  const weeks: { date: string; count: number }[][] = [];
  let currentWeek: { date: string; count: number }[] = [];

  const firstDay = new Date();
  firstDay.setDate(firstDay.getDate() - days + 1);
  const startDayOfWeek = firstDay.getDay();
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push({ date: "", count: -1 });
  }
  for (const day of heatmapData) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push({ date: "", count: -1 });
    weeks.push(currentWeek);
  }

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
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: tasksData } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id);

    const { data: habitsData } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id);

    setProfile(profileData);
    setTasks(tasksData || []);
    setHabits(habitsData || []);
  };

  const today = getTodayString();

  const completedToday = tasks.filter((t) => t.completed && t.date === today).length;
  const habitsToday = habits.filter(
    (h) => h.completed_dates && Array.isArray(h.completed_dates) && h.completed_dates.includes(today)
  ).length;
  const todayTasks = tasks.filter((t) => t.date === today).length;
  const overdueTasks = tasks.filter((t) => !t.completed && t.date < today).length;

  // --- Activity 30 days ---
  const activityData = useMemo(() => {
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = toYYYYMMDD(d);
      const completedTasks = tasks.filter((t) => t.completed && t.date === ds).length;
      const completedHabits = habits.filter(
        (h) => h.completed_dates && Array.isArray(h.completed_dates) && h.completed_dates.includes(ds)
      ).length;
      result.push({
        day: d.getDate(),
        tasks: completedTasks,
        habits: completedHabits,
      });
    }
    return result;
  }, [tasks, habits]);

  // --- Weekly data ---
  const weeklyData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return days.map((day, index) => {
      const now = new Date();
      const currentDay = new Date();
      currentDay.setDate(now.getDate() - now.getDay() + index);
      const ds = toYYYYMMDD(currentDay);
      const completedTasks = tasks.filter((t) => t.completed && t.date === ds).length;
      const completedHabits = habits.filter(
        (h) => h.completed_dates && Array.isArray(h.completed_dates) && h.completed_dates.includes(ds)
      ).length;
      return { day, tasks: completedTasks, habits: completedHabits };
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

  // --- Workout data from store ---
  const sessions = useMemo(() => getWorkoutSessions(), []);
  const workoutProgress = useMemo(() => getWorkoutProgressData(), []);
  const gymStats = useMemo(() => getGymStats(), []);

  const lastWorkout = useMemo(() => {
    if (sessions.length === 0) return null;
    return sessions[0];
  }, [sessions]);

  // --- Goals from store ---
  const goals: Goal[] = store.goals || [];
  const activeGoals = useMemo(
    () => goals.filter((g) => !g.completedAt).slice(0, 5),
    [goals]
  );
  const completedGoals = useMemo(
    () => goals.filter((g) => g.completedAt).length,
    [goals]
  );

  // --- Calculate global streak from tasks + habits (Supabase data) ---
  const globalStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let offset = 0; offset < 365; offset++) {
      const d = new Date(today);
      d.setDate(d.getDate() - offset);
      const ds = toYYYYMMDD(d);
      const completedTask = tasks.some((t) => t.completed && t.date === ds);
      const completedHabit = habits.some(
        (h) => h.completed_dates && Array.isArray(h.completed_dates) && h.completed_dates.includes(ds)
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
    return habits.map((h: any) => {
      const completedDates = h.completed_dates || [];
      let streak = 0;
      const today = new Date();
      for (let offset = 0; offset < 365; offset++) {
        const d = new Date(today);
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

  const bestHabitStreak = useMemo(() => {
    if (habitStreaks.length === 0) return { name: "-", streak: 0 };
    return habitStreaks.reduce(
      (max: any, h: any) => (h.streak > max.streak ? h : max),
      habitStreaks[0]
    );
  }, [habitStreaks]);

  // --- Diet / Hydration ---
  const todayMeals = useMemo(() => getTodayMeals(), []);
  const todayNutrition = useMemo(() => getTodayNutrition(), []);
  const todayHydration = useMemo(() => getTodayHydration(), []);

  const dietSettings = store.diet?.settings;

  const macrosData = useMemo(() => {
    const n = todayNutrition;
    return [
      {
        name: "Proteína",
        value: n.totalProtein || 0,
        goal: dietSettings?.proteinGoal || 120,
        color: "#8B5CF6",
      },
      {
        name: "Carbs",
        value: n.totalCarbs || 0,
        goal: dietSettings?.carbsGoal || 200,
        color: "#10B981",
      },
      {
        name: "Gordura",
        value: n.totalFat || 0,
        goal: dietSettings?.fatGoal || 70,
        color: "#F97316",
      },
    ];
  }, [todayNutrition, dietSettings]);

  // --- Financial data from store (income/expense model) ---
  const financialData = useMemo(() => getFinancialData(), []);
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

  // --- Achievements ---
  const achievements = store.achievements || [];
  const unlockedAchievements = useMemo(
    () => achievements.filter((a: any) => a.unlockedAt),
    [achievements]
  );
  const recentAchievements = useMemo(() => {
    return [...unlockedAchievements]
      .sort(
        (a: any, b: any) =>
          new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime()
      )
      .slice(0, 3);
  }, [unlockedAchievements]);

  // --- Monthly summary ---
  const monthlySummary = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const thisMonthStr = `${thisYear}-${String(thisMonth + 1).padStart(2, "0")}`;

    const monthTasks = tasks.filter((t) => {
      if (!t.date) return false;
      return t.date.startsWith(thisMonthStr) && t.completed;
    }).length;

    const monthHabits = habits
      .filter((h) => h.completed_dates && Array.isArray(h.completed_dates))
      .reduce((sum, h) => {
        const count = (h.completed_dates as string[]).filter(
          (d: string) => d.startsWith(thisMonthStr)
        ).length;
        return sum + count;
      }, 0);

    const monthWorkouts = sessions.filter((s) => s.date?.startsWith(thisMonthStr)).length;

    return { monthTasks, monthHabits, monthWorkouts };
  }, [tasks, habits, sessions]);

  // --- Consistency ---
  const monthlyCompletionRate = useMemo(() => {
    const now = new Date();
    const monthTasks = tasks.filter((t) => {
      const tMonth = new Date(t.date).getMonth();
      const tYear = new Date(t.date).getFullYear();
      return tMonth === now.getMonth() && tYear === now.getFullYear();
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
      <div className="flex flex-wrap gap-6 mb-4 lg:flex-row flex-col">
        <div className="fz-card flex-1 min-w-[320px] p-5 lg:p-6 box-border min-w-0 lg:min-w-[320px] w-full lg:w-auto">
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
        <div className="fz-card flex-1 min-w-[320px] p-5 lg:p-6 box-border min-w-0 lg:min-w-[320px] w-full lg:w-auto">
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

      {/* ===== CONSISTENCY ===== */}
      <div className="flex flex-wrap gap-6 mb-4 lg:flex-row flex-col">
        <div className="fz-card flex-1 min-w-[280px] p-5 lg:p-6">
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

        <div className="fz-card flex-1 min-w-[280px] p-5 lg:p-6">
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

      {/* ===== GOALS ===== */}
      <ExpandableSection
        icon={Target}
        title="Metas em Andamento"
        subtitle={`${activeGoals.length} metas ativas • ${completedGoals} concluídas`}
        defaultOpen={true}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeGoals.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 20,
                color: "var(--muted-foreground)",
                fontSize: 13,
              }}
            >
              Nenhuma meta ativa. Crie uma na aba de Metas!
            </div>
          ) : (
            activeGoals.map((goal) => {
              const progress = getGoalProgress(goal);
              return (
                <div
                  key={goal.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: `${goal.color}08`,
                    border: `1px solid ${goal.color}20`,
                  }}
                >
                  <CircularProgress
                    value={progress}
                    size={42}
                    strokeWidth={3}
                    color={goal.color}
                  >
                    <span style={{ fontSize: 16 }}>{goal.emoji}</span>
                  </CircularProgress>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {goal.title}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>
                      {progress}% concluído
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ExpandableSection>

      {/* ===== TREINOS ===== */}
      <ExpandableSection
        icon={Dumbbell}
        title="Treinos"
        subtitle={`${gymStats.totalWorkouts} treinos realizados`}
        defaultOpen={false}
      >
        {sessions.length > 0 ? (
          <>
            {lastWorkout && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.2)",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(168,85,247,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Dumbbell size={20} color="#A855F7" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {lastWorkout.workoutName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                    Volume: {lastWorkout.totalVolume?.toFixed(0) || 0} kg •{" "}
                    {lastWorkout.durationMinutes || 0} min
                  </div>
                </div>
              </div>
            )}
            {workoutProgress.length > 1 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                  Evolução do Peso Médio
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={workoutProgress.slice(-14)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      tickFormatter={(date) =>
                        new Date(date).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })
                      }
                    />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      name="Peso Médio"
                      stroke="#A855F7"
                      dot={{ fill: "#A855F7", r: 4 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: 20,
              color: "var(--muted-foreground)",
              fontSize: 13,
            }}
          >
            Nenhum treino registrado ainda.
          </div>
        )}
      </ExpandableSection>

      {/* ===== FINANÇAS ===== */}
      <ExpandableSection
        icon={Wallet}
        title="Finanças"
        subtitle={`Saldo: R$ ${(monthlyIncome - monthlyExpenses).toFixed(2)} • Gastos: R$ ${monthlyExpenses.toFixed(2)}`}
        defaultOpen={false}
      >
        {balanceEvolution.length > 0 ? (
          <>
            <div style={{ marginBottom: 16 }}>
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
                <ResponsiveContainer width="100%" height={180}>
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
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
          </>
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

      {/* ===== DIETA / HIDRATAÇÃO ===== */}
      <ExpandableSection
        icon={Droplets}
        title="Dieta & Hidratação"
        subtitle={`${todayMeals.length} refeições hoje`}
        defaultOpen={false}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Macros do Dia
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {macrosData.map((macro) => {
              const pct = Math.min((macro.value / macro.goal) * 100, 100);
              return (
                <div key={macro.name}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: macro.color, fontWeight: 500 }}>
                      {macro.name}
                    </span>
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {macro.value}g / {macro.goal}g
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: macro.color,
                        borderRadius: 999,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(6,182,212,0.08)",
            border: "1px solid rgba(6,182,212,0.2)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(6,182,212,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Droplets size={20} color="#06B6D4" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Hidratação</div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              {todayHydration.cupsConsumed || 0} / {todayHydration.goal || 8} copos
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#06B6D4" }}>
            {Math.round(
              ((todayHydration.cupsConsumed || 0) / Math.max(todayHydration.goal || 1, 1)) *
                100
            )}
            %
          </div>
        </div>
      </ExpandableSection>

      {/* ===== CONQUISTAS ===== */}
      <ExpandableSection
        icon={Trophy}
        title="Conquistas"
        subtitle={`${unlockedAchievements.length} desbloqueadas`}
        defaultOpen={false}
      >
        {recentAchievements.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentAchievements.map((a: any) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.15)",
                }}
              >
                <span style={{ fontSize: 24 }}>{a.emoji}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {a.description}
                  </div>
                </div>
              </div>
            ))}
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
            Complete tarefas e hábitos para desbloquear conquistas!
          </div>
        )}
      </ExpandableSection>

      {/* ===== RESUMO DO MÊS ===== */}
      <ExpandableSection
        icon={Activity}
        title="Resumo do Mês"
        subtitle="Seu progresso mensal consolidado"
        defaultOpen={false}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "14px 10px",
              borderRadius: 12,
              background: "rgba(139,92,246,0.08)",
              border: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#8B5CF6" }}>
              <AnimatedCounter value={monthlySummary.monthTasks} />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
              Tarefas feitas
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "14px 10px",
              borderRadius: 12,
              background: "rgba(249,115,22,0.08)",
              border: "1px solid rgba(249,115,22,0.15)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F97316" }}>
              <AnimatedCounter value={monthlySummary.monthHabits} />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
              Hábitos feitos
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "14px 10px",
              borderRadius: 12,
              background: "rgba(168,85,247,0.08)",
              border: "1px solid rgba(168,85,247,0.15)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: "#A855F7" }}>
              <AnimatedCounter value={monthlySummary.monthWorkouts} />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 4 }}>
              Treinos
            </div>
          </div>
        </div>
      </ExpandableSection>
    </div>
  );
}
