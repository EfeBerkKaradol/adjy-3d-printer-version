"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "./WishlistButton";
import { useCartStore } from "@/store/cartStore";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductImageFallback } from "./ProductImageFallback";
import { getPriceInfo, formatPrice } from "@/lib/pricing";
import { formatCmValue } from "@/lib/units";
import { CardSizeControls, type KartParametre } from "./CardSizeControls";

// ==========================================
// ÜRÜN KARTI
// Görsel kartın çoğunu kaplar; çerçeve yok, bilgi
// görselin altında sabit durur. Hover'da yalnızca
// görsel yakınlaşır ve hızlı eylem çubuğu belirir.
// Ölçüsü değişen ürünlerde kaydırıcı kartın altında
// durur: ölçü burada seçilir, sepete o ölçüyle girer.
// Önceden ayrı bir "Yapılandır" sayfasına gitmek
// gerekiyordu.
// ==========================================

export interface ProductCardProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number;
  /** Üstü çizili eski fiyat — indirim yoksa null */
  compareAtPrice?: number | null;
  thumbnailUrl: string | null;
  featured?: boolean;
  category: { name: string; slug: string };
  averageRating?: number;
  _count?: { reviews: number; parameters?: number };
  /** Parametrik ürün mü — ölçüsü değiştirilebiliyor mu */
  isCustomizable?: boolean;
  /** Ölçü kaydırıcıları — kartın altında, çalışır hâlde */
  parameters?: KartParametre[];
  /** Montajlı dış ölçü (mm) — kartta cm olarak gösterilir */
  widthMm?: number | null;
  depthMm?: number | null;
  heightMm?: number | null;
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
  const priceInfo = getPriceInfo(product.basePrice, product.compareAtPrice);
  // Kaydırıcı çekildiğinde fiyat ve seçilen ölçü burada tutulur;
  // sepete eklenen de bu olur.
  const [secim, setSecim] = useState<{
    values: Record<string, number | string>;
    price: number;
  } | null>(null);
  const price = secim?.price ?? priceInfo.price;

  // Ölçü, "bu rafıma sığar mı?" sorusunun cevabı — karttan
  // ürün sayfasına gitmeden görülebilmeli. Derinlik her üründe
  // kayıtlı değil; olmayan eksen yazılmaz, uydurulmaz.
  const eksenler = [product.widthMm, product.depthMm, product.heightMm].filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  const olcu =
    eksenler.length >= 2
      ? `${eksenler.map((v) => formatCmValue(v)).join(" × ")} cm`
      : null;

  function handleQuickAction(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Ölçüsü değişen ürün de buradan sepete girer: kaydırıcı
    // çekilmediyse varsayılan ölçü, çekildiyse seçilen ölçü.
    const varsayilanlar: Record<string, number | string> = Object.fromEntries(
      (product.parameters ?? []).map((q) => {
        const sayi = Number(q.defaultValue);
        return [q.name, Number.isFinite(sayi) && q.defaultValue.trim() !== "" ? sayi : q.defaultValue];
      })
    );
    const secilen = secim?.values ?? varsayilanlar;

    addItem({
      product: {
        id: product.id,
        name: product.name,
        basePrice: price,
        thumbnailUrl: product.thumbnailUrl,
      },
      customization:
        customizable && Object.keys(secilen).length > 0
          ? { id: null, parameters: secilen }
          : null,
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
            {priceInfo.hasDiscount && (
              <Badge variant="tech" className="bg-background/90 backdrop-blur-sm">
                %{priceInfo.percent}
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
              {added ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  Sepete eklendi
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden />
                  {/* Ölçüsü değişen üründe de buradan eklenir:
                      kaydırıcıda seçilen ölçüyle. */}
                  {customizable ? "Bu ölçüde ekle" : "Hızlı ekle"}
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
          <p className="mt-1.5 flex items-baseline gap-2 text-[15px] tabular-nums">
            {customizable && (
              <span className="text-muted-foreground">Başlangıç</span>
            )}
            <span className="font-medium">{formatPrice(price)}</span>
            {priceInfo.compareAt !== null && (
              <span className="text-[13px] text-muted-foreground line-through">
                {formatPrice(priceInfo.compareAt)}
              </span>
            )}
          </p>
          {olcu && !(customizable && (product.parameters?.length ?? 0) > 0) && (
            <p className="mt-1 text-[13px] tabular-nums text-muted-foreground">
              {olcu}
              {customizable && " · ölçüsü değişir"}
            </p>
          )}

          {customizable && (product.parameters?.length ?? 0) > 0 && (
            <CardSizeControls
              basePrice={product.basePrice}
              parameters={product.parameters!}
              onChange={setSecim}
            />
          )}
        </div>
      </Link>
    </article>
  );
}
