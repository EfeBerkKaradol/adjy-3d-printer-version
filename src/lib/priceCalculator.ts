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
 * Formülde kullanılabilecek sayısal değişkenleri toplar.
 *
 * Bir ürünün formülü çoğu zaman tek bir parametreye değil,
 * birkaçının birlikte belirlediği hacme bakar — en/boy gibi.
 * Bu yüzden değerlendirme sırasında yalnızca o parametrenin
 * kendi değeri değil, ürünün bütün sayısal parametreleri
 * görünür olmalı.
 *
 * Sayıya çevrilemeyen değerler (renk, metin) dışarıda kalır;
 * onlara atıf yapan bir formül sayısal bir ifadeye
 * dönüşemeyeceği için zaten reddedilir.
 */
function numericVariables(
  parameters: PriceParameter[],
  values: Record<string, number | string>
): Record<string, number> {
  const vars: Record<string, number> = {};
  for (const param of parameters) {
    const raw = values[param.name] ?? param.defaultValue;
    const n = Number(raw);
    if (Number.isFinite(n)) vars[param.name] = n;
  }
  return vars;
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
  const vars = numericVariables(parameters, values);

  for (const param of parameters) {
    if (!param.affectsPrice || !param.priceFormula) continue;

    const value = Number(values[param.name] ?? param.defaultValue);
    if (isNaN(value)) continue;

    try {
      // Formula'yı parse et: "base * (value / 200)" şeklinde
      const result = evaluateFormula(param.priceFormula, basePrice, value, vars);
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
 *
 * Tanınan değişkenler: `base` (ürünün baz fiyatı), `value`
 * (formülün bağlı olduğu parametrenin değeri) ve ürünün
 * sayısal parametrelerinin adları.
 *
 * Değişkenler tek geçişte, tanımlayıcı sınırlarına göre
 * değiştirilir; böylece adı birbirinin içinde geçen iki
 * parametre (`width` ve `width_top` gibi) birbirini bozmaz.
 *
 * Güvenlik: yerine konmamış bir ad kalırsa ifade sayısal
 * olmaktan çıkar ve reddedilir. Yani formül, ürününde
 * karşılığı olmayan bir değişkene atıf yapıyorsa fiyat
 * sessizce değişmez — uydurma bir değerle hesaplanmaz.
 */
export function evaluateFormula(
  formula: string,
  base: number,
  value: number,
  variables: Record<string, number> = {}
): number | null {
  try {
    const expression = formula.replace(/[a-zA-Z_]\w*/g, (name) => {
      if (name === "base") return String(base);
      if (name === "value") return String(value);
      const v = variables[name];
      return Number.isFinite(v) ? String(v) : name;
    });

    // Sadece güvenli karakterlere izin ver: rakamlar, operatörler, parantezler, nokta, boşluk
    if (!/^[\d+\-*/().\s]+$/.test(expression)) {
      return null;
    }

    const result = Function(`"use strict"; return (${expression});`)() as number;
    return typeof result === "number" && isFinite(result) ? result : null;
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
