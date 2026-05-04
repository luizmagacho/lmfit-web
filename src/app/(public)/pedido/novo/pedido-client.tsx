"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { publicHttp } from "@/lib/publicHttp";
import { lmfitTokens } from "@/theme/tokens";

type Variant = { _id: string; sku: string; color?: string; size?: string; price?: number };
type Product = { _id: string; name: string; variants: Variant[] };
type DraftLine = { variantId: string; quantity: number; unitPrice: number };

export function PedidoNovoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = searchParams.get("session") ?? "";

  const [catalog, setCatalog] = useState<Product[]>([]);
  const [draft, setDraft] = useState<{
    sessionToken: string;
    lines: DraftLine[];
    customerId?: string;
    waId?: string;
    status?: string;
  } | null>(null);
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState("1");
  const [customerId, setCustomerId] = useState("");
  const [waId, setWaId] = useState("");
  const [submitCustomerId, setSubmitCustomerId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const flatVariants = useMemo(() => {
    const rows: { id: string; label: string }[] = [];
    for (const p of catalog) {
      for (const v of p.variants ?? []) {
        rows.push({
          id: v._id,
          label: `${p.name} — ${v.sku} (${[v.color, v.size].filter(Boolean).join(" · ") || "var."})`,
        });
      }
    }
    return rows;
  }, [catalog]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await publicHttp.get<Product[]>("/public/catalog/products");
        if (!cancelled) setCatalog(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setErr("Catálogo indisponível.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await publicHttp.get(`/public/order-drafts/${session}`);
        if (!cancelled) {
          const d = data as {
            customerId?: string | { toString(): string };
          };
          setDraft(data as typeof draft);
          setSubmitCustomerId(d.customerId ? String(d.customerId) : "");
        }
      } catch {
        if (!cancelled) setErr("Rascunho não encontrado.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  async function startDraft() {
    setErr(null);
    setBusy(true);
    try {
      const { data } = await publicHttp.post<{ sessionToken: string }>(
        "/public/order-drafts",
        {
          customerId: customerId.trim() || undefined,
          waId: waId.trim() || undefined,
        },
      );
      router.replace(`/pedido/novo?session=${encodeURIComponent(data.sessionToken)}`);
    } catch {
      setErr("Não foi possível iniciar o rascunho.");
    } finally {
      setBusy(false);
    }
  }

  async function patchLines(next: DraftLine[]) {
    if (!session) return;
    setBusy(true);
    setErr(null);
    try {
      const { data } = await publicHttp.patch(`/public/order-drafts/${session}`, {
        lines: next.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        status: "review",
      });
      setDraft(data as typeof draft);
    } catch {
      setErr("Não foi possível atualizar linhas.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDraft() {
    if (!session) return;
    setBusy(true);
    setErr(null);
    try {
      const { data } = await publicHttp.post<{ orderId: string }>(
        `/public/order-drafts/${session}/submit`,
        { customerId: submitCustomerId.trim() || undefined },
      );
      const orderId = data.orderId;
      const next = `/orders/${encodeURIComponent(orderId)}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
    } catch {
      setErr("Envio falhou (confira o ID do cliente).");
    } finally {
      setBusy(false);
    }
  }

  function addLine() {
    if (!session || !draft) return;
    const q = Math.max(1, Number(qty) || 1);
    if (!variantId) {
      setErr("Selecione uma variante.");
      return;
    }
    const map = new Map<string, DraftLine>();
    for (const l of draft.lines ?? []) {
      map.set(l.variantId, { ...l });
    }
    const prev = map.get(variantId);
    let price = prev?.unitPrice ?? 0;
    if (!prev) {
      outer: for (const p of catalog) {
        for (const v of p.variants ?? []) {
          if (v._id === variantId) {
            price = v.price ?? 0;
            break outer;
          }
        }
      }
    }
    map.set(variantId, {
      variantId,
      quantity: (prev?.quantity ?? 0) + q,
      unitPrice: price,
    });
    void patchLines([...map.values()]);
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold" style={{ color: lmfitTokens.text }}>
          Novo pedido
        </h1>
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Inicie um rascunho. Você poderá escolher SKUs e quantidades na próxima etapa.
        </p>
        {err ? (
          <p className="text-sm" style={{ color: lmfitTokens.error }}>
            {err}
          </p>
        ) : null}
        <label className="block text-sm space-y-1" style={{ color: lmfitTokens.textMuted }}>
          ID do cliente (opcional)
          <input
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Mongo ObjectId"
          />
        </label>
        <label className="block text-sm space-y-1" style={{ color: lmfitTokens.textMuted }}>
          WhatsApp (opcional)
          <input
            className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={waId}
            onChange={(e) => setWaId(e.target.value)}
            placeholder="5511999990000"
          />
        </label>
        <button
          type="button"
          className="min-h-11 w-full rounded-md text-white font-medium"
          style={{ backgroundColor: lmfitTokens.primary }}
          disabled={busy}
          onClick={() => void startDraft()}
        >
          {busy ? "…" : "Continuar"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold" style={{ color: lmfitTokens.text }}>
        Montar pedido
      </h1>
      {err ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {err}
        </p>
      ) : null}
      {draft?.status === "submitted" ? (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Este rascunho já foi enviado.
        </p>
      ) : (
        <>
          <div className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
            <label className="block text-sm space-y-1" style={{ color: lmfitTokens.textMuted }}>
              Variante
              <select
                className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {flatVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm space-y-1" style={{ color: lmfitTokens.textMuted }}>
              Quantidade
              <input
                inputMode="numeric"
                className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="min-h-11 w-full rounded-md border font-medium"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              disabled={busy}
              onClick={() => addLine()}
            >
              Adicionar / atualizar linha
            </button>
          </div>
          <div className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-2" style={{ borderColor: lmfitTokens.border }}>
            <h2 className="font-medium" style={{ color: lmfitTokens.text }}>
              Linhas
            </h2>
            <ul className="space-y-1 text-sm">
              {(draft?.lines ?? []).map((l) => (
                <li key={l.variantId} style={{ color: lmfitTokens.textMuted }}>
                  {l.variantId} × {l.quantity} @{" "}
                  {l.unitPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </li>
              ))}
            </ul>
          </div>
          <label className="block text-sm space-y-1" style={{ color: lmfitTokens.textMuted }}>
            ID do cliente (obrigatório se não vinculado ao rascunho)
            <input
              className="w-full border rounded-md px-3 py-2 min-h-11 bg-[var(--card-bg)]"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              value={submitCustomerId}
              onChange={(e) => setSubmitCustomerId(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="min-h-11 w-full rounded-md text-white font-medium"
            style={{ backgroundColor: lmfitTokens.accentBlue }}
            disabled={busy}
            onClick={() => void submitDraft()}
          >
            Enviar para revisão
          </button>
        </>
      )}
    </div>
  );
}
