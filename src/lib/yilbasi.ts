// ==========================================
// YILBAŞI DÖNEMİ
//
// Sezon teması (şerit, ana sayfa vitrini, piksel kar, logodaki
// şapka) yalnızca bu tarihler arasında görünür; dönem bitince
// kendiliğinden kapanır, kod silinmeden gelecek yıl tarihleri
// güncellemek yeter.
//
// Son sipariş günü, teslimat politikasındaki en uzun süreden
// geriye sayıldı: büyük ürünlerde 7 iş günü üretim + 3 iş günü
// kargo = 10 iş günü. 31 Aralık'a yetişmesi için en geç
// 17 Aralık Perşembe günü sipariş verilmeli. Küçük ürünler
// daha geç verilse de yetişir; şeritte en güvenli tarih yazıyor.
// ==========================================

export const YILBASI = {
  /** Temanın görünmeye başladığı an (TSİ) */
  baslangic: new Date("2026-11-15T00:00:00+03:00"),
  /** Temanın kalktığı an — 6 Ocak'tan sonra */
  bitis: new Date("2027-01-07T00:00:00+03:00"),
  /** Yılbaşından önce teslim için son sipariş anı */
  sonSiparis: new Date("2026-12-17T23:59:59+03:00"),
  sonSiparisYazi: "17 Aralık Perşembe",
  /** Mağazadaki yılbaşı koleksiyonunun etiketi */
  koleksiyon: "koleksiyon-yilbasi",
} as const;

export const YILBASI_KOLEKSIYON_ADRESI = `/products?koleksiyon=${YILBASI.koleksiyon}`;

export function yilbasiAktif(an: Date = new Date()): boolean {
  return an >= YILBASI.baslangic && an < YILBASI.bitis;
}
