import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { initializeAuth, safeSignOut, subscribeAuthChanges } from "@/lib/auth";
import { loadGymData } from "@/lib/gym";
import { logger } from "@/lib/logger";
import { identifyPurchaser, resetPurchaser } from "@/lib/purchases";
import { DEMO_USER, IS_DEMO, seedDemoData } from "@/demo";
import {
  _data,
  initRealtimeSync,
  loadDietData,
  loadFinancialData,
  loadGoalsData,
  loadHabitsData,
  loadTasksData,
  notify,
  stopRealtimeSync,
} from "@/lib/store";

// De onde veio o PRO: site (Cakto, ou PRO antigo/manual) ou loja do celular.
export type ProSource = "cakto" | "store" | null;

type AuthState = {
  user: User | null;
  isPro: boolean;
  proSource: ProSource;
  loading: boolean;
  signOut: () => Promise<void>;
  // Libera o PRO na hora após compra na loja; o Supabase é atualizado pelo webhook.
  unlockStorePro: () => void;
};

type ProfileState = { isPro: boolean; proSource: ProSource };

const AuthContext = createContext<AuthState | null>(null);

function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Portado de syncProfileState em client/src/App.tsx.
async function syncProfile(user: User): Promise<ProfileState> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, is_pro, pro_source, xp, level, streak, name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    logger.error("auth", "Erro ao sincronizar perfil", error);
    return { isPro: false, proSource: null };
  }

  if (!profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      name: user.user_metadata?.name || user.email?.split("@")[0] || "Usuário",
      level: 1,
      xp: 0,
      streak: 0,
      is_pro: false,
    });
    if (insertError) logger.error("auth", "Erro ao criar perfil", insertError);
    return { isPro: false, proSource: null };
  }

  _data.user.xp = profile.xp || 0;
  _data.user.level = profile.level || 1;
  _data.user.streak = profile.streak || 0;
  _data.user.name = profile.name || "Usuário";
  notify();
  if (!profile.is_pro) return { isPro: false, proSource: null };
  return { isPro: true, proSource: profile.pro_source === "store" ? "store" : "cakto" };
}

// Portado de preloadStartupData em client/src/App.tsx.
async function preloadData(): Promise<void> {
  const loaders = [loadGymData, loadDietData, loadFinancialData, loadTasksData, loadGoalsData, loadHabitsData];
  await Promise.allSettled(loaders.map(fn => timeoutPromise(fn(), 7000)));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Na demonstração o app já começa "logado", com dados de exemplo e PRO
  // liberado para mostrar todas as áreas.
  const [user, setUser] = useState<User | null>(() => {
    if (!IS_DEMO) return null;
    seedDemoData();
    return DEMO_USER;
  });
  const [isPro, setIsPro] = useState(IS_DEMO);
  const [proSource, setProSource] = useState<ProSource>(null);
  const [loading, setLoading] = useState(!IS_DEMO);

  useEffect(() => {
    if (IS_DEMO) return;

    let mounted = true;

    const startSession = async (nextUser: User) => {
      const [profile, storePro] = await Promise.all([syncProfile(nextUser), identifyPurchaser(nextUser.id)]);
      if (!mounted) return;
      setIsPro(profile.isPro || storePro);
      setProSource(profile.isPro ? profile.proSource : storePro ? "store" : null);
      await preloadData();
      initRealtimeSync(nextUser.id).catch(err => logger.error("realtime", "Falha ao iniciar", err));
    };

    const init = async () => {
      const result = await initializeAuth();
      if (!mounted) return;
      setUser(result.user);
      if (result.user) await startSession(result.user);
      if (mounted) setLoading(false);
    };

    void init();

    const unsubscribe = subscribeAuthChanges(({ event, user: nextUser }) => {
      if (!mounted) return;
      setUser(nextUser);
      if (!nextUser) {
        setIsPro(false);
        setProSource(null);
        stopRealtimeSync();
        void resetPurchaser();
        return;
      }
      if (event === "SIGNED_IN") void startSession(nextUser);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (IS_DEMO) {
      setUser(null);
      return;
    }
    stopRealtimeSync();
    await safeSignOut();
  };

  const unlockStorePro = () => {
    setIsPro(true);
    setProSource(current => current ?? "store");
  };

  return (
    <AuthContext.Provider value={{ user, isPro, proSource, loading, signOut, unlockStorePro }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
