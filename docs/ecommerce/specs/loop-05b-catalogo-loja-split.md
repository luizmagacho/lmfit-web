# Loop 05 continuation — Split `/catalogo` (simple/wholesale) from `/loja` (e-commerce)

**Status:** Done
**Roadmap entry:** ROADMAP.md — structural reorg across Loops 0–5, not a new numbered loop
**Repos touched:** lmfit-web only

## Goal

User-requested split (not a roadmap-driven gap): everything built across Loops 0–5
(hero/lookbook/theme/PLP filters/PDP variant selector — the full e-commerce storefront) moves to
a new `/loja` path. `/catalogo` reverts to a simple, stock-focused product list — the "how it used
to be" experience, mainly for wholesale (atacado) customers who get sent a link via WhatsApp and
just want to see what's in stock and order.

## Why this is possible without touching the backend

`/catalogo`'s buy flow (`CatalogFloatingCart` → creates an order draft → opens `wa.me` with a
formatted message) and `/loja`'s buy flow (cart → `/checkout` → PIX/manual payment →
`/pedido/confirmado`) are **already two independent code paths that happen to share one route
today**. Splitting the route doesn't require inventing a new purchase mechanism — it requires
moving files and re-pointing a handful of links.

## Research (git history + current references)

- `git log --follow -- 'src/app/(public)/catalogo/'`: baseline commit `57652e2` (pre any
  e-commerce work) had exactly 2 files — `CatalogoClient.tsx` (fetch once, plain `<h1>` + filters +
  grid, no hero/pagination/editorial anything) and `page.tsx`. The very next commit `b08a0a1`
  ("public responsive catalog with variants selector and whatsapp checkout") added the PDP,
  `VariantGrid`-based variant picker, `CatalogFloatingCart`, and made grid cards into links — all
  in one shot. This is the closest historical reference for "simple."
- `/atacado` (`AtacadoClient.tsx`) already exists today as an **orphaned, unlinked** lead-capture
  form (nome/CNPJ/whatsapp) that sets `useCartStore`'s role to `wholesaler` and redirects to
  `/catalogo`. Nothing links to it currently (no `<Link href="/atacado">` anywhere) — it's only
  reachable by typing the URL. After this split it becomes a real, useful entry point again:
  `/atacado` → sets wholesale role → lands on the now-simple `/catalogo`.
- Legacy `/catalog` (singular) is a one-line redirect stub, already flagged in ARCHITECTURE.md as
  "candidate for deletion." Left in place, retargeted to `/loja`.
- `ProductGrid.tsx`/`CatalogFilters.tsx`/`VariantSelector.tsx` etc. were all rebuilt in Loops 4–5
  for the full e-commerce experience and are shared internally within that experience (Lookbook,
  NewArrivalsShelf, RelatedProducts all import `ProductGrid`). None of these can be reused as-is
  for the simple catalog without dragging the whole e-commerce visual language along — the simple
  catalog needs its own small grid/filter components, mirroring the pre-`b08a0a1` shape.
- `ShippingPicker`/`QuickCart` are shared with `/checkout` and PDV respectively — untouched,
  nothing to do with this split.

## Decisions (resolved with the user before IMPLEMENT)

| Decision | Choice |
|---|---|
| Does `/catalogo` keep buy capability? | Yes — cart + WhatsApp order, reusing `CatalogFloatingCart` as-is (same component, mounted by the new simple `catalogo/layout.tsx` instead of `loja/layout.tsx`) |
| Same header/footer/ticker on `/catalogo`? | Yes — no change to the shared `(public)/layout.tsx`'s header/footer/ticker; only the *destination* of the logo/search changes contextually (see below) |
| Wholesale pricing entry point | Unchanged: `/atacado` (lead form) → sets role → `/catalogo`. Visiting `/catalogo` directly (skipping `/atacado`) still shows retail pricing, same as today |
| `storefront.enabled` ("Loja ativa" toggle) scope | **Changed**: this toggle was written assuming one unified "loja." Now that `/catalogo` is a separate wholesale utility a merchant would want to keep sharing via WhatsApp even while their online *retail* store is down for maintenance, the gate moves from the shared `(public)/layout.tsx` to `loja/layout.tsx` only. `/catalogo` and `/atacado` are never affected by this toggle. Documented as a judgment call, not silently changed |
| Header logo / search destination | Contextual: stays within the current section (`/catalogo` → `/catalogo`, everywhere else → `/loja`) rather than always jumping to one fixed "home" |
| Legacy `/catalog` (singular) stub | Retargeted to `/loja` (most likely intent for a bare "/catalog" URL is the browsable store, not the wholesale utility) |

