// ==========================================
// SLICER TAHMİN MOTORU
//
// Yüklenen STL modelinin hacim/yüzey alanı verisinden
// filament ağırlığı, baskı süresi ve fiyat tahmini üretir.
//
// Mantık (gerçek slicer yaklaşımı):
//   kabukHacmi   = yüzeyAlanı × duvarKalınlığı (model hacmiyle sınırlı)
//   içHacim      = toplamHacim - kabukHacmi
//   filamentHacmi = kabukHacmi + içHacim × dolulukOranı
//   ağırlık      = filamentHacmi × malzemeYoğunluğu × fireKatsayısı
// ==========================================

// --- Dosya ve boyut sınırları (referans servisle birebir) ---
export const ACCEPTED_EXTENSIONS = [".stl"];
export const MAX_FILE_SIZE_MB = 9;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const MAX_MODEL_DIMENSION_MM = 300;

// --- Baskı sabitleri ---
const WALL_THICKNESS_MM = 1.2; // 3 çevre duvarı × 0.4mm nozzle
const WASTE_FACTOR = 1.05; // %5 fire (purge, brim, ilk katman)
const SETUP_TIME_MIN = 8; // tabla ısıtma + kalibrasyon
const LAYER_OVERHEAD_SEC = 2; // katman başına hareket/geri çekme kaybı
const MACHINE_RATE_PER_HOUR = 60; // ₺/saat makine amortismanı + elektrik
const PREP_FEE = 25; // ₺ hazırlık/işçilik (dilimleme, tabla temizliği)
const MIN_UNIT_PRICE = 40; // ₺ minimum birim fiyat
export const VAT_RATE = 0.2; // KDV %20

// --- Malzemeler ---
export interface Material {
  id: string;
  name: string;
  density: number; // g/cm³
  pricePerGram: number; // ₺/g
  description: string;
}

// Tüm malzemelerde sabit gram fiyatı
const PRICE_PER_GRAM = 4;

export const MATERIALS: Material[] = [
  { id: "pla", name: "PLA", density: 1.24, pricePerGram: PRICE_PER_GRAM, description: "Genel kullanım, kolay baskı" },
  { id: "silk-pla", name: "Silk PLA", density: 1.24, pricePerGram: PRICE_PER_GRAM, description: "Parlak ipeksi yüzey" },
  { id: "star-pla", name: "Star PLA (Simli)", density: 1.24, pricePerGram: PRICE_PER_GRAM, description: "Simli dekoratif görünüm" },
  { id: "glow-pla", name: "Ultra-Glow PLA", density: 1.3, pricePerGram: PRICE_PER_GRAM, description: "Karanlıkta parlar" },
  { id: "abs", name: "ABS", density: 1.04, pricePerGram: PRICE_PER_GRAM, description: "Isıya dayanıklı, mukavemetli" },
  { id: "petg", name: "PETG", density: 1.27, pricePerGram: PRICE_PER_GRAM, description: "Darbe ve neme dayanıklı" },
  { id: "petg-cf", name: "PETG-CF", density: 1.3, pricePerGram: PRICE_PER_GRAM, description: "Karbon fiber takviyeli PETG" },
  { id: "tpu", name: "TPU (95A)", density: 1.21, pricePerGram: PRICE_PER_GRAM, description: "Esnek, kauçuk benzeri" },
  { id: "asa", name: "ASA", density: 1.07, pricePerGram: PRICE_PER_GRAM, description: "UV dayanımlı, dış mekan" },
  { id: "pla-cf", name: "PLA-CF", density: 1.29, pricePerGram: PRICE_PER_GRAM, description: "Karbon fiber takviyeli PLA" },
];

// --- Katman yükseklikleri (baskı kalitesi) ---
export interface LayerHeightOption {
  value: number; // mm
  label: string;
  flowRate: number; // mm³/s ortalama ekstrüzyon debisi
}

export const LAYER_HEIGHTS: LayerHeightOption[] = [
  { value: 0.2, label: "Yüksek", flowRate: 13 },
  { value: 0.4, label: "Orta", flowRate: 20 },
  { value: 0.6, label: "Standart", flowRate: 28 },
];

// --- Doluluk oranları ---
export const INFILL_OPTIONS = [20, 30, 40, 50, 60, 70, 80, 90, 100];


// --- Renkler ---
export const FILAMENT_COLORS = [
  { id: "siyah", name: "Siyah", hex: "#2b2b2b" },
  { id: "beyaz", name: "Beyaz", hex: "#f2f2f2" },
  { id: "gri", name: "Gri", hex: "#9ca3af" },
  { id: "kirmizi", name: "Kırmızı", hex: "#dc2626" },
  { id: "turuncu", name: "Turuncu", hex: "#f97316" },
  { id: "sari", name: "Sarı", hex: "#eab308" },
  { id: "yesil", name: "Yeşil", hex: "#16a34a" },
  { id: "mavi", name: "Mavi", hex: "#2563eb" },
  { id: "mor", name: "Mor", hex: "#7c3aed" },
];

// --- Adet bazlı indirim tablosu (referans servisle birebir) ---
export interface DiscountTier {
  minQty: number;
  maxQty: number | null;
  rate: number; // 0-1
}

