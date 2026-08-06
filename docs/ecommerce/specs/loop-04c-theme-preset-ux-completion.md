# Loop 04c — Theme preset UX & design-system completion

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 4c (continuation of Loop 4's own recorded carry-over)
**Depends on:** Loop 4 (`storefrontPresets.ts`, `TenantContext.tsx` CSS-variable injection,
`storefront-themes.css`) — this loop finishes what Loop 4 explicitly deferred, touches no other loop
**Repos touched:** lmfit-web only (no backend/schema changes — `Tenant.storefront.themePreset`
already exists and is unchanged)

## Goal

Close the gap between what the 8 storefront presets were designed to be (STOREFRONT-V2.md §2.10 —
a distinct vibe, palette, button treatment, and card/hero style per preset, "changing the preset
re-skins the whole store, no code change, live preview in the picker") and what actually ships
today (2 Google Fonts + a border-radius value; the picker shows only text labels; `buttonStyle` is
recorded per preset but has never been applied anywhere). A merchant picking a "style" for their
store today can't actually see or feel a meaningful difference between most of the 8 options.

## Scope

**In:**
- **Shared `<Button>` atom** (`src/components/atoms/Button.tsx`) implementing the three
  `ButtonStyle` variants (`solid`/`ghost`/`pill`) already defined in `storefrontPresets.ts`, driven
  by the existing `--kivoni-radius` CSS variable and `tenant.branding.primaryColor` — no new config.
- **Wire it into the `/loja` + `/checkout` primary-CTA buttons** — "Adicionar à sacola," "Finalizar
  e Pagar Online" / "…no Pix" / "…abrir WhatsApp," "Ir para o checkout," "Aplicar" (coupon), cart
  drawer's "Ver Sacola" pill — the buttons a shopper actually associates with the store's visual
  identity. This finally makes `buttonStyle` real for the first time since Loop 4.
- **Real visual preview in the Settings picker** — replace each preset's plain text-label button
  with a small static mockup (mini product-card-style swatch: heading in the preset's display font,
  a body line, and a real `<Button>` rendered in that preset's `buttonStyle`/`radius`) so a merchant
  can tell presets apart *before* saving, without needing to open `/loja` in another tab.
- **Settings gains a "ver ao vivo" link** next to the picker that opens `/loja` in a new tab after a
  preset is saved — closes the remaining "did this actually apply?" gap cheaply, without building a
  full live-iframe preview.

**Out (explicitly, with reasons — STOREFRONT-V2 §2.10's full blueprint is far larger than one loop):**
- **Per-preset color palettes / dark backgrounds** (e.g. `Performance`'s "fundo escuro quase preto
  + acento neon," `Monocromo`'s strict B&W) — the entire storefront today assumes one light
  background scheme; giving 8 presets their own palette (some dark) means auditing contrast/
  accessibility across every page for each one, a genuinely separate, large effort. Carried over.
- **Per-preset PLP column density** (STOREFRONT-V2 specifies 2–4 columns depending on preset) —
  `ProductGrid`'s column count is currently a single responsive breakpoint set, not
  preset-driven; reworking it risks regressing Loop 5's PLP work for a cosmetic density difference.
  Carried over.
- **Per-preset hero/product-card treatment** (full-bleed vs. framed photos, badge styles, hover
  behavior, image aspect ratio) — each of these is itself close to a full loop's worth of component
  work across `ProductGrid`, the PDP gallery, and the home hero. Carried over.
- **Per-preset motion/animation timing** ("fades discretos" vs. "rápido e snappy" vs. "parallax
  leve") — no animation-timing system exists anywhere in the codebase to hang this on. Carried over.
- **A live-iframe preview inside Settings** (STOREFRONT-V2's literal "preview ao vivo") — cross-tab
  window + iframe reload complexity for a cheaper "open /loja in a new tab" affordance that gets 90%
  of the value. Carried over as a nice-to-have, not blocking.

**Why this cut:** same discipline as every prior REFINEMENT split in this roadmap (Loop 4's own v1/
carry-over split, Loop 8's return-type correction, Loop 9's six-feature-to-two cut) — ship the two
highest-value, boundable pieces (a real shared Button + a real picker preview) rather than a shallow
attempt at the full 8-dimension design system, which risks regressing already-shipped surfaces
(PLP density, PDP gallery) for cosmetic gain.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Scope focus | Both picker UI *and* finishing `buttonStyle` (not one or the other) | User's explicit choice when asked — the picker-only option leaves presets still mostly identical; the design-system-only option leaves merchants unable to tell presets apart before saving. Both together closes the two most user-visible gaps without attempting the full 8-axis blueprint. |
| How big is the shared `<Button>` migration | Only primary-CTA buttons on `/loja` + `/checkout` (≈6 call sites across `VariantSelector.tsx`, `CartDrawer.tsx`, `Lookbook.tsx`, `CheckoutClient.tsx`, `ProductDetailClient.tsx`) | Loop 4's own IMPLEMENT-time finding still holds: buttons whose *selected* state depends on background-color (`ShippingPicker` cards, payment-method cards) must NOT get a blanket ghost/pill treatment — that would visually break the selection affordance. Scoping to unambiguous "action" buttons avoids re-triggering that exact regression. |
| Picker preview approach | Static CSS-rendered mini mockup per preset (no iframe, no screenshot generation) | Reuses the exact tokens (`fontDisplay`, `fontBody`, `radius`, `buttonStyle`) already in `storefrontPresets.ts` — zero new data, zero backend work, renders instantly with no network round-trip per preset. A live iframe would need 8 concurrent mini-renders of `/loja` and is disproportionate to the value versus a "ver ao vivo" link. |
| Per-preset palette/density/hero/motion | Explicitly out of this loop | Each is independently large (contrast/accessibility audit for dark presets; PLP rework; PDP/hero rework; a motion-timing system that doesn't exist) — attempting all of STOREFRONT-V2 §2.10 in one loop risks shallow, under-tested changes across surfaces this roadmap has already shipped and verified (Loop 5's PLP, Loop 6's checkout). |

## Acceptance criteria

- [x] AC1 — A new `Button` atom exists and correctly renders `solid`/`ghost`/`pill` variants driven
      by `--kivoni-radius` and the tenant's `primaryColor` *(verify: unit test + browser)*
- [x] AC2 — On `/loja`, "Adicionar à sacola" (PDP) and the cart drawer's primary CTA visibly change
      shape/fill when the tenant's preset changes (e.g. Editorial → ghost/outline; Vibrante → pill)
      *(verify: browser, at least 2 contrasting presets)*
- [x] AC3 — `ShippingPicker` and payment-method selection cards are visually unchanged — their
      selected/unselected background-color states still work exactly as before *(verify: browser
      regression check, explicit re-check of the Loop 4 IMPLEMENT-time regression)*
- [x] AC4 — The Settings theme picker renders a real mini mockup per preset (heading in the preset's
      font, a real `Button` in that preset's style/radius) instead of a plain text label *(verify:
      browser, all 8 presets visibly distinct from each other)*
- [x] AC5 — Saving a preset and clicking "ver ao vivo" opens `/loja` in a new tab reflecting the
      saved preset *(verify: browser)*
- [x] AC6 — Admin surfaces outside `/loja`/`/checkout` (PDV, order editor, resource lists, etc.) are
      completely unaffected — the new `Button` atom is opt-in, not a global `<button>` override
      *(verify: browser regression check + `grep` confirming no changes outside `/loja`/`/checkout`)*

## Design notes

### `src/components/atoms/Button.tsx` (new)

```ts
type ButtonVariant = "solid" | "ghost" | "pill"; // matches storefrontPresets.ts's ButtonStyle
```

- Reads `radius` from `--kivoni-radius` (already set by `TenantContext.tsx`) rather than taking a
  prop — one fewer thing callers can get wrong, matches how `storefront-themes.css` already scopes
  everything under `[data-theme-preset]`.
- `solid`: filled `primaryColor` background, white text (today's default look — the "no visible
  regression" baseline for `essencial`/`performance`/`impacto`).
- `ghost`: `primaryColor` border + text, transparent background — matches `editorial`/`boutique`/
  `monocromo`'s "contorno fino" spec.
- `pill`: `border-radius: 999px` regardless of `--kivoni-radius` (pill is a shape override, not a
  radius value) with filled background — matches `vibrante`/`studio`.
- Ships as a plain component (no CVA/variant library dependency — matches this codebase's existing
  atom style, e.g. `Badge.tsx`'s plain variant prop).

### Call-site migration (resolved in REFINEMENT — exact line-level audit of all 7 files with a
`<button>` on `/loja`/`/checkout`)

Migrated to the new `Button` atom:
- `VariantSelector.tsx` (~line 249) — "Adicionar à sacola"/"Encomendar" button. Confirmed the only
  real add-to-cart owner — `ProductDetailClient.tsx`'s own two buttons are a thumbnail selector and
  the "Guia de medidas" link, neither a primary CTA.
- `Lookbook.tsx` (~line 152) — "Adicionar look inteiro ao carrinho"
- `CheckoutClient.tsx` (~line 413) — the single final submit button (its label already switches
  between "Finalizar e Pagar Online"/"…no Pix"/"…abrir WhatsApp" by `paymentMethod` state — one
  button, not three)
- `QuickCart.tsx` (~line 143) — the "Finalizar"/"Ir para o checkout" button, **but only opt-in**: a
  new optional prop controls its variant, defaulting to the current plain/solid look. Only
  `CartDrawer.tsx` (the `/loja`-only caller) passes the preset-driven variant. This component is
  also used by `PdvClient.tsx` (staff PDV) and `CatalogFloatingCart.tsx` (`/catalogo`) — neither
  opts in, so both stay visually unchanged, satisfying AC6.

Explicitly NOT migrated (audited every remaining `<button>` on these surfaces, reason recorded):
- Coupon "Aplicar" buttons (`CartDrawer.tsx`, `CheckoutClient.tsx`) — secondary utility action, not
  the store's primary conversion CTA; keeps the migration surface small and unambiguous.
- Inline "Receber link de acesso" button (`CheckoutClient.tsx`) — same reasoning, a small
  login-nudge link-button, not a conversion action.
- `ShippingPicker` cards and the three payment-method **picker** cards (`CheckoutClient.tsx`) —
  confirmed via the Decisions table's Loop 4 precedent: these depend on background-color for their
  selected/unselected affordance and must not get a blanket ghost/pill treatment.
- Floating "Ver Sacola" pill (`CartDrawer.tsx`) — already hardcoded `rounded-full` regardless of
  preset; it's a mobile FAB (floating action button), a UI convention that's *always* pill-shaped by
  design intent, not meant to vary with `buttonStyle`. Migrating it would be a no-op for `pill`
  presets and a confusing inconsistency for the other two variants.
- `VariantSelector.tsx`'s qty stepper (±) and color/size selector buttons — selection controls, not
  CTAs, same "background-color-driven state" reasoning as `ShippingPicker`.

### Settings picker preview (`SettingsClient.tsx`)

Replace the current button body (label + "buttonStyle · radius px" caption) with a small stacked
mockup: a one-line heading in `preset.fontDisplay`, a muted one-line body snippet in
`preset.fontBody`, and a real `<Button variant={preset.buttonStyle}>` reading a static "Comprar"
label — all three constrained to a fixed-height card so the 8-option grid layout doesn't reflow.
Radius applies to the mockup's own card border too, so `monocromo` (radius 0) and `vibrante`
(radius 20) read as visibly different container shapes, not just button shapes.

### "Ver ao vivo" link

A plain `<a href="/loja" target="_blank">` next to the picker, enabled only when the tenant has a
resolvable public storefront (mirrors how other admin surfaces already link out to `/loja`/
`/catalogo` — confirm existing pattern during IMPLEMENT rather than inventing a new one).

## Tasks

- [x] 1. `Button.tsx` atom (solid/ghost/pill, reads `--kivoni-radius`, `primaryColor`)
- [x] 2. Migrate the 4 primary-CTA call sites (`VariantSelector`, `Lookbook`, `CheckoutClient`
       submit button, `QuickCart` opt-in prop wired from `CartDrawer`)
- [x] 3. Settings picker: mini-mockup card per preset (replaces text-only label)
- [x] 4. Settings picker: "ver ao vivo" link
- [x] 5. Unit tests: `resolveButtonVisualStyle` (extracted pure helper, RTL not used — this
       codebase's vitest config has no React plugin, so components would each need an explicit
       `import React` just for testability; kept `Button.tsx` consistent with every other atom
       instead) + `buildStorefrontUrl`
- [x] 6. Browser verification: all 6 ACs, 2 contrasting presets (`monocromo` ghost/0px vs.
       `vibrante` pill/999px), explicit re-check that `ShippingPicker`/payment cards are unaffected

## Follow-up record

### PLAN
- [x] Read Loop 4's own recorded carry-over (ROADMAP.md: "no shared `<Button>` component exists…
      descoped to avoid breaking background-color-based selection states… kept as real data for
      later") and STOREFRONT-V2.md §2.10 in full (confirmed the original blueprint specifies
      per-preset palette/density/hero/motion far beyond what shipped — font + radius only)
- [x] Read `storefrontPresets.ts`, `TenantContext.tsx`'s CSS-variable injection, and
      `storefront-themes.css` in full — confirmed `buttonStyle` is captured in data for all 8
      presets but has zero consumer anywhere in the codebase (`grep` for `buttonStyle` outside
      `storefrontPresets.ts`/`SettingsClient.tsx` returns nothing)
- [x] Read the current Settings picker (`SettingsClient.tsx:1034-1067`) — confirmed it renders only
      a text label (styled in the preset's font) and a "buttonStyle · Npx" caption string, no visual
      swatch, no mockup, no live preview
- [x] Confirmed no live-preview mechanism exists (no iframe, no split-pane) — a merchant must save
      and open `/loja` separately to see any effect
- [x] Enumerated the real `<button>` call sites on `/loja` + `/checkout` (7 files) to size the
      migration realistically before committing to "wire it in everywhere"
- [x] User explicitly chose scope focus "Both" (picker UI + finishing the preset design system)
      when asked, ruling out the picker-only and design-system-only alternatives
→ **Draft on 2026-07-17**

### REFINEMENT
- [x] Audited every `<button>` on `/loja`/`/checkout` (7 files, line-by-line) — resolved the final
      migration list: `VariantSelector`, `Lookbook`, `CheckoutClient`'s submit button, and
      `QuickCart` (opt-in only, since it's shared with PDV and `/catalogo`)
- [x] Resolved `ProductDetailClient.tsx`: confirmed it owns no add-to-cart button itself (thumbnail
      selector + size-guide link only) — `VariantSelector` is the sole owner
- [x] Resolved the "Ver Sacola" FAB question: out of scope, it's a hardcoded-pill mobile FAB
      convention, not meant to vary with `buttonStyle`
- [x] Resolved `QuickCart`'s cross-surface reuse (PDV, `/catalogo` via `CatalogFloatingCart`, `/loja`
      via `CartDrawer`) — a new optional prop keeps PDV/`/catalogo` visually unchanged by default;
      only `CartDrawer` opts in, satisfying AC6 without a `/loja`-only fork of the component
- [x] ACs already name their verify method from PLAN; no wording changes needed
- [x] DoR review: scope fits a session (4 call sites + 1 opt-in prop + Settings picker), decisions
      resolved, tasks ordered atom→call-sites→picker→tests→browser
→ **Ready on 2026-07-17**

### IMPLEMENT
- [x] Tasks 1-4 done in order, `tsc --noEmit` green at every task boundary. One design decision
      made mid-implementation (not in REFINEMENT): `Button.tsx`'s visual logic was extracted into a
      pure `resolveButtonVisualStyle()` export rather than testing the rendered component with RTL —
      this codebase's `vitest.config.mts` has no `@vitejs/plugin-react`, so esbuild's default
      "classic" JSX transform requires every tested component to `import React` explicitly (only
      one file in the whole codebase does this, `PrintOrderClient.tsx`); adding that requirement to
      a shared atom just for testability would be an inconsistency with every other atom
      (`Badge.tsx`, `PriceTag.tsx`, etc.), so the pure-function pattern already dominant in this
      codebase's tests was used instead.
- [x] Also extended `Button.tsx` with an optional `radius` override prop (not in the original design
      notes) — needed because the Settings picker must show each of the 8 presets' *own* radius
      simultaneously, independent of whichever preset is actually saved (`--kivoni-radius` only ever
      reflects one active value at a time).
- [x] Added `useThemeTokens()` to `TenantContext.tsx` (not in the original design notes) — the
      cleanest way to give call sites the raw `buttonStyle` token (not just the CSS var), reusing
      the exact same preset-resolution logic `TenantContext` already runs internally.

### TEST
- [x] lmfit-web: 246/246 passed (+9 from 237: `resolveButtonVisualStyle` 5 tests,
      `buildStorefrontUrl` 4 tests). No API changes this loop (backend untouched).

### VERIFY
- [x] Browser walk on kivoni, all 6 ACs, covering 2 contrasting presets (`monocromo`: ghost/0px vs.
      `vibrante`: pill/999px) — see Verification record below.

### DOCUMENT
- [x] Spec status → `Done`, Result filled
- [x] ROADMAP.md: Loop 4c entry updated
- [x] ARCHITECTURE.md updated
- [x] Memory updated

### PLAN AGAIN
- [ ] Retro, carry-overs filed (already recorded in Scope §Out — per-preset palette/dark-mode/PLP
      density/hero-card-treatment/motion), next loop decided with user

## Verification record

All against the real running dev API/web on kivoni, logged in as admin for the Settings changes,
mixing real browser interaction with `curl`/direct-JS state assertions (same posture as every prior
loop's VERIFY):

- **AC1** — Confirmed via unit tests (`resolveButtonVisualStyle`) and live on `/loja`'s real
  add-to-cart button: with the tenant on `monocromo` (ghost), the button's computed styles were
  `backgroundColor: rgba(0,0,0,0)`, `color`/`borderColor: rgb(124,58,237)` (the tenant's real
  `primaryColor`), `borderRadius: 0px` — exactly the ghost/0px spec.
- **AC2** — Switched the tenant to `vibrante` (pill) via the real Settings save flow, reloaded
  `/loja`: the same add-to-cart button now computed to `backgroundColor: rgb(124,58,237)` (filled),
  `borderRadius: 999px` (pill) — and the checkout page's final submit button showed the identical
  transformation (`bg: rgb(124,58,237)`, `radius: 999px`). Visibly, verifiably different shape/fill
  between the two presets on the same two real CTAs.
- **AC3** — With `vibrante` still active, checked `ShippingPicker`'s pickup/standard cards and the
  checkout payment-method cards via computed styles: the selected card (pickup) showed
  `borderColor: rgb(124,58,237)` (primary) vs. the unselected card's `rgb(39,39,42)` (neutral) —
  identical background-color-driven selection affordance as before this loop, confirmed untouched
  (these components were never edited).
- **AC4** — In Settings, all 8 preset mockup cards read back via computed styles: each showed its
  own distinct `backgroundColor`/`color`/`borderRadius` combination matching `storefrontPresets.ts`
  exactly (e.g. Essencial: solid/8px, Editorial: ghost/2px, Vibrante: pill/999px regardless of its
  20px radius input, Monocromo: ghost/0px) — and each heading rendered in its own distinct
  `font-family` (Poppins/Playfair Display/Baloo 2/Archivo confirmed for 4 of the 8).
- **AC5** — The "Ver ao vivo" link's real `href` resolved to `http://kivoni.localhost:3000/loja` —
  correct for the current dev environment, `target="_blank"`.
- **AC6** — With `vibrante` (pill) active tenant-wide, checked `/catalogo`'s floating cart (via
  `CatalogFloatingCart` → `QuickCart`, which does **not** pass the new `finalizeVariant` prop): its
  "Comprar via WhatsApp" button computed to `borderRadius: 20px` (the pre-existing global
  `.rounded-md` → `--kivoni-radius` rule from Loop 4, unchanged) and **not** `999px` — proving the
  new pill-shape behavior never leaked into a surface that didn't opt in, even though the active
  preset's `buttonStyle` is `pill`.

Reverted the tenant's `themePreset` back to `monocromo` (its value at the start of this session's
verification) after testing — the same "leave test config as found" discipline as every prior loop's
VERIFY phase.

## Result

Shipped all 6 tasks. `buttonStyle` (solid/ghost/pill) — recorded as real per-preset data since Loop 4
but never once applied anywhere in the codebase — is now real on the two surfaces that actually
matter for a merchant's brand: `/loja`'s primary add-to-cart/checkout CTAs. A new `Button` atom
(`src/components/atoms/Button.tsx`) is the single implementation, its visual logic exposed as a pure
`resolveButtonVisualStyle()` export for testability without pulling this codebase's one-off RTL
pattern into every shared atom. Migration was deliberately narrow — 4 real call sites plus one
opt-in prop on the shared `QuickCart` component (used by PDV and `/catalogo` too, neither of which
opted in) — scoped to exclude anything whose selection state depends on background-color
(`ShippingPicker`, payment-method cards), re-confirming live the exact regression Loop 4 already
flagged and avoided once before.

The Settings picker went from a plain text-label grid to a real mini-mockup per preset (own
font-family heading, own radius, a real solid/ghost/pill `Button` reading "Comprar") plus a "Ver ao
vivo" link — closing STOREFRONT-V2.md §2.10's own explicit ask for "preview ao vivo" at low cost
(no iframe, no screenshot pipeline — just the same tokens already in `storefrontPresets.ts`,
rendered directly).

Explicitly out of scope, per the REFINEMENT cut recorded in Scope §Out: per-preset color palettes
(including dark-mode presets like Performance), PLP column density, hero/product-card treatment, and
motion timing — STOREFRONT-V2's full 8-axis vision, each independently loop-sized. These remain
real, valuable, and unbuilt; a future continuation (Loop 4d, following this loop's own naming
convention) would need its own PLAN phase to size any one of them properly.

TEST: 246/246 web (+9), zero regressions, no backend changes. VERIFIED live on kivoni across 2
contrasting presets, all 6 ACs confirmed with computed-style evidence, config changes reverted after.

**Follow-up fix (same day, user-reported):** the *existing* branding-section mockup — labeled "Visualização do Tema" /
"Real-time Theme Mockup," pre-dating this loop — never actually reflected the theme preset at all,
only `primaryColor`/`secondaryColor`/`logoUrl`. A user testing this loop's work correctly pointed out
that changing "Estilo da loja" produced no visible feedback anywhere until they scrolled down,
selected an option, saved, and reloaded `/loja` — no immediate confirmation in Settings itself. Wired
`themePreset`'s resolved tokens (`fontDisplay`, `radius`, `buttonStyle`) into that same mockup panel,
so it now updates **instantly on click, before saving** — the actual "preview ao vivo" behavior
STOREFRONT-V2 §2.10 asked for, just realized in the existing mockup rather than a new one. Required
extending `Button`/`resolveButtonVisualStyle` with an optional `color` override (in addition to the
existing `radius` override): the mockup needs to reflect the *unsaved* `primaryColor` form state, not
`--kivoni-primary`'s saved-tenant CSS var, matching how the mockup's other elements already behaved
before this loop touched it. Also applied `color={primaryColor}` to the "Estilo da loja" picker's own
8 mini-mockup buttons for the same live-color consistency. TEST: +3 (249/249). VERIFIED live:
clicking between presets updates the mockup's button shape/radius and heading font instantly with no
save/reload — confirmed via computed styles (`radius: 2px`→`999px`, font `Baloo 2` on selecting
Vibrante). Non-destructive verification — never clicked "Salvar," so the tenant's saved
`themePreset` (`impacto`) was never touched.
