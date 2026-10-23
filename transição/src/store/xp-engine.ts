// No web este módulo somava XP numa segunda store (store/store.ts) que nenhuma
// tela lia. No app ele usa a mesma store das telas (state.ts via addXP).
import { _data } from "./state";
import { addXP } from "./xp-system";
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
  const levelBefore = _data.user.level;
  await addXP(xpGain);
  if (_data.user.level > levelBefore) {
    eventBus.emit("LEVEL_UP", { level: _data.user.level, xp: _data.user.xp });
  }

  eventBus.emit("XP_AWARDED", { amount: xpGain, type: event.type });
  logger.info("xp", "Awarded XP", { xpGain, type: event.type });
  return xpGain;
}

export function createXpPayload(type: string, baseXp: number): XpEvent {
  const streak = _data.user.streak;
  return {
    type,
    baseXp,
    comboMultiplier: Math.min(3, Math.floor(streak / 7) * 0.25 + 1),
    streakBonus: Math.min(0.5, streak * STREAK_BONUS_STEP),
  };
}
