"use client";

import { useEffect, useState } from "react";
import { formatCpf, formatInstagramDisplay, normalizeInstagramHandle } from "@/lib/br-fields";
import { useProfile } from "@/lib/profile-context";

export function PartnerApplicationForm() {
  const { profile, partner, updateProfile } = useProfile();

  const [name, setName] = useState(profile.name);
  const [address, setAddress] = useState(profile.address);
  const [cpf, setCpf] = useState(profile.cpf);
  const [email, setEmail] = useState(profile.email);
  const [instagram, setInstagram] = useState(profile.instagram);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Autopreenche assim que o perfil carrega (login ou dados já salvos localmente),
  // sem sobrescrever o que a pessoa já digitou no formulário.
  useEffect(() => {
    setName((v) => v || profile.name);
    setAddress((v) => v || profile.address);
    setCpf((v) => v || profile.cpf);
    setEmail((v) => v || profile.email);
    setInstagram((v) => v || profile.instagram);
  }, [profile]);

  if (partner.isPartner) {
    return (
      <div className="rounded-2xl border-2 border-nutrir-emerald bg-nutrir-emerald/10 p-5 text-center">
        <p className="font-display text-lg font-bold text-nutrir-emerald">
          Você já é parceiro Nutrir! 💚
        </p>
        {partner.couponCode && (
          <p className="mt-1 text-sm text-nutrir-emerald/80">
            Seu cupom: <strong>{partner.couponCode}</strong>
          </p>
        )}
      </div>
    );
  }

  if (sent) {
    return (
      <div className="rounded-2xl border-2 border-nutrir-emerald bg-nutrir-emerald/10 p-5 text-center">
        <p className="font-display text-lg font-bold text-nutrir-emerald">
          Inscrição enviada! 🎉
        </p>
        <p className="mt-1 text-sm text-nutrir-emerald/80">
          Vamos analisar seu perfil e entrar em contato em breve.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim() || name.trim().length < 3) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!address.trim()) {
      setError("Informe seu endereço.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!normalizeInstagramHandle(instagram)) {
      setError("Informe o @ do seu Instagram.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/nutrir/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          cpf: cpf.trim(),
          email: email.trim(),
          instagram: formatInstagramDisplay(instagram),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar sua inscrição. Tente novamente.");
        return;
      }

      // Melhor esforço: preenche o que faltar no perfil, não bloqueia o envio se falhar
      // (ex.: visitante sem telefone salvo, exigido pelo cadastro de cliente).
      updateProfile({
        name: name.trim(),
        address: address.trim(),
        cpf: cpf.trim(),
        email: email.trim(),
        instagram: formatInstagramDisplay(instagram),
      });

      setSent(true);
    } catch {
      setError("Não foi possível enviar sua inscrição. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-nutrir-burgundy/15 bg-nutrir-cream/60 p-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Nome completo</label>
        <input
          className="input-field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-nutrir-emerald">Endereço</label>
        <input
          className="input-field"
          placeholder="Rua, número, bairro, cidade"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-nutrir-emerald">CPF</label>
        <input
          className="input-field"
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
          maxLength={14}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-nutrir-emerald">E-mail</label>
        <input
          type="email"
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-nutrir-emerald">@ do Instagram</label>
        <input
          className="input-field"
          placeholder="@seuinstagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          required
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
        {loading ? "Enviando..." : "Quero ser parceiro"}
      </button>
    </form>
  );
}
