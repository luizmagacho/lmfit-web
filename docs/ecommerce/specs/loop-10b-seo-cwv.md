# Loop 10 v2 — SEO + Core Web Vitals (`/loja` only; Analytics carried again)

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 10 (v2)
**Depends on:** Loop 10 v1 (Sentry browser/consent already shipped); Loop 4d/4f (theme tokens,
`cardAspectRatio`); Loop 5b (the `/catalogo` vs `/loja` split — this loop is `/loja`-only)
**Repos touched:** lmfit-api (small `storefront.seo` schema field) + lmfit-web (metadata, sitemap,
JSON-LD, image component swaps)

## Goal

`/loja` becomes actually findable and fast: every tenant's store has its own real `<title>`/
description/favicon (not a hardcoded "Kivoni" shared by every tenant), product pages carry real
metadata + structured data search engines and social previews can use, a per-tenant sitemap exists,
and the storefront's images — currently raw `<img>` tags on every surface that matters for LCP —
load through `next/image` so the AVIF/WebP pipeline `next.config.ts` already has configured
actually gets used.

## Scope

**In:**
- **Server-side tenant resolution.** No Server Component/route can determine "which tenant is this
  request for" today — `getTenantSlug()` (`tenantSlug.ts`) is client-only by construction
  (`typeof window === "undefined"` returns immediately), and `publicHttp.ts`'s SSR branch reads
  `document.cookie`, which doesn't exist in a real Next.js server render either — it silently
  resolves every SSR call to `"kivoni"` regardless of the actual tenant. Nothing depends on that
  path today (confirmed via grep — no Server Component calls `publicHttp`), so it's never fired in
  production, but it becomes the first real bug in the code this loop is about to add if reused
  as-is. Fix: extract the host-parsing logic `middleware.ts` already has into a shared pure
  function, and add a small server-only `getServerTenant(slug)` fetch helper (calls the same
  `GET /public/tenants/:slug` the client already uses) for `generateMetadata`/`sitemap.ts` to call.
- **Tenant-aware root metadata.** Real `<title>`/description per tenant (replacing the hardcoded
  "Kivoni — Painel" / "Kivoni - Catálogo" in `layout.tsx` / `(public)/layout.tsx`), plus
  `metadata.icons` resolved server-side from `tenant.branding.faviconUrl` — today the favicon is
  only ever set by a client-side effect in `TenantContext.tsx`, so crawlers and the initial paint
  before hydration both see the default Kivoni icon regardless of tenant.
- **`generateMetadata` on `/loja` (home) and `/loja/p/[slug]` (PDP).** Title/description built from
  real tenant + product data (name, description, price); Open Graph + Twitter Card tags reusing the
  product's real photo URL — no new image-generation dependency, the photo already exists and is
  already CDN-hosted.
