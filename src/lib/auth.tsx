"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { api, clearSession, setSession } from "@/lib/api";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase";

type User = { id: string; email: string; full_name: string };
type Agency = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  brand_color: string;
  brand_secondary: string;
  report_footer?: string | null;
  workspace_mode: string;
  plan: string;
  billing_status: string;
  onboarding_completed: boolean;
  included_clients: number;
  client_pack_count: number;
  reports_used: number;
  reports_quota: number;
  scrape_units_used: number;
  scrape_quota: number;
  budget_remaining_cents: number;
  byok_discount_percent: number;
};

type MeResponse = {
  user: User;
  agency: Agency | null;
  role: string | null;
  needs_bootstrap?: boolean;
};

type AuthState = {
  user: User | null;
  agency: Agency | null;
  role: string | null;
  needsBootstrap: boolean;
  loading: boolean;
  refresh: () => Promise<MeResponse | null>;
  login: (email: string, password: string) => Promise<MeResponse>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    agency_name: string;
    workspace_mode?: string;
  }) => Promise<MeResponse>;
  bootstrap: (payload: {
    agency_name: string;
    workspace_mode?: string;
    full_name?: string;
  }) => Promise<MeResponse>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const DEFAULT_ACCENT = "#0f766e";
const DEFAULT_SECONDARY = "#134e4a";
const DEFAULT_SOFT = "#d7efe9";

function siteUrl() {
  // Prefer the live origin so local vs Railway always match the page the user is on.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function requireSupabase() {
  const sb = getSupabaseBrowser();
  if (!sb || !isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  return sb;
}

function normalizeHex(color: string | null | undefined, fallback: string): string {
  if (!color) return fallback;
  let value = color.trim();
  if (!value.startsWith("#")) value = `#${value}`;
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    value = `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return fallback;
  return value.toLowerCase();
}

function softTint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (channel: number) => Math.round(channel * 0.18 + 255 * 0.82);
  return `#${[mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function applyAgencyTheme(agency: Agency | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!agency) {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-soft");
    root.style.removeProperty("--brand-secondary");
    return;
  }
  const accent = normalizeHex(agency.brand_color, DEFAULT_ACCENT);
  const secondary = normalizeHex(agency.brand_secondary, DEFAULT_SECONDARY);
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-soft", softTint(accent) || DEFAULT_SOFT);
  root.style.setProperty("--brand-secondary", secondary);
}

function authErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    const msg = err.message;
    if (/email not confirmed/i.test(msg)) {
      return "Check your email to confirm your account, then sign in.";
    }
    if (/invalid login credentials/i.test(msg)) {
      return "Wrong email or password.";
    }
    if (/user already registered|already been registered/i.test(msg)) {
      return "That email is already registered. Sign in instead.";
    }
    if (/rate limit|over_email_send_rate_limit|over_request_rate_limit|too many requests/i.test(msg)) {
      return "Too many signup attempts. Wait about an hour (Supabase free email limit is ~2/hour), then try once — or sign in if you already registered.";
    }
    if (/redirect|not allowed|whitelist|allow list|allowlist/i.test(msg)) {
      return "Auth redirect URL is not allowed. Add this site’s /auth/callback URL in Supabase → Authentication → URL Configuration.";
    }
    if (/signup.?disabled|signups.?not.?allowed/i.test(msg)) {
      return "New signups are disabled in Supabase Auth settings.";
    }
    return msg;
  }
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyAgencyTheme(agency);
  }, [agency]);

  const applyMe = useCallback((data: MeResponse | null) => {
    if (!data) {
      setUser(null);
      setAgency(null);
      setRole(null);
      setNeedsBootstrap(false);
      return null;
    }
    setUser(data.user);
    setAgency(data.agency);
    setRole(data.role);
    setNeedsBootstrap(Boolean(data.needs_bootstrap || !data.agency));
    if (data.agency?.id) {
      const token = localStorage.getItem("biqs_token") || "";
      setSession(token, data.agency.id);
    }
    return data;
  }, []);

  const refresh = useCallback(async (): Promise<MeResponse | null> => {
    try {
      const data = await api<MeResponse>("/api/auth/me");
      return applyMe(data);
    } catch {
      applyMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [applyMe]);

  const syncSession = useCallback(
    async (session: Session | null) => {
      if (!session?.access_token) {
        clearSession();
        applyMe(null);
        setLoading(false);
        return null;
      }
      setSession(session.access_token, localStorage.getItem("biqs_agency_id"));
      setLoading(true);
      return refresh();
    },
    [applyMe, refresh],
  );

  useEffect(() => {
    let cancelled = false;
    const sb = getSupabaseBrowser();
    if (!sb) {
      setLoading(false);
      return;
    }

    void (async () => {
      const { data } = await sb.auth.getSession();
      if (cancelled) return;
      await syncSession(data.session);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      void syncSession(session);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [syncSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const sb = requireSupabase();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(authErrorMessage(error, "Sign in failed"));
      const me = await syncSession(data.session);
      if (!me) throw new Error("Signed in, but could not load your workspace.");
      return me;
    },
    [syncSession],
  );

  const bootstrap = useCallback(
    async (payload: { agency_name: string; workspace_mode?: string; full_name?: string }) => {
      const data = await api<MeResponse & { created?: boolean }>("/api/auth/bootstrap", {
        method: "POST",
        body: JSON.stringify({
          agency_name: payload.agency_name,
          workspace_mode: payload.workspace_mode || "agency",
          full_name: payload.full_name,
        }),
      });
      applyMe(data);
      return data;
    },
    [applyMe],
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      full_name: string;
      agency_name: string;
      workspace_mode?: string;
    }) => {
      const sb = requireSupabase();
      const { data, error } = await sb.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: { full_name: payload.full_name },
          emailRedirectTo: `${siteUrl()}/auth/callback`,
        },
      });
      if (error) throw new Error(authErrorMessage(error, "Registration failed"));
      if (!data.session) {
        throw new Error(
          "Check your email to confirm your account, then sign in to finish creating your workspace.",
        );
      }
      await syncSession(data.session);
      return bootstrap({
        agency_name: payload.agency_name,
        workspace_mode: payload.workspace_mode,
        full_name: payload.full_name,
      });
    },
    [bootstrap, syncSession],
  );

  const loginWithGoogle = useCallback(async () => {
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${siteUrl()}/auth/callback`,
      },
    });
    if (error) throw new Error(authErrorMessage(error, "Google sign-in failed"));
  }, []);

  const logout = useCallback(async () => {
    const sb = getSupabaseBrowser();
    clearSession();
    setUser(null);
    setAgency(null);
    setRole(null);
    setNeedsBootstrap(false);
    applyAgencyTheme(null);
    if (sb) {
      await sb.auth.signOut();
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      agency,
      role,
      needsBootstrap,
      loading,
      refresh,
      login,
      register,
      bootstrap,
      loginWithGoogle,
      logout,
    }),
    [
      user,
      agency,
      role,
      needsBootstrap,
      loading,
      refresh,
      login,
      register,
      bootstrap,
      loginWithGoogle,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
