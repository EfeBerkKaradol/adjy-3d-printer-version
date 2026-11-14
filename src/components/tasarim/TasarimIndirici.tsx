"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { AlertTriangle, Check, Download, FolderOpen, Loader2 } from "lucide-react";
import { aracUretimKaynagi, type TasarimAraci } from "@/lib/tasarim/catalog";
import {
  klasoreYaz,
  klasoreYazilabilir,
  klasoruHazirla,
  siparisKlasoruAdi,
  type KayitHedefi,
  type KayitSonucu,
} from "@/lib/tasarim/kaydet";
import { aracArayuzu, aracMesajiMi } from "./kopru";
import {
  modeliKur,
  stlVarMi,
  uretimDosyalari,
  type IndirilecekKalem,
  type IndirilecekSiparis,
} from "./indirme";

// ==========================================
// TEK TIKLA İNDİRME
//
// Sipariş detayından ayrılmadan üretim dosyalarını indirir.
// Düğmeye basılınca:
//
//   1. Yazılacak klasör hazırlanır (ilk seferde seçtirilir).
//   2. Araç, kartın içinde küçük bir önizleme olarak, müşterinin
//      kaydıyla açılır ve modeli yeniden kurar.
//   3. STL'ler ve imalat belgeleri toplanır; "Müşteri Adı -
//      Sipariş No" klasörüne, sipariş bilgisiyle birlikte yazılır.
//
// Önizleme süs değil: araç modeli ekrana çizerken kuruyor.
// Görünmeyen bir çerçevede tarayıcı çizimi durdurur ve model
// kurulmadan STL alınmış olurdu.
//
// Üretim ekranını açmak isteğe bağlı kalır — modeli incelemek,
// tek tek dosya almak ya da bir alanı elle düzeltmek için.
// ==========================================

interface Props {
  arac: TasarimAraci;
  siparis: IndirilecekSiparis;
  kalem: IndirilecekKalem;
  /** Siparişte birden çok tasarım ürünü varsa dosyalar bu alt klasöre girer */
  altKlasor: string | null;
}

type Asama =
  | { ad: "bos" }
  | { ad: "calisiyor"; adim: string }
  | { ad: "uyari"; mesaj: string }
  | { ad: "bitti"; sonuc: KayitSonucu }
  | { ad: "hata"; mesaj: string };

