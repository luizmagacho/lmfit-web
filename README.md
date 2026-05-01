# lmfit-web

Next.js admin panel for LM FIT operations: login, JWT storage (localStorage), axios client with refresh, list views for customers, suppliers, orders, purchases, invoices, and users.

## Setup

```bash
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login` until authenticated.

Default API seed user (if you kept `.env.example` values on the API): `admin@lmfit.local` with the password from the API `SEED_ADMIN_PASSWORD`.

## Theme

Brand colors are defined in `src/theme/tokens.ts` and CSS variables in `src/app/globals.css`, sampled from the live Tienda Nube CSS used by [lmfit.com.br](https://www.lmfit.com.br/).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright (starts Next on **port 3005** automatically) |
