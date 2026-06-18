import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_KEY?.trim()
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_KEY!.trim(),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return client;
}
