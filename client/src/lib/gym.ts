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
  // TREINOS
  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select("*");

  if (workoutsError) {
    console.error(workoutsError);
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

  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("*");

  if (sessionsError) {
    console.error(sessionsError);
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
}
