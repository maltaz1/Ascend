import { useState } from "react";
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
import { Button, Card, EmptyState, IconButton, Input, Metric, Screen, Segmented, Sheet, Stamp, Txt } from "@/components/ui";
import { EvolutionContent } from "@/components/EvolutionContent";
import { fonts, useTheme } from "@/theme";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function AcademyScreen() {
  return (
    <ProGate section="academy">
      <Academy />
    </ProGate>
  );
}

// Porta de pages/Academy.tsx: abas Treinos / Exercícios / Evolução.
function Academy() {
  const theme = useTheme();
  const data = useStore();
  const [tab, setTab] = useState<"workouts" | "exercises" | "evolution">("workouts");
  const [showNew, setShowNew] = useState(false);
  const [active, setActive] = useState<Workout | null>(null);
  const [selected, setSelected] = useState<Workout | null>(null);
  const [search, setSearch] = useState("");

  const stats = getGymStats();
  const catalog = getCatalogExercises().filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  const confirmDelete = (w: Workout) => {
    Alert.alert("Excluir ficha", `Excluir "${w.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          if (selected?.id === w.id) setSelected(null);
          void deleteWorkout(w.id);
        },
      },
    ]);
  };

  if (active) return <ActiveSession workout={active} onExit={() => setActive(null)} />;

  return (
    <Screen>
      <Segmented
        options={[
          { value: "workouts", label: "Treinos" },
          { value: "exercises", label: "Exercícios" },
          { value: "evolution", label: "Evolução" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "evolution" ? (
        <EvolutionContent />
      ) : tab === "exercises" ? (
        <>
          <Input boxed icon="search" placeholder="Buscar exercício..." value={search} onChangeText={setSearch} />
          <Card style={{ gap: 0 }} padded={false}>
            {catalog.length === 0 ? (
              <EmptyState text="Nenhum exercício encontrado" />
            ) : (
              catalog.map((c, i) => (
                <View
                  key={c.id}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18, borderTopWidth: i ? 1 : 0, borderTopColor: theme.border }}
                >
                  <Txt variant="bodyStrong" style={{ flex: 1 }}>
                    {c.name}
                  </Txt>
                  {c.targetMuscleGroup ? <Stamp label={c.targetMuscleGroup} tone="violet" /> : null}
                </View>
              ))
            )}
          </Card>
        </>
      ) : (
        <>
          <Metric label="" value={String(stats.totalWorkouts)} caption="Treinos Completos" valueColor={theme.primary} center />
          <Metric label="" value={String(stats.totalWorkoutPlans)} caption="Fichas de Treino" valueColor={theme.primary} center />
          <Metric label="" value={String(stats.totalExercises)} caption="Exercícios" valueColor={theme.cyan} center />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
            <Txt variant="h1" style={{ fontSize: 20 }}>
              Fichas de Treino
            </Txt>
            <Button label="Nova Ficha" icon="add" compact onPress={() => setShowNew(true)} />
          </View>

          {data.workouts.length === 0 ? (
            <Card>
              <EmptyState icon="barbell-outline" text="Crie sua primeira ficha de treino." />
            </Card>
          ) : (
            data.workouts.map(w => (
              <Card key={w.id} onPress={() => setSelected(w)} tone={selected?.id === w.id ? "violet" : undefined}>
                <Pressable onLongPress={() => confirmDelete(w)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt variant="h3" style={{ fontSize: 15 }}>
                      {w.name}
                    </Txt>
                    <Txt variant="caption" muted>
                      {(w.daysOfWeek ?? [w.dayOfWeek]).map(d => DAYS[d]).join(", ")} • {w.exercises.length} exercícios
                    </Txt>
                  </View>
                  <Button label="Iniciar" icon="play-outline" variant="orange" compact onPress={() => setActive(w)} />
                </Pressable>
              </Card>
            ))
          )}

          <Card>
            {selected ? (
              <View style={{ gap: 10 }}>
                <Txt variant="h2">{selected.name}</Txt>
                {selected.exercises.map((ex, i) => {
                  const last = getLastExercisePerformance(ex.name);
                  return (
                    <View key={ex.id} style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: theme.raised, borderRadius: 6, padding: 12 }}>
                      <Txt variant="marginalia">{String(i + 1).padStart(2, "0")}</Txt>
                      <View style={{ flex: 1 }}>
                        <Txt variant="bodyStrong">{ex.name}</Txt>
                        <Txt variant="caption" muted>
                          {ex.series} séries · {ex.repMin}-{ex.repMax} reps · {ex.restSeconds}s
                        </Txt>
                      </View>
                      {last ? (
                        <Txt variant="mono" color={theme.accent} style={{ fontSize: 12 }}>
                          {last.weight}kg
                        </Txt>
                      ) : null}
                    </View>
                  );
                })}
                <Txt variant="caption" muted style={{ textAlign: "center" }}>
                  Segure a ficha para excluir
                </Txt>
              </View>
            ) : (
              <Txt muted style={{ textAlign: "center", paddingVertical: 18 }}>
                Selecione uma ficha para ver detalhes
              </Txt>
            )}
          </Card>
        </>
      )}

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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Txt variant="marginalia" style={{ width: 22 }}>
                #
              </Txt>
              <Txt variant="marginalia" style={{ flex: 1 }}>
                Kg
              </Txt>
              <Txt variant="marginalia" style={{ flex: 1 }}>
                Reps
              </Txt>
              <Txt variant="marginalia" style={{ width: 30, textAlign: "center" }}>
                ✓
              </Txt>
            </View>
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
