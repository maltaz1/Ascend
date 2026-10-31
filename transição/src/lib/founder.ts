// Benefícios de Fundador (quem estava na lista de espera do lançamento).
// O servidor (função sync_founder no Supabase) liga o selo e o 1 mês de
// PRO grátis quando o e-mail da conta está na lista, e desliga o PRO de
// fundador quando o prazo acaba. O app só chama e mostra o resultado.
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export type FounderState = {
  founderNumber: number | null;
  founderProUntil: string | null;
  isPro: boolean;
  proSource: string | null;
};

export async function syncFounder(): Promise<FounderState | null> {
  const { data, error } = await supabase.rpc("sync_founder");
  if (error) {
    logger.error("founder", "Falha ao sincronizar benefícios de fundador", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    founderNumber: row.founder_number ?? null,
    founderProUntil: row.founder_pro_until ?? null,
    isPro: Boolean(row.is_pro),
    proSource: row.pro_source ?? null,
  };
}

// "#0007", igual ao selo da página da lista e ao e-mail de lançamento.
export function founderLabel(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}
