import { Animated, Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getGoalProgress, getTaskStatus, getTodayString, toYYYYMMDD } from "@/lib/store";
import type { Goal, Habit, Task } from "@/lib/store";
import { getGlobalStreak } from "@/lib/streak";
import { useStore } from "@/hooks/useStore";
import { AnimatedNumber, AnimatedText, EmptyState, GlassIconButton, HeroCard, ProgressBar, ProgressRing, Screen, Txt } from "@/components/ui";
import { useCheckPop } from "@/lib/motion";
import { toggleHabitWithGoals, toggleTask, weeklyDays } from "@/components/rows";
import { fonts, resolveColor, useTheme, withAlpha } from "@/theme";

const logo = require("../../../assets/logo-mark.png");

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const PRIORITY_LABEL: Record<Task["priority"], string> = { low: "Prioridade baixa", medium: "Prioridade média", high: "Prioridade alta" };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function encouragement(percent: number): string {
  if (percent >= 100) return "Dia completo! Você mandou muito bem.";
  if (percent >= 60) return "Quase lá, falta pouco!";
  if (percent > 0) return "Bom ritmo. Continue assim!";
  return "Comece pelo mais simples.";
}

// Dias seguidos com o hábito feito, contando de hoje (ou de ontem, se hoje ainda falta).
function habitStreak(habit: Habit): number {
  const done = new Set(habit.completedDates);
  const day = new Date();
  if (!done.has(toYYYYMMDD(day))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (done.has(toYYYYMMDD(day))) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

// Porta da aba "Hoje" do web (pages/Today.tsx) no novo visual.
export default function TodayScreen() {
  const theme = useTheme();
  const data = useStore();
  const today = getTodayString();
  const todayTasks = data.tasks.filter(task => task.date === today);
  const tasksDone = todayTasks.filter(task => task.completed).length;
  const habitsDone = data.habits.filter(habit => habit.completedDates.includes(today)).length;
  const total = todayTasks.length + data.habits.length;
  const done = tasksDone + habitsDone;
  const overall = total > 0 ? Math.round((done / total) * 100) : 0;
  const levelMax = data.user.level * 100;
  const streak = getGlobalStreak(data.tasks, data.habits);
  const goals = [...data.goals].sort((a, b) => Number(a.type !== "semanal") - Number(b.type !== "semanal") || a.title.localeCompare(b.title));

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
          <Image source={logo} style={{ width: 30, height: 30, tintColor: "#fff" }} resizeMode="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="label" muted>
            {greeting()},
          </Txt>
          <Txt variant="h1" style={{ fontSize: 21 }} numberOfLines={1}>
            {data.user.name?.split(" ")[0] || "você"}
          </Txt>
        </View>
        <GlassIconButton icon="calendar-outline" label="Abrir calendário" onPress={() => router.push("/calendar")} />
      </View>

      <HeroCard>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <ProgressRing percent={overall} size={112} stroke={11}>
            <Txt style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.8 }}>
              <AnimatedNumber value={overall} style={{ fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.8 }} />
              <Txt style={{ fontFamily: fonts.display, fontSize: 15 }} muted>
                %
              </Txt>
            </Txt>
          </ProgressRing>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt variant="h2" style={{ fontSize: 20 }}>
              Progresso do dia
            </Txt>
            <Txt variant="label" muted>
              {encouragement(overall)}
            </Txt>
            <AnimatedText variant="bodyStrong" text={`${done} de ${total} concluídos`} />
          </View>
        </View>
        <View style={{ gap: 7 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt variant="caption" muted>
              Nível <Txt variant="caption" style={{ fontFamily: fonts.bodySemi }}>{data.user.level}</Txt>
            </Txt>
            <Txt variant="caption" muted>
              <AnimatedNumber variant="caption" style={{ fontFamily: fonts.bodySemi }} value={data.user.xp} />{" "}
              / {levelMax} XP
            </Txt>
          </View>
          <ProgressBar percent={(data.user.xp / levelMax) * 100} color={theme.accent} height={8} />
        </View>
      </HeroCard>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile icon="checkmark" color={theme.success} value={`${tasksDone}/${todayTasks.length}`} label="Tarefas" />
        <StatTile icon="layers-outline" color={theme.primaryInk} value={`${habitsDone}/${data.habits.length}`} label="Hábitos" />
        <StatTile icon="flame-outline" color={theme.accent} value={`${streak}d`} label="Streak" />
      </View>

      <WeekStrip tasks={data.tasks} habits={data.habits} />

      <Section title="Tarefas de hoje" link="Ver todas" onLink={() => router.replace("/tasks")}>
        {todayTasks.length === 0 ? (
          <EmptyState text="Nenhuma tarefa para hoje." />
        ) : (
          todayTasks.map(task => <TodayTask key={task.id} task={task} />)
        )}
      </Section>

      <Section title="Hábitos do dia" link="Ver todos" onLink={() => router.replace("/habits")}>
        {data.habits.length === 0 ? (
          <EmptyState text="Você ainda não tem hábitos." />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {data.habits.map(habit => (
              <HabitTile key={habit.id} habit={habit} date={today} />
            ))}
          </View>
        )}
      </Section>

      {goals.length > 0 ? (
        <Section title="Metas" link="Ver todas" onLink={() => router.replace("/goals")}>
          {goals.map(goal => (
            <GoalTile key={goal.id} goal={goal} habits={data.habits} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

function Section({ title, link, onLink, children }: { title: string; link: string; onLink: () => void; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 4 }}>
        <Txt variant="h2" style={{ fontSize: 19 }}>
          {title}
        </Txt>
        <Pressable onPress={onLink} hitSlop={10} accessibilityRole="link">
          <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 13.5 }} color={theme.primaryInk}>
            {link}
          </Txt>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

function StatTile({ icon, color, value, label }: { icon: keyof typeof Ionicons.glyphMap; color: string; value: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: 10, padding: 14, borderRadius: 20, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border }}>
      <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: withAlpha(color.startsWith("#") ? color : theme.primary, 0.18), alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View>
        <AnimatedText style={{ fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.6 }} text={value} />
        <Txt variant="caption" muted>
          {label}
        </Txt>
      </View>
    </View>
  );
}

function WeekStrip({ tasks, habits }: { tasks: Task[]; habits: Habit[] }) {
  const theme = useTheme();
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - todayIdx);

  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: 7 }, (_, i) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        const key = toYYYYMMDD(day);
        const dayTasks = tasks.filter(t => t.date === key);
        const hasItems = dayTasks.length + habits.length > 0;
        const full = i < todayIdx && hasItems && dayTasks.every(t => t.completed) && habits.every(h => h.completedDates.includes(key));
        const isToday = i === todayIdx;
        return (
          <View
            key={key}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 6,
              paddingVertical: 10,
              borderRadius: 18,
              backgroundColor: isToday ? theme.primary : "transparent",
            }}
          >
            <Txt variant="caption" color={isToday ? "rgba(255,255,255,0.85)" : theme.inkMuted}>
              {WEEKDAYS[day.getDay()]}
            </Txt>
            <Txt style={{ fontFamily: fonts.display, fontSize: 16 }} color={isToday ? "#fff" : theme.ink}>
              {day.getDate()}
            </Txt>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isToday ? "#fff" : full ? theme.success : theme.track }} />
          </View>
        );
      })}
    </View>
  );
}

