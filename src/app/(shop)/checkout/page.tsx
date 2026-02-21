"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useSession } from "next-auth/react";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { CartSummaryStep } from "@/components/checkout/CartSummaryStep";
import { AddressStep } from "@/components/checkout/AddressStep";
import { ShippingStep } from "@/components/checkout/ShippingStep";
import { PaymentStep } from "@/components/checkout/PaymentStep";
import { OrderSummaryPanel } from "@/components/checkout/OrderSummaryPanel";
import { getShippingOptions, getShippingPrice, getDefaultShipping } from "@/lib/shipping";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag, LogIn } from "lucide-react";
import Link from "next/link";
import type { ShippingAddressInput, BillingAddressInput } from "@/lib/validations/order";

// ==========================================
// CHECKOUT SAYFASI
// 4 adımlı ödeme akışı:
// 1. Sepet Özeti
// 2. Adres Bilgileri
// 3. Kargo Seçimi
// 4. Ödeme (iyzico)
// ==========================================

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { items, totalPrice, clearCart } = useCartStore();

  const [step, setStep] = useState(1);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Adres state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressInput>({
    fullName: session?.user?.name || "",
    addressLine: "",
    city: "",
    state: "",
    postalCode: "",
    country: "TR",
    phone: "",
  });
  const [billingAddress, setBillingAddress] = useState<BillingAddressInput>({
    fullName: "",
    addressLine: "",
    city: "",
    state: "",
    postalCode: "",
    country: "TR",
  });
  const [useSameAddress, setUseSameAddress] = useState(true);

  // Kargo state
  const total = totalPrice();
  const defaultShipping = getDefaultShipping(total);
  const [selectedShipping, setSelectedShipping] = useState(defaultShipping.id);
  const shippingOptions = getShippingOptions(total);
  const shippingCost = getShippingPrice(selectedShipping, total);

  // Sipariş oluştur ve ödeme adımına geç
  const handleProceedToPayment = useCallback(async () => {
    setCreatingOrder(true);
    try {
      // Sepet ürünlerini API'ye gönder
      const orderItems = items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        calculatedPrice: item.calculatedPrice ?? item.product.basePrice,
        customizationId: item.customization?.id || null,
        customParams: item.customization?.parameters || null,
      }));

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress,
          billingAddress: useSameAddress ? undefined : billingAddress,
          useSameAddress,
          shippingMethod: selectedShipping,
          items: orderItems,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Sipariş oluşturulamadı");
        return;
      }

      setOrderId(data.order.id);
      clearCart();
      setStep(4);
    } catch {
      alert("Sipariş oluşturulurken bir hata oluştu");
    } finally {
      setCreatingOrder(false);
    }
  }, [items, shippingAddress, billingAddress, useSameAddress, selectedShipping, clearCart]);

  // Auth yükleniyor
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Giriş yapılmamış
  if (!session?.user) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 text-center">
        <LogIn className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Giriş Yapmanız Gerekiyor</h1>
        <p className="text-muted-foreground mb-6">
          Ödeme yapabilmek için lütfen giriş yapın veya hesap oluşturun.
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/auth/login?callbackUrl=/checkout">Giriş Yap</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/auth/register?callbackUrl=/checkout">Hesap Oluştur</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Sepet boş (ve sipariş henüz oluşturulmadı)
  if (items.length === 0 && !orderId) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-16 text-center">
        <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sepetiniz Boş</h1>
        <p className="text-muted-foreground mb-6">
          Ödeme yapabilmek için sepetinize ürün ekleyin.
        </p>
        <Button asChild>
          <Link href="/products">Ürünlere Göz At</Link>
        </Button>
      </div>
    );
  }

  // Kargo seçim adımında "Devam" → sipariş oluştur
  const handleShippingNext = () => {
    handleProceedToPayment();
  };

  // Seçili kargo adı
  const selectedShippingOption = shippingOptions.find(
    (o) => o.id === selectedShipping
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Ödeme</h1>

      {/* Adım göstergesi */}
      <CheckoutSteps currentStep={step} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol: Aktif adım */}
        <div className="lg:col-span-2">
          {step === 1 && (
            <CartSummaryStep
              items={items}
              totalPrice={total}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <AddressStep
              shippingAddress={shippingAddress}
              billingAddress={billingAddress}
              useSameAddress={useSameAddress}
              onShippingChange={setShippingAddress}
              onBillingChange={setBillingAddress}
              onUseSameAddressChange={setUseSameAddress}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <>
              {creatingOrder ? (
                <div className="text-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Siparişiniz oluşturuluyor...
                  </p>
                </div>
              ) : (
                <ShippingStep
                  shippingOptions={shippingOptions}
                  selectedShipping={selectedShipping}
                  onShippingChange={setSelectedShipping}
                  onNext={handleShippingNext}
                  onBack={() => setStep(2)}
                />
              )}
            </>
          )}

          {step === 4 && (
            <PaymentStep orderId={orderId} onBack={() => router.push("/cart")} />
          )}
        </div>

        {/* Sağ: Sipariş özeti paneli */}
        {step < 4 && (
          <div className="lg:col-span-1">
            <OrderSummaryPanel
              items={items}
              totalPrice={total}
              shippingCost={step >= 3 ? shippingCost : -1}
              shippingMethod={
                step >= 3 ? selectedShippingOption?.name || null : null
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
