import React, { useState, useMemo, useEffect } from "react";
import {
  addTransaction,
  deleteTransaction,
  getData,
  subscribe,
} from "@/lib/store";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  BarChart3,
  PieChart as PieChartIcon,
  Trash2,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { showToast } from "@/components/ui/FlowToast";
import { parseLocalDate, getLocalDateTimestamp } from "@/lib/date";
import { getTodayString } from "@/store/utils";

// ─── constants ───────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  Alimentação: "🍔",
  Transporte: "🚗",
  Moradia: "🏠",
  "Lazer & Estilo de Vida": "🎮",
  "Saúde & Bem-Estar": "💪",
  "Compras & Pessoal": "🛍️",
  Educação: "📚",
  "Outros / Imprevistos": "🎲",
  Salário: "💰",
  Freelance: "💻",
  Investimentos: "📈",
};

const PREDEFINED_CATEGORIES = [
  { name: "Alimentação", icon: "🍔" },
  { name: "Transporte", icon: "🚗" },
  { name: "Moradia", icon: "🏠" },
  { name: "Lazer & Estilo de Vida", icon: "🎮" },
  { name: "Saúde & Bem-Estar", icon: "💪" },
  { name: "Compras & Pessoal", icon: "🛍️" },
  { name: "Educação", icon: "📚" },
  { name: "Outros / Imprevistos", icon: "🎲" },
];

const INCOME_CATEGORIES = [
  { name: "Salário", icon: "💰" },
  { name: "Freelance", icon: "💻" },
  { name: "Investimentos", icon: "📈" },
  { name: "Outros", icon: "🎲" },
];

const CHART_COLORS = [
  "#A855F7",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EF4444",
  "#6366F1",
];

// ─── shared style helpers ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--muted-foreground)",
  display: "block",
  marginBottom: "7px",
};

const cardBase: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  padding: "20px",
};

// ─── component ────────────────────────────────────────────────────────────────

