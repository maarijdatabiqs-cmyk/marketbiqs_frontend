"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Bot,
  Building2,
  CreditCard,
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Palette,
  Plug,
  Radar,
  Send,
  Users,
  Workflow,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import clsx from "clsx";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number }> };

const workNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/tracker", label: "Tracker", icon: Radar },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/delivery", label: "Delivery", icon: Send },
  { href: "/assistant", label: "Assistant", icon: Bot },
];

const settingsNav: NavItem[] = [
  { href: "/team", label: "Team", icon: Users },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/branding", label: "Branding", icon: Palette },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/byok", label: "BYOK", icon: KeyRound },
  { href: "/white-label", label: "White-Label API", icon: Workflow },
];

function NavSection({ label, items, pathname }: { label: string; items: NavItem[]; pathname: string }) {
  return (
    <div className="space-y-1">
      <div className="px-3 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active
                ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]",
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { agency, user, logout, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !agency)) {
      router.replace("/login");
    }
  }, [loading, user, agency, router]);

  if (loading || !user || !agency) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--bg)] text-[var(--ink)]">
        <div className="animate-pulse text-sm tracking-wide uppercase opacity-70">Loading workspace</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex">
      <aside className="w-64 shrink-0 border-r border-[var(--line)] bg-[var(--panel)] flex flex-col">
        <div className="px-5 py-6 border-b border-[var(--line)]">
          <div className="flex items-center gap-3">
            {agency.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={agency.logo_url} alt="" className="h-9 w-9 rounded-lg object-contain bg-white border border-[var(--line)]" />
            ) : null}
            <div className="min-w-0">
              <div className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--accent)] truncate">
                {agency.name || "MarketBiqs"}
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted)] truncate">MarketBiqs workspace</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          <NavSection label="Work" items={workNav} pathname={pathname} />
          <NavSection label="Settings" items={settingsNav} pathname={pathname} />
        </nav>
        <div className="p-4 border-t border-[var(--line)]">
          <div className="text-sm font-medium truncate">{user.full_name}</div>
          <div className="text-xs text-[var(--muted)] truncate">{user.email}</div>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
