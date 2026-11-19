import Image from "next/image";
import Link from "next/link";
import { aracAdresi, aracGorseli, type TasarimAraci } from "@/lib/tasarim/catalog";
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
}

const KISA_AYAR = 3;

export function TasarimAracKartlari({
  araclar,
  oncelikli = 3,
  baslikEtiketi = "h2",
  vitrin,
  vitrinEtiketi = "Yeni",
}: Props) {
  const Baslik = baslikEtiketi;
  const sirali = vitrin
    ? [...araclar].sort((a, b) => Number(b.id === vitrin) - Number(a.id === vitrin))
    : araclar;
  const toplam = String(sirali.length).padStart(2, "0");

  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {sirali.map((a, i) => {
        const buyuk = a.id === vitrin;
        const gorsel = resolvePublicImage(aracGorseli(a.id));
        const ikinci = resolvePublicImage(`/tasarim-araclari/_gorsel/${a.id}-2.jpg`);
        const ayarlar = buyuk ? a.ayarlar : a.ayarlar.slice(0, KISA_AYAR);
        const kalan = a.ayarlar.length - ayarlar.length;
        return (
          <li key={a.id} className={cn("flex", buyuk && "sm:col-span-2 lg:row-span-2")}>
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
                {/* Aynı ürünün başka bir kurulumu: üzerine gelince belirir */}
                {gorsel && ikinci && (
                  <Image
                    src={ikinci}
                    alt=""
                    fill
                    sizes={buyuk ? "66vw" : "33vw"}
                    className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  />
                )}
                <span className="absolute left-3 top-3 flex items-center gap-1.5">
                  <span className="adjy-pixel-box bg-background px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums tracking-[0.1em]">
                    {String(i + 1).padStart(2, "0")} / {toplam}
                  </span>
                  {buyuk && (
                    <span className="adjy-pixel-box bg-foreground px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-background">
                      {vitrinEtiketi}
                    </span>
                  )}
                </span>
                <span className="adjy-pixel-box absolute bottom-3 left-3 bg-background px-2 py-1 font-mono text-xs font-semibold tabular-nums">
                  {formatTRY(tasarimBaslangicFiyati(a))}
                </span>
              </div>

              <div
                className={cn(
                  "flex flex-1 flex-col border-t-2 border-dashed border-foreground/80 p-4",
                  buyuk && "lg:flex-none lg:p-6"
                )}
              >
                <Baslik
                  className={cn(
                    "font-semibold leading-snug tracking-tight",
                    buyuk ? "text-xl lg:text-3xl lg:tracking-[-0.03em]" : "text-lg"
                  )}
                >
                  {a.ad}
                </Baslik>
                <p
                  className={cn(
                    "mt-1.5 leading-relaxed text-muted-foreground",
                    buyuk ? "text-sm lg:text-base" : "text-sm"
                  )}
                >
                  {a.ozet}
                </p>
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
                <p className="mt-4 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]">
                    Kendin kur
                    <PixelArrow className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                  </span>
                  <span className="text-xs text-muted-foreground">varsayılan ölçüde</span>
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
