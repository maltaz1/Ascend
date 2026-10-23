import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { addTransaction, deleteTransaction } from "@/store/financial.store";
import { formatCurrency } from "@/lib/financial";
import { getTodayString } from "@/lib/store";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { ProGate } from "@/components/ProGate";
import { Button, Card, EmptyState, IconButton, Input, Screen, SectionTitle, Segmented, Sheet, StatTile, Txt } from "@/components/ui";
import { BarChart, DonutChart, Legend } from "@/components/charts";
import { DateStrip } from "@/components/DateStrip";
import { resolveColor, useTheme } from "@/theme";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// Mesmas categorias de pages/Financial.tsx.
const EXPENSE_CATEGORIES = [
  { name: "Alimentação", icon: "🍔" },
  { name: "Transporte", icon: "🚌" },
  { name: "Moradia", icon: "🏠" },
  { name: "Lazer & Estilo de Vida", icon: "🎮" },
  { name: "Saúde & Bem-Estar", icon: "💪" },
  { name: "Compras & Pessoal", icon: "🛍️" },
  { name: "Educação", icon: "🎓" },
  { name: "Outros / Imprevistos", icon: "🧾" },
];
const INCOME_CATEGORIES = [
  { name: "Salário", icon: "💰" },
  { name: "Freelance", icon: "💻" },
  { name: "Investimentos", icon: "📈" },
  { name: "Outros", icon: "🧩" },
];
const ICONS: Record<string, string> = Object.fromEntries(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map(c => [c.name, c.icon])
);
const CHART_COLORS = ["var(--primary)", "#EC4899", "var(--accent)", "#10B981", "#06B6D4", "#3B82F6", "#EF4444", "#6366F1"];

export default function FinancialScreen() {
  return (
    <ProGate section="financial">
      <Financial />
    </ProGate>
  );
}

