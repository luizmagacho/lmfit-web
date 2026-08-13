# Análise de mercado + próximos passos — 2026

> Pesquisa de agosto/2026 sobre as plataformas que competem com a Kivoni, cruzada com uma
> auditoria do que **de fato existe no código hoje** (não no roadmap, no código).
> Objetivo: decidir onde investir os próximos loops.

Última atualização: 2026-08-13

---

## 1. Quem compete com a gente

A Kivoni não tem um concorrente único — ela cruza **quatro** mercados que hoje são atendidos
por empresas diferentes. Isso é ao mesmo tempo a nossa vantagem (ninguém cobre tudo) e o
nosso risco (somos comparados de 4 ângulos diferentes, e em cada um há um especialista).

### a) Plataformas de loja online

| Player | Posição | O que entregou em 2026 |
|---|---|---|
| **Nuvemshop** | Líder LatAm — 180k+ marcas, R$ 6,5 bi movimentados no Brasil em 2025 | **Nuvem Chat** (IA no WhatsApp + loja; se posiciona como "primeira plataforma do mundo onde o cliente paga sem sair do WhatsApp"), editor com IA, assinaturas, TikTok Shop, **Smart Shipping** (regras avançadas de frete). Diz que 72% dos lojistas da base já usam IA para descrição, imagem e atendimento |
| **Tray** | Foco em marketplaces + marketing | 5 planos, R$ 19 a R$ 449/mês |
| **Bagy** | Nasceu vendendo por Instagram | Produtos e visitas ilimitados |
| **Loja Integrada / Shopify / VTEX** | Entrada / global / enterprise | — |

**O que eles não fazem:** ERP de verdade. Não têm produção/confecção, ficha técnica, materiais,
fornecedores, DRE, nem PDV de loja física decente.

### b) ERPs de gestão

| Player | Preço de entrada | Nota |
|---|---|---|
| **Bling** | ~R$ 55/mês (Cobalto, com PDV + financeiro); Titânio R$ 120; Diamante R$ 650 | 250+ canais de venda; PDV **online** |
| **Olist Tiny** | ~R$ 49/mês (anual) | Hub de integrações, foco maior em e-commerce |

**O que eles não fazem:** loja de moda com identidade visual própria, e IA de vendas que
fecha pedido.

### c) ERPs de confecção/moda

**Sisplan/Apexcon** (3 mil+ empresas de confecção e têxtil), **TAS**, **Audaces** (ficha técnica /
PLM). Fortes em PCP, MRP, ficha técnica, custeio, produção em terceiros.

**O que eles não fazem:** D2C moderno, IA, WhatsApp. São sistemas de indústria, não de marca.

### d) IA conversacional / WhatsApp commerce

| Player | Nota |
|---|---|
| **Suri Shop** (ecossistema TOTVS) | 3.500+ empresas ativas |
| **OmniChat** | "Whizz Agent" — agentes por etapa da jornada (pré-venda, venda, pós-venda) |
| **BotConversa, Lumo, Blip, Zenvia** | Automação + IA generativa sobre a API oficial |
| **A própria Meta** | Anunciou em **3/jun/2026** um agente de IA nativo dentro do WhatsApp Business que responde dúvida, recomenda produto, qualifica lead e conclui venda |

> ⚠️ **Leitura estratégica:** o "bot que responde dúvida" está virando commodity — e a Meta está
> entregando de graça dentro do próprio WhatsApp. O que **não** vira commodity é o agente com
> acesso a **estoque real, preço real e criação de pedido com baixa de estoque** — que é
> exatamente o que o Loop 11-C entregou. Nossa aposta em WhatsApp continua certa, mas o valor
> migrou do "conversar" para o "executar no ERP".

### e) Atacado / revendedoras (o mercado real do LM FIT)

**ViaShopModa** — plataforma B2B de atacado de moda: loja B2B, app, catálogo e CRM, com
**catálogo próprio por revendedora**, pedido mínimo, tabelas de preço diferenciadas e carteira de
clientes. Vende explicitamente a promessa de "acabar com foto e PDF no WhatsApp".
**Moda Atacado Revenda (M•A•R)** e **Brás Online** — marketplaces que agregam fabricantes.

Esse é o mercado que o nosso `/catalogo` tangencia mas **não atende de verdade** (hoje ele é um
catálogo único e igual para todo mundo, não um portal por revendedora).

