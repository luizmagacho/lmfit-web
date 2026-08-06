import { formatBRL } from "@/lib/formatMoney";
import { lmfitTokens } from "@/theme/tokens";

/** "R$ 67,62 no Pix · 2x de R$ 34,50 sem juros" — renderiza só as partes configuradas pelo tenant. */
export function PixInstallmentNote({
  pixPrice,
  installmentsText,
  size = "sm",
}: {
  pixPrice: number | null;
  installmentsText: string | null;
  size?: "xs" | "sm";
}) {
  if (!pixPrice && !installmentsText) return null;
  const textSize = size === "xs" ? "text-[11px]" : "text-xs";
  return (
    <p className={`${textSize} leading-snug`} style={{ color: lmfitTokens.textMuted }}>
      {pixPrice != null && (
        <span>
          <span className="font-medium" style={{ color: lmfitTokens.text }}>
            {formatBRL(pixPrice)}
          </span>{" "}
          no Pix
        </span>
      )}
      {pixPrice != null && installmentsText ? " · " : ""}
      {installmentsText}
    </p>
  );
}
