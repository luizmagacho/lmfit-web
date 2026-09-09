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

export const ORDER_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  open: { bg: "#fef3c7", fg: "#b45309" },
  picking: { bg: "#ede9fe", fg: "#6d28d9" },
  shipped: { bg: "#dbeafe", fg: "#2563eb" },
  completed: { bg: "#dcfce7", fg: "#16a34a" },
  cancelled: { bg: "#fee2e2", fg: "#dc2626" },
};
