# LM FIT Web — Worktree Verification & Market Benchmark

## On every new session / worktree: run this checklist first

### 1. TypeScript + build check
```bash
npx tsc --noEmit 2>&1 | head -40
npm run build 2>&1 | tail -20
```

### 2. Test suite
```bash
npm test -- --passWithNoTests 2>&1 | tail -40
```

### 3. Known issues to watch
- `lmfitTokens.secondary` does not exist — use `lmfitTokens.accentBlue`
- `PaymentMethod` type is `"pix"|"cash"|"card"` — never `"unpaid"`
- All API calls must include tenant slug in headers (the web fetcher should set `x-tenant-slug`)

### 4. Feature completeness checklist
Compare these routes/pages against the mobile app and API:

| Feature | Web | Mobile | API |
|---------|-----|--------|-----|
| Dashboard/summary | ✅ | ✅ | ✅ |
| Orders (CRUD) | ✅ | ✅ | ✅ |
| Purchases (CRUD) | ✅ | ✅ | ✅ |
| Products/variants | ✅ | ✅ | ✅ |
| Customers/CRM | ✅ | ✅ | ✅ |
| Suppliers | ✅ | ✅ | ✅ |
| Cashflow | ✅ | ✅ | enterprise |
| Invoices | ✅ | ✅ | enterprise |
| Payments | ✅ | ✅ | enterprise |
| Production batches | ✅ | ✅ | enterprise |
| Inventory | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ |
| Users/team | ✅ | ✅ | ✅ |
| Billing/plan | ✅ | ✅ | ✅ |
| Integrations | ✅ | ✅ | ✅ |
| WhatsApp inbound | ✅ | ❌ | ✅ |
| PDV (point of sale) | ✅ | ❌ | ✅ |

---

## Market benchmark — what best-in-class B2B SaaS web dashboards do (2025)

| Area | Current state | Market standard | Gap |
|------|--------------|-----------------|-----|
| Auth | Email/password | + Google SSO, magic link | No OAuth |
| Multi-store UI | Single tenant per session | Tenant switcher in header | Add store switcher |
| Real-time updates | Manual refresh | Server-sent events or WebSocket for live orders | Missing |
| Dark mode | Unknown | System-aware dark mode (CSS prefers-color-scheme) | Check |
| Mobile-responsive | Unknown | Full responsive + PWA manifest | Verify |
| Export | XLSX/CSV | + PDF generation, bulk email | PDF missing |
| Keyboard shortcuts | Unknown | Global command palette (⌘K) | Nice to have |
| Notifications | Unknown | In-app notification feed + push | Missing |
| Onboarding | Unknown | Interactive product tour for new tenants | Missing |
| Accessibility | Unknown | WCAG 2.1 AA (axe-core CI check) | Add axe |
| Error boundaries | Unknown | Sentry + React error boundaries | Add |
| Analytics | Unknown | Self-hosted (Plausible/Fathom) | Add |

## Priority improvements

1. **Tenant store switcher** — header dropdown so admins of multiple stores can switch without re-login
2. **Real-time order updates** — SSE stream from `/orders/stream` endpoint (NestJS EventEmitter → SSE)
3. **PWA manifest** — installable on desktop/mobile from Chrome
4. **Accessibility audit** — run `npx axe-core` against every page, fix critical issues
5. **Global search** — ⌘K command palette searching across orders, customers, products

## Tech context
- Next.js (App Router), TypeScript
- Tenant resolved via API header `x-tenant-slug`
- Theme tokens in `src/theme/tokens.ts` — use `lmfitTokens.accentBlue` (not `.secondary`)
- Web port: `npm run dev` → localhost:3000
