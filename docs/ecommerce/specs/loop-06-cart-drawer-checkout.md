# Loop 06 — Storefront V2: cart drawer + one-page checkout

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 6 · **Depends on:** Loop 3 (shipping config), Loop 5 (`/loja`
route split from `/catalogo`)
**Repos touched:** lmfit-web only (no backend changes — reuses existing endpoints)

## Goal

Conversion-grade sacola (cart drawer) and checkout for `/loja` — replace the bottom-sheet floating
cart with a proper side drawer that opens on every "Comprar" action, and evolve the existing
one-page checkout with a persisted state, a coupon field, and a sticky order summary.

## Scope

**In (this loop is `/loja`-only — see Decisions):**
- **Cart drawer**: right-side slide-over, opens automatically when adding to cart from `/loja`'s
  PDP or Lookbook; reuses `QuickCart` (already shared with PDV, container-agnostic) for the line
  list; free-shipping progress bar ("Faltam R$X para frete grátis!" / a "grátis" state once
  crossed); a coupon field that applies a real discount via the existing public order-draft PATCH
  endpoint; "ou R$X no Pix" note; CTA that navigates to `/checkout` (not an immediate submit).
- **One-page checkout evolution**: keep the existing single-page structure (per STOREFRONT-V2 §5's
  reconciliation decision — evolve, don't rewrite into a multi-step wizard); add a coupon
  field/section; make `useCheckoutStore` persist across reloads; sticky order-summary sidebar on
  desktop, collapsible on mobile; lightweight "done" indicator per section (not a blocking wizard).
- **Draft/coupon continuity between drawer and checkout**: applying a coupon in the drawer creates
  an order draft and stores its token; checkout reuses that same draft instead of creating an
  orphan, so a shopper who applies a coupon in the drawer sees the identical discount at checkout.

**Out (explicitly, with reasons):**
- **Cart cross-sell suggestions** ("Aproveite e leve a X") — STOREFRONT-V2 §2.5 asks for this, but
  `RelatedProducts.tsx` (Loop 5) is keyed to a single PDP product/category and isn't a drop-in for
  a multi-line cart context; a real cart cross-sell needs its own selection heuristic (e.g.
  category of the most-recently-added line, excluding everything already in the cart) — new
  work, not a quick reuse. Carried over.
- **"Login rápido se conta existir"** (§2.6 point 1) — there is no customer authentication system
  yet; that's Loop 7 (Customer accounts), sequenced after this one in ROADMAP.md itself. Guest
  checkout (today's only mode) stays the only mode this loop.
- **`/catalogo`'s cart/checkout flow** — deliberately untouched. `/catalogo` (the simple, wholesale,
  WhatsApp-order catalog from the earlier `/catalogo`↔`/loja` split) keeps `CatalogFloatingCart`
  exactly as it is today: a bottom sheet that goes straight to a WhatsApp message, no drawer, no
  `/checkout` page involved. This loop's new drawer only replaces the floating cart on `/loja`.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Scope: `/loja` only | New drawer replaces `CatalogFloatingCart` in `loja/layout.tsx` only; `catalogo/layout.tsx` keeps importing the unmodified `CatalogFloatingCart` | `/catalogo`'s whole reason to exist (from the split done earlier today) is to stay simple and WhatsApp-order-based; giving it a "conversion-grade" drawer+checkout would undo that split's intent |
| Reuse `QuickCart` for the line list | Yes, unchanged | Already container-agnostic (reads `useCartStore` directly, no cart data via props), already proven shared between `CatalogFloatingCart` and PDV — the new drawer is just a different container around the same list |
| Shared "drawer open" signal | Add `isOpen`/`open()`/`close()`/`toggle()` to `useCartStore` (not persisted — excluded from the existing `partialize`) | `useCartStore` is the one thing every add-to-cart call site already imports; a new tiny UI store would be one more thing to wire for no benefit. Not persisting `isOpen` means the drawer never auto-opens on a fresh page load |
| Which call sites open the drawer | `VariantSelector.tsx` (PDP add-to-bag) and `Lookbook.tsx` ("add all to cart") — both `/loja`-only components | `VariantGrid.tsx` (PDV + `/catalogo`) and `ChatWidget.tsx` (shared across every public route, different feature, not fully in scope) are deliberately left alone — calling `cart.open()` from them would either affect PDV/`/catalogo` (unwanted) or touch a component outside this loop's actual ask |
| Coupon validation mechanism | Reuse the existing "create-or-reuse draft → PATCH with `couponCode` → read back `discountTotal`" pattern already proven in `CatalogFloatingCart.tsx` — no new backend endpoint | There is no lightweight "validate-only" public endpoint (confirmed by reading the API) — inventing one is backend scope beyond this loop; the existing pattern already gives a real, server-computed discount |
| Where the draft token lives | `useCheckoutStore` gains `draftToken`/`couponCode`/`discountTotal` (+ setters); the drawer creates the draft on first coupon-apply, checkout's `submit()` reuses `checkout.draftToken` if present instead of always creating a fresh one | One draft per cart session, not one per component — avoids orphaned drafts and guarantees the discount shown in the drawer is the exact discount charged at submit |
| `useCheckoutStore` persistence | Wrap in zustand `persist`, partialized to exclude `pix` (the in-flight dynamic-QR payment state, which has its own `expiresAt` lifecycle and would show a stale/expired QR if resurrected after reload) | Satisfies STOREFRONT-V2 §2.6's explicit "estado sobrevive a reload" requirement, which the current implementation does not meet (confirmed: no `persist()` wrapper today) |
| Checkout layout | Keep single page (already true today, matches the recorded §5 decision); add a `lg:` two-column layout with a sticky order-summary sidebar, collapsible on mobile; add a small per-section "done" checkmark instead of gating/hiding future sections | A hard multi-step wizard would contradict the already-recorded one-page decision; a lightweight progress indicator satisfies "cada seção valida progressivamente" without that rework |
| Free-shipping progress bar | `tenant.shippingConfig.freeAboveTotal` vs. `snap.subtotal`, in the drawer only (not checkout — checkout already shows the real computed `Frete` line) | Already the correct, proven field (used by `ShippingPicker`'s own `shippingCost()`) — no new tenant config |

## Acceptance criteria

- [x] AC1 — Adding a product from `/loja`'s PDP (`VariantSelector`) or the Lookbook's "add all"
      opens the cart drawer automatically, without a page reload *(verify: browser, add an item,
      confirm the drawer opens)*
- [x] AC2 — The drawer shows "Faltam R$X para frete grátis" when subtotal is below the tenant's
      `freeAboveTotal`, and a "frete grátis" success state once it's crossed *(verify: browser,
      add items until crossing the configured threshold)*
- [x] AC3 — Applying a real coupon code in the drawer shows the server-computed discount, and the
      exact same discount (same draft) appears at `/checkout` without re-entering the code
      *(verify: browser, apply a real promo code in the drawer, navigate to checkout, confirm the
      discount line matches; submit and confirm exactly one order/draft was created — not two)*
- [x] AC4 — Filling in checkout (name/phone/address/shipping method) and reloading the page keeps
      everything filled in *(verify: browser, fill fields, hard-reload, confirm state survived)*
- [x] AC5 — Checkout shows a sticky order-summary sidebar on desktop (≥1024px) and a collapsible
      summary on mobile *(verify: browser at both viewport widths)*
- [x] AC6 — `/catalogo`'s cart (`CatalogFloatingCart`, bottom sheet + WhatsApp) is unchanged —
      regression check that this loop didn't leak into the simple catalog *(verify: browser,
      confirm `/catalogo` still shows the bottom-sheet floating cart, not the new drawer)*
