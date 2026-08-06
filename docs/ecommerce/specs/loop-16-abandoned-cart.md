# Loop 16 — Abandoned cart recovery (e-mail only)

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 16 (second "Faltando" item from the 2026-07-27
market-readiness benchmark)
**Repos touched:** lmfit-api only

## Context

E-mail-only per the benchmark plan — WhatsApp send would need a real outbound Meta Graph API
integration that doesn't exist anywhere in this codebase (same conclusion Loop 7 already reached
for magic-link delivery). The cron reuses two established patterns exactly rather than inventing a
third: `low-stock.cron.ts`'s dedup-via-own-field-checked-before-acting, and `sync-cron.service.ts`'s
per-item try/catch loop where one failure never blocks the rest.

## Design

- New `OrderDraft.abandonedNotifiedAt?: Date` — a real typed field (not stuffed into the existing
  free-form `metadata`, which is reserved for client-supplied checkout data) marking a draft as
  processed, whichever way it was processed.
- New `AbandonedCartCron` (`@Cron(CronExpression.EVERY_HOUR)`), configurable via
  `ABANDONED_CART_HOURS` (default 3): finds `OrderDraft`s with no `orderId`, not yet
  `abandonedNotifiedAt`, `updatedAt` older than the threshold, and at least one line.
- **Email resolution, in order**: `metadata.customer.email` (set at checkout by
  `createPublicDraftWithLines`, confirmed by reading `publicOrders.ts`) first, then
  `Customer.findById(draft.customerId).email` for a logged-in shopper whose cart didn't otherwise
  capture an email (e.g. the `CartDrawer` coupon-apply path, which only calls `createDraft(phone)`).
- **Found a real gap while designing, not silenced**: a meaningful slice of abandoned drafts have
  *only* a phone (`waId`), no e-mail at all — anyone who added a coupon to the sacola before
  reaching checkout. These are counted separately (`skippedNoEmail`) and logged every run, not
  quietly dropped — the honest carry-over is a future WhatsApp send, not "this cron covers
  everything."
- Drafts with no email, or whose lines all point at since-deleted variants, still get
  `abandonedNotifiedAt` set (nothing left to retry). A draft whose `sendEmail` call itself throws
  does **not** get marked — unlike the magic-link precedent (where retrying is pointless, the token
  is already spent), here retrying next hour is the correct behavior, since nothing was consumed.
- Recovery e-mail links each cart line straight to its own PDP (`{WEB_ORIGIN}/loja/p/{slug}`),
  resolved via `ProductVariant.find({...}).populate('productId', 'name slug')` — not an attempt to
  literally restore the local-only `useCartStore` state, which the backend has no way to reach.

## Verification

- +7 new tests (`abandoned-cart.cron.spec.ts`): query shape, metadata-email path, customer-fallback
  path, no-email skip-and-mark path, send-failure-does-not-mark path, one draft's failure not
  blocking another's success, and the configurable threshold. Full suite 245/245, `tsc` clean.
- Live end-to-end against the real dev API/DB: restarted the dev server to pick up the new module
  wiring (confirmed clean boot, no DI errors), inserted a real 5-hour-old `OrderDraft` with a real
  checkout-style `metadata.customer.email`, then invoked the cron directly against a real
  `NestFactory.createApplicationContext` (not a mock) pointed at the actual dev Mongo. Confirmed the
  query correctly surfaced this draft **plus 7 already-existing real abandoned drafts** in the dev
  DB; the 7 no-email ones were correctly marked `abandonedNotifiedAt` and logged as
  `skippedNoEmail`; my draft's real send attempt hit the same pre-existing Resend
  test-domain-restriction gap already documented from Loop 7 (`example.com` rejected by the
  sandbox) — confirmed the draft was correctly **left unmarked** so it retries next hour, proving
  the failure-does-not-mark design live, not just in a mock. Deleted the test draft and reverted
  `abandonedNotifiedAt` on the 7 real drafts afterward to leave the dev DB exactly as found.

## Carried over

WhatsApp send for the no-email slice of abandoned carts (needs a real outbound Meta Graph API
integration — out of proportion to this loop, same reasoning Loop 7 already used); a real
`useCartStore`-restoring recovery link (not reachable from the backend, PDP links are the honest
alternative).
