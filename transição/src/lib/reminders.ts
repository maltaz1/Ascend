import { Platform } from "react-native";

// Lembretes diários do Ascend: notificações locais e silenciosas. Aparecem só na
// bandeja de notificações do celular, sem som, sem vibrar e sem pular na tela.
// No web/demonstração não existe notificação local, então tudo aqui vira no-op.
export type ReminderKind = "habits" | "tasks" | "academy";

export type ReminderSetting = { on: boolean; hour: number; minute: number };
export type ReminderPrefs = Record<ReminderKind, ReminderSetting>;

export const REMINDER_INFO: Record<ReminderKind, { label: string; sub: string; title: string; body: string; url: string }> = {
  habits: {
    label: "Hábitos",
    sub: "Lembra de marcar seus hábitos do dia",
    title: "Hora dos hábitos",
    body: "Marque o que você já fez hoje e mantenha a sequência.",
    url: "/habits",
  },
  tasks: {
    label: "Tarefas",
    sub: "Lembra de ver o que falta fazer hoje",
    title: "Suas tarefas de hoje",
    body: "Dê uma olhada no que ficou para hoje.",
    url: "/tasks",
  },
  academy: {
    label: "Academia",
    sub: "Lembra do seu treino",
    title: "Hora do treino",
    body: "Seu treino está esperando por você.",
    url: "/academy",
  },
};

export const REMINDER_KINDS = Object.keys(REMINDER_INFO) as ReminderKind[];

const DEFAULTS: ReminderPrefs = {
  habits: { on: false, hour: 8, minute: 0 },
  tasks: { on: false, hour: 9, minute: 0 },
  academy: { on: false, hour: 18, minute: 0 },
};

const KEY = "ascend-reminders-v1";
const CHANNEL = "lembretes";
const idOf = (kind: ReminderKind) => `lembrete-${kind}`;

const supported = Platform.OS === "android" || Platform.OS === "ios";

// Carrega o módulo nativo só no celular (no web ele não existe).
function native(): typeof import("expo-notifications") | null {
  if (!supported) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-notifications") as typeof import("expo-notifications");
}

export const remindersSupported = () => supported;

export function loadReminderPrefs(): ReminderPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<ReminderPrefs> | null;
    const merged = { ...DEFAULTS };
    for (const kind of REMINDER_KINDS) {
      const saved = raw?.[kind];
      if (saved && typeof saved.hour === "number" && typeof saved.minute === "number") {
        merged[kind] = { on: !!saved.on, hour: clamp(saved.hour, 0, 23), minute: clamp(saved.minute, 0, 59) };
      }
    }
    return merged;
  } catch {
    return { ...DEFAULTS };
  }
}

function saveReminderPrefs(prefs: ReminderPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // sem armazenamento: os lembretes continuam valendo nesta sessão
  }
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

export const formatTime = (hour: number, minute: number) =>
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

/** Chamar uma vez ao abrir o app: define como a notificação aparece com o app aberto. */
export function setupReminders() {
  const Notifications = native();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });
  void Notifications.setNotificationChannelAsync(CHANNEL, {
    name: "Lembretes",
    description: "Lembretes diários silenciosos de hábitos, tarefas e treino.",
    // LOW: aparece na bandeja, sem som e sem aparecer por cima de outros apps.
    importance: Notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: null,
    enableVibrate: false,
    showBadge: false,
  });
}

