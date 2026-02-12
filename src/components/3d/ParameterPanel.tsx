"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ==========================================
// PARAMETRE PANELİ
//
// Ürün parametrelerine göre dinamik kontroller oluşturur:
//   - SLIDER → range input
//   - COLOR  → color picker
//   - NUMBER → number input
//   - DROPDOWN → select
//   - TEXT → text input
// ==========================================

interface Parameter {
  id: string;
  name: string;
  displayName: string;
  type: string;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string;
  step: number | null;
  unit: string | null;
  affectsPrice: boolean;
  priceFormula: string | null;
  affectsGeometry: boolean;
  sortOrder: number;
  validationRules?: { options?: string[]; maxLength?: number; minLength?: number } | null;
}

interface ParameterPanelProps {
  parameters: Parameter[];
  values: Record<string, number | string>;
  onChange: (name: string, value: number | string) => void;
  onReset: () => void;
}

export function ParameterPanel({
  parameters,
  values,
  onChange,
  onReset,
}: ParameterPanelProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Ozellestirme</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Sifirla
        </Button>
      </div>

      <Separator />

      <div className="space-y-5">
        {parameters.map((param) => (
          <ParameterControl
            key={param.id}
            param={param}
            value={values[param.name]}
            onChange={(value) => onChange(param.name, value)}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================
// TEK PARAMETRE KONTROLÜ
// ==========================================

interface ParameterControlProps {
  param: Parameter;
  value: number | string | undefined;
  onChange: (value: number | string) => void;
}

function ParameterControl({ param, value, onChange }: ParameterControlProps) {
  const currentValue = value ?? param.defaultValue;

  switch (param.type) {
    case "SLIDER":
      return (
        <SliderControl
          param={param}
          value={Number(currentValue)}
          onChange={(v) => onChange(v)}
        />
      );
    case "COLOR":
      return (
        <ColorControl
          param={param}
          value={String(currentValue)}
          onChange={(v) => onChange(v)}
        />
      );
    case "DROPDOWN":
      return (
        <DropdownControl
          param={param}
          value={String(currentValue)}
          onChange={(v) => onChange(v)}
        />
      );
    case "NUMBER":
      return (
        <NumberControl
          param={param}
          value={Number(currentValue)}
          onChange={(v) => onChange(v)}
        />
      );
    default:
      return (
        <TextControl
          param={param}
          value={String(currentValue)}
          onChange={(v) => onChange(v)}
        />
      );
  }
}

// ==========================================
// SLIDER KONTROLÜ
// ==========================================
function SliderControl({
  param,
  value,
  onChange,
}: {
  param: Parameter;
  value: number;
  onChange: (v: number) => void;
}) {
  const min = param.minValue ?? 0;
  const max = param.maxValue ?? 100;
  const step = param.step ?? 1;
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{param.displayName}</Label>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-mono font-semibold text-primary">
            {value}
          </span>
          {param.unit && (
            <span className="text-xs text-muted-foreground">{param.unit}</span>
          )}
          {param.affectsPrice && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 ml-1">
              ₺
            </Badge>
          )}
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-5
                     [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-primary
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:transition-transform
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-moz-range-thumb]:w-5
                     [&::-moz-range-thumb]:h-5
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-primary
                     [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentage}%, hsl(var(--muted)) ${percentage}%, hsl(var(--muted)) 100%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {min}
            {param.unit && ` ${param.unit}`}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {max}
            {param.unit && ` ${param.unit}`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// RENK KONTROLÜ
// ==========================================
function ColorControl({
  param,
  value,
  onChange,
}: {
  param: Parameter;
  value: string;
  onChange: (v: string) => void;
}) {
  const presetColors = [
    "#FFFFFF", "#000000", "#FF4444", "#4488FF",
    "#44CC44", "#FFAA00", "#FF44FF", "#44CCCC",
  ];

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{param.displayName}</Label>
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {presetColors.map((c) => (
            <button
              key={c}
              className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                value === c ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border/40"
              }`}
              style={{ backgroundColor: c }}
              onClick={() => onChange(c)}
            />
          ))}
        </div>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
        />
      </div>
    </div>
  );
}

// ==========================================
// SAYI KONTROLÜ
// ==========================================
function NumberControl({
  param,
  value,
  onChange,
}: {
  param: Parameter;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{param.displayName}</Label>
        {param.affectsPrice && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
            Fiyati etkiler
          </Badge>
        )}
      </div>
      <Input
        type="number"
        value={value}
        min={param.minValue ?? undefined}
        max={param.maxValue ?? undefined}
        step={param.step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

// ==========================================
// DROPDOWN KONTROLÜ
// ==========================================
function DropdownControl({
  param,
  value,
  onChange,
}: {
  param: Parameter;
  value: string;
  onChange: (v: string) => void;
}) {
  const options: string[] =
    (param.validationRules as { options?: string[] } | null)?.options ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{param.displayName}</Label>
        <div className="flex items-center gap-1.5">
          {param.unit && (
            <span className="text-xs text-muted-foreground">{param.unit}</span>
          )}
          {param.affectsPrice && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0">
              ₺
            </Badge>
          )}
        </div>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sec..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
              {param.unit ? ` ${param.unit}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ==========================================
// TEXT KONTROLÜ
// ==========================================
function TextControl({
  param,
  value,
  onChange,
}: {
  param: Parameter;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{param.displayName}</Label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={param.defaultValue}
      />
    </div>
  );
}
