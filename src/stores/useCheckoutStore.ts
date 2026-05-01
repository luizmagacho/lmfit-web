"use client";

import { create } from "zustand";

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
  reset: () => void;
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
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
  reset: () =>
    set({
      address: null,
      shipping: "pickup",
      pix: null,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
    }),
}));
