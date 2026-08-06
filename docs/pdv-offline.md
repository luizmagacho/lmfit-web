# PDV offline com estoque local por PDV

**Status:** Loops PDV-OFF-1 a PDV-OFF-6 concluídos e verificados — plano completo.
**Repos:** `lmfit-api` + `lmfit-web`

## Contexto

O usuário pediu uma forma de o PDV (e outros fluxos presenciais) continuarem lançando vendas
mesmo sem conexão, com cada local/PDV usando uma fatia fixa de estoque, sincronizando
automaticamente quando a conexão volta. Três decisões de produto guiaram todo o desenho:

1. **Alocação fixa por local** — cada local recebe uma fatia fixa do estoque de cada variante;
   nunca vende além da própria fatia.
2. **Conflito na sincronização vira encomenda automática** — se uma venda offline vendeu mais
   do que realmente existia no local, a parte que faltou vira uma linha de encomenda
   automaticamente, sem bloquear a venda nem exigir decisão manual do operador.
3. **Sincronização automática em segundo plano** — assim que a conexão volta, sincroniza
   sozinho, sem botão manual (com indicador de status visível).

Uma quarta decisão, resolvida durante o planejamento: o **local de trabalho é vinculado ao
usuário logado** (`User.assignedLocationId`), não ao aparelho/navegador — um funcionário leva
seu local com ele para qualquer terminal em que fizer login.

Pesquisa de código confirmou que isso não era um simples cache por cima do que já existia:
estoque era um pool único por tenant (sem dimensão de local no caminho real de venda), a
numeração de pedido não era atômica, e não existia nenhuma infraestrutura offline no frontend
(sem IndexedDB, sem detecção de conexão, sem fila).

## Loop PDV-OFF-1 — Fundação

Tudo aditivo, zero mudança de comportamento visível para tenants de local único.

- **`CountersService`** (`lmfit-api/src/common/counters/`) — sequência atômica por tenant
  (`findOneAndUpdate` com `$inc`), substituindo o `countDocuments()+1` que podia colidir sob
  concorrência. Script `scripts/backfill-order-number-counters.js` semeia o contador de cada
  tenant com o maior número já usado.
- **`User.assignedLocationId`** + JWT (`locationId` no payload/token) — o local de trabalho do
  PDV agora vem do usuário autenticado. Nova tela mínima em `/users` (`lmfit-web`) para um admin
  atribuir local a cada funcionário.
- **`locationId` threading** — `StockLedger`, `Order` e toda a cadeia de dedução de venda
  (`ProductsService.applySaleDeductionForOrderLine` etc.) agora carregam `locationId`. Corrigido
  o bug raiz onde toda venda debitava só o local padrão do tenant (`locations.adjust()` nunca
  recebia `locationId`).
- **`LocationsService.adjust()`/`transfer()`** — trocado o `findOne → Math.max(0,...) →
  updateOne` (TOCTOU) por `findOneAndUpdate` com guarda `$gte`, mesmo padrão já usado em
  `quantityOnHand`/crédito de loja.

## Loop PDV-OFF-2 — Alocação de estoque + UI

Sem schema novo: `StockLevel.quantity` de um local não-padrão **é** a própria alocação. "Alocar"
é só um `transfer()` a partir do local padrão do tenant.

- `GET /locations/:id/stock` — o que um local tem alocado (usado pela UI de admin e, depois,
  pela foto de catálogo offline do PDV).
- `POST /locations/allocate` — açúcar sobre `transfer()`, resolve o local padrão automaticamente.
- `LocationsClient.tsx` (`lmfit-web/src/app/(app)/locations/`) — painel "Alocar estoque para um
  local" + tabela "Estoque alocado por local", ao lado da transferência genérica já existente.

## Loop PDV-OFF-3 — Arquitetura offline no cliente

- **`lib/pdv/offlineDb.ts`** — wrapper `idb` (IndexedDB) com duas *object stores*:
  `catalogSnapshot` (foto do catálogo do local) e `pendingSales` (fila de vendas).
- **`lib/pdv/catalogSnapshot.ts`** — `refreshSnapshot(locationId)` cruza `GET
  /locations/:id/stock` com `GET /products` para montar a foto local; `searchLocal`/
  `lookupLocalByBarcode` leem só do IndexedDB, sem rede.
