import { getTenantSlug } from "@/lib/tenantSlug";

// Chaves de token são ESPECÍFICAS por loja (slug) para evitar
// que lojas diferentes compartilhem a mesma sessão no mesmo navegador.
function getSlugKey(base: string): string {
  const slug = getTenantSlug();
  return `${base}_${slug}`;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getSlugKey("kivoni_access"));
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(getSlugKey("kivoni_refresh"));
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(getSlugKey("kivoni_access"), access);
  localStorage.setItem(getSlugKey("kivoni_refresh"), refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  const accessKey = getSlugKey("kivoni_access");
  const refreshKey = getSlugKey("kivoni_refresh");
  localStorage.removeItem(accessKey);
  localStorage.removeItem(refreshKey);
  // Limpa também o slug armazenado para forçar nova seleção de loja no próximo login
  localStorage.removeItem("kivoni_tenant_slug");
  // Limpa cookies (para SSR/middleware)
  document.cookie = `${accessKey}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
  document.cookie = `${refreshKey}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
  document.cookie = `tenant-slug=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
}
