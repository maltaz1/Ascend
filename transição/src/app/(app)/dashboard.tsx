import { useMemo } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getTodayString, toYYYYMMDD } from "@/lib/store";
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
import { Card, Marginalia, Metric, ProgressBar, ProgressRing, Screen, Txt } from "@/components/ui";
import { AreaChart, BarChart, DonutChart, Legend } from "@/components/charts";
import { Expandable, SubPanel } from "@/components/Expandable";
import { fonts, resolveColor, useTheme } from "@/theme";

const MILESTONES = [
  { at: 100, label: "Centurião", color: "#f59e0b" },
  { at: 30, label: "Mensal", color: "#8b5cf6" },
  { at: 7, label: "Semana", color: "#10B981" },
  { at: 3, label: "Trio", color: "#06B6D4" },
];
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Porta de pages/Dashboard.tsx.
export default function DashboardScreen() {
  const theme = useTheme();
  const data = useStore();
  const { isPro } = useAuth();
  const { tasks, habits, user } = data;
  const today = getTodayString();

  const completedToday = tasks.filter(t => t.completed && t.date === today).length;
  const todayTotal = tasks.filter(t => t.date === today).length;
  const habitsToday = habits.filter(h => h.completedDates.includes(today)).length;
  const overdue = tasks.filter(t => !t.completed && t.date < today).length;
  const globalStreak = getGlobalStreak(tasks, habits);
  const milestone = MILESTONES.find(m => globalStreak >= m.at);
  let totalXP = user.xp;
  for (let l = 1; l < user.level; l++) totalXP += l * 100;

  const countOn = (ds: string) => ({
    tasks: tasks.filter(t => t.completed && t.date === ds).length,
    habits: habits.filter(h => h.completedDates.includes(ds)).length,
  });

  const weeklyData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const now = new Date();
    return days.map((label, index) => {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay() + index);
      return { label, ...countOn(toYYYYMMDD(d)) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, habits]);

  const monthLine = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 28 }, (_, k) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (27 - k));
      return { label: String(d.getDate()), ...countOn(toYYYYMMDD(d)) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, habits]);

  const yearLine = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - k), 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return {
        label: `${MONTH_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        tasks: tasks.filter(t => t.completed && t.date.startsWith(prefix)).length,
        habits: habits.reduce((s, h) => s + h.completedDates.filter(x => x.startsWith(prefix)).length, 0),
      };
    });
  }, [tasks, habits]);

  // Mapa de calor: 13 semanas (colunas) x 7 dias (linhas), como no GitHub.
  const heatmap = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 90);
    start.setDate(start.getDate() - start.getDay()); // volta até o domingo
    const weeks: { date: string; count: number; future: boolean }[][] = [];
    const cursor = new Date(start);
    while (cursor <= end || cursor.getDay() !== 0) {
      if (cursor.getDay() === 0) weeks.push([]);
      const ds = toYYYYMMDD(cursor);
      const c = countOn(ds);
      weeks[weeks.length - 1].push({ date: ds, count: c.tasks + c.habits, future: cursor > end });
      cursor.setDate(cursor.getDate() + 1);
    }
    const max = Math.max(1, ...weeks.flat().map(c => c.count));
    return { weeks, max };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, habits]);

  const trend = getCompletionTrend(tasks);
  const bestDays = getBestDayOfWeek(tasks);
  const todayIdx = new Date().getDay();
  const priorities = getPriorityDistribution(tasks);
  const adherence = getHabitAdherence(habits);
  const insights = generateInsights(tasks, habits, globalStreak, weeklyData);

  const finance = getFinancialData();
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const monthTx = (finance.transactions || []).filter(t => {
    const d = new Date(`${t.date.slice(0, 10)}T12:00:00`);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const income = monthTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <Screen>
      <Card style={{ gap: 10, paddingVertical: 22 }}>
        <Marginalia index="01">Painel de nível</Marginalia>
        <Txt variant="hero" style={{ fontSize: 32 }}>
          Seu dia, anotado.
        </Txt>
        <Txt muted>
          {user.name || "Você"} — nível {user.level}
        </Txt>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
          <Txt variant="marginalia">NV {user.level}</Txt>
          <Txt variant="marginalia" color={theme.primary}>
            {user.xp} / {user.level * 100} XP
          </Txt>
        </View>
        <ProgressBar percent={(user.xp / (user.level * 100)) * 100} />
      </Card>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric index="02" label="XP" value={String(totalXP)} caption="Experiência total" sub={`Nível ${user.level}`} subColor={theme.primary} />
        <Metric index="03" label="Tarefas" value={String(completedToday)} caption="Concluídas hoje" sub={`${todayTotal} no caderno de hoje`} subColor={theme.success} />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric index="04" label="Hábitos" value={String(habitsToday)} caption="Marcados hoje" sub="hábitos concluídos" subColor="#f97316" />
        <Metric index="05" label="Dívidas" value={String(overdue)} caption="Tarefas atrasadas" sub="pendentes de anotação" subColor={theme.primary} />
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 }}>
        <Ionicons name="flame-outline" size={16} color={theme.accent} />
        <Txt style={{ fontFamily: fonts.display, fontSize: 22 }} color={theme.accent}>
          {globalStreak}
        </Txt>
        <Txt variant="label" muted>
          dias seguidos
        </Txt>
        {milestone ? (
          <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.8 }} color={milestone.color}>
            · {milestone.label.toUpperCase()}
          </Txt>
        ) : null}
      </Card>

      <Expandable icon="calendar-outline" title="Atividade — Últimos 90 dias" subtitle="Registros diários e evolução mensal" defaultOpen>
        <SubPanel label="06A — Heatmap diário">
          <View style={{ flexDirection: "row", gap: 3, justifyContent: "center" }}>
            {heatmap.weeks.map((week, wi) => (
              <View key={wi} style={{ gap: 3 }}>
                {week.map(cell => (
                  <View
                    key={cell.date}
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 3,
                      backgroundColor: cell.future ? "transparent" : cell.count === 0 ? theme.track : theme.primary,
                      opacity: cell.future ? 0 : cell.count === 0 ? 1 : 0.3 + 0.7 * (cell.count / heatmap.max),
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
            <Txt variant="caption" muted>
              Menos
            </Txt>
            {[0, 0.35, 0.6, 0.8, 1].map(o => (
              <View key={o} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: o === 0 ? theme.track : theme.primary, opacity: o || 1 }} />
            ))}
            <Txt variant="caption" muted>
              Mais
            </Txt>
          </View>
        </SubPanel>
        <SubPanel label="06B — Evolução · 12 meses">
          <AreaChart
            data={yearLine}
            series={[
              { key: "tasks", label: "Tarefas", color: theme.primary },
              { key: "habits", label: "Hábitos", color: "#a78bfa" },
            ]}
            height={180}
          />
        </SubPanel>
      </Expandable>

      <Card>
        <Marginalia index="07">Linha do mês</Marginalia>
        <AreaChart
          data={monthLine}
          series={[
            { key: "tasks", label: "Tarefas", color: theme.primary },
            { key: "habits", label: "Hábitos", color: "#a78bfa" },
          ]}
          height={190}
        />
      </Card>

      <Card>
        <Marginalia index="08">Semana</Marginalia>
        <BarChart
          data={weeklyData}
          series={[
            { key: "tasks", label: "Tarefas", color: theme.primary },
            { key: "habits", label: "Hábitos", color: "#a78bfa" },
          ]}
          highlightIndex={todayIdx}
        />
      </Card>

      <Expandable icon="bulb-outline" title="Insights" subtitle="Análises automáticas do seu desempenho" defaultOpen>
        {insights.length === 0 ? (
          <Txt muted>Continue registrando suas atividades para receber análises.</Txt>
        ) : (
          insights.map((insight, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 14 }}>
              <Txt variant="marginalia" style={{ width: 24, marginTop: 3 }}>
                {`0.${i + 1}`}
              </Txt>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt variant="h3" color={resolveColor(insight.color, theme)}>
                  {insight.title}
                </Txt>
                <Txt variant="label" muted>
                  {insight.detail}
                </Txt>
              </View>
            </View>
          ))
        )}
      </Expandable>

      <Card>
        <Marginalia index="11">Tendência</Marginalia>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <ProgressRing percent={trend.currentRate} size={84} stroke={7} color={trend.direction === "down" ? theme.danger : theme.success}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 18 }}>{trend.currentRate}%</Txt>
          </ProgressRing>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt variant="label" muted>
              Últimos 7 dias vs 7 dias anteriores
            </Txt>
            <Txt variant="h3" color={trend.direction === "down" ? theme.danger : theme.success}>
              {trend.direction === "down" ? "▼" : "▲"} {Math.abs(trend.delta)} pontos ({trend.previousRate}% → {trend.currentRate}%)
            </Txt>
            <Txt variant="caption" muted>
              Comparação da taxa de conclusão entre as duas janelas
            </Txt>
          </View>
        </View>
      </Card>

      <Card>
        <Marginalia index="12">Dia da semana</Marginalia>
        <BarChart
          data={bestDays.map(d => ({ label: d.day, completed: d.completed }))}
          series={[{ key: "completed", label: "Concluídas", color: theme.primary }]}
          highlightIndex={todayIdx}
        />
      </Card>

      <Card>
        <Marginalia index="13">Prioridades</Marginalia>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <DonutChart
            size={110}
            stroke={16}
            slices={priorities.map(p => ({ value: p.value, color: resolveColor(p.color, theme), label: p.name }))}
            center={String(tasks.length)}
          />
          <View style={{ flex: 1 }}>
            <Legend series={priorities.map(p => ({ label: `${p.name} (${p.value})`, color: resolveColor(p.color, theme) }))} />
          </View>
        </View>
      </Card>

      <Card>
        <Marginalia index="14">Aderência aos hábitos</Marginalia>
        {adherence.length === 0 ? (
          <Txt muted>Nenhum hábito ainda.</Txt>
        ) : (
          adherence.map(h => (
            <View key={h.name} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt variant="label">{h.name}</Txt>
                <Txt variant="mono" color={theme.accent}>
                  {Math.round(h.rate)}% {h.trend === "up" ? "↑" : h.trend === "down" ? "↓" : ""}
                </Txt>
              </View>
              <ProgressBar percent={h.rate} color={theme.accent} />
            </View>
          ))
        )}
      </Card>

      {isPro && (
        <Card>
          <Marginalia index="15">Finanças</Marginalia>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View>
              <Txt variant="caption" muted>
                Receitas do mês
              </Txt>
              <Txt variant="mono" color={theme.success} style={{ fontSize: 16 }}>
                {formatCurrency(income)}
              </Txt>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Txt variant="caption" muted>
                Despesas do mês
              </Txt>
              <Txt variant="mono" color={theme.danger} style={{ fontSize: 16 }}>
                {formatCurrency(expense)}
              </Txt>
            </View>
          </View>
        </Card>
      )}
    </Screen>
  );
}
