const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif"
]);

export function validateProductImageFile(file: File, maxBytes = 10 * 1024 * 1024): string | null {
  if (!ALLOWED.has(file.type)) {
    return "Use apenas JPEG, PNG, WEBP ou HEIC.";
  }
  if (file.size > maxBytes) {
    return `Arquivo muito grande (máx. ${Math.round(maxBytes / (1024 * 1024))} MB).`;
  }
  return null;
}
