"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";
import {
  aracAdresi,
  aracGorseli,
  aracKaynagi,
  type TasarimAraci,
} from "@/lib/tasarim/catalog";
import { tasarimFiyati } from "@/lib/tasarim/pricing";
import { kisaOzet, secimleriTemizle, temelSecimler } from "@/lib/tasarim/order";
import { useCartStore } from "@/store/cartStore";
import { formatTRY } from "@/lib/slicer";
import { aracArayuzu, aracMesajiMi, type AracPaketi } from "./kopru";

// ==========================================
// TASARIM STÜDYOSU
//
// Mobilya yapılandırıcısının kardeşi: bakılacak hazır bir
// ürün yok, ürün kurulurken var oluyor. Fark şu ki burada
// modeli kuran araç mağazanın bir bileşeni değil, kendi
// başına çalışan bir sayfa — çerçevenin içinde açılıyor ve
// yalnızca müşteriye ait yüzünü gösteriyor.
//
// Araç her değişiklikte üç şey bildirir: seçimlerin okunur
// listesi, geri yüklenebilir durum ve basılacak parçanın
// ölçümü. Fiyat ölçümden, burada hesaplanır; sipariş
// verilirken sunucu aynı hesabı yeniden yapar.
//
// Sepete giden kayıt yalnızca "ne istendiğini" değil, aracı
// aynı hâliyle yeniden açmaya yetecek her şeyi taşır. Atölye
// siparişi açtığında müşterinin kurduğu modeli görür ve STL'i
// oradan indirir.
// ==========================================

interface Props {
  arac: TasarimAraci;
  /** Sepetin bağlanacağı veritabanı ürünü — açılamadıysa null */
  urunId: string | null;
}

