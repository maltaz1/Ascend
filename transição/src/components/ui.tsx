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
import { fonts, useTheme, useThemeToggle, type Theme } from "@/theme";
import { useDrawer } from "./AppDrawer";

type IconName = keyof typeof Ionicons.glyphMap;

// ---------------------------------------------------------------------------
// Tipografia (index.css: Space Grotesk nos títulos, DM Sans no texto)
// ---------------------------------------------------------------------------

type Variant =
  | "hero"
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodyStrong"
  | "label"
  | "caption"
  | "marginalia"
  | "metric"
  | "mono";

const variantStyle: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 34, letterSpacing: -0.9, lineHeight: 40 },
  display: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.6, lineHeight: 34 },
  h1: { fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.2 },
  h3: { fontFamily: fonts.display, fontSize: 15, letterSpacing: -0.1 },
  body: { fontFamily: fonts.body, fontSize: 14 },
  bodyStrong: { fontFamily: fonts.bodySemi, fontSize: 14 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  caption: { fontFamily: fonts.body, fontSize: 12 },
  // .ledger-marginalia
  marginalia: { fontFamily: fonts.bodySemi, fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase" },
  // .ledger-metric-value
  metric: { fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.9, lineHeight: 32, fontVariant: ["tabular-nums"] },
  mono: { fontFamily: fonts.mono, fontSize: 13, fontWeight: "700" },
};

export function Txt({
  variant = "body",
  muted,
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  const theme = useTheme();
  const defaultMuted = variant === "marginalia";
  return (
    <Text
      {...props}
      style={[variantStyle[variant], { color: color ?? (muted || defaultMuted ? theme.inkMuted : theme.ink) }, style]}
    />
  );
}

// "04 — METAS" (.ledger-index + .ledger-marginalia)
export function Marginalia({ index, children, color }: { index?: string; children: ReactNode; color?: string }) {
  return (
    <Txt variant="marginalia" color={color}>
      {index ? `${index} — ` : ""}
      {children}
    </Txt>
  );
}

// ---------------------------------------------------------------------------
// Fundo de papel com luz (body do web)
// ---------------------------------------------------------------------------

export function PaperBackground() {
  const theme = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} pointerEvents="none">
      <LinearGradient colors={[theme.glowTop, "transparent"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 380 }} />
      <LinearGradient colors={["transparent", theme.glowBottom]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 320 }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cabeçalho: botão do menu (☰), título e botão de tema, como no site
// ---------------------------------------------------------------------------

function SquareButton({ icon, onPress, label, round }: { icon: IconName; onPress: () => void; label: string; round?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: round ? 20 : 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
        opacity: pressed ? 0.8 : 1,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      })}
    >
      <Ionicons name={icon} size={round ? 18 : 20} color={theme.ink} />
    </Pressable>
  );
}

export function ThemeButton() {
  const theme = useTheme();
  const toggle = useThemeToggle();
  return (
    <SquareButton
      icon={theme.mode === "dark" ? "sunny-outline" : "moon-outline"}
      onPress={toggle}
      label="Alternar tema"
      round
    />
  );
}

export function Screen({
  children,
  scroll = true,
  title,
  subtitle,
  back,
  right,
  fab,
}: {
  children: ReactNode;
  scroll?: boolean;
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  fab?: ReactNode;
}) {
  const drawer = useDrawer();
  const header = (
    <View style={styles.header}>
      {back ? (
        <SquareButton
          icon="chevron-back"
          label="Voltar"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        />
      ) : (
        <SquareButton icon="menu" label="Abrir menu" onPress={drawer.open} />
      )}
      <View style={{ flex: 1 }}>
        {title ? (
          <Txt variant="h1" numberOfLines={1}>
            {title}
          </Txt>
        ) : null}
        {subtitle ? (
          <Txt variant="label" muted numberOfLines={1}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
      <ThemeButton />
    </View>
  );

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
      {fab}
    </SafeAreaView>
  );
}

// Botão flutuante roxo "+" (canto inferior direito, como no site).
export function Fab({ onPress, label, icon = "add" }: { onPress: () => void; label: string; icon?: IconName }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        position: "absolute",
        right: 20,
        bottom: insets.bottom + 24,
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? theme.primaryPressed : theme.primary,
        shadowColor: theme.primary,
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      })}
    >
      <Ionicons name={icon} size={28} color="#fff" />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Folha de caderno (.ledger-paper): borda de cima 2px, cantos 6px, sombra dura
// ---------------------------------------------------------------------------

type Tone = "violet" | "amber" | "green" | "red";

