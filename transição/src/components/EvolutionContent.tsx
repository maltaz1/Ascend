import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { getExerciseProgressData, getWorkoutProgressData } from "@/store/workouts.store";
import { useStore } from "@/hooks/useStore";
import { useTheme } from "@/theme";
import { Card, EmptyState, Marginalia, Metric, Txt } from "./ui";
import { AreaChart, BarChart } from "./charts";

const short = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

// Conteúdo de pages/Evolution.tsx (aba Evolução da Academia e tela própria).
export function EvolutionContent() {
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
      <Card>
        <EmptyState icon="trending-up-outline" text="Registre treinos na Academia para acompanhar sua evolução." />
      </Card>
    );
  }

  return (
    <>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric label="Treinos" value={String(sessions.length)} caption="realizados" valueColor={theme.primary} />
        <Metric label="Séries" value={String(totalSets)} caption="total" valueColor={theme.accent} />
      </View>
      <Metric label="Volume" value={`${Math.round(totalVolume).toLocaleString("pt-BR")} kg`} caption="levantados no total" valueColor={theme.success} />

      <Card>
        <Marginalia>Carga média geral</Marginalia>
        <AreaChart
          data={general.map(g => ({ label: short(g.date), weight: Math.round(g.weight) }))}
          series={[{ key: "weight", label: "Carga média (kg)", color: theme.primary }]}
          dots
        />
      </Card>

      <Marginalia>Por exercício</Marginalia>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {exercises.map(name => (
          <Pressable
            key={name}
            onPress={() => setSelected(name)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 3,
              borderWidth: 1,
              borderColor: name === current ? theme.primaryBorder : theme.border,
              backgroundColor: name === current ? theme.primarySoft : theme.surface,
            }}
          >
            <Txt variant="label" color={name === current ? theme.primary : theme.ink}>
              {name}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      {current && (
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Txt variant="h3" style={{ flex: 1 }}>
              {current}
            </Txt>
            <Txt variant="mono" color={theme.accent}>
              Recorde {Math.round(best)} kg
            </Txt>
          </View>
          <Txt variant="caption" muted>
            {progress.length} {progress.length === 1 ? "vez" : "vezes"}
          </Txt>
          <AreaChart
            data={progress.map(p => ({ label: short(p.date), weight: Math.round(p.weight) }))}
            series={[{ key: "weight", label: "Carga (kg)", color: theme.primary }]}
            dots
          />
          <BarChart
            data={progress.map(p => ({ label: short(p.date), volume: Math.round(p.volume) }))}
            series={[{ key: "volume", label: "Volume (kg)", color: theme.accent }]}
            height={150}
          />
        </Card>
      )}
    </>
  );
}
