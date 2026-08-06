# Storefront V3 — Fidelidade dos tipos de loja às marcas de referência

> **Objetivo:** cada um dos 10 presets deve ser reconhecível como o *gênero de loja* que o inspirou.
> Hoje eles são distinguíveis (cor/fonte/ordem de blocos), mas não são *reconhecíveis* — um cliente
> que conhece Nike e Renner não diria "essa é uma loja tipo Nike" olhando o preset Atlético.
>
> Continuação de [STOREFRONT-V2.md](./STOREFRONT-V2.md) §2.10 e do Loop 12.
> Tudo multi-tenant: nada hardcoded por lojista; o preset é escolhido no admin "Loja online".

**Atualização (2026-07-31, pós Loop 19a):** a linha "Camada 2" abaixo estava **errada** quando
escrita — o PLAN do Loop 19 descobriu, ao explorar o código real, que os 5 `*Home`/5 `*PDP` do
Loop 12 eram **código morto**: nenhuma página real os importava (`LojaClient.tsx`/
`ProductDetailClient.tsx` renderizavam uma estrutura fixa, ignorando o preset). Causa raiz: a
reconstrução de `/loja` pós-corrupção do iCloud em 2026-07-26 reverteu essas duas páginas pra um
estado anterior ao Loop 12; `PublicHeader.tsx`/`StorefrontFooter.tsx` (fora da árvore `/loja`)
sobreviveram intactos. O **Loop 19a** religou os dois — ver [loop-19a](./specs/loop-19a-storefront-home-pdp-rewire.md).
A tabela abaixo já reflete o estado corrigido.

---

## 1. Diagnóstico — por que ainda não se parece

A fidelidade a uma marca de referência mora em **4 camadas**. Só duas estão prontas.

| Camada | O que é | Estado | Onde vive |
|---|---|---|---|
| **1. Tokens (pele)** | Cor, fonte, raio, tracking, caixa, duração de motion | ✅ **Rica e completa** | `theme/storefrontPresets.ts` (10 presets × 18 tokens) |
| **2. Estrutura de família** | *Quais* blocos aparecem e em *que ordem* | ✅ Entregue no Loop 12 **e religada de verdade no Loop 19a** (antes disso era código morto) — ainda **limitada a reordenar/omitir** | `layouts/storefront/{family}/`, despachado por `LojaClient.tsx`/`ProductDetailClient.tsx` |
| **3. Composição interna do bloco** | O que um hero/grid/lookbook **é** — mosaico, assimetria, textura, split-screen | ❌ **Praticamente ausente** | — |
| **4. Divergência entre presets da mesma família** | Nike ≠ Renner, mesmo ambos sendo "classic" | ❌ **Ausente** | — |

### 1.1 A evidência (medida, não estimada)

Os componentes de Home das 5 famílias têm **20 a 34 linhas**. Eles não compõem nada — apenas
reordenam slots prontos:

```tsx
// ClassicHome.tsx (20 linhas)          // EditorialHome.tsx (20 linhas)
{slots.hero}                            {slots.hero}
{slots.trustBar}                        {slots.lookbook}
{slots.coupon}                          <ProductRail … />
{slots.newArrivals}                     {slots.coupon}
{slots.lookbook}                        {slots.filtersBlock}
{slots.filtersBlock}                    {slots.grid}
{slots.grid}
```

A diferença entre "loja tipo Zara" e "loja tipo Renner" hoje é: **a ordem dos mesmos blocos, mais
duas omissões.** As marcas de referência não diferem na ordem dos blocos — diferem no que cada
bloco é.

### 1.2 O que já é bom (e não deve ser refeito)

Importante não jogar fora o que funciona:

- `HeroBanner.tsx` **já implementa os 8 `heroTreatment`** (`calm-caption`, `full-bleed-overlay`,
  `action-frame`, `still-life`, `color-block`, `wellness-soft`, `impact-bold`, `studio-mono`) via
  mapa de estilos — posição, overlay e tipografia mudam de verdade por preset.
