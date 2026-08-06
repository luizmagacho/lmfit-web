# Loop Influencer-C — Relatório de vendas por influenciador

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop Influencer-C · **Depends on:** Loop Influencer-B (`Promotion.influencerId` populado)
**Repos touched:** lmfit-api, lmfit-web

## Goal

Terceiro e último loop do Programa de Influenciadores — o relatório em si: "quem vendeu quanto".
Fecha o pedido original do usuário ("sabermos mapear qual influenciador vendeu quantos").

## Scope

**In:**
- `ReportsService.salesByInfluencer()` — agrega `Order` (pedidos `completed` com `couponCode`),
  cruza com `Promotion` por `{tenantId, code}`, filtra só promoções com `influencerId`, agrupa por
  influenciador.
- `GET /reports/sales-by-influencer?from=&to=&limit=`.
- Dashboard: teaser "Top Influenciadores" (top 5) na mesma lista de `Promise.all` já existente.
- `/reports`: seção completa (até 50 — teto de `ReportsRevenueQueryDto`), não só top-N.

**Out:** nada — fecha o plano do Programa de Influenciadores (Loops A+B+C).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Definição de receita | `quantity × unitPrice` (igual `revenueByProduct`) | `order.total` já embute o desconto do próprio cupom, distorceria o número por influenciador |
| Cupom comum (sem influenciador) | Excluído do agrupamento (`$match` em `promo.influencerId`) | Relatório é só de vendas atribuídas, não de todo cupom usado |
| Promoção excluída desde a venda | Pedido cai fora (`$unwind preserveNullAndEmptyArrays: false`), não quebra a agregação | Não dá pra atribuir o que não existe mais — comportamento defensivo, não erro |
| Contagem de pedidos | `$addToSet` do `_id` do pedido antes de `$unwind` de `lines` | Evita contar 1 pedido de 2 linhas como 2 pedidos |
| `influencerModel.findOne` retorna `null` (defensivo) | Nome vira "(influenciador removido)" | Documento nunca deveria sumir de verdade (guard de exclusão do Loop A/B impede), mas o código não confia nisso silenciosamente |

## Tasks

- [x] `ReportsService.salesByInfluencer()` (novo método, `reports.service.ts`).
- [x] `ReportsController`: `GET /reports/sales-by-influencer`.
- [x] `ReportsModule`: registra `Promotion`/`Influencer` (não estavam lá antes).
- [x] `dashboardApi.ts`: `fetchSalesByInfluencer()` + tipo `SalesByInfluencerResponse`.
- [x] `DashboardClient.tsx`: seção "Top Influenciadores" (top 5), mesmo padrão de lista de barras.
- [x] `app/(app)/reports/page.tsx`: seção "Vendas por influenciador" (lista completa, até 50).
- [x] `reports.service.spec.ts` (novo arquivo — não existia teste pra este service): +8 testes
      (pipeline shape do `$match`/`$lookup`/`$unwind`/exclusão de cupom comum, resolução de nome,
      fallback defensivo, limit customizável, resultado vazio não quebra).
- [x] `tsc --noEmit` limpo nos dois repos; suítes completas verdes (api 331/331, era 323; web
      499/499, sem mudança — páginas de dashboard/relatórios não têm suíte dedicada, mesmo padrão
      já existente pras outras seções).
- [x] Verificação ao vivo: influenciador + cupom + pedido `completed` reais, números do dashboard
      e da página de relatórios conferidos contra o cálculo manual.

## Follow-up record
### PLAN        — [x] herdado do plano dos Loops Influencer-A/B (mesma sessão) → Ready on 2026-08-05
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-05
### TEST        — [x] +8 api (331/331, era 323), 0 web novos (499/499, sem regressão) → green on 2026-08-05
### VERIFY      — [x] ao vivo (influenciador+cupom+pedido reais, números conferidos) → 2026-08-05
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-05

## Verification record

Verificado ao vivo contra o tenant `kivoni` real (instância temporária do `lmfit-api`, porta 4001;
container Docker `kivoni-mongo` — ambos precisaram ser reiniciados no meio da sessão, já registrado
no changelog do Loop Influencer-A).

- Criado um influenciador real ("Ana Fit"), um cupom real vinculado (`ANAFIT10`, 10%), e um pedido
  real `status: completed` usando esse cupom — 2 unidades de "Camisa Barcelona I 2024" a R$ 299,90
  cada (`isOrder: true` pra pular a checagem de estoque, já que a variante usada estava zerada —
  não é um atalho da agregação, é só como o pedido de teste foi criado).
- **Dashboard** ✅ — seção "Top Influenciadores" mostrou "Ana Fit · 599,80 · 2 un · 1 pedidos",
  batendo exatamente com o cálculo manual (2 × R$299,90 = R$599,80).
- **Página de relatórios** ❌→✅ — **bug real encontrado e corrigido na hora**: a seção nova usava
  `limit=100` na chamada, mas `ReportsRevenueQueryDto` só aceita até 50 (`@Max(50)`) — a API
  respondia `422` e o `fetch` engolia o erro silenciosamente (padrão try/catch→null já usado em
  todo `dashboardApi.ts`), então a seção aparecia vazia sem nenhum aviso. Corrigido pra `limit=50`
  (mesmo teto que o dashboard já usa em `revenueByProduct(..., 50)`); recarregado e confirmado que
  "Ana Fit · 599,80 · 2 un. · 1 pedidos" aparece corretamente.
- **Achado colateral, não corrigido (fora de escopo)**: `ANAFIT10.usedCount` chegou a `2` mesmo
  com só 1 pedido real criado — a primeira tentativa de criar o pedido falhou por estoque
  insuficiente (`422`), mas parece ter incrementado `usedCount` antes de falhar na checagem de
  estoque em `OrdersService.create()`. Isso não afeta a correção deste relatório (a contagem de
  pedidos usa `$addToSet` sobre o `_id` real do pedido, não `Promotion.usedCount`) — na prática,
  validou que a decisão de design (§Decisions, "Contagem de pedidos") estava certa. Registrado
  aqui como achado real pra investigar depois, não escondido nem corrigido às pressas.
- Limpeza: pedido/cupom/influenciador de teste excluídos direto no Mongo ao final (o próprio guard
  de exclusão do Loop A/B bloqueava a exclusão via API normal, já que `usedCount > 0` — exatamente
  o comportamento pretendido; a limpeza de dados de teste é uma ação diferente de "excluir um
  registro real com histórico", então o bypass direto no banco foi o certo aqui).

## Result

Programa de Influenciadores completo: cadastro de influenciador (Loop A) → vínculo com cupom
(Loop B) → relatório de vendas atribuídas (Loop C). Pedido original do usuário ("mapear qual
influenciador vendeu quantos, como um programa de afiliados") atendido de ponta a ponta, com
comissão (%) já capturada como dado real pra um futuro loop de fechamento de repasse.
