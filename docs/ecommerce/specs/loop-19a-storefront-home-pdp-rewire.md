# Loop 19a — Religar Home/PDP à família de layout

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 19a · **Depends on:** Loop 12 (componentes de família já existem)
**Repos touched:** lmfit-web

## Goal

Hoje, `/loja` (home) e `/loja/p/[slug]` (PDP) renderizam a **mesma estrutura DOM fixa** para os 10
presets/5 famílias — os 5 componentes `*Home` e os 5 `*PDP` sob `src/layouts/storefront/{family}/`
existem, têm testes zero e **não são importados por nenhuma página real** (confirmado via grep:
`resolveLayoutFamily` só é consumido em `PublicHeader.tsx` e `StorefrontFooter.tsx`). Quando este
loop termina, trocar o preset de um tenant muda de verdade a estrutura de `/loja` e da PDP — não só
cor/fonte/header/footer — exatamente como o Loop 12 registrou como entregue.

**Causa raiz identificada:** a recuperação de `/loja` + `/catalogo` + `/conta` em 2026-07-26 (após
corrupção do `.git` pelo iCloud, ver memória `feedback_icloud_git_node_modules_corruption`)
reconstruiu `LojaClient.tsx` e `ProductDetailClient.tsx` a partir de um estado anterior ao Loop 12
(19/07). `PublicHeader.tsx`/`StorefrontFooter.tsx` vivem fora da árvore `/loja` e não foram tocados
pela reconstrução — por isso sobreviveram intactos. Este loop não é feature nova: é reverter uma
regressão silenciosa.

## Scope

**In:**
- `LojaClient.tsx` monta um `HomeSlots` real a partir do que já calcula hoje e despacha pelas 5
  famílias (mesmo padrão de `switch` já usado em `PublicHeader.tsx`).
- `ProductDetailClient.tsx` monta um `PdpSlots` real a partir do que já calcula hoje e despacha
  pelas 5 famílias.
- `IndustrialHome` recebe também `tenant` (única família com prop extra — usa no rótulo do
  marquee).
- Regressão zero pro preset `essencial` (família `classic`): DOM deve ficar idêntico ao de hoje,
  porque `ClassicHome`/`ClassicPDP` reproduzem exatamente a estrutura atual.

**Out (explicitamente):**
- Qualquer novo tratamento visual/estrutural (isso é Loop 19 em diante — a camada de composição).
- Separação de `slots.thumbs`: `ImageCarousel` já é auto-contido (setas + dots), não existe uma
  tira de miniaturas separada hoje. `thumbs` fica `null` nos 5 PDPs — honesto com o que existe,
  não um regresso (o carrossel de hoje também não tem tira de miniaturas).
- `CatalogFloatingCart`/`SimpleCatalogFilters`/`SimpleProductGrid` (usados só em `/catalogo`,
  fora do escopo de família).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Onde montar os slots | Dentro do próprio `LojaClient`/`ProductDetailClient`, não em componente novo | Mesmo padrão do `PublicHeader.tsx` — o dono do estado monta o objeto de slots e despacha |
| `thumbs` vazio | `null` nos 5 PDPs por enquanto | Não existe tira de miniaturas hoje; inventar uma agora expande escopo além de "religar o que já existia" |
| `hasHero` | `Boolean(tenant?.storefront?.heroTitle)` | Mesma condição que `HeroBanner` já usa internamente pra decidir se renderiza algo |

## Acceptance criteria

- [x] AC1 — Trocar o preset do tenant `kivoni` entre `essencial` (classic) e `editorial` muda a
      ordem/estrutura DOM de `/loja` de verdade (hero→lookbook→rail antes do grid, sem trust bar).
      *(verify: browser, inspecionar DOM antes/depois da troca)*
- [x] AC2 — Preset `essencial` (classic) renderiza a **mesma estrutura** de antes deste loop —
      regressão zero. *(verify: teste comparando ordem dos filhos renderizados)*
- [x] AC3 — Preset `streetwear` (industrial) na PDP renderiza o moodboard (`IndustrialPDP`) —
      grid de fotos sem carrossel quando há 2+ imagens. *(verify: browser, produto com 2+ fotos)*
