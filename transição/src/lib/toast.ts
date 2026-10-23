export type ToastType = "success" | "error" | "warning" | "info";

export type Toast = {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration: number;
};

type Listener = (toast: Toast) => void;

const listeners = new Set<Listener>();
let nextId = 1;

export function showToast(toast: Omit<Toast, "id">): void {
  const full = { ...toast, id: nextId++ };
  listeners.forEach(listener => listener(full));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
