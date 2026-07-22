import type { RecurrenceConfig } from "@/types/recurrence";

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  category?: string;
  createdAt: string;
  isRecurring?: boolean;
  recurrence?: RecurrenceConfig;
}

export interface GoalStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  emoji: string;
  description?: string;
  steps: GoalStep[];
  deadline?: string;
  color: string;
  createdAt: string;
  completedAt?: string;
}

export interface Habit {
  id: string;
  title: string;
  emoji: string;
  color: string;
  frequency: "daily" | "weekly";
  completedDates: string[];
  createdAt: string;
  targetDays: number;
}

export interface Exercise {
  id: string;
  name: string;
  series: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
}

export interface Workout {
  id: string;
  name: string;
  dayOfWeek: number;
  exercises: Exercise[];
  createdAt: string;
}

export interface WorkoutSet {
  weight: number;
  reps: number;
  type: "warmup" | "normal" | "failed" | "drop";
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string;
  durationMinutes: number;
  exercises: Array<{
    exerciseName: string;
    sets: WorkoutSet[];
    totalVolume: number;
  }>;
  totalVolume: number;
  completedAt: string;
}

export interface FinancialTransaction {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  date: string;
  createdAt: string;
}

export interface FinancialData {
  transactions: FinancialTransaction[];
}

export interface GymStats {
  totalWorkouts: number;
  totalWorkoutPlans: number;
  totalExercises: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlockedAt?: string;
  condition: string;
}

export interface PrayerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface PrayerConversation {
  id: string;
  title: string;
  messages: PrayerMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface FavoritePrayer {
  id: string;
  content: string;
  timestamp: string;
  addedAt: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: "g" | "ml" | "unit";
}

export interface Meal {
  id: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  date: string;
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  timestamp: string;
}

export interface DietSettings {
  dailyCalorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  waterGoal: number;
  restrictions: string[];
  preferences: string[];
}

export interface HydrationLog {
  date: string;
  cupsConsumed: number;
  goal: number;
}

export interface DietData {
  meals: Meal[];
  settings: DietSettings;
  hydration: HydrationLog[];
  dietPoints: number;
  dietStreak: number;
}

export interface UserProfile {
  name: string;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  totalTasksCompleted: number;
  totalGoalsCompleted: number;
  achievements: string[];
}

export interface AppData {
  user: UserProfile;
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  achievements: Achievement[];
  workouts: Workout[];
  workoutSessions: WorkoutSession[];
  prayerConversations: PrayerConversation[];
  favoritePrayers: FavoritePrayer[];
  diet: DietData;
  financial: FinancialData;
}

export const XP_PER_TASK = 10;
export const XP_PER_GOAL = 50;
export const XP_PER_HABIT = 5;
export const XP_PER_WORKOUT = 25;

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_task",
    title: "Primeira Tarefa",
    description: "Complete sua primeira tarefa",
    emoji: "✅",
    condition: "tasks_1",
  },
  {
    id: "task_10",
    title: "Produtivo",
    description: "Complete 10 tarefas",
    emoji: "🔥",
    condition: "tasks_10",
  },
  {
    id: "task_50",
    title: "Máquina",
    description: "Complete 50 tarefas",
    emoji: "⚡",
    condition: "tasks_50",
  },
  {
    id: "task_100",
    title: "Lendário",
    description: "Complete 100 tarefas",
    emoji: "👑",
    condition: "tasks_100",
  },
  {
    id: "first_goal",
    title: "Visionário",
    description: "Conclua sua primeira meta",
    emoji: "🎯",
    condition: "goals_1",
  },
  {
    id: "goal_5",
    title: "Conquistador",
    description: "Conclua 5 metas",
    emoji: "🏆",
    condition: "goals_5",
  },
  {
    id: "streak_3",
    title: "Consistente",
    description: "3 dias seguidos ativos",
    emoji: "🌟",
    condition: "streak_3",
  },
  {
    id: "streak_7",
    title: "Semana Perfeita",
    description: "7 dias seguidos ativos",
    emoji: "💎",
    condition: "streak_7",
  },
  {
    id: "streak_30",
    title: "Imparável",
    description: "30 dias seguidos ativos",
    emoji: "🚀",
    condition: "streak_30",
  },
  {
    id: "level_5",
    title: "Nível 5",
    description: "Alcance o nível 5",
    emoji: "⭐",
    condition: "level_5",
  },
  {
    id: "level_10",
    title: "Nível 10",
    description: "Alcance o nível 10",
    emoji: "🌙",
    condition: "level_10",
  },
  {
    id: "habit_master",
    title: "Mestre dos Hábitos",
    description: "Complete um hábito por 7 dias seguidos",
    emoji: "🧠",
    condition: "habit_streak_7",
  },
];

export const DEFAULT_DATA: AppData = {
  user: {
    name: "Usuário",
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: "",
    totalTasksCompleted: 0,
    totalGoalsCompleted: 0,
    achievements: [],
  },
  tasks: [],
  goals: [],
  habits: [],
  achievements: DEFAULT_ACHIEVEMENTS,
  workouts: [],
  workoutSessions: [],
  prayerConversations: [],
  favoritePrayers: [],
  diet: {
    meals: [],
    settings: {
      dailyCalorieGoal: 2200,
      proteinGoal: 150,
      carbsGoal: 250,
      fatGoal: 70,
      waterGoal: 2,
      restrictions: [],
      preferences: [],
    },
    hydration: [],
    dietPoints: 0,
    dietStreak: 0,
  },
  financial: {
    transactions: [],
  },
};
