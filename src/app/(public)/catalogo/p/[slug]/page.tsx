import { ProductDetailClient } from "./ProductDetailClient";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <ProductDetailClient slug={resolvedParams.slug} />;
}
