# Loop 11-B — Conversa persistente por número + IA respondendo com contexto real

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 11 — WhatsApp Business AI · **Depends on:** Loop 11-A (envio de mensagem)
**Repos touched:** lmfit-api

## Goal

Núcleo do pedido original do usuário ("responder clientes" no WhatsApp com uma LLM gratuita). Até
aqui o `InboundMessageProcessor` só sabia fazer duas coisas com uma mensagem: rodar a automação de
ERP pra staff allowlisted, ou mandar um e-mail interno pro lojista quando o remetente não era
staff — **um cliente de verdade nunca recebia resposta nenhuma**. Este loop fecha esse buraco
reaproveitando o assistente de compras por IA que já funciona no site (`ChatService`), com o
histórico/carrinho persistidos por número de WhatsApp em vez de vividos no `useState` do navegador.

## Scope

**In:**
- `WhatsappConversation` (schema novo) — uma linha por `{tenantId, waId}`, guarda `history`
  (capado nas últimas 20 mensagens, mesmo limite do `ChatWidget.tsx`), `cartLines` (forma rica,
  igual `ChatCartAction`, não só `ChatCartLineDto` — o Loop 11-C usa direto pra criar o pedido),
  `aiEnabled` (default `true`, trava de "humano assume a conversa" que o Loop 11-C liga a um
  endpoint de verdade).
- `WhatsappConversationsService` — `findOrCreate` (upsert atômico) + `appendTurnAndSave` (aplica o
  turno pergunta+resposta, capa em 20, salva).
- `WhatsappChatService.handleCustomerMessage(tenant, waId, text)` — chama `ChatService.reply()`
  (o MESMO motor do site, catálogo real, validação de estoque/preço real) com o histórico/carrinho
  persistidos, aplica as ações resolvidas (`add_to_cart`/`remove_from_cart`) ao carrinho
  persistido, salva o turno, manda a resposta via `WhatsappSenderService` (Loop 11-A).
- `ChatModule` passa a exportar `ChatService` (só isso — nenhuma lógica interna mudou).
- `inbound-message.processor.ts`: quando o remetente NÃO está na allowlist de staff, em vez de só
  escalar por e-mail, checa `tenant.whatsappAiEnabled` — se ligado, chama
  `WhatsappChatService.handleCustomerMessage` em vez de escalar. **O pipeline de staff
  (allowlisted, ERP via `LlmService.parseIntent`) não muda uma linha.**
- Novo status `ai_replied` em `WhatsAppMessage.processingStatus` (nenhum dos 5 valores existentes
  descrevia honestamente "a IA respondeu o cliente").

**Out:** criar pedido de verdade a partir do carrinho (`confirm_order`) e o endpoint de
pausar/retomar a IA por conversa — isso é Loop 11-C. O campo `aiEnabled` já existe no schema desde
já (default `true`) só pra não precisar de outra migração depois.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Reaproveitar `ChatService` ou construir um motor novo pro WhatsApp | Reaproveitar — `WhatsappChatService` só chama `chat.reply(tenantId, dto, features)` com histórico/carrinho persistidos | `ChatService` já faz TUDO que precisava (prompt com catálogo real, validação de ação contra estoque/preço real, captura de lead) — reconstruir seria duplicar, não simplificar |
| Forma do `cartLines` persistido | Rica (`ChatCartAction` — preço/sku/imagem/etc.), não só `ChatCartLineDto` | Loop 11-C usa isso direto pra criar o pedido sem re-buscar o produto |
| Onde checar `aiEnabled` da conversa | Dentro de `WhatsappChatService.handleCustomerMessage`, não no processor | Fica colado no dado que ele mesmo carrega — evita um segundo lookup separado no processor |
| Pipeline de staff (allowlist) | Zero mudança — só o branch `else` (não-allowlisted) ganhou o novo caminho | Automação de ERP (staff loga venda por texto) é um recurso diferente, não deve competir/colidir com respostas de IA pra cliente |
| `ChatService.reply()` lançando erro (ex.: Groq fora do ar) | `WhatsappChatService` captura, loga, retorna sem mandar mensagem nem salvar turno | Falha da IA não deve corromper o histórico persistido nem travar o processamento do webhook |

## Tasks

- [x] `schemas/whatsapp-conversation.schema.ts` (novo) — `WhatsappConversation` +
      `WhatsappConversationMessage`/`WhatsappConversationCartLine` embutidos, índice único
      `{tenantId, waId}`.
