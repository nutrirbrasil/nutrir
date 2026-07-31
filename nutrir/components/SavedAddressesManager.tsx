"use client";

import { useState } from "react";
import { useCustomerAddresses } from "@/lib/use-customer-addresses";
import { SavedAddressForm, type SavedAddressFormValue } from "@/components/SavedAddressForm";
import { composeDeliveryAddressPreview, type MunicipioId } from "@/lib/delivery-fees";
import { MAX_SAVED_ADDRESSES, type CustomerAddress } from "@/lib/types";

function addressSummary(address: CustomerAddress): string {
  return composeDeliveryAddressPreview(
    address.bairro_id,
    address.street,
    address.number,
    address.complement ?? undefined,
    address.reference ?? undefined
  );
}

export function SavedAddressesManager() {
  const { addresses, loading, createAddress, updateAddress, deleteAddress } = useCustomerAddresses();
  const [formMode, setFormMode] = useState<"none" | "add" | string>("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editingAddress =
    formMode !== "none" && formMode !== "add" ? addresses.find((a) => a.id === formMode) : undefined;

  function closeForm() {
    setFormMode("none");
    setError("");
  }

  async function handleSubmit(value: SavedAddressFormValue) {
    setSaving(true);
    setError("");
    try {
      const payload = {
        label: value.label,
        municipio: value.municipio,
        bairro_id: value.bairroId,
        street: value.street,
        number: value.number,
        complement: value.complement,
        reference: value.reference,
      };
      if (editingAddress) {
        await updateAddress(editingAddress.id, payload);
      } else {
        await createAddress(payload);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o endereço.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    setError("");
    try {
      await updateAddress(id, { set_default: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o endereço padrão.");
    }
  }

  async function handleDelete(id: string) {
    setError("");
    try {
      await deleteAddress(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível remover o endereço.");
    }
  }

  return (
    <section className="card mt-6 space-y-4">
      <h2 className="font-display text-lg font-bold text-nutrir-emerald">Endereços de entrega</h2>

      {loading && addresses.length === 0 && (
        <p className="text-sm text-nutrir-emerald/60">Carregando...</p>
      )}

      {addresses.length > 0 && (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-xl border-2 border-nutrir-burgundy/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-nutrir-emerald">{address.label}</span>
                {address.is_default && (
                  <span className="rounded-full bg-nutrir-emerald/10 px-2 py-0.5 text-xs font-bold text-nutrir-emerald">
                    Padrão
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-nutrir-emerald/70">{addressSummary(address)}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold">
                {!address.is_default && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(address.id)}
                    className="text-nutrir-emerald"
                  >
                    Tornar padrão
                  </button>
                )}
                <button type="button" onClick={() => setFormMode(address.id)} className="text-nutrir-emerald">
                  Editar
                </button>
                <button type="button" onClick={() => handleDelete(address.id)} className="text-nutrir-burgundy">
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && addresses.length === 0 && formMode === "none" && (
        <p className="text-sm text-nutrir-emerald/60">
          Nenhum endereço salvo ainda. Adicione até {MAX_SAVED_ADDRESSES} para agilizar suas
          próximas entregas.
        </p>
      )}

      {formMode === "none" && addresses.length < MAX_SAVED_ADDRESSES && (
        <button type="button" onClick={() => setFormMode("add")} className="btn-secondary w-full">
          + Adicionar endereço
        </button>
      )}

      {(formMode === "add" || editingAddress) && (
        <SavedAddressForm
          submitLabel={editingAddress ? "Salvar alterações" : "Salvar endereço"}
          saving={saving}
          error={error}
          initial={
            editingAddress
              ? {
                  label: editingAddress.label,
                  municipio: editingAddress.municipio as MunicipioId,
                  bairroId: editingAddress.bairro_id,
                  street: editingAddress.street,
                  number: editingAddress.number,
                  complement: editingAddress.complement ?? "",
                  reference: editingAddress.reference ?? "",
                }
              : undefined
          }
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}
    </section>
  );
}
