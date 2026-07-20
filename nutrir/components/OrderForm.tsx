"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/api";
import { formatPhoneBR, phoneValidationMessage } from "@/lib/br-fields";
import { useCart } from "@/lib/cart-context";
import { useCheckout } from "@/lib/checkout-context";
import { useProfile } from "@/lib/profile-context";
import { PickupScheduler } from "@/components/PickupScheduler";
import { DeliveryScheduler } from "@/components/DeliveryScheduler";
import { DeliveryAddressForm, type DeliveryAddressValue } from "@/components/DeliveryAddressForm";
import { formatItemAddonsLabel } from "@/lib/item-addons-label";
import {
  analyzeCartItems,
  formatPickupShort,
  formatPickupSummary,
  type MixedPickupMode,
  type PickupSelection,
} from "@/lib/pickup-schedule";
import {
  formatDeliveryShort,
  formatDeliverySummary,
  isDeliveryDateEligible,
  type DeliverySelection,
} from "@/lib/delivery-schedule";
import { composeDeliveryAddressPreview, getDeliveryFeeCents, isBairroDeliverable } from "@/lib/delivery-fees";
import { getItemCashTotalCents } from "@/lib/order-pricing";
import { resolvePickupAddress } from "@/lib/store-info";
import type { FulfillmentType } from "@/lib/types";

const EMPTY_DELIVERY_ADDRESS: DeliveryAddressValue = {
  municipio: "",
  bairroId: "",
  street: "",
  number: "",
  complement: "",
  reference: "",
};

