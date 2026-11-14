import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Material library (density in g/cm³, XY tensile yield strength in MPa, Z-layer ratio, default cost TL/kg)
 */
export const MATERIALS = {
  petg: {
    id: 'petg',
    name: 'PETG (Önerilen Ağır Hizmet)',
    shortName: 'PETG',
    density: 1.27,
    yieldMPa: 50.0,
    zLayerFactor: 0.46,
    modulusGPa: 2.1,
    defaultPriceTL: 680,
    colorHex: 0x242629
  },
  pla_plus: {
    id: 'pla_plus',
    name: 'PLA+ (Yüksek Rijitlik)',
    shortName: 'PLA+',
    density: 1.24,
    yieldMPa: 58.0,
    zLayerFactor: 0.40,
    modulusGPa: 3.1,
    defaultPriceTL: 620,
    colorHex: 0xc8371f
  },
  asa: {
    id: 'asa',
    name: 'ASA / ABS (Isı & UV Dayanımlı)',
    shortName: 'ASA/ABS',
    density: 1.06,
    yieldMPa: 45.0,
    zLayerFactor: 0.44,
    modulusGPa: 2.0,
    defaultPriceTL: 790,
    colorHex: 0x353b41
  },
  pacf: {
    id: 'pacf',
    name: 'PA-CF (Karbon Fiber Naylon)',
    shortName: 'PA12-CF',
    density: 1.18,
    yieldMPa: 86.0,
    zLayerFactor: 0.50,
    modulusGPa: 5.8,
    defaultPriceTL: 1950,
    colorHex: 0x17181a
  },
  alu6061: {
    id: 'alu6061',
    name: 'Alüminyum 6061-T6 (CNC Referans)',
    shortName: 'Al 6061',
    density: 2.70,
    yieldMPa: 240.0,
    zLayerFactor: 1.0,
    modulusGPa: 68.9,
    defaultPriceTL: 450,
    colorHex: 0xa2a8b0
  },
  ss304: {
    id: 'ss304',
    name: 'Paslanmaz Çelik 304 (Referans)',
    shortName: 'AISI 304',
    density: 8.00,
    yieldMPa: 215.0,
    zLayerFactor: 1.0,
    modulusGPa: 193.0,
    defaultPriceTL: 380,
    colorHex: 0xb6bcc2
  }
};

export const DESIGN_STYLES = {
  cift_katli_j_kanca: {
    id: 'cift_katli_j_kanca',
    name: 'Çift Katlı: Üst Kulaklık + Alt J-Kanca (Çanta & Kablo)',
    shortTag: 'ÜST BEŞİK + ALT J-KANCA',
    hasLowerJ: true
  },
  derin_j_kanca: {
    id: 'derin_j_kanca',
    name: 'Masa Altı Derin J-Kanca (Sırt Çantası & Ağır Ekipman)',
    shortTag: 'DERİN ALT J-KANCA',
    hasLowerJ: true
  },
  kafes_truss_cift: {
    id: 'kafes_truss_cift',
    name: 'Endüstriyel Aero-Truss (Kafes Gövdeli Çift İstasyon)',
    shortTag: 'AERO-TRUSS KAFES',
    hasLowerJ: true
  },
  studyo_klasik_pro: {
    id: 'studyo_klasik_pro',
    name: 'Stüdyo Pro: Tekli Üst Kulaklık & Çift Kablo Beşiği',
    shortTag: 'STÜDYO PRO TEKLİ',
    hasLowerJ: false
  }
};

export const PRESETS = {
  cift_j_istasyon: {
    label: '01 / Çift Katlı: Üst Kulaklık + Alt J-Kanca (42mm, Tr16)',
    Tasarim_Stili: 'cift_katli_j_kanca',
    Maks_Masa_Kalinligi_mm: 42,
    Kelepce_Et_Kalinligi_mm: 10,
    Aparat_Eni_mm: 30,
    Ic_Kose_Radyus_mm: 6,
    Basilir_Vida_Capi_mm: 16,
    Dis_Bosluk_Toleransi_mm: 0.25,
    Aski_Kolu_Uzunlugu_mm: 65,
    Alt_J_Derinlik_mm: 58
  },
  derin_canta_j: {
    label: '02 / Masa Altı Derin Çanta & Kablo J-Kancası (45mm, Tr18)',
    Tasarim_Stili: 'derin_j_kanca',
    Maks_Masa_Kalinligi_mm: 45,
    Kelepce_Et_Kalinligi_mm: 11.5,
    Aparat_Eni_mm: 34,
    Ic_Kose_Radyus_mm: 7,
    Basilir_Vida_Capi_mm: 18,
    Dis_Bosluk_Toleransi_mm: 0.25,
    Aski_Kolu_Uzunlugu_mm: 62,
    Alt_J_Derinlik_mm: 72
  },
  aero_truss_agir: {
    label: '03 / Aero-Truss Kafes Çift Ekipman Mengenesi (55mm, Tr20)',
    Tasarim_Stili: 'kafes_truss_cift',
    Maks_Masa_Kalinligi_mm: 55,
    Kelepce_Et_Kalinligi_mm: 12.5,
    Aparat_Eni_mm: 36,
    Ic_Kose_Radyus_mm: 8,
    Basilir_Vida_Capi_mm: 20,
    Dis_Bosluk_Toleransi_mm: 0.25,
    Aski_Kolu_Uzunlugu_mm: 78,
    Alt_J_Derinlik_mm: 66
  },
  standart_studyo: {
    label: '04 / Stüdyo Pro Üst Kulaklık & Kablo Beşiği (42mm, Tr16)',
    Tasarim_Stili: 'studyo_klasik_pro',
    Maks_Masa_Kalinligi_mm: 42,
    Kelepce_Et_Kalinligi_mm: 10,
    Aparat_Eni_mm: 30,
    Ic_Kose_Radyus_mm: 6,
    Basilir_Vida_Capi_mm: 16,
    Dis_Bosluk_Toleransi_mm: 0.25,
    Aski_Kolu_Uzunlugu_mm: 65,
    Alt_J_Derinlik_mm: 55
  },
  ince_masa_kompakt: {
    label: '05 / İnce Masa Kompakt Çift Kanca (22mm Masa, Tr14)',
    Tasarim_Stili: 'cift_katli_j_kanca',
    Maks_Masa_Kalinligi_mm: 22,
    Kelepce_Et_Kalinligi_mm: 8.5,
    Aparat_Eni_mm: 26,
    Ic_Kose_Radyus_mm: 5,
    Basilir_Vida_Capi_mm: 14,
    Dis_Bosluk_Toleransi_mm: 0.20,
    Aski_Kolu_Uzunlugu_mm: 54,
    Alt_J_Derinlik_mm: 46
  }
};

/**
 * Compute derived mechanical, J-hook & 60° support-free trapezoidal thread dimensions.
 * All units strictly in millimeters (1 Three.js world unit = 1 mm).
 */
