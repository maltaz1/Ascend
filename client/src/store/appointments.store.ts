import { supabase } from "@/lib/supabase";
import { Appointment, AppointmentFormData } from "./calendar.types";
import { generateId } from "./utils";

/**
 * Adiciona um novo compromisso
 */
export async function addAppointment(
  formData: AppointmentFormData
): Promise<Appointment | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const newAppointment: Appointment = {
      id: generateId(),
      userId: user.id,
      title: formData.title,
      description: formData.description,
      startTime: formData.startTime,
      endTime: formData.endTime,
      date: formData.date,
      category: formData.category,
      color: formData.color,
      createdAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          start_time: formData.startTime,
          end_time: formData.endTime,
          date: formData.date,
          category: formData.category,
          color: formData.color,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      throw error ?? new Error("Falha ao criar compromisso");
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      description: data.description,
      startTime: data.start_time,
      endTime: data.end_time,
      date: data.date,
      category: data.category,
      color: data.color,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error("Erro ao criar compromisso:", error);
    return null;
  }
}

/**
 * Atualiza um compromisso existente
 */
export async function updateAppointment(
  id: string,
  updates: Partial<AppointmentFormData>
): Promise<void> {
  try {
    const updateData: Record<string, unknown> = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
    if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.color !== undefined) updateData.color = updates.color;

    if (Object.keys(updateData).length === 0) return;

    const { error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Erro ao atualizar compromisso:", error);
  }
}

/**
 * Deleta um compromisso
 */
export async function deleteAppointment(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Erro ao deletar compromisso:", error);
  }
}

/**
 * Carrega todos os compromissos do usuário
 */
export async function loadAppointments(): Promise<Appointment[]> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((apt) => ({
      id: apt.id,
      userId: apt.user_id,
      title: apt.title,
      description: apt.description,
      startTime: apt.start_time,
      endTime: apt.end_time,
      date: apt.date,
      category: apt.category,
      color: apt.color,
      createdAt: apt.created_at,
    }));
  } catch (error) {
    console.error("Erro ao carregar compromissos:", error);
    return [];
  }
}

/**
 * Retorna compromissos de um dia específico
 */
export function getAppointmentsForDate(
  appointments: Appointment[],
  date: string
): Appointment[] {
  return appointments.filter((apt) => apt.date === date);
}
