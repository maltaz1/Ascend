import { Alert, Pressable, ScrollView, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  completeTask,
  getGoalProgress,
  getHabitMonthRate,
  getHabitStreak,
  getTaskStatus,
  getTodayString,
  toggleHabitDate,
  uncompleteTask,
} from "@/lib/store";
import type { Goal, Habit, Task } from "@/lib/store";
import { removeGoal, toggleLongTermStep, toggleWeeklyGoalDay } from "@/store/goals.store";
import { syncHabitToGoals } from "@/lib/syncHabitGoals";
import { WEEKDAY_LABELS, getMondayOfDate, getLinkedHabitWeekCheckins } from "@/lib/weeklyGoals";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { fonts, resolveColor, useTheme } from "@/theme";
import { Badge, Card, ProgressBar, Txt } from "./ui";

const PRIORITY_LABEL: Record<Task["priority"], string> = { low: "Baixa", medium: "Média", high: "Alta" };

// ---------------------------------------------------------------------------
// Tarefa
// ---------------------------------------------------------------------------

export function TaskRow({ task, onLongPress, onPress }: { task: Task; onLongPress?: () => void; onPress?: () => void }) {
  const theme = useTheme();
  const status = getTaskStatus(task);
  const priorityColor = { low: theme.inkMuted, medium: theme.accent, high: theme.danger }[task.priority];

  const toggle = async () => {
    if (task.completed) {
      await uncompleteTask(task.id);
      notifyInfo("Tarefa desmarcada");
      return;
    }
    const { xpGained } = await completeTask(task.id);
    if (xpGained > 0) notifySuccess(`Tarefa concluída! +${xpGained} XP`);
  };

  return (
    <Pressable
      onPress={onPress ?? toggle}
      onLongPress={onLongPress}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}
    >
      <Pressable onPress={toggle} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked: task.completed }}>
        <Ionicons
          name={task.completed ? "checkmark-circle" : "ellipse-outline"}
          size={26}
          color={task.completed ? theme.success : theme.inkMuted}
        />
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt
          variant="bodyStrong"
          muted={task.completed}
          style={{ textDecorationLine: task.completed ? "line-through" : "none" }}
        >
          {task.title}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: priorityColor }} />
          <Txt variant="caption" color={status === "overdue" ? theme.danger : theme.inkMuted}>
            {status === "overdue" ? "Atrasada · " : ""}
            {PRIORITY_LABEL[task.priority]}
            {task.category ? ` · ${task.category}` : ""}
            {task.isRecurring ? " · Recorrente" : ""}
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Hábito (linha simples, usada em Hoje)
// ---------------------------------------------------------------------------

// Marca o hábito e mantém metas semanais vinculadas em sincronia (como no web).
export async function toggleHabitWithGoals(habit: Habit, date: string) {
  const wasDone = habit.completedDates.includes(date);
  await toggleHabitDate(habit.id, date);
  const updatedDates = wasDone ? habit.completedDates.filter(d => d !== date) : [...habit.completedDates, date];
  void syncHabitToGoals({ id: habit.id, completed_dates: updatedDates });
  if (wasDone) notifyInfo("Hábito desmarcado");
  else notifySuccess("Hábito concluído!");
}

