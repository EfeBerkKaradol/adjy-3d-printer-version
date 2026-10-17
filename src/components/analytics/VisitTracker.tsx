"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// ==========================================
// ZİYARET SAYACI
//
// Her sayfa değişiminde bir satır gönderir. Çerez kurmaz:
// oturum anahtarı sessionStorage'da durur, sekme kapanınca
// silinir — ziyaretçi oturumlar arasında izlenmez.
//
// Gönderim sayfanın işini aksatmaz: keepalive ile arka plana
// bırakılır, hata yutulur. Ölçüm çalışmasa da site çalışır.
//
// Aynı yol arka arkaya iki kez gönderilmez; React yeniden
// çizdiğinde sayaç şişmesin.
// ==========================================

const ANAHTAR = "adjy.vs";

function oturumAnahtari(): string | null {
  try {
    let v = sessionStorage.getItem(ANAHTAR);
    if (!v) {
      v =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(ANAHTAR, v);
    }
    return v;
  } catch {
    // Gizli sekmede ya da depolama kapalıysa ölçüm yapılmaz.
    return null;
  }
}

function cihaz(): "mobile" | "tablet" | "desktop" {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/** /products/<slug> ise slug'ı döndürür — hangi ürünün açıldığını saymak için */
function urunSlug(path: string): string | null {
  const m = path.match(/^\/products\/([^/?#]+)/);
  return m ? m[1] : null;
}

export function VisitTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sonGonderilen = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (sonGonderilen.current === pathname) return;
    sonGonderilen.current = pathname;

    const sessionId = oturumAnahtari();
    if (!sessionId) return;

    const govde = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      sessionId,
      device: cihaz(),
      productId: urunSlug(pathname),
    });

    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: govde,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ölçüm sayfayı etkilemez */
    }
    // searchParams bağımlılıkta: Suspense sınırı içinde okunduğu
    // için ihmal edilirse Next uyarı veriyor. Yol değişmediyse
    // yukarıdaki kontrol yeniden göndermeyi engeller.
  }, [pathname, searchParams]);

  return null;
}
