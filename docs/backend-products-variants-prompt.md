# Prompt for backend — product variants (cor / tamanho) on `lmfit-api`

Copy this whole note into your issue or chat with the **lmfit-api** team.

The **lmfit-web** admin screen **Produtos** (`/products`) already sends **`variants`** on **`POST /products`** and **`PATCH /products/:id`**. The backend must **persist** that array and return it on **list** and **detail** so staff can edit colors/sizes like Nuvemshop-style variations.

---

## 1. Why

- Orders and the public catalog resolve lines by **variant id** (see `GET /products` usage in pedidos + `GET /public/catalog/products`).
- Each sellable combination (**cor × tamanho**) needs its own **SKU**, **price**, and **stock**.

---

## 2. Variant object — contract (match web + seed)

Each element of **`variants`** is an object with at least:

| Field | Type | Required | Notes |
|--------|------|----------|--------|
| **`sku`** | string | **Yes** | Unique among variants of the product (and ideally globally — document scope). Trim whitespace. |
| **`color`** | string | No | Free text, e.g. `"Preto"`. Web sends `"Único"` when there is no real color dimension. |
| **`size`** | string | No | Free text, e.g. `"M"`, `"GG"`. Web sends `"Único"` for single-size. |
| **`price`** | number | **Yes** | BRL, ≥ 0. |
| **`quantityInStock`** | integer | **Yes** | ≥ 0. Ops / admin stock. |
| **`quantityOnHand`** | integer | No | Web mirrors **`quantityInStock`** here for **public catalog** compatibility; if you only store one field, derive the other on read/write. |
| **`_id`** | ObjectId string | On update | Present when the variant already exists; **omit** on newly added rows so the server assigns ids. |

**Example body fragment** (as sent by lmfit-web today):

```json
{
  "name": "Legging Liz",
  "sku": "LIZ-LEG-P",
  "price": 89.9,
  "quantityInStock": 12,
  "category": "Leggings",
  "variants": [
    {
      "_id": "673abc…",
      "sku": "LIZ-LEG-P-PRETO-M",
      "color": "Preto",
      "size": "M",
      "price": 89.9,
      "quantityInStock": 4,
      "quantityOnHand": 4
    },
    {
      "sku": "LIZ-LEG-P-AZUL-P",
      "color": "Azul",
      "size": "P",
      "price": 89.9,
      "quantityInStock": 8,
      "quantityOnHand": 8
    }
  ]
}
```

- **Top-level** `sku`, `price`, and `quantityInStock` are **redundant with the first variant**; the web keeps them in sync for legacy list/reporting. You may treat them as **denormalized** from `variants[0]` or ignore duplicates if you only trust `variants`.

---

## 3. `POST /products` / `PATCH /products/:id`

### Accept

- Full product document including optional **`variants`** array as above.
- **`PATCH`**: recommended semantics — **replace** the variant set with the array sent (authoritative list), or document **merge** rules (e.g. match by `_id`, upsert without id, delete missing). The web sends the **full** list the user sees.

### Validate

- **422** if:
  - `variants` is present but empty.
  - Any variant missing `sku` or invalid `price` / stock.
  - **Duplicate `sku`** within the same product (case-insensitive if you align with the web).
- **409** / **422** if `sku` collides with another product or variant per your uniqueness rules.

### Persist

- Store variants **nested under the product** (embedded array) **or** separate `product_variants` collection with `productId` — either is fine; document which.
- Ensure each variant has a stable **`_id`** returned to the client after create.

### Respond

- **`GET /products`** (paginated list): each item should include **`variants`** when present (or at least count + first variant — **full array preferred** so the admin can edit without an extra round-trip).
- **`GET /products/:id`** (if exists): full **`variants`** array.
- **`PATCH`** response: return updated product including **`variants`**.

---

## 4. Public catalog and orders (downstream)

- **`GET /public/catalog/products`** (or equivalent): each product should expose **`variants`** with **`_id`**, **`sku`**, **`color`**, **`size`**, **`price`**, and stock visible to the policy you choose (**`quantityOnHand`** and/or **`quantityInStock`** — lmfit-web reads **`quantityOnHand`** in the catalog UI).
- **Order lines** should continue to reference **`variantId`** (the variant’s **`_id`**) + snapshot fields as you already design.

---

## 5. Backward compatibility

- Products **without** `variants` in DB: treat as a **single implicit variant** using top-level `sku`, `price`, `quantityInStock` (same as today).
- Products **with** `variants`: top-level `sku` / `price` / `quantityInStock` should stay consistent with **`variants[0]`** for dashboards and old clients.

---

## 6. Reference in this repo

- Web payload builder: `src/lib/products/variantDrafts.ts` (`draftsToApiVariants`).
- Demo seed that posts nested `variants`: `scripts/seed-demo-data.mjs`.

---

## 7. Done when

- [ ] `POST` / `PATCH` persist `variants` with validation above.
- [ ] `GET` list/detail return `variants` for the admin UI.
- [ ] Public catalog and order flows still resolve variant by **`_id`**.
- [ ] OpenAPI or internal README updated with the variant DTO.
