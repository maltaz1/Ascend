import { supabase } from "./supabase";

// Lista de espera do lançamento.
// Produção: funções join_waitlist / waitlist_status / waitlist_total do Supabase
// (migration 20261024_create_waitlist.sql).
// Teste local: VITE_WAITLIST_MODE=local guarda tudo no localStorage deste
// navegador, com a mesma regra de posição, sem tocar no banco.

export type WaitlistStatus = {
  code: string;
  name: string | null;
  position: number;
  referrals: number;
  founder_number: number;
  total: number;
  already?: boolean;
};

export const REFERRAL_BONUS = 5;
export const isLocalWaitlist = import.meta.env.VITE_WAITLIST_MODE === "local";

// ---------- modo local ----------

type LocalEntry = {
  seq: number;
  email: string;
  name: string | null;
  code: string;
  referredBy: string | null;
  source: string | null;
};

const LOCAL_KEY = "ascend-waitlist-local-db";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function readLocal(): LocalEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocal(entries: LocalEntry[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(entries));
  } catch {
    // Sem storage: o teste local só não persiste.
  }
}

export function clearLocalWaitlist() {
  writeLocal([]);
}

export function listLocalWaitlist(): LocalEntry[] {
  return readLocal();
}

function localStatus(entries: LocalEntry[], code: string): WaitlistStatus | null {
  const refs = new Map<string, number>();
  for (const e of entries) {
    if (e.referredBy) refs.set(e.referredBy, (refs.get(e.referredBy) ?? 0) + 1);
  }
  const bySeq = [...entries].sort((a, b) => a.seq - b.seq);
  const ranked = [...bySeq].sort(
    (a, b) =>
      a.seq - REFERRAL_BONUS * (refs.get(a.code) ?? 0) -
        (b.seq - REFERRAL_BONUS * (refs.get(b.code) ?? 0)) || a.seq - b.seq
  );
  const entry = entries.find((e) => e.code === code);
  if (!entry) return null;
  return {
    code: entry.code,
    name: entry.name,
    position: ranked.indexOf(entry) + 1,
    referrals: refs.get(entry.code) ?? 0,
    founder_number: bySeq.indexOf(entry) + 1,
    total: entries.length,
  };
}

function localJoin(
  email: string,
  name: string | null,
  ref: string | null,
  source: string | null
): WaitlistStatus {
  const entries = readLocal();
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 254) {
    throw new Error("invalid_email");
  }

  const existing = entries.find((e) => e.email === cleanEmail);
  if (existing) return { ...localStatus(entries, existing.code)!, already: true };

  let code = "";
  do {
    code = Array.from(
      { length: 6 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
    ).join("");
  } while (entries.some((e) => e.code === code));

  const refCode = ref?.trim().toUpperCase() || null;
  entries.push({
    seq: (entries.at(-1)?.seq ?? 0) + 1,
    email: cleanEmail,
    name: name?.trim().slice(0, 80) || null,
    code,
    referredBy: entries.some((e) => e.code === refCode) ? refCode : null,
    source,
  });
  writeLocal(entries);
  return { ...localStatus(entries, code)!, already: false };
}

// ---------- API usada pela página ----------

export async function joinWaitlist(input: {
  email: string;
  name: string | null;
  ref: string | null;
  source: string | null;
}): Promise<WaitlistStatus> {
  if (isLocalWaitlist) {
    return localJoin(input.email, input.name, input.ref, input.source);
  }
  const { data, error } = await supabase.rpc("join_waitlist", {
    p_email: input.email,
    p_name: input.name,
    p_ref: input.ref,
    p_source: input.source,
  });
  if (error || !data) throw new Error(error?.message ?? "empty_response");
  return data as WaitlistStatus;
}

export async function getWaitlistStatus(code: string): Promise<WaitlistStatus | null> {
  if (isLocalWaitlist) return localStatus(readLocal(), code.trim().toUpperCase());
  const { data } = await supabase.rpc("waitlist_status", { p_code: code });
  return (data as WaitlistStatus | null) ?? null;
}

// Link "não quero mais e-mails" dos e-mails (/lista?sair=TOKEN).
export async function unsubscribeWaitlist(token: string): Promise<boolean> {
  if (isLocalWaitlist) return true;
  const { data, error } = await supabase.rpc("waitlist_unsubscribe", { p_token: token });
  return !error && data === true;
}

export async function getWaitlistTotal(): Promise<number | null> {
  if (isLocalWaitlist) return readLocal().length;
  const { data } = await supabase.rpc("waitlist_total");
  return typeof data === "number" ? data : null;
}
