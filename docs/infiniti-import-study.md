# Estudo de Integração: Importação de Pedidos via Maquininha InfinitePay (Smart POS)

## Visão Geral
Este documento apresenta um levantamento de viabilidade e um plano de ação para integrar as vendas realizadas na maquininha da InfinitePay diretamente no sistema LM FIT, convertendo transações físicas em pedidos (orders) automaticamente.

## 1. Viabilidade Técnica

A InfinitePay (CloudWalk) oferece soluções para integração com suas Smart POS (maquininhas Android). Existem duas formas principais de integrar transações físicas a um sistema web/PDV na nuvem:

### A. Integração via API de Pagamentos / Webhooks (Recomendado)
A InfinitePay possui APIs RESTful e um sistema de Webhooks. Quando uma venda é aprovada na maquininha, a InfinitePay pode enviar um POST (Webhook) para o backend do LM FIT.
- **Vantagens:** Não exige alteração no software da maquininha. Funciona em tempo real.
- **Desvantagens:** Pode ser complexo conciliar o que foi vendido (os produtos) com a transação de pagamento puro (que só tem o valor), a menos que o carrinho seja montado no LM FIT PDV e enviado para a maquininha via "Pagamento Integrado" (CloudWalk Link/App-to-App).

### B. Aplicativo Próprio na Smart POS (App-to-App / Intent)
Como as maquininhas InfinitePay são baseadas em Android, é possível instalar o aplicativo LM FIT PDV diretamente na maquininha ou rodá-lo via navegador (PWA). 
- O fluxo seria: O vendedor monta o carrinho no app LM FIT na maquininha, clica em "Cobrar" e o app do LM FIT chama o aplicativo de pagamento da InfinitePay via *Android Intent*. Após o pagamento, o app da InfinitePay devolve o status para o LM FIT.
- **Vantagens:** Controle total da venda e baixa de estoque automática no momento exato do pagamento físico.
- **Desvantagens:** Exige desenvolvimento de integração mobile nativa ou uso de bridges (ex: React Native, Capacitor) caso o PDV web atual não suporte Intents do Android nativamente pelo browser.

## 2. Proposta de Arquitetura para o LM FIT

A melhor abordagem para o ecossistema web atual do LM FIT (Next.js + NestJS) é a **Integração em Nuvem via Webhook + PDV Link**.

### Fluxo Sugerido:
1. **Carrinho no PDV (Web/Mobile):** O vendedor adiciona produtos no módulo `pdv` do LM FIT no computador ou celular.
2. **Checkout (Gerar Cobrança):** O vendedor seleciona "Cartão / InfinitePay". O backend (NestJS) envia uma requisição para a API da InfinitePay criando uma intenção de pagamento no valor do pedido e vinculando a maquininha específica da loja.
3. **Pagamento na Maquininha:** A maquininha da loja "acorda" com o valor na tela pedindo o cartão do cliente.
4. **Confirmação (Webhook):** O cliente paga, a InfinitePay avisa o NestJS (via Webhook) que a transação `txn_123` foi aprovada.
5. **Efetivação:** O backend do LM FIT altera o status do Pedido para `paid`, realiza a baixa de estoque, e notifica o frontend (via Polling ou WebSocket) que a venda foi concluída.

## 3. Passo a Passo para Implementação

### Passo 1: Conta de Desenvolvedor InfinitePay
- Criar acesso ao Painel de Desenvolvedor CloudWalk / InfinitePay.
- Obter `Client ID` e `Client Secret` / chaves de API.

### Passo 2: Backend (NestJS)
- Criar o serviço `InfinitePayIntegrationService`.
- Implementar as rotas:
  - `POST /infinitepay/create-payment`: Cria a cobrança na maquininha.
  - `POST /infinitepay/webhook`: Recebe os retornos de sucesso/falha das transações.
- Registrar a URL do webhook no painel da InfinitePay.

### Passo 3: Frontend (Next.js - PDV)
- Adicionar opção de pagamento "Maquininha InfinitePay" na tela do PDV (`/pdv`).
- Ao selecionar, exibir um modal de "Aguardando Pagamento na Maquininha..." que faz *polling* na API do LM FIT a cada 2 segundos esperando o status do pedido mudar para `paid`.

### Passo 4: Testes
- Utilizar os cartões e chaves de ambiente *Sandbox* fornecidos pela InfinitePay.
- Validar se o estoque está baixando apenas quando o Webhook retornar status aprovado.

## 4. Considerações e Benchmark

No mercado atual, soluções como Shopify POS, Nuvemshop e TOTVS utilizam exatamente a integração **Cloud-to-Cloud (API + Webhook)** para conectar o PDV no navegador com as maquininhas físicas. Isso evita a necessidade de programar apps em Android nativo para as maquininhas, mantendo todo o desenvolvimento unificado em TypeScript (Next/Nest).