- [x] `whatsapp-conversations.service.ts` (novo) — `findOrCreate`, `appendTurnAndSave`.
- [x] `chat.module.ts`: `exports: [ChatService]`.
- [x] `whatsapp-chat.service.ts` (novo) — `handleCustomerMessage`, merge/decremento de carrinho.
- [x] `inbound-message.processor.ts`: branch novo pra remetente fora da allowlist + `tenant.whatsappAiEnabled`; injeta `TenantsService`/`WhatsappChatService`.
- [x] `whatsapp-message.schema.ts`: novo status `ai_replied`.
- [x] `whatsapp.module.ts`: registra `WhatsappConversation` no `MongooseModule.forFeature`, importa `ChatModule`, registra `WhatsappConversationsService`/`WhatsappChatService`.
- [x] Testes novos: `whatsapp-conversations.service.spec.ts` (+3), `whatsapp-chat.service.spec.ts`
      (+9 — merge de carrinho, remoção total/parcial, `aiEnabled:false` é no-op, erro do
      `ChatService` não quebra nem manda mensagem, `lead_request` não mexe no carrinho),
      `inbound-message.processor.spec.ts` (novo arquivo — não existia teste pra este processor
      antes; +4 cobrindo os 2 branches novos + confirmando que o pipeline de staff continua
      intocado).
- [x] `tsc --noEmit` limpo; suíte api 355/355 (era 339, +16).
- [x] Verificação ao vivo completa (ver abaixo).

## Follow-up record
### PLAN        — [x] herdado do plano 11-A/B/C (mesma sessão) → Ready on 2026-08-06
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-06
### TEST        — [x] +16 api (355/355, era 339) → green on 2026-08-06
### VERIFY      — [x] ao vivo (2 mensagens reais via webhook, Groq real, catálogo real) → 2026-08-06
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-06

## Verification record

Verificado ao vivo contra o tenant `kivoni` real (`lmfit-api` porta 4001, `nest start --watch`).

- Ligado `whatsappAiEnabled: true` no tenant direto no Mongo (a UI de Settings pra isso já foi
  verificada no Loop 11-A) e confirmado que o número de teste (`5511988887777`) não estava na
  allowlist de staff.
- **Mensagem 1** — `curl` simulando um payload real da Meta (`object: whatsapp_business_account`,
  `entry[].changes[].value.messages[]`, mesma forma que `meta-webhook.parser.ts` exige) com "Oi!
  Vocês têm camisa do Flamengo?" → `processingStatus` ficou `ai_replied`; `WhatsappConversation`
  criada com uma resposta REAL gerada pela Groq citando o produto real do catálogo ("Camisa
  Flamengo I 2024... Temos P, M, G e GG em estoque") — prova que `ChatService.reply()` rodou de
  verdade contra o catálogo e a LLM real, não um stub.
- **Mensagem 2 — prova de continuidade** — "Quero tamanho M, coloca no carrinho" (sem repetir
  "Flamengo") → a IA lembrou o produto da mensagem 1 e resolveu "M" pra variante REAL do catálogo:
  `cartLines` persistido ficou com `variantId`/`sku: FUT-CFI2556-M`/`priceRetail: 299.9` corretos,
  vindos da validação real de `ChatService.validateCartAction` (nunca inventados pela LLM). O
  histórico da conversa mostrou as 4 mensagens em ordem, provando a memória real entre requisições
  HTTP separadas — o widget do site nunca pôde provar isso sozinho, já que ali a continuidade
  sempre vem do próprio navegador que faz as duas chamadas.
- `WhatsappSenderService.sendText` logou o warning esperado de credenciais Meta ausentes (não há
  token real de WhatsApp Business configurado neste tenant de dev) — comportamento correto,
  documentado desde o Loop 11-A (`sendText` retorna `false` sem lançar).
- Limpeza: as 2 mensagens e a conversa de teste removidas do Mongo; `whatsappAiEnabled` voltou pra
  `false` (estado limpo pro próximo loop / pra não surpreender ninguém navegando o painel depois).

## Result

Um cliente que manda mensagem pro WhatsApp de uma loja com a IA ligada agora recebe uma resposta
de verdade, com contexto real do catálogo e memória real entre mensagens — fecha o pedido original
do usuário ("responder clientes"). O carrinho persistido já está pronto pro Loop 11-C criar um
pedido de verdade a partir dele.