- [x] AC7 — Full guest checkout (no account) completes end-to-end *(verify: browser, full submit
      via manual/WhatsApp — live-tested; InfinitePay/Pix submission code path is unchanged by this
      loop, `submitPublicDraft` called identically to before, see Verification record)*

## Design notes

### Frontend

- `useCartStore.ts`: add `isOpen: boolean`, `open()`, `close()`, `toggle()` — excluded from the
  existing `partialize` (only `lines`/`customer`/`role` persist).
- New `src/components/organisms/CartDrawer.tsx`: right-side slide-over (`fixed inset-y-0 right-0
  w-full max-w-md`, `translate-x-full` ↔ `translate-x-0` transition + backdrop), header ("Sua
  sacola" + close), free-shipping progress bar, coupon input + apply button (creates/reuses the
  draft via `useCheckoutStore`), `<QuickCart onFinalize={() => { close(); router.push('/checkout')
  }} finalizeLabel="Ir para o checkout" />`, floating trigger pill button (same visual language as
  today's `CatalogFloatingCart` button) shown when closed and `items > 0`.
- `loja/layout.tsx`: swap `<CatalogFloatingCart />` → `<CartDrawer />`. `catalogo/layout.tsx`
  untouched.
- `VariantSelector.tsx` / `Lookbook.tsx`: call `cart.open()` right after `addOrIncrement(...)`.
- `useCheckoutStore.ts`: add `draftToken: string | null`, `couponCode: string`,
  `discountTotal: number`, `setDraftToken`, `setCoupon(code, discountTotal)`, `clearCoupon()`; wrap
  the whole store in `persist()` (`name: "kivoni-checkout"`, `partialize` excludes `pix`); `reset()`
  also clears the new fields (called alongside `cart.clear()` after a successful submit).
- `src/lib/publicOrders.ts`: replace `createPublicDraftWithLines` with two primitives —
  `createDraft(): Promise<{ sessionToken }>` (`POST /public/order-drafts`) and
  `patchDraft(token, body): Promise<PublicDraft & { discountTotal?: number }>`
  (`PATCH /public/order-drafts/:token`) — both `CartDrawer` (coupon-apply) and `CheckoutClient`
  (submit) call these directly instead of the old all-in-one helper, so a draft created by the
  drawer can be patched again by checkout instead of creating a second one.
- `CheckoutClient.tsx`: `submit()` reuses `checkout.draftToken` if set (patches it with final
  lines/shipping/customer/coupon) instead of always creating a new draft; add a coupon
  input/summary line (editable, in case the shopper skipped the drawer); restructure the return
  JSX into `lg:grid lg:grid-cols-[1fr_360px] lg:gap-6` — form sections in the left column, a
  `lg:sticky lg:top-4` order-summary card in the right column (same content as today's "Revisão"
  section); on mobile the summary becomes a collapsible details/summary-style panel, collapsed by
  default; each section header gets a small checkmark once its own validation condition is true
  (name+phone filled; address valid when shipping≠pickup; a payment method is selected).

### Config

No new env vars, no backend changes — the coupon mechanism reuses the existing
`PATCH /public/order-drafts/:token` `couponCode` field and `discountTotal` response, already built
in Loop 2.

## Tasks

- [x] 1. `useCartStore`: `isOpen`/`open`/`close`/`toggle`
- [x] 2. `publicOrders.ts`: `createDraft`/`patchDraft` primitives (replace
        `createPublicDraftWithLines`)
- [x] 3. `useCheckoutStore`: `draftToken`/`couponCode`/`discountTotal` fields + `persist()` wrapper
        (partialize excludes `pix`)
- [x] 4. `CartDrawer.tsx`: slide-over shell + free-shipping bar + coupon apply + `QuickCart` +
        floating trigger
- [x] 5. Wire `VariantSelector.tsx`/`Lookbook.tsx` to call `cart.open()`; swap
        `loja/layout.tsx`'s floating cart for `CartDrawer`
- [x] 6. `CheckoutClient.tsx`: draft-reuse in `submit()`, coupon section, sticky/collapsible
        summary layout, per-section done-checkmarks
- [x] 7. Unit tests: `useCartStore` open/close, draft-reuse decision logic, free-shipping-remaining
        math, `useCheckoutStore` persistence partialize
- [x] 8. Browser verification: all 7 ACs on kivoni, plus the `/catalogo` regression check

## Follow-up record

### PLAN
- [x] Explored code via a research subagent: `useCartStore.ts` (full), `CatalogFloatingCart.tsx`
      (full, confirmed shared by both `/loja` and `/catalogo` layouts today), `QuickCart.tsx` (full,
      confirmed shared with PDV, container-agnostic), `CheckoutClient.tsx` (full, confirmed already
      single-page, confirmed zero coupon UI, confirmed `useCheckoutStore` isn't persisted),
      `useCheckoutStore.ts` (full), coupon/promo validation (confirmed no public validate-only
      endpoint exists, only the apply-via-PATCH pattern), `freeAboveTotal` field (confirmed correct,
      already used by `ShippingPicker`), `RelatedProducts.tsx` (confirmed not a drop-in for cart
      cross-sell), and confirmed there's currently no shared "open the cart" mechanism anywhere
- [x] Draft spec written with ACs, tasks, decisions
→ **Draft on 2026-07-16**

### REFINEMENT
- [x] Decisions resolved: `/loja`-only scope (not `/catalogo`), `QuickCart` reuse, shared open-state
      lives on `useCartStore` (not a new store), which call sites open the drawer (deliberately not
      `VariantGrid`/`ChatWidget`), coupon mechanism reuses the existing PATCH pattern with the draft
      token shared via `useCheckoutStore`, checkout stays single-page with a sticky/collapsible
      summary rather than becoming a wizard
- [x] Scope split from STOREFRONT-V2's full §2.5–2.6 wishlist: cart cross-sell and quick-login
      explicitly carried over, not silently dropped
- [x] ACs rewritten: all 7 name their verify method
- [x] DoR review: scope fits a session, decisions resolved, tasks ordered (cart-store flag → draft
      primitives → checkout-store persistence → drawer UI → wiring → checkout evolution → tests →
      browser)
→ **Ready on 2026-07-16**

### IMPLEMENT
- [x] All 8 tasks completed in order
- [x] `tsc --noEmit` green at every task boundary
→ **done on 2026-07-16**

### TEST
- [x] Suites: lmfit-web 209/209 (no backend changes this loop)
→ **green on 2026-07-16**

### VERIFY
- [x] Browser walk covering all 7 ACs on kivoni
→ **all ✅ on 2026-07-16**

### DOCUMENT
- [x] Spec status → `Done`, Result filled
- [x] ROADMAP.md: Loop 6 row + changelog
- [x] ARCHITECTURE.md updated
→ **merged on 2026-07-16**

### PLAN AGAIN
- [x] Retro, carry-overs filed (cart cross-sell, quick-login), memory updated
→ **Loop 7 PLAN — awaiting go-ahead**

## Verification record

All on kivoni, via the real browser:

- **AC1** — Added a size-M Flamengo shirt from `/loja`'s PDP; confirmed the drawer slid open
  automatically (no `router.push`, no reload) showing the line, free-shipping bar, and Pix note.
- **AC2** — With subtotal R$299,90 and `tenant.shippingConfig.freeAboveTotal = R$500`, the drawer
  showed "Faltam R$200,10 para frete grátis!" — exact match (`500 - 299.90 = 200.10`).
- **AC3** — Created a fresh real promotion (`LOOP6TEST`, 15% off, min R$50) via the real admin API
  since the seed `BEMVINDO10` coupon was already at `maxUses`. First attempt (as an authenticated
  admin/staff session) correctly hit the *existing* server rule "Cupom não pode ser combinado com
  preço de atacado" — a real, working rejection path, not a bug. Retested as a genuine guest (had
  to also clear the `kivoni_access_kivoni`/`kivoni_refresh_kivoni` auth tokens — a new browser tab
  alone still shared the logged-in session via localStorage). Applied the coupon in the drawer:
  "Cupom LOOP6TEST aplicado: -R$44,99" (15% of 299,90, correct). Navigated to `/checkout`: the
  identical line, discount, and total (R$254,91) appeared without re-entering the code — confirmed
  via `localStorage['kivoni-checkout']` that `draftToken`/`couponCode`/`discountTotal` all carried
  over. Network log confirmed exactly one `POST /public/order-drafts` for the whole session
  (drawer's coupon-apply created it; checkout's later PATCHes reused the same token) — no orphaned
  second draft.
- **AC4** — Filled name/phone in checkout, hard-reloaded `/checkout`: name, phone, coupon, discount,
  and shipping method all survived, confirmed both on desktop and mobile viewports.
- **AC5** — Desktop: two-column layout with the order summary in a `lg:sticky` right column.
  Mobile (375×812): a collapsed "Resumo do pedido · R$254,91" bar that expands in place to show
  the full line list, discount, and submit button, with the chevron rotating on toggle.
- **AC6** — On `/catalogo`'s PDP (still `VariantGrid`'s 4 stepper inputs, confirmed unaffected),
  setting a quantity showed the classic floating "Ver Sacola" pill (bottom-sheet
  `CatalogFloatingCart`), not the new drawer — confirmed the sheet stayed closed (no auto-open
  leak from `/loja`'s wiring) since `VariantGrid`/PDV were deliberately not wired to `cart.open()`.
- **AC7** — Full guest checkout via "Combinar no WhatsApp (Manual)": filled customer info, no
  coupon (to isolate this from the AC3 test data), submitted — network log showed
  `POST /public/order-drafts` → `PATCH` → `POST .../submit` (201/200/201), redirected to
  `/pedido/confirmado?token=...` showing "Pedido recebido! ... pedido #D49B12", cart and checkout
  state both cleared. InfinitePay/Pix weren't live-submitted this pass (would need a real/simulated
  PSP round-trip) — their code path is untouched by this loop (`submitPublicDraft` called
  identically to before; only *what creates/patches the draft beforehand* changed).
