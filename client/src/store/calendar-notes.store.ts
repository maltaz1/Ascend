import { supabase } from "@/lib/supabase";
import { CalendarNote, CalendarNoteFormData } from "./calendar.types";
import { generateId } from "./utils";

/**
 * Adiciona uma nova anotação ao calendário
 */
export async function addCalendarNote(
  formData: CalendarNoteFormData
): Promise<CalendarNote | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const { data, error } = await supabase
      .from("calendar_notes")
      .insert([
        {
          user_id: user.id,
          content: formData.content,
          date: formData.date,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      throw error ?? new Error("Falha ao criar anotação");
    }

    return {
      id: data.id,
      userId: data.user_id,
      content: data.content,
      date: data.date,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error("Erro ao criar anotação:", error);
    return null;
  }
}

/**
 * Atualiza uma anotação existente
 */
export async function updateCalendarNote(
  id: string,
  updates: Partial<CalendarNoteFormData>
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {};

    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.date !== undefined) updateData.date = updates.date;

    if (Object.keys(updateData).length === 0) return;

    const { error } = await supabase
      .from("calendar_notes")
      .update(updateData)
      .eq("id", id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Erro ao atualizar anotação:", error);
  }
}

/**
 * Deleta uma anotação
 */
export async function deleteCalendarNote(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("calendar_notes")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Erro ao deletar anotação:", error);
  }
}

/**
 * Carrega todas as anotações do usuário
 */
export async function loadCalendarNotes(): Promise<CalendarNote[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("calendar_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((note) => ({
      id: note.id,
      userId: note.user_id,
      content: note.content,
      date: note.date,
      createdAt: note.created_at,
    }));
  } catch (error) {
    console.error("Erro ao carregar anotações:", error);
    return [];
  }
}

/**
 * Retorna a anotação de um dia específico
 */
export function getCalendarNoteForDate(
  notes: CalendarNote[],
  date: string
): CalendarNote | undefined {
  return notes.find((note) => note.date === date);
}
