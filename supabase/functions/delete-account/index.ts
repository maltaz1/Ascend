// Edge Function: delete-account
// Permanently deletes a user's account (LGPD Art. 18, VI):
//  - removes rows from every public table with user_id,
//  - deletes the auth identity (auth.users + auth.identities),
//  - removes the avatar files (new folder + legacy paths),
//  - signs the user out client-side afterwards.
//
// Requires a valid session: the caller can only delete THEIR own
// account (verified server-side against the JWT sub claim).
// An optional "password" in the body triggers re-authentication
// before deletion (recommended UI flow), preventing accidental or
// hijacked-session deletions.

import { createClient } from "npm:@supabase/supabase-js@2";

interface DeleteRequest {
  password?: string;
}

// Ordem importa: tasks e cancellation_requests não têm ON DELETE CASCADE
// para auth.users, então precisam sair antes do deleteUser().
const TABLES = [
  "tasks",
  "cancellation_requests",
  "appointments",
  "calendar_notes",
  "exercise_catalog",
  "favorite_prayers",
  "finances",
  "prayer_conversations",
  "goals",
  "habits",
  "workouts",
  "workout_sessions",
  "meals",
  "hydration_logs",
  "diet_settings",
  "financial_transactions",
  "notes",
  "note_folders",
];

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing bearer token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verify the JWT and identify the caller (service role client has
  // getUser() available for token introspection).
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = user.id;
  const body = (await req.json().catch(() => ({}))) as DeleteRequest;

  // Optional re-authentication with password before deletion.
  if (body.password) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: body.password,
    });
    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Re-authentication failed; account not deleted" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  const results: Record<string, string> = {};

  // 1. Delete rows from all related tables (idempotent; errors logged).
  for (const table of TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    results[table] = error ? `error: ${error.message}` : "deleted";
  }

  // 2. Delete the profile row (PK is id, not user_id).
  const { error: profileError } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);
  results["profiles"] = profileError ? `error: ${profileError.message}` : "deleted";

  // 3. Remove avatar files (best-effort).
  //    Novos: pasta "<userId>/". Antigos: "Avatars/<userId>-<timestamp>.<ext>".
  try {
    const bucket = supabase.storage.from("Avatars");
    const paths: string[] = [];
    const { data: own } = await bucket.list(userId, { limit: 1000 });
    for (const f of own ?? []) paths.push(`${userId}/${f.name}`);
    const { data: legacy } = await bucket.list("Avatars", { limit: 1000, search: userId });
    for (const f of legacy ?? []) {
      if (f.name.startsWith(`${userId}-`)) paths.push(`Avatars/${f.name}`);
    }
    if (paths.length) {
      const { error } = await bucket.remove(paths);
      results["avatars"] = error ? `failed: ${error.message}` : `deleted ${paths.length}`;
    }
  } catch {
    /* best-effort */
  }

  // 4. Delete the auth identity itself.
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  results["auth_user"] = authError ? `error: ${authError.message}` : "deleted";

  const hasErrors = Object.values(results).some((v) => v.startsWith("error"));
  if (hasErrors) {
    // Detalhes só no log do servidor; o cliente recebe resposta genérica.
    console.error("[delete-account] falha parcial", userId, results);
  }

  return new Response(
    JSON.stringify(hasErrors ? { success: false, error: "deletion_failed" } : { success: true }),
    {
      status: hasErrors ? 500 : 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
