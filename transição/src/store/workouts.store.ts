import { supabase } from "@/lib/supabase";
import { Workout, WorkoutSession, CatalogExercise, Exercise } from "./types";
import { DEFAULT_EXERCISE_CATALOG, isDefaultExercise } from "./default-exercises";
import { _data, notify, persistState, markActiveToday } from "./state";
import { generateId } from "./utils";
import { addXP } from "./xp-system";
import { evaluateAchievements } from "./achievements";

// --- Catalog Functions ---

export async function addCatalogExercise(
  exercise: Omit<CatalogExercise, "id" | "createdAt">
): Promise<CatalogExercise | null> {
  const newExercise: CatalogExercise = {
    id: generateId(),
    name: exercise.name,
    targetMuscleGroup: exercise.targetMuscleGroup,
    createdAt: new Date().toISOString(),
  };

  _data.exerciseCatalog.push(newExercise);
  notify();
  persistState();

  void (async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error("Usuário não encontrado");
      _data.exerciseCatalog = _data.exerciseCatalog.filter(item => item.id !== newExercise.id);
      notify();
      persistState();
      return;
    }

    const { data, error } = await supabase
      .from("exercise_catalog")
      .insert([
        {
          user_id: userData.user.id,
          name: exercise.name,
          target_muscle_group: exercise.targetMuscleGroup,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error("Erro ao salvar exercício no catálogo:", error);
      _data.exerciseCatalog = _data.exerciseCatalog.filter(item => item.id !== newExercise.id);
      notify();
      persistState();
      return;
    }

    const index = _data.exerciseCatalog.findIndex(item => item.id === newExercise.id);
    if (index !== -1) {
      _data.exerciseCatalog[index] = {
        ...newExercise,
        id: data.id,
        createdAt: data.created_at,
      };
      notify();
      persistState();
    }
  })();

  return newExercise;
}

export async function deleteCatalogExercise(id: string): Promise<void> {
  // Os exercícios padrão pertencem ao aplicativo e não podem ser removidos.
  if (isDefaultExercise(id)) return;

  const previousCatalog = [..._data.exerciseCatalog];
  _data.exerciseCatalog = _data.exerciseCatalog.filter(item => item.id !== id);

  notify();
  persistState();

  void (async () => {
    const { error } = await supabase.from("exercise_catalog").delete().eq("id", id);
    if (error) {
      console.error("Erro ao deletar exercício do catálogo:", error);
      _data.exerciseCatalog = previousCatalog;
      notify();
      persistState();
    }
  })();
}

export function getCatalogExercises(): CatalogExercise[] {
  return [...DEFAULT_EXERCISE_CATALOG, ..._data.exerciseCatalog].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR")
  );
}

// --- Workout Functions ---

export async function addWorkout(
  workout: Omit<Workout, "id" | "createdAt">
): Promise<Workout | null> {
  const newWorkout: Workout = {
    id: generateId(),
    name: workout.name,
    dayOfWeek: workout.dayOfWeek,
    daysOfWeek: workout.daysOfWeek || [workout.dayOfWeek],
    exercises: workout.exercises || [],
    createdAt: new Date().toISOString(),
  };

  _data.workouts.push(newWorkout);
  notify();
  persistState();

  void (async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.error("Usuário não encontrado");
      _data.workouts = _data.workouts.filter(item => item.id !== newWorkout.id);
      notify();
      persistState();
      return;
    }

    const { data, error } = await supabase
      .from("workouts")
      .insert([
        {
          user_id: userData.user.id,
          name: workout.name,
          day_of_week: workout.dayOfWeek,
          days_of_week: newWorkout.daysOfWeek,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error("Erro ao salvar treino:", error);
      _data.workouts = _data.workouts.filter(item => item.id !== newWorkout.id);
      notify();
      persistState();
      return;
    }

    const index = _data.workouts.findIndex(item => item.id === newWorkout.id);
    if (index !== -1) {
      _data.workouts[index] = {
        ...newWorkout,
        id: data.id,
        createdAt: data.created_at,
      };
      notify();
      persistState();
    }
  })();

  return newWorkout;
}

export async function updateWorkout(
  id: string,
  updates: Partial<Omit<Workout, "id" | "createdAt">>
): Promise<void> {
  const index = _data.workouts.findIndex(workout => workout.id === id);
  if (index === -1) return;

  const previousWorkout = { ..._data.workouts[index], exercises: [...(_data.workouts[index].exercises || [])] };
  _data.workouts[index] = { ..._data.workouts[index], ...updates };

  notify();
  persistState();

  void (async () => {
    const updatesToDb: Record<string, unknown> = {};
    if (updates.name !== undefined) updatesToDb.name = updates.name;
    if (updates.dayOfWeek !== undefined) updatesToDb.day_of_week = updates.dayOfWeek;
    if (updates.daysOfWeek !== undefined) updatesToDb.days_of_week = updates.daysOfWeek;
    
    // Se exercises for atualizado, precisamos lidar com workout_exercises no banco
    // Mas a lógica atual parece salvar exercises como JSONB em workouts também? 
    // Vamos verificar o schema novamente.
    if (updates.exercises !== undefined) updatesToDb.exercises = updates.exercises;

    if (Object.keys(updatesToDb).length === 0) return;

    const { error } = await supabase.from("workouts").update(updatesToDb).eq("id", id);
    if (error) {
      console.error("Erro ao atualizar treino:", error);
      _data.workouts[index] = previousWorkout;
      notify();
      persistState();
    }
  })();
}

export async function deleteWorkout(id: string): Promise<void> {
  const previousWorkouts = [..._data.workouts];
  _data.workouts = _data.workouts.filter(workout => workout.id !== id);

  notify();
  persistState();

  void (async () => {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) {
      console.error("Erro ao deletar treino:", error);
      _data.workouts = previousWorkouts;
      notify();
      persistState();
    }
  })();
}

