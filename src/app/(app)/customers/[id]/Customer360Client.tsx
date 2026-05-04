"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { appendCustomerNote, readCustomerNotes, type CustomerNoteLocal } from "@/lib/crm/customerNotesLocal";
import {
  buildTimeline,
  fetchCustomerById,
  fetchEscalationsForWa,
  fetchInvoicesForCustomer,
  fetchOrdersForCustomer,
} from "@/lib/crm/customer360";
import type { CustomerRecord } from "@/lib/crm/customer360";
import { formatBRL } from "@/lib/formatMoney";
import type { OrderWithWarnings } from "@/lib/orders/types";
import { lmfitTokens } from "@/theme/tokens";

function display(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function Customer360Client({ customerId }: { customerId: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [orders, setOrders] = useState<OrderWithWarnings[]>([]);
  const [invoices, setInvoices] = useState<CustomerRecord[]>([]);
  const [escalations, setEscalations] = useState<CustomerRecord[]>([]);
  const [notes, setNotes] = useState<CustomerNoteLocal[]>([]);
  const [noteDraft, setNoteDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [c, o, inv] = await Promise.all([
        fetchCustomerById(customerId),
        fetchOrdersForCustomer(customerId),
        fetchInvoicesForCustomer(customerId),
      ]);
      const wa = c?.whatsappWaId != null ? String(c.whatsappWaId) : "";
      const esc = wa.trim() ? await fetchEscalationsForWa(wa) : [];
      setCustomer(c);
      setOrders(o);
      setInvoices(inv);
      setEscalations(esc);
      setNotes(readCustomerNotes(customerId));
    } catch {
      setErr("Não foi possível carregar a ficha do cliente.");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const timeline = useMemo(
    () => buildTimeline({ orders, invoices, escalations }),
    [orders, invoices, escalations],
  );

  const waDigits = customer?.whatsappWaId != null ? String(customer.whatsappWaId) : "";
  const escalationHref =
    waDigits.trim() !== "" ? `/escalations?fromWaId=${encodeURIComponent(waDigits.trim())}` : "/escalations";

  function onAddNote() {
    appendCustomerNote(customerId, noteDraft);
    setNoteDraft("");
    setNotes(readCustomerNotes(customerId));
  }

  if (loading) {
    return <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>Carregando ficha…</p>;
  }

  if (err || !customer) {
    return (
      <div className="space-y-2">
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {err ?? "Cliente não encontrado."}
        </p>
        <Link href="/customers" className="text-sm underline" style={{ color: lmfitTokens.primary }}>
          Voltar à lista
        </Link>
      </div>
    );
  }

  const name = customer.name != null ? String(customer.name) : "Cliente";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
            {name}
          </h1>
          <p className="text-sm mt-1" style={{ color: lmfitTokens.textMuted }}>
            ID: {customerId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/customers"
            className="text-sm min-h-11 inline-flex items-center px-3 rounded-md border touch-manipulation"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            Lista
          </Link>
          <Link
            href={`/orders/new?customerId=${encodeURIComponent(customerId)}`}
            className="text-sm min-h-11 inline-flex items-center px-3 rounded-md font-medium text-white touch-manipulation"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            Novo pedido
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-2 text-sm" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="font-medium" style={{ color: lmfitTokens.text }}>
            Contato
          </h2>
          <p style={{ color: lmfitTokens.textMuted }}>
            E-mail: <span style={{ color: lmfitTokens.text }}>{display(customer.email)}</span>
          </p>
          <p style={{ color: lmfitTokens.textMuted }}>
            Telefone: <span style={{ color: lmfitTokens.text }}>{display(customer.phone)}</span>
          </p>
          <p style={{ color: lmfitTokens.textMuted }}>
            WhatsApp: <span style={{ color: lmfitTokens.text }}>{display(customer.whatsappWaId)}</span>
          </p>
          {waDigits ? (
            <a
              href={`https://wa.me/${String(customer.whatsappWaId).replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm min-h-11 items-center px-3 rounded-md border touch-manipulation"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              Abrir WhatsApp
            </a>
          ) : null}
        </div>
        <div className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-2 text-sm" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="font-medium" style={{ color: lmfitTokens.text }}>
            Resumo
          </h2>
          <p style={{ color: lmfitTokens.textMuted }}>
            Pedidos: <span style={{ color: lmfitTokens.text }}>{orders.length}</span>
          </p>
          <p style={{ color: lmfitTokens.textMuted }}>
            Notas fiscais (amostra): <span style={{ color: lmfitTokens.text }}>{invoices.length}</span>
          </p>
          <p style={{ color: lmfitTokens.textMuted }}>
            Escalações (wa): <span style={{ color: lmfitTokens.text }}>{escalations.length}</span>
          </p>
          <Link href={escalationHref} className="text-sm underline" style={{ color: lmfitTokens.primary }}>
            Ver escalações filtradas
          </Link>
        </div>
      </div>

      <section className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
        <h2 className="font-medium" style={{ color: lmfitTokens.text }}>
          Notas internas
        </h2>
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Armazenadas neste navegador até existir <code>POST /customers/:id/notes</code> na API.
        </p>
        <div className="flex flex-wrap gap-2">
          <textarea
            className="min-h-[4rem] flex-1 min-w-[12rem] border rounded-md px-3 py-2 text-sm"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="Registrar contato, promessa, follow-up…"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <button
            type="button"
            className="min-h-11 px-4 rounded-md text-sm font-medium text-white touch-manipulation shrink-0"
            style={{ backgroundColor: lmfitTokens.primary }}
            onClick={() => onAddNote()}
          >
            Salvar nota
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {notes.length === 0 ? (
            <li style={{ color: lmfitTokens.textMuted }}>Nenhuma nota.</li>
          ) : (
            notes.map((n) => (
              <li key={n.id} className="border rounded-md px-3 py-2" style={{ borderColor: lmfitTokens.border }}>
                <span className="text-xs block mb-1" style={{ color: lmfitTokens.textMuted }}>
                  {new Date(n.at).toLocaleString("pt-BR")}
                </span>
                <span style={{ color: lmfitTokens.text }}>{n.text}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
        <h2 className="font-medium" style={{ color: lmfitTokens.text }}>
          Linha do tempo
        </h2>
        <ul className="space-y-2 text-sm">
          {timeline.length === 0 ? (
            <li style={{ color: lmfitTokens.textMuted }}>Sem eventos recentes.</li>
          ) : (
            timeline.slice(0, 40).map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap justify-between gap-2 border-b pb-2 last:border-0"
                style={{ borderColor: lmfitTokens.border }}
              >
                <div>
                  {t.href ? (
                    <Link href={t.href} className="font-medium underline" style={{ color: lmfitTokens.text }}>
                      {t.title}
                    </Link>
                  ) : (
                    <span className="font-medium" style={{ color: lmfitTokens.text }}>
                      {t.title}
                    </span>
                  )}
                  {t.subtitle ? (
                    <span className="block text-xs" style={{ color: lmfitTokens.textMuted }}>
                      {t.subtitle}
                    </span>
                  ) : null}
                </div>
                <time className="text-xs shrink-0 tabular-nums" style={{ color: lmfitTokens.textMuted }}>
                  {new Date(t.at).toLocaleString("pt-BR")}
                </time>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-2" style={{ borderColor: lmfitTokens.border }}>
        <h2 className="font-medium" style={{ color: lmfitTokens.text }}>
          Pedidos
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
                <th className="py-2 pr-2" style={{ color: lmfitTokens.accentBlue }}>
                  Ref.
                </th>
                <th className="py-2 pr-2" style={{ color: lmfitTokens.accentBlue }}>
                  Status
                </th>
                <th className="py-2 pr-2" style={{ color: lmfitTokens.accentBlue }}>
                  Total
                </th>
                <th className="py-2" style={{ color: lmfitTokens.accentBlue }} />
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: lmfitTokens.textMuted }}>
                    Nenhum pedido.
                  </td>
                </tr>
              ) : (
                orders.map((o, idx) => {
                  const id = String(o._id ?? "");
                  const total = typeof o.total === "number" ? o.total : NaN;
                  return (
                    <tr key={id || `order-${idx}`} className="border-b" style={{ borderColor: lmfitTokens.border }}>
                      <td className="py-2 pr-2">{display(o.reference)}</td>
                      <td className="py-2 pr-2">{display(o.status)}</td>
                      <td className="py-2 pr-2 tabular-nums">
                        {Number.isFinite(total) ? formatBRL(total) : "—"}
                      </td>
                      <td className="py-2">
                        {id ? (
                          <Link href={`/orders/${encodeURIComponent(id)}`} className="text-xs underline">
                            Abrir
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
