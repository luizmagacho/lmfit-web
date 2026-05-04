/**
 * LM FIT — brand primary and logo match official assets (orange #f68006 on black).
 * Neutrals and semantic colors stay aligned with the storefront where applicable.
 */
export const lmfitLogoSrc =
  "https://d1a9qnv764bsoo.cloudfront.net/stores/006/316/201/themes/common/logo-813858800-1750428827-d18edfd75754df23704c77cbd129bbc91750428827-1024-1024.webp?w=1400" as const;

export const lmfitTokens = {
  /** Brand orange from the official logo */
  primary: "var(--lmfit-primary)",
  /** Darkened for hover / pressed states */
  primaryDark: "var(--lmfit-primary-dark)",
  /** `--accent_color` → rgb(0, 0, 0) */
  accentBlue: "var(--lmfit-accent)",
  /** Secondary text on black accents */
  accentBlueLight: "var(--lmfit-accent-light)",
  /** `--text_color` */
  text: "var(--lmfit-text)",
  textMuted: "var(--lmfit-text-muted)",
  /** `rgba(var(--main-foreground), 0.1)` on white */
  border: "var(--lmfit-border)",
  surface: "var(--lmfit-surface)",
  background: "var(--background)",
  /** `--color-success` → rgb(60, 175, 101) */
  success: "var(--lmfit-success)",
  warningBg: "var(--lmfit-warning-bg)",
  /** `--color-error` → rgb(204, 72, 69) */
  error: "var(--lmfit-error)",
} as const;

export type LmfitTokenKey = keyof typeof lmfitTokens;
