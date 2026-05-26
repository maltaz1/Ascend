import { useEffect, useState } from "react";
import { loadGymData } from "./lib/gym";
import { supabase } from "./lib/supabase";

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
  _data,
} from "./lib/store";

import UpgradeModal from "./components/upgradeModal.tsx";

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
  | "settings";

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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const syncProfileState = async (currentUser: any = user) => {
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

  useEffect(() => {
    async function init() {
      try {
        const { data } = await supabase.auth.getUser();

        setUser(data.user);

        if (data.user) {
          await Promise.all([
            loadGymData(),
            loadDietData(),
            loadFinancialData(),
            loadTasksData(),
            loadGoalsData(),
          ]);

          await syncProfileState(data.user);
          await initRealtimeSync();
        }
      } catch (error) {
        console.error("ERRO INIT:", error);
      } finally {
        setLoading(false);
      }
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);

        if (nextUser) {
          await syncProfileState(nextUser);
        } else {
          setIsPro(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const channel = supabase
      .channel(`profiles-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        async () => {
          await syncProfileState(user);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const path = window.location.pathname;

  if (path === "/reset-password") {
    return <ResetPassword />;
  }

  if (loading) {
    return <div style={{ color: "white", padding: 20 }}>Carregando...</div>;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          {/* 🔑 AQUI É A MÁGICA */}
          {!user ? (
            <Login />
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

              window.open(checkoutUrl, "_blank", "noopener,noreferrer");
            }}
          />
          <FlowToastContainer />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
