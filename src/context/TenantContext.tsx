"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTenantStore, type TenantInfo } from "@/stores/useTenantStore";
import { getTenantSlug, isRealTenantResolved } from "@/lib/tenantSlug";

// Re-exporta com o nome antigo para manter compatibilidade com imports existentes
export { getTenantSlug as getTenantSlugFromHostname };

interface TenantContextProps {
  tenant: TenantInfo | null;
  loading: boolean;
  slug: string;
}

const TenantContext = createContext<TenantContextProps>({
  tenant: null,
  loading: true,
  slug: "kivoni",
});

/**
 * Uma cor de destaque só é segura para sobrescrever o tema se não for
 * quase preta nem quase branca — nesses extremos ela fica invisível em um
 * dos temas (a var inline vence a classe .dark).
 */
function isThemeSafeAccent(hex: string): boolean {
  let h = hex.replace(/^\s*#|\s*$/g, "");
  if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // Luminância relativa aproximada (0 = preto, 255 = branco)
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma > 40 && luma < 215;
}

function darkenHexColor(hex: string, percent: number): string {
  hex = hex.replace(/^\s*#|\s*$/g, "");
  if (hex.length === 3) {
    hex = hex.replace(/(.)/g, "$1$1");
  }
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent / 100))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent / 100))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent / 100))));

  const rHex = r.toString(16).padStart(2, "0");
  const gHex = g.toString(16).padStart(2, "0");
  const bHex = b.toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [slug, setSlug] = useState<string>("kivoni");
  const fetchTenant = useTenantStore((s) => s.fetchTenant);
  const tenant = useTenantStore((s) => s.tenant);
  const loading = useTenantStore((s) => s.loading);

  useEffect(() => {
    const activeSlug = getTenantSlug();
    setSlug(activeSlug);
    // Só busca o tenant se o slug foi resolvido de verdade
    // (subdomínio, cookie ou localStorage) — não usa o fallback "kivoni"
    // que causaria 404 na página de diretório de lojas (localhost sem subdomain)
    if (activeSlug && isRealTenantResolved()) {
      void fetchTenant(activeSlug);
    }
  }, [fetchTenant]);

  useEffect(() => {
    // Inject CSS variables for brand identity
    const root = document.documentElement;

    // If slug is kivoni, default to kivoni colors
    const defaultPrimary = "#7c3aed";
    const defaultSecondary = "#06b6d4";
    const defaultFavicon = "/kivoni-symbol.svg";

    const primary = tenant?.branding?.primaryColor || defaultPrimary;
    const secondary = tenant?.branding?.secondaryColor || defaultSecondary;
    const favicon = tenant?.branding?.faviconUrl || defaultFavicon;

    root.style.setProperty("--kivoni-primary", primary);
    root.style.setProperty(
      "--kivoni-primary-dark",
      darkenHexColor(primary, 15)
    );
    // Cores secundárias quase pretas/brancas (ex.: LMFit usa #000000) matam o
    // contraste em um dos temas se sobrescreverem a var — inline style vence a
    // classe .dark. Nesses casos, mantém o padrão do tema (que se adapta).
    if (isThemeSafeAccent(secondary)) {
      root.style.setProperty("--kivoni-accent", secondary);
      root.style.setProperty(
        "--kivoni-accent-light",
        darkenHexColor(secondary, 15)
      );
    } else {
      root.style.removeProperty("--kivoni-accent");
      root.style.removeProperty("--kivoni-accent-light");
    }

    // Update Favicon dynamically: mutate existing icon elements to avoid React unmount errors
    let type = "image/x-icon";
    if (favicon.endsWith(".svg")) {
      type = "image/svg+xml";
    } else if (favicon.endsWith(".png")) {
      type = "image/png";
    }
    const separator = favicon.includes("?") ? "&" : "?";
    const newHref = `${favicon}${separator}v=${Date.now()}`;

    const iconLinks = document.querySelectorAll("link[rel*='icon']");
    if (iconLinks.length > 0) {
      iconLinks.forEach((link) => {
        (link as HTMLLinkElement).href = newHref;
        (link as HTMLLinkElement).type = type;
      });
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.type = type;
      newLink.href = newHref;
      document.head.appendChild(newLink);
    }

    // Set page title
    if (tenant?.name) {
      const currentTitle = document.title;
      if (!currentTitle.includes(tenant.name)) {
        if (currentTitle.includes("Kivoni")) {
          document.title = currentTitle.replace(/Kivoni/g, tenant.name);
        } else {
          document.title = `${currentTitle.split(" | ")[0]} | ${tenant.name}`;
        }
      }
    }
  }, [tenant, slug]);

  return (
    <TenantContext.Provider value={{ tenant, loading, slug }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