- `ProductGrid.tsx` **já lê** `plpColumns`, `cardAspectRatio`, `plpGap`, `newBadgeLabel` e
  `cardFrame` (`border` / `borderless` / `hard-border`).
- Contraste WCAG AA é validado por preset (`isPaletteContrastSafe`, piso 4.5:1).

**A limitação real:** esses 8 tratamentos de hero são *variações de estilo sobre uma única
estrutura DOM* (uma imagem + texto sobreposto). E o `ProductGrid` renderiza **uma grade uniforme** —
todos os cards do mesmo tamanho, sempre. Não existe mosaico, assimetria, split-screen, textura nem
vídeo em lugar nenhum.

### 1.3 O problema mais agudo: 6 dos 10 presets são estruturalmente gêmeos

| Família | Presets que a compartilham | Marcas que deveriam ser distintas |
|---|---|---|
| `classic` | **Essencial**, **Atlético**, **Impacto** | Renner (loja de departamento) vs. Nike (drop culture, escuro) |
| `minimal` | **Luxo**, **Wellness**, **Minimal** | Calvin Klein (B&W austero) vs. Lululemon (quente, lifestyle) |
| `editorial` | **Editorial**, **Boutique** | Zara (assimétrico) vs. Chanel (simétrico, still-life) |
| `expressive` | Tropical | Farm Rio |
| `industrial` | Streetwear | Off-White |

Calvin Klein e Lululemon **não são a mesma loja com cores diferentes** — são gêneros opostos
(austeridade fotográfica vs. acolhimento lifestyle). Hoje ambos renderizam o mesmo `MinimalHome`.

---

## 2. Mapa de fidelidade — preset a preset

> Base: padrões de design públicos e amplamente conhecidos dessas marcas (o mesmo critério do
> benchmark do V2), não uma auditoria ao vivo dos sites nesta data.

| Preset | Família | Referência | Assinatura visual que a torna reconhecível | Temos? |
|---|---|---|---|---|
| **Essencial** | classic | Renner | Tiles de categoria com foto, banners promocionais, grid denso, busca proeminente | ⚠️ `CategoryChips` existe (chips, não tiles) |
| **Atlético** | classic | Nike | Hero de ação full-bleed (vídeo/foto), tipografia condensada GIGANTE, rail de "drops", grid denso escuro | ❌ hero é a mesma estrutura; sem rail de drop |
| **Impacto** | classic | — (geométrico) | Tipo gigante itálico, blocos retos | ⚠️ só via tokens |
| **Editorial** | editorial | Zara | **Grid assimétrico**, campanha full-bleed, tipo enorme, hover revela 2ª foto | ❌ grid uniforme (assimetria carregada do Loop 12) |
| **Boutique** | editorial | Chanel | Simetria still-life, moldura fina, small caps, muito ar | ⚠️ tokens ok, estrutura idêntica à Editorial |
| **Luxo** | minimal | Calvin Klein | Fotografia B&W dominante, 2 colunas esparsas, legenda em tracking largo, quase zero cromo | ⚠️ tokens ok, estrutura = Wellness |
| **Wellness** | minimal | Lululemon | Foto lifestyle quente, "compre por atividade", selos de benefício, cards macios | ❌ estrutura = Luxo |
| **Minimal** | minimal | COS / anti-design | Texto em primeiro plano, cortes secos | ⚠️ tokens ok |
| **Tropical** | expressive | Farm Rio | **Mosaico** de tiles variados, estampa em destaque, cartões coloridos por seção, stickers | ❌ mosaico **carregado desde o Loop 4f** |
| **Streetwear** | industrial | Off-White | Aspas literais, **fita de perigo diagonal**, grão/ruído, bordas duras, numeração "0000" | ⚠️ `MarqueeTape` e `hard-border` existem; grão/glitch carregado |

