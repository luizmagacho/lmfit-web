# Loop 26 — Canário do caminho do dinheiro

**Status:** Draft
**Roadmap entry:** ROADMAP.md §2.1 Onda 0 · **Depends on:** —
**Repos touched:** lmfit-api

## Goal

Nenhuma venda é perdida em silêncio. Hoje o checkout público pode quebrar para **todo mundo** sem
que a suíte acuse nada e sem que a loja fique sabendo — foi exatamente o que aconteceu em 12/08/2026.
Ao fim deste loop existem três redes de segurança que não existiam: (1) um teste de integração que
percorre o caminho do dinheiro **contra Mongo de verdade e com dados no formato de produção**,
(2) um pedido sintético diário em produção que falha ruidosamente, e (3) um alerta quando o submit
público falha de verdade para um cliente real.

## Contexto — por que este loop existe

O bug de 12/08 (`orders.service.ts` `resolveLines`) rejeitava **toda venda de 1 peça no varejo**
com "Preço de atacado exige quantidade mínima de N", quebrando o checkout do catálogo inteiro.
Ele passou por **437 testes verdes**. Motivo:

```ts
// orders.service.spec.ts — o mock que existia
new Map([[variantId, { priceRetail: 50, priceWholesale: 35, minWholesaleQty: 12 }]])
```

Na base real, `getWholesalePricingBatch()` faz **fallback de `priceWholesale` para `priceRetail`**
quando o lojista nunca configurou preço de atacado — que é o caso da maioria das variantes. Ou seja,
a forma de dado testada (`priceWholesale < priceRetail`) quase não existe em produção, e a forma que
existe (`priceWholesale === priceRetail`) nunca foi exercitada. Um teste com mais mocks não pega
isso: só pega quem monta o dado como o banco monta.

**A lição que este loop institucionaliza:** o caminho do dinheiro precisa de pelo menos um teste
que **não mocke o pricing nem o banco**.

## Scope

**In:**
- Primeiro teste de integração do repo: `POST /public/order-drafts` → `PATCH` → `POST :token/submit`
  contra Mongo efêmero, sem mock de `ProductsService`/`OrdersService`.
- Matriz de formas de variante que existem de verdade em produção (tabela em Design notes).
- Cron de pedido sintético num tenant dedicado de canário, com alerta em falha.
- Observabilidade de falha real do submit público (Sentry + alerta de staff com dedup).

**Out (explicitamente):**
- E2E de navegador (Playwright/Cypress) — o VERIFY manual já cobre a camada de UI, e introduzir um
  runner de browser é um loop inteiro por si só.
- Dashboard/agregação histórica de falhas de checkout — só o alerta nesta v1.
- Canário para PDV (`syncBatch`), WhatsApp (11-C) e pagamento real (InfinitePay). Mesmo padrão, loops
  próprios; este cobre só o checkout público. **Carry-over registrado.**
- Cobrir os outros 4 caminhos que criam pedido (admin, PDV, WhatsApp, marketplace).

## Decisions

Marcadas com ⭐ a opção recomendada — **a resolver formalmente na REFINEMENT**, não antes.

| Decision | Opções | Nota |
|---|---|---|
| Onde roda o Mongo do teste | ⭐ `mongodb-memory-server` (devDep nova) · service container no GitHub Actions · docker-compose já existente | O deploy workflow já roda `npm test`; memory-server mantém o CI autocontido e não exige mexer no `deploy-droplet.yml`. Custo: +1 devDependency e ~5s de boot |
| Tenant do canário | ⭐ tenant dedicado (`canary`), produto/variante próprios · usar o tenant real | Tenant dedicado nunca contamina relatório, DRE ou estoque do LM FIT |
| Destino do pedido sintético | ⭐ mantém com `reference: 'CANARY'` e poda > 7 dias · apaga na hora | Apagar logo depois é mais código e mais risco; o tenant é isolado, então manter é inofensivo e ainda serve de histórico |
| Política de alerta do submit | ⭐ Sentry sempre + e-mail de staff com dedup de 1h por (tenant, motivo) · e-mail em toda falha · só Sentry | Sem dedup, uma quebra geral vira centenas de e-mails; só Sentry é fácil demais de ignorar |
| Falha "de negócio" vs. "de bug" | ⭐ alertar em **todas**, com o motivo no payload | O bug de 12/08 se **disfarçou** de rejeição de negócio legítima. Filtrar por tipo teria escondido exatamente ele |
| Dividir em 26-A/26-B | ⭐ manter um loop, tarefas ordenadas para o teste de integração cair primeiro | O teste sozinho já paga o loop; o cron depende de nada dele. Se a REFINEMENT achar que passou de M, aí sim divide |

