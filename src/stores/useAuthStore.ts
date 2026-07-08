"use client";

import { create } from "zustand";
import { http } from "@/lib/http";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/lib/tokenStorage";
import type { CustomerRole } from "@/lib/pricing";
import { getTenantSlug } from "@/lib/tenantSlug";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  // Guarda o slug para o qual foi inicializado, para resetar se mudar
  initializedForSlug: string | null;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  inferredRole: () => CustomerRole;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  initializedForSlug: null,

  init: async () => {
    const currentSlug = getTenantSlug();

    // Se já foi inicializado para ESTE slug, não refaz
    if (get().initialized && get().initializedForSlug === currentSlug) return;

    // Se o slug mudou (usuário trocou de loja), reseta antes de re-inicializar
    if (get().initialized && get().initializedForSlug !== currentSlug) {
      set({ user: null, initialized: false, initializedForSlug: null });
    }

    set({ initialized: true, initializedForSlug: currentSlug });

    const access = getAccessToken();
    if (!access) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const { data } = await http.get<AuthUser>("/auth/me");
      set({ user: data, loading: false });
    } catch {
      clearTokens();
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await http.post<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>("/auth/login", { email, password });
    setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user, loading: false });
  },

  logout: async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) await http.post("/auth/logout", { refreshToken: refresh });
    } catch {
      /* ignore */
    } finally {
      clearTokens();
      // Reseta COMPLETAMENTE o estado de auth — próximo init vai re-checar tokens
      set({ user: null, initialized: false, initializedForSlug: null });
    }
  },

  inferredRole: () => {
    const u = get().user;
    if (!u) return "guest";
    const r = u.role?.toLowerCase?.() ?? "";
    if (r.includes("admin") || r.includes("staff") || r.includes("vendedor")) return "staff";
    if (r.includes("atacad")) return "wholesaler";
    if (r.includes("varejo") || r.includes("retail") || r.includes("customer")) return "retail";
    return "staff";
  },
}));
