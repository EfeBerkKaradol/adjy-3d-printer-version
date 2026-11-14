import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { computeMeshMetrology, parseScaleDenominator } from './dfm-cad-engine.js';

/**
 * Özel 3B Mimari Model Yükleyici (.STL / .OBJ / .GLB / .GLTF),
 * Otomatik Ölçek & Eksen Kalibratörü, Düzlemsel Üçgen Kat Kesici (Sutherland-Hodgman),
 * >=1.2mm DFM İç Kabuk Destekleyici ve Kademe-Uyumlu 0.20mm Köşe Pim Üreticisi.
 */

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function stripToPosNormal(geom) {
  const nonIdx = geom.index ? geom.toNonIndexed() : geom.clone();
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', nonIdx.attributes.position.clone());
  if (nonIdx.attributes.normal) {
    out.setAttribute('normal', nonIdx.attributes.normal.clone());
  } else {
    out.computeVertexNormals();
  }
  return out;
}

/**
 * Kullanıcının seçtiği .STL, .OBJ, .GLB veya .GLTF dosyasını tek bir BufferGeometry'de birleştirir.
 */
export async function parseUploaded3DModelFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const buffer = await file.arrayBuffer();

  if (ext === 'stl') {
    const loader = new STLLoader();
    const geom = loader.parse(buffer);
    const clean = stripToPosNormal(geom);
    clean.computeBoundingBox();
    return {
      geometry: clean,
      fileName: file.name,
      format: 'STL',
      defaultZUp: true // CAD/Revit/Rhino/Blender .STL dosyaları standart olarak Z-yukarıdır
    };
  }

  if (ext === 'obj') {
    const text = new TextDecoder('utf-8').decode(buffer);
    const loader = new OBJLoader();
    const group = loader.parse(text);
    const parts = [];
    group.updateMatrixWorld(true);
    group.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const g = stripToPosNormal(child.geometry);
        g.applyMatrix4(child.matrixWorld);
        parts.push(g);
      }
    });
    if (parts.length === 0) throw new Error('OBJ dosyasında geçerli üçgen ağ (mesh) bulunamadı.');
    const merged = BufferGeometryUtils.mergeGeometries(parts, false);
    merged.computeVertexNormals();
    merged.computeBoundingBox();
    return {
      geometry: merged,
      fileName: file.name,
      format: 'OBJ',
      defaultZUp: false
    };
  }

  if (ext === 'glb' || ext === 'gltf') {
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(buffer, '', resolve, reject);
    });
    const parts = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        const g = stripToPosNormal(child.geometry);
        g.applyMatrix4(child.matrixWorld);
        parts.push(g);
      }
    });
    if (parts.length === 0) throw new Error('GLB/GLTF sahnesinde geçerli 3B katı gövde bulunamadı.');
    const merged = BufferGeometryUtils.mergeGeometries(parts, false);
    merged.computeVertexNormals();
    merged.computeBoundingBox();
    return {
      geometry: merged,
      fileName: file.name,
      format: ext.toUpperCase(),
      defaultZUp: false
    };
  }

  throw new Error(`Desteklenmeyen dosya uzantısı: .${ext} (Lütfen .STL, .OBJ, .GLB veya .GLTF yükleyin)`);
}

/**
 * Tek tıkla test için özel mimari kütle: Kademeli Podyum + L-Planlı Orta Gövde + Çekmeli Kule (Gerçek Metre biriminde).
 */
export function createDemoCustomBuildingModel() {
  const parts = [];

  function addBlock(cx, y0, y1, cz, sx, sz) {
    const g = new THREE.BoxGeometry(sx, y1 - y0, sz);
    g.translate(cx, (y0 + y1) * 0.5, cz);
    parts.push(stripToPosNormal(g));
  }

  // Podyum (0 - 8m): 34m x 28m
  addBlock(0, 0, 8.0, 0, 34, 28);
  // Orta Kademe Ana Gövde + Yan Kanat (8m - 22m)
  addBlock(-3, 8.0, 22.0, -2, 24, 20);
  addBlock(9, 8.0, 18.5, 6, 12, 12);
  // Üst Kule Çekmesi (22m - 34m): 17m x 16m
  addBlock(-4, 22.0, 34.0, -2, 17, 16);
  // Çatı Parapet & Çekirdek Kulesi (34m - 36.5m)
  addBlock(-4, 34.0, 36.5, -2, 8.5, 8.0);

  // Düşey mimari güneş kırıcı cephe kanatları (DFM test detayı)
  for (let i = -3; i <= 3; i++) {
    addBlock(-4 + i * 2.2, 8.0, 34.0, 6.25, 0.35, 0.55);
  }

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  merged.computeVertexNormals();
  merged.computeBoundingBox();

  return {
    geometry: merged,
    fileName: 'Kademeli_L_Rezidans_Kule_Ornek.stl',
    format: 'DEMO-STL',
    defaultZUp: false
  };
}

