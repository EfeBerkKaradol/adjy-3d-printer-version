"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import {
  BRAND_LABEL,
  brandFromAssociation,
  cardLength,
  cvcLength,
  detectBrand,
  digitsOnly,
  formatCardNumber,
  validateCard,
  type CardBrand,
  type CardInput,
} from "@/lib/card";
import { PixelCard, type CardField } from "./PixelCard";
import { BrandMark } from "./BrandMark";

// ==========================================
// PİKSEL KART FORMU
// Kart bilgisi yalnızca bu bileşenin state'inde durur; tarayıcıda
// hiçbir yere (localStorage, URL, log) yazılmaz. "Öde" denince
// tek seferlik olarak /api/payments/3ds/initialize'a gider, oradan
// iyzico'ya; dönen banka 3D Secure sayfası açılır.
// ==========================================

interface BinInfo {
  association: string | null;
  family: string | null;
  bankName: string | null;
  cardType: string | null;
}

interface Props {
  orderId: string;
  guestToken?: string | null;
  /** iyzico'nun hazır ödeme sayfasına geç */
  onUseIyzicoForm: () => void;
}

const BRANDS: CardBrand[] = ["troy", "visa", "mastercard", "amex"];
const EMPTY: CardInput = { holder: "", number: "", expiry: "", cvc: "" };

