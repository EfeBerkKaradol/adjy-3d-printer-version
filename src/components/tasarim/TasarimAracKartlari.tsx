import Image from "next/image";
import Link from "next/link";
import { aracAdresi, aracGorseli, type TasarimAraci } from "@/lib/tasarim/catalog";
import { tasarimBaslangicFiyati } from "@/lib/tasarim/pricing";
import { resolvePublicImage } from "@/lib/publicAsset";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// TASARIM ARAÇLARI — KART IZGARASI
//
// Kendin Tasarla, Üret ve Mobilya sayfaları aynı kartları
// gösteriyor: her kart bir parametrik ürünün tanıtım sayfasına
// açılır. Tek yerde durur ki üç sayfa birbirinden kopmasın.
// ==========================================

interface Props {
  araclar: TasarimAraci[];
  /** İlk kaç görsel öncelikli yüklensin (sayfanın üstündeyse) */
  oncelikli?: number;
  /** Başlık etiketi: sayfanın ana listesi h2, alt bölümde h3 */
  baslikEtiketi?: "h2" | "h3";
}

export function TasarimAracKartlari({ araclar, oncelikli = 3, baslikEtiketi = "h2" }: Props) {
  const Baslik = baslikEtiketi;
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {araclar.map((a, i) => {
        const gorsel = resolvePublicImage(aracGorseli(a.id));
        return (
          <li key={a.id}>
            <Link
              href={aracAdresi(a.id)}
              className="group flex h-full flex-col overflow-hidden rounded-xl adjy-pixel-frame transition-colors hover:border-foreground/40"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                {gorsel ? (
                  <Image
                    src={gorsel}
                    alt={a.ad}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={i < oncelikli}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <ProductImageFallback slug={a.id} />
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <Baslik className="text-base font-medium leading-snug tracking-tight">
                  {a.ad}
                </Baslik>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {a.ozet}
                </p>
                <ul className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                  {a.ayarlar.map((ayar) => (
                    <li
                      key={ayar}
                      className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      {ayar}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-baseline justify-between gap-3">
                  <span className="text-base font-medium tabular-nums">
                    {formatTRY(tasarimBaslangicFiyati(a))}
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
