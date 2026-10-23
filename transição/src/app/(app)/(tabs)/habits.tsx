import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createHabit, getDailyHabitData, removeHabit, type Habit } from "@/lib/store";
import { FREE_LIMITS } from "@/config/planLimits";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, EmptyState, IconButton, Input, Screen, SectionTitle, Segmented, Sheet, Txt } from "@/components/ui";
import { HabitMonthCard } from "@/components/rows";
import { BarChart } from "@/components/charts";
import { resolveColor, useTheme } from "@/theme";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const EMOJIS = ["🏃", "📚", "💪", "🧘", "💧", "🥗", "😴", "✍️", "🎵", "🧹", "💊", "🌿", "🧠", "🙏", "🎯"];
// Mesmas "tintas" do formulário do web.
const COLORS = ["var(--accent)", "var(--primary)", "#10B981", "#3B82F6", "#EF4444", "#EC4899", "#06B6D4"];
const TARGETS = [7, 21, 30, 66, 100];

export default function HabitsScreen() {
  const theme = useTheme();
  const data = useStore();
  const { isPro } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [showNew, setShowNew] = useState(false);

  const daily = getDailyHabitData(year, month, data.habits);
  const today = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const totalChecks = daily.reduce((sum, d) => sum + d.count, 0);

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const confirmDelete = (habit: Habit) => {
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
  };

  const openNew = () => {
    if (!isPro && data.habits.length >= FREE_LIMITS.habits) {
      notifyInfo(`Plano grátis permite apenas ${FREE_LIMITS.habits} hábitos`);
      return;
    }
    setShowNew(true);
  };

  return (
    <Screen
      title="Hábitos"
      subtitle="Consistência em foco"
      right={<IconButton icon="add" label="Novo hábito" onPress={openNew} filled />}
    >
      <Card style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} accessibilityLabel="Mês anterior">
          <Ionicons name="chevron-back" size={22} color={theme.ink} />
        </Pressable>
        <Txt variant="h3" style={{ flex: 1, textAlign: "center" }}>
          {MONTHS[month]} {year}
        </Txt>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10} accessibilityLabel="Próximo mês">
          <Ionicons name="chevron-forward" size={22} color={theme.ink} />
        </Pressable>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View>
            <Txt variant="h3">Atividade no mês</Txt>
            <Txt variant="caption" muted>
              Seu ritmo dia a dia neste mês
            </Txt>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Txt variant="h2" color={theme.primary}>
              {totalChecks}
            </Txt>
            <Txt variant="caption" muted>
              check-ins
            </Txt>
          </View>
        </View>
        <BarChart
          data={daily
            .filter(d => !isCurrentMonth || d.day <= today)
            .map(d => ({ label: d.day % 5 === 0 || d.day === 1 ? String(d.day) : "", count: d.count }))}
          series={[{ key: "count", label: "Hábitos concluídos", color: theme.primary }]}
          height={130}
        />
      </Card>

      <SectionTitle>
        {data.habits.length} {data.habits.length === 1 ? "hábito" : "hábitos"}
        {!isPro ? ` · ${data.habits.length}/${FREE_LIMITS.habits} no plano grátis` : ""}
      </SectionTitle>

      {data.habits.length === 0 ? (
        <Card>
          <EmptyState icon="flame-outline" text="Nenhum hábito criado" />
          <Button label="Novo hábito" icon="add" onPress={openNew} />
        </Card>
      ) : (
        data.habits.map(habit => (
          <HabitMonthCard key={habit.id} habit={habit} year={year} month={month} onLongPress={() => confirmDelete(habit)} />
        ))
      )}
      {data.habits.length > 0 && (
        <Txt variant="caption" muted style={{ textAlign: "center" }}>
          Toque num dia para marcar · segure o cartão para excluir
        </Txt>
      )}

      <NewHabitSheet visible={showNew} onClose={() => setShowNew(false)} />
    </Screen>
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
    <Sheet visible={visible} onClose={onClose} title="Novo hábito">
      <Input label="Nome do hábito" placeholder="Ex.: Beber 2L de água" value={title} onChangeText={setTitle} />
      <Txt variant="label" muted>
        Ícone
      </Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {EMOJIS.map(item => (
          <Pressable
            key={item}
            onPress={() => setEmoji(item)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: emoji === item ? theme.primarySoft : "transparent",
              borderWidth: 1,
              borderColor: emoji === item ? theme.primary : theme.border,
            }}
          >
            <Txt style={{ fontSize: 22 }}>{item}</Txt>
          </Pressable>
        ))}
      </View>
      <Txt variant="label" muted>
        Cor da tinta
      </Txt>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {COLORS.map(item => (
          <Pressable
            key={item}
            onPress={() => setColor(item)}
            accessibilityLabel={`Cor ${item}`}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: resolveColor(item, theme),
              borderWidth: color === item ? 3 : 0,
              borderColor: theme.ink,
            }}
          />
        ))}
      </View>
      <Txt variant="label" muted>
        Meta
      </Txt>
      <Segmented
        options={TARGETS.map(days => ({ value: days, label: `${days}d` }))}
        value={targetDays}
        onChange={setTargetDays}
      />
      <Button label="Criar hábito" onPress={handleSave} loading={saving} disabled={!title.trim()} />
    </Sheet>
  );
}
