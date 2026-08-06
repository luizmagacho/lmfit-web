# Storefront V2 — Benchmark e Blueprint (padrão Farm Rio / Renner / Reserva)

> Objetivo: cada lojista da plataforma ter uma **loja de varejo com cara de marca** — da vitrine ao
> checkout e ao pós-venda (trocas e devoluções) — no nível dos grandes e-commerces de moda BR.
> Referências analisadas: Farm Rio, Renner, Reserva + screenshots da loja atual da LM FIT
> (Nuvemshop) fornecidos em 2026-07-15.
>
> Este documento é insumo de **Plan** para os Loops 4–8 do [ROADMAP.md](./ROADMAP.md).
> Tudo aqui é **multi-tenant**: cada elemento é configurável por lojista, nunca hardcoded.

---

## 1. Benchmark — o que o padrão de mercado faz em cada etapa da jornada

| Etapa | Farm Rio | Renner | Reserva | LM FIT hoje (site atual) | Plataforma hoje |
|---|---|---|---|---|---|
| **Anúncio topo** | Ticker rotativo (frete/cupom) | Ticker + CTA app | Ticker com voz de marca | ✅ Ticker triplo (pix 5%, 2x sem juros, atacado no Whats) | ❌ Não existe |
| **Header** | Busca, wishlist, conta, sacola | Busca proeminente, mega-menu por depto | Header minimalista, tipografia forte | ✅ Busca + conta + sacola, logo central | ⚠️ Só logo + nome |
| **Home** | Campanhas editoriais, "shop by print", lookbook | Vitrines por categoria + ofertas | Storytelling de produto, provas sociais | ✅ Hero de campanha, Lançamentos, barra de confiança (envio BR / 2x / SSL), banner de cupom 1ª compra | ❌ Home = grade de produtos crua |
| **Navegação/PLP** | Categorias + filtros por cor/tamanho/estampa | Filtros profundos (tamanho, cor, preço), ordenação, quick-add | Categorias enxutas, badges de produto | ⚠️ Dropdown "Produtos" simples | ⚠️ Busca + 2 filtros (estoque/lançamento) |
| **Card de produto** | Foto grande, hover com 2ª foto, wishlist | Preço + parcelas, estrelas de review | Foto + copy de marca | ✅ Preço cheio + "R$ X com Pix", swatches de cor, botão COMPRAR | ⚠️ Preço/faixa, sem swatches nem hover |
| **PDP** | Galeria 5–8 fotos, compre-o-look, guia de medidas | Galeria + reviews + frete por CEP + recomendações | Galeria + fit/tecido + omni (retire na loja) | ⚠️ Padrão Nuvemshop | ⚠️ 1 foto, steppers por variação (funcional, sem galeria/medidas/frete) |
| **Preço/pagamento** | Parcelas visíveis | Parcelas + cartão da loja | Pix com desconto destacado | ✅ Desconto Pix por item, 2x sem juros no ticker | ❌ Nenhuma regra de exibição (pix %, parcelas) |
| **Sacola** | Drawer lateral, barra "falta X pro frete grátis", cupom | Drawer + recomendações | Drawer rápido | ⚠️ Página padrão | ⚠️ Sacola flutuante funcional, sem frete grátis/upsell |
| **Checkout** | Multi-etapas limpo (identificação → entrega → pagamento) | Idem + retirada na loja | Idem, rápido, guest-friendly | Padrão Nuvemshop | ⚠️ 1 página funcional; pagamento real pendente (Loop 2) |
| **Confirmação/rastreio** | Página + e-mail + rastreio | Central de pedidos robusta | WhatsApp concierge | Padrão Nuvemshop | ⚠️ `/pedido/confirmado` (Loop 1); sem rastreio/notificação |
| **Conta do cliente** | Pedidos, wishlist, dados | Pedidos, trocas, cartão, cashback | Pedidos + atendimento | ✅ Ícone de conta | ❌ Não existe (Loop 7) |
| **Trocas e devoluções** | Portal self-service | **Referência do mercado**: fluxo autônomo completo | Política clara + concierge | ⚠️ Página institucional estática | ⚠️ Módulo `returns` existe no admin, sem portal do cliente |
| **Institucional** | Quem somos, sustentabilidade | Guia de medidas, políticas, FAQ | Manifesto de marca | ✅ Quem somos, Guia de medidas, Como comprar, Contato | ❌ Não existe |
| **Confiança** | Selos, reviews, UGC/Instagram | Reviews + selos de segurança | Prova social da comunidade | ✅ Barra SSL/envios/parcelas | ❌ Não existe |

