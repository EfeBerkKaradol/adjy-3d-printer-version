// ==========================================
// ÖLÇÜ BİRİMİ
//
// Sitede ürün ölçüleri santimetre gösterilir; hesaplar ise
// milimetre üzerinden yürür. Bunun sebebi 3D baskının kendi
// dünyasının mm olması: STL dosyaları, dilimleyici, hacim ve
// tabla sınırı hep mm. Veriyi cm'ye çevirmek her yerde
// yuvarlama hatası biriktirirdi.
//
// Bu yüzden dönüşüm yalnızca ekranda yapılır. Depolanan ve
// üretime giden her değer mm olarak kalır.
//
// İstisna: katman yüksekliği ve duvar kalınlığı gibi nozzle
// ölçeğindeki değerler mm gösterilir — 0,2 mm okunur,
// 0,02 cm okunmaz.
// ==========================================

export const MM_IN_CM = 10;

export const LENGTH_UNIT = "cm";

export function mmToCm(mm: number): number {
  return mm / MM_IN_CM;
}

export function cmToMm(cm: number): number {
  return cm * MM_IN_CM;
}

/**
 * Sayıyı cm olarak biçimlendirir — birimsiz.
 * 150 → "15", 69 → "6,9". Gereksiz sıfır yazılmaz.
 */
export function formatCmValue(mm: number, maxDecimals = 1): string {
  const cm = mmToCm(mm);
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(cm);
}

/** 150 → "15 cm" */
export function formatLength(mm: number, maxDecimals = 1): string {
  return `${formatCmValue(mm, maxDecimals)} ${LENGTH_UNIT}`;
}

/** (69, 69, 150) → "6,9 × 6,9 × 15 cm" */
export function formatDimensions(
  aMm: number,
  bMm: number,
  cMm: number,
  maxDecimals = 1
): string {
  const f = (v: number) => formatCmValue(v, maxDecimals);
  return `${f(aMm)} × ${f(bMm)} × ${f(cMm)} ${LENGTH_UNIT}`;
}

/**
 * Sürgü ve sayı girişleri için: mm cinsinden bir aralığı
 * cm'ye çevirir. Adım en az 0,1 cm olur ki kullanıcı
 * ekranda gördüğü basamağı gerçekten değiştirebilsin.
 */
export function toCmRange(minMm: number, maxMm: number, stepMm: number) {
  return {
    min: mmToCm(minMm),
    max: mmToCm(maxMm),
    step: Math.max(0.1, mmToCm(stepMm)),
  };
}
