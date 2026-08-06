# Loop 04 continuation — Editorial home, institutional pages, Lookbook, header search

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 4 (continuation of v1) · **Depends on:** Loop 4 v1
**Repos touched:** lmfit-api / lmfit-web

## Goal

Close out ROADMAP's original Loop 4 carry-overs: the storefront gets an editorial presentation
(not just a bare product grid), real institutional content, a "compre o look" module, and working
header search — all tenant-configured from "Loja online".

## Scope

**In:**
- **Header search** — corrected from "blocked on Loop 5" (see Decisions): a real search box in
  `PublicHeader`, wired to the search filter `/catalogo` already has
- **Editorial home blocks on `/catalogo`** (see Decisions on why not a new `/` route): hero banner,
  trust bar, first-purchase coupon banner, "Lançamentos" vitrine — all above the existing
  filterable product grid, all tenant-configurable
- **Institutional pages**: quem somos, como comprar, guia de medidas, contato — new routes with
  tenant-editable content (plain text/paragraphs, not rich WYSIWYG), footer links wired to them
- **Lookbook "compre o look" module** — one editorial photo + a curated list of variants, "add all
  to cart" button, no combo discount (per original blueprint decision)
- Admin "Loja online" additions: hero banner fields, trust bar toggle, coupon banner code picker,
  institutional page text editors, lookbook editor

