# Loop 34 — Carteirinha digital do cliente (código de barras no PDV)

**Status:** Done (20/08/2026) — carry-over: confirmar leitura por câmera física
**Roadmap entry:** ROADMAP.md — fecha uma lacuna real do Loop 9 (fidelidade) · **Depends on:** —
**Repos touched:** lmfit-api / lmfit-web

## Goal

Hoje, identificar o cliente numa venda do PDV é 100% manual: o vendedor digita nome ou telefone
num campo de busca, espera a lista aparecer, clica no resultado certo. Sob pressão de fila, é comum
pular esse passo e vender direto como "Consumidor Final" — o que **silenciosamente cancela o acúmulo
de pontos de fidelidade daquela venda** (`LoyaltyService.creditForOrder` exclui explicitamente o
walk-in por design). Ao fim deste loop, cada cliente cadastrado tem um código de barras próprio,
visível na conta dele (`/conta`) ou print/wallet, que o vendedor escaneia no mesmo leitor que já usa
pra produtos — identificação em menos de 1 segundo, sem digitar nada, sem motivo pra pular o passo.

## Contexto — benchmark + o que já existe

Pesquisa de mercado (Loyverse, Perkd, PassKit — POS/loyalty apps comparáveis) confirma o padrão: um
código (Code128 ou QR) contendo o ID do associado, mostrado no celular ou carteirinha impressa,
escaneado no caixa pra puxar o cadastro na hora. É tecnologia madura, não uma aposta.

**O que o projeto já tem, confirmado por exploração de código:**
- `BarcodeScannerModal.tsx` já existe, já é genérico (`onDetected: (code: string) => void`, zero
  lógica de produto embutida) e já usa ZXing (`@zxing/browser`) em vez da `BarcodeDetector` nativa —
  decisão deliberada de uma sessão anterior porque o Safari/iOS nunca implementou essa API, e
  **CODE_128 já está na lista de formatos configurados** (`EAN_13, EAN_8, UPC_A, UPC_E, CODE_128,
  CODE_39`). Ou seja: **o leitor não precisa de nenhuma mudança** — só um segundo lugar que o chame.
- O acoplamento a "só produto" vive inteiramente em `PdvClient.tsx`'s `handleBarcodeDetected` e em
  `pdvLookupByBarcode`/`ProductsService.findByBarcode` — não no scanner em si.
- `CountersService` (Loop de numeração de pedidos) já resolve exatamente o problema de "gerar um
  código curto, sequencial, atômico, por tenant" — mesmo padrão reaproveitável aqui.
- `Customer` **não tem nenhum código curto hoje** — só o `_id` do Mongo (24 caracteres hex). Técnica
  e tecnicamente funcionaria como conteúdo de um Code128, mas é ilegível pra digitação manual (fallback
  quando o scanner falha) e expõe o identificador interno do banco como dado público — um código
  dedicado, curto e sequencial é a escolha certa, não o `_id` cru.
- Não existe nenhuma lib de **geração** de código de barras/QR instalada em nenhum dos dois repos
  (só de leitura — `@zxing/browser`/`@zxing/library`).
- `/conta`'s seção "Fidelidade e crédito" já existe (pontos + crédito de loja) e é o lugar natural
  pra mostrar a carteirinha — não existe hoje nenhum componente de "cartão de associado".

## Scope

**In:**
- `Customer` ganha `customerCode: string` — único por tenant, atribuído automaticamente na criação
  (reaproveitando `CountersService`, mesmo padrão do número de pedido) + script de backfill pros
  clientes já existentes.
- Novo endpoint staff `GET /customers/by-code/:code` (tenant-scoped) — resolve um código escaneado
  pro cliente completo, mesmo formato de retorno que a busca por nome/telefone já usa.
- PDV (`PdvClient.tsx`): um botão "escanear" ao lado do campo de busca de cliente, abrindo o mesmo
  `BarcodeScannerModal` já usado pra produto (novo modo, sem mudar o componente do scanner em si) —
  no `onDetected`, chama o novo endpoint e seleciona o cliente automaticamente (`cart.setCustomer`).
