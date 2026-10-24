import { useRef, type ComponentRef } from "react";
import type { ScrollView } from "react-native";

// Rola uma lista horizontal até uma posição na primeira vez que ela aparece.
// (contentOffset só funciona no iOS; isto vale para Android e web também.)
export function useInitialScroll(x: number) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const done = useRef(false);
  const onContentSizeChange = () => {
    if (done.current || x <= 0) return;
    done.current = true;
    ref.current?.scrollTo({ x, animated: false });
  };
  return [ref, onContentSizeChange] as const;
}
