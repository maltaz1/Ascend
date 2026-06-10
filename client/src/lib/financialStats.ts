/**
 * Lógica de Estatísticas e Análises Financeiras
 */

import {
  FinancialState,
  FinancialStats,
  FinancialChartData,
  Transaction,
  getStartOfDay,
  getEndOfDay,
} from './financial';
import {
  filterTransactionsByType,
  getCategoryBreakdown,
} from './financialTransactions';
import { parseLocalDate, getLocalDateTimestamp } from './date';

// ============================================================================
// ESTATÍSTICAS BÁSICAS
// ============================================================================

export function calculateFinancialStats(
  state: FinancialState,
  transactions: Transaction[]
): FinancialStats {
  const expenseTransactions = filterTransactionsByType(transactions, 'saída');
  const incomeTransactions = filterTransactionsByType(transactions, 'entrada');

  // Maior gasto
  const largestExpense = expenseTransactions.length > 0
    ? expenseTransactions.reduce((max, t) => (t.value > max.value ? t : max))
    : null;

  // Maior entrada
  const largestIncome = incomeTransactions.length > 0
    ? incomeTransactions.reduce((max, t) => (t.value > max.value ? t : max))
    : null;

  // Categoria com mais gasto
  const expenseByCategory = getCategoryBreakdown(transactions, 'saída');
  let categoryWithMostExpense: { categoryId: string; total: number } | null = null;

  if (Object.keys(expenseByCategory).length > 0) {
    const maxCategory = Object.entries(expenseByCategory).reduce((max, [id, value]) =>
      value > max[1] ? [id, value] : max
    );
    categoryWithMostExpense = {
      categoryId: maxCategory[0],
      total: maxCategory[1],
    };
  }

  // Média de gastos por dia
  const totalDaysInPeriod = calculateDaysInPeriod(transactions);
  const averageExpensePerDay =
    totalDaysInPeriod > 0
      ? expenseTransactions.reduce((sum, t) => sum + t.value, 0) / totalDaysInPeriod
      : 0;

  // Dias sem gastar
  const daysWithoutExpense = calculateDaysWithoutExpense(transactions);

  return {
    largestExpense: largestExpense
      ? {
          name: largestExpense.name,
          value: largestExpense.value,
          date: largestExpense.date,
        }
      : null,
    largestIncome: largestIncome
      ? {
          name: largestIncome.name,
          value: largestIncome.value,
          date: largestIncome.date,
        }
      : null,
    categoryWithMostExpense,
    averageExpensePerDay,
    daysWithoutExpense,
    totalDaysInPeriod,
    expensesByCategory: expenseByCategory,
    incomeByCategory: getCategoryBreakdown(transactions, 'entrada'),
  };
}

// ============================================================================
// CÁLCULOS AUXILIARES
// ============================================================================

function calculateDaysInPeriod(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;

  const dates = transactions.map(t => parseLocalDate(t.date).toDateString());
  const uniqueDates = new Set(dates);
  return uniqueDates.size;
}

function calculateDaysWithoutExpense(transactions: Transaction[]): number {
  if (transactions.length === 0) return 0;

  const expenseTransactions = filterTransactionsByType(transactions, 'saída');
  if (expenseTransactions.length === 0) return calculateDaysInPeriod(transactions);

  // Encontrar data mínima e máxima
  const dates = transactions.map(t => getLocalDateTimestamp(t.date));
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);

  // Contar dias com gastos
  const daysWithExpense = new Set(
    expenseTransactions.map(t => parseLocalDate(t.date).toDateString())
  );

  // Calcular total de dias no período
  const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

  return totalDays - daysWithExpense.size;
}

// ============================================================================
// DADOS PARA GRÁFICOS
// ============================================================================

export function generateChartData(
  state: FinancialState,
  transactions: Transaction[]
): FinancialChartData {
  return {
    balanceEvolution: generateBalanceEvolution(transactions),
    expensesByCategory: generateCategoryBreakdown(state, transactions, 'saída'),
    incomeByCategory: generateCategoryBreakdown(state, transactions, 'entrada'),
    dailyExpenses: generateDailyExpenses(transactions),
  };
}

function generateBalanceEvolution(transactions: Transaction[]): Array<{ date: string; balance: number }> {
  const sortedTransactions = [...transactions].sort(
    (a, b) => getLocalDateTimestamp(a.date) - getLocalDateTimestamp(b.date)
  );

  const evolution: Array<{ date: string; balance: number }> = [];
  let balance = 0;

  sortedTransactions.forEach(t => {
    const dateStr = parseLocalDate(t.date).toLocaleDateString('pt-BR');
    const value = t.type === 'entrada' ? t.value : -t.value;
    balance += value;

    // Atualizar ou adicionar
    const existing = evolution.find(e => e.date === dateStr);
    if (existing) {
      existing.balance = balance;
    } else {
      evolution.push({ date: dateStr, balance });
    }
  });

  return evolution;
}