function CheckCircle({ done }: { done: boolean }) {
  const theme = useTheme();
  const scale = useCheckPop(done);
  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: done ? 0 : 2,
        borderColor: theme.inkMuted,
        backgroundColor: done ? theme.primary : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
    </Animated.View>
  );
}

function TodayTask({ task }: { task: Task }) {
  const theme = useTheme();
  const overdue = getTaskStatus(task) === "overdue";
  const dot = { low: theme.success, medium: theme.accent, high: theme.danger }[task.priority];
  return (
    <Pressable
      onPress={() => void toggleTask(task)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.completed }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        paddingVertical: 13,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <CheckCircle done={task.completed} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt
          style={{ fontFamily: fonts.bodyMedium, fontSize: 15, textDecorationLine: task.completed ? "line-through" : "none" }}
          muted={task.completed}
          numberOfLines={1}
        >
          {task.title}
        </Txt>
        <Txt variant="caption" color={overdue && !task.completed ? theme.danger : theme.inkMuted}>
          {overdue && !task.completed ? "Atrasada" : task.isRecurring ? "Recorrente" : PRIORITY_LABEL[task.priority]}
        </Txt>
      </View>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />
    </Pressable>
  );
}

function HabitTile({ habit, date }: { habit: Habit; date: string }) {
  const theme = useTheme();
  const done = habit.completedDates.includes(date);
  const color = resolveColor(habit.color, theme);
  const streak = habitStreak(habit);
  return (
    <Pressable
      onPress={() => void toggleHabitWithGoals(habit, date)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={habit.title}
      style={({ pressed }) => ({
        width: "48%",
        flexGrow: 1,
        gap: 14,
        padding: 14,
        borderRadius: 22,
        backgroundColor: done ? withAlpha(theme.primary, 0.13) : theme.surface,
        borderWidth: 1,
        borderColor: done ? withAlpha(theme.primary, 0.4) : theme.border,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: withAlpha(color, 0.18), alignItems: "center", justifyContent: "center" }}>
          <Txt style={{ fontSize: 18 }}>{habit.emoji}</Txt>
        </View>
        <CheckCircle done={done} />
      </View>
      <View style={{ gap: 3 }}>
        <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 14.5 }} numberOfLines={2}>
          {habit.title}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="flame" size={13} color={theme.accent} />
          <Txt variant="caption" muted>
            {streak} {streak === 1 ? "dia" : "dias"}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

function GoalTile({ goal, habits }: { goal: Goal; habits: Habit[] }) {
  const theme = useTheme();
  const color = resolveColor(goal.color, theme);
  const weekly = goal.type === "semanal";
  const target = Math.max(1, goal.targetFrequency ?? 1);
  const weekDone = weekly ? weeklyDays(goal, habits).filter(Boolean).length : 0;
  const percent = weekly ? Math.min(100, Math.round((weekDone / target) * 100)) : getGoalProgress(goal);
  const caption = weekly ? `${weekDone} de ${target} nesta semana` : `${goal.steps.filter(s => s.completed).length} de ${goal.steps.length} etapas`;

  return (
    <Pressable
      onPress={() => router.replace("/goals")}
      style={({ pressed }) => ({
        gap: 12,
        padding: 14,
        borderRadius: 20,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: withAlpha(color, 0.18), alignItems: "center", justifyContent: "center" }}>
          <Txt style={{ fontSize: 19 }}>{goal.emoji?.trim() || "🎯"}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 15 }} numberOfLines={1}>
            {goal.title}
          </Txt>
          <Txt variant="caption" muted>
            {caption}
          </Txt>
        </View>
        <AnimatedText style={{ fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.5 }} text={`${percent}%`} />
      </View>
      <ProgressBar percent={percent} color={weekly ? theme.accent : theme.primary} />
    </Pressable>
  );
}
