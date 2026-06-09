/**
 * Lógica de Categorias e Contas Financeiras
 */

import {
  FinancialCategory,
  FinancialAccount,
  FinancialState,
  TransactionType,
  generateId,
} from './financial';

// ============================================================================
// OPERAÇÕES DE CATEGORIAS
// ============================================================================

export function addCategory(
  state: FinancialState,
  category: Omit<FinancialCategory, 'id'>
): FinancialState {
  const newCategory: FinancialCategory = {
    ...category,
    id: generateId(),
  };

  return {
    ...state,
    categories: [...state.categories, newCategory],
  };
}

export function updateCategory(
  state: FinancialState,
  id: string,
  updates: Partial<FinancialCategory>
): FinancialState {
  return {
    ...state,
    categories: state.categories.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ),
  };
}

export function deleteCategory(
  state: FinancialState,
  id: string
): FinancialState {
  // Não deletar se houver transações usando essa categoria
  const hasTransactions = state.transactions.some(t => t.categoryId === id);
  if (hasTransactions) {
    throw new Error('Não é possível deletar categoria com transações');
  }

  return {
    ...state,
    categories: state.categories.filter(c => c.id !== id),
  };
}

export function getCategoryById(
  state: FinancialState,
  id: string
): FinancialCategory | undefined {
  return state.categories.find(c => c.id === id);
}

export function getCategoriesByType(
  state: FinancialState,
  type: TransactionType
): FinancialCategory[] {
  return state.categories.filter(c => c.type === type);
}

// ============================================================================
// OPERAÇÕES DE CONTAS
// ============================================================================

export function addAccount(
  state: FinancialState,
  account: Omit<FinancialAccount, 'id'>
): FinancialState {
  const newAccount: FinancialAccount = {
    ...account,
    id: generateId(),
  };

  return {
    ...state,
    accounts: [...state.accounts, newAccount],
  };
}

export function updateAccount(
  state: FinancialState,
  id: string,
  updates: Partial<FinancialAccount>
): FinancialState {
  return {
    ...state,
    accounts: state.accounts.map(a =>
      a.id === id ? { ...a, ...updates } : a
    ),
  };
}

export function deleteAccount(
  state: FinancialState,
  id: string
): FinancialState {
  // Não deletar se houver transações usando essa conta
  const hasTransactions = state.transactions.some(t => t.accountId === id);
  if (hasTransactions) {
    throw new Error('Não é possível deletar conta com transações');
  }

  return {
    ...state,
    accounts: state.accounts.filter(a => a.id !== id),
  };
}

export function getAccountById(
  state: FinancialState,
  id: string
): FinancialAccount | undefined {
  return state.accounts.find(a => a.id === id);
}

export function updateAccountBalance(
  state: FinancialState,
  accountId: string,
  newBalance: number
): FinancialState {
  return updateAccount(state, accountId, { balance: newBalance });
}

// ============================================================================
// VALIDAÇÕES
// ============================================================================

export function validateCategory(
  category: Omit<FinancialCategory, 'id'>,
  state: FinancialState
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!category.name || category.name.trim() === '') {
    errors.push('Nome da categoria é obrigatório');
  }

  // Verificar duplicação
  const exists = state.categories.some(
    c => c.name.toLowerCase() === category.name.toLowerCase() && c.type === category.type
  );
  if (exists) {
    errors.push('Categoria com este nome já existe');
  }

  if (!category.color || !category.color.match(/^#[0-9A-F]{6}$/i)) {
    errors.push('Cor inválida');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateAccount(
  account: Omit<FinancialAccount, 'id'>,
  state: FinancialState
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!account.name || account.name.trim() === '') {
    errors.push('Nome da conta é obrigatório');
  }

  // Verificar duplicação
  const exists = state.accounts.some(
    a => a.name.toLowerCase() === account.name.toLowerCase()
  );
  if (exists) {
    errors.push('Conta com este nome já existe');
  }

  if (account.balance < 0) {
    errors.push('Saldo não pode ser negativo');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

export function getCategoryName(
  state: FinancialState,
  categoryId: string
): string {
  const category = getCategoryById(state, categoryId);
  return category?.name || 'Desconhecido';
}

export function getAccountName(
  state: FinancialState,
  accountId: string
): string {
  const account = getAccountById(state, accountId);
  return account?.name || 'Desconhecido';
}

export function getCategoryIcon(
  state: FinancialState,
  categoryId: string
): string {
  const category = getCategoryById(state, categoryId);
  return category?.icon || '📌';
}

export function getCategoryColor(
  state: FinancialState,
  categoryId: string
): string {
  const category = getCategoryById(state, categoryId);
  return category?.color || '#6B7280';
}

export function getAccountColor(
  state: FinancialState,
  accountId: string
): string {
  const account = getAccountById(state, accountId);
  return account?.color || '#6B7280';
}
