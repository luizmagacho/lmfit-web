/** Safe ASCII-ish filename base for exports (no dependency on xlsx). */
export function slugifyFileBase(title: string): string {
  const s = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return s || "exportacao";
}
