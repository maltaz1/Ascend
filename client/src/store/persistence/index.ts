import type { AppCoreState } from "../core/store.types";

const DB_NAME = "AscendStore";
const DB_VERSION = 1;
const STORE_NAME = "app_state";
const SCHEMA_KEY = "ascend_schema_version";

export type PersistenceLayer = {
  loadState: () => Promise<AppCoreState | null>;
  saveState: (state: AppCoreState) => Promise<void>;
  migrate: (version: number, state: AppCoreState) => AppCoreState;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeIndexedDB(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readIndexedDB<T>(key: string): Promise<T | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}

export const persistence: PersistenceLayer = {
  async loadState() {
    try {
      const saved = await readIndexedDB<AppCoreState>("state");
      if (saved) {
        const persistedVersion = Number(localStorage.getItem(SCHEMA_KEY) || 0);
        if (persistedVersion !== DB_VERSION) {
          localStorage.setItem(SCHEMA_KEY, String(DB_VERSION));
          return this.migrate(persistedVersion, saved);
        }
        return saved;
      }
    } catch {
      // fallback
    }

    try {
      const raw = localStorage.getItem("ascend_app_state");
      if (!raw) return null;
      return JSON.parse(raw) as AppCoreState;
    } catch {
      return null;
    }
  },

  async saveState(state) {
    const payload = { ...state, meta: { ...state.meta, lastHeartbeat: Date.now() } };
    try {
      await writeIndexedDB("state", payload);
    } catch {
      localStorage.setItem("ascend_app_state", JSON.stringify(payload));
    }
  },

  migrate(version, state) {
    if (version === 0) {
      return {
        ...state,
        meta: {
          ...state.meta,
          version: DB_VERSION,
        },
      };
    }
    return state;
  },
};
