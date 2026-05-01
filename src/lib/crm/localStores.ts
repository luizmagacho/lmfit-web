import type { CrmOpportunityLocal, CrmTaskLocal } from "./types";

const OPP_KEY = "lmfit.crm.opportunities.v1";
const TASK_KEY = "lmfit.crm.tasks.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function readLocalOpportunities(): CrmOpportunityLocal[] {
  if (typeof window === "undefined") return [];
  return safeParse<CrmOpportunityLocal[]>(localStorage.getItem(OPP_KEY), []);
}

export function writeLocalOpportunities(list: CrmOpportunityLocal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(OPP_KEY, JSON.stringify(list));
}

export function readLocalTasks(): CrmTaskLocal[] {
  if (typeof window === "undefined") return [];
  return safeParse<CrmTaskLocal[]>(localStorage.getItem(TASK_KEY), []);
}

export function writeLocalTasks(list: CrmTaskLocal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TASK_KEY, JSON.stringify(list));
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
