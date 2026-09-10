// ==========================================
// SAĞLAYICI SÖZLEŞMELERİ
//
// Fotoğrafı yorumlayan ve modeli kuran katman buradaki iki
// arayüzün arkasında durur. Gerçek bir görüntü/3D servisi
// devreye girdiğinde yalnızca bu arayüzü uygulayan yeni bir
// sağlayıcı yazılır — akış, bileşenler ve fiyatlama aynı kalır.
// ==========================================

import type { GeneratedModel, PhotoAnalysis } from "../types";

export interface ImageAnalysisProvider {
  readonly id: string;
  /** Fotoğrafı çözümleyip objenin biçim bilgisini çıkarır */
  analyze(file: File): Promise<PhotoAnalysis>;
}

export interface ModelGenerationProvider {
  readonly id: string;
  /** Biçim bilgisinden parametrik bir model kurar */
  generate(analysis: PhotoAnalysis): Promise<GeneratedModel>;
}

/** Sağlayıcının anlamlı bir sonuç üretemediği durum */
export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
  }
}