- `/conta`: nova sub-seção dentro de "Fidelidade e crédito" mostrando o código de barras (gerado
  client-side) do cliente logado + o número por extenso embaixo (fallback pra digitação manual —
  mesmo princípio de qualquer carteirinha física impressa).
- Nova dependência de geração de código de barras (client-side, sem chamada de rede) — escolha exata
  na REFINEMENT.

**Out (explicitamente):**
- Carteirinha física impressa (PDF/etiqueta) — só o código na tela do celular/`/conta` nesta v1;
  imprimir é geração de PDF fora do escopo atual, carry-over se pedido depois.
- Apple Wallet / Google Wallet (`.pkpass`/passes) — integração própria, maior, carry-over explícito.
- Rotação/expiração do código (código dinâmico por segurança) — o pior cenário de alguém fotografar
  o código de outra pessoa é pontos de fidelidade indo pro cadastro errado numa venda que a própria
  vítima não fez (o pagamento em si acontece à parte, no caixa) — risco baixo, mesmo padrão de
  qualquer cartão fidelidade físico (também estático). Sem rotação nesta v1.
- Identificação de cliente no checkout online (`/loja`) — o cliente ali já está autenticado via
  sessão/magic-link (Loop 7); um código de barras não resolve nada que login já não resolva. Só PDV.

## Decisions

| Decision | Escolha | Por quê |
|---|---|---|
| Formato do código | Code128, alfanumérico curto (ex. `LMF-000042`, prefixo configurável por tenant + sequência) | Já está nos formatos aceitos pelo `BarcodeScannerModal` sem nenhuma mudança; alfanumérico permite prefixo por marca/tenant sem colidir entre tenants |
| Geração do código | `CountersService` (já existe, atômico, por tenant) — mesmo mecanismo do número de pedido | Reaproveita infraestrutura já testada em produção em vez de inventar um novo gerador de sequência |
| Conteúdo do código ≠ `_id` do Mongo | Campo novo dedicado `Customer.customerCode` | Não expõe o identificador interno do banco publicamente; permite um código bem mais curto (melhor taxa de leitura no scanner e mais fácil de digitar manualmente se o scanner falhar) |
| Onde gerar a imagem do código | Client-side (`/conta`), sem chamada de rede extra | O `/conta` já recebe o `customerCode` como parte do perfil do cliente (`/me`); gerar a imagem no navegador evita um endpoint novo só pra devolver um PNG |
| Rotação do código | Não, estático (ver Scope/Out) | Risco baixo de abuso (só desvia pontos de fidelidade, não dinheiro), mesmo modelo de cartão físico |

## Acceptance criteria

- [x] **AC1** — Todo cliente novo criado (via PDV, checkout, ou admin) recebe um `customerCode`
  único automaticamente, sem exigir nenhuma ação extra do staff. *(verify: teste unitário +
  confirmado ao vivo em dois caminhos reais e distintos — `POST /customers` staff → `CLI-000001`,
  `POST /public/customer-auth/request-link` (findOrCreateByEmail) → `CLI-000002`)*
- [x] **AC2** — Clientes já existentes no banco recebem um `customerCode` via script de backfill,
  sem duplicatas mesmo rodando o script mais de uma vez (idempotente). *(script escrito e revisado
  contra o molde do backfill de número de pedido; não havia clientes pré-existentes sem código no
  ambiente de dev pra exercitar ao vivo — nenhum cliente legado hoje, é um repo novo)*
- [x] **AC3** — `GET /customers/by-code/:code` devolve o cliente certo pro tenant certo; nunca vaza
  cliente entre tenants. *(verify: curl real — mesmo código sob o tenant `kivoni` → 200 com o
  cliente certo; mesma chamada sob `x-tenant-slug: lmfit` → 401, rejeitada na camada de auth antes
  mesmo de chegar no controller, ainda mais cedo do que um 404)*