export function HabitRow({ habit, date, onLongPress }: { habit: Habit; date: string; onLongPress?: () => void }) {
  const theme = useTheme();
  const done = habit.completedDates.includes(date);
  const color = resolveColor(habit.color, theme);
  const streak = getHabitStreak(habit);

  return (
    <Pressable
      onPress={() => void toggleHabitWithGoals(habit, date)}
      onLongPress={onLongPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6, opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: done ? color : `${color}22`,
          borderWidth: 1,
          borderColor: `${color}66`,
        }}
      >
        <Txt style={{ fontSize: 20 }}>{habit.emoji}</Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="bodyStrong">{habit.title}</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="flame" size={12} color={theme.accent} />
          <Txt variant="caption" muted>
            {streak} {streak === 1 ? "dia" : "dias"} · meta {habit.targetDays} dias
          </Txt>
        </View>
      </View>
      <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={26} color={done ? color : theme.inkMuted} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Hábito em cartão com o mês inteiro (HabitCard do web)
// ---------------------------------------------------------------------------

export function HabitMonthCard({
  habit,
  year,
  month,
  onLongPress,
}: {
  habit: Habit;
  year: number;
  month: number;
  onLongPress?: () => void;
}) {
  const theme = useTheme();
  const today = getTodayString();
  const color = resolveColor(habit.color, theme);
  const streak = getHabitStreak(habit);
  const rate = getHabitMonthRate(habit, year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { day: i + 1, key, weekday: d.getDay() };
  });

  return (
    <Card>
      <Pressable onLongPress={onLongPress} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${color}22`,
            borderWidth: 1,
            borderColor: `${color}66`,
          }}
        >
          <Txt style={{ fontSize: 22 }}>{habit.emoji}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="h3">{habit.title}</Txt>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
            <Txt variant="caption" color={theme.accent} style={{ fontFamily: fonts.bodySemi }}>
              🔥 {streak} {streak === 1 ? "dia" : "dias"}
            </Txt>
            <Txt variant="caption" muted>
              {Math.round(rate)}% no mês
            </Txt>
          </View>
        </View>
        <Pressable
          onPress={() => void toggleHabitWithGoals(habit, today)}
          hitSlop={8}
          accessibilityLabel="Marcar hoje"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: habit.completedDates.includes(today) ? color : theme.primarySoft,
          }}
        >
          <Txt
            variant="label"
            color={habit.completedDates.includes(today) ? "#fff" : theme.primaryInk}
            style={{ fontFamily: fonts.bodySemi }}
          >
            {habit.completedDates.includes(today) ? "Feito ✓" : "Hoje"}
          </Txt>
        </Pressable>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {days.map(({ day, key, weekday }) => {
          const done = habit.completedDates.includes(key);
          const future = key > today;
          const isToday = key === today;
          return (
            <Pressable
              key={key}
              disabled={future}
              onPress={() => void toggleHabitWithGoals(habit, key)}
              style={{ alignItems: "center", gap: 3, opacity: future ? 0.35 : 1 }}
            >
              <Txt variant="caption" muted style={{ fontSize: 10 }}>
                {"DSTQQSS"[weekday]}
              </Txt>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? color : "transparent",
                  borderWidth: isToday ? 2 : 1,
                  borderColor: isToday ? theme.primary : done ? color : theme.border,
                }}
              >
                <Txt variant="caption" color={done ? "#fff" : theme.inkMuted} style={{ fontFamily: fonts.bodySemi }}>
                  {day}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <ProgressBar percent={Math.min(100, (habit.completedDates.length / Math.max(1, habit.targetDays)) * 100)} color={color} height={6} />
      <Txt variant="caption" muted>
        {habit.completedDates.length}/{habit.targetDays} dias da meta
      </Txt>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------

function confirmDeleteGoal(goal: Goal) {
  Alert.alert("Excluir meta", `Excluir "${goal.title}"?`, [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Excluir",
      style: "destructive",
      onPress: async () => {
        const { error } = await removeGoal(goal.id);
        if (error) notifyError("Não foi possível remover a meta", error);
        else notifyInfo("Meta deletada");
      },
    },
  ]);
}

// Os dias vêm do hábito vinculado quando existe (fonte de verdade no web).
export function weeklyDays(goal: Goal, habits: Habit[]): boolean[] {
  const weekStart = getMondayOfDate(new Date());
  const belongs = !goal.weekStart || goal.weekStart === weekStart;
  const stored = Array.from({ length: 7 }, (_, i) => (belongs ? Boolean(goal.daysCompletedWeek?.[i]) : false));
  const linked = goal.linkedHabitId ? habits.find(h => h.id === goal.linkedHabitId) : undefined;
  if (!linked) return stored;
  const checkins = getLinkedHabitWeekCheckins({ id: linked.id, completed_dates: linked.completedDates }, weekStart);
  return checkins.map((value, i) => value || stored[i]);
}

export function WeeklyGoalCard({ goal, habits, compact }: { goal: Goal; habits: Habit[]; compact?: boolean }) {
  const theme = useTheme();
  const color = resolveColor(goal.color, theme);
  const days = weeklyDays(goal, habits);
  const target = Math.max(1, goal.targetFrequency ?? 1);
  const completed = days.filter(Boolean).length;
  const hit = completed >= target;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const linked = goal.linkedHabitId ? habits.find(h => h.id === goal.linkedHabitId) : undefined;

  const toggle = async (index: number) => {
    const { error } = await toggleWeeklyGoalDay(goal.id, index);
    if (error) notifyInfo(error);
  };

  return (
    <Card accent={hit ? theme.success : undefined}>
      <Pressable onLongPress={() => confirmDeleteGoal(goal)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${color}22`,
            borderWidth: 1,
            borderColor: `${color}66`,
          }}
        >
          <Txt style={{ fontSize: 18 }}>{goal.emoji?.trim() || goal.title.charAt(0).toUpperCase()}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="h3" numberOfLines={1}>
            {goal.title}
          </Txt>
          <Txt variant="caption" muted>
            {completed}/{target} vezes nesta semana
            {linked ? ` · ${linked.emoji} ${linked.title}` : ""}
          </Txt>
        </View>
        {hit ? <Badge label="Batida!" solid color={theme.success} /> : null}
      </Pressable>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {WEEKDAY_LABELS.map((label, index) => {
          const done = days[index];
          const future = index > todayIdx;
          return (
            <Pressable
              key={`${label}-${index}`}
              disabled={future}
              onPress={() => void toggle(index)}
              style={{ alignItems: "center", gap: 4, opacity: future ? 0.35 : 1 }}
            >
              <View
                style={{
                  width: compact ? 32 : 36,
                  height: compact ? 32 : 36,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? color : "transparent",
                  borderWidth: index === todayIdx ? 2 : 1,
                  borderColor: index === todayIdx ? theme.primary : done ? color : theme.border,
                }}
              >
                {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <Txt variant="caption" muted style={{ fontSize: 10 }}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      {!compact && (goal.streak ?? 0) > 0 ? (
        <Txt variant="caption" color={theme.accent}>
          🔥 {goal.streak} {goal.streak === 1 ? "semana seguida" : "semanas seguidas"} · recorde {goal.recordStreak ?? goal.streak}
        </Txt>
      ) : null}
    </Card>
  );
}

export function LongTermGoalCard({ goal, expanded }: { goal: Goal; expanded?: boolean }) {
  const theme = useTheme();
  const color = resolveColor(goal.color, theme);
  const progress = getGoalProgress(goal);
  const done = Boolean(goal.completedAt);

  const toggleStep = async (stepId: string) => {
    const { xpGained, goalCompleted } = await toggleLongTermStep(goal.id, stepId);
    if (goalCompleted) notifySuccess(`Meta concluída! +${xpGained} XP`, goal.title);
  };

  return (
    <Card accent={done ? theme.success : undefined}>
      <Pressable onLongPress={() => confirmDeleteGoal(goal)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${color}22`,
            borderWidth: 1,
            borderColor: `${color}66`,
          }}
        >
          <Txt style={{ fontSize: 18 }}>{goal.emoji?.trim() || goal.title.charAt(0).toUpperCase()}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="h3" numberOfLines={1}>
            {goal.title}
          </Txt>
          <Txt variant="caption" muted>
            {goal.deadline
              ? `Prazo: ${new Date(`${goal.deadline}T12:00:00`).toLocaleDateString("pt-BR")}`
              : "Sem prazo"}
          </Txt>
        </View>
        <Txt variant="h3" color={done ? theme.success : color}>
          {progress}%
        </Txt>
      </Pressable>
      <ProgressBar percent={progress} color={done ? theme.success : color} height={6} />
      {expanded && goal.description ? (
        <Txt variant="label" muted>
          {goal.description}
        </Txt>
      ) : null}
      {expanded &&
        goal.steps.map(step => (
          <Pressable
            key={step.id}
            onPress={() => void toggleStep(step.id)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}
          >
            <Ionicons
              name={step.completed ? "checkbox" : "square-outline"}
              size={22}
              color={step.completed ? theme.success : theme.inkMuted}
            />
            <Txt muted={step.completed} style={{ flex: 1, textDecorationLine: step.completed ? "line-through" : "none" }}>
              {step.title}
            </Txt>
          </Pressable>
        ))}
    </Card>
  );
}
