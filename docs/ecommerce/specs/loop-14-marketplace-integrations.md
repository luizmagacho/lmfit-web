# Loop 14 — Marketplace integrations: bug fix + real webhook receptor + tests

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 14 (closes the "Parcial" marketplace-integrations gap from the
2026-07-27 market-readiness benchmark)
**Repos touched:** lmfit-api only

## Context

The benchmark flagged marketplace integrations (Bagy, Nuvemshop, Mercado Livre, Shopee, TikTok Shop)
as "Parcial" — real HTTP calls and HMAC-signed requests exist for all five, but "validating" them
turned out to mean fixing a real, already-shipped bug and turning a total no-op into a real receiver.

## What was found and fixed

1. **Critical 1-line bug**: `integration.schema.ts`'s Mongoose `enum` for `platform` was missing
   `'tiktok'`, even though the TS `IntegrationPlatform` union, the DTO, the frontend, and
   `IntegrationsService.connectTiktok()` all already supported it. Every TikTok Shop connection
   attempt failed at `.create()` with a `ValidationError` — **after** the merchant had already
   authorized the app on TikTok's side, the worst kind of late/silent failure. Fixed the enum list.
2. **No-op webhook receptor**: `integrations-webhook.controller.ts` only logged and returned
   `{received:true}` for any request — no tenant/integration resolution, no signature check.
   Rebuilt it to: resolve the tenant by slug (`TenantsService.findBySlug`, `TenantsModule` is
   `@Global()` so no new provider needed) → find the tenant's active integration for that platform
   (new `IntegrationsService.findByTenantAndPlatform`) → verify a per-platform HMAC signature over
   the **raw** body (`req.rawBody`, already enabled globally via `main.ts`'s `rawBody: true` — same
   mechanism the WhatsApp webhook already uses) using that integration's `webhookSecret` → only then
   dispatch a real `syncEngine.syncOrders()` call (already idempotent by `reference`, so re-firing
   on retries is safe). Any thrown error from an adapter's signature check (e.g. a wrong-length
   header crashing `timingSafeEqual`) is now caught and treated as an invalid signature rather than
   a 500.
3. **`verifyWebhookSignature`/`webhookSignatureHeader` added where missing**: Bagy and Nuvemshop
   already had real HMAC implementations; added the same for Mercado Livre (`x-signature`,
   ts/v1 manifest format) and TikTok (`x-tts-signature`, HMAC over raw body) and Shopee
   (`authorization`, HMAC over `callbackUrl|body`) — all three carry the same "not verified against
   a live sandbox account, confirm before production" disclaimer this codebase's adapters already
   use elsewhere (Shopee/TikTok's existing docstrings). The 3 stub adapters (Tray/Loja Integrada/
   Shopify, consciously "Em breve") are left as-is — the controller falls back to accepting +
   logging a warning for any adapter without real verification, same behavior as before for those.
4. **Token refresh generalized from TikTok-only to also cover Mercado Livre and Shopee**:
   `sync-engine.service.ts`'s `tryRefreshTiktokToken` (only ever tried TikTok, silently gave up for
   every other platform) became `tryRefreshToken`, dispatching per-platform to each adapter's new
   `refreshAccessToken`. Without this, a Mercado Livre/Shopee integration's access token would
   expire (~6h/4h typically) and silently stop syncing with no retry.
5. **Zero test coverage → real coverage from zero**: the whole module had no `.spec.ts` files.
   Added: a schema-validation spec that actually would have caught bug #1 (`validateSync()` against
   the real Mongoose schema for every platform the TS type declares, not a mocked model — mocked
   models never run real Mongoose validators, which is why this bug shipped silently in the first
   place); `IntegrationsService` unit tests (`getAdapter`, `connectTiktok` happy/failure paths,
   `findByTenantAndPlatform`); pure HMAC correctness tests for all 5 real adapters'
   `verifyWebhookSignature`; a webhook-controller spec proving the tenant/integration/signature
   gates each independently reject before any sync fires; a `tryRefreshToken` spec covering all 3
   refreshable platforms plus the "no refresh support" and "missing credentials" fallthroughs.

## Verification

- `tsc --noEmit` clean; full api suite 226/226 (+43 new: schema spec, service spec, adapter
  signature specs, webhook controller spec, sync-engine refresh spec).
- Live end-to-end against the real dev API/DB (after restarting a stale, days-idle `nest --watch`
  process that had stopped actually listening — a recurrence of the previously-documented idle
  dev-server pattern, not related to this loop's code):
  - Confirmed the enum fix directly against the real Mongo connection: `new IntegrationModel({...,
    platform: 'tiktok'}).validate()` now resolves instead of throwing.
  - Confirmed the webhook receptor's rejection paths live: unknown tenant slug → 403; known tenant
    with no active integration for that platform → 403.
  - Created a temporary real `bagy` integration with a known `webhookSecret`, then confirmed a
    correctly-HMAC-signed request returns `200 {received:true}`, an incorrectly-signed request
    returns `403`, and a request with no signature header at all also returns `403` — then deleted
    the temporary integration.

## Carried over (lower priority, doesn't block "validated")

Real OAuth redirect flow for connecting a store (today: paste credentials manually, which works);
real adapters for Tray/Loja Integrada/Shopify (consciously stubbed, frontend already says "Em
breve"); confirming the exact webhook signature header names/manifest formats against each
platform's real sandbox (all carry an explicit disclaimer in code, same posture this codebase
already takes for TikTok/Shopee's API-call signing).