export function deriveClampDimensions(rawParams) {
  const styleKey = rawParams.Tasarim_Stili && DESIGN_STYLES[rawParams.Tasarim_Stili]
    ? rawParams.Tasarim_Stili
    : 'cift_katli_j_kanca';

  const maxDesk = THREE.MathUtils.clamp(Number(rawParams.Maks_Masa_Kalinligi_mm) || 42, 18, 55);
  const wallT = THREE.MathUtils.clamp(Number(rawParams.Kelepce_Et_Kalinligi_mm) || 10, 6, 18);
  const width = THREE.MathUtils.clamp(Number(rawParams.Aparat_Eni_mm) || 30, 20, 50);
  const innerR = THREE.MathUtils.clamp(Number(rawParams.Ic_Kose_Radyus_mm) || 6, 2, 12);
  const reqScrewD = THREE.MathUtils.clamp(Number(rawParams.Basilir_Vida_Capi_mm) || 16, 12, 24);
  const clearance = THREE.MathUtils.clamp(Number(rawParams.Dis_Bosluk_Toleransi_mm) || 0.25, 0.10, 0.50);
  const armLen = THREE.MathUtils.clamp(Number(rawParams.Aski_Kolu_Uzunlugu_mm) || 65, 35, 110);
  const lowerJDepth = THREE.MathUtils.clamp(Number(rawParams.Alt_J_Derinlik_mm) || 58, 35, 95);

  // Side 45° CNC bevel size (support-free at Z=0!)
  const sideChamfer = Math.min(1.35, width * 0.06);

  // Guard bore vs width so side walls + 45° chamfer leave >= 2.2mm flat land around the bore mouth
  const maxSafeScrewD = Math.max(12, width - 6.8 - clearance * 2);
  const widthWarning = reqScrewD > maxSafeScrewD;
  const screwD = Math.min(reqScrewD, maxSafeScrewD);

  // Pitch selection for 60° Support-Free Printed Trapezoidal Thread
  let pitch = 4.0;
  if (screwD < 14.5) pitch = 3.0;
  else if (screwD < 15.5) pitch = 3.5;
  else if (screwD >= 20.0) pitch = 4.5;

  const crestFrac = 0.26;
  const rootFrac = 0.26;
  const flankFrac = (1.0 - crestFrac - rootFrac) * 0.5;
  const tan30 = Math.tan(Math.PI / 6);
  const radialDepth = (flankFrac * pitch) / tan30;

  const maleMajorR = screwD * 0.5;
  const maleMinorR = maleMajorR - radialDepth;
  const pitchDiameter = screwD - radialDepth;

  const femaleMajorR = maleMajorR + clearance;
  const femaleMinorR = maleMinorR + clearance;
  const flankAxialExtraFrac = (clearance * (1 - Math.sin(Math.PI / 6))) / (pitch * Math.cos(Math.PI / 6));

  const padRadius = Math.max(13.0, Math.min(width * 0.48, screwD * 0.88));
  const padBaseH = 4.6;
  const padSocketH = 7.6;
  const padStackClearance = padBaseH + padSocketH + 2.6; // 14.8 mm

  const throatHeight = maxDesk + padStackClearance;
  const nutHeight = Math.max(Math.round(wallT * 1.45 * 2) / 2, pitch * 3.5);

  const yJawTop = -throatHeight;
  const yJawBot = yJawTop - nutHeight;

  const mouthR = femaleMajorR + 0.85;
  const nutMarginX = Math.max(6.2, wallT * 0.56);
  const xRightClear = -Math.max(innerR + 2.6, 8.8);
  const xScrew = xRightClear - (mouthR + nutMarginX - 1.5);
  const xJawTip = xScrew - (mouthR + nutMarginX + 1.5);
  const jawReach = Math.abs(xJawTip);

  // Exact top/bottom bore patch window along X inside the flat part of the lower jaw
  const xBoreRight = xScrew + mouthR + 1.35;
  const xBoreLeft = xScrew - mouthR - 1.35;

  const knobRadius = Math.max(15.0, screwD * 0.96);
  const knobHeight = 14.5;
  const shoulderH = Math.max(3.8, knobRadius - maleMinorR);
  const ballRadius = Math.max(4.5, screwD * 0.34);
  const neckRadius = ballRadius * 0.68;
  const neckHeight = 3.8;
  const minClampedDesk = Math.max(8, maxDesk - 38);
  const threadLength = throatHeight - minClampedDesk - padStackClearance + nutHeight + 4.5;

  return {
    styleKey,
    hasLowerJ: DESIGN_STYLES[styleKey].hasLowerJ,
    maxDesk,
    wallT,
    width,
    sideChamfer,
    innerR,
    reqScrewD,
    screwD,
    widthWarning,
    clearance,
    armLen,
    lowerJDepth,
    pitch,
    crestFrac,
    rootFrac,
    flankFrac,
    flankAxialExtraFrac,
    radialDepth,
    maleMajorR,
    maleMinorR,
    pitchDiameter,
    femaleMajorR,
    femaleMinorR,
    mouthR,
    padRadius,
    padBaseH,
    padSocketH,
    padStackClearance,
    throatHeight,
    nutHeight,
    yJawTop,
    yJawBot,
    xScrew,
    xJawTip,
    xBoreLeft,
    xBoreRight,
    jawReach,
    knobRadius,
    knobHeight,
    shoulderH,
    ballRadius,
    neckRadius,
    neckHeight,
    threadLength,
    minClampedDesk,
    threadDesignation: `Tr${Math.round(screwD)}×${pitch.toFixed(1)} (60° FDM)`
  };
}

/**
 * Evaluates 1D periodic 60° trapezoidal tooth profile for phase u in [0, 1).
 */
function sampleTrapezoidProfile(uNorm, rMin, rMaj, crestF, rootF) {
  let u = uNorm - Math.floor(uNorm);
  if (u < 0) u += 1.0;
  const d = Math.abs(u - 0.5);
  const halfCrest = crestF * 0.5;
  const halfRootStart = 0.5 - rootF * 0.5;

  if (d <= halfCrest) return rMaj;
  if (d >= halfRootStart) return rMin;
  const t = (d - halfCrest) / Math.max(1e-6, halfRootStart - halfCrest);
  return rMaj + (rMin - rMaj) * t;
}

/**
 * Welds vertices for watertight STL topology, then computes sharp-creased CAD normals
 * (`32°` crease threshold) so flat faces remain 100% streak-free while fillets stay silky smooth!
 */
function finalizeCreasedCADGeometry(positionsArray, creaseDeg = 32) {
  const raw = new THREE.BufferGeometry();
  raw.setAttribute('position', new THREE.Float32BufferAttribute(positionsArray, 3));
  const manifold = mergeVertices(raw, 1e-4);
  raw.dispose();
  manifold.computeVertexNormals();
  const creased = toCreasedNormals(manifold, THREE.MathUtils.degToRad(creaseDeg));
  manifold.dispose();
  creased.computeBoundingBox();
  return creased;
}

function pushTri(out, ax, ay, az, bx, by, bz, cx, cy, cz) {
  out.push(ax, ay, az, bx, by, bz, cx, cy, cz);
}

function pushQuad(out, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz) {
  out.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  out.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
}

/**
 * G1 Tangent Corner Fillet Kernel: converts a closed control polygon `[{x, y, r, tag?}]`
 * into a dense, self-intersection-free array of `{x, y, tag}` points.
 */