function Financial() {
  const theme = useTheme();
  const data = useStore();
  const [cursor, setCursor] = useState(() => new Date());
  const [chart, setChart] = useState<"bars" | "pie">("pie");
  const [showAdd, setShowAdd] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const all = data.financial.transactions;

  const inMonth = (y: number, m: number) =>
    all.filter(t => {
      const d = new Date(`${t.date.slice(0, 10)}T12:00:00`);
      return d.getFullYear() === y && d.getMonth() === m;
    });

  const current = inMonth(year, month).sort((a, b) => b.date.localeCompare(a.date));
  const prevDate = new Date(year, month - 1, 1);
  const previous = inMonth(prevDate.getFullYear(), prevDate.getMonth());

  const sum = (list: typeof all, type: "income" | "expense") =>
    list.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
  const income = sum(current, "income");
  const expense = sum(current, "expense");
  const prevExpense = sum(previous, "expense");
  const expenseDelta = prevExpense > 0 ? Math.round(((expense - prevExpense) / prevExpense) * 100) : 0;

  const totals = new Map<string, number>();
  current
    .filter(t => t.type === "expense")
    .forEach(t => totals.set(t.category || "Outros / Imprevistos", (totals.get(t.category || "Outros / Imprevistos") ?? 0) + t.amount));
  const byCategory = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: resolveColor(CHART_COLORS[i % CHART_COLORS.length], theme) }));

  const confirmDelete = (id: string, title: string) => {
    Alert.alert("Excluir lançamento", `Excluir "${title}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void deleteTransaction(id) },
    ]);
  };

  return (
    <Screen back title="Financeiro" right={<IconButton icon="add" label="Novo lançamento" onPress={() => setShowAdd(true)} filled />}>
      <Card style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={() => setCursor(new Date(year, month - 1, 1))} hitSlop={10} accessibilityLabel="Mês anterior">
          <Ionicons name="chevron-back" size={22} color={theme.ink} />
        </Pressable>
        <Txt variant="h3" style={{ flex: 1, textAlign: "center" }}>
          {MONTHS[month]} {year}
        </Txt>
        <Pressable onPress={() => setCursor(new Date(year, month + 1, 1))} hitSlop={10} accessibilityLabel="Próximo mês">
          <Ionicons name="chevron-forward" size={22} color={theme.ink} />
        </Pressable>
      </Card>

      <Card accent={income - expense >= 0 ? theme.success : theme.danger}>
        <Txt variant="overline" muted>
          Saldo do mês
        </Txt>
        <Txt variant="display" color={income - expense >= 0 ? theme.success : theme.danger}>
          {formatCurrency(income - expense)}
        </Txt>
        <Txt variant="caption" muted>
          {prevExpense > 0
            ? `Gastos ${expenseDelta >= 0 ? "+" : ""}${expenseDelta}% vs. mês anterior`
            : "Sem gastos no mês anterior para comparar"}
        </Txt>
      </Card>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile icon="arrow-down-circle-outline" value={formatCurrency(income)} label="Entradas" color={theme.success} />
        <StatTile icon="arrow-up-circle-outline" value={formatCurrency(expense)} label="Gastos" color={theme.danger} />
      </View>

      <SectionTitle
        right={
          <View style={{ width: 150 }}>
            <Segmented
              options={[
                { value: "pie", label: "Pizza" },
                { value: "bars", label: "Barras" },
              ]}
              value={chart}
              onChange={setChart}
            />
          </View>
        }
      >
        Gastos por categoria
      </SectionTitle>
      <Card>
        {byCategory.length === 0 ? (
          <EmptyState text="Nenhum gasto neste mês." />
        ) : chart === "pie" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <DonutChart slices={byCategory.map(c => ({ value: c.value, color: c.color, label: c.name }))} size={120} stroke={20} />
            <View style={{ flex: 1, gap: 6 }}>
              {byCategory.map(c => (
                <View key={c.name} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.color }} />
                  <Txt variant="caption" style={{ flex: 1 }} numberOfLines={1}>
                    {ICONS[c.name] ?? ""} {c.name}
                  </Txt>
                  <Txt variant="caption" muted>
                    {Math.round((c.value / expense) * 100)}%
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <>
            <BarChart
              data={byCategory.map(c => ({ label: ICONS[c.name] ?? c.name.slice(0, 3), value: c.value }))}
              series={[{ key: "value", label: "Gastos", color: theme.primary }]}
            />
            <Legend series={byCategory.map(c => ({ label: `${c.name}: ${formatCurrency(c.value)}`, color: c.color }))} />
          </>
        )}
      </Card>

      <SectionTitle>Lançamentos</SectionTitle>
      <Card>
        {current.length === 0 ? (
          <EmptyState icon="cash-outline" text="Nenhum lançamento neste mês." />
        ) : (
          current.map(t => (
            <Pressable
              key={t.id}
              onLongPress={() => confirmDelete(t.id, t.title)}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.primarySoft,
                }}
              >
                <Txt style={{ fontSize: 18 }}>{ICONS[t.category ?? ""] ?? (t.type === "income" ? "💰" : "🧾")}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong" numberOfLines={1}>
                  {t.title}
                </Txt>
                <Txt variant="caption" muted>
                  {t.category ?? "Sem categoria"} · {new Date(`${t.date.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")}
                </Txt>
              </View>
              <Txt variant="bodyStrong" color={t.type === "income" ? theme.success : theme.danger}>
                {t.type === "income" ? "+" : "−"}
                {formatCurrency(t.amount)}
              </Txt>
            </Pressable>
          ))
        )}
      </Card>
      {current.length > 0 && (
        <Txt variant="caption" muted style={{ textAlign: "center" }}>
          Segure um lançamento para excluir
        </Txt>
      )}

      <TransactionSheet visible={showAdd} onClose={() => setShowAdd(false)} />
    </Screen>
  );
}

function TransactionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name);
  const [date, setDate] = useState(getTodayString());
  const [saving, setSaving] = useState(false);

  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const value = Number(amount.replace(/\./g, "").replace(",", "."));
  const valid = name.trim().length > 0 && value > 0;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await addTransaction({ title: name.trim(), amount: value, type, category, date });
      notifySuccess(type === "income" ? "Entrada registrada!" : "Gasto registrado!");
      setName("");
      setAmount("");
      onClose();
    } catch (error) {
      notifyError("Erro ao salvar", error instanceof Error ? error.message : undefined);
    }
    setSaving(false);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Novo lançamento">
      <Segmented
        options={[
          { value: "expense", label: "Gasto" },
          { value: "income", label: "Entrada" },
        ]}
        value={type}
        onChange={next => {
          setType(next);
          setCategory((next === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0].name);
        }}
      />
      <Input label="Descrição" value={name} onChangeText={setName} placeholder="Ex.: Mercado" />
      <Input label="Valor (R$)" value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="decimal-pad" />
      <Txt variant="label" muted>
        Categoria
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {categories.map(c => (
          <Pressable
            key={c.name}
            onPress={() => setCategory(c.name)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: category === c.name ? theme.primary : theme.border,
              backgroundColor: category === c.name ? theme.primarySoft : "transparent",
            }}
          >
            <Txt variant="label">
              {c.icon} {c.name}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Txt variant="label" muted>
        Data
      </Txt>
      <DateStrip value={date} onChange={setDate} daysBefore={30} daysAfter={30} />
      <Button label="Salvar" onPress={save} loading={saving} disabled={!valid} />
    </Sheet>
  );
}
