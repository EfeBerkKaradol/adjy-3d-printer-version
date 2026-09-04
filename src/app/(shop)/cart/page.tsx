"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/store/cartStore";
import { useHydrated } from "@/hooks/useClientState";
import { Button } from "@/components/ui/button";
import { Box, Minus, Plus, ShoppingBag, Trash2, ArrowRight } from "lucide-react";

// ==========================================
// SEPET SAYFASI
// Sepet çekmecesinin tam sayfa karşılığı. Aynı
// zustand store'unu kullanır; fiyat ve adet mantığı
// değişmedi, yalnızca yerleşim ve tipografi yenilendi.
// ==========================================

const FREE_SHIPPING_THRESHOLD = 500;

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalPrice = useCartStore((s) => s.totalPrice);

  // Sepet localStorage'dan okunur; sunucu render'ıyla
  // uyuşmazlık olmaması için hidrasyona kadar bekle.
  const mounted = useHydrated();

  if (!mounted) {
    return <div className="adjy-container py-20" aria-busy="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="adjy-container py-24 md:py-32">
        <div className="mx-auto max-w-md text-center">
          <ShoppingBag className="mx-auto mb-5 h-8 w-8 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-medium tracking-tight">Sepetiniz boş</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            Ürünlere göz atarak başlayabilir ya da kendi 3D modelinizi yükleyip
            üretim teklifi alabilirsiniz.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/products">Ürünleri keşfet</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/3d-baski-fiyati-hesapla">Kendi modelini üret</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = totalPrice();
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="adjy-container py-10 md:py-14">
      <h1 className="adjy-display text-[clamp(1.75rem,3.4vw,2.5rem)]">Sepet</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {itemCount} ürün · {items.length} satır
      </p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        {/* Ürünler */}
        <ul className="divide-y divide-border border-y border-border">
          {items.map((item) => (
            <li key={item.id} className="flex gap-5 py-6">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-surface-2 sm:h-28 sm:w-28">
                {item.product.thumbnailUrl ? (
                  <Image
                    src={item.product.thumbnailUrl}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Box className="h-6 w-6 text-muted-foreground" aria-hidden />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-medium">
                      {item.product.name}
                    </h2>
                    {item.customization ? (
                      <p className="mt-1 text-xs text-brand-lime">
                        Özelleştirilmiş ölçülerle
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Standart ölçüler
                      </p>
                    )}
                    <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                      Birim {item.calculatedPrice.toFixed(2)} TL
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`${item.product.name} ürününü sepetten çıkar`}
                    className="shrink-0 rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex items-end justify-between gap-4 pt-4">
                  <div className="flex items-center border border-border">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      aria-label="Adedi azalt"
                      className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span
                      className="w-9 text-center text-sm tabular-nums"
                      aria-label={`Adet: ${item.quantity}`}
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="Adedi artır"
                      className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-base font-medium tabular-nums">
                    {(item.calculatedPrice * item.quantity).toFixed(2)} TL
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Özet */}
        <aside aria-label="Sipariş özeti">
          <div className="lg:sticky lg:top-24">
            <h2 className="adjy-eyebrow mb-5 text-foreground">Sipariş özeti</h2>

            <dl className="space-y-3 border-t border-border pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Ara toplam</dt>
                <dd className="tabular-nums">{subtotal.toFixed(2)} TL</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Kargo</dt>
                <dd className={remaining === 0 ? "text-brand-lime" : "text-muted-foreground"}>
                  {remaining === 0 ? "Ücretsiz" : "Ödeme adımında"}
                </dd>
              </div>
            </dl>

            {remaining > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Ücretsiz kargoya{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {remaining.toFixed(2)} TL
                </span>{" "}
                kaldı
              </p>
            )}

            <div className="mt-5 flex items-baseline justify-between border-t border-border pt-5">
              <span className="text-base font-medium">Toplam</span>
              <span className="text-xl font-medium tabular-nums">
                {subtotal.toFixed(2)} TL
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Kargo ve vergiler ödeme adımında hesaplanır.
            </p>

            <Button asChild size="xl" className="mt-6 w-full">
              <Link href="/checkout">
                Ödemeye geç
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>

            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link href="/products">Alışverişe devam et</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
