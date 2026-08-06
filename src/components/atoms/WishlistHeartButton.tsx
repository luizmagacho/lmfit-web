"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCustomerAuthStore } from "@/stores/useCustomerAuthStore";
import { useWishlistStore } from "@/stores/useWishlistStore";
import { lmfitTokens } from "@/theme/tokens";

/** Coração de favoritar — some se o cliente não estiver logado (Loop 9 continuação), redireciona
 *  pra `/conta` em vez de tentar a chamada e falhar silenciosamente em 401. `stopPropagation` porque
 *  todo uso hoje fica dentro de um `<Link>` de card de produto. */
export function WishlistHeartButton({
  productId,
  size = 18,
  className,
}: {
  productId: string;
  size?: number;
  className?: string;
}) {
  const user = useCustomerAuthStore((s) => s.user);
  const init = useCustomerAuthStore((s) => s.init);
  const wishlistInit = useWishlistStore((s) => s.init);
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(productId));
  const toggle = useWishlistStore((s) => s.toggle);
  const router = useRouter();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (user) void wishlistInit();
  }, [user, wishlistInit]);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/conta");
      return;
    }
    void toggle(productId);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isWishlisted ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-pressed={isWishlisted}
      className={["inline-flex items-center justify-center rounded-full p-1.5", className]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
    >
      <Heart
        size={size}
        fill={isWishlisted ? lmfitTokens.primary : "none"}
        color={isWishlisted ? lmfitTokens.primary : "#fff"}
        strokeWidth={2}
      />
    </button>
  );
}
