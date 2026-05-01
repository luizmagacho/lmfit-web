type Row = Record<string, unknown>;

export function coerceImageUrlEntry(item: unknown): string | null {
  if (typeof item === "string" && item.trim()) return item.trim();
  if (item && typeof item === "object" && "url" in item) {
    const u = (item as { url: unknown }).url;
    if (typeof u === "string" && u.trim()) return u.trim();
  }
  return null;
}

/**
 * Todas as URLs de imagem do produto (galeria), sem duplicar.
 * Ordem: `primaryImageUrl` (capa) primeiro, depois `images` / `imageUrls`.
 */
export function resolveProductImageUrls(row: Row): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const add = (u: string | null) => {
    if (!u) return;
    const t = u.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    ordered.push(t);
  };

  const primary =
    row.primaryImageUrl ?? row.imageUrl ?? row.thumbnailUrl ?? row.coverImageUrl;
  if (typeof primary === "string" && primary.trim()) add(primary.trim());

  const imgs = row.images;
  if (Array.isArray(imgs)) {
    for (const item of imgs) add(coerceImageUrlEntry(item));
  }

  const imageUrls = row.imageUrls;
  if (Array.isArray(imageUrls)) {
    for (const item of imageUrls) {
      if (typeof item === "string") add(item);
    }
  }

  return ordered;
}

/** Primeira imagem para compatibilidade com grid legado. */
export function resolvePrimaryImageUrl(row: Row): string | null {
  const urls = resolveProductImageUrls(row);
  return urls[0] ?? null;
}

export function parseImageGalleryJson(raw: string): string[] {
  try {
    const p = JSON.parse((raw ?? "").trim() || "[]");
    if (!Array.isArray(p)) return [];
    return p.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((s) => s.trim());
  } catch {
    return [];
  }
}
