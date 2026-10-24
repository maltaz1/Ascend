import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/theme";
import { Card, IconBox, Txt } from "./ui";

// Seção que abre e fecha (ExpandableSection do Dashboard do web).
export function Expandable({
  icon,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card padded={false}>
      <Pressable onPress={() => setOpen(v => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 18 }}>
        <IconBox icon={icon} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3">{title}</Txt>
          {subtitle ? (
            <Txt variant="marginalia" style={{ marginTop: 3 }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={theme.inkMuted} />
      </Pressable>
      {open ? <View style={{ paddingHorizontal: 18, paddingBottom: 18, gap: 14 }}>{children}</View> : null}
    </Card>
  );
}

// Bloco interno numerado ("06A — HEATMAP DIÁRIO").
export function SubPanel({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 6, padding: 14, gap: 12 }}>
      <Txt variant="marginalia" color={theme.primary}>
        {label}
      </Txt>
      {children}
    </View>
  );
}