export const QUANTITY_DISCOUNTS: DiscountTier[] = [
  { minQty: 1, maxQty: 9, rate: 0 },
  { minQty: 10, maxQty: 49, rate: 0.05 },
  { minQty: 50, maxQty: 199, rate: 0.1 },
  { minQty: 200, maxQty: 499, rate: 0.15 },
  { minQty: 500, maxQty: 999, rate: 0.2 },
  { minQty: 1000, maxQty: 1999, rate: 0.25 },
  { minQty: 2000, maxQty: null, rate: 0.3 },
];

export function getDiscountRate(quantity: number): number {
  const tier = QUANTITY_DISCOUNTS.find(
    (t) => quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty)
  );
  return tier?.rate ?? 0;
}

// ==========================================
// MESH ANALİZİ
// STL geometrisinin pozisyon verisinden hacim (mm³),
// yüzey alanı (mm²) hesaplar. İndekssiz üçgen soup
// (STLLoader çıktısı) ile çalışır.
// ==========================================

export interface MeshStats {
  volumeMm3: number;
  areaMm2: number;
  triangleCount: number;
}

export function analyzeMeshPositions(positions: ArrayLike<number>): MeshStats {
  let volume = 0;
  let area = 0;
  const triCount = Math.floor(positions.length / 9);

  for (let i = 0; i < triCount * 9; i += 9) {
    const ax = positions[i], ay = positions[i + 1], az = positions[i + 2];
    const bx = positions[i + 3], by = positions[i + 4], bz = positions[i + 5];
    const cx = positions[i + 6], cy = positions[i + 7], cz = positions[i + 8];

    // İşaretli tetrahedron hacmi: (a · (b × c)) / 6
    volume +=
      (ax * (by * cz - bz * cy) +
        ay * (bz * cx - bx * cz) +
        az * (bx * cy - by * cx)) / 6;

    // Üçgen alanı: |AB × AC| / 2
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    area += Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
  }

  return {
    volumeMm3: Math.abs(volume),
    areaMm2: area,
    triangleCount: triCount,
  };
}

// ==========================================
// BASKI TAHMİNİ
// ==========================================

export interface PrintEstimateInput {
  volumeMm3: number;
  areaMm2: number;
  heightMm: number; // baskı yönündeki yükseklik (katman sayısı için)
  infillPercent: number;
  layerHeight: number;
  materialId: string;
}

export interface PrintEstimate {
  filamentVolumeMm3: number;
  weightGrams: number;
  printTimeMinutes: number;
}

export function estimatePrint(input: PrintEstimateInput): PrintEstimate {
  const material = MATERIALS.find((m) => m.id === input.materialId) ?? MATERIALS[0];
  const layer = LAYER_HEIGHTS.find((l) => l.value === input.layerHeight) ?? LAYER_HEIGHTS[2];

  // Kabuk (duvar + üst/alt yüzeyler) hacmi — model hacmini aşamaz
  const shellVolume = Math.min(input.volumeMm3, input.areaMm2 * WALL_THICKNESS_MM);
  const interiorVolume = Math.max(0, input.volumeMm3 - shellVolume);
  const filamentVolume =
    (shellVolume + interiorVolume * (input.infillPercent / 100)) * WASTE_FACTOR;

  const weightGrams = (filamentVolume / 1000) * material.density;

  // Süre: ekstrüzyon süresi + katman başı hareket kaybı + hazırlık
  const extrusionSec = filamentVolume / layer.flowRate;
  const layerCount = Math.max(1, Math.ceil(input.heightMm / layer.value));
  const overheadSec = layerCount * LAYER_OVERHEAD_SEC;
  const printTimeMinutes = (extrusionSec + overheadSec) / 60 + SETUP_TIME_MIN;

  return { filamentVolumeMm3: filamentVolume, weightGrams, printTimeMinutes };
}

// ==========================================
// FİYAT HESABI
// ==========================================

export interface PriceBreakdown {
  unitPriceNet: number; // KDV hariç birim (indirim uygulanmış)
  unitVat: number;
  unitPriceGross: number; // KDV dahil birim
  discountRate: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculatePrintPrice(
  estimate: PrintEstimate,
  materialId: string,
  quantity: number
): PriceBreakdown {
  const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];

  const materialCost = estimate.weightGrams * material.pricePerGram;
  const machineCost = (estimate.printTimeMinutes / 60) * MACHINE_RATE_PER_HOUR;
  const baseUnit = Math.max(MIN_UNIT_PRICE, materialCost + machineCost + PREP_FEE);

  const discountRate = getDiscountRate(quantity);
  const unitPriceNet = round2(baseUnit * (1 - discountRate));
  const unitVat = round2(unitPriceNet * VAT_RATE);
  const unitPriceGross = round2(unitPriceNet + unitVat);

  return {
    unitPriceNet,
    unitVat,
    unitPriceGross,
    discountRate,
    totalNet: round2(unitPriceNet * quantity),
    totalVat: round2(unitVat * quantity),
    totalGross: round2(unitPriceGross * quantity),
  };
}

// --- Yardımcılar ---

export function formatPrintTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} dk`;
  return `${h} sa ${m} dk`;
}

export function formatTRY(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(amount);
}
