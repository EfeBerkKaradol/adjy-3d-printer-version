// ==========================================
// MOBİLYA FİYAT MOTORU
//
// Baskı tarafında fiyat bir formülden çıkıyor: taban fiyat
// çarpı ölçü oranı. Mobilyada bu işe yaramaz, çünkü sütun
// eklemek "biraz daha büyük" demek değil — yeni bir dikey
// panel, yeni raflar, yeni montaj seti demek. Oranla
// çarpsaydık sütun eklemek bedava olurdu.
//
// Bu yüzden fiyat kesim listesinden hesaplanır. Önce paneller
// üretilir, sonra her panelin alanı metrekare fiyatıyla,
// bantlanan kenarı metre fiyatıyla çarpılır; üstüne donanım
// ve işçilik eklenir. Yani fiyat, ürünün gerçekten neyden
// yapıldığının toplamı.
//
// Döküm sonucu müşteriye de gösterilir. Bir kapak eklediğinde
// fiyatın neden 900 TL arttığını görebilmeli: iki menteşe,
// bir kulp, bir panel ve ayar işçiliği.
// ==========================================

import {
  DONANIM_FIYAT,
  ISCILIK,
  KDV_ORANI,
  LISTE_CARPANI,
  HAZIRLIK_CARPANI,
  kulpBul,
  tabanBul,
} from "./hardware";
import { m2Fiyat, malzemeBul } from "./materials";
import { icerikSayilari, panelleriUret } from "./panels";
import type { DonanimKalemi, MobilyaYapilandirma, Panel } from "./types";

export interface FiyatSatiri {
  ad: string;
  tutar: number;
  /** Nasıl hesaplandığını anlatan kısa not */
  not?: string;
}

export interface FiyatDokumu {
  malzeme: number;
  bantlama: number;
  donanim: number;
  iscilik: number;
  dogrudanMaliyet: number;
  listeFiyat: number;
  kdv: number;
  toplam: number;
  /** Müşteriye gösterilen özet satırlar */
  satirlar: FiyatSatiri[];
  donanimKalemleri: DonanimKalemi[];
  /** Kullanılan levha alanı (m²) — "şu kadar levha" demek için */
  levhaAlani: number;
  panelSayisi: number;
}

/** Panelin levha üstünde kapladığı alan (m²) */
function panelAlani(p: Panel): number {
  const [a, b] = [p.w, p.h, p.d].sort((x, y) => y - x);
  return (a * b) / 1_000_000;
}

export interface FiyatSecenekleri {
  /** Ürün tipine özel işçilik çarpanı — çekmeceli ürün daha emek ister */
  iscilikCarpani?: number;
}

