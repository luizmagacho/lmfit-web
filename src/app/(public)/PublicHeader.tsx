"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { useCatalogStore } from "@/stores/useCatalogStore";
import { resolveLayoutFamily } from "@/layouts/storefront/resolveLayoutFamily";
import type { FamilyHeaderProps } from "@/layouts/storefront/types";
import { ClassicHeader } from "@/layouts/storefront/classic/ClassicHeader";
import { EditorialHeader } from "@/layouts/storefront/editorial/EditorialHeader";
import { MinimalHeader } from "@/layouts/storefront/minimal/MinimalHeader";
import { ExpressiveHeader } from "@/layouts/storefront/expressive/ExpressiveHeader";
import { IndustrialHeader } from "@/layouts/storefront/industrial/IndustrialHeader";
import { prefersReducedMotion } from "@/components/organisms/ScrollReveal";

/** Loop 25 — esconde o header ao rolar pra baixo, traz de volta ao rolar pra cima. Único pra
 *  todos os presets (não diferenciado por família, é assim que o plano descreve). Com
 *  `prefers-reduced-motion`, nunca esconde — o header fica sempre visível, sem a lógica de
 *  scroll sequer rodando. */
function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion() || typeof window === "undefined") return;
    lastY.current = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      const goingDown = y > lastY.current;
      setHidden(goingDown && y > 80);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}

/** Loop 12 — dispatcher de família de layout: este componente é o dono do ESTADO (busca, rota);
 *  a família escolhida pelo preset do tenant decide só a ESTRUTURA visual do header. */
export function PublicHeader() {
  const { tenant } = useTenant();
  const pathname = usePathname();
  const router = useRouter();
  const setCatalogFilter = useCatalogStore((s) => s.setFilter);
  const [searchDraft, setSearchDraft] = useState("");
  const hidden = useHideOnScroll();

  // payment-simulation já renderiza sua própria logo — evita duplicar
  if (pathname?.startsWith("/checkout/payment-simulation")) return null;

  // /catalogo (atacado/WhatsApp) e /loja (e-commerce) são duas seções distintas — logo e busca
  // ficam dentro da seção atual em vez de sempre pular pra uma "home" fixa.
  const isCatalogo = pathname?.startsWith("/catalogo");
  const homeHref = isCatalogo ? "/catalogo" : "/loja";

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    // A busca em si já é 100% client-side (useCatalogStore, filtrado no grid da seção) — o header
    // só seta o filtro global e leva pra seção atual, que já sabe renderizar o resultado.
    setCatalogFilter({ search: searchDraft });
    if (pathname !== homeHref) router.push(homeHref);
  }

  const props: FamilyHeaderProps = { tenant, homeHref, searchDraft, setSearchDraft, submitSearch };

  let header: React.ReactNode;
  switch (resolveLayoutFamily(tenant?.storefront?.themePreset)) {
    case "editorial":
      header = <EditorialHeader {...props} />;
      break;
    case "minimal":
      header = <MinimalHeader {...props} />;
      break;
    case "expressive":
      header = <ExpressiveHeader {...props} />;
      break;
    case "industrial":
      header = <IndustrialHeader {...props} />;
      break;
    case "classic":
    default:
      header = <ClassicHeader {...props} />;
  }

  return (
    <div
      className="sticky top-0 z-30 bg-[var(--lmfit-surface)]"
      style={{
        transform: hidden ? "translateY(-100%)" : "translateY(0)",
        transitionProperty: "transform",
        transitionDuration: "var(--kivoni-storefront-motion-duration)",
        transitionTimingFunction: "var(--kivoni-storefront-motion-easing)",
      }}
    >
      {header}
    </div>
  );
}
