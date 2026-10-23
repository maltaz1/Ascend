import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { fonts, useTheme } from "@/theme";

// ---------------------------------------------------------------------------
// Tipografia
// ---------------------------------------------------------------------------

type Variant = "display" | "h1" | "h2" | "h3" | "body" | "bodyStrong" | "label" | "caption" | "overline";

const variantStyle: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6 },
  h1: { fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.displaySemi, fontSize: 20, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.displaySemi, fontSize: 16 },
  body: { fontFamily: fonts.body, fontSize: 15 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 15 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  caption: { fontFamily: fonts.body, fontSize: 12 },
  overline: { fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" },
};

export function Txt({
  variant = "body",
  muted,
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  const theme = useTheme();
  return (
    <Text
      {...props}
      style={[variantStyle[variant], { color: color ?? (muted ? theme.inkMuted : theme.ink) }, style]}
    />
  );
}

// ---------------------------------------------------------------------------
// Fundo de papel com luz (body do web: gradiente de cima e contraluz de baixo)
// ---------------------------------------------------------------------------

export function PaperBackground() {
  const theme = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} pointerEvents="none">
      <LinearGradient
        colors={[theme.glowTop, "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 360 }}
      />
      <LinearGradient
        colors={["transparent", theme.glowBottom]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 300 }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

export function Screen({
  children,
  scroll = true,
  title,
  subtitle,
  back,
  right,
}: {
  children: ReactNode;
  scroll?: boolean;
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const theme = useTheme();
  const header =
    title || back ? (
      <View style={styles.header}>
        {back && (
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            hitSlop={12}
            accessibilityLabel="Voltar"
            style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.ink} />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          {title ? <Txt variant="h1">{title}</Txt> : null}
          {subtitle ? (
            <Txt variant="label" muted style={{ marginTop: 2 }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right}
      </View>
    ) : null;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <PaperBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
            {header}
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.screenContent, { flex: 1 }]}>
            {header}
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
      <Txt variant="overline" muted>
        {children}
      </Txt>
      {right}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cartão "folha de caderno" (ledger-paper do web)
// ---------------------------------------------------------------------------

export function Card({
  children,
  style,
  onPress,
  accent,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accent?: string;
}) {
  const theme = useTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: theme.surface,
      borderColor: accent ?? theme.border,
      shadowColor: theme.shadow,
    },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Botões
// ---------------------------------------------------------------------------

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  compact,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "ghost" | "soft" | "danger" | "accent";
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, fg: theme.primaryForeground, border: theme.primary },
    accent: { bg: theme.accent, fg: "#ffffff", border: theme.accent },
    soft: { bg: theme.primarySoft, fg: theme.primaryInk, border: "transparent" },
    ghost: { bg: "transparent", fg: theme.ink, border: theme.border },
    danger: { bg: theme.danger, fg: "#ffffff", border: theme.danger },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        compact && { height: 38, paddingHorizontal: 12 },
        {
          backgroundColor: pressed && variant === "primary" ? theme.primaryPressed : palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={palette.fg} /> : null}
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: compact ? 14 : 15, color: palette.fg }}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
  filled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  color?: string;
  filled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        {
          backgroundColor: filled ? theme.primary : theme.surface,
          borderColor: filled ? theme.primary : theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={filled ? "#fff" : color ?? theme.ink} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Campos
// ---------------------------------------------------------------------------

export function Input({ label, ...props }: TextInputProps & { label?: string }) {
  const theme = useTheme();
  const field = (
    <TextInput
      placeholderTextColor={theme.inkMuted}
      {...props}
      style={[
        styles.input,
        props.multiline && { height: undefined, minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
        { color: theme.ink, borderColor: theme.border, backgroundColor: theme.field, fontFamily: fonts.body },
        props.style,
      ]}
    />
  );
  if (!label) return field;
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="label" muted>
        {label}
      </Txt>
      {field}
    </View>
  );
}

// Grupo de opções (chips) — usado para prioridade, períodos, filtros etc.
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  wrap,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  wrap?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: wrap ? "wrap" : "nowrap" }}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={{
              flex: wrap ? undefined : 1,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 8,
              alignItems: "center",
              backgroundColor: active ? theme.primarySoft : "transparent",
              borderWidth: 1,
              borderColor: active ? theme.primary : theme.border,
            }}
          >
            <Text style={{ fontFamily: active ? fonts.bodySemi : fonts.bodyMedium, fontSize: 13, color: active ? theme.primaryInk : theme.inkMuted }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Progresso
// ---------------------------------------------------------------------------

export function ProgressBar({ percent, color, height = 8 }: { percent: number; color?: string; height?: number }) {
  const theme = useTheme();
  return (
    <View style={{ height, borderRadius: 999, overflow: "hidden", backgroundColor: theme.primarySoft }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, percent))}%`,
          height: "100%",
          borderRadius: 999,
          backgroundColor: color ?? theme.primary,
        }}
      />
    </View>
  );
}

// Anel de progresso (CircularProgress do web).
export function ProgressRing({
  percent,
  size = 64,
  stroke = 6,
  color,
  children,
}: {
  percent: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.primarySoft} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? theme.primary}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </Svg>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pequenos blocos
// ---------------------------------------------------------------------------

export function Badge({ label, color, solid }: { label: string; color?: string; solid?: boolean }) {
  const theme = useTheme();
  const c = color ?? theme.primary;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: solid ? c : theme.primarySoft,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, color: solid ? "#fff" : theme.primaryInk }}>{label}</Text>
    </View>
  );
}

export function StatTile({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color?: string;
}) {
  const theme = useTheme();
  const c = color ?? theme.primary;
  return (
    <Card style={{ flex: 1, padding: 12, gap: 6 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.mode === "dark" ? `${c}26` : `${c}1f`,
        }}
      >
        <Ionicons name={icon} size={18} color={c} />
      </View>
      <Txt variant="h2">{value}</Txt>
      <Txt variant="caption" muted>
        {label}
      </Txt>
    </Card>
  );
}

export function EmptyState({ text, icon }: { text: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 18, gap: 8 }}>
      {icon ? <Ionicons name={icon} size={28} color={theme.inkMuted} /> : null}
      <Txt variant="label" muted style={{ textAlign: "center" }}>
        {text}
      </Txt>
    </View>
  );
}

export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

// ---------------------------------------------------------------------------
// Folha inferior (substitui o <Modal> do web)
// ---------------------------------------------------------------------------

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 1,
            borderColor: theme.border,
            maxHeight: "88%",
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 8 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
            <Txt variant="h2" style={{ flex: 1 }}>
              {title}
            </Txt>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <Ionicons name="close" size={24} color={theme.inkMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenContent: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  input: { height: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
});
