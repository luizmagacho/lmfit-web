"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ShippingMethod = "pickup" | "standard" | "express";

export type CheckoutAddress = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export type PixPayment = {
  paymentId: string;
  qrCode: string;
  qrImageUrl?: string | null;
  expiresAt: number;
  status: "pending" | "paid" | "expired" | "failed";
};

type CheckoutState = {
  address: CheckoutAddress | null;
  setAddress: (a: CheckoutAddress | null) => void;
  shipping: ShippingMethod;
  setShipping: (s: ShippingMethod) => void;
  pix: PixPayment | null;
  setPix: (p: PixPayment | null) => void;
  updatePixStatus: (status: PixPayment["status"]) => void;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  setCustomer: (f: Partial<Pick<CheckoutState, "customerName" | "customerPhone" | "customerEmail">>) => void;
  /** Loop 6 — o mesmo order draft criado ao aplicar um cupom no `CartDrawer` é reaproveitado (e
   *  continua sendo patchado) pelo submit do `/checkout`, em vez de cada superfície criar o seu. */
  draftToken: string | null;
  setDraftToken: (token: string) => void;
  couponCode: string;
  discountTotal: number;
  setCoupon: (code: string, discount: number) => void;
  clearCoupon: () => void;
  reset: () => void;
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      address: null,
      setAddress: (a) => set({ address: a }),
      shipping: "pickup",
      setShipping: (s) => set({ shipping: s }),
      pix: null,
      setPix: (p) => set({ pix: p }),
      updatePixStatus: (status) => set((s) => ({ pix: s.pix ? { ...s.pix, status } : s.pix })),
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      setCustomer: (f) => set((s) => ({ ...s, ...f })),
      draftToken: null,
      setDraftToken: (token) => set({ draftToken: token }),
      couponCode: "",
      discountTotal: 0,
      setCoupon: (code, discount) => set({ couponCode: code, discountTotal: discount }),
      clearCoupon: () => set({ couponCode: "", discountTotal: 0 }),
      reset: () =>
        set({
          address: null,
          shipping: "pickup",
          pix: null,
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          draftToken: null,
          couponCode: "",
          discountTotal: 0,
        }),
    }),
    {
      name: "kivoni-checkout",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { pix, ...rest } = state;
        return rest;
      },
    },
  ),
);
