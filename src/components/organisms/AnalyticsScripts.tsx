"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useTenant } from "@/context/TenantContext";
import { CONSENT_CHANGED_EVENT, getConsentStatus } from "@/lib/cookieConsent";
import { hasAnyPixelConfigured, trackPageView } from "@/lib/analytics";

/**
 * Loop 15 — carrega os 3 pixels de conversão (Meta/GA4/TikTok) só depois que o comprador aceita
 * cookies (`CookieConsentBanner`) e só os que o tenant configurou. Reage à mudança de consentimento
 * em tempo real via `CONSENT_CHANGED_EVENT` (banner e este componente são irmãos no layout, sem
 * estado compartilhado) — sem precisar de reload pra ativar os pixels assim que o comprador aceita.
 *
 * Dispara "page view" a cada troca de rota — inclusive a primeira, já que o App Router navega
 * client-side e os scripts nunca veriam uma segunda carga de página sozinhos. Por isso os scripts
 * de init abaixo NUNCA disparam page-view por conta própria (`fbq('track','PageView')`,
 * `gtag('config', …)` auto-page-view, `ttq.page()`) — só o `useEffect` abaixo dispara, uma única
 * vez por rota, pra nunca contar a primeira visita em dobro.
 */
export function AnalyticsScripts() {
  const { tenant } = useTenant();
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    setConsented(getConsentStatus() === "accepted");
    const handler = () => setConsented(getConsentStatus() === "accepted");
    window.addEventListener(CONSENT_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handler);
  }, []);

  const cfg = tenant?.analytics;

  useEffect(() => {
    if (!consented || !hasAnyPixelConfigured(cfg)) return;
    trackPageView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, consented, cfg?.metaPixelId, cfg?.ga4MeasurementId, cfg?.tiktokPixelId]);

  if (!consented || !cfg || !hasAnyPixelConfigured(cfg)) return null;

  return (
    <>
      {cfg.metaPixelId ? (
        <Script id="kivoni-meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${cfg.metaPixelId}');`}
        </Script>
      ) : null}

      {cfg.ga4MeasurementId ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${cfg.ga4MeasurementId}`} strategy="afterInteractive" />
          <Script id="kivoni-ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${cfg.ga4MeasurementId}', { send_page_view: false });`}
          </Script>
        </>
      ) : null}

      {cfg.tiktokPixelId ? (
        <Script id="kivoni-tiktok-pixel" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=d.createElement("script");a.type="text/javascript",a.async=!0,a.src=i+"?sdkid="+e+"&lib="+t;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
ttq.load('${cfg.tiktokPixelId}');
}(window, document, 'ttq');`}
        </Script>
      ) : null}
    </>
  );
}