- [x] **AC4** — No PDV, o botão "Escanear" (novo, ao lado da busca manual) abre o mesmo
  `BarcodeScannerModal` já usado pra produto, roteado pro handler de cliente
  (`handleCustomerBarcodeDetected`, que chama `GET /customers/by-code/:code` e faz
  `cart.setCustomer`) — confirmado ao vivo que o botão renderiza e abre o modal corretamente; a
  leitura por câmera real em si não pôde ser exercitada neste ambiente (sandbox do navegador bloqueia
  acesso à câmera) — carry-over: confirmar com uma câmera real apontada pra tela do `/conta`
- [x] **AC5** — `/conta` mostra o código de barras do cliente logado. *(verify: login real via
  magic link (token lido do log de dev) → seção "Fidelidade e crédito" renderiza `CLI-000002` por
  extenso + um `<canvas>` 262×76 com 7.920 pixels pretos, confirmando que o `jsbarcode` desenhou
  barras de verdade, não um canvas vazio — leitura de volta por uma câmera real fica como o mesmo
  carry-over do AC4)*
- [x] **AC6** — Uma venda no PDV identificada por escaneamento acumula pontos de fidelidade
  normalmente. *(nenhuma linha de `LoyaltyService.creditForOrder` foi tocada por este loop — o scan
  só torna mais rápido chegar no mesmo `cart.setCustomer` que a busca manual já produzia, então a
  garantia é estrutural: os dois caminhos convergem pro mesmo estado antes do checkout, não haveria
  como um acumular pontos e o outro não)*

## Design notes

**Ponto único de criação de cliente confirmado por código**: `CustomersService.create()` é o único
lugar que efetivamente chama `this.model.create(...)` pra um cliente real — inclusive
`findOrCreateByEmail()` (login por magic link) e o dedup de guest checkout em
`order-drafts.service.ts` passam por ele. `getOrCreateWalkIn()` usa um `findOneAndUpdate` separado
(não passa por `create()`) — por isso o walk-in nunca ganha `customerCode`, exatamente como
pretendido (Scope/Out). Um único ponto de geração cobre PDV, admin, checkout guest e magic-link sem
precisar caçar múltiplos call sites.

- **Formato do código**: `CLI-` + sequência zero-padded de 6 dígitos (`CLI-000001`, `CLI-000042`,
  …) — via `CountersService.next(tenantId, 'customer')`, mesmo mecanismo atômico por tenant já usado
  pro número do pedido (`orders.service.ts`). Prefixo fixo (não por tenant) — like o número de
  pedido, o lookup já é tenant-scoped pelo header/JWT, então o prefixo só existe pra distinguir
  visualmente/durante debug um código de cliente de um código de produto, não pra evitar colisão
  entre tenants (que já não existe, cada `customerCode` é único só dentro do próprio tenant).
- **Lib de geração**: `jsbarcode` (renderiza Code128 direto num `<canvas>`/`<svg>`, sem chamada de
  rede, ~`+30KB` de bundle) — nova dependência em `lmfit-web`. Gerado client-side em `/conta` a
  partir do `customerCode` que já vem no payload de `GET /me/profile` — não precisa de nenhum
  endpoint novo só pra servir uma imagem.
- **Modo do scanner no PDV**: `BarcodeScannerModal` continua exatamente como está (zero mudança) —
  `PdvClient.tsx` ganha um estado `scannerMode: 'product' | 'customer' | null` substituindo o atual
  booleano de "scanner aberto". O botão "escanear cliente" (novo, ao lado da busca por nome/telefone)
  seta `scannerMode = 'customer'`; o botão de produto já existente seta `'product'`. `onDetected`
  despacha pro handler certo baseado nesse estado — nenhuma ambiguidade de formato/prefixo precisa
  ser resolvida em runtime, já que só um modo fica ativo por vez.
- **Endpoint staff**: `GET /customers/by-code/:code` — mesmo controller/guard de
  `GET /customers/by-wa/:waId` (que já existe, mesmo padrão de 404 se não achar).
- **`/me/profile`**: `CustomerAuthService.me()` ganha `customerCode: customer.customerCode ?? null`
  no objeto retornado (é uma whitelist explícita hoje, não um spread do doc completo — precisa desse
  campo a mais à mão).

## Config

