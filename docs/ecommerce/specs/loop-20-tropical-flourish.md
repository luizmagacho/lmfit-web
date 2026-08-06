# Loop 20 — Tropical/Farm Rio: flourish sobre a fundação do Loop 19

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 20 · **Depends on:** Loop 19 (gridComposition/heroComposition/sectionTexture)
**Repos touched:** lmfit-web

## Goal

O mosaico, o hero-colagem e o cartão colorido de seção do Tropical já existem de verdade desde o
Loop 19 (a dívida mais antiga do projeto, carregada desde o Loop 4f). O que falta pra fechar a
assinatura visual do preset (STOREFRONT-V3-FIDELIDADE.md §2, linha Tropical/Farm Rio) são as duas
peças que o benchmark original descreve e que nenhum loop anterior aplicou de verdade: **stickers
de badge** (%OFF/Lançamento com cara de adesivo, não pílula neutra) e a **curva de bounce**
(`cubic-bezier(0.34, 1.56, 0.64, 1)`, já um token real desde o Loop 4d) **de fato acionada** em
alguma interação visível — hoje ela só é passada pro crossfade de opacidade do hover de card, onde
o "bounce" (overshoot) é imperceptível.

## Scope

**In:**
- `Badge.tsx` ganha `sticker?: boolean` — rotação leve + sombra, cara de adesivo. Prop explícita
  (o componente é usado no admin/PDV também — não pode chamar `useThemeTokens()` sozinho).
- `ProductGrid.tsx` passa `sticker={layoutFamily === "expressive"}` pros 3 badges do card
  (Lançamento/Esgotado/%OFF) — reaproveita o token `layoutFamily` já real, sem inventar um novo
  pra uma distinção de preset único.
- `ProductGrid.tsx`: hover do card ganha `scale` de verdade (não só o crossfade de opacidade que já
  existia), usando os MESMOS tokens de motion (`--kivoni-storefront-motion-duration/-easing`) já
  computados — aplicado a TODOS os presets (risco baixo: é a interação de hover-zoom que Renner/
  Farm Rio/qualquer e-commerce real já tem; só o Tropical vai "bouncar" de verdade, porque só a
  curva dele tem overshoot).

**Out (explicitamente):**
- Qualquer preset além do Tropical ganhar sticker de badge (a plan não pede isso pra nenhum outro).
- Refatorar `ExpressiveHome.tsx` pra usar `SectionCard` (carry-over do Loop 19, continua adiado).
- Grão/glitch industrial de verdade (Loop 21) e lookbook assimétrico editorial (Loop 22).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Sticker gated por quê | `layoutFamily === "expressive"` (token já real) | Só o Tropical precisa disso hoje; inventar um token novo pra 1 valor seria over-engineering |
| Hover-scale pra todos os presets | Sim, todos ganham (não só Tropical) | É o MESMO token de motion já computado pra todo mundo; sem isso, "aplicar o bounce de verdade" não teria como ficar visível só no Tropical sem duplicar a lógica de hover em 2 lugares |
| `Badge.tsx` não chama `useThemeTokens()` | Prop explícita do chamador | O componente é usado fora de `/loja` (admin/PDV, que não têm contexto de preset — Loop 4d já estabeleceu essa fronteira) |

## Acceptance criteria

- [ ] AC1 — Preset Tropical (`vibrante`): badges do card (Lançamento/Esgotado/%OFF) aparecem
      rotacionados com sombra, não como pílula neutra. *(verify: teste unitário do prop `sticker` + browser)*
- [ ] AC2 — Qualquer outro preset: badges continuam pílula normal, sem rotação/sombra extra.
      *(verify: teste unitário — `sticker` só é `true` quando `layoutFamily === "expressive"`)*
- [ ] AC3 — Hover num card da PLP produz um `scale` visível (não só crossfade de opacidade), usando
      a duração/curva do preset ativo. *(verify: teste unitário da classe/style aplicada + browser)*
- [ ] AC4 — No preset Tropical, a curva de hover tem overshoot perceptível (a curva do preset é
      `cubic-bezier(0.34, 1.56, 0.64, 1)`); nos demais presets o hover não "bouncy" já é o
      comportamento esperado de cada curva própria. *(verify: computed style da transition-timing-function)*

