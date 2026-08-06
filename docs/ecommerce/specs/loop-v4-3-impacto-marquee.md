# Loop V4-3 — Família classic: Impacto sai do fallback silencioso + achado crítico (`storefront-themes.css` nunca importado)

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop V4-3 · **Depends on:** nenhum
**Repos touched:** lmfit-web

## Goal

Impacto era o `else` implícito da família `classic` — nenhuma decisão estrutural própria, apesar de
ter referência distinta ("tipo gigante itálico, blocos retos"). `ClassicHome.tsx` ganha uma faixa
full-width com marquee animado, só com os tokens que Impacto já possui.

## Scope

**In:** `isImpacto` branch em `ClassicHome.tsx`, entre `slots.coupon` e a prateleira — faixa
full-bleed reaproveitando a MESMA classe CSS `.kivoni-ticker-track` do `AnnouncementTicker`/
`MarqueeTape` (montada inline, não generaliza `MarqueeTape` — esse continua exclusivo do
Streetwear), repetindo `newBadgeLabel` ("LANÇAMENTO") com `fontFamily: var(--kivoni-font-display)`
(Anton), `italic font-black uppercase`.

**Achado crítico, fora do escopo original, corrigido no mesmo loop por severidade:**
Ao verificar ao vivo a nova faixa, `getComputedStyle(track).animationName` retornou `"none"` — a
animação não rodava. Investigação encontrou que `src/app/(public)/storefront-themes.css` (existe
desde o Loop 4, contém os overrides `[data-theme-preset] h1/h2/h3/.storefront-brand-heading {
font-family: var(--kivoni-font-display) }`, o `!important` de `border-radius` por preset, E o
`@keyframes kivoni-ticker-scroll`) **nunca foi importado em lugar nenhum do app** — só referenciado
num comentário, nunca num `import`. Mesma causa raiz do Loop 20 (`StorefrontThemeVars` morto desde
a reconstrução pós-corrupção do iCloud de 2026-07-26): as CSS custom properties resolviam certo
(`--kivoni-font-display` = `'Anton'`, `--kivoni-radius` = `2px`), mas a REGRA que consome essas
variáveis nunca carregava — confirmado ao vivo: `.storefront-brand-heading` computava `Geist`
(fonte padrão do painel admin), `.rounded-2xl` computava `12px` (padrão Tailwind), em qualquer
preset, desde sempre. Fixado com 1 linha (`import "./storefront-themes.css";` em
`(public)/layout.tsx`) — confirmado que o Next.js App Router escopa CSS importado num layout
aninhado só pro route group correspondente (`(public)`), então não vaza pro painel admin/PDV
(`(app)`/`(pdv)`), preservando a garantia original do próprio arquivo.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Marquee vs. blocos estáticos | Marquee animado | Confirmado com o usuário — único elemento com movimento próprio na família classic |
| Componente | Inline em `ClassicHome.tsx`, reusa só a classe CSS | `MarqueeTape` fica exclusivo do Streetwear (preto/mono/aspas) — generalizar misturaria 2 identidades |
| Achado do CSS morto | Corrigido no mesmo loop, não carried-over | Afeta os 10 presets, não só Impacto — descoberto DURANTE o VERIFY deste loop, checklist "achar bugs reais" do próprio processo |

## Tasks

- [x] `ClassicHome.tsx`: branch `isImpacto` com a faixa marquee.
- [x] `ClassicHome.test.tsx` atualizado (novo `data-testid="impacto-marquee"`).
- [x] **Achado crítico**: `(public)/layout.tsx` ganha `import "./storefront-themes.css"`.
- [x] `tsc --noEmit` limpo; suíte completa verde.
- [x] Verificação ao vivo — faixa presente + animando, fonte/radius corretos, escopo confirmado (não vaza pro admin).

## Follow-up record
### PLAN        — [x] mesma auditoria/plano do V4-1 → Ready on 2026-08-01
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-01
### TEST        — [x] +1 web (essa suíte) → green on 2026-08-01
### VERIFY      — [x] ao vivo — achou e fechou o achado crítico do CSS morto no mesmo loop → 2026-08-01
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-01

## Verification record

Ao vivo, tenant `kivoni`, preset `impacto`: faixa presente (`data-testid="impacto-marquee"`),
texto "LANÇAMENTO" repetido; `animationName` inicialmente `"none"` — investigado, achado o CSS
morto, fixado. Após o fix, reverificado: `animationName: "kivoni-ticker-scroll"`,
`.storefront-brand-heading` computando `Anton` (era `Geist`), `.rounded-2xl` computando `2px` (era
`12px`, hardcoded Tailwind). Confirmado que `/settings` (admin) continua com `h1` em `Geist` mesmo
com `data-theme-preset="impacto"` no `<html>` (o atributo é global, mas o CSS só carrega no bundle
de `(public)`) — sem vazamento. Preset revertido a `streetwear`.

## Result

**Impacto** ganha sua própria faixa animada, fechando o último preset "sem decisão própria" da
família classic. **Achado não-planejado, mas de impacto muito maior que o item original do loop**:
`storefront-themes.css` religado — a partir de agora, TODOS os 10 presets (não só Impacto) aplicam
de verdade a fonte de exibição e o raio de borda por preset em headings/`.storefront-brand-heading`
e em qualquer elemento `.rounded-md/lg/xl/2xl` — comportamento prometido desde o Loop 4 (2026-07-16)
mas nunca ativo em produção até este loop (2026-08-01).