## Acceptance criteria

- [ ] **AC1** — Dado uma variante **sem preço de atacado configurado** (`priceWholesale` ausente, portanto
  `=== priceRetail` pelo fallback) e `minWholesaleQty: 6`, quando o cliente submete 1 unidade, então o
  pedido é criado (201) com preço de varejo. *(verify: `it('AC1: variante sem atacado configurado vende 1 unidade no varejo')` em `test/checkout-money-path.e2e-spec.ts`)* — **esta é a regressão de 12/08**
- [ ] **AC2** — Dado uma variante com atacado real (`priceWholesale < priceRetail`, `minWholesaleQty: 6`),
  quando o cliente submete 1 unidade, então o submit é rejeitado com 400 e mensagem de quantidade mínima.
  *(verify: `it('AC2: atacado real ainda exige a quantidade mínima')`)*
- [ ] **AC3** — Mesma variante do AC2 com 6 unidades → 201, e as linhas do pedido saem com o **preço de
  atacado**, não o de varejo. *(verify: `it('AC3: atinge o mínimo e recebe preço de atacado')`)*
- [ ] **AC4** — Variante sem `acceptsBackorder` e com estoque 2, pedido de 5 → 400 de estoque insuficiente,
  e **nenhum** pedido é criado no banco. *(verify: `it('AC4: estoque insuficiente não cria pedido órfão')`)*
- [ ] **AC5** — Variante com `acceptsBackorder: true` e `backorderMinQty` atendido, pedido acima do estoque
  → 201 com a linha marcada `isOrder: true`. *(verify: `it('AC5: backorder permitido vira linha de encomenda')`)*
- [ ] **AC6** — O teste de integração usa os models Mongoose reais (sem `jest.mock` de `ProductsService`,
  `OrdersService` ou dos models) e passa em `npm run test:e2e`. *(verify: `npm run test:e2e` verde + `grep -c "jest.mock" test/checkout-money-path.e2e-spec.ts` = 0)*
- [ ] **AC7** — Com `CANARY_TENANT_SLUG` configurado, o cron executa o fluxo completo e, em sucesso, registra
  um `logStaffAlert('canary_ok', …)`; o pedido criado carrega `reference: 'CANARY'`.
  *(verify: `it('AC7: canário cria pedido real e registra sucesso')` + curl no tenant de canário em prod)*
- [ ] **AC8** — Quando qualquer etapa do canário falha, sai **um** e-mail de staff com o motivo e a etapa,
  e o erro vai para o Sentry. *(verify: `it('AC8: falha do canário alerta com a etapa e o motivo')`)*
- [ ] **AC9** — Sem `CANARY_TENANT_SLUG`, o cron não faz nada (nenhuma query, nenhum alerta) — instalação
  nova nunca cria pedido sozinha. *(verify: `it('AC9: canário desligado por padrão')`)*
- [ ] **AC10** — Quando `POST /public/order-drafts/:token/submit` falha para um cliente real, o erro vai
  ao Sentry com `tenantId` + motivo, e um e-mail de staff sai no máximo **1× por hora por (tenant, motivo)**.
  *(verify: `it('AC10: falha de submit alerta e faz dedup por hora')` + provocar um 400 real em dev e ver o alerta)*
