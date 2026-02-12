"use client";

import { Button } from "@/components/ui/button";
import { ShoppingCart, Check } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useState } from "react";

// ==========================================
// SEPETE EKLE BUTONU
// Client component çünkü Zustand store kullanıyor.
// ==========================================

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    basePrice: number;
    thumbnailUrl: string | null;
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  // ==========================================
  // [GÖREV 24]: handleAddToCart fonksiyonunu tamamla
  //
  // Ürünü Zustand sepet store'una ekler ve
  // 2 saniye boyunca "Eklendi" gösterir.
  //
  // İpucu:
  //   1. addItem çağır:
  //      addItem({
  //        product: {
  //          id: product.id,
  //          name: product.name,
  //          basePrice: Number(product.basePrice),
  //          thumbnailUrl: product.thumbnailUrl,
  //        },
  //        customization: null,
  //        quantity: 1,
  //      });
  //   2. setAdded(true) ile butonu "Eklendi" moduna geçir
  //   3. setTimeout ile 2 saniye sonra setAdded(false) yap
  //
  // Java karşılığı:
  //   cartService.addItem(productDTO, 1);
  // ==========================================
  function handleAddToCart() {
    addItem({
      product: {
        id: product.id,
        name: product.name,
        basePrice: Number(product.basePrice),
        thumbnailUrl: product.thumbnailUrl,
      },
      customization: null,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <Button
      size="lg"
      className="w-full text-base gap-2"
      onClick={handleAddToCart}
      disabled={added}
    >
      {added ? (
        <>
          <Check className="h-5 w-5" />
          Sepete Eklendi
        </>
      ) : (
        <>
          <ShoppingCart className="h-5 w-5" />
          Sepete Ekle
        </>
      )}
    </Button>
  );
}
