"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";
import { resolveLayoutFamily } from "@/layouts/storefront/resolveLayoutFamily";

const INSTITUTIONAL_LINKS = [
  { href: "/quem-somos", label: "Quem somos" },
  { href: "/como-comprar", label: "Como comprar" },
  { href: "/guia-medidas", label: "Guia de medidas" },
  { href: "/devolucoes", label: "Trocas e devoluções" },
  { href: "/contato", label: "Contato" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos de uso" },
];

/** Rodapé institucional (Loop 4; Loop 12 tornou a ESTRUTURA por família — variantes pequenas o
 *  bastante pra viverem num switch aqui em vez de 5 arquivos). Links e conteúdo são os mesmos em
 *  todas: só muda arranjo/peso visual. */
export function StorefrontFooter() {
  const { tenant } = useTenant();
  const pathname = usePathname();

  if (pathname?.startsWith("/checkout/payment-simulation")) return null;

  const whatsapp = tenant?.whatsappNumber?.replace(/\D/g, "");
  const brand = tenant?.name || "Kivoni";
  const year = new Date().getFullYear();
  const family = resolveLayoutFamily(tenant?.storefront?.themePreset);

  if (family === "industrial") {
    return (
      <footer className="mt-10 px-4 py-8 text-xs" style={{ backgroundColor: "#000", color: "#fff" }}>
        <div className="max-w-7xl mx-auto space-y-3" style={{ fontFamily: "'Space Mono', monospace" }}>
          <p className="storefront-brand-heading text-sm">“{brand}”</p>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 uppercase">
            {INSTITUTIONAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="underline text-white/80 hover:text-white">
                “{link.label}”
              </Link>
            ))}
          </nav>
          {whatsapp ? (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-block underline">
              “WHATSAPP”
            </a>
          ) : null}
          <p className="text-white/60">© {year} {brand}. TODOS OS DIREITOS RESERVADOS.</p>
        </div>
      </footer>
    );
  }

  if (family === "expressive") {
    return (
      <footer
        className="mt-10 px-4 py-8 text-center text-xs rounded-t-3xl"
        style={{ backgroundColor: lmfitTokens.primary, color: "#fff" }}
      >
        <p className="storefront-brand-heading font-bold text-base">{brand}</p>
        <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
          {INSTITUTIONAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="underline text-white/90 hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        {whatsapp ? (
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block px-4 py-1.5 rounded-full bg-white/15 font-semibold"
          >
            Fale conosco no WhatsApp
          </a>
        ) : null}
        <p className="mt-3 text-white/75">© {year} {brand}. Todos os direitos reservados.</p>
      </footer>
    );
  }

  if (family === "classic") {
    return (
      <footer
        className="mt-10 border-t px-4 py-8 text-xs"
        style={{ borderColor: "var(--kivoni-border)", color: lmfitTokens.textMuted }}
      >
        <div className="max-w-7xl mx-auto grid gap-6 sm:grid-cols-3">
          <div className="space-y-1.5">
            <p className="storefront-brand-heading font-medium text-sm" style={{ color: lmfitTokens.text }}>
              {brand}
            </p>
            <p>© {year} {brand}.</p>
            <p>Todos os direitos reservados.</p>
          </div>
          <nav className="flex flex-col gap-1.5" aria-label="Institucional">
            {INSTITUTIONAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="underline w-fit" style={{ color: lmfitTokens.textMuted }}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div>
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block underline"
                style={{ color: lmfitTokens.primary }}
              >
                Fale conosco no WhatsApp
              </a>
            ) : null}
          </div>
        </div>
      </footer>
    );
  }

  // editorial + minimal: linha central discreta (a estrutura que o rodapé sempre teve).
  return (
    <footer
      className="mt-10 border-t px-4 py-6 text-center text-xs"
      style={{ borderColor: "var(--kivoni-border)", color: lmfitTokens.textMuted }}
    >
      <p className="storefront-brand-heading font-medium" style={{ color: lmfitTokens.text }}>
        {brand}
      </p>
      <nav className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {INSTITUTIONAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="underline" style={{ color: lmfitTokens.textMuted }}>
            {link.label}
          </Link>
        ))}
      </nav>
      {whatsapp ? (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block underline"
          style={{ color: lmfitTokens.primary }}
        >
          Fale conosco no WhatsApp
        </a>
      ) : null}
      <p className="mt-2">© {year} {brand}. Todos os direitos reservados.</p>
    </footer>
  );
}
