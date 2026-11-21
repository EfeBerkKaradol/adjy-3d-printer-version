"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Box, ChevronLeft, ChevronRight, Image as ImageIcon, Loader2 } from "lucide-react";
import { FILAMENT_COLORS } from "@/lib/slicer";

// ==========================================
// ÜRÜN SAHNESİ
//
// 3D'yi görmek için ayrı bir düğmeye basmak gerekiyordu, yani
// çoğu ziyaretçi ürünün döndürülebildiğini hiç öğrenmiyordu.
//
// Ama 3D'yi doğrudan açmak da doğru değil: three.js ve model
// birkaç yüz kilobayt, ilk kare saniyelerce boş kalıyor.
//
// Burada ikisi birden yapılıyor. Fotoğraf anında görünür;
// 3D arka planda yüklenir ve hazır olduğunda sessizce devralır.
// Ziyaretçi bir şey beklemez, bir şeye tıklamaz — kaydırıcıyı
// çektiğinde dönen gerçek modeli görür.
//
// Sekmelerle fotoğrafa geri dönülebilir; 3D hiç yüklenemezse
// fotoğraf zaten ekranda durduğu için kimse bir şey kaybetmez.
// ==========================================

const ModelViewer = dynamic(
  () => import("@/components/3d/ModelViewer").then((m) => m.ModelViewer),
  { ssr: false, loading: () => null }
);

type Sekme = "foto" | "3d";

interface Props {
  name: string;
  images: string[];
  modelFileUrl: string | null;
  productType: string;
  parameters: Record<string, number | string>;
  defaults: Record<string, number>;
}

