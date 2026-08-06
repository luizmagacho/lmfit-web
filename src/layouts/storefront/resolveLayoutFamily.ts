import {
  STOREFRONT_PRESETS,
  resolveThemePreset,
  type LayoutFamily,
} from "@/theme/storefrontPresets";

/** Ordem canônica de exibição das famílias (admin picker e docs). */
export const LAYOUT_FAMILIES: LayoutFamily[] = [
  "classic",
  "editorial",
  "minimal",
  "expressive",
  "industrial",
];

export const LAYOUT_FAMILY_LABELS: Record<LayoutFamily, string> = {
  classic: "Clássica",
  editorial: "Editorial",
  minimal: "Minimalista",
  expressive: "Expressiva",
  industrial: "Industrial",
};

/** Loop 12 — helper fino: a fonte da verdade é o campo `layoutFamily` na própria tabela de presets
 *  (um mapa paralelo aqui poderia divergir dela). Herda o fallback de `resolveThemePreset`
 *  (preset desconhecido → "essencial" → família "classic"). */
export function resolveLayoutFamily(preset: string | undefined | null): LayoutFamily {
  return STOREFRONT_PRESETS[resolveThemePreset(preset)].layoutFamily;
}
