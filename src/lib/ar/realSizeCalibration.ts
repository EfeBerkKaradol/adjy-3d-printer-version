import type { RealSizeDimensions } from "@/types/ar.types";

/**
 * Urun tipine gore parametrelerden gercek boyutlari (mm) cikarir.
 * ParametricModel.tsx'teki parametreler mm cinsindendir.
 */
export function extractDimensions(
  parameters: Record<string, number | string>,
  productType: string
): RealSizeDimensions {
  switch (productType) {
    case "vase":
      return {
        widthMm: Number(parameters.width || 100),
        heightMm: Number(parameters.height || 200),
        depthMm: Number(parameters.width || 100),
      };
    case "stand":
      return {
        widthMm: Number(parameters.width || 80),
        heightMm: Number(parameters.height || 100),
        depthMm: Number(parameters.width || 80) * 0.8,
      };
    case "keychain":
      return {
        widthMm: Number(parameters.diameter || 40),
        heightMm: Number(parameters.thickness || 3),
        depthMm: Number(parameters.diameter || 40),
      };
    case "lamp":
      return {
        widthMm: Number(parameters.diameter || 150),
        heightMm: Number(parameters.height || 250),
        depthMm: Number(parameters.diameter || 150),
      };
    case "pencilHolder": {
      const compartments = Number(parameters.compartments || 3);
      return {
        widthMm: compartments * 32,
        heightMm: Number(parameters.height || 100),
        depthMm: 35,
      };
    }
    case "bracelet":
      return {
        widthMm: Number(parameters.diameter || 65),
        heightMm: Number(parameters.bandWidth || 15),
        depthMm: Number(parameters.diameter || 65),
      };
    case "gear": {
      const teethCount = Number(parameters.teethCount || 24);
      const modulePar = Number(parameters.module || 1);
      const dim = (teethCount * modulePar) / 10;
      return {
        widthMm: dim,
        heightMm: Number(parameters.thickness || 5),
        depthMm: dim,
      };
    }
    case "figure":
      return {
        widthMm: Number(parameters.width || 80),
        heightMm: Number(parameters.height || 180),
        depthMm: Number(parameters.depth || 80),
      };
    default:
      return { widthMm: 100, heightMm: 200, depthMm: 100 };
  }
}

export function mmToMeters(mm: number): number {
  return mm / 1000;
}

export function getARScale(dimensions: RealSizeDimensions): string {
  const maxDim = Math.max(
    dimensions.widthMm,
    dimensions.heightMm,
    dimensions.depthMm
  );
  return maxDim < 500 ? "fixed" : "auto";
}
