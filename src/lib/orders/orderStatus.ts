import type { OrderStatus } from "./types";

export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "open", label: "Em aberto" },
  { value: "picking", label: "Em separação" },
  { value: "shipped", label: "Enviado" },
  { value: "completed", label: "Concluído" },
  { value: "cancelled", label: "Cancelado" },
];

export function orderStatusLabel(status: string | undefined | null): string {
  if (!status) return "—";
  const row = ORDER_STATUSES.find((s) => s.value === status);
  return row?.label ?? String(status);
}
