// ==========================================
// ÜRETİM MALİYETİ VE FİYAT
//
// ADJY iki yoldan üretiyor ve ikisinin maliyet yapısı
// birbirine benzemiyor:
//
//   FDM — her kopya baştan basılır. Maliyetin çoğu filament
//   ve makine saati. Sabit gider yok, ilk kopya ile yüzüncü
//   kopya neredeyse aynı maliyette.
//
//   DÖKÜM — önce kalıp çıkarılır (RTV2 silikon + master baskı),
//   sonra her kopya alçıyla dökülür. Dökülen malzeme çok ucuz
//   ama kalıp pahalı ve sınırlı ömürlü. Maliyet kalıbın kaç
//   kopyaya bölündüğüne bağlı.
//
//   Bu yüzden döküm ürünlerde tek bir adet, FDM'deki aynı
//   boydaki bir üründen pahalıya gelir; adet arttıkça ucuzlar.
//
// Ham madde fiyatları işletmeden alındı. Tek yerde durur ki
// zam geldiğinde bütün fiyatlar birlikte güncellensin.
// ==========================================

/** Ham madde — ₺/gram */
export const RAW = {
  /** Filament: 850 ₺/kg */
  filament: 0.85,
  /** RTV2 kalıp silikonu: 650 ₺/kg */
  silicone: 0.65,
  /** Seramik alçısı: 20 ₺/kg */
  plaster: 0.02,
} as const;

/** İşletme giderleri */
export const OVERHEAD = {
  /**
   * Yazıcı amortismanı + elektrik, ₺/saat.
   *
   * Sitenin eski değeri 60 ₺/saatti; işletmenin kendi maliyet
   * hesabı ise ~9,4 ₺/saat kullanıyor. Eski değer, filamentin
   * 4 ₺/g yazıldığı (gerçeği 0,85) döneme ait bir dengelemeydi.
   * Ham madde gerçeğe çekilince bu da gerçeğe çekildi.
   */
  machinePerHour: 12,
  /** Baskı başına hazırlık (dilimleme, tabla, ayıklama) ₺ */
  fdmSetup: 55,
  /** Döküm başına işçilik (karıştırma, döküm, çıkarma, rötuş) ₺ */
  castLabourPerUnit: 45,
  /** Kalıp kutusunun basımı + silikon dökümü işçiliği, silikon maliyetinin katı */
  mouldOverhead: 1.5,
  /** Bir silikon kalıptan alınabilen ortalama kopya */
  mouldLife: 60,
  /** Başarısız baskı/döküm payı */
  failureRate: 0.08,
  /** Fire: purge, brim, dökümde taşan alçı */
  wasteRate: 0.05,
} as const;

/**
 * Brüt kâr marjı.
 *
 * Bu oran bilerek bugünkü fiyat seviyesini koruyacak şekilde
 * seçildi: ham madde ve makine maliyeti gerçeğe çekilirken
 * müşterinin gördüğü fiyat yerinde kalsın istendi. Yani
 * değişen şey fiyat değil, fiyatın neyden oluştuğu.
 *
 * Kârı artırmak ya da azaltmak için değiştirilecek tek sayı
 * budur; maliyet kalemlerine dokunmak gerekmez.
 */
export const MARGIN = 0.68;

export const VAT_RATE = 0.2;

/**
 * Baskı tablası ve ölçü kademesi.
 *
 * İki farklı makine var: 25×25'e kadar olan hızlı makine,
 * ondan büyüğü için büyük formatlı makine. Büyük makine hem
 * daha yavaş basıyor hem de saat maliyeti daha yüksek — bu
 * yüzden 25 cm'i geçen ölçülerde maliyet sıçrıyor. Tek bir
 * saat ücreti kullanmak büyük ürünlerde zarar ettiriyordu.
 */
export const BUILD = {
  /** Hızlı makinenin tabla sınırı (mm) */
  standardMm: 250,
  /** Üretilebilen en büyük kenar (mm) */
  maxMm: 450,
  /** Büyük formatlı makinenin saat maliyeti çarpanı */
  largeMachineMultiplier: 2.2,
  /** Büyük baskıda ek hazırlık/denetim (₺) */
  largeSetupExtra: 40,
} as const;

/** Ölçüye göre makine saat ücreti */
export function machineRateFor(largestMm: number): number {
  return largestMm > BUILD.standardMm
    ? OVERHEAD.machinePerHour * BUILD.largeMachineMultiplier
    : OVERHEAD.machinePerHour;
}

/** Ölçüye göre hazırlık ücreti */
export function setupFeeFor(largestMm: number): number {
  return largestMm > BUILD.standardMm
    ? OVERHEAD.fdmSetup + BUILD.largeSetupExtra
    : OVERHEAD.fdmSetup;
}

