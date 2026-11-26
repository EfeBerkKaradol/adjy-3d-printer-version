import Image from "next/image";
import Link from "next/link";
import {
  ONE_CIKANLAR,
  aracAdresi,
  aracAnimasyonu,
  aracGorseli,
  vitrinSirasi,
  type TasarimAraci,
} from "@/lib/tasarim/catalog";
import { KartVideosu } from "./KartVideosu";
import { tasarimBaslangicFiyati } from "@/lib/tasarim/pricing";
import { resolvePublicImage } from "@/lib/publicAsset";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { PixelArrow } from "@/components/home/PixelMoreButton";
import { formatTRY } from "@/lib/slicer";
import { cn } from "@/lib/utils";

// ==========================================
// TASARIM ARAÇLARI — KART IZGARASI
//
// Kendin Tasarla, Üret ve Mobilya sayfaları aynı kartları
// gösteriyor: her kart bir parametrik ürünün tanıtım sayfasına
// açılır. Tek yerde durur ki üç sayfa birbirinden kopmasın.
//
// Kart, ürünün tek bir hâli olmadığını göstermeye çalışır:
// üzerine gelince görsel, aynı ürünün başka bir kurulumuna
// döner. "vitrin" verilen ürün ızgaranın başında iki kat
// büyüklükte durur (yeni ya da öne çıkarılan ürün).
// ==========================================

interface Props {
  araclar: TasarimAraci[];
  /** İlk kaç görsel öncelikli yüklensin (sayfanın üstündeyse) */
  oncelikli?: number;
  /** Başlık etiketi: sayfanın ana listesi h2, alt bölümde h3 */
  baslikEtiketi?: "h2" | "h3";
  /** Başa alınıp büyük gösterilecek ürün */
  vitrin?: string;
  /** Büyük kartın etiketi */
  vitrinEtiketi?: string;
  /**
   * true: öne çıkanlar ve animasyonlu ürünler başa alınır
   * (catalog.ts, vitrinSirasi). false: verilen sıra korunur.
   */
  sirala?: boolean;
  /**
   * Tek sıra, sade kart: geniş ekranda 5 kart yan yana,
   * dar ekranda yatay kaydırılan bir sıra. Ayar etiketleri
   * gizlenir, özet iki satırla sınırlanır (Üret sayfası).
   */
  kompakt?: boolean;
}

const KISA_AYAR = 3;

