"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { setSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const sb = getSupabaseBrowser();
      if (!sb) {
        setError("Supabase is not configured.");
        return;
      }

      try {
        // Handle ?code= PKCE exchange when present
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        const { data, error: sessionError } = await sb.auth.getSession();
        if (sessionError) throw sessionError;
        if (!data.session?.access_token) {
          throw new Error("No session after sign-in. Try again.");
        }

        setSession(data.session.access_token, null);
        const me = await refresh();
        if (cancelled) return;

        if (!me || me.needs_bootstrap || !me.agency) {
          router.replace("/register?oauth=1");
          return;
        }
        router.replace(me.agency.onboarding_completed ? "/dashboard" : "/onboarding");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Sign-in failed");
        }
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [refresh, router]);

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center max-w-sm">
        {error ? (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              className="mt-4 text-sm text-[var(--accent)] underline"
              onClick={() => router.replace("/login")}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <p className="animate-pulse text-sm tracking-wide uppercase opacity-70">Finishing sign-in…</p>
        )}
      </div>
    </div>
  );
}
