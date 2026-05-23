import { supabase } from "@/lib/supabase";
import { getData, store } from "../store";
import { normalizeEntities, entityToArray, upsertEntity, removeEntity, setLoading, setError } from "../core/entity";
import { generateId } from "../utils";
import { loadWorkouts, loadWorkoutSessions, createWorkoutRow, createWorkoutSessionRow, deleteWorkoutSessionRow } from "@/lib/database";
import { awardXp, createXpPayload } from "../xp-engine";
import { evaluateAchievements } from "../achievements";
import type { Workout, WorkoutSession } from "../types";

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function loadGymData(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  store.update(state => {
    state.workouts = setLoading(state.workouts, true);
    state.workoutSessions = setLoading(state.workoutSessions, true);
  });

  const workoutRows = await loadWorkouts(userId);
  const workoutData = workoutRows.map(row => ({
    id: row.id,
    name: row.name,
    dayOfWeek: row.day_of_week,
    exercises: row.exercises || [],
    createdAt: row.created_at,
  }));

  const sessionRows = await loadWorkoutSessions(userId);
  const sessionData = sessionRows.map(row => ({
    id: row.id,
    workoutId: row.workout_id,
    workoutName: row.workout_name,
    date: row.date,
    durationMinutes: row.duration_minutes,
    exercises: row.exercises || [],
    totalVolume: row.total_volume,
    completedAt: row.completed_at,
  }));

  store.update(state => {
    state.workouts = normalizeEntities(workoutData);
    state.workoutSessions = normalizeEntities(sessionData);
    state.workouts.error = null;
    state.workoutSessions.error = null;
  });
}

export async function addWorkout(workout: Omit<Workout, "id" | "createdAt">): Promise<Workout | null> {
  const optimisticWorkout: Workout = {
    ...workout,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  store.update(state => {
    state.workouts = upsertEntity(state.workouts, optimisticWorkout);
  });

  const userId = await getUserId();
  if (!userId) {
    return null;
  }

  try {
    const row = await createWorkoutRow({
      user_id: userId,
      name: workout.name,
      day_of_week: workout.dayOfWeek,
      exercises: workout.exercises,
      created_at: optimisticWorkout.createdAt,
    });

    const created = {
      id: row.id,
      name: row.name,
      dayOfWeek: row.day_of_week,
      exercises: row.exercises || [],
      createdAt: row.created_at,
    };

    store.update(state => {
      state.workouts = upsertEntity(state.workouts, created);
    });

    return created;
  } catch (error) {
    store.update(state => {
      state.workouts = removeEntity(state.workouts, optimisticWorkout.id);
      state.workouts = setError(state.workouts, "Falha ao criar treino");
    });
    return null;
  }
}

export async function addWorkoutSession(session: Omit<WorkoutSession, "id" | "completedAt">): Promise<WorkoutSession | null> {
  const optimistic: WorkoutSession = {
    ...session,
    id: generateId(),
    completedAt: new Date().toISOString(),
  };

  store.update(state => {
    state.workoutSessions = upsertEntity(state.workoutSessions, optimistic);
  });

  const userId = await getUserId();
  if (!userId) {
    return null;
  }

  try {
    const row = await createWorkoutSessionRow({
      user_id: userId,
      workout_id: session.workoutId,
      workout_name: session.workoutName,
      date: session.date,
      duration_minutes: session.durationMinutes,
      exercises: session.exercises,
      total_volume: session.totalVolume,
      completed_at: optimistic.completedAt,
    });

    const created = {
      id: row.id,
      workoutId: row.workout_id,
      workoutName: row.workout_name,
      date: row.date,
      durationMinutes: row.duration_minutes,
      exercises: row.exercises || [],
      totalVolume: row.total_volume,
      completedAt: row.completed_at,
    };

    store.update(state => {
      state.workoutSessions = upsertEntity(state.workoutSessions, created);
      state.user.totalGoalsCompleted = state.user.totalGoalsCompleted;
    });
    await awardXp(createXpPayload("WORKOUT_FINISHED", 25));
    evaluateAchievements(getData());
    return created;
  } catch (error) {
    store.update(state => {
      state.workoutSessions = removeEntity(state.workoutSessions, optimistic.id);
      state.workoutSessions = setError(state.workoutSessions, "Falha ao salvar sessão");
    });
    return null;
  }
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  const original = store.getState().workoutSessions.byId[id];
  if (!original) return;

  store.update(state => {
    state.workoutSessions = removeEntity(state.workoutSessions, id);
  });

  try {
    await deleteWorkoutSessionRow(id);
  } catch (error) {
    store.update(state => {
      state.workoutSessions = upsertEntity(state.workoutSessions, original);
      state.workoutSessions = setError(state.workoutSessions, "Falha ao deletar sessão");
    });
  }
}

export function getWorkouts(): Workout[] {
  return entityToArray(store.getState().workouts);
}

export function getWorkoutSessions(): WorkoutSession[] {
  return [...entityToArray(store.getState().workoutSessions)].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getGymStats() {
  const state = store.getState();
  return {
    totalWorkouts: state.workoutSessions.allIds.length,
    totalWorkoutPlans: state.workouts.allIds.length,
    totalExercises: state.workouts.allIds.reduce((sum, id) => sum + (state.workouts.byId[id]?.exercises?.length || 0), 0),
  };
}

export function getWorkoutProgressData() {
  return getWorkoutSessions()
    .map(session => ({
      date: session.date,
      weight: session.exercises.reduce((sum, exercise) => sum + (exercise.sets?.reduce((acc, set) => acc + set.weight, 0) || 0), 0) / Math.max(session.exercises.length, 1),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getExerciseProgressData(exerciseName: string) {
  return getWorkoutSessions()
    .map(session => {
      const exercise = session.exercises.find(item => item.exerciseName === exerciseName);
      if (!exercise) return null;
      const sets = exercise.sets || [];
      const avgWeight = sets.reduce((sum, set) => sum + set.weight, 0) / Math.max(sets.length, 1);
      return { date: session.date, weight: avgWeight, volume: exercise.totalVolume };
    })
    .filter((item): item is { date: string; weight: number; volume: number } => item !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
