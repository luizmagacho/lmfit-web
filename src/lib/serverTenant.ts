import { apiBaseUrl } from "./apiBase";

/**
 * Loop 10 v2 — resolução de tenant no SERVIDOR (Server Components/`generateMetadata`/`sitemap.ts`).
 * `getTenantSlug()` (tenantSlug.ts) só funciona no cliente (`typeof window === "undefined"` retorna
 * cedo); reaproveitar `publicHttp.ts` aqui seria pior — seu branch de SSR lê `document.cookie`, que
 * não existe num render real do Next no servidor, e sempre resolveria pra "kivoni". Esta função
 * espelha exatamente a mesma lógica de host que `middleware.ts` já usa (única fonte da verdade —
 * `middleware.ts` importa daqui em vez de duplicar o if/else).
 */
export function resolveTenantSlugFromHost(host: string): string {
  const hostname = host.split(":")[0];

  // Dev local: "loja.localhost:3000" ou "loja.localhost"
  if (hostname.includes(".localhost") || host.includes(".localhost:")) {
    const parts = host.split(".localhost")[0];
    if (parts && parts !== "localhost") {
      return parts;
    }
  }
  // Produção: "loja.kivoni.com.br"
  else if (hostname.endsWith(".kivoni.com.br") || host.includes(".kivoni.com.br")) {
    const parts = host.split(".kivoni.com.br")[0];
    if (parts && parts !== "www" && parts !== "admin") {
      return parts;
    }
  }
  // Domínio legado da LMFit (crm.lmfit.com.br, www.lmfit.com.br, …) → loja lmfit
  else if (hostname.endsWith("lmfit.com.br")) {
    return "lmfit";
  }

  return "";
}

export interface ServerTenantBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface ServerTenant {
  slug: string;
  name: string;
  branding?: ServerTenantBranding;
  storefront?: {
    /** Loop 10 v2 — flat na `StorefrontConfig` (mesma convenção de todo outro campo opcional),
     *  não aninhado em `seo`. */
    metaTitle?: string;
    metaDescription?: string;
    [key: string]: unknown;
  };
}

/**
 * Busca o tenant a partir do host (fallback: slug explícito, útil quando o resolver já rodou).
 * `fetch` puro (não `publicHttp`/axios) — roda no processo do servidor Next, não no navegador.
 * `revalidate: 60` porque branding/SEO mudam raramente; mantém `generateMetadata`/`sitemap.ts` baratos.
 */
export async function getServerTenant(hostOrSlug: string): Promise<ServerTenant | null> {
  const slug = hostOrSlug.includes(".") || hostOrSlug.includes(":")
    ? resolveTenantSlugFromHost(hostOrSlug) || "kivoni"
    : hostOrSlug;
  try {
    const res = await fetch(`${apiBaseUrl()}/public/tenants/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ServerTenant;
  } catch {
    return null;
  }
}

export interface ServerProductVariant {
  size?: string;
  color?: string;
  quantityInStock?: unknown;
  quantityOnHand?: unknown;
}

export type ServerProduct = Record<string, unknown> & {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  /** `BrlMoneyResponseInterceptor` formata todo campo de dinheiro como string BRL na resposta HTTP
   *  ("R$ 299,90") — nunca um número puro. Use `extractServerPrice()` pra ler o valor real. */
  priceRetail?: unknown;
  primaryImageUrl?: string;
  images?: string[];
  variants?: ServerProductVariant[];
};

/** Mesma lógica de `ProductGrid.tsx`'s `extractPrice()` — duplicada aqui (não importada) porque
 *  aquele arquivo é `"use client"` e este helper roda em Server Components. */
export function extractServerPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

export function serverProductInStock(p: ServerProduct): boolean {
  if (Array.isArray(p.variants) && p.variants.length > 0) {
    return p.variants.some((v) => {
      const qty =
        typeof v.quantityOnHand === "number"
          ? v.quantityOnHand
          : typeof v.quantityInStock === "number"
            ? v.quantityInStock
            : undefined;
      return typeof qty === "number" && qty > 0;
    });
  }
  return true;
}

export async function getServerProduct(
  hostOrSlug: string,
  productSlug: string,
): Promise<ServerProduct | null> {
  const tenantSlug = hostOrSlug.includes(".") || hostOrSlug.includes(":")
    ? resolveTenantSlugFromHost(hostOrSlug) || "kivoni"
    : hostOrSlug;
  try {
    const res = await fetch(
      `${apiBaseUrl()}/public/catalog/products/${encodeURIComponent(productSlug)}`,
      {
        headers: { "x-tenant-slug": tenantSlug },
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as ServerProduct;
  } catch {
    return null;
  }
}
