"use client";

import { useTheme } from "next-themes";
import { useLanguage } from "@/context/LanguageContext";
import { lmfitTokens } from "@/theme/tokens";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Languages } from "lucide-react";

export function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <div className="max-w-3xl space-y-8">
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
