import { Stack } from "expo-router";
import { useTheme } from "@/theme";

// Abas principais + telas abertas a partir do menu "Mais".
export default function AppLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="calendar" />
      <Stack.Screen name="notes/index" />
      <Stack.Screen name="notes/[id]" />
      <Stack.Screen name="prayer" />
      <Stack.Screen name="academy" />
      <Stack.Screen name="diet" />
      <Stack.Screen name="financial" />
      <Stack.Screen name="evolution" />
      <Stack.Screen name="achievements" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
