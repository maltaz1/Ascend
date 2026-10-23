import { supabase } from "@/lib/supabase";
import { _data, notify, persistState } from "./state";

export async function addXP(amount: number): Promise<void> {
  _data.user.xp += amount;

  while (_data.user.xp >= _data.user.level * 100) {
    _data.user.xp -= _data.user.level * 100;
    _data.user.level += 1;
  }

  persistState();
  notify();
  void syncUserProfile();
}

export async function syncUserProfile(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("profiles")
    .update({
      xp: _data.user.xp,
      level: _data.user.level,
      streak: _data.user.streak,
    })
    .eq("id", user.id);

  if (error) {
    console.error("Erro ao sincronizar perfil:", error);
  }
}
