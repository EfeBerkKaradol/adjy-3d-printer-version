import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
            <div className="relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
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
          className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
        >
          Koleksiyonun tamamı
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}
