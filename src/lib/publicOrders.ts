import { publicHttp } from "@/lib/publicHttp";

export type PublicDraft = {
  sessionToken: string;
  lines: Array<{ variantId: string; quantity: number; unitPrice: number }>;
  customerId?: string;
  waId?: string;
  status?: string;
};

export type PublicPaymentResponse = {
  paymentId?: string;
  id?: string;
  qrCode?: string;
  qrCodeImage?: string | null;
  qrImageUrl?: string | null;
  expiresAt?: string | number;
  checkoutUrl?: string;
};

/** Cria rascunho e já adiciona linhas; idempotente em relação ao token. */
export async function createPublicDraftWithLines(params: {
  customer: { name: string; phone: string; email?: string | null };
  lines: Array<{ variantId: string; quantity: number; unitPrice: number }>;
  shipping?: { method: string; address?: unknown; cost?: number };
}): Promise<{ sessionToken: string; draft: PublicDraft }> {
  const { data } = await publicHttp.post<{ sessionToken: string }>("/public/order-drafts", {
    waId: params.customer.phone.replace(/\D/g, "") || undefined,
    metadata: {
      customer: params.customer,
      shipping: params.shipping,
    },
  });
  const token = data.sessionToken;
  const { data: draft } = await publicHttp.patch<PublicDraft>(`/public/order-drafts/${token}`, {
    lines: params.lines,
    status: "review",
    shippingMethod: params.shipping?.method,
    shippingCost: params.shipping?.cost ?? 0,
  });
  return { sessionToken: token, draft };
}

/**
 * Submete o rascunho. Backend pode retornar:
 *  - `{ orderId }` (sem PIX gerado na API)
 *  - `{ orderId, payment: {...} }` (one-page PIX)
 */
export async function submitPublicDraft(
  sessionToken: string,
  body: { customerId?: string; payment?: { method: string } } = {},
): Promise<{ orderId: string; payment?: PublicPaymentResponse }> {
  const { data } = await publicHttp.post<{ orderId: string; payment?: PublicPaymentResponse }>(
    `/public/order-drafts/${sessionToken}/submit`,
    body,
  );
  return data;
}

/** Consulta status do pagamento (quando o endpoint existe). */
export async function getPublicPaymentStatus(paymentId: string): Promise<string | null> {
  try {
    const { data } = await publicHttp.get<{ status?: string }>(
      `/public/payments/${encodeURIComponent(paymentId)}`,
    );
    return data?.status ? String(data.status) : null;
  } catch {
    return null;
  }
}
