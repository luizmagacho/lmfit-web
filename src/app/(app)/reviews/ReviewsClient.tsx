"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Check, X } from "lucide-react";
import { http } from "@/lib/http";
import { lmfitTokens } from "@/theme/tokens";

type ReviewStatus = "pending" | "approved" | "rejected";

type ReviewRow = {
  _id: string;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  createdAt?: string;
  rejectionNote?: string;
  productId?: { _id?: string; name?: string } | string;
  customerId?: { _id?: string; name?: string } | string;
};

const TABS: { value: ReviewStatus | ""; label: string }[] = [
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Recusadas" },
  { value: "", label: "Todas" },
];

function nameOf(v: ReviewRow["productId"]): string {
  if (!v) return "—";
  return typeof v === "string" ? v : v.name || "—";
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} fill={n <= value ? lmfitTokens.primary : "none"} color={n <= value ? lmfitTokens.primary : lmfitTokens.border} />
      ))}
    </span>
  );
}

export function ReviewsClient() {
  const [status, setStatus] = useState<ReviewStatus | "">("pending");
  const [items, setItems] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await http.get<{ items: ReviewRow[] }>("/reviews", {
        params: { page: 1, limit: 100, status: status || undefined },
      });
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    setBusyId(id);
    try {
      await http.patch(`/reviews/${id}/approve`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      await http.patch(`/reviews/${id}/reject`, { note: rejectNote || undefined });
      setRejectingId(null);
      setRejectNote("");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: lmfitTokens.text }}>
          Avaliações
        </h1>
        <p className="text-sm mt-1" style={{ color: lmfitTokens.textMuted }}>
          Avaliações enviadas por clientes com compra verificada (pedido enviado/concluído). Só
          aparecem na loja depois de aprovadas.
        </p>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setStatus(t.value)}
            className="min-h-9 px-3 rounded-md border text-sm font-medium"
            style={{
              borderColor: status === t.value ? lmfitTokens.primary : lmfitTokens.border,
              backgroundColor: status === t.value ? lmfitTokens.primary : "var(--card-bg)",
              color: status === t.value ? "#fff" : lmfitTokens.text,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Carregando…
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Nenhuma avaliação encontrada.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r._id} className="rounded-xl border p-4 space-y-2" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
                    {nameOf(r.productId)}
                  </p>
                  <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                    {nameOf(r.customerId)}
                    {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment ? (
                <p className="text-sm" style={{ color: lmfitTokens.text }}>
                  {r.comment}
                </p>
              ) : null}
              {r.status === "rejected" && r.rejectionNote ? (
                <p className="text-xs" style={{ color: lmfitTokens.error }}>
                  Motivo da recusa: {r.rejectionNote}
                </p>
              ) : null}

              {r.status === "pending" ? (
                rejectingId === r._id ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Motivo (opcional)"
                      className="flex-1 min-h-9 px-2 rounded-md border text-sm bg-[var(--card-bg)]"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    />
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => reject(r._id)}
                      className="min-h-9 px-3 rounded-md text-sm font-medium text-white"
                      style={{ backgroundColor: lmfitTokens.error }}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectNote("");
                      }}
                      className="min-h-9 px-3 rounded-md text-sm"
                      style={{ color: lmfitTokens.textMuted }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => approve(r._id)}
                      className="inline-flex items-center gap-1 min-h-9 px-3 rounded-md text-sm font-medium text-white disabled:opacity-60"
                      style={{ backgroundColor: lmfitTokens.success }}
                    >
                      <Check size={14} /> Aprovar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r._id}
                      onClick={() => setRejectingId(r._id)}
                      className="inline-flex items-center gap-1 min-h-9 px-3 rounded-md border text-sm font-medium disabled:opacity-60"
                      style={{ borderColor: lmfitTokens.error, color: lmfitTokens.error }}
                    >
                      <X size={14} /> Recusar
                    </button>
                  </div>
                )
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
