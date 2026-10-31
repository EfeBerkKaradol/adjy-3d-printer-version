// ==========================================
// KESİM LİSTESİ ÜRETECİ
//
// Burası mobilya bölümünün kalbi. Yapılandırma girer, panel
// listesi çıkar. O liste üç yere birden gider:
//
//   3D sahne   → her paneli bir kutu olarak çizer
//   fiyat      → alanları ve kenarları toplayıp maliyet çıkarır
//   atölye     → aynı liste kesim emri olarak basılır
//
// Üçü aynı kaynaktan doğduğu için birbirinden sapamaz.
// Ekranda gördüğünüz rafla atölyeye giden kesim listesi
// arasında bir fark oluşamaz; çünkü aynı listeler.
//
// Koordinat düzeni: başlangıç noktası birimin taban merkezi.
// x sağa, y yukarı, z öne artar. Ölçüler mm.
// ==========================================

import {
  ARKA_KALINLIK,
  GOVDE_KALINLIK as T,
  KUTU_KALINLIK,
  malzemeBul,
} from "./materials";
import { tabanBul } from "./hardware";
import type { GozAnahtari, GozIcerigi, MobilyaYapilandirma, Panel } from "./types";

/** Panelin levha üstündeki kesim çevresi — en büyük iki ölçü */
function cevre(w: number, h: number, d: number): number {
  const [a, b] = [w, h, d].sort((x, y) => y - x);
  return 2 * (a + b);
}

export function gozAnahtari(sutun: number, sira: number): GozAnahtari {
  return `${sutun}-${sira}`;
}

export function gozIcerigi(
  cfg: MobilyaYapilandirma,
  sutun: number,
  sira: number
): GozIcerigi {
  return cfg.gozler[gozAnahtari(sutun, sira)] ?? "bos";
}

