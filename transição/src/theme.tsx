import "expo-sqlite/localStorage/install";
import { createContext, useContext, useState, type ReactNode } from "react";
import { Platform } from "react-native";

// Tokens de client/src/index.css do web.
// Escuro = "Ledger Noturno" (padrão do site), claro = "Caderno Diurno".
const dark = {
  mode: "dark" as "light" | "dark",
  primary: "#8b5cf6",
  primaryPressed: "#7c3aed",
  primaryForeground: "#ffffff",
  primarySoft: "rgba(139, 92, 246, 0.12)",
  primaryBorder: "rgba(139, 92, 246, 0.55)",
  primaryInk: "#b69cfb",
  accent: "#f59e0b",
  accentSoft: "rgba(245, 158, 11, 0.10)",
  accentBorder: "rgba(245, 158, 11, 0.55)",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  pink: "#ec4899",
  orange: "#c2410c",
  // Novo design: fundo roxo bem escuro, cartões um tom acima, violeta da logo em cor sólida.
  bg: "#0f0d18",
  surface: "#1b1828",
  surfaceAlt: "#15131f",
  raised: "#242036", // linhas dentro de cartões
  border: "#2a2638",
  field: "#242036",
  track: "#2a2638", // trilho de anéis e barras
  hero: "#1f1936", // cartão de destaque (progresso, saldo, nível)
  heroBorder: "#3a3060",
  ink: "#f6f5fb",
  inkMuted: "#a9a6c0",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  shadow: "rgba(0, 0, 0, 0.32)", // --ledger-paper-shadow
  glowTop: "rgba(139, 92, 246, 0.13)",
  glowBottom: "rgba(245, 158, 11, 0.05)",
  overlay: "rgba(0, 0, 0, 0.55)",
};

const light: typeof dark = {
  ...dark,
  mode: "light",
  primarySoft: "rgba(139, 92, 246, 0.08)",
  primaryInk: "#6d3fd6",
  accentSoft: "rgba(245, 158, 11, 0.08)",
  bg: "#f4f1ea",
  surface: "#ffffff",
  surfaceAlt: "#efece3",
  raised: "#f7f5f0",
  border: "#e6e1d7",
  field: "#ffffff",
  track: "#e5e0d5", // --border-subtle do Caderno Diurno
  hero: "#ece5fb",
  heroBorder: "#d7c9f7",
  ink: "#1c1917",
  inkMuted: "#57534e",
  shadow: "rgba(28, 25, 23, 0.18)",
  glowTop: "rgba(245, 158, 11, 0.10)",
  glowBottom: "rgba(139, 92, 246, 0.05)",
  overlay: "rgba(28, 25, 23, 0.45)",
};

export type Theme = typeof dark;

// Space Grotesk nos títulos, DM Sans no texto e monoespaçada nos valores — como no web.
export const fonts = {
  display: "SpaceGrotesk_700Bold",
  displaySemi: "SpaceGrotesk_600SemiBold",
  displayMedium: "SpaceGrotesk_500Medium",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemi: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "ui-monospace, Menlo, Consolas, monospace" }),
};

// Paleta de gráficos do web (--chart-1..5).
export const chartColors = ["#8b5cf6", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"];

type ThemeState = { theme: Theme; toggleTheme: () => void };

const ThemeContext = createContext<ThemeState>({ theme: dark, toggleTheme: () => {} });

// Mesma chave "theme" do ThemeContext do web.
function readStoredMode(): "light" | "dark" {
  try {
    return localStorage.getItem("theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(readStoredMode);
  const toggleTheme = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // sem armazenamento: só muda nesta sessão
    }
  };
  return (
    <ThemeContext.Provider value={{ theme: mode === "dark" ? dark : light, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeToggle(): () => void {
  return useContext(ThemeContext).toggleTheme;
}

// O web grava cores de hábitos/metas como "var(--accent)" ou hex.
export function resolveColor(color: string | undefined, theme: Theme): string {
  if (!color) return theme.primary;
  const match = color.match(/^var\(--([\w-]+)\)$/);
  if (!match) return color;
  switch (match[1]) {
    case "accent":
    case "chart-2":
      return theme.accent;
    case "chart-3":
      return theme.success;
    case "chart-5":
      return theme.pink;
    default:
      return theme.primary;
  }
}

// Mistura uma cor hex com transparência.
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  return `#${clean}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}