---

## 2. Onde a gente está (auditado no código, 13/ago/2026)

### Diferenciais reais — raros ou inexistentes na concorrência

1. **Stack vertical inteira num tenant só:** catálogo → loja → PDV → estoque multi-local →
   compras/produção/materiais → fiscal → financeiro/DRE. Nenhum dos 4 grupos acima cobre isso.
2. **PDV offline-first** (`lib/pdv/outbox.ts` + `OrdersService.syncBatch`): venda idempotente por
   `clientSaleId`, reserva atômica por local, e conversão automática em encomenda parcial quando
   falta estoque. O PDV do Bling/Tiny é online. Isso é ouro para feira, Brás e loja com internet ruim.
3. **IA no WhatsApp que cria pedido de verdade** (Loop 11-C), com estoque e preço reais — não só
   qualificação de lead.
4. **10 presets que mudam a estrutura da página**, não só a cor (Loops 12, 19–25, V4). Nível de
   identidade visual acima do tema padrão de Nuvemshop/Bling.
5. **Preço atacado/varejo por variante com regra de quantidade mínima**, aplicado server-side.
6. **Programa de influenciadores** com relatório de vendas por cupom.
7. Multi-tenant com `PLAN_FEATURES`/limites + módulo de billing.

### Lacunas confirmadas no código (não é suposição — foi verificado)

| # | Lacuna | Evidência | Impacto |
|---|---|---|---|
| 1 | **Frete é só taxa fixa.** Zero transportadora | `tenant.schema.ts`: `standardFee`/`expressFee`/`freeAboveTotal`. Nenhuma referência a Melhor Envio, Correios ou Kangu em todo o repo | 🔴 Alto — Nuvemshop vende "Smart Shipping" como diferencial; sem cotação real a loja não compete |
| 2 | **Sem Pix nativo.** Delega ao checkout hospedado da InfinitePay | `payments.service.ts` (Loop 2 documentou a decisão) | 🔴 Alto — Pix foi **42% do valor transacionado no e-commerce BR em 2025**; sair do site para pagar derruba conversão |
| 3 | **NF-e não dispara sozinha** | `FocusNfeAdapter` existe e é real, mas nenhum ponto em `orders/` ou `payments/` chama `FiscalService` — emissão é manual | 🟡 Médio — trabalho manual por pedido |
| 4 | **Recuperação de carrinho só por e-mail** | `abandoned-cart.cron` usa apenas `notify.sendEmail` | 🟡 Médio — temos `WhatsappSenderService` pronto e não usamos; essa persona não abre e-mail |
| 5 | **Sem feed de produtos** | Nada de Google Merchant / Catálogo Meta / ACP | 🔴 Alto — sem feed não existe tráfego pago em escala, Instagram Shopping nem presença em busca por IA |
| 6 | **Sem portal B2B por revendedora** | `/catalogo` é único e igual para todos | 🟡 Médio — é o modelo de negócio real do LM FIT, e a ViaShopModa já ataca esse espaço |
| 7 | **O caminho do dinheiro só tem teste mockado** | O bug de hoje passou por 437 testes verdes | 🔴 Alto — ver abaixo |

> **Sobre a lacuna 7 — vale entender, porque custou venda hoje.**
> O teste de atacado em `orders.service.spec.ts` mockava `priceWholesale: 35` contra
> `priceRetail: 50`. Só que **na base real a maioria das variantes tem os dois valores iguais**
> (o lojista nunca configurou preço de atacado, e `getWholesalePricingBatch()` faz fallback
> igualando os dois). Ou seja: o mock representava uma forma de dado que quase não existe em
> produção, e a forma que existe de verdade nunca foi testada — por isso a regra de atacado
> rejeitava toda venda de 1 peça no varejo e ninguém percebeu. Já corrigido e coberto por teste,
> mas a **classe** do problema continua aberta: não há nenhum teste que exercite o fluxo
> catálogo → carrinho → pedido contra dados no formato real.

---

## 3. Posicionamento — a frase que resume

> O **Bling** não tem loja de moda de verdade. A **Nuvemshop** não tem chão de fábrica nem PDV
> offline. O **Sisplan** não tem IA nem D2C. A **ViaShopModa** só resolve o atacado.
> **A Kivoni é a única que cobre confecção → loja → balcão → WhatsApp num tenant só.**

