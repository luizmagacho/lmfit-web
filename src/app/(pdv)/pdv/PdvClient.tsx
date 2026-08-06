"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ScanLine } from "lucide-react";
import { PdvTemplate } from "@/components/templates/PdvTemplate";
import { VariantGrid } from "@/components/organisms/VariantGrid";
import { QuickCart } from "@/components/organisms/QuickCart";
import { BarcodeScannerModal } from "@/components/organisms/BarcodeScannerModal";
import { Skeleton } from "@/components/atoms/Skeleton";
import { Badge } from "@/components/atoms/Badge";
import { OrderWarningsPanel } from "@/components/OrderWarningsPanel";
import { NewCustomerModal } from "@/components/organisms/NewCustomerModal";
import { PaymentModal, type PaymentMethod } from "@/components/organisms/PaymentModal";
import type { VariantRowData } from "@/components/molecules/VariantQtyRow";
import { pdvSearchProducts, pdvLookupByBarcode, type PdvProduct } from "@/lib/pdv/searchProducts";
import { searchLocalAsProducts, lookupLocalByBarcodeAsProduct, refreshSnapshot } from "@/lib/pdv/catalogSnapshot";
import { enqueueSale } from "@/lib/pdv/outbox";
import { flushNow } from "@/lib/pdv/syncEngine";
import { SyncStatusBadge } from "@/components/organisms/SyncStatusBadge";
import { createBatch } from "@/lib/production/productionApi";
import { resolvePrimaryImageUrl } from "@/lib/productImageUrl";
import { documentId, extractListItems } from "@/lib/normalizeApiList";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCartStore } from "@/stores/useCartStore";
import { usePdvStore } from "@/stores/usePdvStore";
import { useTenantStore } from "@/stores/useTenantStore";
import { axiosErrorMessage } from "@/lib/apiErrors";
import { http } from "@/lib/http";
import type { OrderWarning } from "@/lib/orders/types";
import type { CartLine } from "@/stores/useCartStore";
import { lmfitTokens } from "@/theme/tokens";

function productName(p: PdvProduct | null): string {
  return p ? String(p.name ?? "Produto") : "";
}

function productSku(p: PdvProduct | null): string {
  return p ? String(p.sku ?? "") : "";
}

/** Cart lines → the order-creation payload. A line's description is built from
 * product/color/size since the API stores line descriptions as free text, not a
 * structured reference back to color/size. */
export function buildOrderLinesPayload(lines: CartLine[]) {
  return lines.map((l) => ({
    variantId: l.variantId,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    description: [l.productName, l.color, l.size].filter(Boolean).join(" · "),
    isOrder: l.isOrder,
  }));
}

/** A sale with any backorder ("encomenda") line can't be marked completed — stock for
 * that line doesn't exist yet — so the whole order stays "open" until it's fulfilled. */
export function deriveOrderStatus(lines: CartLine[]): "open" | "completed" {
  return lines.some((l) => l.isOrder) ? "open" : "completed";
}

/** Builds the "cor · tamanho" toast label for a barcode-matched variant, mirroring what
 * the scan handler shows the operator so they can confirm they scanned the right piece. */
export function matchBarcodeVariantLabel(
  product: PdvProduct,
  variantId: string | undefined,
): string | null {
  const variant = product.variants?.find((v) => String((v as { _id?: string })._id) === variantId);
  if (!variant) return null;
  return [variant.color, variant.size].filter(Boolean).join(" · ");
}

