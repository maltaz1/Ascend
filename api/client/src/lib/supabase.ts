import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`${key} não configurada`);
  }
  return value;
};

const supabaseUrl = getEnvVar("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnvVar("VITE_SUPABASE_ANON_KEY");

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  },
});

if (import.meta.env.DEV) {
  logger.info("supabase", "Supabase client initialized");
}
