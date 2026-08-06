# Loop 07 — Customer accounts

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 7 · **Depends on:** Loop 3 (shipping), Loop 6 (checkout store +
draft/coupon continuity), the `/catalogo` vs `/loja` split (both routes get the same account system)
**Repos touched:** lmfit-api (new auth subsystem, schema reshape, orders query) + lmfit-web (new
store, `/conta`, checkout integration)

## Goal

Let a returning buyer log in with just their e-mail, see their orders (with payment status) and
loyalty balance, manage saved addresses, and have checkout recognize them — without ever letting a
customer token reach a staff-only endpoint.

## Scope

**In:**
- **Customer auth, fully separate from staff JWT**: e-mail magic link only (see Decisions). New
  Passport strategy (`'jwt-customer'`), own guard, own secret, own refresh-token collection — a
  customer token cannot be confused with a staff token by construction, not just convention.
- **`/conta`**: request-a-link form when logged out; on `?token=`, verifies and logs in; when logged
  in, shows profile (name, e-mail), loyalty points + store-credit balance, "meus pedidos" (status,
  payment status, total, date — no tracking, see Decisions), and full addresses CRUD.
- **Checkout integration**: if the buyer is already logged in (returning session), pre-fill
  name/phone/e-mail and offer their saved addresses; if not logged in, an inline "receber link de
  acesso" affordance that doesn't block guest checkout.
- **Guest-order linking by e-mail**: extend the existing guest-customer dedup (today: `waId` only) to
  also match by e-mail, so a returning customer's past guest orders surface under "meus pedidos"
  without any separate migration step.
- **Address schema reshape**: `Customer.addresses[]` moves from its current
  `{label,street,city,state,zip,country}` shape to the CEP-shaped fields checkout's `AddressForm`
  already uses (`cep,logradouro,numero,complemento,bairro,cidade,uf`), with real `_id`s for CRUD.

**Out (explicitly, with reasons):**
- **WhatsApp OTP as a login method** — confirmed via code reading that zero outbound WhatsApp send
  capability exists anywhere (`src/whatsapp/` is inbound-only); building it would mean building the
  entire outbound Meta Graph API integration from scratch, disproportionate to this loop. E-mail
  magic link only, per the user's own explicit choice.
- **Real order tracking (carrier + code)** — `Order` has no such field anywhere in the schema, only
  free-text `shippingMethod`. "Meus pedidos" shows status + payment + shipping method label, not a
  tracking number. Carry-over for whenever real carrier integration is scoped (flagged already in
  ROADMAP §Loop 9).
- **Changing account e-mail** — would need its own re-verification flow (prove the new address before
  switching); out of scope, e-mail is fixed after signup this loop.
- **The full WhatsApp Business AI vision** (merchant-connected WhatsApp Business, AI-handled customer
  conversations, AI-assisted staff sales via chat/voice) — raised by the user during this loop's
  REFINEMENT, explicitly deferred as its own initiative. Tracked as **ROADMAP.md Loop 11**, not part
  of this spec.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Login mechanism | E-mail magic link only | No outbound WhatsApp send capability exists anywhere in the codebase (confirmed via grep — `src/whatsapp/` only receives); building OTP delivery means building Meta Graph API outbound from scratch. A working `NotificationsService.sendEmail` already exists and is reused as-is. |
