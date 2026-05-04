"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  deriveAbcFromRevenue,
  fetchAbcCurve,
  fetchPurchasesDaily,
  fetchReportSummary,
  fetchRevenueByProduct,
  fetchSalesToday,
  rangeIso,
  type AbcResponse,
  type PurchasesDailyResponse,
  type ReportSummary,
  type RevenueByProductResponse,
  type SalesTodayResponse,
} from "@/lib/dashboardApi";
import { readLocalOpportunities } from "@/lib/crm/localStores";
import { formatBRL } from "@/lib/formatMoney";
import { http } from "@/lib/http";
import { extractListItems, extractListTotal } from "@/lib/normalizeApiList";
import { lmfitTokens } from "@/theme/tokens";

function shortDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

export function DashboardClient() {
  const { language } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [purchasesDaily, setPurchasesDaily] = useState<PurchasesDailyResponse | null>(null);
  const [revenueByProduct, setRevenueByProduct] = useState<RevenueByProductResponse | null>(null);
  const [salesToday, setSalesToday] = useState<SalesTodayResponse | null>(null);
  const [abc, setAbc] = useState<AbcResponse | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [crmKpis, setCrmKpis] = useState<{
    customers: number;
    escalationsOpen: number;
    localOpportunities: number;
  } | null>(null);

  const range = useMemo(() => rangeIso(days), [days]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, eRes] = await Promise.all([
          http.get<unknown>("/customers", { params: { page: 1, limit: 1 } }),
          http.get<unknown>("/internal/whatsapp/escalations", { params: { page: 1, limit: 200 } }),
        ]);
        const cItems = extractListItems(cRes.data);
        const customers = extractListTotal(cRes.data, cItems.length);
        const escRows = extractListItems(eRes.data);
        const escalationsOpen = escRows.filter((r) => {
          if (!r || typeof r !== "object") return false;
          const st = String((r as { processingStatus?: unknown }).processingStatus ?? "").toLowerCase();
          return st !== "done" && st !== "resolved" && st !== "closed" && st !== "ok";
        }).length;
        const localOpportunities = readLocalOpportunities().length;
        if (!cancelled) setCrmKpis({ customers, escalationsOpen, localOpportunities });
      } catch {
        if (!cancelled) setCrmKpis(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadErr(null);
    (async () => {
      const [s, p, r, today, abcResp] = await Promise.all([
        fetchReportSummary(range.from, range.to),
        fetchPurchasesDaily(range.from, range.to),
        fetchRevenueByProduct(range.from, range.to, 50),
        fetchSalesToday(),
        fetchAbcCurve(range.from, range.to),
      ]);
      if (cancelled) return;
      setSummary(s);
      setPurchasesDaily(p);
      setRevenueByProduct(r);
      setSalesToday(today);
      setAbc(abcResp ?? deriveAbcFromRevenue(r));
      if (!s) setLoadErr("Resumo indisponível (verifique login e API).");
    })();
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  const avgTicketFromSummary = useMemo(() => {
    if (!summary) return 0;
    const oc = summary.revenue.orderCount || 0;
    return oc > 0 ? summary.revenue.total / oc : 0;
  }, [summary]);

  const abcCurveA = useMemo(
    () => (abc?.items ?? []).filter((i) => i.curve === "A"),
    [abc],
  );

  const maxPurchases = useMemo(() => {
    if (!purchasesDaily?.points?.length) return 1;
    return Math.max(...purchasesDaily.points.map((p) => p.purchaseCount), 1);
  }, [purchasesDaily]);

  const maxProductRev = useMemo(() => {
    if (!revenueByProduct?.items?.length) return 0;
    return revenueByProduct.items.reduce((m, x) => Math.max(m, x.revenue), 0);
  }, [revenueByProduct]);

  const topFromSummary = summary?.topVariants?.slice(0, 6) ?? [];
  const maxVarRev = topFromSummary.reduce((m, v) => Math.max(m, v.revenue), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: lmfitTokens.text }}
          >
            {language === "en" ? "LM FIT Dashboard" : "Painel LM FIT"}
          </h1>
          <p className="mt-1" style={{ color: lmfitTokens.textMuted }}>
            {language === "en" 
              ? `Hello, ${user?.name}. Vision inspired by e-commerce dashboards (orders, purchases, revenue by SKU).`
              : `Olá, ${user?.name}. Visão inspirada em painéis de e-commerce (pedidos, compras, receita por SKU).`}
          </p>
        </div>
        <label className="flex flex-col text-sm gap-1 shrink-0" style={{ color: lmfitTokens.textMuted }}>
          {language === "en" ? "Period" : "Período"}
          <select
            className="border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)] min-w-[10rem]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                {language === "en" ? `Last ${d} days` : `Últimos ${d} dias`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadErr ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {language === "en" ? "Summary unavailable (check login and API)." : "Resumo indisponível (verifique login e API)."}
        </p>
      ) : null}

      {crmKpis ? (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title={language === "en" ? "CRM · Customers" : "CRM · Clientes"}
            value={String(crmKpis.customers)}
            subtitle={language === "en" ? "Total (API / list)" : "Total (API / listagem)"}
            footer={
              <Link className="underline text-sm" href="/customers">
                {language === "en" ? "Open customers" : "Abrir clientes"}
              </Link>
            }
          />
          <KpiCard
            title={language === "en" ? "CRM · Open Escalations" : "CRM · Escalações abertas"}
            value={String(crmKpis.escalationsOpen)}
            subtitle={language === "en" ? "Heuristic: status ≠ done/resolved/closed" : "Heurística: status ≠ done/resolved/closed"}
            footer={
              <Link className="underline text-sm" href="/escalations">
                {language === "en" ? "WhatsApp Queue" : "Fila WhatsApp"}
              </Link>
            }
          />
          <KpiCard
            title={language === "en" ? "CRM · Opportunities (local)" : "CRM · Oportunidades (local)"}
            value={String(crmKpis.localOpportunities)}
            subtitle={language === "en" ? "Browser until GET /crm/opportunities exists" : "Navegador até existir GET /crm/opportunities"}
            footer={
              <Link className="underline text-sm" href="/crm/pipeline">
                {language === "en" ? "Open pipeline" : "Abrir funil"}
              </Link>
            }
          />
        </section>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title={language === "en" ? "Daily Sales" : "Vendas do dia"}
          value={salesToday ? formatBRL(salesToday.total) : "—"}
          subtitle={
            salesToday
              ? (language === "en" ? `${salesToday.orderCount} order(s) today` : `${salesToday.orderCount} pedido(s) hoje`)
              : "Endpoint /reports/sales-today"
          }
        />
        <KpiCard
          title={language === "en" ? "Avg Ticket" : "Ticket médio"}
          value={
            salesToday
              ? formatBRL(salesToday.avgTicket)
              : summary
                ? formatBRL(avgTicketFromSummary)
                : "—"
          }
          subtitle={salesToday ? (language === "en" ? "Today" : "Hoje") : (language === "en" ? "Selected period" : "Período selecionado")}
        />
        <KpiCard
          title={language === "en" ? "Revenue (Period)" : "Receita (período)"}
          value={summary ? formatBRL(summary.revenue.total) : "—"}
          subtitle={summary ? (language === "en" ? `${summary.revenue.orderCount} orders` : `${summary.revenue.orderCount} pedidos`) : (language === "en" ? "Loading…" : "Carregando…")}
        />
        <KpiCard
          title={language === "en" ? "Inventory Value" : "Valor em estoque"}
          value={summary ? formatBRL(summary.stockValue.totalRetail) : "—"}
          subtitle={summary?.stockValue.note ?? (language === "en" ? "Retail" : "Varejo")}
          footer={
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm pt-1">
              <Link className="underline" href="/inventory">
                {language === "en" ? "Batch Edit" : "Edição em lote"}
              </Link>
              <span style={{ color: lmfitTokens.textMuted }}>·</span>
              <Link className="underline" href="/pdv">
                POS
              </Link>
            </div>
          }
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="text-lg font-medium" style={{ color: lmfitTokens.text }}>
            {language === "en" ? "Daily Purchases" : "Compras por dia"}
          </h2>
          {purchasesDaily?.points?.length ? (
            <div className="flex items-end gap-1 h-36 px-1">
              {purchasesDaily.points.map((p) => (
                <div
                  key={p.date}
                  className="flex-1 min-w-0 flex flex-col items-center gap-1"
                  title={`${p.date}: ${p.purchaseCount} purchase(s)`}
                >
                  <div
                    className="w-full max-w-[2.5rem] mx-auto rounded-t bg-[var(--chart-track)] relative overflow-hidden"
                    style={{ height: "7rem" }}
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t transition-all"
                      style={{
                        height: `${Math.max(8, (p.purchaseCount / maxPurchases) * 100)}%`,
                        backgroundColor: lmfitTokens.primary,
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] leading-tight text-center truncate w-full"
                    style={{ color: lmfitTokens.textMuted }}
                  >
                    {shortDate(p.date)}
                  </span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: lmfitTokens.text }}>
                    {p.purchaseCount}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              {language === "en" ? "No daily purchase data. When API exposes " : "Sem dados de compras diárias. Quando a API expuser "}
              <code className="text-xs bg-[var(--chart-track)] px-1 rounded">GET /reports/purchases-daily</code>, {language === "en" ? "the chart will appear here automatically." : "o gráfico aparece aqui automaticamente."}
            </p>
          )}
        </section>

        <section className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="text-lg font-medium" style={{ color: lmfitTokens.text }}>
            {language === "en" ? "Revenue per Product" : "Receita por produto"}
          </h2>
          {revenueByProduct?.items?.length ? (
            <div className="space-y-3">
              {revenueByProduct.items.map((p) => (
                <div key={p.productId} className="space-y-1">
                  <div className="flex justify-between text-sm gap-2">
                    <span className="truncate" style={{ color: lmfitTokens.text }}>
                      {p.name}
                      {p.sku ? (
                        <span className="text-xs ml-1" style={{ color: lmfitTokens.textMuted }}>
                          ({p.sku})
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums" style={{ color: lmfitTokens.textMuted }}>
                      {formatBRL(p.revenue)}
                      {typeof p.units === "number" ? ` · ${p.units} units` : ""}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--chart-track)] overflow-hidden" aria-hidden>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${maxProductRev ? Math.round((p.revenue / maxProductRev) * 100) : 0}%`,
                        backgroundColor: lmfitTokens.primary,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
              {language === "en" ? "No ranking by product. With " : "Sem ranking por produto. Com "}
              <code className="text-xs bg-[var(--chart-track)] px-1 rounded">GET /reports/revenue-by-product</code> {language === "en" ? "the panel displays proportional bars to revenue in the period." : "o painel exibe barras proporcionais à receita no período."}
            </p>
          )}
        </section>
      </div>

      <section className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
        <div className="flex flex-wrap justify-between gap-2 items-baseline">
          <h2 className="text-lg font-medium" style={{ color: lmfitTokens.text }}>
            {language === "en" ? "ABC Curve (80/15/5)" : "Curva ABC (80/15/5)"}
          </h2>
          <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            {abc 
              ? (language === "en" ? `${abcCurveA.length} product(s) in curve A of ${abc.items.length}` : `${abcCurveA.length} produto(s) na curva A de ${abc.items.length}`)
              : (language === "en" ? "Calculating from product revenue…" : "Calculando a partir da receita por produto…")}
          </span>
        </div>
        {abc?.items.length ? (
          <ol className="space-y-1">
            {abc.items.slice(0, 10).map((it, i) => (
              <li
                key={it.productId}
                className="flex items-center justify-between gap-3 border-b pb-1 last:border-0"
                style={{ borderColor: lmfitTokens.border }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-right text-xs font-semibold" style={{ color: lmfitTokens.textMuted }}>
                    {i + 1}
                  </span>
                  <span
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold"
                    style={{
                      backgroundColor:
                        it.curve === "A" ? "#0b3d91" : it.curve === "B" ? "#f4c430" : lmfitTokens.border,
                      color: it.curve === "B" ? "#1b1b1b" : "#ffffff",
                    }}
                    aria-label={`Curva ${it.curve}`}
                  >
                    {it.curve}
                  </span>
                  <span className="truncate" style={{ color: lmfitTokens.text }}>
                    {it.name}
                    {it.sku ? (
                      <span className="text-xs ml-1" style={{ color: lmfitTokens.textMuted }}>
                        ({it.sku})
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="text-xs tabular-nums shrink-0" style={{ color: lmfitTokens.textMuted }}>
                  {formatBRL(it.revenue)} · {it.cumulativePercent.toFixed(1)}%
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            {language === "en" 
              ? "Not enough data to build the ABC curve. Once there is product revenue in the period, the highlights appear here." 
              : "Sem dados suficientes para montar a curva ABC. Assim que houver receita por produto no período, os destaques aparecem aqui."}
          </p>
        )}
      </section>

      <section className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
        <div className="flex flex-wrap justify-between gap-2 items-baseline">
          <h2 className="text-lg font-medium" style={{ color: lmfitTokens.text }}>
            {language === "en" ? "Top Variants (SKU) — same data as reports" : "Top variantes (SKU) — mesmo dado dos relatórios"}
          </h2>
          <Link href="/reports" className="text-sm underline" style={{ color: lmfitTokens.primary }}>
            {language === "en" ? "Open reports" : "Abrir relatórios"}
          </Link>
        </div>
        {topFromSummary.length ? (
          <div className="space-y-3">
            {topFromSummary.map((v, i) => (
              <div key={v.sku ?? `variant-${i}`} className="space-y-1">
                <div className="flex justify-between text-sm gap-2">
                  <span style={{ color: lmfitTokens.text }}>{v.sku ?? v.variantId}</span>
                  <span style={{ color: lmfitTokens.textMuted }}>
                    {formatBRL(v.revenue)} · {v.units} units
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[var(--chart-track)] overflow-hidden" aria-hidden>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxVarRev ? Math.round((v.revenue / maxVarRev) * 100) : 0}%`,
                      backgroundColor: lmfitTokens.primary,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
            {language === "en" ? "No variant in the period or summary not yet loaded." : "Nenhuma variante no período ou resumo ainda não carregou."}
          </p>
        )}
      </section>

      <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
        {language === "en" ? "Public Catalog" : "Catálogo público"}:{" "}
        <Link href="/catalogo" className="underline">
          /catalogo
        </Link>{" "}
        · POS:{" "}
        <Link href="/pdv" className="underline">
          /pdv
        </Link>
      </p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  footer,
}: {
  title: string;
  value: string;
  subtitle: string;
  footer?: ReactNode;
}) {
  return (
    <div
      className="rounded-lg border p-4 space-y-1 bg-[var(--card-bg)]"
      style={{ borderColor: lmfitTokens.border }}
    >
      <div className="text-sm" style={{ color: lmfitTokens.textMuted }}>
        {title}
      </div>
      <div className="text-xl font-semibold tabular-nums" style={{ color: lmfitTokens.text }}>
        {value}
      </div>
      <div className="text-xs" style={{ color: lmfitTokens.textMuted }}>
        {subtitle}
      </div>
      {footer}
    </div>
  );
}