function generateCategoryBreakdown(
  state: FinancialState,
  transactions: Transaction[],
  type: 'entrada' | 'saída'
): Array<{ category: string; value: number; percentage: number }> {
  const breakdown = getCategoryBreakdown(transactions, type);
  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  return Object.entries(breakdown).map(([categoryId, value]) => {
    const category = state.categories.find(c => c.id === categoryId);
    return {
      category: category?.name || 'Desconhecido',
      value,
      percentage: total > 0 ? (value / total) * 100 : 0,
    };
  });
}

function generateDailyExpenses(transactions: Transaction[]): Array<{ date: string; amount: number }> {
  const dailyMap: Record<string, number> = {};

  filterTransactionsByType(transactions, 'saída').forEach(t => {
    const dateStr = parseLocalDate(t.date).toLocaleDateString('pt-BR');
    dailyMap[dateStr] = (dailyMap[dateStr] || 0) + t.value;
  });

  return Object.entries(dailyMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => getLocalDateTimestamp(a.date) - getLocalDateTimestamp(b.date));
}

// ============================================================================
// COMPARAÇÕES E TENDÊNCIAS
// ============================================================================

export function compareMonths(
  state: FinancialState,
  month1Transactions: Transaction[],
  month2Transactions: Transaction[]
) {
  const month1Expense = filterTransactionsByType(month1Transactions, 'saída').reduce(
    (sum, t) => sum + t.value,
    0
  );
  const month2Expense = filterTransactionsByType(month2Transactions, 'saída').reduce(
    (sum, t) => sum + t.value,
    0
  );

  const difference = month2Expense - month1Expense;
  const percentageChange = month1Expense > 0 ? (difference / month1Expense) * 100 : 0;

  return {
    month1Expense,
    month2Expense,
    difference,
    percentageChange,
    increased: difference > 0,
  };
}

export function getTrendAnalysis(
  transactions: Transaction[],
  windowSize: number = 7
) {
  const sortedTransactions = [...transactions].sort(
    (a, b) => getLocalDateTimestamp(a.date) - getLocalDateTimestamp(b.date)
  );

  const dailyExpenses = generateDailyExpenses(sortedTransactions);

  if (dailyExpenses.length < windowSize) {
    return { trend: 'insufficient_data', averageChange: 0 };
  }

  const recentAverage = dailyExpenses
    .slice(-windowSize)
    .reduce((sum, d) => sum + d.amount, 0) / windowSize;

  const previousAverage = dailyExpenses
    .slice(-windowSize * 2, -windowSize)
    .reduce((sum, d) => sum + d.amount, 0) / windowSize;

  const change = recentAverage - previousAverage;
  const percentageChange = previousAverage > 0 ? (change / previousAverage) * 100 : 0;

  return {
    trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
    averageChange: percentageChange,
    recentAverage,
    previousAverage,
  };
}

// ============================================================================
// INSIGHTS
// ============================================================================

export function generateFinancialInsights(
  state: FinancialState,
  transactions: Transaction[]
): string[] {
  const insights: string[] = [];
  const stats = calculateFinancialStats(state, transactions);

  // Insight 1: Maior categoria de gasto
  if (stats.categoryWithMostExpense) {
    const category = state.categories.find(
      c => c.id === stats.categoryWithMostExpense!.categoryId
    );
    insights.push(
      `Sua maior categoria de gasto é ${category?.name || 'Desconhecido'} com R$ ${stats.categoryWithMostExpense.total.toFixed(2)}`
    );
  }

  // Insight 2: Média de gastos
  if (stats.averageExpensePerDay > 0) {
    insights.push(
      `Você gasta em média R$ ${stats.averageExpensePerDay.toFixed(2)} por dia`
    );
  }

  // Insight 3: Dias sem gastar
  if (stats.daysWithoutExpense > 0) {
    insights.push(
      `Você teve ${stats.daysWithoutExpense} dias sem gastos neste período`
    );
  }

  // Insight 4: Maior transação
  if (stats.largestExpense) {
    insights.push(
      `Seu maior gasto foi "${stats.largestExpense.name}" com R$ ${stats.largestExpense.value.toFixed(2)}`
    );
  }

  return insights;
}
