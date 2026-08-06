import type { ReactNode } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { StorefrontGate } from "../StorefrontGate";
import { CartDrawer } from "@/components/organisms/CartDrawer";
import { getServerTenant } from "@/lib/serverTenant";

/**
 * Loop 10 v2 — metadata mais específica que a baseline de `(public)/layout.tsx`, só pra tudo sob
 * `/loja`: título/descrição vêm de `storefront.metaTitle`/`metaDescription` quando o tenant
 * configurou (Settings → "Loja Online"), com fallback `${tenant.name} — Loja Online` — todo tenant
 * tem algo correto desde o primeiro dia, sem exigir configuração.
 */
export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const tenant = await getServerTenant(h.get("host") ?? "");
  const name = tenant?.name || "Kivoni";
  const title = tenant?.storefront?.metaTitle || `${name} — Loja Online`;
  const description = tenant?.storefront?.metaDescription || `Compre produtos ${name} online.`;
  const favicon = tenant?.branding?.faviconUrl;
  const logo = tenant?.branding?.logoUrl;

  return {
    title,
    description,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: {
      title,
      description,
      images: logo ? [logo] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: logo ? [logo] : undefined,
    },
  };
}

/**
 * Loop 5b — `StorefrontGate` mora aqui (não no `(public)/layout.tsx` compartilhado): o toggle
 * "Loja ativa" (`storefront.enabled`) deve derrubar só a experiência de e-commerce, não o
 * `/catalogo` (utilidade de atacado via WhatsApp que o lojista pode querer manter no ar mesmo com
 * a loja online em manutenção). `CartDrawer` (trigger flutuante + painel) fica montado uma vez
 * aqui, cobrindo `/loja` inteiro (home + PDP).
 */
export default function LojaLayout({ children }: { children: ReactNode }) {
  return (
    <StorefrontGate>
      {children}
      <CartDrawer />
    </StorefrontGate>
  );
}
