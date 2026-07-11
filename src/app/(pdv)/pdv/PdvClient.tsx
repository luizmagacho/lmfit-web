"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";
import { PdvTemplate } from "@/components/templates/PdvTemplate";
import { VariantGrid } from "@/components/organisms/VariantGrid";
import { QuickCart } from "@/components/organisms/QuickCart";
import { BarcodeScannerModal } from "@/components/organisms/BarcodeScannerModal";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Badge } from "@/components/atoms/Badge";
import { OrderWarningsPanel } from "@/components/OrderWarningsPanel";
import { StockConflictPanel } from "@/components/StockConflictPanel";
import { NewCustomerModal } from "@/components/organisms/NewCustomerModal";
import { PaymentModal, type PaymentMethod } from "@/components/organisms/PaymentModal";
import type { VariantRowData } from "@/components/molecules/VariantQtyRow";
import { pdvSearchProducts, pdvLookupByBarcode, type PdvProduct } from "@/lib/pdv/searchProducts";
import { createBatch } from "@/lib/production/productionApi";
import { resolvePrimaryImageUrl } from "@/lib/productImageUrl";
import { documentId, extractListItems } from "@/lib/normalizeApiList";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";
import { usePdvStore } from "@/stores/usePdvStore";
import { useTenantStore } from "@/stores/useTenantStore";
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
  const tenantPlan = useTenantStore((s) => s.tenant?.plan);
  const isProductionLocked = tenantPlan !== "pro" && tenantPlan !== "enterprise";
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
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [orderData, setOrderData] = useState<{ variant: VariantRowData; product: Record<string, unknown> } | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleBarcodeDetected = useCallback(
    async (code: string) => {
      setIsScannerOpen(false);
      setScanning(true);
      try {
        const { product, variantId } = await pdvLookupByBarcode(code);
        pickProduct(product);
        const variant = product.variants?.find((v) => String((v as { _id?: string })._id) === variantId);
        const label = variant ? [variant.color, variant.size].filter(Boolean).join(" · ") : null;
        toast.success(label ? `${product.name} · ${label}` : `${product.name}`);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || `Código ${code} não encontrado.`);
      } finally {
        setScanning(false);
      }
    },
    [pickProduct],
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

  const onFinalize = useCallback(() => {
    const snap = cart.snapshot();
    if (snap.items === 0) return;
    if (!snap.customer?.id) {
      setSubmitErr("Informe o cliente antes de finalizar.");
      return;
    }
    setSubmitErr(null);
    setStockConflicts(null);
    setOrderWarnings([]);
    setIsPaymentOpen(true);
  }, [cart]);

  const handleConfirmPayment = useCallback(async (method: PaymentMethod, notes: string) => {
    const snap = cart.snapshot();
    if (!snap.customer?.id) return;
    setSubmitting(true);
    try {
      const order = await createOrder({
        customerId: snap.customer.id,
        channel: "in_person",
        status: snap.lines.some(l => l.isOrder) ? "open" : "completed",
        paymentMethod: method,
        notes: notes ? `PDV mobile - ${notes}` : "PDV mobile",
        lines: snap.lines.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          description: [l.productName, l.color, l.size].filter(Boolean).join(" · "),
          isOrder: l.isOrder,
        })),
      });

      const orderLines = snap.lines.filter(l => l.isOrder);
      if (orderLines.length > 0) {
        await Promise.all(orderLines.map(l => createBatch({
          name: `Encomenda: ${l.productName} - ${[l.color, l.size].filter(Boolean).join(" ")}`.trim(),
          sku: l.sku,
          batchQty: l.quantity,
          status: 'Encomendado (Pago)',
          notes: `Encomenda via PDV para o cliente: ${snap.customer!.name || "Sem Nome"} (${snap.customer!.id})\nVinculado ao pedido: ${order?._id ?? ''}`,
          imageUrl: l.imageUrl || undefined,
        }).catch(err => {
          console.error("Erro ao criar batch para encomenda", err);
        })));
      }

      setOrderWarnings(order?.warnings ?? []);
      cart.clear();
      pdv.setActiveProduct(null);
      setIsPaymentOpen(false);
      setCustomerSearch("");
      setCustomerResults([]);
      
      toast.success("Venda finalizada com sucesso!");
    } catch (e) {
      setIsPaymentOpen(false);
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

  const handleOrderRequest = useCallback((variant: VariantRowData, product: Record<string, unknown>) => {
    if (isProductionLocked) {
      setSubmitErr("Este recurso requer o plano Pro ou superior. Entre em contato para fazer o upgrade e liberar as Encomendas (Lotes de Produção).");
      return;
    }
  }, [isProductionLocked]);

  const customerLabel = useMemo(() => {
    const c = cart.customer;
    if (!c) return "";
    if (c.name?.trim()) return `${c.name} · ${c.id ?? ""}`.trim();
    return c.id ?? "";
  }, [cart.customer]);

  return (
    <PdvTemplate
      search={null}
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
        className="flex flex-col gap-2 rounded-md border bg-[var(--card-bg)] px-3 py-2"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            Cliente
          </label>
          <div className="flex-1 relative flex gap-2">
            <input
              type="search"
              inputMode="search"
              className="w-full border rounded px-2 py-1.5 min-h-10 text-sm"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              placeholder={cart.customer ? customerLabel : "Buscar por nome ou telefone"}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setIsNewCustomerOpen(true)}
              className="text-xs font-medium px-2 py-1 border rounded-md whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              + Novo
            </button>
            {customerResults.length ? (
              <ul
                className="absolute z-10 left-0 right-0 top-full mt-1 rounded-md border bg-[var(--card-bg)] shadow"
                style={{ borderColor: lmfitTokens.border }}
              >
                {customerResults.map((c) => (
                  <li key={c.id} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--hover-bg)]"
                      onClick={() => {
                        cart.setCustomer({ id: c.id, name: c.name });
                        setCustomerResults([]);
                        setCustomerSearch("");
                      }}
                    >
                      <span style={{ color: lmfitTokens.text }}>{c.name || c.id}</span>
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
          <div className="text-xs mt-1 flex items-center justify-between" style={{ color: lmfitTokens.textMuted }}>
            <span>
              ID: {cart.customer.id}
            </span>
            <button
              type="button"
              className="underline"
              onClick={() => cart.setCustomer(null)}
            >
              limpar
            </button>
          </div>
        ) : null}
      </div>

      {isNewCustomerOpen && (
        <NewCustomerModal
          onClose={() => setIsNewCustomerOpen(false)}
          onSuccess={(customer) => {
            cart.setCustomer({ id: customer.id, name: customer.name });
            setCustomerSearch("");
            setCustomerResults([]);
            setIsNewCustomerOpen(false);
          }}
        />
      )}

      {isPaymentOpen && (
        <PaymentModal
          total={cart.snapshot().subtotal}
          onClose={() => setIsPaymentOpen(false)}
          onConfirm={handleConfirmPayment}
          loading={submitting}
        />
      )}


        <div className="relative mb-2 mt-4 flex gap-2">
          <input
            type="search"
            inputMode="search"
            placeholder="Buscar por Produto, SKU, Cor..."
            className="w-full border rounded-md py-2 px-3 text-sm min-h-12 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={pdv.search}
            onChange={(e) => pdv.setSearch(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            disabled={scanning}
            aria-label="Escanear código de barras"
            title="Escanear código de barras"
            className="flex-none min-h-12 min-w-12 rounded-md border flex items-center justify-center disabled:opacity-50 touch-manipulation"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
          >
            <ScanLine className="h-5 w-5" />
          </button>
        </div>

        {isScannerOpen ? (
          <BarcodeScannerModal onClose={() => setIsScannerOpen(false)} onDetected={handleBarcodeDetected} />
        ) : null}

        <div
          className="rounded-lg border bg-[var(--card-bg)] overflow-hidden"
        >
          {searching ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm">
              Nenhum produto encontrado.
            </div>
          ) : (
            <ul>
              {results.map((p) => {
                const id = documentId(p);
                return (
                  <li key={id} className="border-b last:border-0">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-[var(--hover-bg)] min-h-11"
                      onClick={() => pickProduct(p)}
                    >
                      <span className="block text-sm font-semibold">
                        {productName(p)}
                      </span>
                      <span className="block text-xs mt-0.5">
                        {productSku(p)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      {pdv.activeProduct ? (
        <section className="space-y-2">
          <header className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">
              {productName(pdv.activeProduct)}
            </h2>
            <span className="text-sm font-mono opacity-60">
              {productSku(pdv.activeProduct)}
            </span>
          </header>
              <VariantGrid 
                product={pdv.activeProduct} 
                role={role} 
                loading={loadingVariants} 
                onOrderRequest={handleOrderRequest}
                productionLocked={isProductionLocked}
              />
        </section>
      ) : null}
    </PdvTemplate>
  );
}
