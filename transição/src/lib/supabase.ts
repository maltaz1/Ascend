// Instala um localStorage síncrono (SQLite) — o store e a sessão do Supabase dependem dele.
import "expo-sqlite/localStorage/install";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { logger } from "./logger";

// Importado direto (e não de @/demo) para não criar ciclo com o store.
const IS_DEMO = process.env.EXPO_PUBLIC_DEMO === "1";

// No Expo só variáveis EXPO_PUBLIC_ lidas com ponto são embutidas no app.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? (IS_DEMO ? "https://demo.supabase.co" : undefined);
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? (IS_DEMO ? "demo" : undefined);

if (!supabaseUrl) throw new Error("EXPO_PUBLIC_SUPABASE_URL não configurada");
if (!supabaseAnonKey) throw new Error("EXPO_PUBLIC_SUPABASE_ANON_KEY não configurada");

// No modo demo nenhuma requisição sai do aparelho (ver src/demo.ts).
const demoFetch: typeof fetch = async () =>
  new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: IS_DEMO ? { fetch: demoFetch } : undefined,
  auth: {
    storage: localStorage,
    persistSession: true,
    // Não há URL para ler a sessão no Android/iOS.
    detectSessionInUrl: false,
    autoRefreshToken: true,
  },
});

// Só renova o token enquanto o app está em primeiro plano.
AppState.addEventListener("change", state => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

if (__DEV__) {
  logger.info("supabase", "Supabase client initialized");
}
