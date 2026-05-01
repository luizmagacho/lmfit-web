# LM FIT Web — Mapa de Funcionalidades

Panorama completo do frontend (`lmfit-web`, Next.js 15 + React 19 + Tailwind 4 + Zustand) organizado por área, com rotas, componentes responsáveis, stores envolvidos e endpoints de API consumidos.

> **Stack**: Next.js App Router (grupos `(app)`, `(pdv)`, `(public)`), Axios com refresh automático, Zustand para estado global, Atomic Design para UI, Vitest + Playwright para testes, Excel I/O (`xlsx`) e upload de imagens via multipart.

## Sumário

1. [Autenticação e App Shell](#1-autenticação-e-app-shell)
2. [Dashboard / Painel](#2-dashboard--painel)
3. [PDV Mobile (Lançamento em Grade)](#3-pdv-mobile-lançamento-em-grade)
4. [Catálogo de Produtos (Admin)](#4-catálogo-de-produtos-admin)
5. [Edição em Lote / Inventário](#5-edição-em-lote--inventário)
6. [Clientes, CRM 360 e Segmentos](#6-clientes-crm-360-e-segmentos)
7. [CRM — Funil e Tarefas](#7-crm--funil-e-tarefas)
8. [Fornecedores, Compras e Notas Fiscais](#8-fornecedores-compras-e-notas-fiscais)
9. [Pedidos (Admin)](#9-pedidos-admin)
10. [Rascunhos, Escalações WhatsApp e Usuários](#10-rascunhos-escalações-whatsapp-e-usuários)
11. [Relatórios](#11-relatórios)
12. [Catálogo Público + Checkout One-Page](#12-catálogo-público--checkout-one-page)
13. [Pedido via link público (`/pedido/novo`)](#13-pedido-via-link-público-pedidonovo)
14. [Componentes Transversais e Utilitários](#14-componentes-transversais-e-utilitários)
15. [Stores (Zustand) e Estado Global](#15-stores-zustand-e-estado-global)
16. [Qualidade: Testes e Operação](#16-qualidade-testes-e-operação)

---

## 1. Autenticação e App Shell

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/` | `src/app/page.tsx` | Redireciona para `/dashboard`. |
| `/login` | `src/app/login/page.tsx` | Login por e-mail/senha, toggle de visualização da senha, redirecionamento preservando `?next=`. |
| Demais rotas autenticadas | `src/app/(app)/layout.tsx` + `src/components/AppShell.tsx` | Aplica `RequireAuth`, barra lateral responsiva (drawer no mobile), `UserMenu` com logout. |

- **Identidade/API**: `src/lib/http.ts` usa `NEXT_PUBLIC_API_URL` (`src/lib/apiBase.ts`), injeta `Authorization: Bearer <access>` e faz refresh automático em 401 via `/auth/refresh`.
- **Tokens** persistidos em `localStorage` (`src/lib/tokenStorage.ts`).
- **Store de auth** (`src/stores/useAuthStore.ts`): `init` chama `/auth/me`, `login` em `/auth/login`, `logout` em `/auth/logout`; expõe `inferredRole()` que mapeia o `role` do usuário para `guest | retail | wholesaler | staff` (usado no pricing).
- `AuthProvider`/`useAuth` (`src/context/AuthContext.tsx`) são wrappers de compatibilidade ainda usados pelo login, mas apenas repassam para o store Zustand.

### Navegação global (sidebar)

`Início`, `PDV Mobile`, `Edição em lote`, `Clientes`, `CRM · Funil`, `CRM · Tarefas`, `CRM · Segmentos`, `Fornecedores`, `Produtos`, `Pedidos`, `Compras`, `Notas fiscais`, `Relatórios`, `Rascunhos`, `WhatsApp`, `Usuários`.

---

## 2. Dashboard / Painel

Rota: `/dashboard` — `src/app/(app)/dashboard/DashboardClient.tsx`.

Exibe um painel com:

- **KPIs CRM** (Clientes, Escalações abertas, Oportunidades locais) — calculados a partir de `/customers` e `/internal/whatsapp/escalations` + store local.
- **KPIs de operação**: Vendas do dia, Ticket médio, Receita do período, Valor em estoque (varejo).
- **Compras por dia** (gráfico de barras) via `GET /reports/purchases-daily`.
- **Receita por produto** com barras proporcionais (`GET /reports/revenue-by-product`).
- **Curva ABC (80/15/5)** via `GET /reports/abc` ou derivada no cliente (`deriveAbcFromRevenue`) quando a API não expõe o endpoint.
- **Top variantes (SKU)** com link para `/reports`.
- Filtro de período (7/30/90 dias) aplicado a todas as seções.
- Atalhos para `/inventory`, `/pdv`, `/catalogo`.

API consumida: `fetchReportSummary`, `fetchPurchasesDaily`, `fetchRevenueByProduct`, `fetchSalesToday`, `fetchAbcCurve` — todas com fallback silencioso (`src/lib/dashboardApi.ts`).

---

## 3. PDV Mobile (Lançamento em Grade)

Rota: `/pdv` — `src/app/(pdv)/pdv/PdvClient.tsx` (layout próprio em `src/app/(pdv)/layout.tsx` com `RequireAuth`).

Fluxo desenhado para vendas presenciais no Brás/balcão:

- **Busca de produto** por nome/SKU com debounce (`pdvSearchProducts` em `src/lib/pdv/searchProducts.ts`, hit em `GET /products?search=`).
- **Busca de cliente** por nome/telefone usando `/customers?search=` com dropdown inline (evita digitar ID).
- **`VariantGrid`** (`src/components/organisms/VariantGrid.tsx`): matriz de cor × tamanho com preço resolvido por papel (atacado/varejo) e quantidade mínima de atacado (padrão 6, `minWholesaleQty`).
- **`VariantQtyRow`** (`src/components/molecules/VariantQtyRow.tsx`) com `NumberStepper` para lançamento rápido.
- **`QuickCart`** (`src/components/organisms/QuickCart.tsx`): bottom-sheet fixo com totais, swipe-para-remover (PointerEvents, 80 px de trigger) e atalho `Ctrl+Enter` para finalizar.
- **Finalização**: `createOrder` em `/orders` com `channel: "in_person"` e `status: "paid"`.
  - Em caso de `409/conflict` exibe `StockConflictPanel` com cada variante em falta (`getStockConflictsFromAxiosError`).
  - `OrderWarningsPanel` mostra avisos pós-venda (shortfall, compra pendente).
- **Badge de modo** (Atacado/Varejo/Visitante/Operador) ao lado do campo de cliente.
- Estado local: `usePdvStore` (busca, produto ativo, reservas locais) + `useCartStore` (linhas, papel, snapshot).

---

## 4. Catálogo de Produtos (Admin)

Rota: `/products` — `src/app/(app)/products/ProductsClient.tsx`.

Baseado em `ResourceList` genérico (`src/components/ResourceList.tsx`) com extensões específicas:

- **Galeria de imagens por produto** (`ImageGalleryGrid`, `ImageCarousel`, `ProductImageCell`): upload multipart em `POST /products/images`, limite 5 MB, JPEG/PNG, URL primária sincronizada em `primaryImageUrl`.
- **Editor de variantes** (`ProductVariantsEditor`): lista de combinações cor × tamanho × SKU × preço × estoque, com validação (`validateVariantDrafts`) e sincronização automática dos campos top-level com a 1ª variante (`flattenFirstVariantOnRow`).
- Importação/exportação **Excel** (`src/lib/excelIo.ts`) com modelo por colunas.
- Colunas configuráveis (ID, Nome, SKU, Preço, Estoque, Ativo, Descrição etc.).
- CRUD via `/products` (GET/POST/PATCH/DELETE), bulk via `PATCH /products/bulk` com fallback por PATCH individual (`bulkPatchProducts`).

---

## 5. Edição em Lote / Inventário

Rota: `/inventory` — `src/app/(app)/inventory/BulkEditorClient.tsx`.

- Lista produtos (`listProductsForBulk`, `GET /products`) com busca incremental.
- **Seleção múltipla** + checkbox "selecionar todos".
- Campos de ajuste: **preço fixo**, **+%/-% sobre preço**, **estoque fixo**, **delta de estoque** (`useInventoryBulkStore` e `applyBulkChange`).
- **Awareness de variantes**: `summarizeInventoryProduct` agrega estoque (soma) e preço (1º preço, sinaliza `mixedPrices` quando variantes divergem). Exibe aviso impedindo aplicar `pricePercent`/`priceSet` global em produtos com variantes de preços mistos.
- Aplica mudanças com `bulkPatchProducts` (tenta `PATCH /products/bulk`, cai para PATCH unitário em 404/405); mostra relatório `{ updated, failed }`.
- Memoriza último patch em `lastApplied` para reaplicação rápida.

---

## 6. Clientes, CRM 360 e Segmentos

### Lista de clientes — `/customers`

`src/app/(app)/customers/CustomersPageClient.tsx` — `ResourceList` de `/customers` com colunas ID, Nome, E-mail, Telefone, WhatsApp, Razão social. Cada linha abre a visão 360.

### Cliente 360 — `/customers/[id]`

`src/app/(app)/customers/[id]/Customer360Client.tsx`:

- Carrega paralelamente: `fetchCustomerById`, `fetchOrdersForCustomer`, `fetchInvoicesForCustomer`, `fetchEscalationsForWa` (`src/lib/crm/customer360.ts`).
- Monta **timeline unificada** (`buildTimeline`) com pedidos, faturas e escalações.
- **Notas locais** no navegador (`src/lib/crm/customerNotesLocal.ts`) — append-only, sem API.
- Mostra `OrderWarningsPanel` embedado quando há warnings no histórico.

### Segmentos — `/crm/segments`

`src/app/(app)/crm/segments/SegmentsClient.tsx`:

- Presets (`Todos`, `Com e-mail`, `Com WhatsApp`) aplicados no cliente sobre a lista `/customers`.
- **Exportação CSV** direta para campanhas (nome, e-mail, telefone, WhatsApp, razão social).

---

## 7. CRM — Funil e Tarefas

### Pipeline / Funil — `/crm/pipeline`

`src/app/(app)/crm/pipeline/PipelineClient.tsx`:

- Estágios: `new`, `qualified`, `proposal`, `won`, `lost`.
- Tenta `/crm/opportunities`; se não houver API, usa store local (`readLocalOpportunities`/`writeLocalOpportunities`) como fallback offline.
- Criação rápida (título, cliente, valor), movimentação entre estágios e KPIs por coluna.

### Tarefas — `/crm/tasks`

`src/app/(app)/crm/tasks/TasksClient.tsx`:

- CRUD sobre `/crm/tasks` com fallback local análogo ao funil.
- Campos: título, data de vencimento, cliente relacionado, status.

> Os stores locais em `src/lib/crm/localStores.ts` e `customerNotesLocal.ts` garantem que o CRM seja operável mesmo antes do backend expor os endpoints.

---

## 8. Fornecedores, Compras e Notas Fiscais

- **Fornecedores** (`/suppliers`) — `ResourceList` simples sobre `/suppliers`.
- **Compras**:
  - Lista `/purchases` (`PurchasesListClient.tsx`): busca, paginação, link para editor, export XLSX.
  - Editor `/purchases/new` e `/purchases/[id]` (`PurchaseEditorClient.tsx`): seleção de fornecedor, linhas com variante + quantidade pedida/recebida, validação local, API `src/lib/purchases/purchasesApi.ts` (`/purchases`).
- **Notas fiscais** (`/invoices`) — `InvoicesClient.tsx`:
  - Filtro por status (`fetchInvoiceStatusOptions` + `InvoiceStatusBadge`).
  - Canonicaliza `open` → `pending`, `void` → `cancelled` (`normalizeInvoiceStatusToCanonical`).
  - Export XLSX e CRUD via `ResourceList`.

---

## 9. Pedidos (Admin)

- **Lista** (`/orders`) — `OrdersClient.tsx`: filtros por canal (`in_person | online | site | whatsapp`) e busca, export XLSX (`ordersExportParams`), badges de status (`draft | paid | fulfilled | cancelled`), nome do cliente resolvido via `/customers`.
- **Editor** (`/orders/new` e `/orders/[id]`) — `OrderEditorClient.tsx`:
  - Seleção de cliente, canal, status, referência e observações.
  - Linhas com variante, quantidade, preço unitário (autocomplete a partir das variantes conhecidas via `collectVariantOptionsFromProducts`).
  - Normalização (`normalizeOrderLines`) e trava de edição para `paid`/`fulfilled` (`isLinesLockedStatus`).
  - `OrderWarningsPanel` + `StockConflictPanel` para erros da API.
  - Usa `createOrder`/`updateOrder`/`getOrder` de `src/lib/orders/ordersApi.ts`.

---

## 10. Rascunhos, Escalações WhatsApp e Usuários

- **Rascunhos de pedido** (`/drafts`) — `ResourceList` sobre `/order-drafts` com `sessionToken` como chave (status, cliente, WhatsApp, pedido resultante, atualização).
- **Escalações WhatsApp** (`/escalations`) — `EscalationsClient.tsx`: consome `/internal/whatsapp/escalations`, permite filtrar via `?fromWaId=`. O Dashboard exibe contagem de escalações "abertas" com heurística `status ≠ done|resolved|closed|ok`.
- **Usuários** (`/users`) — `ResourceList` sobre `/users` (ID, nome, e-mail, papel).

---

## 11. Relatórios

Rota: `/reports` — `src/app/(app)/reports/page.tsx`.

- Seleção de período (7/30/90 dias).
- KPIs: Receita (pedidos pagos/entregues) e Valor em estoque (varejo).
- **Top SKUs por receita** com barras proporcionais (`topVariants`).
- Consome `GET /reports/summary?from&to`.
- Complementar ao Dashboard (que usa o mesmo endpoint + ABC/compras/vendas do dia).

---

## 12. Catálogo Público + Checkout One-Page

### Catálogo B2C — `/catalogo`

`src/app/(public)/catalogo/CatalogoClient.tsx` + `ProductGrid` + `CatalogFilters`:

- Fonte: `GET /public/catalog/products` (sem autenticação, `publicHttp`).
- **Filtros client-side**: busca textual, categoria, "Estoque disponível", "Lançamentos" (`useCatalogStore`).
- **Skeletons** (`Skeleton`) durante o fetch.
- **Badges dinâmicos**: Atacado vs Varejo baseado no `inferredRole()` e na quantidade mínima.
- **`PriceTag`** (`src/components/atoms/PriceTag.tsx`) mostra preço resolvido e o modo aplicado.
- Rota legada `/catalog` faz redirect para `/catalogo`.

### Checkout one-page — `/checkout`

`src/app/(public)/checkout/CheckoutClient.tsx` + layout em `src/app/(public)/layout.tsx`:

- **Dados do cliente**: nome, telefone, e-mail (opcional).
- **Entrega** (`ShippingPicker`): retirada em loja (grátis), padrão, expresso. `shippingCost()` calcula o valor.
- **Endereço** com CEP validado via ViaCEP (`src/lib/cep.ts`: `isValidCep`, `maskCep`, `lookupCep`) — preenche logradouro, bairro, cidade, UF automaticamente (`AddressForm`).
- **Revisão** com subtotal, frete, total e badges por linha.
- **Pagamento PIX** (`PixPayment`):
  - QR Code + código copia-cola (`copyToClipboard`).
  - Contagem regressiva (`usePixCountdown`).
  - Poll de status a cada 5 s (`getPublicPaymentStatus` em `/public/payments/:id`).
  - `PaymentStatusBadge` com estados `pendente | pago | expirado | estornado`.
- **Fluxo de API** (`src/lib/publicOrders.ts`): reusa `POST /public/order-drafts` → `PATCH /public/order-drafts/:token` → `POST /public/order-drafts/:token/submit { payment: { method: "pix" } }`. Se o backend não retornar PIX, redireciona para `/pedido/novo?session=<token>` para continuar o fluxo clássico.

---

## 13. Pedido via link público (`/pedido/novo`)

`src/app/(public)/pedido/novo/pedido-client.tsx`:

- Aceita `?session=<token>` para editar rascunho existente.
- Carrega catálogo via `GET /public/catalog/products` e permite montar linhas (variante + quantidade).
- Aceita associação a cliente por `customerId` ou `waId` (WhatsApp).
- Submete em `POST /public/order-drafts/:token/submit`.

---

## 14. Componentes Transversais e Utilitários

### Atomic Design

- **Atoms** (`src/components/atoms/`): `Badge`, `IconButton`, `NumberStepper`, `PaymentStatusBadge`, `PriceTag`, `Skeleton`.
- **Molecules**: `VariantQtyRow`.
- **Organisms**: `AddressForm`, `CatalogFilters`, `PixPayment`, `ProductGrid`, `QuickCart`, `ShippingPicker`, `VariantGrid`.
- **Templates**: `PdvTemplate` (layout de duas zonas — busca e carrinho).

### UI genérica

- **`ResourceList`** — CRUD declarativo (colunas tipadas, formulário com máscaras, validação, upload de imagem, import/export Excel, bulk, paginação). Base de 8+ páginas.
- **`ImageGalleryGrid` + `ImageCarousel` + `ProductImageCell`** — galeria com URL primária sincronizada.
- **`OrderWarningsPanel`** — exibe `warnings` retornados pela API (shortfall, compra pendente) com sugestão de criar compra.
- **`StockConflictPanel`** — lista `{ sku, needed, available }` vinda de 409.
- **`InvoiceStatusBadge`** — badges canonicais de fatura.

### Libs de apoio

- `src/lib/formatMoney.ts` — `formatBRL`.
- `src/lib/inputMasks.ts` — máscaras de telefone (BR), e-mail, dinheiro BRL, dígitos.
- `src/lib/slugifyFileBase.ts` — nomes de arquivos exportados.
- `src/lib/normalizeApiList.ts` — `extractListItems`, `extractListTotal`, `documentId`, `collectVariantOptionsFromProducts` (tolera formatos `{items,total}`, arrays puros etc.).
- `src/lib/apiErrors.ts` — `axiosErrorMessage`, `getStockConflictsFromAxiosError` (409 específico).
- `src/lib/pricing.ts` — `resolveUnitPrice`, `inferModeForUser`, `computeCartTotals`.
- `src/lib/pix.ts` — `copyToClipboard`, `usePixCountdown`.
- `src/lib/cep.ts` — validação, máscara e `lookupCep` (ViaCEP com `AbortController`).
- `src/lib/invoiceStatusOptions.ts` — fetch + cache das opções de status.
- `src/lib/productImageUrl.ts` — parse de galeria JSON + resolução de URLs.
- `src/lib/excelIo.ts` — `downloadTemplate`, `parseWorkbookToItems`, `buildDataAoA`, `downloadXlsxFile`.

---

## 15. Stores (Zustand) e Estado Global

| Store | Arquivo | Responsabilidade |
|-------|---------|------------------|
| `useAuthStore` | `src/stores/useAuthStore.ts` | Sessão, usuário, login/logout, papel inferido (`guest/retail/wholesaler/staff`). |
| `useCartStore` | `src/stores/useCartStore.ts` | Linhas do carrinho (PDV + checkout), cliente associado, cálculo de preço por papel (`recalc`), snapshot imutável. |
| `usePdvStore` | `src/stores/usePdvStore.ts` | Estado da tela PDV (busca, produto ativo, reservas locais para evitar overselling na sessão). |
| `useCheckoutStore` | `src/stores/useCheckoutStore.ts` | Endereço, método de entrega, dados do cliente B2C, estado PIX (`pending/paid/expired/failed`). |
| `useInventoryBulkStore` | `src/stores/useInventoryBulkStore.ts` | Seleção de produtos, última mudança aplicada (`BulkChange`) e `applyBulkChange` puro para preview. |
| `useCatalogStore` | `src/stores/useCatalogStore.ts` | Filtros client-side do catálogo público. |

A migração React Context → Zustand foi feita preservando `useAuth`/`AuthProvider` para compatibilidade; todo código novo deve consumir os stores diretamente.

---

## 16. Qualidade: Testes e Operação

### Testes unitários (Vitest + Testing Library)

Arquivos (`*.test.ts`/`*.test.tsx`):

- `src/lib/formatMoney.test.ts`
- `src/lib/invoiceStatus.test.ts`
- `src/lib/normalizeApiList.test.ts`
- `src/lib/inputMasks.test.ts`
- `src/lib/apiErrors.test.ts`
- `src/lib/imageUpload.test.ts`
- `src/lib/slugifyFileBase.test.ts`
- `src/lib/productImageUrl.test.ts`
- `src/lib/excelIo.test.ts`
- `src/lib/pricing.test.ts`
- `src/lib/products/variantDrafts.test.ts`
- `src/stores/useCartStore.test.ts`
- `src/stores/useInventoryBulkStore.test.ts`
- `src/theme/tokens.test.ts`

Config: `vitest.config.mts` com alias `@ → src`, ambiente `jsdom`.

### Testes E2E (Playwright)

`playwright.config.ts` sobe Next na porta **3005** automaticamente:

- `tests/e2e/smoke.spec.ts` — caminho feliz básico.
- `tests/e2e/responsive.spec.ts` — breakpoints mobile/desktop.
- `tests/e2e/pdv.spec.ts` — redirect de auth e UI do PDV.
- `tests/e2e/checkout.spec.ts` — catálogo público e checkout com carrinho vazio.

### Scripts

```bash
npm run dev          # Next + Turbopack
npm run build        # build produção
npm test             # Vitest (uma execução)
npm run test:watch   # Vitest watch
npm run test:e2e     # Playwright
npm run seed:demo    # scripts/seed-demo-data.mjs (popular API)
```

### Variáveis de ambiente

- `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`) — base do `http` e do `publicHttp`.
- `.env.example` documenta o contrato mínimo.

### Design Tokens

`src/theme/tokens.ts` — laranja LM FIT (`#f68006`), acento preto, superfícies neutras, `success`/`error` semânticos. CSS variables em `src/app/globals.css`.

---

## Diagrama rápido de rotas

```
/                     → redirect /dashboard
/login                → LoginForm
/(app)                → AppShell (RequireAuth)
  /dashboard          → Painel (KPIs, ABC, compras, receita, top SKUs)
  /pdv                (na área (pdv)) → PDV Mobile
  /products           → Catálogo admin + variantes + imagens + excel
  /inventory          → Edição em lote
  /customers          → Lista
  /customers/[id]     → Cliente 360 + timeline + notas locais
  /crm/pipeline       → Funil CRM
  /crm/tasks          → Tarefas CRM
  /crm/segments       → Segmentos + export CSV
  /suppliers          → Fornecedores
  /purchases          → Lista + editor (new / [id])
  /orders             → Lista + editor (new / [id])
  /invoices           → Notas fiscais
  /drafts             → Rascunhos /order-drafts
  /escalations        → Fila WhatsApp
  /users              → Usuários
  /reports            → Relatórios
/(public)
  /catalogo           → Catálogo B2C filtrado
  /catalog            → redirect /catalogo
  /checkout           → One-page + PIX
  /pedido/novo        → Montagem via sessionToken
```

---

### Contratos de backend correlatos

Docs adicionais em `docs/`:

- `backend-crud-prompt.md` — contrato genérico de CRUD/listagem.
- `backend-products-variants-prompt.md` — variantes de produto.
- `backend-dashboard-products-prompt.md` — agregados de dashboard.
- `backend-ecommerce-gestao-prompt.md` — rotas `/public/order-drafts`, PIX, KPIs ABC, vendas do dia.
- `ui-contract.md` — contrato UI ↔ backend.
- `crm-mobile-handoff.md`, `storefront-b2c-backlog.md` — histórico de decisões.
- `public/crm-api-openapi.yaml` — spec OpenAPI do CRM.
