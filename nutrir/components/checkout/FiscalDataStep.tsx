"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckoutShell, useCheckoutGuard } from "@/components/checkout/CheckoutShell";
import {
  cpfValidationMessage,
  formatCpf,
  formatPhoneBR,
  phoneValidationMessage,
} from "@/lib/br-fields";
import { useCheckout } from "@/lib/checkout-context";
import { hasFiscalData } from "@/lib/checkout-draft";
import { syncCustomerToServer } from "@/lib/order-history";
import { useProfile } from "@/lib/profile-context";

export function FiscalDataStep() {
  const router = useRouter();
  const { patchDraft } = useCheckout();
  const { updateProfile } = useProfile();
  const { draft, ready } = useCheckoutGuard();
  const [name, setName] = useState(draft?.customer_name ?? "");
  const [cpf, setCpf] = useState(() => formatCpf(draft?.customer_cpf ?? ""));
  const [phone, setPhone] = useState(() => formatPhoneBR(draft?.customer_phone ?? ""));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draft) return;
    if (hasFiscalData(draft)) {
      router.replace("/checkout/revisar");
    }
  }, [draft, router]);

  if (!ready || !draft) return null;

  function handleContinue() {
    const cpfFormatted = formatCpf(cpf);
    const phoneFormatted = formatPhoneBR(phone);

    if (name.trim().length < 2) {
      setError("Informe nome e sobrenome.");
      return;
    }

    const cpfErr = cpfValidationMessage(cpfFormatted);
    if (cpfErr) {
      setError(cpfErr);
      return;
    }

    const phoneErr = phoneValidationMessage(phoneFormatted);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }

    patchDraft({
      customer_name: name.trim(),
      customer_cpf: cpfFormatted,
      customer_phone: phoneFormatted,
    });
    updateProfile({ name: name.trim(), cpf: cpfFormatted, phone: phoneFormatted });
    void syncCustomerToServer({
      phone: phoneFormatted,
      whatsapp: phoneFormatted,
      name: name.trim(),
      cpf: cpfFormatted,
    });

    router.push("/checkout/revisar");
  }

  return (
    <CheckoutShell
      title="Confirme seus dados"
      backHref="/checkout/pagamento"
      backLabel="Alterar pagamento"
    >
      <div className="card space-y-4">
        <h2 className="font-bold text-nutrir-emerald">Dados para a nota fiscal:</h2>

        <div>
          <label className="mb-1 block text-sm font-medium">Qual o seu nome e sobrenome?</label>
          <input
            required
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">CPF</label>
          <input
            required
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            className="input-field"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
          />
          <p className="mt-1 text-xs text-nutrir-emerald/60">
            Precisamos do seu CPF para emitir a nota fiscal do seu pedido.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Celular</label>
          <input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={15}
            className="input-field"
            value={phone}
            onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
            placeholder="(47) 99999-9999"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="button" onClick={handleContinue} className="btn-primary w-full py-3.5">
          Continuar
        </button>
      </div>
    </CheckoutShell>
  );
}
