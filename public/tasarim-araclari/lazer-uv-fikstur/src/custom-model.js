import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const INF = 1e12;

/**
 * 1D Parabol Zarfı ile Kesin Karesel Öklid Mesafe Dönüşümü — Felzenszwalb & Huttenlocher O(N)
 */
function edt1d(f, d, v, z, n) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = +INF;

  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = +INF;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dx = q - v[k];
    d[q] = dx * dx + f[v[k]];
  }
}

/**
 * 2B İkili Maskeden İşaretli Öklid Mesafe Alanı (Signed Distance Field - mm cinsinden) Üretir.
 * sdf < 0: Model içi | sdf == 0: Tam model sınırı | sdf > 0: Model dışı (mm uzaklık)
 */
function buildSignedDistanceField2D(solidMask, gw, gh, cellMm) {
  const size = gw * gh;
  const outsideD2 = new Float64Array(size);
  const insideD2 = new Float64Array(size);

  for (let i = 0; i < size; i++) {
    outsideD2[i] = solidMask[i] ? 0 : INF;
    insideD2[i] = solidMask[i] ? INF : 0;
  }

  const maxDim = Math.max(gw, gh);
  const f = new Float64Array(maxDim);
  const d = new Float64Array(maxDim);
  const v = new Int32Array(maxDim);
  const z = new Float64Array(maxDim + 1);

  const run2D = (grid) => {
    // Sütunlar boyunca 1B EDT
    for (let x = 0; x < gw; x++) {
      for (let y = 0; y < gh; y++) f[y] = grid[y * gw + x];
      edt1d(f, d, v, z, gh);
      for (let y = 0; y < gh; y++) grid[y * gw + x] = d[y];
    }
    // Satırlar boyunca 1B EDT
    for (let y = 0; y < gh; y++) {
      const rowOff = y * gw;
      for (let x = 0; x < gw; x++) f[x] = grid[rowOff + x];
      edt1d(f, d, v, z, gw);
      for (let x = 0; x < gw; x++) grid[rowOff + x] = d[x];
    }
  };

  run2D(outsideD2);
  run2D(insideD2);

  const sdf = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    if (solidMask[i]) {
      // Hücre merkezi düzeltmesi (+0.5 hücre)
      sdf[i] = -Math.max(0, Math.sqrt(insideD2[i]) - 0.5) * cellMm;
    } else {
      sdf[i] = Math.max(0, Math.sqrt(outsideD2[i]) - 0.5) * cellMm;
    }
  }
  return sdf;
}

/**
 * (0,0) dış çerçevesinden 4-komşuluklu BFS taşkın doldurma (Flood Fill) çalıştırarak
 * modelin iç deliklerini (örn. anahtarlık halkası deliği) kapatır ve tek parçalı dış silüet elde eder.
 */
function fillInteriorHoles(rawMask, gw, gh) {
  const size = gw * gh;
  const exterior = new Uint8Array(size);
  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;

  const pushIfEmpty = (idx) => {
    if (!exterior[idx] && !rawMask[idx]) {
      exterior[idx] = 1;
      queue[tail++] = idx;
    }
  };

  // Dış sınır piksellerini kuyruğa ekle
  for (let x = 0; x < gw; x++) {
    pushIfEmpty(x);
    pushIfEmpty((gh - 1) * gw + x);
  }
  for (let y = 0; y < gh; y++) {
    pushIfEmpty(y * gw);
    pushIfEmpty(y * gw + (gw - 1));
  }

  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % gw;
    const cy = (cur - cx) / gw;
    if (cx > 0) pushIfEmpty(cur - 1);
    if (cx + 1 < gw) pushIfEmpty(cur + 1);
    if (cy > 0) pushIfEmpty(cur - gw);
    if (cy + 1 < gh) pushIfEmpty(cur + gw);
  }

  const filled = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    filled[i] = exterior[i] ? 0 : 1;
  }
  return filled;
}