**Leitura:** 3 assinaturas já foram adiadas duas vezes (mosaico Tropical desde 4f; grão industrial e
lookbook assimétrico desde 12). Elas são exatamente as que tornam a marca reconhecível — foram
adiadas justamente por serem as mais caras, e por isso a diferença nunca fecha.

---

## 3. Decisão arquitetural

### 3.1 A opção recomendada: **camada de composição** (não mais famílias)

O instinto seria criar 10 famílias, uma por preset. **Não recomendo:** Essencial e Impacto
realmente compartilham a maior parte do esqueleto; duplicar 10 `Home`/`PDP`/`Header` cria
manutenção em 10 lugares para variações que às vezes são de um bloco só.

A causa raiz não é o número de famílias — é que **os blocos não sabem em que loja estão**.
`ProductGrid` renderiza a mesma grade uniforme nos 10 presets.

**Proposta:** três tokens novos que deixam o *bloco* escolher a própria composição, no mesmo padrão
já usado por `heroTreatment`/`cardFrame` (mapa de composição consumido pelo organismo compartilhado —
**sem fork por família**, que é o princípio explícito do Loop 12):

```ts
/** Composição interna da grade — hoje só existe "uniform" na prática. */
gridComposition: "uniform" | "mosaic" | "asymmetric" | "sparse-duo";

/** Estrutura do hero (ortogonal ao heroTreatment, que continua sendo a PELE). */
heroComposition: "single" | "split-screen" | "collage" | "media-first";

/** Textura/moldura aplicada às seções da home. */
sectionTexture: "none" | "grain" | "color-card" | "hard-frame";
```

Atribuição inicial:

| Preset | gridComposition | heroComposition | sectionTexture |
|---|---|---|---|
| Tropical | `mosaic` | `collage` | `color-card` |
| Editorial | `asymmetric` | `media-first` | `none` |
| Luxo | `sparse-duo` | `single` | `none` |
| Streetwear | `uniform` | `single` | `grain` + `hard-frame` |
| Atlético | `uniform` | `media-first` | `none` |
| Demais | `uniform` | `single` | `none` |

**Por que isso é o caminho certo:** paga a dívida de 4f/12 *estruturalmente* (o mosaico vira um
token que qualquer preset futuro pode usar) em vez de um hack pontual no `ExpressiveHome`. E
mantém o princípio do Loop 12 — organismos compartilhados, zero fork por família.

**Alternativa considerada e descartada:** `layoutFamily` 1:1 com preset (10 famílias). Mais simples
de entender, mas ~10× a superfície de manutenção para ganho concentrado em 2–3 presets.

### 3.2 Divergência intra-família (camada 4)

Onde dois presets da mesma família são gêneros genuinamente diferentes, o componente de família
passa a ramificar pelo preset — **não** ganha uma família nova. Só nos 2 casos que importam:

- `MinimalHome`: **Luxo** (esparso, fotografia dominante) vs. **Wellness** (lifestyle, atividade,
  benefícios).
- `ClassicHome`: **Atlético** (drop/escuro/mídia primeiro) vs. **Essencial** (departamento: tiles
  de categoria + promo).

---

## 4. Os loops

Cada loop segue o ciclo do [LOOP_PROCESS.md](./LOOP_PROCESS.md): PLAN → REFINEMENT → IMPLEMENT →
TEST → VERIFY (walk no browser) → DOCUMENT.

### Loop 19a — Religar Home/PDP à família de layout ✅ Done

Pré-requisito descoberto durante o PLAN do Loop 19 (ver §"Atualização" no topo deste doc) — sem
ele, nenhum dos loops abaixo teria efeito visível em `/loja` ou na PDP, já que os componentes de
família eram código morto. Spec: [loop-19a](./specs/loop-19a-storefront-home-pdp-rewire.md).

### Loop 19 — Camada de composição (fundação) ✅ Done

