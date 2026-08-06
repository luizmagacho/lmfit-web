# Loop 11-C — Pedido real a partir da conversa (`confirm_order`) + humano assume a conversa

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 11 — WhatsApp Business AI · **Depends on:** Loop 11-B (conversa persistente + IA respondendo)
**Repos touched:** lmfit-api

## Goal

Fecha o plano completo do Loop 11 (11-A+B+C): a IA não só responde o cliente, ela consegue montar
um pedido de verdade a partir da própria conversa — sem o cliente precisar ir pro site. Último
loop, o mais arriscado dos três (mexe com dinheiro/estoque de verdade), por isso o mais cuidadoso
em reaproveitar pipeline já validado em vez de construir um caminho novo.

## Scope

**In:**
- `ChatService` ganha uma ação nova `confirm_order` — mas só existe quando o chamador passa
  `whatsappOrderContext` (opt-in). O widget do site nunca passa isso, então o comportamento dele
  fica 100% intocado (confirmado por teste dedicado). O bloco extra do prompt cita as opções de
  frete REAIS do tenant (`tenant.shippingConfig`), nunca inventa taxa.
- `WhatsappChatService.tryCreateOrder()` — em vez de chamar `OrdersService.create()` direto (o que
  duplicaria toda a revalidação de estoque/preço/frete que o checkout real já faz), reusa o MESMO
  pipeline rascunho→pedido que o site e a opção "Combinar no WhatsApp" já usam:
  `OrderDraftsService.createPublic → patchByToken → submitByToken`. `patchByToken` já revalida
  estoque/preço no instante da confirmação (pode recusar se mudou desde o `add_to_cart`) e calcula
  o frete real sozinho — nada disso foi reimplementado.
- Confirmação da IA é SEMPRE o valor real devolvido pelo pedido criado (`order.number`/`order.total`),
  nunca o texto que a LLM gerou — protege contra a IA "alucinar" um total errado na resposta.
- `PATCH /internal/whatsapp/conversations/:waId` (`whatsapp-internal.controller.ts`) — staff liga/
  desliga a IA pra um número específico (`aiEnabled`, já existia no schema desde o Loop 11-B).

**Out:** UI de inbox pra staff acompanhar/assumir conversas visualmente — por enquanto é só o
endpoint (staff usa via chamada direta/Postman/futura tela). Fica pra uma iteração se o lojista
sentir falta.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Criar pedido via `OrderDraftsService` ou `OrdersService.create()` direto | `OrderDraftsService` (rascunho→pedido) | `OrdersService.create()` sozinho exigiria reimplementar validação de estoque/preço/frete que o draft já faz — duplicação, exatamente o que este projeto evita |
| Onde a ação `confirm_order` entra no prompt compartilhado | Bloco extra opt-in em `ChatService`, não um prompt separado | O motor (catálogo real, validação real) já é o mesmo pro site e pro WhatsApp — só o CONTEXTO de pedido muda; extensão opt-in prova que o widget do site nunca é afetado |
| Texto de confirmação pro cliente | Sempre gerado pelo servidor com o total/número REAIS do pedido criado, nunca o texto da LLM | Mesmo princípio de "nunca confia na LLM" já usado em toda validação de ação — vale também pro que é dito de volta ao cliente |
| Falha na criação (estoque mudou, etc.) | Mensagem de desculpa genérica pro cliente, erro real só no log do servidor | Nunca vazar mensagem de erro interna (ex.: stack, detalhe de Mongo) pro WhatsApp do cliente |
| Endpoint de pausar IA | Upsert (`setAiEnabled`) — funciona mesmo se a conversa ainda não existir | Staff pode pausar preventivamente um número antes da primeira mensagem dele chegar |

## Tasks

- [x] `chat.service.ts`: `ChatConfirmOrderAction`, `WhatsappOrderContext`, `buildWhatsappOrderPrompt`,
      `validateConfirmOrderAction`, `resolveActions`/`reply()` ganham parâmetro opcional.
- [x] `whatsapp-chat.service.ts`: `buildShippingOptions` (mesmos rótulos/padrões do
      `ShippingPicker.tsx` do site), `tryCreateOrder` (chama `OrderDraftsService`), `confirm_order`
      tratado no loop de ações de `handleCustomerMessage`.
