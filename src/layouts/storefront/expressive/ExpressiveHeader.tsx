"use client";

import * as React from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { lmfitTokens } from "@/theme/tokens";
import { CategoryChips } from "@/components/organisms/CategoryChips";
import type { FamilyHeaderProps } from "../types";

/** Família expressive (Farm Rio): faixa colorida na cor de acento do tenant, logo em destaque,
 *  busca em pill — alegre e chamativo desde a primeira dobra. Loop V4-1: ganha uma segunda faixa,
 *  clara (contraste com a cor de acento), com `CategoryChips` — a "vitrine por print/categoria" da
 *  referência Farm Rio, que antes não tinha nenhum mecanismo de navegação. */
export function ExpressiveHeader({ tenant, homeHref, searchDraft, setSearchDraft, submitSearch }: FamilyHeaderProps) {
  return (
    <header className="-mx-4 mb-4 rounded-b-3xl overflow-hidden">
      <div
        className="px-4 py-4 flex items-center gap-3"
        style={{ backgroundColor: lmfitTokens.primary }}
      >
        <Link href={homeHref} className="inline-flex items-center gap-2 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tenant?.branding?.logoUrl || "/kivoni-symbol.svg"}
            alt={tenant?.name || "Kivoni"}
            className="h-9 w-auto object-contain object-left max-w-[140px] rounded-lg bg-white/90 p-0.5"
          />
          <span className="storefront-brand-heading font-bold text-base text-white">
            {tenant?.name}
          </span>
        </Link>
        <form onSubmit={submitSearch} className="flex-1 min-w-0 max-w-xs ml-auto relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/70"
            aria-hidden
          />
          <input
            type="search"
            inputMode="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Buscar produto…"
            aria-label="Buscar produto"
            className="w-full min-h-9 rounded-full pl-9 pr-3 text-sm bg-white/20 text-white placeholder:text-white/70 border border-white/40 outline-none focus:bg-white/30"
          />
        </form>
        <Link
          href="/conta"
          aria-label="Minha conta"
          className="flex-shrink-0 p-2 rounded-full text-white bg-white/15"
        >
          <User size={18} />
        </Link>
      </div>
      <div className="bg-[var(--card-bg)]">
        <CategoryChips />
      </div>
    </header>
  );
}
