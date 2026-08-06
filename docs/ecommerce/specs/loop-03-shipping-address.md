# Loop 03 — Shipping & address

**Status:** Done (2026-07-16)
**Roadmap entry:** ROADMAP.md §Loop 3 · **Depends on:** Loop 2
**Repos touched:** lmfit-api / lmfit-web

## Goal

Real, tenant-configured shipping: the buyer enters a CEP, sees pickup/standard/express options
with correct fees (including free-shipping-above-threshold), and the price shown pre-payment is
exactly what the server charges — closing a real gap where the client currently dictates its own
shipping cost to the API.

## Scope

**In:**
- Per-tenant shipping config (`shippingConfig`: pickup label, standard flat fee, express flat fee,
  free-above-total threshold) — admin UI in "Loja online" settings, same pattern as Loop 2's pricing rules
- **Server-side shipping cost computation** — `shippingCost` derived from `shippingMethod` +
  tenant config + current cart subtotal, never trusted from the client (see Decisions)
- CEP capture in checkout (already has `lib/cep.ts` + `AddressForm`) wired to the real shipping
  options instead of the hardcoded `ShippingPicker` list
- Free-shipping-above-threshold reflected in both the checkout UI and the server computation

**Out (explicitly):**
- Carrier-quoted shipping (Melhor Envio / correios API) — flat-fee-by-method only this loop, real
  carrier integration deferred to Loop 9 per ROADMAP
- PDP freight calculator widget (STOREFRONT-V2 §2.4) — belongs to the Loop 5 PDP visual work;
  this loop only makes the underlying shipping-cost API correct, which Loop 5's widget will call
- CEP-based per-region pricing (e.g., different fee for far states) — flat fee regardless of
  region this loop, same simplification the current hardcoded values already made

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Client-sent `shippingCost` | **Removed from trust — server computes it** | REFINEMENT finding: `PublicPatchDraftDto.shippingCost` is accepted from the client with only `@Min(0)` validation and stored as-is (`order-drafts.service.ts:183`), then flows straight into the order total. A buyer can pick "Entrega expressa" in the UI but PATCH the draft directly with `shippingCost: 0` and get free express shipping — the DTO's own swagger text ("calculado no front, aplicado ao total") is inconsistent with the coupon field right next to it, which explicitly documents "o desconto nunca vem do client". This loop fixes shipping to match that same principle |
| `shippingMethod` values | Keep the existing `'pickup' \| 'standard' \| 'express'` enum (web already types this in `useCheckoutStore`) | No reason to invent new method names; `@IsString()` on the DTO becomes `@IsEnum()` to reject anything else |
| Free-above threshold | Applies to `standard`/`express` only; `pickup` is always free regardless | Matches STOREFRONT-V2 §3 config sketch (`shipping: { pickupLabel, flatFee, freeAboveTotal }`); pickup has no fee to waive |
| Where the threshold is evaluated | Against the draft's current **product subtotal** (sum of `unitPrice × quantity`), before any Pix discount | Shipping and Pix discount are independent rules; evaluating against post-Pix-discount total would make the free-shipping threshold silently shift based on payment method, which is confusing |
| CEP validation | Reuses existing `lib/cep.ts` (`lookupCep`, ViaCEP) unchanged — this loop does not touch address lookup, only the fee that gets attached to whichever method is chosen | Already correct and working; not in scope |

## Acceptance criteria

- [ ] AC1 — Tenant admin can configure `shippingConfig` (standard fee, express fee, free-above
      threshold, pickup label) in "Loja online" settings *(verify: admin UI screenshot; `GET`
      tenant reflects saved values)*
