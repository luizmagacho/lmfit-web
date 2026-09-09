"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { lmfitTokens } from "@/theme/tokens";
import { http } from "@/lib/http";

export default function ForgotPasswordPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await http.post("/auth/forgot-password", { email });
      // Sempre a mesma resposta de sucesso, exista ou não o e-mail — evita revelar quais
      // contas existem no tenant.
      setSent(true);
    } catch {
      setError("Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.");
    } finally {
      setSubmitting(false);
    }
  }

  const logoUrl = tenant?.branding?.logoUrl || "/kivoni-symbol.svg";
  const storeName = tenant?.name || "Kivoni";

  if (tenantLoading) {
    return <div className="min-h-screen" style={{ backgroundColor: lmfitTokens.surface }} />;
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
          {sent ? null : (
            <>
              <h1 className="text-base font-semibold" style={{ color: lmfitTokens.text }}>
                Esqueceu sua senha?
              </h1>
              <p className="text-sm text-center" style={{ color: lmfitTokens.textMuted }}>
                Digite seu e-mail e enviaremos um link para redefinir sua senha em {storeName}.
              </p>
            </>
          )}
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: "color-mix(in srgb, #16a34a 12%, transparent)", color: "#16a34a" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: lmfitTokens.text }}>
              Se existir uma conta com o e-mail <strong>{email}</strong>, enviamos um link de redefinição — confira sua caixa de entrada (e o spam).
            </p>
            <Link
              href="/login"
              className="inline-block text-sm font-medium underline"
              style={{ color: lmfitTokens.primary }}
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-center" style={{ color: lmfitTokens.error }}>
                {error}
              </p>
            )}
            <label className="block text-sm">
              <span style={{ color: lmfitTokens.textMuted }}>E-mail</span>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                style={{ borderColor: lmfitTokens.border }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="username"
                autoFocus
                required
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-md text-white font-medium disabled:opacity-60"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              {submitting ? "Enviando…" : "Enviar link de redefinição"}
            </button>
            <p className="text-center">
              <Link href="/login" className="text-sm underline" style={{ color: lmfitTokens.textMuted }}>
                Voltar para o login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
