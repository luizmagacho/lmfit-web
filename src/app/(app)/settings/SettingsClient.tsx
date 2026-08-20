"use client";

import { useTheme } from "next-themes";
import { useLanguage } from "@/context/LanguageContext";
import { lmfitTokens, lmfitLogoSrc } from "@/theme/tokens";
import { useEffect, useState } from "react";
import AsyncSelect from "react-select/async";
import { Moon, Sun, Monitor, Languages, Palette, Upload, Gift, Truck, BarChart3, Store, ExternalLink, Check, Image as ImageIcon, Plus, X } from "lucide-react";
import { useTenant, GOOGLE_FONT_WEIGHTS } from "@/context/TenantContext";
import { useTenantStore } from "@/stores/useTenantStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { http } from "@/lib/http";
import { extractListItems } from "@/lib/normalizeApiList";
import { STOREFRONT_PRESETS, DEFAULT_THEME_PRESET, type ThemePreset } from "@/theme/storefrontPresets";
import { buildStorefrontUrl } from "@/lib/tenantSlug";
import { isValidCep, lookupCep, maskCep, onlyCepDigits } from "@/lib/cep";
import { WhatsappSellersSection } from "./WhatsappSellersSection";

/** (DDD) NNNNN-NNNN (móvel, 9 dígitos) ou (DDD) NNNN-NNNN (formato antigo, 8 dígitos) — mesma
 *  máscara já aplicada ao telefone do cliente no checkout (CatalogFloatingCart.tsx). Função pura
 *  e exportada pra formatar tanto digitação quanto o valor já salvo vindo do servidor. */
export function formatWhatsappNumberMask(raw: string): string {
  let v = raw.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 10) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 6) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length > 0) return `(${v}`;
  return v;
}

