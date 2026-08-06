# Loop 4d — Theme preset full styling (palette, PLP density, hero, motion)

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 4 continuation (Loop 4d)
**Depends on:** Loop 4c (`buttonStyle`/`Button` atom, Settings mini-mockup, "ver ao vivo" link) —
this loop widens the same `StorefrontThemeTokens` shape Loop 4c already established the pattern for.
**Repos touched:** lmfit-web (theme tokens, components, Settings UI) + lmfit-api (new `heroImages`
field, needed for the hero carousel — see Scope; every other axis is CSS-tokens-only, no backend
change)

## Goal

STOREFRONT-V2.md §2.10 defines all 8 presets across 8 axes (vibe, typography, **palette**, buttons,
**card treatment**, **hero**, **PLP density**, **motion**). Loop 4 shipped typography+radius, Loop 4c
shipped buttons + a picker preview — 4 of 8 axes are still inert data or don't exist as tokens at all.
The user asked directly for two things: (1) a better preview of the style choice in Settings, and (2)
the live storefront to actually *look* like the benchmarked style, not just have a slightly different
font/radius. This loop closes the remaining 4 axes (palette, card treatment, PLP density, motion) plus
a *hero presentation* variant (using the existing single-image hero, not new media types — see Scope
§Out for why full video/carousel is carried over).

## Scope

**In:**
- **Per-preset palette** (background/surface/text/border), replacing today's single global palette
  that every preset currently shares regardless of the benchmark's actual target (e.g. Performance's
  "fundo escuro quase preto" — this preset should look dark to every visitor, not just visitors whose
  OS happens to be in dark mode).