## Design notes

Arquivos: `src/components/atoms/Badge.tsx`, `src/components/organisms/ProductGrid.tsx`.

```tsx
// Badge.tsx
export function Badge({ variant, children, title, size, sticker }: { ...; sticker?: boolean }) {
  const stickerClass = sticker ? "rotate-[-6deg] shadow-md border-2" : "";
  return <span className={`... ${stickerClass}`} ...>{children}</span>;
}
```

```tsx
// ProductGrid.tsx — no map de cards
const isSticker = layoutFamily === "expressive";
...
<Badge variant="lancamento" size="xs" sticker={isSticker}>{newBadgeLabel}</Badge>
```

Hover-scale: aplicado no wrapper `<Link>` do card (não só na imagem), reaproveitando `motionStyle`
já existente (transitionDuration/transitionTimingFunction lendo as CSS vars) + uma classe
`hover:scale-[1.03]`.

## Tasks

- [x] 1. `Badge.tsx`: prop `sticker`.
- [x] 2. `ProductGrid.tsx`: `isSticker` + passar pros 3 badges; hover-scale no card.
- [x] 3. Testes unitários (AC1-4).
- [x] 4. `tsc --noEmit` limpo; suíte completa verde.
- [x] 5. Verificação ao vivo: Tropical com badges-sticker + hover bounce perceptível; outro preset (essencial) com badge normal + hover-scale sem overshoot.
- [x] 6. **Não previsto no PLAN, achado durante a VERIFY**: `StorefrontThemeVars.tsx` (Loop 4d) estava
      definido mas nunca montado em `(public)/layout.tsx` — sem ele, `--kivoni-storefront-motion-*`
      não existia como CSS var em lugar nenhum, e o AC4 desta loop seria literalmente falso.
      Religado (1 linha), com aprovação do usuário antes de prosseguir.

## Follow-up record
### PLAN        — [x] explored code · [x] draft spec · [x] decisions listed → Draft on 2026-07-31
### REFINEMENT  — [x] decisions resolved · [x] assumptions checked · [x] ACs testable · [x] DoR review → Ready on 2026-07-31
### IMPLEMENT   — [x] tasks done · [x] tsc green per task → done on 2026-07-31
### TEST        — [x] AC-named tests · [x] negative paths · suites: api 312/312 (unchanged) · web 454/454 (+6) → green on 2026-07-31
### VERIFY      — [x] browser/DOM walk · [x] AC checklist → all ✅ on 2026-07-31
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog → merged on 2026-07-31
### PLAN AGAIN  — [x] retro · [x] carry-overs filed → on 2026-07-31

## Verification record

Verificado ao vivo contra o tenant `kivoni` real, numa instância temporária do `lmfit-api` (porta
4001 — mesmo motivo ambiental dos loops 19/19a), inspecionando o DOM real via `javascript_tool`.

- **AC1** ✅ — Preset `vibrante`: badge real "Esgotado" no card encontrado com classe
  `rotate-[-6deg] shadow-md border-2` — cara de adesivo confirmada no DOM ao vivo.
- **AC2** ✅ — `ProductGrid.render.test.tsx`/`Badge.test.tsx` confirmam que `sticker=false`
  (default) nunca produz `rotate`/`shadow-md`; nenhum outro preset além do Tropical passa
  `sticker={true}` (`isSticker = layoutFamily === "expressive"`, e só `vibrante` é `expressive`).
- **AC3** ✅ — Todo card carrega `hover:scale-[1.03]` + `transitionDuration`/
  `transitionTimingFunction` referenciando as CSS vars de motion — confirmado tanto por teste
  quanto ao vivo (`getComputedStyle` do card real).
- **AC4** ✅ — **Só depois de religar `StorefrontThemeVars`** (achado nesta mesma VERIFY): preset
  `vibrante` resolve `transitionTimingFunction` computado pra
  `cubic-bezier(0.34, 1.56, 0.64, 1)` (a curva com overshoot real) e `transitionDuration` pra
  `0.18s` — exatamente os tokens do preset. Preset `essencial` (regressão), no mesmo teste,
  resolve `ease-out` — cada preset com sua própria curva, nenhuma vazando pra outra.