export function ProductStage({
  name,
  images,
  modelFileUrl,
  productType,
  parameters,
  defaults,
}: Props) {
  // Ziyaretçinin kendi seçtiği sekme; dokunmadıysa null
  const [secim, setSecim] = useState<Sekme | null>(null);
  const [aktifFoto, setAktifFoto] = useState(0);
  const [modelHazir, setModelHazir] = useState(false);

  const model3dVar = !!modelFileUrl;

  // 3D sahne eskiden sabit 1,2 saniye sonra kuruluyordu — yavaş
  // bağlantıda fotoğraf daha inmeden, yavaş cihazda sayfa hâlâ
  // kurulurken three.js devreye giriyordu. Süre alt sınır olarak
  // duruyor (fotoğraf önce görünsün); üstüne sayfanın yüklenmesi
  // ve tarayıcının boşa çıkması beklenir.
  useEffect(() => {
    if (!model3dVar) return;
    let bostaId: number | undefined;
    const kur = () => setModelHazir(true);
    const bostaKur = () => {
      // Safari'de requestIdleCallback yok: doğrudan kurulur
      if (typeof window.requestIdleCallback === "function") {
        bostaId = window.requestIdleCallback(kur, { timeout: 2000 });
      } else {
        kur();
      }
    };
    const t = window.setTimeout(() => {
      if (document.readyState === "complete") bostaKur();
      else window.addEventListener("load", bostaKur, { once: true });
    }, 1200);
    // Takılan bir dış kaynak "load"u geciktirirse 3D sonsuza kadar
    // "hazırlanıyor"da kalmasın.
    const sinir = window.setTimeout(kur, 6000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(sinir);
      window.removeEventListener("load", bostaKur);
      if (bostaId !== undefined) window.cancelIdleCallback(bostaId);
    };
  }, [model3dVar]);

  // Model kurulduktan sonra kendiliğinden devralır — ziyaretçi
  // sekmeye kendisi dokunduysa tercihine karışılmaz.
  const sekme: Sekme = secim ?? (modelHazir ? "3d" : "foto");

  function sec(s: Sekme) {
    setSecim(s);
    // 3D'yi kendisi açan ziyaretçi zamanlayıcıyı beklemez
    if (s === "3d") setModelHazir(true);
  }

  // Görseller arasında gezinme: oklar, klavye ve telefonda kaydırma.
  // Uçlarda başa / sona sarar.
  const fotoSayisi = images.length;
  const gezilebilir = fotoSayisi > 1 && sekme === "foto";
  function git(adim: number) {
    setAktifFoto((i) => (i + adim + fotoSayisi) % fotoSayisi);
  }
  const dokunmaX = useRef<number | null>(null);

  const renk = FILAMENT_COLORS.find((c) => c.id === parameters.color)?.hex;
  const modelParams = renk ? { ...parameters, color: renk } : parameters;

  return (
    <div>
      <div
        className="group/sahne relative aspect-square overflow-hidden rounded-2xl bg-muted"
        tabIndex={gezilebilir ? 0 : undefined}
        aria-roledescription={gezilebilir ? "görsel galerisi" : undefined}
        onKeyDown={(e) => {
          if (!gezilebilir) return;
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            git(-1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            git(1);
          }
        }}
        onTouchStart={(e) => {
          dokunmaX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const bas = dokunmaX.current;
          dokunmaX.current = null;
          if (!gezilebilir || bas === null) return;
          const fark = (e.changedTouches[0]?.clientX ?? bas) - bas;
          if (Math.abs(fark) > 40) git(fark < 0 ? 1 : -1);
        }}
      >
        {/* Fotoğraf her zaman çizilir: 3D yüklenirken altında durur,
            yüklenemezse görünür kalır. */}
        <div className={sekme === "3d" && model3dVar ? "invisible" : ""}>
          {images[aktifFoto] && (
            <Image
              src={images[aktifFoto]}
              alt={name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          )}
        </div>

        {model3dVar && modelHazir && (
          <div className={`absolute inset-0 ${sekme === "3d" ? "" : "invisible"}`}>
            {/* Fotoğraf sekmesindeyken sahne kurulu kalır (kamera açısı
                korunur) ama kare çizmez: görüntüleyici yalnızca bir şey
                değiştiğinde çizer. */}
            <ModelViewer
              parameters={modelParams}
              productType={productType}
              modelFileUrl={modelFileUrl}
              defaults={defaults}
              visible={sekme === "3d"}
            />
          </div>
        )}

        {gezilebilir && (
          <>
            {(
              [
                { adim: -1, ad: "Önceki görsel", Ikon: ChevronLeft, yer: "left-3" },
                { adim: 1, ad: "Sonraki görsel", Ikon: ChevronRight, yer: "right-3" },
              ] as const
            ).map(({ adim, ad, Ikon, yer }) => (
              <button
                key={adim}
                type="button"
                onClick={() => git(adim)}
                aria-label={ad}
                className={`absolute ${yer} top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/25 text-white shadow-sm backdrop-blur-md transition-[background-color,opacity,transform] hover:bg-black/45 active:scale-95 sm:opacity-70 sm:group-hover/sahne:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
              >
                <Ikon className="h-5 w-5" aria-hidden />
              </button>
            ))}
            <span
              className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/35 px-2.5 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-md"
              aria-live="polite"
            >
              {aktifFoto + 1} / {fotoSayisi}
            </span>
          </>
        )}

        {model3dVar && !modelHazir && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs backdrop-blur">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            3D hazırlanıyor
          </span>
        )}
      </div>

      {model3dVar && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => sec("3d")}
            aria-pressed={sekme === "3d"}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
              sekme === "3d" ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
            }`}
          >
            <Box className="h-4 w-4" aria-hidden />
            3D
          </button>
          <button
            type="button"
            onClick={() => sec("foto")}
            aria-pressed={sekme === "foto"}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
              sekme === "foto" ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
            }`}
          >
            <ImageIcon className="h-4 w-4" aria-hidden />
            Fotoğraf
          </button>
          {sekme === "3d" && (
            <span className="ml-1 text-xs text-muted-foreground">
              Sürükleyin · tekerlekle yakınlaştırın
            </span>
          )}
        </div>
      )}

      {images.length > 1 && sekme === "foto" && (
        <ul className="mt-3 flex gap-2">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setAktifFoto(i)}
                aria-label={`${name} görsel ${i + 1}`}
                aria-current={i === aktifFoto}
                className={`relative block h-16 w-16 overflow-hidden rounded-lg border transition-colors ${
                  i === aktifFoto ? "border-foreground" : "border-border hover:border-muted-foreground"
                }`}
              >
                <Image src={src} alt="" fill sizes="64px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
