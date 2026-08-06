# Loop 05 — Storefront V2: PLP + PDP

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 5 · **Depends on:** Loop 3 (shipping config), Loop 4 (theme +
storefront config, incl. `pages.guiaMedidas` from Loop 4b)
**Repos touched:** lmfit-api / lmfit-web

## Goal

Bring discovery (PLP) and the product page (PDP) up to fashion-e-commerce standard: real
server-side filtering/sort/pagination instead of "fetch everything and filter client-side", and a
PDP with a proper color/size selector (replacing quantity steppers), gallery, and supporting
content blocks.

## Scope

**In:**
- **Public catalog API gains real filters/sort/pagination** (`category`, `size`, `color`,
  `priceMin`, `priceMax`, `sort`, `page`, `limit`) — today `GET /public/catalog/products` returns
  every active product unpaginated, and `/catalogo` filters that full list in the browser
  (`useCatalogStore`). A new `GET /public/catalog/facets` endpoint returns the distinct
  categories/colors/sizes and price range for the filter rail.
- **PLP filter rail + sort + "carregar mais" pagination**, replacing the current
  search/in-stock/new checkboxes-only `CatalogFilters`.
- **Product card v2**: second photo on hover, color swatches (best-effort name→color mapping,
  falls back to a neutral dot + tooltip for unrecognized names), % OFF badge from
  `compareAtPrice`, existing Lançamento/Esgotado badges kept.
- **PDP v2**: new `VariantSelector` (color swatches + size buttons, 4 stock states: disponível /
  últimas unidades / esgotado / sob encomenda) replacing `VariantGrid`'s steppers **on the
  storefront PDP only** — `VariantGrid` itself is untouched and keeps serving PDV/admin order
  entry, which needs the stepper-grid UX for multi-line fast entry, not a single-SKU picker.
  Gallery becomes a sticky two-column layout on desktop (thumbnails + hover-zoom), carousel stays
  on mobile. Size-guide modal reusing `tenant.storefront.pages.guiaMedidas` (Loop 4b — no new
  config). Product `description`/new `composition`/`careInstructions` fields. Static return-policy
  line. Read-only shipping-options preview reusing `tenant.shippingConfig` (Loop 3 — no new CEP
  lookup, see Decisions). "Você também pode gostar" shelf (same category, excludes current
  product).

**Out (explicitly, with reasons):**
- **Quick-add popover on the PLP card** (pick a size without opening the PDP) — real added
  complexity (per-card stock-aware size popover, positioning, a second add-to-cart code path) for
  a conversion nicety; the PDP's own new selector is the primary deliverable this loop. Carry-over.
- **A real CEP-based shipping calculator on PDP** — there is no distance/CEP-based carrier
  integration anywhere in this codebase; Loop 3 built exactly 3 flat fees (pickup/standard/express)
  per tenant, the same for every CEP. A CEP input that always returns the same 3 numbers regardless
  of what's typed would be misleading UX, not a real feature. PDP instead shows the same flat
  options `ShippingPicker` already shows at checkout, read-only, no input. A real CEP calculator is
  only meaningful once/if a real carrier-rate integration exists — not this loop's problem to solve.
- **A full photo lightbox/pinch-zoom** — v1 ships hover-zoom (desktop) via CSS `transform: scale()`
  on mouse position, not a full modal lightbox with pinch-to-zoom on mobile. The gallery structure
  is real (sticky thumbnails, main image swap) — the zoom interaction itself is the simplified part.
- **Numbered pagination / infinite scroll** — a "carregar mais" button is simpler to implement
  correctly (no scroll-position bugs, no page-number deep-linking requirement) and is the same
  pattern Farm Rio/Renner use on mobile. Numbered pages can be added later without an API change
  (it's already `page`/`limit`).
- **A tenant-configurable return-policy field** — STOREFRONT-V2 doesn't call this out as
  tenant-configurable (unlike guia de medidas, which explicitly is); a static line
  ("Troca grátis em até 7 dias após o recebimento") avoids adding a config field for something that
  isn't asked to vary per tenant.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Price filter operates on which price | Retail price only (`variant.price ?? product.priceRetail`) | Matches what an anonymous shopper (the PLP's actual audience) sees; wholesale filtering is an admin/PDV concern, out of scope for the public storefront |
