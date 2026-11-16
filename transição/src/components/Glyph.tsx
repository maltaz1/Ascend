import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { Txt } from "@/components/ui";
import { useTheme } from "@/theme";

// O app é branco e roxo: os emojis (coloridos) viram ícones de uma cor só.
// O texto salvo continua sendo o emoji (compatível com o site); só a exibição muda.
const MAP: Record<string, string> = {
  "💧": "water", "🧘": "body", "📚": "book", "💪": "barbell", "🔥": "flame", "🏃": "walk", "🎯": "locate", "🥗": "nutrition",
  "😴": "moon", "✍️": "create", "🎵": "musical-notes", "🧹": "sparkles", "💊": "medkit", "🌿": "leaf", "🧠": "bulb", "🙏": "hand-left",
  "🍳": "cafe", "🍽️": "restaurant", "🌙": "moon", "🍎": "nutrition", "🍔": "fast-food", "🚌": "bus", "🚗": "car", "🏠": "home",
  "🎮": "game-controller", "🛍️": "bag-handle", "🎓": "school", "🧾": "receipt", "💰": "cash", "💻": "laptop", "📈": "trending-up",
  "🧩": "extension-puzzle", "💼": "briefcase", "✈": "airplane", "✈️": "airplane", "🎨": "color-palette", "📷": "camera",
  "👤": "person", "💡": "bulb", "📁": "folder", "📌": "pin", "🏥": "medkit", "🎁": "gift", "☮": "heart", "☮️": "heart",
  "💚": "heart", "🧭": "compass", "🕊": "leaf", "🕊️": "leaf", "🩺": "pulse", "🎈": "balloon", "✅": "checkmark-circle", "⚡": "flash",
  "👑": "ribbon", "🏆": "trophy", "🌟": "star", "💎": "diamond", "🚀": "rocket", "⭐": "star", "📉": "trending-down", "🌱": "leaf",
  "❌": "close-circle",
};

// Ícone no lugar do emoji. Sem equivalente, usa a primeira letra ou um brilho.
export function Glyph({ emoji, size = 18, color, fallback }: { emoji?: string | null; size?: number; color?: string; fallback?: string }) {
  const theme = useTheme();
  const c = color ?? theme.primaryInk;
  const key = (emoji ?? "").trim();
  const name = MAP[key] ?? MAP[key.replace(/️/g, "")];
  if (name) return <Ionicons name={name as never} size={size} color={c} />;
  if (!key && fallback) {
    return (
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Txt style={{ fontSize: size, color: c }}>{fallback}</Txt>
      </View>
    );
  }
  return <Ionicons name={"sparkles" as never} size={size} color={c} />;
}

// Tira emojis de um texto ("💼 Trabalho" vira "Trabalho").
export function stripEmoji(text: string): string {
  return text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "").replace(/\s{2,}/g, " ").trim();
}
