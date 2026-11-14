import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {
  PRESET_CONFIGS,
  buildPlanterGeometry,
  buildDripTrayGeometry,
  computeFullAssemblyReport,
} from './geometry.js';

/**
 * Triggers a clean client-side browser file download.
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Prepares a Z-up, build-plate-zeroed mesh (1 unit = 1 mm) for 3D Slicers (Bambu Studio, PrusaSlicer, Cura).
 */
function createSlicerReadyZUpMesh(manifoldGeom) {
  const g = manifoldGeom.clone();
  // Rotate from Three.js Y-up (x, y, z) to Slicer Z-up (x, -z, y) -> determinant +1, preserves outward normals!
  g.rotateX(Math.PI / 2);
  g.computeBoundingBox();
  if (g.boundingBox) {
    const minZ = g.boundingBox.min.z;
    const cx = 0.5 * (g.boundingBox.min.x + g.boundingBox.max.x);
    const cy = 0.5 * (g.boundingBox.min.y + g.boundingBox.max.y);
    g.translate(-cx, -cy, -minZ);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial());
}

/**
 * 1A. Separate Binary .STL Exporter — Planter (Saksı)
 */
export function exportPlanterSTL(planterManifoldGeom, report) {
  const exporter = new STLExporter();
  const mesh = createSlicerReadyZUpMesh(planterManifoldGeom);
  const buffer = exporter.parse(mesh, { binary: true });
  const filename = `Saksi_${Math.round(report.dims.D)}x${Math.round(report.dims.H)}mm_K${report.dims.N}.stl`;
  triggerDownload(new Blob([buffer], { type: 'application/octet-stream' }), filename);
  mesh.geometry.dispose();
}

/**
 * 1B. Separate Binary .STL Exporter — Twist-Lock Drip Tray (Alt Tabak)
 */
export function exportTraySTL(trayManifoldGeom, report) {
  const exporter = new STLExporter();
  const mesh = createSlicerReadyZUpMesh(trayManifoldGeom);
  const buffer = exporter.parse(mesh, { binary: true });
  const filename = `Alt_Tabak_${Math.round(report.dims.D)}mm_Tol${report.dims.tol.toFixed(2)}mm.stl`;
  triggerDownload(new Blob([buffer], { type: 'application/octet-stream' }), filename);
  mesh.geometry.dispose();
}

/**
 * Multi-format CAD Bonus Exporters (.OBJ, .GLB, .DXF, .SCAD) per web-cad-modeler standard.
 */
export function exportAssemblyOBJ(planterGeom, trayGeom, report) {
  const group = new THREE.Group();
  const m1 = createSlicerReadyZUpMesh(planterGeom);
  m1.name = 'Saksi_Govde';
  m1.position.z = report.dims.yTraySeat;
  const m2 = createSlicerReadyZUpMesh(trayGeom);
  m2.name = 'Alt_Tabak_Kilitli';
  group.add(m1, m2);
  group.updateMatrixWorld(true);

  const exporter = new OBJExporter();
  const objText = exporter.parse(group);
  triggerDownload(
    new Blob([objText], { type: 'text/plain;charset=utf-8' }),
    `${report.skuCode}_Montaj.obj`
  );
  m1.geometry.dispose();
  m2.geometry.dispose();
}

export function exportAssemblyGLB(planterMesh, trayMesh, report) {
  const exporter = new GLTFExporter();
  const group = new THREE.Group();
  const pClone = new THREE.Mesh(planterMesh.geometry.clone(), planterMesh.material.clone());
  pClone.position.y = report.dims.yTraySeat;
  const tClone = new THREE.Mesh(trayMesh.geometry.clone(), trayMesh.material.clone());
  group.add(pClone, tClone);

  exporter.parse(
    group,
    (result) => {
      triggerDownload(
        new Blob([result], { type: 'model/gltf-binary' }),
        `${report.skuCode}_3B_Sahne.glb`
      );
      pClone.geometry.dispose();
      tClone.geometry.dispose();
    },
    (err) => console.error('GLB Export Error:', err),
    { binary: true }
  );
}

export function exportProfileDXF(report) {
  const d = report.dims;
  const lines = [
    '0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
  ];

  // Outer fluted rosette LWPOLYLINE in mm
  const segs = Math.max(180, d.N * 8);
  lines.push('0', 'LWPOLYLINE', '8', 'SAKSI_DIS_DOKU', '90', String(segs), '70', '1');
  for (let i = 0; i < segs; i++) {
    const th = (Math.PI * 2 * i) / segs;
    const r = d.rCore + d.dRib * (0.5 + 0.44 * Math.cos(d.N * th) + 0.06 * Math.cos(2 * d.N * th));
    lines.push('10', (r * Math.cos(th)).toFixed(4), '20', (r * Math.sin(th)).toFixed(4));
  }

  // Inner cavity circle + bayonet circles + 6 drainage holes
  const addCircle = (layer, cx, cy, r) => {
    lines.push('0', 'CIRCLE', '8', layer, '10', cx.toFixed(4), '20', cy.toFixed(4), '40', r.toFixed(4));
  };
  addCircle('IC_CIDAR', 0, 0, d.rInTop);
  addCircle('KILIT_DIS_TOLERANS', 0, 0, d.rFemaleBore);
  addCircle('KILIT_ERKEK_BOYUN', 0, 0, d.rFootNeck);

  for (let h = 0; h < d.drainHoleCount; h++) {
    const a = (Math.PI * 2 * h) / d.drainHoleCount + Math.PI / 6;
    addCircle('DRENAJ_DELIKLERI', d.drainPcdR * Math.cos(a), d.drainPcdR * Math.sin(a), d.drainHoleR);
  }

  lines.push('0', 'ENDSEC', '0', 'EOF');
  triggerDownload(
    new Blob([lines.join('\r\n')], { type: 'application/dxf' }),
    `${report.skuCode}_Kesit_Profil.dxf`
  );
}

