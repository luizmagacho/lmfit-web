# Conectar o WhatsApp Business de um tenant (Meta Cloud API)

Passo a passo pra ligar a IA no WhatsApp de uma loja (Loop 11 do ROADMAP). Escrito depois de
passar por esse processo ao vivo pela primeira vez — inclui os erros reais que apareceram no
caminho, não só o "caminho feliz" da documentação da Meta.

## Visão geral

Cada loja (tenant) conecta sua PRÓPRIA conta do WhatsApp Business — nada é compartilhado entre
lojas. O que muda entre um teste local e produção de verdade:

| | Desenvolvimento local | Produção |
|---|---|---|
| Número | Número de teste gratuito da Meta | Número real, dedicado ao WhatsApp Business |
| Destinatários | Só até 5 números verificados manualmente | Qualquer cliente |
| Token de acesso | Temporário (expira em 24h) | Permanente (Usuário do Sistema) |
| URL do webhook | `ngrok` (muda toda vez que reinicia) | Domínio real fixo (`https://api.kivoni.com.br/...`) |
| Verificação da empresa | Não precisa | Obrigatória (Business Verification na Meta) |

## Passo 1 — Criar o App na Meta

1. [developers.facebook.com](https://developers.facebook.com) → **Meus Apps** → **Criar App** →
   tipo **Empresa**.
2. No painel do app, adicionar o produto **WhatsApp**.
3. Menu lateral → **Casos de uso** → **Conectar no WhatsApp** → **Etapa 1. Experimente**. Aqui a
   Meta já cria sozinha um número de teste gratuito e mostra:
   - **Phone Number ID**
   - **Identificação da conta do WhatsApp Business (WABA ID)**
   - **Token de acesso** (temporário — clique em "Gerar novo token" quando expirar)
4. Nessa mesma tela, campo **Destinatário** → adicione e verifique o(s) número(s) de celular que
   vão testar (a Meta manda um código por WhatsApp/SMS pra confirmar). **Sem isso, nenhuma
   mensagem enviada pra esse número de teste é processada** — não aparece erro nenhum, o
   `webhook` simplesmente nunca é chamado.

## Passo 2 — App Secret

**Configurações do app → Básico** (menu lateral) → campo "Chave secreta do aplicativo" → **Mostrar**.

## Passo 3 — Expor o servidor (só em desenvolvimento local)

Em produção pule este passo — já existe um domínio público fixo.

Localmente, use `ngrok` (ou similar) apontando pra porta da API:

```bash
ngrok http 4001
```

A URL pública muda toda vez que o túnel reinicia — se isso acontecer, repita o Passo 4 com a URL
nova.

## Passo 4 — Configurar o Webhook na Meta

Ainda em **Casos de uso → Conectar no WhatsApp → Etapa 2. Configuração da produção → Configurar
webhooks**:

- **URL de callback**: `https://<seu-domínio>/webhooks/whatsapp/<slug-do-tenant>`
  (produção: `https://api.kivoni.com.br/webhooks/whatsapp/lmfit`, por exemplo)
- **Verificar token**: uma senha qualquer que você escolhe (anote — vai usar nas Configurações do
  painel também)
- Clique em **Verificar e salvar**

Depois de salvar, role a tabela **Campos do webhook** até achar a linha **`messages`** e ligue o
toggle **Assinar**. **Sem isso, nada chega no seu servidor — nem o botão "Teste" da própria Meta
funciona pra simular mensagem real.**

## Passo 5 — O passo escondido: assinar a WABA no app

**Isso não aparece em lugar nenhum da interface da Meta.** Mesmo com o webhook verificado e o
campo `messages` assinado, a conta do WhatsApp Business (WABA) precisa ser explicitamente
inscrita no seu app via uma chamada direta na API — sem isso, mensagens reais enviadas pro número
nunca disparam o webhook (o botão de "Teste" da Meta funciona mesmo sem isso, o que engana —
ele manda um evento fake direto pro seu servidor, sem passar pelo roteamento real).

```bash
curl -X POST "https://graph.facebook.com/v21.0/<WABA_ID>/subscribed_apps" \
  -H "Authorization: Bearer <TOKEN_DE_ACESSO>"
```

Resposta esperada: `{"success":true}`. Isso só precisa ser feito uma vez por WABA (não repete a
cada webhook reconfigurado, só se trocar de app).

## Passo 6 — Preencher no painel LM FIT

`Configurações → WhatsApp Business API` (dentro do tenant específico):

- Phone Number ID
- Access Token
- App Secret
- Verify Token (o mesmo do Passo 4)
- Marcar **"Deixar a IA responder clientes automaticamente no WhatsApp"**

Salvar. Os 3 campos secretos (`App Secret`/`Access Token`/`Verify Token`) são criptografados
automaticamente antes de gravar no banco — o Phone Number ID fica em texto plano (não é segredo).

## Passo 7 — Testar

Mande uma mensagem do celular verificado (Passo 1) pro número de teste. Pra debugar sem depender
do celular, também dá pra simular via `curl` (mesmo formato que a Meta realmente manda):

```bash
curl -X POST "https://<seu-domínio>/webhooks/whatsapp/<slug-do-tenant>" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{"changes": [{"value": {"messages": [{
      "id": "wamid.TESTE1",
      "from": "5511999998888",
      "type": "text",
      "text": {"body": "Oi, tem camisa M?"}
    }]}}]}]
  }'
```

## Só pra produção: sair do modo desenvolvimento

Pra clientes de verdade (não só os 5 números de teste) poderem mandar mensagem:

1. **Número real dedicado** — não pode já estar em uso no WhatsApp normal/Business App.
2. **Verificação da empresa** (Business Verification) — documentos legais do CNPJ na Meta, pode
   levar de 1 a 3 dias.
3. **Token de acesso permanente** — gerar via **Configurações do Negócio → Usuários do
   Sistema → Gerar token**, com as permissões `whatsapp_business_messaging` +
   `whatsapp_business_management`, sem validade. Substitui o token temporário do Passo 1.
4. **App em modo "Ativo" (Live)**, não mais desenvolvimento.
5. Repetir os Passos 4–6 com a URL de produção e o token permanente.

Não precisa de App Review formal da Meta pra mensagens do WhatsApp Business em si (diferente de
outras permissões do Facebook/Instagram) — o gargalo real é a verificação da empresa.

## Troubleshooting (problemas reais que já apareceram)

| Sintoma | Causa | Solução |
|---|---|---|
| "Verificar e salvar" dá erro / não confirma | `Verify Token` errado, ou servidor não está acessível pela URL informada | Confira se a URL responde (`curl` direto nela); confira se o token bate exatamente |
| Handshake funciona, mas nenhuma mensagem chega | Campo `messages` não assinado, OU WABA não inscrita no app | Passo 4 (assinar `messages`) e Passo 5 (`subscribed_apps`) — os dois são necessários |
| Botão "Teste" da Meta funciona, mensagem real não | Confirma que é especificamente o Passo 5 que falta — o botão de teste não passa pelo roteamento real da WABA | Rodar o `curl` do Passo 5 |
| Mensagem enviada, 2 tiquinhos (entregue), mas nada no servidor | Mesmo caso acima — a entrega no WhatsApp não implica webhook disparado | Passo 5 |
| Token de acesso para de funcionar depois de 1 dia | Token temporário expirou (24h) — normal em desenvolvimento | Gerar novo token na Etapa 1, atualizar em Configurações. Em produção, usar token permanente (ver acima) |
| `ngrok` para de funcionar depois de reiniciar o Mac/túnel | URL do `ngrok` mudou | Repetir o Passo 4 com a URL nova |
