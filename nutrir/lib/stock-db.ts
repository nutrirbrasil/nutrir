import { getSupabaseAdmin } from "./supabase-server";
import type { StockSize } from "./stock-catalog";

export interface StockRow {
  item_id: string;
  size: StockSize;
  quantity: number;
}

/** Estoque de marmitas/sucos/bebidas prontos pra retirada/entrega imediata. Só retorna o que está cadastrado; itens sem linha aqui contam como 0 (agendado apenas). */
export async function listStock(): Promise<StockRow[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db.from("nutrir_stock").select("item_id, size, quantity");
  if (error) {
    console.error("[Supabase] listStock:", error.message);
    return [];
  }

  return (data ?? []) as StockRow[];
}

export async function setStockQuantity(
  itemId: string,
  size: StockSize,
  quantity: number
): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "Banco de dados não configurado." };

  const { error } = await db
    .from("nutrir_stock")
    .upsert({ item_id: itemId, size, quantity }, { onConflict: "item_id,size" });

  if (error) {
    console.error("[Supabase] setStockQuantity:", error.message);
    return { ok: false, error: "Não foi possível salvar o estoque." };
  }

  return { ok: true };
}

/**
 * Decrementa o estoque de uma lista de itens de forma atômica por linha (a
 * função no banco só decrementa se tiver saldo suficiente). Se algum item da
 * lista não tiver saldo, desfaz (reincrementa) os já decrementados antes de
 * retornar o erro — evita vender a mesma unidade duas vezes em pedidos
 * concorrentes sem precisar de uma transação multi-statement do client.
 */
export async function decrementStockForOrder(
  lines: { itemId: string; size: StockSize; quantity: number }[]
): Promise<{ ok: boolean; outOfStockItemId?: string; outOfStockSize?: StockSize }> {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false };

  const decremented: typeof lines = [];

  for (const line of lines) {
    const { data, error } = await db.rpc("nutrir_decrement_stock", {
      p_item_id: line.itemId,
      p_size: line.size,
      p_qty: line.quantity,
    });

    if (error || !data) {
      // Desfaz o que já foi decrementado nesse pedido antes de reportar o erro.
      for (const done of decremented) {
        await db.rpc("nutrir_increment_stock", {
          p_item_id: done.itemId,
          p_size: done.size,
          p_qty: done.quantity,
        });
      }
      return { ok: false, outOfStockItemId: line.itemId, outOfStockSize: line.size };
    }

    decremented.push(line);
  }

  return { ok: true };
}

/** Desfaz um decrementStockForOrder (ex.: pagamento online falhou depois de já ter reservado o estoque). */
export async function restockOrderItems(
  lines: { itemId: string; size: StockSize; quantity: number }[]
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;

  for (const line of lines) {
    await db.rpc("nutrir_increment_stock", {
      p_item_id: line.itemId,
      p_size: line.size,
      p_qty: line.quantity,
    });
  }
}
