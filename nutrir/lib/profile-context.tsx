"use client";

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mapAuthError } from "./auth-errors";
import { formatCpfDisplay, formatPhoneDisplay } from "./br-fields";
import { fetchCustomerByPhone, syncCustomerToServer } from "./order-history";
import { getAuthCallbackUrl } from "./auth-redirect";
import { getSupabaseBrowser, isSupabaseAuthConfigured } from "./supabase-browser";

export interface UserProfile {
  name: string;
  phone: string;
  cpf: string;
  email: string;
  address: string;
}

interface ProfileContextValue {
  isLoggedIn: boolean;
  authConfigured: boolean;
  authLoading: boolean;
  passwordRecovery: boolean;
  session: Session | null;
  profile: UserProfile;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<{ needsVerification: boolean }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendPasswordReset: (email: string) => Promise<void>;
  verifyRecoveryAndResetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<void>;
  completePasswordRecovery: (newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => void;
  socialLoginHint: string;
}

const PROFILE_KEY = "nutrir-profile";

const emptyProfile: UserProfile = {
  name: "",
  phone: "",
  cpf: "",
  email: "",
  address: "",
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function loadProfile(): UserProfile {
  if (typeof window === "undefined") return emptyProfile;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return emptyProfile;
    const parsed = { ...emptyProfile, ...(JSON.parse(raw) as UserProfile) };
    return {
      ...parsed,
      phone: formatPhoneDisplay(parsed.phone),
      cpf: formatCpfDisplay(parsed.cpf),
    };
  } catch {
    return emptyProfile;
  }
}

export const SOCIAL_LOGIN_HINT =
  "Login com Google, Facebook ou Apple exige o site publicado online com Supabase Auth configurado (URLs de redirect). Por enquanto, use e-mail e senha.";

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [hydrated, setHydrated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const authConfigured = isSupabaseAuthConfigured();

  useEffect(() => {
    setProfile(loadProfile());
    setHydrated(true);

    if (!authConfigured) {
      setAuthLoading(false);
      return;
    }

    const supabase = getSupabaseBrowser();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user.email) {
        setProfile((p) => ({ ...p, email: data.session!.user.email! }));
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setPasswordRecovery(true);
      }
      if (event === "SIGNED_OUT") {
        setPasswordRecovery(false);
      }
      setSession(nextSession);
      if (nextSession?.user.email) {
        setProfile((p) => ({ ...p, email: nextSession.user.email! }));
      }
      if (!nextSession) {
        setProfile((p) => ({ ...p, email: "" }));
      }
    });

    return () => subscription.unsubscribe();
  }, [authConfigured]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const phone = loadProfile().phone;
    if (!phone) return;
    fetchCustomerByPhone(phone).then((remote) => {
      if (!remote) return;
      setProfile((p) => ({
        ...p,
        name: remote.name || p.name,
        email: remote.email || p.email,
        cpf: formatCpfDisplay(remote.cpf) || p.cpf,
        address: remote.address || p.address,
        phone: formatPhoneDisplay(remote.phone) || p.phone,
      }));
    });
  }, [hydrated]);

  const login = useCallback(async (email: string, password: string) => {
    if (!authConfigured) throw new Error("Autenticação não configurada.");
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw new Error(mapAuthError(error));
  }, [authConfigured]);

  const register = useCallback(async (email: string, password: string) => {
    if (!authConfigured) throw new Error("Autenticação não configurada.");
    const supabase = getSupabaseBrowser();
    const normalized = email.trim().toLowerCase();
    const redirectTo = getAuthCallbackUrl("signup");

    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw new Error(mapAuthError(error));

    return { needsVerification: Boolean(data.user && !data.session) };
  }, [authConfigured]);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    if (!authConfigured) throw new Error("Autenticação não configurada.");
    const supabase = getSupabaseBrowser();
    const normalized = email.trim().toLowerCase();
    const token = code.trim();

    let { error } = await supabase.auth.verifyOtp({
      email: normalized,
      token,
      type: "signup",
    });

    if (error) {
      const retry = await supabase.auth.verifyOtp({
        email: normalized,
        token,
        type: "email",
      });
      error = retry.error;
    }

    if (error) throw new Error(mapAuthError(error));
  }, [authConfigured]);

  const resendVerification = useCallback(async (email: string) => {
    if (!authConfigured) throw new Error("Autenticação não configurada.");
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: getAuthCallbackUrl("signup") },
    });
    if (error) throw new Error(mapAuthError(error));
  }, [authConfigured]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!authConfigured) throw new Error("Autenticação não configurada.");
    const supabase = getSupabaseBrowser();
    const normalized = email.trim().toLowerCase();
    const redirectTo = getAuthCallbackUrl("recovery");

    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo,
    });
    if (error) throw new Error(mapAuthError(error));
  }, [authConfigured]);

  const resendPasswordReset = useCallback(async (email: string) => {
    await requestPasswordReset(email);
  }, [requestPasswordReset]);

  const verifyRecoveryAndResetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      if (!authConfigured) throw new Error("Autenticação não configurada.");
      const supabase = getSupabaseBrowser();
      const normalized = email.trim().toLowerCase();
      const token = code.trim();

      const { error } = await supabase.auth.verifyOtp({
        email: normalized,
        token,
        type: "recovery",
      });
      if (error) throw new Error(mapAuthError(error));

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error(mapAuthError(updateError));

      setPasswordRecovery(false);
    },
    [authConfigured]
  );

  const completePasswordRecovery = useCallback(
    async (newPassword: string) => {
      if (!authConfigured) throw new Error("Autenticação não configurada.");
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(mapAuthError(error));
      setPasswordRecovery(false);
    },
    [authConfigured]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!authConfigured) throw new Error("Autenticação não configurada.");
      const email = session?.user.email;
      if (!email) throw new Error("Sessão expirada. Entre novamente.");

      const supabase = getSupabaseBrowser();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (loginError) throw new Error("Senha atual incorreta.");

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(mapAuthError(error));
    },
    [authConfigured, session?.user.email]
  );

  const logout = useCallback(async () => {
    if (authConfigured) {
      await getSupabaseBrowser().auth.signOut();
    }
    setSession(null);
    setPasswordRecovery(false);
  }, [authConfigured]);

  const updateProfile = useCallback((data: Partial<UserProfile>) => {
    setProfile((p) => {
      const next = { ...p, ...data };
      void syncCustomerToServer({
        phone: next.phone,
        whatsapp: next.phone,
        email: next.email,
        name: next.name,
        cpf: next.cpf,
        address: next.address,
      });
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn: !!session?.user && !passwordRecovery,
      authConfigured,
      authLoading,
      passwordRecovery,
      session,
      profile,
      login,
      register,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      resendPasswordReset,
      verifyRecoveryAndResetPassword,
      completePasswordRecovery,
      changePassword,
      logout,
      updateProfile,
      socialLoginHint: SOCIAL_LOGIN_HINT,
    }),
    [
      session,
      authConfigured,
      authLoading,
      passwordRecovery,
      profile,
      login,
      register,
      verifyEmail,
      resendVerification,
      requestPasswordReset,
      resendPasswordReset,
      verifyRecoveryAndResetPassword,
      completePasswordRecovery,
      changePassword,
      logout,
      updateProfile,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
