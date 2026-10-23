import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  addWorkout,
  addWorkoutSession,
  deleteWorkout,
  getCatalogExercises,
  getGymStats,
  getLastExercisePerformance,
} from "@/store/workouts.store";
import { getTodayString } from "@/lib/store";
import type { Exercise, Workout, WorkoutSet } from "@/store/types";
import { generateId } from "@/store/utils";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { ProGate } from "@/components/ProGate";
import { Button, Card, EmptyState, IconButton, Input, Screen, SectionTitle, Segmented, Sheet, StatTile, Txt } from "@/components/ui";
import { LineChart } from "@/components/charts";
import { fonts, useTheme } from "@/theme";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AcademyScreen() {
  return (
    <ProGate section="academy">
      <Academy />
    </ProGate>
  );
}

// Porta de pages/Academy.tsx: fichas, sessão de treino, histórico e progresso.
function Academy() {
  const theme = useTheme();
  const data = useStore();
  const [showNew, setShowNew] = useState(false);
  const [active, setActive] = useState<Workout | null>(null);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const stats = getGymStats();
  const weekday = new Date().getDay();
  const todays = data.workouts.filter(w => (w.daysOfWeek ?? [w.dayOfWeek]).includes(weekday));

  const sessions = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - period);
    return [...data.workoutSessions]
      .filter(s => new Date(s.completedAt || s.date) >= since)
      .sort((a, b) => (a.completedAt || a.date).localeCompare(b.completedAt || b.date));
  }, [data.workoutSessions, period]);
  const volume = sessions.reduce((s, x) => s + (x.totalVolume || 0), 0);

  const confirmDelete = (w: Workout) => {
    Alert.alert("Excluir ficha", `Excluir "${w.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => void deleteWorkout(w.id) },
    ]);
  };

  if (active) return <ActiveSession workout={active} onExit={() => setActive(null)} />;

  return (
    <Screen back title="Academia" right={<IconButton icon="add" label="Nova ficha" onPress={() => setShowNew(true)} filled />}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile icon="barbell-outline" value={String(stats.totalWorkouts)} label="Treinos feitos" />
        <StatTile icon="list-outline" value={String(stats.totalWorkoutPlans)} label="Fichas" color={theme.accent} />
        <StatTile icon="fitness-outline" value={String(stats.totalExercises)} label="Exercícios" color={theme.success} />
      </View>

      <SectionTitle>Treino de hoje · {DAYS[weekday]}</SectionTitle>
      {todays.length === 0 ? (
        <Card>
          <EmptyState icon="bed-outline" text="Nenhuma ficha para hoje. Dia de descanso?" />
        </Card>
      ) : (
        todays.map(w => (
          <Card key={w.id} accent={theme.primary}>
            <Txt variant="h3">{w.name}</Txt>
            <Txt variant="caption" muted>
              {w.exercises.length} exercícios
            </Txt>
            <Button label="Começar treino" icon="play" onPress={() => setActive(w)} />
          </Card>
        ))
      )}

      <SectionTitle>Minhas fichas</SectionTitle>
      {data.workouts.length === 0 ? (
        <Card>
          <EmptyState icon="barbell-outline" text="Crie sua primeira ficha de treino." />
          <Button label="Nova ficha" icon="add" variant="soft" onPress={() => setShowNew(true)} />
        </Card>
      ) : (
        data.workouts.map(w => (
          <Card key={w.id} onPress={() => setActive(w)}>
            <Pressable onLongPress={() => confirmDelete(w)} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Txt variant="h3">{w.name}</Txt>
                <Ionicons name="play-circle" size={26} color={theme.primary} />
              </View>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {(w.daysOfWeek ?? [w.dayOfWeek]).map(d => (
                  <View key={d} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: theme.primarySoft }}>
                    <Txt variant="caption" color={theme.primaryInk}>
                      {DAYS[d]}
                    </Txt>
                  </View>
                ))}
              </View>
              {w.exercises.map(ex => (
                <Txt key={ex.id} variant="label" muted>
                  • {ex.name} — {ex.series}x {ex.repMin}-{ex.repMax}
                </Txt>
              ))}
            </Pressable>
          </Card>
        ))
      )}

      <SectionTitle>Progresso</SectionTitle>
      <Segmented
        options={[
          { value: 7, label: "7 dias" },
          { value: 30, label: "30 dias" },
          { value: 90, label: "90 dias" },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Txt variant="label" muted>
            {sessions.length} treinos
          </Txt>
          <Txt variant="label" muted>
            Volume: {Math.round(volume).toLocaleString("pt-BR")} kg
          </Txt>
        </View>
        {sessions.length > 1 ? (
          <LineChart
            data={sessions.map(s => ({
              label: new Date(s.completedAt || s.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
              volume: s.totalVolume || 0,
            }))}
            series={[{ key: "volume", label: "Volume", color: theme.primary }]}
          />
        ) : (
          <EmptyState text="Faça pelo menos dois treinos para ver o gráfico." />
        )}
        {[...sessions].reverse().slice(0, 6).map(s => (
          <View key={s.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt variant="label">{s.workoutName}</Txt>
            <Txt variant="caption" muted>
              {new Date(s.completedAt || s.date).toLocaleDateString("pt-BR")} · {s.durationMinutes} min ·{" "}
              {Math.round(s.totalVolume || 0)} kg
            </Txt>
          </View>
        ))}
      </Card>

      <NewWorkoutSheet visible={showNew} onClose={() => setShowNew(false)} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Sessão em andamento
// ---------------------------------------------------------------------------

type LiveSet = { weight: string; reps: string; done: boolean };

function ActiveSession({ workout, onExit }: { workout: Workout; onExit: () => void }) {
  const theme = useTheme();
  const [startedAt] = useState(() => Date.now());
  const [saving, setSaving] = useState(false);
  const [sets, setSets] = useState<Record<string, LiveSet[]>>(() =>
    Object.fromEntries(
      workout.exercises.map(ex => {
        const last = getLastExercisePerformance(ex.name);
        return [
          ex.id,
          Array.from({ length: ex.series || 3 }, (_, i) => ({
            weight: String(last?.sets?.[i]?.weight ?? last?.weight ?? ""),
            reps: String(last?.sets?.[i]?.reps ?? ex.repMax ?? ""),
            done: false,
          })),
        ];
      })
    )
  );

  const update = (exId: string, index: number, patch: Partial<LiveSet>) =>
    setSets(prev => ({ ...prev, [exId]: prev[exId].map((s, i) => (i === index ? { ...s, ...patch } : s)) }));

  const finish = async () => {
    const exercises = workout.exercises
      .map(ex => {
        const done: WorkoutSet[] = (sets[ex.id] ?? [])
          .filter(s => s.done)
          .map(s => ({ weight: Number(s.weight.replace(",", ".")) || 0, reps: Number(s.reps) || 0, type: "normal" }));
        return { exerciseName: ex.name, sets: done, totalVolume: done.reduce((v, s) => v + s.weight * s.reps, 0) };
      })
      .filter(ex => ex.sets.length > 0);

    if (exercises.length === 0) {
      notifyError("Marque pelo menos uma série como feita");
      return;
    }
    setSaving(true);
    const saved = await addWorkoutSession({
      workoutId: workout.id,
      workoutName: workout.name,
      date: getTodayString(),
      durationMinutes: Math.max(1, Math.round((Date.now() - startedAt) / 60000)),
      exercises,
      totalVolume: exercises.reduce((v, ex) => v + ex.totalVolume, 0),
    });
    setSaving(false);
    if (!saved) {
      notifyError("Erro ao salvar treino");
      return;
    }
    notifySuccess("Treino concluído! +25 XP");
    onExit();
  };

  const cancel = () =>
    Alert.alert("Sair do treino", "O progresso desta sessão será perdido.", [
      { text: "Continuar treinando", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: onExit },
    ]);

  return (
    <Screen title={workout.name} subtitle="Sessão em andamento" right={<IconButton icon="close" label="Sair do treino" onPress={cancel} />}>
      {workout.exercises.map(ex => {
        const last = getLastExercisePerformance(ex.name);
        return (
          <Card key={ex.id}>
            <Txt variant="h3">{ex.name}</Txt>
            <Txt variant="caption" muted>
              {ex.series}x {ex.repMin}-{ex.repMax} reps · descanso {ex.restSeconds}s
              {last ? ` · última vez: ${last.weight} kg x ${last.reps}` : ""}
            </Txt>
            {(sets[ex.id] ?? []).map((s, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Txt variant="label" muted style={{ width: 22, fontFamily: fonts.bodySemi }}>
                  {i + 1}
                </Txt>
                <View style={{ flex: 1 }}>
                  <Input value={s.weight} onChangeText={t => update(ex.id, i, { weight: t })} placeholder="kg" keyboardType="decimal-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input value={s.reps} onChangeText={t => update(ex.id, i, { reps: t })} placeholder="reps" keyboardType="number-pad" />
                </View>
                <Pressable onPress={() => update(ex.id, i, { done: !s.done })} hitSlop={8} accessibilityLabel={`Série ${i + 1} feita`}>
                  <Ionicons name={s.done ? "checkmark-circle" : "ellipse-outline"} size={30} color={s.done ? theme.success : theme.inkMuted} />
                </Pressable>
              </View>
            ))}
            <Button
              label="Adicionar série"
              variant="ghost"
              icon="add"
              compact
              onPress={() => setSets(prev => ({ ...prev, [ex.id]: [...(prev[ex.id] ?? []), { weight: "", reps: "", done: false }] }))}
            />
          </Card>
        );
      })}
      <Button label="Concluir treino" icon="checkmark-done" onPress={finish} loading={saving} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Nova ficha
// ---------------------------------------------------------------------------

function NewWorkoutSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([new Date().getDay()]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [series, setSeries] = useState("3");
  const [repMin, setRepMin] = useState("8");
  const [repMax, setRepMax] = useState("12");
  const [rest, setRest] = useState("60");
  const [saving, setSaving] = useState(false);

  const catalog = getCatalogExercises();
  const matches = search.trim().length >= 2 ? catalog.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8) : [];

  const addExercise = (exerciseName: string, catalogExerciseId?: string) => {
    setExercises(prev => [
      ...prev,
      {
        id: generateId(),
        name: exerciseName,
        series: Number(series) || 3,
        repMin: Number(repMin) || 8,
        repMax: Number(repMax) || 12,
        restSeconds: Number(rest) || 60,
        catalogExerciseId,
      },
    ]);
    setSearch("");
  };

  const save = async () => {
    if (!name.trim() || days.length === 0) return;
    setSaving(true);
    const created = await addWorkout({ name: name.trim(), dayOfWeek: days[0], daysOfWeek: days, exercises });
    setSaving(false);
    if (!created) {
      notifyError("Erro ao criar ficha");
      return;
    }
    notifySuccess("Ficha criada!");
    setName("");
    setExercises([]);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nova ficha">
      <Input label="Nome da ficha" value={name} onChangeText={setName} placeholder="Ex.: Treino A — Peito e tríceps" />
      <Txt variant="label" muted>
        Dias da semana
      </Txt>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {DAYS.map((d, i) => {
          const on = days.includes(i);
          return (
            <Pressable
              key={d}
              onPress={() => setDays(prev => (on ? prev.filter(x => x !== i) : [...prev, i].sort()))}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: "center",
                borderWidth: 1,
                borderColor: on ? theme.primary : theme.border,
                backgroundColor: on ? theme.primarySoft : "transparent",
              }}
            >
              <Txt variant="caption" color={on ? theme.primaryInk : theme.inkMuted}>
                {d}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Txt variant="label" muted>
        Exercícios
      </Txt>
      {exercises.map(ex => (
        <View key={ex.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Txt variant="label" style={{ flex: 1 }}>
            {ex.name} — {ex.series}x {ex.repMin}-{ex.repMax} · {ex.restSeconds}s
          </Txt>
          <Pressable onPress={() => setExercises(prev => prev.filter(x => x.id !== ex.id))} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={theme.inkMuted} />
          </Pressable>
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Input label="Séries" value={series} onChangeText={setSeries} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Reps mín" value={repMin} onChangeText={setRepMin} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Reps máx" value={repMax} onChangeText={setRepMax} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Desc. (s)" value={rest} onChangeText={setRest} keyboardType="number-pad" />
        </View>
      </View>
      <Input label="Exercício do catálogo" value={search} onChangeText={setSearch} placeholder="Buscar (ex.: supino)" />
      {matches.map(m => (
        <Pressable
          key={m.id}
          onPress={() => addExercise(m.name, m.id)}
          style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}
        >
          <Txt variant="label">{m.name}</Txt>
          <Txt variant="caption" muted>
            {m.targetMuscleGroup}
          </Txt>
        </Pressable>
      ))}
      {search.trim().length >= 2 && (
        <Button label={`Adicionar "${search.trim()}"`} variant="ghost" icon="add" compact onPress={() => addExercise(search.trim())} />
      )}
      <Button label="Criar ficha" onPress={save} loading={saving} disabled={!name.trim() || days.length === 0} />
    </Sheet>
  );
}
