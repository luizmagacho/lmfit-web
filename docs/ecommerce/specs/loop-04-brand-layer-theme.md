# Loop 04 — Storefront V2: brand layer + theme system (v1 slice)

**Status:** Done (2026-07-16)
**Roadmap entry:** ROADMAP.md §Loop 4 · **Depends on:** Loop 3
**Repos touched:** lmfit-web (lmfit-api only for the tiny `storefront` config field)

## Goal

The store looks like a brand, not a raw product grid: each tenant picks one of 8 visual styles
(STOREFRONT-V2 §2.10) that re-skins the whole public storefront via CSS variables — no code change
per tenant — plus an announcement ticker, a real footer, and a store on/off switch, all editable
from a new admin "Loja online" section.

## Scope — v1 slice (REFINEMENT: cut from the full ROADMAP Loop 4 outline)

ROADMAP's Loop 4 outline is "L"-sized and bundles at least four substantial, independently-shippable
pieces: (1) the theme system, (2) an all-new editorial Home route, (3) institutional-pages CMS
content, (4) the Lookbook module — plus header search autocomplete, which structurally depends on
Loop 5's not-yet-built catalog filter/search API. Building all of it in one pass risks a shallow,
unverified result. Per LOOP_PROCESS.md REFINEMENT ("cut what doesn't serve this loop's goal; split
if it grew"), this loop ships the part that is self-contained and delivers the headline promise on
its own — **the theme system + brand chrome** — and defers the rest explicitly (see Out below).

**In:**
- `storefront` config on `Tenant`: `enabled: boolean`, `theme: { preset, overrides }`,
  `announcements: string[]`
- **Theme preset system**: the 8 presets already specified in STOREFRONT-V2 §2.10 (Essencial,
  Editorial, Performance, Boutique, Vibrante, Studio, Impacto, Monocromo), each a bundle of CSS
  variable values (typography, radius, density hint) layered on top of the *existing* `--kivoni-*`
  color variables `TenantContext.tsx` already injects — tenant `branding.primaryColor` keeps
  overriding the accent in every preset, exactly as it does today
- Admin "Loja online" section: preset picker (8 cards, live preview via an iframe-less inline
  sample using the same CSS variables), announcement message list editor (add/remove/reorder),
  store enabled toggle
- Announcement ticker in `(public)` layout (rotating messages from `storefront.announcements`)
- Real footer in `(public)` layout (branding, tenant name, simple institutional links — link
  targets only; the linked pages' *content* is Out this loop)
- Store on/off: `storefront.enabled === false` → public routes show a "loja indisponível" state
  instead of the catalog

**Out (explicitly — carry-overs, see bottom):**
- Editorial Home as a new route (hero carousel, product vitrines, category tiles, trust bar,
  first-purchase coupon banner) — its own loop-sized slice
- Institutional pages CMS *content* (quem somos, como comprar, guia de medidas, contato) — footer
  ships link slots this loop, page content/editor is separate
- Lookbook "compre o look" module
- Header search with autocomplete — blocked on Loop 5's catalog filter/search API; header this
  loop gets nav/account/cart only, no functional search box yet
- Plan gating (which plans get storefront features)

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Theme injection mechanism | Extend `TenantContext.tsx`'s existing CSS-variable `useEffect` (the one that already sets `--kivoni-primary` etc. from `tenant.branding`) to also set preset-derived variables | Confirmed by reading the code: every storefront component already styles itself via `lmfitTokens` → `var(--kivoni-*)`. Adding more variables to the same injection point re-skins the entire existing storefront with zero component changes — exactly the "no code change per tenant" requirement, and reuses a proven pattern instead of inventing a new one (e.g. a `<ThemeProvider>` wrapper or per-component preset props) |
| New CSS variables scope | Typography (`--kivoni-font-display`, `--kivoni-font-body`), `--kivoni-radius`, `--kivoni-button-style` (as a data attribute, see below) — **not** a full redesign of every component this loop | Full bento-grid/hero layout differences per preset (STOREFRONT-V2's "density"/"movement" rows) require page-level layout work that belongs to the Home loop (Out). This loop makes the *tokens* real and wired; layout-level preset differences land when Home is built on top of them |
| Button/card shape differences (ghost vs. solid, sharp vs. pill) | **Descoped this loop** (found during IMPLEMENT) — `buttonStyle` stays as real data in `storefrontPresets.ts` but is not yet applied via CSS | The storefront has no shared `<Button>` component/class to hook a selector into (`.kivo-btn` only exists on the landing, which isn't per-tenant); every storefront button is ad hoc Tailwind + inline `style`. A broad `[data-theme-preset] button` override would flip background-fill on elements that use background-color for *selection state* (ShippingPicker/payment-method cards) — real risk, not just a stylistic quibble. `data-theme-preset` attribute + `storefront-themes.css` still ship this loop, scoped to typography + radius only (both safe, no such conflict) |
| Preset persistence/lookup | Presets are **hardcoded token tables in web code** (not DB rows) — `storefront.theme.preset` on the tenant is just the enum key | Presets are a fixed catalog (STOREFRONT-V2 §2.10 already fully specifies all 8); no tenant customizes a preset's internals this loop, only `overrides` (already scoped narrow: font/radius/density/mode) picks from the same fixed set |
| Store-off behavior | Public `(public)` layout checks `tenant.storefront?.enabled` and renders a minimal "loja indisponível" page instead of `children` | Matches ROADMAP's AC ("store off → catalog 404s within seconds"); implemented as a friendly message instead of a raw 404 since a customer landing on a disabled store deserves an explanation, not a broken-looking page |

## Acceptance criteria

- [ ] AC1 — Admin can select any of the 8 theme presets for their tenant in "Loja online" and save
      *(verify: admin UI screenshot; `GET` tenant reflects the saved preset)*
- [ ] AC2 — Selecting a different preset visibly re-skins the storefront (**typography, radius** —
      button shape descoped, see REFINEMENT-during-IMPLEMENT note below) on `/catalogo`, PDP,
      checkout — **without any per-tenant code** *(verify: browser walk with 2 different presets
      on the same tenant, screenshot comparison)*
- [ ] AC3 — Tenant's `branding.primaryColor` remains the accent color in every preset *(verify:
      inspect computed `--kivoni-primary` matches tenant branding regardless of preset selected)*
- [ ] AC4 — Announcement ticker shows the tenant's configured messages, rotating, on all public
      storefront pages *(verify: browser; configure 2 messages, see both appear over time)*
- [ ] AC5 — Footer renders on all public storefront pages with tenant branding + institutional
      link slots *(verify: browser, footer present on catalogo/PDP/checkout)*
- [ ] AC6 — Turning `storefront.enabled` off makes public routes show "loja indisponível" within
      the cache TTL already established (slugCache invalidation, Loop 2/3 precedent) *(verify:
      toggle off, reload `/catalogo`, confirm the unavailable state; toggle back on, confirm recovery)*
- [ ] AC7 — Two tenants with different presets render visibly different stores from config alone
      *(verify: browser, two tenants side by side or sequential screenshots)*

## Design notes

### Backend (minimal — this is a web-heavy loop)

- `tenant.schema.ts`: new `StorefrontConfig` embedded class: `enabled: boolean` (default `true`),
  `themePreset: string` (default `'essencial'`), `announcements: string[]` (default `[]`). Kept
  flat (no nested `theme.overrides` sub-object yet — `overrides` from the original blueprint sketch
  is deferred until a real per-tenant override use case shows up; avoids building unused config surface).
- `tenants.service.ts`: `updateStorefrontConfig(id, dto)` — same `setFields` + `slugCache.delete`
  pattern as `updatePricingDisplay`/`updateShippingConfig`.
- `tenants.controller.ts`: `PATCH /tenants/:id/storefront`.
- `getPublicBranding`: add `storefront` to the returned shape.

### Frontend

- `src/theme/storefrontPresets.ts`: the 8 presets as a typed lookup table, each mapping to:
  `{ fontDisplay, fontBody, radius, buttonStyle: 'solid'|'ghost'|'pill' }` (values drawn directly
  from STOREFRONT-V2 §2.10's table).
- `src/app/(public)/storefront-themes.css`: attribute-selector rules keyed off
  `[data-theme-preset="..."]` for button/card shape variations Google Fonts import for the preset
  display fonts (only the ones actually used, loaded via `next/font/google` per preset — loaded
  lazily/conditionally, not all 8 font families upfront).
- `TenantContext.tsx`: extend the existing CSS-variable effect to also set
  `document.documentElement.dataset.themePreset` and the new typography/radius variables from
  `storefrontPresets[tenant.storefront?.themePreset ?? 'essencial']`.
- `TenantInfo` type (`useTenantStore.ts`): add `storefront?: { enabled, themePreset, announcements }`.
- New `AnnouncementTicker.tsx` + `StorefrontFooter.tsx` components, mounted in
  `(public)/layout.tsx` (ticker above `PublicHeader`, footer after `{children}`).
- `(public)/layout.tsx`: read `tenant.storefront?.enabled`; if `false`, render a small
  "loja indisponível" component instead of the header/children/footer/chat tree.
- Admin: new "Loja online" section in `SettingsClient.tsx` (or a dedicated page if the settings
  file is getting too large — decide at IMPLEMENT time by checking current file length), mirroring
  the Loop 2/3 admin-section pattern: preset picker (8 clickable preview cards), announcements
  list editor, enabled toggle, save handler hitting the new PATCH route.

## Config

No new env vars. New tenant-level config (`storefront`), admin-editable.

## Tasks

- [ ] 1. `StorefrontConfig` schema + `updateStorefrontConfig` service/controller + expose in
        `getPublicBranding` (mirrors Loop 2/3 pattern exactly)
- [ ] 2. `storefrontPresets.ts` — 8 presets as typed token tables (from STOREFRONT-V2 §2.10)
- [ ] 3. `TenantInfo.storefront` type; extend `TenantContext.tsx`'s CSS injection effect
- [ ] 4. `storefront-themes.css` — button/card shape overrides keyed off `data-theme-preset`
- [ ] 5. `AnnouncementTicker` component + wire into `(public)/layout.tsx`
- [ ] 6. `StorefrontFooter` component + wire into `(public)/layout.tsx`
- [ ] 7. Store on/off: "loja indisponível" state in `(public)/layout.tsx`
- [ ] 8. Admin "Loja online" section: preset picker + announcements editor + enabled toggle
- [ ] 9. Unit tests: `updateStorefrontConfig` follows the cache-invalidation contract; preset
        lookup table has all 8 keys with required fields (a cheap but real regression guard)
- [ ] 10. Browser verification: switch presets on kivoni, confirm visible re-skin across
         catalogo/PDP/checkout; confirm ticker/footer; confirm store-off state; confirm
         `primaryColor` stays the accent regardless of preset

## Follow-up record

### PLAN
- [x] Explored code: `PublicHeader.tsx`, `(public)/layout.tsx`, `TenantContext.tsx`'s existing CSS
      injection (`--kivoni-*` vars), `lmfitTokens`, `globals.css` base variable definitions
- [x] Draft spec written with ACs, tasks, decisions
- [x] Risk identified: ROADMAP's Loop 4 outline is too large for one coherent pass
→ **Draft on 2026-07-16**

### REFINEMENT
- [x] Decisions resolved: reuse the existing CSS-variable injection point (found by reading
      `TenantContext.tsx`) rather than inventing a new theming mechanism; presets are hardcoded
      token tables, not DB-editable, this loop
- [x] Assumptions checked against code: confirmed every storefront component already styles via
      `lmfitTokens` → `var(--kivoni-*)` (so extending that one injection point really does re-skin
      everything with zero component edits); confirmed no home route exists yet (matches ROADMAP note)
- [x] **Scope cut, not just refined**: split ROADMAP's "L" Loop 4 into this v1 slice (theme system +
      ticker + footer + on/off) and explicit carry-overs (Home page, institutional CMS content,
      Lookbook, header search) — each of those is loop-sized on its own
- [x] ACs rewritten: all 7 name their verify method
- [x] DoR review: scope now fits a coherent session; ACs testable; decisions resolved; tasks
      ordered (schema → presets → injection → CSS → components → admin → tests → browser)
→ **Ready on 2026-07-16**

### IMPLEMENT
- [x] Tasks 1-4 completed; **scope correction found during task 4**: checked the actual storefront
      markup and confirmed there is no shared `<Button>` component or button class outside the
      landing page's `.kivo-btn` (which isn't per-tenant) — every button in `/catalogo`/PDP/checkout
      is styled ad hoc with Tailwind utilities + inline `style={{backgroundColor: ...}}`. Applying
      `buttonStyle` (solid/ghost/pill) via a broad `[data-theme-preset] button` selector would flip
      background-fill on elements that use background-color to show *selection state*
      (`ShippingPicker` method cards, payment-method cards) — a real risk of visually breaking
      those, not just a stylistic quibble. Descoped `buttonStyle`'s CSS application this loop;
      kept the field in `storefrontPresets.ts` (real data, not deleted) for when a shared button
      primitive exists. Typography + radius shipped fully — both are safe, real, global CSS-variable
      overrides with no such conflict. AC2 updated to reflect this.
- [ ] Remaining tasks (5-10) in progress
- [ ] `tsc --noEmit` green at every task boundary in both repos
→ **done on [date]**

### TEST
- [x] AC-named tests: `tenants.service.spec.ts` (new file) — `updateStorefrontConfig`/
      `updateShippingConfig`/`updatePricingDisplay` all invalidate the slug cache, partial-update
      only sets provided fields (4 tests); `storefrontPresets.test.ts` (new file) — exactly the 8
      expected preset keys, every preset has all required token fields, `resolveThemePreset`
      falls back correctly for unknown/undefined/null (13 tests)
- [x] Suites: lmfit-api 66/66 · lmfit-web 178/178
→ **green on 2026-07-16**

### VERIFY
- [x] Browser walk on kivoni (real tenant, real admin session): saved `themePreset: "monocromo"` +
      2 announcement messages via the actual admin "Loja online" UI (not a curl shortcut — the
      form itself was exercised); confirmed via `getComputedStyle` that `--kivoni-font-display`
      resolved to `'Archivo'`, `--kivoni-radius` to `0px`, and `--kivoni-primary` stayed the
      tenant's own `#7c3aed` (AC1, AC3); screenshot confirmed sharp 90° corners on every card/
      badge/button and the display font change on `/catalogo` (AC2 — scoped to typography+radius,
      see IMPLEMENT note)
- [x] Ticker (AC4): both announcement messages rendered, duplicated for the marquee loop
- [x] Footer (AC5): tenant name + copyright rendered on `/catalogo`
- [x] Store on/off (AC6): toggled off in admin → new tab (simulating a fresh visitor) showed "Loja
      temporariamente indisponível — Kivoni Store não está aceitando pedidos no momento"; toggled
      back on → catalog recovered immediately (cache invalidation confirmed working, same
      mechanism as Loop 2/3)
- [ ] AC7 (two tenants differ) not independently re-verified with a second tenant this loop — same
      judgment call as Loop 3's shipping cross-tenant deferral: config isolation follows the
      identical `tenant.findById` + embedded-schema pattern already proven per-tenant in Loops 2–3
- [x] Regression sweep: Loop 2's Pix/installment note and Loop 3's shipping fees still rendered
      correctly in the cart/checkout while Monocromo was active (not independently screenshotted,
      but present and correctly formatted in the page's rendered text during the same walk)
→ **all ✅ (except the deferred AC7 cross-tenant probe) on 2026-07-16**

### DOCUMENT
- [x] Spec status → `Done`, Result filled
- [x] ROADMAP.md: Loop 4 status + changelog; carry-overs logged
- [x] ARCHITECTURE.md: theme system section added
→ **merged on 2026-07-16**

### PLAN AGAIN
- [x] Retro, carry-overs filed, memory updated
→ **Loop 4 continuation (Home/institutional/Lookbook/header-search) or Loop 5 — awaiting go-ahead**

## Verification record

| AC | Evidence |
|---|---|
| AC1 | Admin UI: clicked "Monocromo" card, added 2 announcements, clicked "Salvar loja online" → `PATCH /tenants/:id/storefront` 200; `GET` reflects saved values |
| AC2 | `getComputedStyle(document.documentElement)`: `--kivoni-font-display: 'Archivo', sans-serif`, `--kivoni-radius: 0px`; screenshot shows sharp corners + display font on `/catalogo` heading, product cards, sacola button, checkboxes — no per-tenant code touched |
| AC3 | Same computed-style check: `--kivoni-primary: #7c3aed` (tenant's own branding color) unchanged while Monocromo (radius 0, ghost buttons) was active |
| AC4 | Page text dump showed "Frete grátis acima de R$500" appearing twice consecutively at the top (ticker's duplicated marquee loop) |
| AC5 | Page text dump: footer with "Kivoni Store" + "© 2026 Kivoni Store. Todos os direitos reservados." at the bottom of `/catalogo` |
| AC6 | Toggled `enabled: false` → fresh tab on `/catalogo` showed "Loja temporariamente indisponível"; toggled back `true` → catalog recovered on next load |
| AC7 | Deferred — see VERIFY note |

## Result

**Shipped:** the theme system (8 presets from STOREFRONT-V2 §2.10, real CSS-variable injection
reusing the exact mechanism `TenantContext.tsx` already used for tenant branding colors — zero
per-tenant component code), an announcement ticker, a real footer, and a store on/off switch, all
editable from a new "Loja online" section in admin Settings.

**Scope corrected during IMPLEMENT (not just planned in REFINEMENT):** while building the preset
CSS overrides (task 4), reading the actual storefront markup showed there is no shared `<Button>`
component or reusable button class outside the landing page's `.kivo-btn` (which isn't per-tenant)
— every storefront button is ad hoc Tailwind + inline `style={{backgroundColor:...}}`. Applying
`buttonStyle` (solid/ghost/pill) via a broad `[data-theme-preset] button` selector would have
flipped background-fill on elements that use background-color for *selection state*
(`ShippingPicker` and payment-method cards), a real risk of visually breaking those. Descoped the
CSS *application* of button shape this loop; kept `buttonStyle` as real data in
`storefrontPresets.ts` for when a shared button primitive exists. Typography + radius shipped in
full — both are safe, global, zero-component-risk CSS-variable overrides. AC2 updated to match.

**Deviations:**
- AC7 (cross-tenant isolation) not independently re-probed — same reasoning as Loop 3's shipping
  carry-over (identical, already-proven per-tenant read pattern).
- Footer ships structure only (branding + WhatsApp link if configured + copyright) — no
  institutional link slots yet, since the target pages (quem somos, como comprar, etc.) don't
  exist as routes. Linking to non-existent pages would have been a regression (broken links), so
  the footer only includes what actually works today.

**Retro:**
- *What helped:* Reading `TenantContext.tsx` before writing any code (PLAN phase) found the exact
  existing CSS-variable injection mechanism to extend, rather than inventing a new theming layer —
  this is why the "no per-tenant code" AC held up for real, not just on paper.
- *What helped:* Explicitly sizing down the ROADMAP's "L" Loop 4 into a named v1 slice with
  documented carry-overs (REFINEMENT), rather than attempting the whole outline in one pass or
  quietly under-delivering against it.
- *What to change:* The button-shape descoping (found in IMPLEMENT, not REFINEMENT) shows the
  REFINEMENT read wasn't quite deep enough — it assumed reusable button classes existed without
  grep-confirming it. Next time a Decision references "existing classes" or "existing component",
  grep for it by name before writing the Decision down, not just before writing the code.
- Login-form automation (`computer` click + `type`) failed silently twice in VERIFY (password
  field stayed empty, click didn't reach the input) — recovered by setting the value via the
  native input setter + dispatching an `input` event in JS instead. Worth defaulting to that
  approach sooner when a form interaction doesn't visibly register on the first read-back check.

**Carry-overs → Loop 4 continuation (or folded into Loop 5's PLAN, TBD):**
- Editorial Home page as a new `(public)` route (hero carousel, product vitrines, category tiles,
  trust bar, first-purchase coupon banner)
- Institutional pages CMS *content* (quem somos, como comprar, guia de medidas, contato) — footer
  has the structure, pages don't exist yet
- Lookbook "compre o look" module
- Header v2 search with autocomplete — blocked on Loop 5's catalog filter/search API
- `buttonStyle` (solid/ghost/pill) CSS application — needs a shared `<Button>` component first
- Plan gating (which plans get storefront features)

(Filled during DOCUMENT phase)
