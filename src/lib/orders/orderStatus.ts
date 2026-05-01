import type { OrderStatus } from "./types";

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "draft", label: "Rascunho" },
  { value: "paid", label: "Pago" },
  { value: "fulfilled", label: "Atendido" },
  { value: "cancelled", label: "Cancelado" },
];

export function orderStatusLabel(status: string | undefined | null): string {
  if (!status) return "—";
  const row = ORDER_STATUSES.find((s) => s.value === status);
  return row?.label ?? String(status);
}