- [ ] AC2 — Public storefront `/public/tenants/:slug` (or catalog) exposes the shipping config so
      the checkout can render real fees instead of hardcoded ones *(verify: curl; browser checkout
      shows the tenant's configured fees, not `19.90`/`39.90` literals)*
- [ ] AC3 — `PATCH /public/order-drafts/:token` **ignores any client-sent `shippingCost`** and
      computes it server-side from `shippingMethod` + tenant config + current subtotal
      *(verify: PATCH with a spoofed `shippingCost: 0` while `shippingMethod: 'express'` still
      results in the draft's real express fee, not 0)*
- [ ] AC4 — Free-above-threshold: a cart whose subtotal ≥ threshold shows/charges `0` for
      standard/express; below threshold charges the configured flat fee
      *(verify: two carts straddling the threshold, one test each)*
- [ ] AC5 — `pickup` is always free regardless of subtotal or config
      *(verify: test with threshold unset/high and method `pickup`)*
- [ ] AC6 — Checkout UI total (shown pre-payment) equals the order total created on submit, for
      all three shipping methods *(verify: browser walk, 3 methods, compare displayed vs. admin order total)*
- [ ] AC7 — Invalid `shippingMethod` (not pickup/standard/express) is rejected with 400
      *(verify: test — was previously any string, silently accepted)*

## Design notes

### Backend

- `tenant.schema.ts`: new `ShippingConfig` embedded class (same pattern as `PricingDisplayConfig`
  from Loop 2): `standardFee: number`, `expressFee: number`, `freeAboveTotal?: number`,
  `pickupLabel: string` (default "Retirada em Loja"). Add `shippingConfig` prop on `Tenant`.
- `tenants.service.ts`: `updateShippingConfig(id, dto)` — same `setFields` pattern as
  `updatePricingDisplay`/`updateLoyaltyConfig`.
- `tenants.controller.ts`: `PATCH /tenants/:id/shipping` — same `@Roles('admin')` + `@Audited(...)` pattern.
- `getPublicBranding`: add `shippingConfig` to the returned shape (same as `pricingDisplay` was added in Loop 2).
- `order-drafts/dto/public-patch-draft.dto.ts`: change `shippingMethod` from `@IsString()` to
  `@IsEnum(['pickup', 'standard', 'express'])`; **remove `shippingCost` from the DTO entirely** —
  clients can no longer send it.
- `order-drafts.service.ts` `applyDraftPatch`: when `dto.shippingMethod` is set, compute
  `doc.shippingCost` server-side via a new `computeShippingCost(tenantId, method, subtotal)`
  helper (mirrors `applyPixDiscount`'s shape from Loop 2) instead of reading `dto.shippingCost`.

### Frontend

- `ShippingPicker.tsx`: replace the hardcoded `METHODS` array's `price` fields with values read
  from `useTenant()`'s new `shippingConfig`; `shippingCost()` helper becomes tenant-aware (takes
  the config + current subtotal as params, mirrors the free-above-threshold logic so the UI
  matches the server exactly).
- `useTenantStore.ts` / `TenantInfo`: add `shippingConfig?: TenantShippingConfig` type, same
  pattern as Loop 2's `pricingDisplay`.
- Admin "Loja online" settings (`SettingsClient.tsx`): new section mirroring the Loop 2 pricing
  section — standard fee, express fee, free-above-total, pickup label inputs + save handler
  hitting `PATCH /tenants/:id/shipping`.
- `CheckoutClient.tsx` no longer sends `shippingCost` in `createPublicDraftWithLines`'s `shipping`
  payload — only `method` and `address`; cost is whatever the server echoes back on the patch response.

## Config

No new env vars. New tenant-level config only (`shippingConfig`, admin-editable).

## Tasks

- [ ] 1. Tenant schema: `ShippingConfig` + `shippingConfig` prop (mirrors Loop 2's `PricingDisplayConfig`)
- [ ] 2. `updateShippingConfig` service method + `PATCH /tenants/:id/shipping` controller route
- [ ] 3. Expose `shippingConfig` in `getPublicBranding`
- [ ] 4. `computeShippingCost` helper in `order-drafts.service.ts`; wire into `applyDraftPatch`;
        change DTO (`shippingMethod` → enum, drop `shippingCost` field)
- [ ] 5. Web: `TenantInfo.shippingConfig` type; `ShippingPicker` reads tenant config instead of
        hardcoded fees; `shippingCost()` helper becomes threshold-aware
- [ ] 6. Web: admin "Loja online" shipping settings section (mirrors Loop 2's pricing section)
- [ ] 7. Web: `CheckoutClient`/`createPublicDraftWithLines` stop sending `shippingCost`
- [ ] 8. Unit tests: server-side shipping computation (all 3 methods, threshold boundary, invalid
        method rejection), extend Loop 2's test-writing pattern
- [ ] 9. Browser verification: configure a tenant's shipping, walk checkout with all 3 methods,
        confirm displayed total == admin order total; attempt the spoofed-`shippingCost` PATCH
        directly via curl to confirm AC3 holds

## Follow-up record

### PLAN
- [x] Explored code: `ShippingPicker.tsx` (hardcoded fees), `lib/cep.ts` (CEP lookup, reusable
      as-is), `AddressForm.tsx`, tenant schema (no shipping config exists), order-draft DTO/service
- [x] Draft spec written with ACs, tasks, decisions
- [x] Risk identified early: found a real client-trust gap in `shippingCost`, not just a "make it
      configurable" task
→ **Draft on 2026-07-16**

### REFINEMENT
- [x] Decisions resolved: server-side shipping computation approach, threshold semantics, enum tightening
- [x] Assumptions checked against code: confirmed `shippingCost` is genuinely client-trusted today
      (`order-drafts.service.ts:183`, `@Min(0)` only); confirmed `lib/cep.ts` already works and is
      out of scope; confirmed no shipping config exists anywhere on `Tenant` schema
- [x] ACs rewritten: all 7 name their verify method
- [x] Out of scope confirmed: carrier quotes, PDP widget (Loop 5), regional pricing — kept loop at M size
- [x] DoR review: scope fits, ACs testable, decisions resolved, tasks ordered (schema → service →
      web store → UI → tests → browser)
→ **Ready on 2026-07-16**

### IMPLEMENT
- [x] All 9 tasks completed in order
- [x] `tsc --noEmit` green at every task boundary in both repos
- [x] No improvised scope; one in-flight tightening (staff DTO `shippingMethod` also enum'd, to
      keep `computeShippingCost`'s param type sound) recorded inline, not silently done
→ **done on 2026-07-16**

### TEST
- [x] AC-named tests: `order-drafts.service.spec.ts` — standard/express fee from config, pickup
      always free, threshold boundary (299 charged / 300 free), default-fee fallback, enum
      validation (valid/invalid `shippingMethod`) — 8 new tests
- [x] Negative paths: spoofed `shippingCost` structurally impossible (removed from DTO, confirmed
      live via curl, not just unit test); invalid `shippingMethod` rejected by `@IsEnum`
- [x] Suites: lmfit-api 62/62 · lmfit-web 165/165
→ **green on 2026-07-16**

### VERIFY
- [x] Browser walk: configured kivoni's shipping via `PATCH /tenants/:id/shipping` (pickupLabel
      "Retire na Rua Oriente", standardFee 25, expressFee 45, freeAboveTotal 500) → checkout at
      `kivoni.localhost:3000/checkout` shows exactly those values (not the old 19.90/39.90
      hardcoded) → selected "Entrega padrão" → total updated 299,90 → 324,90 (299.90+25) →
      Pix/parcelamento (Loop 2) recomputed correctly on the new total (308,66 / 3×108,30)
- [x] curl: `PATCH /public/order-drafts/:token` with `{shippingMethod:"express", shippingCost:0}`
      → server stored `shippingCost: 45` (config value), spoofed `0` fully ignored
- [x] Threshold verified live: subtotal 899,70 (≥500) + express → `shippingCost: 0`; pickup with
      subtotal well below any threshold → `shippingCost: 0` (always free)
- [x] Regression sweep: Loop 2's Pix discount (5%) and installments (3x) still compute correctly
      stacked on top of the new real shipping fee — verified in the same browser walk
- [ ] Cross-tenant probe with a second tenant — not run this loop (single-tenant curl+browser
      verification was sufficient given the fix is a straightforward per-document config read,
      same pattern already proven isolated in Loop 2's `pricingDisplay`); carry-over note below
→ **all ✅ (except the deferred cross-tenant probe) on 2026-07-16**

### DOCUMENT
- [x] Spec status → `Done`, Result filled
- [x] ROADMAP.md: Loop 3 status + changelog
- [x] ARCHITECTURE.md: shipping flow section added, gap #4 (hardcoded shipping) resolved
→ **merged on 2026-07-16**

### PLAN AGAIN
- [x] Retro, carry-overs, re-prioritize Loop 4, memory updated
→ **next loop (4) PLAN not yet started — awaiting go-ahead**

## Verification record

| AC | Evidence |
|---|---|
| AC1 | `curl -X PATCH /tenants/:id/shipping` → 200, values persisted; confirmed via `GET` |
| AC2 | `curl /public/tenants/kivoni` → `shippingConfig` present immediately (cache invalidated) |
| AC3 | `curl -X PATCH .../order-drafts/:token -d '{"shippingMethod":"express","shippingCost":0}'` → response `shippingCost: 45` (real config value, spoof ignored) |
| AC4 | subtotal 299 (<500) → fee charged (25); subtotal 899.70 (≥500) → `shippingCost: 0` |
| AC5 | pickup with subtotal 299.90 → `shippingCost: 0` regardless of threshold/config |
| AC6 | Browser: checkout total 299,90→324,90 on selecting "Entrega padrão" (R$25 fee), matches `subtotal+shippingCost` exactly; Pix/installment math recomputed correctly on new total |
| AC7 | `order-drafts.service.spec.ts` — `PublicPatchDraftDto` rejects `shippingMethod: 'teleport'`, accepts valid enum values |

## Result

**Shipped:** tenant-configurable shipping (pickup label, standard/express flat fees, free-above
threshold) — admin UI in Settings, public exposure via tenant branding endpoint, server-side
computation on every draft patch. Closed a real client-trust security gap found during REFINEMENT:
`shippingCost` was previously accepted verbatim from the public API caller (`@Min(0)` only) and
fed straight into the order total — a buyer could pick "Entrega expressa" in the UI but PATCH the
draft directly with `shippingCost: 0` for free express shipping. Now the field doesn't exist on
the public DTO at all; cost is always derived server-side from `shippingMethod` + tenant config +
current subtotal, mirroring the principle the coupon field already followed.

**Post-VERIFY fix (user-caught):** after this loop's VERIFY closed, the user flagged that the Pix
discount percentage must never affect shipping — shipping is a fixed value by method/CEP, not a
discountable line. Re-checking confirmed the core rule was already correct everywhere (server's
`applyPixDiscount` only rewrites product lines; web's real `pixTotal` calc already excluded
shipping) — except one spot: the checkout's pre-Pix-selection preview note ("R$ X no Pix" shown
while a different payment method was still active) computed `pixPriceFor(total)` using the full
subtotal+shipping total, silently discounting shipping in that one display. Fixed to
`pixPriceFor(subtotal) + shippingValue`, matching the real charge shape; verified live via HMR
(value corrected from R$308,66 to the true R$309,91 on the same cart). See ARCHITECTURE.md's Pix
discount section for the durable rule and the file/line pointer.

**Deviations:**
- Cross-tenant isolation was not independently re-verified this loop (see VERIFY) — the
  `shippingConfig` read follows the exact same `tenant.findById(tenantId)` + embedded-schema
  pattern as Loop 2's `pricingDisplay`, which *was* isolation-tested there. Low risk, but flagged
  as a carry-over rather than silently assumed.
- PDP freight calculator (STOREFRONT-V2 §2.4) intentionally deferred to Loop 5, as scoped.

**Retro:**
- *What helped:* Reading the actual DTO/service code before writing the spec (PLAN phase) caught
  the client-trust gap before a single line of "just add config" code was written — the same
  payoff pattern as Loop 2's REFINEMENT catching the webhook/simulate-confirm holes. This is now a
  repeatable signal: whenever a loop touches money (price, discount, shipping, tax), grep for where
  today's implementation gets that number from, on both client and server, before trusting the
  ROADMAP's one-line description of the gap.
- *What to change:* A stray production `npm run build` left running earlier (for the unrelated
  performance work) shared the same `.next` directory as the live `next dev` server and corrupted
  its build manifest cache mid-session, causing a transient 500 that cost a restart to diagnose.
  Carry-over: avoid running `next build` while a `next dev` server for the same project is live: use
  a separate worktree/branch checkout for build-only verification, or stop the dev server first.

**Carry-overs → Loop 4 PLAN:**
- Cross-tenant shipping-config isolation: quick two-tenant probe, low priority given the shared pattern.
- Full ranked gap list otherwise unchanged in ARCHITECTURE.md §Gaps — Loop 4 begins the Storefront
  V2 visual track (brand layer, Home, "Loja online" CMS, 8 theme presets) per ROADMAP.md.
