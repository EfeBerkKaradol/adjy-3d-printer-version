// ==========================================
// SİNEMATİK ZAMAN ÇİZELGESİ
//
// Her şey ilerlemenin saf fonksiyonu: aynı ilerleme her
// zaman aynı kareyi verir. Bunun iki sonucu var —
// yukarı kaydırınca animasyon kendiliğinden geri sarar ve
// kaydırma durunca kare tam olduğu yerde donar. Hiçbir
// yerde "oynatma" durumu tutulmuyor.
// ==========================================

import { MODULES, SLOT, type PanelModule } from "./panelSystem";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** İlerlemeyi bir aralığa göre 0–1'e indirger */
export function seg(p: number, from: number, to: number): number {
  return clamp01((p - from) / (to - from));
}

/** Yumuşak giriş/çıkış — mekanik hareketi mühendislik gibi gösterir */
export function ease(t: number): number {
  return t * t * (3 - 2 * t);
}

// ------------------------------------------------------------------
// PERDELER
// ------------------------------------------------------------------
export const CHAPTERS = [
  { n: "01", from: 0.0, title: "Sistem", body: "Delikli duvar paneli — tek parça değil, bir taşıyıcı sistem." },
  { n: "02", from: 0.14, title: "Bileşenler", body: "Levha, yuvalar, J-kanca bağlantısı ve modüller." },
  { n: "03", from: 0.44, title: "Bağlantı", body: "J-kanca yuvadan geçer, aşağı iner ve levhaya kilitlenir." },
  { n: "04", from: 0.62, title: "Modüller", body: "Her modül aynı yuva ızgarasına, istediğin noktaya asılır." },
  { n: "05", from: 0.9, title: "Senin kurgun", body: "Ölçüyü ve modülleri sen seç, ADJY üretsin." },
] as const;

export function chapterIndex(p: number): number {
  let i = 0;
  for (let k = 0; k < CHAPTERS.length; k += 1) if (p >= CHAPTERS[k].from) i = k;
  return i;
}

// ------------------------------------------------------------------
// MODÜLLERİN TAKILMA PENCERELERİ
//
// Dağılma hepsi için ortak; toplanma sırayla. Telefon
// tutucu bilerek ilk sırada: "modül nasıl takılıyor"
// sorusunu tek başına yanıtlayan parça o.
// ------------------------------------------------------------------
const EXPLODE_FROM = 0.14;
const EXPLODE_TO = 0.32;

const REASSEMBLE: Record<string, [number, number]> = {
  phone: [0.62, 0.73],
  hookA: [0.7, 0.78],
  hookB: [0.72, 0.8],
  tray: [0.75, 0.83],
  shelf: [0.78, 0.86],
  cup: [0.81, 0.88],
  bin: [0.83, 0.91],
};

/**
 * Modülün takılı olma oranı: 1 = yerinde, 0 = tam ayrık.
 * Aradaki değerler parçayı kendi montaj ekseni boyunca taşır.
 */
export function attachAmount(mod: PanelModule, p: number): number {
  const [rFrom, rTo] = REASSEMBLE[mod.id] ?? [0.8, 0.9];

  if (p <= EXPLODE_FROM) return 1;
  if (p < EXPLODE_TO) {
    // Sıraya göre hafif gecikme — hepsi aynı anda kopmaz
    const stagger = (mod.order - 1) * 0.012;
    return 1 - ease(seg(p, EXPLODE_FROM + stagger, EXPLODE_TO));
  }
  if (p < rFrom) return 0;
  return ease(seg(p, rFrom, rTo));
}

/**
 * Mekanizma anlatılırken ayrık parçalar daha da açılır.
 *
 * Makro kadrajda kamera levhaya yaklaşıyor; ayrık modüller
 * levha ile kamera arasında kalıp merceğin önünü kapatıyordu.
 * Bu çarpan onları o an kadraj dışına taşır — sahne
 * mekanizmayı yalnız bırakır. İlerlemenin fonksiyonu olduğu
 * için geri sarmada da kendiliğinden doğru çalışır.
 */
export function explodeScale(p: number): number {
  const out = ease(seg(p, 0.36, 0.46));
  const back = ease(seg(p, 0.58, 0.64));
  return 1 + 1.6 * (out - back);
}

/**
 * Ayrıkken parçanın aldığı ek dönüş — yerine otururken sıfırlanır.
 * Kasıtlı olarak küçük: parça savrulmuş değil, montaj ekseninden
 * hafifçe çevrilmiş görünmeli. Fazlası mühendislik çizimi olmaktan
 * çıkarıp dağılma efektine dönüştürüyor.
 */
export function settleRotation(mod: PanelModule, a: number): [number, number, number] {
  const k = 1 - a;
  const s = mod.order % 2 === 0 ? 1 : -1;
  return [k * 0.09 * s, k * 0.15 * s, k * 0.04 * s];
}

// ------------------------------------------------------------------
// J-KANCA GÖSTERİMİ
//
// Mekanizmanın anlaşıldığı an. Kanca yuvaya yaklaşır,
// hizalanır, tırnak yuvadan geçer, parça aşağı iner ve
// kilitlenir. Dört hareket, hepsi tek eksende.
// ------------------------------------------------------------------
export const HOOK_DEMO = {
  // Izgaradaki gerçek bir yuvanın merkezi (satır 2, sütun 8).
  // Kanca boşluğa değil, levhada fiilen var olan bir deliğe girer.
  slot: [0.7, -0.52] as [number, number],
  approachFrom: 0.44,
  aligned: 0.51,
  inserted: 0.56,
  locked: 0.6,
  /** Bu ilerlemeden sonra kanca sahnede kalır ama artık vurgulanmaz */
  visibleFrom: 0.42,
};

