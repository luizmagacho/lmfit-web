"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { isAxiosError } from "axios";
import { http } from "@/lib/http";
import { getOrder } from "@/lib/orders/ordersApi";
import { fetchCustomerById } from "@/lib/crm/customer360";
import { collectVariantOptionsFromProducts, extractListItems, type VariantOptionRow } from "@/lib/normalizeApiList";
import { formatBRL } from "@/lib/formatMoney";
import { orderChannelLabel } from "@/lib/orders/orderChannel";
import { lmfitLogoSrc, lmfitTokens } from "@/theme/tokens";
import type { OrderWithWarnings } from "@/lib/orders/types";
import { useTenant } from "@/context/TenantContext";
import { parseBRLToNumber } from "@/lib/orders/normalizeLines";

type VariantOpt = { id: string; label: string; sku: string; price: number; imageUrl?: string };

export function PrintOrderClient({ orderId }: { orderId: string }) {
  const { tenant } = useTenant();
  const logoUrl = tenant?.branding?.logoUrl || "/kivoni-symbol.svg";
  const storeName = tenant?.name || "Kivoni";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderWithWarnings | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [customer, setCustomer] = useState<Record<string, any> | null>(null);
  const [variantOpts, setVariantOpts] = useState<VariantOpt[]>([]);

  // Customization Checklist States
  const [showSalesInfo, setShowSalesInfo] = useState(true);
  const [showChecklist, setShowChecklist] = useState(true);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showSku, setShowSku] = useState(true);
  const [showUnitPrice, setShowUnitPrice] = useState(true);
  const [showTotalPrice, setShowTotalPrice] = useState(true);

  const [showShopNotes, setShowShopNotes] = useState(false);
  const [showCustomerNotes, setShowCustomerNotes] = useState(false);
  const [showRecipientDoc, setShowRecipientDoc] = useState(false);
  const [showSender, setShowSender] = useState(true);

  const [columnsPerPage, setColumnsPerPage] = useState("40");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Order
      const orderData = await getOrder(orderId);
      setOrder(orderData);

      // 2. Fetch Customer if order has customerId
      if (orderData?.customerId) {
        const customerData = await fetchCustomerById(String(orderData.customerId));
        setCustomer(customerData);
      }

      // 3. Fetch Catalog for full product/variant properties
      const { data: prodData } = await http.get<unknown>("/products", { params: { page: 1, limit: 100 } });
      const items = extractListItems(prodData);
      const rows = collectVariantOptionsFromProducts(items);
      setVariantOpts(
        rows.map((r: VariantOptionRow) => ({
          id: r.id,
          sku: r.sku,
          price: r.price,
          label: r.label,
          imageUrl: r.imageUrl || undefined,
        }))
      );
    } catch (e) {
      setError(isAxiosError(e) ? e.message : "Não foi possível carregar as informações do pedido.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Lookup details for order lines
  const enrichedLines = useMemo(() => {
    if (!order?.lines) return [];
    const linesArray = Array.isArray(order.lines) ? order.lines : [];

    return linesArray.map((rawLine) => {
      const line = rawLine as Record<string, unknown>;
      const variantId = typeof line.variantId === "string" ? line.variantId : "";
      const quantity = Number(line.quantity || 0);
      const unitPrice = parseBRLToNumber(line.unitPrice);
      
      const catalogInfo = variantOpts.find((v) => v.id === variantId);
      
      return {
        variantId,
        quantity,
        unitPrice,
        description: (line.description as string | undefined) || catalogInfo?.label || "Produto Desconhecido",
        sku: (line.sku as string | undefined) || catalogInfo?.sku || "—",
        imageUrl: catalogInfo?.imageUrl || null,
        total: quantity * unitPrice,
      };
    });
  }, [order, variantOpts]);

  // Summary Math
  const totalQuantity = useMemo(() => enrichedLines.reduce((acc, l) => acc + l.quantity, 0), [enrichedLines]);
  const subtotal = useMemo(() => enrichedLines.reduce((acc, l) => acc + l.total, 0), [enrichedLines]);
  
  // Calculate discount dynamically if total is less than subtotal
  const orderTotal = order?.total != null ? parseBRLToNumber(order.total) : subtotal;
  const discount = useMemo(() => {
    if (subtotal > orderTotal) return subtotal - orderTotal;
    return 0;
  }, [subtotal, orderTotal]);

  const handlePrint = () => {
    window.print();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getFormattedAddress = (c: any) => {
    if (!c) return null;
    const cep = c.cep || c.zipCode || c.postalCode || "";
    const logradouro = c.logradouro || c.street || c.address || "";
    const numero = c.numero || c.number || "";
    const complemento = c.complemento || c.complement || "";
    const bairro = c.bairro || c.neighborhood || "";
    const cidade = c.cidade || c.city || "";
    const uf = c.uf || c.state || "";

    if (!logradouro && !cidade) return null;

    return {
      line1: `${logradouro}${numero ? `, ${numero}` : ""}${complemento ? ` - ${complemento}` : ""}`,
      line2: `${bairro ? `${bairro}, ` : ""}${cidade}${uf ? ` - ${uf}` : ""}${cep ? `, CEP ${cep}` : ""}`,
    };
  };

  const customerAddress = getFormattedAddress(customer);
  const formattedOrderDate = useMemo(() => {
    if (!order?.createdAt) return "";
    const date = new Date(order.createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }, [order]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm" style={{ color: lmfitTokens.textMuted }}>
        Carregando informações para impressão…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {error || "Pedido não encontrado."}
        </p>
        <Link href={`/orders/${orderId}`} className="text-sm underline" style={{ color: lmfitTokens.primary }}>
          Voltar ao pedido
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Printing Style Overrides */}
      <style>{`
        @media print {
          aside, header, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .print-area {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* Header (Screen only) */}
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: lmfitTokens.text }}>
            Imprimir resumo do pedido
          </h1>
          <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
            Tenha em mãos uma versão impressa para separação, conferência de itens ou retirada com assinatura.
          </p>
        </div>
        <Link
          href={`/orders/${orderId}`}
          className="text-sm min-h-11 inline-flex items-center px-4 rounded-md border transition-colors touch-manipulation hover:bg-[var(--hover-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        >
          Voltar ao pedido
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Options Column (Screen only) */}
        <div
          className="lg:col-span-4 rounded-lg border bg-[var(--card-bg)] p-5 space-y-5 no-print"
          style={{ borderColor: lmfitTokens.border }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: lmfitTokens.text }}>
              Informações
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Pedidos selecionados:</p>
            <span
              className="inline-block mt-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: "rgba(60, 175, 101, 0.1)",
                color: lmfitTokens.success,
              }}
            >
              #{order.number ?? "—"}
            </span>
          </div>

          <hr style={{ borderColor: lmfitTokens.border }} />

          <div className="space-y-4">
            <h3 className="text-sm font-semibold" style={{ color: lmfitTokens.textMuted }}>
              Imprimir documento com:
            </h3>

            {/* Customization checkboxes */}
            <div className="space-y-3">
              {/* Vendas Group */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer" style={{ color: lmfitTokens.text }}>
                  <input
                    type="checkbox"
                    checked={showSalesInfo}
                    onChange={(e) => {
                      setShowSalesInfo(e.target.checked);
                      if (!e.target.checked) {
                        setShowChecklist(false);
                        setShowPhoto(false);
                        setShowSku(false);
                        setShowUnitPrice(false);
                        setShowTotalPrice(false);
                      } else {
                        setShowChecklist(true);
                        setShowSku(true);
                        setShowUnitPrice(true);
                        setShowTotalPrice(true);
                      }
                    }}
                    className="w-4 h-4 rounded border-neutral-300 accent-orange-500"
                  />
                  <span>Informações da venda</span>
                </label>

                {/* Sub-options (indented) */}
                <div className="pl-6 space-y-2.5 border-l-2 ml-2" style={{ borderColor: lmfitTokens.border }}>
                  <label className="flex items-center gap-2.5 text-xs text-neutral-500 cursor-pointer disabled:opacity-50">
                    <input
                      type="checkbox"
                      disabled={!showSalesInfo}
                      checked={showChecklist}
                      onChange={(e) => setShowChecklist(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-neutral-300 accent-orange-500"
                    />
                    <span>Checklist para separação</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-neutral-500 cursor-pointer disabled:opacity-50">
                    <input
                      type="checkbox"
                      disabled={!showSalesInfo}
                      checked={showPhoto}
                      onChange={(e) => setShowPhoto(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-neutral-300 accent-orange-500"
                    />
                    <span>Foto do produto</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-neutral-500 cursor-pointer disabled:opacity-50">
                    <input
                      type="checkbox"
                      disabled={!showSalesInfo}
                      checked={showSku}
                      onChange={(e) => setShowSku(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-neutral-300 accent-orange-500"
                    />
                    <span>SKU</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-neutral-500 cursor-pointer disabled:opacity-50">
                    <input
                      type="checkbox"
                      disabled={!showSalesInfo}
                      checked={showUnitPrice}
                      onChange={(e) => setShowUnitPrice(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-neutral-300 accent-orange-500"
                    />
                    <span>Preço unitário</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-neutral-500 cursor-pointer disabled:opacity-50">
                    <input
                      type="checkbox"
                      disabled={!showSalesInfo}
                      checked={showTotalPrice}
                      onChange={(e) => setShowTotalPrice(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-neutral-300 accent-orange-500"
                    />
                    <span>Preço total</span>
                  </label>
                </div>
              </div>

              {/* Shop Notes */}
              <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: lmfitTokens.text }}>
                <input
                  type="checkbox"
                  checked={showShopNotes}
                  onChange={(e) => setShowShopNotes(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 accent-orange-500"
                />
                <span>Observações da loja</span>
              </label>

              {/* Customer Notes */}
              <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: lmfitTokens.text }}>
                <input
                  type="checkbox"
                  checked={showCustomerNotes}
                  onChange={(e) => setShowCustomerNotes(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 accent-orange-500"
                />
                <span>Observações do cliente</span>
              </label>

              {/* Recipient Document */}
              <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: lmfitTokens.text }}>
                <input
                  type="checkbox"
                  checked={showRecipientDoc}
                  onChange={(e) => setShowRecipientDoc(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 accent-orange-500"
                />
                <span>Exibir CPF/CNPJ do destinatário</span>
              </label>

              {/* Sender */}
              <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: lmfitTokens.text }}>
                <input
                  type="checkbox"
                  checked={showSender}
                  onChange={(e) => setShowSender(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 accent-orange-500"
                />
                <span>Remetente</span>
              </label>
            </div>
          </div>

          <hr style={{ borderColor: lmfitTokens.border }} />

          {/* Columns/Lines config dropdown */}
          <div className="space-y-1.5">
            <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>
              Linhas por página:
            </span>
            <select
              value={columnsPerPage}
              onChange={(e) => setColumnsPerPage(e.target.value)}
              className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)] text-sm"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              <option value="20">20 linhas</option>
              <option value="30">30 linhas</option>
              <option value="40">40 linhas</option>
              <option value="50">50 linhas</option>
            </select>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={handlePrint}
            className="w-full min-h-12 flex items-center justify-center rounded-md font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            Imprimir Resumo
          </button>
        </div>

        {/* Right Preview Column */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-lg font-bold no-print" style={{ color: lmfitTokens.text }}>
            Pré-visualização
          </h2>

          {/* Sheet container (dotted border wrapper) */}
          <div
            className="print-area rounded-lg border-2 border-dashed bg-white text-black p-6 sm:p-8 space-y-6 shadow-sm mx-auto w-full max-w-[800px]"
            style={{ borderColor: "#a3a3a3" }}
            id="print-sheet"
          >
            {/* Header info */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
                  Pedido #{order.number ?? "—"} <span className="text-neutral-500 font-normal"> - Pacote #1</span>
                </h3>
                <p className="text-xs text-neutral-500">
                  Realizado em: {formattedOrderDate || "—"}
                </p>
              </div>
              <div className="relative w-20 h-20 shrink-0">
                <Image
                  src={logoUrl}
                  alt={storeName}
                  fill
                  sizes="80px"
                  className="object-contain object-right"
                  priority
                />
              </div>
            </div>

            {/* Table wrapper */}
            {showSalesInfo ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-neutral-200">
                      {showChecklist && (
                        <th className="py-2.5 w-8 pr-1 font-semibold text-neutral-500">✓</th>
                      )}
                      <th className="py-2.5 font-semibold text-neutral-500">Produto</th>
                      <th className="py-2.5 pr-2 font-semibold text-neutral-500 text-center w-14">Qtd.</th>
                      {showUnitPrice && (
                        <th className="py-2.5 pr-2 font-semibold text-neutral-500 text-right w-24">Preço unit.</th>
                      )}
                      {showTotalPrice && (
                        <th className="py-2.5 font-semibold text-neutral-500 text-right w-24">Total</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedLines.map((line, idx) => (
                      <tr key={idx} className="border-b border-neutral-100 align-top">
                        {showChecklist && (
                          <td className="py-3 pr-1 text-center align-middle">
                            <span className="inline-block w-4.5 h-4.5 border border-neutral-300 rounded" />
                          </td>
                        )}
                        <td className="py-3 flex items-start gap-2.5">
                          {showPhoto && line.imageUrl && (
                            <div className="w-10 h-10 border rounded shrink-0 bg-neutral-50 overflow-hidden relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={line.imageUrl}
                                alt="Foto"
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                          )}
                          <div className="space-y-0.5 min-w-0">
                            <span className="font-medium text-black leading-tight block break-words">
                              {line.description}
                            </span>
                            {showSku && (
                              <span className="text-[10px] text-neutral-400 block tracking-wide">
                                SKU: {line.sku}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-2 text-center font-medium text-neutral-600 align-middle tabular-nums">
                          {line.quantity} x
                        </td>
                        {showUnitPrice && (
                          <td className="py-3 pr-2 text-right text-neutral-600 align-middle tabular-nums">
                            {formatBRL(line.unitPrice)}
                          </td>
                        )}
                        {showTotalPrice && (
                          <td className="py-3 text-right font-semibold text-black align-middle tabular-nums">
                            {formatBRL(line.total)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-neutral-400 border-t border-b border-neutral-100">
                Informações da venda desativadas.
              </div>
            )}

            {/* Subtotal, Desconto e Totais */}
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-1.5 text-xs text-black">
                <div className="flex justify-between items-baseline text-neutral-600">
                  <span>Subtotal ({totalQuantity} {totalQuantity === 1 ? "unidade" : "unidades"})</span>
                  <span className="font-medium tabular-nums">{formatBRL(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-baseline text-neutral-600">
                    <span>Desconto:</span>
                    <span className="font-medium tabular-nums text-green-600">-{formatBRL(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline text-neutral-600">
                  <span>Frete:</span>
                  <span className="font-medium">
                    {order.channel === "banca" || order.channel === "in_person"
                      ? "Retirada"
                      : "A combinar - Entraremos em contato com você para combinar a entrega!"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline text-base font-bold pt-1.5 border-t border-neutral-200 text-black">
                  <span>Total:</span>
                  <span className="tabular-nums">{formatBRL(orderTotal)}</span>
                </div>
                <div className="text-[10px] text-neutral-500 pt-1 text-right">
                  Forma de pagamento: {order.channel ? orderChannelLabel(order.channel as string) : "not-provided"}
                </div>
              </div>
            </div>

            {/* Shop & Customer Notes */}
            {(showShopNotes || showCustomerNotes) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-neutral-100 text-xs">
                {showShopNotes && (
                  <div className="space-y-1">
                    <span className="font-semibold text-neutral-500 uppercase tracking-wide text-[10px]">
                      Observações da loja:
                    </span>
                    <p className="text-neutral-600 italic">
                      {order.reference ? `Ref: ${order.reference}` : "Sem observações da loja."}
                    </p>
                  </div>
                )}
                {showCustomerNotes && (
                  <div className="space-y-1">
                    <span className="font-semibold text-neutral-500 uppercase tracking-wide text-[10px]">
                      Observações do cliente:
                    </span>
                    <p className="text-neutral-600 italic">
                      {order.notes || "Sem observações do cliente."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Recipient & Sender Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-neutral-200 text-xs">
              {/* Recipient details */}
              <div className="space-y-1.5">
                <span className="font-semibold text-neutral-500 uppercase tracking-wide text-[10px] block">
                  Destinatário:
                </span>
                <div className="text-black space-y-0.5">
                  <p className="font-bold text-sm">
                    {customer?.name || "Cliente Final"}
                  </p>
                  {showRecipientDoc && customer?.legalName && (
                    <p className="text-neutral-500">Razão Social: {customer.legalName}</p>
                  )}
                  {showRecipientDoc && (customer?.docNumber || customer?.cpfCnpj || customer?.documentNumber) && (
                    <p className="text-neutral-500">
                      Doc: {customer.docNumber || customer.cpfCnpj || customer.documentNumber}
                    </p>
                  )}
                  {customerAddress ? (
                    <>
                      <p className="text-neutral-700 leading-normal">{customerAddress.line1}</p>
                      <p className="text-neutral-700 leading-normal">{customerAddress.line2}</p>
                    </>
                  ) : (
                    <p className="text-neutral-400 italic">Endereço não cadastrado</p>
                  )}
                  {customer?.phone && <p className="text-neutral-500 pt-1">Tel: {customer.phone}</p>}
                </div>
              </div>

              {/* Sender details */}
              {showSender && (
                <div className="space-y-1.5 border-l-0 sm:border-l sm:pl-6 border-neutral-100">
                  <span className="font-semibold text-neutral-500 uppercase tracking-wide text-[10px] block">
                    Remetente:
                  </span>
                  <div className="text-black space-y-0.5">
                    <p className="font-bold text-sm">{storeName}</p>
                    <p className="text-neutral-700 leading-normal">Rua Bernadelle 193 Vila Talarico</p>
                    <p className="text-neutral-700 leading-normal">CASA 16</p>
                    <p className="text-neutral-700 leading-normal">São Paulo, São Paulo, 03533030</p>
                    <p className="text-neutral-700 leading-normal">Brasil</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
