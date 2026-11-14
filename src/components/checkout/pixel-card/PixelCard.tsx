"use client";

import { formatCardNumber, digitsOnly, type CardBrand } from "@/lib/card";
import { PixelText } from "./PixelText";
import { BrandMark } from "./BrandMark";

// ==========================================
// PİKSEL KART
// Formda yazılanları canlı gösteren, iki yüzlü piksel kart.
// Güvenlik kodu alanına geçilince arka yüzüne döner. Kart
// numarasının ilk hanelerinden marka, iyzico BIN sorgusundan
// da banka/program (World, Bonus…) gelir; kartın rengi buna
// göre değişir.
// ==========================================

export type CardField = "number" | "holder" | "expiry" | "cvc" | null;

export interface CardTheme {
  bg: string;
  bg2: string;
  ink: string;
  accent: string;
}

const BRAND_THEME: Record<CardBrand, CardTheme> = {
  unknown: { bg: "#2b2d42", bg2: "#3d405b", ink: "#f4f1de", accent: "#8d99ae" },
  visa: { bg: "#1a1f71", bg2: "#2b3aa8", ink: "#ffffff", accent: "#f7b600" },
  mastercard: { bg: "#1e1e24", bg2: "#3a2a20", ink: "#ffffff", accent: "#ff5f00" },
  troy: { bg: "#006a72", bg2: "#00949c", ink: "#ffffff", accent: "#7ff6f9" },
  amex: { bg: "#13579b", bg2: "#1f72cd", ink: "#ffffff", accent: "#9fd3ff" },
};

// Türkiye'deki kart programları: rengi programın tanınan rengine çeker
const FAMILY_THEME: Array<[RegExp, CardTheme]> = [
  [/world/i, { bg: "#4a1d75", bg2: "#7a35b0", ink: "#ffffff", accent: "#ffd23f" }],
  [/bonus/i, { bg: "#0f6b3a", bg2: "#1f9a57", ink: "#ffffff", accent: "#c6f432" }],
  [/maximum/i, { bg: "#a0124f", bg2: "#d81b72", ink: "#ffffff", accent: "#ffd1e6" }],
  [/axess/i, { bg: "#6b0f1a", bg2: "#a3162a", ink: "#ffffff", accent: "#ffc8a0" }],
  [/paraf/i, { bg: "#005b9a", bg2: "#0a86d0", ink: "#ffffff", accent: "#a6e3ff" }],
  [/card\s*finans|cardfinans/i, { bg: "#2c1f6b", bg2: "#4b37a8", ink: "#ffffff", accent: "#ffb703" }],
  [/advantage/i, { bg: "#a64400", bg2: "#e06000", ink: "#ffffff", accent: "#ffe08a" }],
  [/bankkart|combo/i, { bg: "#8f1111", bg2: "#c62828", ink: "#ffffff", accent: "#ffcdd2" }],
  [/sa[gğ]lam/i, { bg: "#0b4f6c", bg2: "#01baef", ink: "#ffffff", accent: "#fbfbff" }],
  [/miles|smiles/i, { bg: "#1b1b3a", bg2: "#693668", ink: "#ffffff", accent: "#f2c14e" }],
];

export function themeFor(brand: CardBrand, family?: string | null): CardTheme {
  if (family) {
    for (const [re, theme] of FAMILY_THEME) if (re.test(family)) return theme;
  }
  return BRAND_THEME[brand];
}

interface PixelCardProps {
  number: string;
  holder: string;
  expiry: string;
  cvc: string;
  brand: CardBrand;
  family?: string | null;
  bankName?: string | null;
  cardType?: string | null;
  focused: CardField;
  flipped: boolean;
  onFlip?: () => void;
}

const U = "0.62cqw"; // bir piksel: kart genişliğinin oranı

