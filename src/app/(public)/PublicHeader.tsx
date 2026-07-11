"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenant } from "@/context/TenantContext";

export function PublicHeader() {
  const { tenant } = useTenant();
  const pathname = usePathname();

  // payment-simulation já renderiza sua própria logo — evita duplicar
  if (pathname?.startsWith("/checkout/payment-simulation")) return null;

  return (
    <header className="flex items-center gap-3 pb-4 mb-2 border-b border-[var(--lmfit-border)]">
      <Link href="/catalogo" className="inline-flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tenant?.branding?.logoUrl || "/kivoni-symbol.svg"}
          alt={tenant?.name || "Kivoni"}
          className="h-8 w-auto object-contain object-left max-w-[140px]"
        />
        <span className="font-semibold text-sm text-[var(--foreground)]">
          {tenant?.name}
        </span>
      </Link>
    </header>
  );
}
