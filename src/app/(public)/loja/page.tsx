import { headers } from "next/headers";
import { getServerTenant } from "@/lib/serverTenant";
import { LojaClient } from "./LojaClient";

export const dynamic = "force-dynamic";

/**
 * Loop 10 v2 — `Organization`/`OnlineStore` JSON-LD a partir do tenant real (nome/logo/url), lido
 * server-side pelo mesmo helper que `generateMetadata` já usa. `LojaClient` (client component)
 * segue cuidando de toda a busca/renderização do catálogo — este arquivo só acrescenta os dados
 * estruturados, sem mudar como a página funciona.
 */
export default async function LojaPage() {
  const h = await headers();
  const host = h.get("host") ?? "";
  const tenant = await getServerTenant(host);
  const origin = `${host.includes("localhost") ? "http" : "https"}://${host}`;

  const jsonLd = tenant
    ? {
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        name: tenant.name,
        url: `${origin}/loja`,
        logo: tenant.branding?.logoUrl,
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
      <LojaClient />
    </>
  );
}
