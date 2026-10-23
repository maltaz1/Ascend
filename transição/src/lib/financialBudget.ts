/**
 * Lógica de Orçamento e Controle de Gastos
 */

import {
  FinancialState,
  BudgetLimit,
  generateId,
  getMonthKey,
} from './financial';
import { calculateCategoryTotal, filterTransactionsByPeriod } from './financialTransactions';
import { getStartOfMonth, getEndOfMonth } from './financial';

// ============================================================================
// OPERAÇÕES DE ORÇAMENTO
// ============================================================================

export function addBudgetLimit(
  state: FinancialState,
  budget: Omit<BudgetLimit, 'id' | 'spent'>
): FinancialState {
  const newBudget: BudgetLimit = {
    ...budget,
    id: generateId(),
    spent: 0,
  };

  return {
    ...state,
    budgetLimits: [...state.budgetLimits, newBudget],
  };
}

export function updateBudgetLimit(
  state: FinancialState,
  id: string,
  updates: Partial<BudgetLimit>
): FinancialState {
  return {
    ...state,
    budgetLimits: state.budgetLimits.map(b =>
      b.id === id ? { ...b, ...updates } : b
    ),
  };
}

export function deleteBudgetLimit(
  state: FinancialState,
  id: string
): FinancialState {
  return {
    ...state,
    budgetLimits: state.budgetLimits.filter(b => b.id !== id),
  };
}

export function getBudgetLimitByMonth(
  state: FinancialState,
  categoryId: string,
  month: string
): BudgetLimit | undefined {
  return state.budgetLimits.find(
    b => b.categoryId === categoryId && b.month === month
  );
}

// ============================================================================
// CÁLCULOS DE ORÇAMENTO
// ============================================================================

export function calculateCategorySpent(
  state: FinancialState,
  categoryId: string,
  month: string
): number {
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum, 0);

  const monthTransactions = filterTransactionsByPeriod(
    state.transactions,
    startDate,
    endDate
  );

  return monthTransactions
    .filter(t => t.categoryId === categoryId && t.type === 'saída')
    .reduce((sum, t) => sum + t.value, 0);
}

export function getBudgetStatus(
  state: FinancialState,
  categoryId: string,
  month: string
): {
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
} {
  const budget = getBudgetLimitByMonth(state, categoryId, month);
  const spent = calculateCategorySpent(state, categoryId, month);

  const limit = budget?.limit ?? 0;
  const remaining = Math.max(0, limit - spent);
  const percentage = limit > 0 ? (spent / limit) * 100 : 0;
  const isExceeded = spent > limit;

  return {
    limit,
    spent,
    remaining,
    percentage: Math.min(percentage, 100),
    isExceeded,
  };
}

export function getAllBudgetStatuses(
  state: FinancialState,
  month: string
) {
  const statuses: Record<string, ReturnType<typeof getBudgetStatus>> = {};

  state.budgetLimits
    .filter(b => b.month === month)
    .forEach(budget => {
      statuses[budget.categoryId] = getBudgetStatus(
        state,
        budget.categoryId,
        month
      );
    });

  return statuses;
}

// ============================================================================
// ALERTAS DE ORÇAMENTO
// ============================================================================

export function getBudgetAlerts(
  state: FinancialState,
  month: string
): Array<{
  categoryId: string;
  categoryName: string;
  type: 'warning' | 'danger';
  message: string;
  percentage: number;
}> {
  const alerts: Array<{
    categoryId: string;
    categoryName: string;
    type: 'warning' | 'danger';
    message: string;
    percentage: number;
  }> = [];

  state.budgetLimits
    .filter(b => b.month === month)
    .forEach(budget => {
      const status = getBudgetStatus(state, budget.categoryId, month);
      const category = state.categories.find(c => c.id === budget.categoryId);

      if (status.isExceeded) {
        alerts.push({
          categoryId: budget.categoryId,
          categoryName: category?.name || 'Desconhecido',
          type: 'danger',
          message: `Orçamento excedido em R$ ${(status.spent - status.limit).toFixed(2)}`,
          percentage: status.percentage,
        });
      } else if (status.percentage >= 80) {
        alerts.push({
          categoryId: budget.categoryId,
          categoryName: category?.name || 'Desconhecido',
          type: 'warning',
          message: `${status.percentage.toFixed(0)}% do orçamento utilizado`,
          percentage: status.percentage,
        });
      }
    });

  return alerts;
}

// ============================================================================
// VALIDAÇÕES
// ============================================================================

export function validateBudgetLimit(
  budget: Omit<BudgetLimit, 'id' | 'spent'>,
  state: FinancialState
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (budget.limit <= 0) {
    errors.push('Limite deve ser maior que zero');
  }

  const categoryExists = state.categories.some(c => c.id === budget.categoryId);
  if (!categoryExists) {
    errors.push('Categoria inválida');
  }

  // Verificar duplicação no mesmo mês
  const exists = state.budgetLimits.some(
    b => b.categoryId === budget.categoryId && b.month === budget.month
  );
  if (exists) {
    errors.push('Já existe orçamento para esta categoria neste mês');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

export function getTotalBudgetForMonth(
  state: FinancialState,
  month: string
): number {
  return state.budgetLimits
    .filter(b => b.month === month)
    .reduce((sum, b) => sum + b.limit, 0);
}

export function getTotalSpentForMonth(
  state: FinancialState,
  month: string
): number {
  return state.budgetLimits
    .filter(b => b.month === month)
    .reduce((sum, b) => sum + calculateCategorySpent(state, b.categoryId, month), 0);
}

export function getMonthlyBudgetSummary(
  state: FinancialState,
  month: string
) {
  const totalBudget = getTotalBudgetForMonth(state, month);
  const totalSpent = getTotalSpentForMonth(state, month);
  const remaining = Math.max(0, totalBudget - totalSpent);
  const percentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return {
    totalBudget,
    totalSpent,
    remaining,
    percentage: Math.min(percentage, 100),
    isExceeded: totalSpent > totalBudget,
  };
}
