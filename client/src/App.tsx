import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { loadGymData } from "./lib/gym";
import { supabase } from "./lib/supabase";
import { initializeAuth, subscribeAuthChanges } from "@/lib/auth";
import { usePWA } from "./hooks/usePWA";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { FlowToastContainer } from "./components/ui/FlowToast";
import {
  loadDietData,
  loadFinancialData,
  loadTasksData,
  loadGoalsData,
  initRealtimeSync,
  stopRealtimeSync,
  _data,
} from "./lib/store";

function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(
      () => reject(new Error(`Request timed out after ${ms}ms`)),
      ms
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timer);
  });
}

import UpgradeModal from "./components/UpgradeModal";

// Pages
import Dashboard from "./pages/Dashboard";
import Today from "./pages/Today";
import Tasks from "./pages/Tasks";
import Goals from "./pages/Goals";
import Habits from "./pages/Habits";
import Prayer from "./pages/Prayer";
import Diet from "./pages/Diet";
import CalendarView from "./pages/CalendarView";
import Academy from "./pages/Academy";
import Evolution from "./pages/Evolution";
import Settings from "./pages/Settings";
import Financial from "./pages/Financial";
import ResetPassword from "./pages/ResetPassword";
import DownloadApp from "./pages/DownloadApp.tsx";

// Login
import Login from "./pages/Login";

type Tab =
  | "dashboard"
  | "today"
  | "tasks"
  | "goals"
  | "habits"
  | "prayer"
  | "diet"
  | "financial"
  | "calendar"
  | "academy"
  | "evolution"
  | "settings"
  | "download";

function AppContent({
  isPro,
  onOpenUpgrade,
}: {
  isPro: boolean;
  onOpenUpgrade: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "today":
        return <Today />;
      case "tasks":
        return <Tasks isPro={isPro} />;
      case "goals":
        return <Goals />;
      case "habits":
        return <Habits isPro={isPro} />;
      case "prayer":
        return <Prayer />;
      case "diet":
        return <Diet />;
      case "financial":
        return <Financial />;
      case "calendar":
        return <CalendarView />;
      case "academy":
        return <Academy onTabChange={setActiveTab} />;
      case "evolution":
        return <Evolution onTabChange={setActiveTab} />;
      case "settings":
        return <Settings />;
      case "download":
        return <DownloadApp />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isPro={isPro}
      onOpenUpgrade={onOpenUpgrade}
    >
      {renderPage()}
    </Layout>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  usePWA();

  const syncProfileState = async (currentUser: User | null = user) => {
    if (!currentUser?.id) {
      setIsPro(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, is_pro, xp, level, streak, name")
      .eq("id", currentUser.id)
      .single();

    if (error) {
      console.error("ERRO AO SINCRONIZAR PERFIL:", error);
      return;
    }

    if (!profile) {
      await supabase.from("profiles").insert({
        id: currentUser.id,
        name: currentUser.email?.split("@")[0] ?? "Usuário",
        level: 1,
        xp: 0,
        streak: 0,
        is_pro: false,
      });

      setIsPro(false);
      return;
    }

    setIsPro(Boolean(profile.is_pro));

    _data.user.xp = profile.xp || 0;
    _data.user.level = profile.level || 1;
    _data.user.streak = profile.streak || 0;
    _data.user.name = profile.name || "Usuário";
  };

  async function preloadStartupData(): Promise<void> {
    const loaders = [
      { name: "gym", fn: loadGymData },
      { name: "diet", fn: loadDietData },
      { name: "financial", fn: loadFinancialData },
      { name: "tasks", fn: loadTasksData },
      { name: "goals", fn: loadGoalsData },
    ];

    await Promise.allSettled(
      loaders.map(async ({ name, fn }) => {
        try {
          await timeoutPromise(fn(), 7000);
        } catch (error) {
          console.warn(`Startup data loader ${name} falhou`, error);
        }
      })
    );
  }

  useEffect(() => {
    let mounted = true;
    let startupTimeout: number | null = null;
    let unsubscribeAuth: (() => void) | null = null;

    const authStateChange = async (payload: {
      event: string;
      user: User | null;
    }) => {
      if (!mounted) return;
      const nextUser = payload.user;
      setUser(nextUser);

      if (!nextUser) {
        setIsPro(false);
        stopRealtimeSync();
        return;
      }

      await syncProfileState(nextUser);
    };

    const init = async () => {
      try {
        const authResult = await initializeAuth();

        if (!mounted) return;

        setStartupError(authResult.error ?? null);
        setUser(authResult.user);

        if (authResult.user) {
          await syncProfileState(authResult.user);
          void preloadStartupData();
        }
      } catch (error) {
        console.error("ERRO INIT:", error);
        setStartupError("Falha ao inicializar o auth. Atualize a página.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    startupTimeout = window.setTimeout(() => {
      if (!mounted) return;
      setLoading(false);
      setStartupError(
        current =>
          current ??
          "Tempo de inicialização excedido. Verifique sua conexão ou faça login novamente."
      );
    }, 12000);

    init();
    unsubscribeAuth = subscribeAuthChanges(authStateChange);

    return () => {
      mounted = false;
      unsubscribeAuth?.();
      if (startupTimeout) {
        window.clearTimeout(startupTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      stopRealtimeSync();
      return;
    }

    initRealtimeSync(user.id).catch(error => {
      console.error("ERRO NO REALTIME SYNC:", error);
    });
  }, [user?.id]);

  const path = typeof window !== "undefined" ? window.location.pathname : "";

  if (path === "/reset-password") {
    return <ResetPassword />;
  }

  if (loading) {
    return (
      <div style={{ color: "white", padding: 20 }}>
        Carregando... Caso a inicialização demore mais de alguns segundos,
        atualize a página.
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          {/* 🔑 AQUI É A MÁGICA */}
          {!user ? (
            <>
              {startupError ? (
                <div
                  style={{
                    background: "rgba(220, 38, 38, 0.1)",
                    border: "1px solid rgba(248, 113, 113, 0.25)",
                    color: "#f87171",
                    margin: "0 20px 16px",
                    padding: "14px 18px",
                    borderRadius: 16,
                  }}
                >
                  {startupError}
                </div>
              ) : null}
              <Login />
            </>
          ) : (
            <AppContent
              isPro={isPro}
              onOpenUpgrade={() => setShowUpgradeModal(true)}
            />
          )}
          <UpgradeModal
            open={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            onUpgrade={() => {
              const checkoutUrl = import.meta.env.VITE_CAKTO_CHECKOUT_URL;

              if (!checkoutUrl) {
                console.error("VITE_CAKTO_CHECKOUT_URL não configurada.");
                return;
              }

              window.open(
                `${checkoutUrl}?teste=123`,
                "_blank",
                "noopener,noreferrer"
              );
            }}
          />
          <FlowToastContainer />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
