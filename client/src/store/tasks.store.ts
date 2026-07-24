import { supabase } from "@/lib/supabase";
import { Task } from "./types";
import { _data, notify, persistState, markActiveToday } from "./state";
import { generateId, getTodayString } from "./utils";
import { addXP } from "./xp-system";
import { evaluateAchievements } from "./achievements";

export async function addTask(
  task: Omit<Task, "id" | "createdAt">
): Promise<Task | null> {
  const optimisticTask: Task = {
    ...task,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  _data.tasks.push(optimisticTask);
  notify();
  persistState();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const dbPayload: Record<string, unknown> = {
      user_id: user.id,
      title: task.title,
      description: task.description,
      date: task.date,
      completed: task.completed,
      priority: task.priority,
      category: task.category,
    };

    if ("isRecurring" in task) dbPayload.is_recurring = task.isRecurring;
    if ("recurrence" in task) dbPayload.recurrence = task.recurrence;

    const { data, error } = await supabase
      .from("tasks")
      .insert([dbPayload])
      .select()
      .single();

    if (error || !data) {
      throw error ?? new Error("Falha ao gravar tarefa");
    }

    const index = _data.tasks.findIndex(t => t.id === optimisticTask.id);
    if (index !== -1) {
      _data.tasks[index] = {
        ...optimisticTask,
        id: data.id,
        createdAt: data.created_at,
      };
    }

    notify();
    persistState();
    return _data.tasks[index];
  } catch (error) {
    console.error(error);
    _data.tasks = _data.tasks.filter(t => t.id !== optimisticTask.id);
    notify();
    persistState();
    return null;
  }
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const idx = _data.tasks.findIndex(task => task.id === id);
  if (idx === -1) return;

  const previousTask = { ..._data.tasks[idx] };
  _data.tasks[idx] = { ..._data.tasks[idx], ...updates };

  notify();
  persistState();

  void (async () => {
    const updatesToDb: Record<string, unknown> = {};

    if (updates.title !== undefined) updatesToDb.title = updates.title;
    if (updates.description !== undefined) updatesToDb.description = updates.description;
    if (updates.date !== undefined) updatesToDb.date = updates.date;
    if (updates.completed !== undefined) updatesToDb.completed = updates.completed;
    if (updates.priority !== undefined) updatesToDb.priority = updates.priority;
    if (updates.category !== undefined) updatesToDb.category = updates.category;
    if (updates.isRecurring !== undefined) updatesToDb.is_recurring = updates.isRecurring;
    if (updates.recurrence !== undefined) updatesToDb.recurrence = updates.recurrence;

    if (Object.keys(updatesToDb).length === 0) return;

    const { error } = await supabase.from("tasks").update(updatesToDb).eq("id", id);

    if (error) {
      console.error(error);
      _data.tasks[idx] = previousTask;
      notify();
      persistState();
    }
  })();
}

export async function deleteTask(id: string): Promise<void> {
  const previousTasks = [..._data.tasks];
  _data.tasks = _data.tasks.filter(task => task.id !== id);

  notify();
  persistState();

  void (async () => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error(error);
      _data.tasks = previousTasks;
      notify();
      persistState();
    }
  })();
}

export async function completeTask(
  id: string
): Promise<{ xpGained: number; newAchievements: string[] }> {
  const task = _data.tasks.find(item => item.id === id);
  if (!task || task.completed) {
    return { xpGained: 0, newAchievements: [] };
  }

  task.completed = true;
  _data.user.totalTasksCompleted += 1;
  markActiveToday();
  await addXP(10);
  const newAchievements = evaluateAchievements(_data);

  notify();
  persistState();

  void (async () => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed: true })
      .eq("id", id);

    if (error) {
      console.error(error);
      task.completed = false;
      _data.user.totalTasksCompleted = Math.max(0, _data.user.totalTasksCompleted - 1);
      notify();
      persistState();
    }
  })();

  return { xpGained: 10, newAchievements };
}

export async function uncompleteTask(id: string): Promise<void> {
  const task = _data.tasks.find(item => item.id === id);
  if (!task || !task.completed) return;

  const previousCompleted = task.completed;
  const previousTotal = _data.user.totalTasksCompleted;

  task.completed = false;
  _data.user.totalTasksCompleted = Math.max(0, _data.user.totalTasksCompleted - 1);

  notify();
  persistState();

  void (async () => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed: false })
      .eq("id", id);

    if (error) {
      console.error(error);
      task.completed = previousCompleted;
      _data.user.totalTasksCompleted = previousTotal;
      notify();
      persistState();
    }
  })();
}

export function getTasksForDate(date: string): Task[] {
  return _data.tasks.filter(task => task.date === date);
}

export function getTaskStatus(task: Task): "completed" | "pending" | "overdue" {
  if (task.completed) return "completed";
  const today = getTodayString();
  if (task.date < today) return "overdue";
  return "pending";
}

export async function loadTasksData(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Erro ao carregar tarefas:", error);
    return;
  }

  _data.tasks = (data || []).map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    date: task.date,
    completed: task.completed,
    priority: task.priority,
    category: task.category,
    createdAt: task.created_at,
    isRecurring: task.is_recurring ?? false,
    recurrence: task.recurrence as Record<string, unknown> | undefined,
  }));

  notify();
  persistState();
}
