"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bot,
  Building2,
  CreditCard,
  FileText,
  KanbanSquare,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Plug,
  Send,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import clsx from "clsx";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number }> };

const workNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/reports", label: "All reports", icon: FileText },
  { href: "/delivery", label: "Delivery", icon: Send },
  { href: "/biqs", label: "Biqs", icon: KanbanSquare },
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

function NavSection({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
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
            onClick={onNavigate}
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

function SidebarContent({
  agency,
  user,
  pathname,
  onNavigate,
  onLogout,
}: {
  agency: { name?: string | null; logo_url?: string | null };
  user: { full_name: string; email: string };
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="px-5 py-5 sm:py-6 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          {agency.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agency.logo_url}
              alt=""
              className="h-9 w-9 rounded-lg object-contain bg-white border border-[var(--line)] shrink-0"
            />
          ) : null}
          <div className="min-w-0">
            <div className="font-[family-name:var(--font-display)] text-xl sm:text-2xl tracking-tight text-[var(--accent)] truncate">
              {agency.name || "MarketBiqs"}
            </div>
            <div className="mt-0.5 text-xs text-[var(--muted)] truncate">MarketBiqs workspace</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto overscroll-contain">
        <NavSection label="Work" items={workNav} pathname={pathname} onNavigate={onNavigate} />
        <NavSection label="Settings" items={settingsNav} pathname={pathname} onNavigate={onNavigate} />
      </nav>
      <div className="p-4 border-t border-[var(--line)] shrink-0">
        <div className="text-sm font-medium truncate">{user.full_name}</div>
        <div className="text-xs text-[var(--muted)] truncate">{user.email}</div>
        <button
          onClick={onLogout}
          className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { agency, user, logout, loading, needsBootstrap } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user && needsBootstrap) {
      router.replace("/register?oauth=1");
      return;
    }
    if (!user || !agency) {
      router.replace("/login");
    }
  }, [loading, user, agency, needsBootstrap, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  if (loading || !user || !agency) {
    return (
      <div className="min-h-screen grid place-items-center bg-[var(--bg)] text-[var(--ink)] px-4">
        <div className="animate-pulse text-sm tracking-wide uppercase opacity-70">Loading workspace</div>
      </div>
    );
  }

  function handleLogout() {
    void logout().then(() => {
      setMenuOpen(false);
      router.push("/login");
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col lg:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-[var(--line)] bg-[var(--panel)] flex-col sticky top-0 h-screen">
        <SidebarContent
          agency={agency}
          user={user}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 py-3 safe-top">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] text-[var(--ink)] hover:bg-black/5"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--accent)] truncate">
              {agency.name || "MarketBiqs"}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(20,35,31,0.45)] backdrop-blur-[1px]"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
          <aside
            className="relative z-10 flex h-full w-[min(18rem,88vw)] max-w-full flex-col bg-[var(--panel)] shadow-[8px_0_40px_rgba(20,35,31,0.18)] drawer-enter"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
            <SidebarContent
              agency={agency}
              user={user}
              pathname={pathname}
              onNavigate={() => setMenuOpen(false)}
              onLogout={handleLogout}
            />
          </aside>
        </div>
      ) : null}

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
