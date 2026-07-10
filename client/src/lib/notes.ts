import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { NoteDatabaseRow } from "@/lib/database/types";

export async function getNotes() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("notes", "Failed to load notes", error);
    return [];
  }

  return data as NoteDatabaseRow[];
}

export async function createNote(payload: Omit<NoteDatabaseRow, "id" | "user_id" | "created_at" | "updated_at">) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("notes")
    .insert({
      ...payload,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    logger.error("notes", "Failed to create note", error);
    throw error;
  }

  return data as NoteDatabaseRow;
}

export async function updateNote(id: string, payload: Partial<Omit<NoteDatabaseRow, "id" | "user_id" | "created_at" | "updated_at">>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("notes")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    logger.error("notes", "Failed to update note", error);
    throw error;
  }

  return data as NoteDatabaseRow;
}

export async function deleteNote(id: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("notes", "Failed to delete note", error);
    throw error;
  }
}
