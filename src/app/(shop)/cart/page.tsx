"use client";

import { useCartStore } from "@/store/cartStore";
import Link from "next/link";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Sepetiniz Bos</h1>
        <p className="text-muted-foreground mb-8">
          Henuz sepetinize urun eklemediniz.
        </p>
        <Link
          href="/products"
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold"
        >
          Urunlere Goz At
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sepetim</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 border rounded-lg"
            >
              <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                3D
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{item.product.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.product.basePrice.toFixed(2)} TL
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center border rounded"
                >
                  -
                </button>
                <span className="w-8 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 flex items-center justify-center border rounded"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="text-red-500 hover:text-red-700"
              >
                Sil
              </button>
            </div>
          ))}
        </div>

        <div className="p-6 border rounded-lg h-fit">
          <h2 className="font-semibold text-lg mb-4">Siparis Ozeti</h2>
          <div className="flex justify-between mb-2">
            <span>Ara Toplam</span>
            <span>{totalPrice().toFixed(2)} TL</span>
          </div>
          <div className="flex justify-between mb-4 text-sm text-muted-foreground">
            <span>Kargo</span>
            <span>Hesaplanacak</span>
          </div>
          <hr className="mb-4" />
          <div className="flex justify-between font-bold text-lg mb-6">
            <span>Toplam</span>
            <span>{totalPrice().toFixed(2)} TL</span>
          </div>
          <Link
            href="/checkout"
            className="block w-full text-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold"
          >
            Odemeye Gec
          </Link>
        </div>
      </div>
    </div>
  );
}
