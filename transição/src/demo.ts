// Modo de demonstração (EXPO_PUBLIC_DEMO=1): abre o app já "logado" com dados
// de exemplo e sem falar com o Supabase (lib/supabase.ts troca o fetch).
// Serve só para pré-visualizar as telas.
import type { User } from "@supabase/supabase-js";
import { _data, notify, toYYYYMMDD, type Goal, type Habit, type Task } from "@/lib/store";
import { getMondayOfDate } from "@/lib/weeklyGoals";

export const IS_DEMO = process.env.EXPO_PUBLIC_DEMO === "1";

export const DEMO_USER = {
  id: "demo-user",
  email: "demo@ascend.app",
  app_metadata: {},
  user_metadata: { name: "Visitante" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as User;

function dayOffset(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return toYYYYMMDD(date);
}

function pastDays(count: number, skip: number[] = []): string[] {
  return Array.from({ length: count }, (_, i) => i + 1)
    .filter(i => !skip.includes(i))
    .map(i => dayOffset(-i));
}

export function seedDemoData(): void {
  const now = new Date().toISOString();
  const task = (id: string, title: string, date: string, priority: Task["priority"], completed = false, category?: string): Task => ({
    id,
    title,
    date,
    priority,
    completed,
    createdAt: now,
    category,
  });

  _data.user = { ..._data.user, name: "Visitante", xp: 140, level: 3, streak: 6 };
  // Histórico com etiqueta de atributo: alimenta a aba Eu (atributos e árvore).
  const history: [string, string, number][] = [
    ["disciplina:habito", "Cumprir a rotina da manhã", 16], ["disciplina:nota", "Planejar o dia seguinte", 4], ["disciplina:treino", "Treino em casa", 2],
    ["forca:treino", "Treino de força", 14], ["forca:atividade", "Corrida leve", 4], ["forca:dieta", "Refeição pós-treino", 3],
    ["vitalidade:agua", "Beber 2L de água", 8], ["vitalidade:sono", "Dormir 7h ou mais", 6], ["vitalidade:dieta", "Almoço equilibrado", 4],
    ["mente:leitura", "Ler 20 páginas", 7], ["mente:estudo", "Sessão de estudo", 4], ["mente:nota", "Resumo do capítulo", 2],
    ["riqueza:financeiro", "Anotar os gastos do dia", 9], ["riqueza:estudo", "Ler sobre investimentos", 1],
    ["espirito:meditacao", "Meditar 5 minutos", 3], ["espirito:nota", "Escrever no diário", 1],
  ];
  const tagged: Task[] = [];
  let seq = 0;
  history.forEach(([tag, title, count]) => {
    for (let k = 0; k < count; k++) {
      seq += 1;
      tagged.push(task(`d${seq}`, title, dayOffset(-(1 + ((seq * 3 + k) % 28))), (["low", "medium", "high"] as const)[seq % 3], true, tag));
    }
  });
  _data.tasks = [
    task("t1", "Revisar metas da semana", dayOffset(0), "high", false, "disciplina:nota"),
    task("t2", "Treino de pernas", dayOffset(0), "medium", true, "forca:treino"),
    task("t3", "Ler 20 páginas", dayOffset(0), "low", false, "mente:leitura"),
    task("t4", "Pagar conta de luz", dayOffset(-1), "high"),
    task("t5", "Reunião com o time", dayOffset(1), "medium"),
    task("t6", "Planejar refeições", dayOffset(2), "low"),
    task("t7", "Meditar 5 minutos", dayOffset(0), "low", false, "espirito:meditacao"),
    task("t8", "Anotar os gastos do dia", dayOffset(0), "medium", false, "riqueza:financeiro"),
    ...tagged,
  ];

  const habit = (id: string, title: string, emoji: string, color: string, completedDates: string[], category?: string): Habit => ({
    id,
    title,
    emoji,
    color,
    frequency: "daily",
    completedDates,
    createdAt: now,
    targetDays: 30,
    category,
  });

  _data.habits = [
    habit("h1", "Beber 2L de água", "💧", "#3b82f6", [dayOffset(0), ...pastDays(6)], "vitalidade:agua"),
    habit("h2", "Meditar 10 min", "🧘", "var(--accent)", pastDays(4, [2]), "espirito:meditacao"),
    habit("h3", "Ler antes de dormir", "📚", "#8b5cf6", pastDays(3), "mente:leitura"),
  ];

  const monday = getMondayOfDate(new Date());
  const todayIdx = (new Date().getDay() + 6) % 7;
  const week = (count: number) => Array.from({ length: 7 }, (_, i) => i <= todayIdx && i < count);
  const goal = (g: Partial<Goal> & Pick<Goal, "id" | "title" | "emoji" | "color">): Goal => ({ steps: [], createdAt: now, ...g });
  _data.goals = [
    goal({ id: "g1", title: "Treinar", emoji: "💪", color: "var(--primary)", type: "semanal", targetFrequency: 4, daysCompletedWeek: week(3), weekStart: monday, streak: 2, recordStreak: 5 }),
    goal({ id: "g2", title: "Meditar", emoji: "🧘", color: "var(--accent)", type: "semanal", targetFrequency: 5, daysCompletedWeek: week(2), weekStart: monday, linkedHabitId: "h2" }),
    goal({
      id: "g3", title: "Ler 12 livros no ano", emoji: "📚", color: "#10B981", type: "longo_prazo", deadline: `${new Date().getFullYear()}-12-31`,
      steps: [
        { id: "s1", title: "Hábitos Atômicos", completed: true },
        { id: "s2", title: "O Poder do Hábito", completed: true },
        { id: "s3", title: "Mindset", completed: false },
        { id: "s4", title: "Essencialismo", completed: false },
      ],
    }),
  ];

  const tx = (id: string, title: string, amount: number, type: "income" | "expense", category: string, offset: number) => ({
    id, title, amount, type, category, date: dayOffset(-offset), createdAt: now,
  });
  _data.financial = {
    transactions: [
      tx("f1", "Salário", 5200, "income", "Salário", 5),
      tx("f2", "Mercado", 412.5, "expense", "Alimentação", 1),
      tx("f3", "Aluguel", 1500, "expense", "Moradia", 4),
      tx("f4", "Uber", 38.9, "expense", "Transporte", 2),
      tx("f5", "Cinema", 64, "expense", "Lazer & Estilo de Vida", 3),
      tx("f6", "Academia", 99.9, "expense", "Saúde & Bem-Estar", 6),
      tx("f7", "Projeto freelance", 1200, "income", "Freelance", 2),
    ],
  };

  const weekday = new Date().getDay();
  _data.workouts = [
    {
      id: "w1", name: "Treino A — Peito e tríceps", dayOfWeek: weekday, daysOfWeek: [weekday, (weekday + 3) % 7], createdAt: now,
      exercises: [
        { id: "e1", name: "Supino Reto com Barra", series: 4, repMin: 8, repMax: 10, restSeconds: 90 },
        { id: "e2", name: "Crucifixo com Halteres", series: 3, repMin: 10, repMax: 12, restSeconds: 60 },
      ],
    },
    {
      id: "w2", name: "Treino B — Costas e bíceps", dayOfWeek: (weekday + 1) % 7, daysOfWeek: [(weekday + 1) % 7], createdAt: now,
      exercises: [{ id: "e3", name: "Puxada Frontal na Polia", series: 4, repMin: 8, repMax: 12, restSeconds: 90 }],
    },
  ];
  _data.workoutSessions = [14, 10, 7, 3].map((offset, i) => {
    const weight = 50 + i * 2.5;
    const sets = [0, 1, 2, 3].map(() => ({ weight, reps: 10, type: "normal" as const }));
    const volume = sets.reduce((v, s) => v + s.weight * s.reps, 0);
    return {
      id: `ws${i}`, workoutId: "w1", workoutName: "Treino A — Peito e tríceps", date: dayOffset(-offset), durationMinutes: 50 + i * 3,
      exercises: [{ exerciseName: "Supino Reto com Barra", sets, totalVolume: volume }], totalVolume: volume,
      completedAt: new Date(Date.now() - offset * 86400000).toISOString(),
    };
  });

  const food = (id: string, name: string, quantity: number, calories: number, protein: number, carbs: number, fat: number) => ({
    id, name, quantity, unit: "g" as const, calories, protein, carbs, fat,
  });
  const meal = (id: string, type: "breakfast" | "lunch" | "dinner" | "snack", foods: ReturnType<typeof food>[]) => ({
    id, type, date: dayOffset(0), foods, timestamp: now,
    totalCalories: foods.reduce((s, f) => s + f.calories, 0),
    totalProtein: foods.reduce((s, f) => s + f.protein, 0),
    totalCarbs: foods.reduce((s, f) => s + f.carbs, 0),
    totalFat: foods.reduce((s, f) => s + f.fat, 0),
  });
  _data.diet = {
    ..._data.diet,
    meals: [
      meal("m1", "breakfast", [food("fd1", "Pão integral", 50, 124, 5, 22, 2), food("fd2", "Ovo cozido", 100, 146, 13, 1, 10)]),
      meal("m2", "lunch", [food("fd3", "Arroz branco", 150, 192, 4, 42, 0), food("fd4", "Frango grelhado", 150, 239, 48, 0, 5)]),
    ],
    hydration: [{ date: dayOffset(0), cupsConsumed: 1200, goal: 2000 }],
    dietPoints: 40,
  };

  notify();
}