## Design notes

### Moved to `/loja` (rename only, no behavior change)

- `catalogo/page.tsx` → `loja/page.tsx`
- `catalogo/layout.tsx` → `loja/layout.tsx` (still mounts `CatalogFloatingCart`; gains
  `StorefrontGate` wrapping, moved from the shared layout)
- `catalogo/CatalogoClient.tsx` → `loja/LojaClient.tsx` (rename only)
- `catalogo/p/[slug]/page.tsx` → `loja/p/[slug]/page.tsx`
- `catalogo/p/[slug]/ProductDetailClient.tsx` → `loja/p/[slug]/ProductDetailClient.tsx`
- Internal PDP links updated from `/catalogo/p/` to `/loja/p/` in `ProductGrid.tsx`,
  `NewArrivalsShelf.tsx`, `RelatedProducts.tsx`; "back to catalog" links inside `LojaClient`/its PDP
  point to `/loja`.
- `/checkout`'s empty-cart link and `/pedido/confirmado`'s "Voltar ao Catálogo"/"Continuar
  comprando" links → `/loja` (both are part of the `/loja` checkout flow, never reachable from the
  simple catalog's WhatsApp-order path).
- Admin dashboard's "your public catalog" link → `/loja` (the presentable link to share/showcase);
  keep a secondary link to `/catalogo` for the wholesale utility.
- Landing page's illustrative fake browser URL → `/loja`.
- Legacy `/catalog` stub → redirects to `/loja`.

### New, simple `/catalogo` (rebuilt from the pre-`b08a0a1` shape)

- `catalogo/page.tsx` / `catalogo/layout.tsx` (new — mounts `CatalogFloatingCart`, no
  `StorefrontGate`) / `catalogo/CatalogoClient.tsx` (new — fetch all products once, `<h1>` +
  role-aware subtitle + simple filters + simple grid, no hero/lookbook/pagination/facets).
- `catalogo/p/[slug]/page.tsx` / `ProductDetailClient.tsx` (new — main image, name, description,
  `VariantGrid` steppers table for fast multi-size/color quantity entry — the same picker PDV
  uses, well-suited to wholesale bulk ordering. No size guide, no zoom, no related products).