export function TasarimStudyo({ arac, urunId }: Props) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const { resolvedTheme } = useTheme();

  const cerceveRef = useRef<HTMLIFrameElement>(null);
  // Çerçevenin adresi ilk temayla bir kez belirlenir. Tema sonradan
  // değişirse araç yeniden yüklenmez — müşterinin kurduğu model
  // sıfırlanırdı — yalnızca köprüye haber verilir. Tema sunucuda
  // bilinmediği için ilk çizimde boştur; belli olduğu çizimde sabitlenir.
  const [ilkTema, setIlkTema] = useState<string | null>(null);
  if (ilkTema === null && resolvedTheme) setIlkTema(resolvedTheme);
  const kaynak = ilkTema
    ? `${aracKaynagi(arac.id)}?tema=${ilkTema === "dark" ? "koyu" : "acik"}`
    : null;
  const [hazir, setHazir] = useState(false);
  const [paket, setPaket] = useState<AracPaketi | null>(null);
  const [secimlerAcik, setSecimlerAcik] = useState(false);
  const [ekleniyor, setEkleniyor] = useState(false);
  const [eklendi, setEklendi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  // Buraya ürün sayfasından, özelleştirmek için gelinir: bütün ayarlar
  // açık başlar. Kalabalık gelirse bu düğme temel ayarlara indirir.
  const [tumAyarlar, setTumAyarlar] = useState(true);
  const [ayrintiVar, setAyrintiVar] = useState(false);
  const [eklenenOzet, setEklenenOzet] = useState<string | null>(null);

  const ayarlariDegistir = useCallback(() => {
    setTumAyarlar((acik) => {
      aracArayuzu(cerceveRef.current)?.ayar(acik ? "sade" : "tum");
      return !acik;
    });
  }, []);

  useEffect(() => {
    if (!hazir || !resolvedTheme) return;
    aracArayuzu(cerceveRef.current)?.tema(resolvedTheme === "dark" ? "koyu" : "acik");
  }, [hazir, resolvedTheme]);

  useEffect(() => {
    function dinle(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!aracMesajiMi(e.data, arac.id)) return;
      if (e.data.tur === "hazir") {
        const arayuz = aracArayuzu(cerceveRef.current);
        // Köprü müşteri kipinde sade açılır; özelleştirme sayfasında
        // bütün ayarlar istenir.
        arayuz?.ayar("tum");
        setHazir(true);
        setAyrintiVar(!!arayuz?.gelismisVar);
      }
      if (e.data.tur === "durum" && e.data.veri) {
        setPaket(e.data.veri);
        setHata(null);
        // Ayar değişti: az önce eklenenin özeti artık ekrandakini anlatmıyor
        setEklenenOzet(null);
      }
    }
    window.addEventListener("message", dinle);
    return () => window.removeEventListener("message", dinle);
  }, [arac.id]);

  const secimler = useMemo(() => secimleriTemizle(paket?.ozet), [paket]);
  const fiyat = useMemo(() => tasarimFiyati(arac, paket?.olcum ?? null), [arac, paket]);
  // Çubukta ve sepette kısa veri: yalnızca temel seçimler
  const ozetMetni = kisaOzet(temelSecimler(paket?.ozet), 4);

  const sepeteEkle = useCallback(async () => {
    const arayuz = aracArayuzu(cerceveRef.current);
    if (!arayuz || !urunId) return;
    setHata(null);

    if (arac.dosyaGerekli && !arayuz.dosyaVar(arac.dosyaGerekli.giris)) {
      setHata(arac.dosyaGerekli.uyari);
      return;
    }

    setEkleniyor(true);
    try {
      // Müşterinin yüklediği fotoğraf ya da model önce depoya
      // gider; atölye siparişi açtığında aynı dosyayı oradan alır.
      await arayuz.dosyalariYukle();
      const son = arayuz.paket();
      const sonSecimler = secimleriTemizle(son.ozet);
      const sonFiyat = tasarimFiyati(arac, son.olcum);

      addItem({
        product: {
          id: urunId,
          name: arac.ad,
          basePrice: sonFiyat,
          thumbnailUrl: aracGorseli(arac.id),
        },
        customization: {
          id: null,
          parameters: {
            tasarimAraci: arac.id,
            ozet: kisaOzet(temelSecimler(son.ozet), 5),
            secimler: sonSecimler,
            olcum: son.olcum,
            durum: son.durum,
          },
        },
        quantity: 1,
        calculatedPrice: sonFiyat,
      });
      setEklendi(true);
      setEklenenOzet(kisaOzet(temelSecimler(son.ozet), 5));
      setTimeout(() => setEklendi(false), 2400);
      router.refresh();
    } catch (e) {
      setHata(
        e instanceof Error && e.message
          ? e.message
          : "Sepete eklenemedi. Lütfen yeniden deneyin."
      );
    } finally {
      setEkleniyor(false);
    }
  }, [addItem, arac, router, urunId]);

  const eklenebilir = hazir && !!urunId && !ekleniyor;

  return (
    // Duyuru şeridi ve başlık 6,75rem tutuyor; araç ve fiyat çubuğu
    // kaydırmadan tek ekrana sığsın.
    <div className="flex flex-col lg:h-[calc(100dvh-6.75rem)]">
      {/* ---------- BAŞLIK ---------- */}
      <div className="flex items-center gap-3 border-b-2 border-dashed border-foreground/25 bg-background px-4 py-3 lg:px-6">
        <Link
          href={aracAdresi(arac.id)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 text-sm transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Ürün sayfası</span>
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-base font-medium tracking-tight lg:text-lg">
            {arac.ad}
          </h1>
          <p className="hidden truncate text-sm text-muted-foreground md:block">
            {arac.ozet}
          </p>
        </div>
        {ayrintiVar && (
          <button
            type="button"
            onClick={ayarlariDegistir}
            aria-pressed={tumAyarlar}
            className={`ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm transition-colors ${
              tumAyarlar
                ? "bg-foreground text-background"
                : "bg-muted hover:bg-accent"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {tumAyarlar ? "Sade görünüm" : "Tüm ayarlar"}
          </button>
        )}
      </div>

      {/* ---------- ARAÇ ---------- */}
      <div className="relative h-[78vh] bg-surface-2 lg:h-auto lg:min-h-0 lg:flex-1">
        {kaynak && (
          <iframe
            ref={cerceveRef}
            src={kaynak}
            title={`${arac.ad} tasarım aracı`}
            className="absolute inset-0 h-full w-full border-0"
            allow="fullscreen"
          />
        )}
        {!hazir && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2 text-sm text-muted-foreground"
          >
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
            Tasarım aracı açılıyor
          </div>
        )}
      </div>

      {/* ---------- FİYAT VE SEPET ---------- */}
      {/* Mobilyadaki gibi: sepet modelin dibinde durur. Ölçüyü
          değiştiren kişi fiyatı görmek için sayfayı kaydırmak
          zorunda kalmamalı. */}
      <div className="sticky bottom-0 z-20 border-t-2 border-dashed border-foreground/25 bg-background px-4 py-3 lg:static lg:px-6">
        {secimlerAcik && secimler.length > 0 && (
          <dl className="mb-3 grid max-h-[40vh] gap-x-8 gap-y-1.5 overflow-y-auto rounded-lg bg-muted/50 p-3 text-xs sm:grid-cols-2 lg:max-h-[30vh] lg:grid-cols-3">
            {secimler.map((s) => (
              <div key={s.ad} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{s.ad}</dt>
                <dd className="text-right tabular-nums">{s.deger}</dd>
              </div>
            ))}
          </dl>
        )}

        {hata && (
          <p role="alert" className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {hata}
          </p>
        )}

        {/* Sepete giren ayarların kısa hâli: müşteri neyi eklediğini
            sepete gitmeden görsün. */}
        {eklenenOzet !== null && !hata && (
          <p
            role="status"
            className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted/60 px-3 py-2 text-sm"
          >
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Check className="h-4 w-4 text-brand-lime" aria-hidden />
              Sepete eklendi
            </span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {eklenenOzet || "Varsayılan ayarlarla"}
            </span>
            <Link href="/cart" className="shrink-0 underline underline-offset-2">
              Sepete git
            </Link>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button
            type="button"
            onClick={() => setSecimlerAcik((a) => !a)}
            aria-expanded={secimlerAcik}
            disabled={secimler.length === 0}
            className="flex min-w-0 flex-1 items-baseline gap-4 text-left"
          >
            <span className="shrink-0">
              <span className="block text-xl font-semibold tabular-nums">
                {hazir ? formatTRY(fiyat) : "—"}
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                KDV dâhil
                {arac.ekMaliyetAciklamasi
                  ? ` · ${arac.ekMaliyetAciklamasi.toLocaleLowerCase("tr-TR")} dâhil`
                  : ""}
              </span>
            </span>
            <span className="hidden min-w-0 flex-1 md:block">
              <span className="block truncate text-sm tabular-nums">
                {ozetMetni || "Seçimleriniz burada görünecek"}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                Bütün seçimlerim{secimler.length > 0 ? ` (${secimler.length})` : ""}
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${secimlerAcik ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </span>
            </span>
          </button>

          <p className="hidden max-w-xs text-xs leading-relaxed text-muted-foreground xl:block">
            {arac.teslim}
          </p>

          <button
            type="button"
            onClick={sepeteEkle}
            disabled={!eklenebilir}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-7 py-3.5 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
          >
            {ekleniyor ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : eklendi ? (
              <>
                <Check className="h-5 w-5" aria-hidden />
                Sepete eklendi
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 shrink-0" aria-hidden />
                Sepete ekle
              </>
            )}
          </button>
        </div>

        {!urunId && hazir && (
          <p className="mt-2 text-xs text-muted-foreground">
            Bu ürün şu an sepete eklenemiyor. Sipariş için{" "}
            <Link href="/contact" className="underline underline-offset-2">
              bize yazın
            </Link>
            ; tasarımınızı birlikte tamamlayalım.
          </p>
        )}
      </div>

    </div>
  );
}
