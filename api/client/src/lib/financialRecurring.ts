/**
 * Lógica de Transações Recorrentes
 */

import {
  FinancialState,
  RecurringTransaction,
  Transaction,
  RecurrenceFrequency,
  generateId,
} from './financial';

// ============================================================================
// OPERAÇÕES DE TRANSAÇÕES RECORRENTES
// ============================================================================

export function addRecurringTransaction(
  state: FinancialState,
  recurring: Omit<RecurringTransaction, 'id' | 'lastExecuted' | 'nextExecution'>
): FinancialState {
  const newRecurring: RecurringTransaction = {
    ...recurring,
    id: generateId(),
    lastExecuted: undefined,
    nextExecution: calculateNextExecution(recurring.startDate, recurring.frequency, recurring.dayOfMonth, recurring.dayOfWeek),
  };

  return {
    ...state,
    recurringTransactions: [...state.recurringTransactions, newRecurring],
  };
}

export function updateRecurringTransaction(
  state: FinancialState,
  id: string,
  updates: Partial<RecurringTransaction>
): FinancialState {
  return {
    ...state,
    recurringTransactions: state.recurringTransactions.map(r =>
      r.id === id ? { ...r, ...updates } : r
    ),
  };
}

export function deleteRecurringTransaction(
  state: FinancialState,
  id: string
): FinancialState {
  return {
    ...state,
    recurringTransactions: state.recurringTransactions.filter(r => r.id !== id),
  };
}

export function getRecurringTransactionById(
  state: FinancialState,
  id: string
): RecurringTransaction | undefined {
  return state.recurringTransactions.find(r => r.id === id);
}

// ============================================================================
// CÁLCULOS DE RECORRÊNCIA
// ============================================================================

function calculateNextExecution(
  startDate: Date,
  frequency: RecurrenceFrequency,
  dayOfMonth?: number,
  dayOfWeek?: number
): Date {
  const today = new Date();
  let nextDate = new Date(startDate);

  if (frequency === 'nenhuma') {
    return nextDate;
  }

  // Se já passou da data de início, calcular próxima ocorrência
  if (nextDate <= today) {
    if (frequency === 'semanal' && dayOfWeek !== undefined) {
      nextDate = getNextWeeklyDate(today, dayOfWeek);
    } else if (frequency === 'mensal' && dayOfMonth !== undefined) {
      nextDate = getNextMonthlyDate(today, dayOfMonth);
    }
  }

  return nextDate;
}