export function tessellateFilletedPolygon(ctrlPts) {
  const n = ctrlPts.length;
  const out = [];

  for (let i = 0; i < n; i++) {
    const prev = ctrlPts[(i - 1 + n) % n];
    const curr = ctrlPts[i];
    const next = ctrlPts[(i + 1) % n];
    const rReq = curr.r || 0;

    if (rReq <= 1e-3) {
      out.push({ x: curr.x, y: curr.y, tag: curr.tag || null });
      continue;
    }

    const v1x = prev.x - curr.x, v1y = prev.y - curr.y;
    const v2x = next.x - curr.x, v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);

    if (len1 < 1e-3 || len2 < 1e-3) {
      out.push({ x: curr.x, y: curr.y, tag: curr.tag || null });
      continue;
    }

    const u1x = v1x / len1, u1y = v1y / len1;
    const u2x = v2x / len2, u2y = v2y / len2;
    const dot = THREE.MathUtils.clamp(u1x * u2x + u1y * u2y, -1, 1);
    const angle = Math.acos(dot);

    if (angle < 0.06 || angle > Math.PI - 0.03) {
      out.push({ x: curr.x, y: curr.y, tag: curr.tag || null });
      continue;
    }

    const halfTan = Math.tan(angle * 0.5);
    const idealDist = rReq / halfTan;
    // Clamp tangent distance to <= 45% of adjacent edge lengths so fillets NEVER overlap!
    const safeDist = Math.min(idealDist, len1 * 0.45, len2 * 0.45);
    const safeR = safeDist * halfTan;

    const t1x = curr.x + u1x * safeDist, t1y = curr.y + u1y * safeDist;
    const t2x = curr.x + u2x * safeDist, t2y = curr.y + u2y * safeDist;

    const bx = u1x + u2x, by = u1y + u2y;
    const bLen = Math.hypot(bx, by);
    if (bLen < 1e-5) {
      out.push({ x: curr.x, y: curr.y, tag: curr.tag || null });
      continue;
    }

    const centerDist = safeR / Math.sin(angle * 0.5);
    const cx = curr.x + (bx / bLen) * centerDist;
    const cy = curr.y + (by / bLen) * centerDist;

    const a1 = Math.atan2(t1y - cy, t1x - cx);
    const a2 = Math.atan2(t2y - cy, t2x - cx);
    let delta = a2 - a1;
    while (delta <= -Math.PI) delta += Math.PI * 2;
    while (delta > Math.PI) delta -= Math.PI * 2;

    const steps = Math.max(6, Math.ceil(Math.abs(delta) * 14));
    for (let s = 0; s <= steps; s++) {
      const a = a1 + (s / steps) * delta;
      out.push({
        x: cx + safeR * Math.cos(a),
        y: cy + safeR * Math.sin(a),
        tag: null
      });
    }
  }

  // Deduplicate ultra-close points while preserving tagged bore-patch anchors
  const clean = [];
  for (let i = 0; i < out.length; i++) {
    const p = out[i];
    const prev = clean[clean.length - 1];
    if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 1e-3 || p.tag) {
      clean.push(p);
    }
  }
  if (clean.length > 2) {
    const first = clean[0];
    const last = clean[clean.length - 1];
    if (Math.hypot(first.x - last.x, first.y - last.y) <= 1e-3 && !last.tag) {
      clean.pop();
    }
  }
  return clean;
}

function signedArea2D(pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area * 0.5;
}

function ensureWinding(pts, wantCCW) {
  const isCCW = signedArea2D(pts) > 0;
  if (isCCW !== wantCCW) pts.reverse();
  return pts;
}

/**
 * Generates the exact 2D CCW outer contour + CW truss/cable holes for all 4 Industrial Mount Styles!
 * Also exported so the 2D `Imalat_Anteti.svg` and `.DXF` sheets render the exact active silhouette!
 */