function toneColor(tone: Tone | undefined, theme: Theme): string | undefined {
  if (!tone) return undefined;
  return { violet: theme.primary, amber: theme.accent, green: theme.success, red: theme.danger }[tone];
}

export function Card({
  children,
  style,
  onPress,
  tone,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: Tone;
  padded?: boolean;
}) {
  const theme = useTheme();
  const top = toneColor(tone, theme) ?? theme.border;
  const body = (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderTopWidth: 2,
          borderColor: theme.border,
          borderTopColor: top,
          borderRadius: 6,
          padding: padded ? 18 : 0,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
  const shadow = <View pointerEvents="none" style={[styles.hardShadow, { backgroundColor: theme.shadow }]} />;
  if (!onPress) {
    return (
      <View>
        {shadow}
        {body}
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ translateY: pressed ? 1 : 0 }] })}>
      {shadow}
      {body}
    </Pressable>
  );
}

// Linha preenchida dentro de um cartão (itens de tarefa/hábito do site).
export function Row({
  children,
  style,
  onPress,
  onLongPress,
  highlight,
  leftBar,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  highlight?: string;
  leftBar?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 6,
          backgroundColor: highlight ? `${highlight}14` : theme.raised,
          borderWidth: 1,
          borderColor: highlight ? `${highlight}55` : "transparent",
          borderLeftWidth: leftBar ? 3 : 1,
          borderLeftColor: leftBar ?? (highlight ? `${highlight}55` : "transparent"),
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

// Métrica (.ledger-metric): "02 — XP" / valor grande / rótulo / nota colorida.
export function Metric({
  index,
  label,
  value,
  caption,
  sub,
  subColor,
  tone,
  valueColor,
  center,
}: {
  index?: string;
  label: string;
  value: string;
  caption?: string;
  sub?: string;
  subColor?: string;
  tone?: Tone;
  valueColor?: string;
  center?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Card tone={tone} style={{ gap: 6, alignItems: center ? "center" : "flex-start", paddingVertical: 16 }}>
        <Marginalia index={index}>{label}</Marginalia>
        <Txt variant="metric" color={valueColor} style={{ marginTop: 4 }}>
          {value}
        </Txt>
        {caption ? (
          <Txt variant="label" muted>
            {caption}
          </Txt>
        ) : null}
        {sub ? (
          <Txt variant="caption" color={subColor} style={{ fontFamily: fonts.bodySemi, letterSpacing: 0.4 }}>
            {sub}
          </Txt>
        ) : null}
      </Card>
    </View>
  );
}

// Carimbo (.ledger-stamp)
export function Stamp({ label, tone = "ink", icon }: { label: string; tone?: Tone | "ink"; icon?: IconName }) {
  const theme = useTheme();
  const color = tone === "ink" ? theme.inkMuted : (toneColor(tone, theme) as string);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: tone === "ink" ? theme.border : `${color}8c`,
        backgroundColor: tone === "ink" ? "transparent" : `${color}14`,
        alignSelf: "flex-start",
      }}
    >
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color }}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Botões (.ledger-btn: cantos 5px)
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
  variant?: "primary" | "ghost" | "soft" | "danger" | "accent" | "orange";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.primary, fg: "#fff", border: theme.primary },
    accent: { bg: theme.accent, fg: "#fff", border: theme.accent },
    orange: { bg: theme.orange, fg: "#fff", border: theme.orange },
    soft: { bg: theme.primarySoft, fg: theme.primaryInk, border: theme.primaryBorder },
    ghost: { bg: "transparent", fg: theme.ink, border: theme.border },
    danger: { bg: theme.danger, fg: "#fff", border: theme.danger },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        compact && { height: 38, paddingHorizontal: 14 },
        {
          backgroundColor: pressed && variant === "primary" ? theme.primaryPressed : palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
        variant === "primary" && styles.buttonGlow,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {icon ? <Ionicons name={icon} size={compact ? 15 : 17} color={palette.fg} /> : null}
          <Text style={{ fontFamily: fonts.bodySemi, fontSize: compact ? 13 : 14, letterSpacing: 0.3, color: palette.fg }}>{label}</Text>
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
  icon: IconName;
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
// Campos: sublinhado (.ledger-input) ou caixa (busca)
// ---------------------------------------------------------------------------

export function Input({
  label,
  boxed,
  icon,
  ...props
}: TextInputProps & { label?: string; boxed?: boolean; icon?: IconName }) {
  const theme = useTheme();
  const field = (
    <View
      style={
        boxed
          ? {
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 6,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
            }
          : { borderBottomWidth: 1.5, borderBottomColor: theme.border }
      }
    >
      {icon ? <Ionicons name={icon} size={16} color={theme.inkMuted} /> : null}
      <TextInput
        placeholderTextColor={theme.inkMuted}
        {...props}
        style={[
          {
            flex: 1,
            minHeight: boxed ? 46 : 42,
            paddingVertical: boxed ? 10 : 8,
            paddingHorizontal: boxed ? 0 : 2,
            fontSize: 14,
            color: theme.ink,
            fontFamily: fonts.body,
          },
          props.multiline && { minHeight: 80, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
  if (!label) return field;
  return (
    <View style={{ gap: 4 }}>
      <Marginalia>{label}</Marginalia>
      {field}
    </View>
  );
}

// Filtros: "stamp" = carimbos em caixa alta (TODAS / PENDENTES), "pill" = alternador roxo (Diário / Semanal).
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  wrap,
  kind = "pill",
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  wrap?: boolean;
  kind?: "pill" | "stamp";
}) {
  const theme = useTheme();
  if (kind === "stamp") {
    return (
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {options.map(option => {
          const active = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 3,
                borderWidth: 1,
                borderColor: active ? theme.primaryBorder : theme.border,
                backgroundColor: active ? theme.primarySoft : "transparent",
              }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", color: active ? theme.primary : theme.inkMuted }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: wrap ? "wrap" : "nowrap",
        padding: 4,
        gap: 4,
        borderRadius: 8,
        backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      }}
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={{
              flex: wrap ? undefined : 1,
              flexDirection: "row",
              gap: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? theme.primary : "transparent",
            }}
          >
            {option.icon ? <Ionicons name={option.icon} size={14} color={active ? "#fff" : theme.inkMuted} /> : null}
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: active ? "#fff" : theme.inkMuted }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Progresso
// ---------------------------------------------------------------------------

export function ProgressBar({ percent, color, height = 6 }: { percent: number; color?: string; height?: number }) {
  const theme = useTheme();
  return (
    <View style={{ height, borderRadius: 999, overflow: "hidden", backgroundColor: theme.track }}>
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

// CircularProgress do web.
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
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={theme.track} strokeWidth={stroke} fill="none" />
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
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: solid ? c : theme.primarySoft, alignSelf: "flex-start" }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: solid ? "#fff" : theme.primaryInk }}>{label}</Text>
    </View>
  );
}

// Quadradinho com ícone e borda colorida (cabeçalho de seção no site).
export function IconBox({ icon, color, size = 32 }: { icon: IconName; color?: string; size?: number }) {
  const theme = useTheme();
  const c = color ?? theme.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: `${c}8c`,
        backgroundColor: `${c}14`,
      }}
    >
      <Ionicons name={icon} size={size * 0.48} color={c} />
    </View>
  );
}

