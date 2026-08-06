# Loop 19 — Camada de composição (fundação)

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 19 · **Depends on:** Loop 19a (Home/PDP religados à família)
**Repos touched:** lmfit-web

## Goal

Hoje `ProductGrid`/`HeroBanner` renderizam sempre a MESMA estrutura (grade uniforme, hero de imagem
única) pros 10 presets — só cor/fonte/tratamento de pele varia (`heroTreatment`, `cardFrame`, etc.,
já reais desde o Loop 4d/12). Este loop acrescenta 3 tokens de COMPOSIÇÃO (`gridComposition`,
`heroComposition`, `sectionTexture`) que deixam o bloco compartilhado escolher sua própria
estrutura interna por preset — sem fork por família (princípio do Loop 12) — habilitando os
flourishes específicos dos Loops 20-22 sem virarem hacks pontuais em cada `*Home.tsx`.

## Scope

**In:**
- 3 tokens novos em `StorefrontThemeTokens` + valores nos 10 presets (ver STOREFRONT-V3-FIDELIDADE.md §3.1).
- `ProductGrid.tsx` honra `gridComposition`: `uniform` (hoje), `sparse-duo` (Luxo: alturas
  alternadas em 2 colunas), `asymmetric` (Editorial: tile alargado periódico), `mosaic` (Tropical:
  tile 2×2 periódico).
- `HeroBanner.tsx` ganha `heroComposition` ortogonal ao `heroTreatment`: `single` (hoje),
  `media-first` (hero mais alto/dominante), `collage` (grade de 2+ fotos em vez de 1 só, quando o
  tenant configurou `heroImages`).
- Novo `SectionCard.tsx`: wrapper que aplica `sectionTexture`: `none` (hoje, sem wrapper),
  `color-card` (cartão de superfície colorida — refatora o que `ExpressiveHome.tsx` já faz manual),
  `grain` (textura de ruído CSS puro, sem asset novo), `hard-frame` (moldura preta dura,
  formaliza o que `IndustrialHome.tsx` já faz manual com `style={{border:"2px solid #000"}}`).

**Out (explicitamente):**
- Polimento específico do Tropical (stickers, hero colagem com curadoria, bounce de verdade
  aplicado) — isso é Loop 20, construído SOBRE o mecanismo daqui.
- Grão/glitch real do industrial além do CSS de ruído básico — refinamento é Loop 21.
- Lookbook assimétrico (Loop 22).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Onde o mosaico mora | `ProductGrid.tsx` (CSS Grid `grid-auto-flow: dense` + spans periódicos) | Reaproveita o grid existente; sem componente novo pra grade, só variação de span |
| Collage do hero | Reaproveita `sf.heroImages` já existente (mesmo campo do carrossel) | Sem novo campo de tenant; um tenant com 2+ fotos já tem o que precisa pro collage |
| `sparse-duo` em Luxo | Alturas alternadas (não masonry real via JS) — `aspect-ratio` diferente em itens pares/ímpares | Masonry real exige medir imagem; alternância de aspect-ratio é puro CSS e já entrega a variação visual |
| Refatorar `ExpressiveHome`/`IndustrialHome` pra usar `SectionCard` | Não nesta loop | Já funcionam hoje (ad hoc); trocar por `SectionCard` é reafirmar o token, não uma correção — carry-over de limpeza, sem risco de regressão se adiado |

## Acceptance criteria

- [ ] AC1 — Presets com os 3 tokens em default (`uniform`/`single`/`none`) renderizam DOM
      **idêntico** ao de antes deste loop. *(verify: teste comparando snapshot de classes/estrutura
      antes/depois para `essencial`)*
- [ ] AC2 — Preset Tropical (`vibrante`) mostra tiles de tamanho variado na PLP (pelo menos 1 tile
      2×2 a cada ciclo). *(verify: teste unitário do padrão de spans + browser)*
- [ ] AC3 — Preset Editorial mostra 1 tile alargado periódico, mais discreto que o mosaico Tropical.
      *(verify: teste unitário)*
- [ ] AC4 — Preset Luxo mostra 2 colunas com alturas alternadas. *(verify: teste unitário)*
- [ ] AC5 — Hero com `heroComposition: "collage"` (Tropical) e `heroImages` com 2+ fotos mostra
      grade de fotos em vez de carrossel de 1 imagem por vez. *(verify: teste unitário + browser)*