export function PdvClient() {
  const role = useAuthStore((s) => s.inferredRole());
  const operatorLocationId = useAuthStore((s) => s.user?.locationId);
  const [locationNoticeDismissed, setLocationNoticeDismissed] = useState(false);
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
  const [customerResults, setCustomerResults] = useState<Array<{ id: string; name: string }>>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [orderData, setOrderData] = useState<{ variant: VariantRowData; product: Record<string, unknown> } | null>(null);

  useEffect(() => {
    cart.setRole(role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Aquece a foto de catálogo offline deste local assim que o PDV abre — sem isso, a busca/
  // leitura de código de barras não tem nada local pra cair de volta quando a rede falhar.
  // Melhor esforço: se a rede já estiver fora agora, simplesmente não atualiza desta vez.
  useEffect(() => {
    if (!operatorLocationId) return;
    void refreshSnapshot(operatorLocationId).catch(() => undefined);
  }, [operatorLocationId]);

  const term = pdv.search.trim();

  useEffect(() => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      // Local primeiro (funciona sem rede); só cai pra rede se a foto local não achar nada —
      // evita mostrar resultado desatualizado quando a busca local já resolve.
      const local = await searchLocalAsProducts(term, 10) as PdvProduct[];
      const items = local.length > 0 ? local : await pdvSearchProducts(term, 10);
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
        // Local primeiro (funciona sem rede); só cai pra rede se o código não estiver na
        // foto local deste PDV.
        const local = await lookupLocalByBarcodeAsProduct(code);
        const { product, variantId } = local ?? (await pdvLookupByBarcode(code));
        pickProduct(product as PdvProduct);
        const label = matchBarcodeVariantLabel(product as PdvProduct, variantId);
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

  /** Cria um cliente só com o nome digitado e já o seleciona — o comprador que
   * não quer dar CPF/telefone/e-mail sai do caixa em um toque. */
  const quickCreateCustomer = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || creatingCustomer) return;
    setCreatingCustomer(true);
    try {
      const { data } = await http.post<{ _id?: string; id?: string; name?: string }>("/customers", {
        name: trimmed,
      });
      const id = String(data._id ?? data.id ?? "");
      cart.setCustomer({ id, name: data.name ?? trimmed });
      setCustomerSearch("");
      setCustomerResults([]);
      toast.success(`Cliente "${trimmed}" criado`);
    } catch (e) {
      toast.error(axiosErrorMessage(e));
    } finally {
      setCreatingCustomer(false);
    }
  }, [cart, creatingCustomer]);

  /** Venda sem cadastro: usa o "Consumidor Final" do tenant (criado sob demanda na API). */
  const selectWalkIn = useCallback(async (): Promise<{ id: string; name: string } | null> => {
    try {
      const { data } = await http.post<{ _id?: string; id?: string; name?: string }>(
        "/customers/walk-in",
      );
      const customer = {
        id: String(data._id ?? data.id ?? ""),
        name: data.name ?? "Consumidor Final",
      };
      cart.setCustomer(customer);
      setCustomerSearch("");
      setCustomerResults([]);
      return customer;
    } catch (e) {
      setSubmitErr(axiosErrorMessage(e));
      return null;
    }
  }, [cart]);

  const onFinalize = useCallback(async () => {
    const snap = cart.snapshot();
    if (snap.items === 0) return;
    // Sem cliente selecionado a venda segue como "Consumidor Final" — o caso
    // mais comum no balcão é o comprador que não quer se cadastrar.
    if (!snap.customer?.id) {
      const walkIn = await selectWalkIn();
      if (!walkIn) return;
    }
    setSubmitErr(null);
    setOrderWarnings([]);
    setIsPaymentOpen(true);
  }, [cart, selectWalkIn]);

  const handleConfirmPayment = useCallback(async (method: PaymentMethod, notes: string) => {
    const snap = cart.snapshot();
    if (!snap.customer?.id) return;
    setSubmitting(true);
    try {
      // Toda venda passa pela fila local primeiro, online ou offline — o `syncEngine` dispara
      // logo em seguida, então o caso online resolve na prática quase no mesmo instante de
      // antes; o caso offline só fica esperando a conexão voltar. Estoque insuficiente nunca
      // bloqueia mais aqui: a sincronização converte a diferença em encomenda automaticamente.
      const clientSaleId = await enqueueSale({
        customerId: snap.customer.id,
        paymentMethod: method,
        notes: notes ? `PDV mobile - ${notes}` : "PDV mobile",
        lines: buildOrderLinesPayload(snap.lines),
      });
      void flushNow();

      const orderLines = snap.lines.filter(l => l.isOrder);
      if (orderLines.length > 0) {
        await Promise.all(orderLines.map(l => createBatch({
          name: `Encomenda: ${l.productName} - ${[l.color, l.size].filter(Boolean).join(" ")}`.trim(),
          sku: l.sku,
          batchQty: l.quantity,
          status: 'Encomendado (Pago)',
          notes: `Encomenda via PDV para o cliente: ${snap.customer!.name || "Sem Nome"} (${snap.customer!.id})\nVenda local (sincronizando): ${clientSaleId}`,
          imageUrl: l.imageUrl || undefined,
        }).catch(err => {
          console.error("Erro ao criar batch para encomenda", err);
        })));
      }

      setOrderWarnings([]);
      cart.clear();
      pdv.setActiveProduct(null);
      setIsPaymentOpen(false);
      setCustomerSearch("");
      setCustomerResults([]);

      toast.success("Venda registrada — sincronizando…");
    } catch (e) {
      setIsPaymentOpen(false);
      setSubmitErr(axiosErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }, [cart, pdv]);

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
      {submitErr ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {submitErr}
        </p>
      ) : null}

      {orderWarnings.length ? <OrderWarningsPanel warnings={orderWarnings} /> : null}

      <SyncStatusBadge />

      {!operatorLocationId && role !== "guest" && !locationNoticeDismissed ? (
        <div
          className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-xs"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
        >
          <span>
            Você ainda não tem um local de trabalho atribuído — as vendas caem no estoque
            central do tenant, e o modo offline por local não se aplica a este operador. Peça
            a um admin para atribuir seu local de trabalho em Usuários.
          </span>
          <button
            type="button"
            className="shrink-0 underline"
            onClick={() => setLocationNoticeDismissed(true)}
          >
            ok
          </button>
        </div>
      ) : null}

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
              className="w-full border rounded px-2 py-1.5 min-h-10 text-sm bg-[var(--card-bg)]"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              placeholder={cart.customer ? customerLabel : "Buscar por nome ou telefone"}
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setIsNewCustomerOpen(true)}
              className="text-xs font-medium px-2 py-1 border rounded-md whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/5 transition-colors bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              + Novo
            </button>
            <button
              type="button"
              onClick={() => void selectWalkIn()}
              className="text-xs font-medium px-2 py-1 border rounded-md whitespace-nowrap hover:bg-black/5 dark:hover:bg-white/5 transition-colors bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
              title="Venda sem cadastro — comprador não informa nenhum dado"
            >
              Consumidor Final
            </button>
            {customerSearch.trim().length >= 2 ? (
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
                <li className="border-t" style={{ borderColor: lmfitTokens.border }}>
                  <button
                    type="button"
                    disabled={creatingCustomer}
                    className="w-full text-left px-3 py-2 text-sm font-medium hover:bg-[var(--hover-bg)] disabled:opacity-50"
                    style={{ color: lmfitTokens.primary }}
                    onClick={() => quickCreateCustomer(customerSearch)}
                  >
                    {creatingCustomer
                      ? "Criando..."
                      : `+ Criar "${customerSearch.trim()}" e vender`}
                  </button>
                </li>
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
            className="flex-none min-h-12 min-w-12 rounded-md border flex items-center justify-center disabled:opacity-50 touch-manipulation bg-transparent"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.primary }}
          >
            <ScanLine className="h-5 w-5" />
          </button>
        </div>

        {isScannerOpen ? (
          <BarcodeScannerModal onClose={() => setIsScannerOpen(false)} onDetected={handleBarcodeDetected} />
        ) : null}

        {term.length >= 2 ? (
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
        ) : null}

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
