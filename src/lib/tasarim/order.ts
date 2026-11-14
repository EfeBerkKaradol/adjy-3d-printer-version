// ==========================================
// SİPARİŞ TARAFINDA TASARIM ARAÇLARI
//
// Tasarım aracıyla kurulan ürün, sipariş kalemine üç şey
// taşır:
//
//   secimler → müşterinin seçtiği her şey, okunur metin olarak.
//              Atölye aracı açmadan da ne istendiğini görür.
//   durum    → aracın bütün alanları. Yönetim panelinde araç
//              bu kayıtla açılır ve müşterinin kurduğu model
//              birebir yeniden oluşur; STL oradan indirilir.
//   olcum    → filament ve süre. Fiyat sunucuda bundan
//              yeniden hesaplanır.
//
// Mobilyadaki gibi: tarayıcıdan gelen tutara güvenilmez.
// ==========================================

import { TASARIM_ARACLARI, type TasarimAraci, aracBul } from "./catalog";
import { tasarimFiyati, olcumuDogrula, type TasarimOlcumu } from "./pricing";

/** Ürün bu SKU ön ekini taşıyorsa tasarım aracı ürünüdür */
export const TASARIM_SKU_ONEK = "TSR-";

export function tasarimSku(aracId: string): string {
  return `${TASARIM_SKU_ONEK}${aracId.toUpperCase()}`;
}

export function tasarimUrunuMu(sku: string | null | undefined): boolean {
  return !!sku && sku.startsWith(TASARIM_SKU_ONEK);
}

/** SKU'dan aracı bulur — sipariş kaleminde yalnızca ürün varsa */
export function skudanArac(sku: string | null | undefined): TasarimAraci | null {
  if (!tasarimUrunuMu(sku)) return null;
  return TASARIM_ARACLARI.find((a) => tasarimSku(a.id) === sku) ?? null;
}

export interface TasarimSecimi {
  ad: string;
  deger: string;
}

export interface TasarimDosyasi {
  ad: string;
  boyut?: number;
  url: string | null;
}

/** Sipariş kaleminin customParams alanında duran kayıt */
export interface TasarimParametreleri {
  tasarimAraci: string;
  /** Sepette ve sipariş listesinde tek satır */
  ozet: string;
  secimler: TasarimSecimi[];
  olcum: TasarimOlcumu;
  /** Aracın geri yüklenebilir durumu — yapısını köprü belirler */
  durum: Record<string, unknown>;
}

export function tasarimParametreleriMi(
  p: Record<string, unknown> | null | undefined
): p is Record<string, unknown> & TasarimParametreleri {
  return !!p && typeof p.tasarimAraci === "string" && !!aracBul(p.tasarimAraci);
}

const EN_FAZLA_SECIM = 120;
const EN_UZUN_METIN = 240;

function kes(v: unknown, uzunluk = EN_UZUN_METIN): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, uzunluk);
}

/** Seçim listesini güvenli hâle getirir: yalnızca kısa düz metin */
export function secimleriTemizle(ham: unknown): TasarimSecimi[] {
  if (!Array.isArray(ham)) return [];
  const sonuc: TasarimSecimi[] = [];
  for (const s of ham.slice(0, EN_FAZLA_SECIM)) {
    if (!s || typeof s !== "object") continue;
    const ad = kes((s as Record<string, unknown>).ad, 80);
    const deger = kes((s as Record<string, unknown>).deger);
    if (ad && deger) sonuc.push({ ad, deger });
  }
  return sonuc;
}

/** Durum kaydındaki yüklenen dosyalar (fotoğraf, model) */
export function tasarimDosyalari(durum: unknown): TasarimDosyasi[] {
  if (!durum || typeof durum !== "object") return [];
  const d = (durum as Record<string, unknown>).dosyalar;
  if (!d || typeof d !== "object") return [];
  const sonuc: TasarimDosyasi[] = [];
  // Her giriş birden çok dosya taşıyabilir (oda maketine yüklenen modeller)
  const kayitlar = Object.values(d as Record<string, unknown>).flatMap((v) =>
    Array.isArray(v) ? v : [v]
  );
  for (const kayit of kayitlar.slice(0, 24)) {
    if (!kayit || typeof kayit !== "object") continue;
    const k = kayit as Record<string, unknown>;
    const url = typeof k.url === "string" && /^https:\/\//.test(k.url) ? k.url : null;
    sonuc.push({
      ad: kes(k.ad, 120) || "dosya",
      boyut: Number.isFinite(Number(k.boyut)) ? Number(k.boyut) : undefined,
      url,
    });
  }
  return sonuc;
}

/**
 * Sepetten gelen ham kaydı doğrular ve fiyatlar.
 *
 * Tanınmayan araç reddedilir. Ölçüm aracın üretim aralığına
 * oturtulur; fiyat buradan çıkar.
 */
export function tasarimiCoz(
  arac: TasarimAraci,
  ham: Record<string, unknown> | null | undefined
): { fiyat: number; olcum: TasarimOlcumu } {
  const hamOlcum =
    ham && typeof ham.olcum === "object" && ham.olcum !== null
      ? (ham.olcum as Partial<TasarimOlcumu>)
      : null;
  const olcum = olcumuDogrula(arac, hamOlcum);
  return { fiyat: tasarimFiyati(arac, olcum), olcum };
}

const EN_BUYUK_DURUM = 300_000;

/**
 * Aracın durum kaydı serbest biçimli bir nesne; içeriğine
 * sunucu karışmaz ama boyutuna karışır. Sınırı aşan kayıt
 * yazılmaz — sipariş yine oluşur, atölye seçim metninden
 * çalışır.
 */
export function durumuSinirla(durum: unknown): Record<string, unknown> | null {
  if (!durum || typeof durum !== "object" || Array.isArray(durum)) return null;
  try {
    if (JSON.stringify(durum).length > EN_BUYUK_DURUM) return null;
  } catch {
    return null;
  }
  return durum as Record<string, unknown>;
}

/** Sepette ve listelerde gösterilen kısa metin: ilk birkaç seçim */
export function kisaOzet(secimler: TasarimSecimi[], adet = 3): string {
  return secimler
    .slice(0, adet)
    .map((s) => `${s.ad}: ${s.deger}`)
    .join(" · ");
}

/** Atölyenin panoya kopyalayacağı düz metin */
export function secimlerMetni(secimler: TasarimSecimi[]): string {
  return secimler.map((s) => `${s.ad}: ${s.deger}`).join("\n");
}
