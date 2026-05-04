"use client";

import { useEffect, useMemo, useState } from "react";
import { http } from "@/lib/http";
import { lmfitTokens } from "@/theme/tokens";

type Summary = {
  range: { from: string; to: string };
  revenue: { total: number; orderCount: number; source: string };
  topVariants: Array<{
    variantId: string;
    sku?: string;
    units: number;
    revenue: number;
  }>;
  stockValue: { totalRetail: number; note?: string };
};

function rangeIso(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const params = useMemo(() => rangeIso(days), [days]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: d } = await http.get<Summary>("/reports/summary", {
          params: { from: params.from, to: params.to },
        });
        if (!cancelled) {
          setData(d);
          setErr(null);
        }
      } catch {
        if (!cancelled) {
          setErr("Sem permissão ou API indisponível.");
          setData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.from, params.to]);

  const maxRev =
    data?.topVariants?.reduce((m, v) => Math.max(m, v.revenue), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: lmfitTokens.text }}
        >
          Relatórios
        </h1>
        <label className="flex flex-col text-sm gap-1" style={{ color: lmfitTokens.textMuted }}>
          Período (dias)
          <select
            className="border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                Últimos {d} dias
              </option>
            ))}
          </select>
        </label>
      </div>
      {err && (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {err}
        </p>
      )}
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Receita (pedidos pagos/entregues)"
              value={formatMoney(data.revenue.total)}
              subtitle={`${data.revenue.orderCount} pedidos · ${data.revenue.source}`}
            />
            <StatCard
              title="Valor em estoque (varejo)"
              value={formatMoney(data.stockValue.totalRetail)}
              subtitle={data.stockValue.note ?? ""}
            />
          </div>
          <section className="space-y-2">
            <h2 className="text-lg font-medium" style={{ color: lmfitTokens.text }}>
              Top SKUs por receita
            </h2>
            <div className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
              {data.topVariants.length === 0 ? (
                <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
                  Sem linhas de pedido no período.
                </p>
              ) : (
                data.topVariants.map((v) => (
                  <div key={String(v.variantId)} className="space-y-1">
                    <div className="flex justify-between text-sm gap-2">
                      <span style={{ color: lmfitTokens.text }}>
                        {v.sku ?? v.variantId}
                      </span>
                      <span style={{ color: lmfitTokens.textMuted }}>
                        {formatMoney(v.revenue)} · {v.units} un.
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full bg-[var(--chart-track)] overflow-hidden"
                      aria-hidden
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxRev ? Math.round((v.revenue / maxRev) * 100) : 0}%`,
                          backgroundColor: lmfitTokens.primary,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div
      className="rounded-lg border p-4 space-y-1"
      style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}
    >
      <div className="text-sm" style={{ color: lmfitTokens.textMuted }}>
        {title}
      </div>
      <div className="text-2xl font-semibold" style={{ color: lmfitTokens.text }}>
        {value}
      </div>
      {subtitle ? (
        <div className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function formatMoney(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
