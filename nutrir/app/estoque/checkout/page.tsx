"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireLogin } from "@/lib/use-require-login";
import { useProfile } from "@/lib/profile-context";
import { useStockCart } from "@/lib/stock-cart-context";
import { nutrirApi, formatPrice } from "@/lib/api";
import { formatPhoneBR } from "@/lib/br-fields";
import { listDeliveryOptionsByMunicipio, type MunicipioId } from "@/lib/delivery-fees";
import {
  isStockDeliveryEligible,
  STOCK_DELIVERY_TIME_MESSAGE,
  STOCK_PICKUP_TIME_MESSAGE,
} from "@/lib/stock-orders-shared";
import { useCustomerAddresses } from "@/lib/use-customer-addresses";
import type { CustomerAddress } from "@/lib/types";

const PICARRAS_PENHA_MUNICIPIOS: MunicipioId[] = ["balnearioPicarras", "penha"];

type PaymentChoice = "pix" | "card" | "local";
type Fulfillment = "pickup" | "delivery";

export default function EstoqueCheckoutPage() {
  const { ready } = useRequireLogin();
  const { profile, session } = useProfile();
  const { items, itemCount, cashTotalCents, clearCart } = useStockCart();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");
  const [payment, setPayment] = useState<PaymentChoice>("pix");
  const [bairroId, setBairroId] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressPrefillDone, setAddressPrefillDone] = useState(false);

  const { addresses, loaded: addressesLoaded } = useCustomerAddresses();

  useEffect(() => {
    if (profile.name) setName(profile.name);
    if (profile.phone) setPhone(formatPhoneBR(profile.phone));
  }, [profile.name, profile.phone]);

  // Entrega imediata só existe em Balneário Piçarras (todos os bairros) e no
  // Centro de Penha — os demais bairros de Penha ficam longe demais.
  const municipios = listDeliveryOptionsByMunicipio()
    .filter((m) => PICARRAS_PENHA_MUNICIPIOS.includes(m.municipio))
    .map((m) => ({
      ...m,
      bairros: m.bairros.filter((b) => b.available && isStockDeliveryEligible(b.bairroId)),
    }))
    .filter((m) => m.bairros.length > 0);
  const bairros = municipios.flatMap((m) => m.bairros);
  const bairroIds = new Set(bairros.map((b) => b.bairroId));
  // Só os endereços salvos elegíveis pra pronta entrega servem de atalho aqui.
  const eligibleAddresses = addresses.filter((a) => bairroIds.has(a.bairro_id));

  function fillFromAddress(address: CustomerAddress) {
    setSelectedAddressId(address.id);
    setBairroId(address.bairro_id);
    setStreet(address.street);
    setNumber(address.number);
    setComplement(address.complement ?? "");
    setReference(address.reference ?? "");
  }

  // Pré-preenche com o endereço salvo padrão (se houver algum elegível) assim que os endereços carregarem.
  useEffect(() => {
    if (addressPrefillDone || !addressesLoaded) return;
    setAddressPrefillDone(true);
    const defaultAddress = eligibleAddresses.find((a) => a.is_default) ?? eligibleAddresses[0];
    if (defaultAddress) fillFromAddress(defaultAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressesLoaded, addressPrefillDone]);

  useEffect(() => {
    // Entrega só aceita pagamento online — se o cliente tinha "pagar na retirada" marcado, troca pra Pix.
    if (fulfillment === "delivery" && payment === "local") setPayment("pix");
  }, [fulfillment, payment]);

  if (!ready) return null;

  if (itemCount === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-nutrir-emerald/70">Sua sacola de pronta entrega está vazia.</p>
        <Link href="/estoque" className="btn-primary mt-4 inline-block">
          Ver estoque disponível
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (fulfillment === "delivery" && !bairroId) {
      setError("Selecione o bairro de entrega.");
      return;
    }
    if (fulfillment === "delivery" && (!street.trim() || !number.trim())) {
      setError("Informe rua e número.");
      return;
    }

    setLoading(true);
    setError("");

    const token = session?.access_token;
    if (!token) {
      setError("Sessão expirada. Faça login de novo.");
      setLoading(false);
      return;
    }

    try {
      const paymentMethodValue = payment === "local" ? "local_cash" : payment;

      const { order, checkout_url } = await nutrirApi.createStockOrder(
        {
          customer_name: name,
          customer_phone: phone,
          fulfillment_type: fulfillment,
          payment_method: paymentMethodValue,
          delivery_bairro_id: fulfillment === "delivery" ? bairroId : undefined,
          delivery_street: fulfillment === "delivery" ? street : undefined,
          delivery_number: fulfillment === "delivery" ? number : undefined,
          delivery_complement: fulfillment === "delivery" ? complement : undefined,
          delivery_reference: fulfillment === "delivery" ? reference : undefined,
          items: items.map((i) => ({
            item_id: i.itemId,
            size: i.size,
            quantity: i.quantity,
            addons_cents: i.addonsCents,
            addons_note: i.addonsNote,
          })),
        },
        token
      );

      clearCart();

      if (checkout_url) {
        window.location.href = checkout_url;
        return;
      }
      if (paymentMethodValue === "pix") {
        router.push(`/checkout/pix?order=${encodeURIComponent(order.id)}`);
        return;
      }
      router.push(`/estoque/obrigado?order=${encodeURIComponent(order.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reservar. Tente de novo.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-nutrir-emerald">Reservar pronta entrega</h1>
      <p className="mt-1 text-sm text-nutrir-emerald/60">
        {itemCount} {itemCount === 1 ? "item" : "itens"} · {formatPrice(cashTotalCents)}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="card space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Nome</label>
            <input
              required
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Telefone / WhatsApp</label>
            <input
              required
              type="tel"
              maxLength={15}
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
              placeholder="(47) 99999-9999"
            />
          </div>
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-nutrir-emerald/55">
            Retirada ou entrega
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFulfillment("pickup")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
                fulfillment === "pickup"
                  ? "bg-nutrir-burgundy text-nutrir-nude"
                  : "border border-nutrir-emerald/30 text-nutrir-emerald"
              }`}
            >
              Retirada
            </button>
            <button
              type="button"
              onClick={() => setFulfillment("delivery")}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-bold transition ${
                fulfillment === "delivery"
                  ? "bg-nutrir-burgundy text-nutrir-nude"
                  : "border border-nutrir-emerald/30 text-nutrir-emerald"
              }`}
            >
              Entrega
            </button>
          </div>

          {fulfillment === "pickup" ? (
            <p className="text-sm text-nutrir-emerald">{STOCK_PICKUP_TIME_MESSAGE}</p>
          ) : (
            <>
              <p className="text-sm text-nutrir-emerald">{STOCK_DELIVERY_TIME_MESSAGE}</p>

              {eligibleAddresses.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-nutrir-emerald">Endereço salvo</p>
                  <div className="flex flex-wrap gap-2">
                    {eligibleAddresses.map((address) => (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => fillFromAddress(address)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          selectedAddressId === address.id
                            ? "bg-nutrir-burgundy text-nutrir-nude"
                            : "border border-nutrir-emerald/30 text-nutrir-emerald"
                        }`}
                      >
                        {address.label}
                        {address.is_default ? " · Padrão" : ""}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(null);
                        setBairroId("");
                        setStreet("");
                        setNumber("");
                        setComplement("");
                        setReference("");
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        selectedAddressId === null
                          ? "bg-nutrir-burgundy text-nutrir-nude"
                          : "border border-nutrir-emerald/30 text-nutrir-emerald"
                      }`}
                    >
                      Novo endereço
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Bairro</label>
                  <select
                    required
                    className="input-field"
                    value={bairroId}
                    onChange={(e) => {
                      setBairroId(e.target.value);
                      setSelectedAddressId(null);
                    }}
                  >
                    <option value="" disabled>
                      Selecione (só Balneário Piçarras e Centro de Penha)
                    </option>
                    {municipios.map((m) => (
                      <optgroup key={m.municipio} label={m.label}>
                        {m.bairros
                          .filter((b) => b.available)
                          .map((b) => (
                            <option key={b.bairroId} value={b.bairroId}>
                              {b.bairro}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Rua</label>
                    <input
                      required
                      className="input-field"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Número</label>
                    <input
                      required
                      className="input-field sm:w-24"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-nutrir-emerald">
                    Complemento (opcional)
                  </label>
                  <input
                    className="input-field"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-nutrir-emerald">
                    Ponto de referência (opcional)
                  </label>
                  <input
                    className="input-field"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="card space-y-3">
          <p className="text-xs font-bold uppercase tracking-wide text-nutrir-emerald/55">Pagamento</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-nutrir-emerald">
              <input
                type="radio"
                name="payment"
                className="accent-nutrir-burgundy"
                checked={payment === "pix"}
                onChange={() => setPayment("pix")}
              />
              Pix online (agora)
            </label>
            <label className="flex items-center gap-2 text-sm text-nutrir-emerald">
              <input
                type="radio"
                name="payment"
                className="accent-nutrir-burgundy"
                checked={payment === "card"}
                onChange={() => setPayment("card")}
              />
              Cartão online (agora)
            </label>
            {fulfillment === "pickup" && (
              <label className="flex items-center gap-2 text-sm text-nutrir-emerald">
                <input
                  type="radio"
                  name="payment"
                  className="accent-nutrir-burgundy"
                  checked={payment === "local"}
                  onChange={() => setPayment("local")}
                />
                Pagar na retirada (dinheiro, cartão ou Pix)
              </label>
            )}
          </div>
          {fulfillment === "delivery" && (
            <p className="text-xs text-nutrir-emerald/55">Entrega exige pagamento online (Pix ou cartão).</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-60">
          {loading ? "Reservando…" : "Confirmar reserva"}
        </button>
      </form>
    </div>
  );
}
