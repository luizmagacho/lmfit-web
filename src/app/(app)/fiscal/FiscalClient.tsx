"use client";

import { useEffect, useState } from "react";
import { FileText, Send, Loader2, CheckCircle2, XCircle, Clock, ListOrdered } from "lucide-react";
import { lmfitTokens } from "@/theme/tokens";
import { useAuthStore } from "@/stores/useAuthStore";
import { http } from "@/lib/http";

type FiscalConfig = {
  cnpj?: string;
  inscricaoEstadual?: string;
  regimeTributario?: "simples_nacional" | "lucro_presumido" | "lucro_real" | "";
  ambiente?: "homologacao" | "producao";
  nuvemFiscalClientId?: string;
  nuvemFiscalClientSecret?: string;
};

type FiscalDocumentRow = {
  _id: string;
  orderId: string;
  orderNumber: number | null;
  type: "nfce" | "nfe";
  status: "pending" | "processing" | "authorized" | "rejected" | "cancelled" | "error";
  chaveAcesso?: string;
  xmlUrl?: string;
  danfeUrl?: string;
  qrCodeUrl?: string;
  amount: number;
  errorMessage?: string;
  emittedAt?: string;
  createdAt: string;
};

type OrderOption = { _id: string; number: number; total: number | string; status: string };

// API formats monetary fields as pt-BR strings (e.g. "299,90"); parse defensively.
function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

const STATUS_LABEL: Record<FiscalDocumentRow["status"], string> = {
  pending: "Pendente",
  processing: "Processando",
  authorized: "Autorizada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
  error: "Erro",
};

function StatusBadge({ status }: { status: FiscalDocumentRow["status"] }) {
  const color =
    status === "authorized"
      ? lmfitTokens.success
      : status === "error" || status === "rejected"
        ? lmfitTokens.error
        : lmfitTokens.textMuted;
  const Icon = status === "authorized" ? CheckCircle2 : status === "error" || status === "rejected" ? XCircle : Clock;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color }}>
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABEL[status]}
    </span>
  );
}

function ConfigSection() {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<FiscalConfig>({ ambiente: "homologacao" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    http
      .get(`/tenants/${user.tenantId}`)
      .then(({ data }) => {
        setForm({
          cnpj: data?.fiscal?.cnpj ?? "",
          inscricaoEstadual: data?.fiscal?.inscricaoEstadual ?? "",
          regimeTributario: data?.fiscal?.regimeTributario ?? "",
          ambiente: data?.fiscal?.ambiente ?? "homologacao",
          nuvemFiscalClientId: data?.fiscal?.nuvemFiscalClientId ?? "",
          nuvemFiscalClientSecret: data?.fiscal?.nuvemFiscalClientSecret ?? "",
        });
      })
      .catch(() => setMessage({ type: "error", text: "Não foi possível carregar a configuração fiscal." }))
      .finally(() => setLoading(false));
  }, [user?.tenantId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.tenantId) return;
    setSaving(true);
    setMessage(null);
    try {
      await http.patch(`/tenants/${user.tenantId}/fiscal`, {
        cnpj: form.cnpj?.trim() || undefined,
        inscricaoEstadual: form.inscricaoEstadual?.trim() || undefined,
        regimeTributario: form.regimeTributario || undefined,
        ambiente: form.ambiente || undefined,
        nuvemFiscalClientId: form.nuvemFiscalClientId?.trim() || undefined,
        nuvemFiscalClientSecret: form.nuvemFiscalClientSecret?.trim() || undefined,
      });
      setMessage({ type: "success", text: "Configuração fiscal salva com sucesso." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Erro ao salvar configuração fiscal." });
    } finally {
      setSaving(false);
    }
  }

  if (user?.role !== "admin") {
    return (
      <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
        Apenas administradores podem configurar o módulo fiscal.
      </p>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {loading ? (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Carregando…
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            CNPJ
            <input
              type="text"
              value={form.cnpj ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
              placeholder="00.000.000/0000-00"
              className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
          </label>
          <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            Inscrição Estadual
            <input
              type="text"
              value={form.inscricaoEstadual ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, inscricaoEstadual: e.target.value }))}
              className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
          </label>
          <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            Regime tributário
            <select
              value={form.regimeTributario ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, regimeTributario: e.target.value as FiscalConfig["regimeTributario"] }))}
              className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              <option value="">Selecione…</option>
              <option value="simples_nacional">Simples Nacional</option>
              <option value="lucro_presumido">Lucro Presumido</option>
              <option value="lucro_real">Lucro Real</option>
            </select>
          </label>
          <label className="text-xs" style={{ color: lmfitTokens.textMuted }}>
            Ambiente
            <select
              value={form.ambiente ?? "homologacao"}
              onChange={(e) => setForm((f) => ({ ...f, ambiente: e.target.value as FiscalConfig["ambiente"] }))}
              className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              <option value="homologacao">Homologação (testes)</option>
              <option value="producao">Produção</option>
            </select>
          </label>
          <label className="text-xs sm:col-span-2" style={{ color: lmfitTokens.textMuted }}>
            Nuvem Fiscal — Client ID
            <input
              type="text"
              value={form.nuvemFiscalClientId ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, nuvemFiscalClientId: e.target.value }))}
              className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
          </label>
          <label className="text-xs sm:col-span-2" style={{ color: lmfitTokens.textMuted }}>
            Nuvem Fiscal — Client Secret
            <input
              type="password"
              value={form.nuvemFiscalClientSecret ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, nuvemFiscalClientSecret: e.target.value }))}
              className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
          </label>
        </div>
      )}

      {message ? (
        <p className="text-sm" style={{ color: message.type === "error" ? lmfitTokens.error : lmfitTokens.success }}>
          {message.text}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving || loading}
        className="min-h-10 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: lmfitTokens.primary }}
      >
        {saving ? "Salvando…" : "Salvar configuração"}
      </button>
    </form>
  );
}

