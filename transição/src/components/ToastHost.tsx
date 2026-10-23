import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { subscribeToasts, type Toast } from "@/lib/toast";
import { useTheme } from "@/theme";

// Substitui o <Toaster /> do sonner usado no web.
export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(
    () =>
      subscribeToasts(toast => {
        setToasts(current => [...current, toast]);
        setTimeout(() => setToasts(current => current.filter(t => t.id !== toast.id)), toast.duration);
      }),
    []
  );

  if (toasts.length === 0) return null;

  const colors = { success: theme.success, error: theme.danger, warning: theme.warning, info: theme.primary };

  return (
    <View pointerEvents="none" style={[styles.container, { top: insets.top + 8 }]}>
      {toasts.map(toast => (
        <View
          key={toast.id}
          style={[styles.toast, { backgroundColor: theme.surface, borderLeftColor: colors[toast.type] }]}
        >
          <Text style={{ color: theme.ink, fontWeight: "600" }}>{toast.title}</Text>
          {toast.description ? <Text style={{ color: theme.inkMuted, marginTop: 2 }}>{toast.description}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", left: 16, right: 16, gap: 8 },
  toast: {
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
