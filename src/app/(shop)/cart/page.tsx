"use client";

import { useCartStore } from "@/store/cartStore";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-4">Sepetiniz Boş</h1>
        <p className="text-muted-foreground mb-8">
          Henüz sepetinize ürün eklemediniz.
        </p>
        <Button asChild size="lg">
          <Link href="/products">Ürünlere Göz At</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sepetim ({items.length} ürün)</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ürün listesi */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 border border-border/40 rounded-xl bg-card"
            >
              {/* Ürün görseli */}
              <div className="w-20 h-20 bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                {item.product.thumbnailUrl ? (
                  <Image
                    src={item.product.thumbnailUrl}
                    alt={item.product.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">3D</span>
                )}
              </div>

              {/* Ürün bilgileri */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{item.product.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Birim: {item.calculatedPrice.toFixed(2)} TL
                </p>
                {item.customization && (
                  <p className="text-xs text-primary mt-1">Özelleştirilmiş</p>
                )}
              </div>

              {/* Miktar kontrolü */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">
                  {item.quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Toplam fiyat */}
              <div className="text-right min-w-[80px]">
                <p className="font-bold">
                  {(item.calculatedPrice * item.quantity).toFixed(2)} TL
                </p>
              </div>

              {/* Silme butonu */}
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive shrink-0"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Sipariş özeti */}
        <div className="lg:col-span-1">
          <div className="p-6 border border-border/40 rounded-xl bg-card sticky top-24">
            <h2 className="font-semibold text-lg mb-4">Sipariş Özeti</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ara Toplam</span>
                <span>{totalPrice().toFixed(2)} TL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kargo</span>
                <span className="text-muted-foreground">
                  {totalPrice() >= 500 ? "Ücretsiz" : "Hesaplanacak"}
                </span>
              </div>
            </div>

            <hr className="my-4 border-border/40" />

            <div className="flex justify-between font-bold text-lg mb-6">
              <span>Toplam</span>
              <span className="text-primary">{totalPrice().toFixed(2)} TL</span>
            </div>

            <Button asChild size="lg" className="w-full gap-2">
              <Link href="/checkout">
                Ödemeye Geç
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-3">
              Güvenli ödeme ile alışverişinizi tamamlayın
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
