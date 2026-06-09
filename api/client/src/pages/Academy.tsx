// Fichas de treino, exercícios, histórico e evolução de carga

import React, { useState, useMemo } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Dumbbell,
  Calendar,
  Clock,
  Edit2,
  Check,
  Play,
  Copy,
  BarChart3,
} from "lucide-react";
import { useStore } from "@/hooks/useStore";
import {
  getGymStats,
  addWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkouts,
  addWorkoutSession,
  deleteWorkoutSession,
  getWorkoutSessions,
  getWorkoutProgressData,
  getExerciseProgressData,
  generateId,
  getTodayString,
  XP_PER_WORKOUT,
  addXP,
  WorkoutSet as StoreWorkoutSet,
} from "@/lib/store";
import { getLastExercisePerformance } from "@/store/workouts.store";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Modal } from "@/components/ui/Modal";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const DAYS_OF_WEEK = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

interface NewExercise {
  name: string;
  series: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
}

interface LocalWorkoutSet {
  weight: number;
  reps: number;
  type: "warmup" | "normal" | "failed" | "drop";
}

interface WorkoutInProgress {
  workoutId: string;
  workoutName: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: LocalWorkoutSet[];
  }>;
  startTime: number;
}

interface AcademyProps {
  onTabChange?: (tab: "evolution") => void;
}

