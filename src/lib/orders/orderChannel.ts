import type { OrderChannel } from "./types";

export const ORDER_CHANNELS: { value: OrderChannel; label: string }[] = [
  { value: "in_person", label: "Presencial" },
  { value: "online", label: "Online" },
  { value: "site", label: "Site" },
  { value: "whatsapp", label: "WhatsApp" },
];

export function orderChannelLabel(channel: string | undefined | null): string {
  if (!channel) return "—";
  const row = ORDER_CHANNELS.find((c) => c.value === channel);
  return row?.label ?? String(channel);
}

export const DEFAULT_ORDER_CHANNEL: OrderChannel = "online";
