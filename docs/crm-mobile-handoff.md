# Handoff: CRM no lmfit-mobile (Expo)

Paridade com [docs/ui-contract.md](ui-contract.md): **mesmo `NEXT_PUBLIC_API_URL` / JWT** que o painel web.

## Telas sugeridas (read-first)

| Tela | Rota API | Notas |
|------|-----------|--------|
| Lista clientes | `GET /customers?page=&limit=` | Mesmo envelope `items`/`total` ou array (ver `normalizeApiList` no web). |
| Ficha cliente | `GET /customers/:id` ou composição igual ao web | Timeline: pedidos `GET /orders?customerId=`, NF se `customerId` existir, escalações por `fromWaId`. |
| Funil | `GET /crm/opportunities` | Quando 404, app pode exibir vazio + “use web para modo local” ou replicar armazenamento nativo (AsyncStorage) se produto exigir offline. |
| Tarefas | `GET /crm/tasks` | Lista “minhas” filtrando `assigneeUserId === me.id` após `GET /auth/me`. |
| Segmentos | `GET /crm/segments` + export | Download via URL assinada ou blob; respeitar LGPD. |

## Autenticação

- Reutilizar fluxo de login existente no app (access + refresh), headers `Authorization: Bearer`.
- Deep links: `wa.me/{digits}` a partir de `whatsappWaId` do cliente.

## QA de paridade

Conferir após cada release de API: produtos, relatórios, rascunhos, escalações (já citados no contrato UI) + **novas rotas CRM** acima.

## Referência OpenAPI

Arquivo servido pelo web em produção/build: `/crm-api-openapi.yaml` (pasta `public/` do lmfit-web) ou copiar para o repositório da API como fonte da verdade.
