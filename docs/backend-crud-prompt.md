# Prompt for backend: staff REST API (CRUD + Excel)

Copy the sections below into your issue / chat with the API team. The web admin (`lmfit-web`) consumes these contracts with JWT (`Authorization: Bearer …`) and base URL `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

---

## 1. Context

The panel lists resources in tables with **create / edit / delete**, **Excel template download**, **import**, and **export**. The UI tries **server-side import/export first**, then falls back to **browser-only** export (current page rows) and **row-by-row POST/PATCH** import when batch endpoints are missing.

---

## 2. List (existing)

**GET** `{resourcePath}?page=1&limit=50`

```json
{
  "items": [{ … }],
  "total": 0
}
```

For **full export** without pagination limits, prefer a dedicated export route (section 5).

### Invoices: status filter + options + DTO fields

- **List filter:** **`GET /invoices?page=1&limit=50&status=<canonical>`** where `status` is optional and one of: `pending`, `paid`, `overdue`, `cancelled` (server-side filter, same auth as list).
- **`GET /invoices/status-options`** (same JWT / roles as invoices) returns JSON for filters and forms:
  - `statuses`: `[{ "value", "labelPtBr", "descriptionPtBr" }, …]` — canonical `value` only.
  - `legacyMap`: e.g. `{ "open": "pending", "void": "cancelled" }` for staff copy and client mapping.
  - `notePtBr` (optional): short help shown in the UI.
- **List/detail items (recommended):** include `status` (as stored, may be legacy), **`statusLabelPtBr`**, **`statusCanonical`**. The UI uses **`statusCanonical`** for badge colors and **`statusLabelPtBr`** for text; **POST/PATCH** bodies use **`status`** with **only** the four canonical values (never `open` / `void` on write).

---

## 3. CRUD (existing)

| Method | Path | Body | Success |
|--------|------|------|---------|
| **POST** | `{resourcePath}` | JSON writable fields | **201** (+ created body or `{ "item": { … } }` — document shape) |
| **PATCH** | `{resourcePath}/:id` | Partial JSON | **200** / **204** |
| **DELETE** | `{resourcePath}/:id` | — | **200** / **204** |

### Identifiers

- Default **`:id`** = document **`_id`** (Mongo-style).
- **`/order-drafts`**: **`:id`** = **`sessionToken`** (same string as in list rows). Encode unsafe characters in URLs.

### Errors & auth

- **4xx** JSON `{ "message": "…" }` or `{ "message": ["…"] }` — the UI shows `message`.
- **422** for validation errors.
- **403** when JWT is valid but role cannot access the resource.

---

## 4. Excel import (recommended)

The UI sends data in this order:

1. **JSON batch** — **POST** `{resourcePath}/import` with `Content-Type: application/json` and body:
   ```json
   {
     "items": [
       { "name": "…", "email": "…" }
     ]
   }
   ```
   - Each object uses **API field names** (same keys as in `GET` items), not Portuguese labels.
   - Optional **`dryRun`: true** — validate all rows and return **200** with `{ "valid": n, "errors": [{ "row": 2, "message": "…" }] }` without writing (nice for large sheets).

2. **Multipart file** — if JSON import returns **404**, **405**, or **501**, the UI retries **POST** `{resourcePath}/import` with **`multipart/form-data`** and a single field **`file`** (`.xlsx` / `.xls`). The server parses the workbook (first sheet, first row = headers). Header cells may match either **Portuguese column titles** (as shown in the UI) or **API keys** (case-insensitive, accents ignored).

3. **Fallback** — if both are unavailable, the browser **POSTs each row** (no id) or **PATCHes** when the row includes the resource id (`_id` or `sessionToken` for drafts).

### Import response (recommended)

**200** or **201** JSON, for example:

```json
{
  "imported": 42,
  "updated": 3,
  "skipped": 1,
  "message": "Importação concluída."
}
```

If some rows fail, prefer **207** or **200** with:

```json
{
  "imported": 10,
  "errors": [{ "row": 5, "message": "E-mail duplicado" }]
}
```

The UI can surface `message` and optionally log `errors[]`.

### Server-side parsing rules (multipart)

- First sheet only (or document which sheet name is used, e.g. `"Dados"`).
- Row 1 = headers; row 2+ = data.
- Ignore completely empty rows.
- Booleans: accept `Sim` / `Não`, `TRUE` / `FALSE`, `1` / `0`.
- Numbers: accept comma or dot as decimal separator.

### Resources that should support import

Same list as CRUD: `/customers`, `/suppliers`, `/products`, `/orders`, `/purchases`, `/invoices`, `/users`, `/order-drafts` (id = `sessionToken`).

**`/users`**: if `password` is required on create, either accept it only in import rows (document security implications) or reject import with a clear `message` and a dedicated “invite user” flow.

---

## 5. Excel export (recommended)

**GET** `{resourcePath}/export?format=xlsx`

- **200** with body = **binary** `.xlsx` (OpenXML).
- **`Content-Type`**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (or `application/octet-stream` with a non-trivial binary body).
- Optional: **`Content-Disposition: attachment; filename="customers.xlsx"`**.

Export should include **all** rows the user is allowed to see (respect the same filters/roles as list), not only the first page, so staff can back up or edit offline.

If this route is **missing**, the UI exports **only the rows currently loaded** in the table (client-generated `.xlsx`).

---

## 6. Optional extensions

- **Dashboard + produtos (campos e relatórios extras):** see `docs/backend-dashboard-products-prompt.md`.
- **GET** `{resourcePath}/export?format=csv` — same semantics, CSV body.
- **Async jobs** for huge imports: **202** + `{ "jobId": "…" }` and **GET** `/import-jobs/:jobId` — document status/poll interval; the current UI does not poll yet.
- **OpenAPI** for generated clients.
- **Optimistic locking** (`If-Match` / `version`) for concurrent edits.

---

## 7. Path prefix

If routes live under `/api/v1/...`, either set `NEXT_PUBLIC_API_URL` accordingly or tell the frontend team to change the `endpoint` strings on each page.
