import { Stack } from "expo-router";
import { DrawerProvider } from "@/components/AppDrawer";
import { useTheme } from "@/theme";

// Todas as áreas ficam numa pilha só e o menu lateral (☰) troca entre elas,
// como a gaveta do site no celular.
export default function AppLayout() {
  const theme = useTheme();
  return (
    <DrawerProvider>
      <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="habits" />
        <Stack.Screen name="tasks" />
        <Stack.Screen name="goals" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="notes/index" />
        <Stack.Screen name="notes/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="prayer" />
        <Stack.Screen name="academy" />
        <Stack.Screen name="diet" />
        <Stack.Screen name="financial" />
        <Stack.Screen name="evolution" />
        <Stack.Screen name="achievements" />
        <Stack.Screen name="settings" />
      </Stack>
    </DrawerProvider>
  );
}