export function build2DCBodyProfileData(dim) {
  const {
    styleKey,
    wallT: t,
    innerR: r,
    armLen: L,
    lowerJDepth: jDrop,
    yJawTop,
    yJawBot,
    xJawTip,
    xBoreLeft,
    xBoreRight
  } = dim;

  const armT = Math.max(9.2, t * 0.96);
  const lipT = Math.max(7.8, t * 0.80);
  const lipH = 16.0;
  const xArmEnd = t + L;

  // Common C-Clamp Jaws + Exact R6 Inner Throat Fillets + Bore-Window Anchors (left half of loop)
  // Ordered from Top-of-Spine -> Left along Upper Jaw -> Down Inner Throat -> Left along Lower Jaw -> Bottom of Lower Jaw!
  const jawLoopSegment = [
    { x: xJawTip, y: t, r: 3.6 },
    { x: xJawTip, y: 0, r: 2.2 },
    // Upper R6 Stress-Relief Inner Fillet!
    { x: 0, y: 0, r: r },
    // Lower R6 Stress-Relief Inner Fillet!
    { x: 0, y: yJawTop, r: r },
    // Exact straight window anchors on Y = yJawTop for Female Helical Bore stitch (r: 0!)
    { x: xBoreRight, y: yJawTop, r: 0, tag: 'bore_top_r' },
    { x: xBoreLeft,  y: yJawTop, r: 0, tag: 'bore_top_l' },
    { x: xJawTip,    y: yJawTop, r: 3.2 },
    { x: xJawTip,    y: yJawBot, r: 3.8 },
    // Exact straight window anchors on Y = yJawBot for Female Helical Bore stitch (r: 0!)
    { x: xBoreLeft,  y: yJawBot, r: 0, tag: 'bore_bot_l' },
    { x: xBoreRight, y: yJawBot, r: 0, tag: 'bore_bot_r' }
  ];

  let rightSideCtrl = [];
  const holeCtrlLoops = [];

  if (styleKey === 'cift_katli_j_kanca') {
    // =======================================================================
    // DESIGN 01: DUAL-TIER — UPPER HEADPHONE CRADLE + LOWER J-HOOK (USER SKETCH!)
    // Concentric wall thickness (R_outer = R_inner + jWall) around every bend!
    // =======================================================================
    const jWall = Math.max(8.2, t * 0.86);
    const xJBack = t + THREE.MathUtils.clamp((L - 36) * 0.28, 1.5, 13.5);
    const xJInner = xJBack + jWall;
    const xJEnd = t + Math.max(L * 0.94, (xJInner - t) + jWall + 18.0);

    // Lower J drops cleanly below upper arm (and below lower jaw when jDrop is deep)
    const yJBotOuter = -Math.max(jDrop + 18.0, Math.abs(yJawBot) + 6.0);
    const yJBotInner = yJBotOuter + jWall;
    const yJTipTop = yJBotInner + Math.max(26.0, jDrop * 0.50);
    const rJInner = Math.max(r, 6.5);
    const rJOuter = rJInner + jWall;

    const yGussetRoot = Math.max(yJawBot + 9.0, -44.0);
    const yBridgeUnder = yGussetRoot + (xJBack - t) * 0.95;

    rightSideCtrl = [
      { x: t, y: yJawBot, r: Math.min(r + t * 0.65, 12.0) },
      { x: t, y: yGussetRoot, r: 7.0 },
      { x: xJBack, y: yBridgeUnder, r: 7.0 },
      // Vertical drop of Lower J-Stem -> Concentric bottom J-channel -> Upward J-Hook Tower!
      { x: xJBack, y: yJBotOuter, r: rJOuter },
      { x: xJEnd, y: yJBotOuter, r: rJOuter },
      { x: xJEnd, y: yJTipTop, r: jWall * 0.48 },
      { x: xJEnd - jWall, y: yJTipTop, r: jWall * 0.48 },
      { x: xJEnd - jWall, y: yJBotInner, r: rJInner },
      { x: xJInner, y: yJBotInner, r: rJInner },
      // Up inner J-stem into underside of Upper Headphone Cradle!
      { x: xJInner, y: -armT * 0.94, r: Math.max(r, 7.5) },
      { x: xArmEnd, y: -armT * 0.78, r: 5.5 },
      // Upper Headphone Retention Stopper Tower
      { x: xArmEnd, y: t + lipH, r: lipT * 0.48 },
      { x: xArmEnd - lipT, y: t + lipH, r: lipT * 0.48 },
      // Contoured Concave Headphone Headband Saddle
      { x: xArmEnd - lipT, y: t * 0.40, r: 7.0 },
      { x: t + (L - lipT) * 0.54, y: t * 0.14, r: 22.0 },
      // Integrated Cable Organizer Catch Slot near Upper Spine Dock
      { x: t + 13.5, y: t, r: 2.0 },
      { x: t + 11.2, y: t, r: 0.6 },
      { x: t + 11.8, y: t - 5.2, r: 2.2 },
      { x: t + 6.2,  y: t - 5.2, r: 2.2 },
      { x: t + 6.8,  y: t, r: 0.6 }
    ];

    // Chamfered Velcro / Cable-Tie Eyelet inside the upper spine-to-J-stem gusset web
    if (xJBack - t >= 7.5 && Math.abs(yBridgeUnder) >= 24.0) {
      holeCtrlLoops.push([
        { x: t + 3.2, y: -9.5, r: 2.6 },
        { x: t + 3.2, y: yBridgeUnder + 6.5, r: 2.6 },
        { x: xJBack + 2.2, y: -11.0, r: 2.6 }
      ]);
    }
  } else if (styleKey === 'derin_j_kanca') {
    // =======================================================================
    // DESIGN 02: DEEP UNDER-DESK J-HOOK (BACKPACK, COILED CABLES & HEAVY GEAR)
    // =======================================================================
    const jWall = Math.max(9.5, t * 0.96);
    const xJBack = Math.max(1.5, t * 0.35);
    const xJInner = xJBack + jWall;
    const xJEnd = t + L;
    const yJBotOuter = yJawBot - Math.max(16.0, jDrop * 0.48);
    const yJBotInner = yJBotOuter + jWall;
    const yJTipTop = yJBotInner + Math.max(34.0, jDrop * 0.62);
    const rJInner = Math.max(r + 1.5, 8.0);
    const rJOuter = rJInner + jWall;

    rightSideCtrl = [
      { x: xJBack, y: yJawBot, r: 5.5 },
      { x: xJBack, y: yJBotOuter, r: rJOuter },
      { x: xJEnd, y: yJBotOuter, r: rJOuter },
      { x: xJEnd, y: yJTipTop, r: jWall * 0.48 },
      { x: xJEnd - jWall - 1.2, y: yJTipTop, r: jWall * 0.48 },
      { x: xJEnd - jWall, y: yJBotInner, r: rJInner },
      { x: xJInner, y: yJBotInner, r: rJInner },
      // Auxiliary Front Cable Catch Hook + Flush Low-Profile Desk Top
      { x: xJInner, y: -23.0, r: 4.5 },
      { x: xJInner + 12.0, y: -16.0, r: 3.2 },
      { x: xJInner + 12.0, y: -5.0, r: 2.8 },
      { x: xJInner + 6.4, y: -5.0, r: 2.2 },
      { x: xJInner + 6.4, y: -11.5, r: 2.0 },
      { x: xJInner, y: -11.5, r: 2.4 },
      { x: xJInner, y: t, r: 5.0 }
    ];
  } else if (styleKey === 'kafes_truss_cift') {
    // =======================================================================
    // DESIGN 03: INDUSTRIAL AERO-TRUSS DUAL STATION (MULTI-POCKET CNC TRUSS)
    // =======================================================================
    const jWall = Math.max(8.2, t * 0.85);
    const xTrussNode = t + Math.max(21.0, L * 0.38);
    const xLowerHookEnd = t + Math.max(44.0, L * 0.82);
    const yLowerBot = -Math.max(jDrop + 12.0, Math.abs(yJawBot) + 2.0);
    const yLowerTip = yLowerBot + jWall + 25.0;
    const rJInner = Math.max(r, 6.0);
    const rJOuter = rJInner + jWall;

    rightSideCtrl = [
      { x: t, y: yJawBot, r: 10.0 },
      { x: t, y: Math.max(yJawBot + 7.0, yLowerBot + 12.0), r: 9.0 },
      { x: xTrussNode - 4.0, y: yLowerBot, r: rJOuter },
      { x: xLowerHookEnd, y: yLowerBot, r: rJOuter },
      { x: xLowerHookEnd, y: yLowerTip, r: jWall * 0.48 },
      { x: xLowerHookEnd - jWall, y: yLowerTip, r: jWall * 0.48 },
      { x: xLowerHookEnd - jWall, y: yLowerBot + jWall, r: rJInner },
      { x: xTrussNode + 4.0, y: yLowerBot + jWall, r: rJInner },
      // Angled structural strut up to Upper Headphone Cradle
      { x: xTrussNode + 7.5, y: -armT * 0.92, r: 8.0 },
      { x: xArmEnd, y: -armT * 0.76, r: 5.5 },
      { x: xArmEnd, y: t + lipH, r: lipT * 0.48 },
      { x: xArmEnd - lipT, y: t + lipH, r: lipT * 0.48 },
      { x: xArmEnd - lipT, y: t * 0.40, r: 7.0 },
      { x: t + (L - lipT) * 0.54, y: t * 0.14, r: 20.0 },
      // Top Cable Catch
      { x: t + 13.5, y: t, r: 2.0 },
      { x: t + 11.2, y: t, r: 0.6 },
      { x: t + 11.8, y: t - 5.0, r: 2.1 },
      { x: t + 6.2,  y: t - 5.0, r: 2.1 },
      { x: t + 6.8,  y: t, r: 0.6 }
    ];

    // Dual Aero-Truss Chamfered Cutout Windows inside the Warren Truss Web!
    const trussSpanX = xTrussNode - t;
    if (trussSpanX >= 16.0) {
      holeCtrlLoops.push([
        { x: t + 4.2, y: -8.5, r: 3.2 },
        { x: t + 4.2, y: -28.0, r: 3.2 },
        { x: xTrussNode - 2.0, y: -10.0, r: 3.2 }
      ]);
      holeCtrlLoops.push([
        { x: t + 5.2, y: -34.0, r: 3.2 },
        { x: xTrussNode - 2.5, y: yLowerBot + jWall + 3.5, r: 3.2 },
        { x: xTrussNode - 0.5, y: -16.5, r: 3.2 }
      ]);
    }
  } else {
    // =======================================================================
    // DESIGN 04: STUDIO PRO SINGLE UPPER HEADPHONE & DUAL-CABLE CRADLE
    // =======================================================================
    const gussetDrop = Math.min(34.0, Math.abs(yJawTop) * 0.62);
    const xGussetJoin = t + Math.min(L * 0.52, gussetDrop * 0.95 + 6.0);

    rightSideCtrl = [
      { x: t, y: yJawBot, r: Math.min(r + t * 0.7, 13.0) },
      { x: t, y: -gussetDrop, r: 10.0 },
      { x: xGussetJoin, y: -armT * 0.92, r: 12.0 },
      { x: xArmEnd, y: -armT * 0.76, r: 5.5 },
      { x: xArmEnd, y: t + lipH, r: lipT * 0.46 },
      { x: xArmEnd - lipT, y: t + lipH, r: lipT * 0.46 },
      { x: xArmEnd - lipT, y: t * 0.42, r: 7.5 },
      { x: t + (L - lipT) * 0.54, y: t * 0.15, r: 22.0 },
      // Sculpted Cable Catch Dock
      { x: t + 14.0, y: t, r: 2.0 },
      { x: t + 11.4, y: t, r: 0.6 },
      { x: t + 12.0, y: t - 5.2, r: 2.2 },
      { x: t + 6.4,  y: t - 5.2, r: 2.2 },
      { x: t + 7.0,  y: t, r: 0.6 }
    ];

    // Chamfered Structural Gusset Truss Port
    if (xGussetJoin - t >= 19.0 && gussetDrop >= 22.0) {
      holeCtrlLoops.push([
        { x: t + 4.5, y: -9.5, r: 3.4 },
        { x: t + 4.5, y: -gussetDrop + 7.5, r: 3.4 },
        { x: xGussetJoin - 5.5, y: -11.0, r: 3.4 }
      ]);
    }
  }

  // Assemble full closed loop: Bottom-Right -> Right Hanger Architecture -> Top-Left Jaw -> Throat -> Bottom-Left Jaw
  const fullOuterCtrl = [...rightSideCtrl, ...jawLoopSegment];
  const outerPts = ensureWinding(tessellateFilletedPolygon(fullOuterCtrl), true); // CCW

  const holeLoops = holeCtrlLoops.map((hCtrl) =>
    ensureWinding(tessellateFilletedPolygon(hCtrl), false) // CW
  );

  return { outerPts, holeLoops };
}

/**
 * Computes inward-offset miter polygon for 45° CNC Z-chamfer on both CCW outer and CW hole loops.
 */
