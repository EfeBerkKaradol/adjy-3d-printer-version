"use client";

import Link from "next/link";
import Image from "next/image";
import { useHydrated } from "@/hooks/useClientState";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";
import { Box, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";

// ==========================================
// SEPET ÇEKMECESİ
// Sepete ekledikten sonra sayfadan ayrılmadan
// özet görmek için. Aynı zustand store'u kullanır;
// /cart sayfası olduğu gibi çalışmaya devam eder.
// ==========================================

const FREE_SHIPPING_THRESHOLD = 500;

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalPrice = useCartStore((s) => s.totalPrice);

  // Sepet localStorage'dan yüklendiği için ilk render'da sunucuyla
  // uyuşmayabilir; hidrasyon tamamlanana kadar boş göster.
  const mounted = useHydrated();

  const subtotal = mounted ? totalPrice() : 0;
  const list = mounted ? items : [];
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-md"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            Sepet{list.length > 0 ? ` (${list.length})` : ""}
          </SheetTitle>
        </div>
        <SheetDescription className="sr-only">
          Sepetinizdeki ürünleri görüntüleyin, adet değiştirin veya ödemeye geçin.
        </SheetDescription>

        {list.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <ShoppingBag className="mb-4 h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">Sepetiniz boş</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Ürünlere göz atın ya da kendi modelinizi yükleyip teklif alın.
            </p>
            <Button asChild className="mt-6" onClick={() => onOpenChange(false)}>
              <Link href="/products">Ürünleri keşfet</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto overscroll-contain">
              {list.map((item) => (
                <li key={item.id} className="flex gap-4 px-5 py-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-2">
                    {item.product.thumbnailUrl ? (
                      <Image
                        src={item.product.thumbnailUrl}
                        alt=""
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Box className="h-6 w-6 text-muted-foreground" aria-hidden />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-medium">{item.product.name}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`${item.product.name} ürününü sepetten çıkar`}
                        className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {item.customization && (
                      <p className="mt-0.5 text-xs text-brand-lime">Özelleştirilmiş</p>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center border border-border">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Adedi azalt"
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span
                          className="w-8 text-center text-sm tabular-nums"
                          aria-label={`Adet: ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Adedi artır"
                          className="flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {(item.calculatedPrice * item.quantity).toFixed(2)} TL
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border px-5 py-5">
              {remaining > 0 ? (
                <p className="mb-4 text-xs text-muted-foreground">
                  Ücretsiz kargoya{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {remaining.toFixed(2)} TL
                  </span>{" "}
                  kaldı
                </p>
              ) : (
                <p className="mb-4 text-xs text-brand-lime">Kargo ücretsiz</p>
              )}

              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Ara toplam</span>
                <span className="text-lg font-semibold tabular-nums">
                  {subtotal.toFixed(2)} TL
                </span>
              </div>
              <p className="mb-5 text-xs text-muted-foreground">
                Kargo ve vergiler ödeme adımında hesaplanır.
              </p>

              <Button asChild size="lg" className="w-full" onClick={() => onOpenChange(false)}>
                <Link href="/checkout">
                  Ödemeye geç
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => onOpenChange(false)}
              >
                <Link href="/cart">Sepeti görüntüle</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
