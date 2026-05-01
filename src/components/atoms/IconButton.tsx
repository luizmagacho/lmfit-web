import type { ButtonHTMLAttributes, ReactNode } from "react";
import { lmfitTokens } from "@/theme/tokens";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  variant?: "ghost" | "primary" | "danger";
};

export function IconButton({ children, label, variant = "ghost", className, style, ...rest }: Props) {
  const base =
    "inline-flex items-center justify-center min-h-11 min-w-11 rounded-md border touch-manipulation disabled:opacity-40";
  const v =
    variant === "primary"
      ? { backgroundColor: lmfitTokens.primary, color: "#fff", borderColor: lmfitTokens.primary }
      : variant === "danger"
        ? { backgroundColor: "#fff", color: lmfitTokens.error, borderColor: lmfitTokens.border }
        : { backgroundColor: "#fff", color: lmfitTokens.text, borderColor: lmfitTokens.border };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={[base, className ?? ""].filter(Boolean).join(" ")}
      style={{ ...v, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
