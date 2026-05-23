export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return (
    Math.random().toString(36).substring(2, 11) +
    Date.now().toString(36)
  );
}

export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every(key => a[key] === b[key]);
}

export type MaybePromise<T> = T | Promise<T>;