O plano abaixo protege esse posicionamento: primeiro tapa os buracos que fazem a gente **perder**
comparação em table stakes, depois investe onde a gente **ganha** sozinho.

---

## 4. Plano — 4 ondas

### Onda 0 — Parar de perder venda (1 loop, S) 🔴 fazer primeiro

**L26 — Canário do caminho do dinheiro**

- Teste de integração real (Mongo dedicado, sem mock de pricing) cobrindo
  catálogo → draft → patch → submit → pedido criado, com **dados no formato de produção**:
  variante sem atacado configurado (`priceWholesale === priceRetail`), variante com atacado real,
  1 unidade, quantidade no limite do mínimo, estoque baixo, estoque zero com e sem backorder.
- Pedido sintético diário num tenant de teste em produção, com alerta se falhar.
- Alerta quando `POST /public/order-drafts/:token/submit` responder 4xx acima de um limiar —
  hoje o cliente vê o erro e **você não fica sabendo**.

*Por que primeiro:* foi exatamente essa lacuna que custou venda hoje, e é o loop mais barato da lista.

### Onda 1 — Table stakes que travam conversão (3 loops, M)

**L27 — Frete real (Melhor Envio)** — cotação por CEP no PDP e no checkout, escolha de
transportadora/prazo, geração de etiqueta e rastreio no pedido. Fecha a maior lacuna contra
Nuvemshop/Bagy/Tray. A estrutura de CEP e a UI de escolha de frete já existem desde os Loops 3/13 —
falta o cotador real por trás.

**L28 — Pix nativo + Pix Parcelado** — QR code e copia-e-cola **dentro** do nosso checkout, com
webhook de confirmação; expor Pix Parcelado quando o PSP suportar (38% dos usuários de Pix já usam,
segundo CNDL/SPC de março/2026). Deixa a fundação pronta para **Pix Automático** (recorrência),
que entra plenamente em operação em 2026 e é o caminho para clube/assinatura.

**L29 — NF-e automática** — emitir ao marcar pago/enviado, com fila e reprocesso em caso de falha.
O adaptador Focus NFe já está pronto; falta só o gatilho e o tratamento de erro.

### Onda 2 — Aquisição e recuperação (2 loops, S/M)

**L30 — Feed de produtos** — um endpoint que gera o catálogo em: Google Merchant (XML), Catálogo
Meta (habilita Instagram Shopping e Advantage+) e o formato do **Agentic Commerce Protocol**
(Stripe + OpenAI), que hoje alimenta o ChatGPT Shopping — o "Buy it in ChatGPT" saiu em
16/fev/2026 nos EUA com Etsy e 1 milhão+ de lojas Shopify. Barato para nós: `listPublicCatalog`,
SEO e JSON-LD já existem. Alto retorno: destrava tráfego pago e nos coloca cedo na busca por IA.

**L31 — Pós-venda e recuperação por WhatsApp** — reusa `WhatsappSenderService`: carrinho
abandonado, "pedido confirmado", "pedido enviado + rastreio". Hoje tudo isso só existe por e-mail,
que o público do LM FIT não abre.

### Onda 3 — Diferenciação: onde a gente ganha sozinho (3 loops, M/L)

**L12-A/B — Venda por voz no WhatsApp** — o plano já escrito em
[`misty-launching-moth`](../../../.claude/plans/misty-launching-moth.md), com o achado importante
que ele documenta: o fluxo atual **não baixa estoque** (cria pedido `open`), e precisa passar pelo
`syncBatch` como o PDV. Nenhum concorrente grande resolve o vendedor que não digita — e a Meta,
com o agente genérico dela, resolve menos ainda.

**L32 — Portal da Revendedora (B2B)** — tabela de preço por cliente, pedido mínimo, limite de
crédito e prazo, e catálogo próprio da revendedora já com o preço de revenda dela. Ataca a
ViaShopModa de frente e é o modelo de negócio real do LM FIT.

**L33 — IA para o lojista** — gerar nome, descrição, SEO e alt-text a partir da foto do produto.
A chave Gemini já está no tenant e o `LlmService` já existe. A Nuvemshop diz que 72% dos lojistas
já usam IA para exatamente isso — é expectativa de mercado, não novidade.

---

## 5. O que **não** fazer agora

