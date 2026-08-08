/**
 * `ProductVariant.color` é texto livre ("Preto", "Azul Marinho", "Padrão"), não um campo hex —
 * ver decisão em loop-05-plp-pdp.md. Nomes reconhecidos viram um swatch colorido de verdade;
 * o resto cai no fallback neutro (chamador decide o que fazer, ver `resolveSwatchColor`).
 */
// Chaves sempre SEM acento (ver `normalizeColorKey`) — "Petróleo"/"Petroleo" e
// "Lilás"/"Lilas" (o catálogo real tem as duas grafias da mesma cor) resolvem pro mesmo hex.
const COLOR_NAME_TO_HEX: Record<string, string> = {
  preto: "#111111",
  branco: "#ffffff",
  off: "#f5f0e6",
  perola: "#f2ede4",
  cinza: "#9ca3af",
  "cinza claro": "#d1d5db",
  "cinza escuro": "#4b5563",
  prata: "#94a3b8",
  grafite: "#374151",
  azul: "#2563eb",
  "azul bic": "#2563eb",
  "azul marinho": "#1e3a8a",
  marinho: "#1e3a8a",
  "azul claro": "#60a5fa",
  "azul royal": "#1d4ed8",
  "azul petroleo": "#0f766e",
  vermelho: "#dc2626",
  verde: "#16a34a",
  verdo: "#16a34a", // grafia com erro de digitação já vista em dados reais do catálogo
  "verde militar": "#4d7c0f",
  oliva: "#6b7d3d",
  amarelo: "#eab308",
  amarela: "#eab308",
  manteiga: "#fde68a",
  champagne: "#f0e2c0",
  laranja: "#ea580c",
  "terra-cota": "#c2542d",
  roxo: "#7c3aed",
  uva: "#5b21b6",
  figo: "#6b2447",
  magenta: "#c026d3",
  rosa: "#ec4899",
  "rosa claro": "#f9a8d4",
  pink: "#ec4899",
  rose: "#e8b4b8",
  lilas: "#c4a4d9",
  marrom: "#78350f",
  cappuccino: "#8b5e3c",
  bege: "#d6c8a8",
  dourado: "#ca8a04",
  vinho: "#7f1d1d",
  bordo: "#7f1d1d",
  marsala: "#7b3f3f",
  nude: "#e0c1a3",
};

const TRANSPARENT_SUFFIX = " transparente";

function normalizeColorKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** `null` quando o nome não é reconhecido — o chamador decide o fallback visual (bolinha neutra). */
export function resolveSwatchColor(name: string | undefined | null): string | null {
  if (!name) return null;
  const key = normalizeColorKey(name);
  if (COLOR_NAME_TO_HEX[key]) return COLOR_NAME_TO_HEX[key];
  // "Azul Transparente", "Cinza Transparente" etc. — tecido vazado sobre a cor base; sem hex
  // próprio, mostra a cor base em vez de cair na bolinha neutra igual a uma cor desconhecida.
  if (key.endsWith(TRANSPARENT_SUFFIX)) {
    return COLOR_NAME_TO_HEX[key.slice(0, -TRANSPARENT_SUFFIX.length)] ?? null;
  }
  return null;
}
