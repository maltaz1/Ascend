import { View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getTodayString } from "@/lib/store";
import { getGlobalStreak } from "@/lib/streak";
import { useStore } from "@/hooks/useStore";
import { Button, Card, EmptyState, ProgressBar, ProgressRing, Screen, SectionTitle, Txt } from "@/components/ui";
import { HabitRow, LongTermGoalCard, TaskRow, WeeklyGoalCard } from "@/components/rows";
import { Logo } from "@/components/Brand";
import { useTheme } from "@/theme";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Porta da aba "Hoje" do web (pages/Today.tsx).
export default function TodayScreen() {
  const theme = useTheme();
  const data = useStore();
  const today = getTodayString();
  const todayTasks = data.tasks.filter(task => task.date === today);
  const overdue = data.tasks.filter(task => !task.completed && task.date < today);
  const weeklyGoals = data.goals.filter(goal => goal.type === "semanal").sort((a, b) => a.title.localeCompare(b.title));
  const longTermGoals = data.goals
    .filter(goal => goal.type !== "semanal" && !goal.completedAt)
    .sort((a, b) => a.title.localeCompare(b.title));

  const tasksDone = todayTasks.filter(task => task.completed).length;
  const habitsDone = data.habits.filter(habit => habit.completedDates.includes(today)).length;
  const total = todayTasks.length + data.habits.length;
  const overall = total > 0 ? Math.round(((tasksDone + habitsDone) / total) * 100) : 0;
  const levelMax = data.user.level * 100;
  const streak = getGlobalStreak(data.tasks, data.habits);
  const rawDate = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Logo size={26} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Ionicons name="flame" size={18} color={theme.accent} />
          <Txt variant="h3" color={theme.accent}>
            {streak}
          </Txt>
        </View>
      </View>

      <View>
        <Txt variant="label" muted>
          {dateLabel}
        </Txt>
        <Txt variant="display">
          {greeting()}, {data.user.name?.split(" ")[0] || "você"}
        </Txt>
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <ProgressRing percent={overall} size={84} stroke={8}>
          <Txt variant="h2">{overall}%</Txt>
        </ProgressRing>
        <View style={{ flex: 1, gap: 8 }}>
          <Txt variant="h3">Progresso de hoje</Txt>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View>
              <Txt variant="h2">
                {tasksDone}/{todayTasks.length}
              </Txt>
              <Txt variant="caption" muted>
                tarefas
              </Txt>
            </View>
            <View>
              <Txt variant="h2">
                {habitsDone}/{data.habits.length}
              </Txt>
              <Txt variant="caption" muted>
                hábitos
              </Txt>
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Txt variant="h3">Nível {data.user.level}</Txt>
          <Txt variant="label" muted>
            {data.user.xp}/{levelMax} XP
          </Txt>
        </View>
        <ProgressBar percent={(data.user.xp / levelMax) * 100} />
        <Txt variant="caption" muted>
          Faltam {levelMax - data.user.xp} XP para o nível {data.user.level + 1}
        </Txt>
      </Card>

      {overdue.length > 0 && (
        <>
          <SectionTitle>Atrasadas</SectionTitle>
          <Card accent={theme.danger}>
            {overdue.map(task => (
              <TaskRow key={task.id} task={task} />
            ))}
          </Card>
        </>
      )}

      <SectionTitle right={<Txt variant="label" color={theme.primary} onPress={() => router.push("/tasks")}>Ver todas</Txt>}>
        Tarefas de hoje
      </SectionTitle>
      <Card>
        {todayTasks.length === 0 ? (
          <View style={{ gap: 10 }}>
            <EmptyState icon="checkbox-outline" text="Nenhuma tarefa para hoje." />
            <Button label="Adicionar tarefa" variant="soft" icon="add" onPress={() => router.push("/tasks")} />
          </View>
        ) : (
          todayTasks.map(task => <TaskRow key={task.id} task={task} />)
        )}
      </Card>

      <SectionTitle right={<Txt variant="label" color={theme.primary} onPress={() => router.push("/habits")}>Ver todos</Txt>}>
        Hábitos
      </SectionTitle>
      <Card>
        {data.habits.length === 0 ? (
          <View style={{ gap: 10 }}>
            <EmptyState icon="flame-outline" text="Você ainda não tem hábitos." />
            <Button label="Criar hábito" variant="soft" icon="add" onPress={() => router.push("/habits")} />
          </View>
        ) : (
          data.habits.map(habit => <HabitRow key={habit.id} habit={habit} date={today} />)
        )}
      </Card>

      {weeklyGoals.length > 0 && (
        <>
          <SectionTitle>Metas da semana</SectionTitle>
          {weeklyGoals.map(goal => (
            <WeeklyGoalCard key={goal.id} goal={goal} habits={data.habits} compact />
          ))}
        </>
      )}

      {longTermGoals.length > 0 && (
        <>
          <SectionTitle>Metas de longo prazo</SectionTitle>
          {longTermGoals.map(goal => (
            <LongTermGoalCard key={goal.id} goal={goal} />
          ))}
        </>
      )}
    </Screen>
  );
}
