-- ============================================================
-- FIX (Médio #5 + #6): harden internal trigger functions.
--
-- 1. Revoke EXECUTE on handle_new_user() and
--    notify_cancellation_webhook() from anon and authenticated.
--    Triggers fire the function internally and do not need an
--    EXECUTE grant for the caller's role.
-- 2. Pin search_path = public, pg_catalog on the three functions
--    flagged by the advisor linter so they cannot be tricked by
--    schema search-path mutation.
-- 3. Move the pg_net extension out of the public schema into a
--    dedicated extensions schema (defense in depth).
-- ============================================================

-- 1. Revoke direct execution from client roles.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_cancellation_webhook() FROM PUBLIC;

-- Default grants give PUBLIC EXECUTE on functions in the public
-- schema; revoke the default so future internal functions are not
-- callable by client roles.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 2. Pin search_path on the linter-flagged functions.
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
ALTER FUNCTION public.notify_cancellation_webhook() SET search_path = public, pg_catalog;

-- 3. Relocate pg_net to an extensions schema (idempotent).
-- pg_net does not support SET SCHEMA, so it is reinstalled in the
-- dedicated extensions schema after dropping the public one.
-- WARNING: net.http_* objects are recreated; no app code references
-- public.net directly (used only by Supabase internals).
DO $$
DECLARE
  v_ext_schema name;
BEGIN
  SELECT extnamespace::regnamespace::text INTO v_ext_schema
    FROM pg_extension WHERE extname = 'pg_net';
  IF v_ext_schema IS NOT NULL AND v_ext_schema <> 'extensions' THEN
    DROP EXTENSION pg_net CASCADE;
    CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
  ELSIF v_ext_schema IS NULL THEN
    CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
  END IF;
END $$;
-- Make extensions searchable by default for all roles.
ALTER ROLE postgres SET search_path TO public, extensions, pg_catalog;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
