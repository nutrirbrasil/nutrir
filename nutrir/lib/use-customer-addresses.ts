"use client";

import { useCallback, useEffect, useState } from "react";
import { nutrirApi } from "./api";
import { useProfile } from "./profile-context";
import type { CustomerAddress, CustomerAddressInput } from "./types";

/** Endereços de entrega salvos do cliente logado. Some (lista vazia) para quem não está logado. */
export function useCustomerAddresses() {
  const { session, isLoggedIn, authLoading } = useProfile();
  const token = session?.access_token;

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(false);
  /** Vira true depois da primeira tentativa de carregar (com sucesso, erro, ou por não estar logado). Evita que quem consome o hook trate "ainda não sabemos" como "não tem endereço salvo". */
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setAddresses([]);
      setLoaded(true);
      return;
    }
    setLoading(true);
    try {
      const { addresses: list } = await nutrirApi.listAddresses(token);
      setAddresses(list);
    } catch {
      // Endereços salvos são um atalho, não bloqueiam o checkout se a busca falhar.
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading) return; // ainda não sabemos se tem sessão — espera pra não travar "loaded" com um falso "deslogado"
    if (isLoggedIn) {
      refresh();
    } else {
      setAddresses([]);
      setLoaded(true);
    }
  }, [authLoading, isLoggedIn, refresh]);

  const createAddress = useCallback(
    async (input: CustomerAddressInput) => {
      if (!token) throw new Error("Faça login para salvar endereços.");
      const { address } = await nutrirApi.createAddress(input, token);
      await refresh();
      return address;
    },
    [token, refresh]
  );

  const updateAddress = useCallback(
    async (id: string, patch: Partial<CustomerAddressInput>) => {
      if (!token) throw new Error("Faça login para editar endereços.");
      const { address } = await nutrirApi.updateAddress(id, patch, token);
      await refresh();
      return address;
    },
    [token, refresh]
  );

  const deleteAddress = useCallback(
    async (id: string) => {
      if (!token) throw new Error("Faça login para remover endereços.");
      await nutrirApi.deleteAddress(id, token);
      await refresh();
    },
    [token, refresh]
  );

  return { addresses, loading, loaded, refresh, createAddress, updateAddress, deleteAddress };
}