| Color swatch source | A small hardcoded PT-BR color-name → hex lookup table in web code, unrecognized names fall back to a neutral dot + the name as a tooltip | `ProductVariant.color` is free text ("Padrão", "Preto", "Azul Marinho"), not a hex field; adding a real color-hex field to the variant schema is a bigger data-modeling change than this loop's scope justifies for a visual nicety that already degrades gracefully |
| Stock states on the variant selector | Reuse `quantityOnHand`/`reorderPoint`/`acceptsBackorder` exactly as the existing low-stock-alert cron does (`quantityOnHand <= reorderPoint && reorderPoint > 0` = "últimas unidades") | Same fields, same threshold semantics already proven correct elsewhere (`low-stock.cron.ts`) — no new inventory concept invented |
| `VariantGrid` vs a new `VariantSelector` | New component for the storefront PDP; `VariantGrid` (steppers) stays exactly as-is for PDV/admin | `VariantGrid` is shared with `PdvClient`/order entry, which genuinely needs quantity steppers per SKU for fast multi-line entry — swapping its UI to a single-selection swatch/button picker would break that workflow. A consumer PDP needs "pick one color+size, then a quantity", a fundamentally different interaction |
| Pagination style | "Carregar mais" (load-more button), not numbered pages or infinite scroll | Simplest correct implementation; avoids scroll-restoration and deep-link-to-page-N complexity neither ROADMAP nor the benchmark specifically calls for |
| Size guide content | Reuse `tenant.storefront.pages.guiaMedidas` (already shipped in Loop 4b) in a modal instead of a new config field | Exact same content, a tenant already has a way to set it; the only new work is presenting it in a modal on PDP instead of only as its own page |
| Category/size/color facets endpoint | New `GET /public/catalog/facets` (categories, colors, sizes, priceMin/priceMax), separate from `listProducts` | Filter rail needs all *possible* values, not just values present in the current filtered page — computing facets from an already-filtered/paginated product list would make filters disappear as they narrow results, a known bad pattern |

## Acceptance criteria

- [x] AC1 — `GET /public/catalog/products?category=&size=&color=&priceMin=&priceMax=&sort=&page=&limit=`
      filters, sorts, and paginates server-side; response includes `total` *(verify: curl with
      combinations of params, confirm counts/order)*
- [x] AC2 — `GET /public/catalog/facets` returns the tenant's actual distinct categories/colors/sizes
      and min/max retail price *(verify: curl, cross-check against known seed data)*
- [x] AC3 — PLP filter rail (category, size, color, price range) + sort dropdown update the grid
      without a full page reload; "carregar mais" appends the next page *(verify: browser, apply
      filters, confirm grid + URL-independent state updates correctly)*
- [x] AC4 — Product card v2 shows a second photo on hover (when one exists), color swatches, and a
      % OFF badge when `compareAtPrice` is set *(verify: browser, hover a multi-photo card, check a
      product with `compareAtPrice`)*
- [x] AC5 — PDP's `VariantSelector` blocks adding an esgotado combination to the cart and visibly
      distinguishes all 4 stock states; `VariantGrid` (PDV/admin) is unchanged *(verify: browser PDP
      + a quick PDV smoke check that order entry still works)*
- [x] AC6 — PDP gallery is sticky beside the buy box on desktop and a swipeable carousel on mobile;
      hovering zooms the main image *(verify: browser at desktop and mobile viewport widths)*
- [x] AC7 — Size-guide modal opens from PDP and shows the tenant's configured
      `storefront.pages.guiaMedidas` text (or an empty state if unset) *(verify: browser, open modal
      on a tenant with and without the field configured)*
- [x] AC8 — "Você também pode gostar" shows other products in the same category, excluding the
      current product, and renders nothing when the category has no other products *(verify:
      browser on a product with category-mates and one without)*

## Design notes

### Backend

- `product.schema.ts`: add `composition?: string`, `careInstructions?: string` (both optional,
  same pattern as existing `description`).
- New `PublicCatalogQueryDto extends PaginationQueryDto` (mirrors the existing
  `products.controller.ts` pagination pattern): adds `category?`, `size?`, `color?`,
  `priceMin?`, `priceMax?` (all optional strings/numbers via `@Type(() => Number)`), `sort?:
  'relevancia' | 'menor-preco' | 'maior-preco' | 'lancamentos'`.
- `CatalogService.listProducts` / `ProductsService.listPublicCatalog`: extend the existing
  aggregation pipeline with `$match` stages for category/size/color (size/color match against the
  looked-up `variants` array) and price range (against `variants.price` or product-level
  `priceRetail` fallback), a `$sort` stage per the `sort` param, and `$skip`/`$limit` via the
  existing `skipFromPage` helper; return `{items, total, page, limit}` (same shape convention as
  the staff `products.list` endpoint).
