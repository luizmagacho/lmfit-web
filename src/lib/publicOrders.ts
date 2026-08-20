import { publicHttp } from "@/lib/publicHttp";

export type PublicDraft = {
  sessionToken: string;
  lines: Array<{ variantId: string; quantity: number; unitPrice: number }>;
  customerId?: string;
  waId?: string;
  status?: string;
  /** Presente quando a última patch aplicou um cupom válido. */
  discountTotal?: number;
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

/** Loop 6 — cria só o rascunho (sem linhas ainda), pra ganhar um `sessionToken` cedo o bastante
 *  pra o `CartDrawer` aplicar um cupom antes do cliente chegar no checkout. */
export async function createDraft(phone?: string): Promise<{ sessionToken: string }> {
  const { data } = await publicHttp.post<{ sessionToken: string }>("/public/order-drafts", {
    waId: phone ? phone.replace(/\D/g, "") || undefined : undefined,
  });
  return data;
}

/** Loop 6 — patch genérico de rascunho (linhas/cupom/frete/etc.), reaproveitado pelo mesmo token
 *  tanto pelo `CartDrawer` (aplicar cupom) quanto pelo `/checkout` (submit final). */
export async function patchDraft(
  sessionToken: string,
  patch: Record<string, unknown>,
): Promise<PublicDraft> {
  const { data } = await publicHttp.patch<PublicDraft>(`/public/order-drafts/${sessionToken}`, patch);
  return data;
}

/** Cria rascunho e já adiciona linhas; idempotente em relação ao token. */
export async function createPublicDraftWithLines(params: {
  customer: { name: string; phone: string; email?: string | null };
  lines: Array<{ variantId: string; quantity: number; unitPrice: number }>;
  // Loop 27 — `destinationCep` só importa quando `method` é uma cotação real da Melhor Envio
  // ("me:<id>"); pickup/standard/express nunca precisaram de CEP. `cost` continua sendo enviado só
  // por retrocompatibilidade de payload — o servidor sempre recalcula, nunca confia nele (ver
  // PublicPatchDraftDto, que nem declara esse campo).
  shipping?: { method: string; address?: unknown; cost?: number; destinationCep?: string };
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
    destinationCep: params.shipping?.destinationCep,
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
