// Integração com USDA FoodData Central API para dados nutricionais precisos
// Base local expandida com alimentos brasileiros e internacionais (valores por 100g)

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

// Base de dados expandida (valores por 100g)
// Fontes: USDA FoodData Central, Tabela TACO (UNICAMP)
const fallbackFoods: Record<string, FoodNutrient> = {
  // --- Carnes e Aves ---
  'frango': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'frango grelhado': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'peito de frango': { calories: 159, protein: 33, carbs: 0, fat: 3.5 },
  'coxas de frango': { calories: 211, protein: 26, carbs: 0, fat: 11 },
  'filé de frango': { calories: 153, protein: 30, carbs: 0, fat: 3.5 },
  'asas de frango': { calories: 203, protein: 30, carbs: 0, fat: 8.1 },
  'carne moída': { calories: 247, protein: 26, carbs: 0, fat: 15 },
  'carne bovina': { calories: 250, protein: 26, carbs: 0, fat: 15 },
  'picanha': { calories: 224, protein: 21, carbs: 0, fat: 15 },
  'alcatra': { calories: 157, protein: 22, carbs: 0, fat: 7 },
  'contrafilé': { calories: 202, protein: 22, carbs: 0, fat: 12 },
  'patinho': { calories: 123, protein: 22, carbs: 0, fat: 3.5 },
  'músculo': { calories: 138, protein: 24, carbs: 0, fat: 4 },
  'costela': { calories: 252, protein: 21, carbs: 0, fat: 18 },
  'acém': { calories: 182, protein: 21, carbs: 0, fat: 10 },
  'lombinho suíno': { calories: 143, protein: 26, carbs: 0, fat: 4 },
  'carne suína': { calories: 242, protein: 27, carbs: 0, fat: 14 },
  'lombo suíno': { calories: 155, protein: 26, carbs: 0, fat: 5 },
  'bacon': { calories: 541, protein: 37, carbs: 1.4, fat: 42 },
  'linguiça suína': { calories: 304, protein: 15, carbs: 1, fat: 26 },
  'salsicha': { calories: 268, protein: 12, carbs: 2, fat: 24 },
  'peru': { calories: 189, protein: 29, carbs: 0, fat: 7 },
  'peito de peru': { calories: 111, protein: 21, carbs: 1, fat: 2 },
  'patinho moído': { calories: 131, protein: 22, carbs: 0, fat: 4.5 },
  'maminha': { calories: 157, protein: 21, carbs: 0, fat: 8 },
  
  // --- Peixes e Frutos do Mar ---
  'tilápia': { calories: 96, protein: 20, carbs: 0, fat: 1.7 },
  'salmão': { calories: 208, protein: 20, carbs: 0, fat: 13 },
  'atum': { calories: 130, protein: 29, carbs: 0, fat: 1.2 },
  'peixe': { calories: 100, protein: 20, carbs: 0, fat: 1 },
  'camarão': { calories: 85, protein: 18, carbs: 0, fat: 1 },
  'sardinha': { calories: 208, protein: 25, carbs: 0, fat: 11 },
  'bacalhau': { calories: 82, protein: 18, carbs: 0, fat: 0.7 },
  'merluza': { calories: 79, protein: 17, carbs: 0, fat: 1 },
  'linguado': { calories: 70, protein: 14, carbs: 0, fat: 1.2 },
  'cavala': { calories: 205, protein: 19, carbs: 0, fat: 14 },
  'badejo': { calories: 97, protein: 20, carbs: 0, fat: 1.8 },
  'robalo': { calories: 113, protein: 22, carbs: 0, fat: 2.5 },
  'polvo': { calories: 82, protein: 15, carbs: 2.2, fat: 1 },
  
  // --- Ovos e Laticínios ---
  'ovo': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  'ovo cozido': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  'ovo frito': { calories: 196, protein: 13, carbs: 0.9, fat: 15 },
  'clara de ovo': { calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  'leite integral': { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  'leite desnatado': { calories: 35, protein: 3.4, carbs: 5, fat: 0.1 },
  'leite semidesnatado': { calories: 46, protein: 3.3, carbs: 4.9, fat: 1.6 },
  'iogurte natural': { calories: 63, protein: 3.1, carbs: 4.7, fat: 3.3 },
  'iogurte grego': { calories: 97, protein: 9, carbs: 3.6, fat: 5 },
  'iogurte desnatado': { calories: 56, protein: 5.7, carbs: 7.7, fat: 0.4 },
  'queijo': { calories: 402, protein: 25, carbs: 1.3, fat: 33 },
  'queijo mussarela': { calories: 280, protein: 22, carbs: 3, fat: 20 },
  'queijo minas': { calories: 264, protein: 18, carbs: 3.2, fat: 20 },
  'queijo branco': { calories: 192, protein: 17, carbs: 3, fat: 12 },
  'queijo cottage': { calories: 98, protein: 11, carbs: 3.4, fat: 4.3 },
  'requeijão': { calories: 240, protein: 11, carbs: 4, fat: 20 },
  'queijo prato': { calories: 372, protein: 24, carbs: 2, fat: 30 },
  'queijo parmesão': { calories: 431, protein: 38, carbs: 4, fat: 29 },
  'queijo cheddar': { calories: 403, protein: 25, carbs: 1.3, fat: 33 },
  'queijo provolone': { calories: 351, protein: 25, carbs: 2, fat: 27 },
  'ricota': { calories: 145, protein: 11, carbs: 3, fat: 10 },
  'creme de leite': { calories: 207, protein: 2.2, carbs: 2.7, fat: 20 },
  
  // --- Grãos e Cereais ---
  'arroz branco': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  'arroz integral': { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
  'arroz cozido': { calories: 128, protein: 2.5, carbs: 28, fat: 0.2 },
  'feijão preto': { calories: 76, protein: 4.8, carbs: 14, fat: 0.5 },
  'feijão carioca': { calories: 76, protein: 4.5, carbs: 13.5, fat: 0.5 },
  'feijão cozido': { calories: 76, protein: 4.5, carbs: 14, fat: 0.5 },
  'lentilha': { calories: 93, protein: 6.3, carbs: 16, fat: 0.5 },
  'grão-de-bico': { calories: 164, protein: 8.9, carbs: 27, fat: 2.6 },
  'ervilha': { calories: 81, protein: 5.4, carbs: 14, fat: 0.4 },
  'soja': { calories: 172, protein: 16.6, carbs: 9.9, fat: 9 },
  'aveia': { calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },
  'aveia em flocos': { calories: 370, protein: 13, carbs: 60, fat: 7 },
  'quinoa': { calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  'milho': { calories: 96, protein: 3.4, carbs: 21, fat: 1.5 },
  'milho cozido': { calories: 96, protein: 3.2, carbs: 21, fat: 1.5 },
  'mandioca': { calories: 125, protein: 0.6, carbs: 30, fat: 0.3 },
  'mandioca cozida': { calories: 125, protein: 0.6, carbs: 30, fat: 0.3 },
  'cuscuz': { calories: 112, protein: 3.5, carbs: 23, fat: 0.5 },
  
  // --- Pães e Massas ---
  'pão francês': { calories: 300, protein: 8, carbs: 58, fat: 3.5 },
  'pão integral': { calories: 247, protein: 13, carbs: 41, fat: 3.4 },
  'pão de forma': { calories: 265, protein: 9, carbs: 49, fat: 3.3 },
  'pão de queijo': { calories: 340, protein: 10, carbs: 45, fat: 14 },
  'pão sírio': { calories: 275, protein: 9.5, carbs: 53, fat: 2.6 },
  'pão de aveia': { calories: 255, protein: 12, carbs: 42, fat: 5 },
  'massa cozida': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'macarrão': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'espaguete': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'penne': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'fettuccine': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'lasanha': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
  'pizza de mussarela': { calories: 266, protein: 11, carbs: 33, fat: 10 },
  'tapioca': { calories: 344, protein: 0.1, carbs: 85, fat: 0.1 },
  'beiju': { calories: 344, protein: 0.1, carbs: 85, fat: 0.1 },
  'biscoito de polvilho': { calories: 463, protein: 3, carbs: 96, fat: 1 },
  
  // --- Tubérculos e Raízes ---
  'batata inglesa': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  'batata cozida': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  'batata frita': { calories: 312, protein: 3.4, carbs: 41, fat: 15 },
  'batata doce': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  'batata doce cozida': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  'inhame': { calories: 118, protein: 1.5, carbs: 28, fat: 0.2 },
  'mandioquinha': { calories: 123, protein: 0.8, carbs: 29, fat: 0.3 },
  'cará': { calories: 118, protein: 1.5, carbs: 28, fat: 0.2 },
  
  // --- Legumes e Vegetais ---
  'brócolis': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  'cenoura': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
  'tomate': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  'alface': { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  'rúcula': { calories: 25, protein: 2.6, carbs: 3.7, fat: 0.7 },
  'espinafre': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  'couve': { calories: 27, protein: 2.9, carbs: 4.4, fat: 0.6 },
  'repolho': { calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1 },
  'chuchu': { calories: 19, protein: 0.8, carbs: 4.5, fat: 0.1 },
  'abobrinha': { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  'abóbora': { calories: 26, protein: 1, carbs: 6.5, fat: 0.1 },
  'berinjela': { calories: 25, protein: 1, carbs: 6, fat: 0.2 },
  'pepino': { calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
  'cebola': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  'alho': { calories: 149, protein: 6.4, carbs: 33, fat: 0.5 },
  'pimentão verde': { calories: 20, protein: 0.9, carbs: 4.6, fat: 0.2 },
  'pimentão vermelho': { calories: 31, protein: 1, carbs: 6, fat: 0.3 },
  'couve-flor': { calories: 25, protein: 1.9, carbs: 5, fat: 0.3 },
  'aspargos': { calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1 },
  'agrião': { calories: 11, protein: 2.3, carbs: 1.3, fat: 0.1 },
  'vagem': { calories: 35, protein: 1.8, carbs: 7.9, fat: 0.1 },
  'palmito': { calories: 28, protein: 1.6, carbs: 5.5, fat: 0.3 },
  'quiabo': { calories: 33, protein: 1.9, carbs: 7.5, fat: 0.2 },
  'maxixe': { calories: 14, protein: 1.2, carbs: 2.7, fat: 0.1 },
  
  // --- Frutas ---
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  'banana prata': { calories: 98, protein: 1.3, carbs: 26, fat: 0.1 },
  'banana nanica': { calories: 92, protein: 1.2, carbs: 24, fat: 0.2 },
  'maçã': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  'laranja': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  'mamão': { calories: 43, protein: 0.5, carbs: 11, fat: 0.3 },
  'melancia': { calories: 30, protein: 0.6, carbs: 8, fat: 0.2 },
  'melão': { calories: 34, protein: 0.8, carbs: 8.2, fat: 0.2 },
  'abacaxi': { calories: 50, protein: 0.5, carbs: 13, fat: 0.1 },
  'morango': { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  'uva': { calories: 69, protein: 0.7, carbs: 18, fat: 0.2 },
  'manga': { calories: 60, protein: 0.8, carbs: 15, fat: 0.4 },
  'kiwi': { calories: 61, protein: 1.1, carbs: 15, fat: 0.5 },
  'abacate': { calories: 160, protein: 2, carbs: 9, fat: 15 },
  'pera': { calories: 57, protein: 0.4, carbs: 15, fat: 0.1 },
  'pêssego': { calories: 39, protein: 0.9, carbs: 10, fat: 0.3 },
  'goiaba': { calories: 68, protein: 2.6, carbs: 14, fat: 1 },
  'coco': { calories: 354, protein: 3.3, carbs: 15, fat: 33 },
  'água de coco': { calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2 },
  'maracujá': { calories: 97, protein: 5.2, carbs: 23, fat: 0.7 },
  'limão': { calories: 29, protein: 1.1, carbs: 9, fat: 0.3 },
  'tangerina': { calories: 53, protein: 0.8, carbs: 13, fat: 0.3 },
  'ameixa': { calories: 46, protein: 0.7, carbs: 11, fat: 0.3 },
  'caqui': { calories: 70, protein: 0.6, carbs: 18, fat: 0.2 },
  'figo': { calories: 74, protein: 0.8, carbs: 19, fat: 0.3 },
  
  // --- Oleaginosas e Sementes ---
  'castanha de caju': { calories: 553, protein: 18, carbs: 30, fat: 44 },
  'castanha do pará': { calories: 656, protein: 14, carbs: 12, fat: 66 },
  'amêndoas': { calories: 579, protein: 21, carbs: 22, fat: 50 },
  'nozes': { calories: 654, protein: 15, carbs: 14, fat: 65 },
  'amendoim': { calories: 567, protein: 26, carbs: 16, fat: 49 },
  'pistache': { calories: 562, protein: 20, carbs: 28, fat: 45 },
  'macadâmia': { calories: 718, protein: 8, carbs: 14, fat: 76 },
  'chia': { calories: 486, protein: 17, carbs: 42, fat: 31 },
  'linhaça': { calories: 534, protein: 18, carbs: 29, fat: 42 },
  'gergelim': { calories: 573, protein: 18, carbs: 23, fat: 50 },
  'girassol': { calories: 584, protein: 21, carbs: 20, fat: 51 },
  
  // --- Óleos e Gorduras ---
  'azeite de oliva': { calories: 884, protein: 0, carbs: 0, fat: 100 },
  'óleo de soja': { calories: 884, protein: 0, carbs: 0, fat: 100 },
  'óleo de coco': { calories: 862, protein: 0, carbs: 0, fat: 100 },
  'manteiga': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81 },
  'margarina': { calories: 718, protein: 0.9, carbs: 0.7, fat: 80 },
  'banha': { calories: 902, protein: 0, carbs: 0, fat: 100 },
  
  // --- Bebidas ---
  'café preto': { calories: 2, protein: 0.3, carbs: 0, fat: 0 },
  'café com leite': { calories: 44, protein: 2.4, carbs: 3.8, fat: 2.4 },
  'chá verde': { calories: 1, protein: 0, carbs: 0.3, fat: 0 },
  'chá de camomila': { calories: 1, protein: 0, carbs: 0.3, fat: 0 },
  'suco de laranja natural': { calories: 45, protein: 0.7, carbs: 10, fat: 0.2 },
  'suco de abacaxi': { calories: 53, protein: 0.4, carbs: 13, fat: 0.1 },
  'refrigerante': { calories: 42, protein: 0, carbs: 11, fat: 0 },
  'refrigerante zero': { calories: 0.3, protein: 0, carbs: 0, fat: 0 },
  'cerveja': { calories: 43, protein: 0.5, carbs: 3.6, fat: 0 },
  'vinho tinto': { calories: 85, protein: 0.1, carbs: 2.6, fat: 0 },
  'vinho branco': { calories: 82, protein: 0.1, carbs: 2.6, fat: 0 },
  'energético': { calories: 45, protein: 0, carbs: 11, fat: 0 },
  'isotônico': { calories: 24, protein: 0, carbs: 6, fat: 0 },
  
  // --- Doces e Sobremesas ---
  'açúcar refinado': { calories: 400, protein: 0, carbs: 100, fat: 0 },
  'açúcar mascavo': { calories: 383, protein: 0, carbs: 98, fat: 0.1 },
  'mel': { calories: 304, protein: 0.3, carbs: 82, fat: 0 },
  'chocolate ao leite': { calories: 535, protein: 7.6, carbs: 59, fat: 30 },
  'chocolate meio amargo': { calories: 546, protein: 6, carbs: 47, fat: 37 },
  'chocolate amargo 70%': { calories: 598, protein: 7.8, carbs: 46, fat: 43 },
  'brigadeiro': { calories: 380, protein: 5, carbs: 50, fat: 17 },
  'pudim': { calories: 140, protein: 4, carbs: 20, fat: 5 },
  'mousse de chocolate': { calories: 210, protein: 4, carbs: 25, fat: 11 },
  'sorvete de creme': { calories: 207, protein: 3.5, carbs: 24, fat: 11 },
  'gelatina': { calories: 62, protein: 1.6, carbs: 14, fat: 0 },
  'bolo de chocolate': { calories: 350, protein: 5, carbs: 50, fat: 15 },
  'bolo de cenoura': { calories: 340, protein: 4.5, carbs: 48, fat: 14 },
  'biscoito cream cracker': { calories: 467, protein: 10, carbs: 73, fat: 15 },
  'biscoito maizena': { calories: 456, protein: 8, carbs: 77, fat: 13 },
  'bolacha recheada': { calories: 493, protein: 5, carbs: 70, fat: 21 },
  'pipoca': { calories: 387, protein: 13, carbs: 78, fat: 4.5 },
  'paçoca': { calories: 494, protein: 10, carbs: 59, fat: 24 },
  
  // --- Molhos e Condimentos ---
  'molho de tomate': { calories: 29, protein: 1.6, carbs: 4.8, fat: 0.2 },
  'catchup': { calories: 112, protein: 1.2, carbs: 27, fat: 0.5 },
  'maionese': { calories: 680, protein: 1, carbs: 1, fat: 75 },
  'mostarda': { calories: 66, protein: 4, carbs: 5, fat: 4 },
  'shoyu': { calories: 60, protein: 5, carbs: 8, fat: 0.1 },
  'vinagre': { calories: 18, protein: 0, carbs: 0.9, fat: 0 },
  'pimenta': { calories: 40, protein: 2, carbs: 9, fat: 0.4 },
  
  // --- Fast Food e Lanches ---
  'hambúrguer': { calories: 254, protein: 17, carbs: 4, fat: 20 },
  'cheeseburguer': { calories: 285, protein: 18, carbs: 12, fat: 20 },
  'hot dog': { calories: 290, protein: 10, carbs: 24, fat: 17 },
  'onion rings': { calories: 411, protein: 5, carbs: 37, fat: 28 },
  'frango empanado': { calories: 277, protein: 18, carbs: 15, fat: 16 },
  'nuggets de frango': { calories: 267, protein: 15, carbs: 15, fat: 17 },
  'wrap de frango': { calories: 190, protein: 14, carbs: 18, fat: 7 },
  
  // --- Outros / Suplementos / Culinária Internacional ---
  'protein shake (whey)': { calories: 400, protein: 80, carbs: 8, fat: 4 },
  'barra de proteína': { calories: 350, protein: 20, carbs: 40, fat: 12 },
  'granola': { calories: 471, protein: 12, carbs: 65, fat: 19 },
  'müsli': { calories: 362, protein: 11, carbs: 66, fat: 6 },
  'cookie': { calories: 488, protein: 6, carbs: 65, fat: 22 },
  'croissant': { calories: 406, protein: 8, carbs: 46, fat: 21 },
  'muffin': { calories: 377, protein: 6, carbs: 52, fat: 16 },
  'panqueca': { calories: 227, protein: 6, carbs: 28, fat: 10 },
  'waffle': { calories: 312, protein: 8, carbs: 42, fat: 12 },
  'arroz japonês (sushi)': { calories: 130, protein: 2.4, carbs: 28, fat: 0.3 },
  'sushi (niguiri)': { calories: 150, protein: 7, carbs: 25, fat: 3 },
  'temaki': { calories: 180, protein: 8, carbs: 28, fat: 5 },
  'poke': { calories: 130, protein: 12, carbs: 15, fat: 3 },
  'homus': { calories: 166, protein: 8, carbs: 14, fat: 9.6 },
  'guacamole': { calories: 160, protein: 2, carbs: 9, fat: 15 },
  'tofu': { calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  'seitan': { calories: 370, protein: 75, carbs: 14, fat: 2 },
  'tempeh': { calories: 193, protein: 20, carbs: 9, fat: 11 },
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
 * Busca alimentos no banco de dados local expandido
 * Retorna resultados que correspondem à query (busca exata ou parcial)
 */
function searchLocalFoods(query: string): FoodSearchResult[] {
  const lowerQuery = query.toLowerCase();
  const results: FoodSearchResult[] = [];
  
  // Busca exata primeiro
  for (const [key, nutrients] of Object.entries(fallbackFoods)) {
    if (key === lowerQuery) {
      results.push({
        fdcId: `local_${key}`,
        description: key.charAt(0).toUpperCase() + key.slice(1),
        nutrients,
        servingSize: 100,
        servingUnit: 'g',
      });
      break;
    }
  }

  // Se não encontrou exato, busca parcial
  if (results.length === 0) {
    for (const [key, nutrients] of Object.entries(fallbackFoods)) {
      if (key.includes(lowerQuery)) {
        results.push({
          fdcId: `local_${key}`,
          description: key.charAt(0).toUpperCase() + key.slice(1),
          nutrients,
          servingSize: 100,
          servingUnit: 'g',
        });
        if (results.length >= 8) break;
      }
    }
  }

  return results;
}

/**
 * Busca alimentos na USDA API e/ou banco local
 * Sempre retorna resultados do banco local (BR) para termos em português
 */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  if (!query || query.length < 2) return [];

  const lowerQuery = query.toLowerCase();

  // Verificar cache
  if (foodCache.has(lowerQuery)) {
    const cached = foodCache.get(lowerQuery);
    return cached || [];
  }

  // Buscar no banco local primeiro (sempre, para termos em português)
  const localResults = searchLocalFoods(lowerQuery);

  try {
    // Tentar buscar na USDA API com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `${USDA_API_BASE}?query=${encodeURIComponent(query)}&pageSize=5&api_key=${USDA_API_KEY}`,
      { 
        method: 'GET',
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const foods = (data.foods || []).filter((f: any) => f.description && f.foodNutrients);

      if (foods.length > 0) {
        const apiResults: FoodSearchResult[] = foods.slice(0, 5).map((food: any) => ({
          fdcId: food.fdcId,
          description: food.description.substring(0, 100),
          nutrients: extractNutrients(food),
          servingSize: food.servingSize || 100,
          servingUnit: food.servingUnit || 'g',
        }));

        // Combinar resultados: locais primeiro (em português), depois API
        const allResults = [...localResults, ...apiResults].slice(0, 10);
        
        // Remover duplicatas (mesmo id)
        const seen = new Set<string>();
        const uniqueResults = allResults.filter(r => {
          if (seen.has(r.fdcId)) return false;
          seen.add(r.fdcId);
          return true;
        });

        foodCache.set(lowerQuery, uniqueResults);
        return uniqueResults;
      }
    }
    
    // Se API falhou ou não retornou nada, usar apenas locais
    foodCache.set(lowerQuery, localResults);
    return localResults;
  } catch (error) {
    // Se API falhou, usar apenas banco local
    foodCache.set(lowerQuery, localResults);
    return localResults;
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
