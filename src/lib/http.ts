import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { apiBaseUrl } from "./apiBase";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokenStorage";

export const http = axios.create({
  baseURL: apiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Extract tenant-slug cookie and set header
  if (typeof window !== "undefined") {
    const match = document.cookie.match(/(^|;)\s*tenant-slug\s*=\s*([^;]+)/);
    const slug = match ? match[2] : "lmfit";
    config.headers["X-Tenant-Slug"] = slug;
  } else {
    config.headers["X-Tenant-Slug"] = "lmfit";
  }
  // For FormData, remove the preset Content-Type so axios auto-sets
  // "multipart/form-data; boundary=..." with the correct boundary.
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
