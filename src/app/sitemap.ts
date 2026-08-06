import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { apiBaseUrl } from "@/lib/apiBase";
import { resolveTenantSlugFromHost } from "@/lib/serverTenant";
import { extractListItems } from "@/lib/normalizeApiList";

/**
 * Loop 10 v2 — sitemap por tenant: cada subdomínio serve seu próprio `/sitemap.xml`, resolvido a
 * partir do `host` da própria requisição (mesmo resolver server-side usado por `generateMetadata`).
 * Reaproveita `GET /public/catalog/products` com um limite alto — mesmo padrão que
 * `LojaClient.tsx`'s `EDITORIAL_SCAN_LIMIT` já usa pra varrer o catálogo inteiro.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const slug = resolveTenantSlugFromHost(host) || "kivoni";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  const entries: MetadataRoute.Sitemap = [
    { url: `${origin}/loja`, changeFrequency: "daily", priority: 1 },
  ];

  try {
    const res = await fetch(`${apiBaseUrl()}/public/catalog/products?limit=500`, {
      headers: { "x-tenant-slug": slug },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = (await res.json()) as unknown;
      const items = extractListItems(data) as Array<{ slug?: string; updatedAt?: string }>;
      for (const item of items) {
        if (!item.slug) continue;
        entries.push({
          url: `${origin}/loja/p/${item.slug}`,
          lastModified: item.updatedAt ? new Date(item.updatedAt) : undefined,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Sitemap parcial (só a home) é melhor que um 500 se a API estiver fora do ar.
  }

  return entries;
}
