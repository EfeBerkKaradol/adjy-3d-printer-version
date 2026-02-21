"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Plus,
  Check,
} from "lucide-react";
import type {
  ShippingAddressInput,
  BillingAddressInput,
} from "@/lib/validations/order";

// ==========================================
// ADIM 2: ADRES BİLGİLERİ
// Kayıtlı adres seçimi veya yeni adres girişi.
// "Bu adresi kaydet" checkbox'ı ile gelecek
// siparişlerde otomatik doldurma.
// ==========================================

export interface SavedAddress {
  id: string;
  title: string;
  fullName: string | null;
  phone: string | null;
  addressLine: string;
  city: string;
  state: string | null;
  postalCode: string | null;
  country: string;
  type: string;
  isDefault: boolean;
}

interface AddressStepProps {
  shippingAddress: ShippingAddressInput;
  billingAddress: BillingAddressInput;
  useSameAddress: boolean;
  savedAddresses: SavedAddress[];
  saveShippingAddress: boolean;
  saveBillingAddress: boolean;
  onShippingChange: (addr: ShippingAddressInput) => void;
  onBillingChange: (addr: BillingAddressInput) => void;
  onUseSameAddressChange: (val: boolean) => void;
  onSaveShippingChange: (val: boolean) => void;
  onSaveBillingChange: (val: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AddressStep({
  shippingAddress,
  billingAddress,
  useSameAddress,
  savedAddresses,
  saveShippingAddress,
  saveBillingAddress,
  onShippingChange,
  onBillingChange,
  onUseSameAddressChange,
  onSaveShippingChange,
  onSaveBillingChange,
  onNext,
  onBack,
}: AddressStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(
    null
  );
  const [selectedBillingId, setSelectedBillingId] = useState<string | null>(
    null
  );
  const [showNewShipping, setShowNewShipping] = useState(
    savedAddresses.length === 0
  );
  const [showNewBilling, setShowNewBilling] = useState(true);

  // Kayıtlı adresi forma doldur (shipping)
  const handleSelectShipping = (addr: SavedAddress) => {
    setSelectedShippingId(addr.id);
    setShowNewShipping(false);
    onShippingChange({
      fullName: addr.fullName || "",
      addressLine: addr.addressLine,
      city: addr.city,
      state: addr.state || "",
      postalCode: addr.postalCode || "",
      country: addr.country,
      phone: addr.phone || "",
    });
    // Kayıtlı adres seçildiğinde tekrar kaydetmeye gerek yok
    onSaveShippingChange(false);
  };

  // Kayıtlı adresi forma doldur (billing)
  const handleSelectBilling = (addr: SavedAddress) => {
    setSelectedBillingId(addr.id);
    setShowNewBilling(false);
    onBillingChange({
      fullName: addr.fullName || "",
      addressLine: addr.addressLine,
      city: addr.city,
      state: addr.state || "",
      postalCode: addr.postalCode || "",
      country: addr.country,
    });
    onSaveBillingChange(false);
  };

  // Yeni adres gir moduna geç
  const handleNewShipping = () => {
    setSelectedShippingId(null);
    setShowNewShipping(true);
    onShippingChange({
      fullName: "",
      addressLine: "",
      city: "",
      state: "",
      postalCode: "",
      country: "TR",
      phone: "",
    });
    onSaveShippingChange(false);
  };

  const handleNewBilling = () => {
    setSelectedBillingId(null);
    setShowNewBilling(true);
    onBillingChange({
      fullName: "",
      addressLine: "",
      city: "",
      state: "",
      postalCode: "",
      country: "TR",
    });
    onSaveBillingChange(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!shippingAddress.fullName || shippingAddress.fullName.length < 2) {
      newErrors.fullName = "Ad soyad gerekli";
    }
    if (
      !shippingAddress.addressLine ||
      shippingAddress.addressLine.length < 5
    ) {
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
      if (
        !billingAddress.addressLine ||
        billingAddress.addressLine.length < 5
      ) {
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

  // Kayıtlı adres kartı
  const AddressCard = ({
    addr,
    isSelected,
    onSelect,
  }: {
    addr: SavedAddress;
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "border-border/40 hover:border-primary/40 bg-card"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{addr.title}</span>
              {addr.isDefault && (
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  Varsayılan
                </span>
              )}
            </div>
            {addr.fullName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {addr.fullName}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {addr.addressLine}
            </p>
            <p className="text-xs text-muted-foreground">
              {addr.city}
              {addr.postalCode ? `, ${addr.postalCode}` : ""}
            </p>
            {addr.phone && (
              <p className="text-xs text-muted-foreground">{addr.phone}</p>
            )}
          </div>
        </div>
        {isSelected && (
          <Check className="h-5 w-5 text-primary shrink-0" />
        )}
      </div>
    </button>
  );

  return (
    <div className="space-y-6">
      {/* ============ TESLİMAT ADRESİ ============ */}
      <div>
        <h2 className="text-xl font-semibold mb-1">Teslimat Adresi</h2>
        <p className="text-sm text-muted-foreground">
          Kayıtlı adreslerinizden birini seçin veya yeni adres girin.
        </p>
      </div>

      {/* Kayıtlı adresler */}
      {savedAddresses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Kayıtlı Adresler
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedAddresses.map((addr) => (
              <AddressCard
                key={addr.id}
                addr={addr}
                isSelected={selectedShippingId === addr.id && !showNewShipping}
                onSelect={() => handleSelectShipping(addr)}
              />
            ))}
          </div>

          {/* Yeni adres ekle butonu */}
          {!showNewShipping && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewShipping}
              className="gap-2 mt-2"
            >
              <Plus className="h-4 w-4" />
              Yeni Adres Gir
            </Button>
          )}
        </div>
      )}

      {/* Yeni adres formu */}
      {showNewShipping && (
        <div className="space-y-4 p-4 border border-border/40 rounded-xl bg-card">
          {savedAddresses.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Yeni Adres</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNewShipping(false);
                  // Varsayılan adresi seç
                  const defaultAddr = savedAddresses.find(
                    (a) => a.isDefault
                  );
                  if (defaultAddr) handleSelectShipping(defaultAddr);
                }}
                className="text-xs"
              >
                İptal
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="fullName">Ad Soyad *</Label>
              <Input
                id="fullName"
                value={shippingAddress.fullName}
                onChange={(e) =>
                  onShippingChange({
                    ...shippingAddress,
                    fullName: e.target.value,
                  })
                }
                placeholder="Ad Soyad"
                className={errors.fullName ? "border-destructive" : ""}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive mt-1">
                  {errors.fullName}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="addressLine">Adres *</Label>
              <Input
                id="addressLine"
                value={shippingAddress.addressLine}
                onChange={(e) =>
                  onShippingChange({
                    ...shippingAddress,
                    addressLine: e.target.value,
                  })
                }
                placeholder="Mahalle, cadde, sokak, bina no, daire no"
                className={errors.addressLine ? "border-destructive" : ""}
              />
              {errors.addressLine && (
                <p className="text-xs text-destructive mt-1">
                  {errors.addressLine}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="city">Şehir *</Label>
              <Input
                id="city"
                value={shippingAddress.city}
                onChange={(e) =>
                  onShippingChange({
                    ...shippingAddress,
                    city: e.target.value,
                  })
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
                  onShippingChange({
                    ...shippingAddress,
                    postalCode: e.target.value,
                  })
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
                  onShippingChange({
                    ...shippingAddress,
                    phone: e.target.value,
                  })
                }
                placeholder="05XX XXX XX XX"
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-xs text-destructive mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Bu adresi kaydet checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="saveShipping"
              checked={saveShippingAddress}
              onCheckedChange={(checked: boolean | "indeterminate") =>
                onSaveShippingChange(checked === true)
              }
            />
            <label
              htmlFor="saveShipping"
              className="text-sm cursor-pointer text-muted-foreground"
            >
              Bu adresi sonraki siparişlerim için kaydet
            </label>
          </div>
        </div>
      )}

      {/* ============ FATURA ADRESİ ============ */}
      <div className="pt-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sameAddress"
            checked={useSameAddress}
            onCheckedChange={(checked: boolean | "indeterminate") =>
              onUseSameAddressChange(checked === true)
            }
          />
          <label
            htmlFor="sameAddress"
            className="text-sm font-medium cursor-pointer"
          >
            Fatura adresim teslimat adresimle aynı
          </label>
        </div>
      </div>

      {!useSameAddress && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Fatura Adresi</h3>

          {/* Kayıtlı adreslerden fatura adresi seç */}
          {savedAddresses.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Kayıtlı Adresler
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedAddresses.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    addr={addr}
                    isSelected={
                      selectedBillingId === addr.id && !showNewBilling
                    }
                    onSelect={() => handleSelectBilling(addr)}
                  />
                ))}
              </div>
              {!showNewBilling && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewBilling}
                  className="gap-2 mt-2"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Fatura Adresi Gir
                </Button>
              )}
            </div>
          )}

