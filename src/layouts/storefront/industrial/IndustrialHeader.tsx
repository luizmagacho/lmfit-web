"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Search, User } from "lucide-react";
import type { FamilyHeaderProps } from "../types";

/** Família industrial (Off-White): borda inferior preta 3px, tudo reto (radius 0 vem do token),
 *  links com aspas literais — "LOJA", "CONTA" — e tipografia mono do preset. Loop 21 — seta
 *  (`ArrowUpRight`) como acento antes de cada link, motivo gráfico recorrente do Off-White. */
export function IndustrialHeader({ tenant, homeHref, searchDraft, setSearchDraft, submitSearch }: FamilyHeaderProps) {
  return (
    <header className="mb-4 pb-3 flex items-center gap-3" style={{ borderBottom: "3px solid #000" }}>
      <Link href={homeHref} className="inline-flex items-center gap-2 flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tenant?.branding?.logoUrl || "/kivoni-symbol.svg"}
          alt={tenant?.name || "Kivoni"}
          className="h-8 w-auto object-contain object-left max-w-[130px]"
          style={{ border: "2px solid #000" }}
        />
        <span className="storefront-brand-heading text-sm text-[var(--foreground)]">
          “{tenant?.name}”
        </span>
      </Link>
      <nav className="hidden sm:flex items-center gap-4 ml-2 text-xs font-bold uppercase" aria-label="Navegação">
        <Link href="/loja" className="inline-flex items-center gap-0.5 hover:underline text-[var(--foreground)]">
          <ArrowUpRight size={11} aria-hidden />
          “LOJA”
        </Link>
        <Link href="/devolucoes" className="inline-flex items-center gap-0.5 hover:underline text-[var(--foreground)]">
          <ArrowUpRight size={11} aria-hidden />
          “TROCAS”
        </Link>
      </nav>
      <form onSubmit={submitSearch} className="flex-1 min-w-0 max-w-xs ml-auto relative">
        <Search
          size={15}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--foreground)]"
          aria-hidden
        />
        <input
          type="search"
          inputMode="search"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder='"BUSCAR"'
          aria-label="Buscar produto"
          className="w-full min-h-9 pl-8 pr-2 text-xs uppercase bg-transparent outline-none text-[var(--foreground)]"
          style={{ border: "2px solid #000", borderRadius: 0 }}
        />
      </form>
      <Link href="/conta" aria-label="Minha conta" className="flex-shrink-0 p-2 text-[var(--foreground)]">
        <User size={18} />
      </Link>
    </header>
  );
}
