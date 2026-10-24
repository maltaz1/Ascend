import { useEffect, useState } from "react";
import { Alert, Pressable, View } from "react-native";
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
import { notifySuccess } from "@/lib/notifications";
import { useStore } from "@/hooks/useStore";
import { ProGate } from "@/components/ProGate";
import { Button, Card, EmptyState, Input, Marginalia, ProgressBar, ProgressRing, Screen, Segmented, Sheet, Txt } from "@/components/ui";
import { longDate } from "@/components/rows";
import { fonts, resolveColor, useTheme } from "@/theme";

// Mesmos tipos de refeição de pages/Diet.tsx.
const MEAL_TYPES = {
  breakfast: { label: "Café da manhã", emoji: "🍳", color: "var(--accent)" },
  lunch: { label: "Almoço", emoji: "🍽️", color: "#10B981" },
  dinner: { label: "Jantar", emoji: "🌙", color: "var(--primary)" },
  snack: { label: "Lanche", emoji: "🍎", color: "#EC4899" },
} as const;
type MealType = keyof typeof MEAL_TYPES;

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
  const waterGoal = hydration.goal || settings.waterGoal;

  const rings = [
    { label: "Proteína", value: nutrition.protein, goal: settings.proteinGoal, color: theme.success },
    { label: "Carboidratos", value: nutrition.carbs, goal: settings.carbsGoal, color: theme.primary },
    { label: "Gordura", value: nutrition.fat, goal: settings.fatGoal, color: theme.pink },
    { label: "Calorias", value: nutrition.calories, goal: settings.dailyCalorieGoal, color: theme.accent },
  ];

  const removeMeal = (meal: Meal) => {
    Alert.alert("Remover refeição", `Remover ${MEAL_TYPES[meal.type].label}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: async () => {
          await deleteMeal(meal.id);
          notifySuccess("Refeição removida");
        },
      },
    ]);
  };

  return (
    <Screen>
      <Card style={{ gap: 8, paddingVertical: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Marginalia index="10">Registro alimentar</Marginalia>
            <Txt variant="hero" style={{ fontSize: 30 }}>
              {greeting()},{"\n"}
              {data.user.name?.split(" ")[0] || "você"}
            </Txt>
            <Txt muted>{longDate()}</Txt>
          </View>
          <Pressable
            onPress={() => setShowSettings(true)}
            accessibilityLabel="Metas da dieta"
            style={{ width: 40, height: 40, borderRadius: 6, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.primaryBorder, backgroundColor: theme.primarySoft }}
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
        <ProgressBar percent={calPercent} height={7} color={calPercent > 100 ? theme.danger : theme.primary} />
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
        <Ionicons name="water-outline" size={22} color={theme.cyan} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1 }} color={theme.cyan}>
            HIDRATAÇÃO
          </Txt>
          <Txt variant="label" muted>
            {hydration.cupsConsumed} / {waterGoal} mL
          </Txt>
          <View style={{ marginTop: 8 }}>
            <ProgressBar percent={(hydration.cupsConsumed / Math.max(1, waterGoal)) * 100} color={theme.cyan} height={5} />
          </View>
        </View>
        <Pressable
          onPress={() => setShowWater(true)}
          accessibilityLabel="Adicionar água"
          style={{ width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.cyan }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </Card>

      <Marginalia index="12">Refeições</Marginalia>
      {(Object.keys(MEAL_TYPES) as MealType[]).map(type => {
        const config = MEAL_TYPES[type];
        const color = resolveColor(config.color, theme);
        const ofType = meals.filter(m => m.type === type);
        const kcal = ofType.reduce((s, m) => s + m.totalCalories, 0);
        return (
          <Card key={type}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: `${color}22`,
                  borderWidth: 1,
                  borderColor: `${color}66`,
                }}
              >
                <Txt style={{ fontSize: 14 }}>{config.emoji}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="h3" color={color}>
                  {config.label}
                </Txt>
                <Txt variant="caption" muted>
                  {Math.round(kcal)} kcal
                </Txt>
              </View>
              <Pressable onPress={() => setAddFor(type)} hitSlop={10} accessibilityLabel={`Adicionar ${config.label}`}>
                <Ionicons name="add" size={24} color={color} />
              </Pressable>
            </View>
            {ofType.map(meal => (
              <Pressable key={meal.id} onLongPress={() => removeMeal(meal)} style={{ gap: 6 }}>
                {meal.foods.map(food => (
                  <View key={food.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.raised, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12 }}>
                    <Txt variant="label" style={{ flex: 1 }} numberOfLines={1}>
                      {food.name}
                    </Txt>
                    <Txt variant="caption" muted>
                      {food.quantity}
                      {food.unit === "unit" ? " un" : food.unit}
                    </Txt>
                    <Txt variant="mono" color={theme.accent} style={{ fontSize: 12 }}>
                      {Math.round(food.calories)} kcal
                    </Txt>
                  </View>
                ))}
              </Pressable>
            ))}
          </Card>
        );
      })}
      <Txt variant="caption" muted style={{ textAlign: "center" }}>
        Segure uma refeição para remover · {data.diet.dietPoints} pontos de dieta
      </Txt>

      <AddFoodSheet type={addFor} onClose={() => setAddFor(null)} />
      <DietSettingsSheet key={showSettings ? "open" : "closed"} visible={showSettings} settings={settings} onClose={() => setShowSettings(false)} />
      <Sheet visible={showWater} onClose={() => setShowWater(false)} title="Adicionar água">
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[200, 300, 500].map(ml => (
            <View key={ml} style={{ flex: 1 }}>
              <Button
                label={`+${ml} mL`}
                variant="ghost"
                onPress={async () => {
                  await addWaterMl(ml);
                  notifySuccess(`${ml} mL de água adicionado!`);
                  setShowWater(false);
                }}
              />
            </View>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

function AddFoodSheet({ type, onClose }: { type: MealType | null; onClose: () => void }) {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [picked, setPicked] = useState<FoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState("100");
  const [foods, setFoods] = useState<FoodItem[]>([]);

  const searching = !picked && query.length >= 2;
  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    void searchFoods(query).then(r => !cancelled && setResults(r.slice(0, 8)));
    return () => {
      cancelled = true;
    };
  }, [query, searching]);
  const shown = searching ? results : [];

  const addFood = () => {
    if (!picked) return;
    const qty = Number(quantity.replace(",", ".")) || 0;
    const m = calculateMacrosForQuantity(picked.nutrients, qty, picked.servingSize || 100);
    setFoods(prev => [
      ...prev,
      { id: generateId(), name: picked.description, quantity: qty, unit: "g", ...m },
    ]);
    setPicked(null);
    setQuery("");
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

  return (
    <Sheet visible={!!type} onClose={onClose} title={type ? `Adicionar · ${MEAL_TYPES[type].label}` : "Adicionar"}>
      {picked ? (
        <Card>
          <Txt variant="bodyStrong">{picked.description}</Txt>
          <Txt variant="caption" muted>
            Por {picked.servingSize || 100}
            {picked.servingUnit || "g"}: {Math.round(picked.nutrients.calories)} kcal · P {picked.nutrients.protein}g · C{" "}
            {picked.nutrients.carbs}g · G {picked.nutrients.fat}g
          </Txt>
          <Input label="Quantidade (g)" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancelar" variant="ghost" compact onPress={() => setPicked(null)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Adicionar" compact onPress={addFood} />
            </View>
          </View>
        </Card>
      ) : (
        <>
          <Input label="Buscar alimento" value={query} onChangeText={setQuery} placeholder="Ex.: arroz, frango, banana" />
          {shown.map(r => (
            <Pressable
              key={r.fdcId}
              onPress={() => setPicked(r)}
              style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}
            >
              <Txt variant="label" style={{ flex: 1 }} numberOfLines={1}>
                {r.description}
              </Txt>
              <Txt variant="caption" muted>
                {Math.round(r.nutrients.calories)} kcal/{r.servingSize || 100}
                {r.servingUnit || "g"}
              </Txt>
            </Pressable>
          ))}
          {searching && shown.length === 0 && <EmptyState text="Nenhum alimento encontrado." />}
        </>
      )}

      {foods.length > 0 && (
        <Card>
          {foods.map(f => (
            <View key={f.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt variant="label" style={{ flex: 1 }} numberOfLines={1}>
                {f.name} · {f.quantity}g
              </Txt>
              <Txt variant="caption" muted>
                {Math.round(f.calories)} kcal
              </Txt>
            </View>
          ))}
          <Txt variant="bodyStrong">Total: {Math.round(foods.reduce((s, f) => s + f.calories, 0))} kcal</Txt>
        </Card>
      )}
      <Button label="Salvar refeição" onPress={save} disabled={foods.length === 0} />
    </Sheet>
  );
}

// Recebe uma key nova a cada abertura, então o formulário sempre começa das metas atuais.
function DietSettingsSheet({ visible, settings, onClose }: { visible: boolean; settings: DietSettings; onClose: () => void }) {
  const [form, setForm] = useState(settings);

  const field = (key: keyof Pick<DietSettings, "dailyCalorieGoal" | "proteinGoal" | "carbsGoal" | "fatGoal" | "waterGoal">, label: string) => (
    <Input
      label={label}
      value={String(form[key])}
      onChangeText={text => setForm(prev => ({ ...prev, [key]: Number(text.replace(/\D/g, "")) || 0 }))}
      keyboardType="number-pad"
    />
  );

  return (
    <Sheet visible={visible} onClose={onClose} title="Metas da dieta">
      {field("dailyCalorieGoal", "Calorias por dia (kcal)")}
      {field("proteinGoal", "Proteína (g)")}
      {field("carbsGoal", "Carboidratos (g)")}
      {field("fatGoal", "Gorduras (g)")}
      {field("waterGoal", "Água (mL)")}
      <Segmented
        options={[
          { value: 1500, label: "1,5 L" },
          { value: 2000, label: "2 L" },
          { value: 3000, label: "3 L" },
        ]}
        value={form.waterGoal}
        onChange={value => setForm(prev => ({ ...prev, waterGoal: value }))}
      />
      <Button
        label="Salvar metas"
        onPress={async () => {
          await updateDietSettings(form);
          notifySuccess("Metas de dieta atualizadas!");
          onClose();
        }}
      />
    </Sheet>
  );
}
