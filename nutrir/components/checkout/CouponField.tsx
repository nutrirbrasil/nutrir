"use client";

import { useState } from "react";
import { normalizeCouponCode } from "@/lib/coupons";

export interface AppliedCoupon {
  code: string;
  percent: number;
  label?: string;
  freeDelivery?: boolean;
  spendBasedFreeDelivery?: boolean;
  progressiveDayDish?: boolean;
  flatPerComboCents?: number;
}

interface Props {
  applied?: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
  /** CPF já preenchido no checkout — conferido contra restrições do cupom (ex: só paciente). */
  cpf?: string;
  /** session.access_token, pra restrição de "1ª compra"/"uma vez por conta" checar pelo e-mail autenticado, não um campo livre. */
  token?: string;
}

export function CouponField({ applied, onApply, onRemove, cpf, token }: Props) {
  const [input, setInput] = useState(applied?.code ?? "");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleApply() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Digite um cupom.");
      return;
    }

    setChecking(true);
    setError("");

    try {
      const code = normalizeCouponCode(trimmed);
      const params = new URLSearchParams({ code });
      if (cpf?.trim()) params.set("cpf", cpf.trim());
      const res = await fetch(`/api/nutrir/coupons/check?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = (await res.json()) as {
        valid: boolean;
        percent?: number;
        label?: string;
        freeDelivery?: boolean;
        spendBasedFreeDelivery?: boolean;
        progressiveDayDish?: boolean;
        flatPerComboCents?: number;
        error?: string;
      };

      if (!data.valid || data.percent === undefined) {
        setError(data.error || "Cupom inválido.");
        return;
      }

      onApply({
        code,
        percent: data.percent,
        label: data.label,
        freeDelivery: data.freeDelivery,
        spendBasedFreeDelivery: data.spendBasedFreeDelivery,
        progressiveDayDish: data.progressiveDayDish,
        flatPerComboCents: data.flatPerComboCents,
      });
    } catch {
      setError("Não foi possível conferir o cupom agora. Tente de novo.");
    } finally {
      setChecking(false);
    }
  }

  function handleRemove() {
    setInput("");
    setError("");
    onRemove();
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-nutrir-ink/60">Cupom aplicado</p>
          <p className="font-semibold text-nutrir-ink">
            {applied.code}
            {applied.label && (
              <span className="ml-1.5 text-sm font-normal text-nutrir-ink/70">
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
      <p className="text-xs font-bold uppercase text-nutrir-ink/60">Cupom de desconto</p>
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
          disabled={checking}
          className="btn-primary w-full shrink-0 px-6 py-2.5 text-xs font-bold uppercase disabled:opacity-60 sm:w-auto"
        >
          {checking ? "Conferindo…" : "Aplicar"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
