"use client";

import * as React from "react";
import Link from "next/link";
import { ShoppingBag, X, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore, type CartLine } from "@/stores/useCartStore";
import { useCheckoutStore } from "@/stores/useCheckoutStore";
import { useTenant, useThemeTokens } from "@/context/TenantContext";
import { QuickCart } from "@/components/organisms/QuickCart";
import { PixInstallmentNote } from "@/components/atoms/PixInstallmentNote";
import { usePricingRules } from "@/hooks/usePricingRules";
import { createDraft, patchDraft } from "@/lib/publicOrders";
import { publicHttp } from "@/lib/publicHttp";
import { extractListItems, documentId } from "@/lib/normalizeApiList";
import { resolveProductImageUrls } from "@/lib/productImageUrl";
import { PriceTag } from "@/components/atoms/PriceTag";
import { ImageCarousel } from "@/components/ImageCarousel";
import { retailPrice, variantPriceRange, type CatalogProduct } from "@/components/organisms/ProductGrid";
import { inferModeForUser } from "@/lib/pricing";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

const CROSS_SELL_LIMIT = 4;

/** Categoria da última linha adicionada ao carrinho (Loop 9) — varre de trás pra frente porque
 *  itens já existentes são atualizados no lugar (`addOrIncrement`), então o fim do array nem
 *  sempre tem `category` se o último toque do usuário foi só incrementar uma linha antiga. */
export function pickCrossSellCategory(lines: CartLine[]): string | undefined {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].category) return lines[i].category;
  }
  return undefined;
}

/** Exclui produtos já no carrinho e capa em `limit` (Loop 9) — mesmo cross-sell não faz sentido
 *  sugerir de volta o que o cliente acabou de colocar na sacola. */
export function filterCrossSellCandidates(
  items: CatalogProduct[],
  cartProductIds: Set<string>,
  limit: number = CROSS_SELL_LIMIT,
): CatalogProduct[] {
  return items.filter((p) => !cartProductIds.has(documentId(p))).slice(0, limit);
}

/**
 * Vitrine de cross-sell (Loop 9) — mesma categoria da última linha adicionada, sem repetir o que
 * já está na sacola. Cards linkam pra PDP em vez de adicionar direto: risco de acertar
 * cor/tamanho errado é alto numa loja de moda, então o cliente escolhe a variante na própria
 * página do produto (mesma decisão do carry-over do Loop 6 — nunca implementada até agora).
 */