/** Ölçü üretilebilir mi */
export function fitsBuildVolume(largestMm: number): boolean {
  return largestMm <= BUILD.maxMm;
}

export type ProductionRoute = "fdm" | "cast";

export interface FdmInput {
  route: "fdm";
  /** Basılan parçanın ağırlığı (g) */
  weightGrams: number;
  /** Baskı süresi (dakika) */
  printMinutes: number;
  /** En uzun kenar (mm) — hangi makineye düştüğünü belirler */
  largestMm?: number;
}

export interface CastInput {
  route: "cast";
  /** Dökülen alçının ağırlığı (g) */
  weightGrams: number;
  /** Kalıp için kullanılan silikon (g) */
  siliconeGrams: number;
  /** Master modelin baskı ağırlığı (g) */
  masterGrams: number;
  /** Master modelin baskı süresi (dakika) */
  masterPrintMinutes: number;
}

export type ProductionInput = FdmInput | CastInput;

export interface CostBreakdown {
  route: ProductionRoute;
  /** Ham madde (filament ya da alçı) */
  materialCost: number;
  /** Makine saati + elektrik */
  machineCost: number;
  /** İşçilik */
  labourCost: number;
  /** Kalıbın bu kopyaya düşen payı — yalnızca dökümde */
  mouldCost: number;
  /** Başarısızlık payı */
  failureCost: number;
  /** Toplam birim maliyet */
  unitCost: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Bir kopyanın bize maliyeti.
 *
 * Döküm rotasında kalıp maliyeti ömrüne bölünerek birime
 * yansıtılır; kalıp bir kez çıkarılıp onlarca kopyada
 * kullanıldığı için tek kopyaya yüklenmesi gerçeği yansıtmaz.
 */
export function productionCost(input: ProductionInput): CostBreakdown {
  let materialCost = 0;
  let machineCost = 0;
  let labourCost = 0;
  let mouldCost = 0;

  if (input.route === "fdm") {
    const enUzun = input.largestMm ?? 0;
    materialCost = input.weightGrams * (1 + OVERHEAD.wasteRate) * RAW.filament;
    machineCost = (input.printMinutes / 60) * machineRateFor(enUzun);
    labourCost = setupFeeFor(enUzun);
  } else {
    materialCost = input.weightGrams * (1 + OVERHEAD.wasteRate) * RAW.plaster;
    labourCost = OVERHEAD.castLabourPerUnit;

    const siliconeCost = input.siliconeGrams * RAW.silicone * OVERHEAD.mouldOverhead;
    const masterCost =
      input.masterGrams * RAW.filament +
      (input.masterPrintMinutes / 60) * OVERHEAD.machinePerHour;
    mouldCost = (siliconeCost + masterCost) / OVERHEAD.mouldLife;
  }

  const araToplam = materialCost + machineCost + labourCost + mouldCost;
  const failureCost = araToplam * OVERHEAD.failureRate;

  return {
    route: input.route,
    materialCost: round2(materialCost),
    machineCost: round2(machineCost),
    labourCost: round2(labourCost),
    mouldCost: round2(mouldCost),
    failureCost: round2(failureCost),
    unitCost: round2(araToplam + failureCost),
  };
}

export interface SellingPrice {
  unitCost: number;
  unitPriceNet: number;
  unitVat: number;
  unitPriceGross: number;
}

/** Maliyetten satış fiyatına — marj + KDV */
export function sellingPrice(unitCost: number, margin = MARGIN): SellingPrice {
  const net = unitCost / (1 - margin);
  const vat = net * VAT_RATE;
  return {
    unitCost: round2(unitCost),
    unitPriceNet: round2(net),
    unitVat: round2(vat),
    unitPriceGross: round2(net + vat),
  };
}

/**
 * Ürünün hangi rotadan üretildiği.
 *
 * Malzeme adından türetilir; alçı ve seramik döküm, geri
 * kalanı baskıdır. Mağaza filtresindeki aile ayrımıyla
 * aynı mantık — iki yerde farklı kural olmasın diye.
 */
export function routeForMaterial(materialType: string | null | undefined): ProductionRoute {
  const m = (materialType ?? "").toLocaleLowerCase("tr-TR");
  if (m.includes("alçı") || m.includes("alci") || m.includes("seramik")) return "cast";
  return "fdm";
}

/**
 * Ölçü değiştiğinde maliyet nasıl değişir.
 *
 * Hacim boyutun küpüyle büyür: kenarı iki katına çıkan bir
 * nesne sekiz kat malzeme ister. Fiyatın ölçüyle doğrusal
 * artması bu yüzden yanlıştı — büyük ölçülerde zarar,
 * küçüklerde fazla pahalı oluyordu.
 */
export function scaleFactor(currentMm: number, defaultMm: number): number {
  if (!defaultMm || defaultMm <= 0) return 1;
  const oran = currentMm / defaultMm;
  return oran * oran * oran;
}
