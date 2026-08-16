// Sidebar vertical com ícones + labels, conteúdo principal com padding generoso

import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Calendar,
  Flame,
  Sun,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  Dumbbell,
  Heart,
  X,
  Apple,
  DollarSign,
  Download,
  AlertCircle,
  FileText,
  RotateCw,
} from "lucide-react";
import { FREE_TABS } from "@/config/planLimits";
import { useStore } from "@/hooks/useStore";
import { getLevelProgress } from "@/lib/store";
import { useIsMobile } from "@/hooks/useMobile";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { AnimatedCounter } from "./ui/AnimatedCounter";
import { CircularProgress } from "./ui/CircularProgress";
import { showToast } from "@/components/ui/FlowToast";

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
  | "download"
  | "settings"
  | "notes";

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: React.ReactNode;
  isPro: boolean;
  onOpenUpgrade: () => void;
}

const navItems = [
  { id: "today" as Tab, label: "Hoje", icon: Sun },
  { id: "habits" as Tab, label: "Hábitos", icon: Flame },
  { id: "tasks" as Tab, label: "Tarefas", icon: CheckSquare },
  { id: "goals" as Tab, label: "Metas", icon: Target },
  { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
  { id: "prayer" as Tab, label: "Oração", icon: Heart },
  { id: "academy" as Tab, label: "Academia", icon: Dumbbell },
  { id: "diet" as Tab, label: "Dieta", icon: Apple },
  { id: "financial" as Tab, label: "Financeiro", icon: DollarSign },
  { id: "notes" as Tab, label: "Notas", icon: FileText },
  { id: "calendar" as Tab, label: "Calendário", icon: Calendar },
  { id: "download" as Tab, label: "Baixar App", icon: Download },
  { id: "settings" as Tab, label: "Configurações", icon: Zap },
];

export function Layout({
  activeTab,
  onTabChange,
  children,
  isPro,
  onOpenUpgrade,
}: LayoutProps) {
  const data = useStore();
  const { isInstallable, isInstalled, handleInstall } = useInstallPrompt();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItemRefs = useRef<Record<Tab, HTMLButtonElement | null>>({} as Record<Tab, HTMLButtonElement | null>);

  const [navOrder, setNavOrder] = useState<Tab[]>(() => {
    const saved = localStorage.getItem("navOrder");
    const allIds = navItems.map(item => item.id);
    if (!saved) return allIds;

    const savedOrder = JSON.parse(saved) as Tab[];
    // Adicionar novos itens que não estão no localStorage
    const newItems = allIds.filter(id => !savedOrder.includes(id));
    return [...savedOrder, ...newItems];
  });
  const [draggedItem, setDraggedItem] = useState<Tab | null>(null);
  const levelProgress = getLevelProgress();

  const isMobile = useIsMobile();

  const orderedNavItems = navOrder
    .map(id => navItems.find(item => item.id === id))
    .filter(Boolean) as typeof navItems;

  // Close mobile drawer whenever activeTab changes (navigation)
  React.useEffect(() => {
    setMobileOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!mobileOpen) return;
    const activeButton = navItemRefs.current[activeTab];
    if (activeButton) {
      activeButton.scrollIntoView({ block: "nearest", inline: "start" });
    }
  }, [mobileOpen, activeTab]);

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg-primary)",
        position: "relative",
      }}
    >
      {/* Desktop Sidebar — lombada do caderno */}
      <aside
        className="fz-sidebar"
        style={{
          width: collapsed ? 72 : 240,
          minHeight: "100vh",
          background: "#15151c",
          borderRight: "1px solid #262630",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1)",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "0 2px",
            marginBottom: 0,
            overflow: "hidden",
          }}
        >
          <img
            src="/Logo-TaskBar.png"
            alt="FlowZone Logo"
            style={{ width: 128, height: 80, flexShrink: 0 }}
          />
        </div>

        {/* Collapsed XP indicator */}
        {collapsed && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <CircularProgress
              value={levelProgress.percent}
              size={44}
              strokeWidth={4}
            >
              <span
                style={{
                  fontFamily: "Space Grotesk",
                  fontWeight: 800,
                  fontSize: 11,
                  color: "#F59E0B",
                }}
              >
                {data.user.level}
              </span>
            </CircularProgress>
          </div>
        )}

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            overflowY: "auto",
            overflowX: "hidden",
            scrollBehavior: "smooth",
            paddingRight: "4px",
            marginRight: "-4px",
          }}
          className="fz-nav-scroll"
        >
          {orderedNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isLocked = !isPro && !FREE_TABS.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isLocked) {
                    onOpenUpgrade();
                    return;
                  }

                  onTabChange(item.id);
                }}
                draggable
                onDragStart={() => setDraggedItem(item.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (!draggedItem || draggedItem === item.id) return;
                  const draggedIdx = navOrder.indexOf(draggedItem);
                  const targetIdx = navOrder.indexOf(item.id);
                  const newOrder = [...navOrder];
                  newOrder.splice(draggedIdx, 1);
                  newOrder.splice(targetIdx, 0, draggedItem);
                  setNavOrder(newOrder);
                  localStorage.setItem("navOrder", JSON.stringify(newOrder));
                  setDraggedItem(null);
                }}
                onDragEnd={() => setDraggedItem(null)}
                className={`fz-sidebar-item ${isActive ? "active" : ""}`}
                style={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "10px" : "10px 12px",
                  opacity: draggedItem === item.id ? 0.5 : 1,
                  background: isActive ? "#1b1b24" : "transparent",
                  borderLeft: `2px solid ${isActive ? "#f59e0b" : "transparent"}`,
                  color: isActive ? "#fbbf24" : "#9a9aa8",
                  cursor: "grab",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = "#ededed";
                    e.currentTarget.style.background = "#1b1b24";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = "#9a9aa8";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} style={{ flexShrink: 0, color: "inherit" }} />
                {!collapsed && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span className="fz-sidebar-label" style={{ color: "inherit", fontSize: 13, fontWeight: isActive ? 700 : 500, letterSpacing: "0.02em" }}>{item.label}</span>

                    {item.id === "download" && isInstallable && !isInstalled && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const success = await handleInstall();
                            if (success) {
                              showToast("Aplicativo instalado com sucesso!", "success");
                            }
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              const success = await handleInstall();
                              if (success) {
                                showToast("Aplicativo instalado com sucesso!", "success");
                              }
                            }
                          }}
                          style={{
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 3,
                            background: "transparent",
                            border: "1px solid rgba(139, 92, 246, 0.55)",
                            color: "#a78bfa",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                            userSelect: "none",
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          Instalar
                        </div>

                        {isLocked && (
                          <span className="ledger-stamp ledger-stamp--violet" style={{ padding: "2px 7px" }}>
                            Pro
                          </span>
                        )}
                      </div>
                    )}

                    {item.id !== "download" && isLocked && (
                      <span className="ledger-stamp ledger-stamp--violet" style={{ padding: "2px 7px" }}>
                        Pro
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {!collapsed && isInstallable && !isInstalled && (
          <div style={{ margin: "16px 0 8px" }}>
            <button
              type="button"
              onClick={async () => {
                const success = await handleInstall();
                if (success) {
                  showToast("Aplicativo instalado com sucesso!", "success");
                }
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 14px",
                borderRadius: 5,
                border: "1px solid rgba(139, 92, 246, 0.55)",
                background: "transparent",
                color: "#a78bfa",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              <Download size={16} />
              Instalar
            </button>
          </div>
        )}

        {/* Streak — carimbo na lombada */}
        {!collapsed && data.user.streak > 0 && (
          <div
            style={{
              background: "#1b1b24",
              border: "1px solid #262630",
              borderLeft: "2px solid #ef4444",
              borderRadius: 0,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: "auto",
              marginBottom: 12,
            }}
          >
            <div>
              <div className="ledger-marginalia" style={{ marginBottom: 3 }}>
                Sequência ativa
              </div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#f87171",
                  fontFamily: "Space Grotesk",
                  letterSpacing: "-0.02em",
                }}
              >
                {data.user.streak} dias
              </div>
            </div>
          </div>
        )}

        {/* Download Button */}
        {isInstallable && !isInstalled && (
          <button
            onClick={async () => {
              const success = await handleInstall();
              if (success) {
                showToast("Aplicativo instalado com sucesso!", "success");
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: collapsed ? "10px" : "10px 12px",
              borderRadius: 5,
                background: "transparent",
                border: "1.5px solid rgba(139, 92, 246, 0.55)",
                color: "#a78bfa",
              cursor: "pointer",
              transition: "all 0.3s ease",
              marginTop: !collapsed && data.user.streak > 0 ? 0 : "auto",
              marginBottom: 12,
              gap: collapsed ? 0 : 8,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
                e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.45)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(139, 92, 246, 0.12)";
                e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
              }}
            title={collapsed ? "Instalar App" : undefined}
          >
            {!collapsed ? (
              <>
                <Download size={16} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Instalar</span>
              </>
            ) : (
              <Download size={16} />
            )}
          </button>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            padding: "10px 12px",
            borderRadius: 4,
            background: "transparent",
            border: "1px solid #33333f",
            color: "#6b6b78",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "#1b1b24";
            e.currentTarget.style.borderColor = "#46465a";
            e.currentTarget.style.color = "#fbbf24";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "#33333f";
            e.currentTarget.style.color = "#6b6b78";
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      {/* Main Content — página de caderno: pauta, textura e canto virado */}
      <main
        className="fz-main-content notebook-page"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: isMobile ? "16px 12px" : "28px 36px",
          overflowX: "hidden",
          background: "#1c1c24",
          position: "relative",
        }}
      >
        {/* canto de página virada */}
        <span className="page-curl" aria-hidden="true" />
        {children}
      </main>

      {/* Mobile Hamburger Button */}
      <div
        style={{
          display: "none",
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 100,
        }}
        className="mobile-menu-toggle"
      >
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            borderRadius: 10,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(245,158,11,0.12)";
            e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)";
            e.currentTarget.style.color = "#F59E0B";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "var(--bg-secondary)";
            e.currentTarget.style.borderColor = "var(--border-subtle)";
            e.currentTarget.style.color = "rgba(255,255,255,0.7)";
          }}
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              display: mobileOpen ? "block" : "none",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 90,
              animation: "fadeIn 0.2s ease",
            }}
            className="mobile-overlay"
          />

          {/* Drawer */}
          <nav
            style={{
              display: mobileOpen ? "flex" : "none",
              position: "fixed",
              top: 0,
              left: 0,
              width: "85%",
              maxWidth: 320,
              height: "100vh",
              background: "#15151c",
              borderRight: "1px solid #262630",
              boxShadow: "4px 0 0 rgba(0,0,0,0.25)",
              zIndex: 95,
              flexDirection: "column",
              padding: "20px 16px",
              gap: 4,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            className="mobile-drawer"
          >
            <div className="flex items-center justify-between mb-6">
              <img src="/Logo-TaskBar.png" style={{ height: 40 }} alt="Logo" />
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav Items */}
            <div className="flex flex-col gap-1">
              {orderedNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isLocked = !isPro && !FREE_TABS.includes(item.id);
                return (
                  <button
                    ref={el => {
                      navItemRefs.current[item.id] = el;
                    }}
                    key={item.id}
                    onClick={() => {
                      if (isLocked) {
                        onOpenUpgrade();
                        return;
                      }

                      onTabChange(item.id);
                      setMobileOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "14px 16px",
                      borderRadius: 4,
                      background: isActive
                        ? "#1b1b24"
                        : "transparent",
                      borderLeft: isActive ? "2px solid #f59e0b" : "2px solid transparent",
                      color: isActive ? "#fbbf24" : "rgba(255,255,255,0.65)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      fontFamily: "DM Sans",
                      fontSize: 15,
                      fontWeight: isActive ? 700 : 400,
                      textAlign: "left",
                    }}
                  >
                    <Icon size={20} style={{ flexShrink: 0, color: isActive ? "#fbbf24" : "#6b6b78" }} />
                    <div className="flex-1 flex items-center justify-between">
                      <span>{item.label}</span>

                      {isLocked && (
                        <span className="ledger-stamp ledger-stamp--violet">Pro</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 768px) {
          aside.fz-sidebar { display: none !important; }
          .mobile-menu-toggle { display: flex !important; }
          .mobile-overlay { display: block !important; }
          .mobile-drawer { display: flex !important; }
          main.fz-main-content { padding: 16px 14px 16px 14px !important; }
        }
        @media (max-width: 480px) {
          main.fz-main-content { padding: 14px 12px 14px 12px !important; }
        }
      `}</style>
    </div>
  );
}
