import type { Metadata } from "next";
import { headers } from "next/headers";
import { getServerProduct, extractServerPrice, serverProductInStock } from "@/lib/serverTenant";
import { ProductDetailClient } from "./ProductDetailClient";

export const dynamic = "force-dynamic";

/**
 * Loop 10 v2 — título/descrição/OG/Twitter a partir do produto real, buscado server-side (mesmo
 * helper usado pelo `sitemap.ts`). O fetch client-side em `ProductDetailClient` continua existindo
 * sem mudança — isso é só metadata, não muda como a página renderiza/interage.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const h = await headers();
  const product = await getServerProduct(h.get("host") ?? "", slug);
  if (!product) return {};

  const title = product.name;
  const description = product.description || `Compre ${product.name}.`;
  const image = product.primaryImageUrl || product.images?.[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function LojaProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const h = await headers();
  const product = await getServerProduct(h.get("host") ?? "", slug);

  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description,
        image: product.primaryImageUrl || product.images?.[0],
        offers: {
          "@type": "Offer",
          price: extractServerPrice(product.priceRetail).toFixed(2),
          priceCurrency: "BRL",
          availability: serverProductInStock(product)
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        },
      }
    : null;

  return (
    <>
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}
      <ProductDetailClient slug={slug} />
    </>
  );
}
