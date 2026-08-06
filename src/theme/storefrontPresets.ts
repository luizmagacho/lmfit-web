// 8 estilos de loja (STOREFRONT-V2.md §2.10, benchmark de marcas internacionais de moda/activewear/
// grife — destilado em presets neutros). Cada preset é um bundle de tokens (tipografia, raio de
// borda, estilo de botão, paleta, densidade de PLP, tratamento de card/hero, movimento); a cor de
// acento continua vindo de `tenant.branding.primaryColor` em qualquer preset. Consumido por
// `TenantContext.tsx` (tokens globais: fonte/raio/acento, aplicados em toda a app) e por
// `StorefrontThemeVars.tsx` (Loop 4d — tokens só de `/loja`: paleta/densidade/aspecto/movimento,
// nunca vazam pro painel admin/PDV) + `storefront-themes.css` (overrides de forma de botão/card).
export type ThemePreset =
  | "essencial"
  | "editorial"
  | "performance"
  | "luxo"
  | "boutique"
  | "vibrante"
  | "studio"
  | "streetwear"
  | "impacto"
  | "monocromo";

export type ButtonStyle = "solid" | "ghost" | "pill";

/** Loop 12 — família de layout: o preset escolhe a família, a família escolhe a ESTRUTURA
 *  React/DOM (header/home/PDP/footer); os tokens continuam escolhendo só a estética. IDs de preset
 *  são estáveis (nunca renomear — são enum validado no backend com valores salvos por tenant);
 *  o que muda pro lojista é só o `label`. */
export type LayoutFamily = "classic" | "editorial" | "minimal" | "expressive" | "industrial";

/** Moldura do card de produto — a única diferença de card que os tokens existentes não expressam:
 *  "borderless" (Luxo/Minimal: sem borda/sombra, foto solta no fundo) e "hard-border"
 *  (Streetwear: borda preta dura 2px). */
export type CardFrame = "border" | "borderless" | "hard-border";

/** Loop 4d — cada tratamento mapeia pra uma combinação diferente de posição/overlay/tipografia em
 *  `HeroBanner.tsx`; nenhum precisa de mídia nova (todos os 8 presets usam a mesma imagem única do
 *  tenant, exceto quando o tenant configura `heroImages` com 2+ fotos, aí vira carrossel pra
 *  qualquer preset). */
export type HeroTreatment =
  | "calm-caption"
  | "full-bleed-overlay"
  | "action-frame"
  | "still-life"
  | "color-block"
  | "wellness-soft"
  | "impact-bold"
  | "studio-mono"
  | "mono-quiet";

/** Loop 19 — composição da grade de produto, ORTOGONAL a `plpColumns`/`cardAspectRatio` (que
 *  continuam controlando densidade/proporção): "uniform" é a grade de sempre; "mosaic" (Tropical)
 *  intercala um tile 2×2 a cada ciclo; "asymmetric" (Editorial) intercala um tile alargado, mais
 *  discreto que o mosaico; "sparse-duo" (Luxo) alterna altura entre pares em 2 colunas. */
export type GridComposition = "uniform" | "mosaic" | "asymmetric" | "sparse-duo";

/** Loop 19 — estrutura do hero, ORTOGONAL a `heroTreatment` (que continua sendo só a pele —
 *  overlay/tipografia). "single" é a imagem única de sempre; "media-first" é mais alto/dominante;
 *  "collage" mostra 2+ fotos numa grade em vez de uma imagem só (usa o mesmo `heroImages` que já
 *  alimenta o carrossel — sem campo novo no tenant). */
export type HeroComposition = "single" | "media-first" | "collage";

/** Loop 19 — textura/moldura aplicada a seções da home via `SectionCard.tsx`. "none" é sem
 *  wrapper (comportamento de sempre); "color-card" é o cartão de superfície colorida (Tropical,
 *  hoje montado manualmente em `ExpressiveHome.tsx` — este token formaliza, não substitui ainda);
 *  "grain" é textura de ruído CSS puro (Streetwear); "hard-frame" é a moldura preta dura que
 *  `IndustrialHome.tsx` já monta manualmente. */