/** Bir gözün gövde içindeki ölçüsü ve merkezi */
export interface GozOlcu {
  anahtar: GozAnahtari;
  sutun: number;
  sira: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

/**
 * Gözlerin yerleşimi. Hem tıklanabilir alanları çizmek hem de
 * kapak/çekmece panellerini yerleştirmek için kullanılır.
 */
export function gozlerinYerlesimi(cfg: MobilyaYapilandirma): GozOlcu[] {
  const taban = tabanBul(cfg.taban);
  const tabanY = taban.yukseklik;
  const Hg = cfg.yukseklik - tabanY;
  const Wi = cfg.genislik - 2 * T;
  const Hi = Hg - 2 * T;
  const cw = (Wi - (cfg.sutun - 1) * T) / cfg.sutun;
  const rh = (Hi - (cfg.sira - 1) * T) / cfg.sira;

  const liste: GozOlcu[] = [];
  for (let c = 0; c < cfg.sutun; c++) {
    for (let r = 0; r < cfg.sira; r++) {
      liste.push({
        anahtar: gozAnahtari(c, r),
        sutun: c,
        sira: r,
        x: -Wi / 2 + c * (cw + T) + cw / 2,
        y: tabanY + T + r * (rh + T) + rh / 2,
        z: 0,
        w: cw,
        h: rh,
        d: cfg.derinlik,
      });
    }
  }
  return liste;
}

/**
 * Gövde + gözlerin içeriği → panel listesi.
 *
 * Kitaplık, TV ünitesi, komodin, ayakkabılık… hepsi aynı
 * yapıda: dikdörtgen bir gövde, içinde dikey bölmeler ve
 * raflar. Farkları ölçü sınırları ve varsayılanları — yapım
 * biçimi değil. Bu yüzden tek üreteç hepsine yetiyor; her
 * ürüne ayrı bir üreteç yazmak aynı kodu kopyalamak olurdu.
 */
export function panelleriUret(cfg: MobilyaYapilandirma): Panel[] {
  const paneller: Panel[] = [];
  const taban = tabanBul(cfg.taban);
  const tabanY = taban.yukseklik;
  const Hg = cfg.yukseklik - tabanY;
  const Wi = cfg.genislik - 2 * T;
  const Hi = Hg - 2 * T;
  const cw = (Wi - (cfg.sutun - 1) * T) / cfg.sutun;
  const rh = (Hi - (cfg.sira - 1) * T) / cfg.sira;
  const D = cfg.derinlik;

  const ekle = (p: Omit<Panel, "kesimCevre">) =>
    paneller.push({ ...p, kesimCevre: cevre(p.w, p.h, p.d) });

  // --- Yan paneller: ön kenarları bantlanır ---
  for (const [i, yon] of [-1, 1].entries()) {
    ekle({
      id: `yan-${i}`,
      rol: "yan",
      x: (yon * (cfg.genislik - T)) / 2,
      y: tabanY + Hg / 2,
      z: 0,
      w: T,
      h: Hg,
      d: D,
      kalinlik: T,
      malzemeRolu: "govde",
      bantliKenar: Hg,
      gorunur: true,
    });
  }

  // --- Alt ve üst ---
  ekle({
    id: "alt",
    rol: "alt",
    x: 0,
    y: tabanY + T / 2,
    z: 0,
    w: Wi,
    h: T,
    d: D,
    kalinlik: T,
    malzemeRolu: "govde",
    bantliKenar: Wi,
    gorunur: true,
  });
  ekle({
    id: "ust",
    rol: "ust",
    x: 0,
    y: tabanY + Hg - T / 2,
    z: 0,
    w: Wi,
    h: T,
    d: D,
    kalinlik: T,
    malzemeRolu: "govde",
    bantliKenar: Wi,
    gorunur: true,
  });

  // --- Dikey bölmeler: sütun sayısı kadar eksi bir ---
  for (let i = 0; i < cfg.sutun - 1; i++) {
    ekle({
      id: `dikey-${i}`,
      rol: "dikey",
      x: -Wi / 2 + (i + 1) * cw + i * T + T / 2,
      y: tabanY + T + Hi / 2,
      z: 0,
      w: T,
      h: Hi,
      d: D,
      kalinlik: T,
      malzemeRolu: "govde",
      bantliKenar: Hi,
      gorunur: true,
    });
  }

  // --- Raflar: her sütunda sıra sayısı eksi bir ---
  //
  // Üst üste iki çekmecenin arasına raf konmaz. Çekmece
  // kutusu yan panele vidalanan raya oturur, ayırıcıya ihtiyaç
  // duymaz — şifonyerler böyle yapılır. Gereksiz rafı listeye
  // yazsaydık müşteriden kullanılmayan bir levhanın parasını
  // almış olurduk.
  for (let c = 0; c < cfg.sutun; c++) {
    const cx = -Wi / 2 + c * (cw + T) + cw / 2;
    for (let r = 0; r < cfg.sira - 1; r++) {
      if (
        gozIcerigi(cfg, c, r) === "cekmece" &&
        gozIcerigi(cfg, c, r + 1) === "cekmece"
      )
        continue;
      ekle({
        id: `raf-${c}-${r}`,
        rol: "raf",
        x: cx,
        y: tabanY + T + (r + 1) * rh + r * T + T / 2,
        z: 0,
        w: cw,
        h: T,
        d: D,
        kalinlik: T,
        malzemeRolu: "govde",
        bantliKenar: cw,
        gorunur: true,
      });
    }
  }

  // --- Arka panel ---
  if (cfg.arkaPanel) {
    ekle({
      id: "arka",
      rol: "arka",
      x: 0,
      y: tabanY + Hg / 2,
      z: -D / 2 + ARKA_KALINLIK / 2,
      w: cfg.genislik,
      h: Hg,
      d: ARKA_KALINLIK,
      kalinlik: ARKA_KALINLIK,
      malzemeRolu: "arka",
      bantliKenar: 0,
      gorunur: true,
    });
  }

  // --- Baza: gövdeyi taşıyan, öne göre içeri çekilmiş kaide ---
  if (taban.panelli && tabanY > 0) {
    ekle({
      id: "baza",
      rol: "baza",
      x: 0,
      y: tabanY / 2,
      z: -30,
      w: cfg.genislik - 60,
      h: tabanY,
      d: D - 60,
      kalinlik: T,
      malzemeRolu: "govde",
      bantliKenar: cfg.genislik - 60,
      gorunur: true,
    });
  }

  // --- Gözlerin içeriği ---
  for (const goz of gozlerinYerlesimi(cfg)) {
    const icerik = gozIcerigi(cfg, goz.sutun, goz.sira);
    if (icerik === "bos") continue;

    // Ön yüzey gövdenin ön hizasına gömülür — kapak da çekmece
    // kapağı da aynı düzlemde durur, cephe tek parça görünür.
    ekle({
      id: `${icerik}-on-${goz.anahtar}`,
      rol: icerik === "kapak" ? "kapak" : "cekmece-on",
      x: goz.x,
      y: goz.y,
      z: D / 2 - T / 2,
      w: goz.w - 3,
      h: goz.h - 3,
      d: T,
      kalinlik: T,
      malzemeRolu: "on",
      bantliKenar: 2 * (goz.w + goz.h),
      gorunur: true,
      goz: goz.anahtar,
    });

    if (icerik === "cekmece") {
      // Çekmece kutusu görünmez ama levhadan çıkar ve paraya
      // girer. Saymazsak her çekmecede zarar ederiz.
      const kutuD = D - 40;
      // Kutu, kapağın boyuna değil kullanılabilir derinliğe göre
      // ölçülür. 25 santimden derin çekmecenin dibine kimse
      // uzanamaz; cephe gözü doldurur, kutu makul kalır.
      const kutuH = Math.min(goz.h - 60, 250);
      const kutuW = goz.w - 2 * T - 40;
      for (let i = 0; i < 2; i++) {
        ekle({
          id: `cekmece-yan-${goz.anahtar}-${i}`,
          rol: "cekmece-govde",
          x: goz.x,
          y: goz.y,
          z: 0,
          w: KUTU_KALINLIK,
          h: kutuH,
          d: kutuD,
          kalinlik: KUTU_KALINLIK,
          malzemeRolu: "govde",
          bantliKenar: kutuD,
          gorunur: false,
          goz: goz.anahtar,
        });
      }
      ekle({
        id: `cekmece-arka-${goz.anahtar}`,
        rol: "cekmece-govde",
        x: goz.x,
        y: goz.y,
        z: 0,
        w: kutuW,
        h: kutuH,
        d: KUTU_KALINLIK,
        kalinlik: KUTU_KALINLIK,
        malzemeRolu: "govde",
        bantliKenar: kutuW,
        gorunur: false,
        goz: goz.anahtar,
      });
      ekle({
        id: `cekmece-taban-${goz.anahtar}`,
        rol: "cekmece-govde",
        x: goz.x,
        y: goz.y,
        z: 0,
        w: kutuW,
        h: ARKA_KALINLIK,
        d: kutuD,
        kalinlik: ARKA_KALINLIK,
        malzemeRolu: "arka",
        bantliKenar: 0,
        gorunur: false,
        goz: goz.anahtar,
      });
    }
  }

  return paneller;
}

/** Göz içeriklerini sayar — fiyat ve donanım için */
export function icerikSayilari(cfg: MobilyaYapilandirma): {
  kapak: number;
  cekmece: number;
  raf: number;
} {
  let kapak = 0;
  let cekmece = 0;
  for (const goz of gozlerinYerlesimi(cfg)) {
    const i = gozIcerigi(cfg, goz.sutun, goz.sira);
    if (i === "kapak") kapak++;
    else if (i === "cekmece") cekmece++;
  }
  // Raf sayısı panel listesiyle aynı kuraldan çıkar; pim
  // sayısı buradan hesaplandığı için ikisi ayrışmamalı.
  let raf = 0;
  for (let c = 0; c < cfg.sutun; c++)
    for (let r = 0; r < cfg.sira - 1; r++)
      if (
        !(
          gozIcerigi(cfg, c, r) === "cekmece" &&
          gozIcerigi(cfg, c, r + 1) === "cekmece"
        )
      )
        raf++;
  return { kapak, cekmece, raf };
}

/**
 * Yapılandırmayı geçerli hâle getirir.
 *
 * Sütun ya da sıra azaldığında artık var olmayan gözlerin
 * kaydı kalırsa, kullanıcı sütunu geri açtığında eski kapak
 * birdenbire geri gelir. Bu, kimsenin beklemediği bir şey —
 * o yüzden ızgara dışında kalan gözler silinir.
 */
export function yapilandirmayiDuzelt(
  cfg: MobilyaYapilandirma
): MobilyaYapilandirma {
  const temiz: Record<GozAnahtari, GozIcerigi> = {};
  for (const [anahtar, deger] of Object.entries(cfg.gozler)) {
    const [c, r] = anahtar.split("-").map(Number);
    if (c < cfg.sutun && r < cfg.sira && deger !== "bos") temiz[anahtar] = deger;
  }
  return { ...cfg, gozler: temiz };
}

/** Malzeme seçimi panel rolüne göre çözülür */
export function panelMalzemesi(cfg: MobilyaYapilandirma, panel: Panel) {
  if (panel.malzemeRolu === "on") return malzemeBul(cfg.onMalzeme);
  return malzemeBul(cfg.govdeMalzeme);
}
