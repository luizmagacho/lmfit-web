"use client";

import { useTheme } from "next-themes";
import { useLanguage } from "@/context/LanguageContext";
import { lmfitTokens, lmfitLogoSrc } from "@/theme/tokens";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Languages, Palette, Upload } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { useTenantStore } from "@/stores/useTenantStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { http } from "@/lib/http";

export function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  const { tenant, slug } = useTenant();
  const setTenantBranding = useTenantStore((s) => s.setTenantBranding);
  const user = useAuthStore((s) => s.user);

  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [secondaryColor, setSecondaryColor] = useState("#06b6d4");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [infinitePayTag, setInfinitePayTag] = useState("");
  const [infinitePayApiKey, setInfinitePayApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaWhatsappVerifyToken, setMetaWhatsappVerifyToken] = useState("");
  const [metaWhatsappPhoneNumberId, setMetaWhatsappPhoneNumberId] = useState("");
  const [metaWhatsappAccessToken, setMetaWhatsappAccessToken] = useState("");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize values when tenant is loaded
  useEffect(() => {
    if (tenant?.branding) {
      setPrimaryColor(tenant.branding.primaryColor || "#7c3aed");
      setSecondaryColor(tenant.branding.secondaryColor || "#06b6d4");
      setLogoUrl(tenant.branding.logoUrl || "");
      setFaviconUrl(tenant.branding.faviconUrl || "");
    }
  }, [tenant]);

  // Load detailed tenant configurations (with sensitive API key/tag) for admins
  useEffect(() => {
    if (user?.role === "admin" && user?.tenantId) {
      http.get(`/tenants/${user.tenantId}`)
        .then(({ data }) => {
          if (data) {
            setPrimaryColor(data.branding?.primaryColor || "#7c3aed");
            setSecondaryColor(data.branding?.secondaryColor || "#06b6d4");
            setLogoUrl(data.branding?.logoUrl || "");
            setFaviconUrl(data.branding?.faviconUrl || "");
            setInfinitePayTag(data.infinitePayTag || "");
            setInfinitePayApiKey(data.infinitePayApiKey || "");
            setGeminiApiKey(data.geminiApiKey || "");
            setMetaAppSecret(data.metaAppSecret || "");
            setMetaWhatsappVerifyToken(data.metaWhatsappVerifyToken || "");
            setMetaWhatsappPhoneNumberId(data.metaWhatsappPhoneNumberId || "");
            setMetaWhatsappAccessToken(data.metaWhatsappAccessToken || "");
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar dados completos do tenant:", err);
        });
    }
  }, [user]);

  if (!mounted) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === "logo") setUploadingLogo(true);
    else setUploadingFavicon(true);

    setErrorMsg("");
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Call products/images upload endpoint
      const { data } = await http.post<{ url: string }>("/products/images", formData);
      
      if (target === "logo") {
        setLogoUrl(data.url);
      } else {
        setFaviconUrl(data.url);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro ao fazer upload do arquivo. Use apenas JPEG/PNG até 5MB.");
    } finally {
      setUploadingLogo(false);
      setUploadingFavicon(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "admin") {
      setErrorMsg("Apenas administradores podem alterar as configurações de customização.");
      return;
    }
    if (!user?.tenantId) {
      setErrorMsg("Identificação da loja (tenantId) ausente.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        primaryColor,
        secondaryColor,
        logoUrl: logoUrl.trim() || undefined,
        faviconUrl: faviconUrl.trim() || undefined,
        infinitePayTag: infinitePayTag.trim() || undefined,
        infinitePayApiKey: infinitePayApiKey.trim() || undefined,
        geminiApiKey: geminiApiKey.trim() || undefined,
        metaAppSecret: metaAppSecret.trim() || undefined,
        metaWhatsappVerifyToken: metaWhatsappVerifyToken.trim() || undefined,
        metaWhatsappPhoneNumberId: metaWhatsappPhoneNumberId.trim() || undefined,
        metaWhatsappAccessToken: metaWhatsappAccessToken.trim() || undefined,
      };

      // Call PATCH /tenants/:id/branding
      await http.patch(`/tenants/${user.tenantId}/branding`, payload);

      // Instantly update Zustand store so the client layout re-themes
      setTenantBranding(payload);
      setSuccessMsg("Customização salva com sucesso! O visual foi atualizado instantaneamente.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Ocorreu um erro ao salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
          {language === "en" ? "Settings" : "Configurações"}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: lmfitTokens.textMuted }}>
          {language === "en" 
            ? "Manage your application preferences and personalization." 
            : "Gerencie suas preferências e personalização do sistema."}
        </p>
      </div>

      <div className="space-y-6">
        
        {/* Customization Section (Admin Only) */}
        {user?.role === "admin" && (
          <section className="rounded-2xl border p-6 md:p-8 bg-[var(--card-bg)] shadow-sm" style={{ borderColor: lmfitTokens.border }}>
            <div className="flex items-start gap-3.5 mb-6">
              <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-500 flex-shrink-0">
                <Palette size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: lmfitTokens.text }}>
                  {language === "en" ? "Store Personalization" : "Customização da Loja"}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                  {language === "en" 
                    ? "Configure your logo, favicon, and brand colors to personalize your customer workspace." 
                    : "Configure a identidade visual da sua marca, incluindo logotipo, favicon e cores principais do painel."}
                </p>
              </div>
            </div>

            {successMsg && (
              <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveBranding} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Inputs Column (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Cores */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">
                      {language === "en" ? "Brand Colors" : "Cores da Loja"}
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Cor Primária</label>
                        <div className="flex items-center gap-2.5 p-2 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 transition-colors" style={{ borderColor: lmfitTokens.border }}>
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 relative flex-shrink-0 shadow-sm">
                            <input
                              type="color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-[1.5]"
                              style={{ backgroundColor: primaryColor }}
                            />
                          </div>
                          <input
                            type="text"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="flex-1 bg-transparent border-0 outline-none text-sm font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
                            maxLength={7}
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Cor Secundária</label>
                        <div className="flex items-center gap-2.5 p-2 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 transition-colors" style={{ borderColor: lmfitTokens.border }}>
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 relative flex-shrink-0 shadow-sm">
                            <input
                              type="color"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-[1.5]"
                              style={{ backgroundColor: secondaryColor }}
                            />
                          </div>
                          <input
                            type="text"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="flex-1 bg-transparent border-0 outline-none text-sm font-mono uppercase tracking-wider text-neutral-700 dark:text-neutral-300"
                            maxLength={7}
                            placeholder="#000000"
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Uploads */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">
                      {language === "en" ? "Branding Assets" : "Ativos Visuais"}
                    </h3>

                    {/* Logo */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Logotipo da Loja</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2.5 p-2 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50" style={{ borderColor: lmfitTokens.border }}>
                          {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt="Logo preview" className="w-6 h-6 object-contain rounded-md border bg-black/10 dark:bg-white/10" />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[8px] font-bold text-neutral-400 select-none">
                              IMG
                            </div>
                          )}
                          <input
                            type="text"
                            placeholder="https://sua-url-do-logo.png"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            className="flex-1 bg-transparent border-0 outline-none text-sm text-neutral-700 dark:text-neutral-300 truncate"
                          />
                        </div>
                        <label className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] select-none flex-shrink-0" style={{ borderColor: lmfitTokens.border }}>
                          <Upload size={16} className="text-neutral-500" />
                          <span>{uploadingLogo ? "..." : "Subir"}</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={(e) => handleFileUpload(e, "logo")}
                            className="hidden"
                            disabled={uploadingLogo}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Recomendado: fundo transparente (PNG/WEBP), altura de 44px.</p>
                    </div>

                    {/* Favicon */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Ícone da Loja (Favicon)</label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2.5 p-2 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50" style={{ borderColor: lmfitTokens.border }}>
                          {faviconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={faviconUrl} alt="Favicon preview" className="w-6 h-6 object-contain rounded-md border bg-black/10 dark:bg-white/10" />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[8px] font-bold text-neutral-400 select-none">
                              ICO
                            </div>
                          )}
                          <input
                            type="text"
                            placeholder="https://sua-url-do-favicon.ico"
                            value={faviconUrl}
                            onChange={(e) => setFaviconUrl(e.target.value)}
                            className="flex-1 bg-transparent border-0 outline-none text-sm text-neutral-700 dark:text-neutral-300 truncate"
                          />
                        </div>
                        <label className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] select-none flex-shrink-0" style={{ borderColor: lmfitTokens.border }}>
                          <Upload size={16} className="text-neutral-500" />
                          <span>{uploadingFavicon ? "..." : "Subir"}</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/x-icon, image/vnd.microsoft.icon"
                            onChange={(e) => handleFileUpload(e, "favicon")}
                            className="hidden"
                            disabled={uploadingFavicon}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Recomendado: formato quadrado (32x32 ou 64x64 pixels).</p>
                    </div>

                    {/* Pagamentos / InfinitePay */}
                    <div className="space-y-4 pt-6 border-t" style={{ borderColor: lmfitTokens.border }}>
                      <div>
                        <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">
                          {language === "en" ? "Payment Integration" : "Integração de Pagamento (InfinitePay)"}
                        </h3>
                        <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
                          {language === "en"
                            ? "Configure credit card and Pix checkout using your InfinitePay merchant credentials."
                            : "Configure o checkout de cartão de crédito e Pix utilizando as credenciais da sua loja na InfinitePay."}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Tag da Loja (InfiniteTag)</label>
                          <input
                            type="text"
                            value={infinitePayTag}
                            onChange={(e) => setInfinitePayTag(e.target.value)}
                            placeholder="Ex: minhaloja"
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                            style={{
                              borderColor: lmfitTokens.border,
                              color: lmfitTokens.text,
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Chave de API (Secret Key)</label>
                          <input
                            type="password"
                            value={infinitePayApiKey}
                            onChange={(e) => setInfinitePayApiKey(e.target.value)}
                            placeholder="Ex: secret_..."
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                            style={{
                              borderColor: lmfitTokens.border,
                              color: lmfitTokens.text,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Preview Mockup Column (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-start">
                  <span className="text-xs font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500 mb-3 block">
                    {language === "en" ? "Real-time Theme Mockup" : "Visualização do Tema"}
                  </span>
                  
                  {/* Browser Mockup */}
                  <div className="border rounded-2xl overflow-hidden shadow-sm flex flex-col h-[280px]" style={{ borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }}>
                    {/* Browser Toolbar */}
                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 border-b select-none" style={{ borderColor: lmfitTokens.border }}>
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <div className="flex-1 bg-white dark:bg-neutral-800 rounded-md text-[9px] py-0.5 px-3 ml-4 text-center truncate text-neutral-400 dark:text-neutral-500 font-mono">
                        {slug || "loja"}.kivoni.com.br
                      </div>
                    </div>

                    {/* Mock Content */}
                    <div className="flex-1 flex bg-neutral-50 dark:bg-neutral-950 font-sans text-xs">
                      {/* Sidebar Mockup */}
                      <div className="w-[85px] bg-white dark:bg-neutral-900 border-r flex flex-col p-2 gap-3" style={{ borderColor: lmfitTokens.border }}>
                        <div className="flex justify-center items-center py-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/kivoni-symbol.svg"
                            alt="Logo Mockup"
                            className="h-6 w-6 object-contain"
                          />
                        </div>
                        {/* Nav Items Mockup */}
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-1 rounded px-1.5 py-1 select-none" style={{ backgroundColor: `color-mix(in srgb, ${primaryColor} 15%, transparent)`, color: primaryColor }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }} />
                            <span className="scale-[0.8] origin-left font-semibold">Painel</span>
                          </div>
                          <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 px-1.5 py-0.5 select-none">
                            <div className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                            <span className="scale-[0.8] origin-left">Vendas</span>
                          </div>
                          <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 px-1.5 py-0.5 select-none">
                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                            <span className="scale-[0.8] origin-left">Ajustes</span>
                          </div>
                        </div>
                      </div>

                      {/* Main Body Mockup */}
                      <div className="flex-1 flex flex-col p-3 gap-3 bg-[var(--lmfit-surface)]">
                        <div className="flex justify-between items-center select-none">
                          <span className="font-bold text-[9px] text-neutral-700 dark:text-neutral-300">Minha Loja</span>
                          <div className="w-3.5 h-3.5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                        </div>

                        {/* Sample Card */}
                        <div className="rounded-xl border p-2.5 bg-white dark:bg-neutral-900 flex flex-col gap-2 flex-1 justify-between shadow-sm" style={{ borderColor: lmfitTokens.border }}>
                          <div className="space-y-1">
                            <div className="h-2 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
                            <div className="h-1.5 w-10 bg-neutral-100 dark:bg-neutral-800 rounded" />
                          </div>
                          
                          <div className="flex gap-1.5 mt-2">
                            <button
                              type="button"
                              className="px-2 py-1 text-[8px] font-bold rounded text-white transition-all select-none shadow-sm"
                              style={{ backgroundColor: primaryColor }}
                            >
                              Primário
                            </button>
                            <button
                              type="button"
                              className="px-2 py-1 text-[8px] font-bold rounded border transition-all select-none"
                              style={{ borderColor: secondaryColor, color: secondaryColor }}
                            >
                              Contorno
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end pt-4 border-t" style={{ borderColor: lmfitTokens.border }}>
                <button
                  type="submit"
                  disabled={saving || uploadingLogo || uploadingFavicon}
                  className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  style={{ backgroundColor: lmfitTokens.primary }}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Salvando...
                    </span>
                  ) : "Salvar Customização"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Appearance Section */}
        <section className="rounded-xl border p-6 bg-[var(--lmfit-surface)]" style={{ borderColor: lmfitTokens.border }}>
          <div className="flex items-center gap-2 mb-4">
            <Monitor size={20} style={{ color: lmfitTokens.primary }} />
            <h2 className="text-lg font-medium" style={{ color: lmfitTokens.text }}>
              {language === "en" ? "Appearance" : "Aparência"}
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: lmfitTokens.textMuted }}>
            {language === "en" 
              ? "Customize the theme of your workspace." 
              : "Personalize o tema da sua área de trabalho."}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setTheme("light")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
              style={{
                borderColor: theme === "light" ? lmfitTokens.primary : lmfitTokens.border,
                backgroundColor: theme === "light" ? `color-mix(in srgb, ${lmfitTokens.primary} 10%, transparent)` : "transparent",
                color: theme === "light" ? lmfitTokens.primary : lmfitTokens.text,
              }}
            >
              <Sun size={18} />
              {language === "en" ? "Light Mode" : "Modo Claro"}
            </button>
            <button
              onClick={() => setTheme("dark")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
              style={{
                borderColor: theme === "dark" ? lmfitTokens.primary : lmfitTokens.border,
                backgroundColor: theme === "dark" ? `color-mix(in srgb, ${lmfitTokens.primary} 10%, transparent)` : "transparent",
                color: theme === "dark" ? lmfitTokens.primary : lmfitTokens.text,
              }}
            >
              <Moon size={18} />
              {language === "en" ? "Dark Mode" : "Modo Escuro"}
            </button>
            <button
              onClick={() => setTheme("system")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
              style={{
                borderColor: theme === "system" ? lmfitTokens.primary : lmfitTokens.border,
                backgroundColor: theme === "system" ? `color-mix(in srgb, ${lmfitTokens.primary} 10%, transparent)` : "transparent",
                color: theme === "system" ? lmfitTokens.primary : lmfitTokens.text,
              }}
            >
              <Monitor size={18} />
              {language === "en" ? "System Default" : "Padrão do Sistema"}
            </button>
          </div>
        </section>

        {/* Language Section */}
        <section className="rounded-xl border p-6 bg-[var(--lmfit-surface)]" style={{ borderColor: lmfitTokens.border }}>
          <div className="flex items-center gap-2 mb-4">
            <Languages size={20} style={{ color: lmfitTokens.primary }} />
            <h2 className="text-lg font-medium" style={{ color: lmfitTokens.text }}>
              {language === "en" ? "Language" : "Idioma"}
            </h2>
          </div>
          <p className="text-sm mb-4" style={{ color: lmfitTokens.textMuted }}>
            {language === "en" 
              ? "Select your preferred language. (Note: Only core menus and Financial module will translate immediately)" 
              : "Selecione o idioma de sua preferência. (Nota: Apenas menus centrais e o módulo Financeiro serão traduzidos imediatamente)"}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setLanguage("pt-BR")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
              style={{
                borderColor: language === "pt-BR" ? lmfitTokens.primary : lmfitTokens.border,
                backgroundColor: language === "pt-BR" ? `color-mix(in srgb, ${lmfitTokens.primary} 10%, transparent)` : "transparent",
                color: language === "pt-BR" ? lmfitTokens.primary : lmfitTokens.text,
              }}
            >
              🇧🇷 Português (BR)
            </button>
            <button
              onClick={() => setLanguage("en")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors"
              style={{
                borderColor: language === "en" ? lmfitTokens.primary : lmfitTokens.border,
                backgroundColor: language === "en" ? `color-mix(in srgb, ${lmfitTokens.primary} 10%, transparent)` : "transparent",
                color: language === "en" ? lmfitTokens.primary : lmfitTokens.text,
              }}
            >
              🇺🇸 English (US)
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
