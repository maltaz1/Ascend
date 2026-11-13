import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { fonts, useTheme, withAlpha } from "@/theme";
import { Glass } from "./Glass";
import { TAB_BAR_HEIGHT } from "./layout";
import { Sheet, Txt } from "./ui";

type IconName = keyof typeof Ionicons.glyphMap;

// Cada aba cobre um grupo de telas; Rotina e Saúde trocam entre elas pelas abas internas.
const TABS: { key: string; label: string; icon: IconName; href: string; paths: string[] }[] = [
  { key: "today", label: "Hoje", icon: "home-outline", href: "/", paths: ["/"] },
  { key: "routine", label: "Rotina", icon: "layers-outline", href: "/tasks", paths: ["/tasks", "/habits", "/goals"] },
  { key: "health", label: "Saúde", icon: "heart-outline", href: "/academy", paths: ["/academy", "/diet"] },
  {
    key: "more",
    label: "Mais",
    icon: "grid-outline",
    href: "/more",
    paths: ["/more", "/financial", "/notes", "/calendar", "/dashboard", "/evolution", "/achievements", "/settings"],
  },
];

const QUICK_ADD: { label: string; icon: IconName; color: string; href: string }[] = [
  { label: "Tarefa", icon: "checkmark-circle-outline", color: "#8b5cf6", href: "/tasks?novo=1" },
  { label: "Hábito", icon: "flame-outline", color: "#f59e0b", href: "/habits?novo=1" },
  { label: "Meta", icon: "radio-button-on-outline", color: "#ec4899", href: "/goals?novo=1" },
  { label: "Refeição", icon: "restaurant-outline", color: "#10b981", href: "/diet" },
  { label: "Transação", icon: "wallet-outline", color: "#5b7cff", href: "/financial?novo=1" },
  { label: "Nota", icon: "document-text-outline", color: "#06b6d4", href: "/notes?novo=1" },
];

function isActive(paths: string[], pathname: string) {
  return paths.some(path => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)));
}

export function TabBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [quickOpen, setQuickOpen] = useState(false);
  const ink = theme.mode === "dark" ? "#ffffff" : theme.ink;
  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)];

  const tabButton = (tab: (typeof TABS)[number]) => {
    const active = isActive(tab.paths, pathname);
    return (
      <Pressable
        key={tab.key}
        onPress={() => router.replace(tab.href as Href)}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={tab.label}
        style={({ pressed }) => [styles.tab, { transform: [{ scale: pressed ? 1.08 : 1 }] }]}
      >
        <View style={styles.tabInner}>
          <Ionicons name={tab.icon} size={22} color={active ? theme.primaryInk : ink} style={{ opacity: active ? 1 : 0.7 }} />
          <Text style={[styles.label, { color: ink, opacity: active ? 1 : 0.7, fontFamily: active ? fonts.bodySemi : fonts.bodyMedium }]}>{tab.label}</Text>
        </View>
      </Pressable>
    );
  };

  const go = (href: string) => {
    setQuickOpen(false);
    router.push(href as Href);
  };

  return (
    <>
      <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
        <Glass interactive refract style={styles.bar}>
          {left.map(tabButton)}
          <View style={styles.tab}>
            <Glass tint={theme.primary} interactive style={styles.add}>
              <Pressable
                onPress={() => setQuickOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Adicionar"
                style={({ pressed }) => [styles.fill, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="add" size={28} color="#fff" />
              </Pressable>
            </Glass>
          </View>
          {right.map(tabButton)}
        </Glass>
      </View>

      <Sheet visible={quickOpen} onClose={() => setQuickOpen(false)} title="Adicionar">
        <Txt muted>O que você quer registrar?</Txt>
        <View style={styles.grid}>
          {QUICK_ADD.map(item => (
            <Pressable
              key={item.label}
              onPress={() => go(item.href)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.quick,
                { backgroundColor: theme.raised, borderColor: theme.border, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <View style={[styles.quickIcon, { backgroundColor: withAlpha(item.color, 0.18) }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: theme.ink }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 14, right: 14 },
  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  tab: { flex: 1, height: "100%", alignItems: "center", justifyContent: "center" },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    width: "100%",
    height: TAB_BAR_HEIGHT - 16,
    borderRadius: (TAB_BAR_HEIGHT - 16) / 2,
  },
  label: { fontSize: 10.5 },
  add: { width: 52, height: 52, borderRadius: 26 },
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  quick: { width: "31%", flexGrow: 1, alignItems: "center", gap: 10, paddingVertical: 16, borderRadius: 20, borderWidth: 1 },
  quickIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
