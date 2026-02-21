"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cartStore";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const clearCart = useCartStore((state) => state.clearCart);

  // Ödeme başarılı — sepeti temizle
  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mb-6">
        <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
      </div>

      <h1 className="text-3xl font-bold mb-3">Ödeme Başarılı!</h1>
      <p className="text-muted-foreground mb-8 text-lg">
        Siparişiniz başarıyla oluşturuldu. 3D baskı süreciniz başlamıştır.
      </p>

      {orderId && (
        <div className="bg-muted/30 border border-border/40 rounded-xl p-6 mb-8">
          <p className="text-sm text-muted-foreground mb-1">Sipariş ID</p>
          <p className="font-mono text-sm font-medium">{orderId}</p>
        </div>
      )}

      <div className="space-y-3 text-left bg-card border border-border/40 rounded-xl p-6 mb-8">
        <h3 className="font-semibold mb-3">Sonraki Adımlar</h3>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
            1
          </div>
          <p className="text-sm text-muted-foreground">
            Siparişiniz onaylandı ve 3D baskı kuyruğuna alındı.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
            2
          </div>
          <p className="text-sm text-muted-foreground">
            Baskı tamamlandığında kalite kontrolden geçirilecektir.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
            3
          </div>
          <p className="text-sm text-muted-foreground">
            Paketleme sonrası kargo ile adresinize gönderilecektir.
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        {orderId && (
          <Button asChild className="gap-2">
            <Link href={`/orders/${orderId}`}>
              <Package className="h-4 w-4" />
              Sipariş Detayı
            </Link>
          </Button>
        )}
        <Button variant="outline" asChild className="gap-2">
          <Link href="/products">
            Alışverişe Devam Et
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
