"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { publicHttp } from "@/lib/publicHttp";
import { extractListItems } from "@/lib/normalizeApiList";
import { useCatalogStore } from "@/stores/useCatalogStore";
import { useCartStore } from "@/stores/useCartStore";
import { useTenant } from "@/context/TenantContext";
import { HeroBanner } from "@/components/organisms/HeroBanner";
import { TrustBar } from "@/components/organisms/TrustBar";
import { CouponBanner } from "@/components/organisms/CouponBanner";
import { NewArrivalsShelf } from "@/components/organisms/NewArrivalsShelf";
import { Lookbook } from "@/components/organisms/Lookbook";
import { CatalogFilters } from "@/components/organisms/CatalogFilters";
import { ProductGrid, productIsNew, type CatalogProduct } from "@/components/organisms/ProductGrid";
import { lmfitTokens } from "@/theme/tokens";
import { resolveLayoutFamily } from "@/layouts/storefront/resolveLayoutFamily";
import type { HomeSlots } from "@/layouts/storefront/types";
import { ClassicHome } from "@/layouts/storefront/classic/ClassicHome";
import { EditorialHome } from "@/layouts/storefront/editorial/EditorialHome";
import { MinimalHome } from "@/layouts/storefront/minimal/MinimalHome";
import { ExpressiveHome } from "@/layouts/storefront/expressive/ExpressiveHome";
import { IndustrialHome } from "@/layouts/storefront/industrial/IndustrialHome";

/** Loop 19a — máximo de itens levados à vitrine de "Lançamentos" (rail das famílias editorial/
 *  atlético); mesmo critério e teto que `NewArrivalsShelf` já usa internamente pro próprio shelf,
 *  só exposto aqui como dado cru pra família que preferir renderizar como rail. */
const MAX_NEW_ITEMS = 8;

/** Alto o bastante pra trazer o catálogo inteiro numa única página — as vitrines editoriais
 *  (Lançamentos, Lookbook) precisam enxergar todo o catálogo pra cruzar `variantIds`/recência, não
 *  só a página atual; não há UI de paginação no `/loja` hoje, então uma busca única e generosa é o
 *  padrão mais simples que ainda atende as duas necessidades. */
const EDITORIAL_SCAN_LIMIT = 100;

export function LojaClient() {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const role = useCartStore((s) => s.role);
  const { category, size, color, priceMin, priceMax, sort } = useCatalogStore();
  const { tenant } = useTenant();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await publicHttp.get<unknown>("/public/catalog/products", {
          params: {
            limit: EDITORIAL_SCAN_LIMIT,
            category: category || undefined,
            size: size || undefined,
            color: color || undefined,
            priceMin: priceMin ?? undefined,
            priceMax: priceMax ?? undefined,
            sort,
          },
        });
        const list = extractListItems(data) as CatalogProduct[];
        if (!cancelled) {
          setItems(list.length ? list : (Array.isArray(data) ? (data as CatalogProduct[]) : []));
          setErr(null);
        }
      } catch {
        if (!cancelled) setErr("Não foi possível carregar a loja.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, size, color, priceMin, priceMax, sort]);

  // Loop 19a — religa a home à família de layout do preset (era código morto: os 5 `*Home` existiam
  // desde o Loop 12 mas nada aqui os importava; toda troca de preset renderizava a mesma estrutura
  // fixa abaixo, independente de família). O slot builder abaixo É essa estrutura de sempre — a
  // família `classic` (default) reproduz exatamente o que já existia, byte a byte (AC2).
  const slots: HomeSlots = {
    hero: <HeroBanner />,
    // Carrossel de banners (Loop de banners múltiplos) não exige heroTitle — cada slide tem seu
    // próprio texto opcional — então conta como "tem hero" mesmo sem o título único preenchido.
    hasHero: Boolean(tenant?.storefront?.heroTitle) || Boolean(tenant?.storefront?.heroBanners?.length),
    trustBar: <TrustBar />,
    coupon: <CouponBanner />,
    lookbook: <Lookbook items={items} role={role} />,
    newArrivals: <NewArrivalsShelf items={items} role={role} />,
    filtersBlock: (
      <>
        <CatalogFilters />
        {err ? (
          <p className="text-sm" style={{ color: lmfitTokens.error }}>
            {err}
          </p>
        ) : null}
      </>
    ),
    grid: <ProductGrid items={items} loading={loading} role={role} />,
    newItems: items.filter(productIsNew).slice(0, MAX_NEW_ITEMS),
  };

  switch (resolveLayoutFamily(tenant?.storefront?.themePreset)) {
    case "editorial":
      return <EditorialHome slots={slots} />;
    case "minimal":
      return <MinimalHome slots={slots} />;
    case "expressive":
      return <ExpressiveHome slots={slots} />;
    case "industrial":
      return <IndustrialHome slots={slots} tenant={tenant} />;
    case "classic":
    default:
      return <ClassicHome slots={slots} />;
  }
}
