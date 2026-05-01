import type { CSSProperties } from "react";
import { lmfitTokens } from "@/theme/tokens";

export function Skeleton({
  className,
  style,
  rounded = "md",
}: {
  className?: string;
  style?: CSSProperties;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}) {
  const radius =
    rounded === "none"
      ? "rounded-none"
      : rounded === "sm"
        ? "rounded-sm"
        : rounded === "lg"
          ? "rounded-lg"
          : rounded === "full"
            ? "rounded-full"
            : "rounded-md";
  return (
    <div
      aria-hidden
      className={["animate-pulse", radius, className ?? ""].filter(Boolean).join(" ")}
      style={{ backgroundColor: lmfitTokens.surface, ...style }}
    />
  );
}
