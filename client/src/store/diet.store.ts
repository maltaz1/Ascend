import { supabase } from "@/lib/supabase";
import { DietSettings, Meal } from "./types";
import { _data, notify, persistState } from "./state";
import { generateId, getTodayString } from "./utils";

export async function loadDietData(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data: mealsData, error: mealsError } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", user.id);

  if (mealsError) {
    console.error("Erro ao carregar refeições:", mealsError);
    return;
  }

  _data.diet.meals = (mealsData || []).map(meal => ({
    id: meal.id,
    type: meal.type,
    date: meal.date,
    foods: meal.foods,
    totalCalories: meal.total_calories,
    totalProtein: meal.total_protein,
    totalCarbs: meal.total_carbs,
    totalFat: meal.total_fat,
    timestamp: meal.timestamp,
  }));

  const { data: hydrationData, error: hydrationError } = await supabase
    .from("hydration_logs")
    .select("*")
    .eq("user_id", user.id);

  if (hydrationError) {
    console.error("Erro ao carregar hidratação:", hydrationError);
    return;
  }

  _data.diet.hydration = (hydrationData || []).map(h => ({
    date: h.date,
    cupsConsumed: h.cups_consumed,
    goal: h.goal,
  }));

  const { data: settingsData } = await supabase
    .from("diet_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (settingsData) {
    _data.diet.settings = {
      dailyCalorieGoal: settingsData.daily_calorie_goal || 2200,
      proteinGoal: settingsData.protein_goal || 150,
      carbsGoal: settingsData.carbs_goal || 250,
      fatGoal: settingsData.fat_goal || 70,
      waterGoal: settingsData.water_goal || 2,
      restrictions: settingsData.restrictions || [],
      preferences: settingsData.preferences || [],
    };
  }

  notify();
  persistState();
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

  _data.diet.meals.push(optimisticMeal);
  notify();
  persistState();

  void (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Usuário não encontrado");
      _data.diet.meals = _data.diet.meals.filter(item => item.id !== optimisticMeal.id);
      notify();
      persistState();
      return;
    }

    const { data, error } = await supabase
      .from("meals")
      .insert([
        {
          user_id: user.id,
          type: meal.type,
          date: meal.date,
          foods: meal.foods,
          total_calories: meal.totalCalories,
          total_protein: meal.totalProtein,
          total_carbs: meal.totalCarbs,
          total_fat: meal.totalFat,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      console.error("Erro ao adicionar refeição:", error);
      _data.diet.meals = _data.diet.meals.filter(item => item.id !== optimisticMeal.id);
      notify();
      persistState();
      return;
    }

    const index = _data.diet.meals.findIndex(item => item.id === optimisticMeal.id);
    if (index !== -1) {
      _data.diet.meals[index] = {
        id: data.id,
        type: data.type,
        date: data.date,
        foods: data.foods,
        totalCalories: data.total_calories,
        totalProtein: data.total_protein,
        totalCarbs: data.total_carbs,
        totalFat: data.total_fat,
        timestamp: optimisticMeal.timestamp,
      };
      notify();
      persistState();
    }
  })();
}

export function getMealsForDate(date: string): Meal[] {
  return _data.diet.meals.filter(item => item.date === date);
}

export function updateMeal(id: string, updates: Partial<Meal>): void {
  const index = _data.diet.meals.findIndex(item => item.id === id);
  if (index === -1) return;

  _data.diet.meals[index] = { ..._data.diet.meals[index], ...updates };
  notify();
  persistState();
}

export async function deleteMeal(id: string): Promise<void> {
  const previousMeals = [..._data.diet.meals];
  _data.diet.meals = _data.diet.meals.filter(item => item.id !== id);

  notify();
  persistState();

  void (async () => {
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) {
      console.error("Erro ao deletar refeição:", error);
      _data.diet.meals = previousMeals;
      notify();
      persistState();
    }
  })();
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

export async function updateDietSettings(settings: DietSettings): Promise<void> {
  const previousSettings = { ..._data.diet.settings };
  _data.diet.settings = settings;
  notify();
  persistState();

  void (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("Usuário não encontrado");
      _data.diet.settings = previousSettings;
      notify();
      persistState();
      return;
    }

    const payload = {
      user_id: user.id,
      daily_calorie_goal: settings.dailyCalorieGoal,
      protein_goal: settings.proteinGoal,
      carbs_goal: settings.carbsGoal,
      fat_goal: settings.fatGoal,
      water_goal: settings.waterGoal,
      restrictions: settings.restrictions,
      preferences: settings.preferences,
    };

    const { error } = await supabase.from("diet_settings").upsert(payload, {
      onConflict: "user_id",
    });

    if (error) {
      console.error("Erro ao salvar metas:", error);
      _data.diet.settings = previousSettings;
      notify();
      persistState();
    }
  })();
}

export async function addWaterCup(): Promise<void> {
  const today = getTodayString();
  const existing = _data.diet.hydration.find(item => item.date === today);

  if (existing) {
    existing.cupsConsumed += 1;
  } else {
    _data.diet.hydration.push({
      date: today,
      cupsConsumed: 1,
      goal: _data.diet.settings.waterGoal * 4,
    });
  }

  notify();
  persistState();

  void (async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: existingRows, error: selectError } = await supabase
      .from("hydration_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today);

    if (selectError) {
      console.error(selectError);
      return;
    }

    const row = existingRows?.[0];
    if (row) {
      await supabase
        .from("hydration_logs")
        .update({ cups_consumed: row.cups_consumed + 1 })
        .eq("id", row.id);
    } else {
      await supabase.from("hydration_logs").insert([
        {
          user_id: user.id,
          date: today,
          cups_consumed: 1,
          goal: _data.diet.settings.waterGoal * 4,
        },
      ]);
    }
  })();
}

export function getTodayHydration() {
  const today = getTodayString();
  return (
    _data.diet.hydration.find(item => item.date === today) || {
      date: today,
      cupsConsumed: 0,
      goal: _data.diet.settings.waterGoal * 4,
    }
  );
}

export function getDietData() {
  return _data.diet;
}

export async function getDietSettings(): Promise<DietSettings | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("diet_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar metas:", error);
    return null;
  }

  return {
    dailyCalorieGoal: data.daily_calorie_goal,
    proteinGoal: data.protein_goal,
    carbsGoal: data.carbs_goal,
    fatGoal: data.fat_goal,
    waterGoal: data.water_goal,
    restrictions: data.restrictions || [],
    preferences: data.preferences || [],
  };
}
