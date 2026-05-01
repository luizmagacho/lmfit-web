import { isAxiosError } from "axios";
import type { StockConflict } from "@/lib/orders/types";

/** NestJS often returns `message` as string or string[]. */
export function parseNestMessage(data: unknown): string {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (!data || typeof data !== "object") return "";
  const msg = (data as { message?: unknown }).message;
  if (typeof msg === "string" && msg.trim()) return msg.trim();
  if (Array.isArray(msg)) return msg.map((m) => String(m)).filter(Boolean).join(", ");
  return "";
}

function isStockConflict(x: unknown): x is StockConflict {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.variantId === "string" &&
    typeof o.sku === "string" &&
    typeof o.needed === "number" &&
    typeof o.available === "number" &&
    typeof o.messagePtBr === "string"
  );
}

export function parseStockConflictsFromBody(data: unknown): StockConflict[] | undefined {
  if (!data || typeof data !== "object") return undefined;
  const raw = (data as { conflicts?: unknown }).conflicts;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const list = raw.filter(isStockConflict);
  return list.length ? list : undefined;
}

export function axiosErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const m = parseNestMessage(err.response?.data);
    if (m) return m;
    if (err.response?.status) return `Erro ${err.response.status}`;
  }
  return err instanceof Error ? err.message : "Erro desconhecido.";
}

export function getStockConflictsFromAxiosError(
  err: unknown,
): { message: string; conflicts?: StockConflict[] } | null {
  if (!isAxiosError(err) || err.response?.status !== 422) return null;
  const data = err.response.data;
  const message = parseNestMessage(data) || axiosErrorMessage(err);
  const conflicts = parseStockConflictsFromBody(data);
  return { message, conflicts };
}
