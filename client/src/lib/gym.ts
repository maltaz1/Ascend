import { supabase } from "@/lib/supabase";
import { _data, notify } from "./store";

export async function getWorkouts() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("workouts")
    .select(
      `
      *,
      exercises:workout_exercises(*)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data.map(w => ({
    ...w,
    exercises: w.exercises || [],
  }));
}

export async function addWorkout(workout: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("workouts")
    .insert({
      user_id: user.id,
      name: workout.name,
      day_of_week: workout.dayOfWeek,
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

export async function addExercise(workoutId: string, exercise: any) {
  const { error } = await supabase.from("workout_exercises").insert({
    workout_id: workoutId,
    name: exercise.name,
    series: exercise.series,
    rep_min: exercise.repMin,
    rep_max: exercise.repMax,
    rest_seconds: exercise.restSeconds,
  });

  if (error) console.error(error);
}

export async function addWorkoutSession(session: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase.from("workout_sessions").insert({
    user_id: user.id,
    workout_id: session.workoutId,
    workout_name: session.workoutName,
    date: session.date,
    duration_minutes: session.durationMinutes,
    total_volume: session.totalVolume,
    exercises: session.exercises,
  });

  if (error) console.error(error);
}

export async function loadGymData() {
  console.log("[loadGymData] Iniciando carregamento de dados de ginásio...");
  const t0 = performance.now();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[loadGymData] Usuário não autenticado, abortando.");
    return;
  }

  // TREINOS
  console.log("[loadGymData] Buscando workouts...");
  const t1 = performance.now();
  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", user.id);

  const t2 = performance.now();
  console.log(`[loadGymData] Workouts retornaram em ${(t2 - t1).toFixed(0)}ms. Erro:`, workoutsError);

  if (workoutsError) {
    console.error("[loadGymData] Erro ao carregar workouts:", workoutsError);
  } else {
    _data.workouts = (workouts || []).map(workout => ({
      id: workout.id,
      name: workout.name,
      dayOfWeek: workout.day_of_week,
      exercises: workout.exercises || [],
      createdAt: workout.created_at,
    }));
  }

  // SESSÕES
  console.log("[loadGymData] Buscando workout_sessions...");
  const t3 = performance.now();
  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id);

  const t4 = performance.now();
  console.log(`[loadGymData] Sessions retornaram em ${(t4 - t3).toFixed(0)}ms. Erro:`, sessionsError);

  if (sessionsError) {
    console.error("[loadGymData] Erro ao carregar sessions:", sessionsError);
  } else {
    _data.workoutSessions = (sessions || []).map(session => ({
      id: session.id,
      workoutId: session.workout_id,
      workoutName: session.workout_name,
      date: session.date,
      durationMinutes: session.duration_minutes,
      exercises: session.exercises || [],
      totalVolume: session.total_volume || 0,
      completedAt: session.completed_at,
    }));
  }

  const t5 = performance.now();
  console.log(`[loadGymData] Concluído em ${(t5 - t0).toFixed(0)}ms total.`);
}
