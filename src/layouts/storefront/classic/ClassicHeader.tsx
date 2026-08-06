"use client";

import * as React from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { lmfitTokens } from "@/theme/tokens";
import { CategoryChips } from "@/components/organisms/CategoryChips";
import type { FamilyHeaderProps } from "../types";

/** Família classic (Renner/Nike/Adidas): logo à esquerda, busca proeminente, conta — e a barra de
 *  categorias em chips logo abaixo (navegação óbvia, o cliente encontra rápido). */
export function ClassicHeader({ tenant, homeHref, searchDraft, setSearchDraft, submitSearch }: FamilyHeaderProps) {
  return (
    <header className="mb-2">
      <div className="flex items-center gap-3 pb-4 border-b border-[var(--lmfit-border)]">
        <Link href={homeHref} className="inline-flex items-center gap-2 flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tenant?.branding?.logoUrl || "/kivoni-symbol.svg"}
            alt={tenant?.name || "Kivoni"}
            className="h-8 w-auto object-contain object-left max-w-[140px]"
          />
          <span className="storefront-brand-heading font-semibold text-sm text-[var(--foreground)]">
            {tenant?.name}
          </span>
        </Link>
        <form onSubmit={submitSearch} className="flex-1 min-w-0 max-w-xs ml-auto relative">
          <Search
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: lmfitTokens.textMuted }}
            aria-hidden
          />
          <input
            type="search"
            inputMode="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Buscar produto…"
            aria-label="Buscar produto"
            className="w-full min-h-9 border rounded-md pl-8 pr-2 text-sm bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />
        </form>
        <Link
          href="/conta"
          aria-label="Minha conta"
          className="flex-shrink-0 p-2 rounded-md"
          style={{ color: lmfitTokens.textMuted }}
        >
          <User size={18} />
        </Link>
      </div>
      {/* Chips fora do container central do layout ficariam desalinhados — CategoryChips já limita
          a própria largura (max-w) e o header vive dentro do container da página. */}
      <div className="border-b border-[var(--lmfit-border)] -mx-4">
        <CategoryChips />
      </div>
    </header>
  );
}
