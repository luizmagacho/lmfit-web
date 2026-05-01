import axios from "axios";
import { apiBaseUrl } from "./apiBase";

/** Unauthenticated JSON client (public catalog, order draft). */
export const publicHttp = axios.create({
  baseURL: apiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});
