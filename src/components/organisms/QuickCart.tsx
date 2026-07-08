"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCartStore, type CartLine } from "@/stores/useCartStore";
import { Badge } from "@/components/atoms/Badge";
import { IconButton } from "@/components/atoms/IconButton";
import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

const SWIPE_REMOVE_PX = 80;

function CartRow({ line, onRemove }: { line: CartLine; onRemove: () => void }) {
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);

  return (
    <li
      className="relative overflow-hidden border-b last:border-0"
      style={{ borderColor: lmfitTokens.border }}
    >
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4"
        style={{ backgroundColor: lmfitTokens.error }}
      >
        <Trash2 size={18} color="#fff" aria-hidden />
      </div>
      <div
        className="relative bg-[var(--card-bg)] flex items-center gap-3 px-3 py-2"
        style={{ transform: `translateX(${Math.min(0, dx)}px)`, transition: start.current === null ? "transform 120ms ease" : undefined }}
        onPointerDown={(e) => {
          start.current = e.clientX;
        }}
        onPointerMove={(e) => {
          if (start.current === null) return;
          setDx(Math.min(0, e.clientX - start.current));
        }}
        onPointerUp={() => {
          if (Math.abs(dx) >= SWIPE_REMOVE_PX) {
            onRemove();
          }
          setDx(0);
          start.current = null;
        }}
        onPointerCancel={() => {
          setDx(0);
          start.current = null;
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: lmfitTokens.text }}>
              {line.productName}
            </span>
            {line.isOrder && (
              <Badge variant="pendente" size="xs">
                Encomenda
              </Badge>
            )}
            <Badge variant={line.mode === "atacado" ? "atacado" : "varejo"} size="xs">
              {line.mode === "atacado" ? "Atacado" : "Varejo"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
            <span className="font-mono">{line.sku}</span>
            {line.color || line.size ? (
              <span>{[line.color, line.size].filter(Boolean).join(" · ")}</span>
            ) : null}
            <span className="tabular-nums">
              {line.quantity}× {formatBRL(line.unitPrice)}
            </span>
          </div>
        </div>
        <div className="tabular-nums font-semibold" style={{ color: lmfitTokens.text }}>
          {formatBRL(line.unitPrice * line.quantity)}
        </div>
        <IconButton label="Remover" variant="danger" onClick={onRemove}>
          <Trash2 size={16} aria-hidden />
        </IconButton>
      </div>
    </li>
  );
}

export function QuickCart({
  onFinalize,
  finalizeLabel = "Finalizar",
  busy,
}: {
  onFinalize: () => void;
  finalizeLabel?: string;
  busy?: boolean;
}) {
  const { lines, snapshot, remove, increment } = useCartStore();
  const focus = useRef<string | null>(null);
  const snap = snapshot();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "+" || e.key === "=") {
        const id = focus.current ?? lines[lines.length - 1]?.variantId;
        if (id) increment(id, 1);
      } else if (e.key === "-") {
        const id = focus.current ?? lines[lines.length - 1]?.variantId;
        if (id) increment(id, -1);
      } else if (e.key === "Delete") {
        const id = focus.current ?? lines[lines.length - 1]?.variantId;
        if (id) remove(id);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onFinalize();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lines, increment, remove, onFinalize]);

  return (
    <aside
      className="sticky bottom-0 left-0 right-0 border-t bg-[var(--card-bg)]"
      style={{ borderColor: lmfitTokens.border }}
      aria-label="Carrinho rápido"
    >
      {lines.length > 0 ? (
        <ul className="max-h-60 overflow-y-auto">
          {lines.map((l) => (
            <CartRow key={`${l.variantId}-${l.isOrder}`} line={l} onRemove={() => remove(l.variantId, l.isOrder)} />
          ))}
        </ul>
      ) : (
        <div className="px-4 py-3 text-sm" style={{ color: lmfitTokens.textMuted }}>
          Carrinho vazio. Arraste uma linha para esquerda para remover depois de adicionar.
        </div>
      )}
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <div className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          {snap.items} item(s)
          <div className="text-base font-semibold tabular-nums" style={{ color: lmfitTokens.text }}>
            {formatBRL(snap.subtotal)}
          </div>
        </div>
        <button
          type="button"
          className="min-h-12 px-5 rounded-md text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: lmfitTokens.primary }}
          disabled={busy || snap.items === 0}
          onClick={onFinalize}
        >
          {busy ? "Enviando…" : finalizeLabel}
        </button>
      </div>
    </aside>
  );
}
