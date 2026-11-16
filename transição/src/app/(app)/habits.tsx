import { useEffect, useState } from "react";
import { Pressable, ScrollView, View, Animated } from "react-native";
import { Alert } from "@/lib/alert";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  createHabit,
  editHabit,
  getDailyHabitData,
  getHabitMonthProgress,
  getHabitMonthRate,
  getHabitStreak,
  getTodayString,
  getWeeklyHabitData,
  removeHabit,
  type Habit,
} from "@/lib/store";
import { FREE_LIMITS } from "@/config/planLimits";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { useInitialScroll } from "@/hooks/useInitialScroll";
import { useAuth } from "@/hooks/useAuth";
import { Button, Card, EmptyState, Fab, IconBox, IconButton, Input, Marginalia, Metric, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { AreaChart } from "@/components/charts";
import { toggleHabitWithGoals } from "@/components/rows";
import { AttributePicker } from "@/components/AttributePicker";
import { ACTION_LABEL, formatTag, parseTag, type ActionId, type AttrId } from "@/lib/attributes";
import { fonts, resolveColor, useTheme } from "@/theme";
import { useNewParam } from "@/hooks/useNewParam";
import { useCheckPop } from "@/lib/motion";
import { exportJson } from "@/lib/exportData";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const EMOJIS = ["🏃", "📚", "💪", "🧘", "💧", "🥗", "😴", "✍️", "🎵", "🧹", "💊", "🌿", "🧠", "🙏", "🎯"];
// Mesmas "tintas" do formulário do web.
const COLORS = ["var(--accent)", "var(--primary)", "#10B981", "#3B82F6", "#EF4444", "#EC4899", "#06B6D4"];
const WEEK_DAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

// Visão escolhida (cards ou tabela) dura a sessão, como o sessionStorage do web.
let sessionViewMode: "cards" | "table" = "table";

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
  const [editing, setEditing] = useState<Habit | null>(null);
  const [viewMode, setViewModeState] = useState<"cards" | "table">(sessionViewMode);
  const setViewMode = (mode: "cards" | "table") => {
    sessionViewMode = mode;
    setViewModeState(mode);
  };

  const today = getTodayString();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const habits = data.habits.filter(h => h.title.toLowerCase().includes(search.trim().toLowerCase()));
  // Estatísticas e gráfico seguem a busca, como no web.
  const doneToday = habits.filter(h => h.completedDates.includes(today)).length;
  const rate = habits.length ? Math.round(habits.reduce((acc, h) => acc + getHabitMonthRate(h, year, month), 0) / habits.length) : 0;

  const chartData =
    period === "daily"
      ? getDailyHabitData(year, month, habits).map(d => ({ label: String(d.day), count: d.count }))
      : getWeeklyHabitData(year, month, habits).map(d => ({ label: d.week, count: d.count }));

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const exportData = () => void exportJson("habits.json", { date: new Date().toISOString(), habits });

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
  useNewParam(openNew);


  // Abre a tabela já mostrando os últimos dias até hoje.
  const [daysRef, onDaysSize] = useInitialScroll(isCurrentMonth ? Math.max(0, (now.getDate() - 4) * (CELL + 12)) : 0);

  const dayKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <Screen title="Hábitos" subtitle="Consistência é tudo" fab={<Fab label="Novo hábito" onPress={openNew} />}>
      <Segmented
        options={[
          { value: "cards", label: "Cards", icon: "grid-outline" },
          { value: "table", label: "Tabela", icon: "list-outline" },
        ]}
        value={viewMode}
        onChange={setViewMode}
      />

      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Input boxed icon="search" placeholder="Buscar..." value={search} onChangeText={setSearch} />
        </View>
        <IconButton icon="download-outline" label="Exportar hábitos" onPress={exportData} />
      </View>

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
          <View style={{ flex: 1 }}>
            <Txt variant="h2">Consistência em foco</Txt>
            <Txt variant="caption" muted>
              {period === "daily" ? "Seu ritmo dia a dia neste mês" : "Evolução semanal dos seus hábitos"}
            </Txt>
          </View>
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
        <AreaChart
          data={chartData}
          series={[{ key: "count", label: "Hábitos concluídos", color: theme.primary }]}
          height={210}
          tooltipTitle={d => (period === "daily" ? `${d.label} de ${MONTHS[month].toLowerCase()}` : `Semana ${d.label}`)}
        />
      </Card>

      {habits.length === 0 ? (
        <Card>
          <EmptyState icon="flame-outline" text={search ? "Nenhum hábito encontrado" : "Nenhum hábito criado"} />
          <Txt variant="caption" muted style={{ textAlign: "center" }}>
            {search ? "Tente buscar por outro termo." : "Hábitos são o alicerce da sua evolução. Comece criando seu primeiro hábito e construa sua streak!"}
          </Txt>
          {!search && <Button label="+ Criar primeiro hábito" onPress={openNew} />}
        </Card>
      ) : viewMode === "cards" ? (
        <View style={{ gap: 12 }}>
          {habits.map(habit => (
            <HabitCardView key={habit.id} habit={habit} year={year} month={month} daysInMonth={daysInMonth} onDelete={() => confirmDelete(habit)} onEdit={() => setEditing(habit)} />
          ))}
        </View>
      ) : (
      <Card padded={false} style={{ overflow: "hidden" }}>
        {(
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
                      <Pressable onPress={() => setEditing(habit)} hitSlop={8} accessibilityLabel="Editar hábito">
                        <Ionicons name="create-outline" size={15} color={theme.inkMuted} />
                      </Pressable>
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
            <ScrollView style={{ flex: 1 }} horizontal showsHorizontalScrollIndicator={false} ref={daysRef} onContentSizeChange={onDaysSize}>
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
                            <HabitDot done={done} color={color} today={key === today} future={future} />
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
      )}

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric label="Hoje" value={String(doneToday)} valueColor={theme.accent} center />
        <Metric label="Taxa" value={`${rate}%`} valueColor={theme.success} center />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric label="Hábitos" value={String(habits.length)} valueColor={theme.primary} center />
        <View style={{ flex: 1 }} />
      </View>
      {!isPro && (
        <Txt variant="caption" muted style={{ textAlign: "center" }}>
          {data.habits.length}/{FREE_LIMITS.habits} hábitos no plano grátis
        </Txt>
      )}

      <HabitSheet visible={showNew || !!editing} habit={editing} onClose={() => { setShowNew(false); setEditing(null); }} isPro={isPro} habitCount={data.habits.length} />
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

function HabitSheet({ visible, onClose, isPro, habitCount, habit }: { visible: boolean; onClose: () => void; isPro: boolean; habitCount: number; habit?: Habit | null }) {
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [targetDays, setTargetDays] = useState(30);
  const [attrId, setAttrId] = useState<AttrId | null>(null);
  const [action, setAction] = useState<ActionId>("habito");
  const [saving, setSaving] = useState(false);

  // Ao abrir, preenche com o hábito em edição (ou limpa, para um novo).
  useEffect(() => {
    if (!visible) return;
    const tag = parseTag(habit?.category);
    setTitle(habit?.title ?? "");
    setEmoji(habit?.emoji ?? EMOJIS[0]);
    setColor(habit?.color ?? COLORS[0]);
    setTargetDays(habit?.targetDays ?? 30);
    setAttrId(tag?.attr.id ?? null);
    setAction(tag?.action ?? "habito");
  }, [visible, habit]);

  const handleSave = async () => {
    if (!title.trim()) return;
    if (!habit && !isPro && habitCount >= FREE_LIMITS.habits) {
      notifyInfo(`Plano grátis permite apenas ${FREE_LIMITS.habits} hábitos`);
      return;
    }
    setSaving(true);
    const category = attrId ? formatTag(attrId, action) : null;
    const { error } = habit ? await editHabit(habit.id, { title, emoji, color, targetDays, category }) : await createHabit({ title, emoji, color, targetDays, category });
    setSaving(false);
    if (error) {
      notifyError(habit ? "Erro ao salvar hábito" : "Erro ao criar hábito", error);
      return;
    }
    notifySuccess(habit ? "Hábito atualizado!" : "Hábito criado!");
    setTitle("");
    setEmoji(EMOJIS[0]);
    setColor(COLORS[0]);
    setTargetDays(30);
    setAttrId(null);
    setAction("habito");
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={habit ? "Editar Hábito" : "Novo Hábito"}>
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
      <Marginalia>Meta mensal · {targetDays} dias</Marginalia>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconButton icon="remove" label="Diminuir meta" onPress={() => setTargetDays(d => Math.max(1, d - 1))} />
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.track, overflow: "hidden" }}>
          <View style={{ width: `${(targetDays / 31) * 100}%`, height: 6, backgroundColor: theme.primary }} />
        </View>
        <IconButton icon="add" label="Aumentar meta" onPress={() => setTargetDays(d => Math.min(31, d + 1))} />
      </View>
      <AttributePicker attrId={attrId} action={action} onAttr={setAttrId} onAction={setAction} what="hábito" />
      <Button label={habit ? "Salvar" : "Criar Hábito"} onPress={handleSave} loading={saving} disabled={!title.trim()} />
    </Sheet>
  );
}

// Bolinha do dia no quadro do mês; "pula" ao ser marcada.
function HabitDot({ done, color, today, future }: { done: boolean; color: string; today: boolean; future: boolean }) {
  const theme = useTheme();
  const scale = useCheckPop(done);
  return (
    <Animated.View
      style={{
        width: done ? 22 : 14,
        height: done ? 22 : 14,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: done ? color : theme.track,
        borderWidth: today && !done ? 1.5 : 0,
        borderColor: theme.accent,
        opacity: future ? 0.35 : 1,
        transform: [{ scale }],
      }}
    >
      {done ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
    </Animated.View>
  );
}

// Visão em cards (HabitCard do web): emoji, streak, progresso, taxa do mês e faixa de dias.
function HabitCardView({
  habit,
  year,
  month,
  daysInMonth,
  onDelete,
  onEdit,
}: {
  habit: Habit;
  year: number;
  month: number;
  daysInMonth: number;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const theme = useTheme();
  const today = getTodayString();
  const color = resolveColor(habit.color, theme);
  const progress = getHabitMonthProgress(habit, year, month);
  const rate = getHabitMonthRate(habit, year, month);
  const streak = getHabitStreak(habit);
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const [railRef, onRailSize] = useInitialScroll(isCurrentMonth ? Math.max(0, (now.getDate() - 5) * 44) : 0);
  const tag = parseTag(habit.category);

  return (
    <Card style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: `${color}1a` }}>
          <Txt style={{ fontSize: 20 }}>{habit.emoji}</Txt>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="bodyStrong" numberOfLines={1}>
            {habit.title}
          </Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <Ionicons name="flame" size={12} color={theme.accent} />
            <Txt variant="caption" color={theme.accent} style={{ fontFamily: fonts.bodyBold }}>
              {streak}d
            </Txt>
            <Txt variant="caption" muted>
              •
            </Txt>
            <Txt variant="caption" color={color} style={{ fontFamily: fonts.bodyBold }}>
              {progress}/{daysInMonth}
            </Txt>
            <Txt variant="caption" muted>
              • {rate}% no mês
            </Txt>
          </View>
        </View>
        <Pressable onPress={onEdit} hitSlop={8} accessibilityLabel={`Editar hábito ${habit.title}`}>
          <Ionicons name="create-outline" size={16} color={theme.inkMuted} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel={`Remover hábito ${habit.title}`}>
          <Ionicons name="trash-outline" size={16} color={theme.inkMuted} />
        </Pressable>
      </View>

      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Atributo do hábito"
        style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: tag ? tag.attr.color : theme.border, backgroundColor: tag ? `${tag.attr.color}22` : "transparent" }}
      >
        <Ionicons name={(tag ? tag.attr.icon : "sparkles-outline") as never} size={13} color={tag ? tag.attr.ink : theme.inkMuted} />
        <Txt variant="caption" color={tag ? tag.attr.ink : theme.inkMuted} style={{ fontFamily: fonts.bodySemi }}>
          {tag ? `${tag.attr.name} · ${ACTION_LABEL[tag.action]}` : "+ Atributo"}
        </Txt>
      </Pressable>

      <Marginalia>Atividade no mês</Marginalia>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={railRef} onContentSizeChange={onRailSize}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const done = habit.completedDates.includes(key);
            const future = key > today;
            const current = key === today;
            const weekday = WEEK_DAYS[new Date(year, month, day).getDay()];
            return (
              <Pressable
                key={key}
                disabled={future}
                onPress={() => void toggleHabitWithGoals(habit, key)}
                accessibilityLabel={`${habit.title} — ${weekday}, dia ${day}`}
                accessibilityState={{ checked: done }}
                style={{
                  width: 40,
                  paddingVertical: 8,
                  borderRadius: 12,
                  alignItems: "center",
                  gap: 4,
                  borderWidth: 1,
                  borderColor: current ? theme.accent : "transparent",
                  opacity: future ? 0.35 : 1,
                }}
              >
                <Txt variant="caption" muted style={{ fontSize: 10 }}>
                  {weekday}
                </Txt>
                <Txt variant="caption" style={{ fontFamily: fonts.bodyBold }}>
                  {day}
                </Txt>
                <HabitDot done={done} color={color} today={false} future={false} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.track, overflow: "hidden" }}>
        <View style={{ width: `${daysInMonth > 0 ? Math.round((progress / daysInMonth) * 100) : 0}%`, height: 6, backgroundColor: color }} />
      </View>
    </Card>
  );
}
