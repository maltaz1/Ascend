import { AppData, DEFAULT_ACHIEVEMENTS, DEFAULT_DATA } from "./types";

const STORAGE_KEY = "flowzone_data";
let saveTimeout: number | undefined;

function normalizeAppData(parsed: Partial<AppData>): AppData {
  const achievements = parsed.achievements || [];
  const existingIds = new Set(achievements.map(a => a.id));
  const newAchievements = DEFAULT_ACHIEVEMENTS.filter(a => !existingIds.has(a.id));

  const normalizedWorkouts = (parsed.workouts || []).map(workout => ({
    ...workout,
    exercises: (workout.exercises || []).map(exercise => ({
      ...exercise,
      series: exercise.series || 3,
      repMin: exercise.repMin || 8,
      repMax: exercise.repMax || 12,
      restSeconds: exercise.restSeconds || 60,
    })),
  }));

  const normalizedSessions = (parsed.workoutSessions || []).map(session => ({
    ...session,
    exercises: (session.exercises || []).map(exercise => ({
      ...exercise,
      sets: exercise.sets || [],
      totalVolume: exercise.totalVolume || 0,
    })),
    totalVolume: session.totalVolume || 0,
  }));

  const normalizedPrayerConversations = (parsed.prayerConversations || []).map(conversation => ({
    ...conversation,
    messages: conversation.messages || [],
  }));

  const normalizedDiet = {
    meals: parsed.diet?.meals || [],
    settings: {
      dailyCalorieGoal: parsed.diet?.settings?.dailyCalorieGoal || 2200,
      proteinGoal: parsed.diet?.settings?.proteinGoal || 150,
      carbsGoal: parsed.diet?.settings?.carbsGoal || 250,
      fatGoal: parsed.diet?.settings?.fatGoal || 70,
      waterGoal: parsed.diet?.settings?.waterGoal || 2,
      restrictions: parsed.diet?.settings?.restrictions || [],
      preferences: parsed.diet?.settings?.preferences || [],
    },
    hydration: parsed.diet?.hydration || [],
    dietPoints: parsed.diet?.dietPoints || 0,
    dietStreak: parsed.diet?.dietStreak || 0,
  };

  return {
    ...DEFAULT_DATA,
    ...parsed,
    achievements: [...achievements, ...newAchievements],
    workouts: normalizedWorkouts,
    workoutSessions: normalizedSessions,
    prayerConversations: normalizedPrayerConversations,
    favoritePrayers: parsed.favoritePrayers || [],
    diet: normalizedDiet,
    financial: parsed.financial || { transactions: [] },
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_DATA, achievements: DEFAULT_ACHIEVEMENTS };
    }

    const parsed = JSON.parse(raw) as Partial<AppData>;
    return normalizeAppData(parsed);
  } catch {
    return { ...DEFAULT_DATA, achievements: DEFAULT_ACHIEVEMENTS };
  }
}

export function saveAppData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveAppDataDebounced(data: AppData): void {
  if (saveTimeout) {
    window.clearTimeout(saveTimeout);
  }

  saveTimeout = window.setTimeout(() => {
    saveAppData(data);
  }, 200);
}