- [ ] **AC11** — Nenhum dado de canário aparece em relatório do tenant real. *(verify: rodar o canário em
  dev e conferir `/reports` e o dashboard do tenant `lmfit` inalterados)*

## Design notes

### Superfície exercitada (arquivos reais, verificados em 13/08)

| Camada | Arquivo | Papel |
|---|---|---|
| Rota pública | `src/order-drafts/public-order-drafts.controller.ts` (`@Controller('public/order-drafts')`, `@Post(':token/submit')` linha 41) | Entrada; resolve tenant por header |
| Orquestração | `src/order-drafts/order-drafts.service.ts` → `submitByToken()` (linha ~337) | Resolve cliente, aplica Pix/cupom/crédito, chama `orders.create()` |
| Regra que quebrou | `src/orders/orders.service.ts` → `resolveLines()` (linha ~100) | Valida atacado e monta as linhas |
| Fonte de preço | `src/products/products.service.ts` → `getWholesalePricingBatch()` (linha 210) | **O fallback `priceWholesale ?? priceRetail` que causou o bug** |

### Matriz de formas de variante (o ativo durável deste loop)

Derivada da base real, não inventada. Cada linha vira um caso do teste de integração:

| # | `priceWholesale` | `minWholesaleQty` | estoque | `acceptsBackorder` | qtd pedida | esperado |
|---|---|---|---|---|---|---|
| A | *não configurado* (→ `= priceRetail`) | 6 | 10 | false | 1 | ✅ 201, preço varejo — **regressão de 12/08** |
| B | 35 (retail 50) | 6 | 10 | false | 1 | ❌ 400 quantidade mínima |
| C | 35 (retail 50) | 6 | 10 | false | 6 | ✅ 201, unitPrice = 35 |
| D | *não configurado* | 6 | 2 | false | 5 | ❌ 400 estoque, **sem pedido criado** |
| E | *não configurado* | 6 | 2 | true (`backorderMinQty: 1`) | 5 | ✅ 201, linha `isOrder: true` |

> A forma **A** é a maioria do catálogo real e era justamente a que nenhum teste cobria.

### Harness de integração

`test/jest-e2e.json` e o script `test:e2e` **já existem** e `supertest ^7.2.2` já está instalado —
mas não há nenhum arquivo `.e2e-spec.ts` no repo. Este loop escreve o primeiro; tratar o harness como
território novo (risco registrado abaixo).

Esqueleto pretendido:

```ts
// test/checkout-money-path.e2e-spec.ts
// Sobe o AppModule real apontando pro Mongo efêmero, semeia tenant+produto+variantes
// nas formas A–E, e dirige as 3 chamadas HTTP públicas via supertest.
// Nada de jest.mock: o ponto é exercitar getWholesalePricingBatch() de verdade.
```

Seed helper próprio (`test/helpers/seed-tenant.ts`), **não** reaproveitar `src/seed/` — o seed de
desenvolvimento tem dados de demonstração que mudam por outros motivos; o teste precisa de dados
que só ele controla.

### Cron do canário

Molde: `src/order-drafts/abandoned-cart.cron.ts` — `@Cron(CronExpression…)`, `Logger` próprio,
try/catch isolado por etapa (uma falha nunca derruba o resto), e a mesma disciplina de "contar e logar
o caso degenerado em vez de silenciá-lo". Novo arquivo `src/order-drafts/checkout-canary.cron.ts`.

Alertas via `NotificationsService`, que já expõe exatamente o que precisamos:
`sendStaffEmail(subject, text)` e `logStaffAlert(message, meta?)`.

### Observabilidade do submit real

Sentry já está inicializado em `src/instrument.ts` (`@sentry/nestjs`). O hook de falha entra no
`public-order-drafts.controller.ts` (ou num interceptor dedicado à rota) capturando
`tenantId` + `token` + motivo. Dedup em memória por processo é suficiente na v1 — se a API escalar
horizontalmente vira alerta duplicado por réplica, aceitável e registrado.

## Config

