"use client";

import { useEffect, useState } from "react";
import { stripCpfDigits } from "./br-fields";

export function usePatientStatus(cpf?: string) {
  const digits = stripCpfDigits(cpf ?? "");
  const [isPatient, setIsPatient] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (digits.length !== 11) {
      setIsPatient(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/nutrir/pacientes/check?cpf=${encodeURIComponent(digits)}`)
      .then((res) => (res.ok ? res.json() : { isPatient: false }))
      .then((data: { isPatient?: boolean }) => {
        if (!cancelled) setIsPatient(!!data.isPatient);
      })
      .catch(() => {
        if (!cancelled) setIsPatient(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [digits]);

  return { isPatient, loading };
}