export default function Financial() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState(
    getData().financial.transactions
  );
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"bars" | "pie">("bars");
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "Alimentação",
    date: getTodayString(),
  });

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    return subscribe(() => {
      setTransactions([...getData().financial.transactions]);
    });
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth < 900;

  // ─── date ranges ────────────────────────────────────────────────────────────

  const monthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const monthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  const previousMonthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1,
    1
  );
  const previousMonthEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    0
  );

  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(weekStart.getDate() - 7);
  const previousWeekEnd = new Date(previousWeekStart);
  previousWeekEnd.setDate(previousWeekStart.getDate() + 6);

  // ─── filtered sets ──────────────────────────────────────────────────────────

  const monthTransactions = transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return d >= monthStart && d <= monthEnd;
  });

  const previousMonthTransactions = transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return d >= previousMonthStart && d <= previousMonthEnd;
  });

  const weekTransactions = transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return d >= weekStart && d <= weekEnd;
  });

  const previousWeekTransactions = transactions.filter(t => {
    const d = parseLocalDate(t.date);
    return d >= previousWeekStart && d <= previousWeekEnd;
  });

  // ─── summaries ──────────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const income = monthTransactions
      .filter(t => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = monthTransactions
      .filter(t => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [monthTransactions]);

  const previousMonthSummary = useMemo(() => {
    const income = previousMonthTransactions
      .filter(t => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = previousMonthTransactions
      .filter(t => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [previousMonthTransactions]);

  const weekSummary = useMemo(() => {
    const income = weekTransactions
      .filter(t => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = weekTransactions
      .filter(t => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [weekTransactions]);

  const previousWeekSummary = useMemo(() => {
    const income = previousWeekTransactions
      .filter(t => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = previousWeekTransactions
      .filter(t => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [previousWeekTransactions]);

  // ─── chart data ─────────────────────────────────────────────────────────────

  const expensesByDay = useMemo(() => {
    const result: Record<number, number> = {};
    monthTransactions.forEach(t => {
      if (t.type === "expense") {
        const day = parseLocalDate(t.date).getDate();
        result[day] = (result[day] || 0) + t.amount;
      }
    });
    return result;
  }, [monthTransactions]);

  const expensesByCategory = useMemo(() => {
    const result: Record<string, number> = {};
    PREDEFINED_CATEGORIES.forEach(cat => {
      result[cat.name] = 0;
    });
    monthTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        if (t.category)
          result[t.category] = (result[t.category] || 0) + t.amount;
      });
    return result;
  }, [monthTransactions]);

  const maxExpense = useMemo(
    () => Math.max(...Object.values(expensesByCategory), 1),
    [expensesByCategory]
  );

  const chartData = Object.entries(expensesByCategory)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, amount: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.amount - a.amount);

  const totalExpenses = chartData.reduce((s, d) => s + d.amount, 0);

  // ─── recent transactions ────────────────────────────────────────────────────

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => getLocalDateTimestamp(b.date) - getLocalDateTimestamp(a.date))
      .slice(0, 5);
  }, [transactions]);

  // ─── helpers ────────────────────────────────────────────────────────────────

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v);

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const monthExpenseChange = calculatePercentageChange(
    summary.expenses,
    previousMonthSummary.expenses
  );
  const weekExpenseChange = calculatePercentageChange(
    weekSummary.expenses,
    previousWeekSummary.expenses
  );

  // ─── add transaction ────────────────────────────────────────────────────────

  const handleAddTransaction = async () => {
    if (!formData.name || !formData.amount) return;
    await addTransaction({
      title: formData.name,
      amount: parseFloat(formData.amount),
      type: formData.type,
      category: formData.category,
      date: formData.date,
    });
    setFormData({
      name: "",
      amount: "",
      type: "expense",
      category: "Alimentação",
      date: getTodayString(),
    });
    setShowAddTransaction(false);
    showToast("Transação registrada com sucesso", "success", "✅");
  };

  // ─── delete transaction ─────────────────────────────────────────────────────

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransaction(id);
    setConfirmDeleteId(null);
    showToast("Transação removida", "success", "🗑️");
  };

  const getDaysInMonth = () => {
    const days: (number | null)[] = [];
    const firstDay = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    ).getDay();
    const daysInMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    ).getDate();
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const days = getDaysInMonth();
  const today = new Date();
  const monthName = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const activeCategories =
    formData.type === "income" ? INCOME_CATEGORIES : PREDEFINED_CATEGORIES;

  // ─── style helpers ──────────────────────────────────────────────────────────

  const badgeStyle = (change: number): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "13px",
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    padding: "4px 10px",
    borderRadius: "6px",
    marginBottom: "8px",
    background:
      change < 0
        ? "rgba(34,197,94,0.12)"
        : change > 0
          ? "rgba(239,68,68,0.12)"
          : "rgba(120,120,140,0.15)",
    color:
      change < 0
        ? "#22C55E"
        : change > 0
          ? "#EF4444"
          : "var(--muted-foreground)",
  });

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    fontSize: "11px",
    fontWeight: 600,
    padding: "5px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontFamily: "'Sora', sans-serif",
    transition: "all 0.15s",
    background: active ? "#A855F7" : "transparent",
    color: active ? "#fff" : "var(--muted-foreground)",
  });

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        padding: isMobile ? "16px 14px 48px" : "24px 20px 48px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        fontFamily: "'Sora', sans-serif",
      }}
    >
      {/* ── Summary strip ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          background: "var(--border)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          overflow: "hidden",
          gap: "1px",
        }}
      >
        {[
          { label: "Entradas", value: summary.income, color: "#22C55E" },
          { label: "Gastos", value: summary.expenses, color: "#EF4444" },
          {
            label: "Saldo",
            value: summary.balance,
            color: summary.balance >= 0 ? "#A855F7" : "#EF4444",
          },
        ].map(({ label, value, color }, i) => (
          <div
            key={label}
            style={{
              background: "var(--card)",
              padding: isMobile ? "16px 10px 14px" : "22px 20px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              borderLeft: i > 0 ? "1px solid var(--border)" : undefined,
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 500,
                color: "var(--muted-foreground)",
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: isMobile ? "14px" : "20px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                lineHeight: 1,
                color,
              }}
            >
              {formatCurrency(value)}
            </span>
          </div>
        ))}
      </div>

      {/* ── Comparisons ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: "12px",
        }}
      >
        {[
          {
            label: "vs. Mês anterior",
            change: monthExpenseChange,
            prev: previousMonthSummary.expenses,
          },
          {
            label: "vs. Semana anterior",
            change: weekExpenseChange,
            prev: previousWeekSummary.expenses,
          },
        ].map(({ label, change, prev }) => (
          <div key={label} style={{ ...cardBase, padding: "16px" }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--muted-foreground)",
                marginBottom: "10px",
              }}
            >
              {label}
            </div>
            <div style={badgeStyle(change)}>
              {change < 0 ? "↓" : change > 0 ? "↑" : "—"}{" "}
              {change !== 0
                ? `${Math.abs(change).toFixed(1)}% ${change < 0 ? "menor" : "maior"}`
                : "Sem mudanças"}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--muted-foreground)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              anterior: {formatCurrency(prev)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main layout: calendar first on mobile/tablet ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isTablet ? "1fr" : "1fr 260px",
          gap: "14px",
        }}
      >
        {/* Calendar — order 1 on mobile (shown above chart) */}
        <div
          style={{
            ...cardBase,
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            order: isTablet ? 1 : 2,
            maxWidth: isTablet ? "100%" : "260px",
            width: "100%",
          }}
        >
          {/* Cal header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 1
                  )
                )
              }
              style={{
                background: "none",
                border: "none",
                color: "#A855F7",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--foreground)",
                textTransform: "capitalize",
              }}
            >
              {monthName}
            </span>
            <button
              onClick={() =>
                setCurrentDate(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1
                  )
                )
              }
              style={{
                background: "none",
                border: "none",
                color: "#A855F7",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday labels */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px",
              marginBottom: "6px",
            }}
          >
            {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
              <div
                key={i}
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  textAlign: "center",
                  color: "var(--muted-foreground)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "2px",
            }}
          >
            {days.map((day, index) => {
              const isToday =
                day === today.getDate() &&
                currentDate.getMonth() === today.getMonth() &&
                currentDate.getFullYear() === today.getFullYear();
              const hasExpense = day !== null && !!expensesByDay[day];

              return (
                <div
                  key={index}
                  style={{
                    height: "30px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: isToday ? 700 : 500,
                    borderRadius: "6px",
                    cursor: day ? "pointer" : "default",
                    position: "relative",
                    background: isToday ? "#A855F7" : "transparent",
                    color: isToday
                      ? "#fff"
                      : day
                        ? "var(--foreground)"
                        : "transparent",
                  }}
                >
                  {day}
                  {hasExpense && !isToday && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "3px",
                        height: "3px",
                        background: "#A855F7",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Register button */}
          <div
            style={{
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <button
              onClick={() => setShowAddTransaction(true)}
              style={{
                width: "100%",
                background: "#A855F7",
                border: "none",
                borderRadius: "8px",
                padding: "11px",
                color: "#fff",
                fontFamily: "'Sora', sans-serif",
                fontWeight: 600,
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                letterSpacing: "0.02em",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              }}
            >
              <Plus size={13} /> Registrar transação
            </button>
          </div>
        </div>

        {/* Chart — order 2 on mobile (shown below calendar) */}
        {chartData.length > 0 && (
          <div
            style={{
              ...cardBase,
              order: isTablet ? 2 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--foreground)",
                }}
              >
                Distribuição por categoria
              </span>
              <div
                style={{
                  display: "flex",
                  background: "var(--background)",
                  borderRadius: "8px",
                  padding: "3px",
                  gap: "3px",
                  border: "1px solid var(--border)",
                }}
              >
                <button
                  style={toggleBtnStyle(chartType === "bars")}
                  onClick={() => setChartType("bars")}
                >
                  <BarChart3
                    size={12}
                    style={{
                      display: "inline",
                      marginRight: 4,
                      verticalAlign: "middle",
                    }}
                  />
                  Barras
                </button>
                <button
                  style={toggleBtnStyle(chartType === "pie")}
                  onClick={() => setChartType("pie")}
                >
                  <PieChartIcon
                    size={12}
                    style={{
                      display: "inline",
                      marginRight: 4,
                      verticalAlign: "middle",
                    }}
                  />
                  Pizza
                </button>
              </div>
            </div>

            {/* Bars */}
            {chartType === "bars" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {chartData.map((item, index) => {
                  const pct = (item.amount / maxExpense) * 100;
                  const color = CHART_COLORS[index % CHART_COLORS.length];
                  return (
                    <div
                      key={item.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "18px",
                          width: "26px",
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {CATEGORY_ICONS[item.name] || "📊"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--muted-foreground)",
                            marginBottom: "5px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            height: "4px",
                            background: "var(--border)",
                            borderRadius: "2px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: color,
                              borderRadius: "2px",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "11px",
                          fontWeight: 600,
                          color,
                          minWidth: "72px",
                          textAlign: "right",
                          flexShrink: 0,
                        }}
                      >
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pie — donut + legenda abaixo */}
            {chartType === "pie" && (
              <div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      dataKey="amount"
                      paddingAngle={2}
                    >
                      {chartData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [
                        formatCurrency(value),
                        "Gasto",
                      ]}
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legenda do pie */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: "8px",
                    marginTop: "12px",
                    paddingTop: "14px",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {chartData.map((item, index) => {
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    const pct =
                      totalExpenses > 0
                        ? (item.amount / totalExpenses) * 100
                        : 0;
                    return (
                      <div
                        key={item.name}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "2px",
                            background: color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--muted-foreground)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {CATEGORY_ICONS[item.name] ?? ""} {item.name}
                        </span>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "11px",
                            fontWeight: 600,
                            color,
                            flexShrink: 0,
                          }}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Recent transactions ── */}
      {recentTransactions.length > 0 && (
        <div style={cardBase}>
          <div
            style={{
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--muted-foreground)",
              marginBottom: "14px",
            }}
          >
            Lançamentos recentes
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {recentTransactions.map((txn, i) => {
              const txnId = txn.id ?? String(i);
              const isPendingDelete = confirmDeleteId === txnId;
              return (
                <div
                  key={txnId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 0",
                    borderBottom:
                      i < recentTransactions.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "var(--background)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {CATEGORY_ICONS[txn.category ?? ""] ??
                      (txn.type === "income" ? "💰" : "📊")}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--foreground)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {txn.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {txn.category}
                    </div>
                  </div>

                  {/* Amount */}
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: isMobile ? "12px" : "13px",
                      fontWeight: 600,
                      color: txn.type === "income" ? "#22C55E" : "#EF4444",
                      flexShrink: 0,
                    }}
                  >
                    {txn.type === "income" ? "+" : "−"}
                    {formatCurrency(txn.amount)}
                  </span>

                  {/* Date */}
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "10px",
                      color: "var(--muted-foreground)",
                      minWidth: "36px",
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    {parseLocalDate(txn.date).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>

                  {/* Delete area */}
                  {isPendingDelete ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => handleDeleteTransaction(txnId)}
                        style={{
                          background: "rgba(239,68,68,0.12)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: "6px",
                          padding: "4px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          fontFamily: "'Sora', sans-serif",
                          color: "#EF4444",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--muted-foreground)",
                          cursor: "pointer",
                          fontSize: "18px",
                          lineHeight: 1,
                          padding: "2px 4px",
                          fontFamily: "'Sora', sans-serif",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(txnId)}
                      title="Remover transação"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--muted-foreground)",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 0,
                        borderRadius: "6px",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "#EF4444";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.color =
                          "var(--muted-foreground)";
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {showAddTransaction && (
        <div
          onClick={e => {
            if (e.target === e.currentTarget) setShowAddTransaction(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: isMobile ? "20px" : "28px",
              maxWidth: "380px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "22px",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--foreground)",
                }}
              >
                Registrar transação
              </span>
              <button
                onClick={() => setShowAddTransaction(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  fontSize: "22px",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Type toggle */}
              <div>
                <label style={labelStyle}>Tipo</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        type: "expense",
                        category: "Alimentação",
                      })
                    }
                    style={{
                      padding: "9px",
                      borderRadius: "8px",
                      border: `1px solid ${formData.type === "expense" ? "#EF4444" : "var(--border)"}`,
                      background:
                        formData.type === "expense"
                          ? "rgba(239,68,68,0.1)"
                          : "var(--background)",
                      fontSize: "12px",
                      fontWeight: 600,
                      fontFamily: "'Sora', sans-serif",
                      cursor: "pointer",
                      color:
                        formData.type === "expense"
                          ? "#EF4444"
                          : "var(--muted-foreground)",
                      transition: "all 0.15s",
                    }}
                  >
                    Gasto
                  </button>
                  <button
                    onClick={() =>
                      setFormData({
                        ...formData,
                        type: "income",
                        category: "Salário",
                      })
                    }
                    style={{
                      padding: "9px",
                      borderRadius: "8px",
                      border: `1px solid ${formData.type === "income" ? "#22C55E" : "var(--border)"}`,
                      background:
                        formData.type === "income"
                          ? "rgba(34,197,94,0.1)"
                          : "var(--background)",
                      fontSize: "12px",
                      fontWeight: 600,
                      fontFamily: "'Sora', sans-serif",
                      cursor: "pointer",
                      color:
                        formData.type === "income"
                          ? "#22C55E"
                          : "var(--muted-foreground)",
                      transition: "all 0.15s",
                    }}
                  >
                    Ganho
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Almoço no restaurante"
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="fz-input"
                />
              </div>

              {/* Amount */}
              <div>
                <label style={labelStyle}>Valor</label>
                <input
                  type="number"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={e =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="fz-input"
                />
              </div>

              {/* Category — dynamic */}
              <div>
                <label style={labelStyle}>Categoria</label>
                <select
                  value={formData.category}
                  onChange={e =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="fz-input"
                >
                  {activeCategories.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label style={labelStyle}>Data</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="fz-input"
                />
              </div>

              <button
                onClick={handleAddTransaction}
                className="fz-btn-primary"
                style={{ padding: "12px", fontSize: 13, marginTop: 4 }}
              >
                Registrar transação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
