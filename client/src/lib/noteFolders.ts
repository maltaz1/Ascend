import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { NoteFolderDatabaseRow } from "@/lib/database/types";

export async function getFolders() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("note_folders")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    logger.error("noteFolders", "Failed to load note folders", error);
    return [];
  }

  return data as NoteFolderDatabaseRow[];
}

export async function createFolder(payload: Omit<NoteFolderDatabaseRow, "id" | "user_id" | "created_at">) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("note_folders")
    .insert({
      ...payload,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    logger.error("noteFolders", "Failed to create note folder", error);
    throw error;
  }

  return data as NoteFolderDatabaseRow;
}

export async function deleteFolder(id: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("note_folders")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logger.error("noteFolders", "Failed to delete note folder", error);
    throw error;
  }
}