- [x] AC4 — Preset `luxo`/`monocromo` (minimal) na Home omite trust bar e shelf de lançamentos de
      propósito (comportamento do `MinimalHome`). *(verify: browser, DOM não contém a trust bar)*
- [x] AC5 — Nenhuma regressão nos fluxos adjacentes: busca, filtros, adicionar ao carrinho,
      wishlist, reviews continuam funcionando em qualquer família. *(verify: browser walk completo
      + suíte de testes existente)*

## Design notes

**`HomeSlots` (já existe em `types.ts`):** `hero, hasHero, trustBar, coupon, lookbook, newArrivals,
filtersBlock, grid, newItems`. `LojaClient.tsx` hoje já computa tudo isso como JSX solto — só
precisa nomear e agrupar:

```tsx
const slots: HomeSlots = {
  hero: <HeroBanner />,
  hasHero: Boolean(tenant?.storefront?.heroTitle),
  trustBar: <TrustBar />,
  coupon: <CouponBanner />,
  lookbook: <Lookbook items={items} role={role} />,
  newArrivals: <NewArrivalsShelf items={items} role={role} />,
  filtersBlock: <>{<CatalogFilters />}{err ? <p ...>{err}</p> : null}</>,
  grid: <ProductGrid items={items} loading={loading} role={role} />,
  newItems: items.filter(productIsNew).slice(0, 8), // mesmo critério de NewArrivalsShelf
};
```

`productIsNew` já é exportado de `ProductGrid.tsx` — reusar, não duplicar a janela de 30 dias.

**`PdpSlots` (já existe em `types.ts`):** `backLink, gallery, thumbs, info, related, urls,
productName`. `ProductDetailClient.tsx` monta:

```tsx
const slots: PdpSlots = {
  backLink: <Link href="/loja">...</Link>,
  gallery: urls.length > 0 ? <ImageCarousel urls={urls} size="fill" /> : <div>Sem foto</div>,
  thumbs: null,
  info: <>{/* título, descrição, composição, cuidados, VariantSelector */}</>,
  related: <><RelatedProducts .../><ProductReviews .../></>,
  urls,
  productName: name,
};
```

Wishlist heart button hoje fica posicionado *dentro* da área da galeria (absolute) — mantém
posição absoluta relativa ao wrapper de `gallery`, não vira slot próprio (nenhuma família precisa
posicioná-lo diferente).

**Dispatcher (mesmo padrão de `PublicHeader.tsx`):**

```tsx
switch (resolveLayoutFamily(tenant?.storefront?.themePreset)) {
  case "editorial": return <EditorialHome slots={slots} />;
  case "minimal": return <MinimalHome slots={slots} />;
  case "expressive": return <ExpressiveHome slots={slots} />;
  case "industrial": return <IndustrialHome slots={slots} tenant={tenant} />;
  case "classic":
  default: return <ClassicHome slots={slots} />;
}
```

Mesmo switch para PDP com os 5 `*PDP`.

**Arquivos tocados:**
- `src/app/(public)/loja/LojaClient.tsx` — monta `HomeSlots` + despacha.
- `src/app/(public)/loja/p/[slug]/ProductDetailClient.tsx` — monta `PdpSlots` + despacha.
- Novos testes: `LojaClient.test.tsx`, `ProductDetailClient.test.tsx` (nenhum existia).

## Tasks

- [x] 1. `LojaClient.tsx`: importar `resolveLayoutFamily` + 5 `*Home`, montar `HomeSlots`, despachar.
- [x] 2. `ProductDetailClient.tsx`: importar `resolveLayoutFamily` + 5 `*PDP`, montar `PdpSlots`, despachar.
- [x] 3. Testes de regressão: classic = DOM de hoje; cada família renderiza sua marca (ex.: editorial
      sem trust bar, minimal sem trust bar/shelf, industrial com marquee).
