# Loop 22 — Editorial/Zara: lookbook assimétrico + confirmação da divergência Boutique/Chanel

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 22 · **Depends on:** Loop 19 (gridComposition), Loop 20/21 (padrão de gate por token de família/composição)
**Repos touched:** lmfit-web

## Goal

Dos 4 itens do plano pro Editorial (STOREFRONT-V2/V3), **3 já estavam entregues antes deste
loop**: grid assimétrico (Loop 19, `gridComposition: "asymmetric"`), campanha full-bleed (Loop 19
`heroComposition: "media-first"` + `heroTreatment: "full-bleed-overlay"` do Loop 4d) e hover
revelando a 2ª foto (já existe em `ProductGrid.tsx` pra todos os presets desde o Card v2). Resta
só **1 item genuinamente pendente, carregado desde o Loop 12**: o `Lookbook.tsx` é uma vitrine
50/50 rígida — igual pra todos os presets — nunca ganhou a composição assimétrica que a família
editorial pede.

Além disso, este loop VERIFICA (não reimplementa) se "Boutique diverge de Editorial" já é real:
`layoutFamily` de ambos é `"editorial"` (mesmo componente `EditorialHome`/`EditorialPDP`), mas
`gridComposition`/`heroComposition`/`cardFrame` já divergem desde o Loop 19/12 — precisa confirmar
ao vivo que isso realmente produz DOM diferente, não só tokens diferentes na tabela.

## Scope

**In:**
- `Lookbook.tsx` ganha uma composição assimétrica quando `gridComposition === "asymmetric"`
  (reaproveita o token já real do Loop 19 — hoje só Editorial — em vez de inventar um novo pra
  essa distinção única, mesmo padrão do `isSticker`/`isIndustrial` dos Loops 20/21): a foto ocupa
  mais espaço que o painel de texto (proporção 3/5 vs 2/5, não 50/50) e perde a moldura/
  arredondamento (full-bleed, coerente com `cardFrame: "borderless"` do preset).
- Verificação ao vivo de que Boutique (uniform/single/border) e Editorial (asymmetric/media-first/
  borderless) realmente renderizam DOM/CSS diferentes hoje, mesmo usando o mesmo `EditorialHome`.

**Out (explicitamente):**
- Qualquer reescrita do grid assimétrico da PLP, hero full-bleed ou hover de 2ª foto — já
  entregues, só confirmados/creditados aqui.
- Novo componente de família só pra Boutique — a divergência já é por token, não por família
  (decisão herdada do Loop 19: fork por família só quando 2 presets da mesma família são gêneros
  genuinamente opostos, o que não é o caso aqui).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Gate da assimetria do Lookbook | `gridComposition === "asymmetric"` (token já real) | Mesmo padrão dos Loops 20/21 — reaproveita, não inventa token novo pra 1 preset |
| Proporção da foto assimétrica | 3/5 (foto) vs 2/5 (texto), não 50/50 | Padrão editorial real (Zara/revista de moda): a foto domina, o texto é secundário — 50/50 é "catálogo", não "editorial" |
| Boutique precisa de componente próprio? | Não | Já diverge por token (Loop 19); forçar um componente novo seria over-engineering pra uma distinção que o mecanismo de composição já resolve |

## Acceptance criteria

- [ ] AC1 — Preset Editorial: `Lookbook` renderiza com a foto ocupando mais colunas que o painel
      de texto (proporção assimétrica), sem borda/arredondamento. *(verify: teste unitário + browser)*
- [ ] AC2 — Qualquer outro preset (incluindo Boutique): `Lookbook` continua com a divisão 50/50
      emoldurada de sempre — regressão zero. *(verify: teste unitário)*
- [ ] AC3 — Boutique e Editorial, ambos família `editorial`, renderizam `cardFrame`/
      `gridComposition`/`heroComposition` genuinamente diferentes no DOM real (não só na tabela de
      tokens). *(verify: browser, comparando os dois presets ao vivo)*

## Design notes

Arquivo: `src/components/organisms/Lookbook.tsx`. Único ponto de mudança é a `className`/estrutura
do `<section>`/`<div className="grid sm:grid-cols-2">` — vira `sm:grid-cols-5` com a foto em
`sm:col-span-3` e o painel em `sm:col-span-2`, e a moldura (`rounded-xl border`) só aplica quando
`!isAsymmetric`.

## Tasks

- [x] 1. `Lookbook.tsx`: composição assimétrica gated por `gridComposition === "asymmetric"`.
- [x] 2. Testes unitários (AC1-2).
- [x] 3. `tsc --noEmit` limpo; suíte completa verde.
- [x] 4. Verificação ao vivo: Editorial com lookbook assimétrico + confirmação de divergência real Boutique/Editorial (AC3).

