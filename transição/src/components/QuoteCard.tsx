import { Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Glass } from "@/components/Glass";
import { Landscape } from "@/components/Landscape";
import { Txt } from "@/components/ui";
import { fonts } from "@/theme";

const QUOTES = [
  "Pequenos passos todos os dias levam a grandes resultados.",
  "Disciplina é escolher o que você quer mais, não o que você quer agora.",
  "Você não precisa ser perfeito. Só precisa aparecer hoje.",
  "Quem constrói a rotina constrói o futuro.",
  "Um dia de cada vez, uma vitória de cada vez.",
  "O progresso de hoje é a facilidade de amanhã.",
  "Constância vence talento quando o talento não aparece.",
];

// Cartão com a paisagem e uma frase que muda a cada dia.
export function QuoteCard({ onPress }: { onPress?: () => void }) {
  const day = Math.floor(Date.now() / 86400000);
  return (
    <View style={{ height: 156, borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" }}>
      <Landscape art="panorama" dim={0.4} />
      <View style={{ flex: 1, padding: 16, justifyContent: "space-between" }}>
        <Txt
          style={{ fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 22, maxWidth: "62%", textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 10 }}
          color="#fff"
        >
          {QUOTES[day % QUOTES.length]}
        </Txt>
        {onPress ? (
          <Glass interactive style={{ width: 36, height: 36, borderRadius: 18, alignSelf: "flex-end" }}>
            <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Criar uma tarefa" style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="add" size={20} color="#fff" />
            </Pressable>
          </Glass>
        ) : null}
      </View>
    </View>
  );
}
