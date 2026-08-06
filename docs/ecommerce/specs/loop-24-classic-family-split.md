# Loop 24 — Separar a família classic: Atlético vs. Essencial vs. Impacto

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 24 · **Depends on:** Loop 23 (`useThemePreset`, padrão de ramificação intra-família)
**Repos touched:** lmfit-web

## Goal

`ClassicHome.tsx` renderiza a mesma estrutura pros 3 presets (Essencial/Renner, Atlético/Nike,
Impacto) — só cor/fonte varia. Dos itens que o plano pede, a maioria já é 100% tokens (tipo
condensado gigante do Atlético — Loop 4e; grid denso escuro — Loop 4d/4f; hero `media-first` —
Loop 19; tipo geométrico do Impacto — Loop 4e). Restam 2 itens genuinamente novos: **tiles de
categoria com foto** (Essencial) e **rail de "drops"** (Atlético).

## Scope

**In:**
- Novo `CategoryTiles.tsx` — deriva um tile por categoria (foto + rótulo) do catálogo já
  carregado (`slots.newItems`), sem endpoint novo (o endpoint de categorias existente só devolve
  nomes, sem foto). Clicar filtra pelo mesmo `useCatalogStore().setFilter` que `CategoryChips` já
  usa.
- `ClassicHome.tsx` ramifica por preset (`useThemePreset`, padrão do Loop 23): Essencial ganha
  `CategoryTiles`; Atlético troca a prateleira de lançamentos por `ProductRail` (já existente,
  Loop 12) com título = `newBadgeLabel` do preset ("NOVO DROP"); Impacto fica intocado.

**Out:**
- Qualquer mudança em `ClassicHeader`/`ClassicPDP` — o plano não pede divergência pra esses.
- Endpoint novo de categorias-com-foto no backend — `CategoryTiles` deriva do catálogo já em mãos.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Fonte da foto por categoria | Primeira foto encontrada em `slots.newItems`, cruzando por nome de categoria | O endpoint `/public/catalog/categories` só devolve `string[]`, sem foto — mudar o backend seria escopo maior que um flourish de composição |
| `slots.newItems` como fonte, não o catálogo completo | Aceito como limitação conhecida | `HomeSlots` só expõe itens recentes, não a lista completa — mudar o contrato afetaria as 5 famílias; documentado como "carregado pra depois" |
| Essencial deixa de ser "o preset que nunca muda" | Sim, mudança deliberada | O próprio plano pede algo novo pra Essencial; Impacto assume o papel de regressão-floor da família classic a partir de agora |

## Acceptance criteria

- [ ] AC1 — Preset Essencial: home mostra `CategoryTiles` (foto + rótulo por categoria) entre o
      cupom e a prateleira de lançamentos. *(verify: teste unitário + browser)*
- [ ] AC2 — Preset Atlético: home mostra `ProductRail` (rail horizontal) em vez da prateleira de
      lançamentos, com título "NOVO DROP". *(verify: teste unitário + browser)*
- [ ] AC3 — Preset Impacto: home continua idêntica à composição genérica de sempre (hero,
      trustBar, cupom, prateleira, lookbook, filtros+grid) — vira a nova regressão-floor da
      família. *(verify: teste unitário)*
- [ ] AC4 — `deriveCategoryTiles`: 1 tile por categoria (primeira foto encontrada), sem
      duplicatas, ignora produtos sem categoria. *(verify: teste unitário)*

## Tasks

- [x] 1. `CategoryTiles.tsx` (+ `deriveCategoryTiles` pura, exportada e testável).
- [x] 2. `ClassicHome.tsx`: ramificação Essencial/Atlético/Impacto.
- [x] 3. Testes unitários (AC1-4) + correção do teste de regressão existente (`LojaClient.test.tsx`,
      que precisa mockar `CategoryTiles` e atualizar a ordem esperada pro Essencial).
- [x] 4. `tsc --noEmit` limpo; suíte completa verde.
- [x] 5. Verificação ao vivo: os 3 presets da família classic com composições de home genuinamente diferentes.

## Follow-up record
### PLAN        — [x] explored code · [x] draft spec · [x] decisions listed → Draft on 2026-07-31
### REFINEMENT  — [x] decisions resolved · [x] assumptions checked · [x] ACs testable · [x] DoR review → Ready on 2026-07-31
### IMPLEMENT   — [x] tasks done · [x] tsc green per task → done on 2026-07-31
### TEST        — [x] AC-named tests · [x] pre-existing suite fixed → api 312/312 (unchanged), web 473/473 (+8) → green on 2026-07-31
### VERIFY      — [x] browser/DOM walk · [x] AC checklist → all ✅ on 2026-07-31
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog → merged on 2026-07-31
### PLAN AGAIN  — [x] retro · [x] carry-overs filed → on 2026-07-31