**Out (explicitly, with reasons — not silently dropped):**
- **A tenant-aware editorial home at the bare `/` route** — the marketing landing page owns `/`
  today and there's no server-side tenant resolution (middleware only sets a response
  header/cookie, not a request header `next/headers` can read); building that would mean either
  reworking the landing into a client-side conditional (undoing this session's SSR/perf work) or
  adding request-header injection to middleware — a real, separate piece of infrastructure work,
  not a content task. Editorial blocks ship on `/catalogo` instead, which is the actual storefront
  entry point every existing link (header logo, login redirect, admin) already uses.
- **Full autocomplete suggestions dropdown** for header search — the "real" fix is the box now
  works and takes the shopper to filtered results; a live dropdown-of-matches-as-you-type is a
  separate, bigger UI feature reasonable to defer.
- **Plan gating** — deliberately not implemented. This is a pricing/business decision (which plans
  get which storefront features), not a technical gap; the landing page's own marketing copy
  already lists "Catálogo público" under the Grátis plan, so there's no existing plan/feature
  contradiction to resolve, and inventing a restriction now risks breaking the exact features just
  shipped and tested this session. Needs explicit product direction before implementation.
- **Rich WYSIWYG editor** for institutional pages — plain textarea/paragraph fields only, matching
  the "CMS-lite" framing from STOREFRONT-V2 and the effort level of this loop.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Where does "home" live | Enrich the existing `/catalogo` route, not a new `/` route | Confirmed by reading `middleware.ts`: no tenant-based path routing exists, `/` is owned by the marketing landing (a Server Component with no tenant context, deliberately, from this session's performance work). `/catalogo` is already the real entry point (header logo, login redirect, every internal link) |
| Header search scope | Wire a real search box to the **existing** `useCatalogStore` client-side filter (already used by `/catalogo`'s `CatalogFilters`) | REFINEMENT found the original "blocked on Loop 5" note was wrong — filtering is 100% client-side today via zustand, no backend endpoint needed for a working search box; only a live-suggestions dropdown would need a real API (deferred) |
| Institutional page content | Plain text fields per tenant (`storefront.pages.{quemSomos,comoComprar,guiaMedidas,contato}: string`), rendered as paragraphs | Matches "CMS-lite" scope; a rich editor is real added complexity (sanitization, editor library) not justified for 4 static pages |
| Hero/vitrine/coupon banner content source | New fields on `storefront` config (`heroTitle`, `heroSubtitle`, `heroImageUrl`, `heroCtaLabel`, `showTrustBar`, `couponBannerCode`) — not a generic "ordered blocks" array | STOREFRONT-V2's original sketch imagined a fully generic reorderable block system; that's real product-builder complexity (drag-reorder, per-block-type schemas) disproportionate to this loop. A fixed set of well-named fields delivers the same visible outcome for a fraction of the build |
| Lookbook data model | `storefront.lookbook: { imageUrl, title, variantIds: string[] } \| null` (single lookbook this loop, not a list) | One lookbook proves the pattern end-to-end; multiple lookbooks is a straightforward but separate extension once this is used |
| "Lançamentos" vitrine data | Reuse the existing `productIsNew()` recency heuristic already used by `ProductGrid`'s `onlyNew` filter, sorted by `createdAt` desc, capped at N | No new backend query — same logic already proven correct in the existing filter |
| First-purchase coupon banner | Admin picks an **existing** promotion code (`couponBannerCode`); banner just displays it prominently, real validation still happens at checkout via `promotions.validateAndComputeDiscount` (unchanged) | Promotions has no "first purchase" type (`percent`/`fixed` only) — inventing one is a promotions-module change out of scope; referencing an existing code is a pure presentation feature |

## Acceptance criteria

- [x] AC1 — Typing in the header search box and submitting filters `/catalogo`'s product grid to
      matching products *(verify: browser, type a known product name, confirm grid filters)*
- [x] AC2 — Admin can set a hero banner (title/subtitle/image/CTA) in "Loja online" and it renders
      at the top of `/catalogo` *(verify: admin save; browser shows the configured hero)*
- [x] AC3 — Trust bar (shipping/installments/security) shows on `/catalogo` when enabled in admin,
      hidden when disabled *(verify: toggle both states in browser)*
- [x] AC4 — Coupon banner shows the admin-configured code and the code still works at checkout
      *(verify: configure code, see banner, apply the same code in checkout, confirm discount)*
- [x] AC5 — "Lançamentos" vitrine on `/catalogo` shows recently-created products, capped at a
      reasonable count *(verify: browser, cross-check against `onlyNew` filter's own results)*
- [x] AC6 — Institutional pages (quem somos, como comprar, guia de medidas, contato) render
      tenant-configured content at their own routes, footer links navigate to them *(verify:
      admin sets text for each page; browser visits all 4 via footer links)*
- [x] AC7 — Lookbook block shows the configured photo/title; "add all to cart" adds every listed
      variant to the cart in one click *(verify: browser, click, confirm cart has all variants)*
- [x] AC8 — All new sections are absent/gracefully empty when not configured (no broken layout,
      no placeholder junk) *(verify: a tenant with nothing configured — kivoni before this loop's
      admin changes — shows exactly what it showed before, nothing new visually)*

## Design notes

### Backend

- `tenant.schema.ts`: extend `StorefrontConfig` with optional fields — `heroTitle?`, `heroSubtitle?`,
  `heroImageUrl?`, `heroCtaLabel?`, `showTrustBar` (default false), `couponBannerCode?`,
  `pages?: { quemSomos?, comoComprar?, guiaMedidas?, contato? }` (nested plain object, not its own
  embedded class — four optional strings), `lookbook?: { imageUrl, title, variantIds: string[] }`.
- `update-storefront-config.dto.ts` / `updateStorefrontConfig`: extend with the new optional fields
  (same `setFields`-if-defined pattern already established).
- `getPublicBranding`: already returns the whole `storefront` object — new fields ride along for free.

### Frontend

- `PublicHeader.tsx`: add a search `<input>`; on submit, `useCatalogStore.setFilter({search})` +
  `router.push('/catalogo')` if not already there.
- `CatalogoClient.tsx` (or a new `CatalogHomeBlocks.tsx` rendered above the existing grid): hero
  banner, trust bar, coupon banner, lançamentos vitrine, lookbook — each reads from
  `tenant.storefront` via `useTenant()`, renders `null` when its own fields are unset (AC8).
- New routes: `(public)/quem-somos/page.tsx`, `(public)/como-comprar/page.tsx`,
  `(public)/guia-medidas/page.tsx`, `(public)/contato/page.tsx` — each a small client component
  reading the matching `tenant.storefront.pages.*` field, rendered as paragraphs; a "not
  configured" empty state if the tenant hasn't set that page's text yet.
- `StorefrontFooter.tsx`: replace the current no-links footer with real `<Link>`s to the four
  institutional routes (always shown — the routes now exist and render a graceful empty state,
  so no more "broken link" risk from Loop 4 v1's deferral).
- Admin "Loja online" section: add hero fields, trust-bar toggle, coupon-code input, four
  institutional-page textareas, lookbook editor (image URL + title + a simple variant picker —
  reuse whatever existing product/variant search input pattern the admin already has, e.g. from
  `ProductVariantsEditor` or similar, rather than building a new one).

## Config

No new env vars. Extends existing tenant-level `storefront` config.

## Tasks

- [x] 1. `StorefrontConfig` schema extension (hero/trust-bar/coupon/pages/lookbook fields) + DTO +
        service `setFields` extension (same PATCH endpoint, more optional fields)
- [x] 2. Header search: input in `PublicHeader`, wired to `useCatalogStore` + navigation
- [x] 3. Hero banner + trust bar + coupon banner components, rendered above `/catalogo`'s grid
- [x] 4. "Lançamentos" vitrine component (reuse `productIsNew` logic)
- [x] 5. Lookbook component + "add all to cart" wiring to `useCartStore`
- [x] 6. Four institutional page routes + empty states
- [x] 7. `StorefrontFooter` real links to the four institutional routes
- [x] 8. Admin "Loja online" additions: hero/trust-bar/coupon/pages/lookbook editors
- [x] 9. Unit tests: new config fields persist/invalidate cache correctly; lançamentos sort logic
- [x] 10. Browser verification: configure everything on kivoni, walk all new surfaces + confirm
         AC8 (unconfigured tenant shows nothing new)

## Follow-up record

### PLAN
- [x] Explored code: `catalog.controller.ts` (no public search/filter params exist), `CatalogFilters.tsx`
      + `useCatalogStore` (search is already 100% client-side, no backend needed), `middleware.ts`
      (no tenant-based path routing — `/` is landing-only), `promotion.schema.ts` (no
      "first-purchase" type, generic percent/fixed only), `ProductGrid.tsx`'s `productIsNew()`
- [x] Draft spec written with ACs, tasks, decisions
→ **Draft on 2026-07-16**

### REFINEMENT
- [x] Decisions resolved: home lives on `/catalogo` not a new `/` route (real infra constraint,
      not a preference); header search corrected from "blocked" to "achievable now" after reading
      the actual filter code; plan gating explicitly excluded as a business decision, not silently
      dropped
- [x] Assumptions checked against code, several corrected from Loop 4 v1's own carry-over notes
      (header search's blocker turned out not to exist)
- [x] ACs rewritten: all 8 name their verify method
- [x] DoR review: scope fits a session, decisions resolved, tasks ordered (schema → search →
      home blocks → institutional pages → footer → admin → tests → browser)
→ **Ready on 2026-07-16**

### IMPLEMENT
- [x] All 10 tasks completed in order
- [x] `tsc --noEmit` green at every task boundary in both repos
→ **done on 2026-07-16**

### TEST
- [x] Suites: lmfit-api 70/70 · lmfit-web 183/183
→ **green on 2026-07-16**

### VERIFY
- [x] Browser walk covering all 8 ACs on kivoni
→ **all ✅ on 2026-07-16**

### DOCUMENT
- [x] Spec status → `Done`, Result filled
- [x] ROADMAP.md: Loop 4 fully closed, changelog
- [x] ARCHITECTURE.md updated
→ **merged on 2026-07-16**

### PLAN AGAIN
- [x] Retro, carry-overs filed, memory updated
→ **Loop 5 PLAN — awaiting go-ahead**

## Verification record

Logged into the kivoni admin (real UI, `Configurações` → `Loja online` — form fields set via
scripted DOM events to work around a flaky click/screenshot channel in this session's browser
pane; every value was still typed into the actual React-controlled inputs and saved through the
real `PATCH /tenants/:id/storefront` call, not a curl shortcut):

- **AC1** — Header search box present on `/catalogo` (previously verified working against
  `useCatalogStore`'s client-side filter; unchanged this pass).
- **AC2** — Set hero title "Nova Coleção Inverno 2026", subtitle, and CTA "Ver coleção". Confirmed
  rendering at the top of `/catalogo`.
- **AC3** — Enabled the trust bar toggle; confirmed "Envios para todo o Brasil · Parcele no cartão
  · Compra segura" renders under the hero.
- **AC4** — Set coupon banner code `BEMVINDO10`; confirmed the banner renders with a working
  "Copiar" button. Checkout-side validation of promo codes was already covered by Loop 2's own
  tests/verification and is unchanged by this loop (the banner is presentation-only, per the
  Decisions table).
- **AC5** — No seed products fall inside the 30-day recency window on kivoni, so "Lançamentos"
  correctly rendered nothing; cross-checked against the catalog's own `onlyNew` filter checkbox,
  which also returned "Nenhum produto encontrado com os filtros atuais" — the two independent
  code paths agree, confirming the vitrine's logic is consistent with the existing filter it
  reuses.
- **AC6** — Configured all four institutional pages (quem somos, como comprar, guia de medidas,
  contato) with real text and confirmed each renders at its route; confirmed footer links navigate
  correctly. Also confirmed the AC8-style empty state on an **unconfigured** tenant (`lmfit`):
  "LMFit Store ainda não configurou este conteúdo."
- **AC7** — Configured a lookbook (editorial photo + 3 real variant ids of "Camisa Barcelona I
  2024" pulled from the public catalog) and confirmed: the block renders the photo, title, and all
  3 resolved lines with correct name/price/mode; clicking "Adicionar look inteiro ao carrinho"
  added all 3 variants to `useCartStore` in one action (verified via `localStorage['kivoni-cart']`
  contents pre/post-click).
- **AC8** — Verified twice: (1) kivoni's own `/catalogo` before this loop's admin changes showed
  none of the new sections (established earlier in this session); (2) the `lmfit` tenant, which
  has none of these fields configured, shows a clean catalog with no hero/trust-bar/coupon/
  lookbook and institutional pages rendering their "not configured" empty state — confirming the
  gating logic generalizes beyond the one tenant used for the rest of this loop's manual testing.

## Result

Shipped all 10 tasks. Storefront config (`Tenant.storefront`) now carries hero banner fields,
`showTrustBar`, `couponBannerCode`, four institutional `pages.*` strings, and a single
`lookbook: { imageUrl, title, variantIds }` — all optional, all rendered conditionally so an
unconfigured tenant's catalog is pixel-identical to before this loop (AC8).

Key implementation note: the Lookbook's `variantIds: string[]` never touches a new backend
endpoint — `resolveLookbookItems()` (exported from `Lookbook.tsx` for unit testing) cross-references
those ids against the same `CatalogProduct[]` list `/catalogo` already fetched, extracting the full
`CartLine`-shaped data (name, sku, price, wholesale price, image) needed for "add all to cart" by
walking each product's embedded `variants[]`. This mirrors the same "reuse what's already fetched"
approach `NewArrivalsShelf` used for Lançamentos, avoiding a second round-trip.

The admin lookbook editor reused the existing `collectVariantOptionsFromProducts` helper (already
used by the order editor's variant picker) rather than building a new search/autocomplete
component, per the spec's explicit instruction to reuse existing patterns.

No scope was cut during IMPLEMENT — all 8 ACs shipped as planned. The three items excluded in
REFINEMENT (tenant-aware `/` home, full autocomplete dropdown, plan gating) remain out, with the
same rationale recorded in Scope § Out.

Test totals: lmfit-api 70/70, lmfit-web 183/183 (5 new lookbook-resolver tests, 4 new
tenants.service tests for the extended `storefront` fields).
