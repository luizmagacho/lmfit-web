# Loop 11-A — Envio de mensagem WhatsApp (Graph API) + endurecer credenciais Meta

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 11 — WhatsApp Business AI · **Depends on:** nada (primeiro loop)
**Repos touched:** lmfit-api, lmfit-web

## Goal

Primeiro passo do plano de "IA (LLM gratuita) respondendo clientes e montando pedidos reais no
WhatsApp" (pedido do usuário: "conectar uma LLM gratuita no WhatsApp pra responder clientes",
escopo ampliado após pergunta de PLAN pra incluir criação de pedido real — ver plano completo).
`src/whatsapp/` até aqui só recebia mensagens (webhook inbound); este loop dá o primeiro passo pra
poder responder de volta, e corrige um gap de segurança real encontrado no caminho.

## Scope

**In:**
- `WhatsappSenderService.sendText(tenant, to, body)` — primeira capacidade de ENVIO de mensagem do
  projeto, via Meta Graph API (`POST /{version}/{phoneNumberId}/messages`).
- Criptografia em repouso pros 3 campos secretos Meta (`metaAppSecret`, `metaWhatsappVerifyToken`,
  `metaWhatsappAccessToken`) — hoje eram salvos em texto plano, diferente dos tokens de analytics
  (Loop 18) que já usavam `EncryptionService`. `metaWhatsappPhoneNumberId` fica em texto plano de
  propósito (é um ID, não um segredo).
- `whatsappAiEnabled: boolean` (default `false`) no `Tenant` — liga/desliga a IA respondendo
  clientes (usado pelos próximos loops; nesta v1 só existe o campo + UI, nada ainda o lê pra agir).
- UI em Settings pra tudo isso — **achado real**: os 4 campos Meta WhatsApp já tinham `useState`
  carregando/salvando havia sessões, mas **nenhum `<input>` os renderizava** — o lojista não tinha
  como preencher esses campos de jeito nenhum. Corrigido junto (não é escopo novo, é destravar
  algo que já deveria funcionar).

**Out:** qualquer coisa que efetivamente RESPONDA um cliente (isso é Loop 11-B) — este loop só
constrói a capacidade de enviar, não a usa em lugar nenhum ainda.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Onde salvar `whatsappAiEnabled` | Campo flat no `Tenant` (`updateBranding`/`handleSaveBranding`), não aninhado em `storefront.*` | Fica na mesma seção/form dos outros campos Meta na UI — plano original sugeria `storefront.*`, mudei ao ver que os campos Meta já vivem em `updateBranding`, não em `updateStorefrontConfig` |
| Padrão de criptografia | Reaproveita `EncryptionService` do Loop 18 (`enc:v1:` prefix, AES-256-GCM), extraído `encryptOrClear` como método privado de `TenantsService` (antes só inline em `updateAnalyticsConfig`) | Mesmo mecanismo, não reinventar; extração elimina duplicação já que agora tem 2 chamadores |
| Descriptografar onde | No ponto de uso (`whatsapp-webhook.controller.ts`, `WhatsappSenderService`), nunca central em `TenantsService.findBySlug`/`findById` | Mesmo padrão do Loop 18 (`AnalyticsService.trackPurchase` decripta na leitura) |
| Valores legados em texto plano | `decrypt()` é no-op seguro pra quem ainda não regravou o campo | Mesmo contrato do Loop 18 — sem migração coordenada obrigatória |
| `sendText` sem credenciais configuradas | Retorna `false`, loga warning, não lança erro | Loop 11-B vai chamar isso em todo webhook de cliente não-staff; tenant sem WhatsApp conectado ainda não devia derrubar o processamento |

## Tasks

- [x] `Tenant.whatsappAiEnabled` (schema + DTO + `updateBranding`).
- [x] `TenantsService.encryptOrClear` extraído como método privado, reusado em `updateBranding` e
      `updateAnalyticsConfig`.
- [x] `whatsapp-webhook.controller.ts`: decripta `metaWhatsappVerifyToken`/`metaAppSecret` antes de
      usar (handshake `GET` e verificação de assinatura `POST`).
- [x] `WhatsappSenderService` novo (`src/whatsapp/whatsapp-sender.service.ts`), registrado em
      `WhatsappModule` (`providers` + `exports`, pro Loop 11-B injetar).
