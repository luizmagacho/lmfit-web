import { api } from './api';

export async function createCheckoutSession(priceId: string, successUrl: string, cancelUrl: string): Promise<{ url: string }> {
  const { data } = await api.post('/billing/checkout-session', { priceId, successUrl, cancelUrl });
  return data;
}

export async function createPortalSession(returnUrl: string): Promise<{ url: string }> {
  const { data } = await api.post('/billing/portal-session', { returnUrl });
  return data;
}
