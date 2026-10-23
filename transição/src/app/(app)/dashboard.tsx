import { useMemo } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getHabitStreak, getTodayString, toYYYYMMDD } from "@/lib/store";
import { getGlobalStreak } from "@/lib/streak";
import { getFinancialData } from "@/store/financial.store";
import { formatCurrency } from "@/lib/financial";
import {
  generateInsights,
  getBestDayOfWeek,
  getCompletionTrend,
  getHabitAdherence,
  getPriorityDistribution,
} from "@/utils/analytics";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, ProgressBar, Screen, SectionTitle, StatTile, Txt } from "@/components/ui";
import { BarChart, DonutChart, Legend, LineChart } from "@/components/charts";
import { resolveColor, useTheme } from "@/theme";

const MILESTONES = [
  { at: 100, label: "Centurião", color: "#f59e0b" },
  { at: 30, label: "Mensal", color: "#8b5cf6" },
  { at: 7, label: "Semana", color: "#10B981" },
  { at: 3, label: "Trio", color: "#06B6D4" },
];

// Porta de pages/Dashboard.tsx.
export default function DashboardScreen() {
  const theme = useTheme();
  const data = useStore();
  const { isPro } = useAuth();
  const { tasks, habits } = data;
  const today = getTodayString();

  const completedToday = tasks.filter(t => t.completed && t.date === today).length;
  const todayTotal = tasks.filter(t => t.date === today).length;
  const habitsToday = habits.filter(h => h.completedDates.includes(today)).length;
  const overdue = tasks.filter(t => !t.completed && t.date < today).length;
  const globalStreak = getGlobalStreak(tasks, habits);
  const milestone = MILESTONES.find(m => globalStreak >= m.at);

  const weeklyData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const now = new Date();
    return days.map((day, index) => {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay() + index);
      const ds = toYYYYMMDD(d);
      return {
        label: day,
        tasks: tasks.filter(t => t.completed && t.date === ds).length,
        habits: habits.filter(h => h.completedDates.includes(ds)).length,
      };
    });
  }, [tasks, habits]);

  const activity = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 30 }, (_, k) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - k));
      const ds = toYYYYMMDD(d);
      return {
        label: String(d.getDate()),
        tasks: tasks.filter(t => t.completed && t.date === ds).length,
        habits: habits.filter(h => h.completedDates.includes(ds)).length,
      };
    });
  }, [tasks, habits]);

  // Mapa de calor dos últimos 90 dias (StreakHeatmap do web).
  const heatmap = useMemo(() => {
    const now = new Date();
    const cells = Array.from({ length: 91 }, (_, k) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (90 - k));
      const ds = toYYYYMMDD(d);
      return (
        tasks.filter(t => t.completed && t.date === ds).length + habits.filter(h => h.completedDates.includes(ds)).length
      );
    });
    return { cells, max: Math.max(1, ...cells) };
  }, [tasks, habits]);

  const trend = getCompletionTrend(tasks);
  const bestDays = getBestDayOfWeek(tasks);
  const priorities = getPriorityDistribution(tasks);
  const adherence = getHabitAdherence(habits);
  const insights = generateInsights(tasks, habits, globalStreak, weeklyData);
  const bestHabit = habits.reduce<{ title: string; streak: number }>(
    (best, h) => {
      const s = getHabitStreak(h);
      return s > best.streak ? { title: h.title, streak: s } : best;
    },
    { title: "-", streak: 0 }
  );

  const finance = getFinancialData();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const monthTx = (finance.transactions || []).filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const income = monthTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <Screen back title="Dashboard" subtitle="Registros diários e evolução mensal">
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name="flame" size={20} color={theme.accent} />
        <Txt variant="display" color={theme.accent} style={{ fontSize: 26 }}>
          {globalStreak}
        </Txt>
        <Txt muted>dias seguidos</Txt>
        {milestone ? (
          <Txt variant="overline" color={milestone.color}>
            · {milestone.label}
          </Txt>
        ) : null}
      </Card>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile icon="checkbox-outline" value={`${completedToday}/${todayTotal}`} label="Tarefas hoje" />
        <StatTile icon="flame-outline" value={`${habitsToday}/${habits.length}`} label="Hábitos hoje" color={theme.accent} />
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile icon="alert-circle-outline" value={String(overdue)} label="Atrasadas" color={theme.danger} />
        <StatTile
          icon={trend.direction === "down" ? "trending-down-outline" : "trending-up-outline"}
          value={`${trend.currentRate}%`}
          label={`Conclusão 7 dias (${trend.delta >= 0 ? "+" : ""}${trend.delta} pp)`}
          color={trend.direction === "down" ? theme.danger : theme.success}
        />
      </View>

      <SectionTitle>Esta semana</SectionTitle>
      <Card>
        <BarChart
          data={weeklyData}
          series={[
            { key: "tasks", label: "Tarefas", color: theme.primary },
            { key: "habits", label: "Hábitos", color: theme.accent },
          ]}
        />
      </Card>

      <SectionTitle>Atividade — últimos 30 dias</SectionTitle>
      <Card>
        <LineChart
          data={activity}
          series={[
            { key: "tasks", label: "Tarefas", color: theme.primary },
            { key: "habits", label: "Hábitos", color: theme.accent },
          ]}
        />
      </Card>

      <SectionTitle>Atividade — últimos 90 dias</SectionTitle>
      <Card>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {heatmap.cells.map((count, i) => (
            <View
              key={i}
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                backgroundColor: count === 0 ? theme.primarySoft : theme.primary,
                opacity: count === 0 ? 1 : 0.35 + 0.65 * (count / heatmap.max),
              }}
            />
          ))}
        </View>
      </Card>

      <SectionTitle>Insights</SectionTitle>
      {insights.length === 0 ? (
        <Card>
          <Txt muted>Continue registrando suas atividades para receber análises.</Txt>
        </Card>
      ) : (
        insights.map((insight, i) => (
          <Card key={i} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
            <Txt style={{ fontSize: 22 }}>{insight.icon}</Txt>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="h3" color={resolveColor(insight.color, theme)}>
                {insight.title}
              </Txt>
              <Txt variant="label" muted>
                {insight.detail}
              </Txt>
            </View>
          </Card>
        ))
      )}

      <SectionTitle>Melhores dias da semana</SectionTitle>
      <Card>
        {bestDays.map(day => (
          <View key={day.day} style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt variant="label">{day.day}</Txt>
              <Txt variant="caption" muted>
                {day.completed}/{day.total} · {Math.round(day.rate)}%
              </Txt>
            </View>
            <ProgressBar percent={day.rate} height={6} />
          </View>
        ))}
      </Card>

      <SectionTitle>Prioridades</SectionTitle>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <DonutChart
          size={110}
          stroke={18}
          slices={priorities.map(p => ({ value: p.value, color: resolveColor(p.color, theme), label: p.name }))}
          center={String(tasks.length)}
        />
        <View style={{ flex: 1 }}>
          <Legend series={priorities.map(p => ({ label: `${p.name} (${p.value})`, color: resolveColor(p.color, theme) }))} />
        </View>
      </Card>

      <SectionTitle>Aderência aos hábitos</SectionTitle>
      <Card>
        {adherence.length === 0 ? (
          <Txt muted>Nenhum hábito ainda.</Txt>
        ) : (
          adherence.map(h => (
            <View key={h.name} style={{ gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt variant="label">{h.name}</Txt>
                <Txt variant="caption" muted>
                  {Math.round(h.rate)}% {h.trend === "up" ? "↑" : h.trend === "down" ? "↓" : ""}
                </Txt>
              </View>
              <ProgressBar percent={h.rate} color={theme.accent} height={6} />
            </View>
          ))
        )}
        <Txt variant="caption" muted>
          Maior sequência: {bestHabit.title} · {bestHabit.streak} dias
        </Txt>
      </Card>

      {isPro && (
        <>
          <SectionTitle>Finanças do mês</SectionTitle>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile icon="arrow-down-circle-outline" value={formatCurrency(income)} label="Receitas" color={theme.success} />
            <StatTile icon="arrow-up-circle-outline" value={formatCurrency(expense)} label="Despesas" color={theme.danger} />
          </View>
        </>
      )}
    </Screen>
  );
}