## Follow-up record
### PLAN        — [x] explored code · [x] draft spec · [x] decisions listed → Draft on 2026-07-31
### REFINEMENT  — [x] decisions resolved · [x] assumptions checked · [x] ACs testable · [x] DoR review → Ready on 2026-07-31
### IMPLEMENT   — [x] tasks done · [x] tsc green per task → done on 2026-07-31
### TEST        — [x] AC-named tests · suites: api 312/312 (unchanged) · web 462/462 (+3) → green on 2026-07-31
### VERIFY      — [x] browser/DOM walk · [x] AC checklist → all ✅ on 2026-07-31
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog → merged on 2026-07-31
### PLAN AGAIN  — [x] retro · [x] carry-overs filed → on 2026-07-31

## Verification record

Verificado ao vivo contra o tenant `kivoni` real (que já tinha um lookbook configurado de sessões
anteriores — "Look Torcedor Completo"), numa instância temporária do `lmfit-api` (porta 4001).

- **AC1** ✅ — Preset Editorial: `getComputedStyle`/DOM real confirmou
  `sectionClass: "overflow-hidden"` (sem `rounded-xl border`), `gridClass: "grid sm:grid-cols-5"`,
  foto em `sm:col-span-3`, painel de texto em `sm:col-span-2` — screenshot também confirma
  visualmente a foto dominando o espaço.
- **AC2** ✅ — Preset Boutique (mesma família `editorial`, mas `gridComposition` default):
  `lookbookSectionClass: "rounded-xl border overflow-hidden"`, `lookbookGridClass:
  "grid sm:grid-cols-2"` — a divisão 50/50 emoldurada de sempre, intacta. `Lookbook.render.test.tsx`
  cobre o mesmo caso pra `essencial` e `boutique`.
- **AC3** ✅ — No mesmo passe: card de produto sob Boutique tem `rounded-lg border` (moldura fina,
  sem span de mosaico/assimetria) vs. Editorial's `borderless` + spans assimétricos (Loop 19) — os
  dois presets, mesmo `layoutFamily`, produzem CSS/DOM genuinamente diferentes hoje, não só
  valores diferentes numa tabela de tokens.

Toda a massa de verificação foi revertida ao final: preset do tenant de volta a `streetwear`,
`.env.local` de volta a `4000`, instância temporária do `lmfit-api` encerrada por PID exato.

## Result

**O que foi entregue:** dos 4 itens do plano pro Editorial, só 1 realmente precisava de código
novo — o `Lookbook.tsx` ganhou uma composição assimétrica (foto 3/5, painel 2/5, sem moldura)
gated por `gridComposition === "asymmetric"`, reaproveitando o mesmo token do Loop 19 e o mesmo
padrão de gate dos Loops 20/21. Os outros 3 (grid assimétrico, hero full-bleed, hover de 2ª foto)
já estavam entregues — creditados formalmente aqui. A divergência Boutique/Editorial, que o plano
descrevia como um item pendente, já era real desde o Loop 19 (tokens de composição diferentes) —
este loop apenas confirmou isso ao vivo em vez de reimplementar algo que já funcionava.

**Desvio do plano:** nenhum. A decisão de não criar um componente de família só pra Boutique se
confirmou correta — a divergência por token já é suficiente e genuína.

**Retro:**
- O que ajudou: antes de escrever qualquer código, mapear TUDO que o plano pedia pro Editorial
  contra o que já existia (grep + leitura direta dos componentes) — isso reduziu o escopo real de
  "4 itens" pra "1 item de código + 1 verificação", evitando trabalho redundante.
- O que reforçou o padrão: o terceiro loop seguido (20→21→22) reaproveitando o mesmo gate
  `<tokenDeComposição> === <valorEspecífico>` sem precisar inventar nada novo — o mecanismo do
  Loop 19 está se pagando exatamente como o PLAN original previu.

**Carry-overs para o próximo PLAN:**
1. `ExpressiveHome.tsx`/`IndustrialHome.tsx` continuam com `color-card`/`hard-frame` manuais em
   vez de via `SectionCard` (carry-over desde o Loop 19).
2. Próximo: Loop 23 (separar a família minimal: Luxo vs. Wellness vs. Minimal) ou Loop 24
   (separar a família classic: Atlético vs. Essencial vs. Impacto) — os dois únicos itens de
   "maior ganho de diferenciação" (prioridade 2) que restam no STOREFRONT-V3-FIDELIDADE.md.