/** Pede a permissão de notificação ao sistema. Devolve se foi liberada. */
export async function askReminderPermission(): Promise<boolean> {
  const Notifications = native();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

async function schedule(kind: ReminderKind, setting: ReminderSetting) {
  const Notifications = native();
  if (!Notifications) return;
  const info = REMINDER_INFO[kind];
  await Notifications.cancelScheduledNotificationAsync(idOf(kind)).catch(() => undefined);
  if (!setting.on) return;
  await Notifications.scheduleNotificationAsync({
    identifier: idOf(kind),
    content: {
      title: info.title,
      body: info.body,
      sound: false,
      data: { url: info.url },
      // iOS: entrega "passiva", só na central de notificações, sem acender a tela.
      interruptionLevel: "passive",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: setting.hour,
      minute: setting.minute,
      channelId: CHANNEL,
    },
  });
}

/** Salva uma mudança (liga/desliga ou horário) e reagenda aquele lembrete. */
export async function updateReminder(kind: ReminderKind, change: Partial<ReminderSetting>): Promise<ReminderPrefs> {
  const prefs = loadReminderPrefs();
  prefs[kind] = { ...prefs[kind], ...change };
  saveReminderPrefs(prefs);
  await schedule(kind, prefs[kind]);
  return prefs;
}

/** Reagenda tudo a partir do que está salvo (ao abrir o app, caso o sistema tenha limpado). */
export async function syncReminders() {
  if (!supported) return;
  const prefs = loadReminderPrefs();
  await Promise.all(REMINDER_KINDS.map(kind => schedule(kind, prefs[kind])));
}

// Aviso no horário de cada tarefa que tem horário (notificação única, também silenciosa).
const ALERTS_KEY = "ascend-task-alerts-v1";
const TASK_PREFIX = "tarefa-";
const MAX_TASK_ALERTS = 40; // o iOS aceita no máximo 64 agendadas; sobra espaço para os diários

export function taskAlertsOn(): boolean {
  try {
    return localStorage.getItem(ALERTS_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setTaskAlerts(on: boolean) {
  try {
    localStorage.setItem(ALERTS_KEY, on ? "1" : "0");
  } catch {
    // ignora
  }
}

/** Deixa agendado só o que precisa: tarefas pendentes, com horário, daqui para frente. */
export async function syncTaskReminders(tasks: { id: string; title: string; date: string; time?: string; completed: boolean }[]) {
  const Notifications = native();
  if (!Notifications) return;
  const now = Date.now();
  const wanted = new Map<string, { title: string; time: string; at: Date }>();
  if (taskAlertsOn()) {
    tasks
      .filter(task => !task.completed && task.time && /^\d{2}:\d{2}$/.test(task.time) && /^\d{4}-\d{2}-\d{2}$/.test(task.date))
      .map(task => {
        const [y, mo, d] = task.date.split("-").map(Number);
        const [h, mi] = (task.time as string).split(":").map(Number);
        return { task, at: new Date(y, mo - 1, d, h, mi) };
      })
      .filter(item => item.at.getTime() > now)
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .slice(0, MAX_TASK_ALERTS)
      .forEach(({ task, at }) => wanted.set(`${TASK_PREFIX}${task.id}-${task.date}-${task.time}`, { title: task.title, time: task.time as string, at }));
  }
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const have = new Set<string>();
  for (const item of scheduled) {
    if (!item.identifier.startsWith(TASK_PREFIX)) continue;
    if (wanted.has(item.identifier)) have.add(item.identifier);
    else await Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => undefined);
  }
  for (const [identifier, info] of wanted) {
    if (have.has(identifier)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: info.title, body: `Está na hora, ${info.time}.`, sound: false, data: { url: "/tasks" }, interruptionLevel: "passive" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: info.at, channelId: CHANNEL },
    }).catch(() => undefined);
  }
}

/** Ao sair da conta ou apagá-la: some com todos os lembretes deste aparelho. */
export async function clearReminders() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignora
  }
  const Notifications = native();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}

/** Toque na notificação abre a tela certa. Devolve a função que remove o ouvinte. */
export function onReminderTap(open: (url: string) => void): () => void {
  const Notifications = native();
  if (!Notifications) return () => undefined;
  const go = (response: import("expo-notifications").NotificationResponse | null | undefined) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === "string") {
      open(url);
      Notifications.clearLastNotificationResponse();
    }
  };
  go(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(go);
  return () => subscription.remove();
}