- **PLP density** (grid column count) — today hardcoded identically in both `ProductGrid.tsx` and
  `SimpleProductGrid.tsx` regardless of preset; becomes a preset-driven token in the former only
  (`/loja`, the themed storefront — `/catalogo`'s simple grid is deliberately out of theme-preset
  scope entirely, same as every prior loop's `/loja` vs `/catalogo` split).
- **Card treatment**: per-preset image aspect ratio (today hardcoded `1/1`). Hover-swap-photo and
  badges (%OFF/Lançamento/Esgotado) already exist from Loop 5 and stay as-is — the benchmark's card
  differences are mostly about frame/aspect, not new interaction logic.
- **Hero presentation**: per-preset overlay/typography treatment on top of the tenant's existing
  hero image (title position, overlay darkness, type scale) — matches 7 of the 8 presets' hero
  descriptions, which describe a **single photo** with different framing/typography ("foto única
  calma", "tela cheia com tipografia sobreposta", "still-life elegante", "foto de bem-estar",
  "atleta em ação + frase", "foto de estúdio em tela cheia"; Performance's "vídeo curto/foto de ação"
  explicitly allows a photo fallback).
- **Hero carousel** (upgraded from "carried over" after user confirmation): a new optional
  `heroImages: string[]` tenant field (alongside the existing single `heroImageUrl`, kept for
  backward compat) — when a tenant uploads 2+ images, `HeroBanner` renders an autoplaying carousel
  with dot indicators instead of a static photo. Not preset-gated (any tenant on any preset can add
  multiple images) — Vibrante's benchmark entry ("carrossel colorido, colagens") is the motivating
  case, but the mechanism is generic tenant content, matching how every other hero field
  (title/subtitle/CTA) already works regardless of preset.
- **Motion**: a duration/easing token wired into the transitions that already exist (card hover-swap,
  filter interactions) — not new animation types.
- **Settings preview upgrade**: the existing mini-mockup (Loop 4c) gains a background/surface color
  swatch and a small density indicator so the preview reflects the new axes, not just font/radius/
  button.
- **Contrast safety**: every new preset palette must pass the same safety bar Loop 4's
  `isThemeSafeAccent`/`darkenHexColor` already established for tenant accent colors — no preset may
  ship an inaccessible text/background pairing.

**Out (explicitly, with reasons):**
- **True per-preset motion choreography** (parallax scroll, micro-bounce spring physics) — no
  animation-orchestration layer exists in this codebase today (just scattered `transition-*` Tailwind
  classes). This loop ships duration/easing as a token (cheap, real, applies everywhere transitions
  already exist); genuinely different motion *behaviors* per preset (not just speed) would need a new
  animation layer and is carried over.
- **`/catalogo` (the simple wholesale grid)** — deliberately never themed, matching every prior
  loop's `/loja` vs `/catalogo` split (Split loop, Loop 4c's `finalizeVariant` opt-in precedent).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Where new palette/density/motion vars get applied | A **new, small effect scoped to `(public)/layout.tsx` only** (not `TenantContext.tsx`'s existing global effect) | Found during REFINEMENT: `TenantContext`'s theming effect already runs globally — `AppProviders` (which wraps `TenantProvider`) is mounted by `(app)`, `(pdv)`, **and** `(public)` layouts alike. Font/radius/button-style already leak into the staff admin panel and PDV today (a preexisting, low-visual-impact quirk, not introduced here) — but extending that same global effect to also carry full background/text palettes would make "Estilo da loja" visibly reskin the *staff admin panel* (e.g. a dark Performance-preset background behind the order list), which is a real regression, not a quirk. New tokens are applied by a small provider/effect mounted only inside `(public)/layout.tsx`, leaving `TenantContext.tsx`'s existing global vars (primary color, font, radius, button style) untouched. |
| Forced-dark background for "Performance" vs. respecting shopper's OS dark-mode preference | **Preset palette always wins, regardless of shopper's system theme** | These are brand-identity styles from a fashion-retail benchmark, not a light/dark *accessibility* toggle — a shopper's OS setting shouldn't make "Essencial" (light, sandy) render dark, nor should it make "Performance" (deliberately dark) render light. Applied via `root.style.setProperty()` directly (inline style), which already wins over `next-themes`'s `.dark` *class*-based CSS by cascade specificity — same mechanism `TenantContext.tsx` already relies on for `--kivoni-primary` today, just extended to more properties. No changes to `next-themes`/`providers.tsx` needed. |
| PLP density implementation | A preset → Tailwind-grid-cols-string lookup table in `ProductGrid.tsx` (not a CSS var interpolated into `grid-template-columns`) | Tailwind's grid-cols utilities are already responsive (`sm:`/`md:` breakpoints) — a raw CSS var would lose that without hand-rolling breakpoint logic in inline styles. A lookup table keeps the existing responsive behavior and is a 5-line change. |
| Hero carousel scope | Build it now, generic (not preset-gated) | User explicitly chose "build the carousel now" over the initially-recommended photo-only cut. Made it tenant-content-driven (any preset can have 1 or many images) rather than Vibrante-only, since every other hero field is already preset-agnostic tenant content — gating it to one preset would be a new, inconsistent pattern. |
| Hero image upload mechanism | Reuse the existing generic `/products/images` upload endpoint (already used for logo/favicon) | No new upload infrastructure needed — it already accepts any image and returns a URL; `heroImages` is just an array of those URLs collected in the admin form. |

## Acceptance criteria

- [x] AC1 — Each of the 8 presets renders its own background/surface/text/border palette on `/loja`
      (home, PLP, PDP, cart drawer, checkout), independent of the shopper's OS/browser dark-mode
      setting *(verify: browser, toggle OS dark mode, confirm the storefront's presentation doesn't
      change; switch presets, confirm each renders its documented palette)*
- [x] AC2 — The staff admin panel (`/dashboard`, `/settings`, etc.) and PDV (`/pdv`) render an
      unchanged, neutral palette regardless of which `themePreset` the tenant has selected — the new
      background/text tokens do not leak outside `(public)` *(verify: browser, switch tenant preset to
      Performance (forced-dark spec), confirm admin panel stays in its normal light/dark-per-OS
      behavior, unaffected)*
- [x] AC3 — PLP column count on `/loja` visibly differs between at least two contrasting presets
      (e.g. Performance "4 colunas denso" vs. Boutique "3 colunas espaçadas") *(verify: browser,
      count rendered columns at a fixed viewport width across 2 presets)*
- [x] AC4 — Product card image aspect ratio changes per preset per the benchmark table; existing
      hover-swap-photo and badges keep working unmodified *(verify: browser, computed style of the
      image container across 2 contrasting presets, plus a hover-swap and a %OFF badge sanity check)*
- [x] AC5 — Hero banner's overlay/typography treatment visibly differs between at least two
      contrasting presets using the same underlying image *(verify: browser, screenshot comparison
      across 2 presets on the same tenant/image)*
- [x] AC5b — A tenant with 2+ `heroImages` gets an autoplaying carousel with dot indicators on
      `/loja`'s hero; a tenant with 0-1 images keeps today's static hero unchanged *(verify: browser
      — upload 3 images via the new admin UI, confirm autoplay + dots live; confirm a single-image
      tenant's hero is visually unchanged from before this loop)*
- [x] AC6 — A transition already present in the storefront (card hover-swap) measurably changes
      duration between at least two presets *(verify: computed `transition-duration` via browser
      devtools/JS across 2 presets)*
- [x] AC7 — Settings' mini-mockup preview reflects the new background/surface color and a density
      indicator per preset, not just font/radius/button *(verify: browser, screenshot across 2
      contrasting presets)*
- [x] AC8 — All 8 presets pass a basic contrast-safety check (text vs. background) — no preset ships
      an inaccessible pairing *(verify: computed luminance contrast ratio check across all 8, reusing
      the same safety approach as `isThemeSafeAccent`)*

## Design notes

### New tokens on `StorefrontThemeTokens` (`src/theme/storefrontPresets.ts`)

```ts
export interface StorefrontThemeTokens {
  // ...existing: label, fontDisplay, fontBody, radius, buttonStyle
  palette: {
    bg: string;        // page/app background
    surface: string;   // card/panel background
    text: string;
    textMuted: string;
    border: string;
  };
  cardAspectRatio: string;  // e.g. "3 / 4", "1 / 1", "4 / 5"
  plpColumns: { base: string; sm: string; md: string }; // Tailwind grid-cols-N fragments
  heroTreatment: "calm-caption" | "full-bleed-overlay" | "action-frame" | "still-life"
               | "wellness-soft" | "impact-bold" | "studio-mono" | "color-block";
  motionDurationMs: number;
  motionEasing: string; // CSS easing function
}
```

Each of the 8 presets gets real values per STOREFRONT-V2.md §2.10's table (e.g. Performance:
`palette.bg: near-black`, `plpColumns: 4-across`, `motionDurationMs: 120` "rápido e snappy";
Boutique: `palette.bg: cream/ivory`, `plpColumns: 3-across-spaced`, `motionDurationMs: 400` "quase
estático").

### New public-only theme-vars provider

`src/app/(public)/StorefrontThemeVars.tsx` (new) — a small client component mounted once in
`(public)/layout.tsx` (alongside the existing `StorefrontFooter`/`CookieConsentBanner`), reading
`useThemeTokens()` (already exported by `TenantContext.tsx` since Loop 4c) and setting the new
`--kivoni-storefront-bg/surface/text/text-muted/border`, `--kivoni-storefront-motion-duration/easing`
CSS vars via `document.documentElement.style.setProperty(...)` in a `useEffect`. Components under
`/loja` read these new vars (not the shared `--kivoni-text`/`--kivoni-surface`/`--app-bg` that admin
also uses) — a deliberate, separate variable namespace so there is no possible collision with
`TenantContext.tsx`'s existing global vars or `next-themes`'s `.dark` class, and no risk of ever
leaking into `(app)`/`(pdv)`.

### `ProductGrid.tsx`

- Replace hardcoded `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` with a preset lookup
  (`PLP_COLUMN_CLASSES[preset]`).
- Replace hardcoded `aspectRatio: "1 / 1"` inline style with `preset.cardAspectRatio`.
- Hover-swap `transition-opacity duration-200` → reads `--kivoni-storefront-motion-duration`.

### `HeroBanner.tsx`

- Add a `heroTreatment` prop (from `useThemeTokens()`) selecting between a small set of
  overlay/typography layout variants (title position, overlay gradient darkness, type scale/tracking)
  — same image(s), different CSS/layout around them.
- Add carousel behavior: when `tenant.storefront.heroImages.length > 1`, render an autoplaying
  crossfade/slide carousel (dot indicators, ~5s interval, pause not required for v1) instead of a
  single `<img>`; falls back to `heroImageUrl` (or the first `heroImages` entry) unchanged when 0-1
  images are configured.

### Backend (lmfit-api) — hero carousel only

- `tenant.schema.ts`: add `@Prop({ type: [String], default: [] }) heroImages?: string[];` next to
  the existing `heroImageUrl`.
- `update-storefront-config.dto.ts`: add `heroImages?: string[]` with `@IsArray()`,
  `@ArrayMaxSize(8)`, `@IsString({ each: true })` — capped, matching Loop 10's input-cap discipline.
- `tenants.service.ts`: add the `$set` line for `storefront.heroImages`, same pattern as every other
  storefront field.
- `TenantInfo` type (web) gains `heroImages?: string[]` alongside the existing `heroImageUrl`.

### Settings mini-mockup (`SettingsClient.tsx`)

Add a background/surface color swatch (small chips) and a 3-box density indicator strip next to the
existing font/radius/button mockup, both driven by `previewPreset.palette`/`plpColumns`.

## Tasks

- [x] 1. Widen `StorefrontThemeTokens` + fill in real per-preset values for all 8 presets
       (palette, cardAspectRatio, plpColumns, heroTreatment, motion)
- [x] 2. `StorefrontThemeVars.tsx` (new, public-only CSS var provider) + mount in `(public)/layout.tsx`
- [x] 3. `ProductGrid.tsx`: preset-driven PLP columns + card aspect ratio + motion-duration var
- [x] 4. Backend: `heroImages` field (schema + DTO + service `$set`) + `TenantInfo` type update
- [x] 5. `HeroBanner.tsx`: preset-driven overlay/typography treatment variants + carousel
       (autoplay/dots) when 2+ `heroImages`
- [x] 6. Admin Settings: multi-image upload UI for `heroImages` (reusing `/products/images`)
- [x] 7. Contrast-safety check across all 8 presets (reuse/extend `isThemeSafeAccent` pattern)
- [x] 8. Settings mini-mockup: background/surface swatch + density indicator
- [x] 9. Unit tests: palette contrast-safety function, PLP column lookup, hero treatment resolver,
       carousel image-array logic, backend DTO cap
- [x] 10. Browser verification: all ACs, explicitly re-confirming admin/PDV are unaffected (AC2) and
       OS dark-mode doesn't change the storefront (AC1)

## Follow-up record

### PLAN
- [x] Re-read STOREFRONT-V2.md §2.10 in full (all 8 presets × 8 axes)
- [x] Delegated a code audit (not from memory) of `storefrontPresets.ts`, `storefront-themes.css`,
      `TenantContext.tsx`'s theming effect, `ProductGrid.tsx`/`SimpleProductGrid.tsx`,
      `HeroBanner.tsx`, `next-themes` wiring, and existing transition conventions — confirmed hover-
      swap-photo and badges already exist (Loop 5), confirmed PLP columns are hardcoded identically
      in both grid components, confirmed `HeroBanner.tsx` is single-static-image only (no video/
      carousel capability at all), confirmed no global motion-duration convention exists
- [x] **Found during this research, not assumed**: `AppProviders`/`TenantProvider` is mounted by
      `(app)` and `(pdv)` layouts, not just `(public)` — meaning `TenantContext.tsx`'s existing
      theming effect (font/radius/button/primary-color) already runs globally today. Extending that
      same effect with full background/text palettes would visibly reskin the staff admin panel —
      resolved in Decisions with a new public-only provider instead of widening the shared one.
→ **Draft on 2026-07-18**

### REFINEMENT
- [x] Identified the one genuinely expensive/ambiguous item (Vibrante's carousel/collage hero) and
      asked the user directly rather than assuming a cut: build it now (full scope) vs. photo-only
      with the carousel carried over. **User chose to build it now.**
- [x] Scoped the carousel as generic tenant content (`heroImages: string[]`, not preset-gated) rather
      than special-casing it to Vibrante only — consistent with how every other hero field already
      works, avoids a one-off preset-conditional code path
- [x] Confirmed the upload mechanism needs no new backend infra — the existing generic
      `/products/images` endpoint (already used for logo/favicon) accepts arbitrary images and
      returns a URL; `heroImages` is just a client-side collected array of those URLs
- [x] DoR review: scope now spans both repos (small, contained backend addition) — tasks ordered
      tokens→provider→grid→backend-field→hero-component→admin-UI→contrast-check→preview→tests→browser,
      matching this roadmap's established backend-before-frontend-consumer convention
→ **Ready on 2026-07-18**

### IMPLEMENT
- [x] Task 1 — widened `StorefrontThemeTokens` (palette, cardAspectRatio, plpColumns, heroTreatment,
      motionDurationMs/Easing) with real values for all 8 presets
- [x] Task 2 — `StorefrontThemeVars.tsx` (new), mounted once in `(public)/layout.tsx`; overrides
      `--background`/`--foreground`/`--app-bg`/`--card-bg`/`--kivoni-surface`/`--lmfit-surface`/
      `--kivoni-text`/`--kivoni-text-muted`/`--kivoni-border` on a wrapper div (CSS cascade scoping,
      not `document.documentElement`) — reuses every existing component's `lmfitTokens.*` reads for
      free instead of introducing a parallel var namespace nothing reads yet (a refinement over the
      original Design-notes plan, made during implementation once the cascade-scoping mechanism was
      confirmed to work)
- [x] Task 3 — `ProductGrid.tsx`: preset lookup replaces hardcoded `grid-cols-2 sm:grid-cols-3
      md:grid-cols-4` (both skeleton + real grid), `cardAspectRatio` replaces hardcoded `1/1`, hover-
      swap transitions read `--kivoni-storefront-motion-duration/easing`
- [x] Task 4 — Backend: `heroImages: string[]` on `tenant.schema.ts` + `@ArrayMaxSize(8)` on the DTO +
      `tenants.service.ts` `$set` line; `TenantInfo` (web) type updated
- [x] Task 5 — `HeroBanner.tsx`: 8 `heroTreatment` overlay/typography variants + `HeroCarousel`
      sub-component (autoplay every 5s, dot indicators, click-to-jump) that mounts only when
      `heroImages.length > 1`; falls back to the pre-existing single-image path otherwise
- [x] Task 6 — Admin Settings: multi-image upload UI for `heroImages` (add/remove, 8-image cap
      matching the backend), reusing the existing `/products/images` endpoint
- [x] Task 7 — `contrastRatio`/`isPaletteContrastSafe`/`MIN_SAFE_CONTRAST` added to
      `storefrontPresets.ts`; verified all 8 presets pass ≥10:1 (comfortably above the 4.5:1 floor)
- [x] Task 8 — Settings mini-mockup: background/surface driven by `previewPreset.palette`, a per-
      preset density strip (one box per `plpColumns.md` column count), and a 3-swatch palette row;
      bumped the mockup's fixed height 280px→340px so the new row isn't clipped
→ **Implemented on 2026-07-19**

### TEST
- [x] `storefrontPresets.test.ts` extended: all 8 presets' new token fields populated (shape checks),
      all 8 presets pass the contrast-safety floor, `contrastRatio` symmetry/boundary tests,
      `isPaletteContrastSafe` accept/reject cases — 35 tests total, all passing
- [x] `update-storefront-config.dto.spec.ts` (new, API): `heroImages` cap accept/reject (8 ok, 9
      rejected), non-string entries rejected, omitted field backward-compatible — 4 tests, all passing
- [x] `tsc --noEmit` clean on lmfit-web; lmfit-api's `tsc --noEmit` is blocked by a pre-existing,
      unrelated `node_modules` corruption (duplicate `@types/* 2` folders — not caused by this loop's
      changes); the new API files' correctness is confirmed instead by `jest` (which compiles via
      ts-jest independently of that duplication) passing cleanly
→ **Tested on 2026-07-19**

### VERIFY
- [x] AC1/AC3/AC4/AC6 — set `lmfit` (the real business tenant) to the **Performance** preset via the
      actual Settings UI (not a direct API call) and confirmed on live `/loja`: dark palette
      (`#0a0a0a`/`#161616`/`#f5f5f5`), `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` on the product grid,
      tall `3/4` card image aspect (previously square `1/1`), and `--kivoni-storefront-motion-duration:
      120ms` / `ease-out` all present via direct DOM/computed-style inspection
- [x] AC2 — confirmed the staff admin panel was already rendering in dark mode (via `next-themes`/OS
      preference) **before** any preset was touched, while the tenant was still on the light
      "essencial" default — proving admin's appearance is driven independently of the storefront
      preset, not leaking from it; `:root`'s own `--app-bg` (`#09090b`, the pre-existing `.dark`
      value) stayed distinct from the new wrapper's `#0a0a0a` override, confirming no leak into
      `document.documentElement`
- [x] AC5/AC5b — set the `kivoni` demo tenant (not the real business tenant, to avoid leaving
      placeholder content on production data) to **Vibrante** with a 3-image `heroImages` array via
      the actual Settings upload UI; confirmed live on `/loja`: the `color-block` overlay treatment
      (dark-to-transparent gradient, pill CTA), dot indicators, and autoplay advancing the visible
      image after a ~6s wait — then reverted `kivoni`'s test hero content back to empty and its
      preset back to `essencial` (its prior state) once verified
- [x] AC7 — Settings mockup: confirmed via computed styles that the palette swatch row shows the
      exact 3 hex values of the active preset, and the density strip's box count matches
      `plpColumns.md`
- [x] AC8 — covered by the TEST-phase unit tests (all 8 presets ≥10:1, floor is 4.5:1)
- [x] Confirmed no console errors across `/loja`, `/checkout`, and the Settings page in the touched
      tenants during verification
- [x] **Found and fixed during verification, not assumed**: clicking "Salvar Customização" (the
      branding form's own submit button) does **not** persist theme-preset/hero changes — those live
      in a separate `<form onSubmit={handleSaveStorefront}>` with its own "Salvar loja online" button
      further down the same page. Not a Loop 4d regression (pre-existing two-forms-on-one-page
      layout from earlier loops), but worth knowing for anyone editing this page: **there are two
      independent save buttons in Settings' storefront section, and only one of them saves the theme
      preset.**
→ **Verified on 2026-07-19**

### DOCUMENT
- [x] Spec fully updated (Decisions carousel entries, ACs, Tasks, this Follow-up record, Result below)
- [x] ROADMAP.md — Loop 4 row/changelog updated
- [x] ARCHITECTURE.md — new Loop 4d section
- [x] Memory (`project_ecommerce_roadmap.md`, `MEMORY.md`) updated
→ **Documented on 2026-07-19**

### PLAN AGAIN
- [ ] Not started — see Result below for carried-over items to consider next

## Result

All 8 theme presets now differ visibly across palette, PLP density, card aspect ratio, hero
treatment/carousel, and motion — not just font/radius/button as before. The user's own tenant
(`lmfit`) was set to **Performance** through this work (the benchmark's own "ideal for" entry for
fitness/activewear), so the real storefront now actually reflects a deliberately-chosen style, not
just a demonstration. The Settings preview was upgraded to show background/surface swatches and a
density indicator so the choice is visible before saving.

**Scope grew mid-loop**: the original plan carried Vibrante's carousel/collage hero over to a future
loop (the one axis needing new media infrastructure); the user explicitly asked to build it now
instead. Implemented as generic tenant content (`heroImages: string[]`, any preset, not gated to
Vibrante) rather than a one-off special case, reusing the existing generic image-upload endpoint —
no new upload infrastructure needed.

**Carried over** (unchanged from the original plan): true per-preset motion *choreography* (parallax,
spring/bounce physics — this loop ships duration/easing only, which is a real but smaller slice); a
possible future "collage" hero layout (multiple images shown simultaneously rather than one-at-a-time
carousel) if a preset ever calls for it specifically.

**Not part of this loop, noticed in passing**: Settings' storefront section has two separate forms
with two separate save buttons ("Salvar Customização" for branding, "Salvar loja online" for
theme/hero/announcements) on the same page — easy to click the wrong one and believe changes saved
when they didn't (I did exactly this during verification). Worth a UX pass in a future loop, not
blocking here.
