# Loop 15 — Analytics: Meta Pixel + GA4 + TikTok Pixel

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 15 (first "Faltando" item from the 2026-07-27 market-readiness
benchmark)
**Repos touched:** lmfit-api + lmfit-web

## Context

The benchmark flagged conversion tracking as fully missing — no way to measure or optimize paid
traffic. Research found `CookieConsentBanner.tsx` already existed, fully built (LGPD banner,
`getConsentStatus`/`setConsentStatus` cookie helpers, own tests), but was never mounted anywhere —
dead code. It also found there is no `/pedido/confirmado` client-side confirmation page today (the
real InfinitePay checkout redirects off-site, and the page apparently didn't survive the 2026-07-26
iCloud-corruption incident) — so a purchase event genuinely has to be server-side for most orders.
Per the user's explicit choice, this loop builds all three providers together (Meta + GA4 + TikTok),
not just one.

## Design

### Consent-gated client-side pixels
- `CookieConsentBanner` mounted in `(public)/layout.tsx` (previously orphaned).
- New `AnalyticsScripts.tsx` (also mounted in the same layout): reads `tenant.analytics` (pixel IDs
  only — the public tenant endpoint never returns server tokens, see below) and the consent cookie;
  injects each provider's real init script via `next/script` only when both consent is `"accepted"`
  and that provider's ID is configured. Reacts live to a consent change via a new
  `CONSENT_CHANGED_EVENT` custom event dispatched from `setConsentStatus()` — accepting the banner
  activates pixels immediately, no reload needed.
- **Deliberately does not let any init script fire its own first page-view** (`fbq('track',
  'PageView')`, GA4's implicit auto-page-view, `ttq.page()`) — a `useEffect` keyed on
  `usePathname()` fires exactly one `page_view` per route (including the very first), which is the
  single source of truth for every route (App Router navigates client-side, so the scripts
  themselves only ever see the first load). Caught and fixed a real double-counting bug during
  VERIFY where the init scripts' own inline calls and this effect were BOTH firing on first load.
- New pure `src/lib/analytics.ts` (`trackPageView`/`trackAddToCart`/`trackPurchase`) — each is a
  safe no-op when the corresponding global (`window.fbq`/`gtag`/`ttq`) isn't present, so calling
  them anywhere never breaks a tenant with no pixels configured.
- `VariantSelector.tsx`'s `handleAdd()` calls `trackAddToCart` right after `cart.addOrIncrement`.

### Server-side purchase event
- New `AnalyticsModule`/`AnalyticsService.trackPurchase(tenantId, {orderId, amount})` — dispatches
  to Meta Conversions API, GA4 Measurement Protocol, and TikTok Events API, each independently
  gated on having BOTH that provider's pixel ID and its server token configured, and each wrapped in
  its own try/catch (one provider failing never blocks another or the payment flow).
- Called from `PaymentsService.syncPaymentPaidForOrder()` — the **one** place in the backend every
  real payment confirmation already funnels through (Pix, InfinitePay webhook, dev-confirm,
  simulate-confirm), fire-and-forget (`.catch(() => undefined)`, never awaited) so a network hiccup
  to a pixel provider can never delay or fail a payment confirmation.
- Traced the one path that does **not** go through `syncPaymentPaidForOrder`: manual/WhatsApp
  checkout orders never get a `Payment` document at all (staff confirms payment out-of-band, and
  even a later admin status-flip to `completed` finds no `Payment` row to report on) — so
  `trackPurchase` is also called client-side in `CheckoutClient.tsx`'s manual-order branch, right
  after the order is confirmed created, the one moment we know for certain the order exists
  regardless of which page it then redirects to.

### Tenant config + admin UI
- New `AnalyticsConfig` sub-schema on `Tenant` (`metaPixelId`/`metaConversionsApiToken`/
  `ga4MeasurementId`/`ga4ApiSecret`/`tiktokPixelId`/`tiktokAccessToken`), `PATCH /tenants/:id/analytics`
  (mirrors the shipping/pricing-display pattern exactly).
- `getPublicBranding()` — the endpoint the storefront actually reads — returns only the 3 pixel IDs,
  never the 3 server tokens; explicit redaction, tested.
- Settings gained an "Analytics e Pixels de Anúncio" section (admin-only), same form pattern as the
  Loop 13 Frete section; a new `setTenantAnalytics` store action mirrors `setTenantShipping`.

## Verification

- `tsc --noEmit` clean on both repos. api: +7 tests (245... 238/238 incl. new `AnalyticsService`
  spec, `PaymentsService.syncPaymentPaidForOrder` analytics tests, `TenantsService` redaction
  tests). web: +8 tests (354/354, `analytics.test.ts`).
- Live end-to-end against the real dev API/DB/browser:
  - `PATCH /tenants/:id/analytics` with a Meta token → confirmed `GET /public/tenants/lmfit` returns
    the pixel ID but never the token (grepped the raw JSON for the token string — absent).
  - Cleared the consent cookie in a real browser session → confirmed the banner appears; clicked
    "Aceitar" → confirmed `window.fbq`/`gtag` became real functions, `window.ttq` a real object, the
    real `googletagmanager.com` script tag loaded, and GA4's own script set real `_ga`/`_ga_*`
    cookies (proof it's genuinely executing, not just injected inertly).
  - Clicked "Adicionar à sacola" on a real PDP → confirmed `fbq('track','AddToCart', …)` and
    `gtag('event','add_to_cart', …)` fired with the correct product id/name/price/currency (spied by
    wrapping the real functions before the click).
  - Confirmed the page-view double-count bug and its fix directly via `window.dataLayer`'s contents
    after a fresh page load: exactly one `["event","page_view"]` entry, with the `config` call
    carrying `{send_page_view:false}`.
  - Reverted the tenant's analytics config back to unset afterward.

## Carried over

Real Meta/GA4/TikTok credentials were never tested against a live ad account (no test account
available) — the request shapes follow each provider's public API docs; the same "validate before
trusting in production" posture this codebase already takes for other unverified integrations
(Shopee/TikTok Shop adapters, Loop 14). A generated OG image and CI Lighthouse budgets remain
carried over from Loop 10b, unrelated to this loop.
