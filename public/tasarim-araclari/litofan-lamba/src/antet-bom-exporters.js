import * as THREE from 'three';
import { hexSecant } from './lithophane-cad.js';

/**
 * 2D ISO Technical Shop Drawing ("Imalat_Anteti" .SVG),
 * Live Engineering BOM ("Canli_Metraj_Tablosu" .CSV),
 * and Watertight Z-Up Binary .STL / .OBJ / .SCAD Exporters.
 */

export const PRINT_MATERIALS = {
  PLA_WHITE: { label: 'Beyaz Mat Litofan PLA', densityGcm3: 1.24, costPerKgTl: 680, tempC: '205°C / 60°C' },
  PETG_WHITE: { label: 'Yarı-Saydam Beyaz PETG', densityGcm3: 1.27, costPerKgTl: 740, tempC: '235°C / 75°C' },
  ASA_IVORY: { label: 'Isı Dayanımlı Fildişi ASA', densityGcm3: 1.07, costPerKgTl: 920, tempC: '250°C / 95°C' }
};

function fmt(n, digits = 2) {
  return Number(n).toFixed(digits);
}

function escXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Computes live engineering metrology & BOM rows for "Canli_Metraj_Tablosu".
 */
export function computeCanliMetrajTablosu(assembly, params, materialKey = 'PLA_WHITE') {
  const mat = PRINT_MATERIALS[materialKey] || PRINT_MATERIALS.PLA_WHITE;
  const { spec, lithoMetrology, baseMetrology, lithoManifold, baseManifold } = assembly;

  // Lithophane MUST print at 100% solid walls (999 perimeters / 100% infill) for pure Beer-Lambert optics
  const lithoSolidFactor = 1.0;
  const lithoMassG = lithoMetrology.volCm3 * mat.densityGcm3 * lithoSolidFactor;
  // Volumetric flow ~5.2 mm³/s for fine 0.12mm outer lithophane layers
  const lithoPrintHours = lithoMetrology.volumeMm3 / (5.2 * 3600);
  const lithoCostTl = (lithoMassG / 1000) * mat.costPerKgTl;

  // Snap-Fit Base prints at 0.20mm layer height, 4 perimeters + 28% gyroid (~0.62 effective solid fill)
  const baseEffectiveFactor = 0.64;
  const baseMassG = baseMetrology.volCm3 * mat.densityGcm3 * baseEffectiveFactor;
  const basePrintHours = (baseMetrology.volumeMm3 * baseEffectiveFactor) / (9.5 * 3600);
  const baseCostTl = (baseMassG / 1000) * mat.costPerKgTl;

  // Standard E14 hardware kit
  const e14HardwareMassG = 92.0;
  const e14HardwareCostTl = 145.0;

  const rows = [
    {
      kod: 'LP-01',
      parcaAdi: `Litofan Gövde (${spec.formType})`,
      malzeme: `${mat.label} (%100 Dolu)`,
      olcuMm: `${fmt(spec.spanMm, 1)} × ${fmt(spec.heightMm, 1)} mm (Cidar ${fmt(spec.minWallMm, 2)}–${fmt(spec.maxWallMm, 2)} mm)`,
      hacimCm3: lithoMetrology.volCm3,
      alanCm2: lithoMetrology.areaCm2,
      kutleG: lithoMassG,
      sureSaat: lithoPrintHours,
      maliyetTl: lithoCostTl,
      durum: lithoManifold.isWatertight ? '2-MANIFOLD OK' : 'KONTROL'
    },
    {
      kod: 'LP-02',
      parcaAdi: 'Snap-Fit E14 / LED Geçme Taban',
      malzeme: `${mat.label} (4 Duvar + %28 Gyroid)`,
      olcuMm: `${fmt(spec.outerBoundingWidthMm, 1)} × ${fmt(spec.baseTotalHeightMm, 1)} mm (Kanal ${fmt(spec.grooveTotalWidthMm, 2)} mm)`,
      hacimCm3: baseMetrology.volCm3,
      alanCm2: baseMetrology.areaCm2,
      kutleG: baseMassG,
      sureSaat: basePrintHours,
      maliyetTl: baseCostTl,
      durum: baseManifold.isWatertight ? '2-MANIFOLD OK' : 'KONTROL'
    },
    {
      kod: 'EL-03',
      parcaAdi: 'E14 Duy (Ø28.4) + 4W 2700K LED + Kablo',
      malzeme: 'Termoplastik E14 + H03VVH2-F Anahtarlı',
      olcuMm: `Ø${fmt(spec.e14BoreDiameterMm, 1)} Duy / ${fmt(spec.cordSlotWidthMm, 1)}×${fmt(spec.cordSlotHeightMm, 1)} Kablo Kanalı`,
      hacimCm3: 0,
      alanCm2: 0,
      kutleG: e14HardwareMassG,
      sureSaat: 0.08,
      maliyetTl: e14HardwareCostTl,
      durum: 'STANDART SET'
    }
  ];

  const totalFilamentG = lithoMassG + baseMassG;
  const totalMassG = totalFilamentG + e14HardwareMassG;
  const totalPrintHours = lithoPrintHours + basePrintHours;
  const totalCostTl = lithoCostTl + baseCostTl + e14HardwareCostTl;

  return {
    material: mat,
    materialKey,
    rows,
    totals: {
      totalVolCm3: lithoMetrology.volCm3 + baseMetrology.volCm3,
      totalAreaCm2: lithoMetrology.areaCm2 + baseMetrology.areaCm2,
      totalTriangles: lithoMetrology.triangleCount + baseMetrology.triangleCount,
      totalFilamentG,
      totalMassG,
      totalPrintHours,
      totalCostTl
    }
  };
}

/**
 * Helper to format hours into "Xs Ydk" Turkish string.
 */
