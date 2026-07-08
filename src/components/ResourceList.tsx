"use client";

import axios, { isAxiosError } from "axios";
import Link from "next/link";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buildDataAoA,
  downloadTemplate,
  downloadXlsxFile,
  inferResourceFieldType,
  parseWorkbookToItems,
} from "@/lib/excelIo";
import { slugifyFileBase } from "@/lib/slugifyFileBase";
import { validateProductImageFile } from "@/lib/imageUpload";
import { http } from "@/lib/http";
import {
  formatBRLInputDisplay,
  isBRLMoneyField,
  isValidEmail,
  maskBrazilPhone,
  maxPhoneDigits,
  normalizeEmail,
  onlyDigits,
  parseBRLMoneyInput,
} from "@/lib/inputMasks";
import { ImageGalleryGrid } from "@/components/ImageGalleryGrid";
import {
  parseImageGalleryJson,
  resolvePrimaryImageUrl,
  resolveProductImageUrls,
} from "@/lib/productImageUrl";
import { lmfitTokens } from "@/theme/tokens";

type Row = Record<string, unknown>;

export type ResourceColumn = {
  key: string;
  label: string;
  fieldType?:
    | "text"
    | "email"
    | "tel"
    | "number"
    | "checkbox"
    | "select"
    | "textarea"
    | "url"
    | "imageFile";
  /** If false, column appears in the table but not in create/edit forms */
  editable?: boolean;
  /** When true, block save if the field is empty (except checkbox). */
  required?: boolean;
  /** Required when `fieldType` is `select` */
  selectOptions?: { value: string; label: string; description?: string }[];
  /** Initial value for create form (e.g. invoice `status` → `pending`) */
  defaultValue?: string;
  /** Map legacy stored values to a canonical option `value` (e.g. `open` → `pending`) */
  legacyValueMap?: Record<string, string>;
  /** Wide modal: span full width of the 2-column grid (e.g. description). */
  formSpan?: "full" | "half";
  /** Omite o campo do formulário (mantém na tabela / Excel quando aplicável). */
  hideInForm?: boolean;
  /** Incluir coluna em modelo / import / export Excel (padrão: true). */
  excel?: boolean;
  /** `input type="number"` step (defaults by field name for `number`). */
  numberStep?: string;
  /** When `fieldType` is `imageFile`: upload then set URL(s) on the resource JSON. */
  imageFile?: {
    uploadEndpoint: string;
    fieldName?: string;
    maxBytes?: number;
    /** Galeria: várias imagens; o formulário guarda `JSON.stringify(url[])` em `key`. */
    multiple?: boolean;
    /** Ex.: `primaryImageUrl` = primeira URL da galeria (compatível com APIs legadas). */
    syncPrimaryKey?: string;
  };
  placeholder?: string;
  /** Hide in the table on small screens (mobile). */
  hiddenOnMobile?: boolean;
};

function defaultNumberStep(c: ResourceColumn): string {
  if (c.numberStep) return c.numberStep;
  const k = c.key.toLowerCase();
  if (k.includes("price") || k.includes("amount")) return "0.01";
  return "1";
}

function rowId(row: Row, idKey: string): string | null {
  const v = row[idKey];
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function rowToFormValues(columns: ResourceColumn[], row: Row, idKey: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of columns) {
    if (c.key === idKey) {
      const id = rowId(row, idKey);
      out[c.key] = id ?? "";
      continue;
    }
    let v = row[c.key];
    if (
      inferResourceFieldType(c) === "imageFile" &&
      !c.imageFile?.multiple &&
      c.key === "primaryImageUrl" &&
      (v === null || v === undefined || v === "")
    ) {
      const resolved = resolvePrimaryImageUrl(row);
      if (resolved) v = resolved;
    }
    const ft = inferResourceFieldType(c);
    if (ft === "select") {
      if (c.key === "status" && row.statusCanonical != null) {
        const cc = String(row.statusCanonical);
        if (c.selectOptions?.some((o) => o.value === cc)) {
          out[c.key] = cc;
          continue;
        }
      }
      let s = v != null && v !== "" ? String(v) : "";
      if (s && c.legacyValueMap?.[s]) s = c.legacyValueMap[s];
      if (s && c.selectOptions?.some((o) => o.value === s)) {
        out[c.key] = s;
        continue;
      }
      out[c.key] = c.defaultValue ?? c.selectOptions?.[0]?.value ?? "";
      continue;
    }
    if (ft === "checkbox") {
      out[c.key] = v === true || v === "true" || v === 1 || v === "1" ? "true" : "false";
    } else if (ft === "imageFile" && c.imageFile?.multiple) {
      out[c.key] = JSON.stringify(resolveProductImageUrls(row));
    } else if (v === null || v === undefined) {
      out[c.key] = "";
    } else if (typeof v === "object") {
      out[c.key] = JSON.stringify(v);
    } else if (ft === "number" && isBRLMoneyField(c.key)) {
      const n =
        typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
      out[c.key] = Number.isFinite(n) ? n.toFixed(2) : String(v);
    } else if (ft === "tel") {
      out[c.key] = onlyDigits(String(v), maxPhoneDigits(c.key));
    } else if (ft === "email") {
      out[c.key] = normalizeEmail(String(v));
    } else {
      out[c.key] = String(v);
    }
  }
  return out;
}