function computeSolidInsetLoop(pts, insetDist) {
  const n = pts.length;
  const edgeSolidNormals = [];

  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1e-6, Math.hypot(dx, dy));
    // Left-hand normal (-ty, +tx) points INTO solid for both CCW outer and CW holes!
    edgeSolidNormals.push({ x: -dy / len, y: dx / len });
  }

  const insetPts = [];
  for (let i = 0; i < n; i++) {
    const nPrev = edgeSolidNormals[(i - 1 + n) % n];
    const nCurr = edgeSolidNormals[i];
    const denom = Math.max(0.42, 1.0 + (nPrev.x * nCurr.x + nPrev.y * nCurr.y));
    const mx = (nPrev.x + nCurr.x) / denom;
    const my = (nPrev.y + nCurr.y) / denom;
    insetPts.push(new THREE.Vector2(pts[i].x + mx * insetDist, pts[i].y + my * insetDist));
  }
  return insetPts;
}

/**
 * Extrudes the 2D outer + hole loops along `Z in [-W/2, +W/2]` with exact 1:1 mm outer dimensions,
 * true 45° CNC perimeter chamfers on `Z = +-W/2`, and leaves the two rectangular bore-mouth windows open
 * on `Y = yJawTop` and `Y = yJawBot` so the Female Helical Thread stitches seamlessly!
 */
function buildChamfered25DBodyTriangles(outerPts, holeLoops, width, ch, outTris) {
  const zHalf = width * 0.5;
  const zInner = zHalf - ch;

  const qOuter = computeSolidInsetLoop(outerPts, ch);
  const qHoles = holeLoops.map((h) => computeSolidInsetLoop(h, ch));

  // 1. Triangulate flat Z = +zHalf and Z = -zHalf planar side caps
  const faces = THREE.ShapeUtils.triangulateShape(qOuter, qHoles);
  const allCapVerts = [...qOuter];
  qHoles.forEach((qh) => allCapVerts.push(...qh));

  for (let f = 0; f < faces.length; f++) {
    const [ia, ib, ic] = faces[f];
    const A = allCapVerts[ia];
    const B = allCapVerts[ib];
    const C = allCapVerts[ic];

    const cross2D = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
    if (Math.abs(cross2D) < 1e-8) continue;

    if (cross2D > 0) {
      // Front cap (+Z normal) & Back cap (-Z normal — flat bed surface in Print Bed Mode!)
      pushTri(outTris, A.x, A.y, +zHalf, B.x, B.y, +zHalf, C.x, C.y, +zHalf);
      pushTri(outTris, A.x, A.y, -zHalf, C.x, C.y, -zHalf, B.x, B.y, -zHalf);
    } else {
      pushTri(outTris, A.x, A.y, +zHalf, C.x, C.y, +zHalf, B.x, B.y, +zHalf);
      pushTri(outTris, A.x, A.y, -zHalf, B.x, B.y, -zHalf, C.x, C.y, -zHalf);
    }
  }

  // 2. Emit 45° CNC Chamfer Strips + Central Extruded Perimeter Walls for Outer & Hole Loops
  function emitLoopWalls(pLoop, qLoop, checkBoreWindow) {
    const n = pLoop.length;
    for (let i = 0; i < n; i++) {
      const iNext = (i + 1) % n;
      const P0 = pLoop[i];
      const P1 = pLoop[iNext];
      const Q0 = qLoop[i];
      const Q1 = qLoop[iNext];

      // Front 45° chamfer (+zInner -> +zHalf)
      pushQuad(outTris, P0.x, P0.y, +zInner, P1.x, P1.y, +zInner, Q1.x, Q1.y, +zHalf, Q0.x, Q0.y, +zHalf);
      // Back 45° chamfer (-zInner -> -zHalf)
      pushQuad(outTris, P1.x, P1.y, -zInner, P0.x, P0.y, -zInner, Q0.x, Q0.y, -zHalf, Q1.x, Q1.y, -zHalf);

      const isTopBoreSeg = checkBoreWindow && P0.tag === 'bore_top_r' && P1.tag === 'bore_top_l';
      const isBotBoreSeg = checkBoreWindow && P0.tag === 'bore_bot_l' && P1.tag === 'bore_bot_r';

      if (!isTopBoreSeg && !isBotBoreSeg) {
        // Central wall (-zInner -> +zInner)
        pushQuad(outTris, P0.x, P0.y, -zInner, P1.x, P1.y, -zInner, P1.x, P1.y, +zInner, P0.x, P0.y, +zInner);
      }
    }
  }

  emitLoopWalls(outerPts, qOuter, true);
  for (let h = 0; h < holeLoops.length; h++) {
    emitLoopWalls(holeLoops[h], qHoles[h], false);
  }
}

/**
 * Stitches the watertight Female 60° Trapezoidal Helical Thread Tunnel (`+Dis_Bosluk_Toleransi_mm`)
 * directly into the open `[xBoreLeft, xBoreRight] × [-zInner, +zInner]` windows on `yJawTop` and `yJawBot`.
 */
