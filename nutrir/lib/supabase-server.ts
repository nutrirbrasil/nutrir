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
      {
        auth: { persistSession: false, autoRefreshToken: false },
        // O supabase-js usa o fetch global por baixo dos panos, e o Next.js
        // intercepta esse fetch pra cachear a resposta independente da rota
        // ser "force-dynamic" — sem isso, updates via admin ficam presos no
        // cache até o próximo rebuild (rm -rf .next).
        global: {
          fetch: (input: RequestInfo | URL, init?: RequestInit) =>
            fetch(input, { ...init, cache: "no-store" }),
        },
      }
    );
  }
  return client;
}
