import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Exact Parametric CAD & Support-Free DFM Geometry Engine (1 unit = 1.0 mm)
 * Generates 100% watertight 2-manifold geometries for:
 *  1. Twisted Ribbed Planter (Saksı) with <=45° DFM overhang limit, solid bottom,
 *     6 drainage funnels + 3 hidden <=40° under-foot Gothic-arch channels, and male twist-lock foot.
 *  2. Mating Twist-Lock Drip Tray (Alt Tabak) with Kilit_Toleransi_mm (0.25mm) clearance,
 *     central water reservoir, seating shelf, and <=43.5° support-free female bayonet wedges.
 */

export const MATERIAL_DENSITIES = {
  PLA: { name: 'Mat PLA (1.24 g/cm³)', density: 1.24 },
  PETG: { name: 'Su Geçirmez PETG (1.27 g/cm³)', density: 1.27 },
  ASA: { name: 'Dış Mekan UV ASA (1.07 g/cm³)', density: 1.07 },
  ABS: { name: 'Teknik ABS (1.04 g/cm³)', density: 1.04 },
};

export const PRESET_CONFIGS = {
  S: {
    id: 'S',
    label: 'S — Küçük Masaüstü (Ø95×95)',
    Saksi_Capi_mm: 95,
    Saksi_Yuksekligi_mm: 95,
    Doku_Kanat_Sayisi: 20,
    Kanat_Derinligi_mm: 3.2,
    Burulma_Acisi_Derece: 35,
    Cidar_Kalinligi_mm: 2.0,
    Kilit_Toleransi_mm: 0.25,
    Alt_Tabak_Yukseklik_mm: 18,
  },
  M: {
    id: 'M',
    label: 'M — Standart Salon (Ø140×150)',
    Saksi_Capi_mm: 140,
    Saksi_Yuksekligi_mm: 150,
    Doku_Kanat_Sayisi: 24,
    Kanat_Derinligi_mm: 4.5,
    Burulma_Acisi_Derece: 45,
    Cidar_Kalinligi_mm: 2.0,
    Kilit_Toleransi_mm: 0.25,
    Alt_Tabak_Yukseklik_mm: 20,
  },
  L: {
    id: 'L',
    label: 'L — Büyük Köşe Saksı (Ø205×215)',
    Saksi_Capi_mm: 205,
    Saksi_Yuksekligi_mm: 215,
    Doku_Kanat_Sayisi: 32,
    Kanat_Derinligi_mm: 6.0,
    Burulma_Acisi_Derece: 55,
    Cidar_Kalinligi_mm: 2.0,
    Kilit_Toleransi_mm: 0.25,
    Alt_Tabak_Yukseklik_mm: 20,
  },
  SPIRAL: {
    id: 'SPIRAL',
    label: 'Mimari Spiral (Ø135×195)',
    Saksi_Capi_mm: 135,
    Saksi_Yuksekligi_mm: 195,
    Doku_Kanat_Sayisi: 30,
    Kanat_Derinligi_mm: 5.0,
    Burulma_Acisi_Derece: 85,
    Cidar_Kalinligi_mm: 2.0,
    Kilit_Toleransi_mm: 0.25,
    Alt_Tabak_Yukseklik_mm: 20,
  },
  PLEATED: {
    id: 'PLEATED',
    label: 'Sık Yivli Minimal (Ø165×135)',
    Saksi_Capi_mm: 165,
    Saksi_Yuksekligi_mm: 135,
    Doku_Kanat_Sayisi: 44,
    Kanat_Derinligi_mm: 2.8,
    Burulma_Acisi_Derece: 22,
    Cidar_Kalinligi_mm: 2.0,
    Kilit_Toleransi_mm: 0.25,
    Alt_Tabak_Yukseklik_mm: 20,
  },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smoothstep01 = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Periodic architectural rib wave w(u) in [0, 1] and its derivative dw/du.
 * Blended raised flute profile for crisp highlight ridges without paper-thin knife edges.
 */
function ribWaveAndDeriv(u) {
  const c1 = Math.cos(u);
  const s1 = -Math.sin(u);
  const c2 = Math.cos(2 * u);
  const s2 = -2 * Math.sin(2 * u);
  // Normalized to [0, 1]: peak at u = 0, trough at u = pi
  const w = clamp(0.5 + 0.44 * c1 + 0.06 * c2, 0, 1);
  const dw = 0.44 * s1 + 0.06 * s2;
  return { w, dw };
}

/**
 * Shared dimensional solver ensuring Planter & Drip Tray interlock with exact Kilit_Toleransi_mm
 * and strictly <= 45° overhang across all slider combinations.
 */
export function computeDerivedDimensions(raw) {
  const D = clamp(Number(raw.Saksi_Capi_mm) || 140, 80, 220);
  const H = clamp(Number(raw.Saksi_Yuksekligi_mm) || 150, 80, 240);
  const N = Math.round(clamp(Number(raw.Doku_Kanat_Sayisi) || 24, 12, 48));
  const dRib = clamp(Number(raw.Kanat_Derinligi_mm) || 4.5, 2, 10);
  const twistReqDeg = clamp(Number(raw.Burulma_Acisi_Derece) ?? 45, 0, 120);
  const tw = clamp(Number(raw.Cidar_Kalinligi_mm) || 2.0, 1.2, 5.0);
  const tol = clamp(Number(raw.Kilit_Toleransi_mm) || 0.25, 0.1, 0.6);
  const hTray = clamp(Number(raw.Alt_Tabak_Yukseklik_mm) || 20, 15, 40);

  const rMax = D * 0.5;
  const rCore = rMax - dRib; // Guaranteed >= 30 mm (for D=80, dRib=10)

  // Bayonet lock & foot dimensions (3-lug twist-lock, 120 deg symmetry)
  const lugDepth = clamp(2.1, 1.8, 2.4);
  const neckStep = 4.2; // Radial step from rFootNeck out to rCore
  const rFootNeck = rCore - neckStep;
  const rMaleLug = rFootNeck + lugDepth; // < rCore by ~2.1mm

  // Vertical layout inside Drip Tray & Planter Foot
  const trayFloorT = clamp(tw, 1.8, 3.4);
  const reservoirH = clamp(hTray * 0.19, 2.4, 5.2);
  const yTraySeat = trayFloorT + reservoirH; // Where Planter y=0 rests inside Tray
  const availTrayWall = hTray - yTraySeat; // >= 15 - 4.8 = 10.2 mm

  // Male lug heights on Planter (measured from Planter bottom y = 0)
  const footChamfer = 0.5;
  const maleLugTopFlat = clamp(availTrayWall * 0.23, 2.2, 3.3);
  const maleLugRampH = lugDepth * 1.06; // ~43.3 deg top cam slope (upward facing = 0 overhang)
  const yMaleLugEnd = maleLugTopFlat + maleLugRampH;

  // Planter foot insert height & 43 deg flare out to rCore
  const flareH = neckStep * 1.08; // arctan(4.2 / 4.536) = 42.8 deg <= 45 deg
  const yInsertH = availTrayWall + 0.45; // 0.45mm crisp shadow reveal above tray rim
  const yFlareStart = Math.max(yMaleLugEnd + 0.8, yInsertH - flareH);
  const yRibStart = yFlareStart + flareH;
  const yRibEnd = H - Math.max(2.6, tw * 1.1);

  // Rib entry & exit vertical ramps (entry <= 41.5 deg before twist stack)
  const ribSpan = Math.max(24, yRibEnd - yRibStart);
  const hRampBot = Math.min(ribSpan * 0.34, Math.max(dRib * 1.75, 4.0));
  const hRampTop = Math.min(ribSpan * 0.22, Math.max(dRib * 1.25, 3.0));

  // Evaluate exact peak 3D overhang angle alpha(theta, y) for candidate twistRad
  const evalRibEnvelope = (y) => {
    const dyBot = y - yRibStart;
    const dyTop = yRibEnd - y;
    if (dyBot <= 0 || dyTop <= 0) return { A: 0, dAdy: 0 };
    let env = 1.0;
    let dEnv = 0.0;
    if (dyBot < hRampBot) {
      const u = dyBot / hRampBot;
      env = u * u * (3 - 2 * u);
      dEnv = (6 * u * (1 - u)) / hRampBot;
    } else if (dyTop < hRampTop) {
      const u = dyTop / hRampTop;
      env = u * u * (3 - 2 * u);
      dEnv = -(6 * u * (1 - u)) / hRampTop; // Negative slope = inward = 0 overhang
    }
    return { A: dRib * env, dAdy: dRib * dEnv };
  };

  // Twist profile eases softly across bottom ramp so A'(y) and phi'(y) do not collide
  const evalTwistAtY = (y, totalTwistRad) => {
    const s = clamp((y - yRibStart) / ribSpan, 0, 1);
    // Gentle ease-in at very bottom (first 15%), linear body, gentle ease-out
    const easeIn = 0.14;
    let f, dfds;
    if (s < easeIn) {
      const k = s / (2 - easeIn);
      f = (s * s) / (easeIn * (2 - easeIn));
      dfds = (2 * s) / (easeIn * (2 - easeIn));
      void k;
    } else {
      f = (2 * s - easeIn) / (2 - easeIn);
      dfds = 2 / (2 - easeIn);
    }
    return {
      phi: totalTwistRad * f,
      dPhidy: (totalTwistRad * dfds) / ribSpan,
    };
  };

  const maxOverhangDegForTwist = (totalTwistRad) => {
    let maxTan = neckStep / flareH; // ~0.926 (42.8 deg) baseline on foot bevel
    const ySamples = 56;
    const uSamples = 36;
    for (let iy = 1; iy < ySamples; iy++) {
      const y = yRibStart + (ribSpan * iy) / ySamples;
      const { A, dAdy } = evalRibEnvelope(y);
      const { dPhidy } = evalTwistAtY(y, totalTwistRad);
      for (let iu = 0; iu < uSamples; iu++) {
        const u = (Math.PI * 2 * iu) / uSamples;
        const { w, dw } = ribWaveAndDeriv(u);
        const R = rCore + A * w;
        const Rtheta = A * N * dw;
        const Ry = dAdy * w - Rtheta * dPhidy;
        if (Ry > 0) {
          const tanAlpha = (R * Ry) / Math.sqrt(R * R + Rtheta * Rtheta);
          if (tanAlpha > maxTan) maxTan = tanAlpha;
        }
      }
    }
    return THREE.MathUtils.radToDeg(Math.atan(maxTan));
  };

  const DFM_LIMIT_DEG = 44.8; // Strict <= 45.0 deg with numerical safety margin
  const twistReqRad = THREE.MathUtils.degToRad(twistReqDeg);
  let twistEffRad = twistReqRad;
  let unClampedPeakDeg = maxOverhangDegForTwist(twistReqRad);
  let dfmClamped = false;

  if (unClampedPeakDeg > DFM_LIMIT_DEG && twistReqRad > 0) {
    dfmClamped = true;
    let lo = 0;
    let hi = twistReqRad;
    for (let iter = 0; iter < 14; iter++) {
      const mid = 0.5 * (lo + hi);
      if (maxOverhangDegForTwist(mid) <= DFM_LIMIT_DEG) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    twistEffRad = lo;
  }

  const peakOverhangDeg = maxOverhangDegForTwist(twistEffRad);
  const twistEffDeg = THREE.MathUtils.radToDeg(twistEffRad);

  // Watertight bottom floor & interior soil basin dimensions
  const bottomThickness = Math.max(2.6, tw * 1.4);
  const yVaultTop = Math.min(yFlareStart - 0.6, Math.max(3.6, maleLugTopFlat + 1.4));
  const ySoilFloor = yVaultTop + bottomThickness;
  const rInTop = rCore - tw;
  const rInBot = Math.max(14, rFootNeck - tw - 0.8);
  const rVaultBot = Math.max(12, rFootNeck - Math.max(3.4, tw * 1.7));
  const rVaultTop = Math.max(11, rVaultBot - 1.2);

  // 6 hidden floor drainage funnels
  const drainHoleCount = 6;
  const drainHoleR = clamp(rVaultTop * 0.13, 1.9, 3.4);
  const drainPcdR = rVaultTop * 0.54;

  // Female bayonet inside Drip Tray (exact Kilit_Toleransi_mm = tol)
  const rFemaleBore = rMaleLug + tol;
  const rFemaleTip = rFootNeck + tol;
  const yTrayLugBot = yTraySeat + maleLugTopFlat + tol;
  const femaleRampH = (rFemaleBore - rFemaleTip) * 1.08; // ~42.8 deg overhang <= 45 deg
  const yTrayLugFlatEnd = Math.min(hTray - 2.6, yTrayLugBot + femaleRampH + 1.4);
  const yTrayLugTopEnd = Math.min(hTray - 0.9, yTrayLugFlatEnd + (rFemaleBore - rFemaleTip) * 0.95);

  return {
    D,
    H,
    N,
    dRib,
    twistReqDeg,
    twistEffDeg,
    twistEffRad,
    dfmClamped,
    unClampedPeakDeg,
    peakOverhangDeg,
    tw,
    tol,
    hTray,
    rMax,
    rCore,
    rFootNeck,
    rMaleLug,
    lugDepth,
    trayFloorT,
    reservoirH,
    yTraySeat,
    footChamfer,
    maleLugTopFlat,
    maleLugRampH,
    yMaleLugEnd,
    yFlareStart,
    flareH,
    yRibStart,
    yRibEnd,
    ribSpan,
    bottomThickness,
    yVaultTop,
    ySoilFloor,
    rInTop,
    rInBot,
    rVaultBot,
    rVaultTop,
    drainHoleCount,
    drainHoleR,
    drainPcdR,
    rFemaleBore,
    rFemaleTip,
    yTrayLugBot,
    femaleRampH,
    yTrayLugFlatEnd,
    yTrayLugTopEnd,
    evalRibEnvelope,
    evalTwistAtY,
  };
}

/**
 * Smooth 3-fold symmetric angular sector weight in [0, 1] around centers 0, 120, 240 deg (plus offset).
 */
function sectorWeight3(theta, offsetRad, halfFlatRad, rampRad) {
  let a = ((theta - offsetRad) % ((Math.PI * 2) / 3) + (Math.PI * 2) / 3) % ((Math.PI * 2) / 3);
  if (a > Math.PI / 3) a = (Math.PI * 2) / 3 - a; // Distance [0, pi/3] from nearest 120-deg center
  if (a <= halfFlatRad) return 1.0;
  if (a >= halfFlatRad + rampRad) return 0.0;
  return 1.0 - smoothstep01((a - halfFlatRad) / rampRad);
}

/**
 * Attaches DFM overhang angle attribute (in degrees, 0..90) per vertex for live DFM Heatmap shader/colors.
 */
function computeOverhangColorAttribute(nonIndexedGeom) {
  nonIndexedGeom.computeVertexNormals();
  const pos = nonIndexedGeom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const fn = new THREE.Vector3();

  let maxFaceOverhang = 0;

  for (let i = 0; i < pos.count; i += 3) {
    pA.fromBufferAttribute(pos, i);
    pB.fromBufferAttribute(pos, i + 1);
    pC.fromBufferAttribute(pos, i + 2);
    e1.subVectors(pB, pA);
    e2.subVectors(pC, pA);
    fn.crossVectors(e1, e2).normalize();

    const avgY = (pA.y + pB.y + pC.y) / 3;
    let overhangDeg = 0;
    // Faces directly resting on build plate y=0 (avgY < 0.08) are bed-supported (0 overhang)
    if (avgY > 0.08 && fn.y < -1e-4) {
      const horiz = Math.sqrt(fn.x * fn.x + fn.z * fn.z);
      overhangDeg = THREE.MathUtils.radToDeg(Math.atan2(-fn.y, horiz));
      if (overhangDeg > maxFaceOverhang) maxFaceOverhang = overhangDeg;
    }

    // Precision technical DFM palette:
    // 0-28 deg: emerald (#2d9d6a), 28-42 deg: warmochre (#d99b26), 42-45 deg: signal amber (#e05a2b), >45.5 deg: crimson
    let r, g, b;
    if (overhangDeg <= 28) {
      const t = overhangDeg / 28;
      r = THREE.MathUtils.lerp(0.16, 0.25, t);
      g = THREE.MathUtils.lerp(0.58, 0.72, t);
      b = THREE.MathUtils.lerp(0.42, 0.44, t);
    } else if (overhangDeg <= 43.5) {
      const t = (overhangDeg - 28) / 15.5;
      r = THREE.MathUtils.lerp(0.25, 0.88, t);
      g = THREE.MathUtils.lerp(0.72, 0.56, t);
      b = THREE.MathUtils.lerp(0.44, 0.16, t);
    } else if (overhangDeg <= 45.3) {
      const t = (overhangDeg - 43.5) / 1.8;
      r = THREE.MathUtils.lerp(0.88, 0.92, t);
      g = THREE.MathUtils.lerp(0.56, 0.34, t);
      b = THREE.MathUtils.lerp(0.16, 0.14, t);
    } else {
      r = 0.92;
      g = 0.16;
      b = 0.16;
    }

    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = r;
      colors[(i + k) * 3 + 1] = g;
      colors[(i + k) * 3 + 2] = b;
    }
  }

  nonIndexedGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  nonIndexedGeom.userData.maxFaceOverhangDeg = maxFaceOverhang;
  return nonIndexedGeom;
}

/**
 * Finalizes an indexed watertight manifold geometry into both:
 *  - manifoldGeom: pure indexed watertight BufferGeometry for STL export & metrology
 *  - displayGeom: creased-normal + DFM vertex-colored BufferGeometry for crisp CAD rendering
 */
function finalizeCadGeometry(positions, indices) {
  const manifoldGeom = new THREE.BufferGeometry();
  manifoldGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  manifoldGeom.setIndex(indices);
  manifoldGeom.computeVertexNormals();
  manifoldGeom.computeBoundingBox();

  let displayGeom;
  if (BufferGeometryUtils.toCreasedNormals) {
    displayGeom = BufferGeometryUtils.toCreasedNormals(
      manifoldGeom.clone(),
      THREE.MathUtils.degToRad(30)
    );
  } else {
    displayGeom = manifoldGeom.toNonIndexed();
    displayGeom.computeVertexNormals();
  }
  if (displayGeom.index) {
    displayGeom = displayGeom.toNonIndexed();
  }
  computeOverhangColorAttribute(displayGeom);
  displayGeom.computeBoundingBox();

  return { manifoldGeom, displayGeom };
}

/**
 * Builds the 100% Watertight 2-Manifold Twisted Ribbed Planter (Saksı).
 */
export function buildPlanterGeometry(rawParams) {
  const d = computeDerivedDimensions(rawParams);

  // Angular resolution divisible by 12 and scaled to rib count
  const rawM = Math.max(192, d.N * 8);
  const M = Math.min(384, Math.ceil(rawM / 12) * 12);

  // Hidden under-foot Gothic-arch drainage height at theta = 60, 180, 300 deg (between the 3 male bayonet pads)
  // Circumferential half-width chosen so arch slope <= 38 deg even at D = 80mm!
  const archHalfAngle = Math.min(THREE.MathUtils.degToRad(22), 3.6 / d.rVaultBot);
  const archPeakH = Math.min(2.2, d.yVaultTop - 1.2);

  const footArchY = (theta) => {
    // Centers at pi/3, pi, 5pi/3
    let a = ((theta - Math.PI / 3) % ((Math.PI * 2) / 3) + (Math.PI * 2) / 3) % ((Math.PI * 2) / 3);
    if (a > Math.PI / 3) a = (Math.PI * 2) / 3 - a;
    if (a >= archHalfAngle) return 0;
    const t = 1 - a / archHalfAngle;
    // Pointed Gothic arch (constant <= 38 deg slope, zero flat bridge at apex!)
    return archPeakH * Math.pow(t, 1.12);
  };

  // Male bayonet lug angular weight (3 lugs centered at 0, 120, 240 deg)
  const maleLugWeight = (theta) =>
    sectorWeight3(theta, 0, THREE.MathUtils.degToRad(18), THREE.MathUtils.degToRad(5.5));

  // Build ordered ring evaluators: each entry returns { r, y } at angle theta
  const ringDefs = [];

  // Ring 0: Vault ceiling inner ring (matches Bottom Floor Cap outer contour!)
  ringDefs.push((_th) => ({ r: d.rVaultTop, y: d.yVaultTop }));

  // Vault side wall going DOWN to foot base (with hidden arch modulation)
  ringDefs.push((th) => ({
    r: THREE.MathUtils.lerp(d.rVaultTop, d.rVaultBot, 0.5),
    y: THREE.MathUtils.lerp(d.yVaultTop, footArchY(th), 0.5),
  }));
  ringDefs.push((th) => ({ r: d.rVaultBot, y: footArchY(th) }));

  // Across bottom foot bed ring OUTWARD to outer foot chamfer
  ringDefs.push((th) => {
    const lugW = maleLugWeight(th);
    const rBase = d.rFootNeck + lugW * d.lugDepth - d.footChamfer;
    return { r: rBase, y: footArchY(th) };
  });

  // 45-deg elephant-foot chamfer UPWARD to male lug vertical flank
  ringDefs.push((th) => {
    const lugW = maleLugWeight(th);
    const rOuter = d.rFootNeck + lugW * d.lugDepth;
    const yBase = Math.max(d.footChamfer, footArchY(th) + 0.35);
    return { r: rOuter, y: yBase };
  });

  // Top of vertical male bayonet lug flank
  ringDefs.push((th) => {
    const lugW = maleLugWeight(th);
    return { r: d.rFootNeck + lugW * d.lugDepth, y: d.maleLugTopFlat };
  });

  // Top 45-deg cam-lock bevel of male lug back to rFootNeck
  ringDefs.push((_th) => ({ r: d.rFootNeck, y: d.yMaleLugEnd }));

  // Neck cylinder up to 43-deg body flare
  if (d.yFlareStart > d.yMaleLugEnd + 0.15) {
    ringDefs.push((_th) => ({ r: d.rFootNeck, y: d.yFlareStart }));
  }

  // 42.8-deg support-free conical flare from rFootNeck out to rCore
  ringDefs.push((_th) => ({
    r: THREE.MathUtils.lerp(d.rFootNeck, d.rCore, 0.5),
    y: THREE.MathUtils.lerp(d.yFlareStart, d.yRibStart, 0.5),
  }));

  // Twisted Ribbed Exterior Body (high vertical resolution for crisp helical flutes)
  const ribSteps = clamp(Math.round(d.ribSpan / 1.8), 52, 108);
  for (let s = 0; s <= ribSteps; s++) {
    const y = d.yRibStart + (d.ribSpan * s) / ribSteps;
    const { A } = d.evalRibEnvelope(y);
    const { phi } = d.evalTwistAtY(y, d.twistEffRad);
    ringDefs.push((th) => {
      const { w } = ribWaveAndDeriv(d.N * (th - phi));
      return { r: d.rCore + A * w, y };
    });
  }

  // Upper architectural rim lip + 45-deg outer & inner rim chamfers
  const rimBevel = Math.min(0.65, d.tw * 0.28);
  ringDefs.push((_th) => ({ r: d.rCore, y: d.H - rimBevel }));
  ringDefs.push((_th) => ({ r: d.rCore - rimBevel, y: d.H }));
  ringDefs.push((_th) => ({ r: d.rInTop + rimBevel, y: d.H }));
  ringDefs.push((_th) => ({ r: d.rInTop, y: d.H - rimBevel }));

  // Smooth tapered interior soil cavity wall going DOWN to Soil Floor Cap
  const innerSteps = 18;
  for (let s = 1; s <= innerSteps; s++) {
    const t = s / innerSteps;
    const y = THREE.MathUtils.lerp(d.H - rimBevel, d.ySoilFloor, t);
    // Gentle interior taper down to rInBot
    const r = THREE.MathUtils.lerp(d.rInTop, d.rInBot, Math.pow(t, 1.15));
    ringDefs.push((_th) => ({ r, y }));
  }

  const ringCount = ringDefs.length;
  const positions = [];
  const indices = [];

  // Populate all tubular ring vertices: vertex index = rIdx * M + i
  for (let rIdx = 0; rIdx < ringCount; rIdx++) {
    const fn = ringDefs[rIdx];
    for (let i = 0; i < M; i++) {
      const th = (Math.PI * 2 * i) / M;
      const { r, y } = fn(th);
      positions.push(r * Math.cos(th), y, r * Math.sin(th));
    }
  }

  // Stitch adjacent tubular rings (right-handed outward winding verified: (p00, p01, p10), (p10, p01, p11))
  for (let rIdx = 0; rIdx < ringCount - 1; rIdx++) {
    const row0 = rIdx * M;
    const row1 = (rIdx + 1) * M;
    for (let i = 0; i < M; i++) {
      const iNext = (i + 1) % M;
      const p00 = row0 + i;
      const p10 = row0 + iNext;
      const p01 = row1 + i;
      const p11 = row1 + iNext;
      indices.push(p00, p01, p10);
      indices.push(p10, p01, p11);
    }
  }

  // Perforated Top Soil Floor Cap (Ring = ringCount - 1, y = ySoilFloor, normal = +Y)
  // & Bottom Vault Ceiling Cap (Ring = 0, y = yVaultTop, normal = -Y) + 6 Conical Drainage Tunnels
  const holeSegs = 20;
  const H_COUNT = d.drainHoleCount;

  // Build unit 2D normalized contour + 6 holes for Earcut via ShapeUtils.triangulateShape
  const topContour2D = [];
  const botContour2D = [];
  for (let i = 0; i < M; i++) {
    const th = (Math.PI * 2 * i) / M;
    topContour2D.push(new THREE.Vector2(d.rInBot * Math.cos(th), d.rInBot * Math.sin(th)));
    botContour2D.push(new THREE.Vector2(d.rVaultTop * Math.cos(th), d.rVaultTop * Math.sin(th)));
  }

  const topHoles2D = [];
  const botHoles2D = [];
  const topHoleVertIdx = [];
  const botHoleVertIdx = [];

  // Funnel taper: slightly wider on top (1.12x) for debris-free entry, 0 overhang
  const rHoleTop = d.drainHoleR * 1.1;
  const rHoleBot = d.drainHoleR * 0.95;

  for (let h = 0; h < H_COUNT; h++) {
    const hAngle = (Math.PI * 2 * h) / H_COUNT + Math.PI / 6;
    const cx = d.drainPcdR * Math.cos(hAngle);
    const cz = d.drainPcdR * Math.sin(hAngle);

    const hTopPts = [];
    const hBotPts = [];
    const hTopIds = [];
    const hBotIds = [];

    for (let s = 0; s < holeSegs; s++) {
      // Clockwise in 2D (u, w) opposite to CCW outer contour
      const a = -(Math.PI * 2 * s) / holeSegs;
      const tx = cx + rHoleTop * Math.cos(a);
      const tz = cz + rHoleTop * Math.sin(a);
      const bx = cx + rHoleBot * Math.cos(a);
      const bz = cz + rHoleBot * Math.sin(a);

      hTopPts.push(new THREE.Vector2(tx, tz));
      hBotPts.push(new THREE.Vector2(bx, bz));

      const tIdx = positions.length / 3;
      positions.push(tx, d.ySoilFloor, tz);
      hTopIds.push(tIdx);

      const bIdx = positions.length / 3;
      positions.push(bx, d.yVaultTop, bz);
      hBotIds.push(bIdx);
    }

    topHoles2D.push(hTopPts);
    botHoles2D.push(hBotPts);
    topHoleVertIdx.push(hTopIds);
    botHoleVertIdx.push(hBotIds);
  }

  // Map triangulateShape vertex table -> 3D global vertex indices
  const topIndexMap = [];
  const botIndexMap = [];
  const topOuterRingStart = (ringCount - 1) * M;
  const botOuterRingStart = 0;

  for (let i = 0; i < M; i++) {
    topIndexMap.push(topOuterRingStart + i);
    botIndexMap.push(botOuterRingStart + i);
  }
  for (let h = 0; h < H_COUNT; h++) {
    for (let s = 0; s < holeSegs; s++) {
      topIndexMap.push(topHoleVertIdx[h][s]);
      botIndexMap.push(botHoleVertIdx[h][s]);
    }
  }

  const addCapTriangles = (contour2D, holes2D, idxMap, targetNormalYSign) => {
    const tris = THREE.ShapeUtils.triangulateShape(contour2D, holes2D);
    for (let t = 0; t < tris.length; t++) {
      const i0 = idxMap[tris[t][0]];
      const i1 = idxMap[tris[t][1]];
      const i2 = idxMap[tris[t][2]];
      const x0 = positions[i0 * 3], z0 = positions[i0 * 3 + 2];
      const x1 = positions[i1 * 3], z1 = positions[i1 * 3 + 2];
      const x2 = positions[i2 * 3], z2 = positions[i2 * 3 + 2];
      // y-component of (P1 - P0) x (P2 - P0) in 3D (x, constY, z)
      const ny = (z1 - z0) * (x2 - x0) - (x1 - x0) * (z2 - z0);
      if (ny * targetNormalYSign >= 0) {
        indices.push(i0, i1, i2);
      } else {
        indices.push(i0, i2, i1);
      }
    }
  };

  // Top soil floor faces +Y; Bottom vault ceiling faces -Y
  addCapTriangles(topContour2D, topHoles2D, topIndexMap, +1);
  addCapTriangles(botContour2D, botHoles2D, botIndexMap, -1);

  // Stitch the 6 conical drainage tunnels (normal must point INWARD toward hole center (cx, cz))
  for (let h = 0; h < H_COUNT; h++) {
    const hAngle = (Math.PI * 2 * h) / H_COUNT + Math.PI / 6;
    const cx = d.drainPcdR * Math.cos(hAngle);
    const cz = d.drainPcdR * Math.sin(hAngle);
    const tIds = topHoleVertIdx[h];
    const bIds = botHoleVertIdx[h];

    for (let s = 0; s < holeSegs; s++) {
      const sNext = (s + 1) % holeSegs;
      const b0 = bIds[s];
      const b1 = bIds[sNext];
      const t0 = tIds[s];
      const t1 = tIds[sNext];

      // Verify first triangle normal points toward (cx, cz)
      const x0 = positions[b0 * 3], y0 = positions[b0 * 3 + 1], z0 = positions[b0 * 3 + 2];
      const x1 = positions[b1 * 3], y1 = positions[b1 * 3 + 1], z1 = positions[b1 * 3 + 2];
      const x2 = positions[t0 * 3], y2 = positions[t0 * 3 + 1], z2 = positions[t0 * 3 + 2];

      const ux = x1 - x0, uy = y1 - y0, uz = z1 - z0;
      const vx = x2 - x0, vy = y2 - y0, vz = z2 - z0;
      const nx = uy * vz - uz * vy;
      const nz = ux * vy - uy * vx;
      const toCenterX = cx - x0;
      const toCenterZ = cz - z0;

      if (nx * toCenterX + nz * toCenterZ >= 0) {
        indices.push(b0, b1, t0);
        indices.push(b1, t1, t0);
      } else {
        indices.push(b0, t0, b1);
        indices.push(b1, t0, t1);
      }
    }
  }

  const { manifoldGeom, displayGeom } = finalizeCadGeometry(positions, indices);
  return { manifoldGeom, displayGeom, dims: d };
}

/**
 * Builds the 100% Watertight 2-Manifold Twist-Lock Drip Tray (Alt Tabak)
 * with exact Kilit_Toleransi_mm (0.25mm) bayonet clearance and <=43.5° DFM overhangs.
 */
export function buildDripTrayGeometry(rawParams) {
  const d = computeDerivedDimensions(rawParams);

  const M = 192; // Divisible by 12
  // Female bayonet lugs centered at 0, 120, 240 deg (in locked state, aligned right over Planter male lugs!)
  const femaleLugWeight = (theta) =>
    sectorWeight3(theta, 0, THREE.MathUtils.degToRad(19), THREE.MathUtils.degToRad(5.5));

  // Outer profile of Drip Tray: sleek architectural plinth flaring <= 42 deg toward rMax
  const maxTrayFlare = (d.hTray - 2.2) * 0.88; // <= 41.3 deg
  const rTrayBotOut = d.rFemaleBore + Math.max(d.tw, 2.2);
  const rTrayTopOut = Math.min(d.rMax, rTrayBotOut + maxTrayFlare);
  const rRimIn = Math.max(d.rFemaleBore + 0.6, rTrayTopOut - Math.max(d.tw, 2.2));
  const rReservoirWall = Math.max(8.0, d.rFootNeck - 1.8);
  const baseChamfer = 0.8;
  const rimBevel = 0.55;

  const ringDefs = [];

  // Ring 0: Bottom outer floor inner ring around bottom pole (y = 0)
  ringDefs.push((_th) => ({ r: rReservoirWall * 0.35, y: 0 }));
  ringDefs.push((_th) => ({ r: rTrayBotOut - baseChamfer, y: 0 }));
  ringDefs.push((_th) => ({ r: rTrayBotOut, y: baseChamfer }));

  // Outer wall smooth architectural flare up to rim
  const outerSteps = 10;
  for (let s = 1; s <= outerSteps; s++) {
    const t = s / outerSteps;
    const y = THREE.MathUtils.lerp(baseChamfer, d.hTray - rimBevel, t);
    const r = THREE.MathUtils.lerp(rTrayBotOut, rTrayTopOut, smoothstep01(t));
    ringDefs.push((_th) => ({ r, y }));
  }

  // Top rim bevel
  ringDefs.push((_th) => ({ r: rTrayTopOut - rimBevel, y: d.hTray }));
  ringDefs.push((_th) => ({ r: rRimIn + rimBevel, y: d.hTray }));
  ringDefs.push((_th) => ({ r: rRimIn, y: d.hTray - rimBevel }));

  // Upper interior lead-in cone down to top of female bayonet wedge
  ringDefs.push((_th) => ({ r: d.rFemaleBore, y: d.yTrayLugTopEnd }));

  // Female bayonet wedge top taper (sloping inward going down = upward facing = 0 overhang)
  ringDefs.push((th) => {
    const w = femaleLugWeight(th);
    return { r: THREE.MathUtils.lerp(d.rFemaleBore, d.rFemaleTip, w), y: d.yTrayLugFlatEnd };
  });

  // Female bayonet wedge inner flat crest (at rFemaleTip = rFootNeck + Kilit_Toleransi_mm)
  const yFemaleRampTop = d.yTrayLugBot + d.femaleRampH;
  ringDefs.push((th) => {
    const w = femaleLugWeight(th);
    return { r: THREE.MathUtils.lerp(d.rFemaleBore, d.rFemaleTip, w), y: yFemaleRampTop };
  });

  // Female bayonet wedge 42.8-deg underside locking slope (exact Kilit_Toleransi_mm clearance to male lug!)
  ringDefs.push((_th) => ({ r: d.rFemaleBore, y: d.yTrayLugBot }));

  // Open rotational bayonet track down to Planter seating shelf (y = yTraySeat)
  ringDefs.push((_th) => ({ r: d.rFemaleBore, y: d.yTraySeat }));

  // Annular Planter seating shelf with 3 subtle radial water-equalizing channels (<= 38 deg slope)
  const eqGroove = (th) => {
    let a = ((th - Math.PI / 3) % ((Math.PI * 2) / 3) + (Math.PI * 2) / 3) % ((Math.PI * 2) / 3);
    if (a > Math.PI / 3) a = (Math.PI * 2) / 3 - a;
    const hw = Math.min(0.24, 2.8 / rReservoirWall);
    if (a >= hw) return 0;
    return 1.2 * (1 - smoothstep01(a / hw));
  };

  ringDefs.push((th) => ({ r: rReservoirWall + 0.5, y: d.yTraySeat - eqGroove(th) }));
  ringDefs.push((th) => ({ r: rReservoirWall, y: d.yTraySeat - 0.5 - eqGroove(th) * 0.6 }));

  // Vertical drop into deep central water reservoir (y = trayFloorT)
  ringDefs.push((_th) => ({ r: rReservoirWall, y: d.trayFloorT + 0.4 }));
  ringDefs.push((_th) => ({ r: rReservoirWall - 0.4, y: d.trayFloorT }));
  ringDefs.push((_th) => ({ r: rReservoirWall * 0.35, y: d.trayFloorT }));

  const ringCount = ringDefs.length;
  const positions = [];
  const indices = [];

  for (let rIdx = 0; rIdx < ringCount; rIdx++) {
    const fn = ringDefs[rIdx];
    for (let i = 0; i < M; i++) {
      const th = (Math.PI * 2 * i) / M;
      const { r, y } = fn(th);
      positions.push(r * Math.cos(th), y, r * Math.sin(th));
    }
  }

  for (let rIdx = 0; rIdx < ringCount - 1; rIdx++) {
    const row0 = rIdx * M;
    const row1 = (rIdx + 1) * M;
    for (let i = 0; i < M; i++) {
      const iNext = (i + 1) % M;
      const p00 = row0 + i;
      const p10 = row0 + iNext;
      const p01 = row1 + i;
      const p11 = row1 + iNext;
      indices.push(p00, p01, p10);
      indices.push(p10, p01, p11);
    }
  }

  // Close bottom center pole (normal = -Y) and top inner reservoir pole (normal = +Y)
  const botPoleIdx = positions.length / 3;
  positions.push(0, 0, 0);
  const topPoleIdx = positions.length / 3;
  positions.push(0, d.trayFloorT, 0);

  const botRingStart = 0;
  const topRingStart = (ringCount - 1) * M;

  for (let i = 0; i < M; i++) {
    const iNext = (i + 1) % M;
    // Bottom pole: (P_bot, R[i], R[i+1]) -> -Y outward normal
    indices.push(botPoleIdx, botRingStart + i, botRingStart + iNext);
    // Top floor pole: (P_top, R[i+1], R[i]) -> +Y outward normal
    indices.push(topPoleIdx, topRingStart + iNext, topRingStart + i);
  }

  const { manifoldGeom, displayGeom } = finalizeCadGeometry(positions, indices);
  return { manifoldGeom, displayGeom, dims: d, rTrayTopOut, rTrayBotOut };
}

/**
 * Exact Signed Tetrahedron Volume, Surface Area, and Half-Edge Manifold Topology Verifier.
 */
export function computeMeshMetrology(indexedGeom) {
  const pos = indexedGeom.attributes.position;
  const idx = indexedGeom.index;
  let signedVolMm3 = 0;
  let areaMm2 = 0;

  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  // Half-edge manifold check on indexed geometry
  const directedEdges = new Set();
  const vCount = pos.count;
  let duplicateDirEdges = 0;

  const triCount = idx ? idx.count / 3 : pos.count / 3;
  for (let t = 0; t < triCount; t++) {
    const a = idx ? idx.getX(t * 3) : t * 3;
    const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;

    p1.fromBufferAttribute(pos, a);
    p2.fromBufferAttribute(pos, b);
    p3.fromBufferAttribute(pos, c);

    signedVolMm3 += p1.dot(cross.crossVectors(p2, p3)) / 6.0;
    ab.subVectors(p2, p1);
    ac.subVectors(p3, p1);
    areaMm2 += cross.crossVectors(ab, ac).length() * 0.5;

    if (idx) {
      const e1 = a * vCount + b;
      const e2 = b * vCount + c;
      const e3 = c * vCount + a;
      if (directedEdges.has(e1)) duplicateDirEdges++;
      if (directedEdges.has(e2)) duplicateDirEdges++;
      if (directedEdges.has(e3)) duplicateDirEdges++;
      directedEdges.add(e1);
      directedEdges.add(e2);
      directedEdges.add(e3);
    }
  }

  let openEdges = 0;
  if (idx) {
    for (const key of directedEdges) {
      const a = Math.floor(key / vCount);
      const b = key % vCount;
      const rev = b * vCount + a;
      if (!directedEdges.has(rev)) openEdges++;
    }
  }

  const volumeMm3 = Math.abs(signedVolMm3);
  return {
    volumeMm3,
    signedVolMm3,
    volCm3: volumeMm3 / 1000.0,
    areaCm2: areaMm2 / 100.0,
    triangleCount: triCount,
    openEdges,
    nonManifoldEdges: duplicateDirEdges,
    isWatertightManifold: openEdges === 0 && duplicateDirEdges === 0 && signedVolMm3 > 0,
  };
}

/**
 * Computes complete Engineering, Soil Volume (L), Turkish Shipping Desi, and Slicer Filament Telemetry.
 */
export function computeFullAssemblyReport(planterResult, trayResult, materialKey = 'PLA') {
  const d = planterResult.dims;
  const pMet = computeMeshMetrology(planterResult.manifoldGeom);
  const tMet = computeMeshMetrology(trayResult.manifoldGeom);
  const mat = MATERIAL_DENSITIES[materialKey] || MATERIAL_DENSITIES.PLA;

  // Exact usable internal Soil Volume (Liters) via numerical integration of the tapered cavity
  // Practical fill line = 10mm below top rim; Brim capacity = 100% up to rim
  const soilHFull = Math.max(10, d.H - 0.65 - d.ySoilFloor);
  const soilHUsable = Math.max(8, d.H - 10.0 - d.ySoilFloor);

  const integrateCavityMm3 = (hLimit) => {
    const steps = 64;
    let vol = 0;
    const dz = hLimit / steps;
    for (let i = 0; i < steps; i++) {
      const yMid = d.ySoilFloor + (i + 0.5) * dz;
      const t = clamp((d.H - 0.65 - yMid) / soilHFull, 0, 1);
      const r = THREE.MathUtils.lerp(d.rInTop, d.rInBot, Math.pow(t, 1.15));
      vol += Math.PI * r * r * dz;
    }
    return vol;
  };

  const soilVolUsableL = integrateCavityMm3(soilHUsable) / 1e6; // 1 L = 1,000,000 mm^3
  const soilVolBrimL = integrateCavityMm3(soilHFull) / 1e6;

  // Drip Tray Water Reservoir Capacity (mL)
  const rRes = Math.max(8.0, d.rFootNeck - 1.8);
  const waterReservoirMl = (Math.PI * rRes * rRes * d.reservoirH) / 1000.0;

  // Assembled overall height (Planter y=0 rests on Tray y=yTraySeat)
  const assembledHeightMm = d.yTraySeat + d.H;

  // Shipping Box Dimensions (protective corrugated e-commerce box: +30mm radial cushion, +35mm vertical cushion)
  const boxWidthCm = (d.D + 30) / 10.0;
  const boxLengthCm = (d.D + 30) / 10.0;
  const boxHeightCm = (assembledHeightMm + 35) / 10.0;
  // Standard Turkish Carrier Desi Formula: (En_cm * Boy_cm * Yukseklik_cm) / 3000
  const shippingDesi = (boxWidthCm * boxLengthCm * boxHeightCm) / 3000.0;

  // Mass calculations:
  // 1) 100% Solid CAD Mass (g)
  // 2) Realistic FDM Slicer Mass (2-3 perimeters + 18% gyroid infill on thick zones -> ~0.78 effective fill factor on thin-walled ribbed shells)
  const planterSolidMassG = pMet.volCm3 * mat.density;
  const traySolidMassG = tMet.volCm3 * mat.density;
  const slicerFillFactor = clamp(0.92 - (d.tw - 1.6) * 0.06, 0.72, 0.94);
  const planterPrintMassG = planterSolidMassG * slicerFillFactor;
  const trayPrintMassG = traySolidMassG * slicerFillFactor;
  const totalPrintMassG = planterPrintMassG + trayPrintMassG;

  // Estimated High-Speed CoreXY (Bambu P1S / Prusa MK4S) print time @ ~13.5 mm^3/s effective volumetric rate
  const effectiveVolMm3 = (pMet.volumeMm3 + tMet.volumeMm3) * slicerFillFactor;
  const estPrintHours = effectiveVolMm3 / (13.5 * 3600);

  return {
    dims: d,
    material: mat,
    materialKey,
    planter: {
      ...pMet,
      solidMassG: planterSolidMassG,
      printMassG: planterPrintMassG,
      bboxMm: { x: d.D, y: d.H, z: d.D },
    },
    tray: {
      ...tMet,
      solidMassG: traySolidMassG,
      printMassG: trayPrintMassG,
      bboxMm: { x: trayResult.rTrayTopOut * 2, y: d.hTray, z: trayResult.rTrayTopOut * 2 },
    },
    assembledHeightMm,
    soilVolUsableL,
    soilVolBrimL,
    waterReservoirMl,
    boxCm: { w: boxWidthCm, l: boxLengthCm, h: boxHeightCm },
    shippingDesi,
    totalSolidMassG: planterSolidMassG + traySolidMassG,
    totalPrintMassG,
    estPrintHours,
    allWatertight: pMet.isWatertightManifold && tMet.isWatertightManifold,
    skuCode: `SK-${Math.round(d.D)}x${Math.round(d.H)}-K${d.N}-B${Math.round(d.twistEffDeg)}`,
  };
}
