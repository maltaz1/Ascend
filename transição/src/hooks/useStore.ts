import { useEffect, useState } from "react";
import { getData, subscribe, type AppData } from "@/lib/store";

// Mesmo hook do web (client/src/hooks/useStore.ts), sem a animação de XP via DOM.
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
