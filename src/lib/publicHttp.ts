import axios, { type InternalAxiosRequestConfig } from "axios";
import { apiBaseUrl } from "./apiBase";
import { getTenantSlug } from "./tenantSlug";

/** Unauthenticated JSON client (public catalog, order draft). */
export const publicHttp = axios.create({
  baseURL: apiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

publicHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Usa sempre o slug real da loja atual (subdomínio ou cookie)
  if (typeof window !== "undefined") {
    const slug = getTenantSlug();
    config.headers["X-Tenant-Slug"] = slug;
  } else {
    // SSR: tenta ler do cookie do request
    const match =
      typeof document !== "undefined"
        ? document.cookie.match(/(^|;)\s*tenant-slug\s*=\s*([^;]+)/)
        : null;
    config.headers["X-Tenant-Slug"] = match?.[2] ?? "kivoni";
  }
  return config;
});
