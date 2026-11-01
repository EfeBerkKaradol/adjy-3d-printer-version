// ==========================================
// ÜRÜN GÖRSELİ — GEOMETRİDEN ÇİZİLİR
//
// Woodcoder'ın kart görselleri beyaz zeminde ürün render'ları.
// Aynı etkiyi istiyoruz ama onların dosyalarını kullanamayız,
// fotoğraf da çekemeyiz: bu ürünlerin fotoğrafı olamaz, çünkü
// her sipariş başka ölçüde.
//
// Bu yüzden görsel kesim listesinden çiziliyor. Paneller
// eğik bir kameradan izdüşürülüyor, görünen yüzler ışığa göre
// gölgeleniyor ve arkadan öne sıralanıp boyanıyor.
//
// Kazancı sadece dosya olmaması değil: görsel geometriden
// doğduğu için modelin varsayılanı değişince kart görseli de
// kendiliğinden değişiyor. Elle güncellenmesi gereken bir
// fotoğraf arşivi yok, güncellenmediği için yanlış kalan bir
// kapak görseli de olamıyor.
// ==========================================

import { panelleriUret, panelMalzemesi } from "./panels";
import type { MobilyaYapilandirma, Panel } from "./types";

/** Kameranın yönü — sağ üstten, hafif eğik */
const AZIMUT = (33 * Math.PI) / 180;
const YUKSELIS = (19 * Math.PI) / 180;

const YON = {
  x: Math.sin(AZIMUT) * Math.cos(YUKSELIS),
  y: Math.sin(YUKSELIS),
  z: Math.cos(AZIMUT) * Math.cos(YUKSELIS),
};

// Ekran eksenleri: sag = normalize(yukari × yon), ust = yon × sag
const SAG = (() => {
  const x = YON.z;
  const z = -YON.x;
  const u = Math.hypot(x, z) || 1;
  return { x: x / u, y: 0, z: z / u };
})();

const UST = {
  x: YON.y * SAG.z - YON.z * SAG.y,
  y: YON.z * SAG.x - YON.x * SAG.z,
  z: YON.x * SAG.y - YON.y * SAG.x,
};

function izdusur(x: number, y: number, z: number): [number, number] {
  return [
    x * SAG.x + y * SAG.y + z * SAG.z,
    -(x * UST.x + y * UST.y + z * UST.z),
  ];
}

/** Yüz aydınlığı: üst yüz ışığı alır, yan yüz gölgede kalır */
const YUZ_ISIK: Record<string, number> = {
  ust: 1.1,
  alt: 0.6,
  on: 1.0,
  arka: 0.7,
  sag: 0.82,
  sol: 0.82,
};

function tonla(hex: string, carpan: number): string {
  const s = hex.replace("#", "");
  const n = parseInt(
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s,
    16
  );
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v * carpan)));
  const r = k((n >> 16) & 255);
  const g = k((n >> 8) & 255);
  const b = k(n & 255);
  return `rgb(${r},${g},${b})`;
}

interface Yuz {
  nokta: [number, number][];
  renk: string;
  derinlik: number;
}

/** Bir kutunun görünen yüzlerini üretir */
function kutuYuzleri(p: Panel, hex: string): Yuz[] {
  const hx = p.w / 2;
  const hy = p.h / 2;
  const hz = p.d / 2;
  const kose = (sx: number, sy: number, sz: number): [number, number] =>
    izdusur(p.x + sx * hx, p.y + sy * hy, p.z + sz * hz);

  const derinlik = p.x * YON.x + p.y * YON.y + p.z * YON.z;

  const tanimlar: { ad: string; gorunur: boolean; k: [number, number][] }[] = [
    {
      ad: "ust",
      gorunur: YON.y > 0,
      k: [kose(-1, 1, -1), kose(1, 1, -1), kose(1, 1, 1), kose(-1, 1, 1)],
    },
    {
      ad: "alt",
      gorunur: YON.y < 0,
      k: [kose(-1, -1, -1), kose(1, -1, -1), kose(1, -1, 1), kose(-1, -1, 1)],
    },
    {
      ad: "on",
      gorunur: YON.z > 0,
      k: [kose(-1, -1, 1), kose(1, -1, 1), kose(1, 1, 1), kose(-1, 1, 1)],
    },
    {
      ad: "arka",
      gorunur: YON.z < 0,
      k: [kose(-1, -1, -1), kose(1, -1, -1), kose(1, 1, -1), kose(-1, 1, -1)],
    },
    {
      ad: "sag",
      gorunur: YON.x > 0,
      k: [kose(1, -1, -1), kose(1, -1, 1), kose(1, 1, 1), kose(1, 1, -1)],
    },
    {
      ad: "sol",
      gorunur: YON.x < 0,
      k: [kose(-1, -1, -1), kose(-1, -1, 1), kose(-1, 1, 1), kose(-1, 1, -1)],
    },
  ];

  return tanimlar
    .filter((t) => t.gorunur)
    .map((t) => ({
      nokta: t.k,
      renk: tonla(hex, YUZ_ISIK[t.ad]),
      derinlik,
    }));
}

export interface IsoGorsel {
  yuzler: Yuz[];
  viewBox: string;
}

/**
 * Yapılandırmayı çizilmeye hazır yüzlere çevirir.
 *
 * Ressam algoritması: paneller uzaktan yakına sıralanıp
 * üst üste boyanıyor. Kutular birbirine girmediği için bu
 * yöntem burada doğru sonuç veriyor; z-tamponuna gerek yok.
 */
export function isoGorselUret(
  cfg: MobilyaYapilandirma,
  tuvalG = 320,
  tuvalY = 240,
  kenarBosluk = 14
): IsoGorsel {
  const paneller = panelleriUret(cfg).filter((p) => p.gorunur);

  const yuzler: Yuz[] = [];
  for (const p of paneller) {
    const malzeme = panelMalzemesi(cfg, p);
    // Arka panel gövdenin içinde kalır, ışık almaz.
    // Satın alınan ayak kendi rengindedir; rengi verilmemişse
    // gövde malzemesinin koyusu kullanılır (masif ahşap ayak).
    const temel = p.renkIpucu
      ? p.renkIpucu
      : p.levhaDisi
        ? koyult(malzeme.hex, 0.88)
        : p.malzemeRolu === "arka"
          ? koyult(malzeme.hex, 0.84)
          : malzeme.hex;
    yuzler.push(...kutuYuzleri(p, temel));
  }

  yuzler.sort((a, b) => a.derinlik - b.derinlik);

  // Tuvale oturt
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const y of yuzler)
    for (const [px, py] of y.nokta) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

  const g = maxX - minX || 1;
  const yh = maxY - minY || 1;
  const olcek = Math.min(
    (tuvalG - 2 * kenarBosluk) / g,
    (tuvalY - 2 * kenarBosluk) / yh
  );
  const kaydirX = (tuvalG - g * olcek) / 2 - minX * olcek;
  const kaydirY = (tuvalY - yh * olcek) / 2 - minY * olcek;

  for (const y of yuzler)
    y.nokta = y.nokta.map(([px, py]) => [
      px * olcek + kaydirX,
      py * olcek + kaydirY,
    ]);

  return { yuzler, viewBox: `0 0 ${tuvalG} ${tuvalY}` };
}

function koyult(hex: string, carpan: number): string {
  const s = hex.replace("#", "");
  const n = parseInt(s, 16);
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v * carpan)));
  const r = k((n >> 16) & 255);
  const g = k((n >> 8) & 255);
  const b = k(n & 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
