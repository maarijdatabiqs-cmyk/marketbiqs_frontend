"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui";

export default function HomePage() {
  const { user, agency, loading, needsBootstrap } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && needsBootstrap) {
      router.replace("/register?oauth=1");
      return;
    }
    if (user && agency) {
      router.replace(agency.onboarding_completed ? "/dashboard" : "/onboarding");
    }
  }, [user, agency, loading, needsBootstrap, router]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b2e2a]/92 via-[#123d37]/88 to-[#1c1914]/90" />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 sm:px-6 py-12 sm:py-16 text-white">
        <div className="font-[family-name:var(--font-display)] text-4xl sm:text-6xl md:text-7xl tracking-tight text-[#0f766e] leading-[1.05]">
          MarketBiqs
        </div>
        <p className="mt-4 max-w-xl text-base sm:text-lg text-white/80">
          Multi-client competitive intelligence for marketing agencies — white-label reports, trend intel, and research ops that scale with every retainer.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 w-full sm:w-auto">
          <Link href="/register" className="w-full sm:w-auto">
            <Button className="!bg-[#f3f0e8] !text-[#14231f] w-full sm:w-auto">Start free onboarding</Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="ghost" className="!border-white/30 !text-white hover:!bg-white/10 w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
