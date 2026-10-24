import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  addFavoritePrayer,
  generatePrayerResponse,
  loadFavoritePrayers,
  PRAYER_SUGGESTIONS,
  removeFavoritePrayer,
  type FavoritePrayer,
} from "@/lib/prayer";
import { generateId } from "@/store/utils";
import { notifyInfo, notifySuccess } from "@/lib/notifications";
import { IS_DEMO } from "@/demo";
import { ProGate } from "@/components/ProGate";
import { Card, EmptyState, IconButton, Input, Screen, Segmented, Txt } from "@/components/ui";
import { useTheme } from "@/theme";

type Message = { id: string; role: "user" | "assistant"; content: string };

export default function PrayerScreen() {
  return (
    <ProGate section="prayer">
      <Prayer />
    </ProGate>
  );
}

// Porta de pages/Prayer.tsx.
function Prayer() {
  const theme = useTheme();
  const [view, setView] = useState<"chat" | "favorites">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [favorites, setFavorites] = useState<FavoritePrayer[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!IS_DEMO) void loadFavoritePrayers().then(setFavorites);
  }, []);

  const send = async (text: string = input) => {
    if (!text.trim()) return;
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { id: generateId(), role: "user", content: text }]);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setMessages(prev => [...prev, { id: generateId(), role: "assistant", content: generatePrayerResponse(text) }]);
    setLoading(false);
  };

  const toggleFavorite = async (content: string) => {
    const existing = favorites.find(f => f.content === content);
    if (existing) {
      await removeFavoritePrayer(existing.id);
      setFavorites(prev => prev.filter(f => f.id !== existing.id));
      notifyInfo("Removido dos favoritos");
    } else {
      const added = await addFavoritePrayer(content);
      if (added) setFavorites(prev => [added, ...prev]);
      notifySuccess("Adicionado aos favoritos");
    }
  };

  return (
    <Screen
      title="Oração"
      subtitle="Um espaço para reflexão"
      right={
        messages.length > 0 && view === "chat" ? (
          <IconButton icon="refresh" label="Limpar conversa" onPress={() => setMessages([])} />
        ) : undefined
      }
    >
      <Segmented
        options={[
          { value: "chat", label: "Conversa" },
          { value: "favorites", label: `Favoritas (${favorites.length})` },
        ]}
        value={view}
        onChange={setView}
      />

      {view === "favorites" ? (
        favorites.length === 0 ? (
          <Card>
            <EmptyState icon="heart-outline" text="Toque no coração de uma oração para guardá-la aqui." />
          </Card>
        ) : (
          favorites.map(f => (
            <Card key={f.id}>
              <Txt style={{ lineHeight: 22 }}>{f.content}</Txt>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Txt variant="caption" muted>
                  {new Date(f.added_at).toLocaleDateString("pt-BR")}
                </Txt>
                <Pressable onPress={() => void toggleFavorite(f.content)} hitSlop={8}>
                  <Ionicons name="heart" size={20} color={theme.pink} />
                </Pressable>
              </View>
            </Card>
          ))
        )
      ) : (
        <>
          {messages.length === 0 && (
            <>
              <Txt muted>Escolha uma intenção ou escreva a sua:</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {PRAYER_SUGGESTIONS.map(s => (
                  <Card key={s.title} onPress={() => void send(s.prompt)} style={{ width: "47%", gap: 4, padding: 12 }}>
                    <Txt style={{ fontSize: 22 }}>{s.emoji}</Txt>
                    <Txt variant="h3">{s.title}</Txt>
                  </Card>
                ))}
              </View>
            </>
          )}

          {messages.map(m => (
            <View key={m.id} style={{ alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
              <View
                style={{
                  maxWidth: "88%",
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: m.role === "user" ? theme.primary : theme.surface,
                  borderWidth: m.role === "user" ? 0 : 1,
                  borderColor: theme.border,
                  gap: 8,
                }}
              >
                <Txt color={m.role === "user" ? "#fff" : theme.ink} style={{ lineHeight: 22 }}>
                  {m.content}
                </Txt>
                {m.role === "assistant" && (
                  <Pressable onPress={() => void toggleFavorite(m.content)} hitSlop={8} style={{ alignSelf: "flex-end" }}>
                    <Ionicons
                      name={favorites.some(f => f.content === m.content) ? "heart" : "heart-outline"}
                      size={20}
                      color={theme.pink}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          ))}
          {loading && <ActivityIndicator color={theme.primary} />}

          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Input value={input} onChangeText={setInput} placeholder="Escreva sua intenção..." onSubmitEditing={() => void send()} returnKeyType="send" />
            </View>
            <IconButton icon="send" label="Enviar" onPress={() => void send()} filled />
          </View>
        </>
      )}
    </Screen>
  );
}
