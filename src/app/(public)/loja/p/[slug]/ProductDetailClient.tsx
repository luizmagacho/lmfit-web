"use client";

import * as React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { publicHttp } from "@/lib/publicHttp";
import { resolveProductImageUrls } from "@/lib/productImageUrl";
import { useCartStore } from "@/stores/useCartStore";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";
import { VariantSelector } from "@/components/organisms/VariantSelector";
import { RelatedProducts } from "@/components/organisms/RelatedProducts";
import { ProductReviews } from "@/components/organisms/ProductReviews";
import { WishlistHeartButton } from "@/components/atoms/WishlistHeartButton";
import { Skeleton } from "@/components/atoms/Skeleton";
import { ImageCarousel } from "@/components/ImageCarousel";
import { documentId } from "@/lib/normalizeApiList";
import { resolveLayoutFamily } from "@/layouts/storefront/resolveLayoutFamily";
import type { PdpSlots } from "@/layouts/storefront/types";
import { ClassicPDP } from "@/layouts/storefront/classic/ClassicPDP";
import { EditorialPDP } from "@/layouts/storefront/editorial/EditorialPDP";
import { MinimalPDP } from "@/layouts/storefront/minimal/MinimalPDP";
import { ExpressivePDP } from "@/layouts/storefront/expressive/ExpressivePDP";
import { IndustrialPDP } from "@/layouts/storefront/industrial/IndustrialPDP";

export function ProductDetailClient({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const role = useCartStore((s) => s.role);
  const { tenant } = useTenant();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await publicHttp.get(`/public/catalog/products/${slug}`);
        if (!cancelled) {
          setProduct(data as Record<string, unknown>);
          setErr(null);
        }
      } catch {
        if (!cancelled) setErr("Produto não encontrado.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto pb-32">
        <Skeleton className="w-full aspect-square rounded-xl" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-6 w-1/3" />
        <div className="pt-6">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (err || !product) {
    return (
      <div className="space-y-6 text-center max-w-xl mx-auto py-12">
        <p style={{ color: lmfitTokens.error }}>{err || "Produto não encontrado."}</p>
        <Link
          href="/loja"
          className="inline-flex h-10 items-center justify-center rounded-md px-6 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          Voltar à Loja
        </Link>
      </div>
    );
  }

  const urls = resolveProductImageUrls(product);
  const name = String(product.name ?? "Produto");
  const desc = product.description ? String(product.description) : null;
  const composition = product.composition ? String(product.composition) : null;
  const careInstructions = product.careInstructions ? String(product.careInstructions) : null;
  const category = typeof product.category === "string" ? product.category : "";

  // Loop 19a — religa a PDP à família de layout do preset (era código morto: os 5 `*PDP` existiam
  // desde o Loop 12 mas nada aqui os importava). `ClassicPDP` traz de volta a galeria sticky de
  // duas colunas no desktop que o blueprint (STOREFRONT-V2.md §2.4) sempre previu — a versão em
  // coluna única abaixo era ela mesma um regresso (perdido na reconstrução pós-corrupção do iCloud
  // em 2026-07-26), não o comportamento que este loop precisa preservar byte a byte.
  const slots: PdpSlots = {
    backLink: (
      <Link
        href="/loja"
        className="inline-flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ color: lmfitTokens.primary }}
      >
        <ChevronLeft size={18} />
        Loja
      </Link>
    ),
    gallery: (
      <div
        className="relative w-full bg-neutral-100 rounded-xl overflow-hidden shadow-sm"
        style={{ aspectRatio: "4/5" }}
      >
        {urls.length > 0 ? (
          <ImageCarousel urls={urls} size="fill" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400">Sem foto</div>
        )}
        <div className="absolute top-3 right-3">
          <WishlistHeartButton productId={documentId(product)} size={22} />
        </div>
      </div>
    ),
    // Nenhuma família tem hoje uma tira de miniaturas separada — `ImageCarousel` já é auto-contido
    // (setas + dots); inventar uma agora expandiria o escopo deste loop além de "religar".
    thumbs: null,
    info: (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold" style={{ color: lmfitTokens.text }}>
            {name}
          </h1>
          {desc ? (
            <p className="text-sm leading-relaxed" style={{ color: lmfitTokens.textMuted }}>
              {desc}
            </p>
          ) : null}
          {composition ? (
            <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              <strong>Composição:</strong> {composition}
            </p>
          ) : null}
          {careInstructions ? (
            <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              <strong>Cuidados:</strong> {careInstructions}
            </p>
          ) : null}
        </div>
        <div className="h-px w-full bg-neutral-200" />
        <VariantSelector product={product} role={role} />
      </div>
    ),
    related: (
      <>
        <RelatedProducts productId={documentId(product)} category={category} role={role} />
        <ProductReviews productId={documentId(product)} />
      </>
    ),
    urls,
    productName: name,
  };

  switch (resolveLayoutFamily(tenant?.storefront?.themePreset)) {
    case "editorial":
      return <EditorialPDP slots={slots} />;
    case "minimal":
      return <MinimalPDP slots={slots} />;
    case "expressive":
      return <ExpressivePDP slots={slots} />;
    case "industrial":
      return <IndustrialPDP slots={slots} />;
    case "classic":
    default:
      return <ClassicPDP slots={slots} />;
  }
}