- [x] `whatsapp.module.ts`: importa `OrderDraftsModule`.
- [x] `whatsapp-conversations.service.ts`: `setAiEnabled` (upsert).
- [x] `dto/set-conversation-ai-enabled.dto.ts` (novo) + `whatsapp-internal.controller.ts`:
      `PATCH conversations/:waId`.
- [x] Testes novos: `chat.service.spec.ts` (novo arquivo — não existia teste pra este service antes;
      +6, cobrindo o opt-in por `whatsappOrderContext`, frete real no prompt, validação de
      `confirm_order` incluindo o caso "LLM inventou uma opção de frete que não existe"),
      `whatsapp-chat.service.spec.ts` (+5 no describe `confirm_order` — pedido real criado,
      resposta usa o total real não o da LLM, carrinho vazio recusa, falha no pipeline vira
      desculpa genérica).
- [x] `tsc --noEmit` limpo; suíte api 366/366 (era 355, +11).
- [x] Verificação ao vivo completa (ver abaixo) — fecha o plano inteiro do Loop 11.

## Follow-up record
### PLAN        — [x] herdado do plano 11-A/B/C (mesma sessão) → Ready on 2026-08-06
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-06
### TEST        — [x] +11 api (366/366, era 355) → green on 2026-08-06
### VERIFY      — [x] ao vivo (conversa completa criando pedido real + endpoint de pausa) → 2026-08-06
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-06

## Verification record

Verificado ao vivo contra o tenant `kivoni` real, com `shippingConfig` real configurado
(`standardFee: 25`, `expressFee: 45`, `pickupLabel: "Retire na Rua Oriente"`, `freeAboveTotal: 500`).

- **Conversa completa de 3 mensagens via curl** (payload real da Meta): "Tem camisa do Flamengo
  M?" → IA responde citando estoque real → "Adiciona 1 no carrinho" → carrinho persistido ganha a
  linha real (variantId/sku/preço reais) → "Pode fechar! Meu nome é Ana Verificação, quero entrega
  padrão" → IA emitiu `confirm_order` de verdade.
- **Pedido real criado** ✅ — `db.orders.findOne({number: 46})` confirmado com
  `channel: 'online'`, `reference: "WhatsApp: Ana Verificação - 5511977776666 - R$ 324,90"`
  (formato IDÊNTICO ao pedido #45 verificado no Loop 11-A via checkout real), `shippingMethod:
  'standard'`, `shippingCost: 25` (taxa real, não inventada), `total: 324.9` = R$299,90 (produto) +
  R$25,00 (frete real) — matemática batendo exatamente. Um `Customer` convidado real foi criado e
  vinculado (mesmo caminho de resolução por `waId` que o checkout público já usa).
  Confirmado também visualmente no painel `/orders` — o pedido aparece indistinguível de um pedido
  real feito pelo checkout ou por staff.
  **A resposta da IA usou o total/número REAIS do pedido** ("Pedido #46 confirmado! Total: R$
  324,90"), não um valor inventado pela LLM — prova viva da decisão de nunca confiar no texto da
  LLM pro que é dito de volta ao cliente.
- **Carrinho zerado após a confirmação** ✅ — `conversation.cartLines` ficou `[]`, confirmando que
  uma "oi" na próxima conversa não herda o carrinho antigo.
- **Endpoint de pausa** ✅ — login real como admin (`/auth/login`), `PATCH
  /internal/whatsapp/conversations/5511977776666` com `{aiEnabled: false}` retornou o documento
  atualizado; mandada mais 1 mensagem pro mesmo número depois — `history.length` permaneceu em 6
  (não cresceu), confirmando que a IA ficou de verdade em silêncio pro número pausado.
- Limpeza: pedido #46, o `OrderDraft` vinculado, o `Customer` convidado criado, a conversa e as 4
  mensagens de teste removidos do Mongo; `whatsappAiEnabled` voltou pra `false`.

## Result

**Fecha o Loop 11 inteiro** (11-A envio + criptografia → 11-B conversa+IA com memória real → 11-C
pedido real): um cliente pode mandar mensagem pro WhatsApp da loja, conversar com uma IA que
conhece o catálogo de verdade, montar um carrinho, e fechar um pedido real — tudo sem sair do
WhatsApp — e o lojista pode assumir a conversa a qualquer momento pra um número específico. Todo o
caminho de validação (estoque, preço, frete) é o MESMO usado pelo checkout do site, sem nenhuma
lógica de negócio duplicada.
