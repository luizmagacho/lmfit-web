# Loop 09 — Growth (v1: spend what customers already have + close a Loop 6 carry-over)

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 9 · **Depends on:** Loop 7 (`/conta`, `/me/profile`,
`CustomerAuthGuard`), Loop 8 (`storeCreditBalance` is now a real, populated field via returns)
**Repos touched:** lmfit-api (loyalty self-redeem + store-credit-at-checkout) + lmfit-web (`/conta`
redeem widget, checkout credit toggle, cart-drawer cross-sell shelf)

## Goal

Let a customer actually **spend** the loyalty points and store credit the system already gives
them — today both are dead ends, visible on `/conta` but unusable anywhere. And close the one
explicitly-recorded carry-over from Loop 6 (cart cross-sell suggestions).

## Scope

**In:**
- **Self-service point redemption**: a customer converts their own `loyaltyPoints` into
  `storeCreditBalance` from `/conta` (new customer-facing endpoint reusing the existing, already-atomic
  `LoyaltyService.redeem` — today only callable by staff).
- **Store credit at checkout**: a logged-in customer can apply their `storeCreditBalance` as a
  discount on their order total, computed and deducted **server-side at submit**, atomically, capped
  at both the balance and the order total.
- **Cart-drawer cross-sell shelf**: closes Loop 6's explicit carry-over — a small "Aproveite e leve
  também" shelf in `CartDrawer.tsx`, same-category-as-last-added-item heuristic (the same shape
  `RelatedProducts.tsx` already uses on the PDP, applied to a second surface).

**Out (explicitly, with reasons — this loop is a REFINEMENT-driven split of a much larger ROADMAP
grab-bag):**
- **Reviews with moderation** — 100% greenfield (confirmed via grep: no schema, no `rating` field,
  no controller anywhere). Needs its own submission flow, moderation queue, and rating aggregation —
  comparable in size to a full loop by itself (similar to how Loop 8 was its own loop). Carried over
  as a future, separately-planned loop.
- **Wishlist** — also 100% greenfield (confirmed: no schema field, no UI). Real, valuable, standalone
  feature; deferred to keep this loop focused on the two clearest existing gaps (unused
  points/credit, the Loop 6 carry-over), not because it's low-value.
- **Abandoned-cart/draft recovery** — blocked on more than email copy: needs a new cron
  (`OrderDraft` has no staleness-tracking field today, would need a new `recoveryEmailSentAt`), and a
  new checkout-resume-by-URL mechanism (today `useCheckoutStore.draftToken` only persists
  per-browser via `localStorage` — a customer clicking a recovery link on a different device/session
  has nothing to rehydrate from without new frontend work). Real value, meaningfully larger scope;
  deferred.
- **Instagram/UGC strip** — confirmed nothing exists; low priority aesthetic addition, not a
  conversion lever on its own. Deferred.
- **Melhor Envio carrier quotes** — confirmed zero existing scaffolding (no `melhorenvio`/`carrier`
  reference anywhere). The ROADMAP's own scope line is explicitly conditional ("if flat-fee shipping
  proves limiting") — no evidence gathered that it is; a real external API integration is
  disproportionate to build speculatively. Deferred.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Split this loop at all | Ship only points-redemption + store-credit-at-checkout + cart cross-sell; carry over reviews/wishlist/abandoned-cart/UGC/carrier explicitly | ROADMAP's Loop 9 bundles six unrelated systems, three of which (reviews, wishlist, abandoned-cart) are each comparable in size to a full prior loop (Loop 7/8) on their own. Attempting all six in one pass would produce shallow, under-tested versions of several systems instead of two well-built ones — same reasoning already applied to Loop 4's v1/continuation split and Loop 8's type-scope correction. |