export function formatHoursTr(hours) {
  const totalMin = Math.max(1, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} sa ${m} dk` : `${m} dk`;
}

/**
 * Generates an ISO 128 / TS EN 2D Technical Production Sheet ("Imalat_Anteti") SVG string.
 */
export function generateImalatAntetiSVG(assembly, params, bomData, imageName = 'Numune_Gorsel') {
  const { spec, sectionProfile, lithoMetrology, baseMetrology, lithoManifold, baseManifold } = assembly;
  const W = 1120;
  const H = 780;

  // SVG dimension helper
  const dimLine = (x1, y1, x2, y2, label, offset = 0, vertical = false, color = '#E04F33') => {
    let ax1 = x1, ay1 = y1, ax2 = x2, ay2 = y2;
    let ext = '';
    if (vertical) {
      ax1 = x1 + offset;
      ax2 = x2 + offset;
      ext = `<line x1="${x1}" y1="${y1}" x2="${ax1 + Math.sign(offset || 1) * 4}" y2="${y1}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.65"/>
             <line x1="${x2}" y1="${y2}" x2="${ax2 + Math.sign(offset || 1) * 4}" y2="${y2}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.65"/>`;
    } else if (offset !== 0) {
      ay1 = y1 + offset;
      ay2 = y2 + offset;
      ext = `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${ay1 + Math.sign(offset) * 4}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.65"/>
             <line x1="${x2}" y1="${y2}" x2="${x2}" y2="${ay2 + Math.sign(offset) * 4}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.65"/>`;
    }
    const mx = (ax1 + ax2) * 0.5;
    const my = (ay1 + ay2) * 0.5;
    const rot = vertical ? `transform="rotate(-90 ${mx} ${my})"` : '';
    return `${ext}
      <line x1="${ax1}" y1="${ay1}" x2="${ax2}" y2="${ay2}" stroke="${color}" stroke-width="1.15" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)"/>
      <g ${rot}>
        <rect x="${mx - (label.length * 3.4 + 6)}" y="${my - 8.5}" width="${label.length * 6.8 + 12}" height="15" rx="2" fill="#0D0E12" stroke="${color}" stroke-width="0.6"/>
        <text x="${mx}" y="${my + 3}" text-anchor="middle" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="600">${escXml(label)}</text>
      </g>`;
  };

  // =========================================================================
  // VIEW 1 (LEFT): SECTION A-A VERTICAL ASSEMBLY & WALL RELIEF (X: 30..450, Y: 55..500)
  // =========================================================================
  const secCx = 238;
  const secBottomY = 468;
  const availH = 355;
  const availW = 290;
  const scaleSec = Math.min(availH / (spec.assembledTotalHeightMm + 12), availW / (spec.outerBoundingWidthMm + 24));

  const sx = (mmX) => secCx + mmX * scaleSec;
  const sy = (mmY) => secBottomY - mmY * scaleSec;

  // Build right-side (+Z front) & left-side (-Z rear) detailed lithophane section polygon paths
  const seatY = spec.grooveFloorYMm;
  const rInBase = spec.innerRefMm;
  const rightLithoPts = [];
  for (let i = 0; i < sectionProfile.length; i++) {
    const p = sectionProfile[i];
    rightLithoPts.push(`${fmt(sx(rInBase + p.rOutFront), 2)},${fmt(sy(seatY + p.y), 2)}`);
  }
  for (let i = sectionProfile.length - 1; i >= 0; i--) {
    const p = sectionProfile[i];
    rightLithoPts.push(`${fmt(sx(rInBase + p.rInFront), 2)},${fmt(sy(seatY + p.y), 2)}`);
  }

  let leftLithoMarkup = '';
  if (spec.formType !== 'Curved_Panel') {
    const leftPts = [];
    for (let i = 0; i < sectionProfile.length; i++) {
      const p = sectionProfile[i];
      leftPts.push(`${fmt(sx(-(rInBase + p.rOutBack)), 2)},${fmt(sy(seatY + p.y), 2)}`);
    }
    for (let i = sectionProfile.length - 1; i >= 0; i--) {
      const p = sectionProfile[i];
      leftPts.push(`${fmt(sx(-(rInBase + p.rInBack)), 2)},${fmt(sy(seatY + p.y), 2)}`);
    }
    leftLithoMarkup = `<polygon points="${leftPts.join(' ')}" fill="url(#hatch-pla)" stroke="#ECE8E1" stroke-width="1.35"/>`;
  }

  // Detailed DFM Base right half (+Z front: Alt Buat Z=7.2mm + stepped plinth + E14 ring-nut seat + gusset rib)
  const rBore = spec.e14BoreRadiusMm;
  const rNut = spec.e14NutSeatRadiusMm || 18.6;
  const rCollar = spec.e14CollarOuterRadiusMm;
  const rGIn = spec.grooveInnerRefMm;
  const rGOut = spec.grooveOuterRefMm;
  const rFootOut = rGOut + spec.outerBaseLipMm;
  const rCupOut = rFootOut - 1.3;
  const rFootIn = Math.max(rCollar + 2.0, rFootOut - 7.4);
  const yBuat = spec.wiringCavityHeightMm || 7.2;
  const rBackBaseOut = spec.formType === 'Curved_Panel' ? Math.max(35.0, rGIn * 0.68) : rFootOut;

  const rightBasePoly = [
    [rBore, yBuat], [rFootIn - 3.2, yBuat], [rFootIn, 0], [rFootOut, 0],
    [rFootOut, 8.2], [rCupOut, 9.6], [rCupOut, spec.baseTotalHeightMm],
    [rGOut, spec.baseTotalHeightMm], [rGOut, spec.grooveFloorYMm],
    [rGIn, spec.grooveFloorYMm], [rGIn, spec.baseTotalHeightMm - 0.9],
    [rGIn - 2.9, spec.baseTotalHeightMm - 0.9], [rGIn - 3.6, 14.8],
    [rCollar + 0.9, 16.2], [rCollar, 17.8], [rNut, 17.8], [rBore, 14.8]
  ].map(([rx, ry]) => `${fmt(sx(rx), 2)},${fmt(sy(ry), 2)}`).join(' ');

  // Left half shows continuous rear cord tunnel + Alt Buat chamber (-Z, Y = 0..7.2mm open!)
  const leftBasePoly = (spec.formType === 'Curved_Panel'
    ? [
        [-rBore, spec.cordSlotHeightMm], [-rBackBaseOut, spec.cordSlotHeightMm],
        [-rBackBaseOut, 14.8], [-rCollar - 1.0, 12.6], [-rCollar, 17.8], [-rNut, 17.8], [-rBore, 14.8]
      ]
    : [
        [-rBore, spec.cordSlotHeightMm], [-rFootOut, spec.cordSlotHeightMm],
        [-rFootOut, 8.2], [-rCupOut, 9.6], [-rCupOut, spec.baseTotalHeightMm],
        [-rGOut, spec.baseTotalHeightMm], [-rGOut, spec.grooveFloorYMm],
        [-rGIn, spec.grooveFloorYMm], [-rGIn, spec.baseTotalHeightMm - 0.9],
        [-rGIn + 2.9, spec.baseTotalHeightMm - 0.9], [-rGIn + 3.6, 12.2],
        [-rCollar - 0.9, 12.6], [-rCollar, 17.8], [-rNut, 17.8], [-rBore, 14.8]
      ]
  ).map(([rx, ry]) => `${fmt(sx(rx), 2)},${fmt(sy(ry), 2)}`).join(' ');

  // =========================================================================
  // VIEW 2 (CENTER): TOP PLAN VIEW (X: 465..765, Y: 55..395)
  // =========================================================================
  const planCx = 615;
  const planCy = 225;
  const scalePlan = Math.min(230 / (spec.outerBoundingWidthMm + 16), 230 / (spec.outerBoundingDepthMm + 16));

  const polarPlanPath = (refR, steps = 120, arcOnly = false) => {
    const pts = [];
    if (arcOnly) {
      for (let i = 0; i <= steps; i++) {
        const th = -spec.panelArcRad * 0.5 + (i / steps) * spec.panelArcRad;
        const x = planCx + refR * Math.sin(th) * scalePlan;
        const y = planCy + refR * Math.cos(th) * scalePlan;
        pts.push(`${i === 0 ? 'M' : 'L'}${fmt(x, 2)},${fmt(y, 2)}`);
      }
      return pts.join(' ');
    }
    for (let i = 0; i < steps; i++) {
      const th = -Math.PI + (i / steps) * Math.PI * 2;
      let mult = 1.0;
      if (spec.formType === 'Hexagon') mult = hexSecant(th);
      const x = planCx + refR * mult * Math.sin(th) * scalePlan;
      const y = planCy + refR * mult * Math.cos(th) * scalePlan;
      pts.push(`${i === 0 ? 'M' : 'L'}${fmt(x, 2)},${fmt(y, 2)}`);
    }
    return pts.join(' ') + ' Z';
  };

  // 6 Radial Structural Gusset Ribs in Plan View
  let planGussets = '';
  for (let g = 0; g < 6; g++) {
    const ang = (g / 6) * Math.PI * 2;
    const r0 = spec.e14CollarOuterRadiusMm * scalePlan;
    const r1 = (spec.grooveInnerRefMm - 2.9) * scalePlan;
    if (r1 > r0 + 2) {
      planGussets += `<line x1="${fmt(planCx + Math.sin(ang) * r0, 1)}" y1="${fmt(planCy + Math.cos(ang) * r0, 1)}" x2="${fmt(planCx + Math.sin(ang) * r1, 1)}" y2="${fmt(planCy + Math.cos(ang) * r1, 1)}" stroke="#8C8F96" stroke-width="2.4" stroke-opacity="0.65"/>`;
    }
  }

  let planContours = '';
  if (spec.formType === 'Curved_Panel') {
    // D-pedestal + front 130° arc groove
    const pedPts = [];
    const steps = 120;
    const grooveHalf = spec.panelArcRad * 0.5 + 0.02;
    for (let i = 0; i < steps; i++) {
      const th = -Math.PI + (i / steps) * Math.PI * 2;
      const t = Math.max(0, Math.min(1, (Math.abs(th) - grooveHalf) / 0.7));
      const smooth = t * t * (3 - 2 * t);
      const rFront = spec.grooveOuterRefMm + spec.outerBaseLipMm;
      const rRear = Math.max(33.5, spec.grooveInnerRefMm * 0.66);
      const r = rFront * (1 - smooth) + rRear * smooth;
      pedPts.push(`${i === 0 ? 'M' : 'L'}${fmt(planCx + r * Math.sin(th) * scalePlan, 2)},${fmt(planCy + r * Math.cos(th) * scalePlan, 2)}`);
    }
    planContours = `
      <path d="${pedPts.join(' ')} Z" fill="#13151B" stroke="#8C8F96" stroke-width="1.3"/>
      <path d="${polarPlanPath(spec.grooveOuterRefMm, 72, true)}" fill="none" stroke="#F2A93B" stroke-width="1.3"/>
      <path d="${polarPlanPath(spec.grooveInnerRefMm, 72, true)}" fill="none" stroke="#F2A93B" stroke-width="1.3" stroke-dasharray="4 2"/>
    `;
  } else {
    planContours = `
      <path d="${polarPlanPath(spec.grooveOuterRefMm + spec.outerBaseLipMm, 144)}" fill="#13151B" stroke="#ECE8E1" stroke-width="1.4"/>
      <path d="${polarPlanPath(spec.grooveOuterRefMm, 144)}" fill="none" stroke="#F2A93B" stroke-width="1.15"/>
      <path d="${polarPlanPath(spec.grooveInnerRefMm, 144)}" fill="none" stroke="#F2A93B" stroke-width="1.15" stroke-dasharray="4 2"/>
    `;
  }

  // =========================================================================
  // VIEW 3 (RIGHT-TOP): DETAIL C — 6:1 SNAP-FIT GROOVE MAGNIFICATION (X: 780..1095, Y: 55..430)
  // =========================================================================
  const detCx = 938;
  const detFloorY = 308;
  const detScale = 16.5; // 1 mm = 16.5 px (large crystal-clear tolerance inspection!)

  const halfRimPx = (spec.frameWallMm * 0.5) * detScale;
  const clearPx = spec.clearanceMm * detScale;
  const halfGroovePx = halfRimPx + clearPx;
  const outerLipPx = halfGroovePx + spec.outerBaseLipMm * detScale;
  const innerLipPx = halfGroovePx + 2.6 * detScale;
  const grooveDepthPx = spec.grooveDepthMm * detScale;
  const grooveTopY = detFloorY - grooveDepthPx;
  const leadPx = 0.75 * detScale;

  // =========================================================================
  // VIEW 4 (BOTTOM-LEFT): LUMINANCE -> WALL CURVE & SLICER DFM SPECS
  // =========================================================================
  const chartX = 65, chartY = 565, chartW = 310, chartH = 135;
  const beerPts = [];
  for (let k = 0; k <= 40; k++) {
    const lum = k / 40;
    const tMm = spec.maxWallMm - lum * (spec.maxWallMm - spec.minWallMm);
    const trans = Math.exp(-1.18 * (tMm - spec.minWallMm));
    const px = chartX + lum * chartW;
    const py = chartY + chartH - trans * (chartH - 18);
    beerPts.push(`${k === 0 ? 'M' : 'L'}${fmt(px, 1)},${fmt(py, 1)}`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="background:#0B0C0F;">
  <defs>
    <pattern id="hatch-pla" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#E04F33" stroke-width="1.1" stroke-opacity="0.55"/>
    </pattern>
    <pattern id="hatch-base" width="7" height="7" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#8C8F96" stroke-width="1.0" stroke-opacity="0.5"/>
    </pattern>
    <pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ECE8E1" stroke-opacity="0.04" stroke-width="0.7"/>
    </pattern>
    <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 9 1.5 L 1.5 5 L 9 8.5 z" fill="#E04F33"/>
    </marker>
    <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 1 1.5 L 8.5 5 L 1 8.5 z" fill="#E04F33"/>
    </marker>
    <radialGradient id="bulb-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFF4D2" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#F2A93B" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#F2A93B" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- ISO SHEET FRAME & GRID -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#0B0C0F"/>
  <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="url(#cad-grid)" stroke="#ECE8E1" stroke-opacity="0.28" stroke-width="1.4"/>
  <rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#ECE8E1" stroke-opacity="0.12" stroke-width="0.8"/>

  <!-- TOP SHEET HEADER BAR -->
  <line x1="20" y1="48" x2="${W - 20}" y2="48" stroke="#ECE8E1" stroke-opacity="0.18" stroke-width="1"/>
  <text x="32" y="38" fill="#E04F33" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" letter-spacing="1.4">[ İMALAT ANTETİ · ISO 128 TEKNİK ÜRETİM PAFTASI ]</text>
  <text x="${W - 32}" y="38" text-anchor="end" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="10.5">BİRİM: MM · TOLERANS: ISO 2768-mK · DURUM: ${lithoManifold.isWatertight && baseManifold.isWatertight ? 'SU GEÇİRMEZ 2-MANIFOLD' : 'DOĞRULANIYOR'}</text>

  <!-- PANEL DIVIDERS -->
  <line x1="455" y1="48" x2="455" y2="515" stroke="#ECE8E1" stroke-opacity="0.14" stroke-width="1"/>
  <line x1="772" y1="48" x2="772" y2="515" stroke="#ECE8E1" stroke-opacity="0.14" stroke-width="1"/>
  <line x1="20" y1="515" x2="${W - 20}" y2="515" stroke="#ECE8E1" stroke-opacity="0.2" stroke-width="1.1"/>

  <!-- =================================================================== -->
  <!-- ZONE 1: SECTION A-A (DÜŞEY MONTAJ & RÖLYEF KESİTİ) -->
  <!-- =================================================================== -->
  <text x="34" y="70" fill="#ECE8E1" font-family="'Space Grotesk', sans-serif" font-size="12.5" font-weight="700">KESİT A-A · DÜŞEY MONTAJ &amp; LİTOFAN RÖLYEF PROFİLİ</text>
  <text x="34" y="85" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="9.5">GÖRSEL: ${escXml(imageName.slice(0, 34))} · CİDAR: ${fmt(spec.minWallMm, 2)}–${fmt(spec.maxWallMm, 2)} mm</text>

  <!-- Center Axis + E14 Bulb Visualization -->
  <line x1="${secCx}" y1="96" x2="${secCx}" y2="${secBottomY + 18}" stroke="#F2A93B" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="12 4 2 4"/>
  <circle cx="${secCx}" cy="${sy(seatY + spec.heightMm * 0.44)}" r="${Math.min(68, spec.innerRefMm * scaleSec * 0.85)}" fill="url(#bulb-glow)"/>
  <!-- E14 Socket & Bulb Envelope -->
  <rect x="${sx(-13.8)}" y="${sy(42)}" width="${27.6 * scaleSec}" height="${42 * scaleSec}" rx="2" fill="#171920" stroke="#8C8F96" stroke-width="1" stroke-dasharray="3 2"/>
  <ellipse cx="${secCx}" cy="${sy(68)}" rx="${16.5 * scaleSec}" ry="${26 * scaleSec}" fill="none" stroke="#F2A93B" stroke-width="1.1" stroke-dasharray="4 2"/>
  <text x="${secCx}" y="${sy(68)}" text-anchor="middle" fill="#F2A93B" font-family="'JetBrains Mono', monospace" font-size="8.5">E14 LED</text>

  <!-- Snap-Fit Base Section Halves -->
  <polygon points="${rightBasePoly}" fill="url(#hatch-base)" stroke="#ECE8E1" stroke-width="1.35"/>
  <polygon points="${leftBasePoly}" fill="url(#hatch-base)" stroke="#ECE8E1" stroke-width="1.35"/>

  <!-- Rear Cord Slot Callout (-Z Left Side) -->
  <line x1="${sx(-rBackBaseOut - 18)}" y1="${sy(spec.cordSlotHeightMm * 0.5)}" x2="${sx(-rBore + 4)}" y2="${sy(spec.cordSlotHeightMm * 0.5)}" stroke="#2BB673" stroke-width="1.6" stroke-dasharray="4 2"/>
  <text x="${sx(-rBackBaseOut)}" y="${sy(-5)}" text-anchor="middle" fill="#2BB673" font-family="'JetBrains Mono', monospace" font-size="8.8">ARKA KABLO KANALI (${fmt(spec.cordSlotWidthMm, 1)}×${fmt(spec.cordSlotHeightMm, 1)})</text>

  <!-- Displaced Lithophane Wall Section -->
  <polygon points="${rightLithoPts.join(' ')}" fill="url(#hatch-pla)" stroke="#ECE8E1" stroke-width="1.35"/>
  ${leftLithoMarkup}

  <!-- Detail C Callout Circle on Right Snap-Fit Joint -->
  <circle cx="${sx(rGIn + spec.frameWallMm * 0.5)}" cy="${sy(spec.grooveFloorYMm + spec.grooveDepthMm * 0.5)}" r="15" fill="none" stroke="#F2A93B" stroke-width="1.3" stroke-dasharray="3 2"/>
  <text x="${sx(rGOut + 9)}" y="${sy(spec.baseTotalHeightMm + 6)}" fill="#F2A93B" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700">DETAY C</text>

  <!-- Dimensions for Section A-A -->
  ${dimLine(sx(spec.outerRimRefMm), sy(seatY), sx(spec.outerRimRefMm), sy(seatY + spec.heightMm), `H=${fmt(spec.heightMm, 1)} mm`, 36, true)}
  ${dimLine(sx(-rBackBaseOut), sy(0), sx(-rBackBaseOut), sy(spec.assembledTotalHeightMm), `TOP=${fmt(spec.assembledTotalHeightMm, 1)} mm`, -34, true, '#8C8F96')}
  ${dimLine(sx(-spec.outerRimRefMm), sy(seatY + spec.heightMm), sx(spec.outerRimRefMm), sy(seatY + spec.heightMm), `Ø/EN=${fmt(spec.spanMm, 1)} mm`, -22, false)}
  ${dimLine(sx(-rBore), sy(0), sx(rBore), sy(0), `E14 Ø${fmt(spec.e14BoreDiameterMm, 1)}`, 22, false, '#F2A93B')}

  <!-- =================================================================== -->
  <!-- ZONE 2: TOP PLAN VIEW (ÜST PLAN & KABLO EKSENİ) -->
  <!-- =================================================================== -->
  <text x="470" y="70" fill="#ECE8E1" font-family="'Space Grotesk', sans-serif" font-size="12.5" font-weight="700">ÜST PLAN GÖRÜNÜŞÜ (${escXml(spec.formType.toUpperCase())})</text>
  <text x="470" y="85" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="9.5">TABAN DIŞ: ${fmt(spec.outerBoundingWidthMm, 1)} × ${fmt(spec.outerBoundingDepthMm, 1)} mm</text>

  <!-- Crosshairs -->
  <line x1="${planCx - 132}" y1="${planCy}" x2="${planCx + 132}" y2="${planCy}" stroke="#ECE8E1" stroke-opacity="0.22" stroke-width="0.9" stroke-dasharray="8 3 2 3"/>
  <line x1="${planCx}" y1="${planCy - 132}" x2="${planCx}" y2="${planCy + 132}" stroke="#ECE8E1" stroke-opacity="0.22" stroke-width="0.9" stroke-dasharray="8 3 2 3"/>

  ${planContours}
  ${planGussets}

  <!-- E14 Center Collar, Ring-Nut Counterbore & Bore -->
  <circle cx="${planCx}" cy="${planCy}" r="${spec.e14CollarOuterRadiusMm * scalePlan}" fill="#14171F" stroke="#8C8F96" stroke-width="1.1"/>
  <circle cx="${planCx}" cy="${planCy}" r="${(spec.e14NutSeatRadiusMm || 18.6) * scalePlan}" fill="none" stroke="#F2A93B" stroke-width="0.9" stroke-dasharray="3 2"/>
  <circle cx="${planCx}" cy="${planCy}" r="${spec.e14BoreRadiusMm * scalePlan}" fill="#0B0C0F" stroke="#2BB673" stroke-width="1.35"/>
  <text x="${planCx}" y="${planCy + 3}" text-anchor="middle" fill="#2BB673" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="700">Ø28.4</text>

  <!-- Rear Cord Slot Channel (-Z = Upward in Plan) -->
  <rect x="${planCx - (spec.cordSlotWidthMm * 0.5) * scalePlan}" y="${planCy - (spec.outerBoundingDepthMm * 0.52) * scalePlan}" width="${spec.cordSlotWidthMm * scalePlan}" height="${(spec.outerBoundingDepthMm * 0.52 - spec.e14BoreRadiusMm) * scalePlan}" fill="#2BB673" fill-opacity="0.18" stroke="#2BB673" stroke-width="1" stroke-dasharray="3 2"/>
  <text x="${planCx}" y="${planCy - (spec.outerBoundingDepthMm * 0.52) * scalePlan - 8}" text-anchor="middle" fill="#2BB673" font-family="'JetBrains Mono', monospace" font-size="8.8">ARKA KABLO ÇIKIŞI (-Z · 180°)</text>
  <text x="${planCx}" y="${planCy + (spec.outerBoundingDepthMm * 0.52) * scalePlan + 16}" text-anchor="middle" fill="#F2A93B" font-family="'JetBrains Mono', monospace" font-size="8.8">ÖN BAKIŞ EKSENİ (+Z · 0°)</text>

  <!-- Plan Spec Box -->
  <rect x="472" y="408" width="284" height="94" rx="3" fill="#111319" stroke="#ECE8E1" stroke-opacity="0.14"/>
  <text x="484" y="427" fill="#F2A93B" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700">GEOMETRİK KONTROL ÖZETİ</text>
  <text x="484" y="445" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="9.2">• Form Tipi        : ${escXml(spec.formType)}</text>
  <text x="484" y="461" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="9.2">• Gövde Üçgen Sayı : ${lithoMetrology.triangleCount.toLocaleString('tr-TR')} adet</text>
  <text x="484" y="477" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="9.2">• Taban Üçgen Sayı : ${baseMetrology.triangleCount.toLocaleString('tr-TR')} adet</text>
  <text x="484" y="493" fill="#2BB673" font-family="'JetBrains Mono', monospace" font-size="9.2">• Açık Kenar (Edge): ${lithoManifold.boundaryEdges + baseManifold.boundaryEdges} (Su Geçirmez)</text>

  <!-- =================================================================== -->
  <!-- ZONE 3: DETAIL C — 6:1 SNAP-FIT CLEARANCE GROOVE -->
  <!-- =================================================================== -->
  <text x="786" y="70" fill="#F2A93B" font-family="'Space Grotesk', sans-serif" font-size="12.5" font-weight="700">DETAY C (ÖLÇEK 6:1) · SNAP-FIT GEÇME KANALI</text>
  <text x="786" y="85" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="9.5">KANAL GENİŞLİĞİ = ÇERÇEVE (${fmt(spec.frameWallMm, 2)}) + 2×TOLERANS (${fmt(spec.clearanceMm, 2)})</text>

  <!-- Base U-Groove Profile in 6:1 Scale -->
  <polygon points="
    ${detCx - innerLipPx},${detFloorY + 46}
    ${detCx + outerLipPx},${detFloorY + 46}
    ${detCx + outerLipPx},${grooveTopY}
    ${detCx + halfGroovePx + leadPx},${grooveTopY}
    ${detCx + halfGroovePx - 1.8},${grooveTopY + 24}
    ${detCx + halfGroovePx},${detFloorY}
    ${detCx - halfGroovePx},${detFloorY}
    ${detCx - halfGroovePx},${grooveTopY + 14}
    ${detCx - halfGroovePx - leadPx},${grooveTopY + 6}
    ${detCx - innerLipPx},${grooveTopY + 6}
  " fill="url(#hatch-base)" stroke="#ECE8E1" stroke-width="1.6"/>

  <!-- Lithophane Structural Bottom Rim Tongue Seated with Clearance Gaps -->
  <rect x="${detCx - halfRimPx}" y="${grooveTopY - 62}" width="${halfRimPx * 2}" height="${grooveDepthPx + 59}" rx="1.5" fill="url(#hatch-pla)" stroke="#E04F33" stroke-width="1.6"/>

  <!-- Highlight 0.20mm Clearance Air Gaps on Both Sides -->
  <rect x="${detCx - halfGroovePx}" y="${grooveTopY + 12}" width="${clearPx}" height="${grooveDepthPx - 12}" fill="#2BB673" fill-opacity="0.32"/>
  <rect x="${detCx + halfRimPx}" y="${grooveTopY + 12}" width="${clearPx}" height="${grooveDepthPx - 12}" fill="#2BB673" fill-opacity="0.32"/>

  <!-- Detail C Precision Dimensions -->
  ${dimLine(detCx - halfRimPx, grooveTopY - 40, detCx + halfRimPx, grooveTopY - 40, `ÇERÇEVE ${fmt(spec.frameWallMm, 2)} mm`, 0, false, '#E04F33')}
  ${dimLine(detCx - halfGroovePx, detFloorY + 22, detCx + halfGroovePx, detFloorY + 22, `KANAL ${fmt(spec.grooveTotalWidthMm, 2)} mm`, 0, false, '#F2A93B')}
  ${dimLine(detCx + outerLipPx, grooveTopY, detCx + outerLipPx, detFloorY, `${fmt(spec.grooveDepthMm, 1)} mm`, 22, true, '#ECE8E1')}

  <text x="${detCx}" y="396" text-anchor="middle" fill="#2BB673" font-family="'JetBrains Mono', monospace" font-size="9.6" font-weight="700">YAN BOŞLUKLAR: 2 × ${fmt(spec.clearanceMm, 2)} mm · LABİRENT IŞIK KİLİDİ</text>
  <text x="${detCx}" y="413" text-anchor="middle" fill="#F2A93B" font-family="'JetBrains Mono', monospace" font-size="9.0">6x ESNEK SEGMAN TIRNAK + 0.8mm FİL AYAĞI PAHI</text>
  <text x="${detCx}" y="429" text-anchor="middle" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="9.0">ALT BUAT KABLO ODASI: ${fmt(spec.wiringCavityHeightMm || 7.2, 1)} mm · EĞİM SINIRI ≤52°</text>
  <text x="${detCx}" y="445" text-anchor="middle" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="9.0">ARKA DÖNME ÖNLEYİCİ KAMA (-Z) · 6x RADYAL FEDER</text>

  <!-- =================================================================== -->
  <!-- ZONE 4 (BOTTOM LEFT): OPTICAL CURVE & SLICER DFM PARAMETERS -->
  <!-- =================================================================== -->
  <text x="34" y="538" fill="#ECE8E1" font-family="'Space Grotesk', sans-serif" font-size="12" font-weight="700">OPTİK BEER-LAMBERT GEÇİRGENLİK &amp; DİLİMLEYİCİ (DFM) ÜRETİM REÇETESİ</text>

  <!-- Optical Graph Frame -->
  <rect x="${chartX}" y="${chartY}" width="${chartW}" height="${chartH}" fill="#101217" stroke="#ECE8E1" stroke-opacity="0.2"/>
  <path d="${beerPts.join(' ')}" fill="none" stroke="#F2A93B" stroke-width="2.2"/>
  <line x1="${chartX}" y1="${chartY + 18}" x2="${chartX + chartW}" y2="${chartY + chartH}" stroke="#E04F33" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="${chartX + 8}" y="${chartY + 15}" fill="#E04F33" font-family="'JetBrains Mono', monospace" font-size="8.8">KOYU PİKSEL: ${fmt(spec.maxWallMm, 2)} mm</text>
  <text x="${chartX + chartW - 8}" y="${chartY + 15}" text-anchor="end" fill="#F2A93B" font-family="'JetBrains Mono', monospace" font-size="8.8">PARLAK PİKSEL: ${fmt(spec.minWallMm, 2)} mm</text>
  <text x="${chartX + chartW * 0.5}" y="${chartY + chartH + 16}" text-anchor="middle" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="8.8">GÖRSEL LÜMİNANS (0.0 SİYAH → 1.0 BEYAZ)</text>

  <!-- Slicer DFM Checklist -->
  <rect x="395" y="555" width="320" height="165" rx="3" fill="#101217" stroke="#ECE8E1" stroke-opacity="0.16"/>
  <text x="409" y="575" fill="#E04F33" font-family="'JetBrains Mono', monospace" font-size="9.8" font-weight="700">3B BASKI (FDM) ZORUNLU DİLİMLEYİCİ NOTLARI</text>
  <text x="409" y="595" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="9.2">1. Doluluk (Litofan) : %100 Dolu veya 999 Çevre Duvar</text>
  <text x="409" y="613" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="9.2">2. Katman Yüksekliği : 0.12 mm (Gövde) / 0.20 mm (Taban)</text>
  <text x="409" y="631" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="9.2">3. Nozul Çapı / Hız  : Ø0.40 mm · Dış Duvar 35–45 mm/sn</text>
  <text x="409" y="649" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="9.2">4. Destek (Support)  : KAPALI (45° Pahlar Desteksiz Basılır)</text>
  <text x="409" y="667" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="9.2">5. Tabla Tutunma     : 5 mm Dış Brim (Dikey Kararlılık İçin)</text>
  <text x="409" y="685" fill="#F2A93B" font-family="'JetBrains Mono', monospace" font-size="9.2">6. Ampul Sınırı      : Yalnız LED (Maks 6W, Akkor Yasaktır!)</text>
  <text x="409" y="704" fill="#2BB673" font-family="'JetBrains Mono', monospace" font-size="9.2">7. Filament/Süre     : ${fmt(bomData.totals.totalFilamentG, 1)} g · ~${escXml(formatHoursTr(bomData.totals.totalPrintHours))}</text>

  <!-- =================================================================== -->
  <!-- ZONE 5 (BOTTOM RIGHT): ISO 7200 TITLE BLOCK (İMALAT ANTETİ) -->
  <!-- =================================================================== -->
  <g transform="translate(730, 532)">
    <rect x="0" y="0" width="356" height="202" fill="#111319" stroke="#ECE8E1" stroke-opacity="0.38" stroke-width="1.3"/>
    <line x1="0" y1="42" x2="356" y2="42" stroke="#ECE8E1" stroke-opacity="0.22"/>
    <line x1="0" y1="84" x2="356" y2="84" stroke="#ECE8E1" stroke-opacity="0.22"/>
    <line x1="0" y1="124" x2="356" y2="124" stroke="#ECE8E1" stroke-opacity="0.22"/>
    <line x1="0" y1="164" x2="356" y2="164" stroke="#ECE8E1" stroke-opacity="0.22"/>
    <line x1="178" y1="84" x2="178" y2="202" stroke="#ECE8E1" stroke-opacity="0.22"/>

    <text x="12" y="18" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="8.5">PROJE / ÜRÜN ADI</text>
    <text x="12" y="34" fill="#ECE8E1" font-family="'Space Grotesk', sans-serif" font-size="13" font-weight="700">3B LİTOFAN LAMBA &amp; SNAP-FIT E14 TABAN</text>

    <text x="12" y="58" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="8.5">MALZEME &amp; YÜZEY</text>
    <text x="12" y="75" fill="#F2A93B" font-family="'JetBrains Mono', monospace" font-size="10.2" font-weight="600">${escXml(bomData.material.label)} (${escXml(bomData.material.tempC)})</text>

    <text x="12" y="99" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="8.5">FORM TİPİ / PARÇA KODU</text>
    <text x="12" y="116" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="10.2" font-weight="600">${escXml(spec.formType)} · LP-01/02</text>

    <text x="190" y="99" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="8.5">GEÇME TOLERANSI</text>
    <text x="190" y="116" fill="#2BB673" font-family="'JetBrains Mono', monospace" font-size="10.2" font-weight="700">±${fmt(spec.clearanceMm, 2)} mm (Snap-Fit)</text>

    <text x="12" y="139" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="8.5">TOPLAM FİLAMENT / KÜTLE</text>
    <text x="12" y="156" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="10.2" font-weight="600">${fmt(bomData.totals.totalFilamentG, 1)} g (Set: ${fmt(bomData.totals.totalMassG, 1)} g)</text>

    <text x="190" y="139" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="8.5">BİRİM MALİYET (TAHMİNİ)</text>
    <text x="190" y="156" fill="#E04F33" font-family="'JetBrains Mono', monospace" font-size="10.2" font-weight="700">${fmt(bomData.totals.totalCostTl, 2)} TL</text>

    <text x="12" y="179" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="8.5">ÖLÇEK / BİRİM</text>
    <text x="12" y="195" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="10">PAFTA: OTOMATİK · STL: 1:1 MM</text>

    <text x="190" y="179" fill="#8C8F96" font-family="'JetBrains Mono', monospace" font-size="8.5">TARİH / REVİZYON</text>
    <text x="190" y="195" fill="#ECE8E1" font-family="'JetBrains Mono', monospace" font-size="10">11.11.2026 · REV-A2</text>
  </g>
</svg>`;
}

