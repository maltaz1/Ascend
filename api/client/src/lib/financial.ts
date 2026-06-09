/**
 * FlowZone Financial System
 * Sistema completo de gestão financeira pessoal
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type TransactionType = 'entrada' | 'saída';
export type RecurrenceFrequency = 'semanal' | 'mensal' | 'nenhuma';
export type TimePeriod = 'dia' | 'semana' | 'mês' | 'personalizado';

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'entrada' | 'saída'; // Categorias separadas por tipo
  color: string;
  icon: string;
}

export interface FinancialAccount {
  id: string;
  name: string;
  balance: number;
  type: 'carteira' | 'banco' | 'cartão' | 'outro';
  color: string;
}

export interface Transaction {
  id: string;
  name: string;
  value: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  date: Date;
  description?: string;
  recurrenceId?: string; // Referência à transação recorrente
  isRecurring: boolean;
}

export interface RecurringTransaction {
  id: string;
  name: string;
  value: number;
  type: TransactionType;
  categoryId: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  startDate: Date;
  endDate?: Date;
  dayOfMonth?: number; // Para mensal
  dayOfWeek?: number; // Para semanal (0-6)
  lastExecuted?: Date;
  nextExecution?: Date;
  active: boolean;
}

export interface BudgetLimit {
  id: string;
  categoryId: string;
  limit: number;
  month: string; // "YYYY-MM"
  spent: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  profit: number;
  transactionCount: number;
  categoryBreakdown: Record<string, number>;
  accountBalances: Record<string, number>;
}

export interface FinancialStats {
  largestExpense: { name: string; value: number; date: Date } | null;
  largestIncome: { name: string; value: number; date: Date } | null;
  categoryWithMostExpense: { categoryId: string; total: number } | null;
  averageExpensePerDay: number;
  daysWithoutExpense: number;
  totalDaysInPeriod: number;
  expensesByCategory: Record<string, number>;
  incomeByCategory: Record<string, number>;
}

export interface FinancialChartData {
  balanceEvolution: Array<{ date: string; balance: number }>;
  expensesByCategory: Array<{ category: string; value: number; percentage: number }>;
  incomeByCategory: Array<{ category: string; value: number; percentage: number }>;
  dailyExpenses: Array<{ date: string; amount: number }>;
}

export interface FinancialState {
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  categories: FinancialCategory[];
  accounts: FinancialAccount[];
  budgetLimits: BudgetLimit[];
  selectedPeriod: TimePeriod;
  customStartDate?: Date;
  customEndDate?: Date;
}

// ============================================================================
// CATEGORIAS PADRÃO
// ============================================================================

export const DEFAULT_EXPENSE_CATEGORIES: FinancialCategory[] = [
  { id: 'food', name: 'Alimentação', type: 'saída', color: '#F59E0B', icon: '🍔' },
  { id: 'transport', name: 'Transporte', type: 'saída', color: '#3B82F6', icon: '🚗' },
  { id: 'entertainment', name: 'Lazer', type: 'saída', color: '#EC4899', icon: '🎮' },
  { id: 'utilities', name: 'Contas', type: 'saída', color: '#10B981', icon: '💡' },
  { id: 'health', name: 'Saúde', type: 'saída', color: '#EF4444', icon: '🏥' },
  { id: 'education', name: 'Educação', type: 'saída', color: '#8B5CF6', icon: '📚' },
  { id: 'shopping', name: 'Compras', type: 'saída', color: '#06B6D4', icon: '🛍️' },
  { id: 'other_expense', name: 'Outros', type: 'saída', color: '#6B7280', icon: '📌' },
];

export const DEFAULT_INCOME_CATEGORIES: FinancialCategory[] = [
  { id: 'salary', name: 'Salário', type: 'entrada', color: '#10B981', icon: '💰' },
  { id: 'freelance', name: 'Freelance', type: 'entrada', color: '#F59E0B', icon: '💻' },
  { id: 'investment', name: 'Investimento', type: 'entrada', color: '#3B82F6', icon: '📈' },
  { id: 'gift', name: 'Presente', type: 'entrada', color: '#EC4899', icon: '🎁' },
  { id: 'other_income', name: 'Outros', type: 'entrada', color: '#6B7280', icon: '📌' },
];

export const DEFAULT_ACCOUNTS: FinancialAccount[] = [
  { id: 'wallet', name: 'Carteira', balance: 0, type: 'carteira', color: '#F59E0B' },
  { id: 'bank', name: 'Banco', balance: 0, type: 'banco', color: '#3B82F6' },
];

// ============================================================================
// FUNÇÕES UTILITÁRIAS DE DATA
// ============================================================================

export function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getEndOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getPeriodRange(period: TimePeriod, customStart?: Date, customEnd?: Date): [Date, Date] {
  const today = new Date();
  
  switch (period) {
    case 'dia':
      return [getStartOfDay(today), getEndOfDay(today)];
    case 'semana':
      return [getStartOfWeek(today), getEndOfWeek(today)];
    case 'mês':
      return [getStartOfMonth(today), getEndOfMonth(today)];
    case 'personalizado':
      if (!customStart || !customEnd) {
        return [getStartOfMonth(today), getEndOfMonth(today)];
      }
      return [getStartOfDay(customStart), getEndOfDay(customEnd)];
    default:
      return [getStartOfMonth(today), getEndOfMonth(today)];
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
