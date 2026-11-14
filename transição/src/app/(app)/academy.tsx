import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Alert } from "@/lib/alert";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  addCatalogExercise,
  addWorkout,
  addWorkoutSession,
  deleteCatalogExercise,
  deleteWorkout,
  deleteWorkoutSession,
  getCatalogExercises,
  getGymStats,
  getLastExercisePerformance,
  getWorkoutSessions,
  updateWorkout,
} from "@/store/workouts.store";
import { getTodayString } from "@/lib/store";
import type { Exercise, Workout, WorkoutSet } from "@/store/types";
import { generateId } from "@/store/utils";
import { notifyError, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { ProGate } from "@/components/ProGate";
import { Button, Card, EmptyState, IconButton, Input, Marginalia, Metric, Screen, Segmented, Sheet, Stamp, Txt } from "@/components/ui";
import { EvolutionContent } from "@/components/EvolutionContent";
import { fonts, useTheme } from "@/theme";

// Mesma ordem do web (0 = Segunda … 6 = Domingo): os dias ficam salvos assim no banco.
const DAYS_OF_WEEK = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const XP_PER_WORKOUT = 25;
const SET_TYPES: { value: WorkoutSet["type"]; label: string }[] = [
  { value: "warmup", label: "🔥 Aquecimento" },
  { value: "normal", label: "💪 Normal" },
  { value: "failed", label: "❌ Falhada" },
  { value: "drop", label: "⬇️ Drop" },
];

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

const toInt = (value: string, fallback = 0) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

export default function AcademyScreen() {
  return (
    <ProGate section="academy">
      <Academy />
    </ProGate>
  );
}

type LiveExercise = { id: string; name: string; sets: { weight: string; reps: string; type: WorkoutSet["type"] }[] };
type InProgress = { workoutId: string; workoutName: string; exercises: LiveExercise[]; startTime: number };

// Séries começam com 20 kg x 10 reps, como no web.
function buildSession(workout: Workout): InProgress {
  return {
    workoutId: workout.id,
    workoutName: workout.name,
    exercises: (workout.exercises || []).map(ex => ({
      id: ex.id,
      name: ex.name,
      sets: Array.from({ length: ex.series || 0 }, () => ({ weight: "20", reps: "10", type: "normal" as const })),
    })),
    startTime: Date.now(),
  };
}

// Porta de pages/Academy.tsx: abas Treinos / Exercícios / Evolução.
function Academy() {
  const theme = useTheme();
  const data = useStore();
  const [tab, setTab] = useState<"workouts" | "catalog" | "evolution">("workouts");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewWorkout, setShowNewWorkout] = useState(false);
  const [showNewExercise, setShowNewExercise] = useState(false);
  const [showNewCatalog, setShowNewCatalog] = useState(false);
  const [exerciseToEdit, setExerciseToEdit] = useState<Exercise | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [historyFilter, setHistoryFilter] = useState<"7" | "30" | "90">("30");
  const [inProgress, setInProgress] = useState<InProgress | null>(null);

  const stats = getGymStats();
  const catalog = getCatalogExercises();
  const defaultExercises = catalog.filter(e => e.isBuiltIn);
  const personalExercises = catalog.filter(e => !e.isBuiltIn);
  const workouts = data.workouts;
  const selected = selectedId ? workouts.find(w => w.id === selectedId) ?? null : null;

  const filteredSessions = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(historyFilter, 10));
    return getWorkoutSessions().filter(s => new Date(s.date) >= cutoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, historyFilter]);

  const startWorkout = (workout: Workout) => setInProgress(buildSession(workout));

  const confirmDeleteWorkout = (w: Workout) =>
    Alert.alert("Excluir ficha", `Excluir "${w.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: () => {
          if (selectedId === w.id) setSelectedId(null);
          void deleteWorkout(w.id);
        },
      },
    ]);

  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (inProgress) return <ActiveSession session={inProgress} setSession={setInProgress} />;

  return (
    <Screen>
      <Segmented
        options={[
          { value: "workouts", label: "Treinos" },
          { value: "catalog", label: "Exercícios" },
          { value: "evolution", label: "Evolução" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "evolution" ? (
        <EvolutionContent />
      ) : tab === "catalog" ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <Txt variant="h2" style={{ flex: 1 }}>
              Catálogo de Exercícios
            </Txt>
            <Button label="Novo Exercício" icon="add" compact onPress={() => setShowNewCatalog(true)} />
          </View>
          <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.primary }}>
            <Txt variant="caption" muted style={{ lineHeight: 18 }}>
              Os exercícios mais comuns já estão disponíveis. Crie um novo exercício apenas quando ele não estiver na lista padrão.
            </Txt>
          </Card>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
            <Txt variant="h3">Exercícios padrão</Txt>
            <Txt variant="caption" muted>
              {defaultExercises.length} exercícios
            </Txt>
          </View>
          <Card padded={false} style={{ gap: 0 }}>
            {defaultExercises.map((ex, i) => (
              <View key={ex.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: theme.border }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="bodyStrong">{ex.name}</Txt>
                  {ex.targetMuscleGroup ? (
                    <Txt variant="caption" muted>
                      {ex.targetMuscleGroup}
                    </Txt>
                  ) : null}
                </View>
                <Stamp label="PADRÃO" tone="violet" />
              </View>
            ))}
          </Card>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 8 }}>
            <Txt variant="h3">Meus exercícios</Txt>
            <Txt variant="caption" muted>
              {personalExercises.length} {personalExercises.length === 1 ? "exercício" : "exercícios"}
            </Txt>
          </View>
          {personalExercises.length === 0 ? (
            <Card>
              <Txt variant="caption" muted style={{ textAlign: "center" }}>
                Seus exercícios personalizados aparecerão aqui.
              </Txt>
            </Card>
          ) : (
            <Card padded={false} style={{ gap: 0 }}>
              {personalExercises.map((ex, i) => (
                <View key={ex.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: theme.border }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">{ex.name}</Txt>
                    {ex.targetMuscleGroup ? (
                      <Txt variant="caption" muted>
                        {ex.targetMuscleGroup}
                      </Txt>
                    ) : null}
                  </View>
                  <Pressable onPress={() => void deleteCatalogExercise(ex.id)} hitSlop={8} accessibilityLabel={`Excluir ${ex.name}`}>
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  </Pressable>
                </View>
              ))}
            </Card>
          )}
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
            <Button label="Nova Ficha" icon="add" compact onPress={() => setShowNewWorkout(true)} />
          </View>

          {workouts.length === 0 ? (
            <Card>
              <EmptyState icon="barbell-outline" text="Nenhuma ficha de treino criada" />
            </Card>
          ) : (
            workouts.map(w => (
              <Card key={w.id} onPress={() => setSelectedId(w.id)} tone={selectedId === w.id ? "violet" : undefined}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Txt variant="h3" style={{ fontSize: 15 }}>
                      {w.name}
                    </Txt>
                    <Txt variant="caption" muted>
                      {(w.daysOfWeek ?? [w.dayOfWeek]).map(d => DAYS_OF_WEEK[d]?.substring(0, 3)).join(", ")} • {w.exercises?.length || 0} exercícios
                    </Txt>
                  </View>
                  <Button label="Iniciar" icon="play-outline" variant="orange" compact onPress={() => startWorkout(w)} />
                </View>
              </Card>
            ))
          )}

          {selected ? (
            <WorkoutDetails
              key={`${selected.id}:${selected.name}`}
              workout={selected}
              expanded={expanded}
              onToggleExpand={toggleExpand}
              onDelete={() => confirmDeleteWorkout(selected)}
              onEditExercise={ex => setExerciseToEdit({ ...ex })}
              onAddExercise={() => setShowNewExercise(true)}
            />
          ) : (
            <Card>
              <Txt muted style={{ textAlign: "center", paddingVertical: 18 }}>
                Selecione uma ficha para ver detalhes
              </Txt>
            </Card>
          )}

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <Txt variant="h1" style={{ fontSize: 20 }}>
              Histórico
            </Txt>
          </View>
          <Segmented
            kind="stamp"
            options={[
              { value: "7", label: "Últimos 7 dias" },
              { value: "30", label: "Últimos 30 dias" },
              { value: "90", label: "Últimos 90 dias" },
            ]}
            value={historyFilter}
            onChange={setHistoryFilter}
          />
          {filteredSessions.length === 0 ? (
            <Card>
              <EmptyState icon="calendar-outline" text="Nenhum treino registrado" />
            </Card>
          ) : (
            filteredSessions.map(session => (
              <Card key={session.id}>
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="bodyStrong">{session.workoutName}</Txt>
                    <Txt variant="caption" muted>
                      {new Date(session.date).toLocaleDateString("pt-BR")} • {session.durationMinutes} min
                    </Txt>
                  </View>
                  <Pressable onPress={() => void deleteWorkoutSession(session.id)} hitSlop={8} accessibilityLabel="Excluir treino do histórico">
                    <Ionicons name="trash-outline" size={15} color={theme.danger} />
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <SessionStat label="Volume Total" value={`${(session.totalVolume || 0).toFixed(0)} kg`} color={theme.primary} />
                  <SessionStat label="Exercícios" value={String(session.exercises.length)} color={theme.primary} />
                  <SessionStat label="Séries" value={String(session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0))} color={theme.cyan} />
                </View>
              </Card>
            ))
          )}
        </>
      )}

      <NewWorkoutSheet visible={showNewWorkout} onClose={() => setShowNewWorkout(false)} onCreated={id => setSelectedId(id)} />
      <NewExerciseSheet visible={showNewExercise} onClose={() => setShowNewExercise(false)} workout={selected} />
      <EditExerciseSheet exercise={exerciseToEdit} onChange={setExerciseToEdit} workout={selected} />
      <NewCatalogSheet visible={showNewCatalog} onClose={() => setShowNewCatalog(false)} />
    </Screen>
  );
}

function SessionStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="caption" muted>
        {label}
      </Txt>
      <Txt variant="bodyStrong" color={color}>
        {value}
      </Txt>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Detalhes da ficha: nome, dias, exercícios (expandir, editar, excluir)
// ---------------------------------------------------------------------------

function WorkoutDetails({
  workout,
  expanded,
  onToggleExpand,
  onDelete,
  onEditExercise,
  onAddExercise,
}: {
  workout: Workout;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onDelete: () => void;
  onEditExercise: (exercise: Exercise) => void;
  onAddExercise: () => void;
}) {
  const theme = useTheme();
  const catalog = getCatalogExercises();
  const [name, setName] = useState(workout.name);
  const days = workout.daysOfWeek || [workout.dayOfWeek];

  const commitName = () => {
    if (name.trim() && name !== workout.name) void updateWorkout(workout.id, { name });
  };

  const toggleDay = (idx: number) => {
    const next = days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx].sort();
    void updateWorkout(workout.id, { daysOfWeek: next, dayOfWeek: next[0] || 0 });
  };

  const deleteExercise = (id: string) => void updateWorkout(workout.id, { exercises: (workout.exercises || []).filter(e => e.id !== id) });

  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Txt variant="h3" style={{ flex: 1 }}>
          Detalhes
        </Txt>
        <Pressable onPress={onDelete} hitSlop={8} accessibilityLabel="Excluir ficha">
          <Ionicons name="trash-outline" size={16} color={theme.danger} />
        </Pressable>
      </View>
      <Input label="Nome da Ficha" value={name} onChangeText={setName} onBlur={commitName} onSubmitEditing={commitName} />
      <Marginalia>Dias da Semana</Marginalia>
      <DayPicker value={days} onToggle={toggleDay} />

      <Txt variant="bodyStrong">Exercícios ({workout.exercises?.length || 0})</Txt>
      {(workout.exercises || []).map(ex => {
        const muscle = ex.catalogExerciseId ? catalog.find(c => c.id === ex.catalogExerciseId)?.targetMuscleGroup : undefined;
        const open = expanded.has(ex.id);
        return (
          <View key={ex.id} style={{ backgroundColor: theme.raised, borderRadius: 10, overflow: "hidden" }}>
            <Pressable onPress={() => onToggleExpand(ex.id)} style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 8 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Txt variant="bodyStrong">{ex.name}</Txt>
                  {muscle ? <Stamp label={muscle} tone="violet" /> : null}
                </View>
                <Txt variant="caption" muted>
                  {ex.series}x {ex.repMin}-{ex.repMax}
                </Txt>
              </View>
              <Pressable onPress={() => onEditExercise(ex)} hitSlop={6} accessibilityLabel={`Editar ${ex.name}`} style={{ padding: 4 }}>
                <Ionicons name="create-outline" size={16} color={theme.inkMuted} />
              </Pressable>
              <Pressable onPress={() => deleteExercise(ex.id)} hitSlop={6} accessibilityLabel={`Remover ${ex.name}`} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={16} color={theme.danger} />
              </Pressable>
            </Pressable>
            {open ? (
              <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: theme.border }}>
                <SessionStat label="Séries" value={String(ex.series)} color={theme.ink} />
                <SessionStat label="Reps" value={`${ex.repMin}-${ex.repMax}`} color={theme.ink} />
                <SessionStat label="Descanso" value={`${ex.restSeconds}s`} color={theme.ink} />
              </View>
            ) : null}
          </View>
        );
      })}
      <Button label="Adicionar Exercício" variant="ghost" icon="add" compact onPress={onAddExercise} />
    </Card>
  );
}

function DayPicker({ value, onToggle }: { value: number[]; onToggle: (idx: number) => void }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {DAYS_OF_WEEK.map((day, idx) => {
        const on = value.includes(idx);
        return (
          <Pressable
            key={day}
            onPress={() => onToggle(idx)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: on ? theme.primary : theme.border,
              backgroundColor: on ? theme.primarySoft : "transparent",
            }}
          >
            <Txt style={{ fontFamily: fonts.bodySemi, fontSize: 12 }} color={on ? theme.primaryInk : theme.inkMuted}>
              {day.substring(0, 3)}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Treino em andamento (modal "Treino em Progresso" do web)
// ---------------------------------------------------------------------------

function ActiveSession({ session, setSession }: { session: InProgress; setSession: (s: InProgress | null) => void }) {
  const theme = useTheme();
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const minutes = Math.round((now - session.startTime) / 60000);

  const updateExercise = (exIdx: number, sets: LiveExercise["sets"]) =>
    setSession({ ...session, exercises: session.exercises.map((ex, i) => (i === exIdx ? { ...ex, sets } : ex)) });

  const finish = async () => {
    let totalVolume = 0;
    const exercises = session.exercises.map(ex => {
      const sets: WorkoutSet[] = ex.sets.map(s => ({ weight: parseFloat(s.weight.replace(",", ".")) || 0, reps: toInt(s.reps), type: s.type }));
      const volume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      totalVolume += volume;
      return { exerciseName: ex.name, sets, totalVolume: volume };
    });
    setSaving(true);
    const saved = await addWorkoutSession({
      workoutId: session.workoutId,
      workoutName: session.workoutName,
      date: getTodayString(),
      durationMinutes: Math.max(Math.round((Date.now() - session.startTime) / 60000), 1),
      exercises,
      totalVolume,
    });
    setSaving(false);
    if (!saved) {
      notifyError("Erro ao salvar treino");
      return;
    }
    notifySuccess(`Treino concluído! +${XP_PER_WORKOUT} XP`);
    setSession(null);
  };

  const close = () =>
    Alert.alert("Sair do treino", "O progresso desta sessão será perdido.", [
      { text: "Continuar treinando", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => setSession(null) },
    ]);

  return (
    <Screen title={session.workoutName} subtitle={`EM TREINO · ${minutes} min`} right={<IconButton icon="close" label="Sair do treino" onPress={close} />}>
      {session.exercises.map((exercise, exIdx) => {
        const last = getLastExercisePerformance(exercise.name);
        const lastSets = last?.sets ?? [];
        const volume = exercise.sets.reduce((sum, s) => sum + (parseFloat(s.weight.replace(",", ".")) || 0) * toInt(s.reps), 0);
        return (
          <Card key={exercise.id}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt variant="h3">{exercise.name}</Txt>
                <Txt variant="caption" muted>
                  Volume: <Txt variant="caption" color={theme.primary} style={{ fontFamily: fonts.bodyBold }}>{volume.toFixed(0)}kg</Txt>
                  {"   "}Séries: <Txt variant="caption" color={theme.primary} style={{ fontFamily: fonts.bodyBold }}>{exercise.sets.length}</Txt>
                </Txt>
              </View>
              {lastSets.length > 0 ? <Stamp label={`Último: ${lastSets[0]?.weight}kg`} tone="violet" /> : null}
            </View>

            {lastSets.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {lastSets.map((s, i) => (
                    <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.raised }}>
                      <Txt variant="caption" style={{ fontFamily: fonts.bodySemi }}>
                        {s.weight}kg × {s.reps}
                      </Txt>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : null}

            {exercise.sets.map((set, setIdx) => (
              <View key={setIdx} style={{ gap: 10, padding: 12, borderRadius: 12, backgroundColor: theme.raised }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
                    <Txt style={{ fontFamily: fonts.bodyBold }} color="#fff">
                      {setIdx + 1}
                    </Txt>
                  </View>
                  <Pressable
                    onPress={() => updateExercise(exIdx, exercise.sets.filter((_, i) => i !== setIdx))}
                    accessibilityLabel={`Excluir série ${setIdx + 1}`}
                    style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: `${theme.danger}14`, borderWidth: 1, borderColor: `${theme.danger}33` }}
                  >
                    <Ionicons name="trash-outline" size={14} color={theme.danger} />
                  </Pressable>
                </View>
                <Segmented
                  kind="stamp"
                  options={SET_TYPES}
                  value={set.type}
                  onChange={type => updateExercise(exIdx, exercise.sets.map((s, i) => (i === setIdx ? { ...s, type } : s)))}
                />
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Peso (kg)"
                      value={set.weight}
                      keyboardType="decimal-pad"
                      onChangeText={weight => updateExercise(exIdx, exercise.sets.map((s, i) => (i === setIdx ? { ...s, weight } : s)))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Repetições"
                      value={set.reps}
                      keyboardType="number-pad"
                      onChangeText={reps => updateExercise(exIdx, exercise.sets.map((s, i) => (i === setIdx ? { ...s, reps } : s)))}
                    />
                  </View>
                </View>
              </View>
            ))}
            <Button
              label="+ Adicionar Série"
              variant="ghost"
              compact
              onPress={() => updateExercise(exIdx, [...exercise.sets, { weight: "20", reps: "10", type: "normal" }])}
            />
          </Card>
        );
      })}
      <Button label={`Finalizar Treino (+${XP_PER_WORKOUT} XP)`} icon="checkmark-done" onPress={finish} loading={saving} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Folhas: nova ficha, novo exercício na ficha, editar exercício, catálogo
// ---------------------------------------------------------------------------

function NewWorkoutSheet({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const created = await addWorkout({ name, dayOfWeek: days[0] || 0, daysOfWeek: days.length > 0 ? days : [0], exercises: [] });
    setSaving(false);
    if (!created) {
      notifyError("Erro ao criar ficha");
      return;
    }
    onCreated(created.id);
    setName("");
    setDays([]);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Nova Ficha de Treino">
      <Input label="Nome da Ficha" value={name} onChangeText={setName} placeholder="Ex: Peito + Ombro + Tríceps" />
      <Marginalia>Dias da Semana</Marginalia>
      <DayPicker value={days} onToggle={idx => setDays(prev => (prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx].sort()))} />
      <Button label="Criar Ficha" onPress={save} loading={saving} disabled={!name.trim()} />
    </Sheet>
  );
}

function NumberFields({
  values,
  onChange,
}: {
  values: { series: number; repMin: number; repMax: number; restSeconds: number };
  onChange: (patch: Partial<{ series: number; repMin: number; repMax: number; restSeconds: number }>) => void;
}) {
  const field = (label: string, key: "series" | "repMin" | "repMax" | "restSeconds") => (
    <View style={{ flex: 1 }}>
      <Input label={label} keyboardType="number-pad" value={String(values[key] || "")} onChangeText={t => onChange({ [key]: toInt(t) })} />
    </View>
  );
  return (
    <>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {field("Séries", "series")}
        {field("Reps Mín", "repMin")}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {field("Reps Máx", "repMax")}
        {field("Descanso (s)", "restSeconds")}
      </View>
    </>
  );
}

const EMPTY_EXERCISE = { series: 3, repMin: 8, repMax: 12, restSeconds: 60 };

function NewExerciseSheet({ visible, onClose, workout }: { visible: boolean; onClose: () => void; workout: Workout | null }) {
  const theme = useTheme();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [values, setValues] = useState(EMPTY_EXERCISE);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState("");

  const catalog = getCatalogExercises();
  const q = normalizeSearch(search.trim());
  const filtered = catalog.filter(ex => !q || normalizeSearch(ex.name).includes(q) || normalizeSearch(ex.targetMuscleGroup || "").includes(q));
  const groups = [
    { label: "Exercícios padrão", items: filtered.filter(e => e.isBuiltIn) },
    { label: "Meus exercícios", items: filtered.filter(e => !e.isBuiltIn) },
  ].filter(g => g.items.length > 0);
  const selected = catalog.find(c => c.id === selectedId);

  const close = () => {
    setSearch("");
    setCreating(false);
    onClose();
  };

  const createCatalog = async () => {
    if (!newName.trim()) return;
    const created = await addCatalogExercise({ name: newName, targetMuscleGroup: newMuscle });
    if (created) {
      setSelectedId(created.id);
      setSearch("");
    }
    setNewName("");
    setNewMuscle("");
    setCreating(false);
  };

  const add = () => {
    if (!selected || !workout) return;
    const exercise: Exercise = { ...values, id: generateId(), name: selected.name, catalogExerciseId: selected.id };
    void updateWorkout(workout.id, { exercises: [...(workout.exercises || []), exercise] });
    setValues(EMPTY_EXERCISE);
    setSelectedId("");
    close();
  };

  return (
    <Sheet visible={visible} onClose={close} title="Novo Exercício">
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Marginalia>Exercício do Catálogo</Marginalia>
        <Pressable onPress={() => setCreating(v => !v)}>
          <Stamp label="+ Criar Novo" tone="violet" />
        </Pressable>
      </View>

      {creating ? (
        <Card style={{ gap: 10 }}>
          <Input label="Nome do Exercício" placeholder="Ex: Supino Reto" value={newName} onChangeText={setNewName} />
          <Input label="Grupo Muscular" placeholder="Ex: Peito" value={newMuscle} onChangeText={setNewMuscle} />
          <Button label="Adicionar ao Catálogo" compact onPress={createCatalog} disabled={!newName.trim()} />
        </Card>
      ) : null}

      {selected ? (
        <Pressable onPress={() => setSelectedId("")} style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.primarySoft }}>
          <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
          <Txt variant="bodyStrong" style={{ flex: 1 }}>
            {selected.name} {selected.targetMuscleGroup ? `(${selected.targetMuscleGroup})` : ""}
          </Txt>
          <Ionicons name="close" size={16} color={theme.inkMuted} />
        </Pressable>
      ) : (
        <>
          <Input
            icon="search"
            placeholder="Pesquisar por nome ou grupo muscular..."
            accessibilityLabel="Pesquisar exercício"
            value={search}
            onChangeText={t => {
              setSearch(t);
              setSelectedId("");
            }}
          />
          <View style={{ maxHeight: 260, borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: "hidden" }}>
            <ScrollView nestedScrollEnabled>
              {groups.length === 0 ? (
                <Txt variant="caption" muted style={{ padding: 12 }}>
                  Nenhum exercício encontrado
                </Txt>
              ) : (
                groups.map(g => (
                  <View key={g.label}>
                    <Txt variant="marginalia" style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 }}>
                      {g.label}
                    </Txt>
                    {g.items.map(ex => (
                      <Pressable
                        key={ex.id}
                        onPress={() => {
                          setSelectedId(ex.id);
                          setSearch("");
                        }}
                        style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: pressed ? theme.raised : "transparent" })}
                      >
                        <Txt variant="label">
                          {ex.name} {ex.targetMuscleGroup ? `(${ex.targetMuscleGroup})` : ""}
                        </Txt>
                      </Pressable>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
          {search.trim() ? (
            <Txt variant="caption" muted>
              {filtered.length} {filtered.length === 1 ? "resultado encontrado" : "resultados encontrados"}
            </Txt>
          ) : null}
        </>
      )}

      <NumberFields values={values} onChange={patch => setValues(v => ({ ...v, ...patch }))} />
      <Button label="Adicionar à Ficha" onPress={add} disabled={!selected || !workout} />
    </Sheet>
  );
}

function EditExerciseSheet({ exercise, onChange, workout }: { exercise: Exercise | null; onChange: (e: Exercise | null) => void; workout: Workout | null }) {
  const save = () => {
    if (!exercise || !workout) return;
    void updateWorkout(workout.id, { exercises: (workout.exercises || []).map(ex => (ex.id === exercise.id ? exercise : ex)) });
    onChange(null);
  };
  return (
    <Sheet visible={!!exercise} onClose={() => onChange(null)} title="Editar Exercício">
      {exercise ? (
        <>
          <Input label="Nome do Exercício" value={exercise.name} onChangeText={name => onChange({ ...exercise, name })} />
          <NumberFields values={exercise} onChange={patch => onChange({ ...exercise, ...patch })} />
          <Button label="Salvar Alterações" onPress={save} />
        </>
      ) : null}
    </Sheet>
  );
}

function NewCatalogSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [muscle, setMuscle] = useState("");
  const save = async () => {
    if (!name.trim()) return;
    await addCatalogExercise({ name, targetMuscleGroup: muscle });
    setName("");
    setMuscle("");
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Novo Exercício no Catálogo">
      <Input label="Nome do Exercício" placeholder="Ex: Supino Reto" value={name} onChangeText={setName} />
      <Input label="Grupo Muscular" placeholder="Ex: Peito" value={muscle} onChangeText={setMuscle} />
      <Button label="Adicionar ao Catálogo" onPress={save} disabled={!name.trim()} />
    </Sheet>
  );
}
