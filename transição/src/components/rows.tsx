import { useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { Alert } from "@/lib/alert";
import { useCheckPop } from "@/lib/motion";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  completeTask,
  getGoalProgress,
  getTaskStatus,
  getTodayString,
  toggleHabitDate,
  uncompleteTask,
  deleteTask,
} from "@/lib/store";
import type { Goal, Habit, Task } from "@/lib/store";
import { removeGoal, toggleLongTermStep, toggleWeeklyGoalDay } from "@/store/goals.store";
import { syncHabitToGoals } from "@/lib/syncHabitGoals";
import { getMondayOfDate, getLinkedHabitWeekCheckins, getWeeklySparkline, isWeeklyGoalHit, type WeeklyGoal } from "@/lib/weeklyGoals";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { fonts, resolveColor, useTheme } from "@/theme";
import { Button, Card, ProgressBar, Row, Stamp, Txt } from "./ui";
import { Sparkline } from "./charts";
import { ACTION_LABEL, parseTag, taskAttrXP } from "@/lib/attributes";
import { Glyph, stripEmoji } from "@/components/Glyph";

const PRIORITY_LABEL: Record<Task["priority"], string> = { low: "Baixa", medium: "Média", high: "Alta" };

export function priorityColor(priority: Task["priority"], theme: ReturnType<typeof useTheme>): string {
  return { low: theme.blue, medium: theme.primaryInk, high: "#ede9fe" }[priority];
}

export async function toggleTask(task: Task) {
  if (task.completed) {
    await uncompleteTask(task.id);
    notifyInfo("Tarefa desmarcada");
    return;
  }
  const { xpGained } = await completeTask(task.id);
  const tag = parseTag(task.category);
  const base = xpGained > 0 ? `Tarefa concluída! +${xpGained} XP` : "Tarefa concluída!";
  notifySuccess(tag ? `${base} · +${taskAttrXP(task)} em ${tag.attr.name}` : base);
}

// ---------------------------------------------------------------------------
// Tarefa na aba Hoje: linha preenchida, verde quando concluída, carimbo ALTA
// ---------------------------------------------------------------------------

export function TaskRow({ task }: { task: Task }) {
  const theme = useTheme();
  const overdue = getTaskStatus(task) === "overdue";
  return (
    <Row onPress={() => void toggleTask(task)} highlight={task.completed ? theme.success : overdue ? theme.danger : undefined}>
      {task.completed ? <Ionicons name="checkmark" size={16} color={theme.success} /> : null}
      <Txt
        variant="bodyStrong"
        muted={task.completed}
        style={{ flex: 1, textDecorationLine: task.completed ? "line-through" : "none" }}
        numberOfLines={1}
      >
        {task.title}
      </Txt>
      {!task.completed && task.priority === "high" ? (
        <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1 }} color={theme.danger}>
          ALTA
        </Txt>
      ) : null}
    </Row>
  );
}

// ---------------------------------------------------------------------------
// Tarefa na aba Tarefas: cartão com faixa da prioridade à esquerda e caixinha
// ---------------------------------------------------------------------------

