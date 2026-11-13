import { useState, type ReactNode } from "react";
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname, type Href } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { fonts, useTheme, withAlpha, type Theme } from "@/theme";
import { useTweenNumber } from "@/lib/motion";
import { Glass } from "./Glass";
import { TAB_BAR_HEIGHT } from "./layout";

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

// Número que corre até o valor novo em vez de trocar de uma vez (33% → 40%).
export function AnimatedNumber({ value, ...props }: TextProps & { value: number; variant?: Variant; muted?: boolean; color?: string }) {
  const shown = useTweenNumber(value);
  return <Txt {...props}>{Math.round(shown)}</Txt>;
}

// Anima o primeiro número inteiro de um texto ("1/3", "7d", "33%", "12 dias").
// Valores com casas decimais ou milhar (dinheiro, kg) ficam como estão.
const LEADING_INT = /^(\D*?)(\d+)(?![\d.,])(.*)$/s;

export function AnimatedText({ text, ...props }: TextProps & { text: string; variant?: Variant; muted?: boolean; color?: string }) {
  const match = LEADING_INT.exec(text);
  const target = match ? Number(match[2]) : 0;
  const shown = useTweenNumber(target);
  if (!match) return <Txt {...props}>{text}</Txt>;
  return (
    <Txt {...props}>
      {match[1]}
      {Math.round(shown)}
      {match[3]}
    </Txt>
  );
}

// ---------------------------------------------------------------------------
// Fundo de papel com luz (body do web)
// ---------------------------------------------------------------------------

export function PaperBackground() {
  const theme = useTheme();
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]} pointerEvents="none" />;
}

// ---------------------------------------------------------------------------
// Cabeçalho: título grande à esquerda. Rotina e Saúde ganham as abas internas;
// as páginas que saem de "Mais" ganham o botão de voltar.
// ---------------------------------------------------------------------------

export function GlassIconButton({ icon, onPress, label, size = 44 }: { icon: IconName; onPress: () => void; label: string; size?: number }) {
  const theme = useTheme();
  return (
    <Glass interactive style={{ width: size, height: size, borderRadius: size / 2 }}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.fill, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name={icon} size={20} color={theme.ink} />
      </Pressable>
    </Glass>
  );
}

const GROUPS: { title: string; subtitle: string; tabs: { href: string; label: string }[] }[] = [
  {
    title: "Rotina",
    subtitle: "Tarefas, hábitos e metas",
    tabs: [
      { href: "/tasks", label: "Tarefas" },
      { href: "/habits", label: "Hábitos" },
      { href: "/goals", label: "Metas" },
    ],
  },
  {
    title: "Saúde",
    subtitle: "Treino e alimentação",
    tabs: [
      { href: "/academy", label: "Academia" },
      { href: "/diet", label: "Dieta" },
    ],
  },
];

// Páginas abertas a partir da aba "Mais".
const MORE_PAGES: Record<string, string> = {
  "/financial": "Financeiro",
  "/notes": "Notas",
  "/calendar": "Calendário",
  "/dashboard": "Dashboard",
  "/evolution": "Evolução",
  "/achievements": "Conquistas",
  "/settings": "Configurações",
};