/* ============================================================================
 * DÜZLEMSEL ÜÇGEN KESME (SUTHERLAND-HODGMAN) & DİŞİ YUVA OYMA
 * ============================================================================ */

function clipPolygonAgainstPlaneY(poly, yPlane, keepAbove) {
  if (poly.length === 0) return [];
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = keepAbove ? cur.y >= yPlane - 1e-5 : cur.y <= yPlane + 1e-5;
    const prevIn = keepAbove ? prev.y >= yPlane - 1e-5 : prev.y <= yPlane + 1e-5;

    if (curIn !== prevIn) {
      const dy = cur.y - prev.y;
      const t = Math.abs(dy) > 1e-9 ? clamp((yPlane - prev.y) / dy, 0, 1) : 0.5;
      out.push(
        new THREE.Vector3(
          prev.x + (cur.x - prev.x) * t,
          yPlane,
          prev.z + (cur.z - prev.z) * t
        )
      );
    }
    if (curIn) out.push(cur);
  }
  return out;
}

/**
 * Ölçeklenmiş özel 3B ağdaki üçgenleri [y0, y1] kat bandında keser, y0'ı Z=0 tabanına indirir
 * ve alt yüzeydeki dişi pim yuvası ağızlarını kapatabilecek taban üçgenlerini temizler.
 */
function sliceMeshBand(scaledPosAttr, y0, y1, bottomPinCoords, clearRadiusMm, socketDepthMm) {
  const outCoords = [];
  const triCount = Math.floor(scaledPosAttr.count / 3);
  const clearR2 = clearRadiusMm * clearRadiusMm;

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const ay = scaledPosAttr.getY(i0);
    const by = scaledPosAttr.getY(i0 + 1);
    const cy = scaledPosAttr.getY(i0 + 2);

    const minY = Math.min(ay, by, cy);
    const maxY = Math.max(ay, by, cy);
    if (maxY < y0 + 1e-5 || minY > y1 - 1e-5) continue;

    const v0 = new THREE.Vector3(scaledPosAttr.getX(i0), ay, scaledPosAttr.getZ(i0));
    const v1 = new THREE.Vector3(scaledPosAttr.getX(i0 + 1), by, scaledPosAttr.getZ(i0 + 1));
    const v2 = new THREE.Vector3(scaledPosAttr.getX(i0 + 2), cy, scaledPosAttr.getZ(i0 + 2));

    let poly = [v0, v1, v2];
    if (minY < y0) poly = clipPolygonAgainstPlaneY(poly, y0, true);
    if (poly.length < 3) continue;
    if (maxY > y1) poly = clipPolygonAgainstPlaneY(poly, y1, false);
    if (poly.length < 3) continue;

    // Fan üçgenleme
    for (let k = 1; k < poly.length - 1; k++) {
      const pA = poly[0];
      const pB = poly[k];
      const pC = poly[k + 1];

      const locAy = pA.y - y0;
      const locBy = pB.y - y0;
      const locCy = pC.y - y0;

      // Eğer üçgen alt dişi pim yuvası derinliğindeyse ve merkezi dişi yuva silindirinin içindeyse atla (delik ağzı açık kalsın)
      if (bottomPinCoords && bottomPinCoords.length > 0 && Math.min(locAy, locBy, locCy) < socketDepthMm) {
        const mx = (pA.x + pB.x + pC.x) / 3;
        const mz = (pA.z + pB.z + pC.z) / 3;
        let insideSocket = false;
        for (const pt of bottomPinCoords) {
          const dx = mx - pt.x;
          const dz = mz - pt.z;
          if (dx * dx + dz * dz < clearR2) {
            insideSocket = true;
            break;
          }
        }
        if (insideSocket) continue;
      }

      outCoords.push(
        pA.x, locAy, pA.z,
        pB.x, locBy, pB.z,
        pC.x, locCy, pC.z
      );
    }
  }

  if (outCoords.length === 0) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(outCoords, 3));
  g.computeVertexNormals();
  return g;
}

/* ============================================================================
 * 2B KAT KESİT KONTURU ÇIKARIMI, DFM İÇ CİDAR VE AKILLI KÖŞE PİM YERLEŞİMİ
 * ============================================================================ */

/**
 * Verilen Y aralığında 3B modeli yatay düzlemlerle keserek katın gerçek X/Z sınırlarını
 * ve açısal dış zarf konturunu (24 sektörlü yıldız/konveks zarf) hesaplar.
 */
