import { supabase } from "@/lib/supabase";
import { store } from "../store";
import { normalizeEntities, upsertEntity, removeEntity, setLoading, setError } from "../core/entity";
import { generateId } from "../utils";
import { loadFinancialTransactions, createFinancialTransactionRow, deleteFinancialTransactionRow } from "@/lib/database";
import type { FinancialTransaction } from "../types";

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function loadFinancialData(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  store.update(state => {
    state.financialTransactions = setLoading(state.financialTransactions, true);
  });

  const rows = await loadFinancialTransactions(userId);
  const transactions = rows.map(item => ({
    id: item.id,
    title: item.title,
    amount: Number(item.amount),
    type: item.type,
    category: item.category,
    date: item.date,
    createdAt: item.created_at,
  }));

  store.update(state => {
    state.financialTransactions = normalizeEntities(transactions);
    state.financialTransactions.error = null;
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const previous = store.getState().financialTransactions.byId[id];
  if (!previous) return;

  store.update(state => {
    state.financialTransactions = removeEntity(state.financialTransactions, id);
  });

  try {
    await deleteFinancialTransactionRow(id);
  } catch (error) {
    store.update(state => {
      state.financialTransactions = upsertEntity(state.financialTransactions, previous);
      state.financialTransactions = setError(state.financialTransactions, "Falha ao deletar transação");
    });
  }
}

export function getFinancialData() {
  return {
    transactions: Object.values(store.getState().financialTransactions.byId),
  };
}

export async function addTransaction(transaction: {
  title: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  date: string;
}): Promise<void> {
  const optimisticTransaction: FinancialTransaction = {
    id: generateId(),
    title: transaction.title,
    amount: transaction.amount,
    type: transaction.type,
    category: transaction.category,
    date: transaction.date,
    createdAt: new Date().toISOString(),
  };

  store.update(state => {
    state.financialTransactions = upsertEntity(state.financialTransactions, optimisticTransaction);
  });

  const userId = await getUserId();
  if (!userId) {
    return;
  }

  try {
    const row = await createFinancialTransactionRow({
      user_id: userId,
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      created_at: optimisticTransaction.createdAt,
    });

    const created = {
      id: row.id,
      title: row.title,
      amount: Number(row.amount),
      type: row.type,
      category: row.category,
      date: row.date,
      createdAt: row.created_at,
    };

    store.update(state => {
      state.financialTransactions = upsertEntity(state.financialTransactions, created);
    });
  } catch (error) {
    store.update(state => {
      state.financialTransactions = removeEntity(state.financialTransactions, optimisticTransaction.id);
      state.financialTransactions = setError(state.financialTransactions, "Falha ao adicionar transação");
    });
  }
}
