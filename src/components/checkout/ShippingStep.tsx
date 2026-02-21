"use client";

import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Truck, Zap, Gift } from "lucide-react";
import type { ShippingOption } from "@/lib/shipping";

// ==========================================
// ADIM 3: KARGO SEÇİMİ
// Kullanıcı kargo yöntemini seçer.
// ==========================================

interface ShippingStepProps {
  shippingOptions: ShippingOption[];
  selectedShipping: string;
  onShippingChange: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const SHIPPING_ICONS: Record<string, React.ReactNode> = {
  standard: <Truck className="h-5 w-5" />,
  express: <Zap className="h-5 w-5" />,
  free: <Gift className="h-5 w-5" />,
};

export function ShippingStep({
  shippingOptions,
  selectedShipping,
  onShippingChange,
  onNext,
  onBack,
}: ShippingStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Kargo Seçimi</h2>
        <p className="text-sm text-muted-foreground">
          Teslimat yöntemini seçin.
        </p>
      </div>

      <RadioGroup
        value={selectedShipping}
        onValueChange={onShippingChange}
        className="space-y-3"
      >
        {shippingOptions.map((option) => (
          <div key={option.id}>
            <Label
              htmlFor={option.id}
              className="flex items-center gap-4 p-4 border border-border/40 rounded-xl bg-card cursor-pointer hover:border-primary/50 transition-colors has-[data-state=checked]:border-primary has-[data-state=checked]:bg-primary/5"
            >
              <RadioGroupItem value={option.id} id={option.id} />

              <div className="text-primary/70">
                {SHIPPING_ICONS[option.id] || <Truck className="h-5 w-5" />}
              </div>

              <div className="flex-1">
                <p className="font-medium text-sm">{option.name}</p>
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tahmini teslimat: {option.estimatedDays}
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold text-sm">
                  {option.price === 0 ? (
                    <span className="text-green-600">Ücretsiz</span>
                  ) : (
                    `${option.price.toFixed(2)} TL`
                  )}
                </p>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Geri
        </Button>
        <Button onClick={onNext} className="flex-1 gap-2">
          Ödemeye Geç
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
