import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Ruler } from "lucide-react";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// MAĞAZA KARŞILAMASI
//
// Eski ana sayfa bir manifestoyla açılıyordu: ilk ekranda tek
// bir ürün, tek bir fiyat yoktu. Ziyaretçi burasının bir mağaza
// olduğunu ancak kaydırarak anlıyordu — anlamadan da çoğu
// ayrılıyordu.
//
// Bu bölüm ilk ekranda üç şeyi birden söyler: ne sattığımızı
// (gerçek nesneler, fiyatlarıyla), bizi ayıranı (ölçüsünü sen
// seçiyorsun) ve nereye gidileceğini (mağaza ya da yapılandır).
//
// Dönen bir kayar vitrin yok: taşıyıcı bilgiyi yalnızca bir
// slaytta tutmak, özellikle telefonda, görülmemesi demek.
// ==========================================

export interface HeroCard {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  thumbnailUrl: string | null;
  category: { name: string };
  isCustomizable: boolean;
}

interface Props {
  products: HeroCard[];
  /** Katalogdaki toplam ürün — "33 nesne" gibi somut bir sayı güven verir */
  totalCount: number;
}

export function StoreHero({ products, totalCount }: Props) {
  const kartlar = products.slice(0, 3);

  return (
    <section className="border-b border-border/60">
      <div className="adjy-container grid items-center gap-10 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:py-16">
        <div className="max-w-xl">
          <p className="adjy-eyebrow mb-5">Tasarım nesneleri · Kendi atölyemizden</p>
          <h1 className="adjy-display text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.05]">
            Ölçüsünü senin seçtiğin{" "}
            <span className="whitespace-nowrap">tasarım nesneleri</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Vazo, saksı, aydınlatma, masa düzeni ve dekoratif figürler. 3D baskı,
            seramik ve alçı ile tek tek üretiyoruz — çoğunun ölçüsünü kendi
            alanına göre değiştirebilirsin.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              {totalCount > 0 ? `${totalCount} nesneyi keşfet` : "Mağazayı keşfet"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/configure"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Ruler className="h-4 w-4" aria-hidden />
              Kendi ölçünde ürettir
            </Link>
          </div>
        </div>

        {kartlar.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {kartlar.map((p, i) => (
              <li
                key={p.id}
                /* Üçüncü kart telefonda tek başına bir satıra düşüp
                   boşluk bırakıyordu; orada iki sütuna yayılır. */
                className={i === 2 ? "col-span-2 lg:col-span-1" : undefined}
              >
                <Link href={`/products/${p.slug}`} className="group block">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                    {p.thumbnailUrl ? (
                      <Image
                        src={p.thumbnailUrl}
                        alt={p.name}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        priority={i === 0}
                      />
                    ) : null}
                    {p.isCustomizable && (
                      <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
                        Ölçüsü değişir
                      </span>
                    )}
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-sm font-medium leading-snug">
                    {p.name}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                    {formatTRY(p.basePrice)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
