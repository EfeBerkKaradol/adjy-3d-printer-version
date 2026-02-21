"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CreditCard, AlertCircle } from "lucide-react";

// ==========================================
// ADIM 4: ÖDEME (iyzico Checkout Form)
// iyzico iframe'ini render eder.
// ==========================================

interface PaymentStepProps {
  orderId: string | null;
  onBack: () => void;
}

export function PaymentStep({ orderId, onBack }: PaymentStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutContent, setCheckoutContent] = useState<string | null>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderId) return;

    async function initializePayment() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/payments/initialize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Ödeme başlatılamadı");
          return;
        }

        setCheckoutContent(data.checkoutFormContent);
      } catch (err) {
        console.error("Payment init error:", err);
        setError("Ödeme başlatılırken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }

    initializePayment();
  }, [orderId]);

  // iyzico checkout form content'i render et
  useEffect(() => {
    if (!checkoutContent || !iframeContainerRef.current) return;

    // iyzico HTML içeriğini container'a yaz
    iframeContainerRef.current.innerHTML = checkoutContent;

    // Script tag'lerini çalıştır
    const scripts = iframeContainerRef.current.querySelectorAll("script");
    scripts.forEach((script) => {
      const newScript = document.createElement("script");
      if (script.src) {
        newScript.src = script.src;
      } else {
        newScript.textContent = script.textContent;
      }
      script.parentNode?.replaceChild(newScript, script);
    });
  }, [checkoutContent]);

  if (!orderId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-medium mb-2">
          Sipariş oluşturulamadı
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          Lütfen tekrar deneyin.
        </p>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Geri Dön
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Ödeme formu hazırlanıyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive font-medium mb-2">{error}</p>
        <p className="text-sm text-muted-foreground mb-4">
          Lütfen daha sonra tekrar deneyin.
        </p>
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Ödeme
        </h2>
        <p className="text-sm text-muted-foreground">
          Kart bilgilerinizi girerek ödemenizi tamamlayın.
        </p>
      </div>

      {/* iyzico Checkout Form Container */}
      <div
        ref={iframeContainerRef}
        id="iyzipay-checkout-form"
        className="min-h-[400px] border border-border/40 rounded-xl p-4 bg-white"
      />

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Geri
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Ödemeniz iyzico güvencesiyle gerçekleştirilmektedir. Kart bilgileriniz
        güvenli ortamda işlenir ve kaydedilmez.
      </p>
    </div>
  );
}
