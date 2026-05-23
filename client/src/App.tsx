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

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const renderPage = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "today":
        return <Today />;
      case "tasks":
        return <Tasks />;
      case "goals":
        return <Goals />;
      case "habits":
        return <Habits />;
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
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();

          if (profile) {
            _data.user.xp = profile.xp || 0;
            _data.user.level = profile.level || 1;
            _data.user.streak = profile.streak || 0;
            _data.user.name = profile.name || "Usuário";
          }

          if (!profile) {
            await supabase.from("profiles").insert({
              id: data.user.id,
              name: data.user.email?.split("@")[0],
              level: 1,
              xp: 0,
              streak: 0,
            });
          }

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
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

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
          {!user ? <Login /> : <AppContent />}

          <FlowToastContainer />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
