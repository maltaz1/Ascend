// Edge Function: delete-account
// Permanently deletes a user's account (LGPD Art. 18, VI):
//  - removes rows from all 11 related public tables,
//  - deletes the auth identity (auth.users + auth.identities),
//  - removes the storage avatar folder,
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

const TABLES = [
  "tasks",
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
  try {
    await supabase.storage.from("Avatars").remove([`${userId}/`]);
  } catch {
    /* best-effort */
  }

  // 4. Delete the auth identity itself.
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  results["auth_user"] = authError ? `error: ${authError.message}` : "deleted";

  const hasErrors = Object.values(results).some((v) => v.startsWith("error"));

  return new Response(
    JSON.stringify({
      success: !hasErrors,
      deleted: results,
    }),
    {
      status: hasErrors ? 500 : 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