          {showNewBilling && (
            <div className="space-y-4 p-4 border border-border/40 rounded-xl bg-card">
              {savedAddresses.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Yeni Fatura Adresi</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNewBilling(false);
                      const defaultAddr = savedAddresses.find(
                        (a) => a.isDefault
                      );
                      if (defaultAddr) handleSelectBilling(defaultAddr);
                    }}
                    className="text-xs"
                  >
                    İptal
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="billingFullName">Ad Soyad *</Label>
                  <Input
                    id="billingFullName"
                    value={billingAddress.fullName}
                    onChange={(e) =>
                      onBillingChange({
                        ...billingAddress,
                        fullName: e.target.value,
                      })
                    }
                    placeholder="Ad Soyad"
                    className={
                      errors.billingFullName ? "border-destructive" : ""
                    }
                  />
                  {errors.billingFullName && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.billingFullName}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="billingAddress">Adres *</Label>
                  <Input
                    id="billingAddress"
                    value={billingAddress.addressLine}
                    onChange={(e) =>
                      onBillingChange({
                        ...billingAddress,
                        addressLine: e.target.value,
                      })
                    }
                    placeholder="Fatura adresi"
                    className={
                      errors.billingAddressLine ? "border-destructive" : ""
                    }
                  />
                  {errors.billingAddressLine && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.billingAddressLine}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="billingCity">Şehir *</Label>
                  <Input
                    id="billingCity"
                    value={billingAddress.city}
                    onChange={(e) =>
                      onBillingChange({
                        ...billingAddress,
                        city: e.target.value,
                      })
                    }
                    placeholder="İstanbul"
                    className={errors.billingCity ? "border-destructive" : ""}
                  />
                  {errors.billingCity && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.billingCity}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="billingPostalCode">Posta Kodu</Label>
                  <Input
                    id="billingPostalCode"
                    value={billingAddress.postalCode || ""}
                    onChange={(e) =>
                      onBillingChange({
                        ...billingAddress,
                        postalCode: e.target.value,
                      })
                    }
                    placeholder="34000"
                  />
                </div>
              </div>

              {/* Fatura adresini kaydet */}
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="saveBilling"
                  checked={saveBillingAddress}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    onSaveBillingChange(checked === true)
                  }
                />
                <label
                  htmlFor="saveBilling"
                  className="text-sm cursor-pointer text-muted-foreground"
                >
                  Bu fatura adresini sonraki siparişlerim için kaydet
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigasyon butonları */}
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
