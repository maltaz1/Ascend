import { CatalogExercise } from "./types";

/**
 * Exercícios padrão disponíveis para todos os usuários.
 * Eles vivem no aplicativo, não no catálogo pessoal do usuário, para que
 * estejam disponíveis imediatamente e não precisem ser duplicados no banco.
 */
export const DEFAULT_EXERCISE_CATALOG: CatalogExercise[] = [
  // Peito
  { id: "default-supino-reto-barra", name: "Supino Reto com Barra", targetMuscleGroup: "Peito", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-supino-inclinado-barra", name: "Supino Inclinado com Barra", targetMuscleGroup: "Peito", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-supino-reto-halteres", name: "Supino Reto com Halteres", targetMuscleGroup: "Peito", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-supino-inclinado-halteres", name: "Supino Inclinado com Halteres", targetMuscleGroup: "Peito", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-crucifixo-halteres", name: "Crucifixo com Halteres", targetMuscleGroup: "Peito", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-crossover-polia", name: "Crossover na Polia", targetMuscleGroup: "Peito", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-peck-deck", name: "Peck Deck", targetMuscleGroup: "Peito", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },

  // Costas
  { id: "default-puxada-frontal", name: "Puxada Frontal na Polia", targetMuscleGroup: "Costas", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-barra-fixa", name: "Barra Fixa", targetMuscleGroup: "Costas", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-remada-curvada", name: "Remada Curvada com Barra", targetMuscleGroup: "Costas", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-remada-baixa", name: "Remada Baixa na Polia", targetMuscleGroup: "Costas", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-remada-unilateral-halter", name: "Remada Unilateral com Halter", targetMuscleGroup: "Costas", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-pullover-polia", name: "Pullover na Polia", targetMuscleGroup: "Costas", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },

  // Ombros
  { id: "default-desenvolvimento-halteres", name: "Desenvolvimento com Halteres", targetMuscleGroup: "Ombros", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-desenvolvimento-barra", name: "Desenvolvimento com Barra", targetMuscleGroup: "Ombros", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-elevacao-lateral", name: "Elevação Lateral", targetMuscleGroup: "Ombros", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-elevacao-frontal", name: "Elevação Frontal", targetMuscleGroup: "Ombros", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-crucifixo-inverso", name: "Crucifixo Inverso", targetMuscleGroup: "Ombros", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-face-pull", name: "Face Pull", targetMuscleGroup: "Ombros", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },

  // Bíceps e tríceps
  { id: "default-rosca-direta-barra", name: "Rosca Direta com Barra", targetMuscleGroup: "Bíceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-rosca-alternada", name: "Rosca Alternada com Halteres", targetMuscleGroup: "Bíceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-rosca-martelo", name: "Rosca Martelo", targetMuscleGroup: "Bíceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-rosca-scott", name: "Rosca Scott", targetMuscleGroup: "Bíceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-triceps-polia", name: "Tríceps na Polia", targetMuscleGroup: "Tríceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-triceps-frances", name: "Tríceps Francês", targetMuscleGroup: "Tríceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-triceps-testa", name: "Tríceps Testa", targetMuscleGroup: "Tríceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-triceps-banco", name: "Tríceps no Banco", targetMuscleGroup: "Tríceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },

  // Pernas e glúteos
  { id: "default-agachamento-livre", name: "Agachamento Livre", targetMuscleGroup: "Quadríceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-leg-press-45", name: "Leg Press 45°", targetMuscleGroup: "Quadríceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-cadeira-extensora", name: "Cadeira Extensora", targetMuscleGroup: "Quadríceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-afundo", name: "Afundo", targetMuscleGroup: "Quadríceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-agachamento-hack", name: "Agachamento Hack", targetMuscleGroup: "Quadríceps", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-stiff", name: "Stiff", targetMuscleGroup: "Posterior de Coxa", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-levantamento-terra-romeno", name: "Levantamento Terra Romeno", targetMuscleGroup: "Posterior de Coxa", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-mesa-flexora", name: "Mesa Flexora", targetMuscleGroup: "Posterior de Coxa", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-cadeira-flexora", name: "Cadeira Flexora", targetMuscleGroup: "Posterior de Coxa", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-elevacao-pelvica", name: "Elevação Pélvica", targetMuscleGroup: "Glúteos", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-coice-polia", name: "Coice na Polia", targetMuscleGroup: "Glúteos", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-cadeira-abdutora", name: "Cadeira Abdutora", targetMuscleGroup: "Glúteos", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },

  // Panturrilhas e abdômen
  { id: "default-panturrilha-em-pe", name: "Panturrilha em Pé", targetMuscleGroup: "Panturrilhas", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-panturrilha-sentado", name: "Panturrilha Sentado", targetMuscleGroup: "Panturrilhas", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-prancha", name: "Prancha", targetMuscleGroup: "Abdômen", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-abdominal-crunch", name: "Abdominal Crunch", targetMuscleGroup: "Abdômen", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-elevacao-de-pernas", name: "Elevação de Pernas", targetMuscleGroup: "Abdômen", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
  { id: "default-abdominal-polia", name: "Abdominal na Polia", targetMuscleGroup: "Abdômen", createdAt: "2026-01-01T00:00:00.000Z", isBuiltIn: true },
];

export function isDefaultExercise(id: string): boolean {
  return id.startsWith("default-");
}
