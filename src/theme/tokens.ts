/**
 * LM FIT — brand primary and logo match official assets (orange #f68006 on black).
 * Neutrals and semantic colors stay aligned with the storefront where applicable.
 */
export const lmfitLogoSrc =
  "https://d1a9qnv764bsoo.cloudfront.net/stores/006/316/201/themes/common/logo-813858800-1750428827-d18edfd75754df23704c77cbd129bbc91750428827-1024-1024.webp?w=1400" as const;

export const lmfitTokens = {
  /** Brand orange from the official logo */
  primary: "#f68006",
  /** Darkened for hover / pressed states */
  primaryDark: "#c76705",
  /** `--accent_color` → rgb(0, 0, 0) */
  accentBlue: "#000000",
  /** Secondary text on black accents */
  accentBlueLight: "#333333",
  /** `--text_color` */
  text: "#000000",
  textMuted: "#6d6d6d",
  /** `rgba(var(--main-foreground), 0.1)` on white */
  border: "#e6e6e6",
  surface: "#f6f6f6",
  background: "#ffffff",
  /** `--color-success` → rgb(60, 175, 101) */
  success: "#3caf65",
  warningBg: "#fdf6ec",
  /** `--color-error` → rgb(204, 72, 69) */
  error: "#cc4845",
} as const;

export type LmfitTokenKey = keyof typeof lmfitTokens;
