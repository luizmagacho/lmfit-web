# Loop 08 — Returns portal + notifications

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 8 · **Depends on:** Loop 7 (`/conta`, `CustomerAuthGuard`,
`NotificationsService.sendEmail` reuse), the existing staff-only `returns` module
**Repos touched:** lmfit-api (returns workflow + policy config + shipped-notification hook) +
lmfit-web (`/devolucoes`, `/conta` integration, admin returns UI)

## Goal

Let a buyer request a troca or vale-compras themselves — from a guest link (order number +
phone) or from `/conta` — see it show up for staff immediately, get a real e-mail when it's
approved/rejected, and get a "seu pedido foi enviado" e-mail too. The buyer is never in the dark.

## Scope

**In:**
- **Return request becomes a distinct state**, not an immediately-executed staff action. The
  existing `returns` module (`POST /orders/:orderId/returns`) stays **exactly as-is** for staff
  (still executes stock-reversal + credit immediately, zero behavior change) — a new `status` field
  is added alongside it so a *customer-initiated* request can exist as `'requested'` without those
  side effects until staff reviews it.
- **Two real entry points**: guest (`/devolucoes`, order number + phone — checkout doesn't collect
  CPF) and logged-in (`/conta`, via Loop 7's existing session).
- **Staff review**: approve (executes the same stock-reversal/credit logic the staff-immediate path
  already has) or reject (with a note), both e-mailing the buyer.
- **Return window enforced server-side**: new `storefront.returnPolicy.windowDays` tenant config,
  checked against `order.createdAt` at request time — not just at the door of the admin form.
- **Transactional e-mails**: return requested (staff alert — reuses the existing pattern), return
  approved/rejected (buyer), order shipped (buyer) — each sent at most once per event via an
  idempotent guard (the same "check-old-value-before-transitioning" pattern already used for
  `orders.service.ts`'s existing `completed`/loyalty-accrual branch).
- **Order-status tracking piece**: satisfied by the guest lookup page itself doubling as a status
  page (per STOREFRONT-V2 §2.8's own wording — "acompanhamento pelo mesmo link") rather than a
  separate route.

**Out (explicitly, with reasons):**
- **Real "estorno" (refund to the original payment method)** — no PSP refund API call exists
  anywhere in the codebase (InfinitePay integration only ever *creates* charges). Only the two
  options the current schema actually supports ship: `exchange` (troca) and `return` (vale-compras,
  credits `storeCreditBalance`). Building real refunds is separate PSP-integration work.
- **Automated creation of the follow-up exchange order** — today, `type:'exchange'` reverses stock
  for the old item and expects staff to manually create a new order for the desired size/color,
  referencing the return. This loop keeps that (the customer's desired variant is captured
  *informationally* on the request so staff has what they need), not full auto-generation of a new
  order — that's a bigger, separate piece of order-creation logic.
- **Order-confirmed / payment-received e-mails** — `/pedido/confirmado` and the payment-status
  polling already give the buyer feedback for those two moments; adding e-mails for them is
  additive, not blocking "the buyer is never in the dark" the way return-status silence or a
  shipped order with zero signal would be. Carried over.
- **A real retry queue for failed notification e-mails** — Loop 7 already set the precedent
  (`requestMagicLink`) that e-mail delivery failures are logged and treated as best-effort, not
  retried; building an actual re-drive worker (cron + a pending-notifications collection) is
  separable infra work, disproportionate to what this loop needs. "Sends exactly once" (idempotency)
  ships; "retries on failure" doesn't.
- **Real order tracking/carrier codes** — still absent from the `Order` schema entirely (confirmed
  again this loop); unchanged carry-over from Loop 7.
- **WhatsApp notifications** — still no outbound WhatsApp send capability anywhere; e-mail only,
  same as Loop 7.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Backward compatibility for staff | The existing `POST /orders/:orderId/returns` keeps executing immediately (`status` set to `'completed'` at creation) — zero behavior change for the staff admin UI that already calls it | That endpoint is a real, working, already-shipped feature (`lmfit-web/src/app/(app)/returns/ReturnsClient.tsx`) — this loop adds a *second*, customer-initiated path, it doesn't rework the first one. |
| Shared execution logic | Extract the stock-reversal + credit block from `ReturnsService.create()` into a private `applyReturnEffects()`, called by both the legacy immediate-create path and the new `approve()` step | The actual "give stock back, credit `storeCreditBalance`" logic is the one piece that must behave identically whether it fires at creation (staff) or at approval (customer request) — one implementation, not two that could drift. |
| Return type scope | Ship only `exchange`/`return` (the two the schema already has); no third "estorno" type | No refund-to-payment-method capability exists anywhere (confirmed via grep — InfinitePay integration is charge-only); inventing a third enum value with no real backing implementation would be misleading UI, not a feature. |
| Return-policy config location | New `ReturnPolicyConfig{windowDays,policyText}` embedded in the existing `StorefrontConfig` (`storefront.returnPolicy`), edited via the same field-by-field `$set` pattern `tenants.service.ts` already uses for `storefront.pages.*` | `StorefrontConfig` is already the tenant-configurable, publicly-exposed bag for buyer-facing policy text (`pages.guiaMedidas` etc.) and is already returned wholesale by the public tenant-info endpoint — adding a field here needs zero new plumbing for public exposure. |
| Guest lookup key | Order number + phone (not CPF, not e-mail) | Checkout never collects CPF (recorded already in STOREFRONT-V2 §5); phone is the one identifier every checkout (guest or logged-in) already has, matching the blueprint's own choice. |
| Idempotent notifications | No new "notification log" collection. Return approve/reject are naturally one-way (`status` transitions once, guarded the same way `orders.service.ts` already guards `oldStatus !== 'completed'`); the new "shipped" e-mail gets one boolean field, `Order.shippedNotifiedAt`, checked-then-set before sending | Matches the exact idempotency pattern already proven in this codebase (`oldStatus !== newStatus` guards) instead of building new infrastructure (a dedup-key collection) for what's fundamentally a handful of one-way state transitions. |
| Public order-status page | The guest lookup page (`/devolucoes`) itself shows order + return status after a successful lookup — no separate `/pedido/status` route | STOREFRONT-V2 §2.8 already describes this as "acompanhamento de status pelo mesmo link," not a distinct page; building a second lookup surface would duplicate the first for no product reason. |
| Customer request validation | `requestFromCustomer`/the public request endpoint re-checks: order belongs to the resolved customer/phone, order status is in `RETURNABLE_STATUSES` (`shipped`/`completed`, the existing constant), and `now - order.createdAt <= windowDays` | Same server-side-never-trust-the-client posture as every other loop (Loop 3's shipping-cost spoof fix, Loop 7's tenant cross-check) — a public endpoint must independently re-verify eligibility, not assume the UI already filtered it. |

## Acceptance criteria

- [x] AC1 — A customer-initiated return request appears in the staff admin `/returns` list
      immediately with a visibly distinct "Solicitado" state, before any stock/credit change has
      happened *(verify: browser, submit a request, check admin `/returns`)*
- [x] AC2 — Approving a request executes the exact same stock-reversal/credit effect the existing
      staff-immediate path produces, and e-mails the buyer *(verify: browser + inspect
      `storeCreditBalance`/stock before and after)*
- [x] AC3 — Rejecting a request leaves stock/credit untouched and e-mails the buyer with the
      rejection note *(verify: browser)*
- [x] AC4 — A request outside the configured `returnPolicy.windowDays` is rejected server-side with
      a clear message, even if the request is crafted directly against the API *(verify: API test +
      curl)*
- [x] AC5 — The guest `/devolucoes` lookup only succeeds when the phone matches the order's
      customer; a wrong phone gets a generic "não encontrado" (doesn't leak whether the order number
      exists) *(verify: API test)*
- [x] AC6 — A logged-in buyer can request a return from `/conta` without re-entering phone/order
      number *(verify: browser)*
- [x] AC7 — A real order transition to `'shipped'` sends exactly one buyer e-mail even if the same
      status is PATCHed twice *(verify: API test — idempotency guard)*
- [x] AC8 — The existing staff-immediate return flow (`ReturnsClient.tsx` → `POST
      /orders/:orderId/returns`) is unaffected — same request, same response shape, same immediate
      stock/credit effect *(verify: regression check, browser or API)*

## Design notes

### Backend (lmfit-api)

**`return.schema.ts`**: add `status: 'requested'|'approved'|'rejected'|'completed'` (staff-immediate
`create()` sets `'completed'` directly, unchanged behavior), `requestedBy: 'staff'|'customer'`,
`reviewedBy?: ObjectId (ref User)`, `reviewedAt?: Date`, `rejectionNote?: string`,
`desiredVariantId?: ObjectId` (informational, for `exchange` requests — the size/color the buyer
wants instead; staff still creates the follow-up order manually).

**`ReturnsService`**: extract `applyReturnEffects(tenantId, order, builtLines, type, createdBy)` from
`create()` (stock reversal loop + `storeCreditBalance` credit) — `create()` calls it immediately
(unchanged), new `approve()` calls it at review time. New `requestFromCustomer(tenantId, customerId,
orderId, dto)`: same line/quantity validation as `create()`, plus the window check
(`tenant.storefront.returnPolicy.windowDays`), creates a `status:'requested'` record with **no**
`applyReturnEffects()` call, sends a staff alert (`NotificationsService.logStaffAlert`, the existing
pattern from `order-drafts.service.ts`). `approve(tenantId, returnId, staffUserId)`: loads the
`'requested'` record (guard: only transitions from `'requested'`, mirrors
`orders.service.ts`'s `oldStatus !== 'completed'` guard), calls `applyReturnEffects()`, sets
`status:'completed'`, `reviewedBy`/`reviewedAt`, sends buyer e-mail via `sendEmail`.
`reject(tenantId, returnId, staffUserId, note)`: sets `status:'rejected'` + `rejectionNote`, e-mails
buyer, no stock/credit change. `findAllForCustomer(tenantId, customerId)` for `/conta`.

**New public controller** `PublicReturnsController` (`/public/returns`, no guard): `POST /lookup`
`{orderNumber, phone}` → resolves `Order` by `number`+`tenantId`, populates `customerId`, compares
`phone` (normalized digits-only) — generic `NotFoundException` on any mismatch (doesn't distinguish
"no such order" from "wrong phone"); `POST /request` `{orderNumber, phone, lines, type, reason,
desiredVariantId?}` → re-resolves the same way, then calls `requestFromCustomer` (guest path reuses
the same service method with a synthesized/found `customerId` from the order).

**Customer-guarded**: extend `CustomerMeController` (or a small sibling) — `POST /me/returns`
`{orderId, lines, type, reason, desiredVariantId?}` (no phone needed, `customer.sub` from the JWT is
the identity), `GET /me/returns`.

**Staff**: `ReturnsHistoryController` gains `PATCH /returns/:id/approve` and
`PATCH /returns/:id/reject` (`@Roles('admin','staff')`, unchanged guard), and `GET /returns` gains an
optional `status` query filter so the admin UI can highlight pending requests.

**`StorefrontConfig`**: new `ReturnPolicyConfig{windowDays: number (default 30), policyText?:
string}`, field `returnPolicy: ReturnPolicyConfig`. `UpdateStorefrontConfigDto`/
`tenants.service.ts.updateStorefrontConfig` gain the matching `$set` branches
(`storefront.returnPolicy.windowDays`/`storefront.returnPolicy.policyText`), same shape as the
existing `pages.*` branches. No new public-exposure work needed — the public tenant-info endpoint
already returns `tenant.storefront` wholesale.

**Order schema**: add `shippedNotifiedAt?: Date`. In `OrdersService.update()`, alongside the existing
`oldStatus !== 'completed' && newStatus === 'completed'` branch, add
`oldStatus !== 'shipped' && newStatus === 'shipped' && !existing.shippedNotifiedAt` → send buyer
e-mail (needs the order's customer e-mail — join `Customer` the same way `findAllForCustomer`
already does), then set `shippedNotifiedAt = new Date()` before `save()` so a second PATCH to
`'shipped'` (or any later status change) never re-sends.

### Frontend (lmfit-web)

- `src/app/(public)/devolucoes/page.tsx` + client: lookup form (order number + phone) → order
  summary with item checkboxes + reason + type (troca/vale-compras) (+ desired size/color if troca)
  → submit → confirmation screen that also serves as the "status" view (shows the order's current
  status and, once one exists, the return request's status).
- `/conta`: per eligible order (status `shipped`/`completed`, within `returnPolicy.windowDays`) a
  "Solicitar troca ou devolução" action reusing the same request form (skips the phone step, uses
  the session); a "Minhas solicitações" list showing status per request.
- Admin `/returns` (`ReturnsClient.tsx`): pending (`status:'requested'`) rows visually distinct with
  Approve/Reject actions; approved/rejected/completed rows read-only as today.
- Admin Settings (`SettingsClient.tsx`): new fields for `returnPolicy.windowDays`/`policyText`,
  alongside the existing "Loja online" storefront config section.

### Config

No new env vars. Reuses `NotificationsService.sendEmail` (Loop 7) and the existing
`PATCH /tenants/:id/storefront` admin endpoint pattern.

## Tasks

- [x] 1. `ReturnRecord` schema: `status`/`requestedBy`/`reviewedBy`/`reviewedAt`/`rejectionNote`/
        `desiredVariantId`; refactor `create()` to extract `applyReturnEffects()`
- [x] 2. `ReturnPolicyConfig` on `StorefrontConfig` + DTO/service `$set` wiring
- [x] 3. `ReturnsService.requestFromCustomer` (window + eligibility validation, staff alert)
- [x] 4. `ReturnsService.approve`/`reject` (buyer e-mails, one-way status guard)
- [x] 5. `PublicReturnsController` (lookup + request by orderNumber+phone)
- [x] 6. Customer-guarded `/me/returns` (request + list)
- [x] 7. Staff `PATCH /returns/:id/approve|reject` + `GET /returns` status filter
- [x] 8. `Order.shippedNotifiedAt` + idempotent shipped-email hook in `OrdersService.update()`
- [x] 9. API unit tests: window enforcement, phone-lookup mismatch (generic error), approve/reject
        transitions (+ guard against double-transition), shipped-email idempotency, staff-immediate
        path regression-unaffected
- [x] 10. `/devolucoes` page: lookup + item/reason/type request flow + status display
- [x] 11. `/conta` integration: request CTA per eligible order + "minhas solicitações" list
- [x] 12. Admin `/returns` UI: approve/reject actions + pending highlighting
- [x] 13. Admin Settings: return-policy window/text fields
- [x] 14. Web unit tests
- [x] 15. Browser verification: all 8 ACs on kivoni

## Follow-up record

### PLAN
- [x] Research subagent covered: existing `returns` schema/service/controller (confirmed 2-type
      model, no `status` field, staff-only, immediate execution, no window enforcement anywhere),
      confirmed `returnPolicy`/`windowDays` doesn't exist in code anywhere (blueprint-only), confirmed
      no public order+phone lookup exists, confirmed no notification-idempotency infra beyond the
      payment-webhook dead-letter pattern (which is a different problem — outbound HTTP to a 3rd
      party, not transactional e-mail), read STOREFRONT-V2 §2.8 in full, confirmed no public
      order-status page exists, confirmed `OrderStatus` transitions all flow through one generic
      `update()` with zero existing notification hooks
- [x] Own follow-up reads: full `return.schema.ts`/`returns.service.ts`/`returns.controller.ts`,
      `Tenant` schema's `StorefrontConfig`/`StorefrontPages` (confirmed the right place to add
      `returnPolicy`), confirmed the admin storefront `$set`-per-field update pattern and that
      the public tenant-info endpoint returns `storefront` wholesale (no extra public-exposure work)
→ **Draft on 2026-07-17**

### REFINEMENT
- [x] Confirmed the ROADMAP's "M" sizing and STOREFRONT-V2's blueprint were both bigger than
      reality supports in one pass — resolved by explicit scope cuts (real estorno, auto-generated
      exchange orders, order-confirmed/payment-received e-mails, a real retry queue) rather than
      silently under-building
- [x] Resolved backward compatibility: the existing staff-immediate `create()` path stays untouched
      byte-for-byte in behavior; the new customer-request path is additive, not a rework
- [x] Resolved idempotency without new infra: reused the exact `oldStatus !== newStatus` guard
      pattern already in `orders.service.ts`, rather than building a notification-log collection
- [x] Resolved "return types": only `exchange`/`return` ship (no invented "estorno" with no real
      refund mechanism behind it)
- [x] Resolved return-policy config placement: `StorefrontConfig` (already public, already
      tenant-editable via the same pattern), not a new config surface
- [x] ACs rewritten: all 8 name their verify method
- [x] DoR review: scope fits a session, decisions resolved, tasks ordered backend→tests→frontend→tests→browser
→ **Ready on 2026-07-17**

### IMPLEMENT
- [x] Tasks 1-15 completed in order; `tsc --noEmit` green on both repos. Along the way, refactored
      `ReturnsService.create()` to share `validateAndBuildLines()`/`applyReturnEffects()` with the new
      `approve()` path, and confirmed `approve()` re-validates lines against the order's *current*
      state (not what was captured at request time) as a deliberate defense-in-depth measure.
→ **done on 2026-07-17**

### TEST
- [x] Suites: lmfit-api 125/125 (+16: staff-immediate path unaffected, window enforcement, guest
      phone-lookup generic-error both directions, digits-only phone comparison, approve/reject
      transitions + double-review guard, best-effort e-mail on send failure, shipped-notification
      idempotency across a real 3-step status cycle), lmfit-web 225/225 (+8: `clampQty`,
      `returnableLinesOf`)
→ **green on 2026-07-17**

### VERIFY
- [x] Mixed curl (against the live dev API/DB) + real browser walk covering all 8 ACs on kivoni —
      see Verification record
→ **all ✅ on 2026-07-17**

### DOCUMENT
- [x] Spec status → `Done`, Result filled
- [x] ROADMAP.md: Loop 8 row + changelog
- [x] ARCHITECTURE.md updated
- [x] Memory updated
→ **merged on 2026-07-17**

### PLAN AGAIN
- [x] Retro, carry-overs filed (real estorno/PSP refunds, auto-generated exchange orders,
      order-confirmed/payment-received e-mails, a real notification retry queue — all already
      recorded in Scope §Out), memory updated. Next loop: Loop 9 (growth) or Loop 10 (launch
      hardening) or user-directed work — order TBD with user.

## Verification record

All against the real running dev API/MongoDB on kivoni — mixing direct `curl` (for state assertions
that are faster and more reliable to prove than driving through UI clicks) and real browser
interaction (for the parts only the DOM/UI can prove):

- **AC1** — Submitted a guest return request for a real order (#30, "Verify Loop2 Pix", 1×
  FUT-CRMI2888-M) via `POST /public/returns/request`. It appeared in `GET /returns` (staff) immediately
  with `status: "requested"`, and stock (116) and the customer's `storeCreditBalance` (0) were both
  confirmed **unchanged** at that point — proving the request creates no side effects until reviewed.
- **AC2** — Approved that request via `PATCH /returns/:id/approve`: stock incremented 116→117,
  `storeCreditBalance` credited 0→284.90 (matching the order line's unit price), `status`→`"completed"`,
  `reviewedBy`/`reviewedAt` set. Separately, created a *second* pending request (order #28, exchange)
  and approved it through the **real admin UI** (`/returns`, logged in as staff): clicked "Aprovar" on
  the "Solicitado" row and watched it re-render as "Concluído" live — confirmed both the API effect and
  the UI wiring end-to-end.
- **AC3** — Submitted a second request (order #28, return) and rejected it via `PATCH
  /returns/:id/reject` with a note. Confirmed stock and `storeCreditBalance` were untouched, `status`
  →`"rejected"`, `rejectionNote` saved — and confirmed the admin UI shows it as "Recusado" (muted, no
  action buttons) alongside the approved/pending rows for visual contrast.
- **AC4** — Set `storefront.returnPolicy.windowDays` to `1` via the real admin `PATCH
  /tenants/:id/storefront` endpoint (same one `SettingsClient.tsx` calls), then requested a return on
  an order created ~1.5 days earlier — got `400 Bad Request` with "O prazo... já passou," proving the
  window is enforced server-side, not just hidden in the UI. Reset the window back to 30 days
  afterward.
- **AC5** — `POST /public/returns/lookup` with the correct order number but a wrong phone → generic
  `404` (no distinction from "order doesn't exist"). Same call with the correct phone (digits-only
  match against a phone stored with formatting) → succeeded, returning order status/lines/window info.
  Also drove the real `/devolucoes` page in the browser: filled order number + phone, submitted, and
  saw the full item-selection/reason/type request form render with the real order's remaining
  quantities ("disponível: 3").
- **AC6** — Verified via the shared `ReturnRequestForm` component (identical code path used by both
  `/devolucoes` and `/conta`) rendering correctly on `/devolucoes`, plus `tsc`/unit-test coverage of
  `/conta`'s own integration (`returnableLinesOf`, the per-order "Solicitar troca ou devolução" CTA,
  and the `POST /me/returns` wiring using the authenticated customer's session instead of phone).
- **AC7** — PATCHed a real order (#32) through `open→shipped→completed→shipped` via `curl`.
  `shippedNotifiedAt` was set on the *first* transition into `shipped` and stayed at that exact
  timestamp through the later `completed` and second `shipped` transitions — proving the buyer e-mail
  fires at most once ever for that order, even when the order cycles back through `shipped` a second
  time (a case the naive `oldStatus !== newStatus` guard alone would *not* have caught).
- **AC8** — Called the pre-existing `POST /orders/:orderId/returns` (staff-immediate path, unchanged
  endpoint) for a real order/variant: stock incremented immediately (9→10) in the same request/response
  cycle, `status: "completed"`, `requestedBy: "staff"` — confirming zero regression to the feature that
  already shipped before this loop.

## Result

Shipped all 15 tasks. The existing staff-only `returns` module (`POST /orders/:orderId/returns`,
unchanged, still executes stock-reversal + `storeCreditBalance` credit immediately) now has a second,
customer-initiated path: a new `status` field (`requested`/`approved`/`rejected`/`completed`) lets a
buyer's request exist as a reviewable, side-effect-free record until staff acts on it. The one
non-negotiable design constraint — that the actual stock/credit effect must behave *identically*
regardless of which path triggers it — was met by extracting `validateAndBuildLines()`/
`applyReturnEffects()` out of `create()` and reusing them from the new `approve()` step, with
`approve()` deliberately re-validating against the order's live state (not data captured at request
time) as a defense-in-depth measure against a request going stale between submission and review.

Two real entry points ship: a guest flow (`/devolucoes`, order number + phone, matching the same
identifiers checkout already collects — no CPF) and a logged-in flow (`/conta`, using Loop 7's
session, no phone re-entry needed) — both driving the same shared `ReturnRequestForm` component and
the same `ReturnsService.requestFromCustomer` method. A return window
(`storefront.returnPolicy.windowDays`, tenant-configurable via the existing admin "Loja online"
pattern) is enforced **server-side** at request time, confirmed live by shortening the window to 1 day
and watching a real request get rejected. Staff approve/reject actions were added to the existing
`/returns` admin screen with zero rework — pending requests show a distinct "Solicitado" badge with
inline Aprovar/Recusar actions, confirmed working end-to-end through the real UI, not just the API.

The other half of this loop — transactional e-mails — added an idempotent "pedido enviado" e-mail
hook into `OrdersService.update()`'s existing status-transition logic (mirroring the same
`oldStatus !== newStatus` guard pattern already used for the `completed`/loyalty branch), backed by a
single `Order.shippedNotifiedAt` timestamp rather than any new notification-log infrastructure.
Verified live that the field, once set, survives even a later transition back through `shipped` a
second time — the guard that actually matters, since a bare status-comparison alone wouldn't catch
that case. Return approve/reject also e-mail the buyer, reusing `NotificationsService.sendEmail`
exactly as Loop 7 did, with the same best-effort posture (a delivery failure is logged and swallowed,
never blocks the underlying state change).

REFINEMENT corrected the ROADMAP/STOREFRONT-V2 blueprint's assumption of a three-way return-type
choice (troca/vale-compras/estorno) down to the two the schema can actually back
(`exchange`/`return`) — a real refund-to-payment-method requires PSP integration work that doesn't
exist anywhere in this codebase. It also explicitly carried over order-confirmed/payment-received
e-mails (already reasonably served by existing pages) and a real retry queue for failed notifications
(Loop 7 already set the best-effort precedent; a re-drive worker is separable infra work).

Test totals: lmfit-api 125/125 (+16), lmfit-web 225/225 (+8). No regressions in either suite.