/**
 * 1 piksellik morfolojik kapama (dilate + erode) ile mikro üçgen derzlerini birleştirir.
 */
function morphClose1Px(mask, gw, gh) {
  const dilated = new Uint8Array(gw * gh);
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const idx = y * gw + x;
      if (
        mask[idx] ||
        mask[idx - 1] ||
        mask[idx + 1] ||
        mask[idx - gw] ||
        mask[idx + gw]
      ) {
        dilated[idx] = 1;
      }
    }
  }
  const closed = new Uint8Array(gw * gh);
  for (let y = 1; y < gh - 1; y++) {
    for (let x = 1; x < gw - 1; x++) {
      const idx = y * gw + x;
      if (
        dilated[idx] &&
        dilated[idx - 1] &&
        dilated[idx + 1] &&
        dilated[idx - gw] &&
        dilated[idx + gw]
      ) {
        closed[idx] = 1;
      }
    }
  }
  return closed;
}

/**
 * CAD koordinatlarındaki (X, Y merkezli, Z>=0 tabanlı) 3B geometrinin tüm üçgenlerini
 * yüksek çözünürlüklü 2B ızgaraya izdüşürür ve önbellekli SDF (Signed Distance Field) oluşturur.
 */
export function precomputeModelSilhouetteSDF(cadGeometry, sizeX, sizeY) {
  const padMm = Math.max(20, Math.max(sizeX, sizeY) * 0.28);
  const spanX = sizeX + padMm * 2;
  const spanY = sizeY + padMm * 2;
  const maxSpan = Math.max(spanX, spanY);

  const targetRes = 200;
  const cellMm = maxSpan / targetRes;
  const gw = Math.max(48, Math.ceil(spanX / cellMm));
  const gh = Math.max(48, Math.ceil(spanY / cellMm));

  const minX = -gw * cellMm * 0.5;
  const minY = -gh * cellMm * 0.5;

  const rawMask = new Uint8Array(gw * gh);
  const pos = cadGeometry.attributes.position;
  const index = cadGeometry.index;
  const triCount = index ? index.count / 3 : pos.count / 3;

  const bloat = cellMm * 0.42;

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

    const ax = pos.getX(i0), ay = pos.getY(i0);
    const bx = pos.getX(i1), by = pos.getY(i1);
    const cx = pos.getX(i2), cy = pos.getY(i2);

    const tMinX = Math.min(ax, bx, cx) - bloat;
    const tMaxX = Math.max(ax, bx, cx) + bloat;
    const tMinY = Math.min(ay, by, cy) - bloat;
    const tMaxY = Math.max(ay, by, cy) + bloat;

    const gx0 = Math.max(2, Math.floor((tMinX - minX) / cellMm));
    const gx1 = Math.min(gw - 3, Math.ceil((tMaxX - minX) / cellMm));
    const gy0 = Math.max(2, Math.floor((tMinY - minY) / cellMm));
    const gy1 = Math.min(gh - 3, Math.ceil((tMaxY - minY) / cellMm));

    // İki yönlü kenar testi + dejenere (dik duvar) üçgenler için doğru parçası mesafesi
    const area2 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const isDegenerate = Math.abs(area2) < 1e-5;

    for (let gy = gy0; gy <= gy1; gy++) {
      const py = minY + (gy + 0.5) * cellMm;
      const rowOff = gy * gw;
      for (let gx = gx0; gx <= gx1; gx++) {
        if (rawMask[rowOff + gx]) continue;
        const px = minX + (gx + 0.5) * cellMm;

        if (!isDegenerate) {
          const s = area2 > 0 ? 1 : -1;
          const e0 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) * s;
          const e1 = ((cx - bx) * (py - by) - (cy - by) * (px - bx)) * s;
          const e2 = ((ax - cx) * (py - cy) - (ay - cy) * (px - cx)) * s;
          const tol = -bloat * Math.hypot(bx - ax, by - ay) * 0.5;
          if (e0 >= tol && e1 >= tol && e2 >= tol) {
            rawMask[rowOff + gx] = 1;
            continue;
          }
        }
        // Dik duvar üçgenleri için kenar yakınlığı kontrolü
        if (
          distToSegSq(px, py, ax, ay, bx, by) <= bloat * bloat ||
          distToSegSq(px, py, bx, by, cx, cy) <= bloat * bloat ||
          distToSegSq(px, py, cx, cy, ax, ay) <= bloat * bloat
        ) {
          rawMask[rowOff + gx] = 1;
        }
      }
    }
  }

  // Güvenlik: Eğer geometri çok ince çizgisel ise en azından merkez zarfı doldur
  let anySolid = false;
  for (let i = 0; i < rawMask.length; i++) {
    if (rawMask[i]) { anySolid = true; break; }
  }
  if (!anySolid) {
    for (let gy = 2; gy < gh - 2; gy++) {
      const py = minY + (gy + 0.5) * cellMm;
      for (let gx = 2; gx <= gw - 3; gx++) {
        const px = minX + (gx + 0.5) * cellMm;
        if (Math.abs(px) <= sizeX * 0.5 && Math.abs(py) <= sizeY * 0.5) {
          rawMask[gy * gw + gx] = 1;
        }
      }
    }
  }

  const closedMask = morphClose1Px(rawMask, gw, gh);
  const solidMask = fillInteriorHoles(closedMask, gw, gh);
  const sdf = buildSignedDistanceField2D(solidMask, gw, gh, cellMm);

  // Alt (-Y) kenardaki en uygun parmak alma oyuğu merkez noktasını bul
  let scoopAnchorX = 0;
  let scoopAnchorY = -sizeY * 0.5;
  let bestScore = INF;
  for (let gy = 1; gy < gh - 1; gy++) {
    const py = minY + (gy + 0.5) * cellMm;
    for (let gx = 1; gx < gw - 1; gx++) {
      if (!solidMask[gy * gw + gx]) continue;
      if (!solidMask[(gy - 1) * gw + gx]) {
        const px = minX + (gx + 0.5) * cellMm;
        // Hem -Y'de aşağıda hem de X=0 merkezine yakın noktayı tercih et
        const score = py + Math.abs(px) * 0.35;
        if (score < bestScore) {
          bestScore = score;
          scoopAnchorX = px;
          scoopAnchorY = py;
        }
      }
    }
  }

  return {
    sdf,
    gw,
    gh,
    cellMm,
    minX,
    minY,
    sizeX,
    sizeY,
    scoopAnchorX,
    scoopAnchorY
  };
}

function distToSegSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-8) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return (px - qx) * (px - qx) + (py - qy) * (py - qy);
}

/**
 * Yumuşak Birleşim (Smooth Min — R=1.2mm CNC köşe radyüsü geçişi)
 */
function smin(a, b, k = 1.2) {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/**
 * Önbellekli 2B SDF üzerinden istenen +Boşluk Ofseti (offsetRadiusMm) ve
 * ergonomik Parmak Alma Oyuğu birleşimini hesaplayıp, kesin N noktalı, kendi kendini kesmeyen
 * CCW (saat yönü tersi) kapalı `THREE.Vector2` konturu üretir.
 */
export function extractCustomCavityLoop2D(sdfData, offsetRadiusMm, scoopRadiusMm = 0, numPoints = 96) {
  const { sdf, gw, gh, cellMm, minX, minY, scoopAnchorX, scoopAnchorY } = sdfData;
  const size = gw * gh;
  const field = new Float32Array(size);
  const rawInside = new Uint8Array(size);

  const hasScoop = scoopRadiusMm > 0.2;

  for (let gy = 0; gy < gh; gy++) {
    const py = minY + (gy + 0.5) * cellMm;
    const rowOff = gy * gw;
    for (let gx = 0; gx < gw; gx++) {
      // Dış 2 piksel çerçeveyi daima açık hava (dış ortam) tut
      if (gx < 2 || gx >= gw - 2 || gy < 2 || gy >= gh - 2) {
        field[rowOff + gx] = 10.0;
        continue;
      }
      const dModel = sdf[rowOff + gx] - offsetRadiusMm;
      let val = dModel;
      if (hasScoop) {
        const px = minX + (gx + 0.5) * cellMm;
        const dScoop = Math.hypot(px - scoopAnchorX, py - scoopAnchorY) - scoopRadiusMm;
        val = smin(dModel, dScoop, 1.35);
      }
      field[rowOff + gx] = val;
      if (val <= 0) rawInside[rowOff + gx] = 1;
    }
  }

  // Olası iç hava adacıklarını birleştirerek tek bağlantılı (simply-connected) bölgeyi garanti et
  const inside = fillInteriorHoles(rawInside, gw, gh);

  // Yönlü ızgara kenarı takibi (Directed Grid Boundary Walk) ile garantili tek kapalı basit döngü!
  // Köşe indeksleri: (vx, vy) in [0..gw] x [0..gh]
  let startGx = -1;
  let startGy = -1;
  outerSearch: for (let gy = 1; gy < gh - 1; gy++) {
    for (let gx = 1; gx < gw - 1; gx++) {
      if (inside[gy * gw + gx] && !inside[(gy - 1) * gw + gx]) {
        startGx = gx;
        startGy = gy;
        break outerSearch;
      }
    }
  }

  if (startGx < 0) {
    // Emniyet geri dönüşü: daire
    const pts = [];
    for (let i = 0; i < numPoints; i++) {
      const a = (i / numPoints) * Math.PI * 2;
      pts.push(new THREE.Vector2(Math.cos(a) * 10, Math.sin(a) * 10));
    }
    return pts;
  }

  // CCW sınır yürüyüşü: Başlangıç alt kenar (startGx, startGy) -> (startGx + 1, startGy), yön = Doğu (dir=0)
  // dir: 0 = +X (Doğu), 1 = +Y (Kuzey), 2 = -X (Batı), 3 = -Y (Güney)
  const dxDir = [1, 0, -1, 0];
  const dyDir = [0, 1, 0, -1];
  const isCellInside = (cx, cy) => cx >= 0 && cx < gw && cy >= 0 && cy < gh && inside[cy * gw + cx] === 1;

  // Verilen köşe (vx, vy) ve yön d için sol ve sağ hücre koordinatları:
  // d=0 (+X): sol=(vx, vy), sağ=(vx, vy-1)
  // d=1 (+Y): sol=(vx-1, vy), sağ=(vx, vy)
  // d=2 (-X): sol=(vx-1, vy-1), sağ=(vx-1, vy)
  // d=3 (-Y): sol=(vx, vy-1), sağ=(vx-1, vy-1)
  const leftCell = (vx, vy, d) => {
    if (d === 0) return isCellInside(vx, vy);
    if (d === 1) return isCellInside(vx - 1, vy);
    if (d === 2) return isCellInside(vx - 1, vy - 1);
    return isCellInside(vx, vy - 1);
  };
  const rightCell = (vx, vy, d) => {
    if (d === 0) return isCellInside(vx, vy - 1);
    if (d === 1) return isCellInside(vx, vy);
    if (d === 2) return isCellInside(vx - 1, vy);
    return isCellInside(vx - 1, vy - 1);
  };

  const rawLoop = [];
  let vx = startGx;
  let vy = startGy;
  let dir = 0;
  const maxSteps = gw * gh * 2;

  for (let step = 0; step < maxSteps; step++) {
    rawLoop.push({ x: minX + vx * cellMm, y: minY + vy * cellMm });
    vx += dxDir[dir];
    vy += dyDir[dir];

    if (vx === startGx && vy === startGy) break;

    // Sol-duvar takip kuralı: Önce sola dönmeyi (CCW, dir+1), sonra düz (dir), sonra sağa (dir+3) dene
    // Böylece dama tahtası (saddle) köşelerinde iç bölge teğet kalır ve döngü asla kendini kesmez!
    const tryOrder = [(dir + 1) & 3, dir, (dir + 3) & 3, (dir + 2) & 3];
    for (const nd of tryOrder) {
      if (leftCell(vx, vy, nd) && !rightCell(vx, vy, nd)) {
        dir = nd;
        break;
      }
    }
  }

  // 1. Merdiven basamaklarını yumuşatma (Laplacian ön yumuşatma)
  let pts = rawLoop;
  for (let pass = 0; pass < 3; pass++) {
    const nextPts = new Array(pts.length);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const pPrev = pts[(i - 1 + n) % n];
      const pCurr = pts[i];
      const pNext = pts[(i + 1) % n];
      nextPts[i] = {
        x: 0.25 * pPrev.x + 0.5 * pCurr.x + 0.25 * pNext.x,
        y: 0.25 * pPrev.y + 0.5 * pCurr.y + 0.25 * pNext.y
      };
    }
    pts = nextPts;
  }

  // 2. Sürekli SDF sıfır seviyesine (field == 0) alt-piksel (sub-pixel) projeksiyon
  const sampleField = (wx, wy) => {
    const fx = clamp((wx - minX) / cellMm - 0.5, 0, gw - 1.001);
    const fy = clamp((wy - minY) / cellMm - 0.5, 0, gh - 1.001);
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const v00 = field[iy * gw + ix];
    const v10 = field[iy * gw + ix + 1];
    const v01 = field[(iy + 1) * gw + ix];
    const v11 = field[(iy + 1) * gw + ix + 1];
    return (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
  };

  const eps = cellMm * 0.5;
  const maxSnap = cellMm * 0.55;
  for (let iter = 0; iter < 2; iter++) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const val = sampleField(p.x, p.y);
      const gxGrad = (sampleField(p.x + eps, p.y) - sampleField(p.x - eps, p.y)) / (2 * eps);
      const gyGrad = (sampleField(p.x, p.y + eps) - sampleField(p.x, p.y - eps)) / (2 * eps);
      const gLen = Math.hypot(gxGrad, gyGrad);
      if (gLen > 1e-4) {
        const step = clamp(-val / gLen, -maxSnap, maxSnap);
        p.x += (gxGrad / gLen) * step;
        p.y += (gyGrad / gLen) * step;
      }
    }
  }

  // Son 1 hafif pürüzsüzleştirme geçişi
  {
    const n = pts.length;
    const smooth = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n];
      const b = pts[i];
      const c = pts[(i + 1) % n];
      smooth[i] = {
        x: 0.2 * a.x + 0.6 * b.x + 0.2 * c.x,
        y: 0.2 * a.y + 0.6 * b.y + 0.2 * c.y
      };
    }
    pts = smooth;
  }

  // CCW yönünü doğrula (işaretli alan > 0 olmalı)
  let signedArea2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % pts.length];
    signedArea2 += p0.x * p1.y - p1.x * p0.y;
  }
  if (signedArea2 < 0) pts.reverse();

  // Tüm Z halkalarında burulmasız (twist-free) hizalama için başlangıç noktasını Kuzey (+Y, 90°) kutbuna sabitle
  let startIdx = 0;
  let bestAngleDiff = INF;
  for (let i = 0; i < pts.length; i++) {
    const ang = Math.atan2(pts[i].y, pts[i].x);
    const diff = Math.abs(ang - Math.PI * 0.5);
    if (diff < bestAngleDiff) {
      bestAngleDiff = diff;
      startIdx = i;
    }
  }
  if (startIdx > 0) {
    pts = [...pts.slice(startIdx), ...pts.slice(0, startIdx)];
  }

  // Eşit yay uzunluğu (Uniform Arc-Length) ile tam `numPoints` köşeye örnekle
  const n = pts.length;
  const cumLen = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    cumLen[i + 1] = cumLen[i] + Math.hypot(b.x - a.x, b.y - a.y);
  }
  const totalPerim = cumLen[n] || 1;

  const resampled = [];
  let segIdx = 0;
  for (let k = 0; k < numPoints; k++) {
    const targetD = (k / numPoints) * totalPerim;
    while (segIdx < n - 1 && cumLen[segIdx + 1] < targetD) segIdx++;
    const segStart = cumLen[segIdx];
    const segLen = Math.max(1e-6, cumLen[segIdx + 1] - segStart);
    const t = clamp((targetD - segStart) / segLen, 0, 1);
    const A = pts[segIdx];
    const B = pts[(segIdx + 1) % n];
    resampled.push(new THREE.Vector2(A.x + (B.x - A.x) * t, A.y + (B.y - A.y) * t));
  }

  return resampled;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Ham BufferGeometry üzerinde döndürme, birim ölçekleme ve merkezleme uygulayarak
 * CAD koordinatlarında (X, Y merkezli, Z=0 tabanlı) kullanıma hazır model verisini oluşturur.
 */
