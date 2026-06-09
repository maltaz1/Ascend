import { supabase } from "@/lib/supabase";
import { FinancialTransaction } from "./types";
import { _data, notify, persistState } from "./state";
import { generateId } from "./utils";

export async function loadFinancialData(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao carregar finanças:", error);
    return;
  }

  _data.financial.transactions = (data || []).map(item => ({
    id: item.id,
    title: item.title,
    amount: Number(item.amount),
    type: item.type,
    category: item.category,
    date: item.date,
    createdAt: item.created_at,
  }));

  notify();
  persistState();
}

export async function deleteTransaction(id: string): Promise<void> {
  const previousTransactions = [..._data.financial.transactions];
  _data.financial.transactions = _data.financial.transactions.filter(item => item.id !== id);

  notify();
  persistState();

  void (async () => {
    const { error } = await supabase.from("financial_transactions").delete().eq("id", id);
    if (error) {
      console.error("Erro ao deletar transação:", error);
      _data.financial.transactions = previousTransactions;
      notify();
      persistState();
    }
  })();
}

export function getFinancialData() {
  return _data.financial;
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

  _data.financial.transactions.push(optimisticTransaction);
  notify();
  persistState();

  void (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Usuário não encontrado");
      _data.financial.transactions = _data.financial.transactions.filter(item => item.id !== optimisticTransaction.id);
      notify();
      persistState();
      return;
    }

    const { data, error } = await supabase
      .from("financial_transactions")
      .insert([
        {
          user_id: user.id,
          title: transaction.title,
          amount: transaction.amount,
          type: transaction.type,
          category: transaction.category,
          date: transaction.date,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error(error);
      _data.financial.transactions = _data.financial.transactions.filter(item => item.id !== optimisticTransaction.id);
      notify();
      persistState();
      return;
    }

    const index = _data.financial.transactions.findIndex(item => item.id === optimisticTransaction.id);
    if (index !== -1) {
      _data.financial.transactions[index] = {
        id: data.id,
        title: data.title,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        date: data.date,
        createdAt: data.created_at,
      };
      notify();
      persistState();
    }
  })();
}
