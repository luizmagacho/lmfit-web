"use client";

import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { lmfitLogoSrc, lmfitTokens } from "@/theme/tokens";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useTenant } from "@/context/TenantContext";

function safeInternalNext(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return null;
  return t;
}

function LoginForm() {
  const { user, loading: authLoading, login } = useAuth();
  const { tenant, slug, loading: tenantLoading } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const nextPath = useMemo(() => safeInternalNext(nextRaw), [nextRaw]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set default admin email when slug changes
  useEffect(() => {
    if (slug) {
      setEmail(`admin@${slug}.local`);
    }
  }, [slug]);

  useEffect(() => {
    if (!authLoading && user) router.replace(nextPath ?? "/dashboard");
  }, [authLoading, user, router, nextPath]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace(nextPath ?? "/dashboard");
    } catch {
      setError("E-mail ou senha inválidos.");
    } finally {
      setSubmitting(false);
    }
  }

  const logoUrl = tenant?.branding?.logoUrl || (slug === "lmfit" ? lmfitLogoSrc : "/kivo-logo.png");
  const storeName = tenant?.name || (slug === "lmfit" ? "LM FIT" : "Kivo");
  const isDefaultLogo = logoUrl === lmfitLogoSrc || logoUrl === "/kivo-logo.png";

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">…</div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: lmfitTokens.surface }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 bg-[var(--card-bg)] p-6 rounded-lg shadow-sm border"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className={isDefaultLogo ? "rounded-md bg-black px-4 py-3" : "py-2 w-full flex justify-center"}>
            <Image
              src={logoUrl}
              alt={storeName}
              width={160}
              height={56}
              className="h-12 w-auto max-w-[200px] object-contain"
              priority
            />
          </div>
          <p className="text-sm font-medium text-center" style={{ color: lmfitTokens.textMuted }}>
            Painel de Controle — {storeName}
          </p>
        </div>
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
            required
          />
        </label>
        <label className="block text-sm">
          <span style={{ color: lmfitTokens.textMuted }}>Senha</span>
          <div className="relative mt-1">
            <input
              className="w-full border rounded px-3 py-2 pr-10"
              style={{ borderColor: lmfitTokens.border }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-1"
              style={{ outlineColor: lmfitTokens.primary }}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-md text-white font-medium disabled:opacity-60"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: lmfitTokens.surface }}>
          …
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
