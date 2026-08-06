import { getTenantSlug } from "@/lib/tenantSlug";

// Namespace SEPARADO de tokenStorage.ts (staff): garante que uma sessão de
// cliente logado nunca é lida/usada como se fosse uma sessão de staff, e vice-versa.
function getSlugKey(base: string): string {
  const slug = getTenantSlug();
  return `${base}_${slug}`;
}

export function getCustomerAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getSlugKey("kivoni_customer_access"));
}

export function getCustomerRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getSlugKey("kivoni_customer_refresh"));
}

export function setCustomerTokens(access: string, refresh: string) {
  localStorage.setItem(getSlugKey("kivoni_customer_access"), access);
  localStorage.setItem(getSlugKey("kivoni_customer_refresh"), refresh);
}

export function clearCustomerTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getSlugKey("kivoni_customer_access"));
  localStorage.removeItem(getSlugKey("kivoni_customer_refresh"));
}