- [x] Frontend: `TenantInfo.whatsappAiEnabled`; nova seção "WhatsApp Business API" em
      `SettingsClient.tsx` com os 4 campos Meta (finalmente com `<input>` de verdade) + checkbox.
- [x] `tenants.service.spec.ts`: +3 testes (criptografia dos 3 campos secretos, phoneNumberId fica
      plaintext, `whatsappAiEnabled` salvo flat).
- [x] `whatsapp-sender.service.spec.ts` (novo arquivo): +6 testes (payload/URL/headers corretos,
      decrypt de token legado em texto plano, fallback de versão da API, retorna `false` sem
      phoneNumberId/accessToken).
- [x] `tsc --noEmit` limpo nos dois repos; suítes completas verdes (api 339/339, era 330; web
      499/499, sem novo teste de frontend — este é um form de configuração, mesmo padrão de não
      ter teste de render pra `SettingsClient.tsx` já usado pelo resto do arquivo).
- [x] Verificação ao vivo completa (ver abaixo).

## Follow-up record
### PLAN        — [x] plano completo (11-A/B/C) com pergunta de escopo respondida pelo usuário → Ready on 2026-08-06
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-06
### TEST        — [x] +9 api (339/339, era 330), 0 web novos (499/499, sem regressão) → green on 2026-08-06
### VERIFY      — [x] ao vivo (Settings UI + Mongo + curl assinado) → 2026-08-06
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-06

## Verification record

Verificado ao vivo contra o tenant `kivoni` real (instância `lmfit-api` porta 4001, `nest start
--watch` — recompilou sozinho a cada edição; Mongo via `kivoni-mongo`).

- **Settings UI** ✅ — nova seção "WhatsApp Business API" renderiza os 4 campos + checkbox
  (confirmado via `get_page_text`, já que scroll/screenshot da pane de preview ficou instável
  nesta sessão — resize da viewport pra 1280×2600 contornou, sem tocar em código).
- **Save → Mongo** ✅ — salvos valores de teste; `metaAppSecret`/`metaWhatsappVerifyToken`/
  `metaWhatsappAccessToken` gravados como `enc:v1:...` (confirmado via `mongosh`, não como texto
  plano); `metaWhatsappPhoneNumberId` continua plaintext (correto, não é segredo).
- **Achado da ferramenta de teste (não é bug do código)**: `form_input` no checkbox
  `whatsappAiEnabled` não disparava o `onChange` do React (setava `.checked` sem evento real) — o
  valor salvo ficava `false` mesmo "marcando" via `form_input`. Um clique real (`computer
  left_click`) resolveu — confirmado lendo `input.checked` via JS antes do submit e conferindo o
  valor persistido no Mongo depois. Registrado aqui porque não é óbvio e pode confundir uma
  verificação futura desta mesma tela.
- **Webhook `GET` (handshake) ✅** — `curl` com o `hub.verify_token` real (`test-verify-token-e2e`)
  contra o valor criptografado real do Mongo retornou o challenge corretamente; token errado → 403.
  Prova o `decrypt()` funcionando ponta a ponta contra dado real, não só a instância isolada do
  teste unitário.
- **Webhook `POST` (assinatura) ✅** — HMAC-SHA256 computado com o `metaAppSecret` real (plaintext
  usado só pra calcular a assinatura, igual a Meta faria) contra o corpo da requisição → 200;
  assinatura inválida → 403. Mesma prova ponta a ponta pro segundo campo criptografado.
- Limpeza: credenciais de teste removidas do tenant (`$unset` + `whatsappAiEnabled: false`) e a
  única mensagem que teria sido criada pelos testes de webhook não existia (o payload sintético do
  `curl` não batia 100% com o schema real da Meta — o `POST` só precisava passar a verificação de
  assinatura pra provar o `decrypt()`, não criar uma mensagem de verdade).

## Result

`src/whatsapp/` ganhou sua primeira capacidade de envio (`WhatsappSenderService`), os 3 segredos
Meta passam a ser criptografados em repouso (fechando o mesmo gap que o Loop 18 já tinha fechado
pros tokens de analytics), e o lojista finalmente consegue preencher os campos de conexão do
WhatsApp Business que já existiam no banco mas nunca tiveram `<input>` na tela. Base pronta pro
Loop 11-B (conversa persistente + IA respondendo com contexto real).
