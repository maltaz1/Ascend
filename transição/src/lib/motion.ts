import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Platform } from "react-native";

// Com "reduzir movimento" ligado, valores mudam direto, sem animação.
let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled().then(value => {
  reduceMotion = value;
});
AccessibilityInfo.addEventListener("reduceMotionChanged", value => {
  reduceMotion = value;
});

// Chave "Animações" das Configurações (como no web): desligada, tudo aparece sem animar.
let animationsOff = false;
export function setAnimationsEnabled(enabled: boolean) {
  animationsOff = !enabled;
}
export const animationsEnabled = () => !animationsOff;

export const prefersReducedMotion = () => reduceMotion || animationsOff;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// Leva uma lista de números até o alvo, sempre partindo do valor que está na tela
// (se o alvo mudar no meio, a animação continua dali, sem pulo). Na montagem sai do zero.
export function useTween(target: number[], duration = 700): number[] {
  const [value, setValue] = useState<number[]>(() => target.map(() => 0));
  const shown = useRef<number[]>(value);
  const key = target.join("|");

  useEffect(() => {
    const end = key ? key.split("|").map(Number) : [];
    const start = shown.current;
    const startedAt = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = prefersReducedMotion() ? 1 : Math.min(1, (now - startedAt) / duration);
      const eased = easeOutCubic(progress);
      const next = end.map((v, i) => (start[i] ?? 0) + (v - (start[i] ?? 0)) * eased);
      shown.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key, duration]);

  return value;
}

export function useTweenNumber(target: number, duration = 700): number {
  return useTween([target], duration)[0] ?? 0;
}

// "Pulo" curto quando algo é marcado (tarefa, hábito, dia da meta).
export function useCheckPop(checked: boolean): Animated.Value {
  const [scale] = useState(() => new Animated.Value(1));
  const previous = useRef(checked);

  useEffect(() => {
    const becameChecked = checked && !previous.current;
    previous.current = checked;
    if (!becameChecked || prefersReducedMotion()) return;
    scale.setValue(0.6);
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
      tension: 180,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [checked, scale]);

  return scale;
}
