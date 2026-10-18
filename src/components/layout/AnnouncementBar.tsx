"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// ==========================================
// HİZMET ŞERİDİ
//
// Tanımadığı bir mağazada insanın ilk sorduğu şeyler: kargo ne
// kadar, beğenmezsem ne olur, ödeme güvenli mi. Bunlar altbilgide
// duruyordu — yani kimsenin bakmadığı yerde.
//
// Şerit dönmüyor: dönen bir şeritte yazanın görülmesi şansa
// kalır, özellikle telefonda. Dar ekranda tek madde kalır,
// geniş ekranda hepsi yan yana durur.
//
// Kapatılabilir ve kapatıldığı hatırlanır; her sayfada aynı
// şeyi okumak zorunda kalmasın.
// ==========================================

const MADDELER = [
  "Kendi atölyemizde üretiyoruz",
  "Çoğu nesnenin ölçüsünü sen seçiyorsun",
  "14 gün içinde cayma hakkı",
  "3D Secure ile güvenli ödeme",
];

const ANAHTAR = "adjy.duyuru.kapali";

export function AnnouncementBar() {
  const [gorunur, setGorunur] = useState(false);

  // Sunucuda çizilip sonra kaybolmasın diye ilk çizimde kapalı
  // başlar; tercih okunduktan sonra açılır.
  useEffect(() => {
    try {
      setGorunur(localStorage.getItem(ANAHTAR) !== "1");
    } catch {
      setGorunur(true);
    }
  }, []);

  if (!gorunur) return null;

  return (
    <div className="relative border-b border-border/60 bg-foreground text-background">
      <div className="adjy-container flex items-center justify-center gap-x-8 py-2 pr-8 text-xs">
        {MADDELER.map((m, i) => (
          <span
            key={m}
            className={i === 0 ? "" : "hidden sm:inline md:inline lg:inline"}
          >
            {m}
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setGorunur(false);
          try {
            localStorage.setItem(ANAHTAR, "1");
          } catch {
            /* depolama kapalıysa bu sayfa için kapanır, yeter */
          }
        }}
        aria-label="Bildirimi kapat"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