**Leitura do benchmark:** o backbone comum das três marcas é o mesmo — *ticker → header com busca →
home editorial → PLP com filtros → PDP rica → sacola drawer → checkout 3 passos → conta + portal de
trocas*. O site atual da LM FIT já segue esse esqueleto no visual; a plataforma tem o **motor**
(catálogo, carrinho, pedidos, pagamentos, returns no admin) mas não a **apresentação**. O V2 é
fechar essa diferença de forma configurável por lojista.

---

## 2. Blueprint página a página

### 2.1 Camada de marca (todas as páginas)

- **Ticker de anúncios**: lista de mensagens rotativas por tenant (ex.: "Pague no pix com 5% OFF",
  "Parcele em 2x sem juros", "Compre atacado pelo WhatsApp"). Cor de fundo/texto do branding.
- **Header**: busca com autocomplete (produtos + categorias), logo central (branding), conta,
  sacola com contador. Menu: categorias do catálogo + páginas institucionais ativas.
- **Footer**: institucional (quem somos, políticas, guia de medidas, como comprar), contato/redes,
  selos (SSL, formas de pagamento), CNPJ.
- **Regras de exibição de preço** (por tenant): % de desconto à vista no Pix ("R$ 67,62 com Pix"),
  nº máx. de parcelas sem juros ("2x de R$ 34,50"). Só exibição — a cobrança real é o Loop 2.

### 2.2 Home (vitrine editorial)

Blocos ordenáveis pelo lojista (CMS-lite no admin, "Loja online"):
1. **Hero carousel** — banners de campanha com CTA (imagem, título, link p/ categoria/produto).
2. **Vitrines de produto** — "Lançamentos", "Mais vendidos", coleção manual (lista de produtos).
3. **Grade de categorias** — tiles com foto ("Conjuntos", "Tops", "Shorts").
4. **Barra de confiança** — envios para todo o Brasil, parcelamento, compra segura (ícones fixos).
5. **Banner de cupom** — captura de 1ª compra (ex.: PRETREINO 10% OFF) integrada às promoções já
   existentes no admin.
6. **Módulo Lookbook** ("compre o look", padrão Farm Rio) — foto editorial da modelo com as peças do
   conjunto (Top + Shorts) e botão para adicionar todas à sacola de uma vez. V1 sem desconto de
   combo (desconto de bundle exige motor de promoção composto → fase growth).
7. **Faixa Instagram/UGC** (fase growth).

### 2.3 PLP (categoria/busca)

- Filtros: tamanho, cor, faixa de preço, disponibilidade; ordenação (relevância, menor/maior preço,
  lançamentos). Server-side no catálogo público (hoje o endpoint devolve tudo sem filtro/paginação —
  precisa de `?category=&size=&color=&sort=&page=`).
- Card v2: 1ª/2ª foto no hover, swatches de cor (a partir das variações), preço com regra Pix/parcelas,
  badge (Lançamento, Esgotado, % OFF via `compareAtPrice`), quick-add (tamanho num popover).

### 2.4 PDP (página de produto)

- **Galeria sticky** (desktop): fotos verticais grandes que rolam à esquerda enquanto a caixa de
  compra (título, preço, tamanhos, CTA) fica fixa à direita; no mobile vira carrossel com zoom.
  Imagens já existem por produto/variação no admin.
- **Seletor de variação padrão de moda**: swatches de **cor** + botões de **tamanho** que
  acendem/apagam conforme a cor selecionada (estado: disponível / **últimas unidades** quando
  estoque ≤ limiar / esgotado / sob encomenda) — substitui os steppers atuais.
