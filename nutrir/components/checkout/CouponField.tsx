"use client";

import { useState } from "react";
import { getCoupon, isValidCouponCode, normalizeCouponCode } from "@/lib/coupons";

interface Props {
  code?: string;
  onApply: (code: string) => void;
  onRemove: () => void;
}

export function CouponField({ code, onApply, onRemove }: Props) {
  const [input, setInput] = useState(code ?? "");
  const [error, setError] = useState("");

  const applied = code ? getCoupon(code) : null;

  function handleApply() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Digite um cupom.");
      return;
    }
    if (!isValidCouponCode(trimmed)) {
      setError("Cupom inválido.");
      return;
    }
    setError("");
    onApply(normalizeCouponCode(trimmed));
  }

  function handleRemove() {
    setInput("");
    setError("");
    onRemove();
  }

  if (applied && code) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-nutrir-emerald/60">Cupom aplicado</p>
          <p className="font-semibold text-nutrir-emerald">
            {code}
            {applied.label && (
              <span className="ml-1.5 text-sm font-normal text-nutrir-emerald/70">
                ({applied.label})
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 text-xs font-bold uppercase text-nutrir-burgundy hover:underline"
        >
          Remover
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-bold uppercase text-nutrir-emerald/60">Cupom de desconto</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value.toUpperCase());
            if (error) setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
          placeholder="Digite o cupom"
          className="input-field w-full min-w-0 flex-1 uppercase sm:min-w-[10rem]"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={handleApply}
          className="btn-primary w-full shrink-0 px-6 py-2.5 text-xs font-bold uppercase sm:w-auto"
        >
          Aplicar
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
