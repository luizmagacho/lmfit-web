import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { apiBaseUrl } from "./apiBase";
import {
  clearCustomerTokens,
  getCustomerAccessToken,
  getCustomerRefreshToken,
  setCustomerTokens,
} from "./customerTokenStorage";
import { getTenantSlug } from "@/lib/tenantSlug";

// Instância axios SEPARADA de http.ts (staff) — evita que um token de cliente
// e um token de staff se cruzem no mesmo navegador (ver customerTokenStorage.ts).
export const customerHttp = axios.create({
  baseURL: apiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

customerHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getCustomerAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof window !== "undefined") {
    config.headers["X-Tenant-Slug"] = getTenantSlug();
  }
  return config;
});

customerHttp.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      original.url?.includes("/customer-auth/verify") ||
      original.url?.includes("/customer-auth/refresh")
    ) {
      return Promise.reject(error);
    }
    original._retry = true;
    const refresh = getCustomerRefreshToken();
    if (!refresh) {
      clearCustomerTokens();
      return Promise.reject(error);
    }
    try {
      const { data } = await customerHttp.post<{
        accessToken: string;
        refreshToken: string;
      }>("/public/customer-auth/refresh", { refreshToken: refresh });
      setCustomerTokens(data.accessToken, data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return customerHttp(original);
    } catch {
      clearCustomerTokens();
      return Promise.reject(error);
    }
  },
);