export function OrderForm() {
  const router = useRouter();
  const cart = useCart();
  const { profile } = useProfile();
  const { setDraft } = useCheckout();

  const items = cart.items;
  const [error, setError] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>("pickup");
  const [mixedMode, setMixedMode] = useState<MixedPickupMode | null>(null);
  const [pickupUnified, setPickupUnified] = useState<PickupSelection | null>(null);
  const [pickupCombo, setPickupCombo] = useState<PickupSelection | null>(null);
  const [pickupRegular, setPickupRegular] = useState<PickupSelection | null>(null);
  const [deliverySelection, setDeliverySelection] = useState<DeliverySelection | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddressValue>(EMPTY_DELIVERY_ADDRESS);

  const cartAnalysis = useMemo(() => analyzeCartItems(items), [items]);

  const [form, setForm] = useState({
    customer_name: profile.name,
    customer_phone: profile.phone,
    customer_email: profile.email,
    notes: "",
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      customer_name: profile.name || f.customer_name,
      customer_phone: profile.phone || f.customer_phone,
      customer_email: profile.email || f.customer_email,
    }));
  }, [profile]);

  useEffect(() => {
    if (!cartAnalysis.isMixed) {
      setMixedMode(null);
    }
  }, [cartAnalysis.isMixed]);

  const pickupRule = useMemo(() => {
    if (cartAnalysis.isMixed && mixedMode === "separate") return null;
    if (cartAnalysis.isMixed && mixedMode === "together") return "combo" as const;
    if (cartAnalysis.hasCombo && !cartAnalysis.hasRegular) return "combo" as const;
    return "regular" as const;
  }, [cartAnalysis, mixedMode]);

  const total = items.reduce((sum, i) => sum + getItemCashTotalCents(i) * i.quantity, 0);

  function buildPickupDisplay(): string {
    if (fulfillmentType === "delivery") {
      return deliverySelection ? formatDeliveryShort(deliverySelection) : "";
    }

    if (cartAnalysis.isMixed && mixedMode === "separate") {
      const parts: string[] = [];
      if (pickupCombo) parts.push(`Combo: ${formatPickupShort(pickupCombo)}`);
      if (pickupRegular) parts.push(`Marmitas: ${formatPickupShort(pickupRegular)}`);
      return parts.join(" · ");
    }

    if (pickupUnified) return formatPickupShort(pickupUnified);
    return "";
  }

  function buildInternalNotes(): string | undefined {
    const parts: string[] = [];

    if (fulfillmentType === "delivery") {
      if (deliverySelection) parts.push(formatDeliverySummary(deliverySelection));
      if (form.notes) parts.push(form.notes);
      parts.push("Entrega");
      return parts.filter(Boolean).join(" · ") || undefined;
    }

    if (cartAnalysis.isMixed && mixedMode === "separate") {
      if (pickupCombo) parts.push(`Combo: ${formatPickupSummary(pickupCombo)}`);
      if (pickupRegular) parts.push(`Marmitas: ${formatPickupSummary(pickupRegular)}`);
    } else if (pickupUnified) {
      parts.push(formatPickupSummary(pickupUnified));
    }

    if (form.notes) parts.push(form.notes);
    parts.push("Retirada na loja");

    return parts.filter(Boolean).join(" · ") || undefined;
  }

  function getPrimaryDeliveryDate(): string {
    if (fulfillmentType === "delivery") {
      return deliverySelection?.date ?? "";
    }

    if (cartAnalysis.isMixed && mixedMode === "separate") {
      return pickupCombo?.date ?? pickupRegular?.date ?? "";
    }
    return pickupUnified?.date ?? "";
  }

  function validatePickup(): string | null {
    if (fulfillmentType === "delivery") {
      if (!deliverySelection?.date || !isDeliveryDateEligible(deliverySelection.date)) {
        return "Selecione um domingo válido para entrega.";
      }
      if (!deliveryAddress.bairroId || !isBairroDeliverable(deliveryAddress.bairroId)) {
        return "Selecione um bairro dentro da área de entrega.";
      }
      if (!deliveryAddress.street.trim() || !deliveryAddress.number.trim()) {
        return "Informe o endereço de entrega (rua e número).";
      }
      return null;
    }

    if (cartAnalysis.isMixed && !mixedMode) {
      return "Escolha se deseja retirar tudo junto ou em dias separados.";
    }

    if (cartAnalysis.isMixed && mixedMode === "separate") {
      if (!pickupCombo?.date || !pickupCombo.slot) {
        return "Selecione data e horário para retirada do combo.";
      }
      if (!pickupRegular?.date || !pickupRegular.slot) {
        return "Selecione data e horário para retirada das marmitas.";
      }
      return null;
    }

    if (!pickupUnified?.date || !pickupUnified.slot) {
      return "Selecione a data e o horário de retirada.";
    }
    return null;
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      setError("Adicione pelo menos um item ao pedido.");
      return;
    }

    const pickupError = validatePickup();
    if (pickupError) {
      setError(pickupError);
      return;
    }

    const phoneErr = phoneValidationMessage(form.customer_phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    const phone = formatPhoneBR(form.customer_phone);
    const isDelivery = fulfillmentType === "delivery";

    setDraft({
      items: [...items],
      customer_name: form.customer_name.trim(),
      customer_phone: phone,
      customer_email: form.customer_email?.trim() || undefined,
      customer_cpf: profile.cpf || undefined,
      delivery_address: isDelivery
        ? composeDeliveryAddressPreview(
            deliveryAddress.bairroId,
            deliveryAddress.street.trim(),
            deliveryAddress.number.trim(),
            deliveryAddress.complement,
            deliveryAddress.reference
          )
        : resolvePickupAddress(),
      delivery_date: getPrimaryDeliveryDate(),
      pickup_display: buildPickupDisplay(),
      user_notes: form.notes.trim() || undefined,
      internal_notes: buildInternalNotes(),
      mixed_mode: mixedMode,
      pickup_unified: pickupUnified,
      pickup_combo: pickupCombo,
      pickup_regular: pickupRegular,
      fulfillment_type: fulfillmentType,
      delivery_selection: isDelivery ? deliverySelection : null,
      delivery_street: isDelivery ? deliveryAddress.street.trim() : undefined,
      delivery_number: isDelivery ? deliveryAddress.number.trim() : undefined,
      delivery_complement: isDelivery ? deliveryAddress.complement.trim() || undefined : undefined,
      delivery_reference: isDelivery ? deliveryAddress.reference.trim() || undefined : undefined,
      delivery_bairro_id: isDelivery ? deliveryAddress.bairroId : undefined,
      delivery_fee_cents: isDelivery ? getDeliveryFeeCents(deliveryAddress.bairroId) ?? 0 : 0,
    });

    router.push("/checkout/pagamento");
  }

  return (
    <form onSubmit={handleContinue} className="space-y-6">
      {items.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-nutrir-emerald">Itens do pedido</h3>
          <ul className="mt-3 space-y-2">
            {items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="flex items-center justify-between text-sm">
                <span className="mr-2 flex-1">
                  {item.name}
                  <span className="mt-0.5 block text-xs text-nutrir-emerald/55">
                    {formatItemAddonsLabel(item)}
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => cart.updateQty(i, -1)} className="btn-secondary px-2 py-1">
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => cart.updateQty(i, 1)} className="btn-secondary px-2 py-1">
                    +
                  </button>
                  <span className="ml-2 font-medium">
                    {formatPrice(getItemCashTotalCents(item) * item.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t pt-3 text-right font-bold">Total: {formatPrice(total)}</p>
        </div>
      )}

      <div className="card space-y-3">
        <p className="text-sm font-medium text-nutrir-emerald">Como você quer receber o pedido?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setFulfillmentType("pickup")}
            className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
              fulfillmentType === "pickup"
                ? "border-nutrir-emerald bg-nutrir-emerald/10 text-nutrir-emerald"
                : "border-nutrir-burgundy/30 bg-nutrir-nude text-nutrir-emerald hover:border-nutrir-burgundy"
            }`}
          >
            Retirar na loja
          </button>
          <button
            type="button"
            onClick={() => setFulfillmentType("delivery")}
            className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
              fulfillmentType === "delivery"
                ? "border-nutrir-emerald bg-nutrir-emerald/10 text-nutrir-emerald"
                : "border-nutrir-burgundy/30 bg-nutrir-nude text-nutrir-emerald hover:border-nutrir-burgundy"
            }`}
          >
            Receber em casa
          </button>
        </div>
      </div>

      {fulfillmentType === "delivery" ? (
        <div className="card space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-nutrir-emerald">
              Agende sua entrega
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-nutrir-emerald/60">
              Pedidos para entrega devem ser feito até sexta-feira, se perder a data você pode
              optar pela retirada no local.
            </p>
          </div>

          <DeliveryScheduler value={deliverySelection} onChange={setDeliverySelection} />

          <DeliveryAddressForm
            value={deliveryAddress}
            onChange={(patch) => setDeliveryAddress((prev) => ({ ...prev, ...patch }))}
          />
        </div>
      ) : (
        <div className="card space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-nutrir-emerald">
              Agende sua retirada
            </h2>
            {cartAnalysis.hasCombo && !cartAnalysis.hasRegular && (
              <p className="mt-2 text-xs leading-relaxed text-nutrir-emerald/60">
                Retirada apenas Segunda ou Sexta
                <br />
                Pedidos devem ser feitos com mínimo de 48h de antecedência (2 dias).
              </p>
            )}
            {!cartAnalysis.hasCombo && cartAnalysis.hasRegular && (
              <p className="mt-2 text-xs leading-relaxed text-nutrir-emerald/60">
                Retirada de Segunda a Sexta.
                <br />
                Pedidos para o dia seguinte só serão entregues no período da tarde e devem ser
                realizados até as 19h.
              </p>
            )}
          </div>

          {cartAnalysis.isMixed && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-nutrir-emerald">
                Você tem combo e marmitas avulsas. Como prefere retirar?
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setMixedMode("together");
                    setPickupCombo(null);
                    setPickupRegular(null);
                    setPickupUnified(null);
                  }}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                    mixedMode === "together"
                      ? "border-nutrir-emerald bg-nutrir-emerald/10 text-nutrir-emerald"
                      : "border-nutrir-burgundy/30 bg-nutrir-nude text-nutrir-emerald hover:border-nutrir-burgundy"
                  }`}
                >
                  Tudo junto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMixedMode("separate");
                    setPickupUnified(null);
                    setPickupCombo(null);
                    setPickupRegular(null);
                  }}
                  className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                    mixedMode === "separate"
                      ? "border-nutrir-emerald bg-nutrir-emerald/10 text-nutrir-emerald"
                      : "border-nutrir-burgundy/30 bg-nutrir-nude text-nutrir-emerald hover:border-nutrir-burgundy"
                  }`}
                >
                  Separado
                </button>
              </div>
            </div>
          )}

          {cartAnalysis.isMixed && mixedMode === "separate" && (
            <>
              <PickupScheduler
                rule="combo"
                title="Retirada do combo"
                value={pickupCombo}
                onChange={setPickupCombo}
              />
              <PickupScheduler
                rule="regular"
                title="Retirada das marmitas"
                value={pickupRegular}
                onChange={setPickupRegular}
              />
            </>
          )}

          {pickupRule && (
            <PickupScheduler rule={pickupRule} value={pickupUnified} onChange={setPickupUnified} />
          )}
        </div>
      )}

      <div className="card grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Nome</label>
          <input
            required
            className="input-field"
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Telefone / WhatsApp</label>
          <input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={15}
            className="input-field"
            value={form.customer_phone}
            onChange={(e) => setForm({ ...form, customer_phone: formatPhoneBR(e.target.value) })}
            placeholder="(47) 99999-9999"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">E-mail (opcional)</label>
          <input
            type="email"
            className="input-field"
            value={form.customer_email}
            onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Observações</label>
          <textarea
            className="input-field min-h-[80px]"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Alergias, preferências, etc."
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary w-full md:w-auto">
        Continuar
      </button>
    </form>
  );
}
