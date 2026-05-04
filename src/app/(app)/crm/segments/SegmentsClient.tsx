"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { http } from "@/lib/http";
import { documentId, extractListItems } from "@/lib/normalizeApiList";
import { lmfitTokens } from "@/theme/tokens";

type CustomerRow = Record<string, unknown>;

type PresetId = "all" | "with_email" | "with_whatsapp";

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "with_email", label: "Com e-mail" },
  { id: "with_whatsapp", label: "Com WhatsApp" },
];

function applyPreset(rows: CustomerRow[], preset: PresetId): CustomerRow[] {
  if (preset === "all") return rows;
  if (preset === "with_email") return rows.filter((r) => String(r.email ?? "").trim() !== "");
  if (preset === "with_whatsapp") return rows.filter((r) => String(r.whatsappWaId ?? "").trim() !== "");
  return rows;
}

function toCsv(rows: CustomerRow[]): string {
  const headers = ["_id", "name", "email", "phone", "whatsappWaId", "legalName"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers
        .map((h) => {
          const v = r[h];
          const s = v == null ? "" : String(v).replaceAll('"', '""');
          return `"${s}"`;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

export function SegmentsClient() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [preset, setPreset] = useState<PresetId>("all");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const { data } = await http.get<unknown>("/customers", { params: { page: 1, limit: 500 } });
      setRows(extractListItems(data) as CustomerRow[]);
    } catch {
      setErr("Não foi possível carregar clientes.");
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => applyPreset(rows, preset), [rows, preset]);

  function downloadCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `segmento-clientes-${preset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
        CRM · Segmentos
      </h1>
      <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
        Filtros locais sobre a lista carregada. Para segmentos persistidos e LGPD, implemente{" "}
        <code className="text-xs">GET /crm/segments</code> conforme{" "}
        <a href="/crm-api-openapi.yaml" target="_blank" rel="noreferrer" className="underline">
          OpenAPI
        </a>
        .
      </p>
      {err ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {err}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="min-h-11 px-3 rounded-md border text-sm touch-manipulation"
            style={{
              borderColor: lmfitTokens.border,
              color: lmfitTokens.text,
              backgroundColor: preset === p.id ? lmfitTokens.surface : "white",
            }}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="min-h-11 px-3 rounded-md text-sm font-medium text-white touch-manipulation"
          style={{ backgroundColor: lmfitTokens.primary }}
          onClick={() => downloadCsv()}
        >
          Exportar CSV
        </button>
      </div>

      <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
        {filtered.length} cliente(s) no segmento.
      </p>

      <div className="overflow-x-auto rounded-lg border bg-[var(--card-bg)]" style={{ borderColor: lmfitTokens.border }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
              {["Nome", "E-mail", "WhatsApp", "Ações"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => {
              const id = documentId(r);
              return (
                <tr key={id || `seg-${idx}`} className="border-b" style={{ borderColor: lmfitTokens.border }}>
                  <td className="px-3 py-2" style={{ color: lmfitTokens.text }}>
                    {String(r.name ?? "—")}
                  </td>
                  <td className="px-3 py-2" style={{ color: lmfitTokens.text }}>
                    {String(r.email ?? "—")}
                  </td>
                  <td className="px-3 py-2" style={{ color: lmfitTokens.text }}>
                    {String(r.whatsappWaId ?? "—")}
                  </td>
                  <td className="px-3 py-2">
                    {id ? (
                      <Link href={`/customers/${encodeURIComponent(id)}`} className="text-xs underline">
                        Ficha
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
