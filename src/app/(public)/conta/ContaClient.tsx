"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomerAuthStore } from "@/stores/useCustomerAuthStore";
import { useWishlistStore } from "@/stores/useWishlistStore";
import { useCartStore } from "@/stores/useCartStore";
import { customerHttp } from "@/lib/customerHttp";
import { formatBRL, parseBRLToNumber } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";
import {
  ReturnRequestForm,
  type ReturnableLine,
  type ReturnRequestPayload,
} from "@/components/organisms/ReturnRequestForm";
import { ProductGrid } from "@/components/organisms/ProductGrid";
import { CustomerBarcodeCard } from "@/components/organisms/CustomerBarcodeCard";

type Address = {
  _id: string;
  label?: string;
  cep: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
};

type OrderLine = {
  variantId: string;
  description?: string | null;
  quantity: number;
  unitPrice: unknown;
};

type Order = {
  _id: string;
  number?: string | number;
  status: string;
  total: unknown;
  shippingMethod?: string;
  carrier?: string;
  trackingCode?: string;
  trackingUrl?: string;
  lines: OrderLine[];
  createdAt: string;
  payment?: { status?: string; method?: string };
};

const EMPTY_ADDRESS_FORM = {
  label: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

/** Reconstruído em 2026-07-23 — o /conta original (Loop 7) se perdeu numa sincronização de
 *  arquivos quebrada; o backend (`CustomerMeController`, `useCustomerAuthStore`) sobreviveu
 *  intacto, então esta reconstrução consome exatamente os mesmos endpoints/contratos já
 *  testados, sem mudar nada no backend. */
export function ContaClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user, loading, init, requestMagicLink, verify, logout, redeemPoints, requestEmailChange } =
    useCustomerAuthStore();

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const verifiedTokenRef = useRef<string | null>(null);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [showEmailChangeForm, setShowEmailChangeForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailChangeSent, setEmailChangeSent] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [emailChangeBusy, setEmailChangeBusy] = useState(false);

  async function handleRequestEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailChangeError(null);
    setEmailChangeBusy(true);
    try {
      await requestEmailChange(newEmail.trim());
      setEmailChangeSent(true);
    } catch (err: any) {
      setEmailChangeError(err?.response?.data?.message || "Não foi possível solicitar a troca de e-mail.");
    } finally {
      setEmailChangeBusy(false);
    }
  }

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [returnOrderId, setReturnOrderId] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [redeemInput, setRedeemInput] = useState("");
  const [redeemMsg, setRedeemMsg] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      if (verifiedTokenRef.current === token) return;
      verifiedTokenRef.current = token;
      setVerifying(true);
      verify(token)
        .then(() => router.replace("/conta"))
        .catch(() => setVerifyError("Link inválido ou expirado. Peça um novo abaixo."))
        .finally(() => setVerifying(false));
    } else {
      void init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const { data } = await customerHttp.get<{ items: Order[] }>("/me/orders", {
        params: { page: 1, limit: 20 },
      });
      setOrders(data.items ?? []);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadAddresses = useCallback(async () => {
    try {
      const { data } = await customerHttp.get<Address[]>("/me/addresses");
      setAddresses(data ?? []);
    } catch {
      setAddresses([]);
    }
  }, []);

  const wishlistInit = useWishlistStore((s) => s.init);
  const wishlistItems = useWishlistStore((s) => s.items);
  const wishlistLoading = useWishlistStore((s) => s.loading);
  const cartRole = useCartStore((s) => s.role);

  useEffect(() => {
    if (user) {
      void loadOrders();
      void loadAddresses();
      void wishlistInit();
    }
  }, [user, loadOrders, loadAddresses, wishlistInit]);

  async function handleRequestLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkError(null);
    try {
      await requestMagicLink(email);
      setLinkSent(true);
    } catch {
      setLinkError("Não foi possível enviar o link. Confira o e-mail e tente novamente.");
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setRedeemMsg(null);
    const points = parseInt(redeemInput, 10);
    if (!Number.isFinite(points) || points <= 0) return;
    try {
      await redeemPoints(points);
      setRedeemInput("");
      setRedeemMsg(`Convertido! +${formatBRL(points * (user?.redeemValuePerPoint ?? 0))} de crédito.`);
    } catch {
      setRedeemMsg("Não foi possível converter — confira se você tem pontos suficientes.");
    }
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await customerHttp.post<Address[]>("/me/addresses", addressForm);
      setAddresses(data ?? []);
      setAddressForm(EMPTY_ADDRESS_FORM);
      setShowAddressForm(false);
    } catch {
      /* deixa o form aberto pro cliente tentar de novo */
    }
  }

  async function handleRemoveAddress(addressId: string) {
    try {
      const { data } = await customerHttp.delete<Address[]>(`/me/addresses/${addressId}`);
      setAddresses(data ?? []);
    } catch {
      /* ignora — lista volta a refletir o real na próxima carga */
    }
  }

  async function handleReturnSubmit(order: Order, payload: ReturnRequestPayload) {
    await customerHttp.post("/me/returns", { orderId: order._id, ...payload });
    setReturnOrderId(null);
    await loadOrders();
  }

  if (verifying || (loading && !user)) {
    return (
      <div className="max-w-md mx-auto py-16 text-center" style={{ color: lmfitTokens.textMuted }}>
        {verifying ? "Confirmando seu acesso…" : "Carregando…"}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <h1 className="text-2xl font-semibold" style={{ color: lmfitTokens.text }}>
          Minha conta
        </h1>
        {verifyError ? (
          <p className="text-sm" style={{ color: lmfitTokens.error }}>
            {verifyError}
          </p>
        ) : null}
        {linkSent ? (
          <p className="text-sm" style={{ color: lmfitTokens.success }}>
            Enviamos um link de acesso para {email}. Confira sua caixa de entrada.
          </p>
        ) : (
          <form onSubmit={handleRequestLink} className="space-y-3">
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              Informe seu e-mail para receber um link de acesso à sua conta.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none focus:ring-1 focus:ring-violet-500"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
            {linkError ? (
              <p className="text-sm" style={{ color: lmfitTokens.error }}>
                {linkError}
              </p>
            ) : null}
            <button
              type="submit"
              className="w-full min-h-11 px-4 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              Receber link de acesso
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: lmfitTokens.text }}>
            Olá, {user.name}
          </h1>
          <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            {user.email}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-sm underline"
          style={{ color: lmfitTokens.textMuted }}
        >
          Sair
        </button>
      </div>

      {/* Trocar e-mail */}
      <section className="space-y-2">
        {!showEmailChangeForm ? (
          <button
            type="button"
            onClick={() => {
              setShowEmailChangeForm(true);
              setEmailChangeSent(false);
              setEmailChangeError(null);
            }}
            className="text-xs underline"
            style={{ color: lmfitTokens.primary }}
          >
            Trocar e-mail
          </button>
        ) : emailChangeSent ? (
          <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            Enviamos um link de confirmação para {newEmail}. Clique nele para concluir a troca.
          </p>
        ) : (
          <form onSubmit={handleRequestEmailChange} className="flex flex-wrap items-end gap-2">
            <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Novo e-mail
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="mt-1 block min-h-9 border rounded-md px-2 py-1.5 text-sm bg-transparent"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              />
            </label>
            <button
              type="submit"
              disabled={emailChangeBusy}
              className="min-h-9 px-3 rounded-md text-xs font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              {emailChangeBusy ? "…" : "Enviar confirmação"}
            </button>
            <button
              type="button"
              onClick={() => setShowEmailChangeForm(false)}
              className="text-xs underline"
              style={{ color: lmfitTokens.textMuted }}
            >
              Cancelar
            </button>
            {emailChangeError ? (
              <p className="w-full text-xs" style={{ color: lmfitTokens.error }}>
                {emailChangeError}
              </p>
            ) : null}
          </form>
        )}
      </section>

      {/* Fidelidade + crédito */}
      <section className="space-y-3 border rounded-xl p-4" style={{ borderColor: lmfitTokens.border }}>
        <h2 className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
          Fidelidade e crédito
        </h2>
        <div className="flex gap-6 text-sm">
          <div>
            <p style={{ color: lmfitTokens.textMuted }}>Pontos</p>
            <p className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>
              {user.loyaltyPoints}
            </p>
          </div>
          <div>
            <p style={{ color: lmfitTokens.textMuted }}>Crédito de loja</p>
            <p className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>
              {formatBRL(user.storeCreditBalance)}
            </p>
          </div>
        </div>
        {user.loyaltyPoints > 0 ? (
          <form onSubmit={handleRedeem} className="flex gap-2 items-center pt-2">
            <input
              type="number"
              min={1}
              max={user.loyaltyPoints}
              value={redeemInput}
              onChange={(e) => setRedeemInput(e.target.value)}
              placeholder="Pontos a converter"
              className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
            <button
              type="submit"
              className="min-h-10 px-4 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              Converter
            </button>
          </form>
        ) : null}
        {redeemInput && !Number.isNaN(parseInt(redeemInput, 10)) ? (
          <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            = {formatBRL(parseInt(redeemInput, 10) * (user.redeemValuePerPoint || 0))}
          </p>
        ) : null}
        {redeemMsg ? (
          <p className="text-sm" style={{ color: lmfitTokens.success }}>
            {redeemMsg}
          </p>
        ) : null}
        <CustomerBarcodeCard customerCode={user.customerCode} />
      </section>

      {/* Meus pedidos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
          Meus pedidos
        </h2>
        {ordersLoading ? (
          <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            Carregando…
          </p>
        ) : orders.length === 0 ? (
          <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            Você ainda não fez nenhum pedido.
          </p>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o._id} className="border rounded-xl p-4 space-y-2" style={{ borderColor: lmfitTokens.border }}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
                    Pedido #{o.number ?? o._id.slice(-6)}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                    {formatBRL(parseBRLToNumber(o.total))}
                  </p>
                </div>
                <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                  {o.status} · {o.payment?.method ?? "—"} ·{" "}
                  {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                </p>
                {o.trackingCode ? (
                  <p className="text-xs" style={{ color: lmfitTokens.text }}>
                    Rastreio{o.carrier ? ` (${o.carrier})` : ""}:{" "}
                    {o.trackingUrl ? (
                      <a
                        href={o.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        style={{ color: lmfitTokens.primary }}
                      >
                        {o.trackingCode}
                      </a>
                    ) : (
                      o.trackingCode
                    )}
                  </p>
                ) : null}
                {returnOrderId === o._id ? (
                  <ReturnRequestForm
                    lines={o.lines.map(
                      (l): ReturnableLine => ({
                        variantId: l.variantId,
                        description: l.description,
                        quantity: l.quantity,
                        unitPrice: parseBRLToNumber(l.unitPrice),
                        returnedQty: 0,
                      }),
                    )}
                    onSubmit={(payload) => handleReturnSubmit(o, payload)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setReturnOrderId(o._id)}
                    className="text-xs underline"
                    style={{ color: lmfitTokens.primary }}
                  >
                    Solicitar troca ou devolução
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Endereços */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
            Meus endereços
          </h2>
          <button
            type="button"
            onClick={() => setShowAddressForm((s) => !s)}
            className="text-xs underline"
            style={{ color: lmfitTokens.primary }}
          >
            {showAddressForm ? "Cancelar" : "Adicionar endereço"}
          </button>
        </div>

        {showAddressForm ? (
          <form onSubmit={handleAddAddress} className="grid grid-cols-2 gap-2 border rounded-xl p-4" style={{ borderColor: lmfitTokens.border }}>
            <input placeholder="Apelido (opcional)" value={addressForm.label} onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))} className="col-span-2 px-3 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border }} />
            <input required placeholder="CEP" value={addressForm.cep} onChange={(e) => setAddressForm((f) => ({ ...f, cep: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border }} />
            <input required placeholder="Logradouro" value={addressForm.logradouro} onChange={(e) => setAddressForm((f) => ({ ...f, logradouro: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border }} />
            <input placeholder="Número" value={addressForm.numero} onChange={(e) => setAddressForm((f) => ({ ...f, numero: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border }} />
            <input placeholder="Complemento" value={addressForm.complemento} onChange={(e) => setAddressForm((f) => ({ ...f, complemento: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border }} />
            <input required placeholder="Bairro" value={addressForm.bairro} onChange={(e) => setAddressForm((f) => ({ ...f, bairro: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border }} />
            <input required placeholder="Cidade" value={addressForm.cidade} onChange={(e) => setAddressForm((f) => ({ ...f, cidade: e.target.value }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border }} />
            <input required placeholder="UF" maxLength={2} value={addressForm.uf} onChange={(e) => setAddressForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: lmfitTokens.border }} />
            <button type="submit" className="col-span-2 min-h-10 px-4 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: lmfitTokens.primary }}>
              Salvar endereço
            </button>
          </form>
        ) : null}

        {addresses.length === 0 ? (
          <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            Nenhum endereço salvo ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <div key={a._id} className="flex items-center justify-between border rounded-xl p-3 text-sm" style={{ borderColor: lmfitTokens.border }}>
                <div style={{ color: lmfitTokens.text }}>
                  {a.label ? <span className="font-medium">{a.label} — </span> : null}
                  {a.logradouro}, {a.numero} — {a.bairro}, {a.cidade}/{a.uf}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAddress(a._id)}
                  className="text-xs underline"
                  style={{ color: lmfitTokens.error }}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Lista de desejos (Loop 9 continuação) */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
          Lista de desejos
        </h2>
        {!wishlistLoading && wishlistItems.length === 0 ? (
          <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            Nenhum produto salvo ainda. Toque no coração de um produto na loja para guardá-lo aqui.
          </p>
        ) : (
          <ProductGrid items={wishlistItems} loading={wishlistLoading} role={cartRole} />
        )}
      </section>
    </div>
  );
}
