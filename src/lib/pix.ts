"use client";

import { useEffect, useState } from "react";

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    if (typeof document !== "undefined") {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function formatSecondsAsMMSS(total: number): string {
  const t = Math.max(0, Math.floor(total));
  const mm = String(Math.floor(t / 60)).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/** Countdown hook. Pass an absolute `expiresAt` (ms since epoch) or `durationSec` relative to now. */
export function usePixCountdown(expiresAt: number | null): {
  remainingSec: number;
  label: string;
  expired: boolean;
} {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const remaining = expiresAt ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : 0;
  return {
    remainingSec: remaining,
    label: formatSecondsAsMMSS(remaining),
    expired: !!expiresAt && remaining <= 0,
  };
}
