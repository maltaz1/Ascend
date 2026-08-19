// Cross-tab synchronization for the legacy store (_data).
// When another tab/window mutates data (e.g. user creates a task in the
// Tasks tab), the Supabase Realtime channel ignores echoes of the client's
// own writes (broadcast self:false + isSelfWrite). Other tabs/windows in the
// same origin DO receive the mutation though, and they re-run the store
// loaders via the realtime engine. The legacy store in *this* tab, however,
// is only subscribed to localStorage changes of other tabs via the
// BroadcastChannel signal below: it asks the realtime engine loaders to
// refresh the tables that were mutated elsewhere and notifies listeners
// so components like Today re-render immediately instead of waiting for a
// page reload.
//
// It also handles visibility changes: when the user returns to a tab, the
// store re-fetches data that was marked as "dirty" by other tabs.

import { loadTasksData } from "./tasks.store";
import { loadHabitsData } from "./habits.store";
import { loadGoalsData } from "./goals.store";
import { loadDietData } from "./diet.store";
import { loadFinancialData } from "./financial.store";
import { loadProfile } from "@/lib/database/queries";
import { profileFromRow } from "@/lib/database/mappers";
import { supabase } from "@/lib/supabase";
import { _data, notify, isSelfWrite } from "./state";

const CHANNEL_NAME = "ascend-cross-tab";

type CrossTabMessage =
  | { type: "mutations"; tables: string[]; ts: number }
  | { type: "reloaded"; ts: number };

const TABLE_TO_LOADER: Record<string, () => Promise<void>> = {
  tasks: loadTasksData,
  habits: loadHabitsData,
  goals: loadGoalsData,
  meals: loadDietData,
  diet_settings: loadDietData,
  hydration_logs: loadDietData,
  financial_transactions: loadFinancialData,
};

let channel: BroadcastChannel | null = null;
let lastKnownMutationTs = 0;
let reloadTimers: Map<string, number> = new Map();
let crossTabReloadInProgress = false;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) {
    try {
      channel = new window.BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = event => {
        const msg = event.data as CrossTabMessage | undefined;
        if (!msg || typeof msg.ts !== "number") return;

        if (msg.ts <= lastKnownMutationTs) return;
        lastKnownMutationTs = msg.ts;

        if (msg.type === "mutations") {
          scheduleCrossTabReload(msg.tables);
        } else if (msg.type === "reloaded") {
          cancelScheduledReloads();
          void performCrossTabReload();
        }
      };
    } catch {
      channel = null;
    }
  }
  return channel;
}

function broadcastMutations(tables: string[]): void {
  try {
    getChannel()?.postMessage({ type: "mutations", tables, ts: Date.now() });
  } catch {
    // BroadcastChannel unavailable — single tab, nothing to do
  }
}

function scheduleCrossTabReload(tables: string[]): void {
  tables.forEach(table => {
    if (reloadTimers.has(table)) return;
    const timer = window.setTimeout(() => {
      reloadTimers.delete(table);
      void performCrossTabReload();
    }, 250);
    reloadTimers.set(table, timer);
  });
}

function cancelScheduledReloads(): void {
  reloadTimers.forEach(timer => window.clearTimeout(timer));
  reloadTimers.clear();
}

async function performCrossTabReload(): Promise<void> {
  if (crossTabReloadInProgress) return;
  crossTabReloadInProgress = true;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await Promise.all([
      loadTasksData(),
      loadHabitsData(),
      loadGoalsData(),
      loadDietData(),
      loadFinancialData(),
      loadProfileData(),
    ]);
  } catch (error) {
    console.error("[cross-tab-sync] Reload failed", error);
  } finally {
    crossTabReloadInProgress = false;
  }
}

async function loadProfileData(): Promise<void> {
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
  }
}

export function broadcastReloadComplete(): void {
  try {
    getChannel()?.postMessage({ type: "reloaded", ts: Date.now() });
  } catch {
    // ignore
  }
}

export function markCrossTabMutations(tables: string[]): void {
  broadcastMutations(tables);
}

// When the tab regains focus after another tab mutated data, refresh the
// store so the current page (e.g. Today) always shows up-to-date info.
function setupVisibilityReload(): void {
  if (typeof document === "undefined") return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (lastKnownMutationTs === 0) return;
    lastKnownMutationTs = 0;
    void performCrossTabReload();
  });
}

// Wire it up once on module load.
void getChannel();
setupVisibilityReload();
