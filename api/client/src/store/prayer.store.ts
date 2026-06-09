import { FavoritePrayer, PrayerConversation, PrayerMessage } from "./types";
import { _data, notify, persistState } from "./state";
import { generateId } from "./utils";

export function createPrayerConversation(title: string): PrayerConversation {
  const conversation: PrayerConversation = {
    id: generateId(),
    title,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  _data.prayerConversations.push(conversation);
  persistState();
  notify();
  return conversation;
}

export function getPrayerConversations(): PrayerConversation[] {
  return _data.prayerConversations;
}

export function getPrayerConversation(id: string): PrayerConversation | undefined {
  return _data.prayerConversations.find(item => item.id === id);
}

export function addPrayerMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string
): PrayerMessage | null {
  const conversation = _data.prayerConversations.find(item => item.id === conversationId);
  if (!conversation) return null;

  const message: PrayerMessage = {
    id: generateId(),
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  conversation.messages.push(message);
  conversation.updatedAt = new Date().toISOString();

  if (role === "user" && conversation.messages.filter(message => message.role === "user").length === 1) {
    conversation.title = content.substring(0, 50) + (content.length > 50 ? "..." : "");
  }

  persistState();
  notify();
  return message;
}

export function deletePrayerConversation(id: string): void {
  _data.prayerConversations = _data.prayerConversations.filter(item => item.id !== id);
  persistState();
  notify();
}

export function addFavoritePrayer(content: string, timestamp: string): FavoritePrayer {
  const favorite: FavoritePrayer = {
    id: generateId(),
    content,
    timestamp,
    addedAt: new Date().toISOString(),
  };

  _data.favoritePrayers.push(favorite);
  persistState();
  notify();
  return favorite;
}

export function getFavoritePrayers(): FavoritePrayer[] {
  return _data.favoritePrayers;
}

export function removeFavoritePrayer(id: string): void {
  _data.favoritePrayers = _data.favoritePrayers.filter(item => item.id !== id);
  persistState();
  notify();
}

export function isFavoritePrayer(content: string): boolean {
  return _data.favoritePrayers.some(item => item.content === content);
}
