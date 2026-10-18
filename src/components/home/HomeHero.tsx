import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Ruler } from "lucide-react";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// KARŞILAMA
//
// Önceki hâli metin ağırlıklıydı: solda bir paragraf, sağda üç
// küçük kare. Doğru şeyleri söylüyordu ama bir mağaza vitrini
// gibi durmuyordu — iyi tasarım mağazalarında ilk ekran bir
// nesnenin kendisidir, onun anlatımı değil.
//
// Artık büyük bir nesne görseli var ve başlık görselin üstüne
// biniyor. Altında iki küçük kare daha: kataloğun tek bir
// şeyden ibaret olmadığı daha ilk bakışta görünsün.
//
// Fiyatlar kartların üstünde duruyor; burasının bir mağaza
// olduğu söylenmeden anlaşılsın.
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
  /** İlki büyük karede, sonraki ikisi altta */
  products: HeroCard[];
}

export function HomeHero({ products }: Props) {
  const [kahraman, ...digerleri] = products;
  const yan = digerleri.slice(0, 2);

  return (
    <section className="adjy-container pb-10 pt-8 lg:pb-16 lg:pt-12">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-14">
        <div>
          <p className="adjy-eyebrow mb-5">Tasarım ürünleri · Kendi atölyemizden</p>
          <h1 className="adjy-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[1.02]">
            İstediğiniz ölçüde
            <br />
            <span className="text-muted-foreground">tasarım ürünleri</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Vazo, saksı, aydınlatma, masa düzeni ve dekoratif figürler. Her biri
            kendi atölyemizde, siparişe göre üretiliyor — çoğunun ölçüsünü
            alanınıza göre belirleyebilirsiniz.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Ürünleri keşfet
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/products?customizable=true"
              className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Ruler className="h-4 w-4" aria-hidden />
              Özel ölçüde üretim
            </Link>
          </div>
        </div>

        {kahraman && (
          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {/* Büyük kare: başlık görselin üstüne biner */}
            <Link
              href={`/products/${kahraman.slug}`}
              className="group relative col-span-full overflow-hidden rounded-2xl bg-muted sm:col-span-2 sm:row-span-2"
            >
              <div className="relative aspect-[4/5] sm:aspect-auto sm:h-full sm:min-h-[26rem]">
                {kahraman.thumbnailUrl && (
                  <Image
                    src={kahraman.thumbnailUrl}
                    alt={kahraman.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 40vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    priority
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-5 pt-16">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">
                    {kahraman.category.name}
                  </p>
                  <p className="mt-1 text-lg font-medium leading-snug text-white">
                    {kahraman.name}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-white/90">
                    {formatTRY(kahraman.basePrice)}
                    {kahraman.isCustomizable && (
                      <span className="text-white/70"> · ölçüsü değişir</span>
                    )}
                  </p>
                </div>
              </div>
            </Link>

            {yan.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group block"
              >
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  {p.thumbnailUrl && (
                    <Image
                      src={p.thumbnailUrl}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 20vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  )}
                  {p.isCustomizable && (
                    <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                      Ölçüsü değişir
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-medium">{p.name}</p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatTRY(p.basePrice)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