export function exportParametricSCAD(report) {
  const d = report.dims;
  const scad = `// Parametrik Dokulu Saksi & Burgu Kilitli Alt Tabak (OpenSCAD Kaynak Kodu)
// Birim: Milimetre (mm) | DFM Maksimum Sarkma <= 45 Derece
Saksi_Capi_mm = ${d.D.toFixed(2)};
Saksi_Yuksekligi_mm = ${d.H.toFixed(2)};
Doku_Kanat_Sayisi = ${d.N};
Kanat_Derinligi_mm = ${d.dRib.toFixed(2)};
Burulma_Acisi_Derece = ${d.twistEffDeg.toFixed(2)}; // Istek: ${d.twistReqDeg.toFixed(1)} deg (DFM <=45 deg aktif)
Cidar_Kalinligi_mm = ${d.tw.toFixed(2)};
Kilit_Toleransi_mm = ${d.tol.toFixed(2)};
Alt_Tabak_Yukseklik_mm = ${d.hTray.toFixed(2)};

$fn = 144;
r_max = Saksi_Capi_mm / 2;
r_core = r_max - Kanat_Derinligi_mm;
r_foot = r_core - 4.2;

function kanat_profil(N, d_rib, core_r, fn_seg=180) = [
  for (i = [0 : fn_seg - 1])
    let(th = 360 * i / fn_seg,
        w = 0.5 + 0.44 * cos(N * th) + 0.06 * cos(2 * N * th),
        r = core_r + d_rib * w)
    [r * cos(th), r * sin(th)]
];

module saksi_govde() {
  difference() {
    union() {
      // Erkek burgu kilit tabani
      cylinder(h = ${d.yFlareStart.toFixed(2)}, r = r_foot);
      for (k = [0 : 2]) rotate([0, 0, k * 120])
        linear_extrude(height = ${d.maleLugTopFlat.toFixed(2)})
          intersection() {
            circle(r = r_foot + ${d.lugDepth.toFixed(2)});
            polygon([[0,0], [r_max*2, -r_max*0.65], [r_max*2, r_max*0.65]]);
          }
      // 43 derece desteksiz gecis pahi
      translate([0, 0, ${d.yFlareStart.toFixed(2)}])
        cylinder(h = ${d.flareH.toFixed(2)}, r1 = r_foot, r2 = r_core);
      // Burulmali dis kanatli govde
      translate([0, 0, ${d.yRibStart.toFixed(2)}])
        linear_extrude(height = Saksi_Yuksekligi_mm - ${d.yRibStart.toFixed(2)}, twist = -Burulma_Acisi_Derece, slices = 90)
          polygon(kanat_profil(Doku_Kanat_Sayisi, Kanat_Derinligi_mm, r_core));
    }
    // Toprak haznesi
    translate([0, 0, ${d.ySoilFloor.toFixed(2)}])
      cylinder(h = Saksi_Yuksekligi_mm, r1 = ${d.rInBot.toFixed(2)}, r2 = ${d.rInTop.toFixed(2)});
    // 6 adet gizli drenaj kanali
    for (h = [0 : 5]) rotate([0, 0, h * 60 + 30])
      translate([${d.drainPcdR.toFixed(2)}, 0, -1])
        cylinder(h = ${(d.ySoilFloor + 2).toFixed(2)}, r = ${d.drainHoleR.toFixed(2)});
  }
}

module alt_tabak() {
  difference() {
    cylinder(h = Alt_Tabak_Yukseklik_mm, r1 = ${(d.rFemaleBore + d.tw).toFixed(2)}, r2 = r_max);
    translate([0, 0, ${d.yTraySeat.toFixed(2)}])
      cylinder(h = Alt_Tabak_Yukseklik_mm, r = ${d.rFemaleBore.toFixed(2)});
    translate([0, 0, ${d.trayFloorT.toFixed(2)}])
      cylinder(h = Alt_Tabak_Yukseklik_mm, r = ${(d.rFootNeck - 1.8).toFixed(2)});
  }
}

saksi_govde();
translate([Saksi_Capi_mm * 1.25, 0, 0]) alt_tabak();
`;
  triggerDownload(
    new Blob([scad], { type: 'text/plain;charset=utf-8' }),
    `${report.skuCode}_Parametrik.scad`
  );
}

/**
 * Computes S / M / L family metrics inheriting active rib density, twist, wall & tolerance.
 */
