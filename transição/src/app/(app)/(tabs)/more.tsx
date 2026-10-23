import { Pressable, View } from "react-native";
import { router, type Href } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";
import { isProSection, SECTIONS } from "@/navigation";
import { Card, Screen, SectionTitle, Txt } from "@/components/ui";
import { Logo } from "@/components/Brand";
import { LevelCard } from "@/components/LevelCard";
import { UpgradeCard } from "@/components/ProGate";
import { useTheme } from "@/theme";

const TAB_SECTIONS = ["today", "habits", "tasks", "goals"];

// Equivalente ao menu lateral (drawer) do web no celular.
export default function MoreScreen() {
  const theme = useTheme();
  const { isPro } = useAuth();
  const items = SECTIONS.filter(section => !TAB_SECTIONS.includes(section.id));

  return (
    <Screen>
      <View style={{ paddingVertical: 4 }}>
        <Logo size={30} />
      </View>
      <LevelCard />

      <SectionTitle>Áreas</SectionTitle>
      <Card style={{ padding: 6, gap: 0 }}>
        {items.map((item, index) => {
          const locked = !isPro && isProSection(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => router.push(item.href as Href)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: pressed ? theme.primarySoft : "transparent",
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: theme.border,
              })}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.primarySoft,
                }}
              >
                <Ionicons name={item.icon} size={18} color={theme.primary} />
              </View>
              <Txt variant="bodyStrong" style={{ flex: 1 }}>
                {item.label}
              </Txt>
              {locked ? (
                <Ionicons name="lock-closed" size={16} color={theme.inkMuted} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={theme.inkMuted} />
              )}
            </Pressable>
          );
        })}
      </Card>

      {!isPro && <UpgradeCard />}
    </Screen>
  );
}
