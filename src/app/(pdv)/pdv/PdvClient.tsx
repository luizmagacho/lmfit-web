"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PdvTemplate } from "@/components/templates/PdvTemplate";
import { VariantGrid } from "@/components/organisms/VariantGrid";
import { QuickCart } from "@/components/organisms/QuickCart";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Badge } from "@/components/atoms/Badge";
import { OrderWarningsPanel } from "@/components/OrderWarningsPanel";
import { StockConflictPanel } from "@/components/StockConflictPanel";
import { pdvSearchProducts, type PdvProduct } from "@/lib/pdv/searchProducts";
import { documentId, extractListItems } from "@/lib/normalizeApiList";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";
import { usePdvStore } from "@/stores/usePdvStore";
import { createOrder } from "@/lib/orders/ordersApi";
import { axiosErrorMessage, getStockConflictsFromAxiosError } from "@/lib/apiErrors";
import { http } from "@/lib/http";
import type { OrderWarning, StockConflict } from "@/lib/orders/types";
import { lmfitTokens } from "@/theme/tokens";

function productName(p: PdvProduct | null): string {
  return p ? String(p.name ?? "Produto") : "";
}

function productSku(p: PdvProduct | null): string {
  return p ? String(p.sku ?? "") : "";
}

export function PdvClient() {
  const router = useRouter();
  const role = useAuthStore((s) => s.inferredRole());
  const cart = useCartStore();
  const pdv = usePdvStore();

  const [results, setResults] = useState<PdvProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderWarnings, setOrderWarnings] = useState<OrderWarning[]>([]);
  const [stockConflicts, setStockConflicts] = useState<StockConflict[] | null>(null);
  const [customerResults, setCustomerResults] = useState<Array<{ id: string; name: string }>>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  useEffect(() => {
    cart.setRole(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const term = pdv.search.trim();

  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const items = await pdvSearchProducts(term, 10);
      if (!cancelled) {
        setResults(items);
        setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  const pickProduct = useCallback(
    (p: PdvProduct) => {
      setLoadingVariants(true);
      pdv.setActiveProduct(p);
      setResults([]);
      pdv.setSearch("");
      queueMicrotask(() => setLoadingVariants(false));
    },
    [pdv],
  );

  useEffect(() => {
    const q = customerSearch.trim();
    if (q.length < 2) {
      setCustomerResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { data } = await http.get<unknown>("/customers", {
          params: { search: q, page: 1, limit: 8 },
        });
        const rows = extractListItems(data);
        if (!cancelled) {
          setCustomerResults(
            rows
              .map((r) => {
                const c = r as { _id?: string; id?: string; name?: string };
                return { id: String(c._id ?? c.id ?? ""), name: c.name ?? "" };
              })
              .filter((r) => r.id),
          );
        }
      } catch {
        if (!cancelled) setCustomerResults([]);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerSearch]);

  const onFinalize = useCallback(async () => {
    const snap = cart.snapshot();
    if (snap.items === 0) return;
    if (!snap.customer?.id) {
      setSubmitErr("Informe o cliente antes de finalizar.");
      return;
    }
    setSubmitErr(null);
    setStockConflicts(null);
    setOrderWarnings([]);
    setSubmitting(true);
    try {
      const order = await createOrder({
        customerId: snap.customer.id,
        channel: "in_person",
        status: "paid",
        notes: "PDV mobile",
        lines: snap.lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          description: [l.productName, l.color, l.size].filter(Boolean).join(" · "),
        })),
      });
      setOrderWarnings(order?.warnings ?? []);
      cart.clear();
      pdv.setActiveProduct(null);
      if (order?._id) router.push(`/orders/${order._id}`);
    } catch (e) {
      const stock = getStockConflictsFromAxiosError(e);
      if (stock) {
        setStockConflicts(stock.conflicts ?? []);
        setSubmitErr(stock.message);
      } else {
        setSubmitErr(axiosErrorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  }, [cart, pdv, router]);

  const customerLabel = useMemo(() => {
    const c = cart.customer;
    if (!c) return "";
    if (c.name?.trim()) return `${c.name} · ${c.id ?? ""}`.trim();
    return c.id ?? "";
  }, [cart.customer]);

  return (
    <PdvTemplate
      search={
        <input
          type="search"
          inputMode="search"
          placeholder="Nome ou SKU…"
          className="w-full border rounded-md py-2 pr-3 text-sm min-h-10 bg-white"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={pdv.search}
          onChange={(e) => pdv.setSearch(e.target.value)}
          autoFocus
        />
      }
      cart={<QuickCart onFinalize={onFinalize} busy={submitting} finalizeLabel="Finalizar (Ctrl+Enter)" />}
    >
      {stockConflicts ? (
        <StockConflictPanel
          title={submitErr ?? "Estoque insuficiente para finalizar o pedido."}
          conflicts={stockConflicts}
          onDismiss={() => {
            setStockConflicts(null);
            setSubmitErr(null);
          }}
        />
      ) : submitErr ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {submitErr}
        </p>
      ) : null}

      {orderWarnings.length ? <OrderWarningsPanel warnings={orderWarnings} /> : null}

      <div
        className="flex flex-col gap-2 rounded-md border bg-white px-3 py-2"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            Cliente
          </label>
          <div className="flex-1 relative">
            <input
              type="search"
              inputMode="search"
              className="w-full border rounded px-2 py-1.5 min-h-10 text-sm"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              placeholder={cart.customer ? customerLabel : "Buscar por nome ou telefone"}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            {customerResults.length ? (
              <ul
                className="absolute z-10 left-0 right-0 top-full mt-1 rounded-md border bg-white shadow"
                style={{ borderColor: lmfitTokens.border }}
              >
                {customerResults.map((c) => (
                  <li key={c.id} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50"
                      onClick={() => {
                        cart.setCustomer({ id: c.id, name: c.name });
                        setCustomerResults([]);
                        setCustomerSearch("");
                      }}
                    >
                      <span style={{ color: lmfitTokens.text }}>{c.name || c.id}</span>
                      <span className="block text-xs font-mono" style={{ color: lmfitTokens.textMuted }}>
                        {c.id}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Badge variant={role === "wholesaler" || role === "staff" ? "atacado" : "varejo"} size="xs">
            {role === "guest" ? "Visitante" : role === "wholesaler" ? "Atacado" : role === "staff" ? "Operador" : "Varejo"}
          </Badge>
        </div>
        {cart.customer?.id ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: lmfitTokens.textMuted }}>
            <span>
              Cliente selecionado: <strong style={{ color: lmfitTokens.text }}>{customerLabel}</strong>
            </span>
            <button
              type="button"
              className="underline"
              style={{ color: lmfitTokens.primary }}
              onClick={() => cart.setCustomer(null)}
            >
              limpar
            </button>
          </div>
        ) : null}
      </div>

      {term.length >= 2 ? (
        <div
          className="rounded-lg border bg-white overflow-hidden"
          style={{ borderColor: lmfitTokens.border }}
        >
          {searching ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm" style={{ color: lmfitTokens.textMuted }}>
              Nenhum produto para “{term}”.
            </div>
          ) : (
            <ul>
              {results.map((p) => {
                const id = documentId(p);
                return (
                  <li key={id || productSku(p)} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-neutral-50 min-h-11"
                      onClick={() => pickProduct(p)}
                    >
                      <span className="font-medium text-sm" style={{ color: lmfitTokens.text }}>
                        {productName(p)}
                      </span>
                      <span className="block text-xs font-mono" style={{ color: lmfitTokens.textMuted }}>
                        {productSku(p)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

      {pdv.activeProduct ? (
        <section className="space-y-2">
          <header className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
              {productName(pdv.activeProduct)}
            </h2>
            <span className="text-xs font-mono" style={{ color: lmfitTokens.textMuted }}>
              {productSku(pdv.activeProduct)}
            </span>
          </header>
          <VariantGrid product={pdv.activeProduct} role={role} loading={loadingVariants} />
        </section>
      ) : null}
    </PdvTemplate>
  );
}
