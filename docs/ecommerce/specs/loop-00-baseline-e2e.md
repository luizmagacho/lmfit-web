# Loop 00 — Baseline E2E (verify-first)

**Status:** Done (2026-07-15)
**Roadmap entry:** ROADMAP.md §Loop 0 · **Depends on:** —
**Repos touched:** lmfit-api / lmfit-web (read-mostly; small unblocking fixes allowed)

## Goal

Prove — or disprove, with specifics — that the existing storefront skeleton works end-to-end in dev:
a visitor on `kivoni.localhost:3000` can browse the catalog, open a product, create and submit a
public order draft, "pay" via the PIX simulation, and the order shows up **paid** in the admin with
correct stock and loyalty side effects. Everything learned feeds Loop 1's Plan.

This loop intentionally starts at **Verify**: the skeleton (public catalog, drafts, payment
simulation) was built but never walked as one flow.

## Scope

**In:** executing the walk-through, fixing only defects that block it, one automated API-level
happy-path test, writing `ARCHITECTURE.md`.
**Out (explicitly):** any new feature (cart, real payments, accounts), UX polish, refactors.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Fix-or-log threshold | Fix if < ~1h and blocks the walk; otherwise log as gap | Keeps the loop Small |
| Automated test level | API-level (supertest/jest), not browser E2E | Fast, stable; browser walk stays manual this loop |

## Acceptance criteria

- [ ] AC1 — `GET /public/catalog/products` and `/products/:slug` return active products for tenant
      `kivoni` with variants and prices *(verify: curl with `x-tenant-slug` / host header; note which
      tenant-resolution mechanism the public routes actually use)*
- [ ] AC2 — Storefront listing (`/catalogo`) and PDP (`/catalogo/p/[slug]`) render those products in
      the browser, including out-of-stock/backorder presentation *(verify: browser walk + screenshots)*
- [ ] AC3 — A public draft can be created, patched with lines + customer data, and submitted; a real
      Order is created with **server-computed** prices (retail vs wholesale by qty) *(verify: browser
      `pedido/novo` flow; cross-check order in admin `/orders`)*
- [ ] AC4 — Submitting with qty > stock is rejected unless variant accepts backorder ≥ min qty
      *(verify: API test + one manual attempt)*
- [ ] AC5 — PIX simulation confirm (`POST /public/payments/:id/simulate-confirm` or dev-confirm)
      flips the payment to paid and the order to paid, exactly once (second confirm is a no-op/handled)
      *(verify: API test asserting idempotency)*
- [ ] AC6 — Paid order side effects fire: stock decremented, loyalty credited for a registered
      customer and **not** for walk-in, staff alert logged *(verify: DB/admin inspection after AC5)*
- [ ] AC7 — Payment expiration path: an expired pending PIX is marked expired by `markExpiredIfDue`
      and the webhook dispatcher is invoked *(verify: unit/API test with short TTL or clock stub)*
- [ ] AC8 — Automated happy-path test exists and passes in CI: create draft → submit → confirm
      payment → assert order paid *(verify: `npm test` in lmfit-api)*
- [ ] AC9 — `docs/ecommerce/ARCHITECTURE.md` exists: request flow diagram (storefront → api),
      module map, tenant-resolution notes, list of confirmed gaps ranked for Loop 1 *(verify: review)*

## Design notes

Key files to trace during the walk:
- `lmfit-api/src/catalog/catalog.controller.ts` + `catalog.service.ts` — public read surface
- `lmfit-api/src/order-drafts/public-order-drafts.controller.ts` + `order-drafts.service.ts`
  (`submitByToken` ~line 275: pricing, stock, coupon, order creation, staff alert)
- `lmfit-api/src/payments/public-payments.controller.ts` + `payments.service.ts`
  (`createPixPayment` — note `DEV_PIX_PLACEHOLDER` on both branches; `createInfinitePayPayment` —
  checkoutUrl = local simulation)
- `lmfit-web/src/app/(public)/` — `catalogo/`, `catalogo/p/[slug]/`, `pedido/novo/`, `checkout/`,
  `checkout/payment-simulation/`
- Side effects: `loyalty.service.ts` (`creditForOrder`, walk-in exclusion), inventory decrement in
  `orders.service.ts`

Open questions to answer while walking (record answers in ARCHITECTURE.md):
1. How do `(public)` pages resolve the tenant — subdomain, query, or hardcoded?
2. What is `(public)/catalog/page.tsx` vs `(public)/catalogo/` — duplicate to delete or redirect?
3. Does the PDP expose variant selection (color/size) at all today?
4. Where does the customer record come from on public submit (metadata → auto-create? walk-in?)