export function TasarimIndirici({ arac, siparis, kalem, altKlasor }: Props) {
  const { resolvedTheme } = useTheme();
  const cerceveRef = useRef<HTMLIFrameElement>(null);
  const hedefRef = useRef<KayitHedefi | null>(null);
  const basladiRef = useRef(false);
  const [kaynak, setKaynak] = useState<string | null>(null);
  const [asama, setAsama] = useState<Asama>({ ad: "bos" });

  const klasorAdi = siparisKlasoruAdi(siparis.musteri, siparis.no);

  const kapat = useCallback(() => {
    setKaynak(null);
    basladiRef.current = false;
  }, []);

  /** Model kurulduktan sonra: dosyaları topla ve yaz */
  const topVeYaz = useCallback(async () => {
    const arayuz = aracArayuzu(cerceveRef.current);
    const hedef = hedefRef.current;
    if (!arayuz || !hedef) return;
    try {
      setAsama({ ad: "calisiyor", adim: "Dosyalar hazırlanıyor" });
      const dosyalar = await uretimDosyalari(arayuz, arac, siparis, kalem);
      if (!stlVarMi(dosyalar)) {
        setAsama({
          ad: "hata",
          mesaj: "Araç STL üretmedi. Üretim panelini açıp dosyaları oradan alın.",
        });
        kapat();
        return;
      }
      setAsama({ ad: "calisiyor", adim: "Klasöre yazılıyor" });
      const sonuc = await klasoreYaz(hedef, klasorAdi, altKlasor, dosyalar);
      setAsama({ ad: "bitti", sonuc });
    } catch (e) {
      setAsama({
        ad: "hata",
        mesaj:
          e instanceof Error && e.message
            ? `Dosyalar kaydedilemedi: ${e.message}`
            : "Dosyalar kaydedilemedi.",
      });
    }
    kapat();
  }, [altKlasor, arac, kalem, kapat, klasorAdi, siparis]);

  /** Araç hazır: müşterinin modelini kur, tutuyorsa devam et */
  const calistir = useCallback(async () => {
    if (basladiRef.current) return;
    const arayuz = aracArayuzu(cerceveRef.current);
    if (!arayuz) return;
    basladiRef.current = true;
    setAsama({ ad: "calisiyor", adim: "Müşterinin modeli kuruluyor" });
    const kurulum = await modeliKur(arayuz, kalem);
    if (!kurulum.tutuyor) {
      // Çerçeve açık kalır: "Yine de indir" denirse ekrandaki modelden alınır
      setAsama({
        ad: "uyari",
        mesaj: `Kurulan model siparişle tutmuyor: siparişte ${kurulum.siparisG} g filament, modelde ${
          kurulum.modelG ?? "?"
        } g. Fiyat bu ölçümden hesaplandı; basmadan önce üretim panelinde kontrol edin.`,
      });
      return;
    }
    await topVeYaz();
  }, [kalem, topVeYaz]);

  useEffect(() => {
    if (!kaynak) return;
    function dinle(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!aracMesajiMi(e.data, arac.id)) return;
      if (e.data.tur === "hazir") void calistir();
    }
    window.addEventListener("message", dinle);
    return () => window.removeEventListener("message", dinle);
  }, [arac.id, calistir, kaynak]);

  // Klasör penceresi yalnızca tıklamanın hemen ardından açılabildiği
  // için hedef burada, araç yüklenmeden önce hazırlanır.
  const indir = useCallback(
    async (yeniKlasor: boolean) => {
      const hedef = await klasoruHazirla(yeniKlasor);
      if (!hedef) return; // kullanıcı klasör seçmekten vazgeçti
      hedefRef.current = hedef;
      basladiRef.current = false;
      setAsama({ ad: "calisiyor", adim: "Araç açılıyor" });
      setKaynak(
        `${aracUretimKaynagi(arac.id)}?tema=${resolvedTheme === "dark" ? "koyu" : "acik"}`
      );
    },
    [arac.id, resolvedTheme]
  );

  const calisiyor = asama.ad === "calisiyor";

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => indir(false)}
          disabled={calisiyor || asama.ad === "uyari"}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {calisiyor ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="h-3.5 w-3.5" aria-hidden />
          )}
          {calisiyor ? asama.adim : "İndir"}
        </button>
        {asama.ad === "bos" && (
          <span className="text-[11px] text-muted-foreground">
            STL ve imalat dosyaları → {klasorAdi}
          </span>
        )}
      </div>

      {/* Araç burada çalışır; model kurulurken görünür olması gerekiyor */}
      {kaynak && (
        <div className="mt-3 flex items-start gap-3">
          <div
            className="relative shrink-0 overflow-hidden rounded-lg bg-surface-2 adjy-pixel-frame"
            style={{ width: 320, height: 200 }}
            aria-hidden
          >
            <iframe
              ref={cerceveRef}
              src={kaynak}
              title=""
              tabIndex={-1}
              className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
              style={{ width: 1280, height: 800, transform: "scale(0.25)" }}
            />
          </div>
          {asama.ad === "calisiyor" && (
            <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
              {asama.adim}. Araç müşterinin kaydıyla açılıyor; dosyalar hazır
              olunca kendiliğinden kaydedilecek.
            </p>
          )}
          {asama.ad === "uyari" && (
            <div className="space-y-2 pt-1 text-xs">
              <p className="flex items-start gap-1.5 leading-relaxed text-brand-amber">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {asama.mesaj}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void topVeYaz()}
                  className="rounded-md px-2.5 py-1.5 adjy-pixel-frame hover:bg-muted"
                >
                  Yine de indir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    kapat();
                    setAsama({ ad: "bos" });
                  }}
                  className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-muted"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {asama.ad === "bitti" && (
        <div className="mt-3 rounded-lg bg-brand-lime/10 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-brand-lime">
            {asama.sonuc.tur === "klasor" ? (
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            {asama.sonuc.tur === "klasor"
              ? `${asama.sonuc.dosyalar.length} dosya kaydedildi`
              : `${asama.sonuc.dosyalar.length} dosya tek ZIP olarak indirildi`}
          </p>
          <p className="mt-1 break-all font-mono text-muted-foreground">{asama.sonuc.yer}</p>
          <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
            {asama.sonuc.dosyalar.map((d) => (
              <li key={d} className="break-all">
                {d}
              </li>
            ))}
          </ul>
          {asama.sonuc.tur === "klasor" ? (
            <button
              type="button"
              onClick={() => indir(true)}
              className="mt-2 underline underline-offset-2 hover:text-foreground"
            >
              Başka bir klasöre kaydet
            </button>
          ) : (
            !klasoreYazilabilir() && (
              <p className="mt-2 text-muted-foreground">
                Bu tarayıcı klasöre doğrudan yazamıyor; ZIP&apos;i açınca aynı
                klasör yapısı çıkar. Chrome ya da Edge&apos;de dosyalar seçtiğiniz
                klasöre doğrudan yazılır.
              </p>
            )
          )}
        </div>
      )}

      {asama.ad === "hata" && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          {asama.mesaj}
        </p>
      )}
    </div>
  );
}
