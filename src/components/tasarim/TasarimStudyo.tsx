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
import { useHydrated } from "@/hooks/useClientState";
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
  // İstemcide tema ilk çizimde hazır olabiliyor; sunucunun gönderdiği
  // sayfada ise çerçeve yok. İkisi aynı çıksın diye çerçeve ancak
  // sayfa canlandıktan sonra eklenir.
  const canli = useHydrated();
  if (canli && ilkTema === null && resolvedTheme) setIlkTema(resolvedTheme);
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
  // Araçtaki rehber son adımda sepet düğmesini işaret eder
  const [sepetVurgu, setSepetVurgu] = useState(false);

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
      if (e.data.tur === "rehber") {
        setSepetVurgu(true);
        window.setTimeout(() => setSepetVurgu(false), 2600);
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

  const sepetIcerigi = ekleniyor ? (
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
  );

  const fiyatNotu = `KDV dâhil${
    arac.ekMaliyetAciklamasi
      ? ` · ${arac.ekMaliyetAciklamasi.toLocaleLowerCase("tr-TR")} dâhil`
      : ""
  }`;

  return (
    // Sayfa çerçevesiz açılır (SiteShell): mağaza başlığı ve altbilgi yok,
    // ekranın tamamı araca kalır. Geniş ekranda fiyat ve sepet üst çubukta
    // durur; araç, ayarları modelin iki yanına dizer ve hiçbir şey
    // kaydırılmaz. Dar ekranda fiyat çubuğu altta kalır.
    <div className="flex h-dvh flex-col bg-background">
      {/* ---------- ÜST ÇUBUK ---------- */}
      <div className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b-2 border-dashed border-foreground/25 bg-background px-3 lg:gap-4 lg:px-5">
        <Link
          href={aracAdresi(arac.id)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 text-sm transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Ürün sayfası</span>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-medium tracking-tight lg:flex-none lg:text-lg">
          {arac.ad}
        </h1>

        {/* Seçimlerin kısa hâli; tıklanınca tam liste açılır */}
        <button
          type="button"
          onClick={() => setSecimlerAcik((a) => !a)}
          aria-expanded={secimlerAcik}
          disabled={secimler.length === 0}
          className="hidden min-w-0 flex-1 items-center justify-end gap-2 text-right text-sm text-muted-foreground transition-colors hover:text-foreground disabled:hover:text-muted-foreground lg:flex"
        >
          <span className="truncate tabular-nums">
            {ozetMetni || "Seçimleriniz burada görünecek"}
          </span>
          {secimler.length > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-foreground">
              {secimler.length}
              <ChevronDown
                className={`h-3 w-3 transition-transform ${secimlerAcik ? "rotate-180" : ""}`}
                aria-hidden
              />
            </span>
          )}
        </button>

        <div className="hidden shrink-0 text-right lg:block">
          <span className="block text-lg leading-tight font-semibold tabular-nums">
            {hazir ? formatTRY(fiyat) : "—"}
          </span>
          <span className="block text-[11px] leading-tight text-muted-foreground">
            {fiyatNotu}
          </span>
        </div>

        {ayrintiVar && (
          <button
            type="button"
            onClick={ayarlariDegistir}
            aria-pressed={tumAyarlar}
            title={tumAyarlar ? "Yalnızca temel ayarları göster" : "Bütün ayarları göster"}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm transition-colors ${
              tumAyarlar ? "bg-muted hover:bg-accent" : "bg-foreground text-background"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            <span className="hidden xl:inline">
              {tumAyarlar ? "Sade görünüm" : "Tüm ayarlar"}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={sepeteEkle}
          disabled={!eklenebilir}
          className={`hidden h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-[opacity,box-shadow] hover:opacity-90 disabled:opacity-50 lg:inline-flex ${
            sepetVurgu ? "animate-pulse ring-4 ring-foreground/30 ring-offset-2 ring-offset-background" : ""
          }`}
        >
          {sepetIcerigi}
        </button>

        {/* Bütün seçimler: çubuğun altına açılır, modelin üstünde durur */}
        {secimlerAcik && secimler.length > 0 && (
          <div className="absolute top-full right-3 z-30 mt-2 hidden w-[min(34rem,calc(100vw-1.5rem))] rounded-xl border border-foreground/15 bg-background p-4 shadow-lg lg:right-5 lg:block">
            <dl className="grid max-h-[50vh] gap-x-8 gap-y-1.5 overflow-y-auto text-xs sm:grid-cols-2">
              {secimler.map((s) => (
                <div key={s.ad} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{s.ad}</dt>
                  <dd className="text-right tabular-nums">{s.deger}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 border-t border-dashed border-foreground/20 pt-3 text-xs leading-relaxed text-muted-foreground">
              {arac.teslim}
            </p>
          </div>
        )}
      </div>

      {/* ---------- ARAÇ ---------- */}
      <div className="relative min-h-0 flex-1 bg-surface-2">
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

        {/* Bildirimler modelin üstünde, ortada belirir; ayar sütunlarını ve
            aracın adım çubuğunu örtmez */}
        <div className="pointer-events-none absolute inset-x-0 top-16 z-20 hidden justify-center px-4 lg:flex">
          <div className="pointer-events-auto flex max-w-xl flex-col gap-2">
            {hata && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive shadow-md"
              >
                {hata}
              </p>
            )}
            {eklenenOzet !== null && !hata && (
              <p
                role="status"
                className="flex items-center gap-x-3 rounded-lg border border-foreground/15 bg-background px-3 py-2 text-sm shadow-md"
              >
                <span className="inline-flex shrink-0 items-center gap-1.5 font-medium">
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
            {!urunId && hazir && (
              <p className="rounded-lg border border-foreground/15 bg-background px-3 py-2 text-xs text-muted-foreground shadow-md">
                Bu ürün şu an sepete eklenemiyor. Sipariş için{" "}
                <Link href="/contact" className="underline underline-offset-2">
                  bize yazın
                </Link>
                ; tasarımınızı birlikte tamamlayalım.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ---------- DAR EKRAN: FİYAT VE SEPET ALTTA ---------- */}
      <div className="shrink-0 border-t-2 border-dashed border-foreground/25 bg-background px-4 py-3 lg:hidden">
        {secimlerAcik && secimler.length > 0 && (
          <dl className="mb-3 grid max-h-[40vh] gap-x-8 gap-y-1.5 overflow-y-auto rounded-lg bg-muted/50 p-3 text-xs sm:grid-cols-2">
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

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSecimlerAcik((a) => !a)}
            aria-expanded={secimlerAcik}
            disabled={secimler.length === 0}
            className="min-w-0 flex-1 text-left"
          >
            <span className="block text-xl font-semibold tabular-nums">
              {hazir ? formatTRY(fiyat) : "—"}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              {fiyatNotu}
              {secimler.length > 0 && (
                <>
                  {" · "}seçimlerim ({secimler.length})
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${secimlerAcik ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={sepeteEkle}
            disabled={!eklenebilir}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3.5 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sepetIcerigi}
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