- **`lib/pdv/outbox.ts`** — fila de vendas com `clientSaleId` (`crypto.randomUUID()`).
- **`stores/usePdvStore.ts`** — removido o scaffold morto `localReserved`/`reserve()`/
  `release()` (confirmado sem nenhum uso real); substituído por `getLocallyReservedQty()`,
  derivado ao vivo da fila.

## Loop PDV-OFF-4 — Protocolo de sincronização

- **`POST /orders/sync-batch`** (`lmfit-api`) — ingestão idempotente por `clientSaleId`:
  reenviar o mesmo lote nunca duplica o pedido. Por linha, reserva atomicamente o quanto o
  local (e o total do tenant) realmente têm disponível; o que faltar vira uma linha de
  encomenda (`isOrder: true`) automaticamente — nunca bloqueia a venda.
- **`LocationsService.reserveUpToAvailable`** / **`ProductsService.reserveForOfflineSale`** —
  os primitivos atômicos "pega o que existir, até o pedido" (local e tenant-total), cada um em
  um único round-trip ao banco, sem race.

## Loop PDV-OFF-5 — Fila conectada ao endpoint + indicador de status

- **`lib/pdv/syncEngine.ts`** — dispara sincronização em: reconexão (`online`), aba voltando a
  ficar visível, intervalo de 20s, e logo após cada venda. Antes de confiar em
  `navigator.onLine` (conhecido por falsos positivos), faz um *probe* em `GET /health`. Retry de
  vendas falhadas com backoff exponencial (até 6 tentativas automáticas; depois disso, só
  manual).
- **`components/organisms/SyncStatusBadge.tsx`** — contador de pendentes/sincronizando +
  "Tentar novamente"; invisível quando a fila está vazia.
- **`PdvClient.tsx`** — toda venda passa por `outbox.enqueueSale()` sempre (online ou offline),
  com `flushNow()` disparado em seguida — o caso online resolve praticamente no mesmo instante
  de antes. Busca e leitura de código de barras tentam a foto local primeiro, com rede como
  *fallback* só quando o local não encontra nada.

## Loop PDV-OFF-6 — Mostrar conflitos resolvidos automaticamente

Uma venda auto-convertida em encomenda nunca deve ficar invisível, mesmo sendo resolvida sem
bloquear o operador.

- **`OrdersService.syncOneOfflineSale`** (`lmfit-api`) — sempre que `downgradedLines.length > 0`,
  dispara `NotificationsService.sendStaffEmail()` (best-effort, `.catch(() => undefined)`) +
  `logStaffAlert('offline_sale_auto_backordered', {...})`, mesmo padrão já usado em
  devoluções/rascunhos de pedido.
- **UI de pedidos do admin** (`OrdersClient.tsx` + `OrderEditorClient.tsx`) — badge "⚠️ Ajustado
  na sincronização" tanto na lista quanto no editor do pedido, lendo `autoBackorderedAt`/
  `autoBackorderNote` (já existentes desde o Loop 4, sem mudança de endpoint).
- **`lib/pdv/offlineDb.ts`** — nova *object store* `syncHistory` (IndexedDB v1→v2, upgrade
  aditivo), uma entrada por venda auto-convertida, chave = `clientSaleId` (replay sobrescreve,
  nunca duplica).
- **`lib/pdv/syncHistory.ts`** (novo) — `recordSyncHistoryEntry`/`listRecentSyncHistory`, com
  poda automática mantendo só as 50 entradas mais recentes.
- **`syncEngine.ts`** — em resposta `partial_backorder`, grava no histórico e dispara um toast
  (`react-hot-toast`) só se `document.visibilityState === "visible"` (app em primeiro plano).
