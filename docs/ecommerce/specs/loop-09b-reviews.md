# Loop 9 continuation — Reviews / ratings

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 9 (carried-over item)
**Repos touched:** lmfit-api + lmfit-web

## Goal

Customers who actually received a product can rate (1-5 stars) and review it; staff moderate
before anything goes public; the PDP shows the average rating + approved reviews.

## Decisions (judgment calls, not asked — user delegated the whole loop choice)

| Decision | Choice | Why |
|---|---|---|
| Verified-purchase bar | Order status `shipped` or `completed`, containing a variant of that product | Matches the physical-retail intuition of reviewing after receiving; mirrors the `returns` module's own "only shipped/completed orders qualify" rule |
| Moderation | Every review starts `pending`; only `approved` reviews are ever returned by the public endpoint | No existing moderation tooling otherwise; mirrors `ReturnRecord`'s `requested→approved/rejected` pattern exactly |
| One review per customer per product | Enforced (pre-check + unique index) | Standard e-commerce review-system behavior |
| Rating scale | 1-5 integer stars, optional comment | Matches every mainstream review UI |
| Surface | PDP only (`/loja`), not `/catalogo` | Matches Loop 5b's own reasoning — `/catalogo` isn't for organic/browsing discovery |

## Design

### Backend (lmfit-api)
- `src/reviews/schemas/review.schema.ts` — `Review {tenantId, productId, customerId, orderId,
  rating, comment?, status: pending|approved|rejected, reviewedBy?, reviewedAt?, rejectionNote?}`,
  unique index `(tenantId, customerId, productId)`.
- `ReviewsService.createFromCustomer` — resolves the product's variant ids, requires a
  `shipped`/`completed` order for that customer containing one of them (`ForbiddenException`
  otherwise), rejects a second review for the same product (`BadRequestException`).
- `ReviewsService.listApprovedForProduct` — `{items, average, count}` via one `find` + one
  `$avg`/`$sum` aggregate, both scoped to `status: 'approved'`.
- Admin `ReviewsController` (`/reviews`, `admin`/`staff`-gated): list (+status filter), approve,
  reject — mirrors `ReturnsController`'s exact shape.
- `PublicReviewsController` (`/public/reviews?productId=`): approved-only, no auth.
- `/me/reviews` (POST/GET) added to `CustomerMeController`, mirroring the wishlist/returns pattern.

### Frontend (lmfit-web)
- `ProductReviews.tsx` (new organism): fetches `/public/reviews`, shows average+stars+list;
  logged-in customers get a star-picker + comment form; not-logged-in visitors get a login prompt.
  Mounted at the bottom of `loja/p/[slug]/ProductDetailClient.tsx`.
- `/reviews` admin page (`ReviewsClient.tsx`): status tabs (Pendentes/Aprovadas/Recusadas/Todas),
  Aprovar/Recusar per pending row (Recusar opens an inline optional-note field). Added to
  `AppShell.tsx` nav + `LanguageContext.tsx` labels.

## Verification

- Backend: 10 new `ReviewsService` unit tests (verified-purchase gate, duplicate prevention,
  average/count aggregation, approve/reject) — 183/183 api suite green.
- Frontend: `tsc`/eslint clean, 341/341 web suite green.
- Live end-to-end (real dev DB, real customer with a genuine `completed` order): logged in as
  that customer, submitted a 5-star review from the PDP (`POST /me/reviews` → 201), confirmed it
  did **not** appear on the public PDP yet (`pending`), approved it via the real admin API
  (`PATCH /reviews/:id/approve`), confirmed `GET /public/reviews` and the live PDP then showed
  `average: 5, count: 1` with the review text and reviewer name. Test review deleted after.

## Note on this loop's context

This loop was built immediately after discovering and recovering from a serious concurrent-write
collision: a background investigation task (spawned to look into two unrelated stale-feature
findings) independently "fixed" what it took for corruption by restoring several core shared files
(`useCartStore.ts`, `useCheckoutStore.ts`, `TenantContext.tsx`, `ProductGrid.tsx`, `pricing.ts`,
`tenantSlug.ts`, `Badge.tsx`, `PublicHeader.tsx`, `CatalogFilters.tsx`, `CatalogoClient.tsx`, and a
few cross-links) to an old, pre-Loop-4 state from a fresh GitHub clone, while this session was
still actively editing the same real files. See
[[feedback_spawn_task_shared_directory_collision]] for the full account and the lesson learned. All
reverted files were reconstructed from memory + still-intact consumer/test files, verified via
`tsc`+full test suites+repeated live browser walks (the first browser pass still missed two
silently-stale files that type-checked fine standalone — `CatalogFilters.tsx` and
`PublicHeader.tsx` — only caught by actually looking at the rendered page, not by any automated
check).
