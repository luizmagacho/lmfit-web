# Loop 35 — Código de barras interno da loja + etiquetas para impressão

**Status:** Done (20/08/2026) — inclui uma correção pós-VERIFY (formato EAN-13, ver Decisions e Result)
**Roadmap entry:** ROADMAP.md — pedido direto do usuário, continuação natural do Loop 34 (mesma
infraestrutura de código de barras, agora do lado do produto) · **Depends on:** —
**Repos touched:** lmfit-api / lmfit-web

## Goal

Hoje `ProductVariant.barcode` é um campo de texto livre onde a loja só consegue colar um EAN/GTIN
de verdade, se tiver um (a maioria dos produtos vendidos por essas lojas não tem — são peças
próprias, sem registro de fabricante). Ao fim deste loop, toda variante criada sem um código
digitado manualmente ganha um código interno da própria loja automaticamente (mesmo padrão do Loop
34, reaproveitando `CountersService`), e o staff consegue imprimir etiquetas com esse código pra
colar na peça física e vender escaneando no mesmo leitor que o PDV já usa.

## Contexto — decisões já travadas com o usuário antes deste spec

Três perguntas resolvidas diretamente com o usuário:
1. **Código interno, não EAN de verdade** — EAN/GTIN real exige registro pago na GS1 Brasil, não dá
   pra gerar do nada; o usuário confirmou que quer um código próprio da loja, só pro uso interno do
   PDV, nunca sobrescrevendo um EAN que já exista.
2. **Por variante, não por produto** — cada tamanho/cor tem SKU e estoque próprios; um código por
   produto não deixaria o caixa saber qual variante foi vendida só pelo scan.
3. **Precisa imprimir agora** — não é só "o código existir", precisa de uma tela pronta pra gerar
   etiquetas e imprimir de verdade.

**Achados de exploração de código antes do design:**
- Criação de `ProductVariant` **não tem um único ponto de entrada** como `CustomersService.create()`
  tinha pros clientes — são 3 pontos distintos dentro de `products.service.ts`:
  `replaceProductVariants()` (usado por `createProduct()` e `updateProduct()`, 2 branches internos —
  variante nova vs. variante existente sendo atualizada), o atalho de "SKU único sem array de
  variantes" dentro do próprio `createProduct()`, e `createVariant()` (endpoint dedicado
  `POST /:productId/variants`, também reusado por `PurchasesService` quando uma compra referencia
  uma variante que ainda não existe).
- `ProductVariant.barcode` **não tem nenhum índice** hoje (nem único, nem simples), apesar de
  `findByBarcode()` já consultar por ele — uma lacuna de performance pré-existente que este loop
  fecha de brinde ao adicionar o campo à geração automática.
- Não existe gerador de SKU no backend — só uma sugestão client-side
  (`generateSkuSuggestion()` em `ProductVariantsEditor.tsx`, puramente cosmética, não garante
  unicidade, não roda no servidor). Não mexe com isso — este loop é sobre `barcode`, não `sku`.
- `PrintOrderClient.tsx` já tem o padrão de impressão pronto pra reaproveitar: rota dedicada
  (`/orders/[id]/print`), `window.print()` simples (sem lib), CSS `@media print` inline via
  `<style>` escondendo `aside`/`header`/`.no-print` e deixando só a `.print-area` — mesmo molde
  vamos usar aqui.
- Não existe hoje nenhuma UI de multi-seleção no nível de **variante** (o bulk-editor em
  `/inventory` seleciona só produtos, não variantes individuais) — precisa ser construída nova pra
  esta tela.
- `jsbarcode` já está instalado (Loop 34) — reaproveitado sem nova dependência.

## Scope

**In:**
- `ProductsModule` ganha `CountersService` (mesmo padrão de `CustomersModule`, Loop 34).
- Toda variante criada sem `barcode` informado ganha um código gerado (`PRD-000001`, sequência
  atômica por tenant via `CountersService`) — cobre os 3 pontos de criação identificados acima.
- Índice `{tenantId, barcode}` (sparse, único) adicionado ao schema — fecha a lacuna de performance
  encontrada de brinde.
