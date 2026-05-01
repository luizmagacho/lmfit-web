# lmfit-api · Prompt de backend — Plataforma E-commerce & Gestão (foco Brás)

Este documento descreve os contratos que o frontend (`lmfit-web`) já consome para a plataforma de e-commerce e gestão. Ele estende o prompt já publicado em
[`docs/backend-products-variants-prompt.md`](backend-products-variants-prompt.md) com: preços atacado/varejo, PDV, checkout público (PIX), frete/retirada, edição em lote, relatórios (ABC/vendas do dia) e webhooks de pagamento.

> Onde o frontend já está pronto, a API deve se adaptar. Onde o frontend se adapta a status/endpoints ausentes, ele o faz graciosamente — mas entregar o contrato completo destrava tudo.

---

## 1. Papéis e autenticação

- `GET /auth/me` deve retornar `{ id, email, name, role }`.
- `role` aceito: `admin | staff | wholesaler | retail | customer`.
- Papéis que ativam preços de atacado automaticamente (lado do cliente):
  - `staff`, `admin`, `wholesaler`.
- Papéis que veem preço de varejo por padrão:
  - `retail`, `customer`, visitantes sem token.
- O frontend persiste tokens em `tokenStorage` e renova via `/auth/refresh` (inalterado).

## 2. Preços atacado/varejo por produto

Extender o DTO de `Product` com:

```jsonc
{
  "priceRetail": 99.9,
  "priceWholesale": 79.9,
  "minWholesaleQty": 6,
  "compareAtPrice": 129.9
}
```

Regras:

- Se `priceWholesale` for `null`, assumir `priceRetail` para todos.
- `minWholesaleQty` default `6`. Quando o frontend soma ≥ `minWholesaleQty` em uma mesma variante, ele muda a badge para **Atacado** e cobra `priceWholesale` automaticamente.
- Para `wholesaler`/`staff`, o preço de atacado deve valer mesmo para 1 unidade.
- `compareAtPrice` é exibido riscado no catálogo público quando maior que `priceRetail`.

A mesma estrutura pode existir por variante (`variants[n].priceRetail`, `priceWholesale`, `minWholesaleQty`) — neste caso o frontend prioriza o valor da variante.

## 3. Catálogo público

### `GET /public/catalog/products`

- Resposta: lista de produtos (padrão `{ items, total }` ou array simples — o frontend aceita ambos).
- Campos mínimos para grid: `name, sku, images, priceRetail, priceWholesale, minWholesaleQty, compareAtPrice, createdAt, variants[]`.
- Cada `variant` deve expor `quantityOnHand` ou `quantityInStock` para que o filtro **Estoque disponível** funcione.
- `createdAt` dos últimos 30 dias ativa a badge **Lançamento**.

Rotas opcionais já consumidas (graceful degrade):

- `GET /public/catalog/products/:slug`
- `GET /public/catalog/categories`

## 4. PDV (admin `in_person`)

O PDV usa `POST /orders` com payload existente, acrescentando:

```jsonc
{
  "channel": "in_person",
  "operatorUserId": "<id do usuário logado>",
  "paymentMethod": "pix" | "cash" | "card",
  "status": "paid",   // quando o PDV confirma no balcão
  "lines": [
    { "variantId": "...", "quantity": 2, "unitPrice": 79.9, "description": "Cropped · Preto · M" }
  ]
}
```

Requisitos:

- Reserva/baixa de estoque imediata se `status="paid"`.
- Resposta deve continuar retornando `warnings[]` para desencadear o fluxo existente.
- Backend precisa aceitar `operatorUserId` (hoje é ignorado).

## 5. Checkout público (e-commerce one-page)

> Hoje o frontend público (`/checkout` e `/pedido/novo`) já consome `POST /public/order-drafts` +
> `PATCH /public/order-drafts/:token` + `POST /public/order-drafts/:token/submit`. A proposta abaixo é
> manter esse fluxo (já implementado no backend) e apenas **estender o `submit`** para aceitar `payment: { method }` e devolver o PIX no mesmo round-trip. Mantenha a opção legada sem `payment` também.

### `POST /public/order-drafts` (já existe)

### `PATCH /public/order-drafts/:token` (já existe)

### `POST /public/order-drafts/:token/submit` (estender)

Request (submit):

```jsonc
{
  "customerId": "opcional — reutiliza cliente cadastrado",
  "payment": { "method": "pix" }
}
```

Dados de cliente/endereço/frete devem ser coletados no `POST /public/order-drafts` (via `metadata.customer`, `metadata.shipping`). O backend pode promover esses metadados para um Customer real se desejar.

Response (PIX):

```jsonc
{
  "orderId": "ord_123",
  "payment": {
    "paymentId": "pay_789",
    "qrCode": "000201...",          // BR Code copia e cola
    "qrCodeImage": "data:image/png;base64,..." | "https://cdn/...",
    "expiresAt": "2026-04-20T15:30:00Z"
  }
}
```

Regras:

- `shipping.method="pickup"` → custo 0 e `address` pode ser `null`.
- O pedido público nasce como `pending_payment`. Só baixa estoque quando o PIX for confirmado.
- Se `qrCodeImage` estiver ausente, o frontend continua funcionando exibindo somente o código copia-e-cola.
- Se o submit não trouxer `payment`, o frontend redireciona para `/pedido/novo?session=<token>` (fluxo legado), garantindo compatibilidade retroativa.

