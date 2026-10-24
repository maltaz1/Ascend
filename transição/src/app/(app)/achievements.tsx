import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useStore } from "@/hooks/useStore";
import { Card, ProgressRing, Screen, SectionTitle, Txt } from "@/components/ui";
import { useTheme } from "@/theme";

// Porta de pages/Achievements.tsx.
export default function AchievementsScreen() {
  const theme = useTheme();
  const data = useStore();
  const unlocked = data.achievements.filter(a => a.unlockedAt);
  const locked = data.achievements.filter(a => !a.unlockedAt);
  let totalXP = data.user.xp;
  for (let l = 1; l < data.user.level; l++) totalXP += l * 100;
  const percent = data.achievements.length ? (unlocked.length / data.achievements.length) * 100 : 0;

  return (
    <Screen title="Conquistas" subtitle={`${unlocked.length}/${data.achievements.length} desbloqueadas`}>
      <Card style={{ flexDirection: "row", alignItems: "center", gap: 16 }} tone="amber">
        <ProgressRing percent={percent} size={84} stroke={8} color={theme.accent}>
          <Ionicons name="trophy" size={28} color={theme.accent} />
        </ProgressRing>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt variant="h2">Nível {data.user.level}</Txt>
          <Txt muted>{totalXP.toLocaleString("pt-BR")} XP no total</Txt>
          <Txt variant="caption" muted>
            {data.user.totalTasksCompleted} tarefas · {data.user.totalGoalsCompleted} metas concluídas
          </Txt>
        </View>
      </Card>

      <SectionTitle>Desbloqueadas</SectionTitle>
      {unlocked.length === 0 ? (
        <Card>
          <Txt muted>Conclua tarefas, hábitos e metas para ganhar suas primeiras conquistas.</Txt>
        </Card>
      ) : (
        unlocked.map(a => (
          <Card key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.accentSoft }}>
              <Txt style={{ fontSize: 22 }}>{a.emoji}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{a.title}</Txt>
              <Txt variant="caption" muted>
                {a.description}
              </Txt>
            </View>
            <Txt variant="caption" color={theme.accent}>
              {a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString("pt-BR") : ""}
            </Txt>
          </Card>
        ))
      )}

      <SectionTitle>A desbloquear</SectionTitle>
      {locked.map(a => (
        <Card key={a.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, opacity: 0.6 }}>
          <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySoft }}>
            <Ionicons name="lock-closed" size={18} color={theme.inkMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{a.title}</Txt>
            <Txt variant="caption" muted>
              {a.description}
            </Txt>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
