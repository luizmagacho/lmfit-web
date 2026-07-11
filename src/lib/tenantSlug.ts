/**
 * Utilitário puro (sem React) para obter o slug do tenant a partir do hostname.
 * Compartilhado entre tokenStorage, http.ts e TenantContext.
 *
 * Ordem de prioridade:
 * 1. Subdomínio da URL (ex: lmfit.localhost:3000 → "lmfit")
 * 2. Cookie "tenant-slug" (setado ao clicar numa loja na tela de login)
 * 3. Fallback: "kivoni"
 */
export function getTenantSlug(): string {
  if (typeof window === "undefined") return "kivoni";

  const hostname = window.location.hostname;

  // Dev local: "loja.localhost" ou subdomínios em localhost
  if (hostname.includes(".localhost")) {
    const parts = hostname.split(".localhost")[0];
    if (parts && parts !== "localhost") {
      return parts;
    }
  }

  // Produção: "loja.kivoni.com.br"
  if (hostname.endsWith(".kivoni.com.br")) {
    const parts = hostname.split(".kivoni.com.br")[0];
    if (parts && parts !== "www" && parts !== "admin") {
      return parts;
    }
  }

  // Domínio raiz da plataforma — nunca herda localStorage de outro tenant
  if (hostname === "kivoni.com.br" || hostname === "www.kivoni.com.br") {
    return "kivoni";
  }

  // Domínio legado da LMFit (crm.lmfit.com.br, www.lmfit.com.br, …) → loja lmfit
  if (hostname.endsWith("lmfit.com.br")) {
    return "lmfit";
  }

  // Sem subdomínio (localhost puro, 127.0.0.1, etc.):
  // Lê o cookie "tenant-slug" que foi gravado quando o usuário
  // escolheu a loja na tela de diretório de lojas.
  const match = document.cookie.match(/(^|;)\s*tenant-slug\s*=\s*([^;]+)/);
  if (match && match[2]) {
    return match[2];
  }

  // Último fallback: tenta localStorage (apenas em dev/localhost)
  try {
    const stored = localStorage.getItem("kivoni_tenant_slug");
    if (stored) return stored;
  } catch {
    /* ignore */
  }

  return "kivoni";
}

/**
 * Persiste o slug escolhido no localStorage como backup do cookie.
 * Chamado durante o redirecionamento para a loja no login.
 */
export function setTenantSlugStorage(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("kivoni_tenant_slug", slug);
  } catch {
    /* ignore */
  }
}

/**
 * Retorna true se o tenant foi resolvido por uma das fontes válidas
 * (subdomínio, cookie ou localStorage), em vez de apenas o fallback default.
 */
export function isRealTenantResolved(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname;

  // Domínio raiz da plataforma: não carrega tenant (não há subdomain para resolver)
  if (hostname === "kivoni.com.br" || hostname === "www.kivoni.com.br") {
    return false;
  }

  // 1. Subdomínio
  if (hostname.includes(".localhost")) {
    const parts = hostname.split(".localhost")[0];
    if (parts && parts !== "localhost") return true;
  }
  if (hostname.endsWith(".kivoni.com.br")) {
    const parts = hostname.split(".kivoni.com.br")[0];
    if (parts && parts !== "www" && parts !== "admin") return true;
  }
  if (hostname.endsWith("lmfit.com.br")) return true;

  // 2. Cookie
  const match = document.cookie.match(/(^|;)\s*tenant-slug\s*=\s*([^;]+)/);
  if (match && match[2]) return true;

  // 3. LocalStorage
  try {
    if (localStorage.getItem("kivoni_tenant_slug")) return true;
  } catch {
    /* ignore */
  }

  return false;
}
