// ==========================================
// ÖZEL 3D BASKI (MÜŞTERİ MODELİ)
//
// Fiyat hesaplayıcıdan yüklenen STL'ler, sipariş sistemine
// gizli (isActive=false) "ozel-3d-baski" ürünü üzerinden girer.
// Dosya URL'i ve tüm baskı özelleştirmeleri sipariş kaleminin
// customParams alanında saklanır; fiyat sunucuda slicer
// motoruyla yeniden hesaplanır.
// ==========================================

/** Veritabanındaki gizli özel baskı ürününün kimliği */
export const CUSTOM_PRINT_PRODUCT_ID = "c1e719427768990d545bf818";
export const CUSTOM_PRINT_SLUG = "ozel-3d-baski";

/** Sipariş kalemi customParams yapısı (fiyat hesaplayıcı doldurur) */
export interface CustomPrintParams {
  isCustomUpload: true;
  fileName: string;
  fileUrl: string; // Cloudinary raw STL bağlantısı
  // Slicer girdileri — boyut özelleştirmesi UYGULANMIŞ değerler
  volumeMm3: number;
  areaMm2: number;
  heightMm: number;
  // Seçenekler
  materialId: string;
  materialName: string;
  colorId: string;
  colorName: string;
  layerHeight: number;
  infillPercent: number;
  // Bilgi amaçlı boyutlar (mm)
  dimensions: { x: number; y: number; z: number };
  originalDimensions: { x: number; y: number; z: number };
}

export function isCustomPrintParams(
  params: Record<string, unknown> | null | undefined
): params is Record<string, unknown> & CustomPrintParams {
  return !!params && params.isCustomUpload === true && typeof params.fileUrl === "string";
}
