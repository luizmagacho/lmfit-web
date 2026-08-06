"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { publicHttp } from "@/lib/publicHttp";
import { customerHttp } from "@/lib/customerHttp";
import { axiosErrorMessage } from "@/lib/apiErrors";
import { useCustomerAuthStore } from "@/stores/useCustomerAuthStore";
import { Button } from "@/components/atoms/Button";
import { lmfitTokens } from "@/theme/tokens";

type ReviewItem = {
  _id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  customerName: string;
};

type ReviewsResponse = {
  items: ReviewItem[];
  average: number;
  count: number;
};

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= Math.round(value) ? lmfitTokens.primary : "none"}
          color={n <= Math.round(value) ? lmfitTokens.primary : lmfitTokens.border}
        />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Dar nota ${n}`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star size={22} fill={n <= value ? lmfitTokens.primary : "none"} color={n <= value ? lmfitTokens.primary : lmfitTokens.border} />
        </button>
      ))}
    </span>
  );
}

/** Avaliações do produto (Loop 9 continuação) — leitura é 100% pública (qualquer visitante vê),
 *  escrita exige login + compra verificada (o backend valida um pedido enviado/concluído contendo
 *  a variante do produto; este componente só repassa o erro do backend, sem tentar adivinhar
 *  elegibilidade no cliente). */
export function ProductReviews({ productId }: { productId: string }) {
  const user = useCustomerAuthStore((s) => s.user);
  const initCustomerAuth = useCustomerAuthStore((s) => s.init);
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await publicHttp.get<ReviewsResponse>("/public/reviews", { params: { productId } });
      setData(data);
    } catch {
      setData({ items: [], average: 0, count: 0 });
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void initCustomerAuth();
  }, [initCustomerAuth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await customerHttp.post("/me/reviews", { productId, rating, comment: comment.trim() || undefined });
      setSubmitted(true);
      setRating(0);
      setComment("");
    } catch (err) {
      setSubmitError(axiosErrorMessage(err) || "Não foi possível enviar sua avaliação.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 border-t pt-6" style={{ borderColor: lmfitTokens.border }}>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold" style={{ color: lmfitTokens.text, fontFamily: lmfitTokens.fontDisplay }}>
          Avaliações
        </h2>
        {data && data.count > 0 ? (
          <span className="flex items-center gap-1.5 text-sm" style={{ color: lmfitTokens.textMuted }}>
            <Stars value={data.average} />
            {data.average.toFixed(1)} ({data.count})
          </span>
        ) : null}
      </div>

      {data && data.items.length === 0 ? (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          Ainda não há avaliações para este produto.
        </p>
      ) : (
        <ul className="space-y-3">
          {(data?.items ?? []).map((r) => (
            <li key={r._id} className="border rounded-lg p-3 text-sm" style={{ borderColor: lmfitTokens.border }}>
              <div className="flex items-center justify-between">
                <span className="font-medium" style={{ color: lmfitTokens.text }}>
                  {r.customerName}
                </span>
                <Stars value={r.rating} size={14} />
              </div>
              {r.comment ? (
                <p className="mt-1" style={{ color: lmfitTokens.textMuted }}>
                  {r.comment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {user ? (
        submitted ? (
          <p className="text-sm" style={{ color: lmfitTokens.success }}>
            Obrigado! Sua avaliação foi enviada e vai aparecer aqui assim que for revisada.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2 border rounded-lg p-3" style={{ borderColor: lmfitTokens.border }}>
            <span className="text-sm font-medium" style={{ color: lmfitTokens.text }}>
              Avaliar este produto
            </span>
            <StarPicker value={rating} onChange={setRating} />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte sua experiência (opcional)"
              className="w-full min-h-20 px-3 py-2 rounded-lg border text-sm bg-[var(--card-bg)]"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              maxLength={1000}
            />
            {submitError ? (
              <p className="text-sm" style={{ color: lmfitTokens.error }}>
                {submitError}
              </p>
            ) : null}
            <Button type="submit" variant="solid" disabled={rating === 0 || submitting}>
              {submitting ? "Enviando…" : "Enviar avaliação"}
            </Button>
          </form>
        )
      ) : (
        <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>
          <Link href="/conta" className="underline" style={{ color: lmfitTokens.primary }}>
            Faça login
          </Link>{" "}
          para avaliar este produto.
        </p>
      )}
    </section>
  );
}
