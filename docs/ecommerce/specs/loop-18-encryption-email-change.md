# Loop 18 — Credential encryption + customer email change

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 18 (final loop of the 2026-07-27 market-readiness benchmark
implementation plan)
**Repos touched:** lmfit-api + lmfit-web

## Context

Two small, unrelated "acabamento" items bundled together as the smallest/lowest-risk remaining
gaps. No symmetric-encryption utility existed anywhere in this codebase before this loop (only
one-way hashing — `createHash`/`createHmac` — for tokens/passwords); customer email change was
excluded from `UpdateCustomerProfileDto` entirely, with no `purpose`/`pendingEmail` branching on the
magic-link mechanism to confirm ownership of a new address.

## Design

### Credential encryption
- New `EncryptionService` (`src/common/encryption.service.ts`, `EncryptionModule` global): AES-256-GCM,
  random IV per call, key derived via `scrypt` from `CREDENTIALS_ENCRYPTION_KEY` (any string works —
  no need to hand-craft an exact 32-byte value). Output format `enc:v1:<iv>:<authTag>:<ciphertext>`
  (all base64); `decrypt()` recognizes this prefix and **passes through any value that doesn't match
  it unchanged** rather than throwing — this is what makes rollout safe without a coordinated
  migration event: legacy plaintext keeps working exactly as before until a value is re-saved
  through the encrypting write path.
- **Deliberately scoped to one field set, not swept across the whole codebase**: applied to
  `Tenant.analytics`'s 3 server tokens (`metaConversionsApiToken`/`ga4ApiSecret`/`tiktokAccessToken`)
  — the exact write path (`TenantsService.updateAnalyticsConfig`) and read path
  (`AnalyticsService.trackPurchase`) built in Loop 15, so every call site touching these 3 fields is
  fully known and already covered by existing tests. The older credential fields
  (`infinitePayApiKey`, `geminiApiKey`, `metaAppSecret`, `IntegrationCredentials.accessToken`/`apiKey`)
  are read via `.lean()` in dozens of pre-existing call sites across adapters this session didn't
  build — encrypting those transparently via Mongoose getters would silently break on any `.lean()`
  read (getters don't run on lean documents), a real risk not safe to take on without auditing that
  whole surface first. Left as an explicit, honest carry-over rather than a shallow sweep.
- **Found and fixed a real bug live, not in the first test pass**: the existing "clear a field via
  `null`" convention (already used by shipping/pricing config) crashed `encrypt(null)` with a raw
  `TypeError` from Node's crypto module, surfacing as an unhandled 500. Fixed with an
  `encryptOrClear()` helper that only encrypts a truthy value, passing `null`/`undefined` straight
  through so clearing a token still works.

### Customer email change
- `MagicLinkToken` gained `purpose: 'login' | 'email-change'` (default `'login'`, so every existing
  login-link flow is untouched) and `pendingEmail?: string`.
- New `POST /me/email-change/request` (authenticated, `CustomerAuthGuard`) — rejects if the new
  email is unchanged or already used by a different customer in the tenant, then creates a token
  exactly like `requestMagicLink` but with `purpose: 'email-change'`/`pendingEmail` set, and e-mails
  the link to the **new** address (proving the customer actually has access to it, not just that
  they typed it).
- `verifyMagicLink()` gained one branch: when `purpose === 'email-change'`, it calls
  `CustomersService.update(tenantId, customerId, {email: pendingEmail})` before falling through to
  the exact same `issueSession()` every login already uses — clicking the confirmation link both
  updates the email and logs the customer in with a real session, so it works correctly even if the
  click happens on a different device/browser than the one that requested the change (e.g.
  confirming on a phone while the original session stays open on a laptop).
- `/conta` gained a small "Trocar e-mail" toggle + form; `useCustomerAuthStore` gained
  `requestEmailChange()`.

## Verification

- +12 api tests (`EncryptionService`: round-trip, random-IV uniqueness, tamper detection via GCM
  auth tag, wrong-key rejection, legacy-plaintext passthrough, missing-key behavior;
  `TenantsService`: encrypts-before-save, pixel-ids-stay-plaintext, the null-clear regression;
  `AnalyticsService`: decrypts real ciphertext before the API call; `CustomerAuthService`:
  same-email/already-used rejections, token shape, the `verifyMagicLink` email-change branch vs. the
  unaffected plain-login branch), +1 web (`requestEmailChange`'s redirectBase). Full suite 269/269
  api, 355/355 web, `tsc` clean both repos.
- Live end-to-end against the real dev API/DB:
  - Set a real Meta Conversions API token via the admin endpoint, read the **raw** stored value
    directly from Mongo and confirmed it's real ciphertext (`enc:v1:...`), then independently
    decrypted it with a fresh `EncryptionService` instance using the server's actual configured key
    and confirmed it reconstructs the exact original plaintext.
  - Caught the `encrypt(null)` crash live while trying to clear the test token (a real 500), fixed
    it, and re-confirmed the clear now succeeds and stores `null`.
  - Requested a real email change for a genuine customer, confirmed the `MagicLinkToken` document
    was created with the correct `purpose`/`pendingEmail`; since the raw token can't be recovered
    from its hash (by design), substituted a token with a known raw value into the same document
    shape to exercise `verify()` itself — confirmed the call returned a real session **and** the new
    email in its response, confirmed the `Customer` document's `email` actually changed in Mongo, and
    confirmed the token was consumed (deleted) after the single use.
  - Reverted every side effect afterward: cleared the test analytics token, reverted the test
    customer's email back to its original value, deleted the test session's refresh token.

## Carried over

Encryption for the pre-existing credential fields (InfinitePay/Gemini/Meta app secrets, marketplace
integration tokens) — same utility, applied at each of those call sites once their `.lean()` read
surface is audited; a one-off migration script to re-encrypt any already-existing plaintext value
the first time this loop's scope does expand to cover them.
