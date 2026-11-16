/**
 * Tipos para compromissos e anotações do calendário
 * Estrutura escalável para gerenciar eventos e notas por dia
 */

export interface Appointment {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601 format: "HH:mm"
  endTime: string;   // ISO 8601 format: "HH:mm"
  date: string;      // ISO 8601 format: "YYYY-MM-DD"
  category?: string;
  color: string;     // Hex color code (e.g., "#c4b5fd")
  createdAt: string;
}

export interface CalendarNote {
  id: string;
  userId: string;
  content: string;
  date: string;      // ISO 8601 format: "YYYY-MM-DD"
  createdAt: string;
}

export interface AppointmentFormData {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  category?: string;
  color: string;
}

export interface CalendarNoteFormData {
  content: string;
  date: string;
}

// Cores predefinidas para categorias
export const APPOINTMENT_COLORS = [
  { name: "Laranja", value: "#c4b5fd" },
  { name: "Vermelho", value: "#6d28d9" },
  { name: "Verde", value: "#a78bfa" },
  { name: "Azul", value: "#7c3aed" },
  { name: "Roxo", value: "#A855F7" },
  { name: "Rosa", value: "#c084fc" },
  { name: "Cyan", value: "#ddd6fe" },
  { name: "Amarelo", value: "#ddd6fe" },
] as const;

export const APPOINTMENT_CATEGORIES = [
  "💼 Trabalho",
  "👤 Pessoal",
  "🩺 Saúde",
  "📚 Educação",
  "🎈 Lazer",
  "📌 Outro",
] as const;