Spec: [loop-19](./specs/loop-19-composition-layer.md). 3 tokens (`gridComposition`/
`heroComposition`/`sectionTexture`) entregues nos 10 presets, `ProductGrid.tsx`/`HeroBanner.tsx`
honrando-os de verdade, novo `SectionCard.tsx`. Verificado ao vivo (mosaico Tropical, tile
alargado Editorial, alturas alternadas Luxo, grão Streetwear, hero sem moldura Atlético/Tropical).

O habilitador. Sem ele, os loops 20–22 viram hacks pontuais.

- 3 tokens novos (§3.1) + valores nos 10 presets; tipos e defaults seguros
  (`uniform`/`single`/`none` = comportamento atual, byte a byte).
- `ProductGrid.tsx` passa a honrar `gridComposition` (spans variáveis no mosaico; par esparso no
  `sparse-duo`; ritmo assimétrico no `asymmetric`).
- `HeroBanner.tsx` ganha `heroComposition` **ortogonal** ao `heroTreatment` existente (a pele
  continua valendo; a estrutura passa a variar).
- Wrapper de seção que aplica `sectionTexture`.
- **AC crítico:** os 7 presets marcados `uniform`/`single`/`none` renderizam DOM **idêntico** ao de
  hoje — regressão zero antes de qualquer flourish.

### Loop 20 — Tropical / Farm Rio (dívida mais antiga: desde 4f) ✅ Done

Spec: [loop-20](./specs/loop-20-tropical-flourish.md). Mosaico real, hero-colagem e cartão de
seção colorido já tinham vindo do Loop 19; esta loop entregou os 2 que faltavam: `Badge.tsx`
ganhou `sticker` (rotação+sombra, só no Tropical) e todo card ganhou hover-scale usando os tokens
de motion já existentes. **Achado e corrigido durante a VERIFY**: `StorefrontThemeVars.tsx`
(Loop 4d) nunca estava montado em `(public)/layout.tsx` — sem isso, o `motionEasing`/`motionDuration`
de NENHUM preset (nem a paleta escopada a `/loja`) resolvia de verdade em produção, retroativamente
afetando o Loop 19 também. Religado, verificado ao vivo (`getComputedStyle` real).

### Loop 21 — Streetwear / Off-White ✅ Done

Spec: [loop-21](./specs/loop-21-streetwear-refinement.md). Grão (Loop 19) e aspas literais
(Loop 12) já estavam entregues sem crédito formal a este item; este loop fechou os 2 que
faltavam: selo numerado "Nº 000N" por card (gated por `layoutFamily`, mesmo padrão do Loop 20) e
setas (`ArrowUpRight`) como acento recorrente no header e nos rótulos de seção. `MarqueeTape.tsx`
ganhou `variant="diagonal"` — uma fita/ribbon "ORIGINAL" rotacionada sobre a galeria da PDP,
estendendo o componente do Loop 12 em vez de recriar. Verificado ao vivo com screenshots.

### Loop 22 — Editorial / Zara + separação de Boutique / Chanel ✅ Done

Spec: [loop-22](./specs/loop-22-editorial-lookbook.md). Grid assimétrico (Loop 19), hero full-bleed
(Loop 19/4d) e hover de 2ª foto (Card v2) já estavam entregues sem crédito formal; único item de
código novo foi o lookbook assimétrico (`Lookbook.tsx`, foto 3/5 sem moldura, dívida desde o
Loop 12). A separação Boutique/Editorial já era real desde o Loop 19 (tokens de composição
divergentes) — confirmada ao vivo neste loop, não reimplementada.

### Loop 23 — Separar a família minimal: Luxo vs. Wellness vs. Minimal ✅ Done

