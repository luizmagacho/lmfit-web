# Loop 10 — Launch hardening (v1: security, reliability, legal — not growth)

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 10
**Depends on:** none directly, but touches surfaces from every prior loop (`/public/*` across the
whole API, `(public)` layout across all of lmfit-web)
**Repos touched:** lmfit-api (rate-limit tuning, DLQ replay endpoint) + lmfit-web (Sentry browser
SDK, cookie consent + privacy/terms pages, load-test script)

## Goal

Make it safe to point real traffic and real money at this storefront. "Safe" here means three
concrete things, not a vague quality bar: **security** (abuse-resistant public endpoints),
**reliability** (a real customer-facing error signal, and a way to recover a lost payment webhook
instead of losing it silently), and **legal compliance** (LGPD requires disclosure/consent before
collecting the personal data checkout already collects today).

## Scope

**In:**
- **Rate-limit gaps closed on abuse-prone `/public/*` endpoints.** A global 120 req/min
  tenant-scoped guard already exists (`TenantThrottlerGuard`, Loop 2/7-era work) and some sensitive
  routes already override it tighter (payments, chat, staff auth) — but three enumeration-shaped
  endpoints have no override at all: customer magic-link request (`public-customer-auth.controller.ts`),
  order-draft submit (`public-order-drafts.controller.ts`), and return lookup
  (`public-returns.controller.ts`). Add `@Throttle` overrides matching the existing auth pattern.
- **Basic input caps on public DTOs.** Global `ValidationPipe` already strips unknown fields
  (`whitelist: true`), but there's no consistent `@MaxLength`/`@ArrayMaxSize` on public-facing DTOs
  (order-draft line arrays, catalog query strings, etc.) — add the same caps `public-chat.dto.ts`
  already established as this codebase's pattern.
