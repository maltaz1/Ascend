import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getTodayString } from "@/lib/store";
import { getGlobalStreak } from "@/lib/streak";
import { useStore } from "@/hooks/useStore";
import { Card, EmptyState, ProgressRing, Screen, Txt } from "@/components/ui";
import { HabitRow, longDate, LongTermGoalMini, TaskRow, WeeklyGoalMini } from "@/components/rows";
import { fonts, useTheme } from "@/theme";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function encouragement(percent: number): string {
  if (percent >= 100) return "Dia completo! Você mandou muito bem.";
  if (percent >= 60) return "Quase lá, falta pouco!";
  if (percent > 0) return "Continue assim, você está no caminho certo!";
  return "Comece pelo mais simples — um passo de cada vez.";
}

// Porta da aba "Hoje" do web (pages/Today.tsx).
export default function TodayScreen() {
  const theme = useTheme();
  const data = useStore();
  const today = getTodayString();
  const todayTasks = data.tasks.filter(task => task.date === today);
  const weeklyGoals = data.goals.filter(goal => goal.type === "semanal").sort((a, b) => a.title.localeCompare(b.title));
  const longTermGoals = data.goals.filter(goal => goal.type !== "semanal").sort((a, b) => a.title.localeCompare(b.title));

  const tasksDone = todayTasks.filter(task => task.completed).length;
  const habitsDone = data.habits.filter(habit => habit.completedDates.includes(today)).length;
  const total = todayTasks.length + data.habits.length;
  const overall = total > 0 ? Math.round(((tasksDone + habitsDone) / total) * 100) : 0;
  const levelMax = data.user.level * 100;
  const streak = getGlobalStreak(data.tasks, data.habits);

  return (
    <Screen title={`${greeting()}, ${data.user.name?.split(" ")[0] || "você"}`} subtitle={longDate(new Date(), true)}>
      <Card style={{ alignItems: "center", gap: 14, paddingVertical: 24 }}>
        <ProgressRing percent={overall} size={124} stroke={9}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 26 }} color={theme.primary}>
            {overall}%
          </Txt>
        </ProgressRing>
        <View style={{ alignSelf: "stretch", gap: 6 }}>
          <Txt variant="h1" style={{ fontSize: 22 }}>
            Progresso do Dia
          </Txt>
          <Txt muted>{encouragement(overall)}</Txt>
        </View>
        <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
          <DayStat value={`${tasksDone}/${todayTasks.length}`} label="Tarefas" color={theme.success} />
          <DayStat value={`${habitsDone}/${data.habits.length}`} label="Hábitos" color={theme.accent} />
          <DayStat value={`${streak}d`} label="Streak" color={theme.primary} />
        </View>
        <ProgressRing percent={(data.user.xp / levelMax) * 100} size={76} stroke={6}>
          <Txt style={{ fontFamily: fonts.display, fontSize: 18, lineHeight: 20 }} color={theme.primary}>
            {data.user.level}
          </Txt>
          <Txt style={{ fontSize: 9 }} muted>
            NV
          </Txt>
        </ProgressRing>
        <Txt variant="caption" muted>
          {data.user.xp}/{levelMax} XP
        </Txt>
      </Card>

      <Card>
        <BlockHeader icon="checkmark" iconColor={theme.success} title="Tarefas de Hoje" count={`${tasksDone}/${todayTasks.length}`} />
        {todayTasks.length === 0 ? (
          <EmptyState text="Nenhuma tarefa para hoje." />
        ) : (
          <View style={{ gap: 8 }}>
            {todayTasks.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
          </View>
        )}
      </Card>

      <Card>
        <BlockHeader icon="flame" iconColor={theme.accent} title="Hábitos do Dia" count={`${habitsDone}/${data.habits.length}`} />
        {data.habits.length === 0 ? (
          <EmptyState text="Você ainda não tem hábitos." />
        ) : (
          <View style={{ gap: 8 }}>
            {data.habits.map(habit => (
              <HabitRow key={habit.id} habit={habit} date={today} />
            ))}
          </View>
        )}
      </Card>

      {data.goals.length > 0 && (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
            <Ionicons name="radio-button-on-outline" size={18} color={theme.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Txt variant="h2">Metas</Txt>
              <Txt variant="caption" muted>
                Acompanhe o progresso de todos os seus objetivos.
              </Txt>
            </View>
            <Txt variant="label" color={theme.primary} style={{ fontFamily: fonts.bodyBold }}>
              {data.goals.length} {data.goals.length === 1 ? "meta" : "metas"}
            </Txt>
          </View>

          {weeklyGoals.length > 0 && (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="calendar" size={14} color={theme.primary} />
                <Txt variant="h3" style={{ flex: 1 }}>
                  Metas semanais
                </Txt>
                <Txt variant="caption" muted>
                  Reinicia toda segunda-feira
                </Txt>
              </View>
              {weeklyGoals.map(goal => (
                <WeeklyGoalMini key={goal.id} goal={goal} habits={data.habits} />
              ))}
            </>
          )}

          {longTermGoals.length > 0 && (
            <>
              <View style={{ height: 1, backgroundColor: theme.border }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="radio-button-on-outline" size={14} color={theme.primary} />
                <Txt variant="h3" style={{ flex: 1 }}>
                  Metas de longo prazo
                </Txt>
                <Txt variant="caption" muted>
                  {longTermGoals.length} {longTermGoals.length === 1 ? "objetivo" : "objetivos"}
                </Txt>
              </View>
              {longTermGoals.map(goal => (
                <LongTermGoalMini key={goal.id} goal={goal} />
              ))}
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}

function DayStat({ value, label, color }: { value: string; label: string; color: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2, paddingVertical: 14, borderRadius: 8, backgroundColor: theme.raised }}>
      <Txt style={{ fontFamily: fonts.display, fontSize: 18 }} color={color}>
        {value}
      </Txt>
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </View>
  );
}

function BlockHeader({ icon, iconColor, title, count }: { icon: keyof typeof Ionicons.glyphMap; iconColor: string; title: string; count: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={18} color={iconColor} />
      <Txt variant="h2" style={{ flex: 1 }}>
        {title}
      </Txt>
      <Txt variant="label" color={theme.primary} style={{ fontFamily: fonts.bodyBold }}>
        {count}
      </Txt>
    </View>
  );
}
