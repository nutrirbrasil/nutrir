"use client";

import { useCallback, useEffect, useState } from "react";
import { nutrirApi } from "./api";
import { useProfile } from "./profile-context";
import type { CustomerAddress, CustomerAddressInput } from "./types";

/** Endereços de entrega salvos do cliente logado. Some (lista vazia) para quem não está logado. */
export function useCustomerAddresses() {
  const { session, isLoggedIn } = useProfile();
  const token = session?.access_token;

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) {
      setAddresses([]);
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
    }
  }, [token]);

  useEffect(() => {
    if (isLoggedIn) {
      refresh();
    } else {
      setAddresses([]);
    }
  }, [isLoggedIn, refresh]);

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

  return { addresses, loading, refresh, createAddress, updateAddress, deleteAddress };
}
