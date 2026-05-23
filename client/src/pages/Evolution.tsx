// Evolution — Carbon Amber Industrial Premium
// Visualização de evolução de carga e volume

import React, { useState, useMemo } from 'react';
import { ChevronLeft, TrendingUp } from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import {
  getWorkoutProgressData,
  getExerciseProgressData,
  getWorkoutSessions,
} from '@/lib/store';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface EvolutionProps {
  onTabChange?: (tab: 'academy') => void;
}

export default function Evolution({ onTabChange }: EvolutionProps) {
  const data = useStore();
  const sessions = useMemo(() => getWorkoutSessions(), [data]);
  const generalProgress = useMemo(() => getWorkoutProgressData(), [data]);

  // Obter todos os exercícios únicos
  const allExercises = useMemo(() => {
    const exercises = new Set<string>();
    sessions.forEach(session => {
      session.exercises.forEach(ex => {
        exercises.add(ex.exerciseName);
      });
    });
    return Array.from(exercises).sort();
  }, [sessions]);

  const [selectedExercise, setSelectedExercise] = useState<string | null>(
    allExercises.length > 0 ? allExercises[0] : null
  );

  const exerciseProgress = useMemo(() => {
    if (!selectedExercise) return [];
    return getExerciseProgressData(selectedExercise);
  }, [selectedExercise]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    let totalVolume = 0;
    let totalWorkouts = sessions.length;
    let maxWeight = 0;
    let totalSets = 0;

    sessions.forEach(session => {
      totalVolume += session.totalVolume;
      session.exercises.forEach(ex => {
        totalSets += ex.sets.length;
        ex.sets.forEach(set => {
          maxWeight = Math.max(maxWeight, set.weight);
        });
      });
    });

    return {
      totalVolume: totalVolume.toFixed(0),
      totalWorkouts,
      maxWeight: maxWeight.toFixed(1),
      totalSets,
      avgVolumePerWorkout: totalWorkouts > 0 ? (totalVolume / totalWorkouts).toFixed(0) : 0,
    };
  }, [sessions]);

  // Estatísticas do exercício selecionado
  const exerciseStats = useMemo(() => {
    if (!selectedExercise) return null;

    let totalVolume = 0;
    let maxWeight = 0;
    let totalSets = 0;
    let sessions_count = 0;

    sessions.forEach(session => {
      const exercise = session.exercises.find(ex => ex.exerciseName === selectedExercise);
      if (exercise) {
        totalVolume += exercise.totalVolume;
        totalSets += exercise.sets.length;
        sessions_count++;
        exercise.sets.forEach(set => {
          maxWeight = Math.max(maxWeight, set.weight);
        });
      }
    });

    return {
      totalVolume: totalVolume.toFixed(0),
      maxWeight: maxWeight.toFixed(1),
      totalSets,
      sessions: sessions_count,
      avgVolumePerSession: sessions_count > 0 ? (totalVolume / sessions_count).toFixed(0) : 0,
    };
  }, [selectedExercise, sessions]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button
          onClick={() => onTabChange?.('academy')}
          className="fz-btn-ghost"
          style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={18} />
        </button>
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 24, color: 'var(--foreground)' }}>
          Evolução
        </h1>
      </div>

      {/* General Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <div className="fz-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8, fontFamily: 'DM Sans' }}>
            Volume Total
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#F59E0B', marginBottom: 4 }}>
            {stats.totalVolume}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>kg</div>
        </div>

        <div className="fz-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8, fontFamily: 'DM Sans' }}>
            Treinos
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#A855F7', marginBottom: 4 }}>
            {stats.totalWorkouts}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>realizados</div>
        </div>

        <div className="fz-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8, fontFamily: 'DM Sans' }}>
            Peso Máx
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981', marginBottom: 4 }}>
            {stats.maxWeight}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>kg</div>
        </div>

        <div className="fz-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 8, fontFamily: 'DM Sans' }}>
            Séries
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#F97316', marginBottom: 4 }}>
            {stats.totalSets}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>total</div>
        </div>
      </div>

      {/* General Progress Chart */}
      <div className="fz-card" style={{ padding: '20px', marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--foreground)' }}>
          Evolução Geral — Peso Médio
        </h2>
        {generalProgress.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={generalProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                tickFormatter={date => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  background: 'rgba(17, 17, 24, 0.9)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(value: any) => `${value.toFixed(1)} kg`}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#F59E0B"
                dot={{ fill: '#F59E0B', r: 4 }}
                activeDot={{ r: 6 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted-foreground)' }}>
            Nenhum dado de evolução ainda
          </div>
        )}
      </div>

      {/* Exercise Selection */}
      {allExercises.length > 0 && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'block', marginBottom: 8, fontFamily: 'DM Sans', fontWeight: 500 }}>
              Selecione um Exercício
            </label>
            <select
              value={selectedExercise || ''}
              onChange={e => setSelectedExercise(e.target.value)}
              className="fz-input"
            >
              {allExercises.map(ex => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </div>

          {selectedExercise && exerciseStats && (
            <>
              {/* Exercise Stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginBottom: 28,
                }}
              >
                <div className="fz-card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, fontFamily: 'DM Sans' }}>
                    Volume
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#F59E0B' }}>
                    {exerciseStats.totalVolume}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>kg</div>
                </div>

                <div className="fz-card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, fontFamily: 'DM Sans' }}>
                    Peso Máx
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#A855F7' }}>
                    {exerciseStats.maxWeight}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>kg</div>
                </div>

                <div className="fz-card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, fontFamily: 'DM Sans' }}>
                    Séries
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>
                    {exerciseStats.totalSets}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>total</div>
                </div>

                <div className="fz-card" style={{ padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, fontFamily: 'DM Sans' }}>
                    Sessões
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#F97316' }}>
                    {exerciseStats.sessions}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted-foreground)' }}>vezes</div>
                </div>
              </div>

              {/* Exercise Progress Chart */}
              <div className="fz-card" style={{ padding: '20px', marginBottom: 28 }}>
                <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: 14, marginBottom: 16, color: 'var(--foreground)' }}>
                  {selectedExercise} — Evolução
                </h2>
                {exerciseProgress.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={exerciseProgress}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                        tickFormatter={date => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(17, 17, 24, 0.9)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                        }}
                        labelStyle={{ color: 'var(--foreground)' }}
                        formatter={(value: any, name: string) => {
                          if (name === 'weight') return `${value.toFixed(1)} kg (peso médio)`;
                          if (name === 'volume') return `${value.toFixed(0)} kg (volume)`;
                          return value;
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="#A855F7"
                        dot={{ fill: '#A855F7', r: 4 }}
                        activeDot={{ r: 6 }}
                        strokeWidth={2}
                        name="Peso Médio"
                      />
                      <Line
                        type="monotone"
                        dataKey="volume"
                        stroke="#10B981"
                        dot={{ fill: '#10B981', r: 4 }}
                        activeDot={{ r: 6 }}
                        strokeWidth={2}
                        name="Volume"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted-foreground)' }}>
                    Nenhum dado para este exercício
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
