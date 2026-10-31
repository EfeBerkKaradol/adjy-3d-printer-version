// ==========================================
// DONANIM VE İŞÇİLİK BİRİM FİYATLARI
//
// Mobilyanın fiyatı levhadan ibaret değil: menteşe, ray, kulp,
// raf pimi ve montaj seti kalem kalem para. Bir kapak eklemek
// sadece bir panel eklemek değil — iki menteşe, bir kulp ve
// ayarlama işçiliği demek. Fiyat motoru bunu gözden kaçırırsa
// kapaklı dolabı zararına satarız.
//
// İşçilik kalemleri atölye anlaşmasının birim fiyatları.
// Atölye zam yaptığında yalnızca burası değişir.
// ==========================================

/** Donanım birim fiyatları — TL */
export const DONANIM_FIYAT = {
  /** Yavaş kapanan menteşe, kapak başına iki adet */
  mentese: 95,
  /** Teleskopik frenli çekmece rayı, takım (çekmece başına bir takım).
   *  Piyasada basit ray 110-170, frenli premium 440 TL; orta sınıf alıyoruz. */
  cekmeceRayi: 260,
  /** Kulp — kapak ve çekmece başına bir adet */
  kulp: 85,
  /** Raf pimi, raf başına dört adet */
  rafPimi: 6,
  /** Dübel + eksantrik montaj seti, panel başına */
  montajSeti: 22,
  /** Devrilme emniyeti duvar aparatı, takım */
  duvarAparati: 160,
} as const;

export interface TabanSecenegi {
  id: string;
  ad: string;
  aciklama: string;
  /** Gövdeyi yerden kaldırdığı yükseklik (mm) */
  yukseklik: number;
  /** Sabit donanım ücreti (TL) — 0 ise metrekareye/adede göre hesaplanır */
  adetFiyat: number;
  /** Kaç adet kullanılır; 0 ise genişliğe göre panel üretilir (baza) */
  adet: number;
  /** Baza gövdeyi saran bir panel gerektirir */
  panelli: boolean;
}

export const TABANLAR: TabanSecenegi[] = [
  {
    id: "plastik",
    ad: "Plastik ayak",
    aciklama: "4 mm yükseltir, zemini çizmez. Standart.",
    yukseklik: 4,
    adetFiyat: 35,
    adet: 4,
    panelli: false,
  },
  {
    id: "baza",
    ad: "Baza",
    aciklama: "Gövdeyle aynı malzemeden, 80 mm içeri çekilmiş kaide.",
    yukseklik: 80,
    adetFiyat: 0,
    adet: 0,
    panelli: true,
  },
  {
    id: "ayak",
    ad: "Ahşap ayak",
    aciklama: "Konik masif ayak, 120 mm. Gövdeyi hafifletir.",
    yukseklik: 120,
    adetFiyat: 240,
    adet: 4,
    panelli: false,
  },
  {
    id: "tekerlek",
    ad: "Tekerlek",
    aciklama: "Frenli tekerlek, 75 mm. Taşınabilir olmasını isteyenler için.",
    yukseklik: 75,
    adetFiyat: 180,
    adet: 4,
    panelli: false,
  },
];

export function tabanBul(id: string): TabanSecenegi {
  return TABANLAR.find((t) => t.id === id) ?? TABANLAR[0];
}

export interface KulpSecenegi {
  id: string;
  ad: string;
  aciklama: string;
  fiyat: number;
}

export const KULPLAR: KulpSecenegi[] = [
  {
    id: "gizli",
    ad: "Gizli kulp",
    aciklama: "Kulp yok; kapak kenarından açılır.",
    fiyat: 0,
  },
  {
    id: "cubuk-siyah",
    ad: "Çubuk — siyah",
    aciklama: "128 mm mat siyah metal.",
    fiyat: 85,
  },
  {
    id: "cubuk-pirinc",
    ad: "Çubuk — pirinç",
    aciklama: "128 mm fırçalanmış pirinç.",
    fiyat: 135,
  },
  {
    id: "deri",
    ad: "Deri askı",
    aciklama: "Gerçek deri, vidalı. Ahşapla iyi gider.",
    fiyat: 190,
  },
];

export function kulpBul(id: string): KulpSecenegi {
  return KULPLAR.find((k) => k.id === id) ?? KULPLAR[0];
}

// ==========================================
// İŞÇİLİK
// ==========================================

export const ISCILIK = {
  /** Panel başına kesim hazırlığı ve ölçü alma */
  panelBasi: 45,
  /** Kesim — metre başına */
  kesimMetre: 14,
  /** Kenar bantlama işçiliği — metre başına */
  bantMetre: 26,
  /** Delik delme, montaj, kalite kontrol — kapladığı hacmin m³'ü başına */
  montajM3: 1400,
  /** Sipariş başına tezgâh kurulumu ve kesim planı */
  kurulum: 450,
  /** Kapak ayarı — kapak başına (menteşe ayarı zaman alır) */
  kapakAyari: 120,
  /** Çekmece montajı — çekmece başına */
  cekmeceMontaji: 180,
} as const;

/**
 * Liste fiyatı çarpanı.
 *
 * Doğrudan maliyetin üstüne gelen her şey burada: nakliye,
 * ambalaj, fire, garanti karşılığı ve kâr. Woodcoder'ın
 * 192 × 180 × 35 cm, 3 sütun 3 sıra meşe kitaplığı KDV ve
 * kargo dâhil 16.950 TL. Aynı yapılandırma bizde 1,85 çarpanla
 * yaklaşık 18.500 TL ediyor — özel üretim olduğumuz için
 * bilerek bir miktar üstünde duruyoruz.
 */
export const LISTE_CARPANI = 1.85;

/**
 * Sabit tezgâh hazırlığına uygulanan çarpan.
 *
 * Kurulum ürünün kendisi değil, siparişin gideri. Liste
 * çarpanıyla büyütülseydi küçük ürünler orantısız pahalı
 * olurdu; burada yalnızca masrafı karşılayacak kadar artar.
 */
export const HAZIRLIK_CARPANI = 1.2;

export const KDV_ORANI = 0.2;