function emptyFormValues(columns: ResourceColumn[], idKey: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of columns) {
    if (c.key === idKey) {
      out[c.key] = "";
      continue;
    }
    const ft = inferResourceFieldType(c);
    if (ft === "select") {
      out[c.key] = c.defaultValue ?? c.selectOptions?.[0]?.value ?? "";
      continue;
    }
    if (ft === "imageFile" && c.imageFile?.multiple) {
      out[c.key] = "[]";
      continue;
    }
    out[c.key] = ft === "checkbox" ? "false" : "";
  }
  return out;
}

function collectMissingRequired(
  columns: ResourceColumn[],
  formValues: Record<string, string>,
  idKey: string,
  imageFiles: Record<string, File | null>,
  imageStagedMulti: Record<string, { file: File; preview: string }[]>,
): ResourceColumn[] {
  return columns.filter((c) => {
    if (c.hideInForm) return false;
    if (c.required !== true) return false;
    if (c.editable === false) return false;
    if (c.key === idKey) return false;
    const ft = inferResourceFieldType(c);
    const raw = (formValues[c.key] ?? "").trim();
    if (ft === "checkbox") return false;
    if (ft === "imageFile") {
      if (c.imageFile?.multiple) {
        const urls = parseImageGalleryJson(raw);
        const staged = imageStagedMulti[c.key]?.length ?? 0;
        return urls.length === 0 && staged === 0;
      }
      const hasFile = Boolean(imageFiles[c.key]);
      const hasUrl = raw !== "";
      return !hasFile && !hasUrl;
    }
    if (ft === "number") {
      if (raw === "") return true;
      const n = Number(raw.replace(",", "."));
      return !Number.isFinite(n);
    }
    if (ft === "tel") {
      if (raw === "") return true;
      const d = onlyDigits(raw, maxPhoneDigits(c.key));
      return d.length < 10;
    }
    if (ft === "email") {
      if (raw === "") return true;
      return !isValidEmail(raw);
    }
    return raw === "";
  });
}

function buildPayload(
  columns: ResourceColumn[],
  formValues: Record<string, string>,
  idKey: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const c of columns) {
    if (c.key === idKey) continue;
    if (c.editable === false) continue;
    const raw = formValues[c.key] ?? "";
    const ft = inferResourceFieldType(c);
    if (ft === "select") {
      const v = raw.trim();
      if (!v) {
        payload[c.key] = c.defaultValue ?? c.selectOptions?.[0]?.value ?? null;
      } else if (c.selectOptions?.length && !c.selectOptions.some((o) => o.value === v)) {
        payload[c.key] = c.defaultValue ?? c.selectOptions[0]?.value ?? null;
      } else {
        payload[c.key] = v;
      }
    } else if (ft === "checkbox") {
      payload[c.key] = raw === "true" || raw === "1";
    } else if (ft === "number") {
      if (raw.trim() === "") payload[c.key] = null;
      else {
        const n = Number(raw.replace(",", "."));
        payload[c.key] = Number.isFinite(n) ? n : null;
      }
    } else if (ft === "tel") {
      const d = onlyDigits(raw, maxPhoneDigits(c.key));
      payload[c.key] = d === "" ? null : d;
    } else if (ft === "email") {
      const e = normalizeEmail(raw);
      payload[c.key] = e === "" ? null : e;
    } else if (ft === "imageFile") {
      if (c.imageFile?.multiple) {
        const arr = parseImageGalleryJson(raw);
        payload[c.key] = arr.length ? arr : null;
        const sync = c.imageFile.syncPrimaryKey;
        if (sync) payload[sync] = arr[0] ?? null;
      } else {
        payload[c.key] = raw.trim() === "" ? null : raw.trim();
      }
    } else if (ft === "textarea" || ft === "url") {
      payload[c.key] = raw.trim() === "" ? null : raw;
    } else {
      payload[c.key] = raw.trim() === "" ? null : raw;
    }
  }
  return payload;
}

function payloadForImport(columns: ResourceColumn[], item: Row, idKey: string): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  for (const c of columns) {
    if (c.key === idKey) continue;
    if (c.editable === false) continue;
    if (!(c.key in item)) continue;
    p[c.key] = item[c.key];
  }
  return p;
}

function formatCell(v: unknown, columnKey?: string): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return JSON.stringify(v);
  if (columnKey && isBRLMoneyField(columnKey)) {
    const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(n)) return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (columnKey && inferResourceFieldType({ key: columnKey, label: "" }) === "tel") {
    const s = String(v);
    const masked = maskBrazilPhone(s);
    return masked || s;
  }
  return String(v);
}

function saveErrorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    const d = e.response?.data as unknown;
    if (typeof d === "string" && d.trim()) return d;
    if (d && typeof d === "object" && "message" in d) {
      const m = (d as { message: unknown }).message;
      if (typeof m === "string") return m;
      if (Array.isArray(m)) return m.join(", ");
    }
    if (e.response?.status) return `Erro ${e.response.status}`;
  }
  return "Não foi possível salvar.";
}

export type ResourceFormAppendixContext = {
  modal: "create" | "edit";
  /** Incrementado a cada abertura do modal (criar/editar) para reiniciar anexos como o editor de variantes. */
  formResetKey: number;
  editingRow: Row | null;
  formValues: Record<string, string>;
  setFormValues: Dispatch<SetStateAction<Record<string, string>>>;
  idKey: string;
};

