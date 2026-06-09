import React, { useState, useMemo } from "react";
import { addTransaction, getData, subscribe } from "@/lib/store";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { showToast } from "@/components/ui/FlowToast";

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

export default function Financial() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState(
    getData().financial.transactions
  );
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [chartType, setChartType] = useState<"bars" | "pie">("bars");
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "Alimentação",
    date: new Date().toISOString().split("T")[0],
  });

  React.useEffect(() => {
    return subscribe(() => {
      setTransactions([...getData().financial.transactions]);
    });
  }, []);

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

  const monthTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= monthStart && tDate <= monthEnd;
  });

  const previousMonthTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= previousMonthStart && tDate <= previousMonthEnd;
  });

  const weekTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= weekStart && tDate <= weekEnd;
  });

  const previousWeekTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate >= previousWeekStart && tDate <= previousWeekEnd;
  });

  const summary = useMemo(() => {
    const income = monthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [monthTransactions]);

  const previousMonthSummary = useMemo(() => {
    const income = previousMonthTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = previousMonthTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [previousMonthTransactions]);

  const weekSummary = useMemo(() => {
    const income = weekTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = weekTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [weekTransactions]);

  const previousWeekSummary = useMemo(() => {
    const income = previousWeekTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = previousWeekTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [previousWeekTransactions]);

  const expensesByDay = useMemo(() => {
    const result: Record<number, number> = {};
    monthTransactions.forEach(t => {
      if (t.type === "expense") {
        const day = new Date(t.date).getDate();
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
          if (t.category) {
            result[t.category] = (result[t.category] || 0) + t.amount;
          }
        });
    return result;
  }, [monthTransactions]);

  const maxExpense = useMemo(() => {
    return Math.max(...Object.values(expensesByCategory), 1);
  }, [expensesByCategory]);

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
    name: '',
    amount: '',
    type: 'expense',
    category: 'Alimentação',
    date: new Date().toISOString().split('T')[0],
  });

  setShowAddTransaction(false);

  showToast('Transação registrada com sucesso', 'success', '✅');
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

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const days = getDaysInMonth();
  const monthName = currentDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const chartData = Object.entries(expensesByCategory)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      amount: parseFloat(value.toFixed(2)),
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthExpenseChange = calculatePercentageChange(
    summary.expenses,
    previousMonthSummary.expenses
  );
  const weekExpenseChange = calculatePercentageChange(
    weekSummary.expenses,
    previousWeekSummary.expenses
  );

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "100%",
        overflowY: "auto",
        paddingBottom: "40px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header com Resumo do Mês */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Card Entradas */}
        <div
          className="fz-card"
          style={{
            textAlign: "center",
            padding: "20px 16px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted-foreground)",
              marginBottom: "8px",
              fontWeight: 500,
            }}
          >
            Entradas
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#22C55E" }}>
            {formatCurrency(summary.income)}
          </div>
        </div>

        {/* Card Gastos */}
        <div
          className="fz-card"
          style={{
            textAlign: "center",
            padding: "20px 16px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted-foreground)",
              marginBottom: "8px",
              fontWeight: 500,
            }}
          >
            Gastos
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#EF4444" }}>
            {formatCurrency(summary.expenses)}
          </div>
        </div>

        {/* Card Saldo */}
        <div
          className="fz-card"
          style={{
            textAlign: "center",
            padding: "20px 16px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted-foreground)",
              marginBottom: "8px",
              fontWeight: 500,
            }}
          >
            Saldo
          </div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: summary.balance >= 0 ? "#A855F7" : "#EF4444",
            }}
          >
            {formatCurrency(summary.balance)}
          </div>
        </div>
      </div>

      {/* Comparações - Mês e Semana */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Comparação Mês */}
        <div
          className="fz-card"
          style={{
            padding: "16px",
            borderLeft: `4px solid ${summary.balance >= 0 ? "#22C55E" : "#A855F7"}`,
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted-foreground)",
              marginBottom: "12px",
              fontWeight: 600,
            }}
          >
            Comparação com Mês Anterior
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            {monthExpenseChange < 0 ? (
              <>
                <TrendingDown
                  size={16}
                  color={summary.balance >= 0 ? "#22C55E" : "#22C55E"}
                />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: summary.balance >= 0 ? "#22C55E" : "#22C55E",
                  }}
                >
                  {Math.abs(monthExpenseChange).toFixed(1)}% menor
                </span>
              </>
            ) : monthExpenseChange > 0 ? (
              <>
                <TrendingUp
                  size={16}
                  color={summary.balance >= 0 ? "#22C55E" : "#EF4444"}
                />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: summary.balance >= 0 ? "#22C55E" : "#EF4444",
                  }}
                >
                  {monthExpenseChange.toFixed(1)}% maior
                </span>
              </>
            ) : (
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: summary.balance >= 0 ? "#22C55E" : "#888",
                }}
              >
                Sem mudanças
              </span>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            Mês anterior: {formatCurrency(previousMonthSummary.expenses)}
          </div>
        </div>

        {/* Comparação Semana */}
        <div
          className="fz-card"
          style={{
            padding: "16px",
            borderLeft: `4px solid ${summary.balance >= 0 ? "#22C55E" : "#EC4899"}`,
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--muted-foreground)",
              marginBottom: "12px",
              fontWeight: 600,
            }}
          >
            Comparação com Semana Anterior
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            {weekExpenseChange < 0 ? (
              <>
                <TrendingDown
                  size={16}
                  color={summary.balance >= 0 ? "#22C55E" : "#22C55E"}
                />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: summary.balance >= 0 ? "#22C55E" : "#22C55E",
                  }}
                >
                  {Math.abs(weekExpenseChange).toFixed(1)}% menor
                </span>
              </>
            ) : weekExpenseChange > 0 ? (
              <>
                <TrendingUp
                  size={16}
                  color={summary.balance >= 0 ? "#22C55E" : "#EF4444"}
                />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: summary.balance >= 0 ? "#22C55E" : "#EF4444",
                  }}
                >
                  {weekExpenseChange.toFixed(1)}% maior
                </span>
              </>
            ) : (
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                  color: summary.balance >= 0 ? "#22C55E" : "#888",
                }}
              >
                Sem mudanças
              </span>
            )}
          </div>
          <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            Semana anterior: {formatCurrency(previousWeekSummary.expenses)}
          </div>
        </div>
      </div>

      {/* Layout Principal - Gráfico + Calendário */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "24px",
        }}
        className="lg:grid-cols-2"
      >
        {/* Gráfico de Gastos por Categoria */}
        {chartData.length > 0 && (
          <div
            className="fz-card lg:order-1"
            style={{
              padding: "24px",
              order: 2,
            }}
          >
            {/* Header com Título e Botão de Alternância */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--foreground)",
                }}
              >
                Distribuição de Gastos
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setChartType("bars")}
                  style={{
                    background:
                      chartType === "bars"
                        ? "linear-gradient(135deg, #A855F7, #EC4899)"
                        : "rgba(255, 255, 255, 0.05)",
                    border:
                      chartType === "bars"
                        ? "none"
                        : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => {
                    if (chartType !== "bars") {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255, 255, 255, 0.1)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (chartType !== "bars") {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255, 255, 255, 0.05)";
                    }
                  }}
                >
                  <BarChart3 size={14} /> Barras
                </button>
                <button
                  onClick={() => setChartType("pie")}
                  style={{
                    background:
                      chartType === "pie"
                        ? "linear-gradient(135deg, #A855F7, #EC4899)"
                        : "rgba(255, 255, 255, 0.05)",
                    border:
                      chartType === "pie"
                        ? "none"
                        : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => {
                    if (chartType !== "pie") {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255, 255, 255, 0.1)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (chartType !== "pie") {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255, 255, 255, 0.05)";
                    }
                  }}
                >
                  <PieChartIcon size={14} /> Pizza
                </button>
              </div>
            </div>

            {/* Gráfico de Barras com Emojis */}
            {chartType === "bars" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                {chartData.map((item, index) => {
                  const percentage = (item.amount / maxExpense) * 100;
                  return (
                    <div
                      key={item.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div style={{ fontSize: "24px", minWidth: "32px" }}>
                        {CATEGORY_ICONS[item.name] || "📊"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--muted-foreground)",
                            marginBottom: "4px",
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            height: "8px",
                            background: "rgba(255, 255, 255, 0.05)",
                            borderRadius: "4px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${percentage}%`,
                              background:
                                CHART_COLORS[index % CHART_COLORS.length],
                              borderRadius: "4px",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: CHART_COLORS[index % CHART_COLORS.length],
                          minWidth: "70px",
                          textAlign: "right",
                        }}
                      >
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Gráfico de Pizza */}
            {chartType === "pie" && (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, amount }) =>
                      `${name}: R$ ${amount.toFixed(2)}`
                    }
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {CHART_COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) =>
                      `R$ ${parseFloat(value).toFixed(2)}`
                    }
                    contentStyle={{
                      background: "rgba(0, 0, 0, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Calendário - Sidebar */}
        <div
          className="fz-card lg:order-2"
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            order: 1,
          }}
        >
          {/* Header do Calendário */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
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
                fontSize: "18px",
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                textAlign: "center",
                flex: 1,
              }}
            >
              {monthName}
            </div>
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
                fontSize: "18px",
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Dias da Semana */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
              marginBottom: "8px",
            }}
          >
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map(day => (
              <div
                key={day}
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  textAlign: "center",
                  color: "#888",
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Dias do Mês */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
            }}
          >
            {days.map((day, index) => {
              const hasExpense = day && expensesByDay[day];
              const isToday =
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth();
              return (
                <div
                  key={index}
                  style={{
                    padding: "6px",
                    textAlign: "center",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    background: isToday
                      ? "linear-gradient(135deg, #A855F7, #EC4899)"
                      : hasExpense
                        ? "rgba(168, 85, 247, 0.2)"
                        : "transparent",
                    color: isToday ? "#fff" : day ? "#fff" : "#333",
                    cursor: day ? "pointer" : "default",
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Botão Registrar */}
          <button
            onClick={() => setShowAddTransaction(true)}
            style={{
              width: "100%",
              marginTop: "16px",
              background: "linear-gradient(135deg, #A855F7, #EC4899)",
              border: "none",
              borderRadius: "8px",
              padding: "12px",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(-2px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 8px 16px rgba(168, 85, 247, 0.3)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "translateY(0)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
            }}
          >
            <Plus size={16} /> Registrar
          </button>
        </div>
      </div>

      {/* Modal Adicionar Transação */}
      {showAddTransaction && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "400px",
              width: "100%",
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
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--foreground)",
                }}
              >
                Registrar Transação
              </div>
              <button
                onClick={() => setShowAddTransaction(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted-foreground)",
                  cursor: "pointer",
                  fontSize: "24px",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--muted-foreground)",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Descrição
                </label>
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

              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--muted-foreground)",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Valor
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="fz-input"
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--muted-foreground)",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      type: e.target.value as "income" | "expense",
                    })
                  }
                  className="fz-input"
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ganho</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--muted-foreground)",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={e =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="fz-input"
                >
                  {PREDEFINED_CATEGORIES.map(cat => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--muted-foreground)",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Data
                </label>
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
                style={{ padding: "12px", fontSize: 14, marginTop: 8 }}
              >
                Registrar Transação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
