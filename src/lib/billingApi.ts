import { http } from './http';

export async function createCheckoutSession(priceId: string, successUrl: string, cancelUrl: string): Promise<{ url: string }> {
  const { data } = await http.post('/billing/checkout-session', { priceId, successUrl, cancelUrl });
  return data;
}

export async function createPortalSession(returnUrl: string): Promise<{ url: string }> {
  const { data } = await http.post('/billing/portal-session', { returnUrl });
  return data;
}
