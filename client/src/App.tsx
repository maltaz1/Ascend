import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
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
  loadHabitsData,
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
import Notes from "./pages/Notes";
import ResetPassword from "./pages/ResetPassword";
import DownloadApp from "./pages/DownloadApp.tsx";

// Login
import Login from "./pages/Login";

// Páginas públicas (LGPD)
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

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
  | "download"
  | "notes";

// Mapeamento de URL -> Tab
const TAB_ROUTES: Record<string, Tab> = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/today": "today",
  "/tasks": "tasks",
  "/goals": "goals",
  "/habits": "habits",
  "/prayer": "prayer",
  "/diet": "diet",
  "/financial": "financial",
  "/calendar": "calendar",
  "/academy": "academy",
  "/evolution": "evolution",
  "/settings": "settings",
  "/download": "download",
  "/notes": "notes",
};

// Mapeamento de Tab -> URL
const ROUTE_TABS: Record<Tab, string> = {
  dashboard: "/dashboard",
  today: "/today",
  tasks: "/tasks",
  goals: "/goals",
  habits: "/habits",
  prayer: "/prayer",
  diet: "/diet",
  financial: "/financial",
  calendar: "/calendar",
  academy: "/academy",
  evolution: "/evolution",
  settings: "/settings",
  download: "/download",
  notes: "/notes",
};

function getTabFromPathname(pathname: string): Tab {
  const tab = TAB_ROUTES[pathname];
  if (tab) return tab;
  // Sub-pastas como /academy/evolution
  if (pathname.startsWith("/academy")) return "academy";
  return "dashboard";
}

function AppContent({
  isPro,
  onOpenUpgrade,
}: {
  isPro: boolean;
  onOpenUpgrade: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>(() =>
    getTabFromPathname(location.pathname)
  );

  // Sincronizar activeTab quando a URL muda (ex: back/forward do browser)
  useEffect(() => {
    const newTab = getTabFromPathname(location.pathname);
    setActiveTab(newTab);
  }, [location.pathname]);

  // Função que atualiza a URL quando a tab muda
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    navigate(ROUTE_TABS[tab]);
  };

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "today":
        return <Today />;
      case "tasks":
        return <Tasks isPro={isPro} onOpenUpgrade={onOpenUpgrade} />;
      case "goals":
        return <Goals isPro={isPro} onOpenUpgrade={onOpenUpgrade} />;
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
        return <Academy onTabChange={(subTab) => handleTabChange(subTab as Tab)} />;
      case "evolution":
        return <Evolution onTabChange={(subTab) => handleTabChange(subTab as Tab)} />;
      case "settings":
        return <Settings />;
      case "notes":
        return <Notes isPro={isPro} onOpenUpgrade={onOpenUpgrade} />;
      case "download":
        return <DownloadApp />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={handleTabChange}
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

  const location = useLocation();
  const navigate = useNavigate();

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
      .maybeSingle();

    if (error) {
      console.error("ERRO AO SINCRONIZAR PERFIL:", error);
      return;
    }

    if (!profile) {
      console.log("Criando perfil automático para:", currentUser.id);
      const { error: insertError } = await supabase.from("profiles").insert({
        id: currentUser.id,
        name: currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "Usuário",
        level: 1,
        xp: 0,
        streak: 0,
        is_pro: false,
      });

      if (insertError) {
        console.error("Erro ao criar perfil:", insertError);
        return;
      }
      
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
    console.log("[preloadStartupData] Iniciando carregamento de todos os loaders...");
    const t0 = performance.now();

    const loaders = [
      { name: "gym", fn: loadGymData },
      { name: "diet", fn: loadDietData },
      { name: "financial", fn: loadFinancialData },
      { name: "tasks", fn: loadTasksData },
      { name: "goals", fn: loadGoalsData },
      { name: "habits", fn: loadHabitsData },
    ];

    const results = await Promise.allSettled(
      loaders.map(async ({ name, fn }) => {
        const start = performance.now();
        console.log(`[preloadStartupData] Loader "${name}" iniciado...`);
        try {
          await timeoutPromise(fn(), 7000);
          const elapsed = performance.now() - start;
          console.log(`[preloadStartupData] Loader "${name}" concluído em ${elapsed.toFixed(0)}ms`);
        } catch (error) {
          const elapsed = performance.now() - start;
          console.warn(`[preloadStartupData] Loader "${name}" falhou após ${elapsed.toFixed(0)}ms`, error);
        }
      })
    );

    const total = performance.now() - t0;
    console.log(`[preloadStartupData] Todos os loaders finalizados em ${total.toFixed(0)}ms total`);
    results.forEach((r, i) => {
      console.log(`[preloadStartupData]   ${loaders[i].name}: ${r.status}`);
    });
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

        setUser(authResult.user);

        if (authResult.user) {
          // Redirecionar para dashboard se estiver na home
          if (location.pathname === "/") {
            navigate("/dashboard");
          }
          // Executa em paralelo para melhorar o tempo de startup
          await Promise.all([
            syncProfileState(authResult.user),
            preloadStartupData()
          ]);
        }
      } catch (error) {
        console.error("ERRO INIT:", error);
        setStartupError("Ocorreu um problema ao carregar sua conta. Tente recarregar a página.");
      } finally {
        if (startupTimeout) window.clearTimeout(startupTimeout);
        if (mounted) setLoading(false);
      }
    };

    startupTimeout = window.setTimeout(() => {
      console.warn("🚨 STARTUP TIMEOUT DISPAROU");

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
    if (location.pathname === "/reset-password" || location.pathname === "/privacy" || location.pathname === "/terms") return;
    if (!user?.id) {
      stopRealtimeSync();
      return;
    }
    initRealtimeSync(user.id).catch(error => {
      console.error("ERRO NO REALTIME SYNC:", error);
    });
  }, [user?.id]);

  // Página de reset de senha é independente
  if (location.pathname === "/reset-password") {
    return <ResetPassword />;
  }

  // Páginas de conformidade LGPD (públicas, não requerem login)
  if (location.pathname === "/privacy") {
    return <Privacy />;
  }
  if (location.pathname === "/terms") {
    return <Terms />;
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
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
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

              const url = new URL(checkoutUrl);
              if (user?.email) {
                url.searchParams.set("email", user.email);
              }
              
              window.open(
                url.toString(),
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
