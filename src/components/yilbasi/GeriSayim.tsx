"use client";

import { useSyncExternalStore } from "react";
import { YILBASI } from "@/lib/yilbasi";

// ==========================================
// YILBAŞINA TESLİM — GERİ SAYIM
//
// "Yılbaşına yetişir mi?" sorusunun cevabı: son sipariş anına
// kalan gün, saat, dakika. Süre dolunca dürüstçe söyler; yılbaşı
// geçince yeni yıl mesajına döner.
//
// Saat yalnızca tarayıcıda okunur; sunucu tarihi düz metin olarak
// basar, betik çalışmazsa da "son sipariş 17 Aralık" bilgisi kalır.
// ==========================================

const ADIM = 30_000;
const zamanAboneligi = (cb: () => void) => {
  const id = setInterval(cb, ADIM);
  return () => clearInterval(id);
};
const anlik = () => Math.floor(Date.now() / ADIM) * ADIM;
const sunucuda = () => null;

const YENI_YIL = new Date("2027-01-01T00:00:00+03:00").getTime();

function parca(sayi: number, birim: string) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[clamp(2.4rem,5.2vw,4.5rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums">
        {String(sayi).padStart(2, "0")}
      </span>
      <span className="text-sm font-medium">{birim}</span>
    </span>
  );
}

export function GeriSayim() {
  const an = useSyncExternalStore(zamanAboneligi, anlik, sunucuda);
  const son = YILBASI.sonSiparis.getTime();

  // Sunucuda ve betik çalışmadan: yalnızca tarih
  if (an === null) {
    return (
      <p className="text-lg font-medium">
        Yılbaşından önce teslim için son sipariş: {YILBASI.sonSiparisYazi}
      </p>
    );
  }

  if (an >= YENI_YIL) {
    return (
      <p className="text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em]">
        Yeni yılınız kutlu olsun.
      </p>
    );
  }

  if (an > son) {
    return (
      <div>
        <p className="text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold leading-tight tracking-[-0.02em]">
          Son sipariş günü geçti.
        </p>
        <p className="mt-2 max-w-md text-[15px] leading-relaxed">
          Küçük ürünler 1–2 iş günü içinde kargoya verildiği için bazıları
          hâlâ yetişebilir; büyük ürünler yılbaşından sonra ulaşır.
        </p>
      </div>
    );
  }

  const kalan = son - an;
  const gun = Math.floor(kalan / 86_400_000);
  const saat = Math.floor((kalan % 86_400_000) / 3_600_000);
  const dakika = Math.floor((kalan % 3_600_000) / 60_000);

  return (
    <div>
      <p className="text-[15px] leading-snug">
        Yılbaşından önce teslim için son sipariş
        <span className="mt-1 block text-xl font-semibold tracking-[-0.01em]">
          {YILBASI.sonSiparisYazi}
        </span>
      </p>
      <p
        className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2"
        aria-label={`Son sipariş gününe ${gun} gün ${saat} saat ${dakika} dakika kaldı`}
      >
        {parca(gun, "gün")}
        {parca(saat, "saat")}
        {parca(dakika, "dakika")}
      </p>
    </div>
  );
}
