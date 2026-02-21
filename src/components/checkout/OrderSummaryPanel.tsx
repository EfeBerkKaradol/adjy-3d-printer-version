"use client";

import { CartItemState } from "@/store/cartStore";

// ==========================================
// SİPARİŞ ÖZETİ PANELİ (Sağ kenar)
// Tüm adımlarda görünür.
// ==========================================

interface OrderSummaryPanelProps {
  items: CartItemState[];
  totalPrice: number;
  shippingCost: number;
  shippingMethod: string | null;
}

export function OrderSummaryPanel({
  items,
  totalPrice,
  shippingCost,
  shippingMethod,
}: OrderSummaryPanelProps) {
  const grandTotal = totalPrice + shippingCost;

  return (
    <div className="p-5 border border-border/40 rounded-xl bg-card sticky top-24">
      <h3 className="font-semibold text-base mb-4">Sipariş Özeti</h3>

      {/* Ürünler */}
      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground truncate mr-2">
              {item.product.name}
              {item.quantity > 1 && ` (x${item.quantity})`}
            </span>
            <span className="shrink-0 font-medium">
              {(item.calculatedPrice * item.quantity).toFixed(2)} TL
            </span>
          </div>
        ))}
      </div>

      <hr className="border-border/40 my-3" />

      {/* Ara toplam */}
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">Ara Toplam</span>
        <span>{totalPrice.toFixed(2)} TL</span>
      </div>

      {/* Kargo */}
      <div className="flex justify-between text-sm mb-2">
        <span className="text-muted-foreground">
          Kargo{shippingMethod ? ` (${shippingMethod})` : ""}
        </span>
        <span>
          {shippingCost === 0 ? (
            <span className="text-green-600">Ücretsiz</span>
          ) : shippingCost > 0 ? (
            `${shippingCost.toFixed(2)} TL`
          ) : (
            <span className="text-muted-foreground">Hesaplanacak</span>
          )}
        </span>
      </div>

      <hr className="border-border/40 my-3" />

      {/* Toplam */}
      <div className="flex justify-between font-bold text-lg">
        <span>Toplam</span>
        <span className="text-primary">{grandTotal.toFixed(2)} TL</span>
      </div>
    </div>
  );
}