export default function Academy({ onTabChange }: AcademyProps) {
  const data = useStore();
  const stats = useMemo(() => getGymStats(), [data]);
  const workouts = useMemo(() => getWorkouts(), [data]);
  const sessions = useMemo(() => getWorkoutSessions(), [data]);
  const progressData = useMemo(() => getWorkoutProgressData(), [data]);

  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(
    null
  );
  const [newExercise, setNewExercise] = useState<NewExercise>({
    name: "",
    series: 3,
    repMin: 8,
    repMax: 12,
    restSeconds: 60,
  });
  const [showNewWorkoutModal, setShowNewWorkoutModal] = useState(false);
  const [showNewExerciseModal, setShowNewExerciseModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [workoutInProgress, setWorkoutInProgress] =
    useState<WorkoutInProgress | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [workoutDay, setWorkoutDay] = useState(0);
  const [historyFilter, setHistoryFilter] = useState("30");
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(
    new Set()
  );
  const [selectedExerciseForEdit, setSelectedExerciseForEdit] = useState<
    string | null
  >(null);

  const selectedWorkout = selectedWorkoutId
    ? workouts.find(w => w.id === selectedWorkoutId)
    : null;

  const filteredSessions = useMemo(() => {
    const days = parseInt(historyFilter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return sessions.filter(s => new Date(s.date) >= cutoffDate);
  }, [sessions, historyFilter]);

  const handleCreateWorkout = async () => {
    if (!workoutName.trim()) return;
    const newWorkout = await addWorkout({
      name: workoutName,
      dayOfWeek: workoutDay,
      exercises: [],
    });
    if (!newWorkout) return;
    setSelectedWorkoutId(newWorkout.id);
    setWorkoutName("");
    setWorkoutDay(0);
    setShowNewWorkoutModal(false);
  };

  const handleAddExercise = () => {
    if (!newExercise.name.trim() || !selectedWorkout) return;
    const newExerciseObj = { ...newExercise, id: generateId() };
    const updatedExercises = [
      ...(selectedWorkout.exercises || []),
      newExerciseObj,
    ];
    updateWorkout(selectedWorkout.id, { exercises: updatedExercises });
    setSelectedExerciseForEdit(newExerciseObj.id);
    setNewExercise({
      name: "",
      series: 3,
      repMin: 8,
      repMax: 12,
      restSeconds: 60,
    });
    setShowNewExerciseModal(false);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (!selectedWorkout) return;
    const updated = {
      ...selectedWorkout,
      exercises: (selectedWorkout.exercises || []).filter(
        e => e.id !== exerciseId
      ),
    };
    updateWorkout(selectedWorkout.id, { exercises: updated.exercises });
  };

  const handleStartWorkout = (workout: any) => {
    setWorkoutInProgress({
      workoutId: workout.id,
      workoutName: workout.name,
      exercises: (workout.exercises || []).map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        sets: Array(ex.series || 0)
          .fill(null)
          .map(() => ({
            weight: 20,
            reps: 10,
            type: "normal" as const,
          })),
      })),
      startTime: Date.now(),
    });
    setShowWorkoutModal(true);
  };

  const handleFinishWorkout = async () => {
    if (!workoutInProgress) return;
    const durationMinutes = Math.round(
      (Date.now() - workoutInProgress.startTime) / 60000
    );
    let totalVolume = 0;
    const exercises = workoutInProgress.exercises.map(ex => {
      const setVolume = ex.sets.reduce(
        (sum, set) => sum + set.weight * set.reps,
        0
      );
      totalVolume += setVolume;
      return {
        exerciseName: ex.name,
        sets: ex.sets as StoreWorkoutSet[],
        totalVolume: setVolume,
      };
    });
    await addWorkoutSession({
      workoutId: workoutInProgress.workoutId,
      workoutName: workoutInProgress.workoutName,
      date: getTodayString(),
      durationMinutes: Math.max(durationMinutes, 1),
      exercises,
      totalVolume,
    });
    await addXP(XP_PER_WORKOUT);
    setWorkoutInProgress(null);
    setShowWorkoutModal(false);
  };

  const toggleExerciseExpand = (id: string) => {
    const newSet = new Set(expandedExercises);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedExercises(newSet);
  };

  const handleAddSet = (exerciseIdx: number) => {
    if (!workoutInProgress) return;
    const updated = [...workoutInProgress.exercises];
    updated[exerciseIdx].sets.push({ weight: 20, reps: 10, type: "normal" });
    setWorkoutInProgress({ ...workoutInProgress, exercises: updated });
  };

  const handleDeleteSet = (exerciseIdx: number, setIdx: number) => {
    if (!workoutInProgress) return;
    const updated = [...workoutInProgress.exercises];
    updated[exerciseIdx].sets.splice(setIdx, 1);
    setWorkoutInProgress({ ...workoutInProgress, exercises: updated });
  };

  const handleUpdateSet = (
    exerciseIdx: number,
    setIdx: number,
    field: "weight" | "reps" | "type",
    value: number | string
  ) => {
    if (!workoutInProgress) return;
    const updated = [...workoutInProgress.exercises];
    (updated[exerciseIdx].sets[setIdx] as any)[field] = value;
    setWorkoutInProgress({ ...workoutInProgress, exercises: updated });
  };

  return (
    <div className="animate-fade-in">
      {/* Summary Cards */}
      <div
        className="academy-summary"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div
          className="fz-card"
          style={{ padding: "18px 20px", textAlign: "center" }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>💪</div>
          <div
            className="fz-metric-number"
            style={{ fontSize: 28, color: "#A855F7", marginBottom: 4 }}
          >
            <AnimatedCounter value={stats.totalWorkouts} />
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Treinos Completos
          </div>
        </div>

        <div
          className="fz-card"
          style={{ padding: "18px 20px", textAlign: "center" }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
          <div
            className="fz-metric-number"
            style={{ fontSize: 28, color: "#3B82F6", marginBottom: 4 }}
          >
            <AnimatedCounter value={stats.totalWorkoutPlans} />
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Fichas de Treino
          </div>
        </div>

        <div
          className="fz-card"
          style={{ padding: "18px 20px", textAlign: "center" }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>🏋️</div>
          <div
            className="fz-metric-number"
            style={{ fontSize: 28, color: "#06B6D4", marginBottom: 4 }}
          >
            <AnimatedCounter value={stats.totalExercises} />
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            Exercícios
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <style>{`
        .academy-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .academy-main-grid {
            grid-template-columns: 1fr 350px;
          }
        }
      `}</style>
      <div className="academy-main-grid">
        {/* Workouts Section */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: "var(--foreground)",
                fontFamily: "Space Grotesk",
              }}
            >
              Fichas de Treino
            </h2>
            <button
              onClick={() => setShowNewWorkoutModal(true)}
              className="fz-btn-primary"
              style={{
                padding: "8px 14px",
                fontSize: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Plus size={14} />
              Nova Ficha
            </button>
          </div>

          {workouts.length === 0 ? (
            <div
              className="fz-card"
              style={{ padding: "40px 20px", textAlign: "center" }}
            >
              <Dumbbell
                size={32}
                style={{ margin: "0 auto 12px", opacity: 0.5 }}
              />
              <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
                Nenhuma ficha de treino criada
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {workouts.map(workout => (
                <div
                  key={workout.id}
                  className="fz-card"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    cursor: "pointer",
                    border:
                      selectedWorkoutId === workout.id
                        ? "2px solid #A855F7"
                        : "1px solid var(--border)",
                  }}
                  onClick={() => setSelectedWorkoutId(workout.id)}
                >
                  <div
                    style={{
                      padding: "16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--foreground)",
                        }}
                      >
                        {workout.name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--muted-foreground)",
                          marginTop: 4,
                        }}
                      >
                        {DAYS_OF_WEEK[workout.dayOfWeek]} •{" "}
                        {workout.exercises?.length || 0} exercícios
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleStartWorkout(workout);
                      }}
                      className="fz-btn-primary"
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Play size={12} />
                      Iniciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div>
          {selectedWorkout ? (
            <div className="fz-card" style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--foreground)",
                  }}
                >
                  Detalhes
                </h3>
                <button
                  onClick={() => deleteWorkout(selectedWorkout.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={14} color="#EF4444" />
                </button>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      display: "block",
                      marginBottom: 6,
                    }}
                  >
                    Nome da Ficha
                  </label>
                  <input
                    type="text"
                    value={selectedWorkout.name}
                    onChange={e =>
                      updateWorkout(selectedWorkout.id, {
                        name: e.target.value,
                      })
                    }
                    className="fz-input"
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      marginBottom: 8,
                      fontFamily: "DM Sans",
                      fontWeight: 500,
                    }}
                  >
                    Dia da Semana
                  </div>
                  <select
                    value={selectedWorkout.dayOfWeek}
                    onChange={e =>
                      updateWorkout(selectedWorkout.id, {
                        dayOfWeek: parseInt(e.target.value),
                      })
                    }
                    className="fz-input"
                  >
                    {DAYS_OF_WEEK.map((day, idx) => (
                      <option key={idx} value={idx}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exercises */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontFamily: "Space Grotesk",
                      fontWeight: 600,
                      marginBottom: 12,
                      color: "var(--foreground)",
                    }}
                  >
                    Exercícios ({selectedWorkout.exercises?.length || 0})
                  </div>

                  {(selectedWorkout.exercises || []).map(exercise => (
                    <div
                      key={exercise.id}
                      style={{
                        background: "var(--border)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        marginBottom: 8,
                        overflow: "hidden",
                      }}
                    >
                      <button
                        onClick={() => toggleExerciseExpand(exercise.id)}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: "transparent",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ textAlign: "left", flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--foreground)",
                            }}
                          >
                            {exercise.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--muted-foreground)",
                              marginTop: 2,
                            }}
                          >
                            {exercise.series}x {exercise.repMin}-
                            {exercise.repMax}
                          </div>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteExercise(exercise.id);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </button>
                      </button>

                      {expandedExercises.has(exercise.id) && (
                        <div
                          style={{
                            borderTop: "1px solid var(--border)",
                            padding: "12px",
                            background: "var(--border)",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 8,
                              fontSize: 12,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color: "var(--muted-foreground)",
                                  marginBottom: 4,
                                }}
                              >
                                Séries
                              </div>
                              <div
                                style={{
                                  color: "var(--foreground)",
                                  fontWeight: 500,
                                }}
                              >
                                {exercise.series}
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  color: "var(--muted-foreground)",
                                  marginBottom: 4,
                                }}
                              >
                                Reps
                              </div>
                              <div
                                style={{
                                  color: "var(--foreground)",
                                  fontWeight: 500,
                                }}
                              >
                                {exercise.repMin}-{exercise.repMax}
                              </div>
                            </div>
                            <div>
                              <div
                                style={{
                                  color: "var(--muted-foreground)",
                                  marginBottom: 4,
                                }}
                              >
                                Descanso
                              </div>
                              <div
                                style={{
                                  color: "var(--foreground)",
                                  fontWeight: 500,
                                }}
                              >
                                {exercise.restSeconds}s
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={() => setShowNewExerciseModal(true)}
                    className="fz-btn-ghost"
                    style={{
                      width: "100%",
                      padding: "10px",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      marginTop: 8,
                    }}
                  >
                    <Plus size={12} />
                    Adicionar Exercício
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="fz-card"
              style={{ padding: "40px 20px", textAlign: "center" }}
            >
              <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
                Selecione uma ficha para ver detalhes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--foreground)",
              fontFamily: "Space Grotesk",
            }}
          >
            Histórico
          </h2>
          <select
            value={historyFilter}
            onChange={e => setHistoryFilter(e.target.value)}
            className="fz-input"
            style={{ width: "140px", fontSize: 12 }}
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>
        </div>

        {filteredSessions.length === 0 ? (
          <div
            className="fz-card"
            style={{ padding: "40px 20px", textAlign: "center" }}
          >
            <Calendar
              size={32}
              style={{ margin: "0 auto 12px", opacity: 0.5 }}
            />
            <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
              Nenhum treino registrado
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredSessions.map(session => (
              <div
                key={session.id}
                className="fz-card"
                style={{ padding: "16px" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--foreground)",
                      }}
                    >
                      {session.workoutName}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted-foreground)",
                        marginTop: 4,
                      }}
                    >
                      {new Date(session.date).toLocaleDateString("pt-BR")} •{" "}
                      {session.durationMinutes} min
                    </div>
                  </div>
                  <button
                    onClick={() => deleteWorkoutSession(session.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "var(--muted-foreground)",
                        marginBottom: 4,
                      }}
                    >
                      Volume Total
                    </div>
                    <div style={{ color: "#A855F7", fontWeight: 600 }}>
                      {(session.totalVolume || 0).toFixed(0)} kg
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--muted-foreground)",
                        marginBottom: 4,
                      }}
                    >
                      Exercícios
                    </div>
                    <div style={{ color: "#3B82F6", fontWeight: 600 }}>
                      {session.exercises.length}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        color: "var(--muted-foreground)",
                        marginBottom: 4,
                      }}
                    >
                      Séries
                    </div>
                    <div style={{ color: "#06B6D4", fontWeight: 600 }}>
                      {session.exercises.reduce(
                        (sum, ex) => sum + ex.sets.length,
                        0
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Nova Ficha */}
      <Modal
        open={showNewWorkoutModal}
        onClose={() => setShowNewWorkoutModal(false)}
        title="Nova Ficha de Treino"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Nome da Ficha
            </label>
            <input
              type="text"
              value={workoutName}
              onChange={e => setWorkoutName(e.target.value)}
              placeholder="Ex: Peito + Ombro + Tríceps"
              className="fz-input"
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Dia da Semana
            </label>
            <select
              value={workoutDay}
              onChange={e => setWorkoutDay(parseInt(e.target.value))}
              className="fz-input"
            >
              {DAYS_OF_WEEK.map((day, idx) => (
                <option key={idx} value={idx}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCreateWorkout}
            className="fz-btn-primary"
            style={{ width: "100%", padding: "12px" }}
          >
            Criar Ficha
          </button>
        </div>
      </Modal>

      {/* Modal: Novo Exercício */}
      <Modal
        open={showNewExerciseModal}
        onClose={() => setShowNewExerciseModal(false)}
        title="Novo Exercício"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                display: "block",
                marginBottom: 6,
              }}
            >
              Nome do Exercício
            </label>
            <input
              type="text"
              value={newExercise.name}
              onChange={e =>
                setNewExercise({ ...newExercise, name: e.target.value })
              }
              placeholder="Ex: Supino, Agachamento, Rosca..."
              className="fz-input"
            />
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Séries
              </label>
              <input
                type="number"
                value={newExercise.series}
                onChange={e =>
                  setNewExercise({
                    ...newExercise,
                    series: parseInt(e.target.value),
                  })
                }
                className="fz-input"
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Reps Mín
              </label>
              <input
                type="number"
                value={newExercise.repMin}
                onChange={e =>
                  setNewExercise({
                    ...newExercise,
                    repMin: parseInt(e.target.value),
                  })
                }
                className="fz-input"
              />
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Reps Máx
              </label>
              <input
                type="number"
                value={newExercise.repMax}
                onChange={e =>
                  setNewExercise({
                    ...newExercise,
                    repMax: parseInt(e.target.value),
                  })
                }
                className="fz-input"
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Descanso (s)
              </label>
              <input
                type="number"
                value={newExercise.restSeconds}
                onChange={e =>
                  setNewExercise({
                    ...newExercise,
                    restSeconds: parseInt(e.target.value),
                  })
                }
                className="fz-input"
              />
            </div>
          </div>
          <button
            onClick={handleAddExercise}
            className="fz-btn-primary"
            style={{ width: "100%", padding: "12px" }}
          >
            Adicionar Exercício
          </button>
        </div>
      </Modal>

      {/* Modal: Treino em Progresso */}
      <Modal
        open={showWorkoutModal}
        onClose={() => setShowWorkoutModal(false)}
        title=""
      >
        {workoutInProgress && (
          <div
            style={{
              height: "100%",
              maxHeight: "100dvh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              margin: "-24px",
              background:
                "linear-gradient(180deg, rgba(10,10,14,1) 0%, rgba(17,17,25,1) 100%)",
            }}
          >
            {/* HEADER FIXO */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 50,
                padding: "18px 18px 14px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                backdropFilter: "blur(20px)",
                background: "rgba(10,10,14,0.92)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  gap: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: "white",
                      fontFamily: "Space Grotesk",
                      marginBottom: 6,
                    }}
                  >
                    {workoutInProgress.workoutName}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(168,85,247,0.12)",
                        border: "1px solid rgba(168,85,247,0.22)",
                        padding: "6px 10px",
                        borderRadius: 999,
                      }}
                    >
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: "#A855F7",
                          boxShadow: "0 0 10px #A855F7",
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          color: "#A855F7",
                          fontWeight: 700,
                        }}
                      >
                        EM TREINO
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted-foreground)",
                        fontWeight: 600,
                      }}
                    >
                      {Math.round(
                        (Date.now() - workoutInProgress.startTime) / 60000
                      )}{" "}
                      min
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowWorkoutModal(false)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 16,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* SCROLL */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                minHeight: 0,
                paddingBottom: 120,
                overflowX: "hidden",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {workoutInProgress.exercises.map((exercise, exIdx) => {
                const lastPerformance = getLastExercisePerformance(
                  exercise.name
                );

                const totalVolume = exercise.sets.reduce(
                  (sum, set) => sum + set.weight * set.reps,
                  0
                );

                return (
                  <div
                    key={exercise.id}
                    style={{
                      borderRadius: 20,
                      overflow: "visible",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    {/* HEADER EXERCÍCIO */}
                    <div
                      style={{
                        padding: "18px",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          gap: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 700,
                              color: "white",
                              marginBottom: 4,
                            }}
                          >
                            {exercise.name}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--muted-foreground)",
                              }}
                            >
                              Volume:
                              <span
                                style={{
                                  color: "#A855F7",
                                  marginLeft: 4,
                                  fontWeight: 700,
                                }}
                              >
                                {totalVolume.toFixed(0)}kg
                              </span>
                            </div>

                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--muted-foreground)",
                              }}
                            >
                              Séries:
                              <span
                                style={{
                                  color: "#3B82F6",
                                  marginLeft: 4,
                                  fontWeight: 700,
                                }}
                              >
                                {exercise.sets.length}
                              </span>
                            </div>
                          </div>
                        </div>

                        {(lastPerformance?.sets?.length ?? 0) > 0 && (
                          <div
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: "rgba(168,85,247,0.12)",
                              border: "1px solid rgba(168,85,247,0.2)",
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#A855F7",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Último: {lastPerformance?.sets?.[0]?.weight}kg
                          </div>
                        )}
                      </div>
                    </div>

                    {/* HISTÓRICO */}
                    {(lastPerformance?.sets?.length ?? 0) > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          overflowX: "auto",
                          padding: "12px 18px",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        {lastPerformance?.sets?.map((set, idx) => (
                          <div
                            key={idx}
                            style={{
                              flexShrink: 0,
                              padding: "8px 12px",
                              borderRadius: 12,
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              fontSize: 12,
                              color: "white",
                              fontWeight: 600,
                            }}
                          >
                            {set.weight}kg × {set.reps}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* SÉRIES */}
                    <div
                      style={{
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        overflow: "visible",
                        height: "auto",
                      }}
                    >
                      {exercise.sets.map((set, setIdx) => (
                        <div
                          key={setIdx}
                          style={{
                            borderRadius: 16,
                            padding: 14,
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.05)",
                            boxSizing: "border-box", // ← ADICIONADO
                            width: "100%", // ← ADICIONADO
                            overflow: "hidden", // ← ADICIONADO
                          }}
                        >
                          {/* TOP */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 12,
                                background:
                                  "linear-gradient(135deg,#3B82F6,#2563EB)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                color: "white",
                                fontSize: 14,
                                flexShrink: 0, // ← ADICIONADO
                              }}
                            >
                              {setIdx + 1}
                            </div>

                            <button
                              onClick={() => handleDeleteSet(exIdx, setIdx)}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 10,
                                border: "1px solid rgba(239,68,68,0.2)",
                                background: "rgba(239,68,68,0.08)",
                                color: "#EF4444",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0, // ← ADICIONADO
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* TIPO — agora ocupa linha inteira */}
                          <select
                            value={set.type}
                            onChange={e =>
                              handleUpdateSet(
                                exIdx,
                                setIdx,
                                "type",
                                e.target.value
                              )
                            }
                            className="fz-input"
                            style={{
                              marginBottom: 12,
                              fontWeight: 700,
                              width: "100%", // ← GARANTE LINHA INTEIRA
                              boxSizing: "border-box",
                            }}
                          >
                            <option value="warmup">🔥 Aquecimento</option>
                            <option value="normal">💪 Normal</option>
                            <option value="failed">⚠️ Falhada</option>
                            <option value="drop">⬇️ Drop</option>
                          </select>

                          {/* INPUTS — contidos dentro do card */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 12,
                              width: "100%", // ← ADICIONADO
                              boxSizing: "border-box",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  marginBottom: 6,
                                  color: "var(--muted-foreground)",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                }}
                              >
                                Peso (kg)
                              </div>
                              <input
                                type="number"
                                value={set.weight}
                                onChange={e =>
                                  handleUpdateSet(
                                    exIdx,
                                    setIdx,
                                    "weight",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="fz-input"
                                style={{
                                  height: 52,
                                  fontSize: 20,
                                  fontWeight: 800,
                                  textAlign: "center",
                                  width: "100%", // ← ADICIONADO
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>

                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  marginBottom: 6,
                                  color: "var(--muted-foreground)",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                }}
                              >
                                Repetições
                              </div>
                              <input
                                type="number"
                                value={set.reps}
                                onChange={e =>
                                  handleUpdateSet(
                                    exIdx,
                                    setIdx,
                                    "reps",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="fz-input"
                                style={{
                                  height: 52,
                                  fontSize: 20,
                                  fontWeight: 800,
                                  textAlign: "center",
                                  width: "100%", // ← ADICIONADO
                                  boxSizing: "border-box",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* ADD SET */}
                      <button
                        onClick={() => handleAddSet(exIdx)}
                        style={{
                          height: 48,
                          borderRadius: 14,
                          border: "1px dashed rgba(255,255,255,0.14)",
                          background: "rgba(255,255,255,0.03)",
                          color: "white",
                          fontWeight: 700,
                          cursor: "pointer",
                          marginTop: 4,
                          width: "100%",
                        }}
                      >
                        + Adicionar Série
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FOOTER FIXO */}
            <div
              style={{
                position: "sticky",
                bottom: 0,
                zIndex: 40,
                padding: 18,
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(10,10,14,0.95)",
                backdropFilter: "blur(20px)",
              }}
            >
              <button
                onClick={handleFinishWorkout}
                style={{
                  width: "100%",
                  height: 58,
                  borderRadius: 18,
                  border: "none",
                  background: "linear-gradient(135deg,#3B82F6,#2563EB)",
                  color: "white",
                  fontSize: 18,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 10px 30px rgba(59,130,246,0.3)",
                }}
              >
                ✓ Finalizar Treino (+{XP_PER_WORKOUT} XP)
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Media queries */}
      <style>{`
        @media (max-width: 1024px) {
          .academy-main-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .academy-summary { grid-template-columns: 1fr !important; }
          .academy-main-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .academy-summary { gap: 12px !important; }
          .academy-main-grid { gap: 16px !important; }
        }
      `}</style>
    </div>
  );
}