### `GET /public/payments/:id`

Frontend faz polling a cada 5s enquanto a tela de PIX estiver aberta. Resposta mínima:

```jsonc
{ "status": "pending" | "paid" | "expired" | "failed" | "cancelled" }
```

### Webhooks

- `POST {WEBHOOK_URL} payment.paid`, `payment.refunded`, `payment.expired` — payload inclui `paymentId, orderId, status, amount, paidAt`.
- Webhooks servem para atualizar `PaymentStatusBadge` em tempo quase real; o frontend confia no polling como fallback.

## 6. Frete/retirada

Frontend já trabalha com 3 métodos fixos (`pickup | standard | express`).

Evolução futura (não bloqueante): `POST /shipping/quote` aceitando `{ cep, items }` e retornando `{ methods: [{ id, label, price, etaDays }] }`. Nesse dia, o frontend remove os preços hardcoded do [`ShippingPicker`](../src/components/organisms/ShippingPicker.tsx).

## 7. Edição em lote (admin)

### `PATCH /products/bulk`

Request:

```jsonc
{
  "ids": ["p_1", "p_2"],
  "changes": {
    "pricePercent": 10,              // +10% sobre price atual
    "priceSet": 79.9,                // OU valor fixo
    "quantityInStockDelta": -2,      // ± ajuste
    "quantityInStockSet": 10         // OU substitui valor atual
  }
}
```

Response:

```jsonc
{
  "updated": ["p_1"],
  "failed": [{ "id": "p_2", "error": "Produto arquivado" }]
}
```

Se a rota não existir (`404/405`), o frontend faz fallback para `PATCH /products/:id` um a um, mas isso é ~10× mais lento no lançamento em grade.

## 8. Relatórios adicionais

### `GET /reports/sales-today`

```jsonc
{
  "date": "2026-04-20",
  "total": 12450.70,
  "orderCount": 38,
  "avgTicket": 327.65
}
```

### `GET /reports/abc?from&to`

```jsonc
{
  "range": { "from": "...", "to": "..." },
  "items": [
    {
      "productId": "p_1",
      "name": "Cropped LM FIT",
      "sku": "CRP-001",
      "revenue": 30000,
      "units": 240,
      "cumulativePercent": 45.2,
      "curve": "A"
    }
  ]
}
```

Regras:

- Ordenar por receita desc.
- `cumulativePercent` é o acumulado normalizado (0–100).
- Curva A: `cumulativePercent ≤ 80`. B: `80–95`. C: `>95`.
- Fallback: se a rota não existir, o frontend deriva a curva a partir de `/reports/revenue-by-product` (ver `deriveAbcFromRevenue`).

### Extensões a `/reports/summary`

Adicionar `avgTicket: number` e `salesToday: number` ao payload de resumo evita chamadas extras no dashboard.

## 9. Atualizar OpenAPI

Publicar em [`public/crm-api-openapi.yaml`](../public/crm-api-openapi.yaml) os novos endpoints:

- `POST /public/orders`
- `GET /public/payments/:id`
- `POST /public/orders/:id/pay` (opcional — hoje o frontend cria o pagamento no mesmo `POST /public/orders`)
- `PATCH /products/bulk`
- `GET /reports/abc`
- `GET /reports/sales-today`
- Webhooks `payment.*`

## 10. Pontos frontend relevantes (para discussão de contrato)

- Stores Zustand:
  - [`src/stores/useAuthStore.ts`](../src/stores/useAuthStore.ts) — papel/`role` vira `wholesaler|retail|staff|guest`.
  - [`src/stores/useCartStore.ts`](../src/stores/useCartStore.ts) — cálculo atacado/varejo por linha.
  - [`src/stores/useCheckoutStore.ts`](../src/stores/useCheckoutStore.ts) — endereço, frete, PIX.
- Clientes HTTP:
  - Admin: [`src/lib/http.ts`](../src/lib/http.ts) (com token + refresh).
  - Público: [`src/lib/publicHttp.ts`](../src/lib/publicHttp.ts) (sem token).
- Consumo de produtos:
  - PDV: [`src/lib/pdv/searchProducts.ts`](../src/lib/pdv/searchProducts.ts).
  - Catálogo: [`src/app/(public)/catalogo/CatalogoClient.tsx`](../src/app/(public)/catalogo/CatalogoClient.tsx).
  - Bulk: [`src/lib/products/productsApi.ts`](../src/lib/products/productsApi.ts).
- Pricing helper: [`src/lib/pricing.ts`](../src/lib/pricing.ts) (mapear papel → modo).

## 11. Checklist — “done when”

- [ ] `Product` expõe `priceRetail`, `priceWholesale`, `minWholesaleQty`.
- [ ] `/public/catalog/products` retorna variantes com `quantityOnHand`.
- [ ] `POST /orders` aceita `channel="in_person"` e `operatorUserId`.
- [ ] `POST /public/orders` cria pedido `pending_payment` + PIX no mesmo request.
- [ ] `GET /public/payments/:id` retorna `status`.
- [ ] Webhooks `payment.paid|expired|refunded` disparam para URL configurada.
- [ ] `PATCH /products/bulk` aceita `ids` + `changes` com o contrato acima.
- [ ] `/reports/sales-today` e `/reports/abc` disponíveis.
- [ ] OpenAPI atualizado.
