import { useEffect } from "react";
import { router, Stack } from "expo-router";
import { onReminderTap, setupReminders, syncReminders } from "@/lib/reminders";
import { DrawerProvider } from "@/components/AppDrawer";
import { TabBar } from "@/components/TabBar";
import { TaskAlerts } from "@/components/TaskAlerts";
import { CorvIntro, CorvLevelUp } from "@/components/CorvMoments";
import { useTheme } from "@/theme";

// Todas as áreas ficam numa pilha só e o menu lateral (☰) troca entre elas,
// como a gaveta do site no celular.
export default function AppLayout() {
  const theme = useTheme();

  // Lembretes: prepara o canal silencioso, reagenda o que está salvo e abre a tela
  // certa quando a pessoa toca na notificação.
  useEffect(() => {
    setupReminders();
    void syncReminders();
    return onReminderTap(url => router.push(url as never));
  }, []);

  return (
    <DrawerProvider>
      <Stack screenOptions={{ headerShown: false, animation: "fade", contentStyle: { backgroundColor: theme.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="habits" />
        <Stack.Screen name="tasks" />
        <Stack.Screen name="goals" />
        <Stack.Screen name="dashboard" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="calendar" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="notes/index" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="notes/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="academy" />
        <Stack.Screen name="diet" />
        <Stack.Screen name="financial" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="evolution" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="achievements" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="eu" />
        <Stack.Screen name="more" />
      </Stack>
      <TaskAlerts />
      <TabBar />
      <CorvLevelUp />
      <CorvIntro />
    </DrawerProvider>
  );
}
