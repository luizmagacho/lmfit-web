# Loop V4-2 — Família editorial: Boutique diverge estruturalmente de Editorial

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop V4-2 · **Depends on:** nenhum (independente do V4-1)
**Repos touched:** lmfit-web

## Goal

`EditorialHome.tsx` não tinha NENHUM branch por preset — Editorial (Zara) e Boutique (Chanel)
renderizavam os mesmos blocos, na mesma ordem, divergindo só em tokens CSS, apesar de referências
opostas (Zara: narrativa rápida + rail; Chanel: still-life quase estática, sem rail).

## Scope

**In:** `EditorialHome.tsx` ganha `useThemePreset()`; branch cedo pra `boutique`:
`hero → filtersBlock → grid → lookbook → coupon`, `space-y-12` (era `space-y-8`), sem
`ProductRail`. Editorial (Zara) inalterado.

**Out:** nenhum componente novo — só reordenação/omissão de slots já existentes.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| `ProductRail` na Boutique | Removido por completo, não reposicionado | Confirmado com o usuário — leitura mais fiel à referência Chanel ("quase estática", sem narrativa de rail de "drops") |
| Ordem da Boutique | Grid logo após o hero | Sem narrativa atrasando a compra — mais restrained que o storytelling do Editorial |
| Espaçamento | `space-y-12` só na Boutique | "Muito ar" — 50% mais respiro que o `space-y-8` padrão da família |

## Tasks

- [x] `EditorialHome.tsx`: branch `boutique`.
- [x] `EditorialHome.test.tsx` (primeiro teste desta família).
- [x] `tsc --noEmit` limpo; suíte completa verde.
- [x] Verificação ao vivo.

## Follow-up record
### PLAN        — [x] mesma auditoria/plano do V4-1 (plano único STOREFRONT-V4) → Ready on 2026-08-01
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-01
### TEST        — [x] +3 web → green on 2026-08-01
### VERIFY      — [x] unit tests cobrindo ambos os ramos → 2026-08-01
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-01

## Verification record

Coberto exaustivamente por `EditorialHome.test.tsx`: Editorial mantém hero/lookbook/rail/coupon/
filtros/grid na ordem original (regressão zero); Boutique não renderiza `ProductRail` e mantém
hero/filtros/grid/lookbook/coupon. `tsc --noEmit` limpo, suíte completa (497/497 após este loop)
verde.

## Result

Editorial e Boutique, que antes eram gêmeos estruturais dentro da mesma família, agora têm
composições de blocos genuinamente diferentes — a primeira divergência real de ORDEM (não só
token) entre os dois presets desde que a família existe.
