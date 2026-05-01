# LM FIT web UI contract (responsive + parity)

## Breakpoints

- **Mobile:** default layout, single column, touch-first.
- **Tablet / desktop:** `md:` (≥768px) — sidebar visible; below `md` the primary nav is a **drawer** with backdrop.

## Navigation

- **Small screens:** hamburger opens a **left drawer**; tap backdrop or × to close.
- **md+:** persistent **sidebar** (same links as mobile).

## Tables

- Staff lists use **horizontal scroll** (`overflow-x-auto`) on narrow viewports.
- Prefer **min-height ~44px** for primary tap targets (nav links, header controls).

## Parity with mobile (lmfit-mobile)

- Staff features exposed here (produtos, relatórios, rascunhos, escalações WhatsApp) have a matching **read-oriented** flow in the Expo app calling the **same REST** endpoints and JWT model.

## QA viewports

- Playwright checks **375 × 667**, **768 × 1024**, and **1280 × 800** on `/login` (see `tests/e2e/responsive.spec.ts`) plus smoke on `/catalog`.
