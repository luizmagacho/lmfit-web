# Loop V4-1 — Cabeçalhos: Minimal se divide por preset + Expressive ganha navegação

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop V4-1 · **Depends on:** nenhum (isolado, só toca headers)
**Repos touched:** lmfit-web

## Goal

Achado mais grave da auditoria de fidelidade pós-STOREFRONT-V3: 4 dos 10 presets (Luxo/Wellness/
Minimal — família `minimal` — e Tropical — família `expressive`) compartilhavam um header sem
NENHUM mecanismo de navegação, apesar de referências de marca opostas (Calvin Klein/Lululemon/COS/
Farm Rio). O usuário apontou isso diretamente ("nenhum tem... menu diferentes").

## Scope

**In:**
- `MinimalHeader.tsx` ganha `useThemePreset()` e ramifica em 3 tratamentos: Luxo (logo
  centralizada, busca vira ícone que expande em input ao clicar, sem nav), Wellness (`CategoryChips`
  como segunda linha — realocado de `MinimalHome.tsx`), Minimal/COS (nav de texto seco, 3 links).
- `ExpressiveHeader.tsx` ganha uma segunda faixa clara com `CategoryChips` abaixo da barra colorida.

**Out:** Industrial/Classic/Editorial já tinham nav própria (fora do escopo deste loop).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Busca do Luxo | Ícone que expande em input ao clicar (não sempre visível) | Confirmado com o usuário — fidelidade à referência ("cromo quase zero") vale mais que manter a busca sempre visível |
| CategoryChips do Wellness | Movido do corpo da home pro header | Confirmado com o usuário — é onde uma nav de verdade pertence, resolve o header vazio ao mesmo tempo |
| Nav do Minimal(COS) | Texto puro, mesmas rotas de `EditorialHeader.tsx` | Reusa link/rota já existente, "anti-design" pede o mínimo de chrome possível |

## Tasks

- [x] `MinimalHeader.tsx`: branch Luxo/Wellness/Minimal.
- [x] `MinimalHome.tsx`: remove `CategoryChips` do ramo Wellness (mantém `TrustBar`).
- [x] `ExpressiveHeader.tsx`: segunda faixa com `CategoryChips`.
- [x] `MinimalHeader.test.tsx`/`ExpressiveHeader.test.tsx` (primeiros testes destes componentes).
- [x] `MinimalHome.test.tsx` atualizado (AC2 não espera mais `category-chips` dentro da home).
- [x] `tsc --noEmit` limpo; suíte completa verde.
- [x] Verificação ao vivo via Settings "Ver ao vivo".

## Follow-up record
### PLAN        — [x] 2 agentes Explore (auditoria de headers+home+hero+tokens) · [x] 1 agente Plan · [x] 4 perguntas de design resolvidas com o usuário → Ready on 2026-08-01
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-01
### TEST        — [x] +9 web (494/494, era 488) → green on 2026-08-01
### VERIFY      — [x] ao vivo nos 4 presets afetados → 2026-08-01
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-01

## Verification record

Verificado ao vivo contra o tenant `kivoni` real (instância temporária do `lmfit-api`, porta 4001).

- **Luxo** ✅ — header com `grid-template-columns` de 3 colunas (logo centralizada), sem
  `<input type="search">` visível, com `<button aria-label="Buscar produto">`; clicar no botão
  revela o input (confirmado via `fireEvent`/JS real).
- **Wellness** ✅ — `nav[aria-label="Categorias"]` presente no header; `MinimalHome` não duplica.
- **Minimal** ✅ — `nav[aria-label="Navegação"]` com texto "Loja"/"Quem somos"/"Contato", sem
  `CategoryChips`.
- **Tropical** ✅ — `nav[aria-label="Categorias"]` presente como segunda faixa do `ExpressiveHeader`.

Preset revertido a `streetwear` ao final; instância temporária do `lmfit-api` reaproveitada dos
loops anteriores da sessão.

## Result

Os 4 headers antes idênticos agora são estruturalmente distintos — cada um com o mecanismo de nav
(ou ausência deliberada dele, no caso do Luxo) que a própria referência de marca pede.
