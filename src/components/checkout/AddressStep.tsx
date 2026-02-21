"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ShippingAddressInput, BillingAddressInput } from "@/lib/validations/order";

// ==========================================
// ADIM 2: ADRES BİLGİLERİ
// Teslimat ve fatura adresi.
// ==========================================

interface AddressStepProps {
  shippingAddress: ShippingAddressInput;
  billingAddress: BillingAddressInput;
  useSameAddress: boolean;
  onShippingChange: (addr: ShippingAddressInput) => void;
  onBillingChange: (addr: BillingAddressInput) => void;
  onUseSameAddressChange: (val: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AddressStep({
  shippingAddress,
  billingAddress,
  useSameAddress,
  onShippingChange,
  onBillingChange,
  onUseSameAddressChange,
  onNext,
  onBack,
}: AddressStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!shippingAddress.fullName || shippingAddress.fullName.length < 2) {
      newErrors.fullName = "Ad soyad gerekli";
    }
    if (!shippingAddress.addressLine || shippingAddress.addressLine.length < 5) {
      newErrors.addressLine = "Adres en az 5 karakter olmalı";
    }
    if (!shippingAddress.city || shippingAddress.city.length < 2) {
      newErrors.city = "Şehir gerekli";
    }
    if (!shippingAddress.phone || shippingAddress.phone.length < 10) {
      newErrors.phone = "Geçerli bir telefon numarası giriniz";
    }

    if (!useSameAddress) {
      if (!billingAddress.fullName || billingAddress.fullName.length < 2) {
        newErrors.billingFullName = "Fatura için ad soyad gerekli";
      }
      if (!billingAddress.addressLine || billingAddress.addressLine.length < 5) {
        newErrors.billingAddressLine = "Fatura adresi en az 5 karakter olmalı";
      }
      if (!billingAddress.city || billingAddress.city.length < 2) {
        newErrors.billingCity = "Fatura şehri gerekli";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Teslimat Adresi</h2>
        <p className="text-sm text-muted-foreground">
          Siparişinizin teslim edileceği adresi girin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="fullName">Ad Soyad *</Label>
          <Input
            id="fullName"
            value={shippingAddress.fullName}
            onChange={(e) =>
              onShippingChange({ ...shippingAddress, fullName: e.target.value })
            }
            placeholder="Ad Soyad"
            className={errors.fullName ? "border-destructive" : ""}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive mt-1">{errors.fullName}</p>
          )}
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="addressLine">Adres *</Label>
          <Input
            id="addressLine"
            value={shippingAddress.addressLine}
            onChange={(e) =>
              onShippingChange({ ...shippingAddress, addressLine: e.target.value })
            }
            placeholder="Mahalle, cadde, sokak, bina no, daire no"
            className={errors.addressLine ? "border-destructive" : ""}
          />
          {errors.addressLine && (
            <p className="text-xs text-destructive mt-1">{errors.addressLine}</p>
          )}
        </div>

        <div>
          <Label htmlFor="city">Şehir *</Label>
          <Input
            id="city"
            value={shippingAddress.city}
            onChange={(e) =>
              onShippingChange({ ...shippingAddress, city: e.target.value })
            }
            placeholder="İstanbul"
            className={errors.city ? "border-destructive" : ""}
          />
          {errors.city && (
            <p className="text-xs text-destructive mt-1">{errors.city}</p>
          )}
        </div>

        <div>
          <Label htmlFor="postalCode">Posta Kodu</Label>
          <Input
            id="postalCode"
            value={shippingAddress.postalCode || ""}
            onChange={(e) =>
              onShippingChange({ ...shippingAddress, postalCode: e.target.value })
            }
            placeholder="34000"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="phone">Telefon *</Label>
          <Input
            id="phone"
            value={shippingAddress.phone}
            onChange={(e) =>
              onShippingChange({ ...shippingAddress, phone: e.target.value })
            }
            placeholder="05XX XXX XX XX"
            className={errors.phone ? "border-destructive" : ""}
          />
          {errors.phone && (
            <p className="text-xs text-destructive mt-1">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* Fatura adresi */}
      <div className="pt-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sameAddress"
            checked={useSameAddress}
            onCheckedChange={(checked: boolean | "indeterminate") => onUseSameAddressChange(checked === true)}
          />
          <label htmlFor="sameAddress" className="text-sm font-medium cursor-pointer">
            Fatura adresim teslimat adresimle aynı
          </label>
        </div>
      </div>

      {!useSameAddress && (
        <div className="space-y-4 p-4 border border-border/40 rounded-lg">
          <h3 className="font-semibold text-sm">Fatura Adresi</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="billingFullName">Ad Soyad *</Label>
              <Input
                id="billingFullName"
                value={billingAddress.fullName}
                onChange={(e) =>
                  onBillingChange({ ...billingAddress, fullName: e.target.value })
                }
                placeholder="Ad Soyad"
                className={errors.billingFullName ? "border-destructive" : ""}
              />
              {errors.billingFullName && (
                <p className="text-xs text-destructive mt-1">{errors.billingFullName}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="billingAddress">Adres *</Label>
              <Input
                id="billingAddress"
                value={billingAddress.addressLine}
                onChange={(e) =>
                  onBillingChange({ ...billingAddress, addressLine: e.target.value })
                }
                placeholder="Fatura adresi"
                className={errors.billingAddressLine ? "border-destructive" : ""}
              />
              {errors.billingAddressLine && (
                <p className="text-xs text-destructive mt-1">{errors.billingAddressLine}</p>
              )}
            </div>

            <div>
              <Label htmlFor="billingCity">Şehir *</Label>
              <Input
                id="billingCity"
                value={billingAddress.city}
                onChange={(e) =>
                  onBillingChange({ ...billingAddress, city: e.target.value })
                }
                placeholder="İstanbul"
                className={errors.billingCity ? "border-destructive" : ""}
              />
              {errors.billingCity && (
                <p className="text-xs text-destructive mt-1">{errors.billingCity}</p>
              )}
            </div>

            <div>
              <Label htmlFor="billingPostalCode">Posta Kodu</Label>
              <Input
                id="billingPostalCode"
                value={billingAddress.postalCode || ""}
                onChange={(e) =>
                  onBillingChange({ ...billingAddress, postalCode: e.target.value })
                }
                placeholder="34000"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Geri
        </Button>
        <Button onClick={handleNext} className="flex-1 gap-2">
          Devam Et
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