| Var | Default | Papel |
|---|---|---|
| `CANARY_TENANT_SLUG` | *(vazio — canário desligado)* | Slug do tenant dedicado; sem isso o cron é no-op (AC9) |
| `CANARY_VARIANT_SKU` | *(vazio)* | SKU usado no pedido sintético |
| `CANARY_RETENTION_DAYS` | `7` | Poda dos pedidos de canário antigos |
| `CHECKOUT_ALERT_DEDUP_MINUTES` | `60` | Janela de dedup do alerta de submit (AC10) |

→ `.env.example` no mesmo commit (regra da fase IMPLEMENT).

## Tasks

Ordenadas por dependência; as tarefas 1–5 já entregam valor sozinhas e podem ir para produção antes das 6+.

- [ ] 1. Decidir e instalar o runner de Mongo do teste (`mongodb-memory-server` se confirmado na REFINEMENT)
- [ ] 2. `test/helpers/seed-tenant.ts` — semeia tenant, produto e as variantes A–E
- [ ] 3. `test/checkout-money-path.e2e-spec.ts` — bootstrap do AppModule + supertest das 3 chamadas
- [ ] 4. Casos A–E da matriz (AC1–AC5), cada um nomeando seu AC
- [ ] 5. `npm run test:e2e` no CI (`deploy-droplet.yml` hoje roda só `npm test`)
- [ ] 6. `checkout-canary.cron.ts` + no-op sem env (AC7, AC9)
- [ ] 7. Alerta de falha do canário com etapa + motivo (AC8)
- [ ] 8. Poda de pedidos de canário por `CANARY_RETENTION_DAYS`
- [ ] 9. Captura + alerta com dedup na falha real do submit público (AC10)
- [ ] 10. `.env.example` + seção Config; provisionar o tenant de canário em prod
- [ ] 11. Testes unitários do cron e do dedup (AC7–AC10)

## Risks & unknowns (atacar na REFINEMENT)

1. **Primeiro `.e2e-spec.ts` do repo.** Subir o `AppModule` inteiro pode arrastar cron, Sentry e
   conexões externas para dentro do teste. Mitigação a validar: `TestingModule` com `overrideProvider`
   nos módulos de efeito colateral, ou um `AppModule` de teste enxuto.
2. **`@nestjs/schedule` no ambiente de teste** — crons podem disparar durante o e2e. Verificar se
   `ScheduleModule` precisa ser desabilitado explicitamente.
3. **Tempo de CI.** O deploy hoje é ~2min; se o e2e passar disso, avaliar rodar só no push pra `main`.
4. **Isolamento do canário.** Confirmar que um tenant novo não aparece em nenhum relatório
   cross-tenant antes de ligar em produção (AC11 existe por causa deste risco).
5. **Sizing.** A ROADMAP registra **S**; a exploração sugere **M**. Confirmar na REFINEMENT e corrigir
   a linha da ROADMAP (o processo manda ajustar o roadmap, não espremer o loop).

## Follow-up record

### PLAN        — [x] explored code · [x] draft spec · [x] decisions listed          → Draft on 2026-08-13
### REFINEMENT  — [ ] decisions resolved · [ ] assumptions checked · [ ] ACs testable · [ ] DoR review → Ready on ___
### IMPLEMENT   — [ ] tasks done · [ ] tsc green per task · [ ] env documented       → done on ___
### TEST        — [ ] AC-named tests · [ ] negative paths · suites: api _/_ · web _/_ → green on ___
### VERIFY      — [ ] browser walk + screenshots · [ ] AC checklist · [ ] cross-tenant probe · [ ] regression sweep → all ✅ on ___
### DOCUMENT    — [ ] spec Result · [ ] ROADMAP changelog · [ ] living docs           → merged on ___
### PLAN AGAIN  — [ ] retro · [ ] carry-overs filed · [ ] roadmap re-prioritized · [ ] memory updated → next loop started on ___

## Verification record

*Preenchido durante a VERIFY: AC → evidência (nome do teste, screenshot, saída de curl).*

## Result

*Preenchido durante o DOCUMENT: o que subiu, desvios, retro, carry-overs.*