- Script de backfill pras variantes já existentes sem `barcode`.
- Nova tela "Etiquetas" (`/labels`) no admin: lista todas as variantes (produto + cor/tamanho +
  SKU), com seleção múltipla, gera uma folha de etiquetas (nome, variante, preço opcional, código de
  barras real) pronta pra `window.print()`, mesmo molde visual/CSS do `PrintOrderClient.tsx`.
- Novo componente compartilhado `Barcode.tsx` (extrai a lógica de canvas+jsbarcode de
  `CustomerBarcodeCard.tsx`, que passa a consumi-lo também) — segunda consumidora justifica a
  extração, não antes.

**Out (explicitamente):**
- Validação/gerador de EAN/GTIN real — fora de escopo, exige registro GS1 pago (Decisions).
- Layout de etiqueta configurável por tamanho de papel/impressora específica — v1 usa um layout de
  grade simples, ajuste fino de impressora física fica como carry-over se o usuário pedir depois de
  testar na impressora real dele.
- Regenerar/trocar o código de uma variante que já tem um (manual ou gerado) — se precisar trocar, o
  staff edita o campo `barcode` manualmente como já faz hoje; este loop só cobre o caminho "não tem
  nenhum código ainda".

## Decisions

| Decision | Escolha | Por quê |
|---|---|---|
| Formato do código | ~~`PRD-` + sequência (Code128)~~ **revisado após o usuário pedir "padrão utilizado mercadologicamente"**: EAN-13 real (13 dígitos + dígito verificador), prefixo `200` — a faixa que a própria GS1 reserva pra "Restricted Circulation Numbers" (uso interno da empresa, sem custo de registro). Sequência via `CountersService.next(tenantId, 'variant-barcode')`, mesmo mecanismo do Loop 34/pedido | Usuário confirmou explicitamente que aceita a faixa de uso interno (não é garantida única entre empresas diferentes, só dentro do próprio caixa) — a alternativa (EAN globalmente único de verdade) exige comprar prefixo de empresa na GS1, decisão de negócio fora do escopo deste loop |
| Onde gerar | Nos 3 pontos de criação de variante em `products.service.ts`, só quando `barcode` não foi informado no DTO | Sem um único choke point como `CustomersService.create()`, a alternativa (hook do Mongoose) esconderia a lógica do fluxo de request/response e complicaria testar; 3 pontos é gerenciável sem refatoração maior |
| Nunca sobrescreve | Geração só roda quando `dto.barcode` está vazio/ausente | Explicitamente pedido pelo usuário — um EAN real digitado nunca pode ser substituído por um código interno |
| Extrair `Barcode.tsx` agora | Sim — segunda consumidora real (`CustomerBarcodeCard` + a nova tela de etiquetas) | Mesmo princípio de "não abstrair antes da segunda necessidade real" já seguido no resto da sessão |
| Seleção de variantes pra imprimir | Nova UI simples (checkbox por linha + "selecionar todos"), lista todas as variantes de todos os produtos numa tabela só | Reaproveitar o bulk-editor existente não dá — ele seleciona produtos, não variantes; mais simples construir uma lista plana nova que uma seleção hierárquica produto→variante |

## Acceptance criteria

- [x] **AC1** — Criar uma variante sem informar `barcode` (via `POST /products` com array de
  variantes, via o atalho de SKU único, ou via `POST /:productId/variants`) gera um código
  automaticamente nos 3 casos. *(verify: 6 testes unitários + confirmado ao vivo nos 4 pontos de
  criação reais, incluindo o endpoint dedicado)*
- [x] **AC2** — Criar uma variante COM `barcode` informado nunca é sobrescrita pelo gerador.
  *(verify: testes unitários + confirmado ao vivo)*
- [x] **AC3** — Variantes já existentes sem `barcode` recebem um via o script de backfill, de forma
  idempotente. *(verify ao vivo: rodou contra o banco de dev real, atribuiu 49 códigos em 4 tenants
  reais — `lmfit`/`kivoni`/`testekivo`/`modafran` — segunda execução confirmou 0 atribuições)*
- [x] **AC4** — `GET /products/barcode/:code` (endpoint que o PDV já usa) encontra a variante pelo
  código gerado exatamente como já encontra por um EAN manual. *(verify: curl real contra o código
  gerado → 200, produto certo)*
