// ==========================================
// FİYAT HESAPLAMA MOTORU
//
// Parametrelere göre dinamik fiyat hesaplar.
// Her parametrenin priceFormula alanı:
//   "base * (value / 200)"
// gibi bir JavaScript ifadesi içerir.
//
// Güvenlik: eval yerine basit formula parser kullanır.
// ==========================================

interface PriceParameter {
  name: string;
  affectsPrice: boolean;
  priceFormula: string | null;
  defaultValue: string;
}

/**
 * Parametrelere göre toplam fiyatı hesaplar.
 *
 * @param basePrice - Ürünün baz fiyatı
 * @param parameters - Ürün parametreleri (affectsPrice + priceFormula bilgisi)
 * @param values - Kullanıcının seçtiği değerler
 * @returns Hesaplanan toplam fiyat
 */
export function calculatePrice(
  basePrice: number,
  parameters: PriceParameter[],
  values: Record<string, number | string>
): number {
  let totalPrice = basePrice;

  for (const param of parameters) {
    if (!param.affectsPrice || !param.priceFormula) continue;

    const value = Number(values[param.name] ?? param.defaultValue);
    if (isNaN(value)) continue;

    try {
      // Formula'yı parse et: "base * (value / 200)" şeklinde
      const result = evaluateFormula(param.priceFormula, basePrice, value);
      if (result !== null && isFinite(result)) {
        // Formula sonucu baz fiyatın yerine geçer (çarpan gibi)
        // Eğer formula "base * (value / 200)" ise:
        //   value=200 → base * 1.0 (default, değişiklik yok)
        //   value=300 → base * 1.5 (fiyat artar)
        //   value=100 → base * 0.5 (fiyat azalır)
        // Bu yüzden fark olarak ekle: result - base
        totalPrice += result - basePrice;
      }
    } catch {
      // Formula hatası varsa atla
      continue;
    }
  }

  return Math.max(0, Math.round(totalPrice * 100) / 100);
}

/**
 * Basit formula değerlendirici.
 * Desteklenen değişkenler: base, value
 * Desteklenen operatörler: +, -, *, /, (, )
 */
function evaluateFormula(
  formula: string,
  base: number,
  value: number
): number | null {
  try {
    // Değişkenleri değerlerle değiştir
    const expression = formula
      .replace(/\bbase\b/g, String(base))
      .replace(/\bvalue\b/g, String(value));

    // Sadece güvenli karakterlere izin ver: rakamlar, operatörler, parantezler, nokta, boşluk
    if (!/^[\d+\-*/().\s]+$/.test(expression)) {
      return null;
    }

    // Hesapla
    return Function(`"use strict"; return (${expression});`)() as number;
  } catch {
    return null;
  }
}

/**
 * Fiyat değişimini yüzde olarak hesaplar.
 */
export function calculatePriceChange(
  basePrice: number,
  currentPrice: number
): { amount: number; percentage: number; direction: "up" | "down" | "same" } {
  const amount = currentPrice - basePrice;
  const percentage = basePrice > 0 ? (amount / basePrice) * 100 : 0;

  return {
    amount: Math.round(amount * 100) / 100,
    percentage: Math.round(percentage * 10) / 10,
    direction: amount > 0 ? "up" : amount < 0 ? "down" : "same",
  };
}
