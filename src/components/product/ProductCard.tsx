"use client";

import { useState } from "react";
import Link from "next/link";
import { WishlistButton } from "./WishlistButton";
import { useCartStore } from "@/store/cartStore";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCardImage } from "./ProductCardImage";
import { PixelArrow, PixelTag } from "@/components/home/PixelMoreButton";
import { getPriceInfo, formatPrice } from "@/lib/pricing";
import { formatCmValue } from "@/lib/units";
import { CardSizeControls, type KartParametre } from "./CardSizeControls";
import { aracAdresi, slugdanAracId } from "@/lib/tasarim/catalog";

// ==========================================
// ÜRÜN KARTI — PİKSEL ÇERÇEVE
// Kategoriler ve ana sayfa raflarıyla aynı dil: basamaklı
// köşeli piksel çerçeve, kesik çizgili alt şerit, piksel
// etiketler. Üzerine gelince kart sert gölgesiyle kalkar,
// ürünün ikinci görseli alttan yukarı basılarak belirir ve
// hızlı eylem düğmesi görünür.
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
  /** Üzerine gelince alttan yukarı basılan ikinci görsel (galeriden) */
  hoverImageUrl?: string | null;
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
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  // Tasarım aracıyla kurulan ürün: kartta eklenecek hazır bir
  // hâli yok, kart doğrudan araca açılır.
  const tasarimAraci = slugdanAracId(product.slug);
  const adres = tasarimAraci ? aracAdresi(tasarimAraci) : `/products/${product.slug}`;

  const customizable =
    product.isCustomizable ?? (product._count?.parameters ?? 0) > 0;
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
      data-lift
      className="adjy-pixel-card group adjy-rise relative flex h-full flex-col"
      style={{ animationDelay: `${Math.min(index, 7) * 55}ms` }}
    >
      <Link href={adres} className="flex flex-1 flex-col">
        {/* Görsel */}
        <div className="relative aspect-square overflow-hidden bg-surface-2">
          <ProductCardImage
            slug={product.slug}
            name={product.name}
            src={product.thumbnailUrl}
            hoverSrc={product.hoverImageUrl}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
          />

          {/* Rozetler */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-2">
            {product.featured && <PixelTag>Öne çıkan</PixelTag>}
            {customizable && <PixelTag>Özel ölçü</PixelTag>}
            {tasarimAraci && <PixelTag>Kendin tasarla</PixelTag>}
            {priceInfo.hasDiscount && <PixelTag>%{priceInfo.percent}</PixelTag>}
          </div>

          {/* Hızlı eylem — masaüstünde hover, mobilde gizli (karta dokunmak ürüne gider) */}
          <div className="absolute inset-x-3 bottom-3 z-10 hidden opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 md:block">
            <button
              type="button"
              // Tasarım aracı ürününde tıklama bağlantıya bırakılır:
              // kart araca gider, sepete varsayılan bir ürün düşmez.
              onClick={tasarimAraci ? undefined : handleQuickAction}
              className={cn(
                "adjy-pixel-box flex h-9 w-full items-center justify-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
                added
                  ? "bg-foreground text-background"
                  : "bg-background text-foreground hover:bg-foreground hover:text-background"
              )}
            >
              {added ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden />
                  Sepete eklendi
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {/* Ölçüsü değişen üründe de buradan eklenir:
                      kaydırıcıda seçilen ölçüyle. */}
                  {tasarimAraci ? "Tasarlamaya başla" : customizable ? "Bu ölçüde ekle" : "Hızlı ekle"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bilgi: kesik çizgili alt şerit */}
        <div className="flex flex-1 flex-col border-t-2 border-dashed border-foreground/80 px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {product.category.name}
              </p>
              <h3 className="mt-1 text-[15px] font-semibold leading-snug">
                {product.name}
              </h3>
            </div>
            <PixelArrow className="mt-1 h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />
          </div>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 font-mono text-xs tabular-nums">
            {(customizable || tasarimAraci) && (
              <span className="text-muted-foreground">Başlangıç</span>
            )}
            <span className="font-semibold">{formatPrice(price)}</span>
            {priceInfo.compareAt !== null && (
              <span className="text-muted-foreground line-through">
                {formatPrice(priceInfo.compareAt)}
              </span>
            )}
          </p>
          {olcu && !(customizable && (product.parameters?.length ?? 0) > 0) && (
            <p className="mt-1 font-mono text-[11px] tabular-nums text-muted-foreground">
              {olcu}
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

      {/* Favori: bağlantının dışında, kartın sağ üstünde */}
      <div className="absolute right-3 top-3 z-10 opacity-100 transition-opacity duration-200 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <WishlistButton productId={product.id} />
      </div>
    </article>
  );
}
