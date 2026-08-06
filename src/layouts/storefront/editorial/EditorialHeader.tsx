"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { lmfitTokens } from "@/theme/tokens";
import type { FamilyHeaderProps } from "../types";

/** Família editorial (Zara/Chanel): logo centralizada em destaque, navegação textual discreta,
 *  hide-on-scroll — o header some ao rolar pra baixo (a foto manda) e volta ao rolar pra cima. */
export function EditorialHeader({ tenant, homeHref, searchDraft, setSearchDraft, submitSearch }: FamilyHeaderProps) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      // Esconde só depois de passar do topo (>120px) e rolando pra BAIXO; qualquer rolagem pra
      // cima traz de volta — padrão hide-on-scroll clássico das lojas editoriais.
      setHidden(y > 120 && y > lastY.current);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 -mx-4 px-4 pt-2 pb-3 mb-2 transition-transform bg-[var(--lmfit-surface)]"
      style={{
        transform: hidden ? "translateY(-110%)" : "translateY(0)",
        transitionDuration: "var(--kivoni-storefront-motion-duration)",
        transitionTimingFunction: "var(--kivoni-storefront-motion-easing)",
      }}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <form onSubmit={submitSearch} className="relative max-w-[160px]">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none"
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
            className="w-full min-h-8 border-b bg-transparent pl-7 pr-1 text-xs outline-none"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />
        </form>

        <Link href={homeHref} className="flex flex-col items-center gap-1 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tenant?.branding?.logoUrl || "/kivoni-symbol.svg"}
            alt={tenant?.name || "Kivoni"}
            className="h-9 w-auto object-contain"
          />
          <span className="storefront-brand-heading text-base text-[var(--foreground)]">
            {tenant?.name}
          </span>
        </Link>

        <div className="flex justify-end">
          <Link
            href="/conta"
            aria-label="Minha conta"
            className="p-2"
            style={{ color: lmfitTokens.textMuted }}
          >
            <User size={18} />
          </Link>
        </div>
      </div>

      <nav className="flex justify-center gap-6 mt-2 text-xs tracking-wide" aria-label="Navegação">
        <Link href="/loja" className="hover:opacity-70" style={{ color: lmfitTokens.text }}>
          Loja
        </Link>
        <Link href="/quem-somos" className="hover:opacity-70" style={{ color: lmfitTokens.textMuted }}>
          Quem somos
        </Link>
        <Link href="/contato" className="hover:opacity-70" style={{ color: lmfitTokens.textMuted }}>
          Contato
        </Link>
      </nav>
    </header>
  );
}