function buildFemaleHelicalBorePatch(dim, outTris) {
  const {
    width,
    sideChamfer,
    xBoreLeft,
    xBoreRight,
    xScrew,
    yJawBot,
    yJawTop,
    pitch,
    femaleMajorR,
    femaleMinorR,
    mouthR,
    crestFrac,
    rootFrac,
    flankAxialExtraFrac
  } = dim;

  const zInner = width * 0.5 - sideChamfer;
  const radialSegs = 84;
  const heightMm = yJawTop - yJawBot;
  const axialSegs = Math.max(48, Math.ceil((heightMm / pitch) * 18));

  const femCrestF = Math.min(0.46, crestFrac + 2 * flankAxialExtraFrac);
  const femRootF = Math.max(0.08, rootFrac - 2 * flankAxialExtraFrac);
  const chamferH = Math.min(1.65, heightMm * 0.14);

  function evalFemaleRadius(theta, y) {
    const phase = y / pitch + theta / (Math.PI * 2);
    const threadR = sampleTrapezoidProfile(phase, femaleMinorR, femaleMajorR, femCrestF, femRootF);

    const distEdge = Math.min(y - yJawBot, yJawTop - y);
    if (distEdge >= chamferH) return threadR;
    const f = Math.max(0, distEdge / chamferH);
    const chamferEnv = mouthR + (femaleMajorR - mouthR) * f;
    return Math.max(threadR, chamferEnv);
  }

  const dxRight = xBoreRight - xScrew;
  const dxLeft = xBoreLeft - xScrew;
  const c0 = Math.atan2(-zInner, dxRight);
  const c1 = Math.atan2(+zInner, dxRight);
  const c2 = Math.atan2(+zInner, dxLeft);
  const c3 = Math.atan2(-zInner, dxLeft);

  const angleSet = [c0, c1, c2, c3, 0, Math.PI * 0.5, -Math.PI * 0.5];
  for (let i = 0; i < radialSegs; i++) {
    angleSet.push(-Math.PI + (i / radialSegs) * Math.PI * 2);
  }
  angleSet.sort((a, b) => a - b);

  const thetas = [];
  for (let i = 0; i < angleSet.length; i++) {
    if (thetas.length === 0 || Math.abs(angleSet[i] - thetas[thetas.length - 1]) > 1e-4) {
      if (Math.PI * 2 - (angleSet[i] - thetas[0]) > 1e-4) {
        thetas.push(angleSet[i]);
      }
    }
  }
  const nT = thetas.length;

  const corners = [
    { x: xBoreRight, z: -zInner },
    { x: xBoreRight, z: +zInner },
    { x: xBoreLeft,  z: +zInner },
    { x: xBoreLeft,  z: -zInner }
  ];

  function getCornerIndexForAngle(ang) {
    if (ang >= -Math.PI * 0.5 && ang < 0) return 0;
    if (ang >= 0 && ang < Math.PI * 0.5) return 1;
    if (ang >= Math.PI * 0.5) return 2;
    return 3;
  }

  // 1. Internal Helical Bore Tunnel
  for (let j = 0; j < axialSegs; j++) {
    const y0 = yJawBot + (j / axialSegs) * heightMm;
    const y1 = yJawBot + ((j + 1) / axialSegs) * heightMm;

    for (let i = 0; i < nT; i++) {
      const iNext = (i + 1) % nT;
      const th0 = thetas[i];
      const th1 = thetas[iNext];
      const th1Phase = iNext === 0 ? th0 + (thetas[0] + Math.PI * 2 - th0) : th1;

      const r00 = evalFemaleRadius(th0, y0);
      const r10 = evalFemaleRadius(th1Phase, y0);
      const r11 = evalFemaleRadius(th1Phase, y1);
      const r01 = evalFemaleRadius(th0, y1);

      pushQuad(
        outTris,
        xScrew + r00 * Math.cos(th0), y0, r00 * Math.sin(th0),
        xScrew + r10 * Math.cos(th1), y0, r10 * Math.sin(th1),
        xScrew + r11 * Math.cos(th1), y1, r11 * Math.sin(th1),
        xScrew + r01 * Math.cos(th0), y1, r01 * Math.sin(th0)
      );
    }
  }

  // 2. Top (+Y) and Bottom (-Y) Annular Caps welded to the 4 window corners
  for (let i = 0; i < nT; i++) {
    const iNext = (i + 1) % nT;
    const th0 = thetas[i];
    const th1 = thetas[iNext];
    const th1Phase = iNext === 0 ? th0 + (thetas[0] + Math.PI * 2 - th0) : th1;

    const cIdx0 = getCornerIndexForAngle(th0);
    const cIdx1 = getCornerIndexForAngle(th1);

    const rt0 = evalFemaleRadius(th0, yJawTop);
    const rt1 = evalFemaleRadius(th1Phase, yJawTop);
    const xt0 = xScrew + rt0 * Math.cos(th0), zt0 = rt0 * Math.sin(th0);
    const xt1 = xScrew + rt1 * Math.cos(th1), zt1 = rt1 * Math.sin(th1);

    const rb0 = evalFemaleRadius(th0, yJawBot);
    const rb1 = evalFemaleRadius(th1Phase, yJawBot);
    const xb0 = xScrew + rb0 * Math.cos(th0), zb0 = rb0 * Math.sin(th0);
    const xb1 = xScrew + rb1 * Math.cos(th1), zb1 = rb1 * Math.sin(th1);

    const C0 = corners[cIdx0];
    pushTri(outTris, xt0, yJawTop, zt0, xt1, yJawTop, zt1, C0.x, yJawTop, C0.z);
    pushTri(outTris, xb0, yJawBot, zb0, C0.x, yJawBot, C0.z, xb1, yJawBot, zb1);

    if (cIdx0 !== cIdx1) {
      const C1 = corners[cIdx1];
      pushTri(outTris, xt1, yJawTop, zt1, C1.x, yJawTop, C1.z, C0.x, yJawTop, C0.z);
      pushTri(outTris, xb1, yJawBot, zb1, C0.x, yJawBot, C0.z, C1.x, yJawBot, C1.z);
    }
  }
}

/**
 * Builds the High-Precision Chamfered C-Clamp Body + Selected Hanger Architecture + Female Helical Jaw.
 */
export function buildCBodyWithHelicalJaw(rawParams) {
  const dim = deriveClampDimensions(rawParams);
  const { outerPts, holeLoops } = build2DCBodyProfileData(dim);

  const tris = [];
  buildChamfered25DBodyTriangles(outerPts, holeLoops, dim.width, dim.sideChamfer, tris);
  buildFemaleHelicalBorePatch(dim, tris);

  const geom = finalizeCreasedCADGeometry(tris, 32);
  geom.userData = { outerPts, holeLoops };
  return geom;
}

/**
 * Builds the High-Detail Support-Free 60° Trapezoidal Screw (`Trapez_Sikma_Vidasi`)
 * featuring a dual-zone Tactical Scalloped + Knurled Handwheel Knob, machined collar, and spherical pivot ball.
 */
export function buildTrapezoidalScrew(rawParams) {
  const dim = deriveClampDimensions(rawParams);
  const {
    pitch,
    maleMajorR,
    maleMinorR,
    crestFrac,
    rootFrac,
    knobRadius,
    knobHeight,
    shoulderH,
    threadLength,
    ballRadius,
    neckRadius,
    neckHeight
  } = dim;

  const radialSegs = 96;
  const tris = [];

  const yKnobBot = 0;
  const yKnobChamfer = 1.4;
  const yKnobTop = knobHeight;
  const yCollarTop = yKnobTop + shoulderH;
  const yThreadStart = yCollarTop + 1.8;
  const yThreadEnd = yThreadStart + threadLength;
  const yNeckStart = yThreadEnd + Math.max(1.8, maleMinorR - neckRadius);
  const yNeckEnd = yNeckStart + neckHeight;

  // Dual-zone ergonomic handwheel profile: 6 torque scallops + 36 crisp micro-knurl grooves
  function knobOuterR(theta, yFrac) {
    const scallop = 0.5 * (1 - Math.cos(theta * 6)); // 6 finger torque flutes
    const fineKnurl = 0.5 * (1 - Math.cos(theta * 36));
    const band = Math.sin(Math.PI * THREE.MathUtils.clamp(yFrac, 0, 1));
    return knobRadius - (0.95 * scallop + 0.52 * fineKnurl) * (0.25 + 0.75 * band);
  }

  const rings = [];
  function addRing(y, radiusFn) {
    const ring = [];
    for (let i = 0; i < radialSegs; i++) {
      const th = (i / radialSegs) * Math.PI * 2;
      const r = typeof radiusFn === 'function' ? radiusFn(th) : radiusFn;
      ring.push({ x: r * Math.cos(th), y, z: r * Math.sin(th) });
    }
    rings.push(ring);
  }

  // 1. Ergonomic Handwheel Knob with bottom medallion chamfer & upper step
  addRing(yKnobBot, knobRadius - 1.5);
  addRing(yKnobChamfer, (th) => knobOuterR(th, 0.08));
  const knobSlices = 8;
  for (let k = 1; k < knobSlices; k++) {
    const f = k / knobSlices;
    addRing(yKnobChamfer + f * (yKnobTop - 1.4 - yKnobChamfer), (th) => knobOuterR(th, f));
  }
  addRing(yKnobTop - 1.4, (th) => knobOuterR(th, 0.92));
  addRing(yKnobTop, knobRadius - 1.4);

  // 2. 45° Support-free conical torque collar + machined relief groove
  addRing(yCollarTop - 0.6, maleMinorR + 0.6);
  addRing(yCollarTop, maleMinorR - 0.25);
  addRing(yThreadStart, maleMinorR);

  // 3. High-Resolution 60° Trapezoidal Helical Shaft
  const threadSlices = Math.max(96, Math.ceil((threadLength / pitch) * 22));
  const taperLen = pitch * 0.75;
  for (let k = 1; k <= threadSlices; k++) {
    const y = yThreadStart + (k / threadSlices) * threadLength;
    const env = THREE.MathUtils.clamp(Math.min(y - yThreadStart, yThreadEnd - y) / taperLen, 0, 1);

    addRing(y, (th) => {
      const phase = (y - yThreadStart) / pitch + th / (Math.PI * 2);
      const profR = sampleTrapezoidProfile(phase, maleMinorR, maleMajorR, crestFrac, rootFrac);
      return maleMinorR + (profR - maleMinorR) * env;
    });
  }

  // 4. Machined Neck & Support-Free Spherical Swivel Ball Stud
  addRing(yNeckStart, neckRadius);
  addRing(yNeckEnd, neckRadius);

  const sin45 = Math.SQRT1_2;
  const rConeJoin = ballRadius * sin45;
  const coneRise = Math.max(0.4, rConeJoin - neckRadius);
  const yBallCenter = yNeckEnd + coneRise + ballRadius * sin45;
  addRing(yNeckEnd + coneRise, rConeJoin);

  const ballArcSteps = 12;
  const maxLat = Math.PI * 0.37;
  for (let s = 1; s <= ballArcSteps; s++) {
    const lat = -Math.PI * 0.25 + (s / ballArcSteps) * (maxLat + Math.PI * 0.25);
    addRing(yBallCenter + ballRadius * Math.sin(lat), ballRadius * Math.cos(lat));
  }

  const yTopFlat = rings[rings.length - 1][0].y;

  const firstRing = rings[0];
  for (let i = 0; i < radialSegs; i++) {
    const iNext = (i + 1) % radialSegs;
    pushTri(tris, 0, yKnobBot, 0, firstRing[i].x, yKnobBot, firstRing[i].z, firstRing[iNext].x, yKnobBot, firstRing[iNext].z);
  }

  for (let rIdx = 0; rIdx < rings.length - 1; rIdx++) {
    const rA = rings[rIdx];
    const rB = rings[rIdx + 1];
    for (let i = 0; i < radialSegs; i++) {
      const iNext = (i + 1) % radialSegs;
      const p00 = rA[i], p10 = rA[iNext], p11 = rB[iNext], p01 = rB[i];
      pushQuad(tris, p00.x, p00.y, p00.z, p01.x, p01.y, p01.z, p11.x, p11.y, p11.z, p10.x, p10.y, p10.z);
    }
  }

  const lastRing = rings[rings.length - 1];
  for (let i = 0; i < radialSegs; i++) {
    const iNext = (i + 1) % radialSegs;
    pushTri(tris, 0, yTopFlat, 0, lastRing[iNext].x, yTopFlat, lastRing[iNext].z, lastRing[i].x, yTopFlat, lastRing[i].z);
  }

  const geom = finalizeCreasedCADGeometry(tris, 34);
  geom.userData = {
    yThreadStart,
    yBallCenter,
    totalHeight: yTopFlat
  };
  return geom;
}