**Achado ao vivo, não previsto no PLAN, corrigido com aprovação do usuário:**
`src/app/(public)/StorefrontThemeVars.tsx` (Loop 4d) definia os CSS vars de paleta/motion
escopados a `/loja`, mas `(public)/layout.tsx` nunca o importava/montava — confirmado via
`getComputedStyle(...).getPropertyValue('--kivoni-storefront-motion-easing')` retornando string
vazia em toda a cadeia de ancestrais até `<html>`. Provavelmente a mesma causa raiz da
reconstrução pós-iCloud de 2026-07-26 (Loop 19a). Consequência real, silenciosa até agora: a
paleta por preset (bg/surface/text escopados a `/loja`) e TODOS os tokens de motion nunca
aplicavam de verdade em produção — tudo caía no `ease` padrão do navegador e na paleta
global/dark-mode do resto do app. Corrigido com 1 linha (`<StorefrontThemeVars>` envolvendo
`{children}`); confirmado ao vivo nos dois eixos: motion (`cubic-bezier` resolvendo) E paleta
(`--kivoni-surface`/`--background` do card resolvendo pros valores exatos do preset `essencial`,
não mais o dark-mode global do resto do app).

Toda a massa de verificação foi revertida ao final: preset do tenant de volta a `streetwear`,
`.env.local` de volta a `4000`, instância temporária do `lmfit-api` encerrada por PID exato.

## Result

**O que foi entregue:** `Badge.tsx` ganha `sticker?: boolean` (prop explícita — o componente
também é usado fora de `/loja`, onde não há contexto de preset); `ProductGrid.tsx` passa
`sticker={layoutFamily === "expressive"}` pros 3 badges do card, reaproveitando o token
`layoutFamily` já real em vez de inventar um novo pra uma distinção de preset único. Todo card
ganha hover-scale (`hover:scale-[1.03]`) usando os mesmos tokens de motion já computados — de
baixo risco porque é a interação de hover-zoom que qualquer e-commerce real já tem; só a curva do
Tropical de fato "bounca" (overshoot).

**O que realmente fechou a assinatura visual do Tropical:** o mosaico, o hero-colagem e o
cartão-de-seção colorido já vinham do Loop 19; esta loop entregou exatamente as duas peças que
faltavam (stickers + bounce real) — e, ao verificar o bounce, descobriu e corrigiu um bug bem
maior (StorefrontThemeVars morto) que retroativamente também torna genuíno o `sectionTexture`/
paleta por preset do Loop 19, não só o motion desta loop.

**Desvio do plano:** o achado de `StorefrontThemeVars` não estava no PLAN original — surgiu
durante a VERIFY do AC4. Consultado o usuário antes de corrigir (mesma disciplina do Loop 19a);
aprovado, corrigido, re-verificado no mesmo ciclo em vez de virar um carry-over.

**Retro:**
- O que ajudou: verificar o AC4 com `getComputedStyle` (valor RESOLVIDO), não só a presença da
  classe/`var()` no `style` inline — isso é o que expôs que a variável nunca existia de verdade.
  Se eu tivesse só checado `element.style.transitionTimingFunction === "var(--...)"` (o que a
  classe/JS realmente contém), o bug ficaria invisível — a verificação só funcionou por checar o
  valor COMPUTADO, pós-cascata CSS real.
- Mudar no processo: pra qualquer token CSS-var novo daqui pra frente, o passe de VERIFY deve
  sempre checar o valor computado (não só a presença da declaração), exatamente porque "a variável
  existe na minha `style` prop" e "a variável resolve pra algo real na cascata" são coisas
  diferentes — e só a segunda prova que funciona.

**Carry-overs para o próximo PLAN:**
1. `ExpressiveHome.tsx`/`IndustrialHome.tsx` continuam com `color-card`/`hard-frame` montados
   manualmente (carry-over do Loop 19, ainda adiável).
2. Próximo: Loop 21 (grão/glitch industrial de verdade) ou Loop 22 (lookbook assimétrico
   editorial), por decisão do usuário — o STOREFRONT-V3-FIDELIDADE.md já lista ambos como
   pendentes de "acabamento de marca" (prioridade 3).
