import axios, { type InternalAxiosRequestConfig } from "axios";
import { apiBaseUrl } from "./apiBase";

/** Unauthenticated JSON client (public catalog, order draft). */
export const publicHttp = axios.create({
  baseURL: apiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

publicHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const match = document.cookie.match(/(^|;)\s*tenant-slug\s*=\s*([^;]+)/);
    const slug = match ? match[2] : "lmfit";
    config.headers["X-Tenant-Slug"] = slug;
  } else {
    config.headers["X-Tenant-Slug"] = "lmfit";
  }
  return config;
});
