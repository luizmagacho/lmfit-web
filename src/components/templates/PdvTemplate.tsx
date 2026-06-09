"use client";

import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { lmfitLogoSrc, lmfitTokens } from "@/theme/tokens";
import Image from "next/image";
import type { ReactNode } from "react";
import { useTenant } from "@/context/TenantContext";

export function PdvTemplate({
  search,
  children,
  cart,
}: {
  search: ReactNode;
  children: ReactNode;
  cart: ReactNode;
}) {
  const { tenant, slug } = useTenant();
  const logoUrl = tenant?.branding?.logoUrl || (slug === "lmfit" ? lmfitLogoSrc : "/kivo-logo.png");
  const storeName = tenant?.name || (slug === "lmfit" ? "LM FIT" : "Kivo");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--lmfit-surface,#f6f6f6)]">
      <header
        className="sticky top-0 z-40 border-b bg-[var(--card-bg)] flex items-center gap-3 px-3 py-2"
        style={{ borderColor: lmfitTokens.border }}
      >
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm"
          style={{ color: lmfitTokens.text }}
          aria-label="Voltar para o painel"
        >
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative hidden sm:block h-8 w-24 shrink-0">
            <Image src={logoUrl} alt={storeName} fill className="object-contain" />
          </div>
          <h1 className="text-sm font-semibold truncate" style={{ color: lmfitTokens.text }}>
            PDV · Lançamento em grade ({storeName})
          </h1>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: lmfitTokens.textMuted }} aria-hidden />
          <div className="pl-7 sm:w-80">{search}</div>
        </div>
      </header>
      <main className="flex-1 p-3 space-y-3 max-w-3xl w-full mx-auto">{children}</main>
      {cart}
    </div>
  );
}