Spec: [loop-23](./specs/loop-23-minimal-family-split.md). Novo `useThemePreset()` (`TenantContext.tsx`)
permite `MinimalHome.tsx` ramificar por preset dentro do mesmo componente (decisão §3.2, sem
família nova): Luxo vira "cromo quase zero" de verdade (só hero+grid, sem lookbook/cupom);
Wellness ganha `CategoryChips` (compra por atividade) + `TrustBar` (faixa de benefício), ambos
reaproveitados; Minimal mantém o comportamento original. Faixa de depoimento do Wellness adiada
(exigiria schema novo — carry-over explícito).

### Loop 24 — Separar a família classic: Atlético vs. Essencial vs. Impacto ✅ Done

Spec: [loop-24](./specs/loop-24-classic-family-split.md). Novo `CategoryTiles.tsx` (foto+rótulo
por categoria, derivado do catálogo já carregado, sem endpoint novo) só pro Essencial; Atlético
troca a prateleira de lançamentos por `ProductRail` (já existente, Loop 12) titulado com o próprio
`newBadgeLabel` do preset. Impacto vira a nova regressão-floor da família (seu pedido — tipo
gigante geométrico — já era 100% tokens desde o Loop 4e). Com este loop, os 2 itens de "maior
ganho de diferenciação" (prioridade 2) estão completos.

### Loop 25 — Coreografia de movimento (transversal) ✅ Done

Spec: [loop-25](./specs/loop-25-motion-choreography.md). `PublicHeader.tsx` ganha hide-on-scroll
(único, não diferenciado por preset). Novo `ScrollReveal.tsx` (fade+translate-up via
`IntersectionObserver`) envolve a grade nas 5 `*Home.tsx` — única peça de código nova, porque a
duração/curva reusam os tokens de motion já reais desde o Loop 20: cada preset já "sente"
diferente (Tropical bounça, Streetwear é `linear`, etc.) sem tabela de animação por preset.
`prefers-reduced-motion` checado num único lugar, reusado pelos dois mecanismos. **Com este loop,
os 7 loops do plano (19-25) estão completos.**

---

## 5. Priorização

Se não der para fazer tudo, esta é a ordem por retorno visual sobre esforço:

| Prioridade | Loops | Por quê |
|---|---|---|
| **1 — fazer primeiro** | **19 + 20** | 19 é pré-requisito de tudo; 20 entrega a assinatura mais distintiva (mosaico Farm Rio) e paga a dívida mais antiga (4f) |
| **2 — maior ganho de diferenciação** | **23 + 24** | Desfaz 6 presets gêmeos — o problema mais agudo (§1.3) |
| **3 — acabamento de marca** | 21 + 22 | Alta fidelidade, escopo contido |
| **4 — polimento** | 25 | Transversal; melhor depois que as estruturas estabilizarem |

**Recomendação:** começar por **19 + 20 juntos** (a fundação sem uso real não se prova; o mosaico é
o primeiro consumidor de verdade da camada nova e valida o desenho).

---

## 6. Riscos e princípios

- **Regressão silenciosa nos 7 presets neutros** — mitigado pelo AC de DOM idêntico no Loop 19.
- **CWV**: grão e mosaico mexem em LCP/CLS. Manter os ganhos do Loop 10 v2 (`next/image`, `sizes`
  derivado de `plpColumns` — que precisará considerar spans variáveis no mosaico).
- **Acessibilidade**: `isPaletteContrastSafe` continua obrigatório; overlays de textura não podem
  derrubar contraste de texto; `prefers-reduced-motion` respeitado.
- **IDs de preset são imutáveis** — são enum validado no backend com valores salvos por tenant
  (`lmfit` = `performance`). Só `label`/`tagline` podem mudar.
- **Zero fork por família nos organismos compartilhados** (princípio do Loop 12): a variação entra
  por token/composição, nunca por cópia de `ProductGrid`.
- **Atenção pontual:** `IndustrialPDP.tsx` já ignora os slots `gallery`/`thumbs` (contorno conhecido
  desde o Loop 10 v2) — qualquer mudança de imagem precisa incluí-lo explicitamente.