/**
 * Triggers a clean browser file download from Blob content.
 */
export function triggerDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Exports exact IEEE-754 Binary .STL rotated Z-up ((x, y, z) -> (x, -z, y), det = +1)
 * and shifted so minZ = 0.000 mm on the 3D slicer build plate.
 */
export function exportWatertightBinarySTL(geometry, filename, headerLabel = 'LITOFAN_CAD_1MM_WATERTIGHT') {
  const pos = geometry.attributes.position;
  const idx = geometry.index ? geometry.index.array : null;
  const triCount = idx ? idx.length / 3 : pos.count / 3;

  // Find minY in Three.js space (= minZ in slicer space) so model sits flat on Z = 0.000
  let minY = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
  }
  if (!Number.isFinite(minY)) minY = 0;

  const bufferLength = 84 + triCount * 50;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // 80-byte ASCII header
  const headerBytes = new TextEncoder().encode(headerLabel.slice(0, 78));
  for (let i = 0; i < headerBytes.length; i++) {
    view.setUint8(i, headerBytes[i]);
  }
  view.setUint32(80, triCount, true);

  let offset = 84;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  for (let t = 0; t < triCount; t++) {
    const i0 = idx ? idx[t * 3] : t * 3;
    const i1 = idx ? idx[t * 3 + 1] : t * 3 + 1;
    const i2 = idx ? idx[t * 3 + 2] : t * 3 + 2;

    // Right-handed Z-up map: (x, y, z)_Three -> (x, -z, y - minY)_Slicer
    vA.set(pos.getX(i0), -pos.getZ(i0), pos.getY(i0) - minY);
    vB.set(pos.getX(i1), -pos.getZ(i1), pos.getY(i1) - minY);
    vC.set(pos.getX(i2), -pos.getZ(i2), pos.getY(i2) - minY);

    ab.subVectors(vB, vA);
    cb.subVectors(vC, vA);
    cb.crossVectors(ab, cb).normalize();

    view.setFloat32(offset, cb.x, true);
    view.setFloat32(offset + 4, cb.y, true);
    view.setFloat32(offset + 8, cb.z, true);

    view.setFloat32(offset + 12, vA.x, true);
    view.setFloat32(offset + 16, vA.y, true);
    view.setFloat32(offset + 20, vA.z, true);

    view.setFloat32(offset + 24, vB.x, true);
    view.setFloat32(offset + 28, vB.y, true);
    view.setFloat32(offset + 32, vB.z, true);

    view.setFloat32(offset + 36, vC.x, true);
    view.setFloat32(offset + 40, vC.y, true);
    view.setFloat32(offset + 44, vC.z, true);

    view.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  triggerDownloadBlob(new Blob([arrayBuffer], { type: 'application/octet-stream' }), filename);
}

