import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  addMeal,
  addWaterMl,
  deleteMeal,
  getTodayHydration,
  getTodayMeals,
  getTodayNutrition,
  getTodayString,
  updateDietSettings,
  type DietSettings,
  type FoodItem,
  type Meal,
} from "@/lib/store";
import { calculateMacrosForQuantity, searchFoods, type FoodSearchResult } from "@/lib/foodApi";
import { generateId } from "@/store/utils";
import { notifyInfo, notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { ProGate } from "@/components/ProGate";
import { Button, Card, Input, Marginalia, ProgressBar, ProgressRing, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { longDate } from "@/components/rows";
import { fonts, resolveColor, useTheme } from "@/theme";
import { Glyph, stripEmoji } from "@/components/Glyph";

// Mesmos tipos de refeição de pages/Diet.tsx.
const MEAL_TYPES = {
  breakfast: { label: "Café da manhã", emoji: "🍳", color: "var(--accent)" },
  lunch: { label: "Almoço", emoji: "🍽️", color: "#a78bfa" },
  dinner: { label: "Jantar", emoji: "🌙", color: "var(--primary)" },
  snack: { label: "Lanche", emoji: "🍎", color: "#c084fc" },
} as const;
type MealType = keyof typeof MEAL_TYPES;

const WATER_COLOR = "#38BDF8";

export default function DietScreen() {
  return (
    <ProGate section="diet">
      <Diet />
    </ProGate>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const num = (value: string) => parseFloat(value.replace(",", "."));

// Porta de pages/Diet.tsx.
function Diet() {
  const theme = useTheme();
  const data = useStore();
  const [addFor, setAddFor] = useState<MealType | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showWater, setShowWater] = useState(false);

  const nutrition = getTodayNutrition();
  const hydration = getTodayHydration();
  const meals = getTodayMeals();
  const settings = data.diet.settings;
  const calPercent = (nutrition.calories / Math.max(1, settings.dailyCalorieGoal)) * 100;

  const rings = [
    { label: "Proteína", value: nutrition.protein, goal: settings.proteinGoal, color: theme.success },
    { label: "Carboidratos", value: nutrition.carbs, goal: settings.carbsGoal, color: theme.primary },
    { label: "Gordura", value: nutrition.fat, goal: settings.fatGoal, color: theme.pink },
    { label: "Calorias", value: nutrition.calories, goal: settings.dailyCalorieGoal, color: theme.accent },
  ];

  const removeMeal = async (meal: Meal) => {
    await deleteMeal(meal.id);
    notifySuccess("Refeição removida");
  };

  return (
    <Screen>
      <Card style={{ gap: 8, paddingVertical: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Marginalia index="10">Registro alimentar</Marginalia>
            <Txt variant="hero" style={{ fontSize: 30 }}>
              {greeting()}, {data.user.name || "Usuário"}
            </Txt>
            <Txt muted>{longDate()}</Txt>
          </View>
          <Pressable
            onPress={() => setShowSettings(true)}
            accessibilityLabel="Ajustar metas de dieta"
            style={{ width: 40, height: 40, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.primaryBorder, backgroundColor: theme.primarySoft }}
          >
            <Ionicons name="settings-outline" size={18} color={theme.primary} />
          </Pressable>
        </View>
      </Card>

      <Card>
        <Marginalia index="11">Meta calórica</Marginalia>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt variant="marginalia" style={{ fontSize: 12 }}>
            Meta calórica diária
          </Txt>
          <Txt variant="h3" color={theme.primary}>
            {Math.round(nutrition.calories)} / {settings.dailyCalorieGoal} kcal
          </Txt>
        </View>
        <ProgressBar percent={calPercent} height={7} color={nutrition.calories > settings.dailyCalorieGoal ? theme.danger : theme.primary} />
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 22 }}>
        {rings.map(r => (
          <View key={r.label} style={{ width: "50%", alignItems: "center", gap: 10 }}>
            <ProgressRing percent={(r.value / Math.max(1, r.goal)) * 100} size={104} stroke={8} color={r.color}>
              <Txt style={{ fontFamily: fonts.display, fontSize: 20 }} color={r.color}>
                {Math.round(r.value)}
              </Txt>
              <Txt variant="caption" muted>
                / {r.goal}
              </Txt>
            </ProgressRing>
            <Txt variant="marginalia" style={{ fontSize: 11.5 }}>
              {r.label}
            </Txt>
          </View>
        ))}
      </View>

      <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Ionicons name="water-outline" size={22} color={WATER_COLOR} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1 }} color={WATER_COLOR}>
            HIDRATAÇÃO
          </Txt>
          <Txt variant="label" muted>
            {hydration.cupsConsumed} / {hydration.goal} mL
          </Txt>
        </View>
        <Pressable
          onPress={() => setShowWater(true)}
          accessibilityLabel="Registrar hidratação"
          style={{ width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: WATER_COLOR }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </Card>

      <Marginalia index="12">Refeições</Marginalia>
      {(Object.keys(MEAL_TYPES) as MealType[]).map(type => {
        const config = MEAL_TYPES[type];
        const color = resolveColor(config.color, theme);
        const ofType = meals.filter(m => m.type === type);
        return (
          <View key={type} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${color}66` }}>
                <Glyph emoji={config.emoji} size={14} />
              </View>
              <Txt variant="h3" color={color} style={{ flex: 1 }}>
                {config.label}
              </Txt>
              <Pressable
                onPress={() => setAddFor(type)}
                accessibilityLabel={`Adicionar ${config.label}`}
                style={{ width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: `${color}55`, backgroundColor: `${color}22` }}
              >
                <Ionicons name="add" size={20} color={color} />
              </Pressable>
            </View>
            {ofType.length > 0 ? (
              ofType.map(meal => <MealCard key={meal.id} meal={meal} color={color} label={config.label} onDelete={() => void removeMeal(meal)} />)
            ) : (
              <View style={{ alignItems: "center", padding: 20, borderRadius: 14, borderWidth: 1, borderStyle: "dashed", borderColor: theme.border }}>
                <Txt variant="caption" muted>
                  Nenhuma refeição registrada
                </Txt>
              </View>
            )}
          </View>
        );
      })}

      <AddFoodSheet type={addFor} onClose={() => setAddFor(null)} />
      <DietSettingsSheet key={showSettings ? "open" : "closed"} visible={showSettings} settings={settings} onClose={() => setShowSettings(false)} />
      <WaterSheet visible={showWater} onClose={() => setShowWater(false)} currentMl={hydration.cupsConsumed} goalMl={hydration.goal} />
    </Screen>
  );
}

function MealCard({ meal, color, label, onDelete }: { meal: Meal; color: string; label: string; onDelete: () => void }) {
  const theme = useTheme();
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 18, height: 2, backgroundColor: color, opacity: 0.8 }} />
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong" color={color}>
            {label}
          </Txt>
          <Txt variant="caption" muted>
            {new Date(meal.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </Txt>
        </View>
        <Pressable
          onPress={onDelete}
          accessibilityLabel="Remover refeição"
          style={{ width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: `${theme.danger}1a` }}
        >
          <Ionicons name="trash-outline" size={16} color={theme.danger} />
        </Pressable>
      </View>
      {meal.foods.map(food => (
        <View key={food.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Txt variant="label" style={{ flex: 1 }} numberOfLines={1}>
            {food.name} ({food.quantity}
            {food.unit})
          </Txt>
          <Txt variant="caption" color={color} style={{ fontFamily: fonts.bodyBold }}>
            {food.calories} kcal
          </Txt>
        </View>
      ))}
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border }}>
        <Txt variant="caption" muted style={{ fontFamily: fonts.bodySemi }}>
          Total:
        </Txt>
        <Txt variant="caption" color={color} style={{ fontFamily: fonts.bodySemi, flexShrink: 1, textAlign: "right" }}>
          {meal.totalCalories} kcal • P: {meal.totalProtein}g • C: {meal.totalCarbs}g • G: {meal.totalFat}g
        </Txt>
      </View>
    </Card>
  );
}

// AddFoodModal do web: nome com sugestões, "Calcular", campos manuais e lista de alimentos.
function AddFoodSheet({ type, onClose }: { type: MealType | null; onClose: () => void }) {
  const theme = useTheme();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [quantity, setQuantity] = useState("100");
  const [calculating, setCalculating] = useState(false);
  const [suggestions, setSuggestions] = useState<FoodSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const typingRef = useRef(true);

  // Busca sugestões enquanto digita (300 ms), como o web.
  useEffect(() => {
    if (!typingRef.current) {
      typingRef.current = true;
      return;
    }
    const timer = setTimeout(async () => {
      if (foodName.length > 1) {
        try {
          const results = await searchFoods(foodName);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [foodName]);

  const fillMacros = (food: FoodSearchResult) => {
    const macros = calculateMacrosForQuantity(food.nutrients, num(quantity) || 100, food.servingSize);
    setCalories(String(macros.calories));
    setProtein(String(macros.protein));
    setCarbs(String(macros.carbs));
    setFat(String(macros.fat));
  };

  const calculate = async () => {
    if (!foodName) {
      notifyInfo("Digite o nome do alimento primeiro!");
      return;
    }
    setCalculating(true);
    try {
      const results = await searchFoods(foodName);
      if (results.length === 0) {
        notifyInfo("Alimento não encontrado. Preencha manualmente.");
        return;
      }
      fillMacros(results[0]);
      setShowSuggestions(false);
      notifySuccess(`Macros de ${results[0].description} calculados!`);
    } catch {
      notifyInfo("Erro ao buscar dados. Tente novamente.");
    } finally {
      setCalculating(false);
    }
  };

  const selectFood = (food: FoodSearchResult) => {
    typingRef.current = false;
    setFoodName(food.description);
    setShowSuggestions(false);
    fillMacros(food);
  };

  const addFood = () => {
    if (!foodName || !calories) return;
    setFoods(prev => [
      ...prev,
      {
        id: generateId(),
        name: foodName,
        calories: num(calories),
        protein: num(protein) || 0,
        carbs: num(carbs) || 0,
        fat: num(fat) || 0,
        quantity: num(quantity),
        unit: "g",
      },
    ]);
    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setQuantity("100");
  };

  const save = async () => {
    if (!type || foods.length === 0) return;
    await addMeal({
      type,
      date: getTodayString(),
      foods,
      totalCalories: foods.reduce((s, f) => s + f.calories, 0),
      totalProtein: foods.reduce((s, f) => s + f.protein, 0),
      totalCarbs: foods.reduce((s, f) => s + f.carbs, 0),
      totalFat: foods.reduce((s, f) => s + f.fat, 0),
    });
    notifySuccess("Refeição adicionada!");
    setFoods([]);
    onClose();
  };

  const numberField = (label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <View style={{ flex: 1 }}>
      <Input label={label} value={value} onChangeText={set} placeholder={placeholder} keyboardType="decimal-pad" />
    </View>
  );

  return (
    <Sheet visible={!!type} onClose={onClose} title="Adicionar Alimento">
      <Marginalia>Nome do Alimento *</Marginalia>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Input placeholder="Ex: Frango grelhado" value={foodName} onChangeText={setFoodName} />
        </View>
        <Button label={calculating ? "Calc..." : "Calcular"} variant="ghost" compact onPress={calculate} disabled={calculating || !foodName} />
      </View>
      {showSuggestions && suggestions.length > 0 ? (
        <View style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 12, overflow: "hidden" }}>
          {suggestions.slice(0, 5).map((food, idx) => (
            <Pressable
              key={`${food.fdcId}-${idx}`}
              onPress={() => selectFood(food)}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: pressed ? theme.primarySoft : idx % 2 === 0 ? theme.raised : "transparent",
                borderBottomWidth: idx < Math.min(5, suggestions.length) - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              })}
            >
              <Txt variant="label" color={theme.primaryInk} style={{ fontFamily: fonts.bodySemi }}>
                {food.description}
              </Txt>
              <Txt variant="caption" muted>
                {food.nutrients.calories} kcal • P: {food.nutrients.protein}g • C: {food.nutrients.carbs}g • G: {food.nutrients.fat}g
              </Txt>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: 12 }}>
        {numberField("Calorias *", calories, setCalories, "0")}
        {numberField("Quantidade (g)", quantity, setQuantity, "100")}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {numberField("Proteína (g)", protein, setProtein, "0")}
        {numberField("Carboidratos (g)", carbs, setCarbs, "0")}
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {numberField("Gordura (g)", fat, setFat, "0")}
        <View style={{ flex: 1 }} />
      </View>

      <Button label="+ Adicionar Alimento" variant="orange" onPress={addFood} disabled={!foodName || !calories} />

      {foods.length > 0 ? (
        <Card style={{ gap: 6 }}>
          <Txt variant="marginalia">Alimentos adicionados ({foods.length}):</Txt>
          {foods.map(f => (
            <View key={f.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Txt variant="label" muted style={{ flex: 1 }} numberOfLines={1}>
                {f.name} ({f.quantity}g)
              </Txt>
              <Txt variant="caption" color={theme.primary} style={{ fontFamily: fonts.bodySemi }}>
                {f.calories} kcal
              </Txt>
            </View>
          ))}
        </Card>
      ) : null}
      <Button label="Salvar Refeição" onPress={save} disabled={foods.length === 0} />
    </Sheet>
  );
}

const QUICK_WATER = [150, 200, 250, 300, 350, 400, 500, 750, 1000];

function WaterSheet({ visible, onClose, currentMl, goalMl }: { visible: boolean; onClose: () => void; currentMl: number; goalMl: number }) {
  const [amount, setAmount] = useState("250");
  const [adding, setAdding] = useState(false);
  const percentage = goalMl > 0 ? Math.min((currentMl / goalMl) * 100, 100) : 0;
  const ml = num(amount);
  const valid = !!ml && ml > 0;

  const add = async () => {
    if (!valid) {
      notifyInfo("Insira uma quantidade válida!");
      return;
    }
    setAdding(true);
    await addWaterMl(ml);
    notifySuccess(`${ml} mL de água adicionado!`);
    setAmount("250");
    setAdding(false);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Registrar Hidratação">
      <Card style={{ gap: 8, borderColor: `${WATER_COLOR}4d` }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Txt variant="bodyStrong" color={WATER_COLOR}>
            {currentMl} mL
          </Txt>
          <Txt variant="bodyStrong" muted>
            Meta: {goalMl} mL
          </Txt>
        </View>
        <ProgressBar percent={percentage} color={WATER_COLOR} height={10} />
        <Txt variant="caption" muted style={{ textAlign: "center" }}>
          {Math.round(percentage)}% da meta diária
        </Txt>
      </Card>
      <Marginalia>Quantidade rápida (mL)</Marginalia>
      <Segmented kind="stamp" options={QUICK_WATER.map(v => ({ value: String(v), label: `${v} mL` }))} value={amount} onChange={setAmount} />
      <Input label="Ou digite a quantidade personalizada (mL)" placeholder="250" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
      <Button label={adding ? "Adicionando..." : `+ Adicionar ${amount || "0"} mL`} onPress={add} disabled={adding || !valid} />
    </Sheet>
  );
}

// Recebe uma key nova a cada abertura, então o formulário sempre começa das metas atuais.
function DietSettingsSheet({ visible, settings, onClose }: { visible: boolean; settings: DietSettings; onClose: () => void }) {
  const [form, setForm] = useState(settings);

  const field = (key: keyof Pick<DietSettings, "dailyCalorieGoal" | "proteinGoal" | "carbsGoal" | "fatGoal" | "waterGoal">, label: string, hint: string) => (
    <View style={{ gap: 4 }}>
      <Input
        label={label}
        value={String(form[key])}
        onChangeText={text => setForm(prev => ({ ...prev, [key]: Number(text.replace(/\D/g, "")) || 0 }))}
        keyboardType="number-pad"
      />
      <Txt variant="caption" muted>
        {hint}
      </Txt>
    </View>
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Ajustar Metas de Dieta">
      {field("dailyCalorieGoal", "Meta Calórica Diária", "Recomendação: 1800-2500 kcal/dia")}
      <Marginalia>Macronutrientes</Marginalia>
      {field("proteinGoal", "Proteína", "gramas")}
      {field("carbsGoal", "Carboidratos", "gramas")}
      {field("fatGoal", "Gordura", "gramas")}
      {field("waterGoal", "Meta de Hidratação", "Recomendação: 2000-3000 mL/dia (2-3 litros)")}
      <Button
        label="Salvar Metas"
        variant="orange"
        onPress={async () => {
          await updateDietSettings(form);
          notifySuccess("Metas de dieta atualizadas!");
          onClose();
        }}
      />
    </Sheet>
  );
}