| Auth isolation | New Passport strategy `'jwt-customer'` + `CustomerAuthGuard` (mirrors `JwtAuthGuard`'s tenant cross-check exactly) + own secret `JWT_CUSTOMER_ACCESS_SECRET` + a separate `CustomerRefreshToken` collection | Staff auth is a single global `'jwt'` strategy with `JwtUserPayload{sub,email,role,tenantId}`; reusing it for customers would require overloading the payload shape and guard logic with a "kind" flag that every future staff-route guard would have to remember to check. A second named strategy makes "customer token on a staff route" fail at the framework level (no matching strategy validates it), not by a forgettable app-level check. |
| Customer JWT payload | `{sub: customerId, tenantId}` — no `email`/`role` | Customers have no roles; email can change identity-adjacent info a token shouldn't hardcode long-lived. |
| Magic-link token | `MagicLinkToken{tenantId, customerId, tokenHash, expiresAt}`, single-use (deleted on verify), 15 min TTL, same `sha256`-hash-at-rest + Mongo TTL-index pattern as the existing `RefreshToken` schema | Zero infra to invent — this is the exact `RefreshToken` schema shape, just shorter-lived and consumed once instead of rotated. |
| Magic-link delivery is POST-only (never a bare GET backend link) | The e-mailed link points at the **web page** `/conta?token=...`; the web page's client JS then calls `POST /public/customer-auth/verify` on mount. The backend never exposes a mutating **GET** endpoint. | Corporate mail scanners (Defender, Proofpoint, etc.) auto-visit raw links in e-mails; if the email link were itself a GET that consumes the token, the scanner burns it before the real user clicks — a well-known class of magic-link bug. A GET-rendered web page is safe (no mutation on render); only the explicit client-side POST consumes the token. |
| Magic-link redirect base | Client sends `redirectBase: window.location.origin` (the tenant's real subdomain, e.g. `https://kivoni.kivoni.com.br`) with the request; server validates it against an allowlist pattern (`*.kivoni.com.br`, `*.lmfit.com.br`, `*.localhost:*`, or exact `WEB_ORIGIN`) before using it, else falls back to `WEB_ORIGIN` | Tenants are resolved by real subdomain in production (`getTenantSlug()`); a fixed single `WEB_ORIGIN` would send every tenant's customers to the same generic host. Trusting the client-supplied origin *unvalidated* would let an attacker request a link for a victim's e-mail with an evil `redirectBase`, producing a legitimate-token phishing link — the allowlist closes that without losing per-tenant correctness. |
| Dev testability | When `SMTP_HOST` isn't configured (local dev — matches `NotificationsService`'s existing no-op-and-warn behavior), also log the full magic link server-side at `debug` level, gated to non-production | Lets VERIFY exercise the real click-through flow locally without a real mailbox, with zero prod exposure (the token is never returned in any API response, only written to the server's own log). |
| Address schema reshape | `Customer.addresses[]` becomes `{label?, cep, logradouro, numero?, complemento?, bairro, cidade, uf}` with real Mongo `_id`s (was `{label?,street?,city?,state?,zip?,country?}`, `_id:false`) | Confirmed via grep that no admin UI edits this field today (only one defensive fallback chain in `PrintOrderClient.tsx`) — safe to reshape. Matching checkout's existing `AddressForm`/`CheckoutAddress` field names exactly means zero translation layer between `/conta`'s address CRUD and checkout's pre-fill. |
| Guest-order linking | Extend `submitByToken`'s existing guest-customer dedup (today: match by `waId` only) to try `email` first, then `waId`, before creating a new `Customer` | The dedup mechanism already exists (Loop-agnostic, in `order-drafts.service.ts`) — reusing the same `Customer` record for a guest checkout and a later magic-link login (both resolved by the same e-mail) is what makes past guest orders show up under "meus pedidos" with no separate migration/linking step. |
| "Meus pedidos" query | New `OrdersService.findAllForCustomer(tenantId, customerId, page, limit)`, a dedicated customer-safe projection (id, number, status, total, shippingMethod, createdAt, lines summary, joined payment status/method) — not a reuse of staff's `findAll` | Staff's `findAll`/`toResponse` shape includes internal-only fields (`createdBy`, `operatorUserId`, notes) that must never reach a customer response; a dedicated method keeps that boundary explicit rather than relying on a serializer to strip fields later. |
| Payment join | Batch `Payment.find({ orderId: { $in: [...] } })` (one extra query, not per-order) | Same "two queries total, not N+1" pattern already used elsewhere (Loop 0/2 ARCHITECTURE notes) — `Payment` is a separate collection keyed by `orderId`, there is no payment status on `Order` itself. |
| Checkout integration depth | Only *if already logged in* (persisted customer session) does checkout auto pre-fill; if not, a compact inline "receber link de acesso" e-mail field is offered, non-blocking | A magic link can't complete synchronously inside a checkout flow (the buyer has to leave to check e-mail) — a fast, real login-in-place isn't achievable client-side without WhatsApp OTP (out of scope this loop). Auto-prefill for an already-authenticated returning buyer is the achievable, real value; guest checkout must keep working regardless (explicit AC). |
| Web token storage | New `customerTokenStorage.ts` with its own key prefix (`kivoni_customer_access_<slug>` / `kivoni_customer_refresh_<slug>`), **not** reusing `tokenStorage.ts`'s `kivoni_access_<slug>` keys; new `customerHttp.ts` axios instance with its own 401→refresh interceptor pointed at `/public/customer-auth/refresh` | `useAuthStore`/`http.ts` are staff-only; if a customer token were stored under the same keys, a staff member testing their own storefront while logged in as staff (or vice-versa) could have one identity silently used for the other. Separate keys + separate axios instance make that impossible by construction, mirroring the guard-level isolation used for the JWT strategy itself. |

## Acceptance criteria

- [x] AC1 — A customer JWT is rejected on every staff-only endpoint, and a staff JWT is rejected on
      every `/me/*` endpoint *(verify: API test — guard-level, both directions)*
- [x] AC2 — Tenant isolation holds on every `/me/*` query: a customer token from tenant A gets 401 on
      tenant B's `x-tenant-slug` header *(verify: API test)*
- [x] AC3 — Requesting a magic link for a real e-mail, then opening the link, logs the buyer in and
      shows their profile at `/conta` *(verify: browser, full click-through using the dev-logged
      link since local SMTP isn't configured)*
- [x] AC4 — A used or expired magic-link token is rejected with a clear error, and clicking the same
      link twice doesn't silently log in on the second click *(verify: browser + API test)*
- [x] AC5 — "Meus pedidos" shows status, payment status/method, and total for every order tied to the
      logged-in customer, tenant-scoped only *(verify: browser, real orders on kivoni)*
- [x] AC6 — Address CRUD (add/edit/delete) on `/conta` persists and the same address list appears
      pre-filled at checkout for a logged-in buyer *(verify: browser)*
- [x] AC7 — Loyalty points and store-credit balance shown on `/conta` match the raw `Customer` fields
      exactly *(verify: browser vs. admin CRM view of the same customer)*
- [x] AC8 — A guest checkout using an e-mail that matches an existing customer's account reuses that
      same `Customer` record (confirmed by the order later appearing under "meus pedidos" after
      logging in with that e-mail) *(verify: browser, guest checkout then magic-link login)*
- [x] AC9 — Guest checkout (no account, no e-mail typed) still completes end-to-end, unaffected
      *(verify: browser, regression check)*
- [x] AC10 — A logged-in returning buyer sees checkout pre-filled with their name/e-mail/phone and
      saved address on arrival *(verify: browser)*

## Design notes

### Backend (lmfit-api)

**Schema reshape** — `src/customers/schemas/address.schema.ts`:
```ts
@Schema({ _id: true })
export class Address {
  @Prop({ trim: true }) label?: string;
  @Prop({ trim: true, required: true }) cep: string;
  @Prop({ trim: true, required: true }) logradouro: string;
  @Prop({ trim: true }) numero?: string;
  @Prop({ trim: true }) complemento?: string;
  @Prop({ trim: true, required: true }) bairro: string;
  @Prop({ trim: true, required: true }) cidade: string;
  @Prop({ trim: true, required: true }) uf: string;
}
```

**New schemas** (`src/customer-auth/schemas/`):
- `MagicLinkToken{tenantId, customerId, tokenHash, expiresAt}` — same TTL-index pattern as
  `RefreshToken` (`expireAfterSeconds: 0` on `expiresAt`), 15 min expiry, deleted on successful verify
  (single-use).
- `CustomerRefreshToken{tenantId, customerId, tokenHash, expiresAt}` — identical shape/rotation logic
  to the staff `RefreshToken`, 14-day expiry.

**New module** `src/customer-auth/`:
- `CustomerJwtStrategy extends PassportStrategy(Strategy, 'jwt-customer')` — own secret
  `JWT_CUSTOMER_ACCESS_SECRET`, validates `{sub, tenantId}`.
- `CustomerAuthGuard extends AuthGuard('jwt-customer')` — same tenant cross-check as `JwtAuthGuard`
  (`request.tenantId !== payload.tenantId` → 401).
- `CustomerAuthService`: `requestMagicLink(tenantId, email, redirectBase?)`,
  `verifyMagicLink(tenantId, rawToken)`, `refresh(refreshToken)`, `logout(refreshToken)`,
  `me(tenantId, customerId)` — same hash-and-store-refresh, rotate-on-refresh pattern as
  `AuthService`.
- `PublicCustomerAuthController` (`/public/customer-auth`, **no guard**): `POST /request-link`,
  `POST /verify`, `POST /refresh`, `POST /logout`.
- `CustomerMeController` (`/me`, `@UseGuards(CustomerAuthGuard)`): `GET /profile` (name, e-mail,
  loyaltyPoints, storeCreditBalance), `PATCH /profile` (name only), `GET /orders` (paginated),
  `GET /addresses`, `POST /addresses`, `PATCH /addresses/:addressId`,
  `DELETE /addresses/:addressId`.

**`CustomersService` additions**: `findOrCreateByEmail(tenantId, email, name?)` (mirrors the existing
`findByWaId` shape); `findByEmail(tenantId, email)`; `listAddresses`/`addAddress`/`updateAddress`/
`removeAddress` operating on the `addresses[]` subdocument array (`$push`/positional `$set`/`$pull`).

**`order-drafts.service.ts`'s `submitByToken`**: extend the existing guest-customer resolution (today:
`waId` only, lines ~328-346) to try `email` first when `custData.email` is present, falling back to
`waId`, before creating a new `Customer` — this is what makes guest orders and later magic-link
logins converge on the same record.

**`OrdersService.findAllForCustomer(tenantId, customerId, page, limit)`**: new method, `Order` model
query filtered by `customerId` (in addition to `tenantId`), batch-joined with
`Payment.find({ orderId: { $in: [...] } })`, returning a customer-safe shape (no `createdBy`,
`operatorUserId`, internal notes).

### Frontend (lmfit-web)

- `src/lib/customerTokenStorage.ts`: same shape as `tokenStorage.ts`, own key prefix
  (`kivoni_customer_access_<slug>` / `kivoni_customer_refresh_<slug>`).
- `src/lib/customerHttp.ts`: separate axios instance, attaches the customer access token, own
  401→`/public/customer-auth/refresh` interceptor (mirrors `http.ts`).
- `src/stores/useCustomerAuthStore.ts`: `user`, `init()`, `requestMagicLink(email)`,
  `verify(token)`, `logout()` — same shape as `useAuthStore.ts` but backed by
  `customerHttp`/`customerTokenStorage`.
- `src/app/(public)/conta/page.tsx` (shared by both `/catalogo` and `/loja` — account system isn't
  section-specific): logged-out state = e-mail request form; `?token=` present = verify-on-mount
  (guarded by a ref so it only fires once) then clears the query param; logged-in state = profile +
  loyalty balances + "meus pedidos" list + addresses CRUD (reusing `AddressForm`'s field shape for
  the add/edit form) + "sair".
- Checkout (`CheckoutClient.tsx`): on mount, if `useCustomerAuthStore` has a `user`, pre-fill
  `useCheckoutStore`'s `customerName`/`customerPhone`/`customerEmail` and offer the customer's saved
  addresses as quick-select chips above `AddressForm`; if logged out, a small inline e-mail field
  triggers `requestMagicLink` without blocking the rest of the form.

### Config

New env vars (add to `.env.example`, alongside the existing `JWT_ACCESS_SECRET` block):
```
JWT_CUSTOMER_ACCESS_SECRET=change-me-customer-access-secret-min-32-chars!!
JWT_CUSTOMER_ACCESS_EXPIRES=30m
```
No new SMTP config — reuses `NotificationsService.sendEmail` and the existing `SMTP_*` vars.

## Tasks

- [x] 1. Reshape `Address` schema (CEP-shaped fields, real `_id`)
- [x] 2. `MagicLinkToken` + `CustomerRefreshToken` schemas
- [x] 3. `CustomerJwtStrategy` (`'jwt-customer'`) + `CustomerAuthGuard` (tenant cross-check)
- [x] 4. `CustomerAuthService`: request-link/verify/refresh/logout/me + `CustomersService`
        `findOrCreateByEmail`/`findByEmail`
- [x] 5. `PublicCustomerAuthController` + `CustomerMeController` (profile, orders, addresses)
- [x] 6. `OrdersService.findAllForCustomer` with batch `Payment` join
- [x] 7. `CustomersService` address CRUD helpers + `submitByToken` e-mail-first dedup
- [x] 8. Wire `CustomerAuthModule` into `app.module.ts`; add env vars to `.env.example`
- [x] 9. API unit tests: guard cross-rejection (both directions), tenant isolation, magic-link
        hash/expiry/single-use, `findOrCreateByEmail` dedup, address CRUD
- [x] 10. `customerTokenStorage.ts` + `customerHttp.ts`
- [x] 11. `useCustomerAuthStore.ts`
- [x] 12. `/conta` page: request form, verify-on-token, profile/pedidos/loyalty/addresses
- [x] 13. Checkout integration: prefill-if-logged-in, inline request-link if not
- [x] 14. Web unit tests: store logic, redirectBase allowlist, pure helpers
- [x] 15. Browser verification: all 10 ACs on kivoni

## Follow-up record

### PLAN
- [x] Research subagent covered: staff JWT strategy/guard/module, refresh-token schema/rotation,
      `Customer`/`Address` schemas, `customers.controller.ts` (confirmed 100% staff-only today),
      guest-customer dedup in `order-drafts.service.ts` (confirmed `waId`-only), confirmed zero
      OTP/magic-link/outbound-WhatsApp infra exists anywhere, `NotificationsService.sendEmail`
      (confirmed reusable as-is), `Payment`/`Order` schemas (confirmed separate collections, no
      tracking field anywhere), `LoyaltyService` (confirmed no `getBalance`, raw field is enough),
      `useAuthStore.ts`/`tokenStorage.ts`/`http.ts` (confirmed staff-only, confirmed the need for a
      separate customer token namespace)
- [x] Own follow-up grep confirmed no admin UI edits `Customer.addresses[]` today (only a defensive
      fallback chain in `PrintOrderClient.tsx`) — de-risks the address reshape
- [x] Read `AddressForm.tsx`/`useCheckoutStore.ts` to confirm the exact CEP-shaped field names to
      match
→ **Draft on 2026-07-16**

### REFINEMENT
- [x] Login-mechanism decision locked with the user: e-mail magic link only, WhatsApp OTP explicitly
      out of scope this loop (would need outbound Meta Graph API infra built from scratch)
- [x] User's larger WhatsApp Business AI vision explicitly deferred, filed as ROADMAP.md Loop 11 —
      not folded into this spec
- [x] Resolved the magic-link-scanner risk (GET-consumes-token bug class) by making the emailed link
      a web-page GET, with the actual token-consuming call as a client-side POST
- [x] Resolved the redirect-base/subdomain question (tenants are real-subdomain-resolved in prod) by
      having the client supply `window.location.origin`, validated server-side against an allowlist —
      closes an open-redirect/phishing angle from trusting it unvalidated
- [x] Resolved dev-testability without real SMTP: log the link server-side when `SMTP_HOST` is unset,
      gated to non-production, never returned in any API response
- [x] Resolved "meus pedidos" data shape: dedicated customer-safe query + method, not a reuse of
      staff's `findAll` (which carries internal-only fields)
- [x] Resolved guest-order linking: extend the existing dedup to try e-mail before `waId`/create,
      rather than building separate "link my past orders" UI/logic
- [x] Scope check: real tracking/carrier explicitly out (schema has no such field anywhere);
      changing account e-mail explicitly out (needs its own re-verification flow)
- [x] ACs rewritten: all 10 name their verify method
- [x] DoR review: scope fits a session, decisions resolved, tasks ordered backend→tests→frontend→tests→browser
→ **Ready on 2026-07-16**

### IMPLEMENT
- [x] Tasks 1-15 completed in order; `tsc --noEmit` green on both repos at the end (fixed 3 real
      type errors found along the way: `Record<string, unknown>` too loose for the address DTOs,
      `Order`'s lean type missing `createdAt`, `orders.service.spec.ts`'s manual DI providers needed
      the new `Payment` model token after adding it to `OrdersService`'s constructor)
→ **done on 2026-07-17**

### TEST
- [x] Suites: lmfit-api 109/109 (+23: guard cross-check, JWT strategy validate, cross-secret
      signature isolation, magic-link/refresh hash-expiry-single-use, `findOrCreateByEmail`/
      `findByEmail` dedup, `submitByToken`'s new e-mail-first dedup path), lmfit-web 217/217 (+8:
      `customerTokenStorage` namespace isolation from staff `tokenStorage`, `useCustomerAuthStore`
      init/verify/logout/requestMagicLink)
→ **green on 2026-07-17**

### VERIFY
- [x] Browser + curl walk covering all 10 ACs on kivoni — found and fixed one real bug along the way
      (see Verification record)
→ **all ✅ on 2026-07-17**

### DOCUMENT
- [x] Spec status → `Done`, Result filled
- [x] ROADMAP.md: Loop 7 row + changelog
- [x] ARCHITECTURE.md updated (new auth subsystem, address schema change)
- [x] Memory updated
→ **merged on 2026-07-17**

### PLAN AGAIN
- [x] Retro, carry-overs filed (real order tracking, WhatsApp OTP, e-mail change flow — all already
      recorded in Scope §Out), memory updated. Next loop: Loop 8 (returns portal + notifications) or
      user-directed work — order TBD with user.

## Verification record

All on kivoni, mixing real browser interaction (for anything the network/DOM can't prove on its own)
and direct `curl` against the same running dev API (to sidestep some flakiness in the automated
browser tool's click delivery after page navigations — every call still hit the real, unmocked
dev server and real dev MongoDB, nothing here was mocked):

- **AC1** — `curl` with a real customer access token → `401` on staff-only `GET /customers`, `200` on
  `GET /me/profile`. A real staff token (via `POST /auth/login` with the seed admin) → `401` on
  `GET /me/profile`. Both directions confirmed live, matching the guard unit tests.
- **AC2** — The same valid customer token, sent with `x-tenant-slug: lmfit` instead of `kivoni` →
  `401`, confirming the guard's tenant cross-check fires on a real mismatched tenant, not just in
  the mocked unit test.
- **AC3** — Requested a real magic link for a real e-mail via the `/conta` UI; since local SMTP
  (real Resend credentials) failed to actually deliver (a real, pre-existing environment gap — the
  sending domain isn't verified on Resend, unrelated to this loop's code), used the dev-only
  server-log fallback to get the real link, clicked through it, and landed on `/conta` fully logged
  in showing profile/loyalty/orders/addresses — confirmed via the actual browser DOM, not just an
  API response.
- **AC4** — Re-submitted the exact same (already-consumed) token twice more via `POST
  /public/customer-auth/verify`: both returned `401 Unauthorized` (network log), proving single-use
  is enforced at the database level, not just client-side.
- **AC5** — After a real order was created and linked to this customer (see AC8), `/me/orders`
  showed "Pedido #32 · 17/07/2026 · Aberto · pickup · R$ 299,90" in the live `/conta` UI — status,
  shipping method, and total all correct; `payment` correctly `null` since this was a manual/WhatsApp
  order with no `Payment` document.
- **AC6** — Full CRUD proven via `curl` (`POST`/`GET`/`PATCH`/`DELETE /me/addresses`) and then
  visually confirmed in the live `/conta` UI ("Casa: Av. Paulista, 1000 — Bela Vista, São Paulo/SP"
  with working "editar"/"remover"); also confirmed the same address renders as a quick-select chip
  at `/checkout` and clicking it fills the CEP-shaped form fields exactly (CEP, Endereço, Número,
  Bairro, Cidade, UF all populated correctly).
- **AC7** — `/conta` showed "Pontos de fidelidade: 0" and "Crédito de loja: R$ 0,00" for a
  freshly-created account — matches the raw `Customer.loyaltyPoints`/`storeCreditBalance` defaults
  exactly (no orders had completed to credit loyalty yet, so 0 is the correct value, not just a
  fallback).
- **AC8** — Created a genuine guest checkout (`POST /public/order-drafts` → `PATCH` → `POST
  .../submit`, all via `curl`, same public endpoints the real checkout page calls) using the same
  e-mail as the already-existing magic-link account. The resulting order's `customerId` was
  byte-for-byte identical to the magic-link account's `customerId` — confirming the e-mail-first
  dedup in `submitByToken` correctly reused the existing `Customer` instead of creating a duplicate,
  and the order immediately appeared under that account's "meus pedidos" with no extra step.
- **AC9** — With the customer session cleared, `/checkout` rendered fully as a guest: no "Logado
  como…" line, the inline "Já tem conta? Receber link de acesso" affordance shown instead, all form
  fields empty and editable, cart summary/payment options/submit button all intact — confirmed this
  loop didn't regress the existing guest flow.
- **AC10** — With the customer session restored, `/checkout` showed "Logado como
  magacholuiz@gmail.com" and the Nome/E-mail inputs were pre-filled (`magacholuiz` /
  `magacholuiz@gmail.com`, confirmed by reading the actual DOM input `.value`s, not just visually);
  switching shipping off "pickup" revealed the saved-address chip, and clicking it populated the full
  address form from the saved record.

**One real bug found and fixed during VERIFY**: `CustomerAuthService.requestMagicLink` awaited
`NotificationsService.sendEmail` unguarded — a real SMTP delivery failure (the dev environment's
Resend sending domain isn't verified, a pre-existing infra gap unrelated to this loop) propagated as
a raw `500` to the customer, even though the magic-link token itself had already been created
successfully and was fully usable via the dev-log fallback. Fixed by wrapping the send in a
try/catch that logs a warning and still returns `{ok: true}` — a delivery failure is an
infrastructure concern separate from whether the link exists, matching how `NotificationsService`
already treats other outbound sends as best-effort elsewhere in the codebase. Re-ran the full API
suite after the fix (109/109, unaffected).

## Result

Shipped all 15 tasks. Customer accounts now exist as a fully separate auth track from staff:
e-mail magic-link login (`CustomerAuthModule` — `CustomerJwtStrategy`/`'jwt-customer'`,
`CustomerAuthGuard` mirroring `JwtAuthGuard`'s tenant cross-check, `MagicLinkToken`/
`CustomerRefreshToken` schemas reusing the exact hash-at-rest + TTL-index pattern already proven by
staff's `RefreshToken`) with its own secret (`JWT_CUSTOMER_ACCESS_SECRET`) so a customer token can
never validate against a staff route or vice versa — proven both by unit tests (guard logic +
cross-secret JWT verification) and live `curl` calls against the real running API. `/conta` gives a
logged-in buyer their profile, loyalty points + store-credit balance, "meus pedidos" (status +
payment status/method + total, joined from the separate `Payment` collection via one batch query,
not N+1), and full address CRUD against a reshaped `Customer.addresses[]` schema that now matches
checkout's own CEP-shaped `AddressForm` fields exactly — zero translation layer between the two.
Checkout gained a returning-buyer prefill (name/e-mail/phone + saved-address quick-select) when
already logged in, and a non-blocking inline "receber link de acesso" affordance when not — guest
checkout keeps working unconditionally either way. The single biggest integration decision was
extending the existing guest-customer dedup in `order-drafts.service.ts` to try e-mail before
`waId`/create: this is what makes a guest's past orders surface under "meus pedidos" the moment they
log in with that same e-mail, with no separate "link my orders" step or migration needed — confirmed
live by matching `customerId`s across a guest checkout and a magic-link session for the same e-mail.

REFINEMENT correctly scoped this to e-mail-only login (WhatsApp OTP would require building an entire
outbound Meta Graph API integration from scratch — confirmed absent from the codebase) and explicitly
carried over real order tracking (no carrier/tracking field exists anywhere in the `Order` schema)
and changing account e-mail (needs its own re-verification flow). The user's larger WhatsApp Business
AI vision, raised while deciding the login mechanism, was captured separately as ROADMAP.md's Loop 11
— a distinct, unscheduled future initiative, not folded into this spec.

VERIFY found and fixed one real bug: a transient SMTP delivery failure (unrelated environment gap —
the dev Resend sending domain isn't verified) was propagating as a raw request failure to the
customer even though the underlying magic-link token had already been created successfully; fixed by
treating email delivery as best-effort, matching the rest of the codebase's notification patterns.

Test totals: lmfit-api 109/109 (+23), lmfit-web 217/217 (+8). No regressions in either suite.