export function SectionHeader({
  icon,
  title,
  subtitle,
  right,
  color,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  color?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {icon ? <IconBox icon={icon} color={color} /> : null}
      <View style={{ flex: 1 }}>
        <Txt variant="h3">{title}</Txt>
        {subtitle ? (
          <Txt variant="marginalia" style={{ marginTop: 3 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function SectionTitle({ children, right, index }: { children: ReactNode; right?: ReactNode; index?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
      <Marginalia index={index}>{children}</Marginalia>
      {right}
    </View>
  );
}

export function EmptyState({ text, icon }: { text: string; icon?: IconName }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 18, gap: 8 }}>
      {icon ? <Ionicons name={icon} size={26} color={theme.inkMuted} /> : null}
      <Txt variant="label" muted style={{ textAlign: "center" }}>
        {text}
      </Txt>
    </View>
  );
}

// .ledger-rule
export function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.border }} />;
}

// ---------------------------------------------------------------------------
// Folha inferior (substitui o <Modal> do web)
// ---------------------------------------------------------------------------

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={{ flex: 1, backgroundColor: theme.overlay }} onPress={onClose} />
        <View
          style={{
            backgroundColor: theme.surface,
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
            borderTopWidth: 2,
            borderColor: theme.primary,
            maxHeight: "90%",
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 }}>
            <Txt variant="h2" style={{ flex: 1 }}>
              {title}
            </Txt>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color={theme.inkMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 18, gap: 16, paddingBottom: 8, paddingTop: 4 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 14, paddingTop: 12, gap: 16, paddingBottom: 110 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  hardShadow: { position: "absolute", top: 3, left: 3, right: -3, bottom: -3, borderRadius: 6 },
  button: {
    height: 46,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonGlow: {
    shadowColor: "#8b5cf6",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