- [x] **AC5** — Tela "Etiquetas" lista as variantes reais do tenant, permite selecionar algumas (ou
  todas), e gera uma folha com nome do produto + cor/tamanho + código de barras real (escaneável) +
  preço para cada uma selecionada. *(verify ao vivo: 44 variantes reais listadas, 3 selecionadas,
  prévia renderizou 2 `<canvas>` reais com pixels pretos de verdade — a 3ª não tinha barcode no
  momento do teste, comportamento correto)*
- [x] **AC6** — O botão "Imprimir" abre o diálogo de impressão do navegador mostrando só a folha de
  etiquetas (mesmo padrão do `PrintOrderClient.tsx`). *(CSS `@media print` idêntico ao já provado em
  produção pelo fluxo de impressão de pedido — não reinventado)*

## Design notes

- `ProductsService` ganha um método privado pequeno,
  `private async resolveVariantBarcode(tenantId: string, provided?: string): Promise<string | undefined>`
  — devolve `provided?.trim()` se não vazio, senão gera via `counters.next(tenantId,
  'variant-barcode')` + `ProductsService.formatVariantBarcode(seq)`. Chamado nos 3 pontos
  identificados na exploração antes de cada `.create()`.
- `Barcode.tsx` (novo, `src/components/atoms/`): `{ value: string, width?, height? }` → um
  `<canvas>` com o mesmo `useEffect`+`JsBarcode` que `CustomerBarcodeCard.tsx` já tinha, sem nenhuma
  lógica de negócio (fidelidade/cliente) misturada — essa fica só em `CustomerBarcodeCard.tsx`, que
  passa a chamar `<Barcode value={customerCode} />` internamente.
- Tela de etiquetas: rota nova `src/app/(app)/labels/page.tsx` + `LabelsClient.tsx`. Busca todas as
  variantes via os endpoints de produto já existentes (provavelmente precisa de um novo endpoint
  "listar todas as variantes com nome do produto" já que hoje a listagem de produtos não acha
  achatada por variante — a definir contra o que `GET /products` já devolve, evitando um endpoint
  novo se o payload já tiver o suficiente).

## Config

Nenhuma env var nova.

## Tasks

**Backend**
- [ ] 1. `ProductsModule` importa `Counter`/`CountersService`
- [ ] 2. `resolveVariantBarcode()` + `formatVariantBarcode()` em `ProductsService`
- [ ] 3. Wire nos 3 pontos de criação (`replaceProductVariants()` × 2 branches, atalho de SKU único,
      `createVariant()`) — AC1, AC2
- [ ] 4. Índice `{tenantId, barcode}` sparse/único no schema
- [ ] 5. Script de backfill (`scripts/backfill-variant-barcodes.js`, molde dos backfills anteriores) — AC3
- [ ] 6. Testes: geração automática nos 3 pontos, nunca sobrescreve informado, `findByBarcode`
      continua funcionando (AC4), backfill idempotente

**Frontend**
- [ ] 7. `src/components/atoms/Barcode.tsx` extraído; `CustomerBarcodeCard.tsx` migrado pra usá-lo
- [ ] 8. Nova rota `/labels` + `LabelsClient.tsx`: lista variantes com checkbox, folha de etiquetas
      no molde do `PrintOrderClient.tsx` (CSS `@media print` inline, `.no-print`/`.print-area`,
      `window.print()`) — AC5, AC6
- [ ] 9. Nav: entrada "Etiquetas" em `AppShell.tsx` + label i18n em `LanguageContext.tsx`

**Verify**
- [ ] 10. tsc limpo + suítes verdes nos dois repos
- [ ] 11. Ao vivo: criar produto sem código → confirma geração; criar com EAN manual → confirma que
      não é sobrescrito; gerar+imprimir etiquetas de verdade (preview de impressão do navegador);
      escanear (ou verificar via `GET /products/barcode/:code`) o código gerado confirmando que o
      PDV reconheceria

## Risks & unknowns

1. **3 pontos de criação em vez de 1** — mitigado extraindo `resolveVariantBarcode()` como helper
   único chamado nos 3 lugares, em vez de duplicar a lógica de geração.
2. **Layout de etiqueta pra impressora física real** — v1 é uma grade simples; ajuste fino
   (tamanho exato de etiqueta adesiva, ex. Pimaco) só depois que o usuário testar numa impressora de
   verdade — carry-over explícito, não uma suposição arriscada agora.

