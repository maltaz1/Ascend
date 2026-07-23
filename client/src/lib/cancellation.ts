import { supabase } from "./supabase";

export interface CancellationRequest {
  id: string;
  user_id: string;
  email: string;
  status: 'pending' | 'processed';
  reason: string | null;
  created_at: string;
  processed_at: string | null;
}

export async function createCancellationRequest(reason: string): Promise<{ data: any; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: new Error("Usuário não autenticado") };
  }

  const { data, error } = await supabase
    .from("cancellation_requests")
    .insert({
      user_id: user.id,
      email: user.email,
      reason: reason || null,
      status: 'pending'
    })
    .select()
    .single();

  return { data, error };
}

export async function getPendingCancellationRequest(): Promise<CancellationRequest | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from("cancellation_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Erro ao buscar solicitação de cancelamento:", error);
    return null;
  }

  return data as CancellationRequest;
}

export async function cancelCancellationRequest(requestId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from("cancellation_requests")
    .delete()
    .eq("id", requestId)
    .eq("status", "pending");

  return { error };
}
