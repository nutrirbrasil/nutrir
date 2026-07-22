"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

export interface PartnerStatus {
  isPartner: boolean;
  name?: string;
  couponCode?: string;
  pointsBalanceCents?: number;
}

const EMPTY: PartnerStatus = { isPartner: false };

export function usePartnerStatus(session: Session | null) {
  const token = session?.access_token;
  const [partner, setPartner] = useState<PartnerStatus>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setPartner(EMPTY);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch("/api/nutrir/partners/check", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : EMPTY))
      .then((data: PartnerStatus) => {
        if (!cancelled) setPartner(data.isPartner ? data : EMPTY);
      })
      .catch(() => {
        if (!cancelled) setPartner(EMPTY);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return { ...partner, loading };
}
