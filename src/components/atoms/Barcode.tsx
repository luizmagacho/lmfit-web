"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** 13 dígitos numéricos por si só NÃO bastam pra saber se um valor é um EAN-13 de verdade — um
 *  campo digitado manualmente (ou dado de teste antigo) pode "parecer" um EAN sem ter o dígito
 *  verificador certo, e o `jsbarcode` REJEITA (lança exceção) qualquer valor assim quando
 *  `format="EAN13"`. Mesmo algoritmo do `ProductsService.ean13CheckDigit` no backend — só valida,
 *  não gera. Use isso antes de escolher `format="EAN13"`; caso contrário, `format="CODE128"`
 *  (que aceita qualquer string) é sempre seguro. */
export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = Number(value[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(value[12]);
}

/**
 * Loop 35 — extraído de `CustomerBarcodeCard.tsx` (Loop 34) quando ganhou uma segunda
 * consumidora real (etiquetas de produto). Renderiza um código de barras direto num `<canvas>`,
 * inteiramente no navegador, sem chamada de rede.
 *
 * `format="EAN13"` — código de produto real (13 dígitos, padrão de mercado, ver
 * `ProductsService.formatVariantBarcode`); mostra os dígitos embaixo das barras, igual qualquer
 * código de barras de prateleira de loja de verdade.
 * `format="CODE128"` (padrão) — código interno alfanumérico (ex. carteirinha de cliente,
 * `CLI-000001`), sem os dígitos embutidos — o chamador já mostra o código como texto separado.
 */
export function Barcode({
  value,
  format = "CODE128",
  width = 2,
  height = 60,
  displayValue,
  margin = 8,
  fontSize = 12,
}: {
  value: string;
  format?: "CODE128" | "EAN13";
  width?: number;
  height?: number;
  displayValue?: boolean;
  /** Espaço em branco ao redor do desenho (px) — o padrão (8) é confortável pro cartão de
   *  fidelidade, mas etiquetas pequenas (Loop 35, `LabelsClient.tsx`) precisam de algo bem menor
   *  pra não estourar um `<canvas>` maior que a própria etiqueta física. */
  margin?: number;
  fontSize?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    try {
      JsBarcode(canvasRef.current, value, {
        format,
        displayValue: displayValue ?? format === "EAN13",
        fontSize,
        width,
        height,
        margin,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      // jsbarcode throws (not just logs) on a value that doesn't fit the chosen symbology — ex.
      // um "EAN13" com dígito verificador inválido (13 dígitos, mas não é um EAN de verdade).
      // O chamador já deveria ter validado antes de escolher "EAN13", mas isso é a rede de
      // segurança: nunca deixa um valor ruim derrubar a página inteira, só some o desenho.
      const ctx = canvasRef.current?.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current?.width ?? 0, canvasRef.current?.height ?? 0);
    }
  }, [value, format, width, height, displayValue, margin, fontSize]);

  if (!value) return null;

  return <canvas ref={canvasRef} />;
}