function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
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
  const pathname = usePathname();
  const group = GROUPS.find(g => g.tabs.some(tab => tab.href === pathname));
  const morePage = MORE_PAGES[pathname];

  let header: ReactNode;
  if (group && !right) {
    header = (
      <View style={{ gap: 16 }}>
        <View>
          <Txt variant="hero">{group.title}</Txt>
          <Txt variant="label" muted style={{ marginTop: 2 }}>
            {group.subtitle}
          </Txt>
        </View>
        <PillTabs
          options={group.tabs.map(tab => ({ value: tab.href, label: tab.label }))}
          value={pathname}
          onChange={href => router.replace(href as Href)}
        />
      </View>
    );
  } else if (back || morePage) {
    header = (
      <View style={styles.header}>
        <GlassIconButton icon="chevron-back" label="Voltar" onPress={() => goBack((morePage ? "/more" : "/") as Href)} />
        <View style={{ flex: 1 }}>
          <Txt variant="display" numberOfLines={1}>
            {title ?? morePage}
          </Txt>
          {subtitle ? (
            <Txt variant="label" muted numberOfLines={1}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right}
      </View>
    );
  } else if (title || right) {
    header = (
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {title ? (
            <Txt variant="hero" numberOfLines={1}>
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
      </View>
    );
  }

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

// Botão flutuante roxo "+" (canto inferior direito), acima da barra inferior.
export function Fab({ onPress, label, icon = "add" }: { onPress: () => void; label: string; icon?: IconName }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Glass
      tint={theme.primary}
      interactive
      style={{
        position: "absolute",
        right: 20,
        bottom: Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT + 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        shadowColor: theme.primary,
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.fill, { opacity: pressed ? 0.85 : 1 }]}>
        <Ionicons name={icon} size={28} color="#fff" />
      </Pressable>
    </Glass>
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

const LAYOUT_KEYS = [
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "flex",
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "alignSelf",
  "margin",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginHorizontal",
  "marginVertical",
  "position",
  "top",
  "left",
  "right",
  "bottom",
] as const;

function splitLayoutStyle(style: StyleProp<ViewStyle>): { outer: ViewStyle; inner: ViewStyle } {
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    if ((LAYOUT_KEYS as readonly string[]).includes(key)) outer[key] = value;
    else inner[key] = value;
  }
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
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
  const toned = toneColor(tone, theme);
  // Tamanho e posição (width: "47%", flex: 1...) ficam no invólucro; o resto do
  // estilo vai para o cartão. Sem isso o invólucro encolhe e o texto quebra.
  const { outer, inner } = splitLayoutStyle(style);
  const body = (
    <View
      style={[
        {
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: toned ? withAlpha(toned, 0.45) : theme.border,
          borderRadius: 24,
          padding: padded ? 18 : 0,
          gap: 12,
        },
        outer.flex !== undefined || outer.height !== undefined ? { flexGrow: 1 } : null,
        inner,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return <View style={outer}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [outer, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {body}
    </Pressable>
  );
}

// Cartão de destaque (progresso do dia, saldo, nível): roxo escuro sólido.
export function HeroCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View style={[{ backgroundColor: theme.hero, borderWidth: 1, borderColor: theme.heroBorder, borderRadius: 26, padding: 18, gap: 16 }, style]}>
      {children}
    </View>
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
          paddingVertical: 13,
          paddingHorizontal: 14,
          borderRadius: 18,
          backgroundColor: highlight ? withAlpha(highlight, 0.1) : theme.raised,
          borderWidth: 1,
          borderColor: highlight ? withAlpha(highlight, 0.35) : theme.border,
          borderLeftWidth: leftBar ? 3 : 1,
          borderLeftColor: leftBar ?? (highlight ? withAlpha(highlight, 0.35) : theme.border),
          transform: [{ scale: pressed ? 0.98 : 1 }],
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
        <AnimatedText variant="metric" color={valueColor} style={{ marginTop: 4 }} text={value} />
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
        borderRadius: 999,
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
  const tints = { primary: theme.primary, accent: theme.accent, orange: theme.orange, danger: theme.danger, soft: undefined, ghost: undefined };
  // Desabilitado vira vidro neutro: o GlassView não deve receber opacidade menor que 1.
  const tint = disabled ? undefined : tints[variant];
  const fg = disabled ? theme.inkMuted : tint ? "#fff" : variant === "soft" ? theme.primaryInk : theme.ink;
  const height = compact ? 38 : 46;

  return (
    <Glass tint={tint} interactive={!disabled} style={[styles.button, { height, borderRadius: height / 2 }, variant === "primary" && !disabled && styles.buttonGlow]}>
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [styles.buttonPress, compact && { paddingHorizontal: 14 }, { opacity: pressed ? 0.85 : 1 }]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {icon ? <Ionicons name={icon} size={compact ? 15 : 17} color={fg} /> : null}
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: compact ? 13 : 14, letterSpacing: 0.3, color: fg }}>{label}</Text>
          </View>
        )}
      </Pressable>
    </Glass>
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
    <Glass tint={filled ? theme.primary : undefined} interactive style={styles.iconButton}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.fill, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Ionicons name={icon} size={20} color={filled ? "#fff" : color ?? theme.ink} />
      </Pressable>
    </Glass>
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
  // Em foco, só a linha/borda fica roxa (.ledger-input:focus do web).
  const [focused, setFocused] = useState(false);
  const lineColor = focused ? theme.primary : theme.border;
  const field = (
    <View
      style={
        boxed
          ? {
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: lineColor,
              borderRadius: 6,
              backgroundColor: theme.surface,
              paddingHorizontal: 12,
            }
          : { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1.5, borderBottomColor: lineColor }
      }
    >
      {icon ? <Ionicons name={icon} size={16} color={focused ? theme.primary : theme.inkMuted} /> : null}
      <TextInput
        placeholderTextColor={theme.inkMuted}
        {...props}
        onFocus={e => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            flex: 1,
            minHeight: boxed ? 46 : 42,
            paddingVertical: boxed ? 10 : 8,
            paddingHorizontal: boxed ? 0 : 2,
            fontSize: 14,
            color: theme.ink,
            fontFamily: fonts.body,
            // tira a moldura padrão do navegador (só existe na versão web)
            outlineWidth: 0,
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
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
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
  return <PillTabs options={options} value={value} onChange={onChange} wrap={wrap} />;
}

// Seletor em pílula: a opção ativa fica em violeta sólido.
export function PillTabs<T extends string | number>({
  options,
  value,
  onChange,
  wrap,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
  wrap?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        flexWrap: wrap ? "wrap" : "nowrap",
        padding: 4,
        gap: 4,
        borderRadius: 18,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={{
              flex: wrap ? undefined : 1,
              flexDirection: "row",
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 14,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? theme.primary : "transparent",
            }}
          >
            {option.icon ? <Ionicons name={option.icon} size={14} color={active ? "#fff" : theme.inkMuted} /> : null}
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13.5, color: active ? "#fff" : theme.inkMuted }}>{option.label}</Text>
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
  const shown = useTweenNumber(Math.max(0, Math.min(100, percent)));
  return (
    <View style={{ height, borderRadius: 999, overflow: "hidden", backgroundColor: theme.track }}>
      <View
        style={{
          width: `${shown}%`,
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
  const clamped = useTweenNumber(Math.max(0, Math.min(100, percent)));
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
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderWidth: 1,
            borderBottomWidth: 0,
            borderColor: theme.border,
            maxHeight: "90%",
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: theme.inkMuted, opacity: 0.4, marginTop: 10 }} />
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}>
            <Txt variant="display" style={{ flex: 1, fontSize: 24 }}>
              {title}
            </Txt>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fechar">
              <Ionicons name="close" size={22} color={theme.inkMuted} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 8, paddingTop: 4 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: 14, paddingTop: 12, gap: 16, paddingBottom: 130 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 2 },
  button: { height: 46, borderRadius: 23 },
  buttonPress: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  fill: { flex: 1, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  buttonGlow: {
    shadowColor: "#8b5cf6",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  iconButton: { width: 40, height: 40, borderRadius: 20 },
});