export function PixelCardForm({ orderId, guestToken, onUseIyzicoForm }: Props) {
  const [card, setCard] = useState<CardInput>(EMPTY);
  const [focused, setFocused] = useState<CardField>(null);
  const [flipManual, setFlipManual] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof CardInput, boolean>>>({});
  const [bin, setBin] = useState<BinInfo | null>(null);
  const [binLoading, setBinLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const binCache = useRef(new Map<string, BinInfo | null>());

  const localBrand = detectBrand(card.number);
  const brand: CardBrand = brandFromAssociation(bin?.association) ?? localBrand;
  const errors = validateCard(card);
  const flipped = focused === "cvc" || (focused === null && flipManual);

  // ---- BIN sorgusu: ilk 6 hane değişince banka/program bilgisi ----
  const binKey = digitsOnly(card.number).slice(0, 6);
  useEffect(() => {
    if (binKey.length < 6) {
      setBin(null);
      return;
    }
    if (binCache.current.has(binKey)) {
      setBin(binCache.current.get(binKey) ?? null);
      return;
    }
    let cancelled = false;
    setBinLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/payments/bin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bin: binKey }),
        });
        const data = await res.json();
        const info: BinInfo | null = data.found
          ? {
              association: data.association,
              family: data.family,
              bankName: data.bankName,
              cardType: data.cardType,
            }
          : null;
        binCache.current.set(binKey, info);
        if (!cancelled) setBin(info);
      } catch {
        if (!cancelled) setBin(null);
      } finally {
        if (!cancelled) setBinLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setBinLoading(false);
    };
  }, [binKey]);

  const focusField = (field: CardField) => {
    setFlipManual(false);
    setFocused(field);
  };

  const update = (field: keyof CardInput, value: string) => {
    setError(null);
    setCard((c) => ({ ...c, [field]: value }));
  };

  const showError = (field: keyof CardInput) => (touched[field] ? errors[field] : undefined);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ holder: true, number: true, expiry: true, cvc: true });
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/3ds/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, guestToken: guestToken ?? undefined, card }),
      });
      const data = await res.json();

      if (!res.ok || !data.threeDSHtmlContent) {
        setError({
          message: data.error || "Ödeme başlatılamadı",
          detail:
            [data.code ? `Kod ${data.code}` : null, data.details].filter(Boolean).join(": ") ||
            undefined,
        });
        setSubmitting(false);
        return;
      }

      // Kart bilgisini bellekten sil, bankanın 3D Secure sayfasını aç
      setCard(EMPTY);
      const bytes = Uint8Array.from(atob(data.threeDSHtmlContent), (c) => c.charCodeAt(0));
      const html = new TextDecoder().decode(bytes);
      document.open();
      document.write(html);
      document.close();
    } catch {
      setError({ message: "Ödeme başlatılırken bir hata oluştu" });
      setSubmitting(false);
    }
  }

  const programLine = bin
    ? [bin.family, bin.bankName, bin.cardType === "DEBIT_CARD" ? "Banka kartı" : bin.cardType === "CREDIT_CARD" ? "Kredi kartı" : null]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on" noValidate>
      <PixelCard
        number={card.number}
        holder={card.holder}
        expiry={card.expiry}
        cvc={card.cvc}
        brand={brand}
        family={bin?.family}
        bankName={bin?.bankName}
        cardType={bin?.cardType}
        focused={focused}
        flipped={flipped}
        onFlip={() => setFlipManual((f) => !f)}
      />

      {/* Algılanan marka ve program */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {BRANDS.map((b) => (
            <span key={b} className="adjy-brand-chip" data-on={brand === b || undefined} title={BRAND_LABEL[b]}>
              <BrandMark brand={b} size="2px" />
            </span>
          ))}
        </div>
        <div className="mx-auto min-h-5 max-w-sm text-center font-mono text-xs" aria-live="polite">
          {binLoading ? (
            <div className="pt-2">
              <div className="adjy-bin-scan" />
            </div>
          ) : programLine ? (
            <span>
              <span className="text-muted-foreground">Algılandı: </span>
              {brand !== "unknown" && <strong>{BRAND_LABEL[brand]} · </strong>}
              {programLine}
            </span>
          ) : brand !== "unknown" ? (
            <span>
              <span className="text-muted-foreground">Algılandı: </span>
              <strong>{BRAND_LABEL[brand]}</strong>
            </span>
          ) : (
            <span className="text-muted-foreground">Kart numaranızı yazın, kartınızı tanıyalım</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="cc-number">Kart numarası</Label>
          <Input
            id="cc-number"
            name="cc-number"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="0000 0000 0000 0000"
            className="font-mono tracking-wider"
            value={formatCardNumber(card.number, localBrand)}
            onChange={(e) => {
              const d = digitsOnly(e.target.value);
              update("number", d.slice(0, cardLength(detectBrand(d))));
            }}
            onFocus={() => focusField("number")}
            onBlur={() => {
              setFocused(null);
              setTouched((t) => ({ ...t, number: true }));
            }}
            aria-invalid={!!showError("number")}
          />
          {showError("number") && <p className="text-xs text-destructive">{showError("number")}</p>}
        </div>

        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="cc-name">Kart üzerindeki isim</Label>
          <Input
            id="cc-name"
            name="cc-name"
            autoComplete="cc-name"
            placeholder="AD SOYAD"
            className="uppercase"
            maxLength={60}
            value={card.holder}
            onChange={(e) => update("holder", e.target.value.replace(/[^\p{L}\s.'-]/gu, ""))}
            onFocus={() => focusField("holder")}
            onBlur={() => {
              setFocused(null);
              setTouched((t) => ({ ...t, holder: true }));
            }}
            aria-invalid={!!showError("holder")}
          />
          {showError("holder") && <p className="text-xs text-destructive">{showError("holder")}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cc-exp">Son kullanma (AA/YY)</Label>
          <Input
            id="cc-exp"
            name="cc-exp"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="AA/YY"
            className="font-mono"
            value={(() => {
              const d = digitsOnly(card.expiry);
              return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
            })()}
            onChange={(e) => {
              let d = digitsOnly(e.target.value).slice(0, 4);
              // "4" yazana "04" kolaylığı
              if (d.length === 1 && Number(d) > 1) d = `0${d}`;
              update("expiry", d);
            }}
            onFocus={() => focusField("expiry")}
            onBlur={() => {
              setFocused(null);
              setTouched((t) => ({ ...t, expiry: true }));
            }}
            aria-invalid={!!showError("expiry")}
          />
          {showError("expiry") && <p className="text-xs text-destructive">{showError("expiry")}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cc-csc">Güvenlik kodu (CVV)</Label>
          <Input
            id="cc-csc"
            name="cc-csc"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder={brand === "amex" ? "0000" : "000"}
            className="font-mono"
            value={card.cvc}
            onChange={(e) => update("cvc", digitsOnly(e.target.value).slice(0, cvcLength(brand)))}
            onFocus={() => focusField("cvc")}
            onBlur={() => {
              setFocused(null);
              setTouched((t) => ({ ...t, cvc: true }));
            }}
            aria-invalid={!!showError("cvc")}
          />
          {showError("cvc") && <p className="text-xs text-destructive">{showError("cvc")}</p>}
        </div>
      </div>

      {error && (
        <div className="adjy-pixel-frame space-y-3 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error.message}
          </p>
          {error.detail && <p className="text-xs text-muted-foreground">{error.detail}</p>}
          <p className="text-xs text-muted-foreground">
            Kartınızdan herhangi bir çekim yapılmadı. Bilgileri kontrol edip yeniden deneyebilir
            ya da iyzico ödeme sayfasıyla ödeyebilirsiniz.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onUseIyzicoForm}>
            iyzico ödeme sayfasıyla öde
          </Button>
        </div>
      )}

      <Button type="submit" className="w-full gap-2" size="lg" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {submitting ? "Bankanıza bağlanılıyor..." : "3D Secure ile güvenli öde"}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Kart bilgileriniz sitemizde saklanmaz; doğrudan iyzico&apos;ya iletilir ve her ödeme
        bankanızın 3D Secure (SMS) onayıyla tamamlanır.{" "}
        <button type="button" onClick={onUseIyzicoForm} className="underline underline-offset-2">
          iyzico ödeme sayfasını kullan
        </button>
      </p>
    </form>
  );
}
