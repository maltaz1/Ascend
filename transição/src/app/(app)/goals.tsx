import { useState } from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { createGoal } from "@/store/goals.store";
import type { Goal } from "@/lib/store";
import { FREE_LIMITS } from "@/config/planLimits";
import { notifyError, notifyInfo } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, Input, Marginalia, Metric, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { LongTermGoalCard, WeeklyGoalCard, weeklyDays } from "@/components/rows";
import { COMMON_FREQUENCIES, countActiveWeeklyGoals, getWeekConsistencyAverage, type WeeklyGoal } from "@/lib/weeklyGoals";
import { fonts, resolveColor, useTheme } from "@/theme";
import { useNewParam } from "@/hooks/useNewParam";
import { Glyph, stripEmoji } from "@/components/Glyph";

// Mesmos ícones e tintas do formulário do web.
const EMOJIS = ["📚", "🏃", "💼", "💰", "🎯", "💪", "🧘", "✈", "🎨", "💧", "📷", "🎓"];
const COLORS = ["var(--primary)", "var(--accent)", "#a78bfa", "#6d28d9", "#c084fc", "#ddd6fe", "#9333ea", "#6B7280"];

type LongFilter = "all" | "ongoing" | "completed";

function toWeekly(goal: Goal, days: boolean[]): WeeklyGoal {
  return {
    id: goal.id,
    title: goal.title,
    emoji: goal.emoji,
    color: goal.color,
    targetFrequency: goal.targetFrequency ?? 1,
    daysCompletedWeek: days,
    weekStart: goal.weekStart ?? null,
    streak: goal.streak ?? 0,
    recordStreak: goal.recordStreak ?? 0,
    linkedHabitId: goal.linkedHabitId ?? null,
    weeklyHistory: goal.weeklyHistory ?? [],
    createdAt: goal.createdAt,
  };
}