export function getWorkouts(): Workout[] {
  return _data.workouts;
}

export async function addWorkoutSession(
  session: Omit<WorkoutSession, "id" | "completedAt">
): Promise<WorkoutSession | null> {
  const newSession: WorkoutSession = {
    id: generateId(),
    workoutId: session.workoutId,
    workoutName: session.workoutName,
    date: session.date,
    durationMinutes: session.durationMinutes,
    exercises: session.exercises,
    totalVolume: session.totalVolume,
    completedAt: new Date().toISOString(),
  };

  _data.workoutSessions.push(newSession);
  markActiveToday();
  addXP(25);
  evaluateAchievements(_data);
  notify();
  persistState();

  void (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Usuário não encontrado");
      _data.workoutSessions = _data.workoutSessions.filter(item => item.id !== newSession.id);
      notify();
      persistState();
      return;
    }

    const { data, error } = await supabase
      .from("workout_sessions")
      .insert([
        {
          user_id: user.id,
          workout_id: session.workoutId,
          workout_name: session.workoutName,
          date: session.date,
          duration_minutes: session.durationMinutes,
          exercises: session.exercises,
          total_volume: session.totalVolume,
          completed_at: newSession.completedAt,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error("Erro ao adicionar sessão:", error);
      _data.workoutSessions = _data.workoutSessions.filter(item => item.id !== newSession.id);
      notify();
      persistState();
      return;
    }

    const index = _data.workoutSessions.findIndex(item => item.id === newSession.id);
    if (index !== -1) {
      _data.workoutSessions[index] = {
        ...newSession,
        id: data.id,
        workoutId: data.workout_id,
        workoutName: data.workout_name,
        date: data.date,
        durationMinutes: data.duration_minutes,
        exercises: data.exercises || [],
        totalVolume: data.total_volume || 0,
        completedAt: data.completed_at,
      };
      notify();
      persistState();
    }
  })();

  return newSession;
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  const previousSessions = [..._data.workoutSessions];
  _data.workoutSessions = _data.workoutSessions.filter(session => session.id !== id);

  notify();
  persistState();

  void (async () => {
    const { error } = await supabase.from("workout_sessions").delete().eq("id", id);
    if (error) {
      console.error("Erro ao deletar sessão:", error);
      _data.workoutSessions = previousSessions;
      notify();
      persistState();
    }
  })();
}

export function getWorkoutSessions(): WorkoutSession[] {
  return [..._data.workoutSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getGymStats() {
  const totalExercises = _data.workouts.reduce((sum, workout) => sum + (workout.exercises?.length || 0), 0);
  return {
    totalWorkouts: _data.workoutSessions.length,
    totalWorkoutPlans: _data.workouts.length,
    totalExercises,
  };
}

export function getWorkoutProgressData(): { date: string; weight: number }[] {
  return _data.workoutSessions
    .map(session => {
      const exercises = session.exercises || [];
      const totalWeight = exercises.reduce((sum, exercise) => {
        const sets = exercise.sets || [];
        const avgWeight = sets.reduce((weightSum, set) => weightSum + set.weight, 0) / Math.max(sets.length, 1);
        return sum + avgWeight;
      }, 0);

      return {
        date: session.date,
        weight: totalWeight / Math.max(exercises.length, 1),
      };
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getExerciseProgressData(exerciseName: string): { date: string; weight: number; volume: number }[] {
  return _data.workoutSessions
    .map(session => {
      const exercise = session.exercises?.find(item => item.exerciseName === exerciseName);
      if (!exercise) return null;

      const sets = exercise.sets || [];
      const avgWeight = sets.reduce((sum, set) => sum + set.weight, 0) / Math.max(sets.length, 1);

      return {
        date: session.date,
        weight: avgWeight,
        volume: exercise.totalVolume,
      };
    })
    .filter((item): item is { date: string; weight: number; volume: number } => item !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function loadGymData(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Carregar Catálogo
  const { data: catalog, error: catalogError } = await supabase
    .from("exercise_catalog")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (catalogError) {
    console.error(catalogError);
  } else {
    _data.exerciseCatalog = (catalog || []).map(ex => ({
      id: ex.id,
      name: ex.name,
      targetMuscleGroup: ex.target_muscle_group,
      createdAt: ex.created_at,
    }));
  }

  // Carregar Treinos
  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select(`*, exercises:workout_exercises(*)`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (workoutsError) {
    console.error(workoutsError);
  } else {
    _data.workouts = (workouts || []).map(workout => ({
      id: workout.id,
      name: workout.name,
      dayOfWeek: workout.day_of_week,
      daysOfWeek: workout.days_of_week || (workout.day_of_week !== null ? [workout.day_of_week] : []),
      exercises: workout.exercises || [],
      createdAt: workout.created_at,
    }));
  }

  // Carregar Sessões
  const { data: sessions, error: sessionsError } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id);

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

  notify();
  persistState();
}

export function getLastExercisePerformance(exerciseName: string) {
  const sessions = [..._data.workoutSessions]
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() -
        new Date(a.completedAt).getTime()
    );

  for (const session of sessions) {
    const exercise = session.exercises?.find(
      item =>
        item.exerciseName.trim().toLowerCase() ===
        exerciseName.trim().toLowerCase()
    );

    if (exercise && exercise.sets?.length) {
      const lastSet = exercise.sets[exercise.sets.length - 1];

      return {
        weight: lastSet.weight,
        reps: lastSet.reps,
        date: session.date,
        sets: exercise.sets,
      };
    }
  }

  return null;
}