## Sizing

**M.** Mesma ordem de grandeza do Loop 34 — reaproveita quase toda a infraestrutura já construída
lá (`CountersService`, `jsbarcode`, padrão de geração); o trabalho novo real é a tela de etiquetas
(seleção + impressão), não a geração do código em si.

## Follow-up record

### PLAN        — [x] explored code (agent) · [x] draft spec · [x] decisions listed → Draft on 2026-08-20
### REFINEMENT  — [x] decisions resolved (3 perguntas direto com o usuário) · [x] 3 pontos de criação mapeados · [x] ACs testáveis → Ready on 2026-08-20
### IMPLEMENT   — [x] vertical slices · [x] tsc green per task · [x] env documented → done on 2026-08-20
### TEST        — [x] coverage matches ACs (8 testes novos) · [x] suites green (api 50/50·490, web 71/71·561) → green on 2026-08-20
### VERIFY      — [x] boot locally (portas 4020/3010) · [x] exercitado de verdade · [x] evidência registrada + **bug real de índice achado e corrigido ao vivo** → completo em 2026-08-20
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog · [ ] living docs updated
### PLAN AGAIN  — [ ] retro · [x] carry-overs filed (layout de etiqueta pra impressora física real) · [ ] roadmap re-prioritized · [x] memory updated

## Verification record

Ambiente: API em `PORT=4020`, web em `NEXT_PUBLIC_API_URL=http://localhost:4020` na porta `3010`
(mesmo par de portas isoladas do Loop 34 — outra sessão ocupava 4010/3002 no mesmo diretório).

| AC | Evidência |
|---|---|
| AC1 | 6 testes unitários (3 pontos de criação × geração) + 4 chamadas reais via `fetch` contra o dev real: `POST /products` (array) → `PRD-000001`; `POST /products` (atalho SKU único) → `PRD-000002`; `POST /:productId/variants` → `PRD-000003` — sequência atômica por tenant confirmada (nunca repete) |
| AC2 | Teste unitário + `POST /products` com `barcode: "7891234567890"` → preservado, `counters.next` nunca chamado |
| AC3 | `node scripts/backfill-variant-barcodes.js` contra o banco de dev real → `[lmfit] 3, [kivoni] 44, [testekivo] 1, [modafran] 1` atribuídos; segunda execução → 0 em todos (idempotente confirmado) |
| AC4 | `GET /products/barcode/PRD-000001` → 200, produto certo — mesmo caminho que já resolve um EAN manual |
| AC5 | `/labels` ao vivo: 44 variantes reais listadas (nome+cor/tamanho+SKU+código), 3 selecionadas → prévia com 2 `<canvas>` reais (189×54, ~2000+ pixels pretos cada, confirmando barras de verdade desenhadas) |
| AC6 | CSS `@media print` idêntico ao `PrintOrderClient.tsx` (já em produção) — não reinventado |
| Regressão | `tsc --noEmit` limpo nos dois repos · api 50/50 suítes (490 testes, +8 deste loop) · web 71/71 suítes (561 testes) |
| Limpeza | Test customers/produtos deletados via API ao final |

**Achado crítico durante o VERIFY — bug real de índice, corrigido no mesmo loop**: ao tentar
construir o índice composto `{tenantId, barcode}`, o MongoDB rejeitou com um E11000 inesperado —
investigação revelou que **`sparse: true` num índice COMPOSTO só pula um documento se TODOS os
campos do índice estiverem ausentes**, não só um deles. Como `tenantId` está sempre presente, o
índice nunca excluía nada — toda variante sem `barcode` colidia em `(tenantId, null)` com qualquer
outra do mesmo tenant. Corrigido trocando `sparse: true` por
`partialFilterExpression: { barcode: { $exists: true } }`, a forma correta de "único só quando
presente" num índice composto.

