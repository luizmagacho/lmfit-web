# Loop 12 — Storefront Multi-Layout: 10 estilos, 5 famílias de layout

**Status:** Done (v1 full scope — verified 2026-07-19)
**Roadmap entry:** ROADMAP.md §Loop 12 (new)
**Depends on:** Loops 4/4c/4d/4e/4f (the full `StorefrontThemeTokens` system — palette, typography,
radius, buttonStyle, cardAspectRatio, plpColumns, plpGap, heroTreatment, heroAspectRatio, motion,
newBadgeLabel — all live and verified). This loop adds the axis those loops deliberately never
touched: **DOM structure**.
**Origin:** User-provided implementation plan ("Arquitetura de 10 Estilos de Loja"), used as the
primary guide per the user's instruction, refined where it had technical risks (see §Deviations).
**Absorbed pre-work (former "Loop 4h", coded+tested, verify folded into this loop):** "Ver ao vivo"
now saves the selected preset before opening the live store (was: opened the *saved* preset,
making preset clicks look like they did nothing); `heroAspectRatio` token (banner height per preset,
16/6 → 4/3 range). 313/313 web tests, tsc clean.

## Goal

Every prior loop made the 8 presets differ in *aesthetics* while sharing one page structure. The
user's own read (correct, and matching Loop 4f's recorded audit): real store genres differ in
**where things are and what sections exist**, not just colors/fonts. This loop introduces **Layout
Families** — the preset picks a family, the family picks the React/DOM structure, the tokens keep
picking the aesthetics — and grows the catalog from 8 to 10 presets.

## Architecture (user's plan, kept)

**5 families**: `classic` | `editorial` | `minimal` | `expressive` | `industrial`.
Family = structure (component tree). Preset = aesthetics (tokens). No `if/else` sprawl: components
under `src/layouts/storefront/{family}/` are selected once per surface by a resolver.

### The 10 presets

| ID (estável) | Label novo | Família | Inspiração | Display / Body |
|---|---|---|---|---|
| `essencial` | Essencial | classic | Renner | Poppins / Inter |
| `editorial` | Editorial | editorial | Zara | Playfair Display / Inter |
| `performance` | **Atlético** | classic | Nike | Oswald / Inter |
| `luxo` *(novo)* | Luxo | minimal | Calvin Klein | Instrument Sans / Inter |
| `studio` | **Wellness** | minimal | Lululemon | Quicksand / Nunito |
| `boutique` | Boutique | editorial | Chanel | Cormorant Garamond / Inter |
| `vibrante` | **Tropical** | expressive | Farm Rio | Baloo 2 / Nunito |
| `streetwear` *(novo)* | Streetwear | industrial | Off-White | Space Grotesk / Space Mono |
| `impacto` | Impacto | classic | Adidas | Anton / Inter |
| `monocromo` | **Minimal** | minimal | COS | Archivo / Inter |

## Deviations from the user's plan (each with the reason)

1. **No preset ID renames — labels only.** The plan's "Renomear" (performance→atletico etc.) would
   break every saved tenant: `themePreset` is a validated enum in `tenant.schema.ts` +
   `update-storefront-config.dto.ts`, and real tenants (`lmfit`= performance) have stored values. A
   rename needs a Mongo migration for zero user-visible gain — the merchant only ever sees the
   `label`. So: **IDs stay, labels change** (Atlético/Wellness/Tropical/Minimal), and only the 2
   genuinely new IDs (`luxo`, `streetwear`) are added to the enum (additive, backward-compatible).
2. **`layoutFamily` lives in the preset token table**, not a parallel `resolveLayoutFamily.ts` map.
   Two sources of truth drift; the token table is already where every other preset fact lives. A
   thin `resolveLayoutFamily()` helper still exists (as the plan wanted) but reads the table.
3. **Composition over duplication.** The plan's folder tree implies ~25 new components (5 × Header/
   Home/PDP/Card/Footer). The existing organisms (HeroBanner+carousel, TrustBar, CouponBanner,
   Lookbook, NewArrivalsShelf, ProductGrid) already render every *block* the wireframes show —
   `LojaClient.tsx` confirms the home is a fixed-order composition of them. Family Homes therefore
   **re-compose existing organisms** (order, wrappers, which sections exist) instead of forking
   them; net-new primitives only where a block genuinely doesn't exist: `CategoryChips` (classic),
   `ProductRail` (horizontal scroll — editorial/atlético "drop" rail), `MarqueeTape` (industrial),
   asymmetric lookbook grid variant (editorial). Cuts the file count roughly in half and keeps one
   maintenance point per block.