export function mobilyaFiyati(
  cfg: MobilyaYapilandirma,
  secenekler: FiyatSecenekleri = {}
): FiyatDokumu {
  const paneller = panelleriUret(cfg);
  const govde = malzemeBul(cfg.govdeMalzeme);
  const on = malzemeBul(cfg.onMalzeme);
  const taban = tabanBul(cfg.taban);
  const kulp = kulpBul(cfg.kulp);
  const sayilar = icerikSayilari(cfg);

  // --- Malzeme ve bantlama ---
  let malzeme = 0;
  let bantlama = 0;
  let levhaAlani = 0;
  let kesimMetre = 0;
  let bantMetre = 0;

  for (const p of paneller) {
    const m = p.malzemeRolu === "on" ? on : govde;
    const alan = panelAlani(p);
    const birim = m2Fiyat(m, p.kalinlik);
    malzeme += alan * birim;
    levhaAlani += alan;
    kesimMetre += p.kesimCevre / 1000;
    const bant = p.bantliKenar / 1000;
    bantMetre += bant;
    bantlama += bant * m.bantMetreFiyat;
  }

  // --- Donanım ---
  const donanimKalemleri: DonanimKalemi[] = [];
  const kalem = (ad: string, adet: number, birimFiyat: number) => {
    if (adet > 0 && birimFiyat > 0)
      donanimKalemleri.push({ ad, adet, birimFiyat });
  };

  kalem("Yavaş kapanan menteşe", sayilar.kapak * 2, DONANIM_FIYAT.mentese);
  kalem("Teleskopik çekmece rayı", sayilar.cekmece, DONANIM_FIYAT.cekmeceRayi);
  kalem("Kulp — " + kulp.ad, sayilar.kapak + sayilar.cekmece, kulp.fiyat);
  kalem("Raf pimi", sayilar.raf * 4, DONANIM_FIYAT.rafPimi);
  kalem("Montaj seti", paneller.length, DONANIM_FIYAT.montajSeti);
  // Devrilme emniyeti yalnızca ayakta duran, devrilebilecek
  // yükseklikteki ürünlerde gerekir.
  kalem("Devrilme emniyeti", cfg.yukseklik > 900 ? 1 : 0, DONANIM_FIYAT.duvarAparati);
  kalem(taban.ad, taban.adet, taban.adetFiyat);

  const donanim = donanimKalemleri.reduce(
    (t, k) => t + k.adet * k.birimFiyat,
    0
  );

  // --- İşçilik ---
  const hacimM3 =
    (cfg.genislik * cfg.yukseklik * cfg.derinlik) / 1_000_000_000;
  // Küçük parça tezgâhta daha az zaman alır — çekmece kutusunun
  // yanıyla gövdenin yan panelini aynı işçilikle saymak,
  // çekmeceyi olduğundan pahalı gösteriyordu.
  const panelIsciligi = paneller.reduce(
    (t, p) => t + (panelAlani(p) < 0.15 ? ISCILIK.panelBasi * 0.5 : ISCILIK.panelBasi),
    0
  );

  const iscilikHam =
    panelIsciligi +
    kesimMetre * ISCILIK.kesimMetre +
    bantMetre * ISCILIK.bantMetre +
    hacimM3 * ISCILIK.montajM3 +
    ISCILIK.kurulum +
    sayilar.kapak * ISCILIK.kapakAyari +
    sayilar.cekmece * ISCILIK.cekmeceMontaji;
  const iscilik = iscilikHam * (secenekler.iscilikCarpani ?? 1);

  const dogrudanMaliyet = malzeme + bantlama + donanim + iscilik;

  // Tezgâh kurulumu sipariş başına sabit bir gider; üstüne
  // ürün kârı binmez. Binseydi küçük bir duvar rafının üçte
  // biri kurulum payı olurdu ve kimse almazdı.
  const sabitHazirlik = ISCILIK.kurulum * (secenekler.iscilikCarpani ?? 1);
  const listeFiyat =
    (dogrudanMaliyet - sabitHazirlik) * LISTE_CARPANI +
    sabitHazirlik * HAZIRLIK_CARPANI;
  const kdv = listeFiyat * KDV_ORANI;
  const toplam = listeFiyat + kdv;

  const satirlar: FiyatSatiri[] = [
    {
      ad: "Levha",
      tutar: malzeme,
      not: `${levhaAlani.toFixed(2)} m² · ${govde.ad}`,
    },
    {
      ad: "Kenar bandı",
      tutar: bantlama,
      not: `${bantMetre.toFixed(1)} metre`,
    },
    {
      ad: "Donanım",
      tutar: donanim,
      not: donanimKalemleri.length
        ? donanimKalemleri.map((k) => `${k.adet}× ${k.ad}`).join(", ")
        : undefined,
    },
    {
      ad: "İşçilik",
      tutar: iscilik,
      not: `${paneller.length} parça kesim, bantlama ve montaj`,
    },
  ];

  return {
    malzeme,
    bantlama,
    donanim,
    iscilik,
    dogrudanMaliyet,
    listeFiyat,
    kdv,
    toplam,
    satirlar,
    donanimKalemleri,
    levhaAlani,
    panelSayisi: paneller.length,
  };
}

/** Fiyatı 10 TL'ye yuvarlar — kuruşlu mobilya fiyatı olmaz */
export function fiyatiYuvarla(tutar: number): number {
  return Math.round(tutar / 10) * 10;
}
