"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { buildPerfilUrl } from "./auth-next";
import { useProfile } from "./profile-context";

export function useRequireLogin() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, authLoading } = useProfile();

  const redirectTo = useMemo(() => buildPerfilUrl(pathname), [pathname]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) router.replace(redirectTo);
  }, [authLoading, isLoggedIn, redirectTo, router]);

  return { isLoggedIn, authLoading, ready: !authLoading && isLoggedIn };
}
