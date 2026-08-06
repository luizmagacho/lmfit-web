# Storefront V4 — Diferenciação estrutural (headers, hero, blocos de home)

> **Objetivo:** depois de STOREFRONT-V3-FIDELIDADE.md (Loops 19-25, ✅ Done — tokens ricos +
> flourishes pontuais por preset), o usuário revisou a loja ao vivo e apontou: "pra mim todos os
> presets são iguais, mesma ordem, mesmos estilos de apresentação, nenhum tem um grande banner ou
> menu diferentes... quero mais detalhes que der mais a cara de cada um diferente do outro."
>
> Duas auditorias de código (leitura completa, não grep) confirmaram: 2 das 5 famílias de header
> (Minimal, Expressive — 4 presets) não tinham NENHUM mecanismo de navegação; 7 dos 10 presets
> usavam o mesmo hero "single" emoldurado; `EditorialHome.tsx` não tinha branch algum por preset
> (Editorial e Boutique 100% idênticos em ordem de blocos).

## Diagnóstico — 3 lacunas concretas

| # | Lacuna | Achado |
|---|---|---|
| 1 | Headers | `MinimalHeader.tsx`/`ExpressiveHeader.tsx` — zero nav, servindo 4 presets (Luxo/Wellness/Minimal/Tropical) com referências opostas |
| 2 | Hero | 7/10 presets em `heroComposition:"single"`; Luxo e Minimal compartilhavam literalmente o mesmo `heroTreatment`; Tropical degradava pro visual "single" sem 2+ fotos configuradas |
| 3 | Blocos da home | `EditorialHome.tsx` sem branch — Editorial/Boutique idênticos em ordem/conjunto de blocos; `ClassicHome.tsx`'s Impacto era o fallback silencioso da família |

## Loops

| # | Loop | O que fechou | Status | Spec |
|---|---|---|---|---|
| V4-1 | Cabeçalhos: Minimal se divide + Expressive ganha nav | Luxo/Wellness/Minimal/Tropical ganham cada um seu próprio tratamento de nav | ✅ | [loop-v4-1](./specs/loop-v4-1-header-differentiation.md) |
| V4-2 | Editorial/Boutique divergem estruturalmente | Boutique perde `ProductRail`, ganha mais respiro e ordem própria | ✅ | [loop-v4-2](./specs/loop-v4-2-editorial-boutique-split.md) |
| V4-3 | Impacto sai do fallback + achado crítico | Faixa de marquee animado pro Impacto **+** `storefront-themes.css` religado (nunca importado desde o Loop 4 — fonte/raio por preset nunca aplicavam de verdade) | ✅ | [loop-v4-3](./specs/loop-v4-3-impacto-marquee.md) |
| V4-4 | Colisão Luxo/Minimal + fallback do Tropical | Luxo ganha `heroTreatment` próprio; Tropical nunca mais degrada pro visual "single" | ✅ | [loop-v4-4](./specs/loop-v4-4-hero-treatment-fix.md) |

## Mecanismo (não inventa nada novo)

Todo o plano estende o mesmo padrão já estabelecido em STOREFRONT-V3 (Loop 19 §3.2):
`useThemePreset()` (id bruto do preset ativo) ramificando blocos condicionais DENTRO do componente
de família compartilhado — nunca um componente novo por preset, nunca uma 6ª família de layout.
Aplicado agora a headers (antes só homes usavam) e à família `editorial` (antes sem branch algum).

## Achado fora do escopo original, fechado no mesmo loop (V4-3)

`src/app/(public)/storefront-themes.css` existe desde o Loop 4 (2026-07-16) — contém os overrides
de `font-family`/`border-radius` por preset e a animação `.kivoni-ticker-track` — mas nunca foi
importado em lugar nenhum do app. As variáveis CSS (`--kivoni-font-display`, `--kivoni-radius`)
resolviam certo desde sempre; a regra que as CONSOME nunca carregava. Resultado real, medido ao
vivo antes do fix: `.storefront-brand-heading` computava `Geist` (fonte do painel admin) e
`.rounded-2xl` computava `12px` (padrão Tailwind) em QUALQUER preset. Fixado com 1 linha de import
em `(public)/layout.tsx`; confirmado que o Next.js App Router escopa esse import só pro route group
`(public)` — não vaza pro admin/PDV. Mesma causa raiz do Loop 20 (`StorefrontThemeVars` morto),
mesma janela temporal (reconstrução pós-corrupção do iCloud de 2026-07-26).

## Fim do plano STOREFRONT-V4-DIFERENCIACAO.md

Loops V4-1 a V4-4 — todos ✅ Done. Os 10 presets agora têm navegação, composição de hero e ordem de
blocos de home genuinamente distintos onde o usuário apontou que não tinham, além do achado crítico
que faz TODO o trabalho de tipografia/raio por preset desde o Loop 4 finalmente aparecer na tela.
Verificação final consolidada (10 presets, regressão zero) registrada no Loop V4-5
(ROADMAP.md changelog).
