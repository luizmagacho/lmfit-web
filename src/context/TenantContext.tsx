"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTenantStore, type TenantInfo } from "@/stores/useTenantStore";

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

export function getTenantSlugFromHostname(): string {
  if (typeof window === "undefined") return "kivoni";

  const hostname = window.location.hostname;
  
  // Dev local: "loja.localhost" or subdomains on localhost
  if (hostname.includes(".localhost")) {
    const parts = hostname.split(".localhost")[0];
    if (parts && parts !== "localhost") {
      return parts;
    }
  }

  // Production: "loja.kivoni.com.br"
  if (hostname.endsWith(".kivoni.com.br")) {
    const parts = hostname.split(".kivoni.com.br")[0];
    if (parts && parts !== "www" && parts !== "admin") {
      return parts;
    }
  }

  // Fallback to cookie
  const match = document.cookie.match(/(^|;)\s*tenant-slug\s*=\s*([^;]+)/);
  if (match && match[2]) {
    return match[2];
  }

  return "kivoni";
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
    const activeSlug = getTenantSlugFromHostname();
    setSlug(activeSlug);
    void fetchTenant(activeSlug);
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
    root.style.setProperty("--kivoni-accent", secondary);
    root.style.setProperty(
      "--kivoni-accent-light",
      darkenHexColor(secondary, 15)
    );

    // Update Favicon dynamic link
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    link.href = favicon;

    // Set page title
    if (tenant?.name) {
      const currentTitle = document.title;
      if (!currentTitle.includes(tenant.name)) {
        document.title = `${currentTitle.split(" | ")[0]} | ${tenant.name}`;
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
