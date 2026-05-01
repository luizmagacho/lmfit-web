export type CustomerNoteLocal = { id: string; text: string; at: string };

const prefix = "lmfit.crm.customerNotes.v1.";

function key(customerId: string) {
  return `${prefix}${customerId}`;
}

export function readCustomerNotes(customerId: string): CustomerNoteLocal[] {
  if (typeof window === "undefined" || !customerId) return [];
  try {
    const raw = localStorage.getItem(key(customerId));
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? (p as CustomerNoteLocal[]) : [];
  } catch {
    return [];
  }
}

export function appendCustomerNote(customerId: string, text: string) {
  if (typeof window === "undefined" || !customerId || !text.trim()) return;
  const prev = readCustomerNotes(customerId);
  const note: CustomerNoteLocal = {
    id: `n-${Date.now().toString(36)}`,
    text: text.trim(),
    at: new Date().toISOString(),
  };
  localStorage.setItem(key(customerId), JSON.stringify([note, ...prev]));
}
