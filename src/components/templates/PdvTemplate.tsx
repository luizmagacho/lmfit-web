"use client";

import Link from "next/link";
import { ArrowLeft, LogOut, Search } from "lucide-react";
import { lmfitLogoSrc, lmfitTokens } from "@/theme/tokens";
import Image from "next/image";
import type { ReactNode } from "react";
import { useTenant } from "@/context/TenantContext";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

export function PdvTemplate({
  search,
  children,
  cart,
}: {
  search: ReactNode;
  children: ReactNode;
  cart: ReactNode;
}) {
  const { tenant } = useTenant();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const role = useAuthStore((s) => s.user?.role);
  const logout = useAuthStore((s) => s.logout);
  // `vendedor` não tem acesso a mais nenhuma tela do painel — não faz sentido mostrar um link
  // que só vai bater de volta aqui; ele precisa, em troca, de um jeito de sair sem passar pelo
  // menu lateral (que esse papel nunca vê).
  const isVendedor = role === "vendedor";

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogout() {
    await logout();
    window.location.href = "/login";
  }

  const logoUrl = tenant?.branding?.logoUrl || "/kivoni-symbol.svg";
  const storeName = tenant?.name || "Kivoni";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--lmfit-surface,#f6f6f6)]">
      <header
        className="sticky top-0 z-40 border-b bg-[var(--card-bg)] flex items-center gap-3 px-3 py-2"
        style={{ borderColor: lmfitTokens.border }}
      >
        {isVendedor ? null : (
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: lmfitTokens.text }}
            aria-label="Voltar para o painel"
          >
            <ArrowLeft size={18} aria-hidden />
          </Link>
        )}
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
        {isVendedor ? (
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 text-sm shrink-0 px-2 py-1 rounded-md border"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={16} aria-hidden />
            <span className="hidden sm:inline">Sair</span>
          </button>
        ) : null}
      </header>
      <main className="flex-1 p-3 space-y-3 max-w-3xl w-full mx-auto">{children}</main>
      {cart}
    </div>
  );
}
