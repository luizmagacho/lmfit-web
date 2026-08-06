# Loop Influencer-B — Vínculo `Promotion` ↔ `Influencer` + UI de atribuição no cupom

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop Influencer-B · **Depends on:** Loop Influencer-A (entidade `Influencer`)
**Repos touched:** lmfit-api, lmfit-web

## Goal

Segundo loop do Programa de Influenciadores — dá a um cupom (`Promotion`) um dono opcional
(`influencerId`), e ao admin uma forma de atribuir isso na tela de Cupons. O relatório de vendas
(Loop Influencer-C) depende deste campo estar populado pra funcionar.

## Scope

**In:**
- `Promotion.influencerId?: ObjectId` (ref `Influencer`) — opcional, muitos-pra-um.
- `PromotionsService.remove()` ganha a mesma trava do Loop A: recusa excluir cupom com
  `usedCount > 0`.
- `PromotionsClient.tsx` ganha uma coluna `influencerId` (select) com opções carregadas de
  `GET /influencers` — padrão idêntico ao já usado em `InvoicesClient.tsx`.

**Out:** relatório de vendas por influenciador (Loop Influencer-C).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Cardinalidade | Muitos-pra-um (sem unicidade em `influencerId`) | Um influenciador pode ter vários cupons ao longo do tempo (campanhas, reemissão) |
| Campo vazio no update | `$unset` explícito, não `$set: undefined` | MongoDB não remove o campo com `$set: undefined` — precisava de tratamento dedicado |
| Trava de exclusão do cupom | Espelha a do Loop A (`usedCount > 0`) | Mesma proteção de histórico, agora no lado do cupom também |

## Tasks

- [x] `promotion.schema.ts`: novo `influencerId?`.
- [x] `create-promotion.dto.ts`: novo `influencerId?: string`.
- [x] `promotions.service.ts`: `create()`/`update()` tratam string vazia → `undefined`/`$unset`
      (evita `CastError` do Mongoose); `remove()` ganha o guard de `usedCount > 0`.
- [x] `PromotionsClient.tsx`: `useState`+`useEffect` busca influenciadores uma vez; `columns` via
      `useMemo`; nova coluna `influencerId` com `defaultValue: ""` explícito (gotcha do
      `ResourceList` documentado no plano); `formatInfluencerCell()` pura pro cell render.
- [x] `promotions.service.spec.ts`: +6 testes (guard de exclusão, cast de `influencerId` real,
      string vazia não quebra o cast, `$unset` vs `$set` no update).
- [x] `PromotionsClient.test.ts`: +3 testes de `formatInfluencerCell`.
- [x] `tsc --noEmit` limpo nos dois repos; suítes completas verdes (api 323/323, era 317; web
      499/499, era 496).
- [x] Verificação ao vivo: atribuir influenciador a um cupom real já usado, confirmar persistência
      + guard de exclusão bloqueando + criar cupom sem influenciador confirmando que não pega o
      primeiro da lista por engano.

## Follow-up record
### PLAN        — [x] herdado do plano do Loop Influencer-A (mesma sessão) → Ready on 2026-08-05
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-05
### TEST        — [x] +6 api (323/323, era 317), +3 web (499/499, era 496) → green on 2026-08-05
### VERIFY      — [x] ao vivo (atribuir/persistir/guard/gotcha) → 2026-08-05
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-05

## Verification record

Verificado ao vivo contra o tenant `kivoni` real (instância temporária do `lmfit-api`, porta
4001), usando o cupom real `BEMVINDO10` (`usedCount: 1`, já com histórico de venda de verdade).

- **Atribuição** ✅ — editado via o formulário real do admin, selecionado "Ana Fit" no combobox
  novo; `PATCH /promotions/:id` persistiu `influencerId` como `ObjectId` real (confirmado direto
  no Mongo via `docker exec kivoni-mongo mongosh`); tabela do admin passou a mostrar "Ana Fit" na
  coluna Influenciador em vez de "—".
- **Guard de exclusão** ✅ — tentativa de excluir `BEMVINDO10` (que tem `usedCount: 1`) foi
  recusada com a mensagem amigável exata renderizada na tela: "Este cupom já foi usado em
  vendas — desative em vez de excluir, pra não perder o histórico do relatório." Registro
  permaneceu na lista (`1 registro(s)`), não excluído.
- **Gotcha do select vazio** ✅ — criado um cupom novo ("PLAINCOUPON") deixando o campo
  Influenciador no valor padrão ("— Nenhum —"), sem tocar o select; confirmado direto no Mongo que
  o documento salvo **não tem o campo `influencerId` nenhum** — não pegou "Ana Fit" (o único
  influenciador cadastrado, que seria o primeiro item real da lista) por engano. Este era
  exatamente o risco documentado no plano (`ResourceList.tsx:232-240`), testado de propósito.
- Limpeza: `PLAINCOUPON` excluído, `BEMVINDO10.influencerId` desvinculado (`$unset` confirmado
  funcionando via a mesma tela), influenciador de teste excluído com sucesso depois de
  desvinculado (confirma o caminho "sem uso" do guard do Loop A também).

## Result

Cupons agora podem ser atribuídos a um influenciador via a tela de Promoções existente, sem UI
nova — só uma coluna a mais reaproveitando o componente genérico `ResourceList`. Base pronta pro
relatório de vendas (Loop Influencer-C) ter o que agregar.
