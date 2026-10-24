import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@/hooks/useAuth";
import { isProSection, SECTIONS } from "@/navigation";
import { fonts, useTheme } from "@/theme";
import { Stamp } from "./ui";

const logo = require("../../assets/logo-taskbar.png");

type DrawerState = { open: () => void; close: () => void };
const DrawerContext = createContext<DrawerState>({ open: () => {}, close: () => {} });

export function useDrawer(): DrawerState {
  return useContext(DrawerContext);
}

// Gaveta lateral do celular — mesma de components/Layout.tsx do web (85% da largura).
export function DrawerProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <DrawerContext.Provider value={{ open: () => setVisible(true), close: () => setVisible(false) }}>
      {children}
      <AppDrawer visible={visible} onClose={() => setVisible(false)} />
    </DrawerContext.Provider>
  );
}

function AppDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { isPro } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const drawerWidth = Math.min(width * 0.85, 360);
  const [slide] = useState(() => new Animated.Value(-360));

  useEffect(() => {
    if (visible) {
      slide.setValue(-drawerWidth);
      Animated.timing(slide, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    }
  }, [visible, drawerWidth, slide]);

  const go = (href: string, locked: boolean) => {
    onClose();
    router.replace((locked ? "/settings" : href) as Href);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlay }]} onPress={onClose} accessibilityLabel="Fechar menu" />
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: drawerWidth,
          transform: [{ translateX: slide }],
          backgroundColor: theme.surfaceAlt,
          borderRightWidth: 1,
          borderRightColor: theme.border,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowOffset: { width: 4, height: 0 },
          shadowRadius: 0,
          elevation: 12,
        }}
      >
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20, paddingHorizontal: 16, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <Image source={logo} style={{ height: 40, width: 108 }} resizeMode="contain" accessibilityLabel="Ascend" />
            <Pressable
              onPress={onClose}
              accessibilityLabel="Fechar menu"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                borderWidth: 1,
                borderColor: theme.mode === "dark" ? "rgba(255,255,255,0.1)" : theme.border,
              }}
            >
              <Ionicons name="close" size={20} color={theme.ink} />
            </Pressable>
          </View>

          {SECTIONS.filter(item => item.inMenu !== false).map(item => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const locked = !isPro && isProSection(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => go(item.href, locked)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 4,
                  borderLeftWidth: 2,
                  borderLeftColor: active ? theme.accent : "transparent",
                  backgroundColor: active ? theme.surface : pressed ? theme.surface : "transparent",
                })}
              >
                <Ionicons name={item.icon} size={20} color={active ? theme.accent : theme.inkMuted} />
                <Text
                  style={{
                    flex: 1,
                    fontFamily: active ? fonts.bodyBold : fonts.body,
                    fontSize: 15,
                    color: active ? theme.accent : theme.inkMuted,
                  }}
                >
                  {item.label}
                </Text>
                {locked && <Stamp label="Pro" tone="violet" />}
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
