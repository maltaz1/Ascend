import { AppData, Achievement } from "./types";

const achievementPredicates: Record<string, (data: AppData) => boolean> = {
  tasks_1: data => data.user.totalTasksCompleted >= 1,
  tasks_10: data => data.user.totalTasksCompleted >= 10,
  tasks_50: data => data.user.totalTasksCompleted >= 50,
  tasks_100: data => data.user.totalTasksCompleted >= 100,
  goals_1: data => data.user.totalGoalsCompleted >= 1,
  goals_5: data => data.user.totalGoalsCompleted >= 5,
  streak_3: data => data.user.streak >= 3,
  streak_7: data => data.user.streak >= 7,
  streak_30: data => data.user.streak >= 30,
  level_5: data => data.user.level >= 5,
  level_10: data => data.user.level >= 10,
  habit_streak_7: data =>
    data.habits.some(habit => {
      const today = new Date().toISOString().split("T")[0];
      let streak = 0;
      for (let offset = 0; offset < 7; offset += 1) {
        const date = new Date(today);
        date.setDate(date.getDate() - offset);
        const dateKey = date.toISOString().split("T")[0];
        if (habit.completedDates.includes(dateKey)) {
          streak += 1;
        } else {
          break;
        }
      }
      return streak >= 7;
    }),
};

export function evaluateAchievements(data: AppData): string[] {
  const newlyUnlocked: string[] = [];

  data.achievements.forEach(achievement => {
    if (achievement.unlockedAt) {
      return;
    }

    const predicate = achievementPredicates[achievement.condition];
    if (!predicate) {
      return;
    }

    if (predicate(data)) {
      achievement.unlockedAt = new Date().toISOString();
      if (!data.user.achievements.includes(achievement.id)) {
        data.user.achievements.push(achievement.id);
      }
      newlyUnlocked.push(achievement.id);
    }
  });

  return newlyUnlocked;
}
