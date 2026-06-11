"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { lmfitLogoSrc, lmfitTokens } from "@/theme/tokens";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useTenant } from "@/context/TenantContext";
import { http } from "@/lib/http";
import { useTheme } from "next-themes";

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

  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoUrl = tenant?.branding?.logoUrl || "/kivoni-symbol.svg";
  const storeName = tenant?.name || "Kivoni";

  if (authLoading || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">…</div>
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
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 bg-[var(--card-bg)] p-6 rounded-lg shadow-sm border"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="py-2 w-full flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={storeName}
              className="h-12 w-auto max-w-[200px] object-contain"
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

function hasSubdomain(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  
  if (hostname === "127.0.0.1") {
    return true;
  }
  
  if (hostname.includes(".localhost")) {
    const parts = hostname.split(".localhost")[0];
    return !!(parts && parts !== "localhost");
  }
  
  if (hostname.endsWith(".kivoni.com.br")) {
    const parts = hostname.split(".kivoni.com.br")[0];
    return !!(parts && parts !== "www" && parts !== "admin");
  }
  
  return false;
}

interface TenantData {
  slug: string;
  name: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

const SunIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

function StoreDirectory({ theme, toggleTheme }: { theme: "light" | "dark"; toggleTheme: () => void }) {
  const [stores, setStores] = useState<TenantData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStores() {
      try {
        const { data } = await http.get<TenantData[]>("/public/tenants");
        setStores(data);
      } catch (err) {
        console.error("Erro ao carregar lojas:", err);
        setError("Não foi possível carregar as lojas cadastradas.");
      } finally {
        setLoading(false);
      }
    }
    fetchStores();
  }, []);

  const filteredStores = stores.filter(
    (store) =>
      store.name.toLowerCase().includes(search.toLowerCase()) ||
      store.slug.toLowerCase().includes(search.toLowerCase())
  );

  function handleRedirect(slug: string) {
    if (typeof window === "undefined") return;
    const host = window.location.host;
    let redirectUrl = "";
    if (host.includes("localhost")) {
      const cleanHost = host.replace("www.", "");
      if (cleanHost.startsWith("localhost")) {
        redirectUrl = `${window.location.protocol}//${slug}.${cleanHost}`;
      } else {
        const parts = cleanHost.split(".");
        parts[0] = slug;
        redirectUrl = `${window.location.protocol}//${parts.join(".")}`;
      }
    } else {
      const cleanHost = host.replace("www.", "");
      const parts = cleanHost.split(".");
      if (parts.length === 2) {
        redirectUrl = `${window.location.protocol}//${slug}.${cleanHost}`;
      } else {
        parts[0] = slug;
        redirectUrl = `${window.location.protocol}//${parts.join(".")}`;
      }
    }
    window.location.href = `${redirectUrl}/login`;
  }

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-300 ${
      theme === "light" 
        ? "bg-[#fafafd] text-[#0f0f15] selection:bg-violet-500/10 selection:text-violet-900" 
        : "bg-[#06060a] text-[#f0f0f5] selection:bg-violet-500/30 selection:text-violet-200"
    }`}>
      <div className={`fixed inset-0 z-0 pointer-events-none opacity-60 transition-opacity duration-300 bg-[size:40px_40px] ${
        theme === "light"
          ? "bg-[linear-gradient(rgba(9,9,11,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(9,9,11,0.02)_1px,transparent_1px)]"
          : "bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)]"
      }`} />
      
      <header className={`relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center border-b transition-colors duration-300 ${
        theme === "light" ? "border-black/5" : "border-white/5"
      }`}>
        <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kivoni-symbol.svg"
              alt="Kivoni Logo"
              className="h-[50px] w-auto max-w-[200px] object-contain"
            />
          <span className={`text-sm font-medium hidden sm:inline ${
            theme === "light" ? "text-neutral-500" : "text-white/60"
          }`}>Portal de Lojas</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all duration-200 flex items-center justify-center ${
              theme === "light"
                ? "bg-black/5 border-black/10 text-neutral-600 hover:text-black hover:bg-black/10"
                : "bg-white/5 border-white/10 text-[#8a8a9a] hover:text-white hover:bg-white/10"
            }`}
            aria-label="Alternar tema"
            title={theme === "light" ? "Ativar Modo Escuro" : "Ativar Modo Claro"}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
          
          <Link
            href="/"
            className={`text-sm font-semibold transition-colors duration-200 ${
              theme === "light" ? "text-neutral-500 hover:text-black" : "text-[#8a8a9a] hover:text-white"
            }`}
          >
            Voltar para Home →
          </Link>
        </div>
      </header>

      <main className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center mb-10 space-y-4">
          <h1 className={`text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight ${
            theme === "light" ? "text-neutral-900" : "text-white"
          }`}>
            Acessar <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">Sua Loja</span>
          </h1>
          <p className={`text-lg max-w-md mx-auto ${
            theme === "light" ? "text-neutral-500" : "text-[#8a8a9a]"
          }`}>
            Selecione uma loja cadastrada na plataforma para entrar no seu painel administrativo.
          </p>
        </div>

        <div className="w-full max-w-md mx-auto mb-8 relative">
          <input
            type="text"
            placeholder="Buscar por loja ou link..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full rounded-xl px-5 py-3.5 pl-12 transition-all duration-300 shadow-xl backdrop-blur-md focus:outline-none focus:ring-2 ${
              theme === "light"
                ? "bg-white/90 border border-black/10 text-neutral-900 placeholder-neutral-400 focus:ring-violet-500/30 focus:border-violet-500/50"
                : "bg-[#13131a]/80 border border-white/10 text-[#f0f0f5] placeholder-[#5c5c6c] focus:ring-violet-500/50 focus:border-violet-500/80"
            }`}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 ${
              theme === "light" ? "text-neutral-400" : "text-[#5c5c6c]"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="w-full max-w-2xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p className={`text-sm animate-pulse ${theme === "light" ? "text-neutral-500" : "text-[#8a8a9a]"}`}>
                Carregando lojas cadastradas...
              </p>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-xl text-center shadow-lg">
              <p className="font-semibold">{error}</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className={`border p-10 rounded-xl text-center backdrop-blur-sm shadow-xl ${
              theme === "light" ? "bg-white/50 border-black/5" : "bg-[#13131a]/50 border-white/5"
            }`}>
              <p className={`text-base ${theme === "light" ? "text-neutral-500" : "text-[#8a8a9a]"}`}>
                Nenhuma loja encontrada para &quot;{search}&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredStores.map((store) => (
                <div
                  key={store.slug}
                  onClick={() => handleRedirect(store.slug)}
                  className={`group cursor-pointer p-5 rounded-2xl flex items-center justify-between transition-all duration-300 shadow-md hover:shadow-violet-500/5 hover:-translate-y-0.5 backdrop-blur-sm ${
                    theme === "light"
                      ? "bg-white/80 hover:bg-white border border-black/5 hover:border-violet-500/20"
                      : "bg-[#13131a]/60 hover:bg-[#13131a] border border-white/5 hover:border-violet-500/30"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {store.branding?.logoUrl ? (
                      <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                        <Image
                          src={store.branding.logoUrl}
                          alt={store.name}
                          fill
                          sizes="48px"
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${store.branding?.primaryColor || "#7c3aed"}, ${store.branding?.secondaryColor || "#06b6d4"})`,
                        }}
                      >
                        {store.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <h3 className={`font-bold text-base transition-colors duration-200 ${
                        theme === "light" ? "text-neutral-800 group-hover:text-black" : "text-[#f0f0f5] group-hover:text-white"
                      }`}>
                        {store.name}
                      </h3>
                      <p className={`text-xs font-mono mt-0.5 ${
                        theme === "light" ? "text-neutral-400" : "text-[#8a8a9a]"
                      }`}>
                        {store.slug}.kivoni.com.br
                      </p>
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                    theme === "light"
                      ? "bg-black/5 group-hover:bg-violet-500/10 text-neutral-400 group-hover:text-violet-600"
                      : "bg-white/5 group-hover:bg-violet-500/15 text-[#8a8a9a] group-hover:text-violet-400"
                  }`}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform duration-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className={`relative z-10 w-full py-8 text-center text-xs border-t transition-colors duration-300 ${
        theme === "light" ? "border-black/5 text-neutral-400" : "border-white/5 text-[#5c5c6c]"
      }`}>
        <p>© {new Date().getFullYear()} Kivoni. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [subdomainActive, setSubdomainActive] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setSubdomainActive(hasSubdomain());
    const savedTheme = localStorage.getItem("kivo-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("kivo-theme", nextTheme);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06060a]">
        …
      </div>
    );
  }

  if (!subdomainActive) {
    return <StoreDirectory theme={theme} toggleTheme={toggleTheme} />;
  }

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
