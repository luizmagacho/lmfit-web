"use client";

import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { X, ScanLine, AlertTriangle, Plus, Check } from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { lmfitTokens } from "@/theme/tokens";
import { useCartStore, type CartLine } from "@/stores/useCartStore";
import { lookupLocalByBarcodeAsProduct } from "@/lib/pdv/catalogSnapshot";
import { pdvLookupByBarcode, type PdvProduct } from "@/lib/pdv/searchProducts";
import { resolvePrimaryImageUrl } from "@/lib/productImageUrl";
import { documentId } from "@/lib/normalizeApiList";
import { extractPrice, productPriceRetail, productPriceWholesale, productMinWholesale } from "@/lib/products/variantPricing";

const BARCODE_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
];

type ScanMode = "manual" | "sequential";

type ResolvedLine = Omit<CartLine, "quantity" | "unitPrice" | "mode">;

/** Depois que a variante escaneada é encontrada no produto bruto da API (`product.variants`),
 *  monta os mesmos campos que `VariantGrid.tsx` monta pra adicionar ao carrinho — preço da
 *  variante se ela tiver um próprio, senão cai pro preço do produto. Exportada pra teste direto. */
export function resolveLine(product: PdvProduct, variantId: string): ResolvedLine | null {
  const variant = (product.variants ?? []).find(
    (v) => String((v as { _id?: string })._id) === variantId,
  ) as Record<string, unknown> | undefined;
  if (!variant) return null;
  const retail = productPriceRetail(product);
  const wholesale = productPriceWholesale(product);
  const minQty = productMinWholesale(product);
  const variantPrice = extractPrice(
    (variant as { price?: unknown }).price ?? (variant as { priceRetail?: unknown }).priceRetail,
  );
  const priceRetail = variantPrice > 0 ? variantPrice : retail;
  const rawColor = variant.color as string | undefined;
  const rawSize = variant.size as string | undefined;
  return {
    variantId,
    productId: documentId(product),
    productName: String(product.name ?? "Produto"),
    sku: String(variant.sku ?? product.sku ?? variantId),
    color: rawColor && rawColor !== "Único" ? rawColor : undefined,
    size: rawSize && rawSize !== "Único" ? rawSize : undefined,
    priceRetail,
    priceWholesale: wholesale ?? priceRetail,
    minWholesaleQty: minQty,
    imageUrl: resolvePrimaryImageUrl(product),
  };
}

async function resolveBarcode(code: string): Promise<{ product: PdvProduct; variantId?: string } | null> {
  const local = await lookupLocalByBarcodeAsProduct(code);
  if (local) return local as { product: PdvProduct; variantId?: string };
  try {
    return await pdvLookupByBarcode(code);
  } catch {
    return null;
  }
}

type SessionEntry = { variantId: string; label: string; sku: string; qty: number };

/** Loop — duas formas de colocar itens no carrinho pela câmera, num único popup:
 *  "manual" pausa em cada leitura pra confirmar a quantidade antes de somar (ex.: 20 do mesmo
 *  código de uma vez); "sequencial" soma 1 a cada leitura, sem pausar — passar a mesma peça duas
 *  vezes na câmera dá quantidade 2, sem digitar nada. */