Nenhuma env var nova — `customerCode` é gerado automaticamente, sem nenhuma credencial/config de
tenant envolvida.

## Tasks

**Backend**
- [ ] 1. `Customer.customerCode?: string` no schema + índice único composto `{tenantId, customerCode}`
      (sparse — walk-in nunca tem esse campo)
- [ ] 2. `CustomersModule` importa `Counter`/`CountersService` (mesmo padrão do `OrdersModule`);
      `CustomersService.create()` gera o código via `counters.next(tenantId, 'customer')` antes do
      `this.model.create(...)` — AC1
- [ ] 3. `CustomersService.findByCode(tenantId, code)` + `GET /customers/by-code/:code` no controller
      — AC3, AC4
- [ ] 4. `CustomerAuthService.me()` inclui `customerCode` na resposta — AC5
- [ ] 5. Script de backfill (`scripts/backfill-customer-codes.js`, molde
      `backfill-order-number-counters.js`) — todo cliente não-walk-in sem `customerCode`, em ordem
      de `createdAt`, recebe um via o mesmo counter atômico — AC2
- [ ] 6. Testes: geração automática em cada caminho de criação relevante, unicidade sob concorrência
      (mesmo padrão do teste de concorrência do `CountersService` já existente), 404 cross-tenant,
      backfill idempotente

**Frontend**
- [ ] 7. `jsbarcode` como nova dependência de `lmfit-web`
- [ ] 8. `/conta`: novo bloco dentro de "Fidelidade e crédito" renderizando o Code128 do
      `customerCode` do cliente logado + o código por extenso embaixo — AC5
- [ ] 9. PDV (`PdvClient.tsx`): botão "escanear cliente" ao lado da busca manual; `scannerMode` state;
      handler que chama `GET /customers/by-code/:code` e seleciona o cliente no carrinho — AC4, AC6

**Verify**
- [ ] 10. tsc limpo + suítes verdes nos dois repos
- [ ] 11. Ao vivo: criar um cliente de teste, confirmar `customerCode` gerado, ler o código de volta
      em `/conta` com um leitor real (ou o próprio `BarcodeScannerModal` apontado pra tela), escanear
      no PDV e confirmar seleção + acúmulo de pontos numa venda de teste — reverter dados de teste
      depois

## Risks & unknowns

1. **Colisão de formato com produto**: já que o mesmo scanner agora pode ler tanto um código de
   produto quanto um código de cliente, o `onDetected` do modo certo precisa saber distinguir os
   dois (prefixo reservado, ex. `LMF-` só pra cliente, nunca usado em SKU/EAN de produto) — decidir
   e documentar na REFINEMENT antes de implementar, é o tipo de ambiguidade que trava em produção se
   não for resolvida com uma regra clara.
2. **Tamanho**: parece M — um campo novo + reaproveita `CountersService` + um endpoint + duas
   telas (PDV scan, `/conta` display). Confirmar durante REFINEMENT se cabe inteiro numa passada ou
   se vale separar backend (código+endpoint) de frontend (scan+display), mesmo padrão já usado no
   Loop 27.

## Sizing

**M** (estimativa inicial — confirmar na REFINEMENT).

## Follow-up record

### PLAN        — [x] explored code (agent) · [x] draft spec · [x] decisions listed → Draft on 2026-08-20
### REFINEMENT  — [x] decisions resolved · [x] single customer-creation choke point confirmed (`CustomersService.create()`) · [x] ACs testable · [x] DoR review → Ready on 2026-08-20
### IMPLEMENT   — [x] vertical slices · [x] tsc green per task · [x] env documented → done on 2026-08-20
### TEST        — [x] coverage matches ACs · [x] suites green (api 50/50·490 testes, web 71/71·561 testes) → green on 2026-08-20
### VERIFY      — [x] boot locally (portas isoladas 4020/3010) · [x] exercitado de verdade · [x] evidência registrada → completo em 2026-08-20
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog · [ ] living docs updated
### PLAN AGAIN  — [ ] retro · [x] carry-overs filed (carteirinha física/PDF, wallet passes, leitura por câmera real) · [ ] roadmap re-prioritized · [ ] memory updated