## Verification record

Verificado ao vivo contra o tenant `kivoni` real, numa instância temporária do `lmfit-api`
(porta 4001, reaproveitada de uma já saudável). O catálogo real do tenant não tinha nenhum item
dentro da janela de "lançamento" (`productIsNew`, baseado em `createdAt`) — criado um produto
temporário ("Produto Teste Loop24", categoria "Categoria Teste Loop24", `createdAt` = agora) só
pra ter massa de teste real, deletado ao final.

- **AC1** ✅ — Preset Essencial: screenshot confirma `CategoryTiles` renderizando um tile real
  (foto + rótulo "Categoria Teste...") entre o cupom e a prateleira "Lançamentos" — exatamente a
  ordem desenhada.
- **AC2** ✅ — Preset Atlético (`performance`): `document.body.textContent` contém "NOVO DROP"
  (título do `ProductRail`); busca por tiles de foto (`button` com filho `.overflow-hidden`)
  retornou 0 — confirma que `CategoryTiles` não vaza pra esse preset.
- **AC3** ✅ — Coberto por `ClassicHome.test.tsx`: preset `impacto` mantém `newArrivals` e não
  mostra `category-tiles` nem `product-rail`.
- **AC4** ✅ — `CategoryTiles.test.tsx`: `deriveCategoryTiles` cobre duplicata (1 tile por
  categoria, primeira foto), produto sem categoria (ignorado) e catálogo vazio.

Toda a massa de verificação foi revertida ao final: produto temporário deletado, preset do tenant
de volta a `streetwear`, `.env.local` de volta a `4000`, instância temporária do `lmfit-api`
encerrada por PID exato.

## Result

**O que foi entregue:** novo `CategoryTiles.tsx` (+ `deriveCategoryTiles` pura) — deriva um tile
foto+rótulo por categoria a partir do catálogo já carregado (`slots.newItems`), sem endpoint novo
(o endpoint de categorias existente só devolve nomes). `ClassicHome.tsx` ramifica por preset
(`useThemePreset`, mesmo padrão do Loop 23): Essencial ganha `CategoryTiles`; Atlético troca a
prateleira de lançamentos por `ProductRail` (já existente desde o Loop 12, só reusado) com título
= `newBadgeLabel` do preset; Impacto assume o papel de regressão-floor da família (composição
genérica, intocada — o pedido dele, tipo geométrico gigante, já era 100% tokens desde o Loop 4e).

**Desvio do plano:** nenhum item foi cortado, mas uma limitação real ficou registrada: `CategoryTiles`
deriva só de `slots.newItems` (itens "recentes"), não do catálogo completo — um tenant com muitas
categorias mas poucos lançamentos recentes veria menos tiles do que categorias reais existem.
Mudar isso exigiria alterar o contrato `HomeSlots` (usado pelas 5 famílias) — fora do escopo de
um flourish de composição.

**Achado real durante o TEST**: o mesmo padrão do Loop 23 se repetiu — `LojaClient.test.tsx`
(Loop 19a) quebrou porque seu mock de organismos não incluía `CategoryTiles`, e a asserção de
ordem EXATA do preset essencial precisou ser atualizada pra incluir o elemento novo (uma mudança
estrutural deliberada, não uma regressão silenciosa).

**Retro:**
- O que ajudou: o `grep` proativo por `vi.mock("@/context/TenantContext"` antes de rodar a suíte
  completa — lição do Loop 23 aplicada aqui pra prevenir, não só corrigir depois.
- Padrão que se consolidou: 3 loops seguidos (23→24) usando `useThemePreset()` pra ramificar
  dentro do MESMO componente de família, em vez de criar componentes novos — a decisão do
  Loop 19 §3.2 se provou certa na prática, não só na teoria.

**Carry-overs para o próximo PLAN:**
1. `CategoryTiles` limitado a `slots.newItems` (ver "Desvio do plano" acima).
2. Com este loop, os 2 itens de "maior ganho de diferenciação" (prioridade 2) do
   STOREFRONT-V3-FIDELIDADE.md estão completos (Loops 23 e 24). Resta só o Loop 25 (coreografia
   de movimento transversal, prioridade 4) — o último item do plano inteiro.
