import * as XLSX from "xlsx";

export type ExcelColumn = {
  key: string;
  label: string;
  fieldType?: "text" | "email" | "tel" | "number" | "checkbox" | "select" | "textarea" | "url" | "imageFile";
  editable?: boolean;
};

export function inferResourceFieldType(c: ExcelColumn): NonNullable<ExcelColumn["fieldType"]> {
  if (c.fieldType) return c.fieldType;
  const k = c.key.toLowerCase();
  if (k === "active" || k.endsWith("enabled")) return "checkbox";
  if (k.includes("email")) return "email";
  if (k.includes("phone") || k.includes("whats")) return "tel";
  if (
    k.includes("total") ||
    k.includes("amount") ||
    k.includes("price") ||
    k.includes("stock") ||
    k.includes("quantity") ||
    k.includes("inventory") ||
    k.includes("weight")
  )
    return "number";
  if (
    k.endsWith("url") &&
    (k.includes("image") || k.includes("photo") || k.includes("thumb") || k.includes("cover"))
  )
    return "url";
  return "text";
}

function normalizeHeader(s: string): string {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function coerceImportValue(raw: unknown, c: ExcelColumn): unknown {
  if (raw === "" || raw === null || raw === undefined) return null;
  const ft = inferResourceFieldType(c);
  if (ft === "select") return String(raw).trim();
  if (ft === "textarea") return String(raw).trim();
  if (ft === "url" || ft === "imageFile") return String(raw).trim();
  if (ft === "checkbox") {
    if (raw === true || raw === 1) return true;
    if (raw === false || raw === 0) return false;
    const s = String(raw).trim().toLowerCase();
    return s === "sim" || s === "s" || s === "true" || s === "1" || s === "yes" || s === "x";
  }
  if (ft === "number") {
    const n = Number(String(raw).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return String(raw).trim();
}

/** First sheet: row 1 = headers (column label or API key, case-insensitive). */
export function parseWorkbookToItems(
  buffer: ArrayBuffer | Uint8Array,
  columns: ExcelColumn[],
): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (!aoa.length) return [];

  const headerRow = (aoa[0] as unknown[]).map((h) => normalizeHeader(String(h)));
  const keyByIndex: (string | null)[] = headerRow.map((h) => {
    if (!h) return null;
    const byLabel = columns.find((c) => normalizeHeader(c.label) === h);
    if (byLabel) return byLabel.key;
    const byKey = columns.find((c) => normalizeHeader(c.key) === h);
    return byKey?.key ?? null;
  });

  const maxLen = Math.max(...aoa.map((r) => (Array.isArray(r) ? r.length : 0)), headerRow.length);

  const items: Record<string, unknown>[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = (aoa[r] as unknown[]) ?? [];
    let any = false;
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < maxLen; i++) {
      const key = keyByIndex[i];
      if (!key) continue;
      const col = columns.find((c) => c.key === key);
      if (!col) continue;
      const raw = i < row.length ? row[i] : "";
      if (raw === "" || raw === null || raw === undefined) continue;
      obj[key] = coerceImportValue(raw, col);
      any = true;
    }
    if (any) items.push(obj);
  }
  return items;
}

export function buildDataAoA(
  columns: ExcelColumn[],
  rows: Record<string, unknown>[],
): (string | number)[][] {
  const keys = columns.map((c) => c.key);
  const header = columns.map((c) => c.label);
  const data = rows.map((row) =>
    keys.map((k) => {
      const v = row[k];
      if (v === null || v === undefined) return "";
      if (typeof v === "boolean") return v ? "Sim" : "Não";
      if (typeof v === "object") return JSON.stringify(v);
      if (typeof v === "number") return v;
      return String(v);
    }),
  );
  return [header, ...data];
}

export function downloadXlsxFile(fileBase: string, aoa: (string | number)[][]): void {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  const name = fileBase.endsWith(".xlsx") ? fileBase : `${fileBase}.xlsx`;
  XLSX.writeFile(wb, name);
}

export function downloadTemplate(fileBase: string, columns: ExcelColumn[]): void {
  const header = columns.map((c) => c.label);
  downloadXlsxFile(`${fileBase}-modelo`, [header]);
}