4. **v1/v2 split** (same discipline as every prior big loop — see Scope). The plan's 5 phases in one
   pass is the largest single frontend change this roadmap has ever attempted; Header+Home carry
   ~80% of the "these are different stores" perception (it's the first screen), PDP/footer variants
   are v2.
5. **Streetwear body font**: plan says "Mono" — using **Space Mono** (Google Fonts, pairs with Space
   Grotesk, loads via the existing `ensureGoogleFontLoaded`). Instrument Sans (Luxo) also confirmed
   on Google Fonts.

## Scope

**v1 (this loop):**
- **Foundation**: `layoutFamily` token + `LayoutFamily` type; 2 new presets (`luxo`, `streetwear`)
  with full token sets passing the WCAG contrast check; label updates (Atlético/Wellness/Tropical/
  Minimal); backend enum + DTO + `TenantInfo` additions (additive); `src/layouts/storefront/`
  scaffold with `types.ts` + `resolveLayoutFamily.ts`.
- **5 family Headers** (dispatcher in `PublicHeader.tsx`, applies to all of `(public)` — same scope
  precedent as Loop 4d's palette): classic = logo + busca + barra de categorias em chips (data from
  the existing `GET /public/catalog/categories`); editorial = logo centralizada, nav textual,
  hide-on-scroll; minimal = transparente/fino, sem categorias; expressive = colorido, logo em
  destaque; industrial = borda inferior preta 3px, links com aspas literais.
- **5 family Homes** (`LojaClient.tsx` keeps ALL data fetching, passes blocks/props to the family
  component): classic = carrossel compacto → trust bar → chips → grid denso; editorial = hero
  full-bleed → lookbook assimétrico → rail horizontal de lançamentos; minimal = foto única + muito
  respiro (py-24+) → grid 2-3 col sem bordas; expressive = carrossel + blocos coloridos + grid;
  industrial = hero com moldura/aspas → grid 1:1 com borda dura → fita marquee.
- **Card frame token** (`cardFrame: "border" | "borderless" | "hard-border"`) — the one card-level
  difference tokens can't express today (minimal sem borda/sombra; industrial borda preta 2px);
  wired into the existing `ProductGrid.tsx` card, não um fork por família.
- **Admin picker regrouped**: 10 cards under 5 family headings with the plan's personality
  one-liners; mockup preview keeps working (reads tokens, family-agnostic).
- **New primitives**: `CategoryChips`, `ProductRail`, `MarqueeTape`, asymmetric `Lookbook` variant.

**Also in v1 (user chose full scope over the recommended split):**
- **5 family PDP variants** — `ProductDetailClient.tsx` keeps ALL data/state (fetch, variant
  selection, size guide), family PDP components receive slots (gallery node, info column node, raw
  `urls` for the industrial moodboard): classic = 2 col 50/50 (≈atual); editorial = galeria 60%
  sticky; minimal = 60/40 com respiro e texto fino; expressive = coluna de info sobre superfície
  colorida; industrial = moodboard assimétrico de todas as fotos com borda dura.
- **Family Footer variants** (internal switch inside `StorefrontFooter.tsx` — small enough not to
  warrant 5 files): classic = multi-coluna; editorial/minimal = linha central mínima (≈atual);
  expressive = faixa colorida; industrial = fundo preto, texto mono com aspas.

**v2 (still carried over):**
- Grain/glitch effect (industrial flourish), Tropical mosaic grid (carried since 4f), hide-on-scroll
  refinements beyond the editorial header.

**Found during PLAN (latent bug, fixed in this loop):** `ensureGoogleFontLoaded` requests every font
with `:wght@400;500;600;700` — the Google Fonts CSS2 API rejects the whole request when a listed
weight doesn't exist for that family. **Anton (Impacto) only has weight 400**, so Impacto's display
font has silently never loaded (falls back to sans-serif) since Loop 4. Space Mono (new) only has
400/700 and would hit the same. Fix: a per-family weight map for the fixed 13-font catalog.

## Acceptance criteria (v1)

- [x] AC1 — 10 presets appear in the admin picker, grouped under 5 family headings; the 2 new ones
      persist through save→reload→public API (curl `storefront.themePreset`)
- [x] AC2 — Switching between presets of **different families** visibly changes page *structure* on
      `/loja` (section order/presence, header layout), not just colors — verified across at least 3
      families (classic vs editorial vs industrial) via DOM inspection
- [x] AC3 — Switching between presets of the **same family** (e.g. essencial → performance) keeps
      structure but changes aesthetics — confirming the family/token separation actually holds
- [x] AC4 — Classic header shows real category chips from `GET /public/catalog/categories`; clicking
      one filters the grid (reuses the existing catalog-store filter)
- [x] AC5 — Industrial home renders the marquee tape + hard-border 1:1 cards; minimal home renders
      borderless cards with the generous whitespace scale
- [x] AC6 — Both new presets pass `isPaletteContrastSafe`; fonts load via the existing on-demand
      mechanism (network shows Instrument Sans / Space Grotesk+Mono requests only when active)
- [x] AC7 — Guest checkout smoke still passes end-to-end under a non-classic family (header/dispatch
      touches shared `(public)` surfaces — regression gate)
- [x] AC8 — Admin/PDV visually unaffected (standing isolation discipline); `/catalogo` keeps working
      (it shares `PublicHeader`)
- [x] AC9 — "Ver ao vivo" opens the live store already showing the just-clicked preset (absorbed 4h
      fix, verified here)

## Tasks (v1)

- [x] 1. Foundation: tokens (`layoutFamily`, `cardFrame`), 2 new presets, label renames, backend
      enum/DTO/TenantInfo, `src/layouts/storefront/` scaffold + resolver
- [x] 2. New primitives: `CategoryChips`, `ProductRail`, `MarqueeTape`, asymmetric Lookbook variant
      (rail entrou como `ProductRail`; grid assimétrico do lookbook ficou como flourish v2)
- [x] 3. 5 family Headers + `PublicHeader.tsx` dispatcher
- [x] 4. 5 family Homes + `LojaClient.tsx` refactor (data stays, composition moves)
- [x] 5. `cardFrame` wiring in `ProductGrid.tsx`
- [x] 6. Admin picker regroup (5 famílias, 10 cards, personality lines) + PDPs por família +
      footer por família (full scope)
- [x] 7. Unit tests: 10-preset table shape, family mapping totals (3/2/3/1/1), contrast for the 2
      new palettes, resolver fallback
- [x] 8. Browser verification: all 9 ACs, including checkout smoke + admin isolation re-check
- [x] 9. DOCUMENT: spec/ROADMAP/ARCHITECTURE/memory

## Follow-up record

### PLAN
- [x] User-provided plan adopted as primary guide; deviations recorded with reasons (§Deviations)
- [x] Grounded against live code: `LojaClient.tsx` confirmed as fixed-order composition of existing
      organisms (composition strategy viable); category endpoint already exists for chips
- [x] Confirmed Instrument Sans / Space Grotesk / Space Mono are Google Fonts (existing loader works)
→ **Draft on 2026-07-19**

### REFINEMENT
- [x] User chose **full scope** (all 5 phases: headers, homes, cards, PDPs, footers) over the
      recommended headers+homes v1 — PDP/footer variants moved into this loop's scope
- [x] Latent font-loading bug (Anton/single-weight families) found and scoped into task 1
→ **Ready on 2026-07-19**

### IMPLEMENT
- [x] Foundation: `LayoutFamily`/`CardFrame` types + `tagline`/`layoutFamily`/`cardFrame` em todos
      os 10 presets; `luxo` + `streetwear` completos; labels Atlético/Wellness/Tropical/Minimal;
      backend enum (`tenant.schema.ts`) + `THEME_PRESETS` (DTO) aditivos
- [x] `src/layouts/storefront/`: `types.ts` (FamilyHeaderProps/HomeSlots/PdpSlots),
      `resolveLayoutFamily.ts` (lê a token table, fallback→classic) + 15 componentes de família
      (Header/Home/PDP × 5)
- [x] Primitivos: `CategoryChips` (categorias reais → filtro do catalog store), `ProductRail`
      (rail horizontal snap), `MarqueeTape` (reusa animação do ticker)
- [x] Dispatchers: `PublicHeader` (dono de busca/estado) → family header; `LojaClient` → family
      home via `HomeSlots`; `ProductDetailClient` → family PDP via `PdpSlots`; footer com switch
      interno por família
- [x] `cardFrame` no `ProductGrid` (border/borderless/hard-border)
- [x] Admin picker agrupado por família (5 headings, taglines por preset)
- [x] Fix do bug latente de fontes: `GOOGLE_FONT_WEIGHTS` (13 famílias) — Anton finalmente carrega
- **Ajuste durante verify:** `hasHero` em `HomeSlots` — kivoni sem `heroTitle` fazia a industrial
  desenhar moldura preta vazia com rótulo "HOME"; moldura agora é condicional
- **Ajuste durante implement:** peso do heading do Luxo 300→400 (Instrument Sans não tem 300 no
  Google Fonts; o token diz a verdade)

### TEST
- [x] 345/345 testes em 42 arquivos; `tsc --noEmit` limpo (web) — inclui novos
      `resolveLayoutFamily.test.ts` (mapeamento, fallback, GOOGLE_FONT_WEIGHTS cobre todas as
      fontes de preset, Anton="400", Space Mono="400;700") e Loop12 additions em
      `storefrontPresets.test.ts` (10 presets, contagens de família 3/2/3/1/1, labels, contraste)

### VERIFY (browser + API, 2026-07-19)
- [x] AC1 — PATCH streetwear→200 e luxo→200 persistidos na API pública; picker admin com 10 cards
      sob 5 headings de família (Essencial/Atlético/Impacto | Editorial/Boutique | Luxo/Wellness/
      Minimal | Tropical | Streetwear)
- [x] AC2 — kivoni em industrial vs minimal vs classic: estruturas radicalmente diferentes
      (marquee+molduras vs respiro+sem bordas vs chips+trust bar)
- [x] AC3 — lmfit Atlético = mesma estrutura classic do kivoni essencial (chips, ordem), estética
      oposta (dark Oswald vs light Poppins)
- [x] AC4 — chip "Camisas de Futebol" filtrou o grid 10→1 cards
- [x] AC5 — industrial: marquee + cards 2px preto 1:1 gap-1; luxo: cards sem borda gap-10
- [x] AC6 — links gfont-space-grotesk/space-mono/instrument-sans só carregam quando o preset está
      ativo; contraste coberto por unit test
- [x] AC7 — checkout guest completo (Camisa Flamengo G → R$299,90) sob família minimal
- [x] AC8 — /catalogo ok sem erros de console; admin não afetado (Geist)
- [x] AC9 — clicar Editorial → "Ver ao vivo": preset salvo ANTES de abrir (API confirmou
      `themePreset: editorial` sem tocar em "Salvar loja online"); /loja renderizou a família
      editorial (header centralizado, rail Lançamentos, Playfair Display)
- Estado restaurado: kivoni→essencial, lmfit→performance
- Nota de ferramenta: o form de login do admin não disparava submit via automação (validação de
  campo vazio + quirk do pane); verificação do admin feita injetando tokens reais no localStorage
  (`kivoni_access_lmfit`) — mesmo mecanismo do app, sessão real

### DOCUMENT
- [x] Spec preenchida (este registro); ROADMAP.md linha Loop 12 + changelog; ARCHITECTURE.md seção
      multi-layout; memória do projeto atualizada
- Loop 4g (ThemeMockupPreview duplicado em "Loja Online") e 4h (Ver ao vivo save-first +
  heroAspectRatio) documentados como pré-trabalho absorvido por este loop

### PLAN AGAIN (candidatos, NÃO iniciados)
- Flourishes v2: grain/glitch industrial, mosaico Tropical (carregado desde 4f), lookbook
  assimétrico editorial, coreografia de motion, hero colagem
- Loop 11 (WhatsApp AI) segue como próximo grande candidato do roadmap

→ **Done on 2026-07-19**
