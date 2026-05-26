import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { loadTasksData } from "../entities/tasks";
import { loadGoalsData } from "../entities/goals";
import { loadGymData } from "../entities/workouts";
import { loadDietData } from "../entities/diet";
import { loadFinancialData } from "../entities/financial";

const reloadMap: Record<string, () => Promise<void>> = {
  tasks: loadTasksData,
  goals: loadGoalsData,
  workouts: loadGymData,
  workout_sessions: loadGymData,
  meals: loadDietData,
  hydration_logs: loadDietData,
  diet_settings: loadDietData,
  financial_transactions: loadFinancialData,
};

let channel: ReturnType<typeof supabase.channel> | null = null;
let reloadTimeout: number | undefined;
const pendingTables = new Set<string>();
const seenEvents = new Set<string>();

interface RealtimePayload {
  table?: string;
  eventType?: string;
  record?: { id?: string };
  old?: { id?: string };
  commit_timestamp?: string;
  timestamp?: string;
}

function getEventKey(payload: RealtimePayload): string {
  const id = payload.record?.id ?? payload.old?.id ?? "unknown";
  return `${payload.table ?? "unknown"}|${payload.eventType ?? "unknown"}|${id}|${payload.commit_timestamp || payload.timestamp || "unknown"}`;
}

function scheduleReload(table: string): void {
  pendingTables.add(table);
  if (reloadTimeout) {
    window.clearTimeout(reloadTimeout);
  }
  reloadTimeout = window.setTimeout(async () => {
    const tables = Array.from(pendingTables);
    pendingTables.clear();

    await Promise.all(
      tables.map(async name => {
        const loader = reloadMap[name];
        if (!loader) return;
        try {
          await loader();
          logger.debug("realtime", `Reloaded table ${name}`);
        } catch (error) {
          logger.error("realtime", `Realtime reload ${name} failed`, error);
        }
      })
    );
  }, 250);
}

export async function initRealtimeSync(userId: string): Promise<void> {
  if (!userId) return;
  if (channel) return;

  channel = supabase.channel("public:ascend-realtime", {
    config: { broadcast: { self: false }, presence: { key: userId } },
  });

  Object.keys(reloadMap).forEach(table => {
    channel?.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      payload => {
        const key = getEventKey(payload);
        if (seenEvents.has(key)) {
          return;
        }
        seenEvents.add(key);
        window.setTimeout(() => seenEvents.delete(key), 10000);
        scheduleReload(table);
      }
    );
  });

  channel.subscribe(status => {
    if (status === "SUBSCRIBED") {
      logger.info("realtime", "Realtime engine subscribed");
      return;
    }

    logger.warn("realtime", "Realtime connection issue", status);
    channel = null;
    window.setTimeout(() => initRealtimeSync(userId).catch(err => logger.error("realtime", "Reconnect failed", err)), 2000);
  });
}

export function stopRealtimeSync(): void {
  if (!channel) return;
  channel.unsubscribe();
  channel = null;
}
