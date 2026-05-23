import { AppData } from "./types";
import { loadAppData, saveAppDataDebounced } from "./persistence";
import { getTodayString } from "./utils";

export type Listener = () => void;
const listeners = new Set<Listener>();

export let _data: AppData = loadAppData();
let notifyTimeout: number | undefined;

function checkAndUpdateStreak(): void {
  const today = getTodayString();
  const last = _data.user.lastActiveDate;

  if (!last) {
    return;
  }

  const lastDate = new Date(last);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays > 1) {
    _data.user.streak = 0;
    saveAppDataDebounced(_data);
  }
}

checkAndUpdateStreak();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify(): void {
  if (notifyTimeout) {
    window.clearTimeout(notifyTimeout);
  }

  notifyTimeout = window.setTimeout(() => {
    listeners.forEach(listener => listener());
  }, 0);
}

export function getData(): AppData {
  return _data;
}

export function persistState(): void {
  saveAppDataDebounced(_data);
}

export function replaceState(data: AppData): void {
  _data = data;
  persistState();
  notify();
}

export function markActiveToday(): void {
  const today = getTodayString();
  const last = _data.user.lastActiveDate;

  if (last === today) {
    return;
  }

  if (last) {
    const lastDate = new Date(last);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      _data.user.streak += 1;
    } else {
      _data.user.streak = 1;
    }
  } else {
    _data.user.streak = 1;
  }

  _data.user.lastActiveDate = today;
}
