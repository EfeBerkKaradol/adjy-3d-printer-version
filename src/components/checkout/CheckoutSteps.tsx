"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ==========================================
// CHECKOUT ADIM GÖSTERGESİ
// 4 adımlı ödeme süreci.
// ==========================================

const STEPS = [
  { id: 1, label: "Sepet Özeti" },
  { id: 2, label: "Adres" },
  { id: 3, label: "Kargo" },
  { id: 4, label: "Ödeme" },
];

interface CheckoutStepsProps {
  currentStep: number;
}

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          {/* Step circle */}
          <div className="flex flex-col items-center relative">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                currentStep > step.id
                  ? "bg-primary border-primary text-primary-foreground"
                  : currentStep === step.id
                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-muted border-border text-muted-foreground"
              )}
            >
              {currentStep > step.id ? (
                <Check className="h-5 w-5" />
              ) : (
                step.id
              )}
            </div>
            <span
              className={cn(
                "text-xs mt-2 font-medium whitespace-nowrap",
                currentStep >= step.id
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>

          {/* Connector line */}
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-3 mt-[-20px] transition-colors",
                currentStep > step.id ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
