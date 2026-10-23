import { supabase } from "./supabase";

// Mesmo fluxo de handleDeleteAccount em pages/Settings.tsx: a função
// "delete-account" do Supabase confere a senha antes de apagar a conta.
export async function deleteAccount(password: string): Promise<{ error?: string }> {
  const { error } = await supabase.functions.invoke("delete-account", {
    body: { password: password.trim() },
  });

  if (error) {
    let message = "Erro ao excluir conta. Tente novamente.";
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error === "Re-authentication failed; account not deleted") {
        message = "Senha incorreta. A conta não foi excluída.";
      }
    } catch {
      // resposta sem JSON
    }
    return { error: message };
  }

  for (const key of ["flowzone_data", "ascend_app_state", "ascend_schema_version"]) {
    localStorage.removeItem(key);
  }
  await supabase.auth.signOut();
  return {};
}
