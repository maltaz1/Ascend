// Integração com USDA FoodData Central API para dados nutricionais precisos

const USDA_API_KEY = 'DEMO_KEY';
const USDA_API_BASE = 'https://fdc.nal.usda.gov/api/foods/search';

export interface FoodNutrient {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodSearchResult {
  fdcId: string;
  description: string;
  nutrients: FoodNutrient;
  servingSize: number;
  servingUnit: string;
}

// Cache local para evitar requisições repetidas
const foodCache = new Map<string, FoodSearchResult[]>();

// Banco de dados simulado como fallback
const fallbackFoods: Record<string, FoodNutrient> = {
  'frango': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'frango grelhado': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'arroz': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  'batata': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  'brócolis': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  'ovo': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  'leite': { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  'pão': { calories: 265, protein: 9, carbs: 49, fat: 3.3 },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  'maçã': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  'cenoura': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  'carne': { calories: 250, protein: 26, carbs: 0, fat: 15 },
  'peixe': { calories: 100, protein: 20, carbs: 0, fat: 1 },
  'iogurte': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  'queijo': { calories: 402, protein: 25, carbs: 1.3, fat: 33 },
  'azeite': { calories: 884, protein: 0, carbs: 0, fat: 100 },
};

/**
 * Extrai nutrientes de um alimento da USDA API
 */
function extractNutrients(foodItem: any): FoodNutrient {
  const nutrients = foodItem.foodNutrients || [];
  
  const getValueByName = (name: string): number => {
    const nutrient = nutrients.find((n: any) => 
      n.nutrientName?.toLowerCase().includes(name.toLowerCase())
    );
    return nutrient?.value || 0;
  };

  return {
    calories: getValueByName('energy') || getValueByName('calorie') || 0,
    protein: getValueByName('protein') || 0,
    carbs: getValueByName('carbohydrate') || 0,
    fat: getValueByName('fat') || 0,
  };
}

/**
 * Busca alimentos na USDA API com fallback para banco de dados simulado
 */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();

  // Verificar cache
  if (foodCache.has(lowerQuery)) {
    const cached = foodCache.get(lowerQuery);
    return cached || [];
  }

  try {
    // Tentar buscar na USDA API com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `${USDA_API_BASE}?query=${encodeURIComponent(query)}&pageSize=10&api_key=${USDA_API_KEY}`,
      { 
        method: 'GET',
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const foods = (data.foods || []).filter((f: any) => f.description && f.foodNutrients);

    if (foods.length === 0) {
      throw new Error('No foods found in API');
    }

    const results: FoodSearchResult[] = foods.slice(0, 10).map((food: any) => ({
      fdcId: food.fdcId,
      description: food.description.substring(0, 100),
      nutrients: extractNutrients(food),
      servingSize: food.servingSize || 100,
      servingUnit: food.servingUnit || 'g',
    }));

    // Armazenar em cache
    foodCache.set(lowerQuery, results);
    return results;
  } catch (error) {
    console.warn('USDA API error, using fallback database:', error);
    
    // Fallback para banco de dados simulado
    const fallbackResults: FoodSearchResult[] = [];

    // Busca exata primeiro
    for (const [key, nutrients] of Object.entries(fallbackFoods)) {
      if (key === lowerQuery) {
        fallbackResults.push({
          fdcId: `fallback_${key}`,
          description: key.charAt(0).toUpperCase() + key.slice(1) + ' (Banco Local)',
          nutrients,
          servingSize: 100,
          servingUnit: 'g',
        });
        break;
      }
    }

    // Se não encontrou exato, busca parcial
    if (fallbackResults.length === 0) {
      for (const [key, nutrients] of Object.entries(fallbackFoods)) {
        if (key.includes(lowerQuery) || lowerQuery.includes(key)) {
          fallbackResults.push({
            fdcId: `fallback_${key}`,
            description: key.charAt(0).toUpperCase() + key.slice(1) + ' (Banco Local)',
            nutrients,
            servingSize: 100,
            servingUnit: 'g',
          });
        }
      }
    }

    foodCache.set(lowerQuery, fallbackResults);
    return fallbackResults;
  }
}

/**
 * Calcula macros para uma quantidade específica
 */
export function calculateMacrosForQuantity(
  nutrients: FoodNutrient,
  quantity: number,
  servingSize: number = 100
): FoodNutrient {
  // Validar inputs
  if (quantity <= 0 || servingSize <= 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }

  const multiplier = quantity / servingSize;

  return {
    calories: Math.round(nutrients.calories * multiplier * 10) / 10,
    protein: Math.round(nutrients.protein * multiplier * 10) / 10,
    carbs: Math.round(nutrients.carbs * multiplier * 10) / 10,
    fat: Math.round(nutrients.fat * multiplier * 10) / 10,
  };
}

/**
 * Limpa o cache (útil para testes ou reset manual)
 */
export function clearFoodCache() {
  foodCache.clear();
}

/**
 * Retorna tamanho do cache
 */
export function getCacheSize(): number {
  return foodCache.size;
}
