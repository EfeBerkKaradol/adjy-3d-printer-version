// ==========================================
// FİYAT
//
// Ayrı bir fiyat motoru yazılmadı: ADJY'nin mevcut baskı
// motoru (lib/slicer) kullanılır. Fotoğraftan üretilen model,
// yüklenen bir STL ile aynı yoldan geçer — aynı malzeme
// fiyatı, aynı makine ve işçilik maliyeti, aynı KDV.
// Bunun sonucu, sepetteki fiyatın sunucuda yeniden
// hesaplandığında da aynı çıkmasıdır.
// ==========================================

import type * as THREE from "three";
import {
  analyzeMeshPositions,
  calculatePrintPrice,
  estimatePrint,
  type PriceBreakdown,
  type PrintEstimate,
} from "@/lib/slicer";
import { positionsFor } from "./geometry";

export interface GeneratedPricingInput {
  materialId: string;
  colorId: string;
  layerHeight: number;
  infillPercent: number;
  quantity: number;
}

export interface GeneratedPricing {
  volumeMm3: number;
  areaMm2: number;
  heightMm: number;
  estimate: PrintEstimate;
  price: PriceBreakdown;
}

export function priceGeneratedModel(
  geometry: THREE.BufferGeometry,
  options: GeneratedPricingInput
): GeneratedPricing {
  const stats = analyzeMeshPositions(positionsFor(geometry));

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const heightMm = bb ? bb.max.y - bb.min.y : 0;

  const estimate = estimatePrint({
    volumeMm3: stats.volumeMm3,
    areaMm2: stats.areaMm2,
    heightMm,
    infillPercent: options.infillPercent,
    layerHeight: options.layerHeight,
    materialId: options.materialId,
  });

  const price = calculatePrintPrice(estimate, {
    materialId: options.materialId,
    quantity: options.quantity,
    layerHeight: options.layerHeight,
    infillPercent: options.infillPercent,
    colorId: options.colorId,
  });

  return {
    volumeMm3: stats.volumeMm3,
    areaMm2: stats.areaMm2,
    heightMm,
    estimate,
    price,
  };
}
