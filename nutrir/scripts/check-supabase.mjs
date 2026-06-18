#!/usr/bin/env node
/** Verifica conexão e tabelas Nutrir no Supabase. Uso: node scripts/check-supabase.mjs */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const path = new URL("../.env.local", import.meta.url);
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
  );
}

const env = loadEnv();
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error("Faltam SUPABASE_URL e SUPABASE_SERVICE_KEY em nutrir/.env.local");
  process.exit(1);
}

console.log("Projeto:", url);

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: authErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
console.log("Credenciais:", authErr ? `ERRO — ${authErr.message}` : "OK");

for (const table of ["nutrir_customers", "nutrir_orders"]) {
  const { error } = await db.from(table).select("id").limit(1);
  console.log(`Tabela ${table}:`, error ? `FALTA — ${error.message}` : "OK");
}

const { count } = await db.from("nutrir_customers").select("*", { count: "exact", head: true });
console.log("Clientes cadastrados:", count ?? 0);
