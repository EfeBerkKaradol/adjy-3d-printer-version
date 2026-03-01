"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Tag, X, CheckCircle } from "lucide-react";

interface CouponResult {
  couponId: string;
  code: string;
  type: string;
  value: number;
  calculatedDiscount: number;
  description?: string | null;
}

interface CouponInputProps {
  orderTotal: number;
  onCouponApplied: (coupon: CouponResult) => void;
  onCouponRemoved: () => void;
  appliedCoupon: CouponResult | null;
}

export function CouponInput({
  orderTotal,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase(), orderTotal }),
      });

      const data = await res.json();

      if (data.valid) {
        onCouponApplied(data.discount);
        setCode("");
      } else {
        setError(data.error || "Gecersiz kupon kodu");
      }
    } catch {
      setError("Kupon dogrulanamadi");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    onCouponRemoved();
    setError(null);
  };

  // Kupon uygulanmissa
  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <div>
            <span className="text-sm font-medium text-green-600">
              {appliedCoupon.code}
            </span>
            <span className="text-xs text-green-600/70 ml-2">
              {appliedCoupon.type === "PERCENTAGE"
                ? `%${appliedCoupon.value} indirim`
                : `${appliedCoupon.value.toFixed(2)} TL indirim`}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-green-600 hover:text-red-500"
          onClick={handleRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kupon kodu"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className="pl-9 uppercase"
            disabled={loading}
          />
        </div>
        <Button
          variant="outline"
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Uygula"
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
