import Link from "next/link";
import Image from "next/image";
import { Reveal } from "./Reveal";
import { Button } from "@/components/ui/button";
import { ProductImageFallback } from "@/components/product/ProductImageFallback";
import { ArrowRight } from "lucide-react";

// ==========================================
// MAĞAZAYA GEÇİŞ
//
// Ana sayfanın son keşif kancası. Anlatı burada
// biter ve ziyaretçi katalogun kapısına bırakılır.
// Kartlar küçük ve bilgisiz: amaç ürün satmak değil,
// "burada daha çok şey var" hissi verip mağazaya
// göndermek.
// ==========================================

export interface ShopTeaserProduct {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
}

interface ExploreShopProps {
  products: ShopTeaserProduct[];
  totalCount: number;
}

export function ExploreShop({ products, totalCount }: ExploreShopProps) {
  if (products.length === 0) return null;

  return (
    <section className="adjy-container adjy-section" aria-label="Mağazayı keşfet">
      <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="adjy-eyebrow mb-5">Mağaza</p>
          <h2 className="adjy-display text-[clamp(2rem,4.2vw,3.25rem)]">
            Katalogda {totalCount} nesne var.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            Yukarıdakiler yalnızca birkaçı. Tamamına göz at, beğendiğini kendi
            ölçünde ürettir.
          </p>
        </div>

        <Button asChild size="xl" className="shrink-0">
          <Link href="/products">
            Nesneleri keşfet
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </Reveal>

      <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        {products.map((product, i) => (
          <Reveal as="li" key={product.id} index={i}>
            <Link
              href={`/products/${product.slug}`}
              className="group block"
              aria-label={product.name}
            >
              <div className="relative aspect-square overflow-hidden bg-surface-2">
                {product.thumbnailUrl ? (
                  <Image
                    src={product.thumbnailUrl}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 50vw, 17vw"
                    className="adjy-zoom object-cover"
                  />
                ) : (
                  <ProductImageFallback slug={product.slug} />
                )}
              </div>
              <p className="mt-2.5 truncate text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                {product.name}
              </p>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