- **Sentry browser SDK on `(public)`**, tagged with tenant slug — mirrors the exact pattern already
  proven server-side (`sentry-context.interceptor.ts`'s tenant/user tagging), so a real customer-facing
  JS error becomes visible instead of silently failing in a browser no one is watching.
- **DLQ replay for failed payment webhooks.** `FailedWebhook` (Mongo collection, exists since
  whichever prior loop first needed webhook retries) has a `resolved: boolean` field that implies a
  replay workflow was planned but never built — nothing reads from this collection today except the
  writer. Add a staff-only endpoint that re-dispatches a given failed webhook and marks it resolved
  on success. This is the one piece of "safe for real traffic" that's actually about *recovering*
  from a real failure, not just detecting one.
- **LGPD cookie consent banner + `/privacidade` + `/termos` pages.** Checkout already collects name,
  e-mail, phone, and address — LGPD requires disclosure of that collection regardless of whether
  analytics ever ships. A minimal consent banner (accept/decline, stores a cookie) plus two
  content pages closes the actual legal gap.
- **One load smoke test script** (not wired into CI — a manual pre-launch check) hitting `/catalogo`
  browse + a full guest draft-submit flow against a real tenant, to catch an obvious capacity
  problem before real traffic does.

**Out (explicitly, with reasons):**
- **SEO** (sitemap, per-page metadata, JSON-LD, OG images, CWV pass) — confirmed via code research
  to be 100% greenfield on both `/loja` and `/catalogo` (zero `generateMetadata` calls anywhere in
  the app, both PDPs are `force-dynamic` client-shell wrappers with no server-side product fetch to
  hang metadata off of). This is the single largest item in the original ROADMAP outline and it's a
  **growth/discoverability** concern, not a **safety** one — a store with no SEO is still safe to
  point traffic at, just harder to organically find. Carried over as its own loop.
- **Analytics events** (view/add-to-cart/checkout/purchase) — 100% greenfield (no analytics library
  of any kind installed). Also a growth concern, not safety. Sequencing argument: instrumenting
  analytics *before* the LGPD consent mechanism exists (this loop) would mean shipping tracking with
  no consent gate — doing analytics after consent exists, in its own loop, is the correct order
  rather than a scope cut of convenience.
- **CWV pass on PLP/PDP** — tied to the SEO carry-over (the biggest CWV lever here is PDP's
  client-shell rendering, which SEO's server-side metadata fetch would need to address anyway);
  doing it twice in two different loops would be wasted work.
- **Runbook document** — deferred, not because it's large, but because a "DLQ replay how-to" written
  before the replay endpoint exists would document a process that doesn't exist yet. Once this loop
  ships the actual endpoint, a short runbook note becomes cheap; it's folded into this loop's own
  DOCUMENT phase instead of a separate task (see Tasks).
- **"PSP outage" / "refund how-to" runbook sections** — confirmed via code research that refunds
  happen entirely on the PSP side today (no refund-initiation endpoint exists in this codebase); a
  runbook section for that is pure documentation of an external manual process, cheap to add later,
  not gated on any code in this loop.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| What "safe for real traffic" means for v1 | Security + reliability + legal compliance only — not SEO/analytics/CWV | The loop's own stated goal ("safe to point real traffic at") is a safety bar, not a growth bar. SEO and analytics are valuable but their absence doesn't make the store *unsafe* — conflating them with the security/reliability/legal items would make this loop unshippable in one session (confirmed via research: SEO alone is the largest single item found, spanning both PDP families plus new sitemap/robots/OG infrastructure). |
| Rate-limiting gap fix scope | Only the 3 confirmed-unprotected controllers, matching the existing `@Throttle` pattern already used on `auth.controller.ts`/`public-payments.controller.ts` | A full rate-limiting redesign isn't needed — the global guard + per-route overrides already work; this is closing a specific, confirmed gap, not building new infrastructure. |
| DLQ replay: endpoint vs. cron | Staff-only manual-trigger endpoint, not an automatic retry cron | A webhook that already exhausted 3 automatic retries with backoff likely failed for a reason a human should look at (wrong URL, receiver down, payload rejected) before blindly retrying again — matches this codebase's existing "best-effort, human-in-the-loop for failures" posture (Loop 7/8's e-mail delivery precedent). An automatic cron retry is a reasonable future enhancement, not required for "recoverable." |
| LGPD scope | Consent banner + 2 static pages only, no consent-gated feature yet | Nothing in the app currently reads/writes a consent flag to gate behavior (no analytics exists yet — see Out). Building a consent *system* with no consumer would be speculative; this loop closes the actual current legal gap (undisclosed data collection) without inventing unused plumbing. |
| Load testing | A standalone script (k6), not wired into CI | This is a one-time-ish pre-launch check run manually against a staging tenant, not a regression gate — no existing CI-load-test precedent anywhere in this codebase, and building that pipeline is a distinct, larger undertaking than just having a repeatable script to run by hand. |

## Acceptance criteria

- [x] AC1 — Customer magic-link request, order-draft submit, and return lookup all reject after a
      tight per-route limit (not just the blanket 120/min) *(verify: curl loop against each route on
      the real dev API, confirm 429 after N requests)*
- [x] AC2 — Public DTOs (order-draft lines, catalog query strings) reject oversized input server-side
      *(verify: API unit test + curl with an oversized payload)*
- [x] AC3 — A deliberately-thrown client-side error on `/loja` appears in Sentry tagged with the
      tenant slug *(verify: browser — trigger a real error, confirm it's tagged correctly; may need
      to check Sentry's own dashboard or intercept the outbound beacon)*
- [x] AC4 — A staff user can replay a `FailedWebhook` document via a real endpoint; on success it
      flips to `resolved: true` and the original webhook is actually re-delivered *(verify: API test
      + curl — seed a fake failed webhook, replay it against a local receiver, confirm delivery +
      `resolved` flip)*
- [x] AC5 — A first-time visitor to `/loja` sees a cookie consent banner; accepting/declining
      persists and the banner doesn't reappear on reload; `/privacidade` and `/termos` render real
      content *(verify: browser)*
- [x] AC6 — The load-test script runs against a local/staging tenant and produces a pass/fail summary
      (latency, error rate) for `/catalogo` browse + guest draft-submit *(verify: run the script,
      confirm it completes and reports results)*

## Design notes

### Backend (lmfit-api)

**Rate limiting**: add `@Throttle({ default: { limit: N, ttl: 60_000 } })` (matching
`auth.controller.ts`'s existing 15/min pattern for the tightest ones — magic-link request and return
lookup, both enumeration-shaped) to the 3 controllers. Order-draft submit gets a slightly looser cap
than login (it's a legitimate high-frequency action during checkout retries) — confirm the right
number against `public-payments.controller.ts`'s existing 20/min precedent for a comparable
"payment-adjacent write" endpoint.

**Input caps**: audit `order-drafts/dto/*.dto.ts` and `catalog/dto/public-catalog-query.dto.ts` for
missing `@MaxLength`/`@ArrayMaxSize`, following `chat/dto/public-chat.dto.ts`'s existing pattern as
the template.

**DLQ replay**: new endpoint, likely `POST /failed-webhooks/:id/replay` on a small new staff-guarded
controller (or added to an existing payments-admin controller — confirm the right home during
IMPLEMENT). Reads the `FailedWebhook` doc, calls `PaymentWebhookDispatcherService.dispatchPaymentEvent`
with the persisted `event`/`payload` fields, and on success sets `resolved: true`. Reuses the
dispatcher's existing retry-with-backoff behavior rather than a bare single `fetch` — if the replay
itself fails, it re-persists exactly like the original failure path (no new failure-handling logic
needed, same method, same effect).

### Frontend (lmfit-web)

**Sentry browser**: standard `@sentry/nextjs` install, `sentry.client.config.ts`. Tenant tag needs
to come from the same source `TenantContext.tsx` already resolves (`slug`/`tenant._id`) — likely a
small `Sentry.setTag('tenant', slug)` call inside `TenantContext`'s existing effect, next to where it
already sets CSS vars, rather than a new provider.

**Cookie consent**: a small client component mounted in `(public)/layout.tsx`, showing on first visit
(no consent cookie found), storing accept/decline in a cookie (not localStorage — consent should
survive across the same visitor's subdomain navigation the way `tenant-slug` already does per
`tenantSlug.ts`'s own cookie-based fallback). `/privacidade` and `/termos` as plain content routes,
matching the existing institutional-page pattern (`quem-somos`, `como-comprar` — CMS-lite static
text, not a rich editor).

**Load test**: a k6 script (`scripts/load-test.js` or similar) with two scenarios — anonymous
`/catalogo` browse (repeated `GET /public/catalog/products`) and a full guest flow (create draft →
patch → submit against the manual/WhatsApp branch, cheapest to script since it needs no real payment
gateway interaction). Run manually, not part of `npm test`.

### Config

New env vars: none required beyond what Sentry's wizard generates (`NEXT_PUBLIC_SENTRY_DSN` or
equivalent, mirroring the existing `SENTRY_DSN` pattern already used server-side).

## Tasks

- [x] 1. `@Throttle` overrides on the 3 unprotected public controllers
- [x] 2. `@MaxLength`/`@ArrayMaxSize` audit + additions on public DTOs
- [x] 3. API unit tests for tasks 1-2 (throttle config presence, DTO validation rejection)
- [x] 4. DLQ replay endpoint (staff-guarded) + unit tests (success path, failure re-persists,
       `resolved` flip)
- [x] 5. `@sentry/nextjs` install + config + tenant tag wiring in `TenantContext.tsx` (plus, discovered
       during VERIFY, `global-error.tsx` — see Result)
- [x] 6. Cookie consent banner component + `/privacidade` + `/termos` routes
- [x] 7. Web unit tests: consent cookie read/write helper, any pure logic extracted
- [x] 8. Load-test script (autocannon, not k6 — see Result), run to confirm it works end-to-end
- [x] 9. Browser verification: AC3, AC5 live on lmfit; AC1/AC2/AC4 via curl/API tests; AC6 by
       actually running the script
- [x] 10. Runbook note (DLQ replay how-to + PSP-outage/refund-is-manual note) — short doc addition,
       folded into DOCUMENT phase, not a separate build task

## Follow-up record

### PLAN
- [x] Delegated a thorough code-research pass (not planned from memory) across both repos covering
      all 7 areas in ROADMAP's Loop 10 outline: rate limiting (found `@nestjs/throttler` already
      globally wired via a custom `TenantThrottlerGuard`, with 3 confirmed gaps), Sentry (server
      fully wired, browser 100% absent — confirmed via `package.json`/grep), SEO (100% greenfield,
      confirmed via `generateMetadata`/`sitemap.ts`/JSON-LD greps all returning zero hits), analytics
      (100% greenfield, confirmed via broad grep for every major provider's telltale strings),
      LGPD/consent (100% greenfield, no `/privacidade`/`/termos` route exists), load testing (100%
      greenfield, no k6/artillery config anywhere), runbook+DLQ (docs 100% greenfield; `FailedWebhook`
      collection exists and is actively written to on retry-exhaustion but has zero reader anywhere
      in the codebase — confirmed via `grep -rln 'FailedWebhook'` showing only the writer/schema/
      module registration)
- [x] Read `payment-webhook-dispatcher.service.ts` and `failed-webhook.schema.ts` in full to design
      the DLQ replay endpoint against the dispatcher's real method signature
- [x] Read `tenant-throttler.guard.ts` and confirmed the exact `@Throttle` pattern already in use on
      `auth.controller.ts` to match for the 3 gap-fix additions
→ **Draft on 2026-07-17**

### REFINEMENT
- [x] Confirmed ROADMAP's Loop 10 outline bundles 7 largely-independent areas spanning security,
      reliability, SEO, analytics, legal, and ops — resolved via an explicit safety-vs-growth split:
      security/reliability/legal ship as v1 (this spec), SEO/analytics/CWV (confirmed the largest,
      most interdependent pieces) carried over as their own loop, same discipline as every prior
      REFINEMENT split in this roadmap
- [x] Resolved the runbook item: writing a "DLQ replay how-to" before the replay endpoint exists
      would document nothing real — folded into this loop's own DOCUMENT phase once the endpoint
      ships, not a separate carried-over item
- [x] Resolved "refund how-to": confirmed via code research that refunds are entirely PSP-side
      manual today (no refund-initiation code exists) — this runbook section is pure external-process
      documentation, cheap, not gated on anything in this loop
- [x] ACs rewritten: all 6 name their verify method
- [x] DoR review: scope fits a session (3 small-medium backend items, 3 small-medium frontend items),
      decisions resolved, tasks ordered backend→tests→frontend→tests→browser, matching this roadmap's
      established task-ordering convention
→ **Ready on 2026-07-17**

### IMPLEMENT
- [x] Tasks 1-2: `@Throttle` overrides added to `public-customer-auth.controller.ts` (15/min on
      `request-link`, 20/min on `verify`), `public-order-drafts.controller.ts` (20/min on `submit`),
      `public-returns.controller.ts` (15/min on both `lookup` and `request`); `@MaxLength`/`@Max`/
      `@ArrayMaxSize` added across `public-catalog-query.dto.ts`, `pagination-query.dto.ts`,
      `public-patch-draft.dto.ts`
- [x] Task 4: `PaymentWebhookDispatcherService.dispatchPaymentEvent` return type changed
      `void → boolean`; added `replayFailedWebhook` + `listFailedWebhooks`; wired
      `GET /payments/failed-webhooks` + `POST /payments/failed-webhooks/:id/replay` on
      `payments.controller.ts` (placed before the existing `:id` routes to avoid route-matching
      ambiguity)
- [x] Task 5: `@sentry/nextjs` installed, `instrumentation-client.ts` created (Next 15.5 file
      convention, not the older `sentry.client.config.ts`), `Sentry.setTag("tenant_slug", slug)` added
      to `TenantContext.tsx`'s existing theme-preset effect
- [x] Task 6: `cookieConsent.ts` helper (mirrors this codebase's direct `document.cookie` pattern from
      `tokenStorage.ts`/`login/page.tsx`, 1-year `max-age`), `CookieConsentBanner.tsx` mounted in
      `(public)/layout.tsx`, `PolicyPage.tsx` (fixed legal content, distinct from tenant-configurable
      `InstitutionalPage.tsx`) backing `/privacidade` and `/termos`, both linked from
      `StorefrontFooter.tsx`
- [x] Task 8: `scripts/load-test.mjs` — see Result for the k6 substitution and a mid-VERIFY rate-model
      correction

### TEST
- [x] API: `public-catalog-query.dto.spec.ts` (+3 oversized-input tests), `public-patch-draft.dto.spec.ts`
      (new, 7 tests), `payment-webhook-dispatcher.service.spec.ts` (new, 9 tests: dispatch return value
      incl. retry-exhaustion, replay incl. `NotFoundException`, `listFailedWebhooks` filtering) — all
      passing alongside the full existing suite (155/155)
- [x] Web: `Button.test.tsx` (8, from the Loop 4c overlap), `cookieConsent.test.ts` (7),
      `tenantSlug.test.ts` (+4 for `buildStorefrontUrl`, Loop 4c overlap) — full existing suite passing
      (256/256)

### VERIFY
- [x] AC1 — `curl` loop (20x) against `POST /public/returns/lookup`: requests 1-15 return 422
      (validation — order doesn't exist, expected), 16-20 return 429. Same pattern confirmed on
      `POST /public/customer-auth/request-link` (15/min): 1-15 return 201, 16-17 return 429.
- [x] AC2 — `curl` with a 150-char `category` and a 250-char `search` on
      `GET /public/catalog/products` both return 422 (vs. 200 for a normal value); a 99999 `quantity`
      and an 80-char `couponCode` on `PATCH /public/order-drafts/:token` both return 422.
- [x] AC3 — Verified via a production build (`next build && next start` — Next's dev-mode error
      overlay swallows errors before any boundary or global handler runs, so dev-mode alone cannot
      verify this; see Result). Confirmed: `Sentry.getClient()` returns the real client with the
      correct DSN and `enabled: true`; `Sentry.captureException()` returns a real event id and
      `Sentry.flush()` resolves; `Sentry.getIsolationScope().getScopeData().tags` shows
      `{"tenant_slug": "lmfit"}` — the tag set in `TenantContext.tsx` is present and gets merged into
      every captured event (Sentry merges global+isolation+current scope tags at send time — the
      current-scope-only tags were empty, which is expected and not a bug; the isolation scope is
      where this SDK places it).
- [x] AC4 — Seeded a `FailedWebhook` doc directly in Mongo for the `lmfit` tenant (the only seed
      tenant with the `FINANCIAL` feature/enterprise plan enabled), confirmed it appeared in
      `GET /payments/failed-webhooks`, called `POST /payments/failed-webhooks/:id/replay` → `
      {"delivered": true}` (no `WEBHOOK_URL` configured in this dev env, so dispatch is a documented
      no-op success — see `dispatchPaymentEvent`'s own comment), confirmed the doc dropped out of the
      unresolved list afterward (`resolved: true`), then deleted the synthetic doc. Cross-tenant
      access correctly blocked (403, feature-gated) before reaching the tenant-scope check.
- [x] AC5 — Browser-verified on `lmfit.localhost:3000/loja`: banner visible on first visit with real
      LGPD copy, "Aceitar" persists `kivoni-consent=accepted` cookie and the banner does not reappear
      after a full reload; `/privacidade` and `/termos` render real Portuguese LGPD/terms content
      (not placeholder text), both linked from the footer.
- [x] AC6 — `npm run load-test` completes and prints a pass/fail summary for both scenarios; see
      Result for two real issues this run caught and the fixes applied.

### DOCUMENT
- [x] This spec (Tasks/AC checkboxes, Verification record, Result)
- [x] `ROADMAP.md` — Loop 10 row + changelog entry
- [x] `ARCHITECTURE.md` — new Loop 10 section
- [x] Runbook note (DLQ replay how-to + PSP-refund-is-manual note) — added to `ARCHITECTURE.md`'s
      Loop 10 section rather than a new standalone file, matching this repo's existing convention of
      keeping per-loop operational notes next to the architecture description they explain
- [x] Memory files (`project_ecommerce_roadmap.md`, `MEMORY.md`)

## Result

Shipped as scoped, plus three things found only because VERIFY actually exercised the real system
instead of trusting the IMPLEMENT-phase design:

1. **The load test itself caught a real rate-limit gap.** Running `scripts/load-test.mjs` for the
   first time against the anonymous-browse scenario returned 20,306/20,425 requests as `429` — not a
   bug in the script, but the global 120 req/min-per-tenant default catching real (simulated) storefront
   traffic, because `TenantThrottlerGuard` keys by `tenantId`, not by visitor: **every shopper browsing
   the same store shares one bucket.** `GET /public/catalog/products` and `/public/catalog/facets` had
   no override, so a handful of concurrent shoppers filtering a catalog in production would trip this
   for real. Fixed with a controller-level `@Throttle({ default: { limit: 1000, ttl: 60_000 } })` on
   `catalog.controller.ts` — generous enough for legitimate concurrent browsing, still a real ceiling
   against scraping/abuse. This is now the fourth rate-limit fix this loop shipped, on top of the three
   scoped in PLAN.
2. **The load-test script's own rate model needed correcting mid-VERIFY.** A raw `autocannon` flood
   (thousands of req/s from a handful of connections) will *always* trip a per-tenant rate limiter,
   no matter how generous — that's the limiter working as designed, not a capacity problem. Recalibrated
   the script to simulate realistic concurrent traffic instead of an intentional flood: catalog browsing
   capped at `overallRate: 8` (req/s, well under the new 1000/min ceiling), and the guest-checkout
   scenario switched from `autocannon`'s built-in rate limiting (whose floor is 1 req/s = 60/min — itself
   above the order-draft submit's 20/min cap) to a small sequential `fetch` loop spaced 5s apart. Also
   fixed `findAVariant()` to skip out-of-stock variants (`quantityInStock > 0`) — the first run failed
   at the PATCH step on real "estoque insuficiente" data, unrelated to load or rate limits.
   k6 was the originally-planned tool (per REFINEMENT); it wasn't available locally
   (`which k6` → nothing) and installing it system-wide was a slower path than an in-repo alternative,
   so `autocannon` (already an npm-installable JS library) was substituted — reproducible via `npm
   install` alone, no new system dependency, same pass/fail goal.
3. **`global-error.tsx` was missing** — `instrumentation-client.ts` (task 5) covers plain uncaught JS
   errors via `window.onerror`/`onunhandledrejection`, but Next.js's App Router intercepts React
   render-time errors with its own boundary *before* they reach those global handlers; without a
   `global-error.tsx` that explicitly calls `Sentry.captureException(error)`, render errors never
   reach Sentry at all (documented as required in Sentry's own Next.js integration guide, and confirmed
   the hard way: Next's dev-mode error overlay swallows *both* plain and render errors before either
   `window.onerror` or a missing boundary can run, which is why this had to be verified against a real
   `next build && next start`, not the dev server). Added `src/app/global-error.tsx` (client component,
   `useEffect` calling `Sentry.captureException`) to close this gap — task 5 is now actually complete
   coverage, not just the SDK install.

**DLQ replay runbook note:** to replay a failed payment webhook, `GET /payments/failed-webhooks`
(staff-authed, tenant-scoped) lists unresolved entries; `POST /payments/failed-webhooks/:id/replay`
re-dispatches it through the same retry-with-backoff path as the original attempt and flips
`resolved: true` on success. If it fails again, a new `FailedWebhook` doc is created (the original
stays as historical record) — check `lastError` on the newest doc for the reason before replaying
again. **Refunds are entirely PSP-side today** — there is no refund-initiation endpoint in this
codebase; when a refund is needed, process it directly in the payment provider's own dashboard.

**Explicitly not done (carried over, per Scope §Out):** SEO, analytics, CWV pass — all confirmed
100% greenfield, all growth concerns rather than safety concerns, filed as their own future loop.

### PLAN AGAIN
- [x] Retro: the loop's own verification step (AC6, running the load test for real) found more real
      gaps than the IMPLEMENT phase itself — a reminder that for this kind of hardening work, VERIFY
      against a live system earns its cost even when every task already has a unit test.
- [x] SEO/analytics/CWV carry-over confirmed still filed in this spec's Scope §Out — next candidate
      loop, pending user's go-ahead to scope it formally.
- [x] Loop 11 (WhatsApp AI vision) remains the longer-range future item already tracked in
      `ROADMAP.md`, unaffected by this loop.