function analyzeFloorFootprint(scaledPosAttr, y0, y1) {
  const h = y1 - y0;
  const sampleYs = [y0 + h * 0.18, y0 + h * 0.50, y0 + h * 0.82];
  const hitPts = [];
  const triCount = Math.floor(scaledPosAttr.count / 3);

  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const ys = [scaledPosAttr.getY(i0), scaledPosAttr.getY(i0 + 1), scaledPosAttr.getY(i0 + 2)];
    const tMin = Math.min(ys[0], ys[1], ys[2]);
    const tMax = Math.max(ys[0], ys[1], ys[2]);
    if (tMax < y0 || tMin > y1) continue;

    const xs = [scaledPosAttr.getX(i0), scaledPosAttr.getX(i0 + 1), scaledPosAttr.getX(i0 + 2)];
    const zs = [scaledPosAttr.getZ(i0), scaledPosAttr.getZ(i0 + 1), scaledPosAttr.getZ(i0 + 2)];

    for (const sy of sampleYs) {
      if (sy < tMin || sy > tMax) continue;
      for (let e = 0; e < 3; e++) {
        const e2 = (e + 1) % 3;
        const yA = ys[e];
        const yB = ys[e2];
        if ((yA <= sy && yB >= sy) || (yB <= sy && yA >= sy)) {
          const dy = yB - yA;
          const u = Math.abs(dy) > 1e-8 ? (sy - yA) / dy : 0.5;
          hitPts.push({
            x: xs[e] + (xs[e2] - xs[e]) * u,
            z: zs[e] + (zs[e2] - zs[e]) * u
          });
        }
      }
    }
  }

  // Eğer ara düzlem kesişimi azsa kat içindeki köşe noktalarını yedek olarak ekle
  if (hitPts.length < 6) {
    for (let i = 0; i < scaledPosAttr.count; i++) {
      const py = scaledPosAttr.getY(i);
      if (py >= y0 - 0.2 && py <= y1 + 0.2) {
        hitPts.push({ x: scaledPosAttr.getX(i), z: scaledPosAttr.getZ(i) });
      }
    }
  }

  if (hitPts.length === 0) {
    return {
      minX: -20, maxX: 20, minZ: -20, maxZ: 20,
      cx: 0, cz: 0, widthX: 40, depthZ: 40,
      hitPts: [],
      contour: [
        { x: -20, z: -20 },
        { x: 20, z: -20 },
        { x: 20, z: 20 },
        { x: -20, z: 20 }
      ]
    };
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of hitPts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const widthX = Math.max(4, maxX - minX);
  const depthZ = Math.max(4, maxZ - minZ);

  // Monotone Chain 2B Konveks Zarf (Pürüzsüz dış çevre ve DFM halka üretimi için)
  const sorted = [...hitPts].sort((a, b) => (a.x !== b.x ? a.x - b.x : a.z - b.z));
  const cross = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);

  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    cx,
    cz,
    widthX,
    depthZ,
    hitPts,
    contour: hull.length >= 3 ? hull : [
      { x: minX, z: minZ },
      { x: maxX, z: minZ },
      { x: maxX, z: maxZ },
      { x: minX, z: maxZ }
    ]
  };
}

function pointInConvexPolygon(px, pz, poly) {
  if (!poly || poly.length < 3) return true;
  let pos = 0;
  let neg = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cr = (b.x - a.x) * (pz - a.z) - (b.z - a.z) * (px - a.x);
    if (cr > 1e-5) pos++;
    else if (cr < -1e-5) neg++;
    if (pos > 0 && neg > 0) return false;
  }
  return true;
}

function insetPolygonTowardCentroid(poly, cx, cz, insetMm) {
  return poly.map((p) => {
    const dx = p.x - cx;
    const dz = p.z - cz;
    const len = Math.hypot(dx, dz);
    if (len <= insetMm + 0.4) {
      return { x: cx + dx * 0.25, z: cz + dz * 0.25 };
    }
    const scale = (len - insetMm) / len;
    return { x: cx + dx * scale, z: cz + dz * scale };
  });
}

/**
 * İki ardışık katın ortak oturum alanı içinde kalan en uzak ve dengeli 4 köşe pim koordinatını bulur.
 * Böylece kademeli/çekmeli veya L-planlı özel modellerde pimler asla boşluğa taşmaz!
 */
function solveInterfacePinCoords(fpLower, fpUpper, bossSizeMm) {
  const minX = Math.max(fpLower.minX, fpUpper.minX);
  const maxX = Math.min(fpLower.maxX, fpUpper.maxX);
  const minZ = Math.max(fpLower.minZ, fpUpper.minZ);
  const maxZ = Math.min(fpLower.maxZ, fpUpper.maxZ);

  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const margin = bossSizeMm * 0.58;

  const insetLow = insetPolygonTowardCentroid(fpLower.contour, fpLower.cx, fpLower.cz, margin);
  const insetUp = insetPolygonTowardCentroid(fpUpper.contour, fpUpper.cx, fpUpper.cz, margin);

  // 4 Çeyrek (Sol-Ön, Sağ-Ön, Sağ-Arka, Sol-Arka) hedef yönleri
  const dirs = [
    { id: 'P1_SOL_ON', sx: -1, sz: +1, label: 'Sol-Ön' },
    { id: 'P2_SAG_ON', sx: +1, sz: +1, label: 'Sağ-Ön' },
    { id: 'P3_SAG_ARKA', sx: +1, sz: -1, label: 'Sağ-Arka' },
    { id: 'P4_SOL_ARKA', sx: -1, sz: -1, label: 'Sol-Arka' }
  ];

  const spanX = Math.max(2, (maxX - minX) * 0.5 - margin);
  const spanZ = Math.max(2, (maxZ - minZ) * 0.5 - margin);

  return dirs.map((d) => {
    // Dış köşeden merkeze doğru tarayarak her iki katın da güvenli iç bölgesine düşen ilk noktayı seç
    for (let step = 1.0; step >= 0.15; step -= 0.08) {
      const tx = cx + d.sx * spanX * step;
      const tz = cz + d.sz * spanZ * step;
      if (pointInConvexPolygon(tx, tz, insetLow) && pointInConvexPolygon(tx, tz, insetUp)) {
        return { id: d.id, x: tx, z: tz, label: d.label };
      }
    }
    return { id: d.id, x: cx + d.sx * Math.min(spanX, 2.5), z: cz + d.sz * Math.min(spanZ, 2.5), label: d.label };
  });
}

