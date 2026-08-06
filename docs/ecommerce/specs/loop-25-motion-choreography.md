# Loop 25 — Coreografia de movimento (transversal)

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 25 (último loop do plano) · **Depends on:** Loop 20 (StorefrontThemeVars religado — motion tokens resolvendo de verdade)
**Repos touched:** lmfit-web

## Goal

Último item do STOREFRONT-V3-FIDELIDADE.md. Diferente dos Loops 20-24 (flourish POR preset), este
é transversal: 2 comportamentos que valem pra TODOS os presets, cada um automaticamente "sentindo"
diferente por causa dos tokens de motion (`motionDurationMs`/`motionEasing`) que o Loop 20 religou
— sem precisar de uma tabela de animação por preset, os 10 já têm timing próprio desde o Loop 4d.

## Scope

**In:**
- **Header hide-on-scroll** (carregado do Loop 12): `PublicHeader.tsx` ganha um wrapper que
  esconde o header ao rolar pra baixo e reaparece ao rolar pra cima — comportamento único, não
  diferenciado por família (é assim que o plano descreve: fora da lista com marcadores por
  preset).
- **Scroll-reveal**: novo `ScrollReveal.tsx` (IntersectionObserver, fade + translate-up) — a
  duração/curva vêm dos MESMOS tokens de motion já existentes, então cada preset "sente" diferente
  sem precisar de uma animação escrita à mão por preset (Tropical bounça de verdade por causa da
  curva `cubic-bezier` com overshoot; Atlético é rápido/`ease-out`; Minimal é praticamente instant/
  `linear` — "cortes secos" já é literalmente o token dele). Aplicado só na grade de produtos (o
  elemento mais universal — presente nas 5 famílias), não em cada bloco de cada Home.
- `prefers-reduced-motion`: `ScrollReveal` verifica antes de animar — se o usuário pediu, o
  conteúdo aparece direto, sem transição nenhuma. Hide-on-scroll do header faz o mesmo (sem
  esconder, sempre visível).

**Out:**
- Parallax de verdade ligado à posição de scroll (não só reveal-on-enter) — o plano descreve
  "parallax leve" pro Editorial, mas isso exigiria um mecanismo genuinamente diferente (transform
  atrelado ao scroll, não só um fade-in único); a duração mais lenta do preset (600ms, a mais
  lenta dos 10) já entrega uma sensação de deriva sem precisar de um sistema novo — registrado como
  interpretação deliberada, não uma cópia literal do texto do plano.
- Reveal em cada bloco individual de cada Home (hero, lookbook, trust bar, etc.) — escopo maior que
  uma coreografia "transversal"; só a grade (o elemento universal) ganha o efeito.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Timing por preset | Reusa `motionDurationMs`/`motionEasing` já existentes (Loop 4d, religados no Loop 20) | Nenhuma tabela de animação nova — os 10 presets já têm timing próprio; construir em cima do que já religa é o padrão que se consolidou nos Loops 20-24 |
| Onde aplicar o reveal | Só `{slots.grid}` nas 5 `*Home.tsx` | "Transversal" = 1 mecanismo pra todos, não redesenho de cada bloco; a grade é o único elemento universal às 5 famílias |
| "Parallax leve" do Editorial | Interpretado como a duração mais lenta do preset (600ms), não parallax de scroll de verdade | Parallax real exigiria um mecanismo à parte só pra 1 preset — contra o princípio de reusar, não inventar, já aplicado desde o Loop 20 |
| `prefers-reduced-motion` | Verificado em JS (`matchMedia`), não só CSS | O reveal manipula opacity/transform via inline style computado em JS — um `@media` CSS sozinho não bastaria pra pular a lógica do `IntersectionObserver` |

## Acceptance criteria

- [ ] AC1 — Rolar a página pra baixo esconde o header; rolar pra cima o traz de volta.
      *(verify: browser)*
- [ ] AC2 — A grade de produtos aparece com fade+translate-up quando entra na viewport (não visível
      antes disso). *(verify: teste unitário com `IntersectionObserver` mockado + browser)*
- [ ] AC3 — Com `prefers-reduced-motion: reduce`, nem o hide-on-scroll nem o reveal animam — o
      conteúdo fica sempre visível/estático. *(verify: teste unitário)*
- [ ] AC4 — A duração/curva do reveal são as MESMAS `--kivoni-storefront-motion-*` já usadas nos
      Loops 19-24 — nenhuma tabela de animação nova por preset. *(verify: teste unitário)*

## Tasks

- [x] 1. `PublicHeader.tsx`: wrapper de hide-on-scroll.
- [x] 2. Novo `ScrollReveal.tsx`.
- [x] 3. Envolver `{slots.grid}` com `<ScrollReveal>` nas 5 `*Home.tsx`.
- [x] 4. Testes unitários (AC1-4).
- [x] 5. `tsc --noEmit` limpo; suíte completa verde.
- [x] 6. Verificação ao vivo: scroll real no navegador (header + reveal) em pelo menos 2 presets com timing bem diferente (Tropical vs. Streetwear).

## Follow-up record
### PLAN        — [x] explored code · [x] draft spec · [x] decisions listed → Draft on 2026-07-31
### REFINEMENT  — [x] decisions resolved · [x] assumptions checked · [x] ACs testable · [x] DoR review → Ready on 2026-07-31
### IMPLEMENT   — [x] tasks done · [x] tsc green per task → done on 2026-07-31
### TEST        — [x] AC-named tests · suites: api 312/312 (unchanged), web 482/482 (+9) → green on 2026-07-31
### VERIFY      — [x] browser/DOM walk · [x] AC checklist → all ✅ on 2026-07-31 (com 1 limitação honesta, ver abaixo)
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog → merged on 2026-07-31
### PLAN AGAIN  — [x] retro · [x] carry-overs filed → on 2026-07-31 (último loop do plano)

