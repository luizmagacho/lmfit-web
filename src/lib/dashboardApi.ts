import { http } from "@/lib/http";
import { parseBRLToNumber } from "@/lib/formatMoney";

export type ReportSummary = {
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

/** Compras registradas por dia (ex.: Bling / Shopify style). */
export type SalesAndPurchasesDailyResponse = {
  range: { from: string; to: string };
  points: Array<{
    date: string;
    purchaseCount: number;
    totalPurchases: number;
    orderCount: number;
    totalSales: number;
  }>;
};

/** Receita agregada por produto no período. */
export type RevenueByProductResponse = {
  range: { from: string; to: string };
  items: Array<{
    productId: string;
    name: string;
    sku?: string;
    revenue: number;
    units?: number;
  }>;
};

/** Curva ABC por produto. */
export type AbcResponse = {
  range: { from: string; to: string };
  items: Array<{
    productId: string;
    name: string;
    sku?: string;
    revenue: number;
    units?: number;
    cumulativePercent: number;
    curve: "A" | "B" | "C";
  }>;
};

/** Vendas atribuídas por influenciador (Programa de Influenciadores) no período. */
export type SalesByInfluencerResponse = {
  range: { from: string; to: string };
  items: Array<{
    influencerId: string;
    name: string;
    revenue: number;
    units: number;
    orderCount: number;
  }>;
};

/** Vendas do dia / ticket médio. */
export type SalesTodayResponse = {
  date: string;
  total: number;
  orderCount: number;
  avgTicket: number;
};

export function rangeIso(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86400000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function fetchReportSummary(from: string, to: string): Promise<ReportSummary | null> {
  try {
    const { data } = await http.get<ReportSummary>("/reports/summary", { params: { from, to } });
    if (!data) return null;
    // `revenue.total` e `stockValue.totalRetail` batem no BrlMoneyResponseInterceptor global
    // (`{ total, orderCount, source }` casa a heurística de "objeto de receita") e chegam como
    // string pt-BR ("1.234,56") — dividir isso direto por `orderCount` vira NaN, não um erro.
    return {
      ...data,
      revenue: { ...data.revenue, total: parseBRLToNumber(data.revenue?.total) },
      topVariants: (data.topVariants ?? []).map((v) => ({ ...v, revenue: parseBRLToNumber(v.revenue) })),
      stockValue: { ...data.stockValue, totalRetail: parseBRLToNumber(data.stockValue?.totalRetail) },
    };
  } catch {
    return null;
  }
}

export async function fetchSalesAndPurchasesDaily(
  from: string,
  to: string,
): Promise<SalesAndPurchasesDailyResponse | null> {
  try {
    const { data } = await http.get<SalesAndPurchasesDailyResponse>("/reports/sales-and-purchases-daily", {
      params: { from, to },
    });
    return data;
  } catch {
    return null;
  }
}

export async function fetchRevenueByProduct(
  from: string,
  to: string,
  limit = 10,
): Promise<RevenueByProductResponse | null> {
  try {
    const { data } = await http.get<RevenueByProductResponse>("/reports/revenue-by-product", {
      params: { from, to, limit },
    });
    if (!data) return null;
    return { ...data, items: (data.items ?? []).map((it) => ({ ...it, revenue: parseBRLToNumber(it.revenue) })) };
  } catch {
    return null;
  }
}

export async function fetchSalesByInfluencer(
  from: string,
  to: string,
  limit = 10,
): Promise<SalesByInfluencerResponse | null> {
  try {
    const { data } = await http.get<SalesByInfluencerResponse>("/reports/sales-by-influencer", {
      params: { from, to, limit },
    });
    if (!data) return null;
    return { ...data, items: (data.items ?? []).map((it) => ({ ...it, revenue: parseBRLToNumber(it.revenue) })) };
  } catch {
    return null;
  }
}

export async function fetchSalesToday(): Promise<SalesTodayResponse | null> {
  try {
    const { data } = await http.get<SalesTodayResponse>("/reports/sales-today");
    if (!data) return null;
    // `Number("1.234,56")` é NaN (vírgula não é separador decimal em JS) — `parseBRLToNumber`
    // já existe pra isso, o `Number(x) || 0` antigo aqui só mascarava zerando qualquer valor
    // com milhar/centavos em vez de ler o valor real.
    return {
      date: data.date,
      total: parseBRLToNumber(data.total),
      orderCount: Number(data.orderCount) || 0,
      avgTicket: parseBRLToNumber(data.avgTicket),
    };
  } catch {
    return null;
  }
}

export async function fetchAbcCurve(
  from: string,
  to: string,
): Promise<AbcResponse | null> {
  try {
    const { data } = await http.get<AbcResponse>("/reports/abc", { params: { from, to } });
    if (!data) return null;
    return { ...data, items: (data.items ?? []).map((it) => ({ ...it, revenue: parseBRLToNumber(it.revenue) })) };
  } catch {
    return null;
  }
}

/** Derivar Curva ABC a partir de `revenue-by-product` quando `/reports/abc` não existe. */
export function deriveAbcFromRevenue(
  resp: RevenueByProductResponse | null,
): AbcResponse | null {
  if (!resp) return null;
  const sorted = [...resp.items].sort((a, b) => b.revenue - a.revenue);
  const total = sorted.reduce((a, b) => a + (b.revenue || 0), 0);
  if (total <= 0) return { range: resp.range, items: [] };
  let acc = 0;
  const items = sorted.map((it) => {
    acc += it.revenue;
    const cumulativePercent = Math.min(100, Math.round((acc / total) * 10000) / 100);
    const curve: "A" | "B" | "C" = cumulativePercent <= 80 ? "A" : cumulativePercent <= 95 ? "B" : "C";
    return { ...it, cumulativePercent, curve };
  });
  return { range: resp.range, items };
}
