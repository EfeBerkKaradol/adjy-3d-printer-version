// ==========================================
// AHŞAP DOKUSU — ÇİZEREK ÜRETİLİR
//
// Mobilyayı düz renkle göstermek yanıltıcı olurdu: meşe dekor
// ile beyaz suntalam ekranda aynı görünürdü, oysa biri 520
// biri 450 TL/m². Müşteri neye para verdiğini görmeli.
//
// Doku dosya olarak indirilmiyor, tarayıcıda çiziliyor. Bir
// sebebi ağırlık (her renk için ayrı fotoğraf megabaytlarca
// eder), asıl sebebi dürüstlük: gerçek bir meşe fotoğrafı
// koysak, gelen üründe o fotoğraftaki damarı arardı. Çizilen
// doku malzemenin karakterini anlatır, belirli bir levhanın
// sözünü vermez.
// ==========================================

import * as THREE from "three";
import type { Malzeme } from "@/lib/furniture/materials";

const onbellek = new Map<string, THREE.CanvasTexture>();

function rastgele(tohum: number) {
  // Deterministik gürültü — her yüklemede aynı doku çıksın
  let s = tohum;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function ahsapDokusu(malzeme: Malzeme): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const mevcut = onbellek.get(malzeme.id);
  if (mevcut) return mevcut;

  const boy = 512;
  const tuval = document.createElement("canvas");
  tuval.width = boy;
  tuval.height = boy;
  const ctx = tuval.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = malzeme.hex;
  ctx.fillRect(0, 0, boy, boy);

  const rnd = rastgele(malzeme.id.length * 7919 + 13);

  if (malzeme.damar && malzeme.damarHex) {
    // Damar: dikey, düzensiz aralıklı, yumuşak çizgiler.
    // Belirli bir desen değil, ahşap izlenimi.
    ctx.strokeStyle = malzeme.damarHex;
    for (let i = 0; i < 140; i++) {
      const x = rnd() * boy;
      ctx.globalAlpha = 0.05 + rnd() * 0.18;
      ctx.lineWidth = 0.6 + rnd() * 2.6;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      // Hafif dalga — düz çizgi plastik görünüyor
      const sapma = (rnd() - 0.5) * 26;
      ctx.bezierCurveTo(
        x + sapma, boy * 0.33,
        x - sapma, boy * 0.66,
        x + (rnd() - 0.5) * 16, boy
      );
      ctx.stroke();
    }
  }

  // İnce gürültü: levha yüzeyinin matlığını verir ve dokunun
  // panel boyuna göre gerilmesini göze batmaz hâle getirir.
  const veri = ctx.getImageData(0, 0, boy, boy);
  for (let i = 0; i < veri.data.length; i += 4) {
    const g = (rnd() - 0.5) * 11;
    veri.data[i] += g;
    veri.data[i + 1] += g;
    veri.data[i + 2] += g;
  }
  ctx.putImageData(veri, 0, 0);
  ctx.globalAlpha = 1;

  const doku = new THREE.CanvasTexture(tuval);
  doku.wrapS = THREE.RepeatWrapping;
  doku.wrapT = THREE.RepeatWrapping;
  doku.colorSpace = THREE.SRGBColorSpace;
  doku.anisotropy = 4;
  onbellek.set(malzeme.id, doku);
  return doku;
}

/**
 * 180 cm'lik insan silueti.
 *
 * Woodcoder'ın en iyi fikri bu: ölçüyü santimle anlatmak
 * yerine yanına bir insan koymak. "192 santim" soyut bir
 * sayı; bir insanın boyunu aşan raf ise anlaşılır.
 */
export function siluetDokusu(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const mevcut = onbellek.get("__siluet");
  if (mevcut) return mevcut;

  const w = 256;
  const h = 512;
  const tuval = document.createElement("canvas");
  tuval.width = w;
  tuval.height = h;
  const ctx = tuval.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#1f2937";
  const mx = w / 2;

  // Baş
  ctx.beginPath();
  ctx.arc(mx, h * 0.072, h * 0.042, 0, Math.PI * 2);
  ctx.fill();

  // Boyun ve gövde
  ctx.beginPath();
  ctx.moveTo(mx - h * 0.018, h * 0.108);
  ctx.lineTo(mx + h * 0.018, h * 0.108);
  ctx.lineTo(mx + h * 0.072, h * 0.17);
  ctx.lineTo(mx + h * 0.062, h * 0.42);
  ctx.lineTo(mx - h * 0.062, h * 0.42);
  ctx.lineTo(mx - h * 0.072, h * 0.17);
  ctx.closePath();
  ctx.fill();

  // Kollar
  for (const yon of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(mx + yon * h * 0.066, h * 0.175);
    ctx.lineTo(mx + yon * h * 0.098, h * 0.19);
    ctx.lineTo(mx + yon * h * 0.09, h * 0.45);
    ctx.lineTo(mx + yon * h * 0.058, h * 0.44);
    ctx.closePath();
    ctx.fill();
  }

  // Bacaklar
  for (const yon of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(mx + yon * h * 0.008, h * 0.42);
    ctx.lineTo(mx + yon * h * 0.058, h * 0.42);
    ctx.lineTo(mx + yon * h * 0.05, h * 0.985);
    ctx.lineTo(mx + yon * h * 0.012, h * 0.985);
    ctx.closePath();
    ctx.fill();
  }

  const doku = new THREE.CanvasTexture(tuval);
  doku.colorSpace = THREE.SRGBColorSpace;
  onbellek.set("__siluet", doku);
  return doku;
}
