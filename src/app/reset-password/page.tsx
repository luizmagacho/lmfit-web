"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";
import { http } from "@/lib/http";

function ResetPasswordForm() {
  const { tenant, loading: tenantLoading } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    try {
      await http.post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Link inválido ou expirado. Solicite um novo.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  const logoUrl = tenant?.branding?.logoUrl || "/kivoni-symbol.svg";
  const storeName = tenant?.name || "Kivoni";

  if (tenantLoading) {
    return <div className="min-h-screen" style={{ backgroundColor: lmfitTokens.surface }} />;
  }

  if (!token) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: lmfitTokens.surface }}
      >
        <div
          className="w-full max-w-sm space-y-4 bg-[var(--card-bg)] p-6 rounded-lg shadow-sm border text-center"
          style={{ borderColor: lmfitTokens.border }}
        >
          <p className="text-sm" style={{ color: lmfitTokens.text }}>
            Link inválido — falta o token de redefinição.
          </p>
          <Link href="/forgot-password" className="text-sm underline" style={{ color: lmfitTokens.primary }}>
            Solicitar um novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: lmfitTokens.surface }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle at 50% 0%, ${lmfitTokens.primary}, transparent 70%)` }}
      />
      <div
        className="w-full max-w-sm space-y-5 bg-[var(--card-bg)] p-6 rounded-lg shadow-sm border"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="py-2 w-full flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={storeName} className="h-12 w-auto max-w-[200px] object-contain" />
          </div>
          {!done && (
            <p className="text-sm font-medium text-center" style={{ color: lmfitTokens.textMuted }}>
              Crie uma nova senha — {storeName}
            </p>
          )}
        </div>

        {done ? (
          <div className="space-y-3 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: "color-mix(in srgb, #16a34a 12%, transparent)", color: "#16a34a" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: lmfitTokens.text }}>
              Senha redefinida! Levando você para o login…
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-center" style={{ color: lmfitTokens.error }}>
                {error}
              </p>
            )}
            <label className="block text-sm">
              <span style={{ color: lmfitTokens.textMuted }}>Nova senha</span>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                style={{ borderColor: lmfitTokens.border }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                minLength={6}
                autoFocus
                required
              />
            </label>
            <label className="block text-sm">
              <span style={{ color: lmfitTokens.textMuted }}>Confirmar nova senha</span>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                style={{ borderColor: lmfitTokens.border }}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-md text-white font-medium disabled:opacity-60"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              {submitting ? "Salvando…" : "Redefinir senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen" style={{ backgroundColor: lmfitTokens.surface }} />}
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
