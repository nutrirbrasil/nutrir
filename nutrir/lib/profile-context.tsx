"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { formatCpfDisplay, formatPhoneDisplay } from "./br-fields";
import { fetchCustomerByPhone, syncCustomerToServer } from "./order-history";

export interface UserProfile {
  name: string;
  phone: string;
  cpf: string;
  email: string;
  address: string;
}

interface AuthSession {
  email: string;
}

interface ProfileContextValue {
  isLoggedIn: boolean;
  session: AuthSession | null;
  profile: UserProfile;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  socialLoginHint: string;
}

const SESSION_KEY = "nutrir-session";
const PROFILE_KEY = "nutrir-profile";

const emptyProfile: UserProfile = {
  name: "",
  phone: "",
  cpf: "",
  email: "",
  address: "",
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function loadSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

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
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setProfile(loadProfile());
    if (s?.email && !loadProfile().email) {
      setProfile((p) => ({ ...p, email: s.email }));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session, hydrated]);

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

  const login = useCallback(async (email: string, _password: string) => {
    const s = { email: email.trim().toLowerCase() };
    setSession(s);
    setProfile((p) => {
      const next = { ...p, email: s.email };
      void syncCustomerToServer({ phone: next.phone, whatsapp: next.phone, email: s.email, name: next.name, cpf: next.cpf, address: next.address });
      return next;
    });
  }, []);

  const register = useCallback(async (email: string, _password: string) => {
    const s = { email: email.trim().toLowerCase() };
    setSession(s);
    setProfile((p) => {
      const next = { ...p, email: s.email };
      void syncCustomerToServer({ phone: next.phone, whatsapp: next.phone, email: s.email, name: next.name, cpf: next.cpf, address: next.address });
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const updateProfile = useCallback((data: Partial<UserProfile>) => {
    setProfile((p) => ({ ...p, ...data }));
  }, []);

  const value = useMemo(
    () => ({
      isLoggedIn: !!session,
      session,
      profile,
      login,
      register,
      logout,
      updateProfile,
      socialLoginHint: SOCIAL_LOGIN_HINT,
    }),
    [session, profile, login, register, logout, updateProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