export function PixelCard({
  number,
  holder,
  expiry,
  cvc,
  brand,
  family,
  bankName,
  cardType,
  focused,
  flipped,
  onFlip,
}: PixelCardProps) {
  const theme = themeFor(brand, family);

  const typed = formatCardNumber(number, brand);
  const template = brand === "amex" ? "#### ###### #####" : "#### #### #### ####";
  const numberText = typed + template.slice(typed.length);

  const exp = digitsOnly(expiry).slice(0, 4);
  const expTyped = exp.length > 2 ? `${exp.slice(0, 2)}/${exp.slice(2)}` : exp;
  const expText = expTyped + "AA/YY".slice(expTyped.length);

  const cvcLen = brand === "amex" ? 4 : 3;
  const cvcDigits = digitsOnly(cvc).slice(0, cvcLen);
  const cvcText = cvcDigits + "#".repeat(cvcLen - cvcDigits.length);

  const holderText = holder.trim() ? holder.slice(0, 26) : "AD SOYAD";
  const typeLabel =
    cardType === "DEBIT_CARD" ? "BANKA KARTI" : cardType === "CREDIT_CARD" ? "KREDI KARTI" : null;

  const style = {
    "--card-bg": theme.bg,
    "--card-bg2": theme.bg2,
    "--card-ink": theme.ink,
    "--card-accent": theme.accent,
  } as React.CSSProperties;

  return (
    // Kart görsel bir önizleme; erişilebilir giriş formdaki alanlardır
    <div className="adjy-paycard" style={style} aria-hidden>
      <div
        className="adjy-paycard-inner"
        data-flipped={flipped || undefined}
        onClick={onFlip}
        title={flipped ? "Ön yüzü göster" : "Arka yüzü göster"}
      >
        {/* ---------- ÖN YÜZ ---------- */}
        <div className="adjy-paycard-face adjy-paycard-front">
          {/* Marka değişince bir kez parlayan piksel şerit */}
          <span key={`${brand}-${family ?? ""}`} className="adjy-paycard-shine" />

          <div className="adjy-paycard-row">
            <span className="adjy-paycard-bank">
              {bankName ? (
                <PixelText key={bankName} text={bankName.slice(0, 22)} size="0.42cqw" className="adjy-paycard-pop" />
              ) : (
                <PixelText text="ADJY" size="0.42cqw" />
              )}
            </span>
            {family && (
              <span key={family} className="adjy-paycard-family adjy-paycard-pop">
                <PixelText text={family.slice(0, 14)} size="0.46cqw" />
              </span>
            )}
          </div>

          <div className="adjy-paycard-chiprow">
            <Chip />
            <Contactless />
            {typeLabel && (
              <PixelText text={typeLabel} size="0.36cqw" className="adjy-paycard-type" />
            )}
          </div>

          <div className="adjy-paycard-field adjy-paycard-number" data-active={focused === "number" || undefined}>
            <PixelText text={numberText} size={U} animate dimFrom={typed.length} />
          </div>

          <div className="adjy-paycard-bottom">
            <div className="adjy-paycard-field adjy-paycard-holder" data-active={focused === "holder" || undefined}>
              <PixelText text="KART SAHIBI" size="0.3cqw" className="adjy-paycard-label" />
              <PixelText text={holderText} size="0.48cqw" animate dimFrom={holder.trim() ? undefined : 0} />
            </div>
            <div className="adjy-paycard-field" data-active={focused === "expiry" || undefined}>
              <PixelText text="SKT" size="0.3cqw" className="adjy-paycard-label" />
              <PixelText text={expText} size="0.48cqw" animate dimFrom={expTyped.length} />
            </div>
            <div className="adjy-paycard-brand">
              {brand !== "unknown" && (
                <span key={brand} className="adjy-paycard-pop" style={{ display: "inline-flex" }}>
                  <BrandMark brand={brand} size="0.62cqw" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ---------- ARKA YÜZ ---------- */}
        <div className="adjy-paycard-face adjy-paycard-back">
          <div className="adjy-paycard-stripe" />
          <div className="adjy-paycard-sigrow">
            <div className="adjy-paycard-signature">
              <PixelText text="YETKILI IMZA" size="0.3cqw" />
            </div>
            <div className="adjy-paycard-field adjy-paycard-cvc" data-active={focused === "cvc" || undefined}>
              <PixelText text={cvcText} size="0.6cqw" animate dimFrom={cvcDigits.length} />
            </div>
          </div>
          <div className="adjy-paycard-backnote">
            <PixelText text="CVV / CVC" size="0.34cqw" />
            <span className="adjy-paycard-holo" />
          </div>
          <div className="adjy-paycard-brand adjy-paycard-backbrand">
            {brand !== "unknown" && <BrandMark brand={brand} size="0.5cqw" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip() {
  // 12×9 piksel çip
  const rows = [
    ".##########.",
    "#####..#####",
    "#..#....#..#",
    "#..#....#..#",
    "####....####",
    "#..#....#..#",
    "#..#....#..#",
    "#####..#####",
    ".##########.",
  ];
  let gold = "";
  let line = "";
  rows.forEach((r, y) =>
    Array.from(r).forEach((c, x) => {
      const p = `M${x} ${y}h1v1h-1z`;
      if (c === "#") line += p;
      else gold += p;
    })
  );
  return (
    <svg viewBox="0 0 12 9" shapeRendering="crispEdges" className="adjy-paycard-chip">
      <path d={gold} fill="#f2c94c" />
      <path d={line} fill="#b8892b" />
    </svg>
  );
}

function Contactless() {
  const rows = [
    "#..#..#.",
    ".#..#..#",
    ".#..#..#",
    ".#..#..#",
    ".#..#..#",
    "#..#..#.",
  ];
  let d = "";
  rows.forEach((r, y) =>
    Array.from(r).forEach((c, x) => {
      if (c === "#") d += `M${x} ${y}h1v1h-1z`;
    })
  );
  return (
    <svg viewBox="0 0 8 6" shapeRendering="crispEdges" className="adjy-paycard-nfc">
      <path d={d} fill="currentColor" />
    </svg>
  );
}
