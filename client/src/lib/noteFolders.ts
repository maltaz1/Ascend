import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { NoteFolderDatabaseRow } from "@/lib/database/types";

export async function getFolders(): Promise<NoteFolderDatabaseRow[]> {
  try {
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
      throw error;
    }

    return data as NoteFolderDatabaseRow[];
  } catch (error) {
    logger.error("noteFolders", "Error in getFolders", error);
    throw error;
  }
}

export async function createFolder(payload: Omit<NoteFolderDatabaseRow, "id" | "user_id" | "created_at">): Promise<NoteFolderDatabaseRow | null> {
  try {
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
  } catch (error) {
    logger.error("noteFolders", "Error in createFolder", error);
    throw error;
  }
}

export async function deleteFolder(id: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated.");

    const { error } = await supabase
      .from("note_folders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      logger.error("noteFolders", "Failed to delete note folder", error);
      throw error;
    }
  } catch (error) {
    logger.error("noteFolders", "Error in deleteFolder", error);
    throw error;
  }
}
