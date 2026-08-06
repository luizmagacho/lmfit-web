const COOKIE_NAME = "kivoni-consent";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Loop 15 — disparado depois que o cookie é escrito, pra `AnalyticsScripts` reagir sem precisar
 *  de reload (o banner e os scripts de pixel são componentes-irmãos, sem estado compartilhado). */
export const CONSENT_CHANGED_EVENT = "kivoni-consent-changed";

export type ConsentStatus = "accepted" | "declined";

/** Loop 10 (LGPD) — lê o cookie de consentimento diretamente (sem lib externa), mesmo padrão de
 *  `document.cookie` já usado por `tenant-slug`/tokens neste projeto. `null` = ainda não decidiu. */
export function getConsentStatus(cookieString: string = typeof document !== "undefined" ? document.cookie : ""): ConsentStatus | null {
  const match = cookieString.match(new RegExp(`(?:^|; )${COOKIE_NAME}=(accepted|declined)`));
  return (match?.[1] as ConsentStatus | undefined) ?? null;
}

export function setConsentStatus(status: ConsentStatus): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${status}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: status }));
  }
}
