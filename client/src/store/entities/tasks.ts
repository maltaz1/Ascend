import { supabase } from "@/lib/supabase";
import { getData, store } from "../store";
import { normalizeEntities, entityToArray, upsertEntity, removeEntity, setError, setLoading } from "../core/entity";
import { generateId, getTodayString } from "../utils";
import { taskFromRow, createTaskRow, updateTaskRow, deleteTaskRow, loadTasks } from "@/lib/database";
import { eventBus } from "../event-bus";
import { createXpPayload, awardXp } from "../xp-engine";
import { evaluateAchievements } from "../achievements";
import type { Task } from "../types";

type StoreState = ReturnType<typeof store.getState>;

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function markActiveToday(state: StoreState) {
  const today = getTodayString();
  const last = state.user.lastActiveDate;

  if (last === today) return;
  const lastDate = last ? new Date(last) : null;
  const todayDate = new Date(today);

  if (lastDate) {
    const diff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    state.user.streak = diff === 1 ? state.user.streak + 1 : 1;
  } else {
    state.user.streak = 1;
  }

  state.user.lastActiveDate = today;
}

export async function loadTasksData(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  store.update(state => {
    state.tasks = setLoading(state.tasks, true);
  });

  const rows = await loadTasks(userId);
  const tasks = rows.map(taskFromRow);

  store.update(state => {
    state.tasks = normalizeEntities(tasks);
    state.tasks.error = null;
  });
}

export async function addTask(task: Omit<Task, "id" | "createdAt">): Promise<Task | null> {
  const optimisticTask: Task = {
    ...task,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  store.update(state => {
    state.tasks = upsertEntity(state.tasks, optimisticTask);
  });

  const userId = await getUserId();
  if (!userId) {
    return null;
  }

  try {
    const row = await createTaskRow({
      user_id: userId,
      title: task.title,
      description: task.description,
      date: task.date,
      completed: task.completed,
      priority: task.priority,
      category: task.category,
      created_at: optimisticTask.createdAt,
    });

    const created = taskFromRow(row);
    store.update(state => {
      state.tasks = upsertEntity(state.tasks, created);
    });
    return created;
  } catch (error) {
    store.update(state => {
      state.tasks = removeEntity(state.tasks, optimisticTask.id);
      state.tasks = setError(state.tasks, "Falha ao gravar tarefa");
    });
    return null;
  }
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const previous = store.getState().tasks.byId[id];
  if (!previous) return;

  store.update(state => {
    state.tasks = upsertEntity(state.tasks, { ...previous, ...updates });
  });

  try {
    await updateTaskRow(id, {
      title: updates.title,
      description: updates.description,
      date: updates.date,
      completed: updates.completed,
      priority: updates.priority,
      category: updates.category,
    });
  } catch (error) {
    store.update(state => {
      state.tasks = upsertEntity(state.tasks, previous);
      state.tasks = setError(state.tasks, "Falha ao atualizar tarefa");
    });
  }
}

export async function deleteTask(id: string): Promise<void> {
  const previous = store.getState().tasks.byId[id];
  if (!previous) return;

  store.update(state => {
    state.tasks = removeEntity(state.tasks, id);
  });

  try {
    await deleteTaskRow(id);
  } catch (error) {
    store.update(state => {
      state.tasks = upsertEntity(state.tasks, previous);
      state.tasks = setError(state.tasks, "Falha ao deletar tarefa");
    });
  }
}

export async function completeTask(id: string): Promise<{ xpGained: number; newAchievements: string[] }> {
  const state = store.getState();
  const original = state.tasks.byId[id];
  if (!original || original.completed) return { xpGained: 0, newAchievements: [] };

  store.update(storeState => {
    storeState.tasks = upsertEntity(storeState.tasks, { ...original, completed: true });
    storeState.user.totalTasksCompleted += 1;
    markActiveToday(storeState);
  });

  const xpGained = await awardXp(createXpPayload("TASK_COMPLETED", 10));
  const newAchievements = evaluateAchievements(getData());
  eventBus.emit("TASK_COMPLETED", { id });

  try {
    await updateTaskRow(id, { completed: true });
  } catch (error) {
    store.update(storeState => {
      storeState.tasks = upsertEntity(storeState.tasks, original);
      storeState.user.totalTasksCompleted = Math.max(0, storeState.user.totalTasksCompleted - 1);
    });
  }

  return { xpGained, newAchievements };
}

export async function uncompleteTask(id: string): Promise<void> {
  const state = store.getState();
  const original = state.tasks.byId[id];
  if (!original || !original.completed) return;

  store.update(storeState => {
    storeState.tasks = upsertEntity(storeState.tasks, { ...original, completed: false });
    storeState.user.totalTasksCompleted = Math.max(0, storeState.user.totalTasksCompleted - 1);
  });

  try {
    await updateTaskRow(id, { completed: false });
  } catch (error) {
    store.update(storeState => {
      storeState.tasks = upsertEntity(storeState.tasks, original);
    });
  }
}

export function getTasksForDate(date: string): Task[] {
  const state = store.getState();
  return entityToArray(state.tasks).filter(task => task.date === date);
}