## Verification record

Verificado ao vivo contra o tenant `kivoni` real, numa instância temporária do `lmfit-api`
(porta 4001, reaproveitada).

- **AC1** ✅ — Real: `window.scrollTo` + espera; header (`.sticky.top-0`) foi de
  `matrix(1,0,0,1,0,0)` (visível) pra `matrix(1,0,0,1,0,-51)` (escondido, -51px = a própria altura
  do header) ao rolar pra baixo passando dos 80px, e voltou pra `matrix(1,0,0,1,0,0)` ao rolar pra
  cima — comportamento confirmado nos dois sentidos.
- **AC2** ✅ — Coberto exaustivamente por `ScrollReveal.test.tsx` (estado antes/depois da
  interseção); ao vivo, confirmado que o wrapper real existe no DOM com `opacity` resolvendo pra
  `1` (revelado) — a grade já estava dentro da viewport no momento da checagem, então o estado
  "antes" só foi capturado pelo teste unitário, não ao vivo (limitação honesta: timing
  assíncrono do `IntersectionObserver` real é difícil de capturar no meio de uma automação de
  navegador sem introduzir instabilidade artificial no teste).
- **AC3** ✅ — Coberto por `ScrollReveal.test.tsx`/`PublicHeader.test.tsx` (ambos com
  `matchMedia` mockado pra `reduce`). **Limitação honesta**: as ferramentas de navegador
  disponíveis nesta sessão não expõem emulação de `prefers-reduced-motion` (diferente de
  `resize_window`, que só cobre light/dark/tamanho) — não foi possível confirmar ao vivo no
  navegador real, só via teste unitário com `matchMedia` mockado.
- **AC4** ✅ — Ao vivo, comparando 2 presets: Streetwear resolveu `computedEasing: "linear"`
  (seu próprio token); Tropical resolveu `computedEasing: "cubic-bezier(0.34, 1.56, 0.64, 1)"` +
  `computedDuration: "0.18s"` — a MESMA implementação de `ScrollReveal`, sentindo genuinamente
  diferente por causa dos tokens já existentes, sem tabela de animação nova.

Toda a massa de verificação foi revertida ao final: preset do tenant de volta a `streetwear`,
`.env.local` de volta a `4000`, instância temporária do `lmfit-api` encerrada por PID exato.

## Result

**O que foi entregue** — os 2 comportamentos transversais do plano: `PublicHeader.tsx` ganha
hide-on-scroll (esconde ao rolar pra baixo além de 80px, volta ao rolar pra cima), aplicado a
TODOS os presets igualmente (não diferenciado por família, como o próprio plano descreve); novo
`ScrollReveal.tsx` (fade + translate-up via `IntersectionObserver`) envolve a grade de produtos
nas 5 `*Home.tsx` — a ÚNICA peça de código nova, porque a duração/curva vêm dos mesmos tokens de
motion já reais desde o Loop 20, então cada preset já "sente" diferente sem precisar de uma
animação por preset escrita à mão. `prefers-reduced-motion` é checado num único lugar
(`prefersReducedMotion()`, exportado de `ScrollReveal.tsx`) e reusado tanto pelo reveal quanto
pelo hide-on-scroll do header — nenhum dos dois anima quando o usuário pediu menos movimento.

**Desvio do plano:** "parallax leve" do Editorial foi interpretado como a duração mais lenta dos
10 presets (600ms) aplicada ao mesmo `ScrollReveal`, não um mecanismo de parallax de scroll de
verdade (que exigiria transform atrelado à posição de scroll, um sistema à parte só pra 1
preset) — decisão registrada na spec antes do IMPLEMENT, não uma simplificação silenciosa
descoberta depois.

**Achado real, 5ª ocorrência nesta sessão**: `PublicHeader.tsx` também não importava `React`
explicitamente — o mesmo bug sistêmico encontrado em `Badge.tsx`/`WishlistHeartButton.tsx`/
`PriceTag.tsx`/`Button.tsx` nos loops anteriores, sempre no mesmo padrão (só aparece quando o
componente ganha seu primeiro teste de render de verdade). Fixado inline, mesmo que os loops
anteriores.

**Retro:**
- O que ajudou: usar `window.scrollTo` via `javascript_tool` em vez da ferramenta `computer`
  de scroll (que tem um teto de `scroll_amount` de 10 e exige um screenshot prévio) — mais
  direto e confiável pra simular scroll real de página no navegador.
- Limitação genuína, não escondida: `prefers-reduced-motion` só foi verificado via teste
  unitário (matchMedia mockado), não ao vivo no navegador real — as ferramentas desta sessão não
  expõem essa emulação. Registrado explicitamente, não sonegado.
- Com este loop, **os 7 loops do plano STOREFRONT-V3-FIDELIDADE.md (19-25) estão completos** —
  o último item da priorização (§5, "polimento") fechado.

## Fim do plano STOREFRONT-V3-FIDELIDADE.md

Loops 19 (fundação de composição), 20 (Tropical), 21 (Streetwear), 22 (Editorial + confirmação
Boutique), 23 (separação minimal: Luxo/Wellness/Minimal), 24 (separação classic: Atlético/
Essencial/Impacto) e 25 (coreografia de movimento) — todos ✅ Done. Os 10 presets de storefront
agora têm composição, tipografia, paleta E motion genuinamente distintos onde o plano pedia,
reaproveitando o mesmo mecanismo de tokens em vez de bifurcar componentes a cada novo pedido.
