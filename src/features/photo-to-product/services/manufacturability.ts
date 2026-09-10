// ==========================================
// ÜRETİLEBİLİRLİK
//
// Kullanıcıya teknik rapor gösterilmez. Üç sonuçtan biri
// verilir: üretime uygun, küçük düzeltme gerekiyor, ya da
// mevcut seçeneklerle üretilemiyor.
// ==========================================

import { MAX_MODEL_DIMENSION_MM } from "@/lib/slicer";
import type { ManufacturabilityResult, ModelDimensions } from "../types";

/** Nozzle genişliğinin altındaki detay basılamaz */
const MIN_FEATURE_MM = 1.2;

export function checkManufacturability(
  dimensions: ModelDimensions,
  volumeMm3: number,
  areaMm2: number
): ManufacturabilityResult {
  const largest = Math.max(dimensions.widthMm, dimensions.depthMm, dimensions.heightMm);

  if (largest > MAX_MODEL_DIMENSION_MM) {
    return {
      level: "unsuitable",
      title: "Bu ölçü tablamıza sığmıyor",
      detail: `En büyük kenar ${MAX_MODEL_DIMENSION_MM} mm'yi aşmamalı. Ölçüyü küçültürsen üretebiliriz.`,
    };
  }

  if (volumeMm3 <= 0 || areaMm2 <= 0) {
    return {
      level: "unsuitable",
      title: "Bu obje üretim için uygun görünmüyor",
      detail: "Farklı bir açıdan çekilmiş bir fotoğrafla tekrar deneyebilirsin.",
    };
  }

  // Ortalama et kalınlığı: hacmin yüzey alanına oranı iki
  // yüzey arasındaki mesafeye yaklaşır.
  const meanThickness = (2 * volumeMm3) / areaMm2;
  if (meanThickness < MIN_FEATURE_MM) {
    return {
      level: "adjustable",
      title: "Üretim için küçük bir düzeltme gerekiyor",
      detail:
        "Modelin bazı bölümleri baskı için fazla ince. ADJY bunları üretime uygun hâle getirir.",
    };
  }

  return { level: "ok", title: "Üretime uygun", detail: null };
}