export function hookDemoTransform(p: number) {
  const [sx, sy] = HOOK_DEMO.slot;

  // 1) Kadraja giriş ve hizalanma
  const approach = ease(seg(p, HOOK_DEMO.approachFrom, HOOK_DEMO.aligned));
  // 2) Tırnağın yuvadan geçişi
  const insert = ease(seg(p, HOOK_DEMO.aligned, HOOK_DEMO.inserted));
  // 3) Aşağı inip kilitlenmesi
  const drop = ease(seg(p, HOOK_DEMO.inserted, HOOK_DEMO.locked));

  return {
    x: sx + (1 - approach) * 1.15,
    y: sy + (1 - approach) * 0.62 - drop * SLOT.height * 0.34,
    z: (1 - approach) * 1.5 + (1 - insert) * 0.34,
    rotZ: (1 - approach) * 0.5,
    visible: p >= HOOK_DEMO.visibleFrom,
  };
}

// ------------------------------------------------------------------
// KAMERA
//
// Hareket ölçülü: yaklaşma, hafif yörünge ve mekanizma
// için tek bir makro geçiş. Dramatik dönüş yok — ürün
// odakta kalır.
// ------------------------------------------------------------------
interface CamKey {
  p: number;
  pos: [number, number, number];
  target: [number, number, number];
}

const CAMERA: CamKey[] = [
  // Hiçbir kare tam karşıdan değil: düz karşıdan bakınca
  // açık kutular dolu levha gibi görünüyor, hacim kayboluyor.
  { p: 0.0, pos: [2.05, 0.8, 7.15], target: [0, 0.16, 0] },
  { p: 0.14, pos: [1.7, 0.55, 6.2], target: [0, 0.12, 0] },
  // Parçalar ayrılırken kamera geri çekilir: ayrık hâlin
  // tamamı kadraja sığmazsa patlatma bilgi vermez.
  { p: 0.32, pos: [3.2, 1.15, 8.0], target: [-0.3, 0.22, 0.45] },
  { p: 0.44, pos: [2.7, 0.45, 6.1], target: [0.2, -0.05, 0.3] },
  // Yandan bakış: tırnağın yuvaya giriş derinliği ancak
  // profilden görülür, tam karşıdan düz bir plaka gibi durur.
  { p: 0.56, pos: [2.35, -0.12, 1.95], target: [0.7, -0.52, 0.08] },
  { p: 0.62, pos: [2.3, 0.1, 3.0], target: [0.6, -0.35, 0.1] },
  { p: 0.73, pos: [2.5, 0.95, 4.9], target: [0.25, 0.6, 0.2] },
  { p: 0.88, pos: [1.9, 0.6, 6.4], target: [0, 0.14, 0] },
  { p: 1.0, pos: [1.5, 0.45, 6.95], target: [0, 0.16, 0] },
];

export function cameraAt(p: number): { pos: [number, number, number]; target: [number, number, number] } {
  if (p <= CAMERA[0].p) return { pos: CAMERA[0].pos, target: CAMERA[0].target };
  for (let i = 1; i < CAMERA.length; i += 1) {
    if (p <= CAMERA[i].p) {
      const a = CAMERA[i - 1];
      const b = CAMERA[i];
      const t = ease(seg(p, a.p, b.p));
      const mix = (u: number, v: number) => u + (v - u) * t;
      return {
        pos: [mix(a.pos[0], b.pos[0]), mix(a.pos[1], b.pos[1]), mix(a.pos[2], b.pos[2])],
        target: [
          mix(a.target[0], b.target[0]),
          mix(a.target[1], b.target[1]),
          mix(a.target[2], b.target[2]),
        ],
      };
    }
  }
  const last = CAMERA[CAMERA.length - 1];
  return { pos: last.pos, target: last.target };
}

/**
 * Mobilde kadraj masaüstünün küçültülmüşü değil, kendi kurgusu.
 *
 * Telefon ekranı dar ve uzun: masaüstü mesafesinde panelin
 * genişliği kadraja sığmıyordu. Mobilde hem görüş açısı açılır
 * hem de kamera geri çekilir; ürün küçülür ama tamamı görünür.
 */
export function cameraDistanceScale(isMobile: boolean): number {
  return isMobile ? 1.28 : 1;
}

export const CAMERA_FOV = { desktop: 34, mobile: 42 } as const;

/**
 * Kompozisyon kaydırması — kameranın baktığı nokta değil,
 * ürünün kadrajdaki yeri.
 *
 * Masaüstünde metin sol altta duruyor, bu yüzden kahraman
 * karelerde ürün sağa alınır. Mobilde metin ürünün altında
 * olduğu için kaydırma uygulanmaz; orada ürün ortada durur.
 */
export function compositionBias(p: number, isMobile: boolean): number {
  if (isMobile) return 0;
  const opening = 1 - ease(seg(p, 0.06, 0.2));
  const closing = ease(seg(p, 0.8, 0.9));
  return -0.5 * Math.max(opening, closing);
}

export const ALL_MODULES = MODULES;