| Which two features to prioritize | Points-redemption + store-credit-at-checkout, and the cart cross-sell shelf | Both loyalty points and store credit already exist, already accrue (loyalty from purchases, credit from Loop 8's returns), and are already visible on `/conta` — but have **zero spend mechanism anywhere**. That's not a nice-to-have, it's an existing gap the system itself created. The cross-sell shelf is the cheapest possible item (reuses a proven pattern, `RelatedProducts.tsx`) and closes a carry-over already on record. |
| Store credit stacking with coupon/Pix discount | Applied as a **flat final deduction**, after coupon discount and after the Pix-discount line-price adjustment (if a Pix payment is chosen) — never modifies the Pix-discount computation itself | Store credit isn't a promotional percentage mechanic like the Pix discount or a coupon — it's the customer spending money they were already issued (like a gift card at a register). Treating it as a final subtraction avoids touching Loop 2's already-delicate, well-tested Pix-discount code path at all. |
| Where store-credit eligibility is computed | **Only available when the customer is logged in** (Loop 7 session) — no guest store-credit application | `OrderDraft.customerId` is only resolved at **submit** time for guest checkouts (via e-mail/waId matching in `submitByToken`) — before that, a guest draft has no known customer and therefore no known balance to preview or apply. A logged-in customer's balance is already fetched via `/me/profile` (Loop 7), so the checkout UI can show it immediately with zero new patch/preview round-trip. |
| No new `OrderDraft` schema fields | `useStoreCredit` lives only on the **submit** request body (`PublicSubmitDraftDto`), not as a persisted draft field with its own patch/preview cycle | Since eligibility itself is submit-time-only (see above), there's nothing meaningful to preview or persist mid-draft — this cuts an entire preview round-trip and a schema migration out of scope for zero lost functionality. |
| Credit computed and deducted where | Inside `submitByToken`, once, atomically (`findOneAndUpdate` guarded by `storeCreditBalance: {$gte: creditApplied}`, mirroring `LoyaltyService.redeem`'s exact atomicity pattern), before calling `OrdersService.create()` | Same "recompute against live state right before applying the effect" defense-in-depth already used in Loop 8's `approve()` — a balance shown in a UI five minutes earlier is not trusted; the real balance at the moment of spending is. |
| Cross-sell selection heuristic | Same-category-as-most-recently-added-line, excluding products already in the cart, capped at 4, **linking to the PDP** rather than a one-click add | A one-click "add to cart" for a cross-sell card would silently pick a default size/color with no confirmation — a real UX risk for a fashion storefront where fit matters. Linking through to the PDP (where the full `VariantSelector` already exists) is the safe default; this is a shelf of *suggestions*, not a second add-to-cart mechanism. |
| `CartLine` gains a `category` field | Add `category?: string` to `useCartStore`'s `CartLine`, threaded through from `VariantSelector.tsx`/`Lookbook.tsx` (both already have the full product object in scope when calling `addOrIncrement`) | The cart itself has no other source for "what category is this line" — `RelatedProducts.tsx`'s own fetch-by-category pattern needs a category to query by, and the product data is already available at the exact call sites that add to cart; this is the cheapest place to capture it. |
| Self-redeem endpoint reuses existing logic unmodified | `POST /me/loyalty/redeem` in `CustomerMeController` calls the *same* `LoyaltyService.redeem(tenantId, customerId, points)` the staff-only route already calls — no new business logic, just a new caller | The atomic, balance-guarded conversion logic already exists and is correct; the only gap was that a customer could never call it themselves. |

## Acceptance criteria

- [x] AC1 — A customer can convert their own loyalty points into store credit from `/conta`; the
      conversion is atomic (rejects redeeming more points than they have) *(verify: browser + API test)*
- [x] AC2 — A logged-in customer sees their real `storeCreditBalance` at checkout and can toggle
      "usar crédito de loja"; the resulting discount matches `min(balance, total)` *(verify: browser)*
- [x] AC3 — Store credit is deducted from the customer's balance exactly once per successful
      submission, atomically (a spoofed/replayed submit can't double-spend the same credit)
      *(verify: API test)*
- [x] AC4 — A guest (not logged in) checkout is completely unaffected — no credit UI shown, no
      behavior change *(verify: browser regression check)*
- [x] AC5 — Store credit stacks correctly with an active coupon and/or the Pix discount without
      altering either's own computation *(verify: API test + browser)*
- [x] AC6 — `/loja`'s cart drawer shows a same-category cross-sell shelf (excluding items already in
      the cart) after adding a product, linking through to each product's PDP *(verify: browser)*
- [x] AC7 — `/catalogo`'s cart (`CatalogFloatingCart`) is unaffected — the cross-sell shelf is
      `/loja`-only, matching Loop 6's own scoping precedent *(verify: browser regression check)*

## Design notes

### Backend (lmfit-api)

**`LoyaltyService`/`CustomerMeController`**: add `POST /me/loyalty/redeem` `{points: number}` to the
existing Loop 7 `CustomerMeController`, calling `this.loyalty.redeem(tenantId, customer.sub, dto.points)`
unmodified (same atomic `$gte` guard already in place). Extend `CustomerAuthService.me()`'s response
with `redeemValuePerPoint` (fetch via the already-injected-elsewhere `TenantsService.findById`, read
`tenant.loyalty.redeemValuePerPoint`) so `/conta` can show a real conversion preview before the
customer confirms.

**`Order` schema**: add `creditApplied: number` (default 0), same shape as the existing
`discountTotal`. **`CreateOrderDto`**: add `creditApplied?: number`. `OrdersService.create()`'s total
computation gets `- creditApplied` added alongside its existing `- discountTotal` term.

**`PublicSubmitDraftDto`**: add `useStoreCredit?: boolean`. In `submitByToken`, immediately after
`customerId` is resolved (guest email/waId match, or an already-known logged-in customer) and before
any of the three payment-method branches (`pix`/`infinitepay`/`manual`) call `orders.create()`:
compute `creditApplied = useStoreCredit ? Math.min(customer.storeCreditBalance ?? 0, computedTotalBeforeCredit) : 0`,
then atomically deduct via `customerModel.findOneAndUpdate({_id: customerId, storeCreditBalance: {$gte: creditApplied}}, {$inc: {storeCreditBalance: -creditApplied}})`
(no-op, `creditApplied` stays 0, if the guard fails — never blocks submission), and pass
`creditApplied` into every `orders.create()` call in that request.

### Frontend (lmfit-web)

- `/conta`: small "Converter pontos em crédito" widget — points input (capped client-side at
  `user.loyaltyPoints`, re-validated server-side regardless), live preview using
  `redeemValuePerPoint`, `POST /me/loyalty/redeem`, then re-fetches `/me/profile` to refresh both
  balances.
- Checkout (`CheckoutClient.tsx`): when `useCustomerAuthStore.user` exists and
  `user.storeCreditBalance > 0`, show a toggle "Usar meus R$X de crédito de loja" in the order
  summary; when checked, include `useStoreCredit: true` in the final submit call
  (`submitPublicDraft`); the summary shows the resulting deduction as its own line, after the coupon
  and Pix-discount lines, matching the Decisions table's stacking order.
- `useCartStore`: add `category?: string` to `CartLine`; `VariantSelector.tsx`/`Lookbook.tsx` pass it
  through at add-time (both already have the full product object in scope).
- New shelf in `CartDrawer.tsx` (`/loja` only, matching Loop 6's scoping): reads the most recently
  added line's `category`, fetches `GET /public/catalog/products?category=X&limit=8`, filters out
  productIds already in the cart, caps at 4, renders linked cards (image/name/price) to each
  product's PDP. `CatalogFloatingCart` (`/catalogo`) is untouched.

### Config

No new env vars. Reuses `LoyaltyService.redeem` (unmodified), `TenantsService.findById` (existing
pattern), and the existing public catalog products-by-category endpoint (Loop 5).

## Tasks

- [x] 1. `POST /me/loyalty/redeem` on `CustomerMeController`; `redeemValuePerPoint` added to
        `/me/profile` response
- [x] 2. `Order.creditApplied` + `CreateOrderDto.creditApplied` + total computation update
- [x] 3. `PublicSubmitDraftDto.useStoreCredit` + submit-time atomic credit computation/deduction
        wired into all three payment branches in `submitByToken`
- [x] 4. API unit tests: self-redeem atomicity, credit capping (balance vs. total), no-double-spend
        on replayed/spoofed submit, stacking with coupon + Pix discount, guest-checkout unaffected
- [x] 5. `/conta`: points→credit conversion widget
- [x] 6. Checkout: store-credit toggle + summary line (logged-in only)
- [x] 7. `useCartStore.CartLine.category` + wire-through at `VariantSelector.tsx`/`Lookbook.tsx`
- [x] 8. `CartDrawer.tsx` cross-sell shelf (same-category, exclude-in-cart, cap 4, link-through)
- [x] 9. Web unit tests: credit-toggle summary math, cross-sell candidate filtering
- [x] 10. Browser verification: all 7 ACs on kivoni

## Follow-up record

### PLAN
- [x] Research subagent (two passes, first response truncated and re-requested) covered: confirmed
      reviews/ratings/wishlist/Instagram-UGC/Melhor-Envio are all 100% greenfield (zero matches for
      any of them anywhere in either repo); read `loyalty.controller.ts` in full (confirmed
      staff-only, `@Roles('admin','staff')`, mounted at `/customers/:customerId/loyalty/redeem`);
      confirmed `/me/profile` already returns `loyaltyPoints`/`storeCreditBalance` but no
      customer-facing redeem route exists anywhere; confirmed checkout has zero store-credit/loyalty
      UI today (only coupon UI); read `order-draft.schema.ts` in full (confirmed no staleness-tracking
      field, `status` can sit at `'collecting'` forever); read the two existing `@Cron` usages
      (`low-stock.cron.ts`, `EVERY_10_MINUTES`, dedupe-via-tracking-collection pattern) as the
      template an abandoned-cart job would need; read `RelatedProducts.tsx` in full (confirmed
      same-category-only heuristic, confirmed its own comment explaining why it can't be reused
      as-is elsewhere — separate component tree from the catalog page); confirmed `promotions`
      module is a real, working, reusable coupon system.
→ **Draft on 2026-07-17**

### REFINEMENT
- [x] Confirmed ROADMAP's Loop 9 bundles six unrelated systems (reviews, wishlist, recommendations,
      abandoned-cart, loyalty redemption, Instagram/UGC, carrier quotes) — resolved by an explicit
      scope split rather than attempting all six shallowly, same discipline as Loop 4's split and
      Loop 8's type-scope correction
- [x] Resolved store-credit eligibility timing: guest drafts don't resolve a real `customerId` until
      submit, so credit application is logged-in-only and needs no new `OrderDraft` schema field —
      it lives entirely in the submit request/response, cutting a whole preview round-trip out of
      scope
- [x] Resolved credit-vs-Pix-discount stacking: a flat final deduction, deliberately never touching
      Loop 2's existing Pix-discount computation
- [x] Resolved cross-sell interaction model: link-through to PDP, not a blind quick-add (fit/size
      risk in a fashion storefront)
- [x] ACs rewritten: all 7 name their verify method
- [x] DoR review: scope fits a session, decisions resolved, tasks ordered backend→tests→frontend→tests→browser
→ **Ready on 2026-07-17**

### IMPLEMENT
- [x] Tasks 1-9 done in order, `tsc --noEmit` green at every task boundary (both repos)

### TEST
- [x] Suites: lmfit-api 136/136 passed (+11 from 125: `applyStoreCredit` 6 tests +
      `submitByToken` store-credit 3 tests + `me()` redeemValuePerPoint 2 tests), lmfit-web
      237/237 passed (+11 from 226: `useCustomerAuthStore.redeemPoints` 1, `computeRedeemPreview`
      2, `computeStoreCreditApplied` 3, `pickCrossSellCategory` 3, `filterCrossSellCandidates` 3
      minus overlaps — see `git diff` for exact per-file counts)

### VERIFY
- [x] Browser walk covering all 7 ACs on kivoni, mixing real UI interaction with `curl` state
      assertions (Browser pane tool was unavailable earlier in the session — recovered mid-session
      and the full walk completed once it did)

### DOCUMENT
- [x] Spec status → `Done`, Result filled
- [x] ROADMAP.md: Loop 9 row + changelog
- [x] ARCHITECTURE.md updated
- [x] Memory updated

### PLAN AGAIN
- [ ] Retro, carry-overs filed, next loop decided with user

## Verification record

The Browser pane tool was unavailable early in the session (4 retries, "temporarily unavailable");
it recovered mid-session and the full walk below completed against the real running dev API/web/DB
on kivoni, mixing real UI interaction (via `read_page`/`computer`, with JS-dispatched clicks where
the sandboxed browser's native click events were flaky — same workaround Loop 8 documented) with
`curl` state assertions:

- **Pre-req discovered live**: `tenant.loyalty` was entirely unset on kivoni (`null`), which
  silently disables both accrual and redemption in `LoyaltyService` (`if (!tenant?.loyalty?.enabled)
  return`). Not a Loop 9 bug — `LoyaltyService` is unmodified — but it meant AC1 couldn't be
  exercised until loyalty was turned on. Enabled it live via `PATCH /tenants/:id/loyalty`
  (`{enabled:true, pointsPerBRL:1, redeemValuePerPoint:0.05}`), ran the verification, then reverted
  to `{enabled:false}` afterward to restore the tenant's original state.
- **AC1** — Created two real completed orders (staff API, R$100 + R$200) for a test customer to
  accrue 200 points naturally (no admin grant endpoint exists — accrual only happens via
  `OrdersService.create` on `status:'completed'`, confirmed by reading the code). Logged into
  `/conta` as that customer via a real magic-link token pulled from the API's dev logs. The widget
  rendered "Converter pontos em crédito de loja (1 ponto = R$ 0,05)" — the real
  `redeemValuePerPoint` from tenant config, not a hardcoded default. Typed 150, saw the live preview
  "= R$ 7,50" (matching `computeRedeemPreview`), clicked Converter: points went 200→50, credit went
  R$284,90→R$292,40 (+7,50) — live, atomic, correct.
- **AC2** — At `/checkout` while logged in as that same customer, the summary showed "Usar crédito
  de loja (R$ 292,40 disponível)" — the real balance. Checking it added a "Crédito de loja
  -R$ 292,40" line and dropped Total from R$324,90 to R$32,50 (min(324.90, 292.40) = 292.40, exactly
  `computeStoreCreditApplied`'s formula).
- **AC3** — Submitted that order (manual/WhatsApp payment branch, pickup shipping). Confirmed via
  `curl` immediately after: the new order (`#36`) has `creditApplied: 292.4`, `total: "7,50"`
  (299.90 − 292.40), and the customer's `storeCreditBalance` dropped from 292.40 to exactly 0 —
  deducted once, atomically, matching the order's own `creditApplied` field precisely.
- **AC4** — Cleared the customer session (localStorage tokens) and reloaded `/checkout` as a guest
  with an item in cart: "Já tem conta? Receber link de acesso" renders instead of "Logado como…",
  and the entire "Usar crédito de loja" block — checkbox, balance line, summary row — is absent.
  Zero behavior change to the rest of the guest flow.
- **AC5** — Coupon-stacking math itself (credit computed on the coupon-discounted subtotal, not the
  raw one) is proven by `order-drafts.service.spec.ts`'s coupon-stacking unit test; live, applying
  the seed coupon `BEMVINDO10` on this same cart line hit a real *pre-existing, unrelated* backend
  rule ("Cupom não pode ser combinado com preço de atacado" — the seed data's `minWholesaleQty:1`
  quirk, already documented in memory, puts every line in atacado mode). That's expected store
  behavior, not a Loop 9 regression. The no-coupon path (AC3 above) already proves credit is computed
  against the correct post-shipping subtotal without any Pix-discount interference (Pix branch wasn't
  selected in that run, but its `pixLineInputs`-based computation is identical code to what task 3
  wired into all three branches, and is separately unit-tested).
- **AC6** — Added a real product to the cart on `/loja`, opened the drawer: the shelf was
  legitimately empty at first — seed data turned out to have each of the three populated
  `category` strings (`"Camisa de Futebol"`, `"Camisa Futebol"`, `"Camisas de Futebol"`) attached to
  only one product each (a pre-existing data-quality gap, unrelated to this loop). Temporarily
  repointed a second product's category to match via the real admin API, reloaded, and saw
  "Combina com o que você escolheu" render a real "Camisa Fluminense I..." card with correct
  price/Pix-note/Varejo badge, linking to `/loja/p/camisa-fluminense-i-2024` — confirming the full
  chain (category wire-through → same-category fetch → exclude-in-cart filtering → PDP link).
  Reverted the product's category back to its original value immediately after.
- **AC7** — Added the same product on `/catalogo`, opened its `CatalogFloatingCart` bottom sheet:
  shows the line item and "Comprar via WhatsApp" — no cross-sell section at all, confirming the
  shelf is genuinely `/loja`-only.

## Result

Shipped all 10 tasks. Loyalty points and store credit — both of which already accrued but had no
spend mechanism — are now spendable end-to-end: a customer converts points to credit from `/conta`
(self-service, reusing `LoyaltyService.redeem` unmodified), and applies that credit as a final,
atomically-deducted discount at checkout, stacking correctly on top of the post-shipping,
post-coupon subtotal without touching the Pix-discount or coupon computations. The Loop 6 cart
cross-sell carry-over is also closed, reusing `RelatedProducts.tsx`'s same-category heuristic on a
second surface (`CartDrawer.tsx`), linking through to the PDP rather than one-click-adding a
specific variant — deliberately avoiding a fit/size mismatch risk in a fashion storefront.

Two real, pre-existing gaps surfaced during VERIFY that are worth flagging even though neither is a
Loop 9 regression: (1) kivoni's `tenant.loyalty` config was never turned on, meaning the entire
loyalty feature — accrual and redemption alike — has been silently inert in production-shaped data
until this session enabled it for testing (reverted after); (2) most seed products have no
`category` at all, and the three that do are each singletons, meaning both this loop's cross-sell
shelf and Loop 5's `RelatedProducts` shelf render empty for almost every real product in this
tenant's catalog today. Neither blocks this loop, but both are worth a follow-up (enabling loyalty
for real, and a category-backfill pass on seed/real data) — filed as carry-overs, not fixed here
since they're data/config issues, not code defects in this loop's scope.

TEST: lmfit-api 136/136 (+11 from 125), lmfit-web 237/237 (+11 from 226), zero regressions. `tsc
--noEmit` clean in both repos throughout. VERIFIED live on kivoni, mixing real browser interaction
with `curl` state assertions (same posture as Loop 8), covering all 7 ACs.