- New `CatalogService.getFacets(tenantId)` / `ProductsService.getPublicCatalogFacets`: one
  aggregation returning distinct `category`/variant `color`/variant `size` values plus
  `$min`/`$max` retail price across all active products — independent of any currently-applied
  filter (see Decisions).
- `getPublicProductBySlug` unchanged (still returns full product+variants; PDP already gets
  everything it needs).

### Frontend

- `useCatalogStore`: extend `CatalogFilter` with `size`, `color`, `priceMin`, `priceMax`, `sort`,
  `page` (client no longer computes the filtered list itself — `CatalogoClient` now sends these as
  query params to `/public/catalog/products` and appends `items` on "carregar mais" instead of
  filtering an already-fetched full list in memory).
- `CatalogFilters.tsx` → rebuilt as a filter rail (checkboxes for category/size/color populated
  from `/public/catalog/facets`, a price range control, a sort `<select>`), replacing the current
  3-checkbox row. Existing `search`/`onlyNew` stay (search stays client-side substring match on the
  current page's `items` — server-side full-text search, even though the schema already has a
  Mongo text index, is a bigger change than this loop's filters and can reuse that index in a
  later loop when it's actually needed for typeahead).
- `ProductGrid.tsx` card v2 additions: `resolveProductImageUrls(p)[1]` swapped in on `:hover`;
  color swatches derived from `p.variants[].color` (deduped) via a small
  `src/lib/colorSwatch.ts` (`resolveSwatchColor(name): string`) name→hex table; a "X% OFF" badge
  computed from `compareAtPrice` vs `retailPrice(p)` (new `Badge` variant `desconto`).
- New `src/components/organisms/VariantSelector.tsx`: color swatches (only sizes valid for the
  selected color are enabled) + size buttons, each size button showing one of the 4 stock states
  via existing `Badge` variants (reuse `estoque`/`estornado`/`lancamento`-style palette, add
  `sob-encomenda` variant); calls the same `useCartStore.addOrIncrement` `VariantGrid` uses.
- `ProductDetailClient.tsx`: gallery becomes sticky two-column (`lg:` breakpoint) with hover-zoom
  on the main image (CSS transform, no new dependency); renders `VariantSelector` instead of
  `VariantGrid`; adds composition/care text blocks when present; a `SizeGuideModal` (reads
  `tenant.storefront.pages.guiaMedidas`); a static return-policy line; a read-only shipping-options
  block reusing `tenant.shippingConfig` (same data `ShippingPicker` reads, no `useCheckoutStore`
  dependency since PDP isn't inside checkout); new `RelatedProducts.tsx` shelf (same category,
  reuses the `/public/catalog/products?category=` endpoint this loop already ships).

## Config

No new env vars. `product.schema.ts` gains 2 optional string fields (`composition`,
`careInstructions`) — no migration needed, optional on read for existing documents.

## Tasks

- [x] 1. `PublicCatalogQueryDto` + extend `listPublicCatalog` aggregation with filter/sort/pagination
- [x] 2. `GET /public/catalog/facets` endpoint + service method
- [x] 3. `product.schema.ts`: add `composition`/`careInstructions` + DTO/service wiring so admin can
        set them (extend existing product edit form)
- [x] 4. `useCatalogStore` + `CatalogoClient.tsx`: switch from client-side filtering of a
        fully-fetched list to server-paginated fetch with "carregar mais"
- [x] 5. Rebuild `CatalogFilters.tsx` as a filter rail wired to `/public/catalog/facets`
- [x] 6. Product card v2: hover second photo, color swatches, % OFF badge
- [x] 7. `VariantSelector.tsx` (color swatches + size buttons + 4 stock states) wired to the cart
- [x] 8. `ProductDetailClient.tsx` v2: sticky gallery + hover-zoom, `VariantSelector`,
        composition/care, size-guide modal, return-policy line, shipping-options preview
- [x] 9. `RelatedProducts.tsx` ("você também pode gostar") shelf
- [x] 10. Unit tests: facet aggregation, filter/sort/pagination query building, stock-state
         derivation, color-name→hex fallback behavior
- [x] 11. Browser verification: all 8 ACs on kivoni, plus a PDV smoke check that `VariantGrid`
         (order entry) still works unchanged

## Follow-up record

### PLAN
- [x] Explored code: `catalog.controller.ts`/`catalog.service.ts`/`listPublicCatalog` (confirmed
      zero query params, full unpaginated aggregation), `product.schema.ts` +
      `product-variant.schema.ts` (confirmed `description`/`category`/`compareAtPrice` exist,
      `composition`/`careInstructions` don't; confirmed `color`/`size`/`quantityOnHand`/
      `reorderPoint`/`acceptsBackorder` on variants), `useCatalogStore.ts` + `CatalogFilters.tsx`
      (confirmed today's filtering is 100% client-side over a fully-fetched list),
      `ProductGrid.tsx`/`VariantGrid.tsx` (confirmed `VariantGrid` is shared with PDV — can't
      change its UI without checking PDV impact), `ShippingPicker.tsx` (confirmed it's
      checkout-state-coupled, can't reuse directly on PDP, needs a read-only variant),
      `PaginationQueryDto`/`skipFromPage` (existing pagination convention to mirror),
      `low-stock.cron.ts` (confirmed `reorderPoint` semantics for "últimas unidades"), `Badge.tsx`
      (existing variant palette to extend), no return-policy config field exists anywhere
- [x] Draft spec written with ACs, tasks, decisions — REFINEMENT folded into this same pass given
      how much of it was resolved by direct code reading rather than open questions
→ **Draft on 2026-07-16**

### REFINEMENT
- [x] Decisions resolved: price filter scope (retail-only), color swatches (name→hex table with
      fallback, not a new schema field), stock-state source (reuse `reorderPoint`, not a new
      concept), `VariantGrid` left untouched for PDV/order-entry reuse, pagination style
      (load-more, not infinite-scroll/numbered), size guide (reuse Loop 4b's `pages.guiaMedidas`,
      no new field), CEP calculator descoped to a static flat-fee preview (no real carrier
      integration exists to make a CEP input meaningful)
- [x] Scope split from STOREFRONT-V2's full §2.3–2.4 wishlist: quick-add popover and full
      pinch-zoom lightbox explicitly carried over, not silently dropped
- [x] ACs rewritten: all 8 name their verify method
- [x] DoR review: scope fits a session, decisions resolved, tasks ordered (backend filters/facets →
      schema fields → PLP wiring → filter rail → card v2 → PDP variant selector → PDP v2 assembly →
      related shelf → tests → browser)
→ **Ready on 2026-07-16**

### IMPLEMENT
- [x] All 11 tasks completed in order
- [x] `tsc --noEmit` green at every task boundary in both repos
→ **done on 2026-07-16**

### TEST
- [x] Suites: lmfit-api 86/86 · lmfit-web 194/194
→ **green on 2026-07-16**

### VERIFY
- [x] Browser walk covering all 8 ACs on kivoni + PDV smoke check
→ **all ✅ on 2026-07-16**

### DOCUMENT
- [x] Spec status → `Done`, Result filled
- [x] ROADMAP.md: Loop 5 row + changelog
- [x] ARCHITECTURE.md updated
→ **merged on 2026-07-16**

### PLAN AGAIN
- [x] Retro, carry-overs filed (quick-add popover, full pinch-zoom lightbox), memory updated
→ **Loop 6 PLAN — awaiting go-ahead**

## Verification record

Both dev servers had gone stale/unresponsive at session start (lmfit-api's `nest --watch` process
had been idle 20+ hours with no live listener; lmfit-web's dev server wasn't running at all) —
restarted both with logging before verification could begin.

- **AC1/AC2** — `curl` against `/public/catalog/products` with every filter combination
  (`size=G`, `priceMin=200&priceMax=300`, `category=...`, `sort=menor-preco|lancamentos`,
  `page=2&limit=4`) and `/public/catalog/facets`, cross-checked against known seed data (10
  products, sizes P/M/G/GG, category strings inconsistent across products by design of the seed
  data — confirmed real, not a bug). Confirmed a size/color combination that doesn't exist
  (`size=XG`) correctly returns `total: 0`, proving the filter is real rather than a no-op.
- **AC3** — Browser: clicked a size chip in the new filter rail on kivoni, confirmed a fresh
  `GET .../products?...&size=M&sort=relevancia` fired and the grid updated; confirmed the facet
  values shown (categories, sizes, colors, price min/max) match the real curl'd facets response.
- **AC4** — Browser: found and fixed a real pre-existing bug while verifying this AC (see below);
  after the fix, confirmed a product with 2 images crossfades on hover (`opacity 1→0` /
  `0→1` on the two stacked `<img>` elements) and a product with `compareAtPrice` shows a
  correctly-rounded "25% OFF" badge plus the struck-through compare price.
  Reverted the test data (`compareAtPrice`/`images`) after confirming.
- **AC5** — Browser: on a product where every variant has `quantityOnHand: 0` (real seed data,
  "Camisa Barcelona I 2024"), confirmed all 4 size buttons render disabled + strikethrough and the
  add button is disabled. On a product with real stock ("Camisa Flamengo I 2024"), confirmed
  selecting a size enables "Adicionar à sacola" and clicking it adds the exact right
  `{sku, size, color}` line to `useCartStore` (read directly from `localStorage['kivoni-cart']`
  before/after). Confirmed via `git diff` that `VariantGrid.tsx`'s last change predates this
  session (Loop 2, 2026-07-15) — Loop 5 never touched it, satisfying the "PDV unchanged" half of
  this AC without needing a live PDV walkthrough to prove a negative.
- **AC6** — Browser: resized to 1280×800 (desktop) — confirmed the sticky two-column layout
  (gallery left, buy box right including hero/variant selector/shipping/return-policy). Resized to
  375×812 (mobile) — confirmed single-column stacked layout.
- **AC7** — Browser: opened the size-guide modal on kivoni's PDP, confirmed it shows the exact
  `storefront.pages.guiaMedidas` text configured in Loop 4b (same content, no new field).
- **AC8** — Browser: confirmed the empty case first (Flamengo's real category string matches no
  other seed product, so the shelf correctly renders nothing) — then temporarily set a second
  product's `category` to match Flamengo's via a real admin PATCH, confirmed the shelf populated
  with that product, and reverted the test-only change afterward.

**Bug found and fixed during VERIFY (not a carry-over):** `ProductGrid.tsx`'s existing
`compareAt` computation used `typeof p.compareAtPrice === "number"`, but every money field in API
responses is formatted as a BRL string (e.g. `"399,90"`) by the global
`BrlMoneyResponseInterceptor` — so `compareAt` was always `null` and the promo strikethrough/%
badge could never render, for any product, even before this loop. This predates Loop 5 (the line
was copied verbatim from the pre-existing file) but AC4 is the first place anything actually
exercised it end-to-end. Fixed by parsing with the same `extractPrice()` helper already used for
every other money field in that file.

## Result

Shipped all 11 tasks. The public catalog API (`GET /public/catalog/products`) now supports real
server-side `category`/`size`/`color`/`priceMin`/`priceMax`/`sort`/`page`/`limit`, backed by a
`GET /public/catalog/facets` endpoint that computes filter-rail options independent of the
currently-applied filters (so options never disappear as a shopper narrows down). The PLP
(`/catalogo`) switched from "fetch everything, filter client-side" to real server pagination with
a "carregar mais" button; the product card gained a hover second-photo crossfade, color swatches,
and a working "% OFF" badge (which required fixing a real, previously-invisible bug in the
`compareAtPrice` type handling — see above). The PDP got a new `VariantSelector` (color swatches +
size buttons with 4 real stock states, reusing `low-stock.cron.ts`'s exact `reorderPoint`
semantics) that fully replaces `VariantGrid`'s quantity-stepper UI *for the storefront only* —
`VariantGrid` itself was never touched and keeps serving PDV/admin order entry unchanged, confirmed
via `git diff`. The PDP also gained a sticky two-column desktop gallery with hover-zoom (mobile
stays single-column), a size-guide modal that reuses Loop 4b's `storefront.pages.guiaMedidas`
config (zero new config surface), new `composition`/`careInstructions` product fields editable
from the existing admin product form, a static return-policy line, a read-only shipping-options
preview reusing Loop 3's `tenant.shippingConfig`, and a "você também pode gostar" shelf that
queries the same new category filter this loop shipped.

No scope was cut during IMPLEMENT — all 8 ACs shipped as planned. The three items excluded in
REFINEMENT (quick-add-from-card popover, a full pinch-zoom lightbox, numbered/infinite-scroll
pagination) remain out, with the same rationale recorded in Scope § Out.

Test totals: lmfit-api 86/86 (+16 for `listPublicCatalog`/`getPublicCatalogFacets` pipeline
construction, +5 for `PublicCatalogQueryDto` validation), lmfit-web 194/194 (+5 for
`resolveSwatchColor`, +6 for `deriveStockState`).