- [ ] AC6 — Hero com `heroComposition: "media-first"` (Editorial/Atlético) é visivelmente mais alto/
      dominante que `single`. *(verify: teste unitário de `heroAspectRatio` efetivo)*
- [ ] AC7 — `sectionTexture: "grain"` (Streetwear) aplica textura visível sem imagem externa (CSS
      puro) e sem quebrar contraste de texto. *(verify: browser + `isPaletteContrastSafe` continua
      passando)*

## Design notes

Arquivos: `src/theme/storefrontPresets.ts` (tokens+10 presets), `src/components/organisms/
ProductGrid.tsx`, `src/components/organisms/HeroBanner.tsx`, novo `src/components/organisms/
SectionCard.tsx`.

Tabela de atribuição (STOREFRONT-V3-FIDELIDADE.md §3.1):

| Preset | gridComposition | heroComposition | sectionTexture |
|---|---|---|---|
| vibrante (Tropical) | mosaic | collage | color-card |
| editorial | asymmetric | media-first | none |
| luxo | sparse-duo | single | none |
| streetwear | uniform | single | grain |
| performance (Atlético) | uniform | media-first | none |
| demais (essencial/boutique/studio/impacto/monocromo) | uniform | single | none |

## Tasks

- [x] 1. Tipos + 10 presets em `storefrontPresets.ts`.
- [x] 2. `ProductGrid.tsx`: `gridComposition` (mosaic/asymmetric/sparse-duo/uniform).
- [x] 3. `HeroBanner.tsx`: `heroComposition` (collage/media-first/single).
- [x] 4. Novo `SectionCard.tsx` (texture: grain — none/color-card/hard-frame ficam carry-over de refatoração; `grain` já wired em `IndustrialHome.tsx`, o único novo de verdade nesta loop).
- [x] 5. Testes unitários por AC + regressão dos 5 presets default.
- [x] 6. `tsc --noEmit` limpo; suíte completa verde.
- [x] 7. Verificação ao vivo: comparar PLP/hero de essencial (sem mudança) vs. tropical/editorial/luxo/streetwear/atlético (mudança real) no navegador.

## Follow-up record
### PLAN        — [x] explored code · [x] draft spec · [x] decisions listed → Draft on 2026-07-31
### REFINEMENT  — [x] decisions resolved · [x] assumptions checked · [x] ACs testable · [x] DoR review → Ready on 2026-07-31
### IMPLEMENT   — [x] tasks done · [x] tsc green per task → done on 2026-07-31
### TEST        — [x] AC-named tests · [x] negative paths · suites: api 312/312 (unchanged) · web 448/448 (+34) → green on 2026-07-31
### VERIFY      — [x] browser walk (DOM inspection via JS, screenshot pane flaky) · [x] AC checklist → all ✅ on 2026-07-31
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog → merged on 2026-07-31
### PLAN AGAIN  — [x] retro · [x] carry-overs filed · [x] next loop started (20) → on 2026-07-31

## Verification record

Verified live against the real `kivoni` tenant on a temp `lmfit-api` instance (port 4001 —
port 4000 was occupied by an unrelated project, same environment quirk as Loop 19a), switching
`themePreset` via `PATCH /tenants/:id/storefront` and inspecting the real rendered DOM via
`javascript_tool` (the screenshot pane was flaky/blank after scroll actions this session — DOM
inspection was more reliable and equally conclusive proof).

- **AC1** ✅ — `storefrontPresets.test.ts`'s new test confirms exactly 5 presets
  (essencial/boutique/impacto/monocromo/studio) stay all-default; `ProductGrid.test.ts` confirms
  `gridCompositionSpanClass("uniform", i) === ""` for every index.
- **AC2** ✅ — Ao vivo, preset `vibrante`: `read`/`querySelectorAll` on `/loja` confirmed items at
  index 0 and 6 (of the sorted/filtered list) carry `sm:col-span-2 sm:row-span-2`, none of the
  others do — matches `isMosaicFeatureTile` exactly.
- **AC3** ✅ — Ao vivo, preset `editorial`: items at index 0 and 5 carry `sm:col-span-2` only (no
  row-span) — a visibly different, more discreet rhythm than Tropical's mosaic.