export function buildNormalizedCustomModelState(rawRecord, transform = {}) {
  const rotXDeg = Number(transform.rotXDeg) || 0;
  const rotYDeg = Number(transform.rotYDeg) || 0;
  const rotZDeg = Number(transform.rotZDeg) || 0;
  const unitScale = Number(transform.unitScale) || 1.0;
  const customScaleXY = Number(transform.customScaleXY) || 1.0;

  const cadGeo = rawRecord.rawCadGeometry.clone();

  // Euler döndürme (CAD X, Y, Z etrafında)
  const euler = new THREE.Euler(
    THREE.MathUtils.degToRad(rotXDeg),
    THREE.MathUtils.degToRad(rotYDeg),
    THREE.MathUtils.degToRad(rotZDeg),
    'XYZ'
  );
  const rotMat = new THREE.Matrix4().makeRotationFromEuler(euler);
  cadGeo.applyMatrix4(rotMat);

  // Birim ölçeği uygula
  cadGeo.scale(unitScale * customScaleXY, unitScale * customScaleXY, unitScale);
  cadGeo.computeBoundingBox();

  const bb = cadGeo.boundingBox;
  const cx = (bb.min.x + bb.max.x) * 0.5;
  const cy = (bb.min.y + bb.max.y) * 0.5;
  const minZ = bb.min.z;

  // XY merkezini (0,0)'a, alt tabanı Z=0'a oturt
  cadGeo.translate(-cx, -cy, -minZ);
  cadGeo.computeBoundingBox();
  cadGeo.computeVertexNormals();

  const sizeX = Math.max(1.0, cadGeo.boundingBox.max.x - cadGeo.boundingBox.min.x);
  const sizeY = Math.max(1.0, cadGeo.boundingBox.max.y - cadGeo.boundingBox.min.y);
  const sizeZ = Math.max(0.4, cadGeo.boundingBox.max.z - cadGeo.boundingBox.min.z);

  // Three.js sahne gösterimi için dönüştürülmüş geometri: (X_cad, Y_cad, Z_cad) -> (X_cad, Z_cad, -Y_cad)
  const viewGeo = cadGeo.clone();
  const pos = viewGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    pos.setXYZ(i, x, z, -y);
  }
  viewGeo.computeVertexNormals();

  // 2B İşaretli Mesafe Alanı (SDF) ve 1:1 Net Ürün Silüeti (C01 katmanı için)
  const sdfData = precomputeModelSilhouetteSDF(cadGeo, sizeX, sizeY);
  const zeroProductSilhouette2D = extractCustomCavityLoop2D(sdfData, 0.0, 0.0, 96);

  const posCount = cadGeo.attributes.position.count;
  const triCount = cadGeo.index ? cadGeo.index.count / 3 : Math.floor(posCount / 3);

  return {
    fileName: rawRecord.fileName,
    fileFormat: rawRecord.fileFormat,
    rawRecord,
    rotXDeg,
    rotYDeg,
    rotZDeg,
    unitScale,
    customScaleXY,
    sizeX: Math.round(sizeX * 100) / 100,
    sizeY: Math.round(sizeY * 100) / 100,
    sizeZ: Math.round(sizeZ * 100) / 100,
    triangleCount: triCount,
    cadGeometry: cadGeo,
    viewGeometry: viewGeo,
    sdfData,
    zeroProductSilhouette2D
  };
}