/**
 * Builds the High-Detail Support-Free Swivel Pad (`Doner_Baski_Pabucu`)
 * with concentric anti-mar traction grooves on top (`Y = 0`), 12-lobe tactile rim,
 * and 4 radial flex-relief collet flutes around the snap-fit socket!
 */
export function buildSwivelPad(rawParams) {
  const dim = deriveClampDimensions(rawParams);
  const {
    padRadius,
    padBaseH,
    padSocketH,
    ballRadius,
    clearance
  } = dim;

  const socketInnerR = ballRadius + clearance;
  const snapLipR = ballRadius * 0.87 + clearance * 0.5;
  const collarOuterR = socketInnerR + 3.8;
  const totalH = padBaseH + padSocketH;

  // Profile with concentric anti-slip desk pad grooves on top face!
  const g1 = padRadius * 0.36;
  const g2 = padRadius * 0.68;
  const profile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(g1 - 0.6, 0),
    new THREE.Vector2(g1, -0.35),
    new THREE.Vector2(g1 + 0.6, 0),
    new THREE.Vector2(g2 - 0.6, 0),
    new THREE.Vector2(g2, -0.35),
    new THREE.Vector2(g2 + 0.6, 0),
    new THREE.Vector2(padRadius - 1.1, 0),
    new THREE.Vector2(padRadius, -1.1),
    new THREE.Vector2(padRadius, -padBaseH + 0.9),
    new THREE.Vector2(padRadius - 0.9, -padBaseH),
    new THREE.Vector2(collarOuterR + 1.6, -padBaseH),
    new THREE.Vector2(collarOuterR, -padBaseH - 1.6),
    new THREE.Vector2(collarOuterR, -totalH + 1.1),
    new THREE.Vector2(collarOuterR - 1.1, -totalH),
    new THREE.Vector2(snapLipR + 0.9, -totalH),
    new THREE.Vector2(snapLipR, -totalH + 1.1)
  ];

  const ySocketCenter = -padBaseH - padSocketH * 0.44;
  const arcSteps = 12;
  for (let s = 0; s <= arcSteps; s++) {
    const ang = -Math.PI * 0.24 + (s / arcSteps) * (Math.PI * 0.49);
    profile.push(new THREE.Vector2(socketInnerR * Math.cos(ang), ySocketCenter + socketInnerR * Math.sin(ang)));
  }
  const lastPt = profile[profile.length - 1];
  const yApex = Math.min(-1.8, lastPt.y + lastPt.x);
  profile.push(new THREE.Vector2(0, yApex));

  const segs = 80;
  const tris = [];

  function modRadius(baseR, yVal, th) {
    // 12-lobe grip around outer pad perimeter
    if (baseR > collarOuterR + 2.0 && yVal < -0.5) {
      return baseR * (1 - 0.022 * (1 - Math.cos(th * 12)));
    }
    // 4 compliant flex-collet relief scallops on outer socket wall
    if (Math.abs(baseR - collarOuterR) < 1.2 && yVal < -padBaseH - 1.2) {
      const slot = Math.pow(Math.max(0, Math.cos(th * 4)), 6);
      return baseR - 1.05 * slot;
    }
    return baseR;
  }

  for (let p = 0; p < profile.length - 1; p++) {
    const a = profile[p];
    const b = profile[p + 1];

    for (let i = 0; i < segs; i++) {
      const iNext = (i + 1) % segs;
      const th0 = (i / segs) * Math.PI * 2;
      const th1 = (iNext / segs) * Math.PI * 2;

      const rA0 = modRadius(a.x, a.y, th0);
      const rA1 = modRadius(a.x, a.y, th1);
      const rB0 = modRadius(b.x, b.y, th0);
      const rB1 = modRadius(b.x, b.y, th1);

      const x00 = rA0 * Math.cos(th0), z00 = rA0 * Math.sin(th0);
      const x10 = rA1 * Math.cos(th1), z10 = rA1 * Math.sin(th1);
      const x11 = rB1 * Math.cos(th1), z11 = rB1 * Math.sin(th1);
      const x01 = rB0 * Math.cos(th0), z01 = rB0 * Math.sin(th0);

      if (a.x < 1e-5) {
        pushTri(tris, 0, a.y, 0, x11, b.y, z11, x01, b.y, z01);
      } else if (b.x < 1e-5) {
        pushTri(tris, 0, b.y, 0, x00, a.y, z00, x10, a.y, z10);
      } else {
        pushQuad(tris, x00, a.y, z00, x10, a.y, z10, x11, b.y, z11, x01, b.y, z01);
      }
    }
  }

  const geom = finalizeCreasedCADGeometry(tris, 32);
  geom.userData = {
    ySocketCenter,
    totalHeight: totalH
  };
  return geom;
}

/**
 * Computes exact signed-tetrahedron mesh volume (mm³ / cm³), surface area (cm²), bounding box, and triangle count.
 */
export function computeMeshMetrology(geometry) {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = nonIndexed.attributes.position;
  let volumeMm3 = 0;
  let areaMm2 = 0;

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    p1.fromBufferAttribute(pos, i);
    p2.fromBufferAttribute(pos, i + 1);
    p3.fromBufferAttribute(pos, i + 2);

    volumeMm3 += p1.dot(cross.crossVectors(p2, p3)) / 6.0;
    ab.subVectors(p2, p1);
    ac.subVectors(p3, p1);
    areaMm2 += cross.crossVectors(ab, ac).length() * 0.5;
  }

  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);

  if (nonIndexed !== geometry) nonIndexed.dispose();

  return {
    volumeMm3: Math.abs(volumeMm3),
    volCm3: Math.abs(volumeMm3) / 1000.0,
    areaMm2,
    areaCm2: areaMm2 / 100.0,
    triangleCount: pos.count / 3,
    bbox: { x: size.x, y: size.y, z: size.z }
  };
}

