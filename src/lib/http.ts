import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { apiBaseUrl } from "./apiBase";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokenStorage";
import { getTenantSlug } from "@/lib/tenantSlug";

export const http = axios.create({
  baseURL: apiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Sempre usa o slug da URL atual — garante isolamento por loja
  if (typeof window !== "undefined") {
    const slug = getTenantSlug();
    config.headers["X-Tenant-Slug"] = slug;
  } else {
    // SSR: tenta ler do cookie do request (middleware injeta isso)
    const match =
      typeof document !== "undefined"
        ? document.cookie.match(/(^|;)\s*tenant-slug\s*=\s*([^;]+)/)
        : null;
    config.headers["X-Tenant-Slug"] = match ? match[2] : "kivoni";
  }

  // Para FormData, remove o preset Content-Type para axios setar corretamente
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 402) {
      if (typeof window !== "undefined" && window.location.pathname !== "/billing") {
        window.location.href = "/billing";
      }
      return Promise.reject(error);
    }

    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      original.url?.includes("/auth/login") ||
      original.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }
    original._retry = true;
    const refresh = getRefreshToken();
    if (!refresh) {
      clearTokens();
      return Promise.reject(error);
    }
    try {
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken: string;
      }>(`${apiBaseUrl()}/auth/refresh`, { refreshToken: refresh });
      setTokens(data.accessToken, data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return http(original);
    } catch {
      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }
  },
);
