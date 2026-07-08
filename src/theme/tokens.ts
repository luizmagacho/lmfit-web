/**
 * LM FIT — brand primary and logo match official assets (orange #f68006 on black).
 * Neutrals and semantic colors stay aligned with the storefront where applicable.
 */
export const lmfitLogoSrc =
  "/kivoni-symbol.svg" as const;

export const lmfitTokens = {
  /** Brand purple from the official logo */
  primary: "var(--kivoni-primary)",
  /** Darkened for hover / pressed states */
  primaryDark: "var(--kivoni-primary-dark)",
  /** `--accent_color` */
  accentBlue: "var(--kivoni-accent)",
  /** Secondary text on black accents */
  accentBlueLight: "var(--kivoni-accent-light)",
  /** `--text_color` */
  text: "var(--kivoni-text)",
  textMuted: "var(--kivoni-text-muted)",
  /** `rgba(var(--main-foreground), 0.1)` on white */
  border: "var(--kivoni-border)",
  surface: "var(--kivoni-surface)",
  background: "var(--background)",
  /** `--color-success` */
  success: "var(--kivoni-success)",
  warningBg: "var(--kivoni-warning-bg)",
  /** `--color-error` */
  error: "var(--kivoni-error)",
} as const;

export type LmfitTokenKey = keyof typeof lmfitTokens;