/**
 * Computes structural load capacity (Upper Cradle + Lower J-Hook, Flat vs Upright delamination),
 * R6 stress concentration Kt, 60° thread clamping capacity, and TL cost breakdown.
 */
export function computeStructuralAndCostMetrics(rawParams, partMetrology) {
  const dim = deriveClampDimensions(rawParams);
  const matKey = rawParams.Malzeme && MATERIALS[rawParams.Malzeme] ? rawParams.Malzeme : 'petg';
  const mat = MATERIALS[matKey];

  const infillPct = THREE.MathUtils.clamp(Number(rawParams.Doluluk_Orani_pct) || 40, 15, 100);
  const perimeters = THREE.MathUtils.clamp(Number(rawParams.Duvar_Sayisi) || 4, 2, 8);
  const filamentPriceTL = Math.max(50, Number(rawParams.Filament_Kg_Fiyati_TL) || mat.defaultPriceTL);

  const kt = 1.0 + 0.54 * Math.pow(dim.wallT / Math.max(0.5, dim.innerR), 0.62);
  const ktSharp = 1.0 + 0.54 * Math.pow(dim.wallT / 1.0, 0.62);
  const stressReductionPct = ((ktSharp - kt) / ktSharp) * 100;

  const sectionModulusMm3 = (dim.width * dim.wallT * dim.wallT) / 6.0;
  const shellThicknessMm = perimeters * 0.42;
  const shellRatio = Math.min(0.95, (2 * shellThicknessMm) / dim.wallT);
  const printEfficiency = isMetalReference(matKey)
    ? 1.0
    : Math.min(0.98, shellRatio + (1 - shellRatio) * (infillPct / 100) * 0.85);

  // Structural reinforcement bonus for Dual J-Hook / Aero-Truss closed-web geometries
  const archBonus =
    dim.styleKey === 'kafes_truss_cift' ? 1.18 :
    dim.styleKey === 'cift_katli_j_kanca' ? 1.12 :
    dim.styleKey === 'derin_j_kanca' ? 1.24 : 1.04;

  const momentArmMm = dim.wallT * 0.5 + dim.armLen * 0.64;
  const safetyFactor = 2.5;

  const yieldLoadFlatN = (mat.yieldMPa * printEfficiency * sectionModulusMm3 * archBonus) / (kt * momentArmMm);
  const safeLoadFlatN = yieldLoadFlatN / safetyFactor;
  const safeLoadFlatKg = safeLoadFlatN / 9.81;
  const yieldLoadFlatKg = yieldLoadFlatN / 9.81;

  // Dedicated Lower J-Hook Bag/Equipment Safe Capacity (closer centroid to spine!)
  const jHookSafeKg = dim.hasLowerJ ? safeLoadFlatKg * 1.32 : safeLoadFlatKg;

  const safeLoadUprightN = safeLoadFlatN * mat.zLayerFactor;
  const safeLoadUprightKg = safeLoadUprightN / 9.81;
  const orientationGainPct = ((safeLoadFlatN - safeLoadUprightN) / Math.max(1e-6, safeLoadUprightN)) * 100;

  const inertiaMm4 = (dim.width * Math.pow(dim.wallT, 3)) / 12.0;
  const modulusMPa = mat.modulusGPa * 1000.0 * printEfficiency;
  const tipDeflectionMm = (safeLoadFlatN * Math.pow(dim.armLen, 3)) / (3.0 * modulusMPa * inertiaMm4 * archBonus);

  const coreAreaMm2 = Math.PI * dim.maleMinorR * dim.maleMinorR;
  const clearanceEngagementFactor = THREE.MathUtils.clamp(
    1.0 - (dim.clearance / Math.max(0.8, dim.radialDepth)) * 0.45,
    0.45,
    0.95
  );
  const shearAreaMm2 = Math.PI * dim.pitchDiameter * dim.nutHeight * 0.52 * clearanceEngagementFactor;
  const screwCoreAllowN = (coreAreaMm2 * mat.yieldMPa * 0.55) / safetyFactor;
  const threadShearAllowN = (shearAreaMm2 * mat.yieldMPa * 0.38) / safetyFactor;
  const maxClampingForceN = Math.min(screwCoreAllowN, threadShearAllowN);

  function calcPartPrintStats(metro, minInfillOverride = null) {
    const effInfill = isMetalReference(matKey)
      ? 1.0
      : Math.max(minInfillOverride || 0, infillPct / 100);

    const shellVolCm3 = Math.min(metro.volCm3 * 0.88, metro.areaCm2 * (shellThicknessMm / 10.0) * 0.72);
    const interiorVolCm3 = Math.max(0, metro.volCm3 - shellVolCm3);
    const printedVolCm3 = isMetalReference(matKey)
      ? metro.volCm3
      : shellVolCm3 + interiorVolCm3 * effInfill;

    const solidMassG = metro.volCm3 * mat.density;
    const printedMassG = printedVolCm3 * mat.density;
    const printMinutes = Math.round((printedVolCm3 * 1000.0) / (9.5 * 60.0) + 6);
    const materialCostTL = (printedMassG / 1000.0) * filamentPriceTL;
    const machineCostTL = (printMinutes / 60.0) * 14.0;
    const totalCostTL = materialCostTL + machineCostTL;

    return {
      ...metro,
      solidMassG,
      printedMassG,
      printMinutes,
      materialCostTL,
      machineCostTL,
      totalCostTL
    };
  }

  const bodyStats = calcPartPrintStats(partMetrology.body);
  const screwStats = calcPartPrintStats(partMetrology.screw, 0.55);
  const padStats = calcPartPrintStats(partMetrology.pad, 0.45);

  const totalStats = {
    volCm3: bodyStats.volCm3 + screwStats.volCm3 + padStats.volCm3,
    areaCm2: bodyStats.areaCm2 + screwStats.areaCm2 + padStats.areaCm2,
    triangleCount: bodyStats.triangleCount + screwStats.triangleCount + padStats.triangleCount,
    solidMassG: bodyStats.solidMassG + screwStats.solidMassG + padStats.solidMassG,
    printedMassG: bodyStats.printedMassG + screwStats.printedMassG + padStats.printedMassG,
    printMinutes: bodyStats.printMinutes + screwStats.printMinutes + padStats.printMinutes,
    materialCostTL: bodyStats.materialCostTL + screwStats.materialCostTL + padStats.materialCostTL,
    machineCostTL: bodyStats.machineCostTL + screwStats.machineCostTL + padStats.machineCostTL,
    totalCostTL: bodyStats.totalCostTL + screwStats.totalCostTL + padStats.totalCostTL
  };

  return {
    dim,
    styleInfo: DESIGN_STYLES[dim.styleKey],
    material: mat,
    infillPct,
    perimeters,
    filamentPriceTL,
    safetyFactor,
    kt,
    ktSharp,
    stressReductionPct,
    sectionModulusMm3,
    momentArmMm,
    safeLoadFlatN,
    safeLoadFlatKg,
    jHookSafeKg,
    yieldLoadFlatN,
    yieldLoadFlatKg,
    safeLoadUprightN,
    safeLoadUprightKg,
    orientationGainPct,
    tipDeflectionMm,
    maxClampingForceN,
    engagedThreadTurns: dim.nutHeight / dim.pitch,
    parts: {
      body: bodyStats,
      screw: screwStats,
      pad: padStats,
      total: totalStats
    }
  };
}

function isMetalReference(matKey) {
  return matKey === 'alu6061' || matKey === 'ss304';
}
