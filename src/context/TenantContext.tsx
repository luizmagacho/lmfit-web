"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTenantStore, type TenantInfo } from "@/stores/useTenantStore";
import { getTenantSlug, isRealTenantResolved } from "@/lib/tenantSlug";
import {
  STOREFRONT_PRESETS,
  resolveThemePreset,
  type StorefrontThemeTokens,
  type ThemePreset,
} from "@/theme/storefrontPresets";

/** Loop 12 — Google Fonts css2 rejeita a requisição INTEIRA se algum peso listado não existir pra
 *  aquela família (bug real: Anton, que só tem o peso 400, nunca carregava porque o resto do bundle
 *  costumava pedir um `wght@400;700` genérico). Cobre todo `fontDisplay`/`fontBody` usado por
 *  qualquer preset em `storefrontPresets.ts`. */
export const GOOGLE_FONT_WEIGHTS: Record<string, string> = {
  Poppins: "400;500;600;700",
  Inter: "400;500;600;700",
  "Playfair Display": "400;500;600;700",
  Oswald: "400;500;600;700",
  "Instrument Sans": "400;500;600;700",
  "Cormorant Garamond": "400;500;600;700",
  "Baloo 2": "400;500;600;700;800",
  Nunito: "400;500;600;700;800",
  Quicksand: "400;500;600;700",
  "Space Grotesk": "400;500;600;700",
  "Space Mono": "400;700",
  Anton: "400",
  Archivo: "300;400;500;600;700",
};

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

    // Loop 10 v2 — só reaproveita o rebranding do LITERAL "Kivoni" no título estático do painel
    // admin/PDV (`layout.tsx` raiz). `/loja`/`/catalogo`/PDP hoje têm seus próprios `generateMetadata`
    // server-side, corretos e completos (ex.: nome real do produto) — um append cego aqui
    // corromperia esses títulos ("Camisa Flamengo I 2024" virando "... | Kivoni Store").
    if (tenant?.name) {
      const currentTitle = document.title;
      if (currentTitle.includes("Kivoni") && !currentTitle.includes(tenant.name)) {
        document.title = currentTitle.replace(/Kivoni/g, tenant.name);
      }
    }
  }, [tenant, slug]);

  useEffect(() => {
    const root = document.documentElement;
    const preset = resolveThemePreset(tenant?.storefront?.themePreset);
    const tokens = STOREFRONT_PRESETS[preset];

    root.setAttribute("data-theme-preset", preset);
    root.style.setProperty("--kivoni-font-display", `'${tokens.fontDisplay}'`);
    root.style.setProperty("--kivoni-font-body", `'${tokens.fontBody}'`);
    root.style.setProperty("--kivoni-radius", `${tokens.radius}px`);
    root.style.setProperty(
      "--kivoni-heading-transform",
      tokens.heading.case === "uppercase" ? "uppercase" : "none",
    );
    root.style.setProperty(
      "--kivoni-heading-variant",
      tokens.heading.case === "small-caps" ? "small-caps" : "normal",
    );
    root.style.setProperty("--kivoni-heading-tracking", tokens.heading.tracking);
    root.style.setProperty("--kivoni-heading-weight", String(tokens.heading.weight));
    root.style.setProperty("--kivoni-heading-style", tokens.heading.italic ? "italic" : "normal");

    // Carrega as 2 famílias (display + body) do preset ativo via Google Fonts css2 — só quando
    // o preset está de fato em uso, não next/font/google estático (o preset muda em runtime,
    // por tenant, então não dá pra importar cada fonte como módulo estático).
    const families = Array.from(new Set([tokens.fontDisplay, tokens.fontBody]));
    const familyParams = families
      .map((f) => `family=${encodeURIComponent(f)}:wght@${GOOGLE_FONT_WEIGHTS[f] ?? "400;700"}`)
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
    let link = document.querySelector<HTMLLinkElement>("link[data-storefront-fonts]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-storefront-fonts", "true");
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [tenant]);

  return (
    <TenantContext.Provider value={{ tenant, loading, slug }}>
      {children}
    </TenantContext.Provider>
  );
}

/** Loop 4c/4d — tokens do preset ativo do tenant (tipografia, raio, botão, paleta, densidade de
 *  PLP, tratamento de hero, movimento). Consumido tanto globalmente (fonte/raio, via este mesmo
 *  contexto) quanto só em `/loja` (paleta/movimento, via `StorefrontThemeVars.tsx`). */
export function useThemeTokens(): StorefrontThemeTokens {
  const { tenant } = useTenant();
  return STOREFRONT_PRESETS[resolveThemePreset(tenant?.storefront?.themePreset)];
}

/** Loop 23 — o ID bruto do preset ativo (`"luxo"`, `"studio"`, ...), não os tokens derivados.
 *  Necessário quando 2 presets da MESMA família (`layoutFamily`) são gêneros genuinamente
 *  diferentes e o componente de família precisa ramificar por preset, não só por token de
 *  composição (decisão do Loop 19 §3.2 — nenhuma família nova pra isso). */
export function useThemePreset(): ThemePreset {
  const { tenant } = useTenant();
  return resolveThemePreset(tenant?.storefront?.themePreset);
}

export function useTenant() {
  return useContext(TenantContext);
}