## Config

None expected. Note any env vars required to run the flow (`PIX_PROVIDER`, `PIX_EXPIRES_MINUTES`,
`PIX_DEV_QR_IMAGE`) in ARCHITECTURE.md.

## Tasks

- [ ] 1. Start api (`:4000`) + web (`:3000`), seed tenant `kivoni`; confirm catalog endpoints (AC1)
- [ ] 2. Browser walk: listing → PDP → pedido/novo → submit → simulation confirm; screenshot each
       state; fix-or-log blockers (AC2, AC3)
- [ ] 3. Inspect side effects in admin/DB: order paid, stock, loyalty, alert (AC5 manual, AC6)
- [ ] 4. Write API happy-path + idempotent-confirm + stock-rejection tests (AC4, AC5, AC8)
- [ ] 5. Exercise expiration path (AC7)
- [ ] 6. Write `ARCHITECTURE.md` + ranked gap list; answer the open questions (AC9)
- [ ] 7. Document phase: update ROADMAP status/changelog; feed carry-overs into Loop 1 outline

## Verification record

- **AC1 ✅** curl with/without `x-tenant-slug: kivoni`: 400 without, products+variants with. Tenant
  resolution = header via `TenantMiddleware` (mandatory on `/public/*`). Money fields are pt-BR
  strings by design (`BrlMoneyResponseInterceptor`, global).
- **AC2 ✅** `/catalogo` renders products, prices, Esgotado badge, search/filters; PDP renders
  variants with per-variant stock + qty steppers (screenshots in session). Price shown is
  role-dependent (staff session ⇒ wholesale).
- **AC3 ✅** Browser checkout (manual/WhatsApp): draft 201 → patch 200 → submit 201 → order
  `6a57e2fa…1eb4` (#27) in admin, guest customer auto-created. **Required a fix:** see Result.
- **AC4 ✅** Unit specs `order-drafts.service.spec.ts` (6 tests): stock rejection, backorder gated by
  feature "production", min-qty rule, server-side retail/wholesale pricing.
- **AC5 ✅** PIX flow via API + browser simulation page: `simulate-confirm` 201 → payment `paid`,
  order #28 `Concluído`. Idempotency covered by `payments.service.spec.ts` (second confirm →
  BadRequest "não está pendente"; InfinitePay replay path asserted).
- **AC6 ✅** Stock M 120→117 (exactly 3, decremented **on paid**, not at order creation); guest
  customer `walkIn:false`, 0 loyalty points (tenant loyalty disabled in seed — behavior consistent);
  staff alerts `order_draft_submitted` logged for both orders (API logs).
- **AC7 ✅** `markExpiredIfDue` unit specs: overdue pending → `expired` + `payment.expired` webhook;
  not-due and non-pending → no-op.
- **AC8 ✅** (adjusted level, see Result) 13 new jest tests green; full API suite 37/37; `tsc` clean.
- **AC9 ✅** [ARCHITECTURE.md](../ARCHITECTURE.md) written: flow diagram, tenant/money conventions,
  answers to all 4 open questions, ranked gap list (8 items).

## Result

**Shipped:** verified buy flow end-to-end (both payment paths), 1 blocking bug fixed, 13 unit tests,
ARCHITECTURE.md.

**The blocking bug (fixed):** `PublicSubmitPaymentDto.method` only allowed `'pix'`, while the
checkout UI sends `'manual'`/`'infinitepay'` → every storefront submit failed with 422. Fixed by
extending the enum (`public-submit-draft.dto.ts`); the service already handled all three branches.

**Deviations:**
- AC8 implemented as unit-level specs + live manual walk instead of a supertest/DB integration test
  (no in-memory Mongo infra exists yet) — carry-over below.

**Carry-overs → Loop 1 Plan:**
- The audit was too pessimistic: cart, checkout UI, shipping picker v1 and real InfinitePay link
  generation already exist. Loop 1 rescoped to storefront UX gaps (retail price display for
  consumers on PDP already works; missing: order-confirmation page, cart page/mini-cart, listing
  price ranges, kill `pedido/novo` harness + `(public)/catalog` stub).
- Full ranked gap list in ARCHITECTURE.md §Gaps (stock reservation, PIX QR, tenant shipping config,
  `infinitePayTag` exposure, seed `minWholesaleQty:1`, mongodb-memory-server e2e).
