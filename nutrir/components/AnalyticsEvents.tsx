"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { identifyUser, track } from "@/lib/analytics";
import { useProfile } from "@/lib/profile-context";

/** Liga a sessão logada ao PostHog (sem dados pessoais) e captura cliques em WhatsApp/links externos. */
export function AnalyticsEvents() {
  const pathname = usePathname();
  const { session, isLoggedIn, authLoading, isPatient, partner } = useProfile();
  const userId = session?.user.id;
  const hasEmail = !!session?.user.email;
  const provider = session?.user.app_metadata?.provider as string | undefined;
  const isPartner = !!partner?.isPartner;

  useEffect(() => {
    if (authLoading) return;
    if (userId) {
      identifyUser(userId, {
        login_method: provider ?? (hasEmail ? "email" : "phone"),
        is_patient: isPatient,
        is_partner: isPartner,
      });
    }
  }, [authLoading, userId, hasEmail, provider, isPatient, isPartner, isLoggedIn]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!/^https?:\/\//i.test(href)) return;
      let host = "";
      try {
        host = new URL(href).hostname;
      } catch {
        return;
      }
      if (host === window.location.hostname) return;

      const label = (anchor.getAttribute("aria-label") || anchor.textContent || "").trim().slice(0, 80);
      if (/(^|\.)wa\.me$|whatsapp\.com$/.test(host)) {
        track("whatsapp_click", { page: pathname, label });
      } else {
        track("outbound_click", { page: pathname, host, label });
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  return null;
}
