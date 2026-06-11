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

export interface TenantInfo {
  slug: string;
  name: string;
  branding: TenantBranding;
  whatsappNumber?: string;
  infinitePayTag?: string;
}

interface TenantState {
  tenant: TenantInfo | null;
  loading: boolean;
  error: string | null;
  fetchedSlug: string | null;
  fetchTenant: (slug: string) => Promise<TenantInfo | null>;
  setTenantBranding: (branding: TenantBranding) => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenant: null,
  loading: false,
  error: null,
  fetchedSlug: null,

  fetchTenant: async (slug: string) => {
    // If we already fetched for this slug, return the cached one
    if (get().fetchedSlug === slug && get().tenant) {
      return get().tenant;
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
        fetchedSlug: slug 
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
}));
