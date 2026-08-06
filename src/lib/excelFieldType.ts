// Peças de excelIo.ts que NÃO dependem da lib `xlsx` (~150kB) — usadas em toda renderização do
// ResourceList (inferResourceFieldType roda por coluna a cada render). Ficam neste arquivo à parte
// para que o import estático em ResourceList.tsx não arraste a lib inteira pro bundle inicial;
// quem só precisa importar/exportar .xlsx faz `await import("@/lib/excelIo")` sob demanda.

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
