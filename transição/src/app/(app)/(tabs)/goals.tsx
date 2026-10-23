import { useState } from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createGoal } from "@/store/goals.store";
import { getWeekConsistencyAverage } from "@/lib/weeklyGoals";
import { FREE_LIMITS } from "@/config/planLimits";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, EmptyState, IconButton, Input, Screen, SectionTitle, Segmented, Sheet, StatTile, Txt } from "@/components/ui";
import { LongTermGoalCard, WeeklyGoalCard } from "@/components/rows";
import { DateStrip } from "@/components/DateStrip";
import { resolveColor, useTheme } from "@/theme";

const EMOJIS = ["🎯", "🏆", "📈", "💰", "🏃", "📚", "🧠", "💪", "✈️", "🏠", "❤️", "🌱"];
const COLORS = ["var(--primary)", "var(--accent)", "#10B981", "#3B82F6", "#EF4444", "#EC4899"];
const FREQUENCIES = [1, 2, 3, 4, 5, 6, 7];

type LongFilter = "all" | "ongoing" | "completed";

// Porta de pages/Goals.tsx (metas semanais + longo prazo).
export default function GoalsScreen() {
  const theme = useTheme();
  const data = useStore();
  const { isPro } = useAuth();
  const [filter, setFilter] = useState<LongFilter>("all");
  const [showNew, setShowNew] = useState(false);

  const weekly = data.goals.filter(g => g.type === "semanal");
  const longTerm = data.goals.filter(g => g.type !== "semanal");
  const longFiltered = longTerm.filter(g =>
    filter === "ongoing" ? !g.completedAt : filter === "completed" ? !!g.completedAt : true
  );
  const consistency = Math.round(
    getWeekConsistencyAverage(
      weekly.map(g => ({
        id: g.id,
        title: g.title,
        emoji: g.emoji,
        color: g.color,
        targetFrequency: g.targetFrequency ?? 1,
        daysCompletedWeek: g.daysCompletedWeek ?? [false, false, false, false, false, false, false],
        weekStart: g.weekStart ?? null,
        streak: g.streak ?? 0,
        recordStreak: g.recordStreak ?? 0,
        linkedHabitId: g.linkedHabitId ?? null,
        weeklyHistory: g.weeklyHistory ?? [],
        createdAt: g.createdAt,
      }))
    )
  );

  return (
    <Screen title="Metas" right={<IconButton icon="add" label="Nova meta" onPress={() => setShowNew(true)} filled />}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile icon="calendar-outline" value={String(weekly.length)} label="Semanais" />
        <StatTile icon="flag-outline" value={String(longTerm.filter(g => !g.completedAt).length)} label="Em andamento" color={theme.accent} />
        <StatTile icon="pulse-outline" value={`${consistency || 0}%`} label="Consistência" color={theme.success} />
      </View>

      <SectionTitle>Metas semanais</SectionTitle>
      {weekly.length === 0 ? (
        <Card>
          <EmptyState icon="calendar-outline" text="Crie uma meta semanal, como “Treinar 4x por semana”." />
        </Card>
      ) : (
        weekly.map(goal => <WeeklyGoalCard key={goal.id} goal={goal} habits={data.habits} />)
      )}

      <SectionTitle>Longo prazo</SectionTitle>
      <Segmented
        options={[
          { value: "all", label: "Todas" },
          { value: "ongoing", label: "Em andamento" },
          { value: "completed", label: "Concluídas" },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {longFiltered.length === 0 ? (
        <Card>
          <EmptyState icon="flag-outline" text="Nenhuma meta aqui ainda." />
        </Card>
      ) : (
        longFiltered.map(goal => <LongTermGoalCard key={goal.id} goal={goal} expanded />)
      )}
      <Txt variant="caption" muted style={{ textAlign: "center" }}>
        Segure uma meta para excluir
      </Txt>

      <NewGoalSheet
        visible={showNew}
        onClose={() => setShowNew(false)}
        isPro={isPro}
        weeklyCount={weekly.length}
        longCount={longTerm.length}
      />
    </Screen>
  );
}

function NewGoalSheet({
  visible,
  onClose,
  isPro,
  weeklyCount,
  longCount,
}: {
  visible: boolean;
  onClose: () => void;
  isPro: boolean;
  weeklyCount: number;
  longCount: number;
}) {
  const theme = useTheme();
  const data = useStore();
  const [type, setType] = useState<"semanal" | "longo_prazo">("semanal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [frequency, setFrequency] = useState(4);
  const [habitId, setHabitId] = useState<string | null>(null);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [steps, setSteps] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setSteps([""]);
    setHabitId(null);
    setHasDeadline(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    if (type === "semanal" && !isPro && weeklyCount >= FREE_LIMITS.weeklyGoals) {
      notifyInfo(`Limite de ${FREE_LIMITS.weeklyGoals} metas semanais atingido no plano Free`);
      return;
    }
    if (type === "longo_prazo" && !isPro && longCount >= FREE_LIMITS.goals) {
      notifyInfo(`Limite de ${FREE_LIMITS.goals} meta de longo prazo atingido no plano Free`);
      return;
    }
    setSaving(true);
    const { error } =
      type === "semanal"
        ? await createGoal({ type, title, description, emoji, color, targetFrequency: frequency, linkedHabitId: habitId })
        : await createGoal({ type, title, description, emoji, color, deadline: hasDeadline ? deadline : undefined, steps });
    setSaving(false);
    if (error) {
      notifyError("Erro ao criar meta", error);
      return;
    }
    notifySuccess("Meta criada!");
    reset();
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nova meta">
      <Segmented
        options={[
          { value: "semanal", label: "Semanal" },
          { value: "longo_prazo", label: "Longo prazo" },
        ]}
        value={type}
        onChange={setType}
      />
      <Input label="Título *" placeholder={type === "semanal" ? "Ex.: Treinar" : "Ex.: Correr uma maratona"} value={title} onChangeText={setTitle} />
      <Input label="Descrição (opcional)" value={description} onChangeText={setDescription} multiline />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {EMOJIS.map(item => (
          <Pressable
            key={item}
            onPress={() => setEmoji(item)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: emoji === item ? theme.primarySoft : "transparent",
              borderWidth: 1,
              borderColor: emoji === item ? theme.primary : theme.border,
            }}
          >
            <Txt style={{ fontSize: 20 }}>{item}</Txt>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {COLORS.map(item => (
          <Pressable
            key={item}
            onPress={() => setColor(item)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: resolveColor(item, theme),
              borderWidth: color === item ? 3 : 0,
              borderColor: theme.ink,
            }}
          />
        ))}
      </View>

      {type === "semanal" ? (
        <>
          <Txt variant="label" muted>
            Quantas vezes por semana?
          </Txt>
          <Segmented options={FREQUENCIES.map(f => ({ value: f, label: `${f}x` }))} value={frequency} onChange={setFrequency} />
          <Txt variant="label" muted>
            Vincular a um hábito (opcional)
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {[{ id: null as string | null, title: "Nenhum", emoji: "—" }, ...data.habits].map(h => (
              <Pressable
                key={h.id ?? "none"}
                onPress={() => setHabitId(h.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: habitId === h.id ? theme.primary : theme.border,
                  backgroundColor: habitId === h.id ? theme.primarySoft : "transparent",
                }}
              >
                <Txt variant="label">
                  {h.emoji} {h.title}
                </Txt>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <Pressable onPress={() => setHasDeadline(v => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={hasDeadline ? "checkbox" : "square-outline"} size={22} color={theme.primary} />
            <Txt>Definir prazo</Txt>
          </Pressable>
          {hasDeadline && <DateStrip value={deadline} onChange={setDeadline} daysBefore={0} daysAfter={365} />}
          <Txt variant="label" muted>
            Etapas
          </Txt>
          {steps.map((step, index) => (
            <View key={index} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder={`Etapa ${index + 1}`}
                  value={step}
                  onChangeText={text => setSteps(prev => prev.map((s, i) => (i === index ? text : s)))}
                />
              </View>
              {steps.length > 1 && (
                <Pressable onPress={() => setSteps(prev => prev.filter((_, i) => i !== index))} hitSlop={8}>
                  <Ionicons name="close-circle" size={24} color={theme.inkMuted} />
                </Pressable>
              )}
            </View>
          ))}
          <Button label="Adicionar etapa" variant="ghost" icon="add" compact onPress={() => setSteps(prev => [...prev, ""])} />
        </>
      )}

      <Button label="Criar meta" onPress={handleSave} loading={saving} disabled={!title.trim()} />
    </Sheet>
  );
}