/**
 * Bir Object3D hiyerarşisindeki tüm Mesh geometrilerini tek bir BufferGeometry halinde birleştirir.
 */
function extractMergedGeometryFromObject3D(rootObj, convertYUpToZUp = true) {
  rootObj.updateMatrixWorld(true);
  const geos = [];
  rootObj.traverse((child) => {
    if (child.isMesh && child.geometry) {
      let g = child.geometry.clone();
      g.applyMatrix4(child.matrixWorld);
      if (g.index) g = g.toNonIndexed();
      // Sadece position niteliğini tutarak farklı nitelik (uv/color) uyumsuzluklarını önle
      const clean = new THREE.BufferGeometry();
      clean.setAttribute('position', g.attributes.position.clone());
      geos.push(clean);
    }
  });

  if (!geos.length) {
    throw new Error('Dosya içinde geçerli bir 3B yüzey (Mesh) bulunamadı.');
  }

  const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  if (convertYUpToZUp) {
    // GLB / OBJ standart Y-Yukarı sistemini CAD Z-Yukarı (X, -Z, Y) sistemine çevir
    const p = merged.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      p.setXYZ(i, x, -z, y);
    }
  }
  merged.computeBoundingBox();
  return merged;
}

/**
 * Otomatik birim ölçeği tahmini (Blender metre cinsinden 0.06m ihraç ettiyse -> ×1000 mm)
 */
