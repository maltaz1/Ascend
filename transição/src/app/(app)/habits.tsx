import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  createHabit,
  getDailyHabitData,
  getHabitMonthProgress,
  getHabitStreak,
  getTodayString,
  getWeeklyHabitData,
  removeHabit,
  type Habit,
} from "@/lib/store";
import { FREE_LIMITS } from "@/config/planLimits";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, EmptyState, Fab, IconBox, Input, Marginalia, Metric, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { AreaChart } from "@/components/charts";
import { toggleHabitWithGoals } from "@/components/rows";
import { fonts, resolveColor, useTheme } from "@/theme";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const EMOJIS = ["🏃", "📚", "💪", "🧘", "💧", "🥗", "😴", "✍️", "🎵", "🧹", "💊", "🌿", "🧠", "🙏", "🎯"];
// Mesmas "tintas" do formulário do web.
const COLORS = ["var(--accent)", "var(--primary)", "#10B981", "#3B82F6", "#EF4444", "#EC4899", "#06B6D4"];
const TARGETS = [7, 21, 30, 66, 100];

const ROW_H = 78;
const CELL = 30;

// Porta de pages/Habits.tsx (visão em tabela, padrão do site).
export default function HabitsScreen() {
  const theme = useTheme();
  const data = useStore();
  const { isPro } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);

  const today = getTodayString();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const habits = data.habits.filter(h => h.title.toLowerCase().includes(search.trim().toLowerCase()));
  const doneToday = data.habits.filter(h => h.completedDates.includes(today)).length;
  const elapsed = isCurrentMonth ? now.getDate() : daysInMonth;
  const monthChecks = data.habits.reduce(
    (sum, h) => sum + h.completedDates.filter(d => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length,
    0
  );
  const rate = data.habits.length ? Math.round((monthChecks / (data.habits.length * elapsed)) * 100) : 0;

  const chartData =
    period === "daily"
      ? getDailyHabitData(year, month, data.habits).map(d => ({ label: String(d.day), count: d.count }))
      : getWeeklyHabitData(year, month, data.habits).map(d => ({ label: d.week, count: d.count }));

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const confirmDelete = (habit: Habit) =>
    Alert.alert("Excluir hábito", `Excluir "${habit.title}"? O histórico será perdido.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const { error } = await removeHabit(habit.id);
          if (error) notifyError("Erro ao remover", error);
          else notifyInfo("Hábito removido");
        },
      },
    ]);

  const openNew = () => {
    if (!isPro && data.habits.length >= FREE_LIMITS.habits) {
      notifyInfo(`Plano grátis permite apenas ${FREE_LIMITS.habits} hábitos`);
      return;
    }
    setShowNew(true);
  };

  const dayKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <Screen title="Hábitos" subtitle="Consistência é tudo" fab={<Fab label="Novo hábito" onPress={openNew} />}>
      <Input boxed icon="search" placeholder="Buscar..." value={search} onChangeText={setSearch} />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <MonthArrow icon="chevron-back" label="Mês anterior" onPress={() => shiftMonth(-1)} />
        <Txt variant="h2" style={{ minWidth: 140, textAlign: "center" }}>
          {MONTHS[month]} {year}
        </Txt>
        <MonthArrow icon="chevron-forward" label="Próximo mês" onPress={() => shiftMonth(1)} />
      </View>

      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <IconBox icon="trending-up" size={38} />
          <Txt variant="h2" style={{ flex: 1 }}>
            Consistência em foco
          </Txt>
          <View style={{ width: 150 }}>
            <Segmented
              options={[
                { value: "daily", label: "Diário" },
                { value: "weekly", label: "Semanal" },
              ]}
              value={period}
              onChange={setPeriod}
            />
          </View>
        </View>
        <AreaChart data={chartData} series={[{ key: "count", label: "Hábitos concluídos", color: theme.primary }]} height={210} />
      </Card>

      <Card padded={false} style={{ overflow: "hidden" }}>
        {habits.length === 0 ? (
          <View style={{ padding: 18, gap: 12 }}>
            <EmptyState icon="flame-outline" text={search ? "Nenhum hábito encontrado" : "Nenhum hábito criado"} />
            {!search && <Button label="Novo hábito" icon="add" onPress={openNew} />}
          </View>
        ) : (
          <View style={{ flexDirection: "row" }}>
            {/* Coluna fixa com os hábitos */}
            <View style={{ width: 138, borderRightWidth: 1, borderRightColor: theme.border }}>
              <View style={{ height: 44, justifyContent: "center", paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                <Marginalia>Hábito</Marginalia>
              </View>
              {habits.map(habit => {
                const color = resolveColor(habit.color, theme);
                return (
                  <View
                    key={habit.id}
                    style={{ height: ROW_H, paddingHorizontal: 12, justifyContent: "center", gap: 4, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Txt style={{ fontSize: 16 }}>{habit.emoji}</Txt>
                      <Txt variant="bodyStrong" style={{ flex: 1, fontSize: 13 }} numberOfLines={2}>
                        {habit.title}
                      </Txt>
                      <Pressable onPress={() => confirmDelete(habit)} hitSlop={8} accessibilityLabel="Excluir hábito">
                        <Ionicons name="trash-outline" size={15} color={theme.inkMuted} />
                      </Pressable>
                    </View>
                    <Txt variant="caption" muted>
                      <Txt variant="caption" color={color} style={{ fontFamily: fonts.bodyBold }}>
                        {getHabitMonthProgress(habit, year, month)}/{daysInMonth}
                      </Txt>
                      {"  •  "}
                      {getHabitStreak(habit)}d
                    </Txt>
                  </View>
                );
              })}
            </View>
            {/* Dias do mês (rolagem horizontal) */}
            <ScrollView style={{ flex: 1 }} horizontal showsHorizontalScrollIndicator={false} contentOffset={{ x: isCurrentMonth ? Math.max(0, (now.getDate() - 4) * (CELL + 12)) : 0, y: 0 }}>
              <View>
                <View style={{ flexDirection: "row", height: 44, alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 6 }}>
                  {Array.from({ length: daysInMonth }, (_, i) => (
                    <Txt
                      key={i}
                      variant="caption"
                      color={dayKey(i + 1) === today ? theme.accent : theme.inkMuted}
                      style={{ width: CELL + 12, textAlign: "center", fontFamily: fonts.bodySemi }}
                    >
                      {i + 1}
                    </Txt>
                  ))}
                </View>
                {habits.map(habit => {
                  const color = resolveColor(habit.color, theme);
                  return (
                    <View key={habit.id} style={{ flexDirection: "row", height: ROW_H, alignItems: "center", borderBottomWidth: 1, borderBottomColor: theme.border, paddingHorizontal: 6 }}>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const key = dayKey(i + 1);
                        const done = habit.completedDates.includes(key);
                        const future = key > today;
                        return (
                          <Pressable
                            key={key}
                            disabled={future}
                            onPress={() => void toggleHabitWithGoals(habit, key)}
                            style={{ width: CELL + 12, alignItems: "center" }}
                            accessibilityLabel={`${habit.title} dia ${i + 1}`}
                          >
                            <View
                              style={{
                                width: done ? 22 : 14,
                                height: done ? 22 : 14,
                                borderRadius: 11,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: done ? color : theme.track,
                                borderWidth: key === today && !done ? 1.5 : 0,
                                borderColor: theme.accent,
                                opacity: future ? 0.35 : 1,
                              }}
                            >
                              {done ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </Card>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric label="Hoje" value={String(doneToday)} valueColor={theme.accent} center />
        <Metric label="Taxa" value={`${rate}%`} valueColor={theme.success} center />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric label="Hábitos" value={String(data.habits.length)} valueColor={theme.primary} center />
        <View style={{ flex: 1 }} />
      </View>
      {!isPro && (
        <Txt variant="caption" muted style={{ textAlign: "center" }}>
          {data.habits.length}/{FREE_LIMITS.habits} hábitos no plano grátis
        </Txt>
      )}

      <NewHabitSheet visible={showNew} onClose={() => setShowNew(false)} />
    </Screen>
  );
}

function MonthArrow({ icon, label, onPress }: { icon: "chevron-back" | "chevron-forward"; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={{ width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" }}
    >
      <Ionicons name={icon} size={18} color={theme.ink} />
    </Pressable>
  );
}

function NewHabitSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [targetDays, setTargetDays] = useState(30);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await createHabit({ title, emoji, color, targetDays });
    setSaving(false);
    if (error) {
      notifyError("Erro ao criar hábito", error);
      return;
    }
    notifySuccess("Hábito criado!");
    setTitle("");
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Novo Hábito">
      <Input label="Nome do hábito" placeholder="Ex.: Beber 2L de água" value={title} onChangeText={setTitle} />
      <Marginalia>Ícone</Marginalia>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {EMOJIS.map(item => (
          <Pressable
            key={item}
            onPress={() => setEmoji(item)}
            style={{
              width: 42,
              height: 42,
              borderRadius: 4,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: emoji === item ? theme.primarySoft : "transparent",
              borderWidth: 1,
              borderColor: emoji === item ? theme.primaryBorder : theme.border,
            }}
          >
            <Txt style={{ fontSize: 20 }}>{item}</Txt>
          </Pressable>
        ))}
      </View>
      <Marginalia>Cor da tinta</Marginalia>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {COLORS.map(item => (
          <Pressable
            key={item}
            onPress={() => setColor(item)}
            accessibilityLabel={`Cor ${item}`}
            style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: resolveColor(item, theme), borderWidth: color === item ? 3 : 0, borderColor: theme.ink }}
          />
        ))}
      </View>
      <Marginalia>Meta (dias)</Marginalia>
      <Segmented kind="stamp" options={TARGETS.map(days => ({ value: days, label: `${days} dias` }))} value={targetDays} onChange={setTargetDays} />
      <Button label="Criar hábito" onPress={handleSave} loading={saving} disabled={!title.trim()} />
    </Sheet>
  );
}