function makeDfmFloorTrayAndPins(footprint, heightMm, minWallMm, dosemeMm, bottomPins, topPins, pimCapMm, yuvaCapMm, bossSizeMm, pimYukseklikMm, yuvaDerinlikMm) {
  const parts = [];

  // 1. DFM Kelepçeli Alt Döşeme Plağı + >=Min_Basilir_Duvar_mm Çevre Takviye Bileziği
  const outerPoly = insetPolygonTowardCentroid(footprint.contour, footprint.cx, footprint.cz, 0.12);
  if (outerPoly.length >= 3) {
    // Alt Döşeme Plağı (Alt yüzeyi Z=0 düz baskı tablası oluşturur, dişi pim delikleri açılır)
    const slabShape = new THREE.Shape();
    outerPoly.forEach((p, idx) => {
      // rotateX(-PI/2) sonrası (x, -z) -> world (x, y, +z)
      if (idx === 0) slabShape.moveTo(p.x, -p.z);
      else slabShape.lineTo(p.x, -p.z);
    });
    slabShape.closePath();

    if (bottomPins && bottomPins.length > 0) {
      const holeR = yuvaCapMm * 0.5;
      for (const pt of bottomPins) {
        const hPath = new THREE.Path();
        hPath.absarc(pt.x, -pt.z, holeR, 0, Math.PI * 2, true);
        slabShape.holes.push(hPath);
      }
    }

    const slabGeom = new THREE.ExtrudeGeometry(slabShape, {
      depth: Math.min(dosemeMm, heightMm * 0.45),
      bevelEnabled: false,
      curveSegments: 24
    });
    slabGeom.rotateX(-Math.PI / 2);
    parts.push(stripToPosNormal(slabGeom));

    // DFM >= 1.2mm İç Çevre Duvarı Halka Takviyesi (İnce kabuklu modellerde nozul perimetre atlamasını önler)
    const innerPoly = insetPolygonTowardCentroid(outerPoly, footprint.cx, footprint.cz, minWallMm * 1.05);
    const ringH = Math.max(0, heightMm - Math.min(dosemeMm, heightMm * 0.45));
    if (ringH > 0.2 && innerPoly.length >= 3 && Math.min(footprint.widthX, footprint.depthZ) > minWallMm * 4.2) {
      const ringShape = new THREE.Shape();
      outerPoly.forEach((p, idx) => {
        if (idx === 0) ringShape.moveTo(p.x, -p.z);
        else ringShape.lineTo(p.x, -p.z);
      });
      ringShape.closePath();

      const innerHole = new THREE.Path();
      // Saat yönünde (ters sıra) iç boşluk
      for (let i = innerPoly.length - 1; i >= 0; i--) {
        const p = innerPoly[i];
        if (i === innerPoly.length - 1) innerHole.moveTo(p.x, -p.z);
        else innerHole.lineTo(p.x, -p.z);
      }
      innerHole.closePath();
      ringShape.holes.push(innerHole);

      const ringGeom = new THREE.ExtrudeGeometry(ringShape, {
        depth: ringH,
        bevelEnabled: false
      });
      ringGeom.rotateX(-Math.PI / 2);
      ringGeom.translate(0, Math.min(dosemeMm, heightMm * 0.45), 0);
      parts.push(stripToPosNormal(ringGeom));
    }
  }

  // 2. Alt 4× Dişi Pim Yuvası Kolonları (0.20mm radyal boşluklu)
  if (bottomPins && bottomPins.length > 0) {
    const half = bossSizeMm * 0.5;
    const holeR = yuvaCapMm * 0.5;
    const sDepth = Math.min(yuvaDerinlikMm, heightMm - minWallMm * 0.8);

    for (const pt of bottomPins) {
      if (sDepth > 0.2) {
        const bossShape = new THREE.Shape();
        bossShape.moveTo(-half, -half);
        bossShape.lineTo(+half, -half);
        bossShape.lineTo(+half, +half);
        bossShape.lineTo(-half, +half);
        bossShape.closePath();

        const hole = new THREE.Path();
        hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
        bossShape.holes.push(hole);

        const bExt = new THREE.ExtrudeGeometry(bossShape, {
          depth: sDepth,
          bevelEnabled: false,
          curveSegments: 24
        });
        bExt.rotateX(-Math.PI / 2);
        bExt.translate(pt.x, 0, pt.z);
        parts.push(stripToPosNormal(bExt));
      }

      if (heightMm > sDepth + 0.1) {
        const capH = heightMm - Math.max(0, sDepth);
        const capBox = new THREE.BoxGeometry(bossSizeMm, capH, bossSizeMm);
        capBox.translate(pt.x, Math.max(0, sDepth) + capH * 0.5, pt.z);
        parts.push(stripToPosNormal(capBox));
      }
    }
  }

  // 3. Üst 4× Pahlı Erkek Hizalama Pimleri (Üst katın yuvalarıyla %100 eş eksenli)
  if (topPins && topPins.length > 0) {
    const r = pimCapMm * 0.5;
    const chamH = Math.min(0.45, pimYukseklikMm * 0.24);
    const bodyH = Math.max(0.2, pimYukseklikMm - chamH);

    for (const pt of topPins) {
      // Pimin altında kat tavanına bağlanan destek yastığı
      const padH = Math.min(minWallMm * 1.2, heightMm * 0.35);
      const pad = new THREE.BoxGeometry(bossSizeMm, padH, bossSizeMm);
      pad.translate(pt.x, heightMm - padH * 0.5, pt.z);
      parts.push(stripToPosNormal(pad));

      const body = new THREE.CylinderGeometry(r, r, bodyH, 24);
      body.translate(pt.x, heightMm + bodyH * 0.5, pt.z);
      parts.push(stripToPosNormal(body));

      if (chamH > 0.05) {
        const tip = new THREE.CylinderGeometry(Math.max(r * 0.72, r - chamH), r, chamH, 24);
        tip.translate(pt.x, heightMm + bodyH + chamH * 0.5, pt.z);
        parts.push(stripToPosNormal(tip));
      }
    }
  }

  return parts;
}