function detectRecommendedUnitScale(geo) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const maxSpan = Math.max(
    bb.max.x - bb.min.x,
    bb.max.y - bb.min.y,
    bb.max.z - bb.min.z
  );
  if (maxSpan > 0 && maxSpan < 0.65) return 1000; // Metre -> mm
  if (maxSpan >= 0.65 && maxSpan < 4.5) return 10; // Santimetre -> mm
  return 1; // Doğrudan 1:1 mm
}

/**
 * Kullanıcının seçtiği veya sürükleyip bıraktığı (.STL, .OBJ, .GLB, .GLTF, .SVG) dosyayı okur.
 */
export async function parseUploadedModelFile(file, defaultThicknessMm = 2.5) {
  const name = file.name || 'ozel_model.stl';
  const ext = name.split('.').pop().toLowerCase();
  const arrayBuf = await file.arrayBuffer();

  let rawCadGeometry = null;
  let fileFormat = ext.toUpperCase();

  if (ext === 'stl') {
    const loader = new STLLoader();
    let g = loader.parse(arrayBuf);
    if (g.index) g = g.toNonIndexed();
    const clean = new THREE.BufferGeometry();
    clean.setAttribute('position', g.attributes.position.clone());
    clean.computeBoundingBox();
    rawCadGeometry = clean;
  } else if (ext === 'obj') {
    const text = new TextDecoder('utf-8').decode(arrayBuf);
    const loader = new OBJLoader();
    const obj = loader.parse(text);
    rawCadGeometry = extractMergedGeometryFromObject3D(obj, true);
  } else if (ext === 'glb' || ext === 'gltf') {
    const loader = new GLTFLoader();
    const gltf = await new Promise((resolve, reject) => {
      loader.parse(arrayBuf, '', resolve, reject);
    });
    rawCadGeometry = extractMergedGeometryFromObject3D(gltf.scene, true);
  } else if (ext === 'svg') {
    const text = new TextDecoder('utf-8').decode(arrayBuf);
    const loader = new SVGLoader();
    const svgData = loader.parse(text);
    const shapes = [];
    for (const path of svgData.paths) {
      const pathShapes = SVGLoader.createShapes(path);
      for (const s of pathShapes) shapes.push(s);
    }
    if (!shapes.length) {
      throw new Error('SVG dosyasında kapalı 2B profil yolu bulunamadı.');
    }
    const extrudeGeos = shapes.map((sh) => {
      let eg = new THREE.ExtrudeGeometry(sh, {
        depth: Math.max(0.8, defaultThicknessMm),
        bevelEnabled: false,
        curveSegments: 24
      });
      if (eg.index) eg = eg.toNonIndexed();
      const clean = new THREE.BufferGeometry();
      clean.setAttribute('position', eg.attributes.position.clone());
      return clean;
    });
    rawCadGeometry = extrudeGeos.length === 1 ? extrudeGeos[0] : mergeGeometries(extrudeGeos, false);
    // SVG Y ekseni aşağı bakar -> CAD +Y yukarı çevir
    rawCadGeometry.scale(1, -1, 1);
    // Yüzey sarım yönünü düzelt
    const pos = rawCadGeometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      const bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1);
      pos.setXYZ(i + 1, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      pos.setXYZ(i + 2, bx, by, bz);
    }
    rawCadGeometry.computeBoundingBox();
  } else {
    throw new Error(`Desteklenmeyen dosya uzantısı (.${ext}). Lütfen .STL, .OBJ, .GLB, .GLTF veya .SVG yükleyin.`);
  }

  const autoScale = ext === 'svg' ? 1 : detectRecommendedUnitScale(rawCadGeometry);
  const rawRecord = { fileName: name, fileFormat, rawCadGeometry };
  return buildNormalizedCustomModelState(rawRecord, {
    rotXDeg: 0,
    rotYDeg: 0,
    rotZDeg: 0,
    unitScale: autoScale,
    customScaleXY: 1.0
  });
}