export function computeSMLFamilyReports(activeParams, materialKey = 'PLA') {
  const sizes = ['S', 'M', 'L'];
  return sizes.map((sizeKey) => {
    const base = PRESET_CONFIGS[sizeKey];
    const merged = {
      ...activeParams,
      Saksi_Capi_mm: base.Saksi_Capi_mm,
      Saksi_Yuksekligi_mm: base.Saksi_Yuksekligi_mm,
      Alt_Tabak_Yukseklik_mm: base.Alt_Tabak_Yukseklik_mm,
    };
    const p = buildPlanterGeometry(merged);
    const t = buildDripTrayGeometry(merged);
    const rep = computeFullAssemblyReport(p, t, materialKey);
    p.manifoldGeom.dispose();
    p.displayGeom.dispose();
    t.manifoldGeom.dispose();
    t.displayGeom.dispose();
    return { sizeKey, label: base.label, report: rep };
  });
}

/**
 * 2. "Imalat_Anteti" Product Specification Sheet (.SVG) Generator (ISO 7200 A3 Technical Sheet)
 * Includes orthographic cross-section, top fluted rosette plan, S/M/L comparison,
 * exact Soil Volume (L), Turkish Shipping Box Volume (Desi), DFM <=45° report, and title block.
 */
export function generateImalatAntetiSVG(report, smlReports = []) {
  const d = report.dims;
  const dateStr = new Date().toISOString().slice(0, 10);

  // Build Top View fluted SVG path centered at (895, 290)
  const topCx = 895;
  const topCy = 278;
  const topScale = Math.min(1.05, 118 / d.rMax);
  const segs = Math.max(180, d.N * 8);
  let outerRosettePath = '';
  for (let i = 0; i < segs; i++) {
    const th = (Math.PI * 2 * i) / segs;
    const r = (d.rCore + d.dRib * (0.5 + 0.44 * Math.cos(d.N * th) + 0.06 * Math.cos(2 * d.N * th))) * topScale;
    const px = topCx + r * Math.cos(th);
    const py = topCy + r * Math.sin(th);
    outerRosettePath += `${i === 0 ? 'M' : 'L'}${px.toFixed(2)},${py.toFixed(2)} `;
  }
  outerRosettePath += 'Z';

  let drainCirclesSvg = '';
  for (let h = 0; h < d.drainHoleCount; h++) {
    const a = (Math.PI * 2 * h) / d.drainHoleCount + Math.PI / 6;
    const hx = topCx + d.drainPcdR * topScale * Math.cos(a);
    const hy = topCy + d.drainPcdR * topScale * Math.sin(a);
    drainCirclesSvg += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${Math.max(2.2, d.drainHoleR * topScale).toFixed(1)}" fill="#fff" stroke="#121211" stroke-width="1.1"/>`;
  }

  // Build Front Cross-Section View centered at x = 355, base y = 510
  const secCx = 355;
  const secBaseY = 505;
  const secScale = Math.min(1.52, 345 / report.assembledHeightMm, 250 / d.D);

  const sx = (mmX) => (secCx + mmX * secScale).toFixed(1);
  const sy = (mmY) => (secBaseY - mmY * secScale).toFixed(1);

  const yP0 = d.yTraySeat; // Planter y=0 in assembled frame
  const yTop = yP0 + d.H;
  const rTrayTop = Math.min(d.rMax, d.rFemaleBore + d.tw + (d.hTray - 2.2) * 0.88);
  const rTrayBot = d.rFemaleBore + d.tw;
  const rRes = Math.max(8, d.rFootNeck - 1.8);

  // Twisted rib silhouette projection lines on elevation half
  let ribProjectionLines = '';
  const ribLineCount = Math.min(16, Math.round(d.N / 2));
  for (let k = 0; k < ribLineCount; k++) {
    const th0 = (Math.PI * k) / ribLineCount;
    let pts = '';
    for (let s = 0; s <= 28; s++) {
      const yLocal = d.yRibStart + (d.ribSpan * s) / 28;
      const { A } = d.evalRibEnvelope(yLocal);
      const { phi } = d.evalTwistAtY(yLocal, d.twistEffRad);
      const th = th0 + phi;
      if (Math.sin(th) >= -0.15) {
        const r = d.rCore + A;
        const xProj = Math.max(0, r * Math.cos(th));
        pts += `${pts === '' ? 'M' : 'L'}${sx(xProj)},${sy(yP0 + yLocal)} `;
      }
    }
    if (pts) {
      ribProjectionLines += `<path d="${pts}" fill="none" stroke="#8a857c" stroke-width="0.8" opacity="0.75"/>`;
    }
  }

  // S / M / L silhouette graphic in bottom-left panel
  const smlList = smlReports.length === 3 ? smlReports : [];
  let smlGraphic = '';
  const smlCenters = [735, 865, 1020];
  const smlScale = 0.56;
  const smlBaseY = 620;
  smlList.forEach((item, idx) => {
    const sd = item.report.dims;
    const cx = smlCenters[idx];
    const w = sd.D * smlScale;
    const h = item.report.assembledHeightMm * smlScale;
    const th = sd.hTray * smlScale;
    smlGraphic += `
      <g>
        <rect x="${(cx - w / 2).toFixed(1)}" y="${(smlBaseY - h).toFixed(1)}" width="${w.toFixed(1)}" height="${(h - th * 0.65).toFixed(1)}" rx="2" fill="#efeae0" stroke="#121211" stroke-width="1.2"/>
        <rect x="${(cx - w * 0.48).toFixed(1)}" y="${(smlBaseY - th).toFixed(1)}" width="${(w * 0.96).toFixed(1)}" height="${th.toFixed(1)}" rx="1.5" fill="#d9d2c5" stroke="#121211" stroke-width="1.2"/>
        <text x="${cx}" y="${(smlBaseY - h - 8).toFixed(1)}" text-anchor="middle" font-family="monospace" font-size="10" font-weight="700" fill="#121211">${item.sizeKey} (Ø${Math.round(sd.D)}×${Math.round(sd.H)})</text>
        <text x="${cx}" y="${(smlBaseY + 15).toFixed(1)}" text-anchor="middle" font-family="monospace" font-size="9.5" fill="#444">${item.report.soilVolUsableL.toFixed(2)} L | ${item.report.shippingDesi.toFixed(2)} Desi</text>
        <text x="${cx}" y="${(smlBaseY + 27).toFixed(1)}" text-anchor="middle" font-family="monospace" font-size="9" fill="#d94e28">${Math.round(item.report.totalPrintMassG)} g PLA</text>
      </g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1190 842" width="420mm" height="297mm">
  <defs>
    <pattern id="cadHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#121211" stroke-width="0.9" opacity="0.55"/>
    </pattern>
    <pattern id="soilDots" width="10" height="10" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="3" r="0.8" fill="#8b6f4e" opacity="0.45"/>
      <circle cx="7" cy="8" r="0.9" fill="#8b6f4e" opacity="0.35"/>
    </pattern>
    <marker id="arrowS" markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto">
      <polygon points="7,1 0,3.5 7,6" fill="#d9381e"/>
    </marker>
    <marker id="arrowE" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <polygon points="0,1 7,3.5 0,6" fill="#d9381e"/>
    </marker>
  </defs>

  <!-- Sheet Background & ISO A3 Frame -->
  <rect x="0" y="0" width="1190" height="842" fill="#FAF8F3"/>
  <rect x="24" y="24" width="1142" height="794" fill="none" stroke="#121211" stroke-width="2.2"/>
  <rect x="30" y="30" width="1130" height="782" fill="none" stroke="#121211" stroke-width="0.7"/>

  <!-- Top Header Banner -->
  <rect x="30" y="30" width="1130" height="44" fill="#121211"/>
  <text x="48" y="57" font-family="monospace" font-size="15" font-weight="700" fill="#FAF8F3" letter-spacing="1.5">İMALAT ANTETİ // PARAMETRİK DOKULU SAKSI &amp; BURGU KİLİTLİ ALT TABAK (DFM ≤ 45°)</text>
  <text x="1142" y="57" text-anchor="end" font-family="monospace" font-size="12" fill="#E05A2B" font-weight="700">SKU: ${report.skuCode} | BİRİM: mm</text>

  <!-- Grid Dividers -->
  <line x1="665" y1="74" x2="665" y2="812" stroke="#121211" stroke-width="1.2"/>
  <line x1="665" y1="455" x2="1160" y2="455" stroke="#121211" stroke-width="1.2"/>
  <line x1="30" y1="590" x2="665" y2="590" stroke="#121211" stroke-width="1.2"/>
  <line x1="665" y1="662" x2="1160" y2="662" stroke="#121211" stroke-width="1.2"/>

  <!-- SECTION A-A: HALF SECTION / HALF ELEVATION -->
  <text x="48" y="98" font-family="monospace" font-size="11" font-weight="700" fill="#121211">[ 01 / KESİT A-A &amp; ÖN GÖRÜNÜŞ — 0.25mm BURGU KİLİT + GİZLİ DRENAJ ]</text>

  <!-- Centerline -->
  <line x1="${secCx}" y1="112" x2="${secCx}" y2="532" stroke="#d9381e" stroke-width="0.9" stroke-dasharray="12,4,2,4"/>

  <!-- Soil Volume Fill Shading (Left Section Half) -->
  <polygon points="${sx(-d.rInTop + 0.5)},${sy(yTop - 10)} ${sx(0)},${sy(yTop - 10)} ${sx(0)},${sy(yP0 + d.ySoilFloor)} ${sx(-d.rInBot + 0.5)},${sy(yP0 + d.ySoilFloor)}" fill="url(#soilDots)" stroke="#8b6f4e" stroke-width="0.7" stroke-dasharray="4,3"/>
  <text x="${sx(-d.rInTop * 0.48)}" y="${sy(yP0 + d.H * 0.56)}" text-anchor="middle" font-family="monospace" font-size="10.5" font-weight="700" fill="#5c472e">TOPRAK HACMİ</text>
  <text x="${sx(-d.rInTop * 0.48)}" y="${sy(yP0 + d.H * 0.56 - 13 / secScale)}" text-anchor="middle" font-family="monospace" font-size="12" font-weight="700" fill="#d9381e">${report.soilVolUsableL.toFixed(2)} L</text>

  <!-- Right Half Exterior Elevation + Twisted Rib Lines -->
  <polygon points="${sx(0)},${sy(yTop)} ${sx(d.rMax)},${sy(yTop)} ${sx(d.rMax)},${sy(yP0 + d.yRibStart)} ${sx(d.rFootNeck)},${sy(yP0 + d.yFlareStart)} ${sx(d.rFootNeck)},${sy(yP0)} ${sx(0)},${sy(yP0)}" fill="#F0ECE1" stroke="#121211" stroke-width="1.5"/>
  ${ribProjectionLines}
  <polygon points="${sx(0)},${sy(d.hTray)} ${sx(rTrayTop)},${sy(d.hTray)} ${sx(rTrayBot)},${sy(0)} ${sx(0)},${sy(0)}" fill="#DFD9CB" stroke="#121211" stroke-width="1.5"/>

  <!-- Left Half True Hatched CAD Cross-Section: Planter Wall + Floor + Bayonet Male Lug -->
  <polygon points="
    ${sx(-d.rInTop)},${sy(yTop)}
    ${sx(-d.rCore)},${sy(yTop)}
    ${sx(-d.rMax)},${sy(yTop - 4)}
    ${sx(-d.rMax)},${sy(yP0 + d.yRibStart)}
    ${sx(-d.rFootNeck)},${sy(yP0 + d.yFlareStart)}
    ${sx(-d.rFootNeck)},${sy(yP0 + d.yMaleLugEnd)}
    ${sx(-d.rMaleLug)},${sy(yP0 + d.maleLugTopFlat)}
    ${sx(-d.rMaleLug)},${sy(yP0)}
    ${sx(-d.rVaultBot)},${sy(yP0)}
    ${sx(-d.rVaultTop)},${sy(yP0 + d.yVaultTop)}
    ${sx(0)},${sy(yP0 + d.yVaultTop)}
    ${sx(0)},${sy(yP0 + d.ySoilFloor)}
    ${sx(-d.rInBot)},${sy(yP0 + d.ySoilFloor)}
  " fill="url(#cadHatch)" stroke="#121211" stroke-width="1.6"/>

  <!-- Hidden Drainage Channel Cutout Highlight in Section -->
  <rect x="${sx(-d.drainPcdR - d.drainHoleR)}" y="${sy(yP0 + d.ySoilFloor)}" width="${(d.drainHoleR * 2 * secScale).toFixed(1)}" height="${(d.bottomThickness * secScale).toFixed(1)}" fill="#FAF8F3" stroke="#1e6fb8" stroke-width="1.1"/>

  <!-- Left Half True Hatched CAD Cross-Section: Drip Tray + 0.25mm Female Wedge -->
  <polygon points="
    ${sx(-rTrayTop)},${sy(d.hTray)}
    ${sx(-d.rFemaleBore - 0.8)},${sy(d.hTray)}
    ${sx(-d.rFemaleBore)},${sy(d.yTrayLugTopEnd)}
    ${sx(-d.rFemaleTip)},${sy(d.yTrayLugFlatEnd)}
    ${sx(-d.rFemaleTip)},${sy(d.yTrayLugBot + d.femaleRampH)}
    ${sx(-d.rFemaleBore)},${sy(d.yTrayLugBot)}
    ${sx(-d.rFemaleBore)},${sy(d.yTraySeat)}
    ${sx(-rRes)},${sy(d.yTraySeat)}
    ${sx(-rRes)},${sy(d.trayFloorT)}
    ${sx(0)},${sy(d.trayFloorT)}
    ${sx(0)},${sy(0)}
    ${sx(-rTrayBot)},${sy(0)}
  " fill="url(#cadHatch)" stroke="#121211" stroke-width="1.6"/>

  <!-- Dimension Lines on Section -->
  <!-- Overall Diameter D -->
  <line x1="${sx(-d.rMax)}" y1="${sy(yTop) - 24}" x2="${sx(d.rMax)}" y2="${sy(yTop) - 24}" stroke="#d9381e" stroke-width="1.1" marker-start="url(#arrowS)" marker-end="url(#arrowE)"/>
  <line x1="${sx(-d.rMax)}" y1="${sy(yTop) - 4}" x2="${sx(-d.rMax)}" y2="${sy(yTop) - 30}" stroke="#121211" stroke-width="0.6"/>
  <line x1="${sx(d.rMax)}" y1="${sy(yTop) - 4}" x2="${sx(d.rMax)}" y2="${sy(yTop) - 30}" stroke="#121211" stroke-width="0.6"/>
  <text x="${secCx}" y="${(Number(sy(yTop)) - 30).toFixed(1)}" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="#d9381e">Ø ${d.D.toFixed(1)} mm (Saksı Çapı)</text>

  <!-- Planter Height H -->
  <line x1="${Number(sx(d.rMax)) + 34}" y1="${sy(yTop)}" x2="${Number(sx(d.rMax)) + 34}" y2="${sy(yP0)}" stroke="#d9381e" stroke-width="1.1" marker-start="url(#arrowS)" marker-end="url(#arrowE)"/>
  <text x="${Number(sx(d.rMax)) + 42}" y="${sy(yP0 + d.H * 0.52)}" font-family="monospace" font-size="10.5" font-weight="700" fill="#d9381e">H = ${d.H.toFixed(1)} mm</text>

  <!-- Drip Tray Height -->
  <line x1="${Number(sx(d.rMax)) + 34}" y1="${sy(d.hTray)}" x2="${Number(sx(d.rMax)) + 34}" y2="${sy(0)}" stroke="#121211" stroke-width="1.0"/>
  <text x="${Number(sx(d.rMax)) + 42}" y="${sy(d.hTray * 0.45)}" font-family="monospace" font-size="9.5" fill="#121211">Tabak: ${d.hTray.toFixed(1)} mm</text>

  <!-- Twist-Lock & Drainage Callout -->
  <line x1="${sx(-d.rMaleLug)}" y1="${sy(yP0 + d.maleLugTopFlat)}" x2="72" y2="472" stroke="#d9381e" stroke-width="0.9"/>
  <text x="48" y="466" font-family="monospace" font-size="9.5" font-weight="700" fill="#d9381e">BURGU KİLİT: ${d.tol.toFixed(2)} mm TOLERANS</text>
  <text x="48" y="480" font-family="monospace" font-size="9" fill="#121211">6x Ø${(d.drainHoleR * 2).toFixed(1)}mm Gizli Drenaj + ${report.waterReservoirMl.toFixed(0)} mL Hazne</text>

  <!-- TOP VIEW ROSETTE PLAN -->
  <text x="682" y="98" font-family="monospace" font-size="11" font-weight="700" fill="#121211">[ 02 / ÜST GÖRÜNÜŞ — ${d.N} KANATLI DOKU &amp; DRENAJ DİZİLİMİ ]</text>
  <path d="${outerRosettePath}" fill="#EFECE4" stroke="#121211" stroke-width="1.4"/>
  <circle cx="${topCx}" cy="${topCy}" r="${(d.rInTop * topScale).toFixed(1)}" fill="#FAF8F3" stroke="#121211" stroke-width="1.2"/>
  <circle cx="${topCx}" cy="${topCy}" r="${(d.rFemaleBore * topScale).toFixed(1)}" fill="none" stroke="#d9381e" stroke-width="0.9" stroke-dasharray="5,3"/>
  <circle cx="${topCx}" cy="${topCy}" r="${(d.drainPcdR * topScale).toFixed(1)}" fill="none" stroke="#1e6fb8" stroke-width="0.8" stroke-dasharray="3,3"/>
  ${drainCirclesSvg}
  <text x="682" y="438" font-family="monospace" font-size="10" fill="#333">Kanat Derinliği: ${d.dRib.toFixed(1)} mm | Cidar: ${d.tw.toFixed(2)} mm | Burulma: ${d.twistEffDeg.toFixed(1)}° (Maks Sarkma: ${d.peakOverhangDeg.toFixed(1)}° ≤ 45°)</text>

  <!-- S / M / L FAMILY PANEL -->
  <text x="682" y="478" font-family="monospace" font-size="11" font-weight="700" fill="#121211">[ 03 / S - M - L ÜRÜN AİLESİ ÖLÇEK &amp; LOJİSTİK KARŞILAŞTIRMASI ]</text>
  <line x1="688" y1="${smlBaseY}" x2="1138" y2="${smlBaseY}" stroke="#121211" stroke-width="1"/>
  ${smlGraphic}

  <!-- BOTTOM-LEFT PARAMETER & LOGISTICS SPECIFICATION TABLE -->
  <text x="48" y="614" font-family="monospace" font-size="11" font-weight="700" fill="#121211">[ 04 / TEKNİK PARAMETRELER, TOPRAK HACMİ (L) &amp; KARGO DESİ HESABI ]</text>

  <g font-family="monospace" font-size="10.5" fill="#121211">
    <text x="48" y="640">• Saksı Çapı / Yüksekliği ...... Ø ${d.D.toFixed(1)} × ${d.H.toFixed(1)} mm (Montajlı Yükseklik: ${report.assembledHeightMm.toFixed(1)} mm)</text>
    <text x="48" y="660">• Doku Kanat / Derinlik ........ ${d.N} Adet Kanat / ${d.dRib.toFixed(1)} mm Derinlik / ${d.twistEffDeg.toFixed(1)}° Burulma</text>
    <text x="48" y="680">• Cidar &amp; Kilit Toleransı ...... Cidar: ${d.tw.toFixed(2)} mm | Taban: ${d.bottomThickness.toFixed(2)} mm | Kilit Boşluğu: ${d.tol.toFixed(2)} mm</text>
    <text x="48" y="704" font-weight="700" fill="#1e6fb8">• KULLANILABİLİR TOPRAK HACMİ .. ${report.soilVolUsableL.toFixed(2)} Litre (Silme Tam Kapasite: ${report.soilVolBrimL.toFixed(2)} L)</text>
    <text x="48" y="726" font-weight="700" fill="#d9381e">• KARGO KUTUSU &amp; DESİ .......... ${report.boxCm.w.toFixed(1)} × ${report.boxCm.l.toFixed(1)} × ${report.boxCm.h.toFixed(1)} cm  ➜  ${report.shippingDesi.toFixed(2)} DESİ (En×Boy×Yük / 3000)</text>
    <text x="48" y="748">• 3B Baskı Metroloji (${report.materialKey}) ..... Saksı: ${Math.round(report.planter.printMassG)} g + Alt Tabak: ${Math.round(report.tray.printMassG)} g = TOPLAM ${Math.round(report.totalPrintMassG)} g (~${report.estPrintHours.toFixed(1)} saat)</text>
    <text x="48" y="770" font-weight="700" fill="#1f7a4c">• DFM ÜRETİLEBİLİRLİK ONAYI .... DESTEKSİZ BASKI (Maks Sarkma: ${d.peakOverhangDeg.toFixed(1)}° ≤ 45.0° | Su Geçirmez Manifold)</text>
  </g>

  <!-- ISO 7200 TURKISH ENGINEERING TITLE BLOCK (BOTTOM RIGHT) -->
  <rect x="665" y="662" width="495" height="150" fill="#F2EFE7" stroke="#121211" stroke-width="1.2"/>
  <line x1="665" y1="712" x2="1160" y2="712" stroke="#121211" stroke-width="0.9"/>
  <line x1="665" y1="762" x2="1160" y2="762" stroke="#121211" stroke-width="0.9"/>
  <line x1="912" y1="712" x2="912" y2="812" stroke="#121211" stroke-width="0.9"/>

  <text x="682" y="684" font-family="monospace" font-size="9.5" fill="#666">PROJE / ÜRÜN TANIMI</text>
  <text x="682" y="702" font-family="monospace" font-size="12.5" font-weight="700" fill="#121211">DOKULU PARAMETRİK SAKSI &amp; BURGU KİLİTLİ TABAK</text>

  <text x="682" y="730" font-family="monospace" font-size="9" fill="#666">PARÇA KODU (SKU)</text>
  <text x="682" y="750" font-family="monospace" font-size="11.5" font-weight="700" fill="#d9381e">${report.skuCode}</text>

  <text x="926" y="730" font-family="monospace" font-size="9" fill="#666">MALZEME / YÜZEY</text>
  <text x="926" y="750" font-family="monospace" font-size="11" font-weight="700" fill="#121211">${report.material.name}</text>

  <text x="682" y="780" font-family="monospace" font-size="9" fill="#666">TOLERANS / DFM SINIRI</text>
  <text x="682" y="799" font-family="monospace" font-size="11" font-weight="700" fill="#121211">ISO 2768-m | Kilit: ${d.tol.toFixed(2)}mm | ≤45°</text>

  <text x="926" y="780" font-family="monospace" font-size="9" fill="#666">TARİH / REVİZYON</text>
  <text x="926" y="799" font-family="monospace" font-size="11" font-weight="700" fill="#121211">${dateStr} // REV-A1</text>
</svg>`;
}

export function exportImalatAntetiSVG(report, smlReports = []) {
  const svg = generateImalatAntetiSVG(report, smlReports);
  triggerDownload(
    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    `Imalat_Anteti_${report.skuCode}.svg`
  );
}

/**
 * 3. Turkish E-Commerce Commission / Profit Table Engine & .CSV Exporter
 */
export const MARKETPLACE_CHANNELS = [
  { id: 'TRENDYOL', name: 'Trendyol Pazaryeri', commPct: 21.5, serviceFeeTl: 6.99 },
  { id: 'HEPSIBURADA', name: 'Hepsiburada', commPct: 20.0, serviceFeeTl: 5.99 },
  { id: 'AMAZON_TR', name: 'Amazon Türkiye', commPct: 15.0, serviceFeeTl: 4.50 },
  { id: 'ETSY', name: 'Etsy Global (TR Mağaza)', commPct: 11.5, serviceFeeTl: 8.50 },
  { id: 'DIRECT_WEB', name: 'Kendi Siteniz (ikas/Shopify + iyzico)', commPct: 3.49, serviceFeeTl: 1.50 },
];

/**
 * Contracted Turkish e-commerce carrier rate approximation by Desi tier (2026 TL).
 */
export function estimateShippingCostTl(desi) {
  if (desi <= 1.0) return 58.0;
  if (desi <= 2.0) return 69.0;
  if (desi <= 3.0) return 82.0;
  if (desi <= 5.0) return 98.0;
  if (desi <= 8.0) return 124.0;
  return 124.0 + (desi - 8.0) * 11.5;
}

export function computeEcommerceProfitRows(report, econInputs = {}) {
  const filamentKgPrice = Number(econInputs.filamentKgPrice) || 480;
  const machineHourCost = Number(econInputs.machineHourCost) || 14;
  const packagingBaseCost = Number(econInputs.packagingCost) || 22;
  const vatRatePct = Number(econInputs.vatRatePct) ?? 20;

  const filamentCostTl = (report.totalPrintMassG / 1000.0) * filamentKgPrice * 1.04; // +4% purge/waste
  const machineCostTl = report.estPrintHours * machineHourCost;
  const boxCostTl = packagingBaseCost + report.shippingDesi * 1.8;
  const totalUnitCogsTl = filamentCostTl + machineCostTl + boxCostTl;
  const shippingTl = estimateShippingCostTl(report.shippingDesi);

  // Suggested retail price (KDV Dahil) if user has not set a custom override > 0
  const autoSuggestedSaleTl = Math.ceil(((totalUnitCogsTl + shippingTl) * 2.35) / 10) * 10 - 1;
  const salePriceTl =
    econInputs.salePriceOverride && Number(econInputs.salePriceOverride) > 0
      ? Number(econInputs.salePriceOverride)
      : autoSuggestedSaleTl;

  const vatRate = vatRatePct / 100.0;
  // Net VAT payable (Output VAT on Sale minus Input VAT on Commission + Shipping + Material/Packaging)
  const saleVatTl = salePriceTl - salePriceTl / (1 + vatRate);

  const rows = MARKETPLACE_CHANNELS.map((ch) => {
    const commissionTl = salePriceTl * (ch.commPct / 100.0);
    const channelShippingTl = ch.id === 'ETSY' ? shippingTl * 1.55 : shippingTl;
    const deductibleInputVatTl =
      (commissionTl + ch.serviceFeeTl + channelShippingTl + filamentCostTl + boxCostTl) *
      (vatRate / (1 + vatRate));
    const netVatPayableTl = Math.max(0, saleVatTl - deductibleInputVatTl);

    const totalDeductionsTl =
      totalUnitCogsTl + commissionTl + ch.serviceFeeTl + channelShippingTl + netVatPayableTl;
    const netProfitTl = salePriceTl - totalDeductionsTl;
    const profitMarginPct = salePriceTl > 0 ? (netProfitTl / salePriceTl) * 100 : 0;
    const roiPct = totalUnitCogsTl > 0 ? (netProfitTl / totalUnitCogsTl) * 100 : 0;

    return {
      sku: report.skuCode,
      channelId: ch.id,
      channelName: ch.name,
      salePriceTl,
      commPct: ch.commPct,
      commissionTl,
      serviceFeeTl: ch.serviceFeeTl,
      shippingDesi: report.shippingDesi,
      shippingTl: channelShippingTl,
      filamentCostTl,
      machineCostTl,
      boxCostTl,
      totalUnitCogsTl,
      netVatPayableTl,
      netProfitTl,
      profitMarginPct,
      roiPct,
    };
  });

  return {
    salePriceTl,
    autoSuggestedSaleTl,
    filamentCostTl,
    machineCostTl,
    boxCostTl,
    totalUnitCogsTl,
    shippingTl,
    rows,
  };
}

export function exportEcommerceCSV(activeReport, smlReports, econInputs = {}) {
  const bundles = [
    { tag: 'AKTİF TASARIM', rep: activeReport },
    ...smlReports.map((s) => ({ tag: `SERİ ${s.sizeKey}`, rep: s.report })),
  ];

  const headers = [
    'Varyant_Grubu',
    'SKU_Kodu',
    'Cap_x_Yukseklik_mm',
    'Toprak_Hacmi_L',
    'Kargo_Desi',
    'Toplam_Gramaj_g',
    'Pazaryeri_Kanali',
    'Satis_Fiyati_KDV_Dahil_TL',
    'Komisyon_Orani_%',
    'Komisyon_Tutari_TL',
    'Hizmet_Islem_Bedeli_TL',
    'Kargo_Maliyeti_TL',
    'Uretim_Maliyeti_COGS_TL',
    'Net_Odenecek_KDV_TL',
    'Net_Kar_TL',
    'Net_Kar_Marji_%',
    'Uretim_ROI_%',
  ];

  const csvLines = [headers.join(';')];
  bundles.forEach(({ tag, rep }) => {
    // For S/M/L family rows, let auto-pricing compute proportional sale price unless it's Active
    const inputs = tag === 'AKTİF TASARIM' ? econInputs : { ...econInputs, salePriceOverride: 0 };
    const { rows } = computeEcommerceProfitRows(rep, inputs);
    rows.forEach((r) => {
      csvLines.push(
        [
          tag,
          r.sku,
          `${Math.round(rep.dims.D)}x${Math.round(rep.dims.H)}`,
          rep.soilVolUsableL.toFixed(2).replace('.', ','),
          r.shippingDesi.toFixed(2).replace('.', ','),
          Math.round(rep.totalPrintMassG),
          r.channelName,
          r.salePriceTl.toFixed(2).replace('.', ','),
          r.commPct.toFixed(2).replace('.', ','),
          r.commissionTl.toFixed(2).replace('.', ','),
          r.serviceFeeTl.toFixed(2).replace('.', ','),
          r.shippingTl.toFixed(2).replace('.', ','),
          r.totalUnitCogsTl.toFixed(2).replace('.', ','),
          r.netVatPayableTl.toFixed(2).replace('.', ','),
          r.netProfitTl.toFixed(2).replace('.', ','),
          r.profitMarginPct.toFixed(1).replace('.', ','),
          r.roiPct.toFixed(1).replace('.', ','),
        ].join(';')
      );
    });
  });

  // Prepend UTF-8 BOM so Turkish Excel opens ';' columns and Turkish characters cleanly
  const bomContent = '\uFEFF' + csvLines.join('\r\n');
  triggerDownload(
    new Blob([bomContent], { type: 'text/csv;charset=utf-8' }),
    `ETicaret_Komisyon_Kar_Tablosu_${activeReport.skuCode}.csv`
  );
}