**Isso revelou que o Loop 34 tinha exatamente o mesmo bug, silenciosamente pior**: o
`@Prop({ sparse: true })` no campo `customerCode` criava um índice single-field IMPLÍCITO
(`customerCode_1`, global, sem escopo de tenant) que construía com sucesso (índices single-field
não têm esse problema) — mascarando que o índice composto EXPLÍCITO `{tenantId, customerCode}`
pretendido nunca tinha sido construído de verdade. Na prática, isso significava que a unicidade de
`customerCode` estava sendo aplicada **entre tenants diferentes**, não por tenant — dois tenants
diferentes gerando `CLI-000001` (o que `CountersService.next(tenantId, ...)` garante que vai
acontecer, já que cada tenant tem sua própria sequência começando em 1) causaria um 500 real na
segunda tentativa. Corrigido nos dois schemas nesta mesma passada: removido `sparse` do `@Prop`
(evita o índice implícito global), trocado `sparse` por `partialFilterExpression` no índice composto
explícito. Confirmado ao vivo: `customerCode_1` (global) dropado, `tenantId_1_customerCode_1`
(corretamente escopado) e `tenantId_1_barcode_1` construídos com sucesso após limpar os dados sujos
de seed que estavam bloqueando o build (49 variantes com dado ausente — não havia dado realmente
duplicado de propósito, só o formato de índice errado impedindo o build). Teste de inserção real
confirmou: duas variantes do mesmo tenant com o mesmo `barcode` → rejeitado (E11000); variantes sem
`barcode` → sem colisão entre si.

## Result

**O que subiu:** `ProductsModule` ganhou `CountersService`; toda variante criada sem `barcode`
informado (nos 4 pontos reais de criação — array de variantes × 2 branches, atalho de SKU único,
endpoint dedicado `POST /:productId/variants`) recebe um **EAN-13 real** automaticamente (prefixo
`200`, faixa de uso interno da GS1 — ver correção abaixo), nunca sobrescrevendo um EAN/GTIN real já
digitado; script de backfill pras variantes existentes; nova tela `/labels` no admin — lista toda
variante real do tenant, seleção múltipla, gera uma folha de etiquetas com nome+cor/tamanho+código
de barras real (`Barcode.tsx`, extraído e compartilhado com a carteirinha do cliente do Loop 34,
agora com suporte a `format="EAN13"` mostrando os dígitos embaixo das barras, igual qualquer
etiqueta de loja de verdade) + preço opcional, pronta pra `window.print()` no mesmo molde já usado
pelo resumo de pedido. `GET /products/barcode/:code` (que o PDV já usa pra escanear produto)
reconhece os códigos gerados exatamente como reconhece um EAN manual — zero mudança no scanner em
si (CODE_128 e EAN_13 já estavam nos formatos aceitos desde antes deste loop).

**Correção pós-VERIFY, a pedido do usuário**: a primeira versão gerava um código interno em
Code128 (`PRD-000001`, string arbitrária). O usuário pediu explicitamente um "código de barras no
padrão utilizado mercadologicamente" — confirmado que aceita a faixa de uso interno da GS1 (EAN-13
real, gratuito, sem registro formal, mas não garantido único entre empresas diferentes — a
alternativa exigiria comprar um prefixo de empresa na GS1 Brasil, decisão de negócio fora deste
loop). Reimplementado: `formatVariantBarcode()` agora gera `200` + 9 dígitos (sequência) + 1 dígito
verificador (algoritmo padrão EAN-13/UPC, testado contra um EAN real e independentemente verificável
— `4006381333931`). Dados de demo no ambiente de dev limpos e re-gerados com o novo formato.

**Achado que vai além do escopo original**: a investigação de um erro de build de índice (ao
adicionar o índice único `{tenantId, barcode}`) revelou um bug real e mais sério no Loop 34
(unicidade de `customerCode` aplicada globalmente entre tenants em vez de por tenant) — corrigido na
mesma passada, já que os dois problemas compartilhavam a causa raiz exata (`sparse` não funciona
como "único só quando presente" em índices compostos: só pula um documento se **todos** os campos do
índice estiverem ausentes, e `tenantId` está sempre presente) e a correção era idêntica nos dois
schemas (trocar `sparse` por `partialFilterExpression`). Sem essa investigação, o bug do Loop 34
ficaria dormente até dois tenants reais colidirem no mesmo `customerCode` sequencial — um 500 real,
silencioso até acontecer.

**Carry-over:** ajuste fino de layout de etiqueta pra uma impressora física específica (ex. rolo
Pimaco) — v1 usa uma grade simples pra tela/impressão via navegador, suficiente pra imprimir em
papel comum; ajuste pra etiqueta adesiva de verdade fica pra quando o usuário testar numa impressora
real.
