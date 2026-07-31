import { getSupabaseAdmin } from "./supabase-server";
import { MAX_SAVED_ADDRESSES, type CustomerAddress, type CustomerAddressInput } from "./types";

const ADDRESS_COLUMNS =
  "id, customer_id, label, municipio, bairro_id, street, number, complement, reference, is_default, created_at";

export async function listCustomerAddresses(customerId: string): Promise<CustomerAddress[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];

  const { data, error } = await db
    .from("nutrir_customer_addresses")
    .select(ADDRESS_COLUMNS)
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Supabase] listCustomerAddresses:", error.message);
    return [];
  }

  return (data ?? []) as CustomerAddress[];
}

async function unsetDefaultAddresses(customerId: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;

  await db
    .from("nutrir_customer_addresses")
    .update({ is_default: false })
    .eq("customer_id", customerId)
    .eq("is_default", true);
}

export async function createCustomerAddress(
  customerId: string,
  input: CustomerAddressInput
): Promise<{ address: CustomerAddress | null; error?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { address: null, error: "Supabase indisponível." };

  const existing = await listCustomerAddresses(customerId);
  if (existing.length >= MAX_SAVED_ADDRESSES) {
    return {
      address: null,
      error: `Limite de ${MAX_SAVED_ADDRESSES} endereços salvos atingido.`,
    };
  }

  const isFirst = existing.length === 0;
  const makeDefault = isFirst || !!input.set_default;

  if (makeDefault && !isFirst) {
    await unsetDefaultAddresses(customerId);
  }

  const { data, error } = await db
    .from("nutrir_customer_addresses")
    .insert({
      customer_id: customerId,
      label: input.label.trim(),
      municipio: input.municipio,
      bairro_id: input.bairro_id,
      street: input.street.trim(),
      number: input.number.trim(),
      complement: input.complement?.trim() || null,
      reference: input.reference?.trim() || null,
      is_default: makeDefault,
    })
    .select(ADDRESS_COLUMNS)
    .single();

  if (error) {
    console.error("[Supabase] createCustomerAddress:", error.message);
    return { address: null, error: "Não foi possível salvar o endereço." };
  }

  return { address: data as CustomerAddress };
}

/** `id` sempre escopado por `customerId` — quem chama garante que veio de um e-mail verificado. */
export async function updateCustomerAddress(
  id: string,
  customerId: string,
  patch: Partial<CustomerAddressInput>
): Promise<{ address: CustomerAddress | null; error?: string }> {
  const db = getSupabaseAdmin();
  if (!db) return { address: null, error: "Supabase indisponível." };

  if (patch.set_default) {
    await unsetDefaultAddresses(customerId);
  }

  const update: Record<string, unknown> = {};
  if (patch.label !== undefined) update.label = patch.label.trim();
  if (patch.municipio !== undefined) update.municipio = patch.municipio;
  if (patch.bairro_id !== undefined) update.bairro_id = patch.bairro_id;
  if (patch.street !== undefined) update.street = patch.street.trim();
  if (patch.number !== undefined) update.number = patch.number.trim();
  if (patch.complement !== undefined) update.complement = patch.complement.trim() || null;
  if (patch.reference !== undefined) update.reference = patch.reference.trim() || null;
  if (patch.set_default) update.is_default = true;

  const { data, error } = await db
    .from("nutrir_customer_addresses")
    .update(update)
    .eq("id", id)
    .eq("customer_id", customerId)
    .select(ADDRESS_COLUMNS)
    .maybeSingle();

  if (error) {
    console.error("[Supabase] updateCustomerAddress:", error.message);
    return { address: null, error: "Não foi possível atualizar o endereço." };
  }

  if (!data) {
    return { address: null, error: "Endereço não encontrado." };
  }

  return { address: data as CustomerAddress };
}

/** Se o endereço removido era o padrão, promove o mais antigo restante (se houver). */
export async function deleteCustomerAddress(id: string, customerId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (!db) return false;

  const { data: deleted, error } = await db
    .from("nutrir_customer_addresses")
    .delete()
    .eq("id", id)
    .eq("customer_id", customerId)
    .select("id, is_default")
    .maybeSingle();

  if (error) {
    console.error("[Supabase] deleteCustomerAddress:", error.message);
    return false;
  }

  if (!deleted) return false;

  if (deleted.is_default) {
    const remaining = await listCustomerAddresses(customerId);
    const next = remaining[0];
    if (next) {
      await db.from("nutrir_customer_addresses").update({ is_default: true }).eq("id", next.id);
    }
  }

  return true;
}
