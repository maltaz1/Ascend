import { useColorScheme } from "react-native";

// Tokens do client/src/index.css do web.
// Claro = "Caderno Diurno" (papel creme, luz âmbar de cima).
// Escuro = "Ledger Noturno" (papel grafite, luz violeta de cima).
const light = {
  mode: "light" as "light" | "dark",
  primary: "#8b5cf6",
  primaryPressed: "#7c3aed",
  primaryForeground: "#ffffff",
  primarySoft: "#ede9fe",
  primaryInk: "#5b21b6",
  accent: "#f59e0b",
  accentSoft: "#fef3c7",
  blue: "#3b82f6",
  pink: "#ec4899",
  bg: "#f4f1ea",
  surface: "#ffffff",
  surfaceAlt: "#efece3",
  border: "#e0dcd2",
  field: "#ffffff",
  ink: "#1c1917",
  inkMuted: "#57534e",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  shadow: "rgba(28, 25, 23, 0.18)",
  glowTop: "rgba(245, 158, 11, 0.10)",
  glowBottom: "rgba(139, 92, 246, 0.05)",
};

const dark: typeof light = {
  mode: "dark",
  primary: "#8b5cf6",
  primaryPressed: "#7c3aed",
  primaryForeground: "#ffffff",
  primarySoft: "rgba(139, 92, 246, 0.15)",
  primaryInk: "#a78bfa",
  accent: "#f59e0b",
  accentSoft: "rgba(245, 158, 11, 0.15)",
  blue: "#3b82f6",
  pink: "#ec4899",
  bg: "#12111a",
  surface: "#18181f",
  surfaceAlt: "#15151c",
  border: "#262630",
  field: "#2a2a32",
  ink: "#f5f5f5",
  inkMuted: "#9ca3af",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  shadow: "rgba(0, 0, 0, 0.32)",
  glowTop: "rgba(139, 92, 246, 0.13)",
  glowBottom: "rgba(245, 158, 11, 0.05)",
};

export type Theme = typeof light;

// Space Grotesk nos títulos, DM Sans no texto — como no web.
export const fonts = {
  display: "SpaceGrotesk_700Bold",
  displaySemi: "SpaceGrotesk_600SemiBold",
  displayMedium: "SpaceGrotesk_500Medium",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemi: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
};

// Paleta de gráficos do web (--chart-1..5).
export const chartColors = ["#8b5cf6", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"];

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

// O web grava cores de hábitos/metas como "var(--accent)" ou hex.
// No app não há CSS, então traduzimos as variáveis conhecidas.
export function resolveColor(color: string | undefined, theme: Theme): string {
  if (!color) return theme.primary;
  const match = color.match(/^var\(--([\w-]+)\)$/);
  if (!match) return color;
  switch (match[1]) {
    case "accent":
      return theme.accent;
    case "primary":
      return theme.primary;
    case "chart-3":
      return theme.success;
    case "chart-5":
      return theme.pink;
    default:
      return theme.primary;
  }
}

// Mistura uma cor hex com transparência (para fundos suaves de ícones).
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${clean}${a}`;
}
