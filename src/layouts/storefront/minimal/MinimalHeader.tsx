"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { lmfitTokens } from "@/theme/tokens";
import { CategoryChips } from "@/components/organisms/CategoryChips";
import { useThemePreset } from "@/context/TenantContext";
import type { FamilyHeaderProps } from "../types";

/** Família minimal (Calvin Klein/Lululemon/COS) — Loop V4-1: os 3 presets tinham o MESMO header
 *  sem nenhuma nav, apesar de referências opostas (austero/acolhedor/anti-design). Cada um ganha
 *  seu próprio tratamento:
 *  - **Luxo** (Calvin Klein, "cromo quase zero"): logo centralizada, busca vira ícone que só
 *    expande em input ao clicar — sem nav nenhuma, ainda mais vazio que antes (fidelidade
 *    deliberada, não uma omissão).
 *  - **Wellness** (Lululemon, "compre por atividade"): ganha `CategoryChips` como segunda linha —
 *    realocado de `MinimalHome.tsx`, é aqui que uma nav de verdade pertence.
 *  - **Minimal** (COS, anti-design): nav só de texto, seca, sem ícone/pill/borda — o oposto do
 *    pill do Wellness e do vazio do Luxo. */
export function MinimalHeader({ tenant, homeHref, searchDraft, setSearchDraft, submitSearch }: FamilyHeaderProps) {
  const preset = useThemePreset();
  const isWellness = preset === "studio";
  const [searchOpen, setSearchOpen] = useState(false);

  if (preset === "luxo") {
    return (
      <header className="py-8 mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div />
        <Link href={homeHref} className="inline-flex items-center gap-2.5 justify-self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tenant?.branding?.logoUrl || "/kivoni-symbol.svg"}
            alt={tenant?.name || "Kivoni"}
            className="h-7 w-auto object-contain max-w-[130px]"
          />
          <span className="storefront-brand-heading text-sm text-[var(--foreground)]">
            {tenant?.name}
          </span>
        </Link>
        <div className="flex items-center gap-1 justify-self-end">
          {searchOpen ? (
            <form onSubmit={submitSearch} className="relative w-28">
              <input
                autoFocus
                type="search"
                inputMode="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onBlur={() => !searchDraft && setSearchOpen(false)}
                placeholder="Buscar"
                aria-label="Buscar produto"
                className="w-full min-h-8 border-b bg-transparent pr-1 text-xs outline-none focus:border-current"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
            </form>
          ) : (
            <button
              type="button"
              aria-label="Buscar produto"
              onClick={() => setSearchOpen(true)}
              className="p-1.5"
              style={{ color: lmfitTokens.textMuted }}
            >
              <Search size={16} strokeWidth={1.5} />
            </button>
          )}
          <Link
            href="/conta"
            aria-label="Minha conta"
            className="p-1.5"
            style={{ color: lmfitTokens.textMuted }}
          >
            <User size={17} strokeWidth={1.5} />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="flex flex-col gap-2 py-6 mb-4">
      <div className="flex items-center gap-4">
        <Link href={homeHref} className="inline-flex items-center gap-2.5 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tenant?.branding?.logoUrl || "/kivoni-symbol.svg"}
            alt={tenant?.name || "Kivoni"}
            className="h-6 w-auto object-contain object-left max-w-[110px]"
          />
          <span className="storefront-brand-heading text-sm text-[var(--foreground)]">
            {tenant?.name}
          </span>
        </Link>
        <form onSubmit={submitSearch} className="flex-1 min-w-0 max-w-[200px] ml-auto relative">
          <Search
            size={14}
            className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: lmfitTokens.textMuted }}
            aria-hidden
          />
          <input
            type="search"
            inputMode="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Buscar"
            aria-label="Buscar produto"
            className="w-full min-h-8 border-b bg-transparent pl-6 pr-1 text-xs outline-none focus:border-current"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />
        </form>
        <Link
          href="/conta"
          aria-label="Minha conta"
          className="flex-shrink-0 p-1.5"
          style={{ color: lmfitTokens.textMuted }}
        >
          <User size={17} strokeWidth={1.5} />
        </Link>
      </div>
      {isWellness ? (
        <CategoryChips />
      ) : (
        <nav aria-label="Navegação" className="flex gap-5 text-[11px] uppercase tracking-[0.15em]">
          <Link href="/loja" style={{ color: lmfitTokens.text }}>
            Loja
          </Link>
          <Link href="/quem-somos" style={{ color: lmfitTokens.textMuted }}>
            Quem somos
          </Link>
          <Link href="/contato" style={{ color: lmfitTokens.textMuted }}>
            Contato
          </Link>
        </nav>
      )}
    </header>
  );
}