/**
 * Yüklenen özel 3B modeli Maket_Olcegi'ne göre ölçekler, Kat_Sayisi kadar sökülebilir kata böler,
 * >=1.2mm DFM duvar/taban takviyesi uygular, 0.20mm toleranslı köşe pimlerini ve Kademeli Vaziyet Bazasını üretir.
 */
export function buildCustomModelAssembly(customData, rawParams) {
  const t0 = performance.now();
  const scale = parseScaleDenominator(rawParams.Maket_Olcegi);
  const katSayisi = Math.round(clamp(Number(rawParams.Kat_Sayisi) || 8, 3, 25));
  const minWallMm = clamp(Number(rawParams.Min_Basilir_Duvar_mm) || 1.2, 0.8, 3.0);
  const pimTolMm = clamp(Number(rawParams.Kat_Pim_Toleransi_mm) || 0.20, 0.05, 0.50);
  const nozzleMm = 0.40;

  // 1. Ham Geometriyi Kopyala ve Eksen Döndürmelerini Uygula
  const workGeom = customData.rawGeometry.clone();
  if (customData.zUp) {
    workGeom.rotateX(-Math.PI / 2);
  }
  if (customData.rotX) workGeom.rotateX(customData.rotX * (Math.PI / 2));
  if (customData.rotY) workGeom.rotateY(customData.rotY * (Math.PI / 2));
  if (customData.rotZ) workGeom.rotateZ(customData.rotZ * (Math.PI / 2));

  workGeom.computeBoundingBox();
  const rawBB = workGeom.boundingBox;
  const rawSize = new THREE.Vector3();
  rawBB.getSize(rawSize);

  const maxHorizRaw = Math.max(rawSize.x, rawSize.z, 1e-4);

  // 2. Kaynak Birim Algılama & Maket Milimetresine (1B = 1mm) Ölçekleme
  let detectedUnitLabel = '';
  let realMetersPerUnit = 1.0;

  const uMode = customData.unitMode || 'auto';
  if (uMode === 'real_m') {
    realMetersPerUnit = 1.0;
    detectedUnitLabel = 'Gerçek Metre (m)';
  } else if (uMode === 'real_cm') {
    realMetersPerUnit = 0.01;
    detectedUnitLabel = 'Gerçek Santimetre (cm)';
  } else if (uMode === 'real_mm') {
    realMetersPerUnit = 0.001;
    detectedUnitLabel = 'Gerçek Milimetre (mm)';
  } else if (uMode === 'maket_mm') {
    // Doğrudan 1:1 maket mm (seçili ölçekte doğrudan mm kabul et)
    realMetersPerUnit = scale / 1000;
    detectedUnitLabel = '1:1 Hazır Maket (mm)';
  } else {
    // Otomatik algıla
    if (maxHorizRaw <= 140) {
      realMetersPerUnit = 1.0;
      detectedUnitLabel = 'Oto: Gerçek Metre (m)';
    } else if (maxHorizRaw <= 1200) {
      realMetersPerUnit = scale / 1000;
      detectedUnitLabel = 'Oto: 1:1 Maket (mm)';
    } else if (maxHorizRaw <= 8500) {
      realMetersPerUnit = 0.01;
      detectedUnitLabel = 'Oto: Gerçek cm';
    } else {
      realMetersPerUnit = 0.001;
      detectedUnitLabel = 'Oto: Gerçek mm';
    }
  }

  const realEnM = rawSize.x * realMetersPerUnit;
  const realBoyM = rawSize.z * realMetersPerUnit;
  const realYukseklikM = rawSize.y * realMetersPerUnit;

  const unitToMaketMm = (realMetersPerUnit * 1000) / scale;

  // Modeli merkeze ve Y=0 tabanına taşıyıp maket milimetresine ölçekle
  const rawCenter = new THREE.Vector3();
  rawBB.getCenter(rawCenter);
  workGeom.translate(-rawCenter.x, -rawBB.min.y, -rawCenter.z);
  workGeom.scale(unitToMaketMm, unitToMaketMm, unitToMaketMm);
  workGeom.computeBoundingBox();

  const scaledBB = workGeom.boundingBox;
  const enMm = Math.max(12, scaledBB.max.x - scaledBB.min.x);
  const boyMm = Math.max(12, scaledBB.max.z - scaledBB.min.z);
  const binaGovdeYukseklikMm = Math.max(katSayisi * minWallMm * 3.5, scaledBB.max.y - scaledBB.min.y);
  const katYukseklikMm = binaGovdeYukseklikMm / katSayisi;

  // 3. DFM Cidar & Köşe Pim Parametreleri
  const hamDuvarMm = (0.30 * 1000) / scale;
  const duvarMm = Math.max(hamDuvarMm, minWallMm);
  const duvarClamped = hamDuvarMm < minWallMm - 1e-4;

  const hamDosemeMm = (0.30 * 1000) / scale;
  const dosemeMm = Math.max(hamDosemeMm, minWallMm);
  const dosemeClamped = hamDosemeMm < minWallMm - 1e-4;

  const hamParapetMm = (0.20 * 1000) / scale;
  const parapetMm = Math.max(hamParapetMm, minWallMm);
  const parapetClamped = hamParapetMm < minWallMm - 1e-4;

  const nominalPinByScale = scale <= 50 ? 4.8 : scale <= 100 ? 4.0 : scale <= 200 ? 3.2 : 2.6;
  const minSpanMm = Math.min(enMm, boyMm);
  let pimCapMm = Math.max(nominalPinByScale, minWallMm * 2.0, 2.4);
  const maxBossAllowed = minSpanMm * 0.30;
  if (pimCapMm + 2 * pimTolMm + 2 * minWallMm > maxBossAllowed) {
    pimCapMm = Math.max(minWallMm * 1.7, maxBossAllowed - 2 * pimTolMm - 2 * minWallMm);
  }
  const yuvaCapMm = pimCapMm + 2 * pimTolMm;
  const bossBoyutMm = Math.max(yuvaCapMm + 2 * minWallMm, duvarMm + minWallMm);

  const pimYukseklikMm = clamp(katYukseklikMm * 0.28, 1.6, 3.8);
  const yuvaZBoslukMm = 0.30;
  const yuvaDerinlikMm = Math.min(pimYukseklikMm + yuvaZBoslukMm, katYukseklikMm - minWallMm * 0.9);

  // 4. Her Kat Diliminin Gerçek 2B Oturum Konturunu Çıkar
  const posAttr = workGeom.attributes.position;
  const floorFootprints = [];
  for (let k = 0; k < katSayisi; k++) {
    const y0 = k * katYukseklikMm;
    const y1 = (k + 1) * katYukseklikMm;
    floorFootprints.push(analyzeFloorFootprint(posAttr, y0, y1));
  }

  // Ardışık katlar arası ortak oturum alanına göre eş-eksenli 4× Köşe Pim Koordinatları
  const interfacePins = [];
  // Arayüz 0: Kademeli Baza -> Kat 1
  interfacePins.push(solveInterfacePinCoords(floorFootprints[0], floorFootprints[0], bossBoyutMm));
  // Arayüz k: Kat k -> Kat k+1
  for (let k = 0; k < katSayisi - 1; k++) {
    interfacePins.push(solveInterfacePinCoords(floorFootprints[k], floorFootprints[k + 1], bossBoyutMm));
  }

  // 5. Kademeli Vaziyet Bazası İnşası (00_Ozel_Vaziyet_Bazasi)
  const bazaKademeYukseklikMm = clamp(Math.max(minWallMm * 1.6, 2.2), 1.8, 4.5);
  const bazaAdimMarjMm = clamp(Math.max(enMm, boyMm) * 0.055, Math.max(3.2, minWallMm * 2.5), 14.0);
  const bazaUstEnMm = enMm + 2 * bazaAdimMarjMm;
  const bazaUstBoyMm = boyMm + 2 * bazaAdimMarjMm;
  const bazaToplamEnMm = bazaUstEnMm + 4 * bazaAdimMarjMm;
  const bazaToplamBoyMm = bazaUstBoyMm + 4 * bazaAdimMarjMm;
  const bazaToplamYukseklikMm = bazaKademeYukseklikMm * 3;

  const plinthParts = [];
  for (let i = 0; i < 3; i++) {
    const expand = (2 - i) * 2 * bazaAdimMarjMm;
    const w = bazaUstEnMm + expand;
    const d = bazaUstBoyMm + expand;
    const box = new THREE.BoxGeometry(w, bazaKademeYukseklikMm, d);
    box.translate(0, (i + 0.5) * bazaKademeYukseklikMm, 0);
    plinthParts.push(stripToPosNormal(box));
  }
  // Ön yönlendirme plakası
  const idxW = clamp(enMm * 0.22, minWallMm * 3, 24);
  const idxD = Math.max(minWallMm, 1.4);
  const plaque = new THREE.BoxGeometry(idxW, bazaKademeYukseklikMm * 0.75, idxD);
  plaque.translate(0, bazaKademeYukseklikMm * 0.375, bazaToplamBoyMm * 0.5 + idxD * 0.5);
  plinthParts.push(stripToPosNormal(plaque));

  // Baza üstü 4× Erkek Pim (Arayüz 0 ile birebir eşleşir)
  const rPin = pimCapMm * 0.5;
  const chamH = Math.min(0.45, pimYukseklikMm * 0.24);
  const bodyH = Math.max(0.2, pimYukseklikMm - chamH);
  for (const pt of interfacePins[0]) {
    const body = new THREE.CylinderGeometry(rPin, rPin, bodyH, 24);
    body.translate(pt.x, bazaToplamYukseklikMm + bodyH * 0.5, pt.z);
    plinthParts.push(stripToPosNormal(body));
    if (chamH > 0.05) {
      const tip = new THREE.CylinderGeometry(Math.max(rPin * 0.72, rPin - chamH), rPin, chamH, 24);
      tip.translate(pt.x, bazaToplamYukseklikMm + bodyH + chamH * 0.5, pt.z);
      plinthParts.push(stripToPosNormal(tip));
    }
  }
  const plinthGeom = BufferGeometryUtils.mergeGeometries(plinthParts, false);
  plinthGeom.computeBoundingBox();
  plinthGeom.computeBoundingSphere();

  const tiers = [];
  const allDisposableGeoms = [plinthGeom];

  tiers.push({
    index: 0,
    code: '00_Ozel_Vaziyet_Bazasi',
    stlFileName: `00_Ozel_Vaziyet_Bazasi_1-${scale}.stl`,
    titleTr: '00 · Kademeli Vaziyet Bazası (Özel Model)',
    role: 'plinth',
    assembledY: 0,
    heightMm: bazaToplamYukseklikMm,
    sliceWidthMm: bazaToplamEnMm,
    geometry: plinthGeom,
    metrology: computeMeshMetrology(plinthGeom),
    topPinCoords: interfacePins[0],
    pinNote: `Üstte 4× Erkek Pim (Ø${pimCapMm.toFixed(2)}mm)`
  });

  // 6. Her Kat İçin Gerçek 3B Model Kesimi + DFM Taban/Cidar + Pim/Yuva Birleşimi
  for (let k = 0; k < katSayisi; k++) {
    const floorNum = k + 1;
    const y0 = k * katYukseklikMm;
    const y1 = (k + 1) * katYukseklikMm;
    const bottomPins = interfacePins[k];
    const topPins = k < katSayisi - 1 ? interfacePins[k + 1] : [];

    const slicedShell = sliceMeshBand(posAttr, y0, y1, bottomPins, yuvaCapMm * 0.52, yuvaDerinlikMm);
    const dfmTrayParts = makeDfmFloorTrayAndPins(
      floorFootprints[k],
      katYukseklikMm,
      duvarMm,
      dosemeMm,
      bottomPins,
      topPins,
      pimCapMm,
      yuvaCapMm,
      bossBoyutMm,
      pimYukseklikMm,
      yuvaDerinlikMm
    );

    const combinedParts = slicedShell ? [slicedShell, ...dfmTrayParts] : dfmTrayParts;
    const tierGeom = BufferGeometryUtils.mergeGeometries(combinedParts, false);
    tierGeom.computeBoundingBox();
    tierGeom.computeBoundingSphere();
    allDisposableGeoms.push(tierGeom);

    const pad = String(floorNum).padStart(2, '0');
    const isTop = k === katSayisi - 1;
    const isGround = k === 0;
    const role = isGround ? 'ground' : isTop ? 'roof' : 'typical';

    tiers.push({
      index: floorNum,
      floorNumber: floorNum,
      code: `${pad}_Ozel_Kat_${floorNum}`,
      stlFileName: `${pad}_Ozel_Model_Kat_${floorNum}_1-${scale}.stl`,
      titleTr: isGround
        ? `${pad} · Özel Model Zemin Kat`
        : isTop
        ? `${pad} · Özel Model Son Kat & Çatı`
        : `${pad} · Özel Model ${floorNum}. Kat`,
      role,
      assembledY: bazaToplamYukseklikMm + y0,
      heightMm: katYukseklikMm,
      sliceWidthMm: floorFootprints[k].widthX,
      geometry: tierGeom,
      metrology: computeMeshMetrology(tierGeom),
      topPinCoords: topPins,
      pinNote: isTop
        ? `Altta 4× Yuva (Ø${yuvaCapMm.toFixed(2)}mm) · Üst Çatı Katmanı`
        : `Altta 4× Yuva (Ø${yuvaCapMm.toFixed(2)}) · Üstte 4× Pim (Ø${pimCapMm.toFixed(2)})`
    });
  }

  workGeom.dispose();

  const toplamMaketYukseklikMm = bazaToplamYukseklikMm + binaGovdeYukseklikMm;
  const perimeterCount = Math.floor((duvarMm + 1e-6) / nozzleMm);
  const maxFootprintMm = Math.max(bazaToplamEnMm, bazaToplamBoyMm);
  const bedStatus =
    maxFootprintMm <= 256
      ? { ok: true, label: 'ÖZEL MODEL: 256×256MM TABLAYA UYGUN' }
      : maxFootprintMm <= 350
      ? { ok: true, label: 'ÖZEL MODEL: 350×350MM TABLAYA UYGUN' }
      : { ok: false, label: '350MM ÜSTÜ — ÖLÇEK KÜÇÜLTME (ÖRN. 1:200 / 1:500) ÖNERİLİR' };

  const primaryPins = interfacePins[0];
  const pinOffsetX = Math.abs(primaryPins[1].x - primaryPins[0].x) * 0.5;
  const pinOffsetZ = Math.abs(primaryPins[0].z - primaryPins[3].z) * 0.5;

  const spec = {
    isCustomModel: true,
    customFileName: customData.fileName,
    detectedUnitLabel,
    customContour2D: floorFootprints[0].contour,

    scale,
    scaleLabel: `1:${scale}`,
    binaEnM: realEnM,
    binaBoyM: realBoyM,
    gercekToplamYukseklikM: realYukseklikM,
    katSayisi,
    katYuksekligiM: realYukseklikM / katSayisi,
    balkonCikmaM: 0,
    pencereYuzde: Number(rawParams.Pencere_Orani_Yuzde) || 45,
    minWallMm,
    pimTolMm,
    nozzleMm,
    perimeterCount,

    enMm,
    boyMm,
    hamKatYukseklikMm: katYukseklikMm,
    katYukseklikMm,

    hamDuvarMm,
    duvarMm,
    duvarClamped,
    hamDosemeMm,
    dosemeMm,
    dosemeClamped,
    hamParapetMm,
    parapetMm,
    parapetClamped,
    parapetYukseklikMm: Math.max(minWallMm * 1.5, 2.0),

    balkonMod: 'YOK',
    balkonCikmaMm: 0,
    balkonGenislikX: 0,

    pimCapMm,
    yuvaCapMm,
    bossBoyutMm,
    pimYukseklikMm,
    yuvaDerinlikMm,
    yuvaZBoslukMm,
    pinOffsetX,
    pinOffsetZ,
    pinCoords: primaryPins,

    baysX: { bayCount: Math.max(1, Math.round(enMm / 18)), pierWidthMm: duvarMm, windows: [] },
    baysZ: { bayCount: Math.max(1, Math.round(boyMm / 18)), pierWidthMm: duvarMm, windows: [] },

    bazaKademeYukseklikMm,
    bazaAdimMarjMm,
    bazaUstEnMm,
    bazaUstBoyMm,
    bazaToplamEnMm,
    bazaToplamBoyMm,
    bazaToplamYukseklikMm,

    catiPlakMm: dosemeMm,
    catiToplamYukseklikMm: katYukseklikMm,
    toplamBinaGovdeYukseklikMm: binaGovdeYukseklikMm,
    toplamMaketYukseklikMm,
    bedStatus
  };

  const totalVolumeMm3 = tiers.reduce((s, t) => s + t.metrology.volumeMm3, 0);
  const totalAreaCm2 = tiers.reduce((s, t) => s + t.metrology.areaCm2, 0);
  const totalTriangles = tiers.reduce((s, t) => s + t.metrology.triangleCount, 0);

  return {
    isCustomModel: true,
    spec,
    tiers,
    disposableGeometries: allDisposableGeoms,
    totals: {
      tierCount: tiers.length,
      volumeMm3: totalVolumeMm3,
      volCm3: totalVolumeMm3 / 1000.0,
      areaCm2: totalAreaCm2,
      triangleCount: totalTriangles,
      bboxMm: {
        x: bazaToplamEnMm,
        y: toplamMaketYukseklikMm,
        z: bazaToplamBoyMm
      }
    },
    buildMs: performance.now() - t0
  };
}
