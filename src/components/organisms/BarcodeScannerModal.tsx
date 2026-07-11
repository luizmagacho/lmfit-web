"use client";

import { useEffect, useRef, useState } from "react";
import { X, ScanLine, AlertTriangle } from "lucide-react";
import { lmfitTokens } from "@/theme/tokens";

/** Formatos de código de barras de varejo mais comuns (produto embalado). */
const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"];

type DetectorInstance = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
type DetectorCtor = new (opts: { formats: string[] }) => DetectorInstance;

export function BarcodeScannerModal({
  onClose,
  onDetected,
}: {
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const Detector = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
      if (!Detector) {
        setError(
          "Este navegador não suporta leitura de código de barras por câmera. Use Chrome/Edge no Android, ou digite o código manualmente na busca.",
        );
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);

        const detector = new Detector({ formats: BARCODE_FORMATS });
        const scanLoop = async () => {
          if (cancelled || detectedRef.current || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && !detectedRef.current) {
              detectedRef.current = true;
              onDetected(codes[0].rawValue);
              return;
            }
          } catch {
            // frame ilegível, tenta de novo no próximo tick
          }
          rafRef.current = requestAnimationFrame(() => void scanLoop());
        };
        void scanLoop();
      } catch {
        if (!cancelled) {
          setError("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