- [x] 4. `tsc --noEmit` limpo; suíte completa verde.
- [x] 5. Verificação ao vivo: trocar preset do tenant `kivoni` via admin, navegar `/loja` e uma PDP,
      confirmar DOM real muda; regressão sweep (busca, carrinho, wishlist).

## Follow-up record
### PLAN        — [x] explored code · [x] draft spec · [x] decisions listed → Draft on 2026-07-29
### REFINEMENT  — [x] decisions resolved · [x] assumptions checked (grep confirmado) · [x] ACs testable · [x] DoR review → Ready on 2026-07-29
### IMPLEMENT   — [x] tasks done · [x] tsc green per task · [x] env documented (n/a) → done on 2026-07-29
### TEST        — [x] AC-named tests · [x] negative paths · suites: api 312/312 (unchanged) · web 414/414 (+9) → green on 2026-07-31
### VERIFY      — [x] browser walk + screenshots · [x] AC checklist · [x] regression sweep → all ✅ on 2026-07-31
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog · [x] living docs → merged on 2026-07-31
### PLAN AGAIN  — [x] retro · [x] carry-overs filed · [x] next loop started → started on 2026-07-31

## Verification record

- **AC1** ✅ — Ao vivo: tenant `kivoni` trocado de `streetwear`→`essencial` via `PATCH
  /tenants/:id/storefront` + reload de `/loja`. `read_page` confirmou a ordem real dos filhos:
  header clássico → `CategoryChips` → trust bar (Envios/Parcele/Compra segura) → cupom → Lookbook
  ("Look Torcedor Completo") → filtros → grid. Depois trocado de volta pra `streetwear`: header com
  aspas, `MarqueeTape` ("KIVONI STORE OFFICIAL STORE"), rótulo `«PRODUCTS»`. Screenshots capturados
  nos dois estados.
- **AC2** ✅ — `LojaClient.test.tsx` (`AC2: classic (essencial) renders the exact historical
  order`) + confirmado ao vivo (mesma ordem exata de blocos que existia antes deste loop).
- **AC3** ✅ — Ao vivo: PDP de "Camisa Flamengo I 2024" sob `streetwear` mostrou o rótulo entre
  aspas ("CAMISA FLAMENGO I 2024") e a moldura preta dura 2px (`IndustrialPDP`'s ramo de imagem
  única, já que o produto de teste não tinha 2+ fotos reais no seed). O ramo de moodboard com 2+
  fotos foi coberto por teste automatizado (`ProductDetailClient.test.tsx`, AC3), já que nenhum
  produto seedado tinha múltiplas fotos reais para exercitar ao vivo.
- **AC4** ✅ — `LojaClient.test.tsx` (`AC4: minimal (luxo/monocromo family) omits trust bar...`).
- **AC5** ✅ — Ao vivo: busca, filtros (categoria/tamanho/cor/preço), wishlist (coração no card e
  na PDP), seletor de variante, "você também pode gostar" e avaliações continuaram funcionando sob
  `essencial` e `streetwear`. Nenhum erro no console em nenhum dos dois estados.

**Achado ao vivo, não previsto no PLAN:** ao configurar o ambiente de verificação, `curl
localhost:4000/health` retornava `200` mas pertencia a um serviço TOTALMENTE diferente (a API do
projeto `imovel-scout`, que havia tomado a porta 4000 depois que o `lmfit-api` real parou de rodar
em algum momento entre o Loop 6 e agora) — status-code-only health checks mascararam a troca.
Resolvido subindo uma instância temporária do `lmfit-api` real na porta 4001 (mesmo padrão já usado
em loops anteriores), sem tocar no processo alheio. Também descoberto: o CORS do `lmfit-api` só
libera a origin exata configurada em `WEB_ORIGIN` — a instância de preview na porta 3002 (3005/3000
já ocupadas por outros projetos do usuário) precisou do `NEXT_PUBLIC_API_URL` apontado manualmente
pra 4001 em vez de depender do regex de fallback `*.localhost:PORT` (que não pareceu ser honrado na
prática — registrado como carry-over). Toda a massa de verificação foi revertida ao final:
`.env.local` de volta a `4000`, preset do tenant de volta a `streetwear`, instância 4001 encerrada
por PID exato (nunca por padrão amplo, por causa do incidente de `pkill` já registrado nesta
sessão).

