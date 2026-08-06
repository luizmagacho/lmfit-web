import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/**
 * Loop 10 v2 — a lista de rotas privadas é a mesma em qualquer subdomínio (não depende de dado por
 * tenant), mas a URL do sitemap precisa ser absoluta e apontar pro host certo de cada subdomínio.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/checkout",
        "/pedido",
        "/conta",
        "/dashboard",
        "/crm",
        "/customers",
        "/drafts",
        "/escalations",
        "/financial",
        "/fiscal",
        "/integrations",
        "/inventory",
        "/invoices",
        "/locations",
        "/materials",
        "/orders",
        "/production",
        "/products",
        "/promotions",
        "/purchases",
        "/reports",
        "/returns",
        "/settings",
        "/suppliers",
        "/users",
        "/billing",
        "/pdv",
      ],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
