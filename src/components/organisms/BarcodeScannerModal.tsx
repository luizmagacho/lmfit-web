"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { X, ScanLine, AlertTriangle } from "lucide-react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { lmfitTokens } from "@/theme/tokens";

/** Formatos de código de barras de varejo mais comuns (produto embalado). */
const BARCODE_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
];

export function BarcodeScannerModal({
  onClose,
  onDetected,
}: {
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // Decodifica em JavaScript puro (ZXing) em vez da API nativa `BarcodeDetector` — essa
        // API só existe em navegadores Chromium. No iPhone TODO navegador (Safari, Chrome,
        // Firefox) roda por baixo no motor do Safari, que nunca implementou essa API — então
        // sem essa troca a leitura por câmera simplesmente não funciona em nenhum app no iOS.
        const hints = new Map<DecodeHintType, unknown>([[DecodeHintType.POSSIBLE_FORMATS, BARCODE_FORMATS]]);
        const reader = new BrowserMultiFormatReader(hints);
        const controls = await reader.decodeFromStream(stream, videoRef.current ?? undefined, (result) => {
          if (cancelled || detectedRef.current || !result) return;
          detectedRef.current = true;
          controlsRef.current?.stop();
          onDetected(result.getText());
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setReady(true);
      } catch {
        if (!cancelled) {
          setError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="bg-[var(--card-bg)] w-full max-w-sm rounded-xl shadow-xl overflow-hidden border"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: lmfitTokens.border }}>
          <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: lmfitTokens.text }}>
            <ScanLine size={18} style={{ color: lmfitTokens.primary }} />
            Escanear código de barras
          </span>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10">
            <X size={18} style={{ color: lmfitTokens.textMuted }} />
          </button>
        </div>

        <div className="p-4">
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
          <p className="text-xs text-center mt-3" style={{ color: lmfitTokens.textMuted }}>
            Aponte a câmera pro código de barras da peça.
          </p>
        </div>
      </div>
    </div>
  );
}
