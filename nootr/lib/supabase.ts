import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falha cedo e com mensagem clara em vez de erros obscuros de rede depois.
  throw new Error(
    "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em nootr/.env.local"
  );
}

// Cliente de browser (auth via localStorage). Usado só para autenticação —
// os dados passam pelo backend FastAPI, que respeita o RLS com o token do usuário.
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
