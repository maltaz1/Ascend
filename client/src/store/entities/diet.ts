import { supabase } from "@/lib/supabase";
import { store } from "../store";
import { normalizeEntities, upsertEntity, removeEntity, setLoading, setError } from "../core/entity";
import { generateId, getTodayString } from "../utils";
import { loadMeals, createMealRow, deleteMealRow } from "@/lib/database";
import type { Meal, DietSettings, HydrationLog } from "../types";

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function loadDietData(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  store.update(state => {
    state.meals = setLoading(state.meals, true);
  });

  const mealRows = await loadMeals(userId);
  const meals = mealRows.map(row => ({
    id: row.id,
    type: row.type,
    date: row.date,
    foods: row.foods as Meal["foods"],
    totalCalories: row.total_calories,
    totalProtein: row.total_protein,
    totalCarbs: row.total_carbs,
    totalFat: row.total_fat,
    timestamp: row.timestamp,
  }));

  store.update(state => {
    state.meals = normalizeEntities(meals);
    state.meals.error = null;
  });
}

export async function addMeal(meal: Omit<Meal, "id" | "timestamp">): Promise<void> {
  const optimisticMeal: Meal = {
    id: generateId(),
    type: meal.type,
    date: meal.date,
    foods: meal.foods,
    totalCalories: meal.totalCalories,
    totalProtein: meal.totalProtein,
    totalCarbs: meal.totalCarbs,
    totalFat: meal.totalFat,
    timestamp: new Date().toISOString(),
  };

  store.update(state => {
    state.meals = upsertEntity(state.meals, optimisticMeal);
  });

  const userId = await getUserId();
  if (!userId) {
    return;
  }

  try {
    const row = await createMealRow({
      user_id: userId,
      type: meal.type,
      date: meal.date,
      foods: meal.foods,
      total_calories: meal.totalCalories,
      total_protein: meal.totalProtein,
      total_carbs: meal.totalCarbs,
      total_fat: meal.totalFat,
      timestamp: optimisticMeal.timestamp,
    });

    const created = {
      id: row.id,
      type: row.type,
      date: row.date,
      foods: row.foods as Meal["foods"],
      totalCalories: row.total_calories,
      totalProtein: row.total_protein,
      totalCarbs: row.total_carbs,
      totalFat: row.total_fat,
      timestamp: row.timestamp,
    };

    store.update(state => {
      state.meals = upsertEntity(state.meals, created);
    });
  } catch (error) {
    store.update(state => {
      state.meals = removeEntity(state.meals, optimisticMeal.id);
      state.meals = setError(state.meals, "Falha ao adicionar refeição");
    });
  }
}

export function getMealsForDate(date: string): Meal[] {
  return Object.values(store.getState().meals.byId).filter(meal => meal.date === date);
}

export function getTodayMeals(): Meal[] {
  return getMealsForDate(getTodayString());
}

export function getTodayNutrition() {
  const meals = getTodayMeals();
  return {
    calories: meals.reduce((sum, meal) => sum + meal.totalCalories, 0),
    protein: meals.reduce((sum, meal) => sum + meal.totalProtein, 0),
    carbs: meals.reduce((sum, meal) => sum + meal.totalCarbs, 0),
    fat: meals.reduce((sum, meal) => sum + meal.totalFat, 0),
  };
}

export async function updateMeal(id: string, updates: Partial<Meal>): Promise<void> {
  const existing = store.getState().meals.byId[id];
  if (!existing) return;

  store.update(state => {
    state.meals = upsertEntity(state.meals, { ...existing, ...updates });
  });
}

export async function deleteMeal(id: string): Promise<void> {
  const previous = store.getState().meals.byId[id];
  if (!previous) return;

  store.update(state => {
    state.meals = removeEntity(state.meals, id);
  });

  try {
    await deleteMealRow(id);
  } catch (error) {
    store.update(state => {
      state.meals = upsertEntity(state.meals, previous);
      state.meals = setError(state.meals, "Falha ao deletar refeição");
    });
  }
}

export async function updateDietSettings(settings: DietSettings): Promise<void> {
  store.update(state => {
    state.dietSettings = settings;
  });

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from("diet_settings")
    .upsert({
      user_id: userId,
      daily_calorie_goal: settings.dailyCalorieGoal,
      protein_goal: settings.proteinGoal,
      carbs_goal: settings.carbsGoal,
      fat_goal: settings.fatGoal,
      water_goal: settings.waterGoal,
      restrictions: settings.restrictions,
      preferences: settings.preferences,
    }, { onConflict: "user_id" });

  if (error) {
    store.update(state => {
      state.dietSettings = store.getState().dietSettings;
    });
  }
}

export async function addWaterCup(): Promise<void> {
  const today = getTodayString();
  const state = store.getState();
  const existing = state.hydration.find(item => item.date === today);

  store.update(storeState => {
    if (existing) {
      existing.cupsConsumed += 1;
    } else {
      storeState.hydration = [
        ...storeState.hydration,
        {
          date: today,
          cupsConsumed: 1,
          goal: storeState.dietSettings.waterGoal * 4,
        },
      ];
    }
  });

  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return;

  const { data: existingRows, error: selectError } = await supabase
    .from("hydration_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("date", today);

  if (selectError) return;

  if (existingRows?.length) {
    await supabase
      .from("hydration_logs")
      .update({ cups_consumed: existingRows[0].cups_consumed + 1 })
      .eq("id", existingRows[0].id);
  } else {
    await supabase.from("hydration_logs").insert([
      {
        user_id: userId,
        date: today,
        cups_consumed: 1,
        goal: store.getState().dietSettings.waterGoal * 4,
      },
    ]);
  }
}

export function getTodayHydration(): HydrationLog {
  const today = getTodayString();
  return (
    store.getState().hydration.find(item => item.date === today) || {
      date: today,
      cupsConsumed: 0,
      goal: store.getState().dietSettings.waterGoal * 4,
    }
  );
}

export function getDietData() {
  const state = store.getState();
  return {
    meals: Object.values(state.meals.byId),
    settings: state.dietSettings,
    hydration: state.hydration,
    dietPoints: state.dietPoints,
    dietStreak: state.dietStreak,
  };
}

export async function getDietSettings(): Promise<DietSettings | null> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return null;

  const { data: settingsData, error } = await supabase
    .from("diet_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !settingsData) {
    return null;
  }

  return {
    dailyCalorieGoal: settingsData.daily_calorie_goal,
    proteinGoal: settingsData.protein_goal,
    carbsGoal: settingsData.carbs_goal,
    fatGoal: settingsData.fat_goal,
    waterGoal: settingsData.water_goal,
    restrictions: settingsData.restrictions || [],
    preferences: settingsData.preferences || [],
  };
}
