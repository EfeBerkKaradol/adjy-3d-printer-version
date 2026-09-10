// ==========================================
// SAĞLAYICI SEÇİMİ
//
// Akışın tamamı yalnızca bu iki değişkeni tanır. Gerçek bir
// görüntü çözümleme veya 3D üretim servisi bağlandığında
// değişecek tek yer burasıdır; sayfalar, bileşenler ve
// fiyatlama olduğu gibi kalır.
// ==========================================

import { silhouetteImageAnalysis, silhouetteModelGeneration } from "./silhouette";
import type { ImageAnalysisProvider, ModelGenerationProvider } from "./types";

export const imageAnalysisProvider: ImageAnalysisProvider = silhouetteImageAnalysis;
export const modelGenerationProvider: ModelGenerationProvider = silhouetteModelGeneration;

export { GenerationError } from "./types";
export type { ImageAnalysisProvider, ModelGenerationProvider } from "./types";