- New `SimpleProductGrid.tsx` (plain image + name + `PriceTag` + Lançamento/Esgotado badges,
  client-side filtered via `useCatalogStore`'s `search`/`onlyInStock`/`onlyNew` fields only) and
  `SimpleCatalogFilters.tsx` (search input + 2 checkboxes) — small, dedicated components so
  `ProductGrid.tsx`/`CatalogFilters.tsx` (the Loop 5 filter-rail versions `/loja` depends on) stay
  untouched.
- `useCatalogStore` is unchanged (already has all the fields either page needs; `/catalogo` simply
  ignores `category`/`size`/`color`/`price`/`sort`).

### Shared layout change

- `StorefrontGate` moves out of `(public)/layout.tsx` into `loja/layout.tsx` (wrapping `{children}`
  + `<CatalogFloatingCart />`). The shared layout keeps `AnnouncementTicker`/`PublicHeader`/
  `StorefrontFooter`/`ChatWidget` exactly as today, on every `(public)` route.
- `PublicHeader.tsx`: logo `<Link>` and the search-submit redirect target become
  `pathname?.startsWith("/catalogo") ? "/catalogo" : "/loja"` instead of a hardcoded `/catalogo`.

## Acceptance criteria

- [x] AC1 — `/loja` renders exactly what `/catalogo` rendered before this change (hero, trust bar,
      coupon banner, Lançamentos, lookbook, filter rail, product card v2, PDP with
      `VariantSelector`/gallery/related products) — a pure rename, zero visual/behavioral diff
- [x] AC2 — `/catalogo` renders a simple product grid (no hero/lookbook/facets), lets a visitor
      pick sizes/colors via `VariantGrid` on a simple PDP, add to cart, and finish the order via
      the existing WhatsApp flow
- [x] AC3 — `/atacado` still sets wholesale role and lands on `/catalogo` (now simple); `/catalogo`
      visited directly shows retail pricing
- [x] AC4 — Toggling a tenant's "Loja ativa" off shows the unavailable message on `/loja` only;
      `/catalogo` keeps working normally
- [x] AC5 — Header logo and search on `/catalogo` stay within `/catalogo`; everywhere else they
      point to `/loja`
- [x] AC6 — No dead links: `/checkout`, `/pedido/confirmado`, admin dashboard, legacy `/catalog`
      all resolve correctly to their updated targets

## Tasks

- [x] 1. Move `catalogo/*` → `loja/*` (rename), update internal `/catalogo` self-links to `/loja`
- [x] 2. Update cross-references (`ProductGrid`, `NewArrivalsShelf`, `RelatedProducts`, checkout,
        pedido/confirmado, dashboard, landing, legacy `/catalog` stub)
- [x] 3. Move `StorefrontGate` from shared layout into `loja/layout.tsx`
- [x] 4. Build the new simple `/catalogo` (route files + `SimpleProductGrid`/`SimpleCatalogFilters`)
- [x] 5. `PublicHeader.tsx`: contextual logo/search destination
- [x] 6. `tsc --noEmit` + eslint + full vitest run
- [x] 7. Browser verification of all 6 ACs

## Follow-up record

### PLAN
- [x] Explored git history (baseline pre-e-commerce commit), all `/catalogo` cross-references,
      `/atacado`, legacy `/catalog` stub, existing WhatsApp mechanisms — via a research subagent
- [x] 3 clarifying questions asked and resolved with the user (buy-flow scope, header/footer
      consistency, wholesale pricing entry point) before writing ACs
→ **Draft on 2026-07-16**

### REFINEMENT
- [x] `storefront.enabled` gate scope decided during this same pass (not asked, judgment call
      documented above) — moving it to `/loja`-only is the one design choice not directly answered
      by the user's 3 responses, made because the toggle's own copy ("loja ativa") and stated
      purpose (temporarily disable *online retail*) doesn't obviously apply to a wholesale
      WhatsApp utility a merchant would want to keep sharing during maintenance
- [x] Scope confirmed to fit one pass: pure file moves + two small new components + one shared
      layout change + a handful of link updates, no new backend work
→ **Ready on 2026-07-16**

### IMPLEMENT
- [x] All 7 tasks completed in order
- [x] `tsc --noEmit` green
→ **done on 2026-07-16**

### TEST
- [x] eslint + vitest full run (194/194, 0 lint errors)
→ **green on 2026-07-16**

### VERIFY
- [x] Browser walk covering all 6 ACs
→ **all ✅ on 2026-07-16**

### DOCUMENT
- [x] ARCHITECTURE.md updated with the new route split
- [x] ROADMAP.md changelog entry
- [x] Memory updated
→ **merged on 2026-07-16**

## Verification record

All on kivoni, via the real browser (contextual DOM/localStorage checks, not curl shortcuts):

- **AC1** — `/loja` loads with hero ("Nova Coleção Inverno 2026"), trust bar, coupon banner
  (BEMVINDO10), the lookbook ("Look Torcedor Completo"), the full filter rail (sort/category/
  size/color/price), and product card v2 — identical to `/catalogo` pre-split. Confirmed via
  `document.body.innerText`.
- **AC2** — `/catalogo` loads a plain grid (no hero/lookbook/facets, just search + 2 checkboxes),
  all 10 products shown unpaginated. Its PDP shows `VariantGrid`'s per-SKU stepper table
  (`Padrão · G / 10 em estoque / FUT-CFI2556-G / R$ 299,90`, etc.) — set one SKU's quantity to 3
  via a native input-value setter and confirmed `useCartStore`'s `localStorage` entry appeared
  correctly (`{sku: "FUT-CFI2556-G", qty: 3}`), proving the WhatsApp order flow
  (`CatalogFloatingCart`, showing "Comprar via WhatsApp") is live on the new simple route.
- **AC3** — Filled and submitted the real `/atacado` lead form (name + phone — the phone field
  was actually required, caught on first attempt when the selector missed it and the button
  silently no-opped). Confirmed the browser landed on `/catalogo` and
  `localStorage['kivoni-cart'].state.role === "wholesaler"` with the submitted customer info
  stored.
- **AC4** — Toggled `storefront.enabled` to `false` via a real admin PATCH (logged in as
  `admin@kivoni.local`), confirmed `/loja` shows "Loja temporariamente indisponível" (header/
  footer still visible — an improvement over the pre-split full-page blackout, now that the gate
  only wraps `/loja`'s own content instead of the whole shared layout), confirmed `/catalogo` in
  the same disabled state still renders its normal grid. Reverted `enabled: true` after.
- **AC5** — On `/catalogo`'s PDP, `read_page` showed the header logo link as `href="/catalogo"`.
  After navigating to `/loja` (disabled-state redirect target), the logo resolved to `href="/loja"`
  — confirms the `pathname?.startsWith("/catalogo")` branch in both directions.
- **AC6** — Legacy `/catalog` (singular) redirected to `/loja`
  (`window.location.href` confirmed post-navigation). Cleared the cart and reloaded `/checkout` to
  trigger its empty-cart state — the inline link read `href="/loja"`, text "loja". Admin dashboard
  now shows both `/loja` and `/catalogo` links side by side (confirmed via DOM query for both
  hrefs).

## Result

Split `/catalogo` and `/loja` into two independent routes serving two different audiences, per
explicit user request (not a roadmap-driven gap). `/loja` is a pure rename of everything built in
Loops 0–5 — hero/lookbook/theme presets/PLP filter rail/PDP `VariantSelector` — zero behavioral
change, confirmed by browser walk. `/catalogo` was rebuilt from the pre-Loop-1 baseline (found via
`git log --follow`, commit `57652e2`): a plain grid, 2-checkbox filter, and a `VariantGrid`
(stepper-table) PDP — the same picker PDV uses, well suited to fast wholesale bulk ordering. Both
routes share the same underlying buy mechanism (`CatalogFloatingCart` → order draft → `wa.me`
message), which is what made the split possible without touching the backend or reinventing a
purchase flow — `/loja`'s and `/catalogo`'s "buy" paths were already two independent code paths
that happened to share one route before this change.

One judgment call made during REFINEMENT (not directly asked): the "Loja ativa" toggle
(`storefront.enabled`) now gates only `/loja`. Previously it blacked out the entire shared
`(public)` layout, including the WhatsApp-order utility a merchant would plausibly want to keep
sharing with wholesale clients even while their online retail store is down for maintenance. The
gate moved from the shared `(public)/layout.tsx` into `loja/layout.tsx`, wrapping just that route's
content + its floating cart — a side benefit is the disabled-state message now keeps the header/
footer visible instead of blacking out the whole page.

`/atacado` (previously an orphaned, unlinked lead-capture form — nothing in the codebase linked to
it) becomes a real, useful entry point again: it still sets the wholesale pricing role and
redirects into `/catalogo`, which is now the appropriately simple destination for that flow. The
legacy `/catalog` (singular) stub now redirects to `/loja` instead of `/catalogo`, matching the
more likely intent of a generic bare URL. The admin dashboard's "public catalog" link was split
into two: `/loja` (primary, "Loja online") and `/catalogo` (secondary, "Catálogo atacado").

No backend changes were needed. Test totals unchanged from Loop 5 (194/194 web, 86/86 api) since
this was a pure frontend routing/component reorg — no new unit-testable logic was introduced
(the two new components, `SimpleProductGrid`/`SimpleCatalogFilters`, are thin reuses of
already-tested pure functions from `ProductGrid.tsx`/`useCatalogStore`).