## Result

**O que foi entregue:** `LojaClient.tsx` e `ProductDetailClient.tsx` agora montam `HomeSlots`/
`PdpSlots` reais e despacham pela família de layout do preset (mesmo padrão `switch` já usado em
`PublicHeader.tsx`/`StorefrontFooter.tsx`). Os 10 componentes de família (5 `*Home` + 5 `*PDP`),
código morto desde a reconstrução pós-corrupção do iCloud em 2026-07-26, agora renderizam de
verdade. `ClassicHome`/`ClassicPDP` foram ajustados pra reproduzir a estrutura viva de antes deste
loop com fidelidade — `ClassicHome` byte-a-byte (mesma classe `space-y-6`/`space-y-4` aninhada);
`ClassicPDP` **não** é byte-a-byte porque a estrutura viva de PDP já era ela mesma um regresso
(coluna única, sem galeria sticky) — `ClassicPDP` restaura o layout de duas colunas que o blueprint
(STOREFRONT-V2.md §2.4) sempre previu, uma correção deliberada, não um efeito colateral.

**Desvio do plano registrado no PLAN:** nenhum além do já anotado acima (AC2 originalmente previa
"regressão zero" também pra PDP; refinado durante IMPLEMENT ao descobrir que a PDP viva já não
tinha a estrutura que `ClassicPDP` sempre teve como alvo).

**Bug sistêmico encontrado, fora de escopo:** ~30 arquivos em `src/components/organisms/` e os 5
`*Header.tsx` de família não importam `React` explicitamente — invisível em produção (Next.js
resolve JSX automaticamente via SWC), mas quebra com `ReferenceError: React is not defined` assim
que qualquer um ganha um teste de render real via Testing Library (o pipeline vitest/esbuild deste
projeto não tem plugin JSX automático). Corrigidos apenas os que entravam no caminho de render real
do código deste loop (14 arquivos: `LojaClient`, `ProductDetailClient`, os 5 `*Home`, os 5 `*PDP`,
`ProductRail`, `MarqueeTape`, `Skeleton`). Os ~30 restantes (incluindo os 5 `*Header.tsx`, que já
funcionavam antes deste loop) ficam como dívida — spawnada como tarefa separada.

**Retro:**
- O que ajudou: explorar o código real (grep de `resolveLayoutFamily`) antes de escrever qualquer
  spec — a suposição inicial (baseada no STOREFRONT-V2.md/Loop 12) era que a "camada de estrutura"
  já estava entregue; o grep provou o contrário em minutos.
- O que atrapalhou: o ambiente de verificação teve 3 problemas de infraestrutura não relacionados
  ao código (porta 4000 ocupada por outro projeto do usuário, CORS restrito a uma origin exata,
  `computer{action:"scroll"}` ocasionalmente reportando timeout mesmo quando a rolagem funcionava)
  — nenhum deles é um bug deste loop, mas consumiram tempo de verificação.
- Mudar no processo: ao verificar ao vivo depois de um `preview_start`, checar o **corpo** da
  resposta de `/health` (não só o status HTTP) antes de assumir que é o serviço certo.

**Carry-overs para o próximo PLAN:**
1. `~30` arquivos de organismo + os 5 `*Header.tsx` sem `import * as React` explícito (bug latente,
   spawnado como tarefa separada).
2. Investigar por que o regex `^https?:\/\/([^.]+\.)?localhost(:\d+)?$` no CORS do `lmfit-api` não
   pareceu ser honrado na prática (sempre refletiu a origin estática configurada).
3. Nenhuma tira de miniaturas (`thumbs`) existe em nenhuma família — `null` em todas as 5, honesto
   com o que existia antes deste loop, não uma lacuna nova.
4. Próximo: Loop 19 (fundação da camada de composição) + Loop 20 (mosaico Tropical/Farm Rio), por
   decisão do usuário — agora com Home/PDP genuinamente religados como base real.