function GuideSection() {
  const steps = [
    {
      title: "1. Crie sua conta na Nuvem Fiscal",
      body: "Acesse nuvemfiscal.com.br e crie uma conta para sua empresa. É o serviço que efetivamente conversa com a SEFAZ para emitir notas em seu nome.",
    },
    {
      title: "2. Cadastre a empresa emitente",
      body: "No painel da Nuvem Fiscal, cadastre o CNPJ da loja, a Inscrição Estadual e envie o certificado digital A1 da empresa (necessário para assinar as notas).",
    },
    {
      title: "3. Gere as credenciais de API",
      body: "Em Configurações > Aplicações (ou API), crie um Client ID e Client Secret. Copie os dois valores.",
    },
    {
      title: "4. Preencha o formulário acima",
      body: "Cole o CNPJ, Inscrição Estadual, regime tributário, Client ID e Client Secret. Deixe o ambiente em Homologação para testar sem gerar notas reais.",
    },
    {
      title: "5. Emita uma nota de teste",
      body: "Use o painel \"Emitir nota fiscal\" abaixo: busque o pedido pelo número, selecione-o e clique em Emitir. Em homologação a nota não tem validade fiscal, mas valida toda a integração.",
    },
    {
      title: "6. Confira o histórico",
      body: "A tabela abaixo lista todas as notas emitidas, com status, chave de acesso e links para o DANFE (PDF) e XML.",
    },
    {
      title: "7. Vá para produção",
      body: "Quando tudo estiver validado, troque o ambiente para Produção no formulário acima e salve. As próximas emissões já geram notas fiscais válidas perante a SEFAZ.",
    },
  ];
  return (
    <ol className="space-y-3">
      {steps.map((s) => (
        <li key={s.title} className="text-sm">
          <p className="font-medium" style={{ color: lmfitTokens.text }}>
            {s.title}
          </p>
          <p style={{ color: lmfitTokens.textMuted }}>{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

function EmitPanel({ onEmitted }: { onEmitted: () => void }) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<OrderOption[]>([]);
  const [selected, setSelected] = useState<OrderOption | null>(null);
  const [searching, setSearching] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setOptions([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      http
        .get<{ items: OrderOption[] }>("/orders", { params: { search: term, limit: 8 } })
        .then((res) => setOptions(res.data.items ?? []))
        .catch(() => setOptions([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function handleEmit() {
    if (!selected) return;
    setEmitting(true);
    setMessage(null);
    try {
      await http.post(`/orders/${selected._id}/fiscal/emit`);
      setMessage({ type: "success", text: `Nota emitida para o pedido #${selected.number}.` });
      setSelected(null);
      setSearch("");
      setOptions([]);
      onEmitted();
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Erro ao emitir nota fiscal." });
    } finally {
      setEmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-xs block" style={{ color: lmfitTokens.textMuted }}>
        Buscar pedido por número
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelected(null);
          }}
          placeholder="Ex: 1024"
          className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-transparent"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
        />
      </label>

      {searching ? (
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          Buscando…
        </p>
      ) : options.length && !selected ? (
        <ul className="rounded border divide-y" style={{ borderColor: lmfitTokens.border }}>
          {options.map((o) => (
            <li key={o._id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: lmfitTokens.text }}
                onClick={() => {
                  setSelected(o);
                  setOptions([]);
                }}
              >
                Pedido #{o.number} — {o.status} — R$ {extractPrice(o.total).toFixed(2)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selected ? (
        <div
          className="flex items-center justify-between gap-3 rounded border px-3 py-2"
          style={{ borderColor: lmfitTokens.border }}
        >
          <span className="text-sm" style={{ color: lmfitTokens.text }}>
            Pedido selecionado: #{selected.number}
          </span>
          <button
            type="button"
            disabled={emitting}
            onClick={() => void handleEmit()}
            className="min-h-9 px-3 rounded-md text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: lmfitTokens.primary }}
          >
            {emitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Emitir nota
          </button>
        </div>
      ) : null}

      {message ? (
        <p className="text-sm" style={{ color: message.type === "error" ? lmfitTokens.error : lmfitTokens.success }}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function HistorySection() {
  const [rows, setRows] = useState<FiscalDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setLoading(true);
    http
      .get<{ items: FiscalDocumentRow[] }>("/fiscal", { params: { page: 1, limit: 50 } })
      .then((res) => setRows(res.data.items ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [reload]);

  return (
    <div className="space-y-3">
      <EmitPanel onEmitted={() => setReload((n) => n + 1)} />
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: lmfitTokens.border }}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: lmfitTokens.border }}>
              <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>Pedido</th>
              <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>Tipo</th>
              <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>Status</th>
              <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>Chave de acesso</th>
              <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>Documentos</th>
              <th className="px-3 py-2 font-medium" style={{ color: lmfitTokens.accentBlue }}>Emitida em</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center" style={{ color: lmfitTokens.textMuted }}>
                  Nenhuma nota fiscal emitida ainda.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r._id} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                <td className="px-3 py-2" style={{ color: lmfitTokens.text }}>
                  {r.orderNumber != null ? `#${r.orderNumber}` : "—"}
                </td>
                <td className="px-3 py-2 uppercase" style={{ color: lmfitTokens.text }}>
                  {r.type}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2 font-mono text-xs" style={{ color: lmfitTokens.textMuted }}>
                  {r.chaveAcesso ?? "—"}
                </td>
                <td className="px-3 py-2 space-x-2">
                  {r.danfeUrl ? (
                    <a href={r.danfeUrl} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: lmfitTokens.primary }}>
                      DANFE
                    </a>
                  ) : null}
                  {r.xmlUrl ? (
                    <a href={r.xmlUrl} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: lmfitTokens.primary }}>
                      XML
                    </a>
                  ) : null}
                  {r.errorMessage ? (
                    <span className="text-xs" style={{ color: lmfitTokens.error }}>
                      {r.errorMessage}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2" style={{ color: lmfitTokens.text }}>
                  {r.emittedAt ? new Date(r.emittedAt).toLocaleString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FiscalClient() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: lmfitTokens.text }}>
          Módulo fiscal
        </h1>
        <p className="text-sm mt-1" style={{ color: lmfitTokens.textMuted }}>
          Configure a integração com a Nuvem Fiscal para emitir NFC-e/NF-e dos seus pedidos.
        </p>
      </div>

      <section className="rounded-xl border p-5" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5" style={{ color: lmfitTokens.primary }} />
          <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
            Configuração
          </h2>
        </div>
        <ConfigSection />
      </section>

      <section className="rounded-xl border p-5" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
        <div className="flex items-center gap-2 mb-4">
          <ListOrdered className="h-5 w-5" style={{ color: lmfitTokens.primary }} />
          <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
            Passo a passo para emitir notas
          </h2>
        </div>
        <GuideSection />
      </section>

      <section className="rounded-xl border p-5" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
        <div className="flex items-center gap-2 mb-4">
          <Send className="h-5 w-5" style={{ color: lmfitTokens.primary }} />
          <h2 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
            Emitir e histórico de notas
          </h2>
        </div>
        <HistorySection />
      </section>
    </div>
  );
}
