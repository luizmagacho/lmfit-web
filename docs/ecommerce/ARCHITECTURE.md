# Storefront Architecture — as verified in Loop 0 (2026-07-15), updated through Loop 4f (2026-07-19)

Live-verified map of the public buy flow. Source of truth for Loop 1+ planning.

## Request flow (verified end-to-end in dev)

```
Visitor on {slug}.domain/catalogo                    lmfit-web (public) pages
  │
  ├─ GET /public/catalog/products (+ /:slug)          x-tenant-slug header on every call
  │     └─ CatalogService → ProductsService.listPublicCatalog (active products + variants)
  │
  ├─ PDP: VariantGrid steppers → useCartStore         cart persisted in localStorage["{slug}-cart"]
  │     └─ price per role: consumer→retail, wholesaler/staff→wholesale (resolveUnitPrice)
  │
  ├─ /checkout (CheckoutClient)
  │     ├─ customer name/phone/email → useCheckoutStore
  │     ├─ ShippingPicker: pickup grátis | padrão 19,90 | expressa 39,90 (hardcoded v1)
  │     ├─ AddressForm (skipped for pickup)
  │     └─ payment: infinitepay (only if tenant.infinitePayTag) | manual (WhatsApp)
  │
  ├─ POST /public/order-drafts {waId, metadata:{customer,shipping}}
  ├─ PATCH /public/order-drafts/:token {lines, shippingMethod, shippingCost}
  │     └─ rebuildLinesFromDto: SERVER-SIDE pricing (retail/wholesale by qty),
  │        stock enforcement (quantityOnHand), backorder only with feature "production"
  │
  ├─ POST /public/order-drafts/:token/submit {payment:{method}}
  │     ├─ guest customer resolved/created from metadata (dedup by waId)
  │     ├─ pix        → applyPixDiscount (server-side, tenant.pricingDisplay.pixDiscountPercent;
  │     │               skipped if a coupon is set, to avoid stacking two discounts) → order
  │     ├─ OrdersService.create (channel online, status open) — coupon redeemed atomically here
  │     ├─ pix/infinitepay → createPixPayment/createInfinitePayPayment (Loop 2: both delegate to
  │     │               the SAME real InfinitePay checkout link — buildInfinitePayCheckoutUrl —
  │     │               when tenant has infinitePayTag+infinitePayApiKey; PIX has no standalone
  │     │               QR API from InfinitePay, so "pix" just pre-applies the discount and sends
  │     │               the buyer to their hosted checkout, which offers Pix as a method. Falls
  │     │               back to DEV_PIX_PLACEHOLDER QR — for `pix` only — when no real creds are
  │     │               set, or when the real PSP call fails for any reason (network/bad key))
  │     └─ manual     → order only, buyer sent to WhatsApp compose
  │
  ├─ /checkout/payment-simulation?paymentId=…        polls GET /public/payments/:id
  │     └─ POST /public/payments/:id/simulate-confirm → order status completed (Loop 2: blocked
  │            when NODE_ENV=production — was callable by anyone in prod before this loop)
  │            └─ stock decremented HERE (on paid), loyalty credit (if enabled,
  │               walk-in excluded), staff alert order_draft_submitted, webhook dispatch
  │               (retry ×3 + dead-letter FailedWebhook + Sentry)
  ├─ POST /public/payments/infinitepay-webhook       real PSP confirm path (Loop 2: requires
  │     └─ requires ?secret=<PAYMENT_WEBHOOK_SECRET>  ?secret= matching PAYMENT_WEBHOOK_SECRET,
  │        (embedded by us in the webhook_url we send   embedded by us when building the
  │        InfinitePay) → confirmInfinitePayPaymentPaid  checkout link — was unauthenticated
  │                                                       before this loop)
  └─ payment expiration: markExpiredIfDue → status expired + payment.expired webhook
```

## Tenant resolution

`TenantMiddleware`: `x-tenant-slug` header → req.tenantId/tenantSlug/tenantPlan/tenantFeatures.
**Mandatory on `/public/*`** (except `/public/tenants/*`) — 400 without it. Web resolves the slug
from the subdomain and sends the header via `publicHttp`. JWT tenantId is the fallback for staff routes.

**Web-side, there are now two separate resolvers for two separate contexts (Loop 10 v2) — pick the
right one, they are not interchangeable**: `getTenantSlug()` (`tenantSlug.ts`) is **client-only**
(`typeof window === "undefined"` returns immediately) — the only one every component before Loop 10
v2 ever needed, since the whole storefront was client-rendered. `resolveTenantSlugFromHost()` +
`getServerTenant()`/`getServerProduct()` (`src/lib/serverTenant.ts`) are the **server-side**
equivalent, for `generateMetadata`/`sitemap.ts`/`robots.ts`/any future Server Component — they read
the request `host` via `next/headers`' `headers()` (async in Next 15, must `await`), not
`document.cookie`/`window.location`, neither of which exist during a real Next.js SSR pass.
`middleware.ts` itself imports `resolveTenantSlugFromHost()` rather than keeping its own copy of the
host-parsing chain — one source of truth for how a hostname maps to a tenant slug across the whole
app (dev `*.localhost`, prod `*.kivoni.com.br` with www/admin excluded, legacy `*.lmfit.com.br`).
**Do not reach for `publicHttp.ts` from server-side code**: its SSR branch reads `document.cookie`,
which is `undefined` during real SSR, so it silently always resolves to `"kivoni"` — a real,
previously-dormant bug (nothing called it server-side before Loop 10 v2) that would have shipped
wrong per-tenant metadata for every non-kivoni tenant had it been reused instead of building the
proper resolver.

## API money convention (critical for clients)

`BrlMoneyResponseInterceptor` (global, `main.ts`) serializes monetary keys (`price`, `priceRetail`,
`amount`, `total`, …) as **pt-BR strings** ("299,90") on every response; inbound values are parsed
back. Clients must never do arithmetic on raw response money fields without parsing the comma format.
**This includes `typeof` checks, not just arithmetic** — Loop 5 found `compareAtPrice` had silently
never shown a promo/% off badge on the catalog card because the check was `typeof x === "number"`,
which is always false against the interceptor's string output. Every money field needs the same
`extractPrice()`-style parse (see `ProductGrid.tsx`), never a `typeof` gate.

## Role-based storefront pricing

`useAuthStore.inferredRole()` → `consumer` (anonymous), `wholesaler`, `staff`. VariantGrid/catalog
show retail for consumers, wholesale for the other two. Note: seed products carry
`minWholesaleQty: 1`, which makes *every* line wholesale at submit — fix seeds or product data
before judging pricing bugs. **Loop 2 confirmed this leaks further than submit**: it also drove a
real PDP display bug (VariantGrid's per-row reference price factored in `qty(1) >= minWholesaleQty`,
silently showing wholesale prices to anonymous guests) — fixed by making that specific display
role-only, matching `ProductGrid`'s card computation; the cart's own quantity-triggered wholesale
upgrade (`useCartStore`, independent `resolveUnitPrice` call with the *real* added quantity) was
unaffected and remains correct. The underlying seed-data issue itself is still unfixed.

## Pix discount & installment display (Loop 2)

