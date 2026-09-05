"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "./WishlistButton";
import { useCartStore } from "@/store/cartStore";
import { Check, Plus, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductImageFallback } from "./ProductImageFallback";

// ==========================================
// ÜRÜN KARTI
// Görsel kartın çoğunu kaplar; çerçeve yok, bilgi
// görselin altında sabit durur. Hover'da yalnızca
// görsel yakınlaşır ve hızlı eylem çubuğu belirir.
// Parametrik ürünlerde hızlı ekleme yerine
// "Özelleştir" gösterilir — yanlış ölçüyle sepete
// ürün eklenmesini önler.
// ==========================================

export interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  featured?: boolean;
  category: { name: string; slug: string };
  averageRating?: number;
  _count?: { reviews: number; parameters?: number };
  /** Parametrik ürün mü — ölçüsü değiştirilebiliyor mu */
  isCustomizable?: boolean;
}

interface ProductCardProps {
  product: ProductCardProduct;
  /** Grid içindeki sırası — kademeli görünme için */
  index?: number;
  priority?: boolean;
}

export function ProductCard({ product, index = 0, priority = false }: ProductCardProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [imgError, setImgError] = useState(false);
  const [added, setAdded] = useState(false);

  const customizable =
    product.isCustomizable ?? (product._count?.parameters ?? 0) > 0;
  const showImage = product.thumbnailUrl && !imgError;
  const price = Number(product.basePrice);

  function handleQuickAction(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (customizable) {
      router.push(`/configure/${product.id}`);
      return;
    }

    addItem({
      product: {
        id: product.id,
        name: product.name,
        basePrice: price,
        thumbnailUrl: product.thumbnailUrl,
      },
      customization: null,
      quantity: 1,
      calculatedPrice: price,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <article
      className="group adjy-rise"
      style={{ animationDelay: `${Math.min(index, 7) * 55}ms` }}
    >
      <Link href={`/products/${product.slug}`} className="block">
        {/* Görsel */}
        <div className="relative aspect-square overflow-hidden bg-surface-2">
          {showImage ? (
            <Image
              src={product.thumbnailUrl as string}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              onError={() => setImgError(true)}
              className="adjy-zoom object-cover"
            />
          ) : (
            <ProductImageFallback slug={product.slug} />
          )}

          {/* Rozetler */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.featured && (
              <Badge variant="tech" className="bg-background/90 backdrop-blur-sm">
                Öne çıkan
              </Badge>
            )}
            {customizable && (
              <Badge variant="customizable" className="bg-background/90 backdrop-blur-sm">
                Özelleştirilebilir
              </Badge>
            )}
          </div>

          {/* Favori */}
          <div className="absolute right-2 top-2 z-10 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
            <WishlistButton productId={product.id} />
          </div>

          {/* Hızlı eylem — masaüstünde hover, mobilde gizli (karta dokunmak ürüne gider) */}
          <div className="absolute inset-x-2 bottom-2 hidden translate-y-1.5 opacity-0 transition-all duration-200 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 md:block">
            <button
              type="button"
              onClick={handleQuickAction}
              className={cn(
                "flex h-10 w-full items-center justify-center gap-2 rounded-sm text-sm font-medium transition-colors",
                added
                  ? "bg-brand-lime/15 text-brand-lime"
                  : "bg-background/95 text-foreground backdrop-blur-sm hover:bg-background"
              )}
            >
              {customizable ? (
                <>
                  <Sliders className="h-4 w-4" aria-hidden />
                  Özelleştir
                </>
              ) : added ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  Sepete eklendi
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden />
                  Hızlı ekle
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bilgi */}
        <div className="pt-4">
          <p className="adjy-eyebrow">{product.category.name}</p>
          <h3 className="mt-2 text-[15px] font-medium leading-snug tracking-tight transition-colors group-hover:text-muted-foreground">
            {product.name}
          </h3>
          <p className="mt-1.5 text-[15px] tabular-nums">
            {customizable && (
              <span className="text-muted-foreground">Başlangıç </span>
            )}
            <span className="font-medium">{price.toFixed(2)} TL</span>
          </p>
        </div>
      </Link>
    </article>
  );
}
