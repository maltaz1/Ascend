import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getLevelProgress } from "@/lib/store";
import { getGlobalStreak } from "@/lib/streak";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme";
import { Badge, Card, ProgressBar, ProgressRing, Txt } from "./ui";

// Bloco de nível/XP/sequência do topo do menu lateral do web.
export function LevelCard() {
  const theme = useTheme();
  const data = useStore();
  const { isPro } = useAuth();
  const level = getLevelProgress();
  const streak = getGlobalStreak(data.tasks, data.habits);

  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <ProgressRing percent={level.percent} size={64} stroke={6}>
        <Txt variant="caption" muted style={{ fontSize: 9, marginBottom: -2 }}>
          NÍVEL
        </Txt>
        <Txt variant="h2">{data.user.level}</Txt>
      </ProgressRing>
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt variant="h3" numberOfLines={1} style={{ flex: 1 }}>
            {data.user.name || "Você"}
          </Txt>
          <Badge label={isPro ? "PRO" : "FREE"} solid={isPro} />
        </View>
        <ProgressBar percent={level.percent} height={6} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Txt variant="caption" muted>
            {level.current}/{level.max} XP
          </Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="flame" size={14} color={theme.accent} />
            <Txt variant="caption" color={theme.accent} style={{ fontFamily: "DMSans_600SemiBold" }}>
              {streak} {streak === 1 ? "dia" : "dias"}
            </Txt>
          </View>
        </View>
      </View>
    </Card>
  );
}