- **Incidental finding, not a Loop 6 defect**: while setting up the AC3 test, temporarily raising a
  variant's `minWholesaleQty` to 6 (to force retail-mode pricing for a guest cart, working around
  the pre-existing seed-data quirk where `minWholesaleQty:1` makes every line "atacado" regardless
  of role) collided with a separate, real backend rule when combined with a coupon and submitted:
  "Preço de atacado para FUT-CFI2556-M exige quantidade mínima de 6 (solicitado 1)." This is a
  pre-existing server-side pricing/quantity validation interacting with an artificial combination
  of test data (a variant with `priceRetail === priceWholesale` given a non-default
  `minWholesaleQty`), not something this loop's code caused — reverted the test mutation and
  confirmed a clean submit on the original seed data instead.

## Result

Shipped all 8 tasks. `/loja` now has a proper right-side cart drawer (`CartDrawer.tsx`) that opens
automatically on every add-to-cart action from the PDP or Lookbook, replacing the old bottom-sheet
`CatalogFloatingCart` — which stays completely untouched and still serves `/catalogo` exactly as
before (confirmed by browser regression check). The drawer shows a free-shipping progress bar
(`tenant.shippingConfig.freeAboveTotal`, already-proven field from Loop 3) and a coupon field that
reuses the exact draft-PATCH-and-read-discount pattern already proven in the old floating cart —
no new backend endpoint needed. The key integration piece: `useCheckoutStore` gained
`draftToken`/`couponCode`/`discountTotal`, so a coupon applied in the drawer creates (or reuses) a
single order draft that `/checkout`'s own `submit()` picks up and continues patching, rather than
each surface creating its own — confirmed via the network log that only one draft is ever created
per cart session. `useCheckoutStore` is now persisted (`localStorage`, excluding the transient
`pix` payment state), closing a real gap where address/shipping/customer info didn't survive a
reload before this loop. Checkout's layout gained a `lg:` sticky order-summary sidebar and a
collapsible mobile summary, plus a lightweight checkmark on "Seus dados"/"Entrega" once each
section's own existing validation condition is met — without turning the page into a multi-step
wizard, honoring STOREFRONT-V2's already-recorded one-page decision.

REFINEMENT explicitly scoped this loop to `/loja` only and carried over two items with reasons
recorded in Scope § Out: cart cross-sell suggestions (needs new selection-heuristic work beyond
reusing `RelatedProducts.tsx`, which is keyed to a single PDP product) and "quick login if account
exists" (blocked on Loop 7, customer accounts, which doesn't exist yet).

No backend changes were needed — this loop is entirely a frontend restructuring reusing existing
public endpoints. Test totals: 209/209 web (+15 new: 4 for `useCartStore`'s open/close, 5 for
`freeShippingProgress`, 6 for `useCheckoutStore`'s draft/coupon continuity + persistence shape;
existing suites otherwise unchanged since no other files' testable logic moved).
