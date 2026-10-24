import { ProGate } from "@/components/ProGate";
import { Screen } from "@/components/ui";
import { EvolutionContent } from "@/components/EvolutionContent";

// Porta de pages/Evolution.tsx (também aparece como aba dentro da Academia).
export default function EvolutionScreen() {
  return (
    <ProGate section="evolution">
      <Screen title="Evolução" subtitle="Carga e volume ao longo do tempo">
        <EvolutionContent />
      </Screen>
    </ProGate>
  );
}
