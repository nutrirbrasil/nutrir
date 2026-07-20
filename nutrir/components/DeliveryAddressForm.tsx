"use client";

import { listDeliveryOptionsByMunicipio, type MunicipioId } from "@/lib/delivery-fees";

export interface DeliveryAddressValue {
  municipio: MunicipioId | "";
  bairroId: string;
  street: string;
  number: string;
  complement: string;
  reference: string;
}

interface Props {
  value: DeliveryAddressValue;
  onChange: (patch: Partial<DeliveryAddressValue>) => void;
}

export function DeliveryAddressForm({ value, onChange }: Props) {
  const municipios = listDeliveryOptionsByMunicipio();
  const selectedMunicipio = municipios.find((m) => m.municipio === value.municipio);
  const availableBairros = selectedMunicipio?.bairros.filter((b) => b.available) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Cidade</label>
          <select
            required
            className="input-field"
            value={value.municipio}
            onChange={(e) =>
              onChange({ municipio: e.target.value as MunicipioId, bairroId: "" })
            }
          >
            <option value="" disabled>
              Selecione
            </option>
            {municipios.map((m) => (
              <option key={m.municipio} value={m.municipio}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Bairro</label>
          <select
            required
            className="input-field"
            disabled={!selectedMunicipio}
            value={value.bairroId}
            onChange={(e) => onChange({ bairroId: e.target.value })}
          >
            <option value="" disabled>
              {selectedMunicipio ? "Selecione" : "Escolha a cidade primeiro"}
            </option>
            {availableBairros.map((b) => (
              <option key={b.bairroId} value={b.bairroId}>
                {b.bairro}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div>
          <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Rua</label>
          <input
            required
            className="input-field"
            value={value.street}
            onChange={(e) => onChange({ street: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Número</label>
          <input
            required
            className="input-field"
            value={value.number}
            onChange={(e) => onChange({ number: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-nutrir-emerald">
            Complemento (opcional)
          </label>
          <input
            className="input-field"
            value={value.complement}
            onChange={(e) => onChange({ complement: e.target.value })}
            placeholder="Apto, bloco..."
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-nutrir-emerald">
            Ponto de referência (opcional)
          </label>
          <input
            className="input-field"
            value={value.reference}
            onChange={(e) => onChange({ reference: e.target.value })}
            placeholder="Perto de..."
          />
        </div>
      </div>
    </div>
  );
}
