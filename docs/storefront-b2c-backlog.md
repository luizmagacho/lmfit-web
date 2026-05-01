# Backlog: loja B2C “estilo Nuuvem” (API + web + mobile)

Implementar **depois** do CRM interno estável. Cada item envolve **lmfit-api**, **lmfit-web** (rotas públicas) e opcionalmente **lmfit-mobile**.

## Fase 1 — Descoberta e PDP

- API: catálogo público enriquecido (SEO fields, `slug`, galeria, variantes, estoque visível conforme política).
- Web: página de produto (`/p/[slug]`) com Core Web Vitals.
- Mobile: PDP nativa ou WebView controlada.

## Fase 2 — Carrinho e checkout

- API: carrinho (sessão/anônimo + merge ao login), cálculo de frete, cupom, reserva de estoque.
- Web: carrinho persistente, checkout multi-etapas.
- Mobile: mesmo fluxo reduzido.

## Fase 3 — Conta do cliente

- API: `GET /me/orders`, cancelamento dentro da política, endereços.
- Web: área logada `/conta/*`.
- Mobile: aba “Pedidos”.

## Fase 4 — Confiança

- Reviews, FAQ, política de troca, rastreamento.
- API: moderação de review, integração transportadora.

## Transversal

- Pagamentos (PSP), antifraude, e-mails transacionais, LGPD/cookies.