function CrossSellShelf() {
  const cart = useCartStore();
  const snap = cart.snapshot();
  const category = pickCrossSellCategory(snap.lines);
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const mode = inferModeForUser(snap.role);

  useEffect(() => {
    if (!category) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await publicHttp.get<unknown>("/public/catalog/products", {
          params: { category, limit: CROSS_SELL_LIMIT + snap.lines.length },
        });
        const list = extractListItems(data) as CatalogProduct[];
        if (!cancelled) {
          const cartProductIds = new Set(snap.lines.map((l) => l.productId));
          setItems(filterCrossSellCandidates(list, cartProductIds));
        }
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, snap.lines.map((l) => l.productId).join(",")]);

  if (items.length === 0) return null;

  return (
    <section className="px-4 py-3 border-t space-y-2" style={{ borderColor: lmfitTokens.border }}>
      <h3 className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
        Combina com o que você escolheu
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((p) => {
          const id = documentId(p) || String(p.slug ?? "");
          const slug = p.slug ? String(p.slug) : id;
          const urls = resolveProductImageUrls(p);
          const range = mode === "varejo" ? variantPriceRange(p) : null;
          const price = range ? range.min : retailPrice(p);
          const priceMax = range && range.max > range.min ? range.max : null;
          return (
            <Link
              href={`/loja/p/${slug}`}
              key={id || String(p.name)}
              onClick={cart.close}
              className="flex-shrink-0 w-28 rounded-lg border bg-[var(--card-bg)] overflow-hidden hover:border-[var(--primary)] transition-colors"
              style={{ borderColor: lmfitTokens.border }}
            >
              <div className="relative w-full bg-neutral-100" style={{ aspectRatio: "1 / 1" }}>
                {urls.length > 0 ? (
                  <ImageCarousel urls={urls} size="fill" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400" aria-hidden>
                    Sem foto
                  </div>
                )}
              </div>
              <div className="p-2 space-y-1">
                <h4 className="text-xs font-medium line-clamp-2" style={{ color: lmfitTokens.text }}>
                  {String(p.name ?? "Produto")}
                </h4>
                <PriceTag price={price} priceMax={priceMax} mode={mode} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** Extraída como função pura pra ser testável sem montar o componente (Loop 6). */
export function freeShippingProgress(
  subtotal: number,
  freeAboveTotal: number,
): { remaining: number; pct: number } {
  if (!(freeAboveTotal > 0)) return { remaining: 0, pct: 100 };
  const remaining = Math.max(0, freeAboveTotal - subtotal);
  const pct = Math.min(100, Math.max(0, Math.round((subtotal / freeAboveTotal) * 100)));
  return { remaining, pct };
}

function FreeShippingBar({ subtotal, freeAboveTotal }: { subtotal: number; freeAboveTotal: number }) {
  const { remaining, pct } = freeShippingProgress(subtotal, freeAboveTotal);
  return (
    <div className="px-4 py-2.5 space-y-1.5" style={{ backgroundColor: "color-mix(in srgb, var(--kivoni-primary) 6%, transparent)" }}>
      <p className="text-xs font-medium" style={{ color: lmfitTokens.text }}>
        {remaining > 0 ? (
          <>Faltam <strong>{formatBRL(remaining)}</strong> para frete grátis!</>
        ) : (
          <span className="inline-flex items-center gap-1" style={{ color: lmfitTokens.success }}>
            <Check size={14} aria-hidden /> Sua compra tem frete grátis!
          </span>
        )}
      </p>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: lmfitTokens.border }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: remaining > 0 ? lmfitTokens.primary : lmfitTokens.success }}
        />
      </div>
    </div>
  );
}

/**
 * Sacola do /loja (Loop 6) — substitui o `CatalogFloatingCart` só aqui; o /catalogo simples
 * continua com o bottom-sheet + WhatsApp de sempre, sem drawer. Abre automaticamente quando
 * `VariantSelector`/`Lookbook` chamam `cart.open()` depois de adicionar um item.
 */
export function CartDrawer() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { buttonStyle } = useThemeTokens();
  const { pixPriceFor, installmentsTextFor } = usePricingRules();
  const cart = useCartStore();
  const checkout = useCheckoutStore();
  const snap = cart.snapshot();
  const [couponInput, setCouponInput] = useState(checkout.couponCode);
  const [applying, setApplying] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const items = snap.items;
  const freeAboveTotal = tenant?.shippingConfig?.freeAboveTotal;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) {
      checkout.clearCoupon();
      setCouponError(null);
      return;
    }
    setApplying(true);
    setCouponError(null);
    try {
      let token = checkout.draftToken;
      if (!token) {
        const created = await createDraft(cart.customer?.phone);
        token = created.sessionToken;
        checkout.setDraftToken(token);
      }
      const result = await patchDraft(token, {
        lines: snap.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, unitPrice: l.unitPrice })),
        couponCode: code,
      });
      checkout.setCoupon(code.toUpperCase(), Number(result.discountTotal ?? 0));
    } catch (e: any) {
      checkout.clearCoupon();
      setCouponError(e?.response?.data?.message || "Cupom inválido ou não aplicável.");
    } finally {
      setApplying(false);
    }
  }

  if (items === 0) return null;

  return (
    <>
      {cart.isOpen ? (
        <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={cart.close} aria-hidden="true" />
      ) : null}

      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[var(--card-bg)] shadow-2xl transition-transform duration-300 flex flex-col ${
          cart.isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Sua sacola"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text }}>
            Sua sacola
          </h2>
          <button onClick={cart.close} aria-label="Fechar" className="p-1" style={{ color: lmfitTokens.textMuted }}>
            <X size={20} />
          </button>
        </div>

        {freeAboveTotal && freeAboveTotal > 0 ? (
          <FreeShippingBar subtotal={snap.subtotal} freeAboveTotal={freeAboveTotal} />
        ) : null}

        <div className="px-4 py-3 space-y-2 border-b" style={{ borderColor: lmfitTokens.border }}>
          <PixInstallmentNote pixPrice={pixPriceFor(snap.subtotal)} installmentsText={installmentsTextFor(snap.subtotal)} />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Cupom de desconto"
              className="flex-1 min-h-9 border rounded-md px-3 text-sm uppercase placeholder:normal-case"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              disabled={applying}
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={applying}
              className="min-h-9 px-4 rounded-md border text-sm font-medium disabled:opacity-50"
              style={{ borderColor: lmfitTokens.primary, color: lmfitTokens.primary }}
            >
              {applying ? "..." : "Aplicar"}
            </button>
          </div>
          {couponError ? (
            <p className="text-xs" style={{ color: lmfitTokens.error }}>
              {couponError}
            </p>
          ) : null}
          {checkout.couponCode && checkout.discountTotal > 0 ? (
            <p className="text-xs font-medium" style={{ color: lmfitTokens.success }}>
              Cupom {checkout.couponCode} aplicado: -{formatBRL(checkout.discountTotal)}
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <QuickCart
            onFinalize={() => {
              cart.close();
              router.push("/checkout");
            }}
            finalizeLabel="Ir para o checkout"
            finalizeVariant={buttonStyle}
          />
          <CrossSellShelf />
        </div>
      </div>

      {!cart.isOpen ? (
        <button
          onClick={cart.open}
          className="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-80 h-14 rounded-full shadow-lg flex items-center justify-between px-6 transition-transform active:scale-95 z-40"
          style={{ backgroundColor: lmfitTokens.primary, color: "white" }}
        >
          <div className="flex items-center gap-2 font-medium">
            <div className="relative">
              <ShoppingBag size={20} />
              <span className="absolute -top-1.5 -right-2 bg-white text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full" style={{ color: lmfitTokens.primary }}>
                {items}
              </span>
            </div>
            <span>Ver Sacola</span>
          </div>
          <span className="flex flex-col items-end">
            <span className="font-semibold">{formatBRL(snap.subtotal)}</span>
            {(() => {
              const pixPrice = pixPriceFor(snap.subtotal);
              return pixPrice != null ? (
                <span className="text-[11px] opacity-90 tabular-nums">{formatBRL(pixPrice)} no Pix</span>
              ) : null;
            })()}
          </span>
        </button>
      ) : null}
    </>
  );
}
