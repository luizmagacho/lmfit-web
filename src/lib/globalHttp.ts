import axios from "axios";
import { apiBaseUrl } from "./apiBase";

/**
 * Cliente HTTP sem cabeçalho X-Tenant-Slug.
 * Usado para endpoints globais da plataforma que não pertencem
 * a nenhuma loja específica, como GET /public/tenants (lista todas as lojas).
 */
export const globalHttp = axios.create({
  baseURL: apiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});
