"use client";

import { useState } from "react";
import { DeliveryAddressForm, type DeliveryAddressValue } from "@/components/DeliveryAddressForm";

const EMPTY_VALUE: DeliveryAddressValue = {
  municipio: "",
  bairroId: "",
  street: "",
  number: "",
  complement: "",
  reference: "",
};

export interface SavedAddressFormValue extends DeliveryAddressValue {
  label: string;
}

interface Props {
  initial?: Partial<SavedAddressFormValue>;
  saving?: boolean;
  error?: string;
  submitLabel?: string;
  onSubmit: (value: SavedAddressFormValue) => void;
  onCancel: () => void;
}

export function SavedAddressForm({
  initial,
  saving,
  error,
  submitLabel = "Salvar endereço",
  onSubmit,
  onCancel,
}: Props) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [address, setAddress] = useState<DeliveryAddressValue>({ ...EMPTY_VALUE, ...initial });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...address, label: label.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Título</label>
        <input
          required
          maxLength={30}
          className="input-field"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Casa, Trabalho..."
        />
      </div>
      <DeliveryAddressForm
        value={address}
        onChange={(patch) => setAddress((prev) => ({ ...prev, ...patch }))}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? "Salvando..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancelar
        </button>
      </div>
    </form>
  );
}
