"use client";

import { CartItemState } from "@/store/cartStore";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

// ==========================================
// ADIM 1: SEPET ÖZETİ
// Checkout akışındaki ilk adım.
// ==========================================

interface CartSummaryStepProps {
  items: CartItemState[];
  totalPrice: number;
  onNext: () => void;
}

export function CartSummaryStep({ items, totalPrice, onNext }: CartSummaryStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Sepet Özeti</h2>
        <p className="text-sm text-muted-foreground">
          Siparişinizi kontrol edin ve devam edin.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-4 border border-border/40 rounded-lg bg-card"
          >
            <div className="w-16 h-16 bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
              {item.product.thumbnailUrl ? (
                <Image
                  src={item.product.thumbnailUrl}
                  alt={item.product.name}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-xs text-muted-foreground">3D</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{item.product.name}</h3>
              {item.customization && (
                <span className="text-xs text-primary">Özelleştirilmiş</span>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Adet: {item.quantity}
              </p>
            </div>

            <div className="text-right">
              <p className="font-semibold text-sm">
                {(item.calculatedPrice * item.quantity).toFixed(2)} TL
              </p>
              {item.quantity > 1 && (
                <p className="text-xs text-muted-foreground">
                  Birim: {item.calculatedPrice.toFixed(2)} TL
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
        <span className="font-medium">Ara Toplam</span>
        <span className="text-lg font-bold text-primary">
          {totalPrice.toFixed(2)} TL
        </span>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" asChild className="flex-1">
          <Link href="/cart">Sepete Dön</Link>
        </Button>
        <Button onClick={onNext} className="flex-1 gap-2">
          Devam Et
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
