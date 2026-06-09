import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { logger } from "./logger";

const AUTH_REQUEST_TIMEOUT_MS = 6000;
const AUTH_INITIALIZE_TIMEOUT_MS = 10000;
const AUTH_RETRY_COUNT = 1;
const AUTH_STORAGE_PREFIX = "supabase.auth.";

export type AuthStatus = "initializing" | "authenticated" | "unauthenticated" | "failed";

export type AuthInitResult = {
  status: AuthStatus;
  user: User | null;
  session: Session | null;
  error?: string;
  recovered: boolean;
};

type AuthStateChangePayload = {
  event: AuthChangeEvent;
  session: Session | null;
  user: User | null;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`Auth request timed out after ${ms}ms`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timer);
  });
}

export function clearCorruptedSession(): void {
  if (!isBrowser()) return;

  const removedKeys: string[] = [];

  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith(AUTH_STORAGE_PREFIX)) {
      try {
        window.localStorage.removeItem(key);
        removedKeys.push(key);
      } catch (error) {
        logger.warn("auth", "Falha ao remover chave de sessão: " + key, error);
      }
    }
  });

  if (removedKeys.length > 0) {
    logger.warn("auth", "Sessão Supabase potencialmente corrompida removida", { removedKeys });
  }
}

export async function safeSignOut(): Promise<void> {
  try {
    const { error } = await timeoutPromise(supabase.auth.signOut(), AUTH_REQUEST_TIMEOUT_MS);
    if (error) {
      logger.warn("auth", "signOut retornou erro", error);
    }
  } catch (error) {
    logger.warn("auth", "signOut timeout ou falhou", error);
  } finally {
    clearCorruptedSession();
  }
}

export async function safeGetUser(): Promise<AuthInitResult> {
  let recovered = false;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= AUTH_RETRY_COUNT; attempt += 1) {
    try {
      const response = await timeoutPromise(supabase.auth.getUser(), AUTH_REQUEST_TIMEOUT_MS);
      const sessionResponse =
        typeof supabase.auth.getSession === "function"
          ? await timeoutPromise(supabase.auth.getSession(), AUTH_REQUEST_TIMEOUT_MS)
          : null;

      const user = response.data?.user ?? sessionResponse?.data?.session?.user ?? null;
      const session = sessionResponse?.data?.session ?? null;

      if (response.error) {
        lastError = response.error;
        throw response.error;
      }

      if (!user) {
        lastError = new Error("Sessão de usuário inválida ou expirada");
        throw lastError;
      }

      return {
        status: "authenticated",
        user,
        session,
        recovered,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = error instanceof Error ? error : new Error(message);

      if (attempt < AUTH_RETRY_COUNT) {
        logger.warn("auth", "safeGetUser falhou, limpando sessão e tentando novamente", { message });
        recovered = true;
        clearCorruptedSession();
        continue;
      }

      logger.warn("auth", "safeGetUser finalizou sem usuário ativo", { message });
      return {
        status: "unauthenticated",
        user: null,
        session: null,
        recovered,
        error: message,
      };
    }
  }

  return {
    status: "failed",
    user: null,
    session: null,
    recovered,
    error: lastError?.message ?? "Falha desconhecida ao obter usuário",
  };
}

export async function initializeAuth(): Promise<AuthInitResult> {
  try {
    const result = await timeoutPromise(safeGetUser(), AUTH_INITIALIZE_TIMEOUT_MS);

    if (result.status === "authenticated") {
      logger.info("auth", "Auth inicializada com usuário ativo", { userId: result.user?.id });
    } else {
      logger.info("auth", "Auth inicializada sem usuário ativo", {
        status: result.status,
        error: result.error,
      });
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("auth", "initializeAuth timeout ou falha", { message });
    clearCorruptedSession();

    return {
      status: "unauthenticated",
      user: null,
      session: null,
      recovered: false,
      error: message,
    };
  }
}

export function subscribeAuthChanges(
  onChange: (payload: AuthStateChangePayload) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    onChange({
      event,
      session,
      user: session?.user ?? null,
    });
  });

  return () => {
    if (data?.subscription) {
      data.subscription.unsubscribe();
    }
  };
}
