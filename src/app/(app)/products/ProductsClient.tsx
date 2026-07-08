"use client";

import { useRef, useState, useMemo } from "react";
import { ProductImageCell } from "@/components/ProductImageCell";
import { ProductVariantsEditor, generateSkuSuggestion } from "@/components/ProductVariantsEditor";
import { ResourceList, type ResourceColumn } from "@/components/ResourceList";
import { formatBRL } from "@/lib/formatMoney";
import {
  draftsToApiVariants,
  flattenFirstVariantOnRow,
  validateVariantDrafts,
  type ProductVariantDraft,
} from "@/lib/products/variantDrafts";
import { lmfitTokens } from "@/theme/tokens";

type Row = Record<string, unknown>;

function formatPriceCell(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return String(v);
  return formatBRL(n);
}

function variantSummaryCell(row: Row): string {
  const v = row.variants;
  if (Array.isArray(v) && v.length > 1) return `${v.length} variações`;
  if (Array.isArray(v) && v.length === 1) {
    const o = v[0] as Record<string, unknown>;
    const bits = [o.color, o.size]
      .map((x) => (x != null && String(x).trim() ? String(x).trim() : ""))
      .filter(Boolean);
    return bits.join(" · ") || "1 variação";
  }
  return "Único";
}

/** All form columns — the modal shows everything */
const columns: ResourceColumn[] = [
  { key: "_id", label: "ID", editable: false, hiddenOnMobile: true, hideInForm: true },
  {
    key: "images",
    label: "Imagens",
    fieldType: "imageFile",
    formSpan: "full",
    imageFile: {
      uploadEndpoint: "/products/images",
      fieldName: "file",
      maxBytes: 5 * 1024 * 1024,
      multiple: true,
      syncPrimaryKey: "primaryImageUrl",
    },
  },
  { key: "name", label: "Nome", required: true, placeholder: "Nome do produto" },
  { key: "variants", label: "Variações", editable: false, excel: false, hiddenOnMobile: true },
  {
    key: "sku",
    label: "SKU (1ª var.)",
    hideInForm: true,
    required: false,
    placeholder: "Sincronizado com a 1ª linha de variações",
  },
  {
    key: "price",
    label: "Preço (1ª var.)",
    fieldType: "number",
    hideInForm: true,
    required: false,
    numberStep: "0.01",
  },
  {
    key: "compareAtPrice",
    label: "Preço comparado",
    fieldType: "number",
    numberStep: "0.01",
    placeholder: "Preço original antes do desconto (opcional)",
  },
  {
    key: "category",
    label: "Categoria",
    required: true,
    placeholder: "Ex.: Leggings, Shorts, Acessórios",
  },
  {
    key: "quantityInStock",
    label: "Estoque (1ª var.)",
    fieldType: "number",
    hideInForm: true,
    required: false,
  },
  { key: "barcode", label: "Cód. de barras (EAN/GTIN)", placeholder: "Opcional" },
  { key: "weightGrams", label: "Peso (g)", fieldType: "number" },
  {
    key: "description",
    label: "Descrição",
    fieldType: "textarea",
    formSpan: "full",
    placeholder: "Descrição para o site (opcional)",
  },
  { key: "slug", label: "Slug (URL)", placeholder: "opcional — gerado a partir do nome se vazio" },
  { key: "active", label: "Ativo na loja", fieldType: "checkbox" },
];

/** Only these keys appear in the table — keeps it focused and readable */
const TABLE_COLUMNS = ["images", "name", "variants", "price", "active"] as const;

