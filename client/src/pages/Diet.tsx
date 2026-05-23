import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Droplet,
  TrendingUp,
  ChefHat,
  Trash2,
  Edit2,
  Search,
  Settings,
} from "lucide-react";
import { useStore } from "@/hooks/useStore";
import {
  getTodayMeals,
  getTodayNutrition,
  getTodayHydration,
  getDietSettings,
  addWaterCup,
  addMeal,
  deleteMeal,
  updateDietSettings,
} from "@/lib/store";
import { Modal } from "@/components/ui/Modal";
import { showToast } from "@/components/ui/FlowToast";
import {
  searchFoods,
  calculateMacrosForQuantity,
  type FoodSearchResult,
} from "@/lib/foodApi";
import { DietSettingsModal } from "./DietSettingsModal";
import type { Meal, FoodItem } from "@/lib/store";
import { supabase } from "@/lib/supabase";

const MEAL_TYPES = {
  breakfast: { label: "Café da Manhã", emoji: "🌅", color: "#F59E0B" },
  lunch: { label: "Almoço", emoji: "🍽️", color: "#10B981" },
  dinner: { label: "Jantar", emoji: "🌙", color: "#8B5CF6" },
  snack: { label: "Lanche", emoji: "🥤", color: "#EC4899" },
};

function NutritionCircle({
  value,
  goal,
  label,
  color,
}: {
  value: number;
  goal: number;
  label: string;
  color: string;
}) {
  const percentage = Math.min((value / goal) * 100, 100);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div style={{ position: "relative", width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: color,
              fontFamily: "Space Grotesk",
            }}
          >
            {Math.round(value)}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "DM Sans",
            }}
          >
            / {goal}
          </div>
        </div>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(255,255,255,0.7)",
          fontFamily: "DM Sans",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function MealCard({
  meal,
  onDelete,
}: {
  meal: Meal;
  onDelete: (id: string) => void;
}) {
  const config = MEAL_TYPES[meal.type];

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${config.color}33`,
        borderRadius: 12,
        padding: "14px",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{config.emoji}</span>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: config.color,
                fontFamily: "Space Grotesk",
              }}
            >
              {config.label}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "DM Sans",
              }}
            >
              {new Date(meal.timestamp).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
        <button
          onClick={() => onDelete(meal.id)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(239,68,68,0.1)",
            border: "none",
            color: "#EF4444",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(239,68,68,0.2)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(239,68,68,0.1)";
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Foods */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {meal.foods.map(food => (
          <div
            key={food.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
            }}
          >
            <div
              style={{ color: "rgba(255,255,255,0.7)", fontFamily: "DM Sans" }}
            >
              {food.name} ({food.quantity}
              {food.unit})
            </div>
            <div
              style={{
                color: config.color,
                fontWeight: 600,
                fontFamily: "Space Grotesk",
              }}
            >
              {food.calories} kcal
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          paddingTop: 12,
          borderTop: `1px solid ${config.color}22`,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.5)", fontFamily: "DM Sans" }}>
          Total:
        </div>
        <div style={{ color: config.color, fontFamily: "Space Grotesk" }}>
          {meal.totalCalories} kcal • P: {meal.totalProtein}g • C:{" "}
          {meal.totalCarbs}g • G: {meal.totalFat}g
        </div>
      </div>
    </div>
  );
}

function AddFoodModal({
  open,
  onClose,
  mealType,
}: {
  open: boolean;
  onClose: () => void;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | null;
}) {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [calculatingMacros, setCalculatingMacros] = useState(false);
  const [foodSuggestions, setFoodSuggestions] = useState<FoodSearchResult[]>(
    []
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(
    null
  );

  // Buscar sugestões de alimentos enquanto digita
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (foodName.length > 1) {
        try {
          const results = await searchFoods(foodName);
          setFoodSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Erro ao buscar alimentos:", error);
          setFoodSuggestions([]);
        }
      } else {
        setFoodSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [foodName]);

  // Calcular macros com API real
  const calculateMacrosWithAI = async () => {
    if (!foodName) {
      showToast("Digite o nome do alimento primeiro!", "info", "❌");
      return;
    }

    setCalculatingMacros(true);

    try {
      // Buscar alimentos
      const results = await searchFoods(foodName);

      if (results.length === 0) {
        showToast(
          "Alimento não encontrado. Preencha manualmente.",
          "info",
          "⚠️"
        );
        setCalculatingMacros(false);
        return;
      }

      // Usar o primeiro resultado
      const food = results[0];
      setSelectedFood(food);

      // Calcular para a quantidade especificada
      const quantityValue = parseFloat(quantity) || 100;
      const macros = calculateMacrosForQuantity(
        food.nutrients,
        quantityValue,
        food.servingSize
      );

      setCalories(macros.calories.toString());
      setProtein(macros.protein.toString());
      setCarbs(macros.carbs.toString());
      setFat(macros.fat.toString());

      setShowSuggestions(false);
      showToast(`Macros de ${food.description} calculados!`, "success", "✅");
    } catch (error) {
      console.error("Erro ao calcular macros:", error);
      showToast("Erro ao buscar dados. Tente novamente.", "info", "❌");
    } finally {
      setCalculatingMacros(false);
    }
  };

  // Selecionar alimento da sugestão
  const handleSelectFood = async (food: FoodSearchResult) => {
    setFoodName(food.description);
    setSelectedFood(food);
    setShowSuggestions(false);

    // Calcular macros automaticamente
    const quantityValue = parseFloat(quantity) || 100;
    const macros = calculateMacrosForQuantity(
      food.nutrients,
      quantityValue,
      food.servingSize
    );

    setCalories(macros.calories.toString());
    setProtein(macros.protein.toString());
    setCarbs(macros.carbs.toString());
    setFat(macros.fat.toString());
  };

  const handleAddFood = () => {
    if (!foodName || !calories) return;
    const newFood: FoodItem = {
      id: Math.random().toString(36).substring(7),
      name: foodName,
      calories: parseFloat(calories),
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      quantity: parseFloat(quantity),
      unit: "g",
    };
    setFoods([...foods, newFood]);
    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setQuantity("100");
  };

  const handleSubmit = async () => {
    if (foods.length === 0 || !mealType) return;
    const totalCalories = foods.reduce((sum, f) => sum + f.calories, 0);
    const totalProtein = foods.reduce((sum, f) => sum + f.protein, 0);
    const totalCarbs = foods.reduce((sum, f) => sum + f.carbs, 0);
    const totalFat = foods.reduce((sum, f) => sum + f.fat, 0);

    const meal: Omit<Meal, "id" | "timestamp"> = {
      type: mealType,
      date: new Date().toISOString().split("T")[0],
      foods,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
    };

    await addMeal(meal);
    showToast("Refeição adicionada!", "success", "✅");
    setFoods([]);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar Alimento">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Food Input with AI Button */}
        <div style={{ position: "relative" }}>
          <label
            style={{
              fontFamily: "DM Sans",
              fontSize: 12,
              color: "var(--muted-foreground)",
              marginBottom: 6,
              display: "block",
            }}
          >
            Nome do Alimento *
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="fz-input"
              placeholder="Ex: Frango grelhado"
              value={foodName}
              onChange={e => setFoodName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={calculateMacrosWithAI}
              disabled={calculatingMacros || !foodName}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                background: calculatingMacros
                  ? "rgba(168,85,247,0.3)"
                  : "rgba(168,85,247,0.2)",
                border: "1px solid rgba(168,85,247,0.4)",
                color: "#A855F7",
                cursor:
                  calculatingMacros || !foodName ? "not-allowed" : "pointer",
                fontFamily: "DM Sans",
                fontWeight: 600,
                fontSize: 12,
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
                opacity: calculatingMacros || !foodName ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                if (!calculatingMacros && foodName) {
                  e.currentTarget.style.background = "rgba(168,85,247,0.3)";
                }
              }}
              onMouseLeave={e => {
                if (!calculatingMacros && foodName) {
                  e.currentTarget.style.background = "rgba(168,85,247,0.2)";
                }
              }}
            >
              {calculatingMacros ? "Calc..." : "Calcular"}
            </button>
          </div>

          {showSuggestions && foodSuggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                background: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(168,85,247,0.3)",
                borderRadius: 8,
                maxHeight: 200,
                overflowY: "auto",
                zIndex: 1000,
              }}
            >
              {foodSuggestions.slice(0, 5).map((food, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectFood(food)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    background:
                      idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                    color: "#A855F7",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: 13,
                    fontFamily: "DM Sans",
                    borderBottom:
                      idx < foodSuggestions.length - 1
                        ? "1px solid rgba(255,255,255,0.05)"
                        : "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = "rgba(168,85,247,0.2)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background =
                      idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent";
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>
                    {food.description}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(168,85,247,0.6)" }}>
                    {food.nutrients.calories} kcal • P: {food.nutrients.protein}
                    g • C: {food.nutrients.carbs}g • G: {food.nutrients.fat}g
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Nutrition Inputs */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div>
            <label
              style={{
                fontFamily: "DM Sans",
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginBottom: 6,
                display: "block",
              }}
            >
              Calorias *
            </label>
            <input
              className="fz-input"
              type="number"
              placeholder="0"
              value={calories}
              onChange={e => setCalories(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontFamily: "DM Sans",
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginBottom: 6,
                display: "block",
              }}
            >
              Quantidade (g)
            </label>
            <input
              className="fz-input"
              type="number"
              placeholder="100"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontFamily: "DM Sans",
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginBottom: 6,
                display: "block",
              }}
            >
              Proteína (g)
            </label>
            <input
              className="fz-input"
              type="number"
              placeholder="0"
              value={protein}
              onChange={e => setProtein(e.target.value)}
            />
          </div>
          <div>
            <label
              style={{
                fontFamily: "DM Sans",
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginBottom: 6,
                display: "block",
              }}
            >
              Carboidratos (g)
            </label>
            <input
              className="fz-input"
              type="number"
              placeholder="0"
              value={carbs}
              onChange={e => setCarbs(e.target.value)}
            />
          </div>
          <div style={{ gridColumn: "1 / 2" }}>
            <label
              style={{
                fontFamily: "DM Sans",
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginBottom: 6,
                display: "block",
              }}
            >
              Gordura (g)
            </label>
            <input
              className="fz-input"
              type="number"
              placeholder="0"
              value={fat}
              onChange={e => setFat(e.target.value)}
            />
          </div>
        </div>

        {/* Add Button */}
        <button
          onClick={handleAddFood}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            background: "rgba(245,158,11,0.2)",
            border: "1px solid rgba(245,158,11,0.3)",
            color: "#A855F7",
            cursor: "pointer",
            fontFamily: "DM Sans",
            fontWeight: 600,
            fontSize: 13,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(245,158,11,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(245,158,11,0.2)";
          }}
        >
          + Adicionar Alimento
        </button>

        {/* Foods List */}
        {foods.length > 0 && (
          <div
            style={{
              background: "rgba(255,255,255,0.02)",
              borderRadius: 8,
              padding: 12,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.7)",
                marginBottom: 8,
                fontFamily: "DM Sans",
              }}
            >
              Alimentos adicionados ({foods.length}):
            </div>
            {foods.map((food, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                  padding: "6px 0",
                  borderBottom:
                    idx < foods.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                }}
              >
                <div
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontFamily: "DM Sans",
                  }}
                >
                  {food.name} ({food.quantity}g)
                </div>
                <div
                  style={{
                    color: "#A855F7",
                    fontWeight: 600,
                    fontFamily: "Space Grotesk",
                  }}
                >
                  {food.calories} kcal
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={foods.length === 0}
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            background: foods.length > 0 ? "#A855F7" : "rgba(168,85,247,0.3)",
            border: "none",
            color: foods.length > 0 ? "#000" : "rgba(255,255,255,0.3)",
            cursor: foods.length > 0 ? "pointer" : "not-allowed",
            fontFamily: "Space Grotesk",
            fontWeight: 600,
            fontSize: 14,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            if (foods.length > 0) e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={e => {
            if (foods.length > 0) e.currentTarget.style.opacity = "1";
          }}
        >
          Salvar Refeição
        </button>
      </div>
    </Modal>
  );
}

export default function Diet() {
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  const data = useStore();
  const [showAddFood, setShowAddFood] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<
    "breakfast" | "lunch" | "dinner" | "snack" | null
  >(null);
  const [showDietSettings, setShowDietSettings] = useState(false);
  const [dietSettings, setDietSettings] = useState(data.diet.settings);

  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);

  const [todayNutrition, setTodayNutrition] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  const [hydration, setHydration] = useState({
    cupsConsumed: 0,
    goal: 8,
  });

  const mealsByType = useMemo(() => {
    const grouped: Record<string, Meal[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    todayMeals.forEach(meal => {
      grouped[meal.type].push(meal);
    });
    return grouped;
  }, [todayMeals]);

  const handleAddMeal = async (
    type: "breakfast" | "lunch" | "dinner" | "snack"
  ) => {
    setSelectedMealType(type);
    setShowAddFood(true);

    setTodayMeals(await getTodayMeals());
    setTodayNutrition(await getTodayNutrition());
  };

  const handleDeleteMeal = async (id: string) => {
    await deleteMeal(id);
    showToast("Refeição removida", "success", "✅");
  };

  const handleAddWater = async () => {
    await addWaterCup();
    showToast("Copo de água adicionado!", "success", "💧");
  };

  const handleSaveDietSettings = async () => {
    await updateDietSettings(dietSettings);
    showToast("Metas de dieta atualizadas!", "success", "✅");
    setShowDietSettings(false);
  };

  // Atualizar dietSettings quando data.diet.settings muda
  useEffect(() => {
    async function refreshMeals() {
      setTodayMeals(await getTodayMeals());
      setTodayNutrition(await getTodayNutrition());
      setHydration(await getTodayHydration());

      const settings = await getDietSettings();

      setDietSettings(
        settings || {
          dailyCalorieGoal: 2000,
          proteinGoal: 150,
          carbsGoal: 250,
          fatGoal: 70,
          waterGoal: 8,
          restrictions: [],
          preferences: [],
        }
      );
    }

    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", userData.user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    }

    refreshMeals();
    loadProfile();


    const channel = supabase
      .channel("diet-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meals",
        },
        async () => {
          await refreshMeals();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "diet_settings",
        },
        async () => {
          const settings = await getDietSettings();

          if (settings) {
            setDietSettings(settings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const hours = new Date().getHours();
  let greeting = "Olá";

  if (hours < 12) {
    greeting = "Bom dia";
  } else if (hours < 18) {
    greeting = "Boa tarde";
  } else {
    greeting = "Boa noite";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <ChefHat size={28} color="#A855F7" />
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "white",
                fontFamily: "Space Grotesk",
                margin: 0,
              }}
            >
              {greeting}, {profile?.name || "Usuário"}
            </h1>
          </div>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "DM Sans",
              margin: 0,
            }}
          >
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
        <button
          onClick={() => setShowDietSettings(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "rgba(168,85,247,0.2)",
            border: "1px solid rgba(168,85,247,0.3)",
            color: "#A855F7",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(168,85,247,0.3)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(168,85,247,0.2)";
          }}
          title="Ajustar metas de dieta"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Calorie Goal Progress */}
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(168,85,247,0.1) 0%, rgba(168,85,247,0.05) 100%)",
          border: "1px solid rgba(168,85,247,0.2)",
          borderRadius: 16,
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "DM Sans",
            }}
          >
            Meta Calórica Diária
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#A855F7",
              fontFamily: "Space Grotesk",
            }}
          >
            {todayNutrition.calories} / {dietSettings.dailyCalorieGoal} kcal
          </div>
        </div>
        <div
          style={{
            width: "100%",
            height: 8,
            background: "rgba(255,255,255,0.1)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              background:
                todayNutrition.calories > dietSettings.dailyCalorieGoal
                  ? "#EF4444"
                  : "#A855F7",
              width: `${Math.min((todayNutrition.calories / dietSettings.dailyCalorieGoal) * 100, 100)}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Nutrition Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 12,
        }}
      >
        <NutritionCircle
          value={todayNutrition.protein}
          goal={dietSettings.proteinGoal}
          label="Proteína"
          color="#10B981"
        />
        <NutritionCircle
          value={todayNutrition.carbs}
          goal={dietSettings.carbsGoal}
          label="Carboidratos"
          color="#3B82F6"
        />
        <NutritionCircle
          value={todayNutrition.fat}
          goal={dietSettings.fatGoal}
          label="Gordura"
          color="#EC4899"
        />
        <NutritionCircle
          value={todayNutrition.calories}
          goal={dietSettings.dailyCalorieGoal}
          label="Calorias"
          color="#F59E0B"
        />
      </div>

      {/* Hydration */}
      <div
        style={{
          background: "rgba(59,182,246,0.1)",
          border: "1px solid rgba(59,182,246,0.2)",
          borderRadius: 12,
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Droplet size={24} color="#3B82F6" />
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#3B82F6",
                fontFamily: "Space Grotesk",
              }}
            >
              Hidratação
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.5)",
                fontFamily: "DM Sans",
              }}
            >
              {hydration.cupsConsumed} / {hydration.goal} copos
            </div>
          </div>
        </div>
        <button
          onClick={handleAddWater}
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: "#3B82F6",
            border: "none",
            color: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = "0.9";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = "1";
          }}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Meals */}
      <div>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "white",
            fontFamily: "Space Grotesk",
            margin: "0 0 16px 0",
          }}
        >
          Refeições do Dia
        </h2>

        {(Object.keys(MEAL_TYPES) as Array<keyof typeof MEAL_TYPES>).map(
          type => (
            <div key={type} style={{ marginBottom: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{MEAL_TYPES[type].emoji}</span>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: MEAL_TYPES[type].color,
                      fontFamily: "Space Grotesk",
                    }}
                  >
                    {MEAL_TYPES[type].label}
                  </div>
                </div>
                <button
                  onClick={() => handleAddMeal(type)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${MEAL_TYPES[type].color}22`,
                    border: `1px solid ${MEAL_TYPES[type].color}44`,
                    color: MEAL_TYPES[type].color,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${MEAL_TYPES[type].color}33`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = `${MEAL_TYPES[type].color}22`;
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>

              {mealsByType[type].length > 0 ? (
                mealsByType[type].map(meal => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onDelete={handleDeleteMeal}
                  />
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 12,
                    border: "1px dashed rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 13,
                    fontFamily: "DM Sans",
                  }}
                >
                  Nenhuma refeição registrada
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* Add Food Modal */}
      <AddFoodModal
        open={showAddFood}
        onClose={() => {
          setShowAddFood(false);
          setSelectedMealType(null);
        }}
        mealType={selectedMealType}
      />

      {/* Diet Settings Modal */}
      <DietSettingsModal
        open={showDietSettings}
        onClose={() => setShowDietSettings(false)}
        dietSettings={dietSettings}
        onSettingsChange={setDietSettings}
        onSave={handleSaveDietSettings}
      />

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 1024px) {
          div[style*="gridTemplateColumns: '1fr 1fr 1fr 1fr'"] {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