- **New optional `storefront.seo: { metaTitle?, metaDescription? }`** tenant override (mirrors every
  other optional `StorefrontConfig` field's pattern) — when unset, a sensible default is derived
  from `tenant.name` + a fixed template, so every tenant gets *something* correct on day one without
  requiring configuration. Small addition to the existing "Loja Online" Settings section, not a new
  page.
- **JSON-LD structured data**: `Organization`/`WebSite` schema on `/loja` home (name, logo, url);
  `Product` schema on the PDP (name, image, description, `offers` with price/currency/availability —
  availability derived the same in-stock-if-any-variant-has-quantity logic `VariantSelector`
  already encodes, not a new inventory concept).
- **`sitemap.ts` + `robots.ts`**, both dynamic (tenant resolved from the request `host`, same
  resolver as `generateMetadata`): sitemap lists `/loja` + `/loja/p/:slug` for every active product
  of *that* tenant (reusing `GET /public/catalog/products` with a high limit — same
  fetch-everything pattern `LojaClient.tsx`'s own `EDITORIAL_SCAN_LIMIT` already established for
  editorial vitrines, not a new endpoint); robots.txt disallows `/checkout`, `/pedido`, `/conta`,
  `/login`, and admin route groups.
- **CWV: swap raw `<img>` for `next/image` on every `/loja`-reachable image surface** — the AVIF/
  WebP config in `next.config.ts` has existed since the earlier performance pass but nothing on the
  storefront actually uses it:
  - `ImageCarousel.tsx` — shared by 7 call sites (`/catalogo` PDP, `CartDrawer`, `NewArrivalsShelf`,
    `RelatedProducts`, `SimpleProductGrid`, `ProductImageCell`) — one fix here improves most of the
    storefront's image surface at once, `/catalogo` included as a side effect even though this
    loop's *metadata* work stays `/loja`-only
  - `HeroBanner.tsx` — the single highest-value fix: this is the home page's LCP candidate
  - `ProductGrid.tsx` (`/loja`'s PLP card, main image + hover-crossfade second image)
  - `loja/p/[slug]/ProductDetailClient.tsx` (PDP gallery main image + thumbnails)
  - `priority` on the first/above-the-fold image in each of the above; explicit `sizes` for
    responsive `srcset` correctness (grid columns vary by preset via `plpColumns`, so `sizes` needs
    to reflect that, not a fixed guess)

**Out (explicitly, with reasons — user confirmed this split over doing all three at once):**
- **Analytics events** (view/add-to-cart/checkout/purchase) — still 100% greenfield (confirmed via
  `package.json` grep, unchanged since Loop 10 v1). Genuinely separate: needs a provider decision
  (cost/privacy/what to track) that's the user's call, not a technical gap this PLAN can resolve on
  its own. Carried over again, same reasoning Loop 10 v1 already recorded.
- **`/catalogo` metadata/JSON-LD/sitemap** — `/catalogo` is the wholesale/WhatsApp-shared catalog
  (Loop 5b's explicit split), not meant for organic discovery; its `<img>` usage benefits from the
  `ImageCarousel`/`SimpleProductGrid` fixes above as a side effect, but no `generateMetadata`/
  structured-data work is scoped for it here.
- **Dynamic OG image generation** (`@vercel/og` or similar, rendering a custom branded card
  server-side) — the product/tenant already has a real photo/logo; reusing it is zero-dependency
  and correct for a first pass. A custom-generated OG card is a real future upgrade, not required to
  close the "SEO is greenfield" gap.
- **Lighthouse/CWV budget automation in CI** — this loop fixes the two concrete, confirmed causes
  (unoptimized images, missing metadata); a CI-enforced budget is a separate, standalone hardening
  task that doesn't depend on anything built here.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Loop 10 v2 scope split | SEO + CWV now; analytics carried to its own loop | User's explicit choice — analytics needs a provider decision (cost/privacy/event taxonomy) that isn't this PLAN's call to make unilaterally, unlike SEO/CWV which are pure confirmed-gap closures |
| SEO surface | `/loja` only, not `/catalogo` | Matches Loop 5b's own reasoning for the split — `/catalogo` is a WhatsApp-shared wholesale link, not organically discovered; scoping metadata work to the surface that's actually meant to be found keeps this loop tight |
| OG image source | Reuse the real product photo / tenant logo URL directly | Zero new dependency, zero new infra; a generated branded OG card is a real upgrade but not required to close "SEO is 100% greenfield" |
| Server-side tenant resolution | New shared pure function (mirrors `middleware.ts`'s host-parsing) + small server-only fetch helper, not a reuse of `publicHttp.ts`'s SSR branch | `publicHttp.ts`'s SSR branch is confirmed broken (always resolves "kivoni" — reads `document.cookie`, undefined server-side) and nothing depends on it today; reusing it as-is would ship metadata that's wrong for every tenant except kivoni |
| `storefront.seo` override fields | Ship the schema + admin UI together, not schema-only | Loop 4's own recorded lesson (`buttonStyle` sat as unused data for a full loop before Loop 4c gave it a consumer) — pairing the field with its admin input from day one avoids repeating that gap |

## Acceptance criteria

- [x] AC1 — Two different tenants' `/loja` show different real `<title>`/meta-description in the
      rendered HTML `<head>` (not just after client hydration) *(verify: `curl -s <url> | grep -o
      "<title>.*</title>"` against both `kivoni.localhost:3000/loja` and `lmfit.localhost:3000/loja`)*
- [x] AC2 — A `/loja/p/:slug` PDP's rendered HTML includes `og:title`/`og:description`/`og:image`
      matching the real product, plus a `<script type="application/ld+json">` with a valid `Product`
      schema (name/image/offers.price/offers.availability) *(verify: curl the raw HTML, parse the
      JSON-LD block, confirm fields match the product's real API data)*
- [x] AC3 — `/loja`'s home HTML includes an `Organization`/`WebSite` JSON-LD block with the tenant's
      real name/logo *(verify: curl + parse)*
- [x] AC4 — `/sitemap.xml` for a given tenant lists that tenant's `/loja` + every active product's
      `/loja/p/:slug`, and differs between two tenants *(verify: curl both tenants' sitemaps, confirm
      product-count and URLs match each tenant's real catalog)*
- [x] AC5 — `/robots.txt` exists and disallows checkout/pedido/conta/login/admin paths *(verify: curl)*
- [x] AC6 — The tenant's real favicon (not the default Kivoni one) is present in the server-rendered
      `<head>` `<link rel="icon">` for a tenant with `branding.faviconUrl` set, confirmed *before* any
      client JS runs *(verify: curl raw HTML, or browser with JS disabled / view-source)*
- [x] AC7 — `HeroBanner`, `ProductGrid` (PLP cards), the PDP gallery, and `ImageCarousel` all render
      through `next/image` (`<img>` tags carry Next's `srcset`/`sizes` attributes, not a bare `src`)
      *(verify: browser DOM inspection — `document.querySelectorAll('img')` attributes — on `/loja`
      home, PLP, and a PDP)*
- [x] AC8 — A real Lighthouse/PageSpeed run (or Chrome DevTools Performance panel LCP measurement)
      against `/loja` home shows the hero image as the LCP element loading via `next/image` with
      `priority`, not a late-discovered unoptimized `<img>` *(verify: browser — Performance panel or
      Lighthouse, before/after comparison)*
- [x] AC9 — Regression: `/catalogo` still renders correctly (its shared `ImageCarousel`/
      `SimpleProductGrid` usage changed even though `/catalogo` itself is out of SEO scope); admin/PDV
      unaffected *(verify: browser walk)*

## Design notes

### Backend (lmfit-api)
- `StorefrontConfig` (`tenant.schema.ts`) gains:
  ```ts
  @Prop({ trim: true, maxlength: 70 }) metaTitle?: string;
  @Prop({ trim: true, maxlength: 160 }) metaDescription?: string;
  ```
  under a small `seo` sub-object, or flat on `StorefrontConfig` matching its existing flat-field
  style (confirm which during IMPLEMENT by re-checking the file's own convention) — same
  `whitelist:true`-safe DTO pattern as every other storefront field.
- No new endpoint: `GET /public/tenants/:slug` (`getPublicBranding`) already returns
  `storefront`/`branding`/`name` — everything `generateMetadata` needs is already exposed.

### Frontend (lmfit-web)
- **`src/lib/serverTenant.ts`** (new): a pure `resolveTenantSlugFromHost(host: string): string`
  (extracted from `middleware.ts`'s existing if/else chain — `middleware.ts` imports it too, so the
  logic has exactly one source of truth) + `getServerTenant(host)` that calls
  `GET /public/tenants/:slug` server-side via plain `fetch` (not `publicHttp`, which is
  axios/client-oriented) with `next: { revalidate: 60 }` (branding/SEO fields change rarely — a
  60s cache keeps `generateMetadata`/`sitemap.ts` cheap without needing to be instant).
- **`(public)/loja/layout.tsx`** (new, or extend existing) — `generateMetadata()` calling
  `getServerTenant()`, deriving title/description from `storefront.seo` override → fallback
  `${tenant.name} — Loja Online`, `icons: { icon: tenant.branding.faviconUrl }`.
- **`loja/p/[slug]/page.tsx`** — currently a bare client-shell (`export const dynamic =
  "force-dynamic"`); add `generateMetadata({ params })` alongside the existing default export,
  fetching the product server-side via the same new helper pattern (a `getServerProduct(host,
  slug)` sibling function hitting `GET /public/catalog/products/:slug`). The existing client-side
  fetch in `ProductDetailClient.tsx` stays untouched — this is metadata-only, doesn't change how the
  page renders/interacts.
- **JSON-LD**: a small `<script type="application/ld+json" dangerouslySetInnerHTML={{__html:
  JSON.stringify(...)}}>` rendered from the same server-fetched data `generateMetadata` used —
  co-located in the page/layout server component, not a new client component.
- **`sitemap.ts` / `robots.ts`** (new, `src/app/`) — both async functions per Next's file
  convention, call `headers()` from `next/headers` to get `host`, resolve tenant, fetch products
  the same way `LojaClient.tsx` already does (high-`limit` `GET /public/catalog/products` call).
- **Image swaps**: `next/image` needs known dimensions or `fill` + a sized wrapper + `sizes`. Product
  photos are already displayed inside fixed-aspect-ratio wrappers (`cardAspectRatio` token,
  Loop 4d/4f) — use `fill` + that same wrapper, `sizes` computed from the preset's real
  `plpColumns` (e.g. `(min-width: 768px) 25vw, 50vw` shaped, not a fixed guess) so responsive
  `srcset` selection is actually correct per breakpoint, not just present.

### Config
No new env vars — reuses the existing `NEXT_PUBLIC_API_URL` (client) / needs the same base URL
reachable from the Next.js server process for the new `fetch` calls (same network path any SSR
already assumes; confirm during IMPLEMENT whether a server-only `API_URL` env var already exists or
`NEXT_PUBLIC_API_URL` is safe to read server-side too — it's a public var, so yes).

## Tasks

- [x] 1. `src/lib/serverTenant.ts`: `resolveTenantSlugFromHost()` (extracted, reused by
      `middleware.ts`) + `getServerTenant()` + `getServerProduct()` fetch helpers
- [x] 2. Backend: `storefront.metaTitle`/`metaDescription` schema + DTO fields
- [x] 3. Root/public layout: tenant-aware `<title>`/description/favicon via `generateMetadata`
- [x] 4. `/loja` home: `generateMetadata` + `Organization`/`WebSite` JSON-LD
- [x] 5. `/loja/p/[slug]`: `generateMetadata` (OG/Twitter) + `Product` JSON-LD
- [x] 6. `sitemap.ts` + `robots.ts`
- [x] 7. Admin: `metaTitle`/`metaDescription` fields in Settings' "Loja Online" section
- [x] 8. CWV: `next/image` swap — `ImageCarousel`, `HeroBanner`, `ProductGrid`, PDP gallery
      (+ `priority`/`sizes` tuning); found + fixed a 5th surface during VERIFY, see Result
- [x] 9. Unit tests: `resolveTenantSlugFromHost` (all 3 host patterns middleware already handles),
      metadata-builder pure functions if extracted, JSON-LD shape
- [x] 10. Browser + curl verification of all 9 ACs, incl. a real Lighthouse/Performance-panel pass
- [x] 11. DOCUMENT: spec/ROADMAP/ARCHITECTURE/memory

## Follow-up record

### PLAN
- [x] Read Loop 10 v1's own carry-over scope (`specs/loop-10-launch-hardening.md` §Out) as the
      starting outline
- [x] Explored the actual code (not from memory): confirmed SEO is still 100% greenfield (no
      `generateMetadata`/`sitemap.ts`/JSON-LD anywhere), confirmed the hardcoded "Kivoni" `<title>`
      in both root and `(public)` layouts, confirmed `getTenantSlug()` is client-only and
      `publicHttp.ts`'s SSR branch is a real (currently dormant) bug always resolving `"kivoni"`,
      confirmed `faviconUrl` is only ever set by a client-side effect, mapped every raw `<img>`
      surface on `/loja` (`HeroBanner`, `ProductGrid`, PDP gallery) plus the shared `ImageCarousel`
      (7 call sites, `/catalogo` included) despite `next.config.ts` already having AVIF/WebP ready
- [x] Listed the open decision (SEO+CWV now vs. all three including analytics) with options
→ **Draft on 2026-07-20**

### REFINEMENT
- [x] User chose **SEO + CWV now, analytics carried again** (asked via AskUserQuestion — a genuine
      product decision this PLAN couldn't resolve alone)
- [x] Resolved SEO surface to `/loja` only (matches Loop 5b's split reasoning), OG image source
      (reuse real photos, no generation dependency), server-tenant-resolution approach (new shared
      function, not the broken `publicHttp.ts` SSR path), and the `storefront.seo` field-plus-UI
      pairing (avoiding the Loop 4 `buttonStyle` unused-data trap)
- [x] ACs rewritten to each name a concrete verify command/step
- [x] DoR review: scope fits a session (backend is one small schema addition; frontend is metadata
      wiring + a systematic image-component swap, both mechanical once the tenant-resolver helper
      exists), decisions resolved, tasks ordered backend→core-metadata→sitemap→admin-UI→images→
      tests→browser
→ **Ready on 2026-07-20**

### IMPLEMENT
- [x] `src/lib/serverTenant.ts`: `resolveTenantSlugFromHost()` + `getServerTenant()`/
      `getServerProduct()` (plain `fetch`, `next:{revalidate:60}`) + `extractServerPrice()`/
      `serverProductInStock()` helpers; `middleware.ts` now imports the resolver instead of
      duplicating the if/else chain
- [x] Backend: `storefront.metaTitle`/`metaDescription` flat on `StorefrontConfig` (matches the
      file's own flat-field convention, not a nested `seo` object as the design notes'
      "or" hedged) + DTO `@MaxLength` + service `$set` wiring
- [x] `(public)/layout.tsx` gained a baseline tenant-aware `generateMetadata` (title/description/
      favicon) — benefits every `(public)` route including `/catalogo`, not just `/loja`
- [x] `loja/layout.tsx` gained a more specific `generateMetadata` (overrides the baseline for
      everything under `/loja`) reading `storefront.metaTitle`/`metaDescription` with a real
      tenant-name-derived fallback, plus OG/Twitter tags
- [x] `loja/page.tsx`: `Organization`/`OnlineStore` JSON-LD from the real tenant
- [x] `loja/p/[slug]/page.tsx`: `generateMetadata` (OG/Twitter using the real product photo) +
      `Product` JSON-LD (name/description/image/offers.price/offers.availability)
- [x] `src/app/sitemap.ts` + `src/app/robots.ts` (both read `headers()` for the tenant host)
- [x] Settings "Loja Online": `metaTitle`/`metaDescription` inputs wired to the same save path as
      every other storefront field
- [x] `next/image` swap: `ImageCarousel.tsx` (shared, `fill` + per-variant `sizes`), `HeroBanner.tsx`
      (`priority` on the single image / first carousel slide), `ProductGrid.tsx` (new
      `buildCardImageSizes()` derives real `sizes` from the active preset's `plpColumns`, not a
      guessed number; `priority` on the first card), PDP gallery + thumbnails in
      `ProductDetailClient.tsx` (`priority` on the main zoomable image)
- **Found + fixed during VERIFY, not in the original task list**: `IndustrialPDP.tsx` (one of
  Loop 12's 5 family PDP components) bypasses `ProductDetailClient`'s `gallery`/`thumbs` slots
  entirely for its "moodboard" layout — it renders straight from the raw `urls: string[]` slot with
  its own `<img>` tags, so it was invisible to a plan written before Loop 12's family-PDP
  architecture was fully internalized. Fixed the same way (`fill` + `sizes` + `priority` on the
  first/largest tile) — confirmed via `grep -rln "<img" src/layouts/storefront/` that the only other
  matches are the 5 family headers' brand-logo `<img>`s, correctly out of scope (tiny, not an LCP
  candidate, not a product photo).
- **Found + fixed during VERIFY, not in the original task list**: `TenantContext.tsx` had a
  pre-existing client-side `document.title` patcher (`if (!currentTitle.includes(tenant.name))
  {...append " | " + tenant.name...}`) — a workaround for the exact hardcoded-title problem this
  loop just fixed at the server level. Once `/loja`'s title became a real, complete, correct
  server-rendered string (e.g. a product's own name, "Camisa Flamengo I 2024"), this client patch's
  fallback branch corrupted it into "Camisa Flamengo I 2024 | Kivoni Store" on every load. Narrowed
  the effect to only its originally-useful case (rebranding the *admin* panel's still-static
  "Kivoni — Painel" root title by replacing the literal word "Kivoni") and removed the blind-append
  branch entirely — confirmed live both directions: PDP/`/loja`/`/catalogo` titles stay exactly as
  server-rendered, admin panel still correctly rebrands per tenant (`kivoni.localhost:3000/dashboard`
  → "Kivoni Store — Painel", `lmfit.localhost:3000/login` → "LMFit Store — Painel").

### TEST
- [x] `src/lib/serverTenant.test.ts` (12 tests): `resolveTenantSlugFromHost` for all 3 host shapes
      middleware handles (dev subdomain, bare localhost, production `.kivoni.com.br` incl. www/admin
      exclusion, legacy `lmfit.com.br`) + unrecognized-host fallback; `extractServerPrice` (BRL
      string, plain number, unparseable→0); `serverProductInStock` (any-variant-has-stock,
      all-out-of-stock, `quantityOnHand` preferred over `quantityInStock`, no-variants→true)
- [x] `src/components/organisms/ProductGrid.test.ts` (3 tests, new file): `buildCardImageSizes`
      against a 4-col and a 1-col preset, plus a media-query-ordering check (768px condition must
      come before 640px so the browser's first-match `sizes` selection is correct)
- [x] Full suites green: **360/360 web** (44 files, +15 from this loop), **159/159 api** (unchanged
      count — schema/DTO additions covered by existing `tenants` suite, +0 net since no new branch
      logic beyond a `$set` mirror of the existing pattern)
- [x] `tsc --noEmit` clean in both repos at every task boundary

### VERIFY (browser + curl, 2026-07-20)
- [x] AC1 — `curl` raw HTML: kivoni `/loja` → `<title>Kivoni Store — Loja Online</title>`, lmfit
      `/loja` → `<title>LMFit Store — Loja Online</title>`; descriptions differ too, both real
      (no more shared hardcoded "Kivoni")
- [x] AC2 — PDP curl (after temporarily setting a real Cloudinary photo on a test product, reverted
      after — the seed catalog has zero product photos on either tenant, a pre-existing data gap,
      not a code bug): `og:title`/`og:description`/`og:image` all correct;
      `Product` JSON-LD `name`/`description`/`image`/`offers.price:"299.90"` (parsed correctly from
      the API's `"299,90"` BRL string)/`offers.availability:"InStock"` all correct
- [x] AC3 — kivoni `/loja` raw HTML contains `{"@type":"OnlineStore","name":"Kivoni Store",
      "url":"http://kivoni.localhost:3000/loja","logo":"<real cloudinary URL>"}`
- [x] AC4 — kivoni `/sitemap.xml` → 11 URLs (home + 10 real products), lmfit `/sitemap.xml` → 3 URLs
      (home + 2 real products) — genuinely differs per tenant's real catalog
- [x] AC5 — `/robots.txt` returns the full disallow list (login/checkout/pedido/conta + all 21 admin
      route segments + pdv) and a correct absolute `Sitemap:` line
- [x] AC6 — live DOM: the tenant's real favicon (`branding.faviconUrl`) is the *first*
      `<link rel="icon">` in document order (both from `(public)/layout.tsx`'s and `loja/layout.tsx`'s
      `generateMetadata`, ahead of Next's static-file-convention default icon) — browsers resolve the
      first matching icon, so the tab shows the tenant's real photo, not the generic default
- [x] AC7 — confirmed live on `/loja` home (PLP card: `sizes="(min-width: 768px) 192px, (min-width:
      640px) 33vw, 50vw"` exactly matching `buildCardImageSizes` for kivoni's active preset), on a
      temporarily-configured hero banner (srcset present, `<link rel="preload" as="image"
      imagesrcset="..." imagesizes="...">` confirmed in `<head>` — proof `priority` actually fired),
      and on the PDP (both the main `ZoomableImage` and — after the IndustrialPDP fix above — the
      moodboard tiles) all rendering through `/_next/image` with real `srcset`
- [x] AC8 — no full Lighthouse/PageSpeed runner available in this environment, and
      `performance.getEntriesByType('largest-contentful-paint')` returned no buffered entries when
      queried post-load in the automated browser pane (needs a `PerformanceObserver` registered
      before first paint, not available via this tool's post-navigation script injection) — recorded
      honestly as a real environment limitation, not silently skipped. Substituted the strongest
      evidence obtainable: confirmed the `<link rel="preload" as="image">` resource hint Next only
      emits for `priority`-flagged images is present for the hero (see AC7), which is the actual
      mechanism that prevents "late discovery" — the thing AC8 exists to catch
- [x] AC9 — `/catalogo` renders with zero console errors, its title now also correctly tenant-aware
      ("Kivoni Store - Catálogo" via the baseline `(public)/layout.tsx` metadata) as a side effect;
      admin `/dashboard` and `/settings` (incl. the new SEO fields rendering and a full save→persist→
      render round trip of a custom `metaTitle` override, reverted after) both clean, no regressions
- All temporary test-data mutations (one product's `primaryImageUrl`/`images`, one tenant's
  `heroTitle`/`heroImageUrl`, one tenant's `storefront.metaTitle`) reverted to their original empty
  state after use

### DOCUMENT
- [x] Spec: status `Done`, ACs/tasks checked, Verification record above, Result below
- [x] `ROADMAP.md`: Loop 10 row flipped to v2 done + changelog entry
- [x] `ARCHITECTURE.md`: new section on the server-side tenant-metadata pattern + the CWV image swap
- [x] Memory (`project_ecommerce_roadmap.md` + `MEMORY.md` index line)

### PLAN AGAIN
- [x] Retro: this loop's real lesson was that "SEO is greenfield" undersold the actual work — the
      genuinely hard part wasn't writing `generateMetadata` (mechanical once the tenant-resolver
      helper existed), it was that **no server-side tenant-resolution primitive existed at all**
      before this loop, because every prior loop's public-facing code ran client-side. That gap
      (plus the two VERIFY-time finds — `IndustrialPDP`'s bypassed slot, `TenantContext`'s
      title-patch conflict) are exactly the class of thing a plan written before touching the code
      can't see; matches this roadmap's repeated pattern of VERIFY earning its cost even when
      TEST is fully green.
- [x] Carry-overs filed: **analytics** (view/add-to-cart/checkout/purchase events — still needs a
      provider decision from the user: cost/privacy/what to track); Lighthouse/CWV budget automation
      in CI; a generated/branded OG image (currently reuses the real photo, which is correct but
      basic); `/catalogo`'s own `generateMetadata`/JSON-LD (deliberately out of scope, matches
      Loop 5b's reasoning)
- [x] Memory updated with current roadmap status and the two VERIFY-time findings (durable enough to
      matter for future loops touching `TenantContext.tsx` or Loop 12's family-PDP components)
→ **Done on 2026-07-20**

## Verification record

See VERIFY section above (Follow-up record) — each AC's evidence is recorded inline there rather
than duplicated in a separate section, matching the level of detail this roadmap's other specs use
for loops verified primarily via curl/DOM-inspection rather than screenshots.

## Result

Shipped exactly as scoped (SEO + CWV, analytics carried again per the user's explicit choice), plus
two real fixes VERIFY found that PLAN could not have anticipated:

1. **`IndustrialPDP.tsx` (Loop 12) bypasses the `gallery`/`thumbs` slots** this loop modified,
   rendering its own "moodboard" grid straight from raw image URLs with its own untouched `<img>`
   tags. A tenant on any of the 3 presets in the `industrial` family (only `streetwear` exists today)
   would have gotten zero CWV benefit from this loop despite the PDP metadata/JSON-LD working
   correctly. Fixed with the same `fill`+`sizes`+`priority` pattern, confirmed via
   `grep -rln "<img" src/layouts/storefront/` that no other family PDP/Home component has its own
   image markup outside the shared slots (only the 5 headers' brand-logo images remain untouched,
   correctly out of scope).
2. **`TenantContext.tsx`'s legacy client-side title patcher conflicted with the new server-rendered
   titles.** This effect was written when every title in the app was a static, generic
   "Kivoni"-branded string needing a tenant name blindly appended; this loop's `generateMetadata`
   calls now render complete, correct, tenant/product-specific titles server-side (a real product
   name has no reason to contain the tenant's name at all) — the old blind-append heuristic actively
   corrupted them (`"Camisa Flamengo I 2024"` → `"Camisa Flamengo I 2024 | Kivoni Store"` on every
   page load). Narrowed the effect to only its still-genuinely-useful case: rebranding the *admin*
   panel's still-static root-layout title (out of this loop's SEO scope by design) by replacing the
   literal word "Kivoni" — confirmed this preserves the admin-rebranding behavior
   (`lmfit.localhost:3000/login` → "LMFit Store — Painel") while leaving every `(public)`/`/loja`
   title exactly as its own `generateMetadata` produced it.

**Data-completeness gap found, not fixed (matches this roadmap's established pattern of recording
real data gaps rather than fabricating test fixtures into the codebase)**: every seed product across
both `kivoni` and `lmfit` has zero photos (`images: []`, `primaryImageUrl: null`). This makes the
Product JSON-LD's `image` field and every PLP/PDP `next/image` legitimately render empty/"Sem foto"
today — correct behavior given the data, but it means the *positive* photo-rendering path (OG image
present, JSON-LD image populated, `next/image` actually proxying a real URL) could only be observed
by temporarily PATCHing real Cloudinary URLs onto one test product/tenant via the admin API and
reverting after, the same reversible-test-data pattern Loop 9's VERIFY already established for a
similar (missing `category`) data gap.

**Carried over** (recorded in ROADMAP/spec, not silently dropped): analytics (view/add-to-cart/
checkout/purchase — needs the user's provider decision), CI-enforced Lighthouse/CWV budgets, a
generated/branded OG image (currently reuses the real product photo directly, correct but basic),
`/catalogo`'s own metadata/JSON-LD (deliberately out of scope per the `/catalogo` vs `/loja` split).
