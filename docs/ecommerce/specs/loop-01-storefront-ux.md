# Loop 01 — Storefront UX: confirmation page, price ranges, checkout consistency

**Status:** Done (2026-07-15)
**Roadmap entry:** ROADMAP.md §Loop 1 · **Depends on:** Loop 0
**Repos touched:** lmfit-web (only — no API changes needed)

## Goal

A buyer who pays (or submits a WhatsApp order) lands on a proper **"Pedido confirmado"** page instead
of the `/pedido/novo` dead end; catalog cards show honest prices (**range** when variants differ);
and the two smaller correctness bugs found in Loop 0 are fixed.

> Rescope note: Loop 0 proved the original "cart & variant picker" scope already exists
> (`useCartStore` persisted per tenant, `VariantGrid` steppers, `CatalogFloatingCart`,
> full `/checkout`). This loop closes the UX gaps that actually remain.

## Scope

**In:**
1. `/pedido/confirmado` page (reads draft by token + optional paymentId) + redirect updates in the
   3 post-submit points (CheckoutClient manual path, payment-simulation confirm, CatalogFloatingCart).
2. Price range on catalog cards when variant prices differ (e.g. "R$ 129,99 – R$ 420,00").
3. Fix `pedido/novo` catalog fetch (`{items,total}` shape — currently treats response as array).
4. `CatalogFloatingCart`: WhatsApp number from `tenant.whatsappNumber` (hardcoded today).

**Out (explicitly):** payments/PSP work (Loop 2), shipping config (Loop 3), customer accounts
(Loop 4), merging the floating-cart inline checkout with `/checkout` (carry-over).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Confirmation data source | Existing `GET /public/order-drafts/:token` + `GET /public/payments/:id` | No API changes; token already returned everywhere |
| Range formatting | "R$ min – R$ max", single price when equal | Mirrors admin products list pattern shipped 2026-07-15 |
| Floating-cart phone fallback | `tenant.whatsappNumber` → existing constant | No regression for the one store relying on it today |

## Acceptance criteria

- [ ] AC1 — After the WhatsApp/manual checkout submit, the buyer lands on `/pedido/confirmado` showing
      order id, items, totals and a "pedido recebido" state *(verify: browser walk)*
- [ ] AC2 — After PIX simulation confirm, the buyer lands on `/pedido/confirmado` showing **pago**
      state *(verify: browser walk with paymentId)*
- [ ] AC3 — Catalog card shows a price range when variant prices differ, single price otherwise
      *(verify: Real Madrid card shows range; Flamengo shows single price)*
- [ ] AC4 — `pedido/novo` loads the variant list again (response-shape fix) *(verify: page renders options)*
- [ ] AC5 — Floating-cart WhatsApp message targets `tenant.whatsappNumber` when set *(verify: unit/code review; kivoni has none → fallback)*
- [ ] AC6 — Web suite + `tsc --noEmit` green; no admin regressions *(verify: npm test)*

## Design notes

- Confirmation page: `src/app/(public)/pedido/confirmado/page.tsx` + client component; params
  `?token=…&paymentId=…`. Draft gives `orderId`, `lines[]` (unitPrice as BR string — parse!),
  `shippingCost`, `discountTotal`, `metadata.customer`. Poll payment status every ~4s while pending.
- Price range: extend `ProductGrid`/`PriceTag` with `priceMax`; compute min/max over
  `variants[].price` with the existing `extractPrice` (already comma-safe).
- Redirect points: `CheckoutClient.submit` manual branch (`router.push`), `payment-simulation`
  page line ~101, `CatalogFloatingCart.handleCheckout` after WhatsApp open.

## Config

None.

## Tasks

- [ ] 1. Confirmation page + redirects (AC1, AC2)
- [ ] 2. ProductGrid/PriceTag range (AC3)
- [ ] 3. pedido/novo shape fix (AC4)
- [ ] 4. Floating-cart tenant phone (AC5)
- [ ] 5. Tests + browser verification + document (AC6)

## Verification record

- **AC1 ✅** `/pedido/confirmado?token=<manual-order token>` → "Pedido recebido!" with buyer first
  name, order ref #231EB4, item "2× Camisa Real Madrid I 2024 (Padrão · M)", totals R$ 599,80.
- **AC2 ✅** `…?token=…&paymentId=<paid pix>` → "Pagamento confirmado!" (green check), #231EB8,
  3× M, total R$ 899,70; payment status resolved via `/public/payments/:id`. "Falar com a loja"
  correctly hidden (kivoni has no whatsappNumber).
- **AC3 ✅** Anonymous `/catalogo`: Real Madrid card shows "R$ 129,99 – R$ 420,00" (Varejo badge);
  uniform-price products keep single price. Staff/atacado mode unchanged (range is varejo-only).
- **AC4 ✅** `pedido/novo` → Continuar → variant select repopulated (41 options; was 0 before the
  `{items,total}` shape fix).
- **AC5 ✅** Code-reviewed: `CatalogFloatingCart` now uses `tenant.whatsappNumber` (digits-only) with
  the previous constant as fallback; kivoni exercises the fallback path.
- **AC6 ✅** `tsc --noEmit` clean; web suite 158/158; API suite 37/37 (unchanged).

## Result

**Shipped (lmfit-web only):**
- `/pedido/confirmado` (page + client): draft summary by token, payment polling (4s while pending),
  item names resolved from the public catalog, tenant WhatsApp CTA, paid vs received states.
- All three post-submit paths now land there: `CheckoutClient` (manual), `payment-simulation`
  (with paymentId), `CatalogFloatingCart`.
- `PriceTag`/`ProductGrid`: min–max price range on cards when variant prices differ (varejo mode).
- `pedido/novo` response-shape fix; floating-cart WhatsApp number from tenant config.

**Deviations:** none from scope; confirmation-page item names come from an extra catalog fetch
(draft lines don't embed names) — acceptable v1, noted for Loop 4's "meus pedidos".

**Carry-overs → Loop 2 Plan:**
- Floating cart still duplicates checkout logic inline (name/phone/coupon form) — converge on
  `/checkout` when Loop 2 touches payment method selection.
- Confirmation page shows draft data, not the order — once customer accounts exist (Loop 4), link
  to a real order view.
- Dev DB test data left behind: orders #27/#28, customers "Cliente Teste Loop Zero" / "Comprador
  PIX Loop Zero".
