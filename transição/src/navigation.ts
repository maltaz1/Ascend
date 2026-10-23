import type Ionicons from "@expo/vector-icons/Ionicons";
import { FREE_TABS } from "@/config/planLimits";

export type Section =
  | "today"
  | "habits"
  | "tasks"
  | "goals"
  | "dashboard"
  | "prayer"
  | "academy"
  | "diet"
  | "financial"
  | "notes"
  | "calendar"
  | "evolution"
  | "achievements"
  | "settings";

export type SectionInfo = {
  id: Section;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
};

// Mesma ordem e nomes do menu lateral do web (components/Layout.tsx).
export const SECTIONS: SectionInfo[] = [
  { id: "today", label: "Hoje", icon: "sunny-outline", href: "/" },
  { id: "habits", label: "Hábitos", icon: "flame-outline", href: "/habits" },
  { id: "tasks", label: "Tarefas", icon: "checkbox-outline", href: "/tasks" },
  { id: "goals", label: "Metas", icon: "flag-outline", href: "/goals" },
  { id: "dashboard", label: "Dashboard", icon: "grid-outline", href: "/dashboard" },
  { id: "prayer", label: "Oração", icon: "heart-outline", href: "/prayer" },
  { id: "academy", label: "Academia", icon: "barbell-outline", href: "/academy" },
  { id: "diet", label: "Dieta", icon: "nutrition-outline", href: "/diet" },
  { id: "financial", label: "Financeiro", icon: "cash-outline", href: "/financial" },
  { id: "notes", label: "Notas", icon: "document-text-outline", href: "/notes" },
  { id: "calendar", label: "Calendário", icon: "calendar-outline", href: "/calendar" },
  { id: "evolution", label: "Evolução", icon: "trending-up-outline", href: "/evolution" },
  { id: "achievements", label: "Conquistas", icon: "trophy-outline", href: "/achievements" },
  { id: "settings", label: "Configurações", icon: "settings-outline", href: "/settings" },
];

// Conquistas existe como página no web (pages/Achievements.tsx) mas não tem
// aba no menu; no app fica liberada para todos.
const FREE_EXTRA: Section[] = ["achievements"];

// Qualquer seção fora de FREE_TABS é exclusiva do PRO, como no App.tsx do web.
export function isProSection(section: Section): boolean {
  if (FREE_EXTRA.includes(section)) return false;
  return !FREE_TABS.includes(section);
}
