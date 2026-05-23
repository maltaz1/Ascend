/**
 * Lógica de Transações Financeiras
 */

import {
  Transaction,
  TransactionType,
  FinancialState,
  generateId,
  getMonthKey,
  BudgetLimit,
} from './financial';

// ============================================================================
// OPERAÇÕES CRUD DE TRANSAÇÕES
// ============================================================================

export function addTransaction(
  state: FinancialState,
  transaction: Omit<Transaction, 'id'>
): FinancialState {
  const newTransaction: Transaction = {
    ...transaction,
    id: generateId(),
  };

  return {
    ...state,
    transactions: [...state.transactions, newTransaction],
  };
}

export function updateTransaction(
  state: FinancialState,
  id: string,
  updates: Partial<Transaction>
): FinancialState {
  return {
    ...state,
    transactions: state.transactions.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ),
  };
}

export function deleteTransaction(
  state: FinancialState,
  id: string
): FinancialState {
  return {
    ...state,
    transactions: state.transactions.filter(t => t.id !== id),
  };
}

export function getTransactionById(
  state: FinancialState,
  id: string
): Transaction | undefined {
  return state.transactions.find(t => t.id === id);
}

// ============================================================================
// FILTROS DE TRANSAÇÕES
// ============================================================================

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] {
  return transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= startDate && tDate <= endDate;
  });
}

export function filterTransactionsByType(
  transactions: Transaction[],
  type: TransactionType
): Transaction[] {
  return transactions.filter(t => t.type === type);
}

export function filterTransactionsByCategory(
  transactions: Transaction[],
  categoryId: string
): Transaction[] {
  return transactions.filter(t => t.categoryId === categoryId);
}

export function filterTransactionsByAccount(
  transactions: Transaction[],
  accountId: string
): Transaction[] {
  return transactions.filter(t => t.accountId === accountId);
}

export function filterTransactionsByName(
  transactions: Transaction[],
  searchTerm: string
): Transaction[] {
  const term = searchTerm.toLowerCase();
  return transactions.filter(t =>
    t.name.toLowerCase().includes(term) ||
    (t.description?.toLowerCase().includes(term) ?? false)
  );
}

export function getFilteredTransactions(
  state: FinancialState,
  filters: {
    startDate?: Date;
    endDate?: Date;
    type?: TransactionType;
    categoryId?: string;
    accountId?: string;
    searchTerm?: string;
  }
): Transaction[] {
  let result = [...state.transactions];

  if (filters.startDate && filters.endDate) {
    result = filterTransactionsByPeriod(result, filters.startDate, filters.endDate);
  }

  if (filters.type) {
    result = filterTransactionsByType(result, filters.type);
  }

  if (filters.categoryId) {
    result = filterTransactionsByCategory(result, filters.categoryId);
  }

  if (filters.accountId) {
    result = filterTransactionsByAccount(result, filters.accountId);
  }

  if (filters.searchTerm) {
    result = filterTransactionsByName(result, filters.searchTerm);
  }

  return result;
}

// ============================================================================
// CÁLCULOS FINANCEIROS
// ============================================================================

export function calculateTotalByType(
  transactions: Transaction[],
  type: TransactionType
): number {
  return transactions
    .filter(t => t.type === type)
    .reduce((sum, t) => sum + t.value, 0);
}

export function calculateBalance(
  transactions: Transaction[],
  accountId?: string
): number {
  let filtered = transactions;
  if (accountId) {
    filtered = filterTransactionsByAccount(transactions, accountId);
  }

  const income = calculateTotalByType(filtered, 'entrada');
  const expense = calculateTotalByType(filtered, 'saída');
  return income - expense;
}

export function calculateCategoryTotal(
  transactions: Transaction[],
  categoryId: string
): number {
  return transactions
    .filter(t => t.categoryId === categoryId)
    .reduce((sum, t) => {
      return t.type === 'entrada' ? sum + t.value : sum - t.value;
    }, 0);
}

export function getCategoryBreakdown(
  transactions: Transaction[],
  type: TransactionType
): Record<string, number> {
  const breakdown: Record<string, number> = {};

  transactions
    .filter(t => t.type === type)
    .forEach(t => {
      breakdown[t.categoryId] = (breakdown[t.categoryId] || 0) + t.value;
    });

  return breakdown;
}

export function getAccountBalances(
  state: FinancialState
): Record<string, number> {
  const balances: Record<string, number> = {};

  state.accounts.forEach(account => {
    balances[account.id] = calculateBalance(state.transactions, account.id);
  });

  return balances;
}

// ============================================================================
// RESUMO FINANCEIRO
// ============================================================================

export function getFinancialSummary(
  state: FinancialState,
  transactions: Transaction[]
) {
  const totalIncome = calculateTotalByType(transactions, 'entrada');
  const totalExpense = calculateTotalByType(transactions, 'saída');
  const balance = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    balance,
    profit: balance,
    transactionCount: transactions.length,
    categoryBreakdown: {
      ...getCategoryBreakdown(transactions, 'entrada'),
      ...getCategoryBreakdown(transactions, 'saída'),
    },
    accountBalances: getAccountBalances(state),
  };
}

// ============================================================================
// VALIDAÇÕES
// ============================================================================

export function validateTransaction(
  transaction: Omit<Transaction, 'id'>,
  state: FinancialState
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!transaction.name || transaction.name.trim() === '') {
    errors.push('Nome da transação é obrigatório');
  }

  if (transaction.value <= 0) {
    errors.push('Valor deve ser maior que zero');
  }

  const categoryExists = state.categories.some(c => c.id === transaction.categoryId);
  if (!categoryExists) {
    errors.push('Categoria inválida');
  }

  const accountExists = state.accounts.some(a => a.id === transaction.accountId);
  if (!accountExists) {
    errors.push('Conta inválida');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// ORDENAÇÃO
// ============================================================================

export function sortTransactionsByDate(
  transactions: Transaction[],
  order: 'asc' | 'desc' = 'desc'
): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

export function sortTransactionsByValue(
  transactions: Transaction[],
  order: 'asc' | 'desc' = 'desc'
): Transaction[] {
  return [...transactions].sort((a, b) => {
    return order === 'desc' ? b.value - a.value : a.value - b.value;
  });
}
