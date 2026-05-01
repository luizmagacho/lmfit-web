# Prompt for backend — dashboard analytics + product catalog (lmfit-api)

Copy to your issue / chat with the **lmfit-api** team. The web admin (`lmfit-web`) already calls these routes when available and shows placeholders when responses are **404**.

---

## 1. Market context (what staff expects)

Retail / e-commerce admin tools (Shopify, Bling, Tienda Nube–style) usually expose:

- **KPIs** in one screen: revenue, order count, **purchases received per day**, stock value.
- **Charts**: purchases over time, **revenue by product** (Pareto / bar ranking).
- **Catalog**: each product has **image**, **SKU**, **price**, **category**, **stock quantity**, plus optional commercial fields.

The LM FIT web dashboard and product screen are aligned with that baseline.

---

## 2. Dashboard — new report endpoints

### 2.1 `GET /reports/purchases-daily` (JWT, same roles as purchases/reports)

Query: **`from`**, **`to`** (ISO 8601, same convention as `/reports/summary`).

Response (suggested shape, match OpenAPI when published):

```json
{
  "range": { "from": "…", "to": "…" },
  "points": [
    { "date": "2026-04-14", "purchaseCount": 3, "totalAmount": 1299.5 }
  ]
```

- **`date`**: calendar day in store timezone or UTC (document which).
- **`purchaseCount`**: number of **purchase orders** (compras) that day.
- **`totalAmount`** (optional): sum of purchase totals that day.

Used by the web **“Compras por dia”** bar chart.

### 2.2 `GET /reports/revenue-by-product` (JWT)

Query: **`from`**, **`to`**, optional **`limit`** (default `10`).

```json
{
  "range": { "from": "…", "to": "…" },
  "items": [
    {
      "productId": "…",
      "name": "Shorts Liz",
      "sku": "LIZ-P",
      "revenue": 4200,
      "units": 38
    }
  ]
```

- **`revenue`**: sum of line revenue (or net sales) attributed to that **product** in the period (define whether taxes/shipping excluded — document once).
- Used by the web **“Receita por produto”** horizontal bars.

### 2.3 Existing `GET /reports/summary`

Keep stable; the dashboard still consumes **`from` / `to`** for KPI cards and “Top variantes”.

---

## 3. Products — canonical fields (list, detail, POST, PATCH)

The web **produtos** screen expects each item to support (names should match JSON keys):

| Field | Type | Required on create | Notes |
|--------|------|-------------------|--------|
| **`primaryImageUrl`** | string (URL) | **Yes** | Main image for grid + public catalog; HTTPS preferred. |
| **`images`** | string[] or `{ url: string }[]` | No | Gallery; if set without `primaryImageUrl`, the UI derives the first image for display. |
| **`name`** | string | **Yes** | |
| **`sku`** | string | **Yes** | Unique per variant/product (enforce **409** or **422** on conflict). |
| **`price`** | number (BRL) | **Yes** | Selling price; ≥ 0. |
| **`compareAtPrice`** | number \| null | No | “De / por” promotional anchor. |
| **`category`** | string | **Yes** | Free text or slug — document if you use a taxonomy id instead. |
| **`quantityInStock`** | number (int ≥ 0) | **Yes** | Physical or logical stock for ops. |
| **`barcode`** | string \| null | No | EAN/GTIN. |
| **`weightGrams`** | number \| null | No | Shipping / correios. |
| **`description`** | string \| null | No | Long text / HTML policy — document. |
| **`slug`** | string \| null | No | URL segment; unique if present. |
| **`active`** | boolean | No (default `true`) | Listed in storefront when true. |
| **`_id`** | ObjectId string | Server | Read-only in forms. |

### Validation (POST/PATCH)

- Reject missing required fields with **422** and `{ "message": "…" }` or field-level errors.
- **`sku`**: normalize trim; uniqueness scope (global vs per-tenant) — document.
- **`price` / `compareAtPrice`**: reject NaN / negative where inappropriate.

### List response

Each list item should include enough for the table: at minimum **`primaryImageUrl`** or **`images[0]`**, **`name`**, **`sku`**, **`price`**, **`category`**, **`quantityInStock`**, **`active`**.

### 3.1 Product image upload (used by the web admin)

The **lmfit-web** product form sends **JPEG/PNG** as `multipart/form-data` and expects a **public HTTPS URL** back, then saves that string in **`primaryImageUrl`** on **`POST /products`** / **`PATCH /products/:id`**.

**`POST /products/images`** (JWT, same roles as product write):

- **Body:** `multipart/form-data` with one field **`file`** (configurable name if documented otherwise).
- **Accepted types:** `image/jpeg`, `image/png` only.
- **Max size:** recommend **5 MB** (return **413** with `{ "message": "…" }` if exceeded).
- **200** response JSON:

```json
{ "url": "https://cdn.example.com/products/abc.jpg" }
```

- **415** if MIME is not jpeg/png.
- **422** for other validation errors.

The client does **not** send raw binary on `POST /products`; it always uploads the image first (when the user picks a file), then includes **`primaryImageUrl`** in the JSON body.

---

## 4. Optional next steps

- **`GET /products/categories`** for a controlled vocabulary instead of free-text `category`.
- **OpenAPI** at `/docs` — tag **reports** + **products** with the DTOs above.

---

## 5. Ops

- If you add indexes for reporting (`purchaseDate`, `productId` on order lines), mention expected query windows (e.g. 90 days) for SLA.
