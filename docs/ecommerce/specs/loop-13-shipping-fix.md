# Loop 13 — Shipping: fix the price bug + build the missing admin UI

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 13 (closes the "Parcial" shipping gap from the 2026-07-27
market-readiness benchmark; continuation of Loop 3)
**Repos touched:** lmfit-web only (backend endpoint + server-side calc already existed, untouched)

## Context

The benchmark that compared this platform against Nuvemshop/Shopify/Farm Rio/Renner/Reserva flagged
shipping as "Parcial" rather than "Faltando" because the backend already computes real, tenant-
configurable shipping fees (`OrderDraftsService.computeShippingCost`, reading
`tenant.shippingConfig`) — but two things were missing:

1. **A real bug**: `ShippingPicker.tsx` displayed hardcoded prices (R$19,90 standard / R$39,90
   express) that never read `tenant.shippingConfig`. Any tenant that changed their shipping fee in
   the database would see the **checkout UI showing a stale, wrong total** while the server-side
   PIX/card charge used the correct, updated fee — a silent price-mismatch bug, not just a missing
   feature.
2. **No admin UI**: `PATCH /tenants/:id/shipping` (`UpdateShippingConfigDto`: `pickupLabel`,
   `standardFee`, `expressFee`, `freeAboveTotal`) already existed and worked, but nothing in
   Settings called it — the only way to configure it was a direct database write.

Real Melhor Envio/Correios CEP-based carrier integration is **explicitly out of scope** for this
loop per the user's decision — it needs a Melhor Envio account the user doesn't have yet. This loop
only fixes the bug and builds the UI for the flat-fee model that already exists server-side.

## Design

### Frontend fix (`ShippingPicker.tsx`)
- Extracted a pure `buildMethods(cfg: ShippingConfig | undefined, subtotal: number)` helper that
  mirrors the backend's `computeShippingCost` exactly: `pickup` is always free; `standard`/`express`
  read `cfg?.standardFee`/`cfg?.expressFee` falling back to the *same* defaults the backend uses
  (`19.9`/`39.9`) when unset; both are waived to `0` once `subtotal >= cfg.freeAboveTotal` (a
  zero/unset threshold never waives the fee, matching the backend's `if (threshold && threshold > 0)`
  guard).
- `ShippingPicker` now reads `useTenant().tenant?.shippingConfig` and renders `cfg?.pickupLabel` when
  set.
- `shippingCost(method, cfg?, subtotal?)` — the function `CheckoutClient.tsx` already imported for
  the order total — gained the same two parameters so the checkout total and the picker never
  disagree.
- `CheckoutClient.tsx` now passes `tenant?.shippingConfig` and `snap.subtotal` through to both.

### Admin UI (`SettingsClient.tsx`)
Added a "Frete" section following the exact pattern already established by the neighboring
"Fidelidade & Cashback" section (own local state initialized from the existing admin
`GET /tenants/:id` fetch, own `handleSaveShipping` calling `PATCH /tenants/:id/shipping`, own submit
button) — no new pattern introduced. On success, also updates `useTenantStore` via a new
`setTenantShipping` action (mirrors the existing `setTenantBranding`) so the change is reflected
instantly in the same session without a reload, consistent with how branding already behaves.

## Verification

- New `ShippingPicker.test.ts` (5 tests, pure-function style matching `CartDrawer.test.ts`'s
  convention): pickup always free, backend-matching defaults, tenant-configured fees override
  defaults, free-shipping threshold waives standard/express, a zero/unset threshold never waives.
- `tsc --noEmit` clean, full web suite green (346/346, +5).
- Live end-to-end against the real dev API/DB: confirmed checkout initially showed the unset-config
  defaults (R$19,90/R$39,90, matching the backend fallback) with a real cart item; PATCHed the
  tenant's `shippingConfig` via `curl` (`pickupLabel`, `standardFee: 25`, `expressFee: 55`,
  `freeAboveTotal: 300`) and confirmed the same checkout page — after a plain reload, no new
  deploy — immediately rendered the custom label and fees; then verified the admin path itself by
  logging into `/settings` through the real UI and saving `standardFee: 22`/`expressFee: 50`,
  confirmed via a follow-up `GET /public/tenants/lmfit` that the values persisted. Reverted the
  tenant's `shippingConfig` back to unset afterward to leave the dev DB clean.
