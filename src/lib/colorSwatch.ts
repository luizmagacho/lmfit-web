/**
 * `ProductVariant.color` é texto livre ("Preto", "Azul Marinho", "Padrão"), não um campo hex —
 * ver decisão em loop-05-plp-pdp.md. Nomes reconhecidos viram um swatch colorido de verdade;
 * o resto cai no fallback neutro (chamador decide o que fazer, ver `resolveSwatchColor`).
 */
const COLOR_NAME_TO_HEX: Record<string, string> = {
  preto: "#111111",
  branco: "#ffffff",
  cinza: "#9ca3af",
  "cinza claro": "#d1d5db",
  "cinza escuro": "#4b5563",
  azul: "#2563eb",
  "azul marinho": "#1e3a8a",
  "azul claro": "#60a5fa",
  "azul royal": "#1d4ed8",
  vermelho: "#dc2626",
  verde: "#16a34a",
  "verde militar": "#4d7c0f",
  amarelo: "#eab308",
  laranja: "#ea580c",
  roxo: "#7c3aed",
  rosa: "#ec4899",
  "rosa claro": "#f9a8d4",
  marrom: "#78350f",
  bege: "#d6c8a8",
  dourado: "#ca8a04",
  prata: "#94a3b8",
  vinho: "#7f1d1d",
  grafite: "#374151",
  nude: "#e0c1a3",
};

/** `null` quando o nome não é reconhecido — o chamador decide o fallback visual (bolinha neutra). */
export function resolveSwatchColor(name: string | undefined | null): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  return COLOR_NAME_TO_HEX[key] ?? null;
}
