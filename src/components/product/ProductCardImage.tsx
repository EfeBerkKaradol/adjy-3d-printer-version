"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ProductImageFallback } from "./ProductImageFallback";
import { KartVideosu } from "@/components/tasarim/KartVideosu";
import { aracAnimasyonu, aracBul, slugdanAracId } from "@/lib/tasarim/catalog";

// ==========================================
// KART GÖRSELİ — İKİNCİ GÖRSEL "BASILIR"
//
// Kapak görselinin üstünde ikinci görsel gizli bekler. Kartın
// üzerine gelince kategorilerdeki piksel nesneler gibi alttan
// yukarı, katman katman basılarak belirir (globals.css:
// .adjy-print-swap). İkinci görsel yoksa kapak sabit kalır.
// Kapsayıcının `group` sınıfı taşıması gerekir.
//
// İkinci görsel ilk kez karta gelindiğinde (ya da klavyeyle
// odaklanıldığında) sayfaya eklenir. Baştan eklenip clip-path
// ile gizlendiğinde tarayıcı onu yine indiriyordu: her kart iki
// görsel, üzerine gelinemeyen dokunmatik ekranlarda da.
// ==========================================

interface Props {
  slug: string;
  name: string;
  src: string | null;
  hoverSrc?: string | null;
  sizes: string;
  priority?: boolean;
}

export function ProductCardImage({ slug, name, src, hoverSrc, sizes, priority }: Props) {
  const [hata, setHata] = useState(false);
  const [ikinciHata, setIkinciHata] = useState(false);
  const [ikinciIstendi, setIkinciIstendi] = useState(false);
  const [ikinciHazir, setIkinciHazir] = useState(false);
  const kapakRef = useRef<HTMLImageElement>(null);

  const ikinciVar = Boolean(src && hoverSrc) && !hata;

  // Bu bileşen yalnızca görselleri çizer; üzerine gelinen kart
  // (`group`) dışarıda. Dinleyici ona bağlanır ve ilk tetiklenişte
  // kalkar.
  useEffect(() => {
    if (!ikinciVar || ikinciIstendi) return;
    const kart = kapakRef.current?.closest(".group");
    if (!kart) return;

    // Dokunmatik ekranda "üzerine gelme" de odak da karta dokunup
    // ürüne gitmektir; görsel hiç görülmeden indirilmiş olur. Bu
    // yüzden yalnızca fare/kalem ve klavye odağı sayılır.
    const isaretci = (e: Event) => {
      if ((e as PointerEvent).pointerType !== "touch") setIkinciIstendi(true);
    };
    const odak = (e: Event) => {
      if (e.target instanceof Element && e.target.matches(":focus-visible")) {
        setIkinciIstendi(true);
      }
    };
    kart.addEventListener("pointerenter", isaretci);
    kart.addEventListener("focusin", odak);
    return () => {
      kart.removeEventListener("pointerenter", isaretci);
      kart.removeEventListener("focusin", odak);
    };
  }, [ikinciVar, ikinciIstendi]);

  if (!src || hata) return <ProductImageFallback slug={slug} />;

  // Kendin Tasarla ürününün özelleştirme animasyonu varsa üzerine
  // gelince ikinci görsel yerine o oynar.
  const arac = aracBul(slugdanAracId(slug));
  const animasyon = arac ? aracAnimasyonu(arac) : null;
  if (animasyon) {
    return (
      <>
        <Image
          ref={kapakRef}
          src={src}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          onError={() => setHata(true)}
          className="object-cover"
        />
        <KartVideosu adres={animasyon} />
      </>
    );
  }

  // Görsel inene kadar basılma animasyonu bekletilir: kart o sırada
  // zaten üzerine gelinmiş durumda, animasyon boş bir karenin
  // üstünde oynayıp bitmesin. Stil kalkınca baştan başlar.
  const bekle = ikinciHazir ? undefined : { animation: "none" };

  return (
    <>
      <Image
        ref={kapakRef}
        src={src}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setHata(true)}
        className="object-cover"
      />
      {hoverSrc && ikinciIstendi && !ikinciHata && (
        <>
          <Image
            src={hoverSrc}
            alt=""
            aria-hidden
            fill
            sizes={sizes}
            onLoad={() => setIkinciHazir(true)}
            onError={() => setIkinciHata(true)}
            className="adjy-print-swap object-cover"
            style={bekle}
          />
          <span
            aria-hidden
            className="adjy-print-nozzle pointer-events-none absolute inset-x-0 h-[3px] bg-foreground shadow-[0_-2px_0_var(--background)]"
            style={bekle}
          />
        </>
      )}
    </>
  );
}
