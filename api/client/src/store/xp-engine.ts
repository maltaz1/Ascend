import { store } from "./store";
import { eventBus } from "./event-bus";
import { logger } from "@/lib/logger";

export type XpEvent = {
  type: string;
  baseXp: number;
  comboMultiplier?: number;
  streakBonus?: number;
  reward?: number;
};

const BASE_MULTIPLIER = 1.0;
const STREAK_BONUS_STEP = 0.05;

function computeXp(event: XpEvent): number {
  const combo = 1 + (event.comboMultiplier ?? BASE_MULTIPLIER) - 1;
  const streak = event.streakBonus ?? 0;
  const rawXp = event.baseXp * (1 + combo + streak);
  const total = Math.max(1, Math.round(rawXp + (event.reward ?? 0)));
  logger.debug("xp", "Computed XP", { event, total });
  return total;
}

export async function awardXp(event: XpEvent): Promise<number> {
  const xpGain = computeXp(event);
  store.update(state => {
    state.user.xp += xpGain;
    while (state.user.xp >= state.user.level * 100) {
      state.user.xp -= state.user.level * 100;
      state.user.level += 1;
      eventBus.emit("LEVEL_UP", { level: state.user.level, xp: state.user.xp });
    }
  });

  eventBus.emit("XP_AWARDED", { amount: xpGain, type: event.type });
  logger.info("xp", "Awarded XP", { xpGain, type: event.type });
  return xpGain;
}

export function createXpPayload(type: string, baseXp: number): XpEvent {
  const streak = store.getState().user.streak;
  return {
    type,
    baseXp,
    comboMultiplier: Math.min(3, Math.floor(streak / 7) * 0.25 + 1),
    streakBonus: Math.min(0.5, streak * STREAK_BONUS_STEP),
  };
}
