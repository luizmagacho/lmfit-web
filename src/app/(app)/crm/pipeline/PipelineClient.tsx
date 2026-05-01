"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { axiosErrorMessage } from "@/lib/apiErrors";
import { http } from "@/lib/http";
import type { CrmOpportunityLocal, CrmOpportunityStage } from "@/lib/crm/types";
import { newId, readLocalOpportunities, writeLocalOpportunities } from "@/lib/crm/localStores";
import { extractListItems } from "@/lib/normalizeApiList";
import { lmfitTokens } from "@/theme/tokens";

const STAGES: { id: CrmOpportunityStage; label: string }[] = [
  { id: "new", label: "Novo" },
  { id: "qualified", label: "Qualificado" },
  { id: "proposal", label: "Proposta" },
  { id: "won", label: "Ganho" },
  { id: "lost", label: "Perdido" },
];

export function PipelineClient() {
  const [mode, setMode] = useState<"loading" | "api" | "local">("loading");
  const [apiErr, setApiErr] = useState<string | null>(null);
  const [opps, setOpps] = useState<CrmOpportunityLocal[]>([]);
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [value, setValue] = useState("0");

  const load = useCallback(async () => {
    setMode("loading");
    setApiErr(null);
    try {
      const { data } = await http.get<unknown>("/crm/opportunities", { params: { page: 1, limit: 100 } });
      const items = extractListItems(data);
      const mapped: CrmOpportunityLocal[] = items
        .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
        .map((row) => ({
          id: String(row._id ?? row.id ?? newId("opp")),
          title: String(row.title ?? "Oportunidade"),
          customerId: String(row.customerId ?? ""),
          customerName: row.customerName != null ? String(row.customerName) : undefined,
          value: Number(row.value ?? row.amount ?? 0) || 0,
          stage: (String(row.stage ?? "new") as CrmOpportunityStage) || "new",
          owner: row.ownerUserId != null ? String(row.ownerUserId) : undefined,
          updatedAt: String(row.updatedAt ?? row.createdAt ?? new Date().toISOString()),
        }))
        .filter((o) => o.customerId);
      setOpps(mapped);
      setMode("api");
    } catch (e) {
      if (isAxiosError(e) && (e.response?.status === 404 || e.response?.status === 501)) {
        setApiErr(null);
      } else if (isAxiosError(e)) {
        setApiErr(axiosErrorMessage(e));
      }
      setOpps(readLocalOpportunities());
      setMode("local");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byStage = useMemo(() => {
    const m = new Map<CrmOpportunityStage, CrmOpportunityLocal[]>();
    for (const s of STAGES) m.set(s.id, []);
    for (const o of opps) {
      const list = m.get(o.stage) ?? m.get("new")!;
      list.push(o);
    }
    return m;
  }, [opps]);

  function persist(next: CrmOpportunityLocal[]) {
    setOpps(next);
    if (mode === "local") writeLocalOpportunities(next);
  }

  function move(id: string, stage: CrmOpportunityStage) {
    persist(opps.map((o) => (o.id === id ? { ...o, stage, updatedAt: new Date().toISOString() } : o)));
  }

  function addLocal() {
    if (!title.trim() || !customerId.trim()) return;
    const n: CrmOpportunityLocal = {
      id: newId("opp"),
      title: title.trim(),
      customerId: customerId.trim(),
      value: Number(value.replace(",", ".")) || 0,
      stage: "new",
      updatedAt: new Date().toISOString(),
    };
    persist([n, ...opps]);
    setTitle("");
    setCustomerId("");
    setValue("0");
  }

  if (mode === "loading") {
    return <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>Carregando funil…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2 items-baseline">
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
          CRM · Funil
        </h1>
        <a
          href="/crm-api-openapi.yaml"
          target="_blank"
          rel="noreferrer"
          className="text-sm underline"
          style={{ color: lmfitTokens.textMuted }}
        >
          Contrato API (YAML)
        </a>
      </div>

      {mode === "local" ? (
        <p className="text-sm rounded-md border px-3 py-2" style={{ borderColor: lmfitTokens.border, backgroundColor: lmfitTokens.warningBg, color: lmfitTokens.text }}>
          Modo local: oportunidades guardadas neste navegador. Quando <code className="text-xs">GET /crm/opportunities</code> existir na API, os dados passam a vir do servidor.
        </p>
      ) : null}
      {apiErr ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {apiErr}
        </p>
      ) : null}

      {mode === "api" ? (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Dados da API (somente leitura de mudança de estágio neste MVP — use PATCH na API ou modo local).
        </p>
      ) : null}

      <div className="rounded-lg border bg-white p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
        <h2 className="font-medium text-sm" style={{ color: lmfitTokens.text }}>
          Nova oportunidade (modo local)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="border rounded-md px-3 py-2 text-sm min-h-11"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="border rounded-md px-3 py-2 text-sm min-h-11"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="ID do cliente"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
          <input
            className="border rounded-md px-3 py-2 text-sm min-h-11 tabular-nums"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="Valor (BRL)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="min-h-11 px-4 rounded-md text-sm font-medium text-white touch-manipulation disabled:opacity-50"
          style={{ backgroundColor: lmfitTokens.primary }}
          disabled={mode !== "local"}
          onClick={() => addLocal()}
        >
          Adicionar (local)
        </button>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-[56rem]">
          {STAGES.map((col) => (
            <div
              key={col.id}
              className="flex-1 min-w-[10rem] rounded-lg border bg-white p-2 space-y-2"
              style={{ borderColor: lmfitTokens.border }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: lmfitTokens.accentBlue }}>
                {col.label}
              </h3>
              <ul className="space-y-2">
                {(byStage.get(col.id) ?? []).map((o) => (
                  <li
                    key={o.id}
                    className="rounded-md border px-2 py-2 text-sm space-y-1"
                    style={{ borderColor: lmfitTokens.border }}
                  >
                    <p className="font-medium" style={{ color: lmfitTokens.text }}>
                      {o.title}
                    </p>
                    <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                      Cliente:{" "}
                      <Link href={`/customers/${encodeURIComponent(o.customerId)}`} className="underline">
                        {o.customerName ?? o.customerId}
                      </Link>
                    </p>
                    <p className="text-xs tabular-nums" style={{ color: lmfitTokens.textMuted }}>
                      Valor: {o.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    {mode === "local" ? (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {STAGES.filter((s) => s.id !== col.id).map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            className="text-[10px] min-h-8 px-1.5 rounded border touch-manipulation"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                            onClick={() => move(o.id, s.id)}
                          >
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
