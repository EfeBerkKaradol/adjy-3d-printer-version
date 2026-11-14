// ==========================================
// KART YARDIMCILARI (tarayıcı + sunucu)
//
// Marka tespiti kart numarasının ilk hanelerinden (BIN/IIN)
// yapılır; banka ve program (World, Bonus, Maximum…) bilgisi
// ise iyzico BIN sorgusundan gelir (/api/payments/bin).
// ==========================================

export type CardBrand = "visa" | "mastercard" | "troy" | "amex" | "unknown";

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "VISA",
  mastercard: "MASTERCARD",
  troy: "TROY",
  amex: "AMEX",
  unknown: "KART",
};

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function detectBrand(number: string): CardBrand {
  const n = digitsOnly(number);
  if (/^3[47]/.test(n)) return "amex";
  // Troy: 9792xx ve Türkiye'de 65xxxx aralığı
  if (/^9792/.test(n) || /^65/.test(n)) return "troy";
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(n)) return "mastercard";
  return "unknown";
}

/** iyzico'nun kart birliği adını bizim marka adına çevirir */
export function brandFromAssociation(assoc?: string | null): CardBrand | null {
  switch ((assoc || "").toUpperCase()) {
    case "VISA":
      return "visa";
    case "MASTER_CARD":
      return "mastercard";
    case "TROY":
      return "troy";
    case "AMERICAN_EXPRESS":
      return "amex";
    default:
      return null;
  }
}

export function cardLength(brand: CardBrand): number {
  return brand === "amex" ? 15 : 16;
}

export function cvcLength(brand: CardBrand): number {
  return brand === "amex" ? 4 : 3;
}

/** "4111111111111111" → "4111 1111 1111 1111" (Amex: 4-6-5) */
export function formatCardNumber(number: string, brand = detectBrand(number)): string {
  const n = digitsOnly(number).slice(0, cardLength(brand));
  if (brand === "amex") {
    return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(" ");
  }
  return n.replace(/(.{4})/g, "$1 ").trim();
}

export function luhnValid(number: string): boolean {
  const n = digitsOnly(number);
  if (n.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = n.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** "0729" / "07/29" → { month: "07", year: "2029" } ya da null */
export function parseExpiry(value: string): { month: string; year: string } | null {
  const d = digitsOnly(value);
  if (d.length !== 4) return null;
  const month = d.slice(0, 2);
  const m = Number(month);
  if (m < 1 || m > 12) return null;
  return { month, year: `20${d.slice(2)}` };
}

export function expiryValid(value: string, now = new Date()): boolean {
  const e = parseExpiry(value);
  if (!e) return false;
  const y = Number(e.year);
  const m = Number(e.month);
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  if (y < cy || (y === cy && m < cm)) return false;
  return y <= cy + 20;
}

export interface CardInput {
  holder: string;
  number: string;
  expiry: string;
  cvc: string;
}

/** Alan → hata mesajı; boş nesne = geçerli */
export function validateCard(card: CardInput): Partial<Record<keyof CardInput, string>> {
  const errors: Partial<Record<keyof CardInput, string>> = {};
  const brand = detectBrand(card.number);
  const n = digitsOnly(card.number);

  if (card.holder.trim().length < 3 || !/\s/.test(card.holder.trim())) {
    errors.holder = "Kart üzerindeki ad ve soyadı yazın";
  }
  if (n.length !== cardLength(brand) || !luhnValid(n)) {
    errors.number = "Kart numarası geçersiz";
  }
  if (!expiryValid(card.expiry)) {
    errors.expiry = "Son kullanma tarihi geçersiz";
  }
  if (digitsOnly(card.cvc).length !== cvcLength(brand)) {
    errors.cvc = `Güvenlik kodu ${cvcLength(brand)} haneli olmalı`;
  }
  return errors;
}
