"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  MapPin,
  CreditCard,
  Package,
  ShoppingBag,
  Lock,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/cart-context";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

const steps = [
  { key: "info", label: "Bilgiler", icon: User },
  { key: "address", label: "Adres", icon: MapPin },
  { key: "payment", label: "Odeme", icon: CreditCard },
  { key: "confirm", label: "Onay", icon: Package },
] as const;

type Step = (typeof steps)[number]["key"];

export default function CheckoutPage() {
  const [currentStep, setCurrentStep] = useState<Step>("info");
  const { items, totalPrice, clearCart } = useCart();
  const [orderPlaced, setOrderPlaced] = useState(false);

  const shippingCost = totalPrice >= 500 ? 0 : 49;
  const grandTotal = totalPrice + shippingCost;
  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].key);
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].key);
    }
  };

  const handlePlaceOrder = () => {
    setOrderPlaced(true);
    clearCart();
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen pt-20 lg:pt-24">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center lg:px-8">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15, stiffness: 200 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gradient-start to-gradient-end"
          >
            <Check className="h-10 w-10 text-primary-foreground" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="mb-3 text-3xl font-bold font-heading">Siparisuniz Alindi!</h1>
            <p className="mb-2 text-muted-foreground">
              Siparis numaraniz: <span className="font-semibold text-foreground">ORD-2026-006</span>
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
              Siparis detaylariniz e-posta adresinize gonderildi. Siparisinizi hesabinizdan takip edebilirsiniz.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button variant="gradient" asChild>
                <Link href="/hesap/siparisler">Siparisi Takip Et</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/urunler">Alisverise Devam Et</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 lg:pt-24">
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold tracking-tight font-heading">
          Odeme
        </h1>

        {/* Step Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300",
                      index < currentStepIndex
                        ? "border-accent bg-accent text-accent-foreground"
                        : index === currentStepIndex
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {index < currentStepIndex ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium",
                      index <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 flex-1 rounded-full transition-all duration-300",
                      index < currentStepIndex
                        ? "bg-accent"
                        : "bg-border"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form Area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentStep === "info" && (
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="mb-6 text-lg font-semibold font-heading flex items-center gap-2">
                      <User className="h-5 w-5 text-accent" />
                      Kisisel Bilgiler
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Ad</label>
                        <Input placeholder="Adiniz" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Soyad</label>
                        <Input placeholder="Soyadiniz" />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-sm font-medium">E-posta</label>
                        <Input type="email" placeholder="ornek@email.com" />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-sm font-medium">Telefon</label>
                        <Input type="tel" placeholder="+90 (5XX) XXX XX XX" />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === "address" && (
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="mb-6 text-lg font-semibold font-heading flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-accent" />
                      Teslimat Adresi
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-sm font-medium">Adres Basligi</label>
                        <Input placeholder="Ev, Is, vb." />
                      </div>
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <label className="text-sm font-medium">Adres</label>
                        <textarea
                          rows={3}
                          placeholder="Mahalle, sokak, bina no, daire no..."
                          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Sehir</label>
                        <Input placeholder="Istanbul" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Ilce</label>
                        <Input placeholder="Kadikoy" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Posta Kodu</label>
                        <Input placeholder="34700" />
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === "payment" && (
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="mb-6 text-lg font-semibold font-heading flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-accent" />
                      Odeme Yontemi
                    </h2>

                    {/* Payment method tabs */}
                    <div className="mb-6 flex gap-2">
                      {["Kredi Karti", "Havale/EFT", "Kapida Odeme"].map(
                        (method, i) => (
                          <button
                            key={method}
                            className={cn(
                              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                              i === 0
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-border text-muted-foreground hover:border-accent/50"
                            )}
                          >
                            {method}
                          </button>
                        )
                      )}
                    </div>

                    <div className="grid gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Kart Numarasi</label>
                        <Input placeholder="XXXX XXXX XXXX XXXX" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium">Son Kullanma</label>
                          <Input placeholder="AA/YY" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium">CVV</label>
                          <Input placeholder="XXX" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium">Kart Uzerindeki Ad</label>
                        <Input placeholder="AD SOYAD" />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      Odeme bilgileriniz 256-bit SSL ile korunmaktadir.
                    </div>
                  </div>
                )}

                {currentStep === "confirm" && (
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="mb-6 text-lg font-semibold font-heading flex items-center gap-2">
                      <Package className="h-5 w-5 text-accent" />
                      Siparis Onay
                    </h2>

                    <div className="flex flex-col gap-4">
                      {items.map((item) => (
                        <div
                          key={item.product.id}
                          className="flex items-center gap-4 rounded-lg border border-border bg-secondary/20 p-3"
                        >
                          <div className="h-14 w-14 shrink-0 rounded-lg bg-gradient-to-br from-gradient-start/10 to-gradient-end/10 flex items-center justify-center">
                            <Box className="h-6 w-6 text-accent/30" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} adet
                            </p>
                          </div>
                          <span className="text-sm font-semibold">
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-lg bg-secondary/30 p-4">
                      <div className="flex flex-col gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ara Toplam</span>
                          <span>{formatPrice(totalPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Kargo</span>
                          <span>{shippingCost === 0 ? "Ucretsiz" : formatPrice(shippingCost)}</span>
                        </div>
                        <div className="border-t border-border pt-2 flex justify-between font-semibold text-base">
                          <span>Toplam</span>
                          <span className="text-accent">{formatPrice(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation buttons */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={currentStepIndex === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Geri
              </Button>

              {currentStep === "confirm" ? (
                <Button variant="gradient" size="lg" onClick={handlePlaceOrder} className="gap-2">
                  <Lock className="h-4 w-4" />
                  Siparisi Onayla
                </Button>
              ) : (
                <Button variant="gradient" onClick={goNext} className="gap-2">
                  Devam Et
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-base font-semibold font-heading flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-accent" />
                Sepet ({items.length})
              </h3>

              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-md bg-gradient-to-br from-gradient-start/10 to-gradient-end/10 flex items-center justify-center">
                      <Box className="h-4 w-4 text-accent/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.product.name}</p>
                      <p className="text-[11px] text-muted-foreground">{item.quantity}x</p>
                    </div>
                    <span className="text-xs font-semibold">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ara Toplam</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">Kargo</span>
                  <span>{shippingCost === 0 ? "Ucretsiz" : formatPrice(shippingCost)}</span>
                </div>
                <div className="mt-3 border-t border-border pt-3 flex justify-between font-semibold">
                  <span>Toplam</span>
                  <span className="text-lg text-accent">{formatPrice(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