function getNextWeeklyDate(from: Date, targetDayOfWeek: number): Date {
  const date = new Date(from);
  const currentDay = date.getDay();
  const daysAhead = targetDayOfWeek - currentDay;

  if (daysAhead <= 0) {
    date.setDate(date.getDate() + daysAhead + 7);
  } else {
    date.setDate(date.getDate() + daysAhead);
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function getNextMonthlyDate(from: Date, dayOfMonth: number): Date {
  const date = new Date(from);
  date.setDate(dayOfMonth);
  date.setHours(0, 0, 0, 0);

  if (date <= from) {
    date.setMonth(date.getMonth() + 1);
  }

  return date;
}

// ============================================================================
// EXECUÇÃO DE TRANSAÇÕES RECORRENTES
// ============================================================================

export function executeRecurringTransactions(
  state: FinancialState
): FinancialState {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let newState = state;
  const newTransactions: Transaction[] = [];

  state.recurringTransactions.forEach(recurring => {
    // Verificar se deve executar
    if (
      !recurring.active ||
      !recurring.nextExecution ||
      new Date(recurring.nextExecution) > today
    ) {
      return;
    }

    // Verificar se não expirou
    if (recurring.endDate && new Date(recurring.endDate) < today) {
      return;
    }

    // Criar transação
    const transaction: Transaction = {
      id: generateId(),
      name: recurring.name,
      value: recurring.value,
      type: recurring.type,
      categoryId: recurring.categoryId,
      accountId: recurring.accountId,
      date: today,
      recurrenceId: recurring.id,
      isRecurring: true,
    };

    newTransactions.push(transaction);

    // Atualizar próxima execução
    const nextExecution = calculateNextExecution(
      today,
      recurring.frequency,
      recurring.dayOfMonth,
      recurring.dayOfWeek
    );

    newState = updateRecurringTransaction(newState, recurring.id, {
      lastExecuted: today,
      nextExecution,
    });
  });

  // Adicionar transações geradas
  return {
    ...newState,
    transactions: [...newState.transactions, ...newTransactions],
  };
}

// ============================================================================
// CONSULTAS
// ============================================================================

export function getActiveRecurringTransactions(
  state: FinancialState
): RecurringTransaction[] {
  return state.recurringTransactions.filter(r => r.active);
}

export function getRecurringTransactionsByCategory(
  state: FinancialState,
  categoryId: string
): RecurringTransaction[] {
  return state.recurringTransactions.filter(r => r.categoryId === categoryId);
}

export function getRecurringTransactionsByAccount(
  state: FinancialState,
  accountId: string
): RecurringTransaction[] {
  return state.recurringTransactions.filter(r => r.accountId === accountId);
}

export function getUpcomingRecurringTransactions(
  state: FinancialState,
  daysAhead: number = 30
): RecurringTransaction[] {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return state.recurringTransactions.filter(r => {
    if (!r.active || !r.nextExecution) return false;
    const nextExec = new Date(r.nextExecution);
    return nextExec >= today && nextExec <= futureDate;
  });
}

// ============================================================================
// VALIDAÇÕES
// ============================================================================

export function validateRecurringTransaction(
  recurring: Omit<RecurringTransaction, 'id' | 'lastExecuted' | 'nextExecution'>,
  state: FinancialState
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!recurring.name || recurring.name.trim() === '') {
    errors.push('Nome da transação recorrente é obrigatório');
  }

  if (recurring.value <= 0) {
    errors.push('Valor deve ser maior que zero');
  }

  const categoryExists = state.categories.some(c => c.id === recurring.categoryId);
  if (!categoryExists) {
    errors.push('Categoria inválida');
  }

  const accountExists = state.accounts.some(a => a.id === recurring.accountId);
  if (!accountExists) {
    errors.push('Conta inválida');
  }

  if (recurring.frequency === 'semanal' && recurring.dayOfWeek === undefined) {
    errors.push('Dia da semana é obrigatório para recorrência semanal');
  }

  if (recurring.frequency === 'mensal' && recurring.dayOfMonth === undefined) {
    errors.push('Dia do mês é obrigatório para recorrência mensal');
  }

  if (recurring.endDate && recurring.endDate < recurring.startDate) {
    errors.push('Data de término não pode ser anterior à data de início');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

export function getRecurrenceLabel(frequency: RecurrenceFrequency): string {
  const labels: Record<RecurrenceFrequency, string> = {
    semanal: 'Semanal',
    mensal: 'Mensal',
    nenhuma: 'Nenhuma',
  };
  return labels[frequency];
}

export function formatRecurringTransaction(
  recurring: RecurringTransaction,
  state: FinancialState
): string {
  const category = state.categories.find(c => c.id === recurring.categoryId);
  const frequency = getRecurrenceLabel(recurring.frequency);

  return `${recurring.name} (${category?.name || 'Desconhecido'}) - ${frequency}`;
}

export function calculateTotalMonthlyRecurring(
  state: FinancialState,
  type: 'entrada' | 'saída'
): number {
  return state.recurringTransactions
    .filter(r => r.active && r.frequency === 'mensal' && r.type === type)
    .reduce((sum, r) => sum + r.value, 0);
}

export function calculateTotalWeeklyRecurring(
  state: FinancialState,
  type: 'entrada' | 'saída'
): number {
  return state.recurringTransactions
    .filter(r => r.active && r.frequency === 'semanal' && r.type === type)
    .reduce((sum, r) => sum + r.value, 0);
}
