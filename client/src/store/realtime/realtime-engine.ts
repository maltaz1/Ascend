import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { loadTasksData } from "../tasks.store";
import { loadGoalsData } from "../goals.store";
import { loadGymData } from "@/lib/gym";
import { loadDietData } from "../diet.store";
import { loadFinancialData } from "../financial.store";
import { loadHabitsData } from "../habits.store";
import { loadProfile } from "@/lib/database/queries";
import { profileFromRow } from "@/lib/database/mappers";
import { _data, notify, isSelfWrite } from "../state";

async function loadProfileData() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const profile = await loadProfile(user.id);
  if (profile) {
    const mapped = profileFromRow(profile);
    _data.user.xp = mapped.xp;
    _data.user.level = mapped.level;
    _data.user.streak = mapped.streak;
    _data.user.name = mapped.name;
    notify();
  }
}

const reloadMap: Record<string, () => Promise<void>> = {
  tasks: loadTasksData,
  goals: loadGoalsData,
  workouts: loadGymData,
  workout_sessions: loadGymData,
  meals: loadDietData,
  hydration_logs: loadDietData,
  diet_settings: loadDietData,
  financial_transactions: loadFinancialData,
  habits: loadHabitsData,
  profiles: loadProfileData,
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
        const eventRecordId = (payload as unknown as { record?: { id?: string }; old?: { id?: string } }).record?.id ?? (payload as unknown as { record?: { id?: string }; old?: { id?: string } }).old?.id ?? "unknown";
        if (payload.table && eventRecordId !== "unknown" && isSelfWrite(payload.table, eventRecordId)) {
          logger.debug("realtime", `Ignorando evento echo do próprio cliente: ${payload.table} ${eventRecordId}`);
          return;
        }
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
