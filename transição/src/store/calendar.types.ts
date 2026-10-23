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
  color: string;     // Hex color code (e.g., "#F59E0B")
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
  { name: "Laranja", value: "#F59E0B" },
  { name: "Vermelho", value: "#EF4444" },
  { name: "Verde", value: "#10B981" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Roxo", value: "#A855F7" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Amarelo", value: "#FBBF24" },
] as const;

export const APPOINTMENT_CATEGORIES = [
  "💼 Trabalho",
  "👤 Pessoal",
  "🩺 Saúde",
  "📚 Educação",
  "🎈 Lazer",
  "📌 Outro",
] as const;
