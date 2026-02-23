"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Plus,
} from "lucide-react";
import type {
  ShippingAddressInput,
  BillingAddressInput,
} from "@/lib/validations/order";

// ==========================================
// ADIM 2: ADRES BİLGİLERİ
// Dropdown ile kayıtlı adres seçimi veya yeni adres girişi.
// Yeni adrese benzersiz bir isim verilebilir (Ev, İş vb.)
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
  shippingAddressTitle: string;
  billingAddressTitle: string;
  onShippingChange: (addr: ShippingAddressInput) => void;
  onBillingChange: (addr: BillingAddressInput) => void;
  onUseSameAddressChange: (val: boolean) => void;
  onSaveShippingChange: (val: boolean) => void;
  onSaveBillingChange: (val: boolean) => void;
  onShippingTitleChange: (title: string) => void;
  onBillingTitleChange: (title: string) => void;
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
  shippingAddressTitle,
  billingAddressTitle,
  onShippingChange,
  onBillingChange,
  onUseSameAddressChange,
  onSaveShippingChange,
  onSaveBillingChange,
  onShippingTitleChange,
  onBillingTitleChange,
  onNext,
  onBack,
}: AddressStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // "new" = yeni adres formu, adres ID = kayıtlı adres seçildi
  const [selectedShippingId, setSelectedShippingId] = useState<string>(() => {
    if (savedAddresses.length === 0) return "new";
    const defaultAddr = savedAddresses.find((a) => a.isDefault);
    return defaultAddr?.id || savedAddresses[0]?.id || "new";
  });

  const [selectedBillingId, setSelectedBillingId] = useState<string>("new");

  const isNewShipping = selectedShippingId === "new";
  const isNewBilling = selectedBillingId === "new";

  // Dropdown'dan adres seçildiğinde
  const handleShippingSelect = (value: string) => {
    setSelectedShippingId(value);
    if (value === "new") {
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
    } else {
      const addr = savedAddresses.find((a) => a.id === value);
      if (addr) {
        onShippingChange({
          fullName: addr.fullName || "",
          addressLine: addr.addressLine,
          city: addr.city,
          state: addr.state || "",
          postalCode: addr.postalCode || "",
          country: addr.country,
          phone: addr.phone || "",
        });
        onSaveShippingChange(false);
      }
    }
  };

  const handleBillingSelect = (value: string) => {
    setSelectedBillingId(value);
    if (value === "new") {
      onBillingChange({
        fullName: "",
        addressLine: "",
        city: "",
        state: "",
        postalCode: "",
        country: "TR",
      });
      onSaveBillingChange(false);
    } else {
      const addr = savedAddresses.find((a) => a.id === value);
      if (addr) {
        onBillingChange({
          fullName: addr.fullName || "",
          addressLine: addr.addressLine,
          city: addr.city,
          state: addr.state || "",
          postalCode: addr.postalCode || "",
          country: addr.country,
        });
        onSaveBillingChange(false);
      }
    }
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

    // Yeni adres kaydedilecekse isim zorunlu
    if (isNewShipping && saveShippingAddress && !shippingAddressTitle.trim()) {
      newErrors.shippingTitle = "Adres için bir isim girin (ör: Ev, İş)";
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

      if (isNewBilling && saveBillingAddress && !billingAddressTitle.trim()) {
        newErrors.billingTitle = "Fatura adresi için bir isim girin";
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
      {/* ============ TESLİMAT ADRESİ ============ */}
      <div>
        <h2 className="text-xl font-semibold mb-1">Teslimat Adresi</h2>
        <p className="text-sm text-muted-foreground">
          Kayıtlı adreslerinizden birini seçin veya yeni adres girin.
        </p>
      </div>

      {/* Adres Dropdown */}
      {savedAddresses.length > 0 && (
        <div className="space-y-2">
          <Label>Adres Seçin</Label>
          <Select value={selectedShippingId} onValueChange={handleShippingSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Adres seçin..." />
            </SelectTrigger>
            <SelectContent position="popper">
              {savedAddresses.map((addr) => (
                <SelectItem key={addr.id} value={addr.id}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{addr.title}</span>
                    {addr.isDefault && (
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        Varsayılan
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value="new">
                <div className="flex items-center gap-2 text-primary">
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-medium">Yeni Adres Gir</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Seçilen kayıtlı adresin özeti */}
          {!isNewShipping && (() => {
            const addr = savedAddresses.find((a) => a.id === selectedShippingId);
            if (!addr) return null;
            return (
              <div className="p-3 rounded-lg border border-border/40 bg-muted/30 text-sm space-y-0.5">
                {addr.fullName && (
                  <p className="font-medium">{addr.fullName}</p>
                )}
                <p className="text-muted-foreground">{addr.addressLine}</p>
                <p className="text-muted-foreground">
                  {addr.state && `${addr.state}, `}
                  {addr.city}
                  {addr.postalCode && ` - ${addr.postalCode}`}
                </p>
                {addr.phone && (
                  <p className="text-muted-foreground">{addr.phone}</p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Yeni adres formu */}
      {isNewShipping && (
        <div className="space-y-4 p-4 border border-border/40 rounded-xl bg-card">
          {savedAddresses.length > 0 && (
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Yeni Adres Bilgileri
            </p>
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
              <Label htmlFor="state">İlçe</Label>
              <Input
                id="state"
                value={shippingAddress.state || ""}
                onChange={(e) =>
                  onShippingChange({
                    ...shippingAddress,
                    state: e.target.value,
                  })
                }
                placeholder="Kadıköy"
              />
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

            <div>
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

          {/* Bu adresi kaydet checkbox + isim */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
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

            {/* Adrese isim ver */}
            {saveShippingAddress && (
              <div className="pl-6">
                <Label htmlFor="shippingTitle">Adres İsmi *</Label>
                <Input
                  id="shippingTitle"
                  value={shippingAddressTitle}
                  onChange={(e) => onShippingTitleChange(e.target.value)}
                  placeholder="Ör: Ev, İş, Yazıhane..."
                  className={errors.shippingTitle ? "border-destructive" : ""}
                />
                {errors.shippingTitle && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.shippingTitle}
                  </p>
                )}
              </div>
            )}
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

          {/* Fatura adresi dropdown */}
          {savedAddresses.length > 0 && (
            <div className="space-y-2">
              <Label>Fatura Adresi Seçin</Label>
              <Select value={selectedBillingId} onValueChange={handleBillingSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Fatura adresi seçin..." />
                </SelectTrigger>
                <SelectContent position="popper">
                  {savedAddresses.map((addr) => (
                    <SelectItem key={addr.id} value={addr.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium">{addr.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="new">
                    <div className="flex items-center gap-2 text-primary">
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-medium">Yeni Fatura Adresi Gir</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Seçilen kayıtlı fatura adresinin özeti */}
              {!isNewBilling && (() => {
                const addr = savedAddresses.find((a) => a.id === selectedBillingId);
                if (!addr) return null;
                return (
                  <div className="p-3 rounded-lg border border-border/40 bg-muted/30 text-sm space-y-0.5">
                    {addr.fullName && (
                      <p className="font-medium">{addr.fullName}</p>
                    )}
                    <p className="text-muted-foreground">{addr.addressLine}</p>
                    <p className="text-muted-foreground">
                      {addr.state && `${addr.state}, `}
                      {addr.city}
                      {addr.postalCode && ` - ${addr.postalCode}`}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Yeni fatura adresi formu */}
          {isNewBilling && (
            <div className="space-y-4 p-4 border border-border/40 rounded-xl bg-card">
              {savedAddresses.length > 0 && (
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Yeni Fatura Adresi Bilgileri
                </p>
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
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
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

                {saveBillingAddress && (
                  <div className="pl-6">
                    <Label htmlFor="billingTitle">Fatura Adresi İsmi *</Label>
                    <Input
                      id="billingTitle"
                      value={billingAddressTitle}
                      onChange={(e) => onBillingTitleChange(e.target.value)}
                      placeholder="Ör: Şirket, Fatura Adresi..."
                      className={errors.billingTitle ? "border-destructive" : ""}
                    />
                    {errors.billingTitle && (
                      <p className="text-xs text-destructive mt-1">
                        {errors.billingTitle}
                      </p>
                    )}
                  </div>
                )}
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