Per-tenant `pricingDisplay: { pixDiscountPercent, maxInstallments }` on `Tenant` (admin: Settings →
"Desconto no Pix e parcelamento"; public read via `/public/tenants/:slug`). `usePricingRules()`
(web) computes `pixPriceFor`/`installmentsTextFor` from `@/lib/pricing`'s pure
`computePixPrice`/`installmentsText`, rendered via the `PixInstallmentNote` atom on: catalog card
(`PriceTag`, varejo-mode only), PDP (`VariantGrid`/`VariantQtyRow`, opt-in `pricingRules` prop —
PDV never passes it, so staff/PDV is unaffected), the cart drawer (`CatalogFloatingCart`), and
checkout (`CheckoutClient`, plus a dedicated "Pagar com Pix (N% OFF)" payment option distinct from
"Cartão/Pix Online"). **The discount is only actually applied server-side** when the buyer submits
with `payment.method: 'pix'` (`OrderDraftsService.applyPixDiscount`, before `OrdersService.create`)
— selecting the generic InfinitePay button does not discount, since the buyer picks Pix vs. card on
InfinitePay's own hosted page and we can't know their choice in advance. Does not stack with a
coupon (draft's `couponCode` set → discount skipped) — not designed to combine, no stacking rules
exist yet.

**The Pix discount never applies to shipping** (Loop 3 rule, holds on both sides): shipping is a
pre-established value tied to method/CEP, not part of the discountable product subtotal.
Server-side, `applyPixDiscount` only rewrites `lineInputs` (product lines) — `shippingCost` on the
order comes straight from `computeShippingCost`, computed independently at patch time and never
touched by the pix branch of `submitByToken`. Web-side, `CheckoutClient` mirrors this: `pixTotal =
pixPriceFor(snap.subtotal) + shippingValue` (full, undiscounted shipping added back after
discounting only the subtotal). A bug shipped briefly in the same session as Loop 3 where the
pre-selection preview note ("R$ X no Pix" shown while a non-Pix method was still selected) computed
`pixPriceFor(total)` — discounting shipping too — inconsistent with the real charge; fixed to use
the same `pixPriceFor(subtotal) + shippingValue` shape as the real total.

`TenantsService.findBySlug` (used by the public storefront) has an in-memory 5-min cache
(`slugCache`); every tenant-config write path (`updateBranding`, `updatePricingDisplay`,
`updateShippingConfig`, `updateStorefrontConfig`, …) must call `this.slugCache.delete(doc.slug)` or
the storefront serves stale config for up to 5 minutes.

## Theme system: 8 storefront presets (Loop 4)

Per-tenant `storefront: { enabled, themePreset, announcements }` on `Tenant` (admin: Settings →
"Loja online"; public read via `/public/tenants/:slug`). The 8 presets (Essencial, Editorial,
Performance, Boutique, Vibrante, Studio, Impacto, Monocromo — STOREFRONT-V2 §2.10) are **hardcoded
token tables in web code** (`src/theme/storefrontPresets.ts`), not DB rows — `themePreset` on the
tenant is just the lookup key.

**Injection point (the key architectural decision):** rather than inventing a new theming layer,
Loop 4 extended the CSS-variable `useEffect` that `TenantContext.tsx` *already* used to inject
`--kivoni-primary`/`--kivoni-accent`/etc. from `tenant.branding` on every page load. Every
storefront component styles itself via `lmfitTokens` → `var(--kivoni-*)` (established well before
Loop 4), so adding `--kivoni-font-display`, `--kivoni-font-body`, `--kivoni-radius` (plus a
`data-theme-preset="<preset>"` attribute on `<html>`) to that same effect re-skins the entire public
storefront with **zero per-tenant component changes** — confirmed live: switching a tenant to
Monocromo changes the display font to Archivo and every card/button/badge to 90° corners across
`/catalogo`, PDP, and checkout simultaneously. `tenant.branding.primaryColor` keeps overriding the
accent color in every preset, unchanged from before Loop 4.

Preset fonts load on demand via a manually-injected Google Fonts `<link>` (`ensureGoogleFontLoaded`
in `TenantContext.tsx`), not `next/font/google` — that API requires fonts to be statically known at
build time, incompatible with a runtime per-tenant choice, and preloading all 8 families for every
tenant was explicitly the thing this design avoids.

**`buttonStyle` was inert data from Loop 4 until Loop 4c** — see the dedicated section below for how
it finally got a real, scoped consumer without the broad-CSS-override regression this gap
originally flagged.

Store on/off: `StorefrontGate.tsx` (client component wrapping `(public)/layout.tsx`'s children)
checks `tenant.storefront?.enabled` **only after the tenant has actually loaded** (`!loading`) to
avoid flashing the "indisponível" state during the initial fetch.

## Theme preset UX & design-system completion (Loop 4c)

**`buttonStyle` (solid/ghost/pill) went from inert per-preset data to a real, scoped consumer** via
a new shared atom, `src/components/atoms/Button.tsx`. It deliberately does **not** use a blanket
`[data-theme-preset] button` CSS override — the exact approach Loop 4's IMPLEMENT phase already
identified as unsafe (it would flip `background-color` on elements like `ShippingPicker`/
payment-method cards that use that same property to show *selection state*, not button style).
Instead, `Button` is opt-in per call site: only the storefront's actual conversion CTAs migrated
(`VariantSelector`'s add-to-cart, `Lookbook`'s add-all, `CheckoutClient`'s final submit button, and
`QuickCart`'s finalize button — but only when the new optional `finalizeVariant` prop is passed).
Everything with a background-color-driven selection affordance was left untouched and re-confirmed
live to still work exactly as before.

**`QuickCart.tsx` is shared by three surfaces with three different theming needs**, which is why its
new prop is opt-in rather than a direct migration: PDV (`PdvClient.tsx`, staff tool, must never be
preset-aware), `/catalogo` (via `CatalogFloatingCart.tsx`, deliberately its own separate identity
from `/loja` since the Loop 5b split), and `/loja` (via `CartDrawer.tsx`, the only caller that
actually passes `finalizeVariant`). Confirmed live: with a `pill` preset active tenant-wide,
`/catalogo`'s checkout button stayed at its pre-existing `.rounded-md` → `--kivoni-radius` styling
(a Loop 4 rule, unrelated to this change) and never became a pill — the opt-in boundary holds.

**The Settings picker's mockup needs each of the 8 presets' own radius (and its own, still-unsaved
`primaryColor`) simultaneously**, which `--kivoni-radius`/`--kivoni-primary` can't provide (they only
ever reflect whichever preset/color is actually *saved* for the tenant, not the live form state
before the merchant clicks Save). `Button` therefore accepts optional `radius` and `color` override
props, used only by preview mockups; every other call site relies on the CSS vars as normal. The
picker itself changed from a plain text-label grid to a small per-preset mockup (heading in the
preset's own `fontDisplay`, a real `Button` in that preset's `buttonStyle`/live `primaryColor`, both
driven straight from `storefrontPresets.ts` and the branding form's own state — zero new data) plus a
"Ver ao vivo" link (`buildStorefrontUrl()` in `tenantSlug.ts`, mirroring `getTenantSlug()`'s
dev-subdomain-vs-production logic in reverse) opening `/loja` in a new tab.

**A second, older mockup — "Visualização do Tema" in the branding section — got wired to the same
tokens as a same-day follow-up fix.** That panel pre-dates this loop and only ever reflected
`primaryColor`/`secondaryColor`/`logoUrl`, never the theme preset itself, despite its own label
promising a real-time theme preview. A user testing this loop's work correctly flagged that changing
"Estilo da loja" produced no visible feedback anywhere in Settings — only after saving and reloading
`/loja` separately. Fixed by reading `STOREFRONT_PRESETS[themePreset]` into that same panel (font,
radius, and a `Button` using the live unsaved `primaryColor` via the new `color` override), so
clicking between presets now updates it instantly, with no save required — the actual live-preview
behavior the picker's own "Ver ao vivo" link was only an indirect substitute for.

**Testability without RTL, matching this codebase's actual test convention.** `Button.tsx`'s visual
logic is exposed as a pure `resolveButtonVisualStyle(variant, radius)` export, unit-tested directly
rather than via `@testing-library/react`. This project's `vitest.config.mts` has no
`@vitejs/plugin-react`, so esbuild's default "classic" JSX transform requires any RTL-rendered
component to `import React` explicitly — only one file in the entire codebase does this
(`PrintOrderClient.tsx`). Adding that requirement to a shared atom just to enable RTL would be an
inconsistency with every other atom (`Badge.tsx`, `PriceTag.tsx`, etc., none of which import React),
so the dominant pure-function test pattern already used everywhere else in this codebase was kept.

**Confirmed but explicitly out of scope**, per STOREFRONT-V2.md §2.10's much larger original vision:
per-preset color palettes (some specified as dark-mode, e.g. Performance's near-black background),
PLP column density, hero/product-card treatment, and motion timing. Each is independently
loop-sized — a future continuation would need its own PLAN phase.

## Theme preset full styling: palette, PLP density, card, hero + carousel, motion (Loop 4d)

**All 8 axes from STOREFRONT-V2.md §2.10 are now real**, closing out the palette/density/card/hero/
motion items Loop 4c had explicitly deferred. `StorefrontThemeTokens` (`storefrontPresets.ts`) gained
`palette` (bg/surface/text/textMuted/border), `cardAspectRatio`, `plpColumns`
(`{base, sm, md}` Tailwind grid-cols fragments), `heroTreatment` (one of 8 overlay/typography
variants), and `motionDurationMs`/`motionEasing` — real, benchmark-derived values for every preset,
each palette passing a new WCAG contrast-safety check (`contrastRatio`/`isPaletteContrastSafe`,
≥10:1 for all 8, floor is 4.5:1).

**Why a new provider instead of widening `TenantContext.tsx`'s existing global effect.**
`TenantContext.tsx`'s theming effect (font/radius/button-style/primary-color, via
`document.documentElement.style.setProperty`) already runs on every route — `AppProviders`/
`TenantProvider` is mounted by `(app)` (staff admin) and `(pdv)` layouts, not just `(public)`. That's
been true since Loop 4 (a low-visual-impact quirk: font/radius bleed into the admin panel today), but
extending the *same* mechanism to full background/text palettes would have made "Estilo da loja"
visibly reskin the staff dashboard (e.g. a dark near-black background behind the order list when a
tenant picks Performance) — a real regression, not a quirk. Fixed with a new
`src/app/(public)/StorefrontThemeVars.tsx`, mounted once in `(public)/layout.tsx` only, wrapping the
existing content in a `<div>` whose inline `style` redefines `--background`, `--foreground`,
`--app-bg`, `--card-bg`, `--kivoni-surface`, `--lmfit-surface`, `--kivoni-text`, `--kivoni-text-muted`,
`--kivoni-border` (the *same* var names every public component already reads via `lmfitTokens.*` —
zero component-level changes needed) plus two new vars nothing previously used,
`--kivoni-storefront-motion-duration`/`-easing`. CSS custom properties resolve at the point of use
following the DOM cascade, not at definition site, so redefining them on an ancestor *inside*
`(public)/layout.tsx` overrides the value for that entire subtree without touching `:root`/`.dark` —
the admin/PDV trees, mounted under a completely different layout, never see the override.

**Forced palette regardless of the shopper's OS/browser dark-mode preference.** These are brand-
identity styles from a fashion-retail benchmark (Performance is deliberately near-black; Essencial is
deliberately light/sandy), not a light/dark *accessibility* toggle — a shopper's system dark-mode
setting shouldn't invert a preset's intended look. Inline `style` on the wrapper wins over
`next-themes`'s `.dark` *class*-based rules by cascade specificity automatically, so no changes to
`providers.tsx`/`next-themes` config were needed — same principle `TenantContext.tsx` already relied
on for `--kivoni-primary`, just extended to more properties.

**PLP density is a Tailwind-class lookup, not a CSS var.** `ProductGrid.tsx`'s hardcoded
`grid-cols-2 sm:grid-cols-3 md:grid-cols-4` became `${plpColumns.base} ${plpColumns.sm}
${plpColumns.md}` from the active preset. A raw CSS var interpolated into `grid-template-columns`
would have lost Tailwind's responsive breakpoint behavior; the lookup table keeps it. Card image
`aspectRatio` (previously hardcoded `1 / 1`) now reads `preset.cardAspectRatio`; the existing
hover-swap-photo crossfade and %OFF/Lançamento/Esgotado badges (both shipped in Loop 5) are unchanged,
just reading the new motion-duration/easing vars instead of a hardcoded `duration-200`.

**Hero: 8 overlay/typography treatments plus a generic carousel, no preset-gating.**
`HeroBanner.tsx` picks one of 8 `heroTreatment` variants (overlay gradient direction/darkness, text
position, type weight/case/tracking) applied over the tenant's existing hero image — no new media
type needed for 7 of the 8 presets. The 8th, Vibrante's benchmarked "carrossel colorido, colagens",
was originally scoped to carry over to a future loop (the only axis needing new media
infrastructure) — the user was asked to confirm that cut and chose to build it now instead. Shipped
as a new, optional `heroImages: string[]` tenant field (capped at 8 via `@ArrayMaxSize(8)`,
`heroImageUrl` kept for backward compatibility) rather than a Vibrante-only special case: any preset
with 2+ configured images gets an autoplaying carousel (5s interval, dot indicators, click-to-jump)
in `HeroBanner.tsx`'s new `HeroCarousel` sub-component; 0-1 images keeps the original static-image
path completely unchanged. Upload reuses the existing generic `/products/images` endpoint (already
used for logo/favicon) — no new upload infrastructure.

**Settings preview now reflects every new axis, not just font/radius/button.** The Loop 4c mini-
mockup gained a background/surface color swatch row and a density indicator (one box per
`plpColumns.md` column count), and the 8-option picker cards gained their own 3-dot palette swatch —
both driven straight from `storefrontPresets.ts`, same zero-new-data pattern as Loop 4c's mockup.

**Verified on two tenants, not one.** The user's own real tenant (`lmfit`) was set to **Performance**
through the actual Settings UI — the benchmark's own "ideal for fitness/activewear" entry, so the
real storefront now reflects a deliberately-chosen style rather than a leftover default. The
disposable `kivoni` demo tenant was used to verify the carousel specifically (Vibrante + 3 real
images, confirmed the color-block overlay, dot indicators, and autoplay advancing after a wait), then
reverted to its prior state — kept off the real tenant to avoid leaving placeholder test images on
production-facing content. Admin-panel isolation (AC2) was confirmed by observation, not assumption:
the staff dashboard was already rendering in `next-themes` dark mode *before* any preset was touched,
while the tenant was still on the light "essencial" default — proof its appearance is independent of
the storefront preset, not coincidentally similar to it.

**Carried over**: true per-preset motion *choreography* (parallax scroll, spring/bounce physics —
this loop ships duration/easing only, since no animation-orchestration layer exists in this codebase
beyond scattered `transition-*` classes); a possible future "collage" hero layout (multiple images
shown simultaneously, distinct from the one-at-a-time carousel shipped here) if a preset ever
specifically calls for it.

## Heading typography per preset: case, tracking, weight (Loop 4e)

**STOREFRONT-V2.md §2.10's "Tipografia" row describes more than a font family per preset** (e.g.
Performance "TÍTULOS EM CAIXA ALTA", Monocromo "grotesca light com tracking largo, CAIXA ALTA fina",
Boutique "small caps", Impacto "leve itálico") — until this pass, only `fontDisplay`/`fontBody` (the
font family itself) was ever applied; every preset used the same sentence-case, normal-weight,
normal-tracking text underneath, which is why switching presets didn't feel like switching *brands*.

Added a `heading: { case, tracking, weight, italic? }` token to `StorefrontThemeTokens`
(`case: "none" | "uppercase" | "small-caps"`, `tracking` a CSS `letter-spacing` value, `weight` a
numeric font-weight). Wired through the **existing** global mechanism from Loop 4 — `TenantContext.tsx`'s
theming effect already sets `--kivoni-font-display`/`--kivoni-radius` on `document.documentElement`
for every route (a known, accepted low-impact quirk that also touches admin/PDV) — rather than the
Loop 4d `StorefrontThemeVars.tsx` provider (which is deliberately public-only, reserved for axes with
real reskin risk like background palettes). Heading case/tracking/weight is the same class of
low-impact typography-only change as font-family/radius already is, so it follows that precedent
instead of introducing a second mechanism. `storefront-themes.css`'s existing
`[data-theme-preset] h1, h2, h3 { font-family: ... }` rule gained
`text-transform`/`font-variant`/`letter-spacing`/`font-weight`/`font-style`, each reading a new CSS
var (`--kivoni-heading-transform`/`-variant`/`-tracking`/`-weight`/`-style`) — since `small-caps`
isn't a valid `text-transform` value (it's `font-variant`), the two properties are computed
independently from the same `case` enum rather than overloading one property. Defaults added to
`globals.css`'s `:root` block matching the "essencial" preset, same pattern as the existing
font-family/radius defaults.

**No new component changes needed** — product card titles (`ProductGrid.tsx`'s `<h3>`), the PLP page
heading, and the hero banner title (`HeroBanner.tsx`'s `<h2>`) all already render as native heading
tags with no inline `text-transform`/`letter-spacing`/`font-weight` overrides, so the global CSS rule
applies automatically. `PublicHeader.tsx`'s brand wordmark next to the logo is a `<span>`, not a
heading tag, and was deliberately left out of scope — a smaller, logo-adjacent label, not one of the
existing `h1`-`h3` targets this rule already covers.

**Verified live on two contrasting presets**: Performance (`lmfit`, the user's own tenant) renders
"Loja LMFit Store" and every product title in bold (800) uppercase; Monocromo (the disposable `kivoni`
tenant, reverted after) renders the same elements in thin (300) uppercase with wide tracking —
confirmed via computed styles (`text-transform: uppercase`, `letter-spacing: 3.6px` = 0.15em at the
h1's font-size, `font-weight: 300`), matching the token exactly.

## Preset full brand fidelity across the rest of the journey (Loop 4f, Phase A+B)

**Closes the gap between "PLP + hero only" and "the whole journey feels like a different store."**
Loops 4d/4e made the PLP and hero genuinely different per preset; a fresh audit (delegated, not
assumed) found the rest of the customer journey — PDP, checkout, ticker, header/footer brand name,
badge copy, PLP density — was still 100% generic regardless of which preset was active. `PLAN` stated
an explicit ceiling before scoping anything: no template system makes a generic multi-tenant store
pixel-identical to a real brand (real photography, custom typefaces, and years of art direction aren't
reproducible) — the actual, honest target is *genre* fidelity, matching STOREFRONT-V2.md §2.10's own
"neutral presets" framing.

**`StorefrontThemeTokens` gained two more fields**: `newBadgeLabel: string` (per-preset new-arrival
copy — e.g. Performance's "NOVO DROP" vs. the default "Lançamento") and `plpGap: string` (a literal
Tailwind gap class, e.g. `gap-2` for Performance's "denso" vs. `gap-5` for Boutique's "espaçadas" —
stored as a ready-to-use class fragment rather than an abstract density enum, matching `plpColumns`'s
existing precedent of literal Tailwind strings over a second lookup table).

**PDP gallery** (`ProductDetailClient.tsx`) now reads `cardAspectRatio` via `useThemeTokens()` instead
of a hardcoded `4/5` — both the real `ZoomableImage` gallery and its "Sem foto" placeholder path.

**Checkout** (`CheckoutClient.tsx`): the coupon "Aplicar" button and saved-address quick-select chips
migrated to the shared `<Button>` atom (address chips render `ghost` specifically when the active
preset's own `buttonStyle` is `solid`, to avoid a dense row of heavy filled buttons for what's a
secondary, non-committing action). Payment-method cards and `ShippingPicker` were explicitly **not**
touched — same reasoning Loop 4c already established: their selection state is communicated via
persistent background-color/border changes, not button shape, and reskinning them risks breaking that
affordance.

**Ticker speed now derives from `motionDurationMs`** instead of a fixed 22s. A new pure function,
`tickerDurationSeconds()` (exported from `StorefrontThemeVars.tsx`, unit-testable without a DOM),
linearly scales the schema's 80-600ms motion range into a 14-32s ticker range — a direct reuse of the
ms value would be meaningless at that scale (it's tuned for hover transitions, not a multi-second
scroll loop). `storefront-themes.css`'s `.kivoni-ticker-track` now reads
`--kivoni-storefront-ticker-duration` (set by `StorefrontThemeVars.tsx`, same public-only-scoped
mechanism as palette/motion since Loop 4d), falling back to the old 22s before hydration.

**Header and footer brand name now get heading typography treatment** without becoming a second
`<h1>` on the page. Both were plain `<span>`/`<p>` elements, missed entirely by Loop 4e's `h1-h3`
selector rule. Rather than converting them to heading tags (risking duplicate `<h1>`s alongside the
PLP's own page heading), a new shared `.storefront-brand-heading` CSS class was added to
`storefront-themes.css`'s existing selector list, carrying the identical case/tracking/weight/style
CSS-var rule — applied via `className`, not a tag change.

**Verified live on two tenants, cycling one preset each way for contrast**: `lmfit` (the user's real
tenant, already on Performance from Loop 4d) confirmed a real guest-checkout flow end-to-end with the
new coupon button styling and unchanged payment/shipping selection cards; the disposable `kivoni`
tenant was cycled essencial→performance to get a computed-style before/after on the ticker
(`animationDuration: 22s` → `18s`, exactly matching the formula) and the PLP grid's className
(`gap-3` default → `gap-2`), then reverted. Admin isolation re-confirmed twice: the staff login page
kept its normal sentence-case/weight regardless of preset, and `.storefront-brand-heading` does not
exist anywhere in the admin DOM (the class is only ever referenced inside `(public)` components).
Badge copy was verified at the unit-test/token level rather than live, since no current seed product
satisfies the "isNew" (created within 30 days) render guard on either tenant tested.

**Carried over** (per REFINEMENT, confirmed with the user): Vibrante's benchmarked "mosaico variável"
PLP layout — its density today is just a narrower uniform grid, the same mechanism as the other 7
presets; a genuine variable-tile mosaic needs a new grid-engine/masonry rework, not another token,
and doesn't fit alongside Phase A/B's token-widening pattern. Also still open from Loop 4d: true
per-preset motion choreography (parallax/spring physics) and a possible collage hero layout.

## Editorial storefront layer: hero, lookbook, institutional pages (Loop 4 continuation)

Extends the same `storefront` config object (no new tenant-level concept) with optional fields:
`heroTitle/heroSubtitle/heroImageUrl/heroCtaLabel`, `showTrustBar`, `couponBannerCode`,
`pages: { quemSomos, comoComprar, guiaMedidas, contato }` (four plain strings, not a rich-editor
document), and `lookbook: { imageUrl, title, variantIds: string[] } | undefined`. Every one of
these is optional and every consuming component (`HeroBanner`, `TrustBar`, `CouponBanner`,
`Lookbook`, `NewArrivalsShelf`, the four institutional page routes) renders `null` or a "not
configured" empty state when its own fields are unset — an unconfigured tenant's `/catalogo` is
unchanged from before this loop existed.

**Lookbook resolves against data already in memory, not a new endpoint.** The config only stores
bare `variantIds: string[]` — no name, price, or image. `resolveLookbookItems()`
(`src/components/organisms/Lookbook.tsx`, exported for unit testing) cross-references those ids
against the same `CatalogProduct[]` array `/catalogo` already fetched from
`/public/catalog/products` (which embeds each product's full `variants[]`), extracting everything
`useCartStore.addOrIncrement` needs (`productId`, `productName`, `sku`, `priceRetail`,
`priceWholesale`, `minWholesaleQty`, `imageUrl`) by walking every product's variants and matching
on id. This is the same "reuse the already-fetched catalog" pattern `NewArrivalsShelf` established
for the Lançamentos vitrine — no second network round-trip to resolve a lookbook or a new-arrivals
shelf.

**Admin lookbook editor reuses the order editor's variant-picker helper**
(`collectVariantOptionsFromProducts` in `normalizeApiList.ts`) rather than building a new
search/autocomplete component — same filter-by-SKU-or-name pattern already proven in
`OrderEditorClient`.

**Header search is 100% client-side**, matching the pre-existing `CatalogFilters`/
`useCatalogStore` filter — `PublicHeader`'s search box just calls `setCatalogFilter({search})` and
navigates to `/catalogo` if not already there. There is no backend search endpoint
(`catalog.controller.ts` has zero query params); a live autocomplete-suggestions dropdown would
need one and was deliberately deferred.

**Institutional pages are plain routes, not a CMS.** `(public)/quem-somos`, `/como-comprar`,
`/guia-medidas`, `/contato` are each a thin `page.tsx` around one shared `InstitutionalPage`
component parametrized by which `storefront.pages.*` field to read — text is rendered as
newline-split paragraphs, no HTML/markdown parsing. `StorefrontFooter` now always links to all
four (previously it deferred linking until the routes existed, to avoid dead links).

**Editorial blocks live on `/catalogo`, not a new `/` route** — confirmed via `middleware.ts` that
there is no tenant-aware path/subdomain routing available to Server Components (only a response
header/cookie a client component can read via `useTenant()`); `/` is owned by the marketing
landing page from the performance work earlier in this project. `/catalogo` is the real storefront
entry point every existing link already points to.

## PLP filters/facets + PDP variant selector (Loop 5)

**`GET /public/catalog/products` gained real server-side filtering**, replacing "fetch every
active product, filter client-side" (`ProductsService.listPublicCatalog`, now takes a
`PublicCatalogQueryDto`). The Mongo aggregation: `$match` on `category` (product-level field),
`$match` on `{variants: {$elemMatch: {size, color}}}` when either is set (so size+color filter
against the *same* variant, not independently — picking Red **and** M means a Red-M SKU exists,
not "has some Red variant and some M variant"), a separate `{variants: {$elemMatch: {price: ...}}}`
for the price range (independent of size/color — a price filter shouldn't require the discounted
variant to also be the selected size), a `$sort` derived from `sort` (`menor-preco`/`maior-preco`
sort on a computed `$min: '$variants.price'`; `lancamentos` sorts `createdAt desc`; default is
`name asc`), then `$skip`/`$limit` via the same `skipFromPage` helper the staff product list
already uses. `total` comes from a **separate** count-only aggregation (same pipeline minus
skip/limit, plus `$count`) run in parallel — never derived from `items.length`, which would be
wrong the moment pagination is involved.

**A dedicated `GET /public/catalog/facets` computes filter-rail options independent of the
currently-applied filters** — `distinct('category', ...)` plus one aggregation
(`$unwind` variants → `$group` distinct colors/sizes + min/max price) over *all* active products,
unfiltered. This is deliberate: computing facets from an already-filtered product list is a classic
bug that makes filter options vanish as a shopper narrows down results (e.g. selecting a color
would remove every size the *other* colors offered).

**Client-side `search`/`onlyInStock`/`onlyNew` stay client-side**, layered on top of whichever page
the server already returned (`ProductGrid.tsx` still filters `items` in-memory for these three).
Only `category`/`size`/`color`/`price`/`sort` moved server-side. This means, e.g., checking
"Estoque disponível" narrows only the current page's 20 items, not the full filtered result set —
a known, deliberate simplification (see loop-05 spec's Decisions), not a bug.

**PDP's `VariantSelector` is a new component, not a `VariantGrid` retrofit.** `VariantGrid`
(quantity steppers per SKU row) is shared with `PdvClient`/order entry, which genuinely needs
fast multi-line entry — a single-selection swatch/button picker would break that workflow.
`VariantSelector` derives one of 4 stock states per size button
(`disponivel`/`ultimas-unidades`/`esgotado`/`sob-encomenda`) using **the exact same fields and
threshold** `low-stock.cron.ts` already uses for its alert (`quantityOnHand <= reorderPoint &&
reorderPoint > 0` ⇒ "últimas unidades"; `quantityOnHand <= 0` ⇒ esgotado, or sob-encomenda if
`acceptsBackorder`) — no new inventory concept invented. Esgotado sizes are disabled
(`aria-pressed`/`disabled` + strikethrough); selecting one is structurally impossible, not just
visually discouraged.

**Color swatches use a hardcoded PT-BR name→hex table** (`src/lib/colorSwatch.ts`), because
`ProductVariant.color` is free text ("Padrão", "Preto", "Azul Marinho"), not a hex field.
Unrecognized names fall back to a neutral dot with the name as a tooltip — this degrades
gracefully rather than requiring a schema change for a visual nicety.

**Size guide reuses Loop 4b's `storefront.pages.guiaMedidas`** in a new `SizeGuideModal` — zero new
tenant config. The shipping-options block on PDP reuses Loop 3's `tenant.shippingConfig` read-only
(no `useCheckoutStore` coupling like `ShippingPicker` has, since the PDP isn't inside checkout);
there is no real CEP-based shipping calculator anywhere in this codebase, so the PDP intentionally
shows the same 3 flat fees for every visitor rather than a misleading CEP input that would return
the same numbers regardless of what's typed.

## `/catalogo` (simple/wholesale) vs `/loja` (e-commerce) — two separate routes

User-requested split (`specs/loop-05b-catalogo-loja-split.md`), not a roadmap-driven gap.
**Everything described in the three sections above (theme presets, hero/lookbook/institutional
pages, PLP filters/PDP variant selector) now lives at `/loja`**, not `/catalogo` — those sections
are left as-is since they accurately describe what was built, but the route they describe moved.

- **`/loja`** — the full e-commerce storefront (Loops 0–5, pure rename, zero behavior change):
  hero, trust bar, coupon banner, Lançamentos, lookbook, theme presets, PLP filter rail, PDP
  `VariantSelector`/sticky gallery/related products. Gated by `tenant.storefront.enabled` ("Loja
  ativa") — `StorefrontGate` now wraps only `loja/layout.tsx`, not the shared `(public)/layout.tsx`.
- **`/catalogo`** — rebuilt from the pre-e-commerce baseline (found via
  `git log --follow -- 'src/app/(public)/catalogo/'`, commit `57652e2`, before cart/PDP/WhatsApp
  checkout existed at all): a plain product grid (`SimpleProductGrid.tsx`, no color swatches/hover
  photo/% off badge), a 2-checkbox filter (`SimpleCatalogFilters.tsx`, no facet rail), and a PDP
  using `VariantGrid` (the same per-SKU quantity-stepper table PDV uses) instead of `/loja`'s
  swatch-and-size-button `VariantSelector` — well suited to fast wholesale bulk ordering. **Never
  gated by "Loja ativa"** — a merchant can take their online retail store down for maintenance
  while still sharing this catalog link with wholesale clients via WhatsApp.
- **Both routes share one buy mechanism** (`CatalogFloatingCart`: builds an order draft via the
  API, then opens `wa.me` with a formatted message) — this is what made the split possible without
  any backend change or new purchase flow. `/loja` additionally offers the separate `/checkout` →
  PIX/manual-payment → `/pedido/confirmado` path; `/catalogo` doesn't use it.
- **`/atacado`** (lead-capture form: nome/CNPJ/whatsapp → sets `useCartStore`'s role to
  `wholesaler` → redirects) was an orphaned, unlinked route before this split (nothing in the
  codebase linked to it). It's now a real entry point again: `/atacado` → `/catalogo` (simple).
  Visiting `/catalogo` directly, without going through `/atacado`, still shows retail pricing.
- **`PublicHeader.tsx`'s logo and search redirect are section-aware**: `pathname.startsWith
  ("/catalogo") ? "/catalogo" : "/loja"` — clicking the logo (or searching) stays within whichever
  section the visitor is already in, rather than always jumping to one fixed "home."
- Legacy `/catalog` (singular, one-line redirect stub) now points to `/loja`. Admin dashboard's
  "public catalog" link split into two: `/loja` (primary) and `/catalogo` (secondary, "Catálogo
  atacado").

## Cart drawer + one-page checkout (Loop 6, `/loja` only)

`/loja`'s bottom-sheet `CatalogFloatingCart` was replaced by a right-side `CartDrawer.tsx` that
opens automatically on add-to-cart. **`/catalogo` keeps the original, untouched
`CatalogFloatingCart`** — this loop deliberately scoped itself to `/loja` only (per the earlier
`/catalogo`/`/loja` split's own intent: `/catalogo` stays a simple WhatsApp-order utility).

**Drawer-open is a shared cart-store flag, not a new store.** `useCartStore` gained
`isOpen`/`open()`/`close()`/`toggle()` — deliberately excluded from the store's existing
`partialize`, so the drawer never auto-opens on a fresh page load. Only two call sites open it:
`VariantSelector.tsx` (PDP add-to-bag) and `Lookbook.tsx` ("add all to cart") — both `/loja`-only.
`VariantGrid.tsx` (PDV + `/catalogo`) and `ChatWidget.tsx` (shared across every public route)
deliberately never call `.open()`, so this change can't leak into PDV or the simple catalog.

**One order draft per cart session, shared between the drawer and checkout.** The drawer's coupon
field reuses the exact "create-or-reuse draft → `PATCH` with `couponCode` → read back
`discountTotal`" pattern already proven in the old floating cart — no new backend endpoint exists
or was needed. The token is stored in `useCheckoutStore.draftToken`; `/checkout`'s own `submit()`
calls the same `ensureDraftToken()` helper, so whichever surface (drawer or checkout) touches the
draft first "owns" it, and the other one just keeps patching that same token. Verified via network
log during Loop 6's VERIFY: exactly one `POST /public/order-drafts` fires per cart session even
when both the drawer's coupon-apply and checkout's submit run in the same session.

**`useCheckoutStore` is now persisted** (`localStorage`, key `kivoni-checkout`), closing a real gap
— before this loop, address/shipping method/customer info/coupon did not survive a page reload,
contradicting STOREFRONT-V2 §2.6's explicit requirement. The `pix` field is the one exception,
excluded from `partialize`: it's a live payment attempt with its own `expiresAt`, and resurrecting
a possibly-expired QR after a reload would be worse than asking the shopper to start over.

**Checkout stays single-page** (per the reconciliation decision already recorded in STOREFRONT-V2
§5) — "progressive" validation is a lightweight checkmark per section (`Seus dados`/`Entrega`) once
that section's own existing validity condition is true, not a wizard that hides later sections. The
order summary becomes a `lg:sticky` sidebar on desktop and a collapsible `Resumo do pedido` bar on
mobile (both render the same `OrderSummary` sub-component, gated by Tailwind breakpoint visibility
classes rather than a media-query-driven single instance).

**Free-shipping progress bar** uses `tenant.shippingConfig.freeAboveTotal` (Loop 3, already proven
by `ShippingPicker`'s own `shippingCost()`) — no new tenant config. Cart cross-sell suggestions
("Aproveite e leve a X") were explicitly descoped: `RelatedProducts.tsx` (Loop 5) is keyed to a
single PDP product/category, not a multi-line cart — a real cart cross-sell needs its own
selection heuristic and is carried over, not silently dropped.

## Customer accounts (Loop 7)

**A fully separate auth track from staff, not an extension of it.** Staff auth is a single global
Passport strategy named `'jwt'` (`JwtStrategy`/`JwtAuthGuard`, secret `JWT_ACCESS_SECRET`, payload
`{sub,email,role,tenantId}`). Customers get their own strategy, named `'jwt-customer'`
(`CustomerJwtStrategy`/`CustomerAuthGuard`, secret `JWT_CUSTOMER_ACCESS_SECRET`, payload
`{sub,tenantId}` — no role concept). Because these are two separately-registered Passport
strategies with two different signing secrets, a customer token cannot validate against a staff
route (no matching strategy, and even if it did, the secret wouldn't verify) — this is enforced at
the framework/cryptography level, not by an app-level "kind" check that a future guard could forget.
`CustomerAuthGuard` mirrors `JwtAuthGuard`'s tenant cross-check exactly: after the strategy validates
the signature, the guard separately compares the payload's `tenantId` against `request.tenantId`
(set by `TenantMiddleware` from `x-tenant-slug`) and 401s on mismatch.

**Login is e-mail magic link only** — no password field exists on `Customer`, and building WhatsApp
OTP would require an entire outbound Meta Graph API integration that doesn't exist anywhere in this
codebase (`src/whatsapp/` is inbound-only). `CustomerAuthService.requestMagicLink` finds-or-creates
a `Customer` by e-mail (`CustomersService.findOrCreateByEmail`), then stores a hashed, 15-minute,
single-use token (`MagicLinkToken`, same `sha256`-hash-at-rest + Mongo TTL-index shape as staff's
`RefreshToken`). The e-mailed link points at the **web page** `/conta?token=...`, not a raw backend
endpoint — the page's client JS makes the actual `POST /public/customer-auth/verify` call on mount.
This matters: a bare GET link that itself consumed the token would get silently burned by corporate
mail security scanners that auto-visit links before the real user clicks (a known magic-link bug
class). `verifyMagicLink` deletes the `MagicLinkToken` on success (single-use) and issues a session
via the same hash-rotate-on-refresh pattern as staff's `AuthService`, just against a separate
`CustomerRefreshToken` collection. The redirect base for the link is supplied by the client
(`window.location.origin` — correct per-tenant subdomain, since `getTenantSlug()` already resolves
tenants by real subdomain in production) but validated server-side against an allowlist
(`*.kivoni.com.br`, `*.lmfit.com.br`, `*.localhost:*`) before use, closing an open-redirect/phishing
angle from trusting an unvalidated client-supplied origin. When `NODE_ENV !== 'production'`, the
service also logs the full link server-side — a deliberate dev-testability aid (never returned in
any API response) that mattered in practice: local SMTP can fail to actually deliver (e.g. an
unverified sending domain on the provider) without that being a bug in this feature.

**Web-side token isolation mirrors the backend's.** `customerTokenStorage.ts` uses its own
localStorage key prefix (`kivoni_customer_access_<slug>`/`kivoni_customer_refresh_<slug>`) — never
`tokenStorage.ts`'s staff keys — and `customerHttp.ts` is a separate axios instance with its own
401→refresh interceptor. A staff member testing their own storefront while logged in as staff (or
vice versa) can never have one identity silently used for the other.

**Guest orders and customer accounts converge by e-mail, not by a separate "link my orders" step.**
`order-drafts.service.ts`'s `submitByToken` already had a guest-customer dedup (previously: match by
`whatsappWaId` only, or create new). This loop extended it to try `email` first when present. Since
`CustomerAuthService.requestMagicLink` resolves the same way (`findOrCreateByEmail`), a guest
checkout and a later magic-link login for the same address resolve to the identical `Customer`
document — a returning buyer's past guest orders just appear under "meus pedidos" the moment they
log in, no migration or explicit linking UI needed.

**"Meus pedidos" is a dedicated customer-safe query, not a reuse of staff's `findAll`.**
`OrdersService.findAllForCustomer(tenantId, customerId, page, limit)` filters by `customerId` in
addition to `tenantId`, then batch-joins `Payment` documents (`Payment.find({orderId:{$in:[...]}})`
— one extra query, not N+1) since payment status lives on a separate collection keyed by `orderId`,
not on `Order` itself. The returned shape deliberately omits `createdBy`/`operatorUserId`/internal
notes that staff's own order responses carry.

**`Customer.addresses[]` was reshaped**, not just extended: from `{label?,street?,city?,state?,
zip?,country?}` (`_id:false`) to `{label?,cep,logradouro,numero?,complemento?,bairro,cidade,uf}`
with real Mongo `_id`s (needed for per-address CRUD). This now matches checkout's own
`AddressForm`/`CheckoutAddress` field names exactly, so `/conta`'s address editor and checkout's
pre-fill/quick-select share one shape with zero translation layer. Confirmed safe before making the
change: no admin UI edited the old field names (only one defensive fallback chain in
`PrintOrderClient.tsx`).

**Checkout integration is prefill-only, not a real in-flow login.** A magic link can't complete
synchronously inside a checkout session (the buyer has to leave to check e-mail), so there's no
"log in without leaving checkout." What does work: if `useCustomerAuthStore` already has a `user`
(a prior session on this browser), `CheckoutClient` pre-fills name/e-mail/phone and offers saved
addresses as quick-select chips (clicking one remounts `AddressForm` via a `key` change so its
internal `useState` re-initializes from the newly-set `useCheckoutStore.address`, since `AddressForm`
only reads the store once on mount, not reactively). If not logged in, a small inline e-mail field
triggers `requestMagicLink` without blocking the rest of the form — guest checkout keeps working
unconditionally either way.

**No tracking/carrier field exists anywhere in the schema.** `Order` only has free-text
`shippingMethod` and `shippingCost` — "meus pedidos" can show a shipping method label, never a real
tracking number. This is a genuine gap, not an oversight of this loop; real carrier integration is
still unscoped (see ROADMAP §Loop 9).

## Returns portal + shipped notifications (Loop 8)

**Two execution paths, one shared effect.** The `returns` module predates this loop and was
staff-only: `POST /orders/:orderId/returns` reverses stock and credits `storeCreditBalance`
**immediately** on creation — there was no "pending request" concept. Loop 8 added a `status` field
(`requested`/`approved`/`rejected`/`completed`) so a *customer-initiated* request can exist without
those side effects until staff reviews it, while keeping the staff-immediate path **completely
unchanged** (it still sets `status: 'completed'` at creation, same request/response shape as before).
The actual stock-reversal + credit logic was extracted out of `ReturnsService.create()` into a
private `applyReturnEffects()`, called both by the legacy immediate path and by the new `approve()`
step — one implementation, so the two paths can never drift apart. `approve()` deliberately
re-validates the requested lines against the order's *current* state (via the same
`validateAndBuildLines()` the immediate path uses), not data captured at request time — defense in
depth against the order changing between when a request is submitted and when staff reviews it.

**Two entry points, one form.** Guest (`/devolucoes`) resolves the order by number + phone
(`ReturnsService.resolveOrderForGuest` — phone comparison is digits-only, and any mismatch, including
a non-existent order number, returns the same generic 404 so the endpoint never confirms or denies
that an order number exists). Logged-in (`/conta`, via Loop 7's session) skips the phone step
entirely and posts to `/me/returns` with the customer's own JWT-derived id. Both drive the same
`ReturnRequestForm` component (item checkboxes + reason + type), so there is exactly one
implementation of the request UI to maintain.

**Return type is deliberately two-way, not three.** STOREFRONT-V2's blueprint described
troca/vale-compras/estorno; only `exchange` (troca) and `return` (vale-compras → `storeCreditBalance`)
ship, because a real "estorno" (refund to the original payment method) needs a PSP refund API call
that doesn't exist anywhere in this codebase — InfinitePay integration only ever *creates* charges.

**Return window is real tenant config, not a hardcoded constant.** `ReturnPolicyConfig{windowDays,
policyText}` lives on the existing `StorefrontConfig` (`storefront.returnPolicy`) — same
field-by-field `$set` pattern `tenants.service.ts` already used for `storefront.pages.*`, and no new
public-exposure plumbing was needed since the public tenant-info endpoint already returns
`storefront` wholesale. `requestFromCustomer` checks `now - order.createdAt <= windowDays`
server-side at request time — a shortened test window (1 day) against a real ~1.5-day-old order
produced a real `400`, confirming enforcement isn't just a UI affordance.

**Shipped-order e-mail reuses the exact idempotency pattern already in `orders.service.ts`, not new
infrastructure.** A single `Order.shippedNotifiedAt` timestamp is checked-then-set inside `update()`,
right alongside the existing `oldStatus !== 'completed' && newStatus === 'completed'` loyalty-accrual
guard — `oldStatus !== 'shipped' && newStatus === 'shipped' && !existing.shippedNotifiedAt`. This
survives more than the obvious case: an order that goes `open→shipped→completed→shipped` again (a
real transition cycle, not hypothetical) does **not** re-send on the second `shipped`, because
`shippedNotifiedAt` — once set — is never cleared. A bare `oldStatus !== newStatus` comparison alone
would have re-fired on that third transition, since `oldStatus` (`'completed'`) differs from
`'shipped'` at that point; the extra boolean field is what actually closes the gap.

**All new buyer-facing e-mails are best-effort, matching Loop 7's precedent.** Return
approve/reject and the shipped notification all reuse `NotificationsService.sendEmail` wrapped in a
try/catch that logs and swallows failures — a delivery failure never blocks the underlying state
change (approving a return, or an order's status transition), the same posture Loop 7 established for
the magic-link e-mail. No retry queue exists for these; that's an explicit, recorded carry-over (Loop
7's payment-webhook dead-letter pattern is a different problem — outbound HTTP to a third party, not
transactional e-mail).

## Growth: loyalty redemption + store credit at checkout + cart cross-sell (Loop 9)

**Store credit is a flat final deduction, never a promotional-mechanic peer of coupon/Pix.**
`applyStoreCreditForSubmit()` (in `order-drafts.service.ts`) runs once per payment branch inside
`submitByToken`, after that branch's own subtotal (coupon-discounted, and Pix-discounted if the
Pix branch applies) is already computed, and subtracts `min(customer.storeCreditBalance,
totalBeforeCredit)` from the order total via `Order.creditApplied` — a new field alongside the
existing `discountTotal`, deliberately never feeding back into either the coupon or Pix-discount
computation itself. Three call sites exist (pix/infinitepay/manual) rather than one shared point,
because the Pix branch's `lineInputs` carry different (Pix-discounted) unit prices than the other
two — credit has to be computed against whichever subtotal that specific branch actually charges.

**The same atomic `$gte`-guard pattern used by `LoyaltyService.redeem` and Loop 8's
`applyReturnEffects()` protects store-credit spend too.** `CustomersService.applyStoreCredit()`
does `findOneAndUpdate({_id, storeCreditBalance: {$gte: creditApplied}}, {$inc:
{storeCreditBalance: -creditApplied}})` — a spoofed or replayed submit simply can't spend a balance
that's no longer there; the guard fails and the write becomes a no-op (0 applied), never an
overdraft. This was confirmed live: a real submit deducted a customer's full R$292,40 balance to
exactly R$0,00, matching the resulting order's `creditApplied` precisely.

**Store credit is logged-in-only, and that required no new `OrderDraft` schema field.**
`OrderDraft.customerId` only resolves at **submit** time for guest checkouts (via the existing
email/waId-matching logic in `submitByToken`) — before that moment, a guest draft has no known
customer and therefore no known balance to preview. `PublicSubmitDraftDto.useStoreCredit` lives
purely on the submit request body; there's nothing to persist or preview mid-draft. Confirmed live:
a guest checkout session shows zero store-credit UI (`canUseStoreCredit` gates on
`!!customerAuth.user`), and the guest submit path never calls `applyStoreCredit` at all.

**Self-redeem is a new caller on old, unmodified logic.** `POST /me/loyalty/redeem` on the Loop 7
`CustomerMeController` calls the exact same `LoyaltyService.redeem(tenantId, customerId, points)`
the staff-only `/customers/:customerId/loyalty/redeem` route already called — no new business logic,
just a customer-facing entry point. `CustomerAuthService.me()` was extended to return
`redeemValuePerPoint` (read from `tenant.loyalty.redeemValuePerPoint`, defaulting to `0.01`) so
`/conta`'s widget can show a live conversion preview before the customer confirms.

**Discovered live, not a Loop 9 defect: `tenant.loyalty` can be entirely unset, and it silently
disables both accrual and redemption.** `LoyaltyService.creditForOrder()` and `.redeem()` both
short-circuit on `!tenant?.loyalty?.enabled` — correct, defensive behavior for a tenant that never
opted into the feature, but it meant kivoni's own dev tenant had loyalty completely inert (0 points
ever accrued despite real completed orders) until enabled via `PATCH /tenants/:id/loyalty` for this
loop's verification. Any tenant relying on loyalty needs this config explicitly turned on — worth
checking before assuming the feature is live for a given store.

**Cross-sell reuses `RelatedProducts.tsx`'s heuristic on a second surface, discovered live to be
starved by sparse category data.** `CartDrawer.tsx`'s new shelf fetches
`GET /public/catalog/products?category=X&limit=N` using the most-recently-added cart line's
category (`pickCrossSellCategory`, walking the lines array backward since existing lines are
updated in place, not re-appended), filters out productIds already in the cart
(`filterCrossSellCandidates`), caps at 4, and links each card straight to its PDP rather than
one-click-adding a variant — a blind quick-add risks the wrong size/color in a fashion storefront,
so the shelf is a suggestion surface, not a second add-to-cart mechanism. Verified live that the
whole chain works end-to-end (category wire-through → fetch → exclude-in-cart filter → PDP link),
but also discovered that kivoni's real seed catalog has almost no shared `category` values — most
products have none at all, and the few that do are each singleton categories — so this shelf (and
Loop 5's `RelatedProducts`, which has the identical limitation) renders empty for nearly every real
product today. Not a code defect; a data/config gap worth a category-backfill pass.

## Launch hardening: rate-limit gaps, DLQ replay, Sentry browser, LGPD consent (Loop 10)

**Goal was "safe to point real traffic at" — a safety bar, not a growth bar.** SEO, analytics, and
CWV (confirmed 100% greenfield) were explicitly carried over as their own future loop; nothing here
touches those.

**Rate limiting.** `TenantThrottlerGuard` (global `APP_GUARD`, `120 req/60s` default) tracks by
`req.tenantId ?? req.user?.tenantId ?? req.ip` — every visitor to the same tenant's storefront shares
one bucket, not one bucket per visitor. Four `@Throttle` overrides now exist beyond the pre-existing
ones on `auth.controller.ts`/`public-payments.controller.ts`:
- `public-customer-auth.controller.ts`: `request-link` 15/min, `verify` 20/min
- `public-order-drafts.controller.ts`: `submit` 20/min
- `public-returns.controller.ts`: `lookup` and `request`, both 15/min
- `catalog.controller.ts`: **all routes, 1000/min** (controller-level) — found by actually running
  the load-test script (below), not by design review. The first run returned 20,306/20,425 requests
  as `429` on the anonymous-browse scenario; `/public/catalog/products` and `/public/catalog/facets`
  had no override at all, so real concurrent shoppers filtering a catalog would trip the blanket
  120/min in production. 1000/min gives real headroom for legitimate concurrent browsing while still
  capping scraping/abuse.

**Input caps.** `@MaxLength`/`@Max`/`@ArrayMaxSize` added to `public-catalog-query.dto.ts`,
`pagination-query.dto.ts`, and `public-patch-draft.dto.ts` (line quantity, `waId`, `couponCode`,
`paymentMethodChoice`, lines array size) — matching `public-chat.dto.ts`'s existing pattern. The
global `ValidationPipe` already stripped unknown fields; this closes the "no upper bound" gap on
fields it does accept.

**DLQ replay for failed payment webhooks.** `FailedWebhook` (Mongo, written by
`PaymentWebhookDispatcherService.dispatchPaymentEvent` on retry-exhaustion — 3 retries with 500ms/
1.5s/4s backoff) had a `resolved: boolean` field with zero reader anywhere in the codebase until this
loop. `dispatchPaymentEvent`'s return type changed `void → boolean` (all 3 existing callers already
discarded the return value, so this is non-breaking) so a replay caller can know whether to flip
`resolved`. Two staff-only endpoints on `payments.controller.ts` (placed before the existing `:id`
routes to avoid route-matching ambiguity):
- `GET /payments/failed-webhooks` — lists unresolved entries for the tenant
- `POST /payments/failed-webhooks/:id/replay` — re-dispatches through the same
  `dispatchPaymentEvent` retry-with-backoff path (not a bare `fetch`); on success flips
  `resolved: true`, on failure persists a *new* `FailedWebhook` doc exactly like the original failure
  path (no new failure-handling logic needed)

**Runbook: replaying a failed webhook.** `GET /payments/failed-webhooks` to find the id, then
`POST /payments/failed-webhooks/:id/replay`. Check `lastError` on the newest doc for *why* it failed
before replaying blindly — a webhook that already exhausted 3 automatic retries likely failed for a
reason (wrong URL, receiver down, payload rejected) worth a human look first. **Refunds are entirely
PSP-side today** — no refund-initiation endpoint exists in this codebase; process refunds directly in
the payment provider's dashboard.

**Sentry browser SDK.** `@sentry/nextjs` on `(public)` via `instrumentation-client.ts` (Next 15.5's
file convention, not the older `sentry.client.config.ts`), reusing the same DSN as the server-side
`SENTRY_DSN`. `Sentry.setTag("tenant_slug", slug)` added to `TenantContext.tsx`'s existing
theme-preset effect — lands on Sentry's **isolation scope** (not the "current scope" — the two are
separate layers that get merged together when an event is actually sent; confirmed via
`Sentry.getIsolationScope().getScopeData().tags` against a real captured event, since inspecting only
`getCurrentScope()` shows it empty and looks like a bug when it isn't).

`instrumentation-client.ts` alone only catches plain uncaught JS errors (`window.onerror`/
`onunhandledrejection`) — it does **not** catch React render-time errors, which Next's own App
Router error boundary intercepts first. `src/app/global-error.tsx` (new) explicitly calls
`Sentry.captureException(error)` in a `useEffect`, per Sentry's own Next.js integration
recommendation — without it, a render error simply never reaches Sentry at all, silently. **This can
only be verified against a real `next build && next start`** — Next's dev-mode error overlay
intercepts and swallows both plain and render errors before `window.onerror` or any error boundary
gets a chance to run, so the dev server always looks broken (or worse, looks like nothing happened)
regardless of whether the wiring is correct.

**LGPD cookie consent + legal pages.** `cookieConsent.ts` (`getConsentStatus`/`setConsentStatus`)
mirrors this codebase's existing direct `document.cookie` pattern (`tokenStorage.ts`,
`login/page.tsx`'s `tenant-slug` cookie), 1-year `max-age`. `CookieConsentBanner.tsx` mounted in
`(public)/layout.tsx`, shown only when no consent cookie exists yet. `/privacidade` and `/termos` use
a new `PolicyPage.tsx` — deliberately distinct from the tenant-configurable `InstitutionalPage.tsx`
(empty by default) since a legal disclosure obligation can't depend on a merchant filling in a field;
both routes ship with real, non-placeholder Portuguese content on day one and are linked from
`StorefrontFooter.tsx`.

**Load-test script** (`lmfit-web/scripts/load-test.mjs`, `npm run load-test`) — not part of `npm test`/
CI, a manual pre-launch check against a disposable tenant (scenario 2 creates real orders each run).
Two scenarios: anonymous catalog browsing (`overallRate: 8` req/s, well under the new 1000/min
catalog ceiling) and a full guest checkout (draft → patch → submit-manual), run as a small sequential
loop rather than through `autocannon`'s own rate limiting (whose floor is 1 req/s = 60/min — itself
above the order-draft submit's 20/min cap). A raw, unthrottled `autocannon` flood was tried first and
always trips per-tenant rate limiting regardless of the limit's value — that's the limiter working as
designed, not a capacity signal, which is why the script simulates realistic concurrency instead of
maximum throughput. Uses `autocannon` (an npm devDependency), not k6 (the originally-planned tool,
unavailable locally without a slower system-wide install) — same pass/fail goal, no new system
dependency.

## Storefront multi-layout: Layout Families, 10 presets (Loop 12)

**Every prior preset loop (4/4c/4d/4e/4f) only ever changed *aesthetics*** (fonts, palette,
radius, motion, heading typography) while every storefront shared one fixed DOM structure. Loop
12 adds the axis those loops deliberately never touched: **which sections exist, and where.**

**Family vs. preset — the core split.** `layoutFamily` (`"classic" | "editorial" | "minimal" |
"expressive" | "industrial"`) lives right in `StorefrontThemeTokens` (`storefrontPresets.ts`),
alongside every other per-preset fact — not a second, parallel map that could drift out of sync.
- **Family = structure.** Which blocks exist, their order, and their wrapper markup (e.g.
  industrial wraps the hero in a hard black frame; minimal skips the trust bar and new-arrivals
  shelf entirely; classic shows a category-chip bar under the header).
- **Preset = aesthetics.** Fonts, palette, radius, motion, card aspect ratio — unchanged from
  Loop 4d/4e/4f's system.

10 presets now map to 5 families: `classic` (essencial, performance, impacto), `editorial`
(editorial, boutique), `minimal` (luxo, studio, monocromo), `expressive` (vibrante), `industrial`
(streetwear). `resolveLayoutFamily(themePreset)` (`src/layouts/storefront/resolveLayoutFamily.ts`)
is the single lookup every dispatcher calls; unknown/undefined presets fall back to `classic` via
the existing `resolveThemePreset` default.

**No preset ID was renamed.** `themePreset` is a validated enum in `tenant.schema.ts` +
`update-storefront-config.dto.ts`, and real tenants have stored values (`lmfit` = `performance`).
Renaming an ID for a "nicer" name would need a Mongo migration for zero user-visible gain — the
merchant only ever sees the preset's `label`. So: **IDs are permanent, labels changed**
(performance→**Atlético**, studio→**Wellness**, vibrante→**Tropical**, monocromo→**Minimal**).
Only the 2 genuinely new presets (`luxo`, `streetwear`) got new IDs, added additively to both the
schema enum and the DTO's `THEME_PRESETS` array.

**Composition over duplication.** The naive version of this feature is ~25 new components (5
families × Header/Home/PDP/Card/Footer). Instead, the existing organisms (`HeroBanner`,
`TrustBar`, `CouponBanner`, `Lookbook`, `NewArrivalsShelf`, `ProductGrid`) already render every
*block* a family's wireframe needs — family components only decide **which of them appear, in
what order, inside what wrapper**. Contracts live in `src/layouts/storefront/types.ts`:

```ts
interface HomeSlots {
  hero: ReactNode; hasHero: boolean;   // HeroBanner renders null with no heroTitle —
                                        // families that WRAP the hero (industrial's frame)
                                        // need hasHero to avoid drawing an empty frame
  trustBar: ReactNode; coupon: ReactNode; lookbook: ReactNode; newArrivals: ReactNode;
  filtersBlock: ReactNode;             // title + search + filter rail, as one block
  grid: ReactNode;                     // ProductGrid + "carregar mais" pagination
  newItems: CatalogProduct[];          // raw items, for families that render a horizontal
                                        // rail (ProductRail) instead of a shelf
}
interface PdpSlots {
  backLink, gallery, thumbs, info, related: ReactNode;
  urls: string[]; productName: string; // raw photo URLs, for industrial's moodboard grid
}
```

**Ownership never moves.** `PublicHeader.tsx`, `LojaClient.tsx`, and
`ProductDetailClient.tsx` remain the sole owners of all data fetching and state (search draft,
catalog filters/pagination, variant selection, size-guide modal). Each builds its slots object,
then a one-line `switch (resolveLayoutFamily(...))` dispatches to the matching family component
under `src/layouts/storefront/{family}/` — 15 total (`Header`/`Home`/`PDP` × 5), all pure/
presentational, none of them fetch anything. `StorefrontFooter.tsx` uses an internal switch
instead of 5 files (small enough not to warrant the split). Net result: **no shared organism
forked by family** — one maintenance point per block, same discipline Loop 4c/4d already
established for `Button`/`StorefrontThemeVars`.

**New primitives** (blocks that genuinely didn't exist before): `CategoryChips.tsx` (classic
family — fetches the real `GET /public/catalog/categories`, clicking a chip writes
`useCatalogStore.setFilter({category})` and navigates to `/loja`, same filter the PLP's own rail
already reads); `ProductRail.tsx` (horizontal snap-scroll compact cards, editorial/classic
"lançamentos" rail); `MarqueeTape.tsx` (industrial — reuses the exact `.kivoni-ticker-track` CSS
animation the announcement ticker already uses, `aria-hidden`, no new keyframes).

**`cardFrame` token** (`"border" | "borderless" | "hard-border"`) is the one card-level
difference no existing token could express (minimal wants zero border/shadow; industrial wants a
hard 2px black edge) — wired directly into `ProductGrid.tsx`'s card wrapper, not a fork:
```ts
const frameClass = cardFrame === "borderless" ? "rounded-lg overflow-hidden"
  : cardFrame === "hard-border" ? "border-2 overflow-hidden bg-[var(--card-bg)]"
  : "rounded-lg border bg-[var(--card-bg)] overflow-hidden";
```

**Latent bug found and fixed: Google Fonts weight list.** `ensureGoogleFontLoaded` (in
`TenantContext.tsx`) had always requested every font with a fixed `:wght@400;500;600;700` suffix
— but the Google Fonts css2 API silently rejects the **entire** font request if any one listed
weight doesn't exist for that family, falling back to no custom font at all. **Anton (Impacto's
display font) only ships weight 400** — so Impacto's headline font has silently never actually
loaded since Loop 4 introduced it, always falling back to sans-serif with nobody noticing (nothing
crashed; it just silently looked wrong). Streetwear's new Space Mono (400/700 only) would have hit
the identical bug. Fixed with an exported `GOOGLE_FONT_WEIGHTS: Record<string, string>` map
covering the fixed 13-font catalog (e.g. `Anton: "400"`, `"Space Mono": "400;700"`), looked up per
font instead of the old blanket string.

**Verified live (2026-07-19)** on kivoni (industrial vs. minimal vs. classic showing radically
different DOM structure on identical catalog data) and the real `lmfit` tenant (Atlético vs.
kivoni's Essencial — both `classic` family — confirmed structurally identical, aesthetically
opposite). Admin picker regrouped under 5 family headings with a one-line tagline per preset;
mockup preview stayed family-agnostic (reads tokens only). One tooling note from VERIFY: the
staff admin login form would not submit via browser automation (an empty-required-field
validation quirk of the automated click/fill path, not an app bug) — the admin-picker and "Ver ao
vivo" checks were instead done against a fully real, authenticated session by issuing genuine
JWTs through the actual `POST /auth/login` endpoint and writing them into `localStorage` under the
app's own key format (`kivoni_access_{slug}`) — the same mechanism the real login flow itself
uses, not a stub or a mock.

Carried over (visual flourishes, not structural): industrial grain/glitch texture, Vibrante's true
variable-tile mosaic PLP (carried since Loop 4f — needs a new grid engine, not a token), editorial's
asymmetric lookbook grid, true motion choreography (parallax/spring physics — duration/easing only
today), a collage-style multi-image hero layout.

## SEO + Core Web Vitals: server-side metadata, structured data, next/image (Loop 10 v2)

**`/loja` was invisible to search engines and slow to paint its own hero.** Every page under
`(public)` had a static, hardcoded, shared `<title>`/description ("Kivoni — Painel" from the root
layout, "Kivoni - Catálogo" from `(public)/layout.tsx`) — even the real `lmfit` tenant's browser tab
said "Kivoni." No `generateMetadata`, no structured data, no sitemap, no robots.txt existed anywhere.
Separately, every image surface that matters for LCP (`HeroBanner`, `ProductGrid`'s PLP cards, the
PDP gallery, the shared `ImageCarousel`) rendered a bare `<img>` despite `next.config.ts` already
having AVIF/WebP configured since an earlier performance pass — that pipeline had zero consumers.

**Metadata layering, outside-in** (Next merges child-segment metadata over parent's, replacing
`title`/`description` wholesale unless a `template` is used — none is used here):
1. `(public)/layout.tsx` — a baseline `generateMetadata()` (async, calls `getServerTenant()`) sets
   `${tenant.name} - Catálogo` + `tenant.branding.faviconUrl` as the shared default for **every**
   `(public)` route, not just `/loja` — `/catalogo`, `/checkout`, `/conta`, etc. all inherit a real,
   tenant-correct title for free as a side effect, even though only `/loja` got dedicated
   `generateMetadata`/JSON-LD work this loop.
2. `loja/layout.tsx` — a more specific `generateMetadata()` overrides the baseline for everything
   under `/loja`: `storefront.metaTitle`/`metaDescription` (new optional tenant override, admin UI in
   Settings' "Loja Online") when set, else `${tenant.name} — Loja Online` + a real description; plus
   OG/Twitter tags using `tenant.branding.logoUrl`.
3. `loja/page.tsx` (home) and `loja/p/[slug]/page.tsx` (PDP) each layer their own JSON-LD
   (`OnlineStore` / `Product`) as a `<script type="application/ld+json">` alongside the client-shell
   default export — the client component (`LojaClient`/`ProductDetailClient`) is untouched, this is
   additive server-rendered markup only. The PDP additionally has its own `generateMetadata` (product
   name/description/real photo as OG image) since a product page's correct title has nothing to do
   with the parent layout's generic fallback.

**Money field gotcha applies here too**: `getServerProduct()`'s raw `priceRetail` arrives as a
`BrlMoneyResponseInterceptor`-formatted string ("299,90"), same as every other money field in this
codebase (see §API money convention above) — `extractServerPrice()` in `serverTenant.ts` is the
server-side twin of `ProductGrid.tsx`'s `extractPrice()` (duplicated, not imported, because that file
is `"use client"` and this code runs in Server Components).

**`sitemap.ts` / `robots.ts`** (`src/app/`, Next's file convention) are both **dynamic per tenant** —
each resolves the request's own `host` via `headers()` and fetches that tenant's real product list
(same high-`limit` `GET /public/catalog/products` pattern `LojaClient.tsx`'s `EDITORIAL_SCAN_LIMIT`
already used), so `kivoni.../sitemap.xml` and `lmfit.../sitemap.xml` are genuinely different
documents, not the same static file on every subdomain. `robots.ts` disallows every admin/PDV route
segment plus `/login`/`/checkout`/`/pedido`/`/conta`.

**`next/image` adoption pattern**: every swapped surface uses `fill` (not `width`/`height`) inside a
wrapper that already has `position: relative`/`absolute` and a defined size (`aspectRatio` style, or
a fixed `h-N w-N`) — this codebase's cards/hero/thumbnails were already built this way for the CSS
crossfade/zoom effects, so no layout markup changed, only the `<img>`→`<Image>` swap itself.
`sizes` is **derived from the real per-preset token**, not a guessed number: `ProductGrid.tsx`'s new
`buildCardImageSizes()` reads the active preset's actual `plpColumns` (base/sm/md column counts) and
the known `max-w-3xl` (768px) container ceiling to build a `sizes` string that matches exactly what
each preset's grid really renders — a `luxo` (1-2 col) and a `streetwear` (2-4 col) preset get
correctly different `sizes`, not a shared approximation. `priority` is set only on the genuine
above-the-fold candidate per surface (the hero's single image / first carousel slide, the PLP's first
card, the PDP's main gallery image) — confirmed live via the `<link rel="preload" as="image"
imagesrcset="..." imagesizes="...">` tag Next only emits for `priority`-flagged images, which is the
actual mechanism that prevents an LCP candidate from being "late-discovered" by the browser.

**Two gaps VERIFY found that PLAN could not have anticipated** (both fixed, not carried over):
- **`IndustrialPDP.tsx`** (one of Loop 12's 5 family PDP components — see the section above) does
  **not** use `ProductDetailClient`'s `gallery`/`thumbs` slots at all for its "moodboard" layout; it
  reads the raw `PdpSlots.urls: string[]` directly and renders its own grid with its own `<img>`
  tags. A plan written against `ProductDetailClient.tsx` alone (the file `<img>` grep found) would
  never surface this — it only became visible by actually loading a PDP under the `industrial` family
  live. Fixed with the identical `fill`+`sizes`+`priority` pattern. **Any future image-related PDP
  change must check all 5 family PDP components individually**, not just `ProductDetailClient.tsx` —
  `grep -rln "<img" src/layouts/storefront/` is the fast way to catch this class of gap; today it
  should only ever match the 5 family headers' brand-logo images (correctly out of scope, not a
  product photo, not an LCP candidate).
- **`TenantContext.tsx`** had a pre-existing client-side effect that mutated `document.title` on
  every tenant-data load — a workaround written for exactly the hardcoded-title problem this loop
  fixed at the server level. Its fallback branch blindly appended `" | " + tenant.name` to *any*
  title that didn't already contain the tenant's name — harmless when every title was a generic
  "Kivoni..." string, actively corrupting once real per-page titles existed (a product literally
  named "Camisa Flamengo I 2024" has no reason to contain the tenant's name, so it always hit the
  append branch). Narrowed to only its still-genuinely-useful case: replacing the literal word
  "Kivoni" in the **admin panel's** still-static root-layout title (admin/PDV are out of this loop's
  SEO scope by design, so they still rely on this client patch, not `generateMetadata`) — confirmed
  both directions live: `/loja`/PDP titles now render exactly as their own `generateMetadata`
  produced, admin (`/dashboard`, `/login`) still correctly rebrands per tenant.

**Known pre-existing data gap** (found, not fixed — matches the "record real gaps, don't fabricate
fixtures" pattern Loop 9 already established for a similar issue): every seed product on both
`kivoni` and `lmfit` has `images: []`/`primaryImageUrl: null`. The PLP/PDP/OG/JSON-LD image code
paths are all correct and were confirmed working by temporarily PATCHing a real Cloudinary URL onto
one test product via the admin API and reverting after — but out of the box, this dev environment's
product photos are simply empty everywhere, independent of anything this loop touched.

**Carried over**: analytics events (view/add-to-cart/checkout/purchase — needs the user's own
provider decision: cost, privacy posture, what to actually track, sequenced deliberately *after*
Loop 10 v1's cookie-consent mechanism already exists); CI-enforced Lighthouse/CWV budget automation;
a generated/branded OG image (today's OG image is the real product photo/tenant logo directly —
correct, just not a custom-designed card); `/catalogo`'s own `generateMetadata`/JSON-LD (deliberately
out of scope — matches Loop 5b's reasoning that `/catalogo` is a WhatsApp-shared wholesale link, not
meant for organic search).

## Answers to Loop 0 open questions

1. **Tenant on public pages** — header `x-tenant-slug` (from subdomain), not path/query.
2. **`(public)/catalog` vs `(public)/catalogo`** — `catalog/page.tsx` is a stub redirecting into the
   real `catalogo/` flow (candidate for deletion in Loop 1). `atacado/` is a separate wholesale page.
3. **Variant selection on PDP** — yes: `VariantGrid` with per-variant qty steppers feeding the cart.
4. **Customer on public submit** — auto-created from `metadata.customer`, deduped by `waId`;
   `walkIn: false`; distinct from the PDV walk-in placeholder.

## Gaps confirmed in Loop 0 (ranked input for next loops)

1. **No stock reservation before payment** — stock decrements only when the order completes (paid).
   Manual/WhatsApp orders never decrement automatically; concurrent buyers can oversell. (Loop 3+)
2. **Post-payment UX dead end** — after simulate-confirm the buyer lands on
   `/pedido/novo` showing "Este rascunho já foi enviado"; no order-confirmation page. (Loop 1/5)
3. ~~**PIX QR is a placeholder**~~ **Resolved in Loop 2** — PIX now delegates to the real
   InfinitePay checkout (with a safe dev-QR fallback when no creds/PSP failure); admin config UX
   shipped (Settings → Customização, InfinitePay tag/key fields already existed, just needed a form).
4. ~~**Shipping values hardcoded**~~ **Resolved in Loop 3** — per-tenant `shippingConfig` (pickup
   label, standard/express fees, free-above threshold), computed server-side, never trusted from
   the client (a real client-trust gap found and closed in the same loop).
5. **Floating cart hardcodes a WhatsApp number** (`CatalogFloatingCart`), ignoring
   `tenant.whatsappNumber` — which `/public/tenants/:slug` *does* expose (as it does
   `infinitePayTag`; kivoni simply has neither configured). (Loop 1)
6. **Seed data quirks**: `minWholesaleQty: 1` (everything wholesale) — Loop 2 confirmed this also
   drove a real PDP display bug (now fixed) beyond the already-known submit-time effect; duplicate-ish
   categories, legacy `stock`/`wholesalePrice` fields on variants that no code should read. (data cleanup)
7. **`pedido/novo` is a dev harness** exposed publicly; it also still expects the old array response
   of `/public/catalog/products` (now `{items,total}`). Replace or hide. (Loop 1)
8. **No integration test with a real DB** — happy path covered by unit specs + manual walk;
   `mongodb-memory-server` e2e is a carry-over. (Loop 1+)
9. **No credential encryption anywhere** — confirmed in Loop 2 REFINEMENT: `focusNfeToken`,
   `infinitePayApiKey`, every `IntegrationCredentials` field are plain DB strings, no precedent
   for encryption at rest in this codebase at all. Loop 10 hardening shipped rate-limiting/DLQ
   replay/Sentry/LGPD instead; credential encryption remains open. (future hardening loop)
10. ~~**No storefront management for the tenant**~~ **Partially resolved in Loop 4** — theme
    preset (8 options), announcement ticker, footer, and store on/off switch now live in admin
    "Loja online". Still open: banners/featured products/SEO metadata, editorial Home content,
    institutional page content, per-tenant plan gating on storefront features. (Loop 4 continuation)

## Env vars exercised

`PIX_PROVIDER` (default `dev`), `PIX_EXPIRES_MINUTES` (default 30), `PIX_DEV_QR_IMAGE`,
`WEB_ADMIN_BASE_URL` (staff alert links), `PAYMENT_DEV_CONFIRM_KEY` (gates `dev-confirm`; Loop 2:
`simulate-confirm` is now also blocked outright when `NODE_ENV=production`, no key bypass),
`PAYMENT_WEBHOOK_SECRET` (Loop 2 — required for `infinitepay-webhook` to accept anything; embedded
by us as a query param on the `webhook_url` sent to InfinitePay, not a header InfinitePay signs).
`JWT_CUSTOMER_ACCESS_SECRET`/`JWT_CUSTOMER_ACCESS_EXPIRES` (Loop 7 — customer magic-link sessions;
deliberately a separate secret from staff's `JWT_ACCESS_SECRET`, required at boot like its staff
counterpart).
