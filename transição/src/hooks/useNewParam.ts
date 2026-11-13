import { useEffect, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";

// O botão "+" da barra abre a tela com ?novo=1; a tela chama `open` uma vez e limpa o parâmetro.
export function useNewParam(open: () => void) {
  const { novo } = useLocalSearchParams<{ novo?: string }>();
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    if (!novo) return;
    openRef.current();
    router.setParams({ novo: undefined });
  }, [novo]);
}
