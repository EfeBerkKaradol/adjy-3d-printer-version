"use client";

import { useSyncExternalStore } from "react";
import Script from "next/script";
import { CONSENT_EVENT, CONSENT_STORAGE_KEY } from "@/components/layout/CookieConsent";

// ==========================================
// GOOGLE ANALYTICS — YALNIZCA ÇEREZ ONAYIYLA
//
// Eskiden GA her ziyarette yükleniyordu; çerez bildiriminde
// "Reddet" demek hiçbir şeyi değiştirmiyordu. KVKK ve çerez
// politikamız gereği analitik çerezler ancak "Kabul et"
// seçilince yüklenir. Onay aynı sayfada verilirse beklemeden
// devreye girer.
// ==========================================

function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  return () => window.removeEventListener(CONSENT_EVENT, onChange);
}

export function GoogleAnalytics({ id }: { id: string }) {
  // Sunucuda ve ilk çizimde "onay yok" sayılır
  const allowed = useSyncExternalStore(subscribe, hasConsent, () => false);

  if (!allowed) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  );
}