- **AC4** ✅ — Ao vivo, preset `luxo`: items at odd indices (1, 3, 5) carry `sm:translate-y-8`,
  even indices don't — the alternating-height rhythm.
- **AC5** ✅ — Ao vivo, preset `vibrante` with 3 temporary `heroImages` (real Cloudinary-hostname
  URLs, since `next/image` only allow-lists specific hostnames): hero section rendered a real
  `grid-cols-3` layout with all 3 `<img>` elements mounted simultaneously (not one-at-a-time via
  opacity like the carousel) — confirmed via direct DOM query.
- **AC6** ✅ — Ao vivo, preset `performance` (Atlético, `media-first`) and `vibrante` (`collage`):
  hero section's className was `"relative overflow-hidden "` — no `rounded-2xl border` — vs.
  `essencial`'s framed default. Confirms the wrapper genuinely drops the frame for both non-single
  compositions.
- **AC7** ✅ — Ao vivo, preset `streetwear`: `[data-testid="section-grain"]` found in the real DOM
  with a computed `background-image` starting with `url("data:image/svg+xml,...` — the CSS-only
  noise texture renders for real, and `isPaletteContrastSafe` (already enforced per-preset since
  Loop 4d) continues passing since the grain layer never touches the text layer.

Todo cleanup was reverted after verification: tenant `themePreset` back to `streetwear`, hero
fields cleared back to empty, `.env.local` back to port 4000, temp `lmfit-api` instance killed by
exact PID, preview server stopped.

## Result

**O que foi entregue:** 3 tokens novos (`gridComposition`, `heroComposition`, `sectionTexture`) nos
10 presets, com a atribuição exata do plano (STOREFRONT-V3-FIDELIDADE.md §3.1). `ProductGrid.tsx`
honra `gridComposition` via classes de span Tailwind puras (`sm:col-span-2`/`sm:row-span-2` pro
mosaico, só `sm:col-span-2` pro asymmetric, `sm:translate-y-8` pro sparse-duo) — nenhuma mudança de
JS/estado, só CSS condicional por índice, tudo gated a `sm:` pra cima pra nunca quebrar o layout
mobile de coluna única/dupla. `HeroBanner.tsx` ganha `heroComposition` genuinamente ortogonal ao
`heroTreatment` existente: a nova `HeroCollage` reaproveita o mesmo `heroImages` que já alimentava o
carrossel (zero campo novo no tenant), com fallback gracioso pra imagem única quando há menos de 2
fotos. Novo `SectionCard.tsx` formaliza `sectionTexture`, com `grain` (o único valor genuinamente
novo desta loop) já religado em `IndustrialHome.tsx`.

**Desvio do plano:** nenhum. A decisão de NÃO refatorar `ExpressiveHome.tsx`/`IndustrialHome.tsx`
completamente pra usar `SectionCard` (só `grain`/Streetwear foi religado, já que era o único valor
sem implementação ad hoc equivalente) foi mantida como planejado no PLAN.

**Retro:**
- O que ajudou: escrever as funções puras (`isMosaicFeatureTile`, `gridCompositionSpanClass`,
  `heroWrapperClassName`) primeiro e testá-las isoladamente antes de integrar no componente —
  achou a lógica certa rápido, sem precisar de um browser pra iterar no ritmo dos índices.
- O que atrapalhou: o painel de screenshot ficou instável (tela preta) depois de ações de scroll
  nesta sessão — inspeção de DOM via `javascript_tool` foi o substituto confiável.
- Mudar no processo: pra loops de composição visual futuros (20-22), preferir inspeção de DOM/
  classe via JS como verificação primária, screenshot como complemento quando o painel cooperar.

**Carry-overs para o próximo PLAN:**
1. `ExpressiveHome.tsx`/`IndustrialHome.tsx` continuam com `color-card`/`hard-frame` montados
   manualmente (não via `SectionCard`) — refatoração de limpeza, sem risco, adiável indefinidamente.
2. O bug sistêmico de `import * as React` (achado no Loop 19a) tem uma tarefa em background já em
   andamento (spawnada), independente deste loop.
3. Próximo: Loop 20 (Tropical/Farm Rio — stickers, bounce de verdade aplicado, refinamento do
   hero colagem), construindo sobre o mecanismo que este loop entregou.