- Bloco de preço com Pix/parcelas; quantidade; **CTA "Adicionar à sacola"** (abre o drawer).
- **Calculadora de frete por CEP** (depende do Loop 3).
- **Guia de medidas** (modal; tabela configurável por tenant ou por categoria).
- Descrição/composição/cuidados (campos novos no produto); política de troca resumida.
- Vitrine "Complete o look / Você também pode gostar" (mesma categoria; recomendações na fase growth).

### 2.5 Sacola (drawer)

- Drawer lateral aberto ao adicionar (montado no layout `(public)` — qualquer "Comprar" do site
  abre a sacola sem recarregar); itens com foto/variação/qty editável.
- **Barra de progresso para frete grátis** ("Faltam R$ 45,00 para Frete Grátis!" — limiar do Loop 3).
- **Cross-sell na sacola**: 1–2 sugestões complementares ("Aproveite e leve a Regata Yasmin").
- Campo de cupom (backend já valida); subtotal + "ou R$ X no Pix"; CTA para o checkout.

### 2.6 Checkout v2 (One-Page)

**Decisão (2026-07-15, reconciliação com prévia externa):** checkout em **página única** com seções
progressivas em colunas responsivas — evolui o `CheckoutClient` atual em vez de reescrever como
multi-etapas (menos retrabalho, e é o padrão Reserva de conversão rápida):
1. **Identificação** — telefone/e-mail (login rápido se conta existir; guest sempre possível).
2. **Entrega** — CEP → opções (retirada / padrão / expressa, valores do tenant — Loop 3).
3. **Pagamento** — Pix dinâmico (com desconto), cartão via PSP (Loop 2), "combinar no WhatsApp".
- Resumo do pedido fixo na lateral (colapsável no mobile); cada seção valida progressivamente e o
  estado sobrevive a reload; confirmação → `/pedido/confirmado` (já existe).

### 2.7 Conta do cliente (`/conta`)

- Login (OTP WhatsApp ou magic link — decisão do Loop 7); meus pedidos com status + pagamento +
  rastreio; endereços salvos; pontos de fidelidade (motor já existe).

### 2.8 Portal de trocas e devoluções ("Troca Fácil")

O diferencial Renner-class. **Atenção: o backend `returns` JÁ EXISTE** (`lmfit-api/src/returns/` —
schema, `POST /orders/:orderId/returns`, `GET /returns`, admin `/returns`). O trabalho é **estender**
com uma entrada pública, nunca recriar o módulo.

- **Entrada pública `/devolucoes`**: cliente informa **nº do pedido + telefone** usado na compra
  (o checkout coleta telefone, não CPF — CPF pode virar campo opcional depois, com cuidado LGPD).
  Logado, entra direto por `/conta` → pedido.
- **Fluxo**: itens do pedido com checkbox → motivo ("Tamanho pequeno", "Defeito", "Desistência"…)
  → escolha: **troca** (tamanho/cor), **vale-compras** (usa `storeCreditBalance` existente) ou
  **estorno** → instruções de postagem/retirada configuradas pelo lojista → resumo visual →
  solicitação criada com status "Solicitado" no admin `/returns` do lojista (+ alerta staff).
- Janela de troca (`returnPolicy.windowDays`) validada **no servidor**; página institucional de
  política gerada da config do tenant.
- Acompanhamento de status pelo mesmo link/`/conta`; notificações de mudança de status (Loop 8).

### 2.9 Páginas institucionais (CMS-lite)

Quem somos, Como comprar, Trocas e devoluções, Guia de medidas, Contato — texto rico + imagens por
tenant, ativáveis individualmente; aparecem no menu/footer automaticamente.

---

## 2.10 Sistema de temas — "Estilos de loja" (benchmark internacional)

Além das referências BR, foram analisados os padrões visuais das grandes marcas internacionais de
moda, activewear e grife. Os padrões foram destilados em **8 presets de tema** com nomes neutros —
o lojista escolhe o estilo no admin "Loja online" sem saber (nem precisar saber) quais marcas
inspiraram cada um. Um preset é um **pacote de design tokens** (CSS variables no `(public)`);
o `branding.primaryColor` do tenant continua sendo a cor de acento em todos eles.