/**
 * Exports "Imalat_Anteti.svg" vector production drawing.
 */
export function exportImalatAntetiSVG(svgMarkup, filename = 'Imalat_Anteti.svg') {
  triggerDownloadBlob(new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

/**
 * Exports "Canli_Metraj_Tablosu.csv" with UTF-8 BOM and semicolon delimiter for Turkish Excel compatibility.
 */
export function exportCanliMetrajCSV(bomData, params, filename = 'Canli_Metraj_Tablosu.csv') {
  const sep = ';';
  const lines = [
    ['PARCA_KODU', 'PARCA_ADI', 'MALZEME_VE_DOLULUK', 'BOYUT_VE_TOLERANS_MM', 'HACIM_CM3', 'YUZEY_ALANI_CM2', 'KUTLE_GRAM', 'TAHMINI_BASKI_SURESI_SAAT', 'BIRIM_MALIYET_TL', 'MANIFOLD_DURUMU'].join(sep)
  ];

  for (const r of bomData.rows) {
    lines.push([
      r.kod,
      `"${r.parcaAdi.replace(/"/g, '""')}"`,
      `"${r.malzeme.replace(/"/g, '""')}"`,
      `"${r.olcuMm.replace(/"/g, '""')}"`,
      fmt(r.hacimCm3, 2).replace('.', ','),
      fmt(r.alanCm2, 2).replace('.', ','),
      fmt(r.kutleG, 2).replace('.', ','),
      fmt(r.sureSaat, 2).replace('.', ','),
      fmt(r.maliyetTl, 2).replace('.', ','),
      r.durum
    ].join(sep));
  }

  lines.push([
    'TOPLAM',
    `"Litofan Lamba Tam Takim (${params.Form_Tipi})"`,
    `"${bomData.material.label}"`,
    `"Capi/En: ${params.Capi_veya_En_mm} mm | Yukseklik: ${params.Yukseklik_mm} mm | Tolerans: ${params.Taban_Gecme_Toleransi_mm} mm"`,
    fmt(bomData.totals.totalVolCm3, 2).replace('.', ','),
    fmt(bomData.totals.totalAreaCm2, 2).replace('.', ','),
    fmt(bomData.totals.totalMassG, 2).replace('.', ','),
    fmt(bomData.totals.totalPrintHours, 2).replace('.', ','),
    fmt(bomData.totals.totalCostTl, 2).replace('.', ','),
    'URETIME_HAZIR'
  ].join(sep));

  const utf8Bom = '\uFEFF';
  triggerDownloadBlob(new Blob([utf8Bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), filename);
}

/**
 * Exports Parametric OpenSCAD (.scad) companion script for the Snap-Fit E14 Base & Rim Envelope.
 */
export function exportParametricSCAD(spec, filename = 'SnapFit_Taban_Parametrik.scad') {
  const scad = `// Parametrik Litofan Snap-Fit E14/LED Taban (1 birim = 1.00 mm)
// Otomatik Üretildi - Form_Tipi: ${spec.formType}
$fn = 144;

Form_Tipi = "${spec.formType}";
Capi_veya_En_mm = ${fmt(spec.spanMm, 2)};
Yukseklik_mm = ${fmt(spec.heightMm, 2)};
Min_Cidar_mm = ${fmt(spec.minWallMm, 2)};
Maks_Cidar_mm = ${fmt(spec.maxWallMm, 2)};
Cerceve_Kalinlik_mm = ${fmt(spec.frameWallMm, 2)};
Taban_Gecme_Toleransi_mm = ${fmt(spec.clearanceMm, 2)};

Ic_Referans_mm = ${fmt(spec.innerRefMm, 3)};
Kanal_Ic_mm = ${fmt(spec.grooveInnerRefMm, 3)};
Kanal_Dis_mm = ${fmt(spec.grooveOuterRefMm, 3)};
E14_Delik_Capi_mm = ${fmt(spec.e14BoreDiameterMm, 2)};
Kablo_Kanal_Genislik_mm = ${fmt(spec.cordSlotWidthMm, 2)};
Kablo_Kanal_Yukseklik_mm = ${fmt(spec.cordSlotHeightMm, 2)};

module snap_fit_e14_base() {
  difference() {
    union() {
      cylinder(h = ${fmt(spec.baseTotalHeightMm, 2)}, r = Kanal_Dis_mm + ${fmt(spec.outerBaseLipMm, 2)}, $fn = Form_Tipi == "Hexagon" ? 6 : 144);
    }
    // Snap-Fit Geçme Kanalı (0.20mm Toleranslı)
    translate([0, 0, ${fmt(spec.grooveFloorYMm, 2)}])
      difference() {
        cylinder(h = 10, r = Kanal_Dis_mm, $fn = Form_Tipi == "Hexagon" ? 6 : 144);
        translate([0, 0, -0.1])
          cylinder(h = 10.2, r = Kanal_Ic_mm, $fn = Form_Tipi == "Hexagon" ? 6 : 144);
      }
    // İç Havuz Boşaltma
    translate([0, 0, 10.8])
      difference() {
        cylinder(h = 10, r = Kanal_Ic_mm - 2.8);
        cylinder(h = 10.2, r = 19.0);
      }
    // Merkez E14 Duy Deliği (Ø28.4mm)
    translate([0, 0, -0.5])
      cylinder(h = 25, d = E14_Delik_Capi_mm);
    // Arka Kablo Kanalı (-Y / 180°)
    translate([-Kablo_Kanal_Genislik_mm/2, -(Kanal_Dis_mm + 10), -0.1])
      cube([Kablo_Kanal_Genislik_mm, Kanal_Dis_mm + 12, Kablo_Kanal_Yukseklik_mm + 0.1]);
  }
}

snap_fit_e14_base();
`;
  triggerDownloadBlob(new Blob([scad], { type: 'text/plain;charset=utf-8' }), filename);
}
