"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  token_missing: "Ödeme doğrulama bilgisi bulunamadı.",
  payment_failed: "Ödeme işlemi başarısız oldu.",
  server_error: "Sunucu hatası oluştu.",
  unknown: "Bilinmeyen bir hata oluştu.",
};

function FailureContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const errorParam = searchParams.get("error") || "unknown";
  const errorMessage = ERROR_MESSAGES[errorParam] || decodeURIComponent(errorParam);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mb-6">
        <XCircle className="h-20 w-20 text-destructive mx-auto" />
      </div>

      <h1 className="text-3xl font-bold mb-3">Ödeme Başarısız</h1>
      <p className="text-muted-foreground mb-4 text-lg">
        Ödeme işleminiz tamamlanamadı.
      </p>

      <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 mb-8">
        <p className="text-sm text-destructive font-medium">{errorMessage}</p>
        {orderId && (
          <p className="text-xs text-muted-foreground mt-2">
            Sipariş: {orderId}
          </p>
        )}
      </div>

      <div className="space-y-2 text-left bg-card border border-border/40 rounded-xl p-6 mb-8">
        <h3 className="font-semibold mb-2">Ne yapabilirsiniz?</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>- Kart bilgilerinizi kontrol edip tekrar deneyin</li>
          <li>- Farklı bir kart ile ödeme yapmayı deneyin</li>
          <li>- Bankanızla iletişime geçin</li>
          <li>- Sorun devam ederse bize ulaşın</li>
        </ul>
      </div>

      <div className="flex gap-3 justify-center">
        <Button asChild className="gap-2">
          <Link href="/checkout">
            <RefreshCw className="h-4 w-4" />
            Tekrar Dene
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/cart">
            <ArrowLeft className="h-4 w-4" />
            Sepete Dön
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutFailurePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      }
    >
      <FailureContent />
    </Suspense>
  );
}
