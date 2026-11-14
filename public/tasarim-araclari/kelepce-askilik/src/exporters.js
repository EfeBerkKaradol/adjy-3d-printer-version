import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MATERIALS, DESIGN_STYLES, build2DCBodyProfileData } from './geometry-engine.js';

const stlExporter = new STLExporter();
const objExporter = new OBJExporter();
const gltfExporter = new GLTFExporter();

function triggerBlobDownload(blob, filename) {
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
 * Clones a BufferGeometry, applies an orientation matrix, shifts min-Z to Z = 0.00 mm (print bed),
 * and centers X/Y if requested.
 */
function prepareSlicerGeometryZUp(sourceGeom, rotEuler = null, centerXY = true) {
  const geom = sourceGeom.clone();
  if (rotEuler) {
    const m = new THREE.Matrix4().makeRotationFromEuler(rotEuler);
    geom.applyMatrix4(m);
  }
  geom.computeBoundingBox();
  const bb = geom.boundingBox;
  const tx = centerXY ? -0.5 * (bb.min.x + bb.max.x) : 0;
  const ty = centerXY ? -0.5 * (bb.min.y + bb.max.y) : 0;
  const tz = -bb.min.z; // Sit flush on Z = 0.00 mm print bed
  geom.translate(tx, ty, tz);
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds the 3 print-oriented slicer meshes (Z-up, Z = 0 on build plate):
 *  - C-Body + J-Hook flat on its side (Z_assembled -> Z_slicer, continuous XY perimeters!)
 *  - 60° Trapezoidal Screw knob-down (+Y_local -> +Z_slicer via +90° X rotation)
 *  - Swivel Pad flat face-down (-Y_local -> +Z_slicer via -90° X rotation)
 */
export function buildPrintPlatterGroupZUp(geometries, dim) {
  const group = new THREE.Group();

  const bodyGeom = prepareSlicerGeometryZUp(geometries.body, null, true);
  bodyGeom.computeBoundingBox();
  const bodyBB = bodyGeom.boundingBox;
  const bodyMesh = new THREE.Mesh(bodyGeom);
  bodyMesh.name = 'C_Govde_Askilik_Yatay';
  group.add(bodyMesh);

  const screwGeom = prepareSlicerGeometryZUp(
    geometries.screw,
    new THREE.Euler(Math.PI * 0.5, 0, 0),
    true
  );
  const screwOffsetX = bodyBB.max.x + dim.knobRadius + 14.0;
  screwGeom.translate(screwOffsetX, 18.0, 0);
  const screwMesh = new THREE.Mesh(screwGeom);
  screwMesh.name = 'Trapez_Sikma_Vidasi_60deg';
  group.add(screwMesh);

  const padGeom = prepareSlicerGeometryZUp(
    geometries.pad,
    new THREE.Euler(-Math.PI * 0.5, 0, 0),
    true
  );
  padGeom.translate(screwOffsetX, -(dim.padRadius + 18.0), 0);
  const padMesh = new THREE.Mesh(padGeom);
  padMesh.name = 'Doner_Baski_Pabucu';
  group.add(padMesh);

  return group;
}

export function exportPartSTL(partKey, geometries, dim, assembledGroup) {
  let targetObj;
  let filename;
  const tag = `${dim.styleKey}_Tr${Math.round(dim.screwD)}_M${Math.round(dim.maxDesk)}`;

  if (partKey === 'body') {
    const g = prepareSlicerGeometryZUp(geometries.body, null, true);
    targetObj = new THREE.Mesh(g);
    filename = `01_C_Govde_Yatay_Baski_${tag}.stl`;
  } else if (partKey === 'screw') {
    const g = prepareSlicerGeometryZUp(geometries.screw, new THREE.Euler(Math.PI * 0.5, 0, 0), true);
    targetObj = new THREE.Mesh(g);
    filename = `02_Trapez_Vida_60deg_Tr${Math.round(dim.screwD)}.stl`;
  } else if (partKey === 'pad') {
    const g = prepareSlicerGeometryZUp(geometries.pad, new THREE.Euler(-Math.PI * 0.5, 0, 0), true);
    targetObj = new THREE.Mesh(g);
    filename = `03_Doner_Baski_Pabucu_Tr${Math.round(dim.screwD)}.stl`;
  } else if (partKey === 'platter') {
    targetObj = buildPrintPlatterGroupZUp(geometries, dim);
    filename = `Tum_Set_Baski_Tablasi_Z0_${tag}.stl`;
  } else {
    const clone = assembledGroup.clone(true);
    clone.rotation.set(Math.PI * 0.5, 0, 0);
    clone.updateMatrixWorld(true);
    targetObj = clone;
    filename = `Montaj_Referans_Set_${tag}.stl`;
  }

  targetObj.updateMatrixWorld(true);
  const buffer = stlExporter.parse(targetObj, { binary: true });
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  triggerBlobDownload(blob, filename);

  if (partKey !== 'assembled') {
    targetObj.traverse((child) => {
      if (child.isMesh && child.geometry) child.geometry.dispose();
    });
  }
}

export function exportOBJPlatter(geometries, dim) {
  const platter = buildPrintPlatterGroupZUp(geometries, dim);
  platter.updateMatrixWorld(true);
  const text = objExporter.parse(platter);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  triggerBlobDownload(blob, `Kelepce_${dim.styleKey}_Tr${Math.round(dim.screwD)}.obj`);
  platter.traverse((c) => { if (c.isMesh && c.geometry) c.geometry.dispose(); });
}

export function exportGLBScene(targetGroup, dim) {
  targetGroup.updateMatrixWorld(true);
  gltfExporter.parse(
    targetGroup,
    (result) => {
      const blob = new Blob([result], { type: 'model/gltf-binary' });
      triggerBlobDownload(blob, `Kelepce_${dim.styleKey}_3B_Tr${Math.round(dim.screwD)}.glb`);
    },
    (err) => console.error('GLB dışa aktarma hatası:', err),
    { binary: true }
  );
}

/**
 * Exports exact 1:1 mm AutoCAD .DXF side profile of the active design style (including J-hook & truss cutouts).
 */
export function exportProfileDXF(dim) {
  const { outerPts, holeLoops } = build2DCBodyProfileData(dim);
  const lines = [];

  const addLine = (x1, y1, x2, y2, layer = 'OUTLINE') => {
    lines.push(
      '0', 'LINE', '8', layer,
      '10', x1.toFixed(4), '20', y1.toFixed(4), '30', '0.0',
      '11', x2.toFixed(4), '21', y2.toFixed(4), '31', '0.0'
    );
  };
  const addCircle = (cx, cy, rad, layer = 'THREAD_REF') => {
    lines.push(
      '0', 'CIRCLE', '8', layer,
      '10', cx.toFixed(4), '20', cy.toFixed(4), '30', '0.0',
      '40', rad.toFixed(4)
    );
  };

  for (let i = 0; i < outerPts.length; i++) {
    const a = outerPts[i];
    const b = outerPts[(i + 1) % outerPts.length];
    addLine(a.x, a.y, b.x, b.y, 'OUTLINE');
  }

  holeLoops.forEach((hLoop) => {
    for (let i = 0; i < hLoop.length; i++) {
      const a = hLoop[i];
      const b = hLoop[(i + 1) % hLoop.length];
      addLine(a.x, a.y, b.x, b.y, 'TRUSS_CUTOUT');
    }
  });

  addLine(dim.xScrew, dim.yJawBot - 6, dim.xScrew, 4, 'CENTERLINE');
  addLine(dim.xScrew - dim.femaleMajorR, dim.yJawBot, dim.xScrew - dim.femaleMajorR, dim.yJawTop, 'THREAD_REF');
  addLine(dim.xScrew + dim.femaleMajorR, dim.yJawBot, dim.xScrew + dim.femaleMajorR, dim.yJawTop, 'THREAD_REF');
  addCircle(dim.xScrew, (dim.yJawTop + dim.yJawBot) * 0.5, dim.femaleMajorR, 'THREAD_REF');

  const dxf = [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$INSUNITS', '70', '4',
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
    ...lines,
    '0', 'ENDSEC', '0', 'EOF'
  ].join('\r\n');

  const blob = new Blob([dxf], { type: 'application/dxf;charset=utf-8' });
  triggerBlobDownload(blob, `Kelepce_${dim.styleKey}_1_1mm.dxf`);
}

/**
 * Exports Parametric OpenSCAD (.scad) script matching exact active polygon & Turkish parameter names.
 */
export function exportOpenSCAD(params, dim) {
  const { outerPts, holeLoops } = build2DCBodyProfileData(dim);
  const fmtPts = (arr) => arr.map((p) => `[${p.x.toFixed(3)}, ${p.y.toFixed(3)}]`).join(', ');

  const holesScad = holeLoops.length > 0
    ? holeLoops.map((hl) => `      polygon([${fmtPts(hl)}]);`).join('\n')
    : '      // Ek kafes boslugu yok';

  const scad = `// ============================================================================
// AGIR HIZMET C-KELEPCE MASA KULAKLIK/KABLO & J-KANCA ASKISI (${dim.styleKey})
// Otomatik Uretilen 1:1 mm Parametrik OpenSCAD Kaynak Kodu
// ============================================================================

Maks_Masa_Kalinligi_mm  = ${dim.maxDesk.toFixed(2)};
Kelepce_Et_Kalinligi_mm = ${dim.wallT.toFixed(2)};
Aparat_Eni_mm           = ${dim.width.toFixed(2)};
Ic_Kose_Radyus_mm       = ${dim.innerR.toFixed(2)};
Basilir_Vida_Capi_mm    = ${dim.screwD.toFixed(2)};
Dis_Bosluk_Toleransi_mm = ${dim.clearance.toFixed(2)};
Aski_Kolu_Uzunlugu_mm   = ${dim.armLen.toFixed(2)};
Alt_J_Derinlik_mm       = ${dim.lowerJDepth.toFixed(2)};

Bogaz_Yuksekligi_mm     = ${dim.throatHeight.toFixed(2)};
Alt_Cene_Somun_Boyu_mm  = ${dim.nutHeight.toFixed(2)};
Vida_Merkez_X_mm        = ${dim.xScrew.toFixed(2)};

$fn = 84;

module profil_2d() {
  difference() {
    polygon([${fmtPts(outerPts)}]);
    union() {
${holesScad}
    }
  }
}

// Yatay Baski Tablasi Modu (Katman Ayrilmasi Onleyici Z=0 Dizilimi)
difference() {
  linear_extrude(height = Aparat_Eni_mm)
    profil_2d();

  translate([Vida_Merkez_X_mm, -Bogaz_Yuksekligi_mm - Alt_Cene_Somun_Boyu_mm - 1, Aparat_Eni_mm / 2])
    rotate([-90, 0, 0])
      cylinder(
        h = Alt_Cene_Somun_Boyu_mm + 2,
        d = Basilir_Vida_Capi_mm + 2 * Dis_Bosluk_Toleransi_mm
      );
}
`;
  const blob = new Blob([scad], { type: 'text/plain;charset=utf-8' });
  triggerBlobDownload(blob, `Kelepce_${dim.styleKey}_Tr${Math.round(dim.screwD)}.scad`);
}

/**
 * Generates the 2D "Imalat_Anteti" Thread/Load Engineering Sheet (.SVG string, A3 Landscape 1190x842)
 * dynamically rendering whichever hanger style (including Dual J-Hook / Deep J-Hook / Aero-Truss) is selected!
 */
export function generateImalatAntetiSVG(rawParams, metrics) {
  const { dim, styleInfo, material, parts } = metrics;
  const dateStr = new Date().toISOString().slice(0, 10);

  const { outerPts, holeLoops } = build2DCBodyProfileData(dim);

  // Compute exact 2D bounds to auto-fit any selected style (including deep J-hooks) cleanly into View 01 bay
  let minX = dim.xJawTip - 18, maxX = dim.wallT + dim.armLen + 12;
  let minY = dim.yJawBot - 22, maxY = dim.wallT + 22;
  outerPts.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const spanX = Math.max(80, maxX - minX);
  const spanY = Math.max(80, maxY - minY);
  const s1 = Math.min(430 / spanX, 330 / spanY, 3.0);

  const bayCenterX = 335;
  const bayCenterY = 295;
  const midCadX = (minX + maxX) * 0.5;
  const midCadY = (minY + maxY) * 0.5;

  const X = (mm) => (bayCenterX + (mm - midCadX) * s1).toFixed(2);
  const Y = (mm) => (bayCenterY - (mm - midCadY) * s1).toFixed(2);

  const loopToSvgPath = (pts) =>
    pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${X(p.x)} ${Y(p.y)}`).join(' ') + ' Z';

  const cBodyCompoundPath = [
    loopToSvgPath(outerPts),
    ...holeLoops.map(loopToSvgPath)
  ].join(' ');

  const t = dim.wallT;
  const r = dim.innerR;
  const L = dim.armLen;
  const xTip = dim.xJawTip;
  const yTop = dim.yJawTop;
  const yBot = dim.yJawBot;
  const xScr = dim.xScrew;
  const rFemMaj = dim.femaleMajorR;
  const rFemMin = dim.femaleMinorR;

  // Detail B (Enlarged 60° Trapezoidal Thread + Clearance Profile)
  const sb = 22.0;
  const bx = 760;
  const by = 225;
  const P = dim.pitch;
  const hRad = dim.radialDepth;
  const c = dim.clearance;

  function buildThreadWavePoints(baseX, isFemale) {
    const pts = [];
    const rDelta = hRad * sb;
    const clearPx = isFemale ? c * sb : 0;
    const xRoot = baseX + (isFemale ? rDelta + clearPx : 0);
    const xCrest = baseX + (isFemale ? clearPx : rDelta);
    [-1, 0, 1].forEach((k) => {
      const y0 = by + k * P * sb;
      const y1 = y0 + 0.13 * P * sb;
      const y2 = y0 + 0.37 * P * sb;
      const y3 = y0 + 0.63 * P * sb;
      const y4 = y0 + 0.87 * P * sb;
      const y5 = y0 + 1.00 * P * sb;
      if (isFemale) {
        pts.push(`${xCrest.toFixed(1)},${y0.toFixed(1)}`, `${xCrest.toFixed(1)},${y1.toFixed(1)}`, `${xRoot.toFixed(1)},${y2.toFixed(1)}`, `${xRoot.toFixed(1)},${y3.toFixed(1)}`, `${xCrest.toFixed(1)},${y4.toFixed(1)}`, `${xCrest.toFixed(1)},${y5.toFixed(1)}`);
      } else {
        pts.push(`${xRoot.toFixed(1)},${y0.toFixed(1)}`, `${xRoot.toFixed(1)},${y1.toFixed(1)}`, `${xCrest.toFixed(1)},${y2.toFixed(1)}`, `${xCrest.toFixed(1)},${y3.toFixed(1)}`, `${xRoot.toFixed(1)},${y4.toFixed(1)}`, `${xRoot.toFixed(1)},${y5.toFixed(1)}`);
      }
    });
    return pts.join(' ');
  }

  const malePts = buildThreadWavePoints(bx, false);
  const femalePts = buildThreadWavePoints(bx, true);
  const maleBlockPoly = `${bx - 36},${by - P * sb} ${malePts} ${bx - 36},${by + 2 * P * sb}`;
  const femaleBlockPoly = `${bx + hRad * sb + c * sb + 42},${by - P * sb} ${femalePts} ${bx + hRad * sb + c * sb + 42},${by + 2 * P * sb}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1190 842" width="420mm" height="297mm" font-family="'JetBrains Mono', 'Consolas', monospace">
  <defs>
    <pattern id="isoHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#141413" stroke-width="0.7" stroke-opacity="0.32" />
    </pattern>
    <pattern id="PolymerHatch" width="6" height="6" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#D9381E" stroke-width="0.75" stroke-opacity="0.38" />
    </pattern>
    <marker id="arrEnd" viewBox="0 0 10 6" refX="9" refY="3" markerWidth="7" markerHeight="5" orient="auto">
      <path d="M0,0 L10,3 L0,6 Z" fill="#141413" />
    </marker>
    <marker id="arrStart" viewBox="0 0 10 6" refX="1" refY="3" markerWidth="7" markerHeight="5" orient="auto">
      <path d="M10,0 L0,3 L10,6 Z" fill="#141413" />
    </marker>
    <marker id="arrRed" viewBox="0 0 10 6" refX="9" refY="3" markerWidth="7" markerHeight="5" orient="auto">
      <path d="M0,0 L10,3 L0,6 Z" fill="#D9381E" />
    </marker>
  </defs>

  <rect x="0" y="0" width="1190" height="842" fill="#F6F3EC" />
  <rect x="18" y="18" width="1154" height="806" fill="none" stroke="#141413" stroke-width="2" />
  <rect x="24" y="24" width="1142" height="794" fill="none" stroke="#141413" stroke-width="0.7" />

  <text x="38" y="44" font-size="10" fill="#575652" letter-spacing="1.5">[ TS EN ISO 128 / 5457 — A3 TEKNİK İMALAT PAFTASI // MİMARİ: ${styleInfo.shortTag} // BİRİM: MM ]</text>
  <text x="1150" y="44" font-size="10" fill="#D9381E" text-anchor="end" font-weight="bold">DESTEKSİZ FDM BASKI ONAYLI (45° CNC PAH + 60° TRAPEZ DİŞ)</text>
  <line x1="24" y1="54" x2="1166" y2="54" stroke="#141413" stroke-width="0.8" />

  <!-- VIEW 1: KESIT A-A -->
  <text x="42" y="78" font-size="12" font-weight="bold" fill="#141413">01 // KESİT A-A — ${styleInfo.shortTag} &amp; SIKIŞTIRMA MEKANİZMASI</text>
  <text x="42" y="94" font-size="9.5" fill="#575652">Kesit Düzlemi: Z = 0.00 mm | Aparat Eni (B) = ${dim.width.toFixed(1)} mm | 45° Yan Yüzey Pahı = ${dim.sideChamfer.toFixed(2)} mm</text>

  <!-- Ghost Desk Reference -->
  <rect x="${X(xTip - 12)}" y="${Y(0)}" width="${((Math.abs(xTip) + 12) * s1).toFixed(1)}" height="${(dim.maxDesk * s1).toFixed(1)}"
        fill="#E5DEC9" fill-opacity="0.55" stroke="#7A7260" stroke-width="1" stroke-dasharray="5,3" />
  <text x="${X(xTip - 8)}" y="${(parseFloat(Y(0)) + dim.maxDesk * s1 * 0.55).toFixed(1)}" font-size="9" fill="#4A453B">MASA (${dim.maxDesk.toFixed(0)} mm)</text>

  <!-- Active C-Body + J-Hook + Truss Windows Compound Path -->
  <path d="${cBodyCompoundPath}" fill="url(#isoHatch)" fill-rule="evenodd" stroke="#141413" stroke-width="1.8" />

  <!-- Female Bore Cutout inside Lower Jaw -->
  <rect x="${X(xScr - rFemMaj)}" y="${Y(yTop)}" width="${(rFemMaj * 2 * s1).toFixed(1)}" height="${((yTop - yBot) * s1).toFixed(1)}"
        fill="#F6F3EC" stroke="#141413" stroke-width="1.2" />
  <line x1="${X(xScr - rFemMin)}" y1="${Y(yTop)}" x2="${X(xScr - rFemMin)}" y2="${Y(yBot)}" stroke="#D9381E" stroke-width="1" stroke-dasharray="3,2" />
  <line x1="${X(xScr + rFemMin)}" y1="${Y(yTop)}" x2="${X(xScr + rFemMin)}" y2="${Y(yBot)}" stroke="#D9381E" stroke-width="1" stroke-dasharray="3,2" />

  <!-- Screw & Swivel Pad Schematic -->
  <line x1="${X(xScr)}" y1="${Y(5)}" x2="${X(xScr)}" y2="${Y(yBot - 26)}" stroke="#D9381E" stroke-width="1" stroke-dasharray="8,3,2,3" />
  <rect x="${X(xScr - dim.padRadius)}" y="${Y(-dim.maxDesk)}" width="${(dim.padRadius * 2 * s1).toFixed(1)}" height="${(dim.padBaseH * s1).toFixed(1)}"
        fill="#ECE6D8" stroke="#141413" stroke-width="1.3" />
  <rect x="${X(xScr - dim.maleMinorR)}" y="${Y(-dim.maxDesk - dim.padBaseH)}" width="${(dim.maleMinorR * 2 * s1).toFixed(1)}" height="${((Math.abs(yBot) - dim.maxDesk - dim.padBaseH + 12) * s1).toFixed(1)}"
        fill="url(#PolymerHatch)" stroke="#D9381E" stroke-width="1.2" />
  <rect x="${X(xScr - dim.knobRadius)}" y="${Y(yBot - 12)}" width="${(dim.knobRadius * 2 * s1).toFixed(1)}" height="${(12 * s1).toFixed(1)}"
        rx="2" fill="#E3DDD0" stroke="#141413" stroke-width="1.4" />

  <!-- R6 Inner Fillet Callout -->
  <circle cx="${X(-r)}" cy="${Y(-r)}" r="${(r * s1).toFixed(1)}" fill="none" stroke="#D9381E" stroke-width="1" stroke-dasharray="2,2" />
  <text x="44" y="486" font-size="9.5" fill="#D9381E" font-weight="bold">• İç Boğaz Radyusu: R${r.toFixed(1)} mm (Kt=${metrics.kt.toFixed(2)}) | Et=${t.toFixed(1)} mm | Kol=${L.toFixed(0)} mm${dim.hasLowerJ ? ` | Alt J-Derinlik=${dim.lowerJDepth.toFixed(0)} mm` : ''}</text>

  <!-- VIEW 2: DETAIL B -->
  <line x1="635" y1="54" x2="635" y2="505" stroke="#141413" stroke-width="0.8" />
  <text x="655" y="78" font-size="12" font-weight="bold" fill="#141413">02 // DETAY B — 60° TRAPEZ VİDA &amp; DİŞ BOŞLUK TOLERANSI (ÖLÇEK ~7:1)</text>
  <text x="655" y="94" font-size="9.5" fill="#575652">Profil: ${dim.threadDesignation} | Diş Boşluğu (c) = +${dim.clearance.toFixed(2)} mm | Desteksiz 30° Yan Yüzey Eğimi</text>

  <rect x="655" y="110" width="490" height="275" fill="#FDFBF7" stroke="#141413" stroke-width="1" />
  <polygon points="${maleBlockPoly}" fill="url(#PolymerHatch)" stroke="#D9381E" stroke-width="1.8" />
  <polygon points="${femaleBlockPoly}" fill="url(#isoHatch)" stroke="#141413" stroke-width="1.8" />

  <text x="${bx - 30}" y="${by - P * sb - 8}" font-size="9.5" fill="#D9381E" font-weight="bold">ERKEK VİDA (Ø${dim.screwD.toFixed(2)})</text>
  <text x="${bx + hRad * sb + c * sb + 6}" y="${by - P * sb - 8}" font-size="9.5" fill="#141413" font-weight="bold">ALT ÇENE DİŞİ YUVA (Ø${(dim.femaleMajorR * 2).toFixed(2)})</text>

  <line x1="${bx - 52}" y1="${by}" x2="${bx - 52}" y2="${by + P * sb}" stroke="#141413" stroke-width="1.1" marker-start="url(#arrStart)" marker-end="url(#arrEnd)" />
  <text x="${bx - 58}" y="${by + P * sb * 0.55}" font-size="10" fill="#141413" text-anchor="end" font-weight="bold">P = ${P.toFixed(1)} mm</text>

  <line x1="${bx + hRad * sb + c * sb * 0.5}" y1="${by + 0.5 * P * sb}" x2="${bx + 150}" y2="${by + 0.25 * P * sb}" stroke="#D9381E" stroke-width="1.2" />
  <text x="${bx + 155}" y="${by + 0.22 * P * sb}" font-size="10" fill="#D9381E" font-weight="bold">Tolerans: +${dim.clearance.toFixed(2)} mm</text>
  <text x="${bx + 155}" y="${by + 0.22 * P * sb + 14}" font-size="9" fill="#575652">Sıkışma önleyici radyal + yan yüzey boşluğu</text>
  <text x="${bx + 155}" y="${by + 0.22 * P * sb + 32}" font-size="9.5" fill="#1F6E43" font-weight="bold">Tepe Açısı: 60° (Desteksiz Basılır)</text>
  <text x="${bx + 155}" y="${by + 0.22 * P * sb + 47}" font-size="9" fill="#141413">Çekirdek Çapı d3 = ${(dim.maleMinorR * 2).toFixed(2)} mm</text>
  <text x="${bx + 155}" y="${by + 0.22 * P * sb + 62}" font-size="9" fill="#141413">Kavrama Diş Sayısı = ${metrics.engagedThreadTurns.toFixed(1)} tam tur</text>

  <!-- VIEW 3: PRINT BED ORIENTATION -->
  <text x="655" y="410" font-size="11.5" font-weight="bold" fill="#141413">03 // FDM BASKI YÖNÜ &amp; KATMAN AYRILMASI ÖNLEME ANALİZİ</text>
  <rect x="655" y="420" width="238" height="78" fill="#E8F3EC" stroke="#1F6E43" stroke-width="1.2" />
  <text x="666" y="438" font-size="9.5" font-weight="bold" fill="#1F6E43">✓ BASKI TABLASI MODU (YAN YÜZEY Z=0)</text>
  <text x="666" y="454" font-size="8.8" fill="#141413">• Sürekli lifler R${r.toFixed(0)} boğaz ve J-kancayı sarar</text>
  <text x="666" y="468" font-size="8.8" fill="#141413">• Üst Askı: ${metrics.safeLoadFlatKg.toFixed(1)} kg | Alt J: ${metrics.jHookSafeKg.toFixed(1)} kg</text>
  <text x="666" y="482" font-size="8.8" fill="#1F6E43" font-weight="bold">• 45° Alt Pah ile %100 Desteksiz Baskı</text>

  <rect x="907" y="420" width="238" height="78" fill="#FBEAE6" stroke="#D9381E" stroke-width="1.1" />
  <text x="918" y="438" font-size="9.5" font-weight="bold" fill="#D9381E">✕ DİKEY BASKI ( ÖNERİLMEZ )</text>
  <text x="918" y="454" font-size="8.8" fill="#141413">• Çekme gerilmesi katmanlara dik biner</text>
  <text x="918" y="468" font-size="8.8" fill="#141413">• Delaminasyon Sınırı: ${metrics.safeLoadUprightKg.toFixed(1)} kg</text>
  <text x="918" y="482" font-size="8.8" fill="#D9381E" font-weight="bold">• Yatay Baskı Kazancı: +%${metrics.orientationGainPct.toFixed(0)} Dayanım</text>

  <!-- BOTTOM BOM & TITLE BLOCK -->
  <line x1="24" y1="505" x2="1166" y2="505" stroke="#141413" stroke-width="1.2" />

  <text x="42" y="528" font-size="11.5" font-weight="bold" fill="#141413">04 // PARÇA LİSTESİ (BOM), METROLOJİ VE BİRİM MALİYET TABLOSU</text>
  <rect x="42" y="538" width="675" height="146" fill="#FDFBF7" stroke="#141413" stroke-width="1" />
  <line x1="42" y1="564" x2="717" y2="564" stroke="#141413" stroke-width="1" />
  <line x1="42" y1="594" x2="717" y2="594" stroke="#141413" stroke-width="0.6" />
  <line x1="42" y1="624" x2="717" y2="624" stroke="#141413" stroke-width="0.6" />
  <line x1="42" y1="654" x2="717" y2="654" stroke="#141413" stroke-width="1" />

  <text x="52"  y="555" font-size="9" font-weight="bold">POZ / PARÇA ADI</text>
  <text x="275" y="555" font-size="9" font-weight="bold">BASKI YÖNÜ</text>
  <text x="405" y="555" font-size="9" font-weight="bold">HACİM (cm³)</text>
  <text x="495" y="555" font-size="9" font-weight="bold">AĞIRLIK (g)</text>
  <text x="580" y="555" font-size="9" font-weight="bold">SÜRE (dk)</text>
  <text x="650" y="555" font-size="9" font-weight="bold">MALİYET</text>

  <text x="52"  y="583" font-size="9">01  ${styleInfo.shortTag}</text>
  <text x="275" y="583" font-size="9" fill="#1F6E43">Yatay Yan Yüzey (Z=0)</text>
  <text x="405" y="583" font-size="9">${parts.body.volCm3.toFixed(2)}</text>
  <text x="495" y="583" font-size="9">${parts.body.printedMassG.toFixed(1)} g</text>
  <text x="580" y="583" font-size="9">${parts.body.printMinutes} dk</text>
  <text x="650" y="583" font-size="9">${parts.body.totalCostTL.toFixed(2)} TL</text>

  <text x="52"  y="613" font-size="9">02  60° Trapez Volan Vida</text>
  <text x="275" y="613" font-size="9" fill="#1F6E43">Başlık Tabanda (Z=0)</text>
  <text x="405" y="613" font-size="9">${parts.screw.volCm3.toFixed(2)}</text>
  <text x="495" y="613" font-size="9">${parts.screw.printedMassG.toFixed(1)} g</text>
  <text x="580" y="613" font-size="9">${parts.screw.printMinutes} dk</text>
  <text x="650" y="613" font-size="9">${parts.screw.totalCostTL.toFixed(2)} TL</text>

  <text x="52"  y="643" font-size="9">03  Esnek Segmanlı Döner Pabuç</text>
  <text x="275" y="643" font-size="9" fill="#1F6E43">Taban Aşağıda (Z=0)</text>
  <text x="405" y="643" font-size="9">${parts.pad.volCm3.toFixed(2)}</text>
  <text x="495" y="643" font-size="9">${parts.pad.printedMassG.toFixed(1)} g</text>
  <text x="580" y="643" font-size="9">${parts.pad.printMinutes} dk</text>
  <text x="650" y="643" font-size="9">${parts.pad.totalCostTL.toFixed(2)} TL</text>

  <text x="52"  y="673" font-size="9.5" font-weight="bold">TOPLAM SET (3 PARÇA)</text>
  <text x="275" y="673" font-size="9" font-weight="bold">%${metrics.infillPct} Doluluk / ${metrics.perimeters} Duvar</text>
  <text x="405" y="673" font-size="9.5" font-weight="bold">${parts.total.volCm3.toFixed(2)}</text>
  <text x="495" y="673" font-size="9.5" font-weight="bold">${parts.total.printedMassG.toFixed(1)} g</text>
  <text x="580" y="673" font-size="9.5" font-weight="bold">${parts.total.printMinutes} dk</text>
  <text x="650" y="673" font-size="9.5" font-weight="bold" fill="#D9381E">${parts.total.totalCostTL.toFixed(2)} TL</text>

  <text x="42" y="712" font-size="9.5" font-weight="bold" fill="#141413">ÜRETİM VE DİLİMLEYİCİ (SLICER) TALİMATLARI:</text>
  <text x="42" y="728" font-size="9" fill="#43423E">1. Katman Yüksekliği: 0.20 mm | Duvar Çevre Sayısı: Min. ${metrics.perimeters} çevre | 45° alt kenar pahı fil ayağı (elephant foot) oluşumunu engeller.</text>
  <text x="42" y="744" font-size="9" fill="#43423E">2. Maks. Eksenel Sıkma Kuvveti: ${metrics.maxClampingForceN.toFixed(0)} N | Uç Esneme: ${metrics.tipDeflectionMm.toFixed(2)} mm | Emniyet Katsayısı: SF = ${metrics.safetyFactor.toFixed(1)}.</text>
  <text x="42" y="760" font-size="9" fill="#43423E">3. Tolerans Sınıfı: ISO 2768-mK | Diş Boşluğu: +${dim.clearance.toFixed(2)} mm (${dim.threadDesignation}) | Destek (Support): KAPALI (%100 Desteksiz).</text>

  <!-- ISO TITLE BLOCK -->
  <rect x="740" y="538" width="410" height="264" fill="#EFECE3" stroke="#141413" stroke-width="1.6" />
  <line x1="740" y1="582" x2="1150" y2="582" stroke="#141413" stroke-width="1.2" />
  <line x1="740" y1="636" x2="1150" y2="636" stroke="#141413" stroke-width="1" />
  <line x1="740" y1="690" x2="1150" y2="690" stroke="#141413" stroke-width="1" />
  <line x1="740" y1="746" x2="1150" y2="746" stroke="#141413" stroke-width="1" />
  <line x1="945" y1="636" x2="945" y2="802" stroke="#141413" stroke-width="1" />

  <text x="754" y="556" font-size="8.5" fill="#575652" letter-spacing="1.2">İMALAT ANTETİ // ${styleInfo.shortTag}</text>
  <text x="754" y="574" font-size="11.5" font-weight="bold" fill="#141413">C-KELEPÇE KULAKLIK, KABLO &amp; J-KANCA İSTASYONU</text>

  <text x="754" y="600" font-size="8.5" fill="#575652">DİŞ STANDARDI &amp; TOLERANS</text>
  <text x="754" y="620" font-size="11" font-weight="bold" fill="#D9381E">${dim.threadDesignation} / +${dim.clearance.toFixed(2)} mm Boşluk</text>

  <text x="754" y="654" font-size="8.5" fill="#575652">MALZEME</text>
  <text x="754" y="675" font-size="10.5" font-weight="bold" fill="#141413">${material.shortName} (${material.density.toFixed(2)} g/cm³)</text>

  <text x="958" y="654" font-size="8.5" fill="#575652">GÜVENLİ YÜK (ÜST / J)</text>
  <text x="958" y="675" font-size="10.5" font-weight="bold" fill="#1F6E43">${metrics.safeLoadFlatKg.toFixed(1)} kg / ${metrics.jHookSafeKg.toFixed(1)} kg</text>

  <text x="754" y="708" font-size="8.5" fill="#575652">İÇ KÖŞE RADYUSU / EN</text>
  <text x="754" y="729" font-size="10.5" font-weight="bold" fill="#141413">R${dim.innerR.toFixed(1)} mm / B=${dim.width.toFixed(1)} mm</text>

  <text x="958" y="708" font-size="8.5" fill="#575652">TOPLAM BASKI AĞIRLIĞI</text>
  <text x="958" y="729" font-size="10.5" font-weight="bold" fill="#141413">${parts.total.printedMassG.toFixed(1)} g (${parts.total.printMinutes} dk)</text>

  <text x="754" y="764" font-size="8.5" fill="#575652">ÖLÇEK / BİRİM</text>
  <text x="754" y="786" font-size="10.5" font-weight="bold" fill="#141413">OTOMATİK FIT (Detay 7:1) / MM</text>

  <text x="958" y="764" font-size="8.5" fill="#575652">TARİH / BELGE NO</text>
  <text x="958" y="786" font-size="10.5" font-weight="bold" fill="#141413">${dateStr} / TR-CLAMP-02</text>
</svg>`;
}

export function exportImalatAntetiSVG(rawParams, metrics) {
  const svg = generateImalatAntetiSVG(rawParams, metrics);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const tag = `${metrics.dim.styleKey}_Tr${Math.round(metrics.dim.screwD)}_M${Math.round(metrics.dim.maxDesk)}`;
  triggerBlobDownload(blob, `Imalat_Anteti_${tag}.svg`);
}

/**
 * Exports Load Capacity & Manufacturing Cost CSV (UTF-8 with BOM).
 */
export function exportLoadAndCostCSV(rawParams, metrics, computeMetricsFn, partMetrology) {
  const { dim, styleInfo, material, parts } = metrics;
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [];

  rows.push(['BOLUM', 'PARAMETRE_KODU', 'ACIKLAMA', 'DEGER', 'BIRIM', 'TEKNIK_NOT']);

  rows.push(['1_PARAMETRELER', 'Tasarim_Stili', 'Seçili Askı Mimarisi', styleInfo.name, '-', styleInfo.shortTag]);
  rows.push(['1_PARAMETRELER', 'Maks_Masa_Kalinligi_mm', 'Maksimum Masa Kalınlığı', dim.maxDesk.toFixed(2), 'mm', '18-55 mm sıkma kapasitesi']);
  rows.push(['1_PARAMETRELER', 'Kelepce_Et_Kalinligi_mm', 'Kelepçe Gövde Et Kalınlığı', dim.wallT.toFixed(2), 'mm', 'Eğilme kesit modülünü belirler']);
  rows.push(['1_PARAMETRELER', 'Aparat_Eni_mm', 'Aparat Genişliği', dim.width.toFixed(2), 'mm', 'Yatay baskı tabla oturma yüksekliği']);
  rows.push(['1_PARAMETRELER', 'Ic_Kose_Radyus_mm', 'Gerilme Giderici İç Köşe Radyusu', dim.innerR.toFixed(2), 'mm', `Kt = ${metrics.kt.toFixed(2)} gerilme yığılması çarpanı`]);
  rows.push(['1_PARAMETRELER', 'Basilir_Vida_Capi_mm', '60° Trapez Basılır Vida Çapı', dim.screwD.toFixed(2), 'mm', dim.threadDesignation]);
  rows.push(['1_PARAMETRELER', 'Dis_Bosluk_Toleransi_mm', 'Dişi-Erkek Diş Boşluk Toleransı', dim.clearance.toFixed(2), 'mm', 'Radyal ve 60° yan yüzey boşluğu']);
  rows.push(['1_PARAMETRELER', 'Aski_Kolu_Uzunlugu_mm', 'Kulaklık ve Kablo Askı Kolu Boyu', dim.armLen.toFixed(2), 'mm', 'Konsol moment kolu']);
  if (dim.hasLowerJ) {
    rows.push(['1_PARAMETRELER', 'Alt_J_Derinlik_mm', 'Alt J-Kanca Dikey İniş Derinliği', dim.lowerJDepth.toFixed(2), 'mm', 'Çanta ve ağır kablo askı yuvası']);
  }

  rows.push(['2_MUKAVEMET', 'Guvenli_Tasima_Ust_Aski_kg', 'Üst Askı Güvenli Taşıma Yükü (Yatay Baskı)', metrics.safeLoadFlatKg.toFixed(2), 'kg', `SF=${metrics.safetyFactor.toFixed(1)} emniyet katsayısı`]);
  if (dim.hasLowerJ) {
    rows.push(['2_MUKAVEMET', 'Guvenli_Tasima_Alt_J_Kanca_kg', 'Alt J-Kanca Çanta/Ekipman Kapasitesi', metrics.jHookSafeKg.toFixed(2), 'kg', 'Gövdeye yakın düşük moment kolu']);
  }
  rows.push(['2_MUKAVEMET', 'Akma_Siniri_Yuku_kg', 'Plastik Akma / Hasar Sınırı Yükü', metrics.yieldLoadFlatKg.toFixed(2), 'kg', `${material.shortName} XY akma dayanımı: ${material.yieldMPa} MPa`]);
  rows.push(['2_MUKAVEMET', 'Dikey_Baski_Delaminasyon_Yuku_kg', 'Dikey Baskı Katman Ayrılması Yükü', metrics.safeLoadUprightKg.toFixed(2), 'kg', 'Katmanlar arası Z ayrılma riski']);
  rows.push(['2_MUKAVEMET', 'Baski_Yonu_Dayanim_Kazanci_pct', 'Yatay Baskı Modu Dayanım Artışı', metrics.orientationGainPct.toFixed(1), '%', 'Delaminasyon önleme kazancı']);
  rows.push(['2_MUKAVEMET', 'Maks_Eksenel_Sikma_Kuvveti_N', 'Maks. Güvenli Vida Sıkma Kuvveti', metrics.maxClampingForceN.toFixed(0), 'N', `${metrics.engagedThreadTurns.toFixed(1)} diş tam kavrama`]);

  rows.push(['3_PARCA_MALIYET', '01_C_Govde_Askilik', styleInfo.name, parts.body.printedMassG.toFixed(2), 'g', `${parts.body.volCm3.toFixed(2)} cm³ | ${parts.body.printMinutes} dk | ${parts.body.totalCostTL.toFixed(2)} TL`]);
  rows.push(['3_PARCA_MALIYET', '02_Trapez_Sikma_Vidasi', '60° Desteksiz Volan Trapez Vida', parts.screw.printedMassG.toFixed(2), 'g', `${parts.screw.volCm3.toFixed(2)} cm³ | ${parts.screw.printMinutes} dk | ${parts.screw.totalCostTL.toFixed(2)} TL`]);
  rows.push(['3_PARCA_MALIYET', '03_Doner_Baski_Pabucu', '4 Yarıklı Segmanlı Döner Baskı Pabucu', parts.pad.printedMassG.toFixed(2), 'g', `${parts.pad.volCm3.toFixed(2)} cm³ | ${parts.pad.printMinutes} dk | ${parts.pad.totalCostTL.toFixed(2)} TL`]);
  rows.push(['3_PARCA_MALIYET', 'TOPLAM_BIRIM_MALIYET', 'Toplam Üretim Maliyeti (3 Parça Set)', parts.total.totalCostTL.toFixed(2), 'TL', `${parts.total.printedMassG.toFixed(1)} g | ${parts.total.printMinutes} dk`]);

  Object.keys(MATERIALS).forEach((mKey) => {
    const alt = computeMetricsFn({ ...rawParams, Malzeme: mKey, Filament_Kg_Fiyati_TL: MATERIALS[mKey].defaultPriceTL }, partMetrology);
    rows.push([
      '4_MALZEME_KIYAS',
      MATERIALS[mKey].shortName,
      MATERIALS[mKey].name,
      alt.safeLoadFlatKg.toFixed(2),
      'kg',
      `Alt J: ${alt.jHookSafeKg.toFixed(1)} kg | Kütle: ${alt.parts.total.printedMassG.toFixed(1)} g | Maliyet: ${alt.parts.total.totalCostTL.toFixed(2)} TL`
    ]);
  });

  const csvBody = '\uFEFF' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8' });
  const tag = `${dim.styleKey}_Tr${Math.round(dim.screwD)}_M${Math.round(dim.maxDesk)}`;
  triggerBlobDownload(blob, `Yuk_Kapasitesi_ve_Maliyet_${tag}.csv`);
}