export function TasarimAracKartlari({
  araclar,
  oncelikli = 3,
  baslikEtiketi = "h2",
  vitrin,
  vitrinEtiketi = "Öne çıkan",
  sirala = true,
  kompakt = false,
}: Props) {
  const Baslik = baslikEtiketi;
  const temel = sirala ? vitrinSirasi(araclar) : araclar;
  const sirali = vitrin
    ? [...temel].sort((a, b) => Number(b.id === vitrin) - Number(a.id === vitrin))
    : temel;
  const toplam = String(sirali.length).padStart(2, "0");

  return (
    <ul
      className={cn(
        kompakt
          ? "-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-3 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0"
          : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
      )}
    >
      {sirali.map((a, i) => {
        const buyuk = a.id === vitrin;
        const gorsel = resolvePublicImage(aracGorseli(a.id));
        const ikinci = resolvePublicImage(`/tasarim-araclari/_gorsel/${a.id}-2.jpg`);
        const animasyon = aracAnimasyonu(a);
        const oneCikan = ONE_CIKANLAR.includes(a.id);
        const ayarlar = buyuk ? a.ayarlar : a.ayarlar.slice(0, KISA_AYAR);
        const kalan = a.ayarlar.length - ayarlar.length;
        return (
          <li
            key={a.id}
            className={cn(
              "flex",
              buyuk && "sm:col-span-2 lg:row-span-2",
              kompakt && "w-[72%] shrink-0 snap-start sm:w-[42%] md:w-[30%] lg:w-auto"
            )}
          >
            <Link
              href={aracAdresi(a.id)}
              className="adjy-pixel-card group flex w-full flex-col"
            >
              <div
                className={cn(
                  "relative overflow-hidden bg-surface-2",
                  buyuk ? "aspect-[4/3] lg:aspect-auto lg:min-h-[440px] lg:flex-1" : "aspect-[4/3]"
                )}
              >
                {gorsel ? (
                  <Image
                    src={gorsel}
                    alt={a.ad}
                    fill
                    sizes={
                      buyuk
                        ? "(max-width: 640px) 100vw, 66vw"
                        : kompakt
                          ? "(max-width: 640px) 72vw, (max-width: 1024px) 40vw, 20vw"
                          : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    }
                    priority={i < oncelikli}
                    className={cn(
                      "object-cover transition-transform duration-700 group-hover:scale-[1.04]",
                      // Geniş kartta kare görsel kırpılır: odak pistin başında (araba orada)
                      buyuk && "object-[30%_70%]"
                    )}
                  />
                ) : (
                  <ProductImageFallback slug={a.id} />
                )}
                {/* Animasyonlu ürün: üzerine gelince ayarların değiştiği döngü
                    oynar (büyük kartta hemen). Yoksa aynı ürünün başka bir
                    kurulumu belirir. */}
                {gorsel && animasyon ? (
                  <KartVideosu adres={animasyon} otomatik={buyuk} />
                ) : gorsel && ikinci && (
                  <Image
                    src={ikinci}
                    alt=""
                    fill
                    sizes={buyuk ? "66vw" : kompakt ? "20vw" : "33vw"}
                    className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                )}
                <span className="absolute left-3 top-3 flex items-center gap-1.5">
                  <span className="adjy-pixel-box bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums tracking-[0.1em]">
                    {String(i + 1).padStart(2, "0")} / {toplam}
                  </span>
                  {(buyuk || oneCikan) && (
                    <span className="adjy-pixel-box bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-background">
                      {buyuk ? vitrinEtiketi : "Öne çıkan"}
                    </span>
                  )}
                </span>
                {animasyon && (
                  <span className="adjy-pixel-box absolute right-3 top-3 flex items-center gap-1 bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]">
                    <span aria-hidden className="text-[8px]">▶</span>
                    Canlı önizleme
                  </span>
                )}
                <span className="adjy-pixel-box absolute bottom-3 left-3 bg-background px-2 py-1 font-mono text-xs font-semibold tabular-nums">
                  {formatTRY(tasarimBaslangicFiyati(a))}
                </span>
              </div>

              <div
                className={cn(
                  "flex flex-1 flex-col border-t-2 border-dashed border-foreground/80",
                  kompakt ? "p-3.5" : "p-4",
                  buyuk && "lg:flex-none lg:p-6"
                )}
              >
                <Baslik
                  className={cn(
                    "font-semibold leading-snug tracking-tight",
                    buyuk
                      ? "text-xl lg:text-3xl lg:tracking-[-0.03em]"
                      : kompakt
                        ? "text-base"
                        : "text-lg"
                  )}
                >
                  {a.ad}
                </Baslik>
                <p
                  className={cn(
                    "mt-1.5 leading-relaxed text-muted-foreground",
                    buyuk ? "text-sm lg:text-base" : "text-sm",
                    kompakt && "line-clamp-2 flex-1 text-[13px]"
                  )}
                >
                  {a.ozet}
                </p>
                {!kompakt && (
                  <ul className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                    {ayarlar.map((ayar) => (
                      <li
                        key={ayar}
                        className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
                      >
                        {ayar}
                      </li>
                    ))}
                    {kalan > 0 && (
                      <li className="rounded-full border border-dashed border-foreground/25 px-2.5 py-1 text-[11px] text-muted-foreground">
                        +{kalan} ayar
                      </li>
                    )}
                  </ul>
                )}
                <p className="mt-4 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
                    Kendin kur
                    <PixelArrow className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                  {!kompakt && (
                    <span className="text-xs text-muted-foreground">varsayılan ölçüde</span>
                  )}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
