# Loop Influencer-A — Entidade `Influencer` + CRUD no admin

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop Influencer-A · **Depends on:** nenhum (isolado)
**Repos touched:** lmfit-api, lmfit-web

## Goal

Primeiro loop do plano "Programa de Influenciadores/Afiliados" (pedido do usuário: cupom próprio
por influenciador, atribuição de vendas nos relatórios). Este loop só cria a entidade — o vínculo
com `Promotion` é o Loop Influencer-B, o relatório é o Loop Influencer-C.

## Scope

**In:**
- `lmfit-api/src/influencers/` — módulo novo (schema/dto/service/controller), espelhando
  `suppliers/` sem a parte de import/export Excel.
- `Influencer`: `tenantId`, `name` (obrigatório), `instagramHandle?`, `email?`, `phone?`,
  `commissionRate?` (percentual, decisão confirmada com o usuário — dado real pra um futuro
  fechamento de repasse, sem cálculo automático ainda), `notes?`, `active` (default `true`).
- `InfluencersService.remove()` recusa excluir (`BadRequestException`) se existir alguma
  `Promotion` desse influenciador com `usedCount > 0` — decisão confirmada com o usuário, protege
  o histórico do relatório de vendas (Loop Influencer-C). Só `update({active:false})` continua
  disponível pra "desligar" um influenciador com histórico.
- `lmfit-web/src/app/(app)/influencers/page.tsx` — `ResourceList` direto (igual
  `suppliers/page.tsx`).
- Nav: entrada em `AppShell.tsx` (rota + tour).

**Out:** vínculo com `Promotion` (Loop Influencer-B), relatório de vendas (Loop Influencer-C),
portal/acesso próprio do influenciador (confirmado fora de escopo com o usuário — 100%
back-office).

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Comissão (%) | Incluída já nesta v1 (`commissionRate?: number`) | Confirmado com o usuário — dado real pronto pra um loop futuro de repasse, mesmo sem cálculo automático agora |
| Exclusão com histórico | Bloqueada (`usedCount > 0` em qualquer promoção do influenciador) | Confirmado com o usuário — protege a integridade do relatório; desativar continua disponível |
| Import/export Excel | Não replicado do template `Supplier` | Fora de escopo — `Supplier` tem essa peça extra, mas o pedido original não menciona import em massa de influenciadores |

## Tasks

- [x] `influencers/schemas/influencer.schema.ts` + DTOs.
- [x] `influencers.service.ts` (CRUD + guard de exclusão) + `influencers.controller.ts`
      (`@Roles('admin','staff')`) + `influencers.module.ts`, registrado em `app.module.ts`.
- [x] `app/(app)/influencers/page.tsx` + entrada em `AppShell.tsx` (nav + tour).
- [x] `influencers.service.spec.ts` (guard de exclusão coberto: recusa com venda, permite sem
      venda, id inválido não bate no banco, filtro escopado por tenant+influenciador).
- [x] `tsc --noEmit` limpo nos dois repos; suítes completas verdes (api 317/317, era 312; web
      496/496, sem regressão).
- [x] Verificação ao vivo: criar/listar/excluir um influenciador real via o admin.

## Follow-up record
### PLAN        — [x] 1 agente Explore (coupon/order/report system) · [x] 1 agente Plan · [x] 3 perguntas de design resolvidas com o usuário → Ready on 2026-08-05
### IMPLEMENT   — [x] tasks done · [x] tsc green → done on 2026-08-05
### TEST        — [x] +5 api (317/317, era 312), 0 web (sem UI de teste dedicada, página é `ResourceList` puro) → green on 2026-08-05
### VERIFY      — [x] ao vivo (criar/listar/excluir) → 2026-08-05
### DOCUMENT    — [x] spec · [x] ROADMAP changelog → merged on 2026-08-05

## Verification record

Verificado ao vivo contra o tenant `kivoni` real (instância temporária do `lmfit-api`, porta 4001
— reiniciada nesta sessão junto com o container Docker `kivoni-mongo`, que tinha parado).

- **Criar** ✅ — formulário do admin preenchido (nome "Ana Fit", Instagram "@anafit", comissão
  10%) → `POST /influencers` → `201 Created` → linha aparece na tabela.
- **Listar** ✅ — `GET /influencers?page=1&limit=50` retorna o registro criado com todos os campos.
- **Excluir sem histórico** ✅ — sem nenhuma promoção vinculada ainda (Loop B não implementado),
  exclusão normal funciona (`0 registro(s)` depois). O guard de `usedCount > 0` está implementado
  e coberto por teste unitário, mas só fica testável ao vivo de ponta a ponta depois do Loop B
  popular `Promotion.influencerId` — registrado aqui como esperado, não uma lacuna.
- Nav confirmada: link `/influencers` entre Promoções e Compras, ícone `Megaphone`.

## Result

Entidade `Influencer` existe, com CRUD completo no admin e a trava de exclusão já implementada
(ainda inerte até o Loop B, por design). Base pronta pro vínculo com `Promotion`.