| | 1. **Essencial** | 2. **Editorial** | 3. **Performance** | 4. **Boutique** | 5. **Vibrante** |
|---|---|---|---|---|---|
| Vibe | Minimalismo quente, produto em primeiro plano | Moda autoral, revista de moda | Energia, esporte, "drop culture" | Luxo clássico, atemporal | Maximalismo alegre, cor e estampa |
| Tipografia | Sans humanista, títulos médios, sentence case | Serif display **gigante** nos títulos, corpo sans pequeno | Sans condensada bold, TÍTULOS EM CAIXA ALTA | Serif clássica + small caps, entrelinha generosa | Display expressiva/arredondada, pesos contrastantes |
| Paleta | Off-white/areia, texto grafite, acento dessaturado | Monocromática P&B, acento raro | Fundo escuro (quase preto), acento neon | Creme/marfim, detalhes em tom de latão | Cores saturadas em blocos, fundos coloridos |
| Botões | Sólidos, cantos suaves | **Ghost** (contorno fino), uppercase espaçado | Sólidos grandes, cantos retos | Contorno fino, small caps | Pill coloridos, sombra dura |
| Card de produto | Foto 3:4 em fundo neutro, hover troca a foto | Grid assimétrico, imagens full-bleed | Badge "NOVO DROP", hover dinâmico | Moldura fina, foto still centrada | Stickers/badges (%OFF, NEW), hover com zoom |
| Hero | Foto única calma + título curto | Tela cheia com tipografia sobreposta | Vídeo curto/foto de ação + CTA forte | Still-life elegante, small caps | Carrossel colorido, colagens |
| Densidade PLP | 3–4 colunas com respiro | 2–3 colunas grandes | 4 colunas denso | 3 colunas espaçadas | Mosaico variável |
| Movimento | Fades discretos | Parallax leve, transições longas | Rápido e snappy | Quase estático | Brincalhão (micro-bounces) |
| Ideal para | Básicos premium, cápsula | Marca conceito, coleções autorais | **Fitness/activewear** (caso LM FIT), streetwear | Alfaiataria, semijoias | Moda jovem, praia, estampas |

| | 6. **Studio** | 7. **Impacto** | 8. **Monocromo** |
|---|---|---|---|
| Vibe | Wellness premium, calma e movimento | Esporte de alta energia, atitude de campeão | Minimalismo urbano P&B, sensual e gráfico |
| Tipografia | Sans arredondada e amigável, sentence case, títulos leves | Sans condensada **pesada**, TÍTULOS GIGANTES em caixa alta, leve itálico | Grotesca light com **tracking largo**, CAIXA ALTA fina |
| Paleta | Tons suaves de sálvia/aveia/argila sobre fundo claro quente | Branco + preto dominantes, um acento quente (vermelho-laranja) raro | Estritamente preto e branco; fotografia carrega toda a cor |
| Botões | Pill arredondados, tom sálvia | Sólidos pretos, cantos retos, largos | Contorno fino preto OU sólido preto, cantos 90° |
| Card de produto | Cantos bem arredondados, foto lifestyle, "cores disponíveis" em bolinhas | Foto em fundo cinza-claro, tag "LANÇAMENTO", preço bold | Foto P&B/dessaturada full-bleed, legenda mínima em tracking |
| Hero | Foto de bem-estar/yoga com título curto e calmo | Atleta em ação + frase de impacto sobreposta | Foto de estúdio em tela cheia, caption pequena espaçada |
| Densidade PLP | 3 colunas com muito ar | 3–4 colunas, ritmo forte | 2–3 colunas, margens generosas |
| Movimento | Suave, transições longas | Rápido, entradas fortes | Mínimo, cortes secos |
| Ideal para | Yoga/pilates/athleisure premium | Performance, corrida, times | Underwear, jeans, básicos urbanos |

**Modelo de config:**

```
storefront.theme: {
  preset: 'essencial' | 'editorial' | 'performance' | 'boutique' | 'vibrante'
        | 'studio' | 'impacto' | 'monocromo',
  overrides?: { displayFont?, bodyFont?, radius?, density?, mode?: 'light'|'dark' }
}
```

