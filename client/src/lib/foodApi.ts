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

// Banco de dados expandido como fallback (100+ alimentos)
const fallbackFoods: Record<string, FoodNutrient> = {
  // Proteínas - Aves
  'frango': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'frango grelhado': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'frango assado': { calories: 170, protein: 28, carbs: 0, fat: 6.5 },
  'peito de frango': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'coxa de frango': { calories: 209, protein: 26, carbs: 0, fat: 11 },
  'asinha de frango': { calories: 203, protein: 20, carbs: 0, fat: 13 },
  'filé de frango': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },

  // Proteínas - Carne Vermelha
  'carne': { calories: 250, protein: 26, carbs: 0, fat: 15 },
  'carne bovina': { calories: 250, protein: 26, carbs: 0, fat: 15 },
  'carne moída': { calories: 250, protein: 26, carbs: 0, fat: 15 },
  'picanha': { calories: 217, protein: 27, carbs: 0, fat: 12 },
  'patinho': { calories: 129, protein: 22, carbs: 0, fat: 4 },
  'maminha': { calories: 154, protein: 21, carbs: 0, fat: 8 },
  'contrafilé': { calories: 217, protein: 27, carbs: 0, fat: 12 },
  'alcatra': { calories: 152, protein: 23, carbs: 0, fat: 6 },
  'costela': { calories: 250, protein: 20, carbs: 0, fat: 18 },
  'charque': { calories: 160, protein: 32, carbs: 0, fat: 4 },

  // Proteínas - Suíno
  'porco': { calories: 242, protein: 27, carbs: 0, fat: 14 },
  'costela de porco': { calories: 277, protein: 17, carbs: 0, fat: 23 },
  'lombo de porco': { calories: 143, protein: 23, carbs: 0, fat: 5.3 },
  'bacon': { calories: 541, protein: 37, carbs: 1.4, fat: 42 },

  // Proteínas - Peixes e Frutos do Mar
  'peixe': { calories: 100, protein: 20, carbs: 0, fat: 1 },
  'tilápia': { calories: 96, protein: 20, carbs: 0, fat: 1.7 },
  'tilápia grelhada': { calories: 96, protein: 20, carbs: 0, fat: 1.7 },
  'salmão': { calories: 208, protein: 20, carbs: 0, fat: 13 },
  'salmão grelhado': { calories: 208, protein: 20, carbs: 0, fat: 13 },
  'atum': { calories: 132, protein: 28, carbs: 0, fat: 1.3 },
  'atum em lata': { calories: 132, protein: 28, carbs: 0, fat: 1.3 },
  'bacalhau': { calories: 105, protein: 23, carbs: 0, fat: 0.8 },
  'camarão': { calories: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  'sardinha': { calories: 208, protein: 24, carbs: 0, fat: 11 },

  // Proteínas - Ovos e Laticínios
  'ovo': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  'ovo cozido': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  'ovo frito': { calories: 196, protein: 13, carbs: 0.8, fat: 15 },
  'leite': { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  'leite integral': { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  'leite desnatado': { calories: 35, protein: 3.4, carbs: 5, fat: 0.1 },
  'iogurte': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  'iogurte natural': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  'iogurte grego': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  'queijo': { calories: 402, protein: 25, carbs: 1.3, fat: 33 },
  'queijo muçarela': { calories: 280, protein: 22, carbs: 2, fat: 21 },
  'queijo cottage': { calories: 98, protein: 11, carbs: 3.4, fat: 4.3 },
  'requeijão': { calories: 290, protein: 7, carbs: 4, fat: 27 },
  'ricota': { calories: 174, protein: 11, carbs: 3, fat: 13 },
  'parmesão': { calories: 431, protein: 38, carbs: 4.1, fat: 29 },

  // Proteínas - Vegetais
  'tofu': { calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  'feijão': { calories: 132, protein: 8.7, carbs: 23, fat: 0.5 },
  'lentilha': { calories: 116, protein: 9, carbs: 20, fat: 0.4 },
  'grão de bico': { calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  'erva de bico': { calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },

  // Carboidratos - Arroz e Grãos
  'arroz': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  'arroz branco': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  'arroz integral': { calories: 123, protein: 2.6, carbs: 25.6, fat: 0.9 },
  'arroz carreteiro': { calories: 180, protein: 5, carbs: 28, fat: 5 },
  'feijão carioca': { calories: 132, protein: 8.7, carbs: 23, fat: 0.5 },
  'feijão preto': { calories: 132, protein: 8.7, carbs: 23, fat: 0.5 },
  'feijão branco': { calories: 128, protein: 9.3, carbs: 22, fat: 0.5 },

  // Carboidratos - Pães e Massas
  'pão': { calories: 265, protein: 9, carbs: 49, fat: 3.3 },
  'pão francês': { calories: 300, protein: 8, carbs: 55, fat: 3 },
  'pão integral': { calories: 247, protein: 13, carbs: 41, fat: 3.4 },
  'pão de forma': { calories: 265, protein: 9, carbs: 49, fat: 3.3 },
  'torrada': { calories: 407, protein: 11, carbs: 75, fat: 4.5 },
  'macarrão': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'macarrão cozido': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'espaguete': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'penne': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'lasanha': { calories: 135, protein: 6, carbs: 15, fat: 5.7 },
  'nhoque': { calories: 130, protein: 3.5, carbs: 28, fat: 0.5 },

  // Carboidratos - Tubérculos
  'batata': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  'batata inglesa': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  'batata doce': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  'batata frita': { calories: 312, protein: 3.4, carbs: 41, fat: 15 },
  'mandioca': { calories: 125, protein: 0.6, carbs: 30, fat: 0.3 },
  'aipim': { calories: 125, protein: 0.6, carbs: 30, fat: 0.3 },
  'mandioquinha': { calories: 123, protein: 1.1, carbs: 28, fat: 0.2 },
  'inhame': { calories: 118, protein: 1.5, carbs: 28, fat: 0.2 },

  // Carboidratos - Cereais
  'aveia': { calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  'granola': { calories: 471, protein: 10, carbs: 64, fat: 20 },
  'muesli': { calories: 362, protein: 10, carbs: 66, fat: 6 },
  'cereal matinal': { calories: 380, protein: 7, carbs: 84, fat: 2.5 },

  // Verduras
  'brócolis': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  'couve': { calories: 49, protein: 4.3, carbs: 9, fat: 0.9 },
  'alface': { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  'espinafre': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  'rúcula': { calories: 25, protein: 2.6, carbs: 3.7, fat: 0.7 },
  'agrião': { calories: 11, protein: 2.3, carbs: 1.3, fat: 0.1 },
  'repolho': { calories: 25, protein: 1.3, carbs: 6, fat: 0.1 },
  'acelga': { calories: 19, protein: 1.8, carbs: 3.7, fat: 0.2 },
  'pimentão': { calories: 31, protein: 1, carbs: 6, fat: 0.3 },
  'tomate': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  'cebola': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  'alho': { calories: 149, protein: 6.4, carbs: 33, fat: 0.5 },
  'berinjela': { calories: 25, protein: 1, carbs: 6, fat: 0.2 },
  'abobrinha': { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  'chuchu': { calories: 17, protein: 0.8, carbs: 4, fat: 0.1 },

  // Legumes
  'cenoura': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  'beterraba': { calories: 43, protein: 1.6, carbs: 9.6, fat: 0.2 },
  'abóbora': { calories: 26, protein: 1, carbs: 6.5, fat: 0.1 },
  'abóbora cabotiá': { calories: 45, protein: 1, carbs: 11, fat: 0.1 },
  'pepino': { calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1 },
  'milho': { calories: 86, protein: 3.3, carbs: 19, fat: 1.2 },
  'ervilha': { calories: 81, protein: 5.4, carbs: 14, fat: 0.4 },
  'vagem': { calories: 31, protein: 1.8, carbs: 7, fat: 0.1 },
  'quiabo': { calories: 33, protein: 1.9, carbs: 7, fat: 0.2 },

  // Frutas
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  'maçã': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  'laranja': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  'limão': { calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3 },
  'morango': { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  'melancia': { calories: 30, protein: 0.6, carbs: 8, fat: 0.2 },
  'mamão': { calories: 43, protein: 0.5, carbs: 11, fat: 0.3 },
  'manga': { calories: 60, protein: 0.8, carbs: 15, fat: 0.4 },
  'abacaxi': { calories: 50, protein: 0.5, carbs: 13, fat: 0.1 },
  'maracujá': { calories: 97, protein: 2.2, carbs: 23, fat: 0.7 },
  'goiaba': { calories: 68, protein: 2.6, carbs: 14, fat: 1 },
  'uva': { calories: 69, protein: 0.7, carbs: 18, fat: 0.2 },
  'kiwi': { calories: 61, protein: 1.1, carbs: 15, fat: 0.5 },
  'abacate': { calories: 160, protein: 2, carbs: 9, fat: 15 },
  'pêra': { calories: 57, protein: 0.4, carbs: 15, fat: 0.1 },
  'coco': { calories: 354, protein: 3.3, carbs: 15, fat: 33 },
  'açaí': { calories: 247, protein: 3.9, carbs: 6, fat: 14 },

  // Gorduras e Óleos
  'azeite': { calories: 884, protein: 0, carbs: 0, fat: 100 },
  'azeite de oliva': { calories: 884, protein: 0, carbs: 0, fat: 100 },
  'manteiga': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  'margarina': { calories: 717, protein: 0.2, carbs: 0.1, fat: 81 },
  'óleo de coco': { calories: 862, protein: 0, carbs: 0, fat: 100 },
  'óleo de soja': { calories: 884, protein: 0, carbs: 0, fat: 100 },
  'amendoim': { calories: 567, protein: 26, carbs: 16, fat: 49 },
  'pasta de amendoim': { calories: 588, protein: 25, carbs: 20, fat: 50 },
  'castanha': { calories: 554, protein: 15, carbs: 30, fat: 44 },
  'castanha de caju': { calories: 553, protein: 18, carbs: 30, fat: 44 },
  'amêndoa': { calories: 579, protein: 21, carbs: 22, fat: 50 },
  'nozes': { calories: 654, protein: 15, carbs: 14, fat: 65 },
  'chia': { calories: 486, protein: 17, carbs: 42, fat: 31 },
  'linhaça': { calories: 534, protein: 18, carbs: 29, fat: 42 },

  // Lanches e Comidas Preparadas
  'pão de queijo': { calories: 274, protein: 7, carbs: 35, fat: 12 },
  'coxinha': { calories: 280, protein: 10, carbs: 30, fat: 14 },
  'empada': { calories: 250, protein: 8, carbs: 25, fat: 13 },
  'pastel': { calories: 300, protein: 8, carbs: 35, fat: 15 },
  'pizza': { calories: 266, protein: 11, carbs: 33, fat: 10 },
  'hambúrguer': { calories: 254, protein: 17, carbs: 22, fat: 12 },
  'hot dog': { calories: 290, protein: 11, carbs: 24, fat: 17 },
  'sanduíche': { calories: 250, protein: 12, carbs: 30, fat: 9 },
  'wrap': { calories: 200, protein: 10, carbs: 25, fat: 7 },
  'tapioca': { calories: 358, protein: 0.2, carbs: 88, fat: 0.2 },
  'cuscuz': { calories: 112, protein: 3.8, carbs: 23, fat: 0.3 },
  'polenta': { calories: 101, protein: 1.6, carbs: 21, fat: 0.5 },

  // Bebidas
  'suco de laranja': { calories: 45, protein: 0.7, carbs: 10, fat: 0.2 },
  'café': { calories: 2, protein: 0.3, carbs: 0, fat: 0 },
  'café com leite': { calories: 43, protein: 2.1, carbs: 4.5, fat: 1.8 },
  'chá': { calories: 1, protein: 0, carbs: 0.3, fat: 0 },
  'agua de coco': { calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2 },
  'refrigerante': { calories: 42, protein: 0, carbs: 10.6, fat: 0 },
  'cerveja': { calories: 43, protein: 0.5, carbs: 3.6, fat: 0 },

  // Sobremesas e Doces
  'chocolate': { calories: 546, protein: 4.9, carbs: 61, fat: 31 },
  'chocolate ao leite': { calories: 535, protein: 7.6, carbs: 59, fat: 30 },
  'chocolate amargo': { calories: 598, protein: 7.8, carbs: 46, fat: 43 },
  'bolo': { calories: 350, protein: 5, carbs: 52, fat: 14 },
  'biscoito': { calories: 471, protein: 6, carbs: 71, fat: 18 },
  'biscoito de água': { calories: 435, protein: 8, carbs: 73, fat: 12 },
  'gelatina': { calories: 62, protein: 1.5, carbs: 14, fat: 0.1 },
  'pudim': { calories: 122, protein: 3.6, carbs: 16, fat: 5 },
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