// Porta de pages/Goals.tsx ("Livro de objetivos").
export default function GoalsScreen() {
  const data = useStore();
  const { isPro } = useAuth();
  const [filter, setFilter] = useState<LongFilter>("all");
  const [showNew, setShowNew] = useState(false);
  useNewParam(() => setShowNew(true));

  // Semanais em ordem fixa por título (como o web).
  const weekly = data.goals.filter(g => g.type === "semanal").sort((a, b) => a.title.localeCompare(b.title));
  const longTerm = data.goals.filter(g => !g.type || g.type === "longo_prazo");
  const longFiltered = longTerm.filter(g => (filter === "ongoing" ? !g.completedAt : filter === "completed" ? !!g.completedAt : true));
  const asWeekly = weekly.map(g => toWeekly(g, weeklyDays(g, data.habits)));
  const consistency = getWeekConsistencyAverage(asWeekly);
  const active = countActiveWeeklyGoals(asWeekly);
  const streakTotal = weekly.reduce((s, g) => s + (g.streak ?? 0), 0);

  return (
    <Screen>
      <View style={{ gap: 10, paddingTop: 4 }}>
        <Marginalia>Metas · Livro de objetivos</Marginalia>
        <Txt variant="hero">O que você quer conquistar.</Txt>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Txt muted style={{ flex: 1, lineHeight: 20 }}>
            Metas anotadas a tinta: semanal, de longo prazo e tudo que fica pelo caminho.
          </Txt>
          <Button label="Nova Meta" icon="add" onPress={() => setShowNew(true)} />
        </View>
      </View>

      <View style={{ gap: 4, marginTop: 8 }}>
        <Marginalia index="01">Semanais</Marginalia>
        <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Txt variant="h2">Metas Semanais</Txt>
          <Txt variant="caption" muted>
            Resets a cada segunda-feira
          </Txt>
        </View>
      </View>

      {weekly.length > 0 ? (
        <>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Metric label="Consistência" value={`${consistency}%`} />
            <Metric label="Ativas" value={String(active)} />
            <Metric label="Streak" value={String(streakTotal)} />
          </View>
          {weekly.map(goal => (
            <WeeklyGoalCard key={goal.id} goal={goal} habits={data.habits} />
          ))}
        </>
      ) : (
        <EmptySection
          icon="flash-outline"
          title="Nenhuma meta semanal"
          subtitle="Crie metas que resetam toda semana para construir novos hábitos e consistência."
          actionLabel="Criar Meta Semanal"
          onAction={() => setShowNew(true)}
        />
      )}

      <View style={{ gap: 4, marginTop: 8 }}>
        <Marginalia index="02">Longo prazo</Marginalia>
        <Txt variant="h2">Metas de Longo Prazo</Txt>
      </View>
      <Segmented
        kind="stamp"
        options={[
          { value: "all", label: "Todas" },
          { value: "ongoing", label: "Em andamento" },
          { value: "completed", label: "Concluídas" },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {longFiltered.length === 0 ? (
        <EmptySection
          icon="rocket-outline"
          title="Nenhuma meta de longo prazo"
          subtitle="Defina objetivos grandes e acompanhe seu progresso passo a passo."
          actionLabel="Criar Meta"
          onAction={() => setShowNew(true)}
        />
      ) : (
        longFiltered.map(goal => <LongTermGoalCard key={goal.id} goal={goal} />)
      )}

      <NewGoalSheet visible={showNew} onClose={() => setShowNew(false)} isPro={isPro} weeklyCount={weekly.length} longCount={longTerm.length} />
    </Screen>
  );
}

function EmptySection({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const theme = useTheme();
  return (
    <Card style={{ alignItems: "center", gap: 10, paddingVertical: 28, borderStyle: "dashed" }}>
      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: theme.raised, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <Txt variant="h3">{title}</Txt>
      <Txt variant="caption" muted style={{ textAlign: "center", maxWidth: 300 }}>
        {subtitle}
      </Txt>
      <Button label={actionLabel} icon="add" compact onPress={onAction} />
    </Card>
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
  const [type, setType] = useState<"semanal" | "longo_prazo">("longo_prazo");
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(" ");
  const [color, setColor] = useState(COLORS[0]);
  const [frequency, setFrequency] = useState(4);
  const [habitId, setHabitId] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const tint = resolveColor(color, theme);

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
        ? await createGoal({ type, title, emoji, color, targetFrequency: frequency, linkedHabitId: habitId })
        : await createGoal({ type, title, emoji, color, steps });
    setSaving(false);
    if (error) {
      notifyError("Erro ao criar meta", error);
      return;
    }
    setTitle("");
    setSteps([""]);
    setHabitId(null);
    onClose();
  };

  const choice = (selected: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: selected ? 1.5 : 1,
    borderColor: selected ? tint : theme.border,
    backgroundColor: selected ? `${tint}26` : "transparent",
  });

  return (
    <Sheet visible={visible} onClose={onClose} title="Nova Meta">
      <Marginalia>Tipo de Meta</Marginalia>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(
          [
            { value: "longo_prazo", label: "Longo Prazo", icon: "flag-outline" },
            { value: "semanal", label: "Semanal", icon: "calendar-outline" },
          ] as const
        ).map(option => {
          const selected = type === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setType(option.value)}
              style={{ ...choice(selected), flex: 1, padding: 12, borderRadius: 12, alignItems: "center", gap: 6 }}
            >
              <Ionicons name={option.icon} size={16} color={selected ? tint : theme.inkMuted} />
              <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 13 }} color={selected ? tint : theme.ink}>
                {option.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Marginalia>Ícone</Marginalia>
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
              backgroundColor: emoji === item ? `${theme.accent}26` : "transparent",
              borderWidth: emoji === item ? 2 : 1,
              borderColor: emoji === item ? theme.accent : theme.border,
            }}
          >
            <Glyph emoji={item} size={18} color={emoji === item ? theme.primaryInk : theme.inkMuted} />
          </Pressable>
        ))}
      </View>

      <Marginalia>Cor da tinta</Marginalia>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {COLORS.map(item => (
          <Pressable
            key={item}
            onPress={() => setColor(item)}
            accessibilityLabel={`Cor ${item}`}
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: resolveColor(item, theme), borderWidth: color === item ? 3 : 0, borderColor: theme.ink }}
          />
        ))}
      </View>

      <Input label="Título" placeholder="Ex: Aprender React" value={title} onChangeText={setTitle} />

      {type === "semanal" ? (
        <>
          <Marginalia>Frequência (vezes por semana)</Marginalia>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {COMMON_FREQUENCIES.map(f => (
              <Pressable key={f.value} onPress={() => setFrequency(f.value)} style={choice(frequency === f.value)}>
                <Txt variant="label">{f.label}</Txt>
              </Pressable>
            ))}
          </View>
          {data.habits.length > 0 ? (
            <>
              <Marginalia>Vincular a um hábito (opcional)</Marginalia>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Pressable onPress={() => setHabitId(null)} style={choice(habitId === null)}>
                  <Txt variant="label">Manual</Txt>
                </Pressable>
                {data.habits.map(h => (
                  <Pressable
                    key={h.id}
                    onPress={() => {
                      setHabitId(h.id);
                      setTitle(h.title);
                    }}
                    style={choice(habitId === h.id)}
                  >
                    <Txt variant="label">{h.title}</Txt>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </>
      ) : (
        <>
          <Marginalia>Etapas</Marginalia>
          {steps.map((step, index) => (
            <Input
              key={index}
              placeholder={`Etapa ${index + 1}`}
              value={step}
              onChangeText={text => setSteps(prev => prev.map((s, i) => (i === index ? text : s)))}
            />
          ))}
          <Button label="+ Adicionar Etapa" variant="ghost" compact onPress={() => setSteps(prev => [...prev, ""])} />
        </>
      )}

      <Button label="Criar Meta" onPress={handleSave} loading={saving} disabled={!title.trim()} />
    </Sheet>
  );
}
