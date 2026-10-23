import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { fonts, useTheme } from "@/theme";

type IconProps = ComponentProps<typeof Ionicons>;

function icon(name: IconProps["name"], activeName: IconProps["name"]) {
  function TabIcon({ color, size, focused }: { color: ColorValue | null; size: number; focused: boolean }) {
    return <Ionicons name={focused ? activeName : name} size={size} color={(color ?? undefined) as IconProps["color"]} />;
  }
  return TabIcon;
}

// As quatro primeiras seções do menu do web + "Mais" com o restante.
export default function TabLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.inkMuted,
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        tabBarStyle: { backgroundColor: theme.surfaceAlt, borderTopColor: theme.border },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Hoje", tabBarIcon: icon("sunny-outline", "sunny") }} />
      <Tabs.Screen name="habits" options={{ title: "Hábitos", tabBarIcon: icon("flame-outline", "flame") }} />
      <Tabs.Screen name="tasks" options={{ title: "Tarefas", tabBarIcon: icon("checkbox-outline", "checkbox") }} />
      <Tabs.Screen name="goals" options={{ title: "Metas", tabBarIcon: icon("flag-outline", "flag") }} />
      <Tabs.Screen name="more" options={{ title: "Mais", tabBarIcon: icon("menu-outline", "menu") }} />
    </Tabs>
  );
}
