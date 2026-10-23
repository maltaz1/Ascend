import { useMemo, useState } from "react";
import { ScrollView, Pressable, View } from "react-native";
import { getExerciseProgressData, getWorkoutProgressData } from "@/store/workouts.store";
import { useStore } from "@/hooks/useStore";
import { ProGate } from "@/components/ProGate";
import { Card, EmptyState, Screen, SectionTitle, StatTile, Txt } from "@/components/ui";
import { BarChart, LineChart } from "@/components/charts";
import { useTheme } from "@/theme";

export default function EvolutionScreen() {
  return (
    <ProGate section="evolution">
      <Evolution />
    </ProGate>
  );
}

const short = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

// Porta de pages/Evolution.tsx: evolução de carga e volume por exercício.
function Evolution() {
  const theme = useTheme();
  const data = useStore();
  const sessions = data.workoutSessions;

  const exercises = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => s.exercises.forEach(e => set.add(e.exerciseName)));
    return [...set].sort();
  }, [sessions]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = selected ?? exercises[0] ?? null;

  const general = getWorkoutProgressData();
  const progress = current ? getExerciseProgressData(current) : [];

  const totalVolume = sessions.reduce((s, x) => s + (x.totalVolume || 0), 0);
  const totalSets = sessions.reduce((s, x) => s + x.exercises.reduce((a, e) => a + e.sets.length, 0), 0);
  const best = progress.reduce((m, p) => Math.max(m, p.weight), 0);

  if (sessions.length === 0) {
    return (
      <Screen back title="Evolução">
        <Card>
          <EmptyState icon="trending-up-outline" text="Registre treinos na Academia para acompanhar sua evolução." />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen back title="Evolução" subtitle="Carga e volume ao longo do tempo">
      <View style={{ flexDirection: "row", gap: 10 }}>
        <StatTile icon="barbell-outline" value={String(sessions.length)} label="Treinos realizados" />
        <StatTile icon="layers-outline" value={String(totalSets)} label="Séries" color={theme.accent} />
      </View>
      <StatTile icon="stats-chart-outline" value={`${Math.round(totalVolume).toLocaleString("pt-BR")} kg`} label="Volume total" color={theme.success} />

      <SectionTitle>Carga média geral</SectionTitle>
      <Card>
        <LineChart
          data={general.map(g => ({ label: short(g.date), weight: Math.round(g.weight) }))}
          series={[{ key: "weight", label: "Carga média (kg)", color: theme.primary }]}
        />
      </Card>

      <SectionTitle>Por exercício</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {exercises.map(name => (
          <Pressable
            key={name}
            onPress={() => setSelected(name)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: name === current ? theme.primary : theme.border,
              backgroundColor: name === current ? theme.primarySoft : theme.surface,
            }}
          >
            <Txt variant="label" color={name === current ? theme.primaryInk : theme.ink}>
              {name}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      {current && (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Txt variant="h3">{current}</Txt>
            <Txt variant="label" color={theme.accent}>
              Recorde: {Math.round(best)} kg
            </Txt>
          </View>
          <Txt variant="caption" muted>
            {progress.length} {progress.length === 1 ? "vez" : "vezes"}
          </Txt>
          <LineChart
            data={progress.map(p => ({ label: short(p.date), weight: Math.round(p.weight) }))}
            series={[{ key: "weight", label: "Carga (kg)", color: theme.primary }]}
          />
          <BarChart
            data={progress.map(p => ({ label: short(p.date), volume: Math.round(p.volume) }))}
            series={[{ key: "volume", label: "Volume (kg)", color: theme.accent }]}
            height={120}
          />
        </Card>
      )}
    </Screen>
  );
}