- Presets vivem no código como bundles de tokens; `overrides` permite ajuste fino sem sair do sistema.
- Seletor com **preview ao vivo** no admin "Loja online" (Loop 4).
- AC do Loop 4: trocar o preset re-estiliza a loja inteira (home, PLP, PDP, sacola, checkout)
  **sem nenhuma mudança de código** e sem quebrar contraste/acessibilidade em nenhum dos 8.
- Diferenciação interna (pra não confundir na escolha): `Studio` é o wellness claro e arredondado,
  `Performance` é o dark+neon de "drop", `Impacto` é o claro de tipografia gigante e agressiva,
  `Essencial` é o neutro quieto, `Monocromo` é o P&B fotográfico de cantos retos.

---

## 3. Modelo de configuração por tenant (novo `storefront` no tenant/admin)

```
storefront: {
  enabled, theme: { preset, overrides }, announcements[], heroBlocks[], homeSections[],
  pricingDisplay: { pixDiscountPercent, maxInstallments },
  shipping: { pickupLabel, flatFee, freeAboveTotal },      // Loop 3
  institutionalPages: { quemSomos, comoComprar, trocas, guiaMedidas, contato },
  returnPolicy: { windowDays, allowExchange, allowRefundAsCredit, instructions },
  social: { instagram, whatsapp }, seo: { title, description, ogImage }
}
```

Admin ganha a seção **"Loja online"** (Loop 4) para editar tudo isso com preview.

---

## 4. Mapeamento para os loops (ver ROADMAP para status)

| Bloco do blueprint | Loop |
|---|---|
| Pagamento real + regras Pix/parcelas na exibição | 2 |
| Frete por CEP + config de entrega do tenant + calculadora na PDP | 3 |
| Camada de marca (ticker/header/footer), Home editorial, CMS-lite "Loja online", institucionais | 4 |
| PLP com filtros + card v2 + PDP v2 (galeria, cor/tamanho, guia de medidas) | 5 |
| Sacola drawer + checkout multi-etapas | 6 |
| Conta do cliente | 7 |
| Portal de trocas e devoluções + notificações/rastreio | 8 |
| Reviews, wishlist, recomendações, UGC, carrinho abandonado, fidelidade no checkout | 9 |
| SEO/CWV, analytics, LGPD, rate limiting | 10 |

**Princípios herdados do processo:** preço/estoque sempre autoridade do servidor; tudo isolado por
tenant; cada loop passa pelo ciclo v2 — PLAN → REFINEMENT → IMPLEMENT → TEST → VERIFY (walk no
browser) → DOCUMENT → PLAN AGAIN — com follow-up por fase na spec (LOOP_PROCESS.md).

---

## 5. Decisões de reconciliação (2026-07-15 — prévia externa vs. este blueprint)

Uma prévia de plano externa foi analisada e absorvida. Decisões registradas:

| Decisão | Escolha | Por quê |
|---|---|---|
| Checkout | **One-page** com seções progressivas (não multi-etapas) | Evolui o `CheckoutClient` existente; padrão Reserva de conversão; menos retrabalho |
| Módulo de devoluções | **Estender** `lmfit-api/src/returns` existente com endpoint público | A prévia propunha criar do zero — duplicaria schema/controller que já existem |
| Identificação em `/devolucoes` | Nº do pedido + **telefone** (não CPF) | Checkout não coleta CPF hoje; CPF = campo novo + LGPD; telefone já é chave do cliente (waId) |
| Guia de medidas | Tabela **configurável por tenant/categoria** | Prévia sugeria tipos fixos (Top/Shorts/Regata) — quebraria multi-tenant |
| Lookbook "compre o look" | Entra no Loop 4, **sem desconto de combo** na v1 | Desconto de bundle exige motor de promoção composto → growth |
| Home do storefront | Rota **nova** em `(public)` | Não existe `page.tsx` no grupo `(public)` — a prévia assumia modificar algo inexistente |
| Provador virtual | Adiado para growth (Loop 9), versão simplificada | Alto esforço/baixa certeza de valor vs. guia de medidas bem-feito |
