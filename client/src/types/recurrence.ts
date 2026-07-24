// Tipos para funcionalidade de Tarefas Recorrentes

export type RecurrenceType = 'never' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export type RecurrenceEndType = 'never' | 'after_occurrences' | 'on_date';

export interface RecurrenceConfig {
  type: RecurrenceType;
  interval?: number; // para custom: repetir a cada X dias/semanas/meses/anos
  intervalUnit?: 'days' | 'weeks' | 'months' | 'years'; // para custom
  daysOfWeek?: number[]; // 0-6, segunda-domingo
  endType: RecurrenceEndType;
  endDate?: string; // YYYY-MM-DD
  occurrences?: number; // quantas vezes vai repetir
  status: 'active' | 'paused';
  nextOccurrence?: string; // YYYY-MM-DD
  createdAt?: string;
  updatedAt?: string;
}

export interface RecurringTask {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  recurrence: RecurrenceConfig;
  completedOccurrences?: string[]; // datas das ocorrências concluídas
  skippedOccurrences?: string[]; // datas das ocorrências puladas
  lostOccurrences?: string[]; // datas das ocorrências perdidas (passadas sem completar)
  createdAt: string;
  updatedAt: string;
}

export interface RecurrenceHistory {
  completed: Array<{
    date: string;
    completedAt: string;
  }>;
  skipped: Array<{
    date: string;
  }>;
  lost: Array<{
    date: string;
  }>;
}