export function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  const { tenant, slug } = useTenant();
  const setTenantBranding = useTenantStore((s) => s.setTenantBranding);
  const setTenantShipping = useTenantStore((s) => s.setTenantShipping);
  const setTenantAnalytics = useTenantStore((s) => s.setTenantAnalytics);
  const setTenantStorefront = useTenantStore((s) => s.setTenantStorefront);
  const setTenantWhatsappNumber = useTenantStore((s) => s.setTenantWhatsappNumber);
  const user = useAuthStore((s) => s.user);

  const [primaryColor, setPrimaryColor] = useState("#7c3aed");
  const [secondaryColor, setSecondaryColor] = useState("#06b6d4");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [infinitePayTag, setInfinitePayTag] = useState("");
  // `infinitePayApiKey`, assim como os campos Meta abaixo, NUNCA é hidratado a partir do que o
  // servidor devolve — só `infinitePayApiKeyConfigured` (derivado, exibição) diz se já existe uma
  // chave salva; o campo de texto começa sempre vazio e só é reenviado se o lojista digitar algo
  // novo. Mesmo princípio do `melhorEnvioToken` (Loop 27).
  const [infinitePayApiKey, setInfinitePayApiKey] = useState("");
  const [infinitePayApiKeyConfigured, setInfinitePayApiKeyConfigured] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  // metaAppSecret/metaWhatsappVerifyToken/metaWhatsappAccessToken são criptografados no backend
  // (EncryptionService, prefixo "enc:v1:...") — hidratar `value` a partir do que o servidor devolve
  // colocaria o texto cifrado bruto no DOM. Mesmo tratamento do `melhorEnvioToken` (Loop 27): só o
  // booleano "*Configured" (derivado da presença de valor salvo) é usado pra exibição.
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaAppSecretConfigured, setMetaAppSecretConfigured] = useState(false);
  const [metaWhatsappVerifyToken, setMetaWhatsappVerifyToken] = useState("");
  const [metaWhatsappVerifyTokenConfigured, setMetaWhatsappVerifyTokenConfigured] = useState(false);
  const [metaWhatsappPhoneNumberId, setMetaWhatsappPhoneNumberId] = useState("");
  const [metaWhatsappAccessToken, setMetaWhatsappAccessToken] = useState("");
  const [metaWhatsappAccessTokenConfigured, setMetaWhatsappAccessTokenConfigured] = useState(false);
  const [whatsappAiEnabled, setWhatsappAiEnabled] = useState(false);
  // Número de contato pra onde os checkouts (/loja e /catalogo) mandam o cliente no WhatsApp —
  // distinto da API oficial da Meta abaixo (aquela é pra IA responder automaticamente; este é só
  // o "pra qual número o wa.me aponta"). Sem este campo não havia como o lojista configurar isso
  // pela tela; o /catalogo usava um número fixo no código e o /loja ficava com o campo vazio.
  const [whatsappNumber, setWhatsappNumber] = useState("");
  // Mesma máscara já usada no checkout do /catalogo (CatalogFloatingCart.tsx) — dígitos puros
  // formatados como (DDD) NNNNN-NNNN (móvel, 9 dígitos) ou (DDD) NNNN-NNNN (formato antigo,
  // 8 dígitos), decidido pela quantidade de dígitos já digitados. Função pura (não presa ao
  // evento de input) pra poder formatar também o valor que já vem salvo do servidor — sem
  // isso, um número salvo aparecia sem máscara até o usuário digitar algo nele.
  const handleWhatsappNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsappNumber(formatWhatsappNumberMask(e.target.value));
  };

  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyPointsPerBRL, setLoyaltyPointsPerBRL] = useState(1);
  const [loyaltyRedeemValue, setLoyaltyRedeemValue] = useState(0.01);

  const [pickupLabel, setPickupLabel] = useState("");
  const [standardFee, setStandardFee] = useState(19.9);
  const [expressFee, setExpressFee] = useState(39.9);
  const [freeAboveTotal, setFreeAboveTotal] = useState(0);
  // Loop 27 — endereço de origem da loja + credenciais Melhor Envio, necessários pra cotação real
  // de frete. `melhorEnvioToken` NUNCA é hidratado a partir do que o servidor devolve (o valor lá é
  // criptografado, não dá pra mostrar de volta) — só `melhorEnvioTokenConfigured` (derivado, exibição)
  // diz se já existe um token salvo; o campo de texto começa sempre vazio e só é reenviado se o
  // lojista de fato digitar um valor novo.
  const [originCep, setOriginCep] = useState("");
  const [originLogradouro, setOriginLogradouro] = useState("");
  const [originNumero, setOriginNumero] = useState("");
  const [originComplemento, setOriginComplemento] = useState("");
  const [originBairro, setOriginBairro] = useState("");
  const [originCidade, setOriginCidade] = useState("");
  const [originUf, setOriginUf] = useState("");
  const [originCepLooking, setOriginCepLooking] = useState(false);
  const [originCepError, setOriginCepError] = useState("");
  const [melhorEnvioToken, setMelhorEnvioToken] = useState("");
  const [melhorEnvioTokenConfigured, setMelhorEnvioTokenConfigured] = useState(false);
  const [melhorEnvioAmbiente, setMelhorEnvioAmbiente] = useState<"sandbox" | "producao">("sandbox");
  const [savingShipping, setSavingShipping] = useState(false);

  const [metaPixelId, setMetaPixelId] = useState("");
  // Mesmo tratamento do `melhorEnvioToken`/campos Meta acima: os 3 tokens de servidor são
  // criptografados no backend, então só o booleano "*Configured" é derivado do que o servidor
  // devolve — o valor cifrado nunca entra no state que alimenta o `value` do input.
  const [metaConversionsApiToken, setMetaConversionsApiToken] = useState("");
  const [metaConversionsApiTokenConfigured, setMetaConversionsApiTokenConfigured] = useState(false);
  const [ga4MeasurementId, setGa4MeasurementId] = useState("");
  const [ga4ApiSecret, setGa4ApiSecret] = useState("");
  const [ga4ApiSecretConfigured, setGa4ApiSecretConfigured] = useState(false);
  const [tiktokPixelId, setTiktokPixelId] = useState("");
  const [tiktokAccessToken, setTiktokAccessToken] = useState("");
  const [tiktokAccessTokenConfigured, setTiktokAccessTokenConfigured] = useState(false);
  const [savingAnalytics, setSavingAnalytics] = useState(false);

  const [themePreset, setThemePreset] = useState<ThemePreset>(DEFAULT_THEME_PRESET);
  const [storefrontEnabled, setStorefrontEnabled] = useState(true);
  const [savingStorefront, setSavingStorefront] = useState(false);

  // Carrossel de banners promocionais da home — cada slide tem sua própria imagem, produto
  // linkado e título/subtítulo/CTA, todos opcionais; menor/retangular, distinto do hero de
  // título único por preset.
  const [heroBannerSlides, setHeroBannerSlides] = useState<
    Array<{
      imageUrl: string;
      linkedProductSlug: string;
      linkedProductLabel: string;
      title: string;
      subtitle: string;
      ctaLabel: string;
    }>
  >([]);
  const [uploadingHeroIndex, setUploadingHeroIndex] = useState<number | null>(null);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Carrega, num único request, as fontes de exibição dos 10 presets — só usado pelos mini-mockups
  // do seletor de estilo da loja abaixo, nunca aplicado ao resto do painel admin.
  useEffect(() => {
    const families = Array.from(
      new Set(Object.values(STOREFRONT_PRESETS).map((t) => t.fontDisplay)),
    );
    const familyParams = families
      .map((f) => `family=${encodeURIComponent(f)}:wght@${GOOGLE_FONT_WEIGHTS[f] ?? "400;700"}`)
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
    let link = document.querySelector<HTMLLinkElement>("link[data-preset-picker-fonts]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-preset-picker-fonts", "true");
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
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
            setWhatsappNumber(formatWhatsappNumberMask(data.whatsappNumber || ""));
            setInfinitePayTag(data.infinitePayTag || "");
            setInfinitePayApiKeyConfigured(!!data.infinitePayApiKey);
            setGeminiApiKey(data.geminiApiKey || "");
            setMetaAppSecretConfigured(!!data.metaAppSecret);
            setMetaWhatsappVerifyTokenConfigured(!!data.metaWhatsappVerifyToken);
            setMetaWhatsappPhoneNumberId(data.metaWhatsappPhoneNumberId || "");
            setMetaWhatsappAccessTokenConfigured(!!data.metaWhatsappAccessToken);
            setWhatsappAiEnabled(data.whatsappAiEnabled ?? false);
            if (data.loyalty) {
              setLoyaltyEnabled(data.loyalty.enabled ?? false);
              setLoyaltyPointsPerBRL(data.loyalty.pointsPerBRL ?? 1);
              setLoyaltyRedeemValue(data.loyalty.redeemValuePerPoint ?? 0.01);
            }
            if (data.shippingConfig) {
              setPickupLabel(data.shippingConfig.pickupLabel ?? "");
              setStandardFee(data.shippingConfig.standardFee ?? 19.9);
              setExpressFee(data.shippingConfig.expressFee ?? 39.9);
              setFreeAboveTotal(data.shippingConfig.freeAboveTotal ?? 0);
              const origin = data.shippingConfig.originAddress;
              setOriginCep(origin?.cep ? maskCep(origin.cep) : "");
              setOriginLogradouro(origin?.logradouro ?? "");
              setOriginNumero(origin?.numero ?? "");
              setOriginComplemento(origin?.complemento ?? "");
              setOriginBairro(origin?.bairro ?? "");
              setOriginCidade(origin?.cidade ?? "");
              setOriginUf(origin?.uf ?? "");
              setMelhorEnvioTokenConfigured(!!data.shippingConfig.melhorEnvio?.token);
              setMelhorEnvioAmbiente(data.shippingConfig.melhorEnvio?.ambiente ?? "sandbox");
            }
            if (data.storefront) {
              if (data.storefront.themePreset && data.storefront.themePreset in STOREFRONT_PRESETS) {
                setThemePreset(data.storefront.themePreset as ThemePreset);
              }
              setStorefrontEnabled(data.storefront.enabled ?? true);
              const banners = (data.storefront.heroBanners ?? []) as Array<{
                imageUrl?: string;
                linkedProductSlug?: string;
                title?: string;
                subtitle?: string;
                ctaLabel?: string;
              }>;
              const drafts = banners
                .filter((b) => b.imageUrl)
                .map((b) => ({
                  imageUrl: b.imageUrl as string,
                  linkedProductSlug: b.linkedProductSlug ?? "",
                  linkedProductLabel: b.linkedProductSlug ?? "",
                  title: b.title ?? "",
                  subtitle: b.subtitle ?? "",
                  ctaLabel: b.ctaLabel ?? "",
                }));
              setHeroBannerSlides(drafts);
              // Resolve o nome de exibição de cada produto linkado (a config só guarda o slug) —
              // sem bloquear a UI: o slug já aparece como rótulo provisório enquanto isso carrega.
              drafts.forEach((slide, i) => {
                if (!slide.linkedProductSlug) return;
                http
                  .get("/products", { params: { page: 1, limit: 5, search: slide.linkedProductSlug } })
                  .then(({ data: productsData }) => {
                    const items = extractListItems(productsData) as Array<{ slug?: string; name?: string }>;
                    const match = items.find((p) => p.slug === slide.linkedProductSlug);
                    if (match?.name) {
                      setHeroBannerSlides((prev) =>
                        prev.map((s, idx) => (idx === i ? { ...s, linkedProductLabel: match.name as string } : s)),
                      );
                    }
                  })
                  .catch(() => {
                    /* mantém o slug como rótulo se a busca falhar */
                  });
              });
            }
            if (data.analytics) {
              setMetaPixelId(data.analytics.metaPixelId ?? "");
              setMetaConversionsApiTokenConfigured(!!data.analytics.metaConversionsApiToken);
              setGa4MeasurementId(data.analytics.ga4MeasurementId ?? "");
              setGa4ApiSecretConfigured(!!data.analytics.ga4ApiSecret);
              setTiktokPixelId(data.analytics.tiktokPixelId ?? "");
              setTiktokAccessTokenConfigured(!!data.analytics.tiktokAccessToken);
            }
          }
        })
        .catch((err) => {
          console.error("Erro ao carregar dados completos do tenant:", err);
        });
    }
  }, [user]);

  const saveStorefrontTheme = async (preset: ThemePreset, enabled: boolean) => {
    if (user?.role !== "admin" || !user?.tenantId) return;
    setSavingStorefront(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const payload = {
        themePreset: preset,
        enabled,
        heroBanners: heroBannerSlides
          .filter((s) => s.imageUrl.trim())
          .map((s) => ({
            imageUrl: s.imageUrl.trim(),
            linkedProductSlug: s.linkedProductSlug || undefined,
            title: s.title.trim() || undefined,
            subtitle: s.subtitle.trim() || undefined,
            ctaLabel: s.ctaLabel.trim() || undefined,
          })),
      };
      await http.patch(`/tenants/${user.tenantId}/storefront`, payload);
      setTenantStorefront(payload);
      setSuccessMsg(language === "en" ? "Store style saved successfully!" : "Estilo da loja salvo com sucesso!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Erro ao salvar o estilo da loja.");
    } finally {
      setSavingStorefront(false);
    }
  };

  const handleSaveStorefrontTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveStorefrontTheme(themePreset, storefrontEnabled);
  };

  const handleViewLive = async () => {
    // Loop 4c: salva o preset recém-clicado antes de abrir, senão a aba abre com o preset
    // ainda salvo (parece um no-op pro lojista que acabou de trocar e clicar em "Ver ao vivo").
    await saveStorefrontTheme(themePreset, storefrontEnabled);
    const url = buildStorefrontUrl(slug || "loja", window.location.hostname, window.location.port);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!mounted) return null;

  // Design system: every section icon derives from the tenant's own brand colors instead of an
  // arbitrary Tailwind hue per section — same color-mix formula as the "Customização" icon.
  const iconBadgeStyle = (hex: string) => ({
    backgroundColor: `color-mix(in srgb, ${hex} 12%, transparent)`,
    color: hex,
  });

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

  const handleHeroSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHeroIndex(index);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await http.post<{ url: string }>("/products/images", formData);
      setHeroBannerSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageUrl: data.url } : s)));
    } catch (err) {
      console.error(err);
      setErrorMsg("Erro ao fazer upload do arquivo. Use apenas JPEG/PNG até 5MB.");
    } finally {
      setUploadingHeroIndex(null);
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
        whatsappNumber: whatsappNumber.trim() || undefined,
        infinitePayTag: infinitePayTag.trim() || undefined,
        infinitePayApiKey: infinitePayApiKey.trim() || undefined,
        geminiApiKey: geminiApiKey.trim() || undefined,
        metaAppSecret: metaAppSecret.trim() || undefined,
        metaWhatsappVerifyToken: metaWhatsappVerifyToken.trim() || undefined,
        metaWhatsappPhoneNumberId: metaWhatsappPhoneNumberId.trim() || undefined,
        metaWhatsappAccessToken: metaWhatsappAccessToken.trim() || undefined,
        whatsappAiEnabled,
      };

      // Call PATCH /tenants/:id/branding
      await http.patch(`/tenants/${user.tenantId}/branding`, payload);

      // Instantly update Zustand store so the client layout re-themes
      setTenantBranding(payload);
      // whatsappNumber é campo de topo em TenantInfo (não aninhado em branding) — setTenantBranding
      // mistura tudo dentro de tenant.branding.*, então sem isso o cache local ficava com o valor
      // antigo até um refresh completo, mesmo o checkout já lendo tenant.whatsappNumber direto.
      setTenantWhatsappNumber(whatsappNumber.trim());
      // Os campos de credencial nunca ficam com o valor digitado no state depois de salvos — só a
      // confirmação de que agora existe algo salvo, mesmo princípio do `melhorEnvioToken`.
      if (infinitePayApiKey.trim()) {
        setInfinitePayApiKeyConfigured(true);
        setInfinitePayApiKey("");
      }
      if (metaAppSecret.trim()) {
        setMetaAppSecretConfigured(true);
        setMetaAppSecret("");
      }
      if (metaWhatsappVerifyToken.trim()) {
        setMetaWhatsappVerifyTokenConfigured(true);
        setMetaWhatsappVerifyToken("");
      }
      if (metaWhatsappAccessToken.trim()) {
        setMetaWhatsappAccessTokenConfigured(true);
        setMetaWhatsappAccessToken("");
      }
      setSuccessMsg("Customização salva com sucesso! O visual foi atualizado instantaneamente.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Ocorreu um erro ao salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "admin") return;
    if (!user?.tenantId) return;

    setSavingShipping(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const hasOriginAddress = isValidCep(originCep) && originLogradouro.trim() && originBairro.trim() && originCidade.trim() && originUf.trim();
      const payload = {
        pickupLabel: pickupLabel.trim() || undefined,
        standardFee,
        expressFee,
        freeAboveTotal: freeAboveTotal || undefined,
        originAddress: hasOriginAddress
          ? {
              cep: maskCep(originCep),
              logradouro: originLogradouro.trim(),
              numero: originNumero.trim() || undefined,
              complemento: originComplemento.trim() || undefined,
              bairro: originBairro.trim(),
              cidade: originCidade.trim(),
              uf: originUf.trim().toUpperCase(),
            }
          : undefined,
        // Só reenvia o token se o lojista digitou algo novo — string vazia/undefined preserva o
        // que já estava salvo (o backend nunca troca o token sem um valor de verdade).
        melhorEnvioToken: melhorEnvioToken.trim() || undefined,
        melhorEnvioAmbiente,
      };
      await http.patch(`/tenants/${user.tenantId}/shipping`, payload);
      // O token nunca entra no estado local (nem veio da resposta, nem é reidratado) — só a
      // confirmação de que agora existe algum, se foi de fato trocado nesta chamada.
      const { melhorEnvioToken: _sentToken, ...storeable } = payload;
      setTenantShipping({
        ...storeable,
        melhorEnvio: { ambiente: melhorEnvioAmbiente },
      });
      if (melhorEnvioToken.trim()) {
        setMelhorEnvioTokenConfigured(true);
        setMelhorEnvioToken("");
      }
      setSuccessMsg(language === "en" ? "Shipping settings saved successfully!" : "Frete salvo com sucesso!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Erro ao salvar as configurações de frete.");
    } finally {
      setSavingShipping(false);
    }
  };

  const handleOriginCepBlur = async () => {
    const digits = onlyCepDigits(originCep);
    if (digits.length !== 8) {
      if (digits.length > 0) setOriginCepError(language === "en" ? "Invalid ZIP code." : "CEP inválido.");
      return;
    }
    setOriginCepError("");
    setOriginCepLooking(true);
    const data = await lookupCep(digits);
    setOriginCepLooking(false);
    if (!data) {
      setOriginCepError(language === "en" ? "ZIP code not found. Fill in manually." : "Não encontramos esse CEP. Preencha manualmente.");
      return;
    }
    setOriginCep(data.cep);
    if (data.logradouro) setOriginLogradouro(data.logradouro);
    if (data.bairro) setOriginBairro(data.bairro);
    if (data.cidade) setOriginCidade(data.cidade);
    if (data.uf) setOriginUf(data.uf);
  };

  const handleSaveAnalytics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "admin") return;
    if (!user?.tenantId) return;

    setSavingAnalytics(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = {
        metaPixelId: metaPixelId.trim() || undefined,
        metaConversionsApiToken: metaConversionsApiToken.trim() || undefined,
        ga4MeasurementId: ga4MeasurementId.trim() || undefined,
        ga4ApiSecret: ga4ApiSecret.trim() || undefined,
        tiktokPixelId: tiktokPixelId.trim() || undefined,
        tiktokAccessToken: tiktokAccessToken.trim() || undefined,
      };
      await http.patch(`/tenants/${user.tenantId}/analytics`, payload);
      setTenantAnalytics({
        metaPixelId: payload.metaPixelId,
        ga4MeasurementId: payload.ga4MeasurementId,
        tiktokPixelId: payload.tiktokPixelId,
      });
      if (metaConversionsApiToken.trim()) {
        setMetaConversionsApiTokenConfigured(true);
        setMetaConversionsApiToken("");
      }
      if (ga4ApiSecret.trim()) {
        setGa4ApiSecretConfigured(true);
        setGa4ApiSecret("");
      }
      if (tiktokAccessToken.trim()) {
        setTiktokAccessTokenConfigured(true);
        setTiktokAccessToken("");
      }
      setSuccessMsg(language === "en" ? "Analytics settings saved successfully!" : "Analytics salvo com sucesso!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Erro ao salvar as configurações de analytics.");
    } finally {
      setSavingAnalytics(false);
    }
  };

  const handleSaveLoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "admin") return;
    if (!user?.tenantId) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await http.patch(`/tenants/${user.tenantId}/loyalty`, {
        enabled: loyaltyEnabled,
        pointsPerBRL: loyaltyPointsPerBRL,
        redeemValuePerPoint: loyaltyRedeemValue
      });
      setSuccessMsg(language === "en" ? "Loyalty settings saved successfully!" : "Fidelidade salva com sucesso!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Erro ao salvar as configurações de fidelidade.");
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
              <div
                className="p-2.5 rounded-xl flex-shrink-0 transition-colors"
                style={iconBadgeStyle(primaryColor)}
              >
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

                    {/* WhatsApp de contato — pra onde o checkout do /loja e do /catalogo manda o
                        cliente confirmar o pedido; diferente da API oficial da Meta logo abaixo,
                        que é só pra IA responder automaticamente. */}
                    <div className="space-y-4 pt-6 border-t" style={{ borderColor: lmfitTokens.border }}>
                      <div>
                        <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">
                          {language === "en" ? "Order Contact" : "Contato para Pedidos"}
                        </h3>
                        <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
                          {language === "en"
                            ? "The WhatsApp number your customers are sent to when they finish a checkout on your storefront or catalog."
                            : "O número de WhatsApp para onde o cliente é enviado ao finalizar um pedido na sua loja online ou catálogo."}
                        </p>
                      </div>
                      <div className="max-w-sm space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                          {language === "en" ? "WhatsApp number" : "Número de WhatsApp"}
                        </label>
                        <input
                          type="tel"
                          value={whatsappNumber}
                          onChange={handleWhatsappNumberChange}
                          placeholder="Ex: (41) 99677-0521"
                          className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                        />
                      </div>
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
                          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                            Chave de API (Secret Key)
                            {infinitePayApiKeyConfigured ? (
                              <span className="ml-2 font-normal normal-case" style={{ color: lmfitTokens.success }}>
                                {language === "en" ? "· configured" : "· configurado"}
                              </span>
                            ) : null}
                          </label>
                          <input
                            type="password"
                            value={infinitePayApiKey}
                            onChange={(e) => setInfinitePayApiKey(e.target.value)}
                            placeholder={infinitePayApiKeyConfigured ? "••••••••••••••••" : "Ex: secret_..."}
                            autoComplete="off"
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                            style={{
                              borderColor: lmfitTokens.border,
                              color: lmfitTokens.text,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Business API + IA (Loop 11-A) */}
                    <div className="space-y-4 pt-6 border-t" style={{ borderColor: lmfitTokens.border }}>
                      <div>
                        <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">
                          {language === "en" ? "WhatsApp Business API" : "WhatsApp Business API"}
                        </h3>
                        <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
                          {language === "en"
                            ? "Connect your own Meta WhatsApp Business account to receive orders and let the AI answer customers automatically."
                            : "Conecte a conta do WhatsApp Business da sua loja na Meta para receber pedidos e deixar a IA responder clientes automaticamente."}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Phone Number ID</label>
                          <input
                            type="text"
                            value={metaWhatsappPhoneNumberId}
                            onChange={(e) => setMetaWhatsappPhoneNumberId(e.target.value)}
                            placeholder="Ex: 109876543210987"
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                            Access Token
                            {metaWhatsappAccessTokenConfigured ? (
                              <span className="ml-2 font-normal normal-case" style={{ color: lmfitTokens.success }}>
                                {language === "en" ? "· configured" : "· configurado"}
                              </span>
                            ) : null}
                          </label>
                          <input
                            type="password"
                            value={metaWhatsappAccessToken}
                            onChange={(e) => setMetaWhatsappAccessToken(e.target.value)}
                            placeholder={metaWhatsappAccessTokenConfigured ? "••••••••••••••••" : "Ex: EAAG..."}
                            autoComplete="off"
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                            App Secret
                            {metaAppSecretConfigured ? (
                              <span className="ml-2 font-normal normal-case" style={{ color: lmfitTokens.success }}>
                                {language === "en" ? "· configured" : "· configurado"}
                              </span>
                            ) : null}
                          </label>
                          <input
                            type="password"
                            value={metaAppSecret}
                            onChange={(e) => setMetaAppSecret(e.target.value)}
                            placeholder={metaAppSecretConfigured ? "••••••••••••••••" : "Ex: 32a1b..."}
                            autoComplete="off"
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                            Verify Token
                            {metaWhatsappVerifyTokenConfigured ? (
                              <span className="ml-2 font-normal normal-case" style={{ color: lmfitTokens.success }}>
                                {language === "en" ? "· configured" : "· configurado"}
                              </span>
                            ) : null}
                          </label>
                          <input
                            type="text"
                            value={metaWhatsappVerifyToken}
                            onChange={(e) => setMetaWhatsappVerifyToken(e.target.value)}
                            placeholder={
                              metaWhatsappVerifyTokenConfigured
                                ? "••••••••••••••••"
                                : language === "en" ? "A password you choose" : "Uma senha que você escolhe"
                            }
                            autoComplete="off"
                            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                        <input
                          type="checkbox"
                          checked={whatsappAiEnabled}
                          onChange={(e) => setWhatsappAiEnabled(e.target.checked)}
                          className="w-4 h-4 rounded accent-violet-500"
                        />
                        <span className="text-sm" style={{ color: lmfitTokens.text }}>
                          {language === "en"
                            ? "Let the AI automatically answer customers on WhatsApp"
                            : "Deixar a IA responder clientes automaticamente no WhatsApp"}
                        </span>
                      </label>
                    </div>

                    <WhatsappSellersSection />

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
                            src={logoUrl || "/kivoni-symbol.svg"}
                            alt="Logo Mockup"
                            className="h-6 max-w-[64px] object-contain"
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

        {/* Storefront Theme Section (Admin Only) */}
        {user?.role === "admin" && (
          <section className="rounded-2xl border p-6 md:p-8 bg-[var(--card-bg)] shadow-sm" style={{ borderColor: lmfitTokens.border }}>
            <form onSubmit={handleSaveStorefrontTheme}>
              <div className="flex items-start justify-between gap-3.5 mb-6 flex-wrap">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl flex-shrink-0" style={iconBadgeStyle(primaryColor)}>
                    <Store size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: lmfitTokens.text }}>
                      {language === "en" ? "Online Store" : "Loja Online"}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                      {language === "en"
                        ? "Choose your public storefront's (/loja) visual style — layout and typography change, not just color."
                        : "Escolha o estilo visual da sua loja pública (/loja) — muda o layout e a tipografia, não só a cor."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleViewLive}
                  disabled={savingStorefront}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer flex-shrink-0"
                  style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                >
                  <ExternalLink size={15} />
                  {language === "en" ? "View live" : "Ver ao vivo"}
                </button>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between border p-4 rounded-xl bg-gray-50/50 dark:bg-neutral-900/50 mb-6" style={{ borderColor: lmfitTokens.border }}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                    {language === "en" ? "Store enabled" : "Loja habilitada"}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                    {language === "en"
                      ? "Turn off to show visitors a temporarily-unavailable page."
                      : "Desligue para mostrar aos visitantes uma página de indisponibilidade temporária."}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storefrontEnabled}
                    onChange={(e) => setStorefrontEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{ backgroundColor: storefrontEnabled ? primaryColor : undefined }}
                  />
                </label>
              </div>

              {/* Banners da Home (carrossel) */}
              <div className="border rounded-xl p-4 mb-6 space-y-4" style={{ borderColor: lmfitTokens.border }}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                    {language === "en" ? "Home banners (carousel)" : "Banners da Home (carrossel)"}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                    {language === "en"
                      ? "Small rectangular promo banners at the top of your store — add as many as you like, each one links to a different product."
                      : "Banners promocionais pequenos e retangulares no topo da sua loja — adicione quantos quiser, cada um leva pra um produto diferente."}
                  </p>
                  <p className="text-[10px] mt-1.5" style={{ color: lmfitTokens.textMuted }}>
                    {language === "en"
                      ? "Recommended image size: at least 1500×500px (3:1, rectangular) — the same image works for every banner."
                      : "Tamanho mínimo recomendado da imagem: 1500×500px (proporção 3:1, retangular) — vale pra qualquer banner."}
                  </p>
                </div>

                <div className="space-y-3">
                  {heroBannerSlides.map((slide, index) => (
                    <div
                      key={index}
                      className="space-y-2.5 p-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50"
                      style={{ borderColor: lmfitTokens.border }}
                    >
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {slide.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={slide.imageUrl} alt={`Banner ${index + 1}`} className="w-14 h-5 object-cover rounded-md border flex-shrink-0" style={{ borderColor: lmfitTokens.border }} />
                          ) : (
                            <div className="w-14 h-5 rounded-md bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 select-none flex-shrink-0">
                              <ImageIcon size={12} />
                            </div>
                          )}
                          <input
                            type="text"
                            placeholder="https://sua-url-do-banner.jpg"
                            value={slide.imageUrl}
                            onChange={(e) =>
                              setHeroBannerSlides((prev) => prev.map((s, i) => (i === index ? { ...s, imageUrl: e.target.value } : s)))
                            }
                            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-neutral-700 dark:text-neutral-300 truncate"
                          />
                          <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] select-none flex-shrink-0" style={{ borderColor: lmfitTokens.border }}>
                            <Upload size={14} className="text-neutral-500" />
                            <span>{uploadingHeroIndex === index ? "..." : "Subir"}</span>
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              onChange={(e) => handleHeroSlideUpload(e, index)}
                              className="hidden"
                              disabled={uploadingHeroIndex === index}
                            />
                          </label>
                        </div>

                        <div className="w-full sm:w-56 flex-shrink-0">
                          <AsyncSelect
                            isClearable
                            cacheOptions
                            defaultOptions
                            loadOptions={async (inputValue: string) => {
                              try {
                                const { data } = await http.get("/products", { params: { page: 1, limit: 50, search: inputValue } });
                                const items = extractListItems(data) as Array<{ slug?: string; name?: string }>;
                                return items.filter((p) => !!p.slug).map((p) => ({ value: p.slug as string, label: p.name ?? p.slug }));
                              } catch {
                                return [];
                              }
                            }}
                            placeholder={language === "en" ? "Links to…" : "Vai pra…"}
                            value={slide.linkedProductSlug ? { value: slide.linkedProductSlug, label: slide.linkedProductLabel } : null}
                            onChange={(opt: any) =>
                              setHeroBannerSlides((prev) =>
                                prev.map((s, i) =>
                                  i === index
                                    ? { ...s, linkedProductSlug: opt?.value ?? "", linkedProductLabel: opt?.label ?? "" }
                                    : s,
                                ),
                              )
                            }
                            styles={{
                              control: (base: any) => ({ ...base, minHeight: "2.25rem", borderRadius: "0.5rem", borderColor: lmfitTokens.border, backgroundColor: "var(--card-bg)" }),
                              singleValue: (base: any) => ({ ...base, color: lmfitTokens.text }),
                              input: (base: any) => ({ ...base, color: lmfitTokens.text }),
                              menu: (base: any) => ({ ...base, zIndex: 50, backgroundColor: "var(--card-bg)" }),
                            }}
                          />
                        </div>

                        <button
                          type="button"
                          aria-label={language === "en" ? "Remove banner" : "Remover banner"}
                          onClick={() => setHeroBannerSlides((prev) => prev.filter((_, i) => i !== index))}
                          className="flex-shrink-0 p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer self-center"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Título/subtítulo/CTA — opcionais, sobrepostos na imagem só quando preenchidos */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder={language === "en" ? "Title (optional)" : "Título (opcional)"}
                          value={slide.title}
                          onChange={(e) => setHeroBannerSlides((prev) => prev.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)))}
                          className="w-full px-2.5 py-1.5 rounded-lg border bg-white/60 dark:bg-neutral-950/40 text-xs outline-none"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                        />
                        <input
                          type="text"
                          placeholder={language === "en" ? "Subtitle (optional)" : "Subtítulo (opcional)"}
                          value={slide.subtitle}
                          onChange={(e) => setHeroBannerSlides((prev) => prev.map((s, i) => (i === index ? { ...s, subtitle: e.target.value } : s)))}
                          className="w-full px-2.5 py-1.5 rounded-lg border bg-white/60 dark:bg-neutral-950/40 text-xs outline-none"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                        />
                        <input
                          type="text"
                          placeholder={language === "en" ? "Button text (optional)" : "Texto do botão (opcional)"}
                          value={slide.ctaLabel}
                          onChange={(e) => setHeroBannerSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ctaLabel: e.target.value } : s)))}
                          className="w-full px-2.5 py-1.5 rounded-lg border bg-white/60 dark:bg-neutral-950/40 text-xs outline-none"
                          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setHeroBannerSlides((prev) => [
                      ...prev,
                      { imageUrl: "", linkedProductSlug: "", linkedProductLabel: "", title: "", subtitle: "", ctaLabel: "" },
                    ])
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all active:scale-[0.98] cursor-pointer"
                  style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                >
                  <Plus size={15} />
                  {language === "en" ? "Add banner" : "Adicionar banner"}
                </button>
              </div>

              {/* Preset grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(Object.keys(STOREFRONT_PRESETS) as ThemePreset[]).map((presetId) => {
                  const tokens = STOREFRONT_PRESETS[presetId];
                  const isSelected = themePreset === presetId;
                  return (
                    <button
                      key={presetId}
                      type="button"
                      onClick={() => setThemePreset(presetId)}
                      className="text-left rounded-xl border-2 overflow-hidden transition-all active:scale-[0.98] cursor-pointer"
                      style={{ borderColor: isSelected ? primaryColor : lmfitTokens.border }}
                    >
                      <div className="h-20 flex flex-col justify-between p-2.5" style={{ backgroundColor: tokens.palette.bg }}>
                        <div
                          className="text-[10px] font-bold truncate"
                          style={{
                            color: tokens.palette.text,
                            fontFamily: `'${tokens.fontDisplay}', sans-serif`,
                            textTransform: tokens.heading.case === "uppercase" ? "uppercase" : "none",
                            letterSpacing: tokens.heading.tracking,
                          }}
                        >
                          {tokens.label}
                        </div>
                        <span
                          className="self-start text-[8px] font-semibold px-2 py-1"
                          style={{
                            borderRadius: tokens.buttonStyle === "pill" ? 999 : tokens.radius,
                            backgroundColor: tokens.buttonStyle === "ghost" ? "transparent" : primaryColor,
                            color: tokens.buttonStyle === "ghost" ? primaryColor : "#fff",
                            border: tokens.buttonStyle === "ghost" ? `1.5px solid ${primaryColor}` : "none",
                          }}
                        >
                          Comprar
                        </span>
                      </div>
                      <div className="p-2 flex items-center justify-between gap-1 border-t" style={{ borderColor: lmfitTokens.border }}>
                        <span className="text-[11px] font-semibold truncate" style={{ color: lmfitTokens.text }}>
                          {tokens.label}
                        </span>
                        {isSelected && (
                          <span className="rounded-full p-0.5 flex-shrink-0" style={{ backgroundColor: primaryColor }}>
                            <Check size={10} className="text-white" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] mt-3" style={{ color: lmfitTokens.textMuted }}>
                {STOREFRONT_PRESETS[themePreset].tagline}
              </p>

              <div className="flex justify-end pt-4 mt-4 border-t" style={{ borderColor: lmfitTokens.border }}>
                <button
                  type="submit"
                  disabled={savingStorefront}
                  className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  style={{ backgroundColor: lmfitTokens.primary }}
                >
                  {savingStorefront ? "Salvando..." : (language === "en" ? "Save Store Style" : "Salvar Estilo da Loja")}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Loyalty Section (Admin Only) */}
        {user?.role === "admin" && (
          <section className="rounded-2xl border p-6 md:p-8 bg-[var(--card-bg)] shadow-sm" style={{ borderColor: lmfitTokens.border }}>
            <form onSubmit={handleSaveLoyalty}>
              <div className="flex items-start gap-3.5 mb-6">
                {/* primaryColor, not secondaryColor: a tenant that never touches the secondary
                    swatch keeps whatever it defaulted to (LM FIT's is #000000), which reads as
                    a dead/invisible icon on a dark badge — primaryColor is always the color the
                    merchant actually chose. */}
                <div className="p-2.5 rounded-xl flex-shrink-0" style={iconBadgeStyle(primaryColor)}>
                  <Gift size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: lmfitTokens.text }}>
                    {language === "en" ? "Loyalty & Cashback" : "Fidelidade & Cashback"}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                    {language === "en"
                      ? "Configure how your customers earn and use points on your store."
                      : "Configure como seus clientes ganham e utilizam pontos na sua loja."}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Enabled Toggle */}
                <div className="flex items-center justify-between border p-4 rounded-xl bg-gray-50/50 dark:bg-neutral-900/50" style={{ borderColor: lmfitTokens.border }}>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: lmfitTokens.text }}>
                      {language === "en" ? "Enable Loyalty Program" : "Habilitar Programa de Fidelidade"}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                      {language === "en" ? "Customers will start earning points on every purchase." : "Seus clientes começarão a ganhar pontos nas compras."}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={loyaltyEnabled} onChange={(e) => setLoyaltyEnabled(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" style={{ backgroundColor: loyaltyEnabled ? primaryColor : undefined }}></div>
                  </label>
                </div>

                {/* Points and Values */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      {language === "en" ? "Points earned per BRL" : "Pontos ganhos por R$ 1"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={loyaltyPointsPerBRL}
                      onChange={(e) => setLoyaltyPointsPerBRL(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      {language === "en" ? "Discount value per point (BRL)" : "Valor de desconto por ponto (R$)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={loyaltyRedeemValue}
                      onChange={(e) => setLoyaltyRedeemValue(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t" style={{ borderColor: lmfitTokens.border }}>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    style={{ backgroundColor: lmfitTokens.primary }}
                  >
                    {saving ? "Salvando..." : "Salvar Fidelidade"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* Shipping Section (Admin Only) */}
        {user?.role === "admin" && (
          <section className="rounded-2xl border p-6 md:p-8 bg-[var(--card-bg)] shadow-sm" style={{ borderColor: lmfitTokens.border }}>
            <form onSubmit={handleSaveShipping}>
              <div className="flex items-start gap-3.5 mb-6">
                <div className="p-2.5 rounded-xl flex-shrink-0" style={iconBadgeStyle(primaryColor)}>
                  <Truck size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: lmfitTokens.text }}>
                    {language === "en" ? "Shipping" : "Frete"}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                    {language === "en"
                      ? "Configure the pickup label and the fixed fees charged at checkout for standard/express delivery."
                      : "Configure o rótulo da retirada e as taxas fixas cobradas no checkout para entrega padrão/expressa."}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    {language === "en" ? "Pickup label" : "Rótulo da retirada em loja"}
                  </label>
                  <input
                    type="text"
                    value={pickupLabel}
                    onChange={(e) => setPickupLabel(e.target.value)}
                    placeholder="Retirada em Loja / Banca"
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                    style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      {language === "en" ? "Standard delivery fee (BRL)" : "Taxa de entrega padrão (R$)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={standardFee}
                      onChange={(e) => setStandardFee(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      {language === "en" ? "Express delivery fee (BRL)" : "Taxa de entrega expressa (R$)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={expressFee}
                      onChange={(e) => setExpressFee(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                      {language === "en" ? "Free above (BRL, 0 = disabled)" : "Frete grátis acima de (R$, 0 = desativado)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={freeAboveTotal}
                      onChange={(e) => setFreeAboveTotal(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                      style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                    />
                  </div>
                </div>

                {/* Loop 27 — endereço de origem, necessário pra cotação real de frete */}
                <div className="space-y-4 pt-6 border-t" style={{ borderColor: lmfitTokens.border }}>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">
                      {language === "en" ? "Store origin address" : "Endereço de origem da loja"}
                    </h3>
                    <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
                      {language === "en"
                        ? "Where shipments leave from — required for real Melhor Envio quotes. Without it, checkout keeps using the fixed fees above."
                        : "De onde os envios saem — obrigatório pra cotação real via Melhor Envio. Sem isso, o checkout continua usando as taxas fixas acima."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">CEP</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={maskCep(originCep)}
                        onChange={(e) => setOriginCep(onlyCepDigits(e.target.value))}
                        onBlur={handleOriginCepBlur}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                      {originCepLooking ? (
                        <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>{language === "en" ? "Looking up…" : "Buscando…"}</span>
                      ) : originCepError ? (
                        <span className="text-xs" style={{ color: lmfitTokens.error }}>{originCepError}</span>
                      ) : null}
                    </div>
                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "Address" : "Endereço"}
                      </label>
                      <input
                        type="text"
                        value={originLogradouro}
                        onChange={(e) => setOriginLogradouro(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "Number" : "Número"}
                      </label>
                      <input
                        type="text"
                        value={originNumero}
                        onChange={(e) => setOriginNumero(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                    <div className="sm:col-span-4 space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "Complement" : "Complemento"}
                      </label>
                      <input
                        type="text"
                        value={originComplemento}
                        onChange={(e) => setOriginComplemento(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "Neighborhood" : "Bairro"}
                      </label>
                      <input
                        type="text"
                        value={originBairro}
                        onChange={(e) => setOriginBairro(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "City" : "Cidade"}
                      </label>
                      <input
                        type="text"
                        value={originCidade}
                        onChange={(e) => setOriginCidade(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                    <div className="sm:col-span-1 space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">UF</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={originUf}
                        onChange={(e) => setOriginUf(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500 uppercase"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                  </div>
                </div>

                {/* Loop 27 — credenciais Melhor Envio */}
                <div className="space-y-4 pt-6 border-t" style={{ borderColor: lmfitTokens.border }}>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">
                      Melhor Envio
                    </h3>
                    <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
                      {language === "en"
                        ? "Token with \"Shipping quote\" scope, generated in your Melhor Envio dashboard. Without it, checkout keeps using the fixed fees above — nothing breaks."
                        : "Token com escopo \"Cotação de fretes\", gerado no painel da Melhor Envio. Sem ele, o checkout continua usando as taxas fixas acima — nada quebra."}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "API token" : "Token da API"}
                        {melhorEnvioTokenConfigured ? (
                          <span className="ml-2 font-normal normal-case" style={{ color: lmfitTokens.success }}>
                            {language === "en" ? "· configured" : "· configurado"}
                          </span>
                        ) : null}
                      </label>
                      <input
                        type="password"
                        value={melhorEnvioToken}
                        onChange={(e) => setMelhorEnvioToken(e.target.value)}
                        placeholder={melhorEnvioTokenConfigured ? "••••••••••••••••" : language === "en" ? "Paste the token here" : "Cole o token aqui"}
                        autoComplete="off"
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "Environment" : "Ambiente"}
                      </label>
                      <select
                        value={melhorEnvioAmbiente}
                        onChange={(e) => setMelhorEnvioAmbiente(e.target.value as "sandbox" | "producao")}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      >
                        <option value="sandbox">Sandbox</option>
                        <option value="producao">{language === "en" ? "Production" : "Produção"}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t" style={{ borderColor: lmfitTokens.border }}>
                  <button
                    type="submit"
                    disabled={savingShipping}
                    className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    style={{ backgroundColor: lmfitTokens.primary }}
                  >
                    {savingShipping ? "Salvando..." : language === "en" ? "Save Shipping" : "Salvar Frete"}
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* Analytics Section (Admin Only) */}
        {user?.role === "admin" && (
          <section className="rounded-2xl border p-6 md:p-8 bg-[var(--card-bg)] shadow-sm" style={{ borderColor: lmfitTokens.border }}>
            <form onSubmit={handleSaveAnalytics}>
              <div className="flex items-start gap-3.5 mb-6">
                <div className="p-2.5 rounded-xl flex-shrink-0" style={iconBadgeStyle(primaryColor)}>
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: lmfitTokens.text }}>
                    {language === "en" ? "Analytics & Ad Pixels" : "Analytics e Pixels de Anúncio"}
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: lmfitTokens.textMuted }}>
                    {language === "en"
                      ? "Configure Meta, Google Analytics 4 and TikTok pixels to measure and optimize paid traffic. Pixels only load after the visitor accepts cookies."
                      : "Configure os pixels do Meta, Google Analytics 4 e TikTok para medir e otimizar tráfego pago. Os pixels só carregam depois que o visitante aceita cookies."}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3 pb-4 border-b" style={{ borderColor: lmfitTokens.border }}>
                  <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">Meta (Facebook/Instagram)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Pixel ID</label>
                      <input
                        type="text"
                        value={metaPixelId}
                        onChange={(e) => setMetaPixelId(e.target.value)}
                        placeholder="123456789012345"
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "Conversions API token (optional)" : "Token da Conversions API (opcional)"}
                        {metaConversionsApiTokenConfigured ? (
                          <span className="ml-2 font-normal normal-case" style={{ color: lmfitTokens.success }}>
                            {language === "en" ? "· configured" : "· configurado"}
                          </span>
                        ) : null}
                      </label>
                      <input
                        type="password"
                        value={metaConversionsApiToken}
                        onChange={(e) => setMetaConversionsApiToken(e.target.value)}
                        placeholder={metaConversionsApiTokenConfigured ? "••••••••••••••••" : "EAA..."}
                        autoComplete="off"
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pb-4 border-b" style={{ borderColor: lmfitTokens.border }}>
                  <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">Google Analytics 4</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Measurement ID</label>
                      <input
                        type="text"
                        value={ga4MeasurementId}
                        onChange={(e) => setGa4MeasurementId(e.target.value)}
                        placeholder="G-XXXXXXXXXX"
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "Measurement Protocol API secret (optional)" : "API secret do Measurement Protocol (opcional)"}
                        {ga4ApiSecretConfigured ? (
                          <span className="ml-2 font-normal normal-case" style={{ color: lmfitTokens.success }}>
                            {language === "en" ? "· configured" : "· configurado"}
                          </span>
                        ) : null}
                      </label>
                      <input
                        type="password"
                        value={ga4ApiSecret}
                        onChange={(e) => setGa4ApiSecret(e.target.value)}
                        placeholder={ga4ApiSecretConfigured ? "••••••••••••••••" : undefined}
                        autoComplete="off"
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">TikTok Ads</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Pixel Code</label>
                      <input
                        type="text"
                        value={tiktokPixelId}
                        onChange={(e) => setTiktokPixelId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                        {language === "en" ? "Events API token (optional)" : "Token da Events API (opcional)"}
                        {tiktokAccessTokenConfigured ? (
                          <span className="ml-2 font-normal normal-case" style={{ color: lmfitTokens.success }}>
                            {language === "en" ? "· configured" : "· configurado"}
                          </span>
                        ) : null}
                      </label>
                      <input
                        type="password"
                        value={tiktokAccessToken}
                        onChange={(e) => setTiktokAccessToken(e.target.value)}
                        placeholder={tiktokAccessTokenConfigured ? "••••••••••••••••" : undefined}
                        autoComplete="off"
                        className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
                        style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t" style={{ borderColor: lmfitTokens.border }}>
                  <button
                    type="submit"
                    disabled={savingAnalytics}
                    className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    style={{ backgroundColor: lmfitTokens.primary }}
                  >
                    {savingAnalytics ? "Salvando..." : language === "en" ? "Save Analytics" : "Salvar Analytics"}
                  </button>
                </div>
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