export type SectionTexture = "none" | "color-card" | "grain" | "hard-frame";

export interface StorefrontPalette {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

/** Loop 4e — o benchmark (STOREFRONT-V2.md §2.10) descreve um tratamento tipográfico próprio por
 *  preset além da família da fonte (ex.: Performance "TÍTULOS EM CAIXA ALTA", Monocromo "caixa alta
 *  fina com tracking largo", Boutique "small caps") — até aqui só `fontDisplay` era aplicado; sem
 *  isso, todo preset "soa" igual tipograficamente e nenhum lembra de verdade a marca que o inspirou. */
export interface HeadingTypography {
  case: "none" | "uppercase" | "small-caps";
  /** CSS `letter-spacing`. */
  tracking: string;
  weight: number;
  italic?: boolean;
}

export interface StorefrontThemeTokens {
  label: string;
  /** Loop 12 — frase de personalidade exibida no seletor do admin (mapa de inspiração do plano). */
  tagline: string;
  layoutFamily: LayoutFamily;
  cardFrame: CardFrame;
  /** Fonte do Google Fonts para títulos/hero — carregada via next/font/google só quando o preset está ativo. */
  fontDisplay: string;
  /** Fonte para corpo de texto. */
  fontBody: string;
  /** Raio de borda base (botões, cards) em px. */
  radius: number;
  buttonStyle: ButtonStyle;
  /** Loop 4e — caixa/tracking/peso dos títulos (h1-h3), por preset. */
  heading: HeadingTypography;
  /** Loop 4d — paleta de fundo/superfície/texto só de `/loja` (nunca aplicada no admin/PDV). */
  palette: StorefrontPalette;
  /** Aspect-ratio CSS do card de produto na PLP (ex.: "3 / 4", "1 / 1"). */
  cardAspectRatio: string;
  /** Classes Tailwind grid-cols por breakpoint — densidade da PLP. */
  plpColumns: { base: string; sm: string; md: string };
  heroTreatment: HeroTreatment;
  /** Loop 4h — altura do banner (CSS aspect-ratio) — "tela cheia" (Editorial/Monocromo) precisa de
   *  um banner bem mais alto que "still-life elegante" (Boutique, mais discreto/fino). */
  heroAspectRatio: string;
  /** Duração de transição em ms (hover de card, etc.) — "rápido/snappy" vs. "quase estático". */
  motionDurationMs: number;
  /** CSS easing function — a maioria usa curvas padrão; Vibrante usa uma curva com leve "bounce". */
  motionEasing: string;
  /** Loop 4f — copy do badge de produto novo (ex.: Performance "NOVO DROP" vs. "Lançamento" default). */
  newBadgeLabel: string;
  /** Loop 4f — classe Tailwind de gap da grade da PLP — densidade "com respiro" vs. "denso". */
  plpGap: string;
  /** Loop 19 — composição interna da grade (ver `GridComposition`). */
  gridComposition: GridComposition;
  /** Loop 19 — estrutura do hero (ver `HeroComposition`). */
  heroComposition: HeroComposition;
  /** Loop 19 — textura/moldura de seção (ver `SectionTexture`). */
  sectionTexture: SectionTexture;
}

export const STOREFRONT_PRESETS: Record<ThemePreset, StorefrontThemeTokens> = {
  essencial: {
    label: "Essencial",
    tagline: "Prática e acessível — o cliente encontra rápido",
    layoutFamily: "classic",
    cardFrame: "border",
    fontDisplay: "Poppins",
    fontBody: "Inter",
    radius: 8,
    buttonStyle: "solid",
    heading: { case: "none", tracking: "normal", weight: 600 },
    palette: {
      bg: "#faf7f2",
      surface: "#ffffff",
      text: "#2b2b28",
      textMuted: "#6b6b64",
      border: "#e4e0d8",
    },
    cardAspectRatio: "3 / 4",
    plpColumns: { base: "grid-cols-2", sm: "sm:grid-cols-3", md: "md:grid-cols-4" },
    heroTreatment: "calm-caption",
    heroAspectRatio: "16 / 7",
    motionDurationMs: 250,
    motionEasing: "ease-out",
    newBadgeLabel: "Lançamento",
    plpGap: "gap-3",
    gridComposition: "uniform",
    heroComposition: "single",
    sectionTexture: "none",
  },
  editorial: {
    label: "Editorial",
    tagline: "Moda como arte — cada scroll conta uma história",
    layoutFamily: "editorial",
    cardFrame: "borderless",
    fontDisplay: "Playfair Display",
    fontBody: "Inter",
    radius: 2,
    buttonStyle: "ghost",
    heading: { case: "none", tracking: "0.01em", weight: 400 },
    palette: {
      bg: "#ffffff",
      surface: "#f5f5f5",
      text: "#111111",
      textMuted: "#666666",
      border: "#dddddd",
    },
    cardAspectRatio: "4 / 5",
    plpColumns: { base: "grid-cols-1", sm: "sm:grid-cols-2", md: "md:grid-cols-3" },
    heroTreatment: "full-bleed-overlay",
    heroAspectRatio: "16 / 10",
    motionDurationMs: 600,
    motionEasing: "ease-in-out",
    newBadgeLabel: "Nova coleção",
    plpGap: "gap-6",
    gridComposition: "asymmetric",
    heroComposition: "media-first",
    sectionTexture: "none",
  },
  performance: {
    // ID continua "performance" (enum salvo no backend); só o rótulo mudou no Loop 12.
    label: "Atlético",
    tagline: "Escuro, agressivo e rápido — energia de tênis",
    layoutFamily: "classic",
    cardFrame: "border",
    fontDisplay: "Oswald",
    fontBody: "Inter",
    radius: 4,
    buttonStyle: "solid",
    heading: { case: "uppercase", tracking: "0.02em", weight: 800 },
    palette: {
      bg: "#0a0a0a",
      surface: "#161616",
      text: "#f5f5f5",
      textMuted: "#a0a0a0",
      border: "#2a2a2a",
    },
    cardAspectRatio: "3 / 4",
    plpColumns: { base: "grid-cols-2", sm: "sm:grid-cols-3", md: "md:grid-cols-4" },
    heroTreatment: "action-frame",
    heroAspectRatio: "21 / 9",
    motionDurationMs: 120,
    motionEasing: "ease-out",
    newBadgeLabel: "NOVO DROP",
    plpGap: "gap-2",
    gridComposition: "uniform",
    heroComposition: "media-first",
    sectionTexture: "none",
  },
  // Loop 12 — novo (Calvin Klein / minimal family): silêncio visual, B&W, tipografia fina.
  luxo: {
    label: "Luxo",
    tagline: "Silêncio visual — o produto fala sozinho",
    layoutFamily: "minimal",
    cardFrame: "borderless",
    fontDisplay: "Instrument Sans",
    fontBody: "Inter",
    radius: 0,
    buttonStyle: "ghost",
    // weight 400 (não 300): Instrument Sans só existe em 400-700 no Google Fonts — pedir 300
    // renderizaria 400 mesmo, então o token diz a verdade e o "fino" vem do tracking + caixa alta.
    heading: { case: "uppercase", tracking: "0.08em", weight: 400 },
    palette: {
      bg: "#ffffff",
      surface: "#f7f7f7",
      text: "#171717",
      textMuted: "#6f6f6f",
      border: "#e5e5e5",
    },
    cardAspectRatio: "4 / 5",
    plpColumns: { base: "grid-cols-1", sm: "sm:grid-cols-2", md: "md:grid-cols-2" },
    // Loop V4-4: era "studio-mono", idêntico ao de Minimal/monocromo — 2 referências opostas
    // (Calvin Klein vs. COS) compartilhando o mesmo hero. "mono-quiet" é próprio de Luxo: crop
    // vertical 4/5 (já casa com o cardAspectRatio, "fotografia dominante" mais forte que a
    // paisagem 3/2 do Minimal), overlay bem mais claro (a foto manda), legenda inferior-esquerda.
    heroTreatment: "mono-quiet",
    heroAspectRatio: "4 / 5",
    motionDurationMs: 400,
    motionEasing: "ease-in-out",
    newBadgeLabel: "Novo",
    plpGap: "gap-10",
    gridComposition: "sparse-duo",
    heroComposition: "single",
    sectionTexture: "none",
  },
  boutique: {
    label: "Boutique",
    tagline: "Clássico europeu — tipografia serifada",
    layoutFamily: "editorial",
    cardFrame: "border",
    fontDisplay: "Cormorant Garamond",
    fontBody: "Inter",
    radius: 2,
    buttonStyle: "ghost",
    heading: { case: "small-caps", tracking: "0.04em", weight: 500 },
    palette: {
      bg: "#fbf8f2",
      surface: "#ffffff",
      text: "#2a2620",
      textMuted: "#7a7468",
      border: "#e8e1d3",
    },
    cardAspectRatio: "4 / 5",
    plpColumns: { base: "grid-cols-2", sm: "sm:grid-cols-3", md: "md:grid-cols-3" },
    heroTreatment: "still-life",
    heroAspectRatio: "16 / 6",
    motionDurationMs: 450,
    motionEasing: "ease-in-out",
    newBadgeLabel: "Novidade",
    plpGap: "gap-5",
    gridComposition: "uniform",
    heroComposition: "single",
    sectionTexture: "none",
  },
  vibrante: {
    // ID continua "vibrante"; rótulo virou "Tropical" no Loop 12.
    label: "Tropical",
    tagline: "Cor vibrante, divertido e solar",
    layoutFamily: "expressive",
    cardFrame: "border",
    fontDisplay: "Baloo 2",
    fontBody: "Nunito",
    radius: 20,
    buttonStyle: "pill",
    heading: { case: "none", tracking: "normal", weight: 800 },
    palette: {
      bg: "#ffffff",
      surface: "#fff4e6",
      text: "#1a1a1a",
      textMuted: "#6b6b6b",
      border: "#ffd9a8",
    },
    cardAspectRatio: "1 / 1",
    plpColumns: { base: "grid-cols-2", sm: "sm:grid-cols-2", md: "md:grid-cols-3" },
    heroTreatment: "color-block",
    heroAspectRatio: "4 / 3",
    motionDurationMs: 180,
    motionEasing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    newBadgeLabel: "É novidade!",
    plpGap: "gap-3",
    gridComposition: "mosaic",
    heroComposition: "collage",
    sectionTexture: "color-card",
  },
  studio: {
    // ID continua "studio"; rótulo virou "Wellness" no Loop 12.
    label: "Wellness",
    tagline: "Quente, acolhedor, orgânico — respira bem-estar",
    layoutFamily: "minimal",
    cardFrame: "border",
    fontDisplay: "Quicksand",
    fontBody: "Nunito",
    radius: 16,
    buttonStyle: "pill",
    heading: { case: "none", tracking: "normal", weight: 500 },
    palette: {
      bg: "#f6f3ec",
      surface: "#ffffff",
      text: "#3d3b33",
      textMuted: "#8a8678",
      border: "#e6e1d3",
    },
    cardAspectRatio: "4 / 5",
    plpColumns: { base: "grid-cols-1", sm: "sm:grid-cols-2", md: "md:grid-cols-3" },
    heroTreatment: "wellness-soft",
    heroAspectRatio: "16 / 8",
    motionDurationMs: 500,
    motionEasing: "ease-in-out",
    newBadgeLabel: "Novo",
    plpGap: "gap-6",
    gridComposition: "uniform",
    heroComposition: "single",
    sectionTexture: "none",
  },
  // Loop 12 — novo (Off-White / industrial family): bordas cruas, mono, aspas literais.
  streetwear: {
    label: "Streetwear",
    tagline: "Industrial, aspas e fitas de perigo",
    layoutFamily: "industrial",
    cardFrame: "hard-border",
    fontDisplay: "Space Grotesk",
    fontBody: "Space Mono",
    radius: 0,
    buttonStyle: "solid",
    heading: { case: "uppercase", tracking: "0.02em", weight: 700 },
    palette: {
      bg: "#ffffff",
      surface: "#ffffff",
      text: "#000000",
      textMuted: "#525252",
      border: "#000000",
    },
    cardAspectRatio: "1 / 1",
    plpColumns: { base: "grid-cols-2", sm: "sm:grid-cols-3", md: "md:grid-cols-4" },
    heroTreatment: "impact-bold",
    heroAspectRatio: "16 / 9",
    motionDurationMs: 100,
    motionEasing: "linear",
    newBadgeLabel: "“NEW DROP”",
    plpGap: "gap-1",
    gridComposition: "uniform",
    heroComposition: "single",
    sectionTexture: "grain",
  },
  impacto: {
    label: "Impacto",
    tagline: "Geométrico, estruturado, tipo gigante",
    layoutFamily: "classic",
    cardFrame: "border",
    fontDisplay: "Anton",
    fontBody: "Inter",
    radius: 2,
    buttonStyle: "solid",
    heading: { case: "uppercase", tracking: "-0.01em", weight: 900, italic: true },
    palette: {
      bg: "#ffffff",
      surface: "#f2f2f2",
      text: "#0d0d0d",
      textMuted: "#5c5c5c",
      border: "#dadada",
    },
    cardAspectRatio: "3 / 4",
    plpColumns: { base: "grid-cols-2", sm: "sm:grid-cols-3", md: "md:grid-cols-4" },
    heroTreatment: "impact-bold",
    heroAspectRatio: "16 / 9",
    motionDurationMs: 150,
    motionEasing: "ease-out",
    newBadgeLabel: "LANÇAMENTO",
    plpGap: "gap-2",
    gridComposition: "uniform",
    heroComposition: "single",
    sectionTexture: "none",
  },
  monocromo: {
    // ID continua "monocromo"; rótulo virou "Minimal" no Loop 12.
    label: "Minimal",
    tagline: "Nada além do essencial — o anti-design",
    layoutFamily: "minimal",
    cardFrame: "borderless",
    fontDisplay: "Archivo",
    fontBody: "Inter",
    radius: 0,
    buttonStyle: "ghost",
    heading: { case: "uppercase", tracking: "0.15em", weight: 300 },
    palette: {
      bg: "#ffffff",
      surface: "#fafafa",
      text: "#000000",
      textMuted: "#737373",
      border: "#e0e0e0",
    },
    cardAspectRatio: "4 / 5",
    plpColumns: { base: "grid-cols-1", sm: "sm:grid-cols-2", md: "md:grid-cols-3" },
    heroTreatment: "studio-mono",
    heroAspectRatio: "3 / 2",
    motionDurationMs: 80,
    motionEasing: "linear",
    newBadgeLabel: "NOVO",
    plpGap: "gap-5",
    gridComposition: "uniform",
    heroComposition: "single",
    sectionTexture: "none",
  },
};

export const DEFAULT_THEME_PRESET: ThemePreset = "essencial";

export function resolveThemePreset(preset: string | undefined | null): ThemePreset {
  if (preset && preset in STOREFRONT_PRESETS) return preset as ThemePreset;
  return DEFAULT_THEME_PRESET;
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Razão de contraste WCAG (1 a 21) entre duas cores hex — usada pra garantir que nenhum dos 8
 *  presets combine texto/fundo ilegível (AC8 do Loop 4d). */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA pra texto normal é 4.5:1 — o piso que cada preset precisa cumprir tanto pro texto sobre
 *  o fundo da página quanto sobre a superfície de card. */
export const MIN_SAFE_CONTRAST = 4.5;

export function isPaletteContrastSafe(palette: StorefrontPalette): boolean {
  return (
    contrastRatio(palette.text, palette.bg) >= MIN_SAFE_CONTRAST &&
    contrastRatio(palette.text, palette.surface) >= MIN_SAFE_CONTRAST
  );
}
