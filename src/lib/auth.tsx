"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearSession, setSession } from "@/lib/api";

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

type AuthState = {
  user: User | null;
  agency: Agency | null;
  role: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    agency_name: string;
    workspace_mode?: string;
  }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

const DEFAULT_ACCENT = "#0f766e";
const DEFAULT_SECONDARY = "#134e4a";
const DEFAULT_SOFT = "#d7efe9";

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applyAgencyTheme(agency);
  }, [agency]);

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: User; agency: Agency; role: string }>("/api/auth/me");
      setUser(data.user);
      setAgency(data.agency);
      setRole(data.role);
      setSession(localStorage.getItem("biqs_token") || "", data.agency.id);
    } catch {
      setUser(null);
      setAgency(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("biqs_token");
    if (!token) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setSession(data.access_token);
    setLoading(true);
    await refresh();
  }, [refresh]);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      full_name: string;
      agency_name: string;
      workspace_mode?: string;
    }) => {
      const data = await api<{ access_token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSession(data.access_token);
      setLoading(true);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setAgency(null);
    setRole(null);
    applyAgencyTheme(null);
  }, []);

  const value = useMemo(
    () => ({ user, agency, role, loading, refresh, login, register, logout }),
    [user, agency, role, loading, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
