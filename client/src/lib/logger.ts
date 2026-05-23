type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL: LogLevel = import.meta.env.DEV ? "debug" : "info";

function shouldLog(level: LogLevel) {
  return levelOrder[level] >= levelOrder[CURRENT_LEVEL];
}

function formatMeta(category: string) {
  return `[${new Date().toISOString()}] [${category.toUpperCase()}]`;
}

export const logger = {
  debug(category: string, message: string, payload?: unknown) {
    if (!shouldLog("debug")) return;
    console.debug(formatMeta(category), message, payload ?? "");
  },
  info(category: string, message: string, payload?: unknown) {
    if (!shouldLog("info")) return;
    console.info(formatMeta(category), message, payload ?? "");
  },
  warn(category: string, message: string, payload?: unknown) {
    if (!shouldLog("warn")) return;
    console.warn(formatMeta(category), message, payload ?? "");
  },
  error(category: string, message: string, payload?: unknown) {
    if (!shouldLog("error")) return;
    console.error(formatMeta(category), message, payload ?? "");
  },
  time<T>(label: string, callback: () => T) {
    const start = performance.now();
    const result = callback();
    const delta = Math.round(performance.now() - start);
    this.debug("perf", `${label} took ${delta}ms`);
    return result;
  },
};
