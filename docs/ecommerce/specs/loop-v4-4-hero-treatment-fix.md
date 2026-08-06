# Loop V4-4 — Hero: colisão Luxo/Minimal + fallback não-degradado do Tropical

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop V4-4 · **Depends on:** nenhum, mas vem por último entre as mudanças de conteúdo por tocar arquivos compartilhados por todos os 10 presets
**Repos touched:** lmfit-web

## Goal

7 dos 10 presets usam `heroComposition: "single"` — o mesmo cartão emoldurado, diferindo só na pele
(`heroTreatment`) e numa proporção numérica. Dois problemas concretos dentro desse grupo: Luxo
(Calvin Klein) e Minimal (COS) compartilhavam literalmente o mesmo `heroTreatment: "studio-mono"` e
o mesmo `heroAspectRatio`; Tropical (`collage`) degradava silenciosamente pro visual "single"
quando o tenant não configurava 2+ fotos de hero.

## Scope

**In:**
- Novo `HeroTreatment` `"mono-quiet"`, exclusivo do Luxo — crop vertical `4 / 5` (era `3 / 2`, igual
  ao Minimal; já casa com o `cardAspectRatio` que Luxo já tinha), overlay bem mais claro
  (`black/20` vs. `black/45` — a foto manda, menos "filtro"), legenda inferior-ESQUERDA (Minimal é
  inferior-direita) com tracking ainda mais largo (`0.3em` vs. `0.2em`).
- Novo `HeroCollageFallback`: quando `heroComposition === "collage"` mas o tenant só configurou 0-1
  `heroImages`, monta a MESMA grade `HeroCollage` (tríptico), com os 3 painéis apontando pra a
  MESMA imagem em `object-position` diferentes (`"20% 30%"`/`"80% 20%"`/`"50% 90%"`) — simula 3
  crops sem exigir foto nova do tenant, em vez de cair no visual "single" indistinguível dos outros
  7 presets.

**Out:** nenhum mecanismo de crop dinâmico/detecção de foco de imagem — os valores de
`object-position` são fixos, um ponto reconhecido como "razoável, não testado exaustivamente com
fotos reais de tenant" (ver Retro).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Novo `HeroTreatment` vs. reusar um existente | Novo membro `"mono-quiet"` no union exaustivo | `Record<HeroTreatment,...>` obriga TODO membro a ter entrada — rede de segurança de `tsc` contra esquecer de preencher os estilos |
| Fallback do Tropical | Mosaico com foto repetida (3 crops), não single | Mantém a assinatura "grade de fotos" da referência Farm Rio mesmo sem foto extra do tenant |

## Tasks

- [x] `storefrontPresets.ts`: novo `HeroTreatment`, Luxo atualizado (`mono-quiet`, `4 / 5`).
- [x] `HeroBanner.tsx`: nova entrada no `Record`, novo `HeroCollageFallback`, branch `isCollage`
      independente de `images.length > 1` pra decidir o framing.
- [x] `HeroBanner.test.tsx`: teste antigo de degradação atualizado (mosaico com 1 foto repetida, não
      single) + 2 novos testes (0 fotos, colisão Luxo/Minimal).
- [x] `tsc --noEmit` limpo; suíte completa verde.
- [x] Verificação ao vivo — Luxo vs. Minimal, Tropical com 0/1/3 fotos.

## Follow-up record
### PLAN        — [x] mesma auditoria/plano do V4-1 → Ready on 2026-08-01
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-01
### TEST        — [x] +2 web (9/9 nesta suíte, era 7) → green on 2026-08-01
### VERIFY      — [x] ao vivo, com hero real temporariamente configurado no tenant → 2026-08-01
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-01

## Verification record

Ao vivo, tenant `kivoni`: `heroTitle`/`heroImageUrl` temporariamente configurados (reusando a URL
do logo já hospedado do próprio tenant, sem inventar mídia nova) pra o `HeroBanner` renderizar.

- **Luxo** ✅ — `h2` com classe `px-8 pb-6 text-left items-start` (canto inferior-esquerdo), overlay
  `oklab(0 0 0 / 0.2)` (mais claro), `aspect-ratio: 4 / 5`.
- **Minimal** ✅ — `h2` com `px-6 pb-5 text-right items-end` (inferior-direito), overlay
  `oklab(0 0 0 / 0.45)` (mais escuro), `aspect-ratio: 3 / 2` — genuinamente diferente do Luxo nos 3
  eixos.
- **Tropical, 0 fotos** ✅ — mosaico `.grid-cols-3` com 3 `<img>`, `object-position` confirmados
  (`20% 30%`/`80% 20%`/`50% 90%`) — nunca degrada pro visual "single".

`heroTitle`/`heroImageUrl`/`themePreset` revertidos ao estado original (`""`/`""`/`streetwear`) ao
final via a mesma API real usada pra configurar.

## Result

Luxo e Minimal, que compartilhavam o mesmo hero apesar de referências opostas (Calvin Klein vs.
COS), agora divergem em crop/overlay/posição de legenda. Tropical nunca mais "some" no grupo dos 7
presets com hero "single" só por falta de foto extra configurada.

**Retro**: os valores de `object-position` do mosaico de fallback (`20% 30%` etc.) são um chute
razoável, não validado com uma variedade grande de fotos reais de tenant — se um crop específico
cortar mal um produto/rosto numa foto real, é um ajuste de valores, não de arquitetura.