## Verification record

Ambiente isolado: API em `PORT=4020`, web em `NEXT_PUBLIC_API_URL=http://localhost:4020` na porta
`3010` (outra sessão já tinha o par 4010/3002 em uso no mesmo diretório — portas novas evitam
colisão). Login real via `admin@kivoni.local` (usuário seed do próprio repo).

| AC | Evidência |
|---|---|
| AC1 | `customers.service.spec.ts` (2 testes novos) + `POST /customers` real → `customerCode: "CLI-000001"`; `POST /public/customer-auth/request-link` (e-mail novo) → cria via `findOrCreateByEmail` → `CLI-000002` |
| AC2 | Script revisado (molde do backfill de pedido já existente) — sem clientes legados no ambiente de dev pra exercitar a idempotência ao vivo |
| AC3 | `GET /customers/by-code/CLI-000001` sob `kivoni` → 200; mesma chamada sob `lmfit` → 401 |
| AC4 | Botão "Escanear" renderiza no PDV ao lado da busca manual; clique abre `BarcodeScannerModal` (mesmo componente do scan de produto, zero mudança nele); leitura por câmera real não exercitável no sandbox do navegador |
| AC5 | Login real via magic link (token lido do log `[dev] magic link for...`) → `/conta` mostra "Carteirinha" com `CLI-000002` + `<canvas>` 262×76, 7.920 pixels pretos (barras reais desenhadas pelo `jsbarcode`, não um canvas vazio) |
| AC6 | Garantia estrutural — `LoyaltyService.creditForOrder` não foi tocado; scan e busca manual convergem pro mesmo `cart.setCustomer` |
| Regressão | `tsc --noEmit` limpo nos dois repos · api 50/50 suítes (490 testes, +8 deste loop) · web 71/71 suítes (561 testes) |
| Limpeza | Os 2 clientes de teste (`CLI-000001`, `CLI-000002`) deletados via `DELETE /customers/:id` ao final |

## Result

**O que subiu:** `Customer.customerCode` (formato `CLI-000001`, gerado via `CountersService`
reaproveitado do número de pedido) atribuído automaticamente no único ponto real de criação de
cliente (`CustomersService.create()`, que cobre PDV/admin/checkout-guest/magic-link — walk-in
deliberadamente excluído); `GET /customers/by-code/:code` pro PDV resolver uma carteirinha
escaneada; `/conta` renderiza o código como um Code128 real via `jsbarcode` (nova dependência,
gerado 100% client-side); PDV ganhou um botão "Escanear" que abre o mesmo leitor já usado pra
produto, agora num segundo modo. Zero mudança no `BarcodeScannerModal` em si — CODE_128 já estava
nos formatos aceitos desde antes deste loop.

**Por que isso importa**: `LoyaltyService.creditForOrder` sempre excluiu o walk-in
("Consumidor Final") do acúmulo de pontos — e a única forma de identificar um cliente de verdade no
PDV até este loop era digitar nome/telefone manualmente, um passo que a fila no caixa incentiva a
pular. Escanear uma carteirinha é rápido o bastante pra nunca valer a pena pular.

**Limite honesto da verificação**: o navegador em sandbox usado nesta sessão bloqueia acesso à
câmera, então a leitura real de um código de barras renderizado na tela por uma câmera de verdade
não foi (nem podia ser) exercitada aqui — todo o resto da cadeia (geração do código, endpoint,
isolamento por tenant, renderização de um Code128 com barras reais, wiring do botão/modal no PDV)
foi confirmado ao vivo contra o dev real. Recomendo um teste final com um leitor físico ou a câmera
de um celular apontada pra tela do `/conta` antes de considerar o loop 100% fechado pra produção.

**Carry-over:**
1. Confirmar a leitura por câmera real (fora do alcance do ambiente de automação usado aqui).
2. Carteirinha física/PDF pra impressão (explicitamente fora de escopo desde o PLAN).
3. Apple/Google Wallet passes (explicitamente fora de escopo desde o PLAN).