/**
 * Tek tıkla test için yerleşik Asimetrik Özel 3D Parça Üretici (Damla / Armut Tipi NFC Akıllı Anahtarlık).
 */
export function createDemoCustomKeychainModel() {
  const shape = new THREE.Shape();
  // Alt geniş gövde (R=19mm) + üst daralan boyun (R=9mm), toplam boy ~64mm, en ~38mm
  const rBot = 19;
  const rTop = 9.5;
  const cyTop = 25;
  const cyBot = -9;

  // Sağ yan teğet geçişi + üst yay + sol yan + alt yay
  const segs = 32;
  for (let i = 0; i <= segs; i++) {
    const a = -Math.PI * 0.15 + (i / segs) * (Math.PI * 1.3);
    shape.lineTo(Math.cos(a) * rTop, cyTop + Math.sin(a) * rTop);
  }
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI * 0.85 + (i / segs) * (Math.PI * 1.3);
    shape.lineTo(Math.cos(a) * rBot, cyBot + Math.sin(a) * rBot);
  }
  shape.closePath();

  // Üstte anahtarlık halkası deliği (silüet algoritmasının iç delikleri nasıl akıllıca kapattığını da doğrular!)
  const ringHole = new THREE.Path();
  ringHole.absarc(0, cyTop + 1.5, 3.5, 0, Math.PI * 2, true);
  shape.holes.push(ringHole);

  let geo = new THREE.ExtrudeGeometry(shape, {
    depth: 3.2,
    bevelEnabled: true,
    bevelThickness: 0.4,
    bevelSize: 0.4,
    bevelSegments: 2,
    curveSegments: 32
  });
  if (geo.index) geo = geo.toNonIndexed();
  const clean = new THREE.BufferGeometry();
  clean.setAttribute('position', geo.attributes.position.clone());
  clean.computeBoundingBox();

  const rawRecord = {
    fileName: 'ornek_nfc_anahtarlik.stl',
    fileFormat: 'DEMO STL',
    rawCadGeometry: clean
  };

  return buildNormalizedCustomModelState(rawRecord, {
    rotXDeg: 0,
    rotYDeg: 0,
    rotZDeg: 0,
    unitScale: 1,
    customScaleXY: 1
  });
}
