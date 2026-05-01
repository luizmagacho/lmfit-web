const ALLOWED = new Set(["image/jpeg", "image/png"]);

export function validateProductImageFile(file: File, maxBytes = 5 * 1024 * 1024): string | null {
  if (!ALLOWED.has(file.type)) {
    return "Use apenas JPEG ou PNG.";
  }
  if (file.size > maxBytes) {
    return `Arquivo muito grande (máx. ${Math.round(maxBytes / (1024 * 1024))} MB).`;
  }
  return null;
}