- **Mais presets de layout.** O V4 já entregou diferenciação visual acima do mercado. O retorno
  marginal do 11º preset é próximo de zero comparado a ter frete real.
- **Marketplace próprio.** M•A•R e Brás Online já ocupam esse espaço e é um negócio de rede, não
  de software.
- **PCP/MRP profundo.** Não dá para ganhar do Sisplan em profundidade de indústria, e não é onde
  está a dor do nosso cliente.

---

## 6. Ordem sugerida

```
L26 (canário)  →  L27 (frete)  →  L28 (Pix)  →  L30 (feed)  →  L31 (WhatsApp pós-venda)
                                                    ↘  L29 (NF-e) em paralelo, é independente
Depois:  L12-A/B (voz)  →  L32 (revendedora)  →  L33 (IA para o lojista)
```

Racional: a Onda 0 é barata e para o sangramento. A Onda 1 tira a gente da desvantagem em
comparação direta. Só então vale investir na Onda 3, que é onde a gente é único — porque
diferencial não segura cliente que perdeu a venda no frete ou no checkout.

---

## Fontes

- [Nuvemshop — lançamentos InovA 2026](https://lancamentos.nuvemshop.com.br/) ·
  [Nova IA da Nuvemshop (E-Commerce Brasil)](https://www.ecommercebrasil.com.br/noticias/nova-ia-da-nuvemshop-acelera-a-execucao-das-marcas-que-dominam-o-proprio-e-commerce) ·
  [R$ 6,5 bi em vendas e aposta em IA (Exame)](https://exame.com/negocios/com-r-65-bilhoes-em-vendas-nuvemshop-aposta-em-ia-e-mira-novo-publico/)
- [Tray ou Nuvemshop 2026](https://www.nuvemshop.com.br/blog/tray-ou-nuvemshop/) ·
  [Bagy ou Nuvemshop 2026](https://www.nuvemshop.com.br/blog/nuvemshop-ou-bagy/)
- [Bling vs Olist Tiny 2026](https://gefersonalencar.com.br/2026/02/12/bling-ou-olist-erp-o-comparativo-definitivo-para-2026/) ·
  [Bling ERP preços e planos 2026](https://manifestoagil.com.br/bling-erp-preco/)
- [Suri Shop leva IA agêntica ao WhatsApp (E-Commerce Brasil)](https://www.ecommercebrasil.com.br/noticias/suri-shop-leva-ia-agentica-para-o-whatsapp-no-forum-e-commerce-brasil-2026) ·
  [OmniChat — nova geração de agentes de IA](https://portalcustomer.com.br/omnichat-leva-nova-geracao-de-agentes-de-ia-para-toda-a-jornada-de-compra-no-forum-e-commerce-brasil-2026) ·
  [WhatsApp Business Summit 2026 — comércio agêntico](https://www.zappy.chat/whatsapp-business-summit-2026-comercio-agentico/)
- [Pix amplia opções e pressiona o varejo (CNDL/Varejo S.A.)](https://cndl.org.br/varejosa/pix-amplia-opcoes-de-pagamento-e-pressiona-varejo-por-checkouts-mais-simples-no-forum-e-commerce-brasil-2026/) ·
  [Agenda evolutiva do Pix 2026–2027 (Matera)](https://www.matera.com/br/blog/entenda-agenda-evolutiva-do-pix/) ·
  [Pix Automático e recorrência no e-commerce](https://www.socialhub.pro/blog/pix-automatico-recorrencia-e-commerce/)
- [Agentic Commerce Protocol — spec de feed de produtos](https://agentic-commerce-protocol.com/docs/commerce/specs/feed) ·
  [ChatGPT Instant Checkout — guia para varejistas 2026](https://www.ekamoira.com/blog/chatgpt-instant-checkout-agentic-commerce-protocol-2026) ·
  [Power product discovery in ChatGPT](https://chatgpt.com/merchants/)
- [ViaShopModa — plataforma de atacado digital para moda](https://www.viashopmoda.com.br/) ·
  [Moda Atacado Revenda (M•A•R)](https://play.google.com/store/apps/details?id=br.com.modaatacadorevenda)
- [ERP Sisplan para confecção (Apexcon)](https://www.apexcon.com.br/sistema-para-confeccao) ·
  [Audaces — ERP para confecção](https://audaces.com/pt-br/blog/erp-confeccao)