export function TaskCard({ task, onPress, onDelete }: { task: Task; onPress?: () => void; onDelete?: () => void }) {
  const theme = useTheme();
  const color = priorityColor(task.priority, theme);
  const overdue = getTaskStatus(task) === "overdue";
  const taskPop = useCheckPop(task.completed);
  const tag = parseTag(task.category);

  const confirmDelete = () =>
    Alert.alert("Excluir tarefa", `Excluir "${task.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void deleteTask(task.id) },
    ]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 15,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        borderLeftWidth: 3,
        borderLeftColor: color,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Pressable
        onPress={() => void toggleTask(task)}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed }}
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: task.completed ? 0 : 2,
          alignItems: "center",
          justifyContent: "center",
          borderColor: theme.inkMuted,
          backgroundColor: task.completed ? theme.primary : "transparent",
        }}
      >
        {task.completed ? (
          <Animated.View style={{ transform: [{ scale: taskPop }] }}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </Animated.View>
        ) : null}
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt
          variant="bodyStrong"
          muted={task.completed}
          style={{ textDecorationLine: task.completed ? "line-through" : "none" }}
        >
          {task.title}
        </Txt>
        {tag ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tag.attr.color }} />
            <Txt variant="caption" color={tag.attr.ink}>
              {tag.attr.name} · {ACTION_LABEL[tag.action]}
            </Txt>
          </View>
        ) : null}
        {overdue || task.isRecurring || task.description ? (
          <Txt variant="caption" color={overdue ? theme.danger : theme.inkMuted} numberOfLines={1}>
            {overdue ? "Atrasada · " : ""}
            {task.isRecurring ? "Recorrente · " : ""}
            {task.description || PRIORITY_LABEL[task.priority]}
          </Txt>
        ) : null}
      </View>
      <Pressable onPress={onDelete ?? confirmDelete} hitSlop={10} accessibilityLabel="Excluir tarefa">
        <Ionicons name="trash-outline" size={18} color={theme.inkMuted} />
      </Pressable>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Hábito
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

export function HabitRow({ habit, date }: { habit: Habit; date: string }) {
  const theme = useTheme();
  const done = habit.completedDates.includes(date);
  const color = resolveColor(habit.color, theme);
  const pop = useCheckPop(done);
  return (
    <Row onPress={() => void toggleHabitWithGoals(habit, date)} highlight={done ? color : undefined}>
      <Animated.View
        style={{
          transform: [{ scale: pop }],
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1.5,
          alignItems: "center",
          justifyContent: "center",
          borderColor: done ? color : theme.inkMuted,
          backgroundColor: done ? color : "transparent",
        }}
      >
        {done ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
      </Animated.View>
      <Glyph emoji={habit.emoji} size={16} />
      <Txt
        variant="bodyStrong"
        muted={done}
        style={{ flex: 1, textDecorationLine: done ? "line-through" : "none" }}
        numberOfLines={1}
      >
        {habit.title}
      </Txt>
    </Row>
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
        else notifySuccess("Meta excluída");
      },
    },
  ]);
}

async function deleteLongTermGoal(goal: Goal) {
  const { error } = await removeGoal(goal.id);
  if (error) notifyError("Não foi possível remover a meta", error);
  else notifyInfo("Meta deletada");
}

function toWeeklyGoal(goal: Goal, days: boolean[]): WeeklyGoal {
  return {
    id: goal.id,
    title: goal.title,
    emoji: goal.emoji,
    color: goal.color,
    targetFrequency: goal.targetFrequency ?? 1,
    daysCompletedWeek: days,
    weekStart: goal.weekStart ?? null,
    streak: goal.streak ?? 0,
    recordStreak: goal.recordStreak ?? 0,
    linkedHabitId: goal.linkedHabitId ?? null,
    weeklyHistory: goal.weeklyHistory ?? [],
    createdAt: goal.createdAt,
  };
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

function weekDates(): Date[] {
  const monday = new Date(`${getMondayOfDate(new Date())}T12:00:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"];
const DAY_SHORT = ["Se", "Te", "Qu", "Qu", "Se", "Sá", "Do"];

async function toggleDay(goal: Goal, index: number) {
  const { error } = await toggleWeeklyGoalDay(goal.id, index);
  if (error) notifyInfo(error);
}

// Meta semanal resumida (bloco "Metas" da aba Hoje).
export function WeeklyGoalMini({ goal, habits }: { goal: Goal; habits: Habit[] }) {
  const theme = useTheme();
  const color = resolveColor(goal.color, theme);
  const days = weeklyDays(goal, habits);
  const target = Math.max(1, goal.targetFrequency ?? 1);
  const completed = days.filter(Boolean).length;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const dates = weekDates();
  const linked = goal.linkedHabitId ? habits.find(h => h.id === goal.linkedHabitId) : undefined;

  return (
    <View style={{ backgroundColor: theme.raised, borderRadius: 18, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Glyph emoji={goal.emoji?.trim() || "🎯"} size={16} />
        <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>
          {goal.title}
        </Txt>
        <Txt variant="h3" color={color}>
          {completed}/{target}
        </Txt>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {DAY_LETTERS.map((letter, i) => {
          const done = days[i];
          const future = i > todayIdx;
          return (
            <Pressable key={i} disabled={future} onPress={() => void toggleDay(goal, i)} style={{ alignItems: "center", gap: 4 }}>
              <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 9 }} color={i === todayIdx ? color : theme.inkMuted}>
                {letter}
              </Txt>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? color : "transparent",
                  borderWidth: done ? 0 : 1,
                  borderColor: future ? theme.border : theme.inkMuted,
                  opacity: future ? 0.45 : 1,
                }}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Txt style={{ fontSize: 9 }} muted>
                    {dates[i].getDate()}
                  </Txt>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Txt variant="caption" muted>
          {completed}/{target} concluídas na semana
        </Txt>
        {linked ? (
          <Txt variant="caption" muted>
            ↔ {linked.title}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

// Meta semanal completa (aba Metas): carimbos, barra, caixinhas por dia e consistência.
export function WeeklyGoalCard({ goal, habits }: { goal: Goal; habits: Habit[] }) {
  const theme = useTheme();
  const color = resolveColor(goal.color, theme);
  const days = weeklyDays(goal, habits);
  const target = Math.max(1, goal.targetFrequency ?? 1);
  const completed = days.filter(Boolean).length;
  const todayIdx = (new Date().getDay() + 6) % 7;
  const linked = goal.linkedHabitId ? habits.find(h => h.id === goal.linkedHabitId) : undefined;
  const weeklyGoal = toWeeklyGoal(goal, days);
  const hit = isWeeklyGoalHit(weeklyGoal);
  const spark = getWeeklySparkline(weeklyGoal).map(v => Math.min(100, Math.max(0, v)));
  const consistency = spark[spark.length - 1] ?? 0;
  const streak = goal.streak ?? 0;
  const barColor = hit ? theme.success : color;

  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${color}22`,
            borderWidth: 1,
            borderColor: `${color}66`,
          }}
        >
          <Glyph emoji={goal.emoji} size={19} fallback={goal.title.charAt(0).toUpperCase()} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Txt variant="h3" style={{ flex: 1, fontSize: 16 }} numberOfLines={1}>
              {goal.title}
            </Txt>
            <Pressable onPress={() => confirmDeleteGoal(goal)} hitSlop={10} accessibilityLabel="Excluir meta">
              <Ionicons name="trash-outline" size={16} color={theme.danger} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <Stamp label={hit ? "Atingida" : `${completed}/${target} sem.`} tone={hit ? "green" : "violet"} />
            <Stamp label={`${streak} seg.`} icon={streak >= 7 ? "flame" : "flame-outline"} tone={streak >= 7 ? "amber" : "ink"} />
            {linked ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="calendar-outline" size={12} color={theme.inkMuted} />
                <Txt variant="caption" muted>
                  {linked.title}
                </Txt>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <ProgressBar percent={Math.min(100, (completed / target) * 100)} color={barColor} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 6 }}>
        {DAY_SHORT.map((label, i) => {
          const done = days[i];
          const future = i > todayIdx;
          const today = i === todayIdx;
          return (
            <Pressable
              key={i}
              disabled={future}
              onPress={() => void toggleDay(goal, i)}
              style={{
                flex: 1,
                aspectRatio: 0.85,
                borderRadius: 3,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                borderWidth: done || today ? 0 : 1,
                borderColor: theme.border,
                backgroundColor: done ? `${color}1f` : "transparent",
                opacity: future ? 0.45 : 1,
                ...(done ? { borderWidth: 1, borderColor: color } : {}),
              }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  borderWidth: done ? 0 : 1.5,
                  borderColor: theme.inkMuted,
                  backgroundColor: done ? color : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
              </View>
              <Txt style={{ fontFamily: today ? fonts.bodyBold : fonts.body, fontSize: 10 }} color={today ? theme.accent : theme.inkMuted}>
                {label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ height: 1, backgroundColor: theme.border }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {(goal.recordStreak ?? 0) > 0 ? (
          <>
            <Ionicons name="trophy" size={11} color="#FCD34D" />
            <Txt variant="caption" muted>
              Recorde: {goal.recordStreak} semanas
            </Txt>
          </>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.raised, borderRadius: 16, padding: 12 }}>
        <View>
          <Txt variant="caption" muted>
            Consistência
          </Txt>
          <Txt variant="h2" color={barColor}>
            {consistency}%
          </Txt>
          <Txt variant="caption" muted>
            esta semana
          </Txt>
        </View>
        <View>
          <Sparkline values={spark.length ? spark : [0]} color={barColor} width={130} height={34} max={100} />
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt style={{ fontSize: 9 }} muted>
              {spark.length > 1 ? `${spark.length - 1} sem. atrás` : "início"}
            </Txt>
            <Txt style={{ fontSize: 9 }} muted>
              agora
            </Txt>
          </View>
        </View>
      </View>
      </View>
    </Card>
  );
}

// Meta de longo prazo resumida (aba Hoje).
export function LongTermGoalMini({ goal }: { goal: Goal }) {
  const theme = useTheme();
  const progress = getGoalProgress(goal);
  const done = goal.steps.filter(s => s.completed).length;
  return (
    <View style={{ backgroundColor: theme.raised, borderRadius: 18, padding: 14, gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Glyph emoji={goal.emoji?.trim() || "🎯"} size={16} />
        <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>
          {goal.title}
        </Txt>
        <Txt variant="h3" color={theme.success}>
          {progress}%
        </Txt>
      </View>
      <Txt variant="caption" muted>
        {done}/{goal.steps.length} etapas concluídas
      </Txt>
    </View>
  );
}

// Meta de longo prazo completa (aba Metas): etapas aparecem ao expandir, como no web.
export function LongTermGoalCard({ goal }: { goal: Goal }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const color = resolveColor(goal.color, theme);
  const progress = getGoalProgress(goal);
  const finished = Boolean(goal.completedAt);
  const doneSteps = goal.steps.filter(s => s.completed).length;

  const toggleStep = async (stepId: string) => {
    const { xpGained, goalCompleted } = await toggleLongTermStep(goal.id, stepId);
    if (goalCompleted) notifySuccess(`Meta concluída! +${xpGained} XP`, goal.title);
  };

  return (
    <Card>
      <Pressable onPress={() => setExpanded(v => !v)} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: finished ? `${theme.success}26` : `${color}22`,
            borderWidth: 1,
            borderColor: finished ? `${theme.success}80` : `${color}66`,
          }}
        >
          <Glyph emoji={goal.emoji} size={19} fallback={goal.title.charAt(0).toUpperCase()} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Txt variant="h3" style={{ flex: 1, fontSize: 16 }} numberOfLines={1}>
              {goal.title}
            </Txt>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={theme.inkMuted} accessibilityLabel={expanded ? "Recolher etapas" : "Ver etapas"} />
          </View>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Stamp label={finished ? "Concluída" : "Em curso"} tone={finished ? "green" : "violet"} />
            <Txt variant="caption" muted>
              {doneSteps}/{goal.steps.length} etapas
            </Txt>
          </View>
          {goal.description ? (
            <Txt variant="caption" muted numberOfLines={2}>
              {goal.description}
            </Txt>
          ) : null}
        </View>
      </Pressable>
      <ProgressBar percent={progress} color={finished ? theme.success : color} />
      {expanded ? (
        <View style={{ gap: 6 }}>
          {goal.steps.map(step => (
            <Pressable
              key={step.id}
              onPress={() => void toggleStep(step.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: step.completed ? `${theme.success}66` : theme.border,
                backgroundColor: step.completed ? `${theme.success}0f` : "transparent",
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 3,
                  borderWidth: step.completed ? 0 : 1.5,
                  borderColor: color,
                  backgroundColor: step.completed ? theme.success : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step.completed ? <Ionicons name="checkmark" size={12} color="#fff" /> : null}
              </View>
              <Txt muted={step.completed} numberOfLines={1} style={{ flex: 1, textDecorationLine: step.completed ? "line-through" : "none" }}>
                {step.title}
              </Txt>
            </Pressable>
          ))}
          <Button label="Deletar Meta" variant="danger" icon="trash-outline" compact onPress={() => void deleteLongTermGoal(goal)} />
        </View>
      ) : null}
    </Card>
  );
}

// Data por extenso com a primeira letra maiúscula.
export function longDate(date: Date = new Date(), withYear = false): string {
  const label = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  });
  return label;
}

export { getTodayString };
