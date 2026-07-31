"use client";

import { useEffect, useState } from "react";
import { DeliveryAddressForm, type DeliveryAddressValue } from "@/components/DeliveryAddressForm";
import { useCustomerAddresses } from "@/lib/use-customer-addresses";
import { composeDeliveryAddressPreview } from "@/lib/delivery-fees";
import { MAX_SAVED_ADDRESSES, type CustomerAddress } from "@/lib/types";

interface Props {
  value: DeliveryAddressValue;
  onChange: (patch: Partial<DeliveryAddressValue>) => void;
}

function toFormValue(address: CustomerAddress): DeliveryAddressValue {
  return {
    municipio: address.municipio as DeliveryAddressValue["municipio"],
    bairroId: address.bairro_id,
    street: address.street,
    number: address.number,
    complement: address.complement ?? "",
    reference: address.reference ?? "",
  };
}

function addressSummary(address: CustomerAddress): string {
  return composeDeliveryAddressPreview(
    address.bairro_id,
    address.street,
    address.number,
    address.complement ?? undefined,
    address.reference ?? undefined
  );
}

/**
 * Endereço de entrega do checkout. Puxa o endereço padrão salvo automaticamente
 * (se houver), com opção de trocar por outro salvo ou preencher um novo (e
 * opcionalmente salvá-lo). Mantém a mesma interface de valor/onChange de
 * DeliveryAddressForm, então o formulário de pedido não sabe se está usando
 * um endereço salvo ou digitado na hora.
 */
export function DeliveryAddressPicker({ value, onChange }: Props) {
  const { addresses, loading, createAddress } = useCustomerAddresses();
  const [mode, setMode] = useState<"summary" | "picker" | "form">("form");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [saveNew, setSaveNew] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [preFormValue, setPreFormValue] = useState<DeliveryAddressValue | null>(null);
  const [preFormSelectedId, setPreFormSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (initialized || loading) return;
    setInitialized(true);

    if (value.bairroId && value.street.trim() && value.number.trim()) {
      const match = addresses.find(
        (a) =>
          a.bairro_id === value.bairroId && a.street === value.street && a.number === value.number
      );
      setSelectedId(match?.id ?? null);
      setMode("summary");
      return;
    }

    const defaultAddress = addresses.find((a) => a.is_default);
    if (defaultAddress) {
      setSelectedId(defaultAddress.id);
      onChange(toFormValue(defaultAddress));
      setMode("summary");
    } else {
      setMode("form");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, addresses, initialized]);

  const selectedAddress = addresses.find((a) => a.id === selectedId) ?? null;

  function handlePick(address: CustomerAddress) {
    setSelectedId(address.id);
    onChange(toFormValue(address));
    setMode("summary");
  }

  function startNewAddress() {
    setPreFormValue({ ...value });
    setPreFormSelectedId(selectedId);
    setSelectedId(null);
    setNewLabel("");
    setFormError("");
    setSaveNew(addresses.length < MAX_SAVED_ADDRESSES);
    setMode("form");
  }

  function handleCancelForm() {
    setFormError("");
    if (preFormValue) {
      onChange(preFormValue);
      setSelectedId(preFormSelectedId);
      setMode("summary");
    } else {
      setMode(addresses.length > 1 ? "picker" : "summary");
    }
  }

  async function handleUseAddress() {
    if (!value.bairroId || !value.street.trim() || !value.number.trim()) {
      setFormError("Preencha bairro, rua e número.");
      return;
    }

    if (saveNew && addresses.length < MAX_SAVED_ADDRESSES) {
      if (!newLabel.trim()) {
        setFormError("Dê um título para este endereço (ex: Casa, Trabalho) ou desmarque a opção de salvar.");
        return;
      }
      setSaving(true);
      setFormError("");
      try {
        const created = await createAddress({
          label: newLabel.trim(),
          municipio: value.municipio,
          bairro_id: value.bairroId,
          street: value.street,
          number: value.number,
          complement: value.complement,
          reference: value.reference,
        });
        setSelectedId(created?.id ?? null);
      } catch (err) {
        setFormError(
          err instanceof Error
            ? err.message
            : "Não foi possível salvar o endereço, mas ele será usado neste pedido."
        );
      } finally {
        setSaving(false);
      }
    } else {
      setSelectedId(null);
    }

    setMode("summary");
  }

  if (loading && !initialized) {
    return <p className="text-sm text-nutrir-emerald/60">Carregando endereços salvos...</p>;
  }

  if (mode === "summary") {
    const preview = composeDeliveryAddressPreview(
      value.bairroId,
      value.street,
      value.number,
      value.complement,
      value.reference
    );
    return (
      <div className="space-y-3 rounded-xl border-2 border-nutrir-burgundy/20 p-3">
        {selectedAddress && (
          <p className="text-sm font-bold text-nutrir-emerald">{selectedAddress.label}</p>
        )}
        <p className="text-sm text-nutrir-emerald/80">{preview}</p>
        <button
          type="button"
          onClick={() => (addresses.length > 1 ? setMode("picker") : startNewAddress())}
          className="text-sm font-bold text-nutrir-burgundy"
        >
          Não é esse endereço
        </button>
      </div>
    );
  }

  if (mode === "picker") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-nutrir-emerald">Escolha o endereço de entrega</p>
        <ul className="space-y-2">
          {addresses.map((address) => (
            <li key={address.id}>
              <button
                type="button"
                onClick={() => handlePick(address)}
                className={`w-full rounded-xl border-2 p-3 text-left text-sm transition ${
                  address.id === selectedId
                    ? "border-nutrir-emerald bg-nutrir-emerald/10"
                    : "border-nutrir-burgundy/20 hover:border-nutrir-burgundy"
                }`}
              >
                <span className="block font-bold text-nutrir-emerald">
                  {address.label}
                  {address.is_default ? " · Padrão" : ""}
                </span>
                <span className="block text-nutrir-emerald/70">{addressSummary(address)}</span>
              </button>
            </li>
          ))}
        </ul>
        {addresses.length < MAX_SAVED_ADDRESSES && (
          <button type="button" onClick={startNewAddress} className="btn-secondary w-full">
            + Adicionar novo endereço
          </button>
        )}
        <button type="button" onClick={() => setMode("summary")} className="text-sm font-bold text-nutrir-burgundy">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DeliveryAddressForm value={value} onChange={onChange} />

      <label className="flex items-center gap-2 text-sm text-nutrir-emerald">
        <input
          type="checkbox"
          checked={saveNew && addresses.length < MAX_SAVED_ADDRESSES}
          onChange={(e) => setSaveNew(e.target.checked)}
          disabled={addresses.length >= MAX_SAVED_ADDRESSES}
        />
        Salvar este endereço para próximas compras
      </label>

      {addresses.length >= MAX_SAVED_ADDRESSES ? (
        <p className="text-xs text-nutrir-emerald/60">
          Limite de {MAX_SAVED_ADDRESSES} endereços salvos atingido. Remova um no seu perfil para
          salvar este.
        </p>
      ) : (
        saveNew && (
          <div>
            <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Título</label>
            <input
              className="input-field"
              maxLength={30}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Casa, Trabalho..."
            />
          </div>
        )
      )}

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={handleUseAddress} disabled={saving} className="btn-primary flex-1">
          {saving ? "Salvando..." : "Usar este endereço"}
        </button>
        {preFormValue && (
          <button type="button" onClick={handleCancelForm} className="btn-secondary flex-1">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
