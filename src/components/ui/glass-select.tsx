"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ==========================================
// BUZLU SEÇİM KUTUSU
//
// Tarayıcının yerel <select> listesi işletim sistemi tarafından
// çizilir ve biçimlendirilemez; bu yüzden sitedeki seçim kutuları
// bunu kullanır: açılan liste üst menüdeki dock paneliyle aynı
// buzlu camdır (bkz. src/lib/glass.ts).
//
// Yerel <select>'e yakın bir arayüz sunar: value/defaultValue,
// onValueChange, name (form gönderimi için gizli alan), required.
// Radix boş değerli seçeneğe izin vermediği için "" değeri içeride
// bir yer tutucuya çevrilir; dışarıya her zaman gerçek değer çıkar.
// ==========================================

const BOS = "__adjy_bos__"

export interface GlassSelectOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

interface GlassSelectProps {
  options: GlassSelectOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Hiçbir seçenek seçili değilken görünen yazı */
  placeholder?: string
  name?: string
  id?: string
  required?: boolean
  disabled?: boolean
  title?: string
  size?: "sm" | "default"
  className?: string
  contentClassName?: string
  "aria-label"?: string
}

export function GlassSelect({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  name,
  id,
  required,
  disabled,
  title,
  size = "default",
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: GlassSelectProps) {
  const [ic, setIc] = React.useState(defaultValue ?? "")
  const kontrollu = value !== undefined
  const gercek = kontrollu ? value : ic

  const bosSecenekVar = options.some((o) => o.value === "")
  const icDeger = (v: string) => (v === "" ? BOS : v)
  // "" ve boş seçenek yoksa placeholder görünsün
  const radixDeger = gercek === "" && !bosSecenekVar ? "" : icDeger(gercek)

  function degisti(v: string) {
    const disari = v === BOS ? "" : v
    if (!kontrollu) setIc(disari)
    onValueChange?.(disari)
  }

  return (
    <>
      <Select
        value={radixDeger}
        onValueChange={degisti}
        required={required}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          size={size}
          title={title}
          aria-label={ariaLabel}
          className={cn("w-full", className)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper" className={contentClassName}>
          {options.map((o) => (
            <SelectItem key={o.value || BOS} value={icDeger(o.value)} disabled={o.disabled}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {name && <input type="hidden" name={name} value={gercek} />}
    </>
  )
}
