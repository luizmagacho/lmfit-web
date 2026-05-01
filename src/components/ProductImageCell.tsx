"use client";

import { ImageCarousel } from "@/components/ImageCarousel";
import { resolveProductImageUrls } from "@/lib/productImageUrl";

type Row = Record<string, unknown>;

export function ProductImageCell({ row }: { row: Row }) {
  const urls = resolveProductImageUrls(row);
  return <ImageCarousel urls={urls} size="sm" />;
}
