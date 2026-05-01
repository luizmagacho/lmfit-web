import { Badge, type BadgeVariant } from "./Badge";

export type PaymentStatus = "pendente" | "pago" | "estornado" | string;

function normalize(status: string | null | undefined): PaymentStatus {
  const s = String(status ?? "").trim().toLowerCase();
  if (!s) return "pendente";
  if (["paid", "pago"].includes(s)) return "pago";
  if (["refunded", "estornado", "chargeback"].includes(s)) return "estornado";
  if (["pending", "open", "aguardando", "pendente"].includes(s)) return "pendente";
  return s;
}

export function PaymentStatusBadge({ status }: { status: string | null | undefined }) {
  const s = normalize(status);
  const variant: BadgeVariant =
    s === "pago" ? "pago" : s === "estornado" ? "estornado" : "pendente";
  const label = s === "pago" ? "Pago" : s === "estornado" ? "Estornado" : "Pendente";
  return <Badge variant={variant}>{label}</Badge>;
}
