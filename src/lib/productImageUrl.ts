type Row = Record<string, unknown>;

function rewriteUrl(url: string): string {
  if (url.startsWith("http://localhost:4000")) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    // Se temos um endpoint da API configurado e não é o localhost, usa ele
    if (apiBase && !apiBase.includes("localhost")) {
      return url.replace("http://localhost:4000", apiBase);
    }
    // Se estamos no navegador testando pelo IP da rede local
    if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
      return url.replace("http://localhost:4000", `http://${window.location.hostname}:4000`);
    }
  }
  return url;
}

export function coerceImageUrlEntry(item: unknown): string | null {
  if (typeof item === "string" && item.trim()) {
    return rewriteUrl(item.trim());
  }
  if (item && typeof item === "object" && "url" in item) {
    const u = (item as { url: unknown }).url;
    if (typeof u === "string" && u.trim()) {
      return rewriteUrl(u.trim());
    }
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
  if (typeof primary === "string" && primary.trim()) add(rewriteUrl(primary.trim()));

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
