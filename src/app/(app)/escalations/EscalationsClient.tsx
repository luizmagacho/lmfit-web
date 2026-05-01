"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { http } from "@/lib/http";
import { extractListItems } from "@/lib/normalizeApiList";
import { lmfitTokens } from "@/theme/tokens";

type Row = Record<string, unknown>;

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function EscalationsClient() {
  const searchParams = useSearchParams();
  const fromWaId = searchParams.get("fromWaId")?.trim() ?? "";

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await http.get<unknown>("/internal/whatsapp/escalations", {
          params: { page: 1, limit: 200 },
        });
        if (!cancelled) {
          const items = extractListItems(data);
          setRows(items as Row[]);
          setTotal(typeof data === "object" && data && "total" in data ? Number((data as { total: unknown }).total) || items.length : items.length);
        }
      } catch {
        if (!cancelled) setErr("Não foi possível carregar as escalações.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!fromWaId) return rows;
    const needle = onlyDigits(fromWaId);
    if (!needle) return rows;
    return rows.filter((row) => {
      const from = row.fromWaId != null ? onlyDigits(String(row.fromWaId)) : "";
      return from && (from === needle || from.endsWith(needle) || needle.endsWith(from));
    });
  }, [rows, fromWaId]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-baseline gap-2">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: lmfitTokens.text }}
        >
          Escalações WhatsApp
        </h1>
        <span className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          {fromWaId ? `${filtered.length} filtrado(s) de ${total}` : `${total} registro(s)`}
        </span>
      </div>
      {fromWaId ? (
        <p className="text-sm rounded-md border px-3 py-2" style={{ borderColor: lmfitTokens.border, color: lmfitTokens.textMuted }}>
          Filtro ativo: <code className="text-xs">fromWaId</code> = {fromWaId}
        </p>
      ) : null}
      {err && (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {err}
        </p>
      )}
      <div
        className="overflow-x-auto rounded-lg border bg-white"
        style={{ borderColor: lmfitTokens.border }}
      >
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
              {["wamid", "fromWaId", "processingStatus", "textBody", "error", "createdAt"].map((c) => (
                <th
                  key={c}
                  className="px-3 py-2 font-medium"
                  style={{ color: lmfitTokens.accentBlue }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={i}
                className="border-b last:border-0 align-top"
                style={{ borderColor: lmfitTokens.border }}
              >
                {["wamid", "fromWaId", "processingStatus", "textBody", "error", "createdAt"].map((c) => (
                  <td
                    key={c}
                    className="px-3 py-2 max-w-[14rem] whitespace-pre-wrap break-words"
                    style={{ color: lmfitTokens.text }}
                  >
                    {formatCell(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
