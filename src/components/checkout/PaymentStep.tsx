"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, CreditCard, AlertCircle } from "lucide-react";
import Link from "next/link";

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
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [preliminaryChecked, setPreliminaryChecked] = useState(false);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  const bothChecked = agreementChecked && preliminaryChecked;

  useEffect(() => {
    if (!orderId) return;

    if (!bothChecked) return;

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
  }, [orderId, bothChecked]);

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
          Ödeme yapmadan önce sözleşmeleri onaylayın.
        </p>
      </div>

      {/* Sözleşme Onayları */}
      <div className="border border-border/40 rounded-xl p-4 space-y-4 bg-muted/20">
        <div className="flex items-start gap-3">
          <Checkbox
            id="agreement"
            checked={agreementChecked}
            onCheckedChange={(v) => setAgreementChecked(!!v)}
            className="mt-0.5"
          />
          <label htmlFor="agreement" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            <Link href="/mesafeli-satis-sozlesmesi" target="_blank" className="text-primary hover:underline font-medium">
              Mesafeli Satış Sözleşmesi
            </Link>
            {" "}ve{" "}
            <Link href="/on-bilgilendirme" target="_blank" className="text-primary hover:underline font-medium">
              Ön Bilgilendirme Formu
            </Link>
            {"'nu okudum, onaylıyorum."}
          </label>
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            id="preliminary"
            checked={preliminaryChecked}
            onCheckedChange={(v) => setPreliminaryChecked(!!v)}
            className="mt-0.5"
          />
          <label htmlFor="preliminary" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            <Link href="/kvkk" target="_blank" className="text-primary hover:underline font-medium">
              KVKK Aydınlatma Metni
            </Link>
            {"'ni okudum. Kişisel verilerimin işlenmesine onay veriyorum."}
          </label>
        </div>
      </div>

      {/* iyzico Checkout Form — sadece onaylar verilince göster */}
      {bothChecked ? (
        <>
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Ödeme formu hazırlanıyor...</p>
            </div>
          )}
          {error && (
            <div className="text-center py-6">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
              <p className="text-destructive text-sm font-medium">{error}</p>
            </div>
          )}
          <div
            ref={iframeContainerRef}
            id="iyzipay-checkout-form"
            className="min-h-[400px] border border-border/40 rounded-xl p-4 bg-white"
          />
        </>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed border-border/40 rounded-xl">
          Ödeme formunu görmek için lütfen yukarıdaki sözleşmeleri onaylayın.
        </div>
      )}

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
