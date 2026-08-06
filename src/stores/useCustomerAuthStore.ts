"use client";

import { create } from "zustand";
import { customerHttp } from "@/lib/customerHttp";
import {
  clearCustomerTokens,
  getCustomerAccessToken,
  getCustomerRefreshToken,
  setCustomerTokens,
} from "@/lib/customerTokenStorage";
import { getTenantSlug } from "@/lib/tenantSlug";

export type CustomerAuthUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  loyaltyPoints: number;
  storeCreditBalance: number;
  redeemValuePerPoint: number;
};

type CustomerAuthState = {
  user: CustomerAuthUser | null;
  loading: boolean;
  initialized: boolean;
  initializedForSlug: string | null;
  init: () => Promise<void>;
  requestMagicLink: (email: string) => Promise<void>;
  verify: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  redeemPoints: (points: number) => Promise<void>;
  requestEmailChange: (newEmail: string) => Promise<void>;
};

export const useCustomerAuthStore = create<CustomerAuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  initializedForSlug: null,

  init: async () => {
    const currentSlug = getTenantSlug();
    if (get().initialized && get().initializedForSlug === currentSlug) return;
    if (get().initialized && get().initializedForSlug !== currentSlug) {
      set({ user: null, initialized: false, initializedForSlug: null });
    }
    set({ initialized: true, initializedForSlug: currentSlug });

    const access = getCustomerAccessToken();
    if (!access) {
      set({ user: null, loading: false });
      return;
    }
    try {
      const { data } = await customerHttp.get<CustomerAuthUser>("/me/profile");
      set({ user: data, loading: false });
    } catch {
      clearCustomerTokens();
      set({ user: null, loading: false });
    }
  },

  requestMagicLink: async (email: string) => {
    const redirectBase = typeof window !== "undefined" ? window.location.origin : undefined;
    await customerHttp.post("/public/customer-auth/request-link", { email, redirectBase });
  },

  verify: async (token: string) => {
    try {
      const { data } = await customerHttp.post<{
        accessToken: string;
        refreshToken: string;
        customer: { id: string; name: string; email: string | null };
      }>("/public/customer-auth/verify", { token });
      setCustomerTokens(data.accessToken, data.refreshToken);
      const { data: profile } = await customerHttp.get<CustomerAuthUser>("/me/profile");
      set({ user: profile, loading: false });
    } catch (err) {
      // `loading` starts `true` and only the success path above ever flips it — a rejected
      // verify (expired/invalid token) left it stuck at `true` forever, so the caller's
      // "Carregando…" state never gave way to the actual error message.
      set({ loading: false });
      throw err;
    }
  },

  redeemPoints: async (points: number) => {
    await customerHttp.post("/me/loyalty/redeem", { points });
    const { data: profile } = await customerHttp.get<CustomerAuthUser>("/me/profile");
    set({ user: profile });
  },

  /** Loop 18 — pede a troca pro e-mail NOVO informado; o e-mail só muda de fato quando o cliente
   *  clica no link de confirmação enviado pra essa caixa de entrada nova (ver `/conta?token=...`). */
  requestEmailChange: async (newEmail: string) => {
    const redirectBase = typeof window !== "undefined" ? window.location.origin : undefined;
    await customerHttp.post("/me/email-change/request", { newEmail, redirectBase });
  },

  logout: async () => {
    const refresh = getCustomerRefreshToken();
    try {
      if (refresh) await customerHttp.post("/public/customer-auth/logout", { refreshToken: refresh });
    } catch {
      /* ignore */
    } finally {
      clearCustomerTokens();
      set({ user: null, initialized: false, initializedForSlug: null });
    }
  },
}));
