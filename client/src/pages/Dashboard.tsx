import React, { useMemo, useEffect, useState } from "react";

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
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import { AnimatedCounter } from "@/components/ui/AnimatedCounter";


function getTodayString() {
  return new Date().toISOString().split("T")[0];
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
              color: p.color,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export default function Dashboard() {
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

  const completedToday = tasks.filter(
    t => t.completed && t.date === today
  ).length;

  const habitsToday = habits.filter(
    h =>
      h.completed_dates &&
      Array.isArray(h.completed_dates) &&
      h.completed_dates.includes(today)
  ).length;

  const todayTasks = tasks.filter(t => t.date === today).length;

  const overdueTasks = tasks.filter(t => !t.completed && t.date < today).length;

  const activityData = useMemo(() => {
    const result = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date();

      d.setDate(d.getDate() - i);

      const ds = d.toISOString().split("T")[0];

      const completedTasks = tasks.filter(
        t => t.completed && t.date === ds
      ).length;

      const completedHabits = habits.filter(
        h =>
          h.completed_dates &&
          Array.isArray(h.completed_dates) &&
          h.completed_dates.includes(ds)
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

    return days.map((day, index) => {
      const now = new Date();

      const currentDay = new Date();

      currentDay.setDate(now.getDate() - now.getDay() + index);

      const ds = currentDay.toISOString().split("T")[0];

      const completedTasks = tasks.filter(
        t => t.completed && t.date === ds
      ).length;

      const completedHabits = habits.filter(
        h =>
          h.completed_dates &&
          Array.isArray(h.completed_dates) &&
          h.completed_dates.includes(ds)
      ).length;

      return {
        day,
        tasks: completedTasks,
        habits: completedHabits,
      };
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

  const xpPercent = profile?.xp
    ? Math.min((profile.xp / levelXP) * 100, 100)
    : 0;

  if (!profile) {
    return (
      <div style={{ color: "white", padding: 20 }}>Carregando dashboard...</div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* HERO */}
      <div
        style={{
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          marginBottom: 28,
          height: 180,
          background:
            "linear-gradient(135deg, #0B1020 0%, #111827 40%, #1E1B4B 100%)",
        }}
      >
        <img
          src="./src/image/fundo-dashboard.jpg"
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
            background:
              "linear-gradient(135deg, rgba(7,10,20,0.85) 0%, rgba(15,23,42,0.65) 50%, rgba(88,28,135,0.45) 100%)",
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
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "white",
                marginBottom: 6,
              }}
            >
              Olá, {profile?.name || "Usuário"} 👋
            </h1>

            <p
              style={{
                color: "var(--muted-foreground)",
                fontSize: 14,
              }}
            >
              Continue evoluindo hoje.
            </p>
          </div>

          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginBottom: 6,
              }}
            >
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
                  background:
                    "linear-gradient(90deg,#38BDF8 0%, #3B82F6 45%, #A855F7 100%)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* METRICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <MetricCard
          icon={Zap}
          label="XP Total"
          value={totalXP}
          sub={`Nível ${profile?.level || 1}`}
          color="#3B82F6"
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

      {/* CHARTS */}
      <div className="dashboard-charts">
        {/* AREA */}
        <div className="fz-card" style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <TrendingUp size={16} color="#3B82F6" />

            <h3
              style={{
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Atividade — Últimos 30 dias
            </h3>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
                stroke="#3B82F6"
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

        {/* WEEK */}
        <div className="fz-card" style={{ padding: "22px 24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <Award size={16} color="#A855F7" />

            <h3
              style={{
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              Semana Atual
            </h3>
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
                fill="#3B82F6"
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
    </div>
  );
}
