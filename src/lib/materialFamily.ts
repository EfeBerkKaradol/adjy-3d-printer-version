// ==========================================
// MALZEME AİLELERİ
//
// ADJY üç şekilde üretiyor: 3D baskı, seramik ve alçı.
// Ürün kaydındaki materialType ise tekil malzemeyi tutuyor
// (PLA, PETG, Seramik...). Bu iki şey aynı düzeyde değil:
// alıcı "seramik mi, baskı mı" diye bakar, PLA ile PETG
// arasındaki farkı ürün künyesinde arar.
//
// Bu yüzden mağaza filtresi aileyi gösterir, ürün sayfası
// tekil malzemeyi. Veritabanında hiçbir şey değişmedi;
// gruplama burada, okunurken yapılıyor.
// ==========================================

export interface MaterialFamily {
  id: string;
  label: string;
  description: string;
}

export const MATERIAL_FAMILIES: MaterialFamily[] = [
  { id: "3d-baski", label: "3D Baskı", description: "PLA, PETG, ABS ve diğer filamentler" },
  { id: "seramik", label: "Seramik", description: "Fırınlanmış seramik parçalar" },
  { id: "alci", label: "Alçı", description: "Kalıpla dökülmüş alçı parçalar" },
];

/** Türkçe karakterleri sadeleştirip karşılaştırmayı güvenli kılar */
function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .trim();
}

/** Bilinen filament adları — hepsi 3D baskı ailesine girer */
const FILAMENTS = [
  "pla", "petg", "abs", "tpu", "asa", "pet", "nylon", "naylon", "resin", "recin",
];

/**
 * Bir malzemenin ailesi. Tanınmayan bir değer için null döner;
 * çağıran taraf onu kendi adıyla gösterir, böylece listeden
 * hiçbir ürün kaybolmaz.
 */
export function familyFor(materialType: string | null | undefined): string | null {
  if (!materialType) return null;
  const m = normalize(materialType);

  if (m.includes("seramik") || m.includes("ceramic") || m.includes("porselen")) return "seramik";
  if (m.includes("alci") || m.includes("plaster") || m.includes("gypsum")) return "alci";
  if (FILAMENTS.some((f) => m.includes(f))) return "3d-baski";

  return null;
}

/** Bir ailenin etiketi */
export function familyLabel(id: string): string {
  return MATERIAL_FAMILIES.find((f) => f.id === id)?.label ?? id;
}

/**
 * Mağaza filtresinde gösterilecek seçenekler.
 *
 * Yalnızca ürünü olan aileler listelenir; hiçbir aileye
 * girmeyen malzemeler kendi adlarıyla sonda durur.
 */
export interface MaterialOption {
  value: string;
  label: string;
}

export function materialOptions(materialTypes: string[]): MaterialOption[] {
  const families = new Set<string>();
  const loose = new Set<string>();

  for (const m of materialTypes) {
    const f = familyFor(m);
    if (f) families.add(f);
    else loose.add(m);
  }

  return [
    ...MATERIAL_FAMILIES.filter((f) => families.has(f.id)).map((f) => ({
      value: f.id,
      label: f.label,
    })),
    ...[...loose].sort().map((m) => ({ value: m, label: m })),
  ];
}

/**
 * Filtre değerini veritabanı sorgusuna çevirir.
 *
 * Aile seçildiyse o aileye giren bütün malzemeler eşleşir;
 * tekil bir malzeme seçildiyse yalnızca o. Böylece eski
 * bağlantılar (?material=PLA) çalışmaya devam eder.
 */
export function materialFilterValues(
  selected: string,
  availableMaterialTypes: string[]
): string[] {
  const isFamily = MATERIAL_FAMILIES.some((f) => f.id === selected);
  if (!isFamily) return [selected];
  return availableMaterialTypes.filter((m) => familyFor(m) === selected);
}
