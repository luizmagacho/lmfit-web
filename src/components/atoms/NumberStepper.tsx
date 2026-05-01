"use client";

import { Minus, Plus } from "lucide-react";
import { IconButton } from "./IconButton";
import { lmfitTokens } from "@/theme/tokens";

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  disabled,
  ariaLabel,
  size = "md",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  ariaLabel?: string;
  size?: "sm" | "md" | "lg";
}) {
  const clamp = (n: number) => {
    if (!Number.isFinite(n)) return min;
    if (typeof max === "number" && n > max) return max;
    if (n < min) return min;
    return n;
  };
  const h = size === "sm" ? "h-9" : size === "lg" ? "h-12" : "h-11";
  const inputW = size === "lg" ? "w-16" : "w-14";

  return (
    <div className={`inline-flex items-stretch overflow-hidden rounded-md border ${h}`} style={{ borderColor: lmfitTokens.border }}>
      <IconButton
        label="Diminuir"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="!rounded-none !border-0 !border-r"
        style={{ borderColor: lmfitTokens.border }}
      >
        <Minus size={16} aria-hidden />
      </IconButton>
      <input
        aria-label={ariaLabel ?? "Quantidade"}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(clamp(Number.isFinite(n) ? n : min));
        }}
        className={`text-center tabular-nums text-sm ${inputW} bg-white outline-none`}
        style={{ color: lmfitTokens.text }}
      />
      <IconButton
        label="Aumentar"
        disabled={disabled || (typeof max === "number" && value >= max)}
        onClick={() => onChange(clamp(value + step))}
        className="!rounded-none !border-0 !border-l"
        style={{ borderColor: lmfitTokens.border }}
      >
        <Plus size={16} aria-hidden />
      </IconButton>
    </div>
  );
}
