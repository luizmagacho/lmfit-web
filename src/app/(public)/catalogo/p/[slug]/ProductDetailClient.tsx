"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { publicHttp } from "@/lib/publicHttp";
import { resolvePrimaryImageUrl, resolveProductImageUrls } from "@/lib/productImageUrl";
import { useAuthStore } from "@/stores/useAuthStore";
import { lmfitTokens } from "@/theme/tokens";
import { VariantGrid } from "@/components/organisms/VariantGrid";
import { Skeleton } from "@/components/atoms/Skeleton";
import { ImageCarousel } from "@/components/ImageCarousel";

export function ProductDetailClient({ slug }: { slug: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [product, setProduct] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const role = useAuthStore((s) => s.inferredRole());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await publicHttp.get(`/public/catalog/products/${slug}`);
        if (!cancelled) {
          setProduct(data);
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
          href="/catalogo"
          className="inline-flex h-10 items-center justify-center rounded-md px-6 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          Voltar ao Catálogo
        </Link>
      </div>
    );
  }

  const urls = resolveProductImageUrls(product);
  const name = String(product.name ?? "Produto");
  const desc = product.description ? String(product.description) : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-32">
      {/* Voltar */}
      <Link href="/catalogo" className="inline-flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: lmfitTokens.primary }}>
        <ChevronLeft size={18} />
        Catálogo
      </Link>

      {/* Imagem Principal */}
      <div className="relative w-full bg-neutral-100 rounded-xl overflow-hidden shadow-sm" style={{ aspectRatio: "4/5" }}>
        {urls.length > 0 ? (
          <ImageCarousel urls={urls} size="fill" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400">Sem foto</div>
        )}
      </div>

      {/* Informações Básicas */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold" style={{ color: lmfitTokens.text }}>
          {name}
        </h1>
        {desc && (
          <p className="text-sm leading-relaxed" style={{ color: lmfitTokens.textMuted }}>
            {desc}
          </p>
        )}
      </div>

      <div className="h-px w-full bg-neutral-200" />

      {/* Seleção de Tamanho/Cor usando o VariantGrid */}
      <div className="space-y-3">
        <h2 className="text-lg font-medium" style={{ color: lmfitTokens.text }}>
          Escolha suas peças
        </h2>
        <VariantGrid product={product} role={role} loading={false} />
      </div>
    </div>
  );
}
