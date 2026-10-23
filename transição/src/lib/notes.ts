import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { NoteDatabaseRow } from "@/lib/database/types";

export async function getNotes(): Promise<NoteDatabaseRow[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    // Verificar se o usuário é Pro
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (!profile?.is_pro) {
      logger.warn("notes", "User is not Pro, cannot access notes");
      return [];
    }

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("notes", "Failed to load notes", error);
      throw error; // Lançar o erro para ser tratado na UI
    }

    return data as NoteDatabaseRow[];
  } catch (error) {
    logger.error("notes", "Error in getNotes", error);
    throw error;
  }
}

export async function createNote(payload: Omit<NoteDatabaseRow, "id" | "user_id" | "created_at" | "updated_at">): Promise<NoteDatabaseRow | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Verificar se o usuário é Pro
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (!profile?.is_pro) {
      throw new Error("Only Pro users can create notes");
    }

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
  } catch (error) {
    logger.error("notes", "Error in createNote", error);
    throw error;
  }
}

export async function updateNote(id: string, payload: Partial<Omit<NoteDatabaseRow, "id" | "user_id" | "created_at" | "updated_at">>): Promise<NoteDatabaseRow | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Verificar se o usuário é Pro
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (!profile?.is_pro) {
      throw new Error("Only Pro users can update notes");
    }

    const { data, error } = await supabase
      .from("notes")
      .update({
        ...payload,
        updated_at: new Date().toISOString(), // Garante que updated_at seja sempre atualizado
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
  } catch (error) {
    logger.error("notes", "Error in updateNote", error);
    throw error;
  }
}

export async function deleteNote(id: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated.");

    // Verificar se o usuário é Pro
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (!profile?.is_pro) {
      throw new Error("Only Pro users can delete notes");
    }

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      logger.error("notes", "Failed to delete note", error);
      throw error;
    }
  } catch (error) {
    logger.error("notes", "Error in deleteNote", error);
    throw error;
  }
}
