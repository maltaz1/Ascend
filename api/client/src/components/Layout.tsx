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
  | "settings"
  | "download";

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
      {/* Desktop Sidebar */}
      <aside
        className="fz-sidebar"
        style={{
          width: collapsed ? 72 : 240,
          minHeight: "100vh",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-subtle)",
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
                  background:
                    draggedItem && draggedItem !== item.id
                      ? "rgba(245, 158, 11, 0.1)"
                      : undefined,
                  cursor: "grab",
                  transition: "all 0.2s ease",
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span className="fz-sidebar-label">{item.label}</span>

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
                              showToast("Aplicativo instalado com sucesso! 🎉", "success");
                            }
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              const success = await handleInstall();
                              if (success) {
                                showToast("Aplicativo instalado com sucesso! 🎉", "success");
                              }
                            }
                          }}
                          style={{
                            fontSize: 11,
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: "rgba(168, 85, 247, 0.15)",
                            border: "1px solid rgba(168, 85, 247, 0.4)",
                            color: "#A855F7",
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
                          <span
                            style={{
                              fontSize: 10,
                              background: "#7C3AED",
                              color: "white",
                              padding: "2px 6px",
                              borderRadius: 999,
                              fontWeight: 700,
                            }}
                          >
                            PRO
                          </span>
                        )}
                      </div>
                    )}

                    {item.id !== "download" && isLocked && (
                      <span
                        style={{
                          fontSize: 10,
                          background: "#7C3AED",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: 999,
                          fontWeight: 700,
                        }}
                      >
                        PRO
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
                  showToast("Aplicativo instalado com sucesso! 🎉", "success");
                }
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(168, 85, 247, 0.35)",
                background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.15))",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <Download size={16} />
              Instalar App
            </button>
          </div>
        )}

        {/* Streak */}
        {!collapsed && data.user.streak > 0 && (
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 12,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: "auto",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 20 }}>🔥</span>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "DM Sans",
                }}
              >
                Sequência ativa
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#EF4444",
                  fontFamily: "Space Grotesk",
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
                showToast("Aplicativo instalado com sucesso! 🎉", "success");
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: collapsed ? "10px" : "10px 12px",
              borderRadius: 10,
              background: "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2))",
              border: "1.5px solid rgba(168, 85, 247, 0.4)",
              color: "#A855F7",
              cursor: "pointer",
              transition: "all 0.3s ease",
              marginTop: !collapsed && data.user.streak > 0 ? 0 : "auto",
              marginBottom: 12,
              gap: collapsed ? 0 : 8,
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(59, 130, 246, 0.3))";
              e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.6)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2))";
              e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.4)";
              e.currentTarget.style.transform = "scale(1)";
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
            borderRadius: 10,
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(245,158,11,0.08)";
            e.currentTarget.style.borderColor = "rgba(245,158,11,0.2)";
            e.currentTarget.style.color = "#F59E0B";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--border-subtle)";
            e.currentTarget.style.color = "rgba(255,255,255,0.5)";
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      {/* Main Content */}
      <main
        className="fz-main-content"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-primary)",
          padding: isMobile ? "16px 12px" : "32px 40px",
          overflowX: "hidden",
        }}
      >
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
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(6px)",
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
              background: "var(--bg-secondary)/80",
              borderRight: "1px solid var(--border-subtle)",
              zIndex: 95,
              flexDirection: "column",
              padding: "16px 12px",
              gap: 2,
              overflowY: "auto",
              animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            className="mobile-drawer"
          >
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                alignSelf: "flex-end",
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.7)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <X size={20} />
            </button>

            {/* Nav Items */}
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
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: isActive
                      ? "rgba(245,158,11,0.12)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(245,158,11,0.2)"
                      : "1px solid transparent",
                    color: isActive ? "#F59E0B" : "rgba(255,255,255,0.7)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontFamily: "DM Sans",
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: "left",
                  }}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>{item.label}</span>

                    {isLocked && (
                      <span
                        style={{
                          fontSize: 10,
                          background: "#7C3AED",
                          color: "white",
                          padding: "2px 6px",
                          borderRadius: 999,
                          fontWeight: 700,
                        }}
                      >
                        PRO
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
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