- **`SyncStatusBadge.tsx`** — ganhou uma segunda seção expansível ("N venda(s) ajustada(s) na
  sincronização") que lê do histórico persistido — continua visível mesmo depois que a fila ao
  vivo esvaziar, para um operador que só reabre o PDV depois.

**Verificação ao vivo, ponta a ponta:** local de teste com 2 unidades alocadas → venda de 3
via `POST /orders/sync-batch` (curl) → `partial_backorder` confirmado, pedido criado com split
2 real / 1 encomenda, `autoBackorderedAt`/`autoBackorderNote` corretos → log
`offline_sale_auto_backordered` confirmado no log do servidor → e-mail real enviado a
`STAFF_NOTIFY_EMAILS` confirmado (`Email sent to suporte@kivoni.com.br: ...`) → badge visível na
lista **e** no editor do pedido no navegador. Repetido depois **pela UI real do PDV** (login,
busca local, venda de 3 contra alocação de 2): histórico de sincronização apareceu ao vivo
("Pedido #43 — parte virou encomenda"), sobreviveu a um reload completo da página (lido direto do
IndexedDB, não de estado em memória). Toda a massa de teste (local, pedidos, alocação) foi
revertida ao final — estoque conferido de volta ao valor original (10 unidades).

**Backend:** 24 novos testes em `orders.service.spec.ts` (staff alert disparado só em downgrade,
conteúdo do e-mail/log, falha de e-mail não quebra a sincronização) — suíte completa 312/312.
**Frontend:** novos `syncHistory.test.ts` (persistência, poda, idempotência por replay),
extensões em `syncEngine.test.ts` (grava histórico só em `partial_backorder`, toast só em
primeiro plano) e `SyncStatusBadge.test.tsx` (primeiro teste de render real do componente via
Testing Library — expôs e corrigiu um bug latente: o componente não importava `React`
explicitamente, o que só quebra sob o esbuild/vitest sem plugin JSX, nunca em produção via
Next.js) — suíte completa 405/405.

## Bugs reais encontrados só na verificação ao vivo

Nenhum destes foi pego pelos testes unitários com mocks — só apareceram contra a API/banco de
dados reais, reforçando que mock "limpo demais" não substitui um passe ao vivo:

1. **Mongoose exige `{updatePipeline: true}`** para aceitar `findOneAndUpdate` com pipeline de
   agregação — sem isso, todo `reserveUpToAvailable`/`reserveForOfflineSale` quebrava com 500.
2. **Pedido sincronizado `"open"` (por causa da encomenda) já tinha estoque real debitado nas
   outras linhas** — mas `remove()`/`update()` só revertiam estoque baseado em
   `status ∈ {shipped, completed}`. Corrigido tratando qualquer pedido com `clientSaleId` como
   "estoque já aplicado", independente do status.
3. **`limit: 2000` excedia o `@Max(1000)`** do `PaginationQueryDto` — `refreshSnapshot()`
   sempre recebia 422 e nunca populava a foto local de verdade.
4. **Preço da API é uma string formatada em pt-BR** (`"39,90"`), não um número — um
   `Number(...)` simples vira `NaN` (a vírgula quebra o parse), e todo item da foto local
   aparecia como R$ 0,00. Corrigido com um parser tolerante (`parseMoney`), no mesmo padrão já
   usado em `variantDrafts.ts`.
5. **`SyncStatusBadge.tsx` não importava `React` explicitamente** (Loop 6) — invisível em
   produção (Next.js resolve JSX automaticamente), mas quebrava com `ReferenceError: React is
   not defined` assim que o primeiro teste de render real (Testing Library) do componente foi
   escrito, porque o pipeline vitest/esbuild deste projeto não tem plugin JSX automático. Só
   apareceu porque este foi o primeiro componente da pasta `organisms/` a ganhar um teste de
   render de verdade, não um teste de função pura.

## Verificação

- **Backend:** 310/310 testes, `tsc --noEmit` limpo. Testes cobrem idempotência do
  `syncBatch`, split em encomenda, corrida entre reservas concorrentes, reversão de estoque em
  `remove()`/`update()` para pedidos sincronizados.
- **Frontend:** 392/392 testes, `tsc --noEmit` limpo. Testes cobrem `offlineDb`, `outbox`
  (incluindo backoff exponencial e `listSyncable`), `syncEngine` (`flushNow`/`retryFailedNow`,
  reentrância, falha de rede) e `catalogSnapshot` (incluindo os dois bugs de parsing acima).
- **Ao vivo, ponta a ponta:** local de teste com estoque limitado → venda excedendo a alocação
  → split em encomenda confirmado no pedido real → replay do mesmo `clientSaleId` → idempotente
  → delete do pedido → estoque volta exatamente ao valor original. No navegador: busca resolve
  100% local (zero chamadas de rede confirmado via inspeção de rede), venda enfileirada e
  sincronizada automaticamente sem nenhum botão, pedido real criado com `locationId`/
  `clientSaleId` corretos e efeito de estoque correto no local certo.

## Carregado para depois

- **Paginação do catálogo local** — `refreshSnapshot()` está limitado a 1000 itens (o teto do
  `PaginationQueryDto`); um tenant com catálogo ou alocação por local acima disso perderia o
  restante silenciosamente hoje.
- **Frescor da foto de catálogo** — hoje só atualiza no carregamento do PDV; recarregar
  periodicamente enquanto online é uma melhoria futura, não implementada.
