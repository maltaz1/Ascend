import { useState, useEffect, useCallback } from 'react';
import { getData, subscribe, AppData } from '@/lib/store';

export function useStore(): AppData {
  const [data, setData] = useState<AppData>(() => getData());

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setData({ ...getData() });
    });
    return unsubscribe;
  }, []);

  return data;
}

export function useXPAnimation() {
  const showXP = useCallback((amount: number, x: number, y: number) => {
    const el = document.createElement('div');
    el.className = 'xp-float';
    el.textContent = `+${amount} XP`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }, []);

  return { showXP };
}