export function ProductsClient() {
  const variantsRef = useRef<ProductVariantDraft[]>([]);
  const [search, setSearch] = useState("");

  const filterRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return undefined;
    return (rows: Row[]) =>
      rows.filter((r) => {
        const haystack = [r.name, r.sku, r.category]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase())
          .join(" ");
        return haystack.includes(q);
      });
  }, [search]);

  return (
    <ResourceList
      title="Produtos"
      endpoint="/products"
      exportFileBase="produtos"
      modalLayout="wide"
      modalTitleCreate="Novo produto"
      modalTitleEdit="Editar produto"
      columns={columns}
      tableColumns={[...TABLE_COLUMNS]}
      filterRows={filterRows}
      normalizeRowForForm={flattenFirstVariantOnRow}
      toolbarExtras={
        <div className="flex items-center gap-2">
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none select-none"
              aria-hidden
            >
              🔍
            </span>
            <input
              type="search"
              placeholder="Buscar por nome, SKU ou categoria…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-md border text-sm min-h-10 w-72"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
          </div>
          {search && (
            <button
              type="button"
              className="text-xs underline"
              style={{ color: lmfitTokens.textMuted }}
              onClick={() => setSearch("")}
            >
              Limpar
            </button>
          )}
        </div>
      }
      formAppendix={(ctx) => (
        <ProductVariantsEditor
          resetKey={ctx.formResetKey}
          productRow={ctx.modal === "edit" ? ctx.editingRow : null}
          productName={ctx.formValues.name || ""}
          onDraftsChange={(d) => {
            variantsRef.current = d;
            const f = d[0];
            if (!f) return;
            ctx.setFormValues((prev) => ({
              ...prev,
              sku: f.sku,
              price: Number.isFinite(f.price) ? f.price.toFixed(2) : prev.price,
              quantityInStock: String(Math.max(0, Math.floor(f.quantityInStock))),
            }));
          }}
        />
      )}
      validateBeforeSubmit={(ctx) => {
        const productName = ctx.formValues.name || "";
        const drafts = variantsRef.current;
        for (const d of drafts) {
          if (!d.sku.trim()) {
            d.sku = generateSkuSuggestion(productName, d.color, d.size);
          }
        }
        return validateVariantDrafts(drafts);
      }}
      mergeSubmitPayload={(body) => {
        const drafts = variantsRef.current;
        const first = drafts[0];
        if (!first) return body;
        return {
          ...body,
          sku: first.sku.trim(),
          price: first.price,
          quantityInStock: Math.max(0, Math.floor(first.quantityInStock)),
          variants: draftsToApiVariants(drafts),
        };
      }}
      cellRender={{
        images: (row: Row) => <ProductImageCell row={row} />,

        name: (row: Row) => (
          <div className="min-w-0">
            <p
              className="font-medium truncate max-w-[14rem]"
              style={{ color: lmfitTokens.text }}
              title={String(row.name ?? "")}
            >
              {String(row.name ?? "—")}
            </p>
            {row.category ? (
              <p className="text-xs mt-0.5 truncate" style={{ color: lmfitTokens.textMuted }}>
                {String(row.category)}
              </p>
            ) : null}
            {row.sku ? (
              <p className="text-xs mt-0.5 font-mono" style={{ color: lmfitTokens.textMuted }}>
                SKU: {String(row.sku)}
              </p>
            ) : null}
          </div>
        ),

        variants: (row: Row) => {
          const count = Array.isArray(row.variants) ? row.variants.length : 0;
          return (
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-gray-50 dark:bg-white/10"
              style={{
                borderColor: lmfitTokens.border,
                color: lmfitTokens.textMuted,
              }}
            >
              {count > 1 ? `${count} var.` : variantSummaryCell(row)}
            </span>
          );
        },

        price: (row: Row) => {
          const currentPrice = row.priceRetail ?? row.price;
          return (
            <div className="tabular-nums flex flex-col justify-center">
              {row.compareAtPrice ? (
                <span
                  className="text-[11px] line-through leading-none mb-0.5"
                  style={{ color: lmfitTokens.textMuted }}
                >
                  {formatPriceCell(row.compareAtPrice)}
                </span>
              ) : null}
              <span 
                className={`font-semibold ${row.compareAtPrice ? 'text-sm' : 'text-sm'}`} 
                style={{ color: row.compareAtPrice ? lmfitTokens.success : lmfitTokens.text }}
              >
                {formatPriceCell(currentPrice)}
              </span>
            </div>
          );
        },

        active: (row: Row) => {
          const isActive = row.active === true || row.active === "true" || row.active === 1;
          return (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--kivoni-success) 15%, transparent)"
                  : "var(--chart-track)",
                color: isActive ? "var(--kivoni-success)" : "var(--kivoni-text-muted)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: isActive
                    ? "var(--kivoni-success)"
                    : "var(--kivoni-text-muted)",
                }}
              />
              {isActive ? "Ativo" : "Inativo"}
            </span>
          );
        },
      }}
    />
  );
}
