/** Campos numéricos que representam valor em reais (centavos digitados). */
export function isBRLMoneyField(columnKey: string): boolean {
  const k = columnKey.toLowerCase();
  return (
    k.includes("price") ||
    k.includes("amount") ||
    k.includes("total") ||
    k.includes("revenue") ||
    k.includes("valor") ||
    k === "compareatprice"
  );
}

/** Exibe string decimal "1234.56" ou vazia como moeda pt-BR. */
export function formatBRLInputDisplay(decimalStr: string): string {
  const t = decimalStr.trim().replace(",", ".");
  if (t === "") return "";
  const n = Number(t);
  if (!Number.isFinite(n)) return decimalStr;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Interpreta o texto do campo (apenas dígitos = centavos acumulados).
 * Ex.: dígitos "1999" → "19.99"
 */
export function parseBRLMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const v = parseInt(digits, 10) / 100;
  if (!Number.isFinite(v)) return "";
  return v.toFixed(2);
}

function maskLocalDDD(d: string): string {
  const x = d.slice(0, 11);
  if (x.length === 0) return "";
  if (x.length <= 2) return `(${x}`;
  if (x.length <= 6) return `(${x.slice(0, 2)}) ${x.slice(2)}`;
  if (x.length <= 10) return `(${x.slice(0, 2)}) ${x.slice(2, 6)}-${x.slice(6)}`;
  return `(${x.slice(0, 2)}) ${x.slice(2, 7)}-${x.slice(7, 11)}`;
}

/** Máscara BR: (DD) NNNNN-NNNN ou (DD) NNNN-NNNN; com 55 no início: +55 (DD) …. */
export function maskBrazilPhone(digits: string): string {
  let d = digits.replace(/\D/g, "");
  if (d.length > 13) d = d.slice(0, 13);
  if (d.startsWith("55") && d.length >= 3) {
    const local = d.slice(2, 13);
    const m = maskLocalDDD(local);
    return m ? `+55 ${m}` : "+55 ";
  }
  return maskLocalDDD(d);
}

/** WhatsApp / wa id costuma incluir 55 + DDD + 9 dígitos (13). Telefone local: 11. */
export function maxPhoneDigits(columnKey: string): number {
  const k = columnKey.toLowerCase();
  if (k.includes("whatsapp") || k.includes("waid")) return 13;
  return 11;
}

export function onlyDigits(s: string, maxLen: number): string {
  return s.replace(/\D/g, "").slice(0, maxLen);
}

export function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

export function isValidEmail(s: string): boolean {
  const t = normalizeEmail(s);
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}
