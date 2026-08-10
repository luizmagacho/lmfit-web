"use client";

import { create } from "zustand";
import { publicHttp } from "@/lib/publicHttp";

export interface TenantBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  darkMode?: boolean;
}

export interface TenantLimits {
  maxProducts: number;
  maxUsers: number;
}

export interface StorefrontLookbookConfig {
  title: string;
  imageUrl: string;
  variantIds: string[];
}

export interface StorefrontReturnPolicy {
  windowDays?: number;
  policyText?: string;
}

/** Config da "Loja online" (Settings) — todo campo é opcional, cada um só liga uma seção/vitrine
 *  quando o tenant efetivamente configura (ver `HeroBanner`/`TrustBar`/`CouponBanner`/`Lookbook`). */
export interface StorefrontConfig {
  enabled?: boolean;
  themePreset?: string;
  /** Loop 4 — mensagens da faixa de avisos no topo; vazio/ausente não renderiza a faixa. */
  announcements?: string[];
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaLabel?: string;
  heroImageUrl?: string;
  /** Loop 4d — 2+ imagens vira carrossel automático no `HeroBanner`. */
  heroImages?: string[];
  /** Carrossel de banners promocionais menores/retangulares — cada slide tem sua própria imagem e
   *  pode linkar pra um produto diferente (via slug, bate com `/loja/p/[slug]` sem outro fetch).
   *  Quando configurado, `HeroBanner.tsx` renderiza este carrossel EM VEZ DO hero de título/imagem
   *  única acima — os dois modos são mutuamente exclusivos, não empilhados. */
  heroBanners?: Array<{
    imageUrl: string;
    linkedProductSlug?: string;
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
  }>;
  showTrustBar?: boolean;
  couponBannerCode?: string;
  lookbook?: StorefrontLookbookConfig;
  /** Loop 4 continuação — texto simples por página institucional (`quemSomos`/`comoComprar`/
   *  `guiaMedidas`/`contato`), sem editor rico. */
  pages?: Record<string, string>;
  returnPolicy?: StorefrontReturnPolicy;
  /** Loop 10 v2 — override de SEO; sem isso, `generateMetadata` deriva um fallback do `name`. */
  metaTitle?: string;
  metaDescription?: string;
}

/** Loop 2 — desconto/parcelamento exibidos no card/PDP/sacola/checkout. */
export interface PricingDisplayConfig {
  pixDiscountPercent?: number;
  maxInstallments?: number;
}

/** Loop 3 — frete tenant-configurável: retirada/padrão/expresso + frete grátis acima de um total. */
export interface ShippingConfig {
  pickupLabel?: string;
  standardFee?: number;
  expressFee?: number;
  freeAboveTotal?: number;
}

/** Loop 15 — pixels de conversão. Só os IDs (client-side) chegam aqui; os tokens de servidor
 *  (Conversions API/Measurement Protocol/Events API) nunca saem do backend. */
export interface AnalyticsConfig {
  metaPixelId?: string;
  ga4MeasurementId?: string;
  tiktokPixelId?: string;
}

export interface TenantInfo {
  slug: string;
  name: string;
  branding: TenantBranding;
  whatsappNumber?: string;
  /** Loop 11-A — liga a IA (Groq) pra responder automaticamente clientes que mandam mensagem pro
   *  WhatsApp da loja (números fora da allowlist de staff). */
  whatsappAiEnabled?: boolean;
  infinitePayTag?: string;
  plan?: string;
  limits?: TenantLimits;
  storefront?: StorefrontConfig;
  pricingDisplay?: PricingDisplayConfig;
  shippingConfig?: ShippingConfig;
  analytics?: AnalyticsConfig;
}

interface TenantState {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
  fetchedSlug: string | null;
  fetchTenant: (slug: string) => Promise<TenantInfo | null>;
  setTenantBranding: (branding: TenantBranding) => void;
  setTenantShipping: (shippingConfig: ShippingConfig) => void;
  setTenantAnalytics: (analytics: AnalyticsConfig) => void;
  setTenantStorefront: (storefront: Partial<StorefrontConfig>) => void;
  setTenantWhatsappNumber: (whatsappNumber: string) => void;
  resetTenant: () => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenant: null,
  loading: false,
  error: null,
  fetchedSlug: null,

  fetchTenant: async (slug: string) => {
    // Se slug mudou em relação ao cache, força re-fetch
    if (get().fetchedSlug === slug && get().tenant) {
      return get().tenant;
    }

    // Slug diferente do cacheado → limpa o estado anterior
    if (get().fetchedSlug && get().fetchedSlug !== slug) {
      set({ tenant: null, fetchedSlug: null, error: null });
    }

    set({ loading: true, error: null });
    try {
      const { data } = await publicHttp.get<TenantInfo>(`/public/tenants/${slug}?_t=${Date.now()}`);
      set({ tenant: data, fetchedSlug: slug, loading: false });
      return data;
    } catch (err: any) {
      console.error(`Failed to fetch tenant branding for slug: ${slug}`, err);
      set({
        error: "Loja não encontrada ou inativa.",
        loading: false,
        tenant: null,
        fetchedSlug: slug,
      });
      return null;
    }
  },

  setTenantBranding: (branding: TenantBranding) => {
    set((state) => {
      if (!state.tenant) return state;
      return {
        tenant: {
          ...state.tenant,
          branding: {
            ...state.tenant.branding,
            ...branding,
          },
        },
      };
    });
  },

  setTenantShipping: (shippingConfig: ShippingConfig) => {
    set((state) => {
      if (!state.tenant) return state;
      return { tenant: { ...state.tenant, shippingConfig } };
    });
  },

  setTenantAnalytics: (analytics: AnalyticsConfig) => {
    set((state) => {
      if (!state.tenant) return state;
      return { tenant: { ...state.tenant, analytics } };
    });
  },

  setTenantStorefront: (storefront: Partial<StorefrontConfig>) => {
    set((state) => {
      if (!state.tenant) return state;
      return {
        tenant: {
          ...state.tenant,
          storefront: { ...state.tenant.storefront, ...storefront },
        },
      };
    });
  },

  setTenantWhatsappNumber: (whatsappNumber: string) => {
    set((state) => {
      if (!state.tenant) return state;
      return { tenant: { ...state.tenant, whatsappNumber } };
    });
  },

  resetTenant: () => {
    set({ tenant: null, fetchedSlug: null, loading: false, error: null });
  },
}));
