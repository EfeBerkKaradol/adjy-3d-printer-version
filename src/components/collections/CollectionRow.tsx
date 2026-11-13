import Image from "next/image";
import Link from "next/link";
import { PixelArrow } from "@/components/home/PixelMoreButton";
import { ProductCard, type ProductCardProduct } from "@/components/product/ProductCard";
import { formatPrice } from "@/lib/pricing";

// ==========================================
// KOLEKSİYON ŞERİDİ
//
// Koleksiyonlar sayfası yalnızca kategori adlarını listeliyordu:
// tek bir ürün, tek bir fiyat görünmüyordu. Burasının bir giriş
// kapısı olması, alışverişin başka bir sayfada başlaması
// gerektiği anlamına gelmiyor — insanlar birden çok şey almak
// için bu sayfaya geliyor.
//
// Her koleksiyon artık kendi ürünlerini gösterir; kart üzerinden
// doğrudan sepete eklenebilir. Üstte koleksiyonun büyüklüğü ve
// başlangıç fiyatı durur, böylece tıklamadan önce ne bulacağını
// bilirsin.
// ==========================================

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  productCount: number;
  fromPrice: number | null;
  products: ProductCardProduct[];
}

export function CollectionRow({ collection }: { collection: Collection }) {
  const { name, slug, description, coverUrl, productCount, fromPrice, products } =
    collection;
  const href = `/products?category=${slug}`;

  return (
    <section className="border-t border-border/60 py-12 first:border-t-0 first:pt-0 md:py-16">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {coverUrl && (
            <div className="adjy-pixel-box relative hidden h-20 w-20 shrink-0 overflow-hidden bg-muted sm:block">
              <Image
                src={coverUrl}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
                aria-hidden
              />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="adjy-display text-[clamp(1.3rem,2.4vw,1.85rem)]">
              <Link href={href} className="transition-colors hover:text-muted-foreground">
                {name}
              </Link>
            </h2>
            <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">
              {productCount} ürün
              {fromPrice !== null && <> · {formatPrice(fromPrice)}&apos;den başlayan</>}
            </p>
            {description && (
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>

        <Link
          href={href}
          className="adjy-pixel-card group inline-flex shrink-0 items-center gap-3 self-start px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] sm:self-auto"
        >
          Koleksiyonun tamamı
          <PixelArrow className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}