export type ResourceSubmitHookContext = {
  modal: "create" | "edit";
  editingRow: Row | null;
  formValues: Record<string, string>;
  mergedFormValues: Record<string, string>;
  idKey: string;
};

export function ResourceList({
  title,
  endpoint,
  columns,
  tableColumns: tableColumnKeys,
  filterRows,
  idKey = "_id",
  crud = true,
  excel = true,
  exportFileBase,
  cellRender,
  extraListParams,
  toolbarExtras,
  modalLayout = "default",
  modalTitleCreate,
  modalTitleEdit,
  detailHref,
  /** Ajusta a linha antes de preencher o formulário (ex.: espelhar 1ª variante em sku/preço). */
  normalizeRowForForm,
  /** Conteúdo extra no final do formulário (ex.: editor de variações). */
  formAppendix,
  /** Validação extra antes de `collectMissingRequired` / envio. Retorne mensagem de erro ou null. */
  validateBeforeSubmit,
  /** Ajusta o JSON final do POST/PATCH (ex.: anexar `variants`). */
  mergeSubmitPayload,
}: {
  title: string;
  endpoint: string;
  columns: ResourceColumn[];
  /**
   * Subset of column keys to render in the table. When omitted all columns are shown.
   * The form always uses the full `columns` array.
   */
  tableColumns?: string[];
  /**
   * Optional client-side filter applied to loaded rows before rendering.
   * Useful for instant search without a new API call.
   */
  filterRows?: (rows: Row[]) => Row[];
  idKey?: string;
  /** When set, an extra "Ficha" link is shown in the actions column (e.g. `/customers/:id`). */
  detailHref?: (row: Row) => string | null | undefined;
  crud?: boolean;
  /** Import/export .xlsx (modelo, exportar tela, importar com fallback client-side). */
  excel?: boolean;
  /** Nome-base dos arquivos (sem extensão); padrão: slug do título. */
  exportFileBase?: string;
  /** Custom cell content by column key (e.g. invoice status badge). */
  cellRender?: Partial<Record<string, (row: Row) => ReactNode>>;
  /** Merged into list GET `params` (e.g. `{ status: "paid" }`). */
  extraListParams?: Record<string, string | undefined>;
  /** Extra controls rendered under the title row (filters, hints). */
  toolbarExtras?: ReactNode;
  /** `wide` = larger dialog + 2-column form grid (e.g. products). */
  modalLayout?: "default" | "wide";
  modalTitleCreate?: string;
  modalTitleEdit?: string;
  normalizeRowForForm?: (row: Row) => Row;
  formAppendix?: (ctx: ResourceFormAppendixContext) => ReactNode;
  validateBeforeSubmit?: (ctx: {
    modal: "create" | "edit";
    editingRow: Row | null;
    formValues: Record<string, string>;
    mergedFormValues: Record<string, string>;
    idKey: string;
    imageFiles: Record<string, File | null>;
    imageStagedMulti: Record<string, { file: File; preview: string }[]>;
  }) => string | null;
  mergeSubmitPayload?: (
    payload: Record<string, unknown>,
    ctx: ResourceSubmitHookContext,
  ) => Record<string, unknown>;
}) {
  /** Columns actually rendered in the table (may be a subset). */
  const visibleTableColumns = useMemo(
    () =>
      tableColumnKeys
        ? tableColumnKeys.map((k) => columns.find((c) => c.key === k)).filter(Boolean) as ResourceColumn[]
        : columns,
    [tableColumnKeys, columns],
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  /** Rows after applying optional client-side filter (e.g. search). */
  const displayRows = useMemo(
    () => (filterRows ? filterRows(rows) : rows),
    [filterRows, rows],
  );

  const formColumns = useMemo(
    () =>
      columns.filter((c) => c.editable !== false && c.key !== idKey && !c.hideInForm),
    [columns, idKey],
  );

  const excelColumns = useMemo(
    () => columns.filter((c) => c.excel !== false),
    [columns],
  );

  const showActionsColumn = Boolean(crud || detailHref);

  const listParamsKey = JSON.stringify(extraListParams ?? {});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const params: Record<string, string | number> = { page: 1, limit: 50 };
        try {
          const extra = JSON.parse(listParamsKey) as Record<string, string | undefined>;
          for (const [k, v] of Object.entries(extra)) {
            if (v !== undefined && v !== "") params[k] = v;
          }
        } catch {
          /* ignore */
        }
        const { data } = await http.get<{ items: Row[]; total: number }>(endpoint, {
          params,
        });
        if (!cancelled) {
          setRows(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch {
        if (!cancelled) {
          setErr("Não foi possível carregar.");
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoint, reload, listParamsKey]);

  const bump = () => setReload((n) => n + 1);

  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [imageFiles, setImageFiles] = useState<Record<string, File | null>>({});
  const [imagePreviewByKey, setImagePreviewByKey] = useState<Record<string, string>>({});
  const [imageStagedMulti, setImageStagedMulti] = useState<
    Record<string, { file: File; preview: string }[]>
  >({});
  /** Evita flicker no highlight de drag-and-drop (contador por coluna). */
  const [galleryDropDepth, setGalleryDropDepth] = useState<Record<string, number>>({});
  const galleryFieldIdPrefix = useId();

  useEffect(() => {
    if (modal == null) return;
    const onDragEnd = () => setGalleryDropDepth({});
    window.addEventListener("dragend", onDragEnd);
    return () => window.removeEventListener("dragend", onDragEnd);
  }, [modal]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importBanner, setImportBanner] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const fileBase = exportFileBase ?? slugifyFileBase(title);

  async function exportExcel() {
    setImportBanner(null);
    try {
      const res = await http.get(`${endpoint}/export`, {
        responseType: "blob",
        params: { format: "xlsx" },
      });
      const blob = res.data as Blob;
      const ct = String(res.headers["content-type"] ?? "").toLowerCase();
      const looksLikeSheet =
        ct.includes("spreadsheetml") ||
        ct.includes("ms-excel") ||
        (ct.includes("octet-stream") && blob.size > 64);
      if (looksLikeSheet && !ct.includes("text/html") && !ct.includes("application/json")) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileBase}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      /* servidor sem /export — exporta a página atual */
    }
    downloadXlsxFile(fileBase, buildDataAoA(excelColumns, rows));
  }

  async function onImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportBanner(null);
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      let items: Record<string, unknown>[];
      try {
        items = parseWorkbookToItems(buf, excelColumns);
      } catch {
        setImportBanner({ kind: "error", text: "Planilha inválida ou ilegível." });
        return;
      }
      if (items.length === 0) {
        setImportBanner({ kind: "error", text: "Nenhuma linha de dados (verifique o cabeçalho na 1ª linha)." });
        return;
      }

      try {
        const { data } = await http.post<{ message?: string; imported?: number }>(`${endpoint}/import`, {
          items,
        });
        bump();
        setImportBanner({
          kind: "ok",
          text:
            data?.message ??
            (typeof data?.imported === "number"
              ? `${data.imported} registro(s) importados no servidor.`
              : `${items.length} registro(s) enviados ao servidor.`),
        });
        return;
      } catch (e1) {
        const st = isAxiosError(e1) ? e1.response?.status : 0;
        if (st === 404 || st === 405 || st === 501) {
          try {
            const fd = new FormData();
            fd.append("file", file);
            await http.post(`${endpoint}/import`, fd);
            bump();
            setImportBanner({ kind: "ok", text: "Arquivo recebido pelo servidor (importação processada)." });
            return;
          } catch {
            /* client-side fallback */
          }
        } else if (isAxiosError(e1)) {
          setImportBanner({ kind: "error", text: saveErrorMessage(e1) });
          return;
        }
      }

      let ok = 0;
      let fail = 0;
      for (const item of items) {
        try {
          const payload = payloadForImport(excelColumns, item, idKey);
          const id = rowId(item, idKey);
          if (id) {
            await http.patch(`${endpoint}/${encodeURIComponent(id)}`, payload);
          } else {
            await http.post(endpoint, payload);
          }
          ok++;
        } catch {
          fail++;
        }
      }
      bump();
      setImportBanner({
        kind: fail ? "error" : "ok",
        text: `Importação no navegador: ${ok} salvo(s)${fail ? `, ${fail} falha(s)` : ""}.`,
      });
    } finally {
      setImporting(false);
    }
  }

  function revokeImagePreviews() {
    setImagePreviewByKey((prev) => {
      for (const u of Object.values(prev)) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* ignore */
        }
      }
      return {};
    });
  }

  function revokeImageStagedMulti() {
    setImageStagedMulti((prev) => {
      for (const arr of Object.values(prev)) {
        for (const x of arr) {
          try {
            URL.revokeObjectURL(x.preview);
          } catch {
            /* ignore */
          }
        }
      }
      return {};
    });
  }

  function appendValidatedGalleryFiles(columnKey: string, fileList: FileList | File[] | null, maxBytes: number) {
    if (!fileList || (Array.isArray(fileList) ? fileList.length === 0 : fileList.length === 0)) return;
    const list = Array.isArray(fileList) ? fileList : Array.from(fileList);
    for (const f of list) {
      const verr = validateProductImageFile(f, maxBytes);
      if (verr) {
        setSaveErr(verr);
        return;
      }
    }
    setSaveErr(null);
    setImageStagedMulti((prev) => {
      const nextStaged = [...(prev[columnKey] ?? [])];
      for (const f of list) {
        nextStaged.push({ file: f, preview: URL.createObjectURL(f) });
      }
      return { ...prev, [columnKey]: nextStaged };
    });
  }

  function openCreate() {
    setSaveErr(null);
    setEditingRow(null);
    setImageFiles({});
    revokeImagePreviews();
    revokeImageStagedMulti();
    setGalleryDropDepth({});
    setFormValues(emptyFormValues(columns, idKey));
    setFormResetKey((k) => k + 1);
    setModal("create");
  }

  function openEdit(row: Row) {
    const id = rowId(row, idKey);
    if (!id) return;
    setSaveErr(null);
    setImageFiles({});
    revokeImagePreviews();
    revokeImageStagedMulti();
    setGalleryDropDepth({});
    const normalized = normalizeRowForForm ? normalizeRowForForm(row) : row;
    setEditingRow(normalized);
    setFormValues(rowToFormValues(columns, normalized, idKey));
    setFormResetKey((k) => k + 1);
    setModal("edit");
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setEditingRow(null);
    setSaveErr(null);
    setImageFiles({});
    revokeImagePreviews();
    revokeImageStagedMulti();
    setGalleryDropDepth({});
  }

  async function onSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    setSaveErr(null);
    setSaving(true);

    let merged: Record<string, string> = { ...formValues };

    async function uploadOneImage(c: ResourceColumn, file: File): Promise<string> {
      const maxB = c.imageFile!.maxBytes ?? 5 * 1024 * 1024;
      const verr = validateProductImageFile(file, maxB);
      if (verr) throw new Error(verr);
      const fd = new FormData();
      fd.append(c.imageFile!.fieldName ?? "file", file);
      const { data } = await http.post<{ url?: string }>(c.imageFile!.uploadEndpoint, fd);
      const url = data?.url;
      if (!url || typeof url !== "string") throw new Error("Resposta do servidor sem URL da imagem.");
      return url;
    }

    for (const c of columns) {
      if (c.fieldType !== "imageFile" || !c.imageFile?.uploadEndpoint) continue;
      if (!c.imageFile.multiple) continue;
      const staged = imageStagedMulti[c.key] ?? [];
      if (staged.length === 0) continue;
      let urls = parseImageGalleryJson(merged[c.key] ?? "[]");
      try {
        for (const { file } of staged) {
          const url = await uploadOneImage(c, file);
          urls = [...urls, url];
        }
        merged = { ...merged, [c.key]: JSON.stringify(urls) };
        for (const { preview } of staged) {
          try {
            URL.revokeObjectURL(preview);
          } catch {
            /* ignore */
          }
        }
        setImageStagedMulti((prev) => {
          const next = { ...prev };
          delete next[c.key];
          return next;
        });
        setFormValues((prev) => ({ ...prev, [c.key]: JSON.stringify(urls) }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : saveErrorMessage(err);
        const st = isAxiosError(err) ? err.response?.status : 0;
        if (st === 404 || st === 405 || st === 501) {
          setSaveErr(
            "Envio de imagem ainda não disponível na API. Peça ao backend a rota POST /products/images (veja docs/backend-dashboard-products-prompt.md).",
          );
        } else {
          setSaveErr(msg);
        }
        setSaving(false);
        return;
      }
    }

    for (const c of columns) {
      if (c.fieldType !== "imageFile" || !c.imageFile?.uploadEndpoint) continue;
      if (c.imageFile.multiple) continue;
      const file = imageFiles[c.key];
      if (!file) continue;
      try {
        const url = await uploadOneImage(c, file);
        merged = { ...merged, [c.key]: url };
      } catch (err) {
        const msg = err instanceof Error ? err.message : saveErrorMessage(err);
        const st = isAxiosError(err) ? err.response?.status : 0;
        if (st === 404 || st === 405 || st === 501) {
          setSaveErr(
            "Envio de imagem ainda não disponível na API. Peça ao backend a rota POST /products/images (veja docs/backend-dashboard-products-prompt.md).",
          );
        } else {
          setSaveErr(msg);
        }
        setSaving(false);
        return;
      }
    }

    const customErr = validateBeforeSubmit?.({
      modal: modal ?? "create",
      editingRow,
      formValues,
      mergedFormValues: merged,
      idKey,
      imageFiles,
      imageStagedMulti,
    });
    if (customErr) {
      setSaveErr(customErr);
      setSaving(false);
      return;
    }

    const missing = collectMissingRequired(columns, merged, idKey, imageFiles, imageStagedMulti);
    if (missing.length) {
      setSaveErr(`Preencha os campos obrigatórios: ${missing.map((m) => m.label).join(", ")}.`);
      setSaving(false);
      return;
    }

    let body = buildPayload(columns, merged, idKey);
    if (mergeSubmitPayload && modal) {
      body = mergeSubmitPayload(body, {
        modal,
        editingRow,
        formValues,
        mergedFormValues: merged,
        idKey,
      });
    }
    try {
      if (modal === "edit") {
        const id = rowId(editingRow!, idKey);
        if (!id) throw new Error("missing id");
        await http.patch(`${endpoint}/${encodeURIComponent(id)}`, body);
      } else {
        await http.post(endpoint, body);
      }
      closeModal();
      bump();
    } catch (e) {
      if (!axios.isCancel(e)) setSaveErr(saveErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await http.delete(`${endpoint}/${encodeURIComponent(deleteId)}`);
      setDeleteId(null);
      bump();
    } catch (e) {
      setErr(saveErrorMessage(e));
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-baseline gap-2">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: lmfitTokens.text }}
        >
          {title}
        </h1>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            {loading ? "…" : `${total} registro(s)`}
          </span>
          {excel ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => void onImportFileChange(e)}
              />
              <button
                type="button"
                className="text-sm min-h-11 px-3 rounded-md border touch-manipulation disabled:opacity-50"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                disabled={importing}
                onClick={() => downloadTemplate(fileBase, excelColumns)}
              >
                Modelo Excel
              </button>
              <button
                type="button"
                className="text-sm min-h-11 px-3 rounded-md border touch-manipulation disabled:opacity-50"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                {importing ? "Importando…" : "Importar Excel"}
              </button>
              <button
                type="button"
                className="text-sm min-h-11 px-3 rounded-md border touch-manipulation"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                onClick={() => void exportExcel()}
              >
                Exportar Excel
              </button>
            </>
          ) : null}
          {crud ? (
            <button
              type="button"
              className="text-sm min-h-11 px-3 rounded-md font-medium text-white touch-manipulation"
              style={{ backgroundColor: lmfitTokens.primary }}
              onClick={openCreate}
            >
              Adicionar
            </button>
          ) : null}
        </div>
      </div>
      {toolbarExtras ? <div className="space-y-1">{toolbarExtras}</div> : null}
      {importBanner ? (
        <p
          className="text-sm rounded-md border px-3 py-2"
          style={{
            borderColor: lmfitTokens.border,
            color: importBanner.kind === "ok" ? lmfitTokens.success : lmfitTokens.error,
            backgroundColor: importBanner.kind === "ok" ? lmfitTokens.warningBg : undefined,
          }}
        >
          {importBanner.text}
        </p>
      ) : null}
      {err && (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {err}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border bg-[var(--card-bg)]" style={{ borderColor: lmfitTokens.border }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
              {visibleTableColumns.map((c) => (
                <th
                  key={c.key}
                  className={[
                    "px-3 py-2 font-medium",
                    c.hiddenOnMobile ? "hidden md:table-cell" : "",
                  ].join(" ")}
                  style={{ color: lmfitTokens.accentBlue }}
                >
                  {c.label}
                </th>
              ))}
              {showActionsColumn ? (
                <th className="px-3 py-2 font-medium w-36" style={{ color: lmfitTokens.accentBlue }}>
                  Ações
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {!loading && displayRows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleTableColumns.length + (showActionsColumn ? 1 : 0)}
                  className="px-3 py-8 text-center"
                  style={{ color: lmfitTokens.textMuted }}
                >
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : null}
            {displayRows.map((row, i) => {
              const id = rowId(row, idKey);
              return (
                <tr
                  key={id ?? `row-${i}`}
                  className="border-b last:border-0 hover:bg-neutral-50/60 dark:hover:bg-white/5 transition-colors"
                  style={{ borderColor: lmfitTokens.border }}
                >
                  {visibleTableColumns.map((c) => (
                    <td
                      key={c.key}
                      className={[
                        "px-3 py-2 align-middle",
                        c.hiddenOnMobile ? "hidden md:table-cell" : "",
                      ].join(" ")}
                      style={{ color: lmfitTokens.text }}
                    >
                      {cellRender?.[c.key] ? cellRender[c.key]!(row) : formatCell(row[c.key], c.key)}
                    </td>
                  ))}
                  {showActionsColumn ? (
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        {detailHref && id ? (
                          (() => {
                            const href = detailHref(row);
                            return href ? (
                              <Link
                                href={href}
                                className="text-xs min-h-9 inline-flex items-center px-2 rounded border touch-manipulation"
                                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                              >
                                Ficha
                              </Link>
                            ) : null;
                          })()
                        ) : null}
                        {crud ? (
                          <>
                            <button
                              type="button"
                              className="text-xs min-h-9 px-2 rounded border touch-manipulation disabled:opacity-40"
                              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                              disabled={!id}
                              title={!id ? "Sem identificador para edição" : undefined}
                              onClick={() => openEdit(row)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="text-xs min-h-9 px-2 rounded border touch-manipulation disabled:opacity-40"
                              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.error }}
                              disabled={!id}
                              title={!id ? "Sem identificador para exclusão" : undefined}
                              onClick={() => id && setDeleteId(id)}
                            >
                              Excluir
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fechar"
            disabled={saving}
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal
            aria-labelledby="resource-modal-title"
            className={[
              "relative z-10 w-full max-h-[92vh] flex flex-col rounded-t-lg sm:rounded-lg bg-[var(--card-bg)] shadow-xl border sm:m-0",
              modalLayout === "wide" ? "sm:max-w-3xl" : "sm:max-w-lg",
            ].join(" ")}
            style={{ borderColor: lmfitTokens.border }}
          >
            <form onSubmit={onSubmitForm} className="p-4 flex flex-col min-h-0 max-h-[92vh]">
              <h2
                id="resource-modal-title"
                className="text-lg font-semibold shrink-0"
                style={{ color: lmfitTokens.text }}
              >
                {modal === "create"
                  ? (modalTitleCreate ?? "Novo registro")
                  : (modalTitleEdit ?? "Editar registro")}
              </h2>
              {saveErr ? (
                <p className="text-sm shrink-0 mt-2" style={{ color: lmfitTokens.error }}>
                  {saveErr}
                </p>
              ) : null}
              {modal === "edit" ? (
                <label className="block text-sm shrink-0 mt-2">
                  <span style={{ color: lmfitTokens.textMuted }}>{columns.find((c) => c.key === idKey)?.label ?? "ID"}</span>
                  <input
                    className="mt-1 w-full border rounded px-3 py-2 bg-neutral-100 dark:bg-white/5 cursor-not-allowed"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
                    readOnly
                    value={formValues[idKey] ?? ""}
                  />
                </label>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto max-h-[min(70vh,32rem)] mt-3 pr-1 -mr-1">
                <div
                  className={
                    modalLayout === "wide"
                      ? "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-3"
                      : "space-y-3"
                  }
                >
                  {formColumns.map((c) => {
                    const ft = inferResourceFieldType(c);
                    const val = formValues[c.key] ?? "";
                    const spanClass =
                      modalLayout === "wide" && c.formSpan === "full" ? "sm:col-span-2" : "";

                    if (ft === "imageFile" && c.imageFile?.multiple) {
                      const galleryUrls = parseImageGalleryJson(val);
                      const stagedMulti = imageStagedMulti[c.key] ?? [];
                      const carouselSlides = [...galleryUrls, ...stagedMulti.map((s) => s.preview)];
                      const maxB = c.imageFile?.maxBytes ?? 5 * 1024 * 1024;
                      const dropDepth = galleryDropDepth[c.key] ?? 0;
                      const dropActive = dropDepth > 0;
                      const galleryInputId = `${galleryFieldIdPrefix}-${c.key}`;

                      return (
                        <div
                          key={c.key}
                          className={["block text-sm w-full min-w-0", spanClass].filter(Boolean).join(" ")}
                        >
                          <span style={{ color: lmfitTokens.textMuted }}>{c.label}</span>
                          <div className="mt-2 w-full max-w-full space-y-3">
                            <ImageGalleryGrid
                              urls={carouselSlides}
                              className="w-full"
                              onRemoveIndex={(rm) => {
                                const g = parseImageGalleryJson(formValues[c.key] ?? "[]");
                                const st = imageStagedMulti[c.key] ?? [];
                                if (rm < g.length) {
                                  const next = g.filter((_, j) => j !== rm);
                                  setFormValues((prev) => ({
                                    ...prev,
                                    [c.key]: JSON.stringify(next),
                                  }));
                                } else {
                                  const j = rm - g.length;
                                  const victim = st[j];
                                  if (!victim) return;
                                  try {
                                    URL.revokeObjectURL(victim.preview);
                                  } catch {
                                    /* ignore */
                                  }
                                  setImageStagedMulti((prev) => ({
                                    ...prev,
                                    [c.key]: st.filter((_, k) => k !== j),
                                  }));
                                }
                              }}
                            />
                            <div
                              tabIndex={0}
                              className={[
                                "relative w-full min-h-32 rounded-lg border-2 border-dashed outline-none transition-colors",
                                dropActive ? "bg-orange-50/60 dark:bg-orange-500/10" : "bg-neutral-50/50 dark:bg-white/5",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              style={{
                                borderColor: dropActive ? lmfitTokens.primary : lmfitTokens.border,
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  document.getElementById(galleryInputId)?.click();
                                }
                              }}
                              onDragEnter={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setGalleryDropDepth((p) => ({
                                  ...p,
                                  [c.key]: (p[c.key] ?? 0) + 1,
                                }));
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = "copy";
                              }}
                              onDragLeave={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setGalleryDropDepth((p) => ({
                                  ...p,
                                  [c.key]: Math.max(0, (p[c.key] ?? 0) - 1),
                                }));
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setGalleryDropDepth((p) => ({ ...p, [c.key]: 0 }));
                                appendValidatedGalleryFiles(c.key, e.dataTransfer.files, maxB);
                              }}
                            >
                              <input
                                id={galleryInputId}
                                type="file"
                                accept="image/jpeg,image/png"
                                multiple
                                className="sr-only"
                                onChange={(ev) => {
                                  appendValidatedGalleryFiles(c.key, ev.target.files, maxB);
                                  ev.target.value = "";
                                }}
                              />
                              <label
                                htmlFor={galleryInputId}
                                className="flex min-h-32 w-full max-w-full cursor-pointer flex-col items-center justify-center gap-1 px-4 py-6 text-center text-sm touch-manipulation"
                                style={{ color: lmfitTokens.text }}
                              >
                                <span className="font-medium">Arraste imagens aqui</span>
                                <span className="text-xs leading-snug" style={{ color: lmfitTokens.textMuted }}>
                                  ou clique para escolher vários (Ctrl/Cmd+clique no seletor de arquivos). JPEG ou PNG,
                                  até {Math.round(maxB / (1024 * 1024))} MB por arquivo.
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    const imgSrc =
                      ft === "imageFile" && !c.imageFile?.multiple
                        ? imagePreviewByKey[c.key] ||
                          (val || "").trim() ||
                          (modal === "edit" && editingRow ? resolvePrimaryImageUrl(editingRow) : null)
                        : null;
                    return (
                      <label key={c.key} className={["block text-sm", spanClass].filter(Boolean).join(" ")}>
                        <span style={{ color: lmfitTokens.textMuted }}>{c.label}</span>
                        {ft === "imageFile" ? (
                          <div className="mt-2 space-y-2">
                            {imgSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imgSrc}
                                alt=""
                                className="h-24 w-24 rounded-md object-cover border bg-neutral-100"
                                style={{ borderColor: lmfitTokens.border }}
                              />
                            ) : (
                              <div
                                className="h-24 w-24 rounded-md border border-dashed flex items-center justify-center text-xs text-center px-1"
                                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}
                              >
                                Pré-visualização
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/jpeg,image/png"
                              className="block w-full text-sm file:mr-3 file:rounded file:border file:px-3 file:py-2 file:text-sm"
                              style={{ color: lmfitTokens.text }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (!f) return;
                                const maxB = c.imageFile?.maxBytes ?? 5 * 1024 * 1024;
                                const verr = validateProductImageFile(f, maxB);
                                if (verr) {
                                  setSaveErr(verr);
                                  return;
                                }
                                setSaveErr(null);
                                setImageFiles((prev) => ({ ...prev, [c.key]: f }));
                                setImagePreviewByKey((prev) => {
                                  const old = prev[c.key];
                                  if (old) URL.revokeObjectURL(old);
                                  return { ...prev, [c.key]: URL.createObjectURL(f) };
                                });
                              }}
                            />
                            <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                              JPEG ou PNG, até {Math.round((c.imageFile?.maxBytes ?? 5 * 1024 * 1024) / (1024 * 1024))}{" "}
                              MB.
                            </p>
                            {imageFiles[c.key] ? (
                              <button
                                type="button"
                                className="text-xs underline"
                                style={{ color: lmfitTokens.error }}
                                onClick={() => {
                                  setImageFiles((prev) => ({ ...prev, [c.key]: null }));
                                  setImagePreviewByKey((prev) => {
                                    const u = prev[c.key];
                                    if (u) URL.revokeObjectURL(u);
                                    const next = { ...prev };
                                    delete next[c.key];
                                    return next;
                                  });
                                }}
                              >
                                Remover arquivo
                              </button>
                            ) : null}
                          </div>
                        ) : ft === "checkbox" ? (
                          <input
                            type="checkbox"
                            className="mt-2 block h-5 w-5 accent-lmfit-primary"
                            checked={val === "true"}
                            onChange={(e) =>
                              setFormValues((prev) => ({ ...prev, [c.key]: e.target.checked ? "true" : "false" }))
                            }
                          />
                        ) : ft === "select" && c.selectOptions?.length ? (
                          <select
                            className="mt-1 w-full border rounded px-3 py-2 min-h-11 bg-[var(--card-bg)]"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                            value={val}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
                          >
                            {c.selectOptions.map((o) => (
                              <option key={o.value} value={o.value} title={o.description}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : ft === "textarea" ? (
                          <textarea
                            className="mt-1 w-full border rounded px-3 py-2 min-h-[5.5rem] text-sm"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                            placeholder={c.placeholder}
                            value={val}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
                          />
                        ) : ft === "number" && isBRLMoneyField(c.key) ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            className="mt-1 w-full border rounded px-3 py-2 min-h-11"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                            placeholder={c.placeholder ?? "R$ 0,00"}
                            value={formatBRLInputDisplay(val)}
                            onChange={(e) =>
                              setFormValues((prev) => ({
                                ...prev,
                                [c.key]: parseBRLMoneyInput(e.target.value),
                              }))
                            }
                          />
                        ) : ft === "number" ? (
                          <input
                            type="number"
                            step={defaultNumberStep(c)}
                            min={0}
                            className="mt-1 w-full border rounded px-3 py-2 min-h-11"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                            placeholder={c.placeholder}
                            value={val}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
                          />
                        ) : ft === "tel" ? (
                          <input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            className="mt-1 w-full border rounded px-3 py-2 min-h-11"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                            placeholder={c.placeholder ?? "(00) 00000-0000"}
                            value={maskBrazilPhone(val)}
                            onChange={(e) =>
                              setFormValues((prev) => ({
                                ...prev,
                                [c.key]: onlyDigits(e.target.value, maxPhoneDigits(c.key)),
                              }))
                            }
                          />
                        ) : ft === "email" ? (
                          <input
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            spellCheck={false}
                            className="mt-1 w-full border rounded px-3 py-2 min-h-11"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                            placeholder={c.placeholder ?? "nome@exemplo.com.br"}
                            value={val}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
                            onBlur={() =>
                              setFormValues((prev) => ({
                                ...prev,
                                [c.key]: normalizeEmail(prev[c.key] ?? ""),
                              }))
                            }
                          />
                        ) : (
                          <input
                            type={ft === "url" ? "url" : "text"}
                            className="mt-1 w-full border rounded px-3 py-2 min-h-11"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                            placeholder={c.placeholder}
                            value={val}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, [c.key]: e.target.value }))}
                          />
                        )}
                      </label>
                    );
                  })}
                  {formAppendix && modal
                    ? formAppendix({
                        modal,
                        formResetKey,
                        editingRow,
                        formValues,
                        setFormValues,
                        idKey,
                      })
                    : null}
                </div>
              </div>
              <div
                className="shrink-0 flex flex-wrap justify-end gap-2 pt-3 mt-2 border-t bg-[var(--card-bg)]"
                style={{ borderColor: lmfitTokens.border }}
              >
                <button
                  type="button"
                  className="min-h-11 px-4 rounded-md border text-sm touch-manipulation"
                  style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                  disabled={saving}
                  onClick={closeModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-11 px-4 rounded-md text-sm font-medium text-white touch-manipulation disabled:opacity-60"
                  style={{ backgroundColor: lmfitTokens.primary }}
                  disabled={saving}
                >
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteId ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cancelar"
            disabled={deleting}
            onClick={() => !deleting && setDeleteId(null)}
          />
          <div
            role="dialog"
            aria-modal
            className="relative z-10 w-full max-w-sm rounded-lg bg-[var(--card-bg)] shadow-xl border p-4"
            style={{ borderColor: lmfitTokens.border }}
          >
            <p className="text-sm mb-4" style={{ color: lmfitTokens.text }}>
              Excluir este registro? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="min-h-11 px-3 rounded-md border text-sm"
                style={{ borderColor: lmfitTokens.border }}
                disabled={deleting}
                onClick={() => setDeleteId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="min-h-11 px-3 rounded-md text-sm font-medium text-white"
                style={{ backgroundColor: lmfitTokens.error }}
                disabled={deleting}
                onClick={() => void onConfirmDelete()}
              >
                {deleting ? "…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
