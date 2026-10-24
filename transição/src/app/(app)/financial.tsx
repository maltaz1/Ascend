import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { addTransaction, deleteTransaction } from "@/store/financial.store";
import { formatCurrency } from "@/lib/financial";
import { getTodayString } from "@/lib/store";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { ProGate } from "@/components/ProGate";
import { Button, Card, EmptyState, Input, Marginalia, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { DonutChart, HBar } from "@/components/charts";
import { DateStrip } from "@/components/DateStrip";
import { MonthCalendar } from "@/components/MonthCalendar";
import { resolveColor, useTheme } from "@/theme";

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
const ICONS: Record<string, string> = Object.fromEntries([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map(c => [c.name, c.icon]));
const CHART_COLORS = ["var(--primary)", "#EC4899", "var(--accent)", "#10B981", "#06B6D4", "#3B82F6", "#EF4444", "#6366F1"];

export default function FinancialScreen() {
  return (
    <ProGate section="financial">
      <Financial />
    </ProGate>
  );
}

type Tx = { id: string; title: string; amount: number; type: "income" | "expense"; category?: string; date: string };

const sum = (list: Tx[], type: "income" | "expense") => list.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0);
const dateOf = (t: Tx) => new Date(`${t.date.slice(0, 10)}T12:00:00`);

// Porta de pages/Financial.tsx ("O caderno de entrada e saída").
function Financial() {
  const theme = useTheme();
  const data = useStore();
  const [selected, setSelected] = useState(getTodayString());
  const [chart, setChart] = useState<"bars" | "pie">("bars");
  const [showAdd, setShowAdd] = useState(false);

  const all = data.financial.transactions as Tx[];
  const ref = new Date(`${selected}T12:00:00`);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const inMonth = (y: number, m: number) => all.filter(t => dateOf(t).getFullYear() === y && dateOf(t).getMonth() === m);
  const current = inMonth(year, month).sort((a, b) => b.date.localeCompare(a.date));
  const prev = new Date(year, month - 1, 1);
  const previous = inMonth(prev.getFullYear(), prev.getMonth());

  const weekStart = new Date(ref);
  weekStart.setDate(ref.getDate() - ref.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const inRange = (from: Date, days: number) =>
    all.filter(t => {
      const d = dateOf(t);
      const end = new Date(from);
      end.setDate(from.getDate() + days);
      return d >= from && d < end;
    });
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(weekStart.getDate() - 7);

  const income = sum(current, "income");
  const expense = sum(current, "expense");

  const totals = new Map<string, number>();
  current
    .filter(t => t.type === "expense")
    .forEach(t => totals.set(t.category || "Outros / Imprevistos", (totals.get(t.category || "Outros / Imprevistos") ?? 0) + t.amount));
  const byCategory = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: resolveColor(CHART_COLORS[i % CHART_COLORS.length], theme) }));
  const topValue = byCategory[0]?.value ?? 1;

  const confirmDelete = (t: Tx) =>
    Alert.alert("Excluir lançamento", `Excluir "${t.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void deleteTransaction(t.id) },
    ]);

  return (
    <Screen>
      <Card style={{ gap: 8, paddingVertical: 22 }}>
        <Marginalia index="07">Movimento</Marginalia>
        <Txt variant="hero" style={{ fontSize: 32 }}>
          Finanças
        </Txt>
        <Txt muted>O caderno de entrada e saída.</Txt>
      </Card>

      <View style={{ flexDirection: "row", borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface }}>
        {[
          { label: "Entradas", value: income, color: theme.success },
          { label: "Gastos", value: expense, color: theme.danger },
          { label: "Saldo", value: income - expense, color: theme.primary },
        ].map((item, i) => (
          <View key={item.label} style={{ flex: 1, padding: 12, gap: 6, borderLeftWidth: i ? 1 : 0, borderLeftColor: theme.border }}>
            <Txt variant="caption" muted>
              {item.label}
            </Txt>
            <Txt variant="mono" color={item.color} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(item.value)}
            </Txt>
          </View>
        ))}
      </View>

      <Comparison label="vs. mês anterior" current={expense} previous={sum(previous, "expense")} />
      <Comparison label="vs. semana anterior" current={sum(inRange(weekStart, 7), "expense")} previous={sum(inRange(lastWeekStart, 7), "expense")} />

      <Card>
        <MonthCalendar
          value={selected}
          onChange={setSelected}
          weekLabels={["D", "S", "T", "Q", "Q", "S", "S"]}
          selectedStyle="filled"
          arrowColor={theme.primary}
          dots={key => (all.some(t => t.date.slice(0, 10) === key) ? [theme.primary] : [])}
        />
        <View style={{ height: 1, backgroundColor: theme.border }} />
        <Button label="Registrar transação" icon="add" onPress={() => setShowAdd(true)} />
      </Card>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <Marginalia index="08">Distribuição</Marginalia>
            <Txt variant="h2">Distribuição por categoria</Txt>
          </View>
          <View style={{ width: 150 }}>
            <Segmented
              options={[
                { value: "bars", label: "Barras", icon: "bar-chart-outline" },
                { value: "pie", label: "Pizza", icon: "pie-chart-outline" },
              ]}
              value={chart}
              onChange={setChart}
            />
          </View>
        </View>
        {byCategory.length === 0 ? (
          <EmptyState text="Nenhum gasto neste mês." />
        ) : chart === "pie" ? (
          <View style={{ alignItems: "center", gap: 14 }}>
            <DonutChart slices={byCategory.map(c => ({ value: c.value, color: c.color, label: c.name }))} size={170} stroke={30} format={formatCurrency} />
            <View style={{ alignSelf: "stretch", gap: 8 }}>
              {byCategory.map(c => (
                <View key={c.name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c.color }} />
                  <Txt variant="label" style={{ flex: 1 }}>
                    {ICONS[c.name] ?? ""} {c.name}
                  </Txt>
                  <Txt variant="mono" color={c.color}>
                    {Math.round((c.value / expense) * 100)}%
                  </Txt>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {byCategory.map(c => (
              <View key={c.name} style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Txt style={{ fontSize: 14 }}>{ICONS[c.name] ?? "🧾"}</Txt>
                  <Txt variant="label" color={c.color} style={{ flex: 1 }} numberOfLines={1}>
                    {c.name}
                  </Txt>
                  <Txt variant="mono" color={c.color}>
                    {formatCurrency(c.value)}
                  </Txt>
                </View>
                <View style={{ paddingLeft: 24 }}>
                  <HBar percent={(c.value / topValue) * 100} color={c.color} />
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Marginalia>Lançamentos recentes</Marginalia>
        {current.length === 0 ? (
          <EmptyState icon="cash-outline" text="Nenhum lançamento neste mês." />
        ) : (
          current.map(t => (
            <View key={t.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
              <View style={{ width: 34, height: 34, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: theme.raised }}>
                <Txt style={{ fontSize: 16 }}>{ICONS[t.category ?? ""] ?? (t.type === "income" ? "💰" : "🧾")}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="bodyStrong" numberOfLines={1}>
                  {t.title}
                </Txt>
                <Txt variant="caption" muted numberOfLines={1}>
                  {t.category ?? "Sem categoria"}
                </Txt>
              </View>
              <Txt variant="mono" color={t.type === "income" ? theme.success : theme.danger}>
                {t.type === "income" ? "+" : "-"}
                {formatCurrency(t.amount)}
              </Txt>
              <Txt variant="mono" muted style={{ fontSize: 11, fontWeight: "400" }}>
                {dateOf(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </Txt>
              <Pressable onPress={() => confirmDelete(t)} hitSlop={8} accessibilityLabel="Excluir lançamento">
                <Ionicons name="trash-outline" size={16} color={theme.inkMuted} />
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <TransactionSheet visible={showAdd} defaultDate={selected} onClose={() => setShowAdd(false)} />
    </Screen>
  );
}

// Selo "↑ 100.0% maior" (comparação com o período anterior).
function Comparison({ label, current, previous }: { label: string; current: number; previous: number }) {
  const theme = useTheme();
  const delta = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;
  const up = delta > 0;
  const color = up ? theme.danger : theme.success;
  return (
    <Card style={{ gap: 10 }}>
      <Marginalia>{label}</Marginalia>
      <View
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: `${color}66`,
          backgroundColor: theme.mode === "dark" ? (up ? "#fee2e2" : "#d1fae5") : `${color}14`,
        }}
      >
        <Txt variant="mono" color={up ? "#dc2626" : "#059669"} style={{ fontWeight: "500" }}>
          {up ? "↑" : delta < 0 ? "↓" : "="} {Math.abs(delta).toFixed(1)}% {up ? "maior" : delta < 0 ? "menor" : "igual"}
        </Txt>
      </View>
      <Txt variant="mono" muted style={{ fontSize: 12, fontWeight: "400" }}>
        anterior: {formatCurrency(previous)}
      </Txt>
    </Card>
  );
}

function TransactionSheet({ visible, defaultDate, onClose }: { visible: boolean; defaultDate: string; onClose: () => void }) {
  const theme = useTheme();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0].name);
  const [date, setDate] = useState(defaultDate);
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
    <Sheet visible={visible} onClose={onClose} title="Registrar transação">
      <Marginalia>Tipo</Marginalia>
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
      <Marginalia>Categoria</Marginalia>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {categories.map(c => (
          <Pressable
            key={c.name}
            onPress={() => setCategory(c.name)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 3,
              borderWidth: 1,
              borderColor: category === c.name ? theme.primaryBorder : theme.border,
              backgroundColor: category === c.name ? theme.primarySoft : "transparent",
            }}
          >
            <Txt variant="label">
              {c.icon} {c.name}
            </Txt>
          </Pressable>
        ))}
      </View>
      <Marginalia>Data</Marginalia>
      <DateStrip value={date} onChange={setDate} daysBefore={30} daysAfter={30} />
      <Button label="Salvar" onPress={save} loading={saving} disabled={!valid} />
    </Sheet>
  );
}
