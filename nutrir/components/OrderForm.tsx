"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nutrirApi, formatPrice } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useProfile } from "@/lib/profile-context";
import { PickupScheduler } from "@/components/PickupScheduler";
import {
  analyzeCartItems,
  formatPickupShort,
  formatPickupSummary,
  type MixedPickupMode,
  type PickupSelection,
} from "@/lib/pickup-schedule";
import { saveOrderToHistory } from "@/lib/order-history";
import type { CreateOrderPayload, PaymentMethod } from "@/lib/types";

interface Props {
  mode?: "pickup" | "legacy";
  initialItems?: import("@/lib/types").OrderItem[];
}

export function OrderForm({ mode = "legacy", initialItems = [] }: Props) {
  const router = useRouter();
  const cart = useCart();
  const { profile } = useProfile();
  const useCartItems = mode === "pickup";

  const [items, setItems] = useState(useCartItems ? cart.items : initialItems);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [mixedMode, setMixedMode] = useState<MixedPickupMode | null>(null);
  const [pickupUnified, setPickupUnified] = useState<PickupSelection | null>(null);
  const [pickupCombo, setPickupCombo] = useState<PickupSelection | null>(null);
  const [pickupRegular, setPickupRegular] = useState<PickupSelection | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");

  const cartAnalysis = useMemo(() => analyzeCartItems(items), [items]);

  const [form, setForm] = useState({
    customer_name: profile.name,
    customer_phone: profile.phone,
    customer_email: profile.email,
    delivery_address: profile.address || "Retirada na loja — Nutrir Piçarras",
    delivery_date: "",
    notes: "",
  });

  useEffect(() => {
    if (useCartItems) setItems(cart.items);
  }, [useCartItems, cart.items]);

  useEffect(() => {
    if (initialItems.length > 0 && !useCartItems) setItems(initialItems);
  }, [initialItems, useCartItems]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      customer_name: profile.name || f.customer_name,
      customer_phone: profile.phone || f.customer_phone,
      customer_email: profile.email || f.customer_email,
      delivery_address: profile.address || f.delivery_address,
    }));
  }, [profile]);

  useEffect(() => {
    if (!cartAnalysis.isMixed) {
      setMixedMode(null);
    }
  }, [cartAnalysis.isMixed]);

  const pickupRule = useMemo(() => {
    if (!useCartItems) return "regular" as const;
    if (cartAnalysis.isMixed && mixedMode === "separate") return null;
    if (cartAnalysis.isMixed && mixedMode === "together") return "combo" as const;
    if (cartAnalysis.hasCombo && !cartAnalysis.hasRegular) return "combo" as const;
    return "regular" as const;
  }, [useCartItems, cartAnalysis, mixedMode]);

  const total = items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);

  function buildPickupDisplay(): string {
    if (mode !== "pickup") return form.delivery_date;

    if (cartAnalysis.isMixed && mixedMode === "separate") {
      const parts: string[] = [];
      if (pickupCombo) parts.push(`Combo: ${formatPickupShort(pickupCombo)}`);
      if (pickupRegular) parts.push(`Marmitas: ${formatPickupShort(pickupRegular)}`);
      return parts.join(" · ");
    }

    if (pickupUnified) return formatPickupShort(pickupUnified);
    return form.delivery_date;
  }

  function buildPickupNotes(): string | undefined {
    if (mode !== "pickup") return form.notes || undefined;

    const parts: string[] = [];

    if (cartAnalysis.isMixed && mixedMode === "separate") {
      if (pickupCombo) parts.push(`Combo: ${formatPickupSummary(pickupCombo)}`);
      if (pickupRegular) parts.push(`Marmitas: ${formatPickupSummary(pickupRegular)}`);
    } else if (pickupUnified) {
      parts.push(formatPickupSummary(pickupUnified));
    }

    if (form.notes) parts.push(form.notes);
    if (cart.coupon) parts.push(`Cupom: ${cart.coupon}`);
    parts.push("Retirada na loja");

    return parts.filter(Boolean).join(" · ") || undefined;
  }

  function buildUserNotes(): string | undefined {
    const parts: string[] = [];
    if (form.notes.trim()) parts.push(form.notes.trim());
    if (cart.coupon) parts.push(`Cupom: ${cart.coupon}`);
    return parts.length ? parts.join(" · ") : undefined;
  }

  function getPrimaryDeliveryDate(): string {
    if (cartAnalysis.isMixed && mixedMode === "separate") {
      return pickupCombo?.date ?? pickupRegular?.date ?? "";
    }
    return pickupUnified?.date ?? "";
  }

  function validatePickup(): string | null {
    if (mode !== "pickup") {
      if (!form.delivery_date) return "Selecione a data de retirada.";
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

  async function handleSubmit(e: React.FormEvent) {
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

    setLoading(true);
    setError("");
    try {
      const delivery_date = mode === "pickup" ? getPrimaryDeliveryDate() : form.delivery_date;
      const pickup_display = buildPickupDisplay();
      const userNotes = buildUserNotes();

      const payload: CreateOrderPayload = {
        ...form,
        delivery_date,
        pickup_display,
        payment_method: paymentMethod,
        user_notes: userNotes,
        notes: mode === "pickup" ? buildPickupNotes() : userNotes,
        items,
      };
      const { order } = await nutrirApi.createOrder(payload);
      saveOrderToHistory({
        id: order.id,
        customer_phone: order.customer_phone,
        customer_name: order.customer_name,
        created_at: order.created_at,
        items: order.items,
        total_cents: order.total_cents,
        payment_method: order.payment_method ?? paymentMethod,
        pickup_display: order.pickup_display ?? pickup_display,
        notes: userNotes,
      });
      setSuccess(true);
      if (useCartItems) cart.clearCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar pedido");
    } finally {
      setLoading(false);
    }
  }

  function updateQty(index: number, delta: number) {
    if (useCartItems) {
      cart.updateQty(index, delta);
      return;
    }
    setItems((prev) =>
      prev
        .map((item, i) =>
          i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  if (success) {
    return (
      <div className="card text-center">
        <p className="text-4xl">✅</p>
        <h2 className="mt-4 font-display text-xl font-bold text-nutrir-emerald">
          Retirada agendada!
        </h2>
        <p className="mt-2 text-nutrir-emerald/70">
          Recebemos seu pedido e você será contactado em breve para confirmar a retirada.
        </p>
        <button type="button" onClick={() => router.push("/")} className="btn-primary mt-6">
          Voltar ao cardápio
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {items.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-nutrir-emerald">Itens do pedido</h3>
          <ul className="mt-3 space-y-2">
            {items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="flex items-center justify-between text-sm">
                <span className="mr-2 flex-1">{item.name}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQty(i, -1)} className="btn-secondary px-2 py-1">
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(i, 1)} className="btn-secondary px-2 py-1">
                    +
                  </button>
                  <span className="ml-2 font-medium">{formatPrice(item.price_cents * item.quantity)}</span>
                </div>
              </li>
            ))}
          </ul>
          {cart.coupon && (
            <p className="mt-2 text-xs text-nutrir-emerald/60">Cupom: {cart.coupon}</p>
          )}
          <p className="mt-4 border-t pt-3 text-right font-bold">Total: {formatPrice(total)}</p>
        </div>
      )}

      {mode === "pickup" && (
        <div className="card space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-nutrir-emerald">
              Agende sua retirada
            </h2>
            {cartAnalysis.hasCombo && !cartAnalysis.hasRegular && (
              <p className="mt-2 text-xs text-nutrir-emerald/60">
                Combos: retirada seg ou sex, com mínimo de 48h de antecedência.
              </p>
            )}
            {!cartAnalysis.hasCombo && cartAnalysis.hasRegular && (
              <p className="mt-2 text-xs text-nutrir-emerald/60">
                Marmitas avulsas: retirada seg a sex. Pedido até 19h retira amanhã à tarde; após 19h, a partir de depois de amanhã. Sem retirada no mesmo dia.
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
            <PickupScheduler
              rule={pickupRule}
              value={pickupUnified}
              onChange={setPickupUnified}
            />
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
            className="input-field"
            value={form.customer_phone}
            onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">E-mail (opcional)</label>
          <input
            type="email"
            className="input-field"
            value={form.customer_email}
            onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
          />
        </div>
        {mode !== "pickup" && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Data de retirada</label>
              <input
                required
                type="date"
                className="input-field"
                value={form.delivery_date}
                onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Endereço de entrega</label>
              <input
                required
                className="input-field"
                value={form.delivery_address}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
              />
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Observações</label>
          <textarea
            className="input-field min-h-[80px]"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Alergias, preferências, etc."
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">Forma de pagamento</label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: "pix" as const, label: "Pix" },
                { id: "cash" as const, label: "Dinheiro" },
                { id: "card" as const, label: "Cartão" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setPaymentMethod(option.id)}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                  paymentMethod === option.id
                    ? "border-nutrir-emerald bg-nutrir-emerald/10 text-nutrir-emerald"
                    : "border-nutrir-burgundy/30 bg-nutrir-nude text-nutrir-emerald hover:border-nutrir-burgundy"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-nutrir-emerald/60">
            Valores promocionais para Pix ou Dinheiro.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full md:w-auto">
        {loading ? "Enviando..." : mode === "pickup" ? "Confirmar retirada" : "Confirmar pedido"}
      </button>
    </form>
  );
}
