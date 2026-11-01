"use client";

import { useEffect, useRef } from "react";

// ==========================================
// ODA ŞERİDİ — SEÇİLİYİ GÖRÜNÜR TUTAR
//
// Dar ekranda odalar yatay bir şeride dönüşüyor ve şerit
// soldan başlıyor. Ofis sayfasına giren kişi "Ofis"i
// göremiyordu: seçili olan sağda, görüş alanının dışında
// kalıyordu. Başlıkta yazıyor olması yetmez — insan nerede
// durduğunu menüde de görmek ister.
//
// Sayfa açılırken şerit seçili maddeye kaydırılıyor. Yalnızca
// şeridin kendi içinde kayıyor, sayfa oynamıyor.
// ==========================================

export function OdaSeridi({ children }: { children: React.ReactNode }) {
  const serit = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = serit.current;
    if (!el) return;
    const aktif = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (!aktif) return;
    // Yatay şerit yoksa (geniş ekranda dikey liste) kaydırmaya gerek yok
    if (el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({
      left: aktif.offsetLeft - el.clientWidth / 2 + aktif.clientWidth / 2,
      behavior: "auto",
    });
  }, []);

  return (
    <ul
      ref={serit}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {children}
    </ul>
  );
}