export function BarcodeCartScannerModal({ onClose }: { onClose: () => void }) {
  const cart = useCartStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const busyRef = useRef(false);
  const cancelledRef = useRef(false);

  const [mode, setMode] = useState<ScanMode>("manual");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<{ line: ResolvedLine; qty: number } | null>(null);
  const [session, setSession] = useState<SessionEntry[]>([]);

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const resume = useCallback((delayMs: number) => {
    setTimeout(() => {
      busyRef.current = false;
    }, delayMs);
  }, []);

  const handleDetected = useCallback(
    async (code: string) => {
      if (busyRef.current || pendingRef.current) return;
      busyRef.current = true;
      const resolved = await resolveBarcode(code);
      if (cancelledRef.current) return;
      if (!resolved) {
        toast.error(`Código ${code} não encontrado.`);
        resume(1000);
        return;
      }
      const { product, variantId } = resolved;
      const vid = variantId ?? (product.variants?.length === 1 ? String((product.variants[0] as { _id?: string })._id ?? "") : undefined);
      const line = vid ? resolveLine(product, vid) : null;
      if (!line) {
        toast.error(`${product.name ?? "Produto"}: variante não identificada.`);
        resume(1000);
        return;
      }

      if (modeRef.current === "manual") {
        // Fica pausado com o item em espera até o operador confirmar a quantidade — só volta a
        // escanear depois do "Adicionar" ou "Cancelar" (ver botões abaixo).
        setPending({ line, qty: 1 });
        return;
      }

      // Sequencial: soma 1 na hora, sem esperar confirmação — ler o mesmo código de novo soma
      // mais 1 (addOrIncrement já faz isso sozinho pro carrinho real).
      cart.addOrIncrement(line, 1);
      setSession((prev) => {
        const idx = prev.findIndex((e) => e.variantId === line.variantId);
        const label = [line.color, line.size].filter(Boolean).join(" · ");
        if (idx === -1) return [...prev, { variantId: line.variantId, label: label || line.productName, sku: line.sku, qty: 1 }];
        const next = prev.slice();
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      });
      toast.success(`+1 ${line.productName}`);
      resume(1200);
    },
    [cart, resume],
  );

  useEffect(() => {
    cancelledRef.current = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const hints = new Map<DecodeHintType, unknown>([
          [DecodeHintType.POSSIBLE_FORMATS, BARCODE_FORMATS],
          [DecodeHintType.TRY_HARDER, true],
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromStream(stream, videoRef.current ?? undefined, (result) => {
          if (cancelledRef.current || !result) return;
          void handleDetected(result.getText());
        });
        if (cancelledRef.current) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setReady(true);
      } catch {
        if (!cancelledRef.current) {
          setError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
        }
      }
    }

    void start();

    return () => {
      cancelledRef.current = true;
      controlsRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function confirmPending() {
    if (!pending) return;
    const qty = Math.max(1, Math.floor(pending.qty) || 1);
    cart.addOrIncrement(pending.line, qty);
    const label = [pending.line.color, pending.line.size].filter(Boolean).join(" · ");
    toast.success(`${qty}x ${pending.line.productName}${label ? ` · ${label}` : ""}`);
    setSession((prev) => {
      const idx = prev.findIndex((e) => e.variantId === pending.line.variantId);
      if (idx === -1) return [...prev, { variantId: pending.line.variantId, label: label || pending.line.productName, sku: pending.line.sku, qty }];
      const next = prev.slice();
      next[idx] = { ...next[idx], qty: next[idx].qty + qty };
      return next;
    });
    setPending(null);
    resume(300);
  }

  function cancelPending() {
    setPending(null);
    resume(300);
  }

  function switchMode(next: ScanMode) {
    setMode(next);
    setPending(null);
    busyRef.current = false;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="bg-[var(--card-bg)] w-full max-w-sm rounded-xl shadow-xl overflow-hidden border flex flex-col max-h-[90vh]"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: lmfitTokens.border }}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: lmfitTokens.text }}>
            <ScanLine size={18} style={{ color: lmfitTokens.primary }} />
            Escanear pro carrinho
          </span>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
            <X size={18} style={{ color: lmfitTokens.textMuted }} />
          </button>
        </div>

        <div className="flex gap-1 p-2 border-b shrink-0" style={{ borderColor: lmfitTokens.border }}>
          <button
            type="button"
            onClick={() => switchMode("manual")}
            className="flex-1 text-xs font-medium py-2 rounded-md"
            style={{
              backgroundColor: mode === "manual" ? `color-mix(in srgb, ${lmfitTokens.primary} 15%, transparent)` : "transparent",
              color: mode === "manual" ? lmfitTokens.primary : lmfitTokens.textMuted,
            }}
          >
            Manual (com qtd.)
          </button>
          <button
            type="button"
            onClick={() => switchMode("sequential")}
            className="flex-1 text-xs font-medium py-2 rounded-md"
            style={{
              backgroundColor: mode === "sequential" ? `color-mix(in srgb, ${lmfitTokens.primary} 15%, transparent)` : "transparent",
              color: mode === "sequential" ? lmfitTokens.primary : lmfitTokens.textMuted,
            }}
          >
            Sequencial (1 a 1)
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AlertTriangle size={28} style={{ color: lmfitTokens.error }} />
              <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
                {error}
              </p>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3]">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {ready ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[80%] h-16 border-2 rounded-lg" style={{ borderColor: lmfitTokens.primary }} />
                </div>
              ) : null}
            </div>
          )}

          {mode === "manual" ? (
            pending ? (
              <div className="mt-3 p-3 rounded-lg border space-y-2" style={{ borderColor: lmfitTokens.border }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                    {pending.line.productName}
                  </p>
                  <p className="text-xs font-mono" style={{ color: lmfitTokens.textMuted }}>
                    {[pending.line.sku, [pending.line.color, pending.line.size].filter(Boolean).join("/")].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs shrink-0" style={{ color: lmfitTokens.textMuted }}>
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min={1}
                    autoFocus
                    value={pending.qty}
                    onChange={(e) => setPending((p) => (p ? { ...p, qty: Math.max(1, parseInt(e.target.value, 10) || 1) } : p))}
                    className="w-20 px-2 py-1.5 rounded border text-sm tabular-nums"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelPending}
                    className="flex-1 min-h-10 rounded-md border text-sm"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmPending}
                    className="flex-1 min-h-10 rounded-md text-sm font-medium text-white flex items-center justify-center gap-1"
                    style={{ backgroundColor: lmfitTokens.primary }}
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-center mt-3" style={{ color: lmfitTokens.textMuted }}>
                Aponte a câmera pro código de barras da peça.
              </p>
            )
          ) : (
            <p className="text-xs text-center mt-3" style={{ color: lmfitTokens.textMuted }}>
              Vá passando as peças na câmera — cada leitura soma 1 unidade automaticamente.
            </p>
          )}

          {session.length > 0 ? (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold" style={{ color: lmfitTokens.textMuted }}>
                Adicionado nesta sessão
              </p>
              <div className="rounded-lg border divide-y overflow-hidden" style={{ borderColor: lmfitTokens.border }}>
                {session.map((e) => (
                  <div key={e.variantId} className="flex items-center justify-between px-3 py-1.5 text-xs">
                    <span className="truncate" style={{ color: lmfitTokens.text }}>
                      {e.label}
                    </span>
                    <span className="flex items-center gap-1 shrink-0 font-semibold" style={{ color: lmfitTokens.primary }}>
                      <Check size={12} /> {e.qty}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
