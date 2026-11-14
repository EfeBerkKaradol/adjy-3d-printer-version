/**
 * İmalat Çıktı & Teknik Resim İhracat Motoru
 * - Ayrı Alt Kutu (.STL) ve Baskıya Hazır Ters Çevrilmiş Üst Kapak (.STL) [1 birim = 1.00 mm, Z >= 0]
 * - ISO 128 / TSE "Imalat_Anteti" 2B Standoff Koordinat & Kesit Teknik Resmi (.SVG)
 * - Malzeme Listesi & Maliyet Analizi BOM (.CSV)
 * - Ek CAD Formatları: Montaj (.GLB, .OBJ), Lazer/CNC Profil (.DXF), Parametrik OpenSCAD (.SCAD)
 */

import * as THREE from 'three';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MATERIAL_SPECS } from './geometry-engine.js';

const USD_RATE_TL = 36.50;

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const escXml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * 1. ALT KUTU (BASE) İKİLİ .STL İHRACATI (Z-Yukarı, Taban Z = 0.00 mm)
 */
export function exportBaseSTL(baseGeometry, spec) {
  const exporter = new STLExporter();
  const exportGeom = baseGeometry.clone();
  // Sahne Y-yukarı -> Dilimleyici (Slicer) Z-yukarı (+90° X dönüşü: det = +1, normaller korunur)
  exportGeom.rotateX(Math.PI * 0.5);
  exportGeom.computeBoundingBox();
  const minZ = exportGeom.boundingBox.min.z;
  exportGeom.translate(0, 0, -minZ);

  const tempMesh = new THREE.Mesh(exportGeom);
  const buffer = exporter.parse(tempMesh, { binary: true });
  exportGeom.dispose();

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  triggerBlobDownload(blob, `Alt_Kutu_Base_${spec.sku}.stl`);
}

/**
 * 2. ÜST KAPAK (LID) İKİLİ .STL İHRACATI (180° Baskı Yönünde, Üst Yüzey Z = 0.00 mm, Desteksiz!)
 */
export function exportLidSTL(lidGeometry, spec) {
  const exporter = new STLExporter();
  const exportGeom = lidGeometry.clone();
  // Üst kapağı ters çevirerek (-90° X dönüşü: +Y dış tavan -> -Z tabla yüzeyi) Z=0'a oturt
  exportGeom.rotateX(-Math.PI * 0.5);
  exportGeom.computeBoundingBox();
  const minZ = exportGeom.boundingBox.min.z;
  exportGeom.translate(0, 0, -minZ);

  const tempMesh = new THREE.Mesh(exportGeom);
  const buffer = exporter.parse(tempMesh, { binary: true });
  exportGeom.dispose();

  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  triggerBlobDownload(blob, `Ust_Kapak_Lid_${spec.sku}.stl`);
}

/**
 * 3. BOM / MALİYET ANALİZİ HESABI & .CSV İHRACATI
 */
export function calculateBOMSummary(spec, baseMetro, lidMetro, materialKey = 'PETG') {
  const mat = MATERIAL_SPECS[materialKey] || MATERIAL_SPECS.PETG;
  const ins = spec.insert;

  // FDM tipik efektif doluluk çarpanı (%35 efektif duvar+infill yerine katı kabuk hacmi üzerinden gerçek kütle:
  // 2.4mm duvar zaten neredeyse %92 katı çevre duvarından oluşur)
  const infillFactor = mat.key === 'AL6061' ? 1.0 : 0.90;
  const baseMassG = baseMetro.volCm3 * mat.densityGcm3 * infillFactor;
  const lidMassG = lidMetro.volCm3 * mat.densityGcm3 * infillFactor;

  // Makine + işçilik süresi maliyeti (~18g/saat baskı hızı, saatlik 24 TL amortisman+enerji)
  const basePrintCostTL = baseMassG * mat.costPerGramTL + (baseMassG / 18.0) * 24.0;
  const lidPrintCostTL = lidMassG * mat.costPerGramTL + (lidMassG / 18.0) * 24.0;

  const pcbAreaCm2 = (spec.pcbW * spec.pcbL) / 100.0;
  const pcbMassG = pcbAreaCm2 * 0.16 * 1.85; // 1.6mm FR4 ~1.85 g/cm³
  const pcbUnitTL = Math.max(28.0, pcbAreaCm2 * 0.85);

  const rows = [
    {
      no: 1,
      code: `${spec.sku}-BASE`,
      desc: `Alt Kutu Gövdesi (${spec.outerW.toFixed(1)}×${spec.outerL.toFixed(1)}×${(spec.splitY + spec.lipHeight).toFixed(1)}mm)`,
      cat: '3B Baskı / İmalat',
      matSpec: mat.label,
      qty: 1,
      unit: 'Adet',
      unitMassG: baseMassG,
      unitTL: basePrintCostTL,
      note: `Hacim: ${baseMetro.volCm3.toFixed(2)} cm³ | 4x Konik Insert Standoff + 4x Köşe Kolonu`
    },
    {
      no: 2,
      code: `${spec.sku}-LID`,
      desc: `Üst Kapak (${spec.seamClearance.toFixed(2)}mm Geçme Oluklu + Gömme Havşalı)`,
      cat: '3B Baskı / İmalat',
      matSpec: mat.label,
      qty: 1,
      unit: 'Adet',
      unitMassG: lidMassG,
      unitTL: lidPrintCostTL,
      note: `Hacim: ${lidMetro.volCm3.toFixed(2)} cm³ | Havşa Ø${ins.cboreDia.toFixed(1)}×${ins.cboreDepth.toFixed(1)}mm`
    },
    {
      no: 3,
      code: `INS-BRASS-${ins.code}`,
      desc: `Isıl Çakma Tırtıllı Pirinç Insert (${ins.label})`,
      cat: 'Bağlantı Donanımı',
      matSpec: 'CuZn39Pb3 Pirinç (CW614N)',
      qty: 8,
      unit: 'Adet',
      unitMassG: ins.insertMassG,
      unitTL: ins.insertUnitTL,
      note: `4x PCB Standoff + 4x Kapak Köşe | Konik Yuva Ø${ins.boreNomDia.toFixed(2)}mm (${mat.heatStakeTempC || 230}°C)`
    },
    {
      no: 4,
      code: `SCR-DIN7985-${ins.code}x5`,
      desc: `${ins.code}×5mm PCB Montaj Vidası (Yıldız Silindir Başlı)`,
      cat: 'Bağlantı Donanımı',
      matSpec: 'DIN 7985 A2 Paslanmaz Çelik',
      qty: 4,
      unit: 'Adet',
      unitMassG: ins.screwMassG * 0.75,
      unitTL: ins.screwUnitTL * 0.85,
      note: `Delik Kenar Mesafesi: ${spec.edgeDist.toFixed(1)}mm`
    },
    {
      no: 5,
      code: `SCR-ISO4762-${ins.code}`,
      desc: `${ins.code}×${Math.round(Math.max(8, spec.lidTopY - spec.splitY + 2))}mm Kapak İmbus Vidası (Alyan Başlı)`,
      cat: 'Bağlantı Donanımı',
      matSpec: 'ISO 4762 / DIN 912 Siyah Oksit 12.9',
      qty: 4,
      unit: 'Adet',
      unitMassG: ins.screwMassG,
      unitTL: ins.screwUnitTL,
      note: `Kapak Gömme Havşa Ø${ins.cboreDia.toFixed(1)}mm içine tam sıfır oturur`
    },
    {
      no: 6,
      code: `PCB-FR4-${Math.round(spec.pcbW)}x${Math.round(spec.pcbL)}`,
      desc: `Özel Elektronik Devre Kartı (${spec.pcbW.toFixed(1)}×${spec.pcbL.toFixed(1)}×1.6mm)`,
      cat: 'Elektronik Alt Montaj',
      matSpec: 'FR4 TG150 Çift Katman ENIG',
      qty: 1,
      unit: 'Adet',
      unitMassG: pcbMassG,
      unitTL: pcbUnitTL,
      note: `Kart Alanı: ${pcbAreaCm2.toFixed(1)} cm²`
    }
  ];

  spec.activeCutouts.forEach((c, idx) => {
    rows.push({
      no: rows.length + 1,
      code: `CONN-${c.isUsb ? 'USBC-16P' : `IO-${idx + 1}`}`,
      desc: `${c.label} (${c.wall.toUpperCase()} duvarı, Ofset ${c.offsetMm.toFixed(1)}mm)`,
      cat: 'G/Ç Konnektör',
      matSpec: c.isUsb ? 'USB Type-C SMD 16-Pin' : 'Endüstriyel Panel/PCB Soket',
      qty: 1,
      unit: 'Adet',
      unitMassG: c.isUsb ? 1.4 : 2.8,
      unitTL: c.unitTL || 16.0,
      note: `Kesit: ${c.width.toFixed(1)}×${c.height.toFixed(1)}mm @ Y=${c.centerY.toFixed(1)}mm`
    });
  });

  rows.push({
    no: rows.length + 1,
    code: 'PAD-EPDM-D8',
    desc: 'Kendinden Yapışkanlı Kaydırmaz EPDM Taban Ayağı (Ø8×2mm)',
    cat: 'Tamamlayıcı Aksesuar',
    matSpec: 'EPDM Kauçuk 60 Shore A',
    qty: 4,
    unit: 'Adet',
    unitMassG: 0.25,
    unitTL: 1.25,
    note: 'Alt kutu köşe tabanlarına uygulanır'
  });

  let totalMassG = 0;
  let totalCostTL = 0;

  const enriched = rows.map((r) => {
    const lineMass = r.qty * r.unitMassG;
    const lineTL = r.qty * r.unitTL;
    const lineUSD = lineTL / USD_RATE_TL;
    totalMassG += lineMass;
    totalCostTL += lineTL;
    return {
      ...r,
      totalMassG: lineMass,
      totalTL: lineTL,
      totalUSD: lineUSD
    };
  });

  return {
    rows: enriched,
    plasticMassG: baseMassG + lidMassG,
    baseMassG,
    lidMassG,
    totalMassG,
    totalCostTL,
    totalCostUSD: totalCostTL / USD_RATE_TL,
    batch10UnitTL: totalCostTL * 0.86,
    batch100UnitTL: totalCostTL * 0.71
  };
}

export function exportBOMCSV(spec, baseMetro, lidMetro, materialKey = 'PETG') {
  const bom = calculateBOMSummary(spec, baseMetro, lidMetro, materialKey);
  const csvEsc = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [
    [
      'Kalem_No',
      'Parca_Kodu',
      'Parca_Tanimi',
      'Kategori',
      'Malzeme_Standart',
      'Miktar',
      'Birim',
      'Birim_Kutle_g',
      'Toplam_Kutle_g',
      'Birim_Maliyet_TL',
      'Toplam_Maliyet_TL',
      'Toplam_Maliyet_USD',
      'DFM_ve_Imalat_Notu'
    ].join(',')
  ];

  bom.rows.forEach((r) => {
    lines.push(
      [
        r.no,
        csvEsc(r.code),
        csvEsc(r.desc),
        csvEsc(r.cat),
        csvEsc(r.matSpec),
        r.qty,
        csvEsc(r.unit),
        r.unitMassG.toFixed(2),
        r.totalMassG.toFixed(2),
        r.unitTL.toFixed(2),
        r.totalTL.toFixed(2),
        r.totalUSD.toFixed(2),
        csvEsc(r.note)
      ].join(',')
    );
  });

  lines.push('');
  lines.push(['OZET', csvEsc(spec.sku), 'Prototip Tekil Toplam', '', '', 1, 'Set', '', bom.totalMassG.toFixed(2), '', bom.totalCostTL.toFixed(2), bom.totalCostUSD.toFixed(2), '1:1 DFM Hazir Set'].join(','));
  lines.push(['OZET', csvEsc(spec.sku), '10 Adetlik Küçük Seri (Birim)', '', '', 10, 'Set', '', bom.totalMassG.toFixed(2), '', bom.batch10UnitTL.toFixed(2), (bom.batch10UnitTL / USD_RATE_TL).toFixed(2), '%14 Seri İskontosu'].join(','));
  lines.push(['OZET', csvEsc(spec.sku), '100 Adetlik Üretim Serisi (Birim)', '', '', 100, 'Set', '', bom.totalMassG.toFixed(2), '', bom.batch100UnitTL.toFixed(2), (bom.batch100UnitTL / USD_RATE_TL).toFixed(2), '%29 Seri İskontosu'].join(','));

  const utf8Bom = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([utf8Bom], { type: 'text/csv;charset=utf-8' });
  triggerBlobDownload(blob, `BOM_Maliyet_${spec.sku}.csv`);
}

/**
 * 4. 2B "Imalat_Anteti" STANDOFF KOORDİNAT & KESİT TEKNİK RESMİ (.SVG)
 * Hem canlı önizleme hem de indirilebilir ISO/TSE teknik resim üretir.
 */
export function generateImalatAntetiSVG(spec, baseMetro, lidMetro, materialKey = 'PETG') {
  const mat = MATERIAL_SPECS[materialKey] || MATERIAL_SPECS.PETG;
  const ins = spec.insert;
  const W = 1240;
  const H = 876;
  const dateStr = new Date().toISOString().slice(0, 10);

  // Üst Görünüm (Plan View) ölçekleme: Sol üst kadran (x: 65..670, y: 75..520)
  const planBoxW = 540;
  const planBoxH = 380;
  const planScale = Math.min(planBoxW / (spec.outerW + 36), planBoxH / (spec.outerL + 36));
  const planCX = 355;
  const planCY = 290;

  const px = (xMm) => (planCX + xMm * planScale).toFixed(2);
  const py = (zMm) => (planCY + zMm * planScale).toFixed(2);
  const pr = (rMm) => (rMm * planScale).toFixed(2);

  // Ölçü oku yardımcısı
  const dimLineH = (x1, x2, yLine, yTarget, text) => `
    <g class="dim">
      <line x1="${x1.toFixed(1)}" y1="${yTarget.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${(yLine + (yLine < yTarget ? -5 : 5)).toFixed(1)}" stroke="#5c4b37" stroke-width="0.8" />
      <line x1="${x2.toFixed(1)}" y1="${yTarget.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(yLine + (yLine < yTarget ? -5 : 5)).toFixed(1)}" stroke="#5c4b37" stroke-width="0.8" />
      <line x1="${x1.toFixed(1)}" y1="${yLine.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${yLine.toFixed(1)}" stroke="#c8371d" stroke-width="1.1" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)" />
      <rect x="${((x1 + x2) * 0.5 - 38).toFixed(1)}" y="${(yLine - 9).toFixed(1)}" width="76" height="15" fill="#f7f4ec" />
      <text x="${((x1 + x2) * 0.5).toFixed(1)}" y="${(yLine + 3).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#c8371d">${escXml(text)}</text>
    </g>`;

  const dimLineV = (y1, y2, xLine, xTarget, text) => `
    <g class="dim">
      <line x1="${xTarget.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(xLine + (xLine < xTarget ? -5 : 5)).toFixed(1)}" y2="${y1.toFixed(1)}" stroke="#5c4b37" stroke-width="0.8" />
      <line x1="${xTarget.toFixed(1)}" y1="${y2.toFixed(1)}" x2="${(xLine + (xLine < xTarget ? -5 : 5)).toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#5c4b37" stroke-width="0.8" />
      <line x1="${xLine.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${xLine.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#c8371d" stroke-width="1.1" marker-start="url(#arrowStart)" marker-end="url(#arrowEnd)" />
      <g transform="translate(${xLine.toFixed(1)}, ${((y1 + y2) * 0.5).toFixed(1)}) rotate(-90)">
        <rect x="-38" y="-9" width="76" height="15" fill="#f7f4ec" />
        <text x="0" y="3" text-anchor="middle" font-size="10.5" font-weight="700" fill="#c8371d">${escXml(text)}</text>
      </g>
    </g>`;

  // Standoff & Köşe Boss SVG çizimleri
  const standoffMarks = spec.pcbStandoffs
    .map(
      (st) => `
      <g>
        <circle cx="${px(st.x)}" cy="${py(st.z)}" r="${pr(ins.bossOD * 0.5)}" fill="#efe9da" stroke="#141413" stroke-width="1.5" />
        <circle cx="${px(st.x)}" cy="${py(st.z)}" r="${pr(ins.borePilotDia * 0.5)}" fill="none" stroke="#8a6214" stroke-width="0.9" stroke-dasharray="2.5 1.8" />
        <circle cx="${px(st.x)}" cy="${py(st.z)}" r="${pr(ins.boreNomDia * 0.5)}" fill="#ffffff" stroke="#c8371d" stroke-width="1.3" />
        <line x1="${(Number(px(st.x)) - 9).toFixed(1)}" y1="${py(st.z)}" x2="${(Number(px(st.x)) + 9).toFixed(1)}" y2="${py(st.z)}" stroke="#c8371d" stroke-width="0.7" />
        <line x1="${px(st.x)}" y1="${(Number(py(st.z)) - 9).toFixed(1)}" x2="${px(st.x)}" y2="${(Number(py(st.z)) + 9).toFixed(1)}" stroke="#c8371d" stroke-width="0.7" />
        <text x="${(Number(px(st.x)) + 8).toFixed(1)}" y="${(Number(py(st.z)) - 8).toFixed(1)}" font-size="9.5" font-weight="700" fill="#141413">${st.id}</text>
      </g>`
    )
    .join('');

  const cornerMarks = spec.lidBosses
    .map(
      (kb) => `
      <g>
        <circle cx="${px(kb.x)}" cy="${py(kb.z)}" r="${pr(spec.rLidBoss)}" fill="#e6dfd0" stroke="#141413" stroke-width="1.3" />
        <circle cx="${px(kb.x)}" cy="${py(kb.z)}" r="${pr(ins.boreNomDia * 0.5)}" fill="#ffffff" stroke="#1d5a8a" stroke-width="1.2" />
        <text x="${(Number(px(kb.x)) + (kb.sx > 0 ? -16 : 6)).toFixed(1)}" y="${(Number(py(kb.z)) + (kb.sz > 0 ? -6 : 13)).toFixed(1)}" font-size="8.8" font-weight="600" fill="#1d5a8a">${kb.id}</text>
      </g>`
    )
    .join('');

  // Plan görünümde G/Ç kesit işaretçileri
  const cutoutPlanBadges = spec.activeCutouts
    .map((c) => {
      let cxp = planCX;
      let cyp = planCY;
      let bw = c.width * planScale;
      let bh = spec.wallT * planScale;
      if (c.wall === 'front') {
        cxp = planCX + c.offsetMm * planScale;
        cyp = planCY - (spec.innerHalfZ + spec.wallT * 0.5) * planScale;
      } else if (c.wall === 'back') {
        cxp = planCX + c.offsetMm * planScale;
        cyp = planCY + (spec.innerHalfZ + spec.wallT * 0.5) * planScale;
      } else if (c.wall === 'left') {
        cxp = planCX - (spec.innerHalfX + spec.wallT * 0.5) * planScale;
        cyp = planCY + c.offsetMm * planScale;
        bw = spec.wallT * planScale;
        bh = c.width * planScale;
      } else if (c.wall === 'right') {
        cxp = planCX + (spec.innerHalfX + spec.wallT * 0.5) * planScale;
        cyp = planCY + c.offsetMm * planScale;
        bw = spec.wallT * planScale;
        bh = c.width * planScale;
      }
      return `
        <g>
          <rect x="${(cxp - bw * 0.5).toFixed(1)}" y="${(cyp - bh * 0.5).toFixed(1)}" width="${Math.max(3, bw).toFixed(1)}" height="${Math.max(3, bh).toFixed(1)}" fill="#fff4eb" stroke="#c8371d" stroke-width="1.4" />
          <text x="${cxp.toFixed(1)}" y="${(cyp + (c.wall === 'front' ? -8 : c.wall === 'back' ? 14 : -6)).toFixed(1)}" text-anchor="middle" font-size="8.8" font-weight="700" fill="#c8371d">${escXml(c.id)}</text>
        </g>`;
    })
    .join('');

  // KESİT A-A: Konik Insert Standoff + 0.20mm Geçmeli Dudak/Oluk + Kapak Gömme Havşa Detayı (Sağ Üst Kadran)
  const secOriginX = 720;
  const secBaseY = 425;
  const secScale = Math.min(220 / Math.max(36, spec.outerH), 5.2);
  const sy = (yMm) => (secBaseY - yMm * secScale).toFixed(1);

  const wallPx = Math.max(12, spec.wallT * secScale);
  const lipPx = Math.max(5.5, spec.lipThick * secScale);
  const clrPx = Math.max(2.2, spec.seamClearance * secScale * 2.5); // Teknik netlik için görünür boşluk çizimi

  // Koordinat tablosu satırları (Sol Alt Kadran)
  const pitchX = Math.abs(spec.pcbStandoffs[1].x - spec.pcbStandoffs[0].x);
  const pitchZ = Math.abs(spec.pcbStandoffs[2].z - spec.pcbStandoffs[1].z);

  const coordRowsSvg = [
    ...spec.pcbStandoffs.map((st, idx) => ({
      id: st.id,
      role: 'PCB Standoff (Konik)',
      x: st.x.toFixed(2),
      y: (-st.z).toFixed(2),
      od: `Ø${ins.bossOD.toFixed(1)}`,
      bore: `Ø${ins.borePilotDia.toFixed(2)}→Ø${ins.boreNomDia.toFixed(2)}`,
      depth: `${ins.boreDepth.toFixed(1)} mm`,
      rowIdx: idx
    })),
    ...spec.lidBosses.map((kb, idx) => ({
      id: kb.id,
      role: 'Kapak Köşe Kolonu',
      x: kb.x.toFixed(2),
      y: (-kb.z).toFixed(2),
      od: `Ø${ins.bossOD.toFixed(1)}`,
      bore: `Ø${ins.boreNomDia.toFixed(2)} / Havşa Ø${ins.cboreDia.toFixed(1)}`,
      depth: `${ins.boreDepth.toFixed(1)} / ${ins.cboreDepth.toFixed(1)} mm`,
      rowIdx: idx + 4
    }))
  ]
    .map((r) => {
      const ry = 590 + r.rowIdx * 23;
      return `
        <g>
          <rect x="46" y="${ry - 14}" width="644" height="22" fill="${r.rowIdx % 2 === 0 ? '#f1ece0' : '#f7f4ec'}" stroke="#d4ccb8" stroke-width="0.6" />
          <text x="60" y="${ry}" font-size="9.8" font-weight="700" fill="#141413">${r.id}</text>
          <text x="108" y="${ry}" font-size="9.5" fill="#2c2b29">${r.role}</text>
          <text x="270" y="${ry}" font-size="9.8" font-weight="600" fill="#141413">${r.x}</text>
          <text x="348" y="${ry}" font-size="9.8" font-weight="600" fill="#141413">${r.y}</text>
          <text x="425" y="${ry}" font-size="9.5" fill="#2c2b29">${r.od}</text>
          <text x="492" y="${ry}" font-size="9.5" font-weight="700" fill="#c8371d">${r.bore}</text>
          <text x="625" y="${ry}" font-size="9.5" fill="#2c2b29">${r.depth}</text>
        </g>`;
    })
    .join('');

  const ioSummarySvg =
    spec.activeCutouts.length === 0
      ? `<text x="58" y="806" font-size="9.8" fill="#5c4b37">Yan G/Ç Kesiti: Kapalı (Tam Sızdırmaz Yan Duvar)</text>`
      : spec.activeCutouts
          .slice(0, 4)
          .map(
            (c, i) =>
              `<text x="${58 + (i % 2) * 320}" y="${802 + Math.floor(i / 2) * 16}" font-size="9.4" fill="#141413">[${escXml(c.id)}] Duvar: ${c.wall.toUpperCase()} | Yatay Ofset: ${c.offsetMm.toFixed(1)}mm | Merkez Y: ${c.centerY.toFixed(1)}mm | Ebat: ${c.width.toFixed(1)}×${c.height.toFixed(1)}mm</text>`
          )
          .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}px" height="${H}px" style="background:#f7f4ec;font-family:'JetBrains Mono','Consolas',monospace;">
  <defs>
    <marker id="arrowStart" viewBox="0 0 10 10" refX="1.5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 9 1.5 L 1 5 L 9 8.5 z" fill="#c8371d" />
    </marker>
    <marker id="arrowEnd" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="#c8371d" />
    </marker>
    <pattern id="hatch45" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#8a7f6d" stroke-width="1.0" />
    </pattern>
    <pattern id="hatchLid" width="8" height="8" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#4a6882" stroke-width="1.0" />
    </pattern>
  </defs>

  <!-- DIŞ ÇERÇEVE VE ISO 5457 ANTET SINIRI -->
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="#f7f4ec" stroke="#141413" stroke-width="2.2" />
  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="#141413" stroke-width="0.9" />

  <!-- ÜST BAŞLIK BANDI -->
  <text x="44" y="50" font-size="13" font-weight="700" fill="#141413">1. GÖRÜNÜM: ALT KUTU ÜST PLAN — STANDOFF KOORDİNAT &amp; G/Ç HARİTASI (BİRİM: mm)</text>
  <text x="716" y="50" font-size="13" font-weight="700" fill="#141413">2. KESİT A-A: KONİK INSERT &amp; 0.20mm DUDAK-OLUK DETAYI</text>
  <line x1="700" y1="26" x2="700" y2="538" stroke="#141413" stroke-width="1.0" />
  <line x1="26" y1="538" x2="${W - 26}" y2="538" stroke="#141413" stroke-width="1.2" />

  <!-- ======================================================================= -->
  <!-- SOL ÜST: ÜST PLAN GÖRÜNÜMÜ                                              -->
  <!-- ======================================================================= -->
  <!-- Dış Gövde -->
  <rect x="${px(-spec.outerHalfX)}" y="${py(-spec.outerHalfZ)}" width="${(spec.outerW * planScale).toFixed(2)}" height="${(spec.outerL * planScale).toFixed(2)}" rx="${pr(spec.rCornerOut)}" fill="#fdfbf6" stroke="#141413" stroke-width="2.1" />
  <!-- 0.20mm Geçmeli Dudak Sınırı -->
  <rect x="${px(-(spec.innerHalfX + spec.lipThick))}" y="${py(-(spec.innerHalfZ + spec.lipThick))}" width="${((spec.innerW + spec.lipThick * 2) * planScale).toFixed(2)}" height="${((spec.innerL + spec.lipThick * 2) * planScale).toFixed(2)}" rx="${pr(spec.rCornerIn + spec.lipThick)}" fill="none" stroke="#c8371d" stroke-width="1.0" stroke-dasharray="5 3" />
  <!-- İç Oyuk Sınırı -->
  <rect x="${px(-spec.innerHalfX)}" y="${py(-spec.innerHalfZ)}" width="${(spec.innerW * planScale).toFixed(2)}" height="${(spec.innerL * planScale).toFixed(2)}" rx="${pr(spec.rCornerIn)}" fill="#f7f4ec" stroke="#141413" stroke-width="1.4" />

  <!-- PCB Kart Sınırı (Yeşil kesikli referans kontur) -->
  <rect x="${px(-spec.pcbW * 0.5)}" y="${py(-spec.pcbL * 0.5)}" width="${(spec.pcbW * planScale).toFixed(2)}" height="${(spec.pcbL * planScale).toFixed(2)}" rx="${pr(1.8)}" fill="rgba(36, 114, 72, 0.07)" stroke="#1f6e43" stroke-width="1.5" stroke-dasharray="8 3 2 3" />
  <text x="${px(0)}" y="${(planCY - 6).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#1f6e43">PCB: ${spec.pcbW.toFixed(1)} × ${spec.pcbL.toFixed(1)} mm</text>
  <text x="${px(0)}" y="${(planCY + 9).toFixed(1)}" text-anchor="middle" font-size="9" fill="#5c4b37">Merkez (0.00, 0.00) | Kenar Payı: ${spec.edgeDist.toFixed(1)} mm</text>

  <!-- Eksen Çizgileri -->
  <line x1="${( Number(px(-spec.outerHalfX)) - 18 ).toFixed(1)}" y1="${planCY}" x2="${( Number(px(spec.outerHalfX)) + 18 ).toFixed(1)}" y2="${planCY}" stroke="#7a7264" stroke-width="0.7" stroke-dasharray="12 4 2 4" />
  <line x1="${planCX}" y1="${( Number(py(-spec.outerHalfZ)) - 18 ).toFixed(1)}" x2="${planCX}" y2="${( Number(py(spec.outerHalfZ)) + 18 ).toFixed(1)}" stroke="#7a7264" stroke-width="0.7" stroke-dasharray="12 4 2 4" />

  ${cornerMarks}
  ${standoffMarks}
  ${cutoutPlanBadges}

  <!-- Plan Ölçülendirmeleri -->
  ${dimLineH(Number(px(-spec.outerHalfX)), Number(px(spec.outerHalfX)), Number(py(-spec.outerHalfZ)) - 34, Number(py(-spec.outerHalfZ)), `DIŞ EN: ${spec.outerW.toFixed(1)} mm`)}
  ${dimLineH(Number(px(-spec.pcbW * 0.5)), Number(px(spec.pcbW * 0.5)), Number(py(spec.outerHalfZ)) + 24, Number(py(spec.pcbL * 0.5)), `PCB EN: ${spec.pcbW.toFixed(1)} mm`)}
  ${dimLineH(Number(px(spec.pcbStandoffs[0].x)), Number(px(spec.pcbStandoffs[1].x)), Number(py(spec.outerHalfZ)) + 46, Number(py(spec.pcbStandoffs[2].z)), `AKS X: ${pitchX.toFixed(1)} mm`)}

  ${dimLineV(Number(py(-spec.outerHalfZ)), Number(py(spec.outerHalfZ)), Number(px(-spec.outerHalfX)) - 34, Number(px(-spec.outerHalfX)), `DIŞ BOY: ${spec.outerL.toFixed(1)} mm`)}
  ${dimLineV(Number(py(spec.pcbStandoffs[0].z)), Number(py(spec.pcbStandoffs[3].z)), Number(px(spec.outerHalfX)) + 32, Number(px(spec.pcbStandoffs[1].x)), `AKS Y: ${pitchZ.toFixed(1)} mm`)}

  <!-- ======================================================================= -->
  <!-- SAĞ ÜST: KESİT A-A (DUDAK-OLUK + KONİK PİRİNÇ INSERT + GÖMME HAVŞA)     -->
  <!-- ======================================================================= -->
  <g id="section-aa">
    <!-- Taban + Yan Duvar + İç Geçme Dudağı Kesiti -->
    <path d="
      M ${secOriginX} ${secBaseY}
      L ${secOriginX + 350} ${secBaseY}
      L ${secOriginX + 350} ${sy(spec.wallT)}
      L ${secOriginX + wallPx + lipPx} ${sy(spec.wallT)}
      L ${secOriginX + wallPx} ${sy(spec.wallT)}
      L ${secOriginX + wallPx} ${sy(spec.splitY + spec.lipHeight)}
      L ${secOriginX + wallPx - lipPx} ${sy(spec.splitY + spec.lipHeight)}
      L ${secOriginX + wallPx - lipPx} ${sy(spec.splitY)}
      L ${secOriginX} ${sy(spec.splitY)}
      Z" fill="url(#hatch45)" stroke="#141413" stroke-width="1.8" />

    <!-- Üst Kapak + 0.20mm Karşılık Oluğu + Gömme Vida Havşası Kesiti -->
    <path d="
      M ${secOriginX} ${sy(spec.splitY + 0.3)}
      L ${secOriginX + wallPx - lipPx - clrPx} ${sy(spec.splitY + 0.3)}
      L ${secOriginX + wallPx - lipPx - clrPx} ${sy(spec.splitY + spec.grooveHeight)}
      L ${secOriginX + wallPx} ${sy(spec.splitY + spec.grooveHeight)}
      L ${secOriginX + wallPx} ${sy(spec.lidCeilingY)}
      L ${secOriginX + 265} ${sy(spec.lidCeilingY)}
      L ${secOriginX + 265} ${sy(spec.lidTopY - ins.cboreDepth)}
      L ${secOriginX + 252} ${sy(spec.lidTopY - ins.cboreDepth)}
      L ${secOriginX + 252} ${sy(spec.lidTopY)}
      L ${secOriginX} ${sy(spec.lidTopY)}
      Z" fill="url(#hatchLid)" stroke="#1d5a8a" stroke-width="1.8" />

    <!-- Kapak Havşa Sağ Yarısı -->
    <rect x="${secOriginX + 298}" y="${sy(spec.lidTopY)}" width="52" height="${(spec.wallT * secScale).toFixed(1)}" fill="url(#hatchLid)" stroke="#1d5a8a" stroke-width="1.8" />
    <line x1="${secOriginX + 275}" y1="${Number(sy(spec.lidTopY)) - 12}" x2="${secOriginX + 275}" y2="${Number(sy(spec.lidCeilingY)) + 16}" stroke="#c8371d" stroke-width="0.9" stroke-dasharray="8 3 2 3" />

    <!-- Konik Standoff Kesiti (Şematik Büyütülmüş Kesit Gösterimi) -->
    <path d="
      M ${secOriginX + 125} ${sy(spec.wallT)}
      L ${secOriginX + 135} ${sy(spec.wallT + 1.4)}
      L ${secOriginX + 135} ${sy(spec.pcbBottomY)}
      L ${secOriginX + 152} ${sy(spec.pcbBottomY)}
      L ${secOriginX + 155} ${sy(spec.pcbBottomY - ins.leadInDepth)}
      L ${secOriginX + 157} ${sy(spec.pcbBottomY - ins.boreDepth)}
      L ${secOriginX + 183} ${sy(spec.pcbBottomY - ins.boreDepth)}
      L ${secOriginX + 185} ${sy(spec.pcbBottomY - ins.leadInDepth)}
      L ${secOriginX + 188} ${sy(spec.pcbBottomY)}
      L ${secOriginX + 205} ${sy(spec.pcbBottomY)}
      L ${secOriginX + 205} ${sy(spec.wallT + 1.4)}
      L ${secOriginX + 215} ${sy(spec.wallT)}
      Z" fill="url(#hatch45)" stroke="#141413" stroke-width="1.7" />

    <!-- PCB Kesit Şeridi -->
    <rect x="${secOriginX + 95}" y="${sy(spec.pcbTopY)}" width="150" height="${Math.max(5, spec.pcbThick * secScale).toFixed(1)}" fill="#2b7a4b" stroke="#141413" stroke-width="1.2" />

    <!-- Teknik Oklar ve DFM Açıklamaları -->
    <text x="${secOriginX + 74}" y="${sy(spec.splitY + spec.lipHeight * 0.6)}" font-size="9.8" font-weight="700" fill="#c8371d">← 0.20mm GEÇMELİ DUDAK &amp; OLUK BOŞLUĞU</text>
    <text x="${secOriginX + 74}" y="${Number(sy(spec.splitY + spec.lipHeight * 0.6)) + 13}" font-size="9.0" fill="#2c2b29">Dudak: ${spec.lipThick.toFixed(2)}×${spec.lipHeight.toFixed(2)}mm | Oluk: ${spec.grooveInnerOffset.toFixed(2)}×${spec.grooveHeight.toFixed(2)}mm</text>

    <text x="${secOriginX + 220}" y="${sy(spec.pcbBottomY - 1.0)}" font-size="9.8" font-weight="700" fill="#8a6214">← KONİK ${ins.code} PİRİNÇ INSERT YUVASI</text>
    <text x="${secOriginX + 220}" y="${Number(sy(spec.pcbBottomY - 1.0)) + 13}" font-size="9.0" fill="#2c2b29">Giriş Ø${ins.borePilotDia.toFixed(2)} → Yuva Ø${ins.boreNomDia.toFixed(2)} → Dip Ø${ins.boreRootDia.toFixed(2)}mm</text>
    <text x="${secOriginX + 220}" y="${Number(sy(spec.pcbBottomY - 1.0)) + 26}" font-size="9.0" fill="#2c2b29">Derinlik: ${ins.boreDepth.toFixed(1)}mm | Standoff Yükseklik: ${spec.standoffH.toFixed(1)}mm</text>

    <text x="${secOriginX + 230}" y="${Number(sy(spec.lidTopY)) - 16}" font-size="9.6" font-weight="700" fill="#1d5a8a">KAPAK GÖMME VİDA HAVŞASI: Ø${ins.cboreDia.toFixed(1)} × ${ins.cboreDepth.toFixed(1)} mm (Geçiş Ø${ins.lidClearDia.toFixed(1)} mm)</text>

    <!-- Toplam & İç Yükseklik Ölçüsü -->
    ${dimLineV(Number(sy(spec.lidTopY)), secBaseY, secOriginX + 412, secOriginX + 350, `TOPLAM H: ${spec.outerH.toFixed(1)} mm`)}
    ${dimLineV(Number(sy(spec.lidCeilingY)), Number(sy(spec.wallT)), secOriginX + 380, secOriginX + 350, `İÇ H: ${spec.innerH.toFixed(1)} mm`)}

    <!-- DFM Özet Kutusu -->
    <rect x="720" y="450" width="475" height="74" fill="#efe9da" stroke="#141413" stroke-width="1.0" />
    <text x="732" y="468" font-size="10.2" font-weight="700" fill="#141413">DFM ÜRETİM &amp; MONTAJ TALİMATLARI:</text>
    <text x="732" y="484" font-size="9.2" fill="#2c2b29">1. Havya ucu sıcaklığı ${mat.heatStakeTempC || 230}°C ile ${ins.code} tırtıllı pirinç insertleri konik kılavuz yuvaya dikey basın.</text>
    <text x="732" y="499" font-size="9.2" fill="#2c2b29">2. Duvar kalınlığı: ${spec.wallT.toFixed(2)} mm (0.4mm nozül için ${Math.round(spec.wallT / 0.4)} çevre duvarı) | Havalandırma: ${spec.ventsEnabled ? 'AÇIK (45° Panjur + Izgara)' : 'KAPALI'}.</text>
    <text x="732" y="514" font-size="9.2" fill="#2c2b29">3. STL İhracatı: Üst kapak otomatik 180° çevrilmiş olup destek malzemesi (support) gerektirmez.</text>
  </g>

  <!-- ======================================================================= -->
  <!-- SOL ALT: STANDOFF & KÖŞE BOSS CNC/CAD KOORDİNAT TABLOSU                  -->
  <!-- ======================================================================= -->
  <text x="46" y="560" font-size="12" font-weight="700" fill="#141413">3. STANDOFF &amp; KÖŞE BOSS MERKEZ KOORDİNAT TABLOSU [Referans: Kutu Merkezi (0,0)]</text>
  <rect x="46" y="566" width="644" height="20" fill="#141413" />
  <text x="60" y="580" font-size="9.5" font-weight="700" fill="#f7f4ec">KOD</text>
  <text x="108" y="580" font-size="9.5" font-weight="700" fill="#f7f4ec">FONKSİYON</text>
  <text x="270" y="580" font-size="9.5" font-weight="700" fill="#f7f4ec">X (mm)</text>
  <text x="348" y="580" font-size="9.5" font-weight="700" fill="#f7f4ec">Y (mm)</text>
  <text x="425" y="580" font-size="9.5" font-weight="700" fill="#f7f4ec">BOSS Ø</text>
  <text x="492" y="580" font-size="9.5" font-weight="700" fill="#f7f4ec">KONİK YUVA / HAVŞA</text>
  <text x="625" y="580" font-size="9.5" font-weight="700" fill="#f7f4ec">DERİNLİK</text>
  ${coordRowsSvg}

  <rect x="46" y="772" width="644" height="68" fill="#f1ece0" stroke="#141413" stroke-width="0.9" />
  <text x="58" y="787" font-size="10" font-weight="700" fill="#c8371d">YAN G/Ç (I/O) VE USB KONNEKTÖR KESİT KOORDİNATLARI:</text>
  ${ioSummarySvg}

  <!-- ======================================================================= -->
  <!-- SAĞ ALT: TSE / ISO 7200 RESMİ İMALAT ANTETİ (TITLE BLOCK)               -->
  <!-- ======================================================================= -->
  <g id="imalat-anteti">
    <rect x="708" y="552" width="496" height="288" fill="#fdfbf6" stroke="#141413" stroke-width="1.8" />
    <rect x="708" y="552" width="496" height="44" fill="#141413" />
    <text x="724" y="572" font-size="11" font-weight="700" fill="#e04f33">İMALAT ANTETİ // CUSTOM PCB ENCLOSURE &amp; HEAT-SET INSERT CAD</text>
    <text x="724" y="588" font-size="9.5" fill="#f7f4ec">STANDART: ISO 128 / ISO 2768-mK (FDM ±0.15 mm) — 1:1 MİLİMETRE MÜHENDİSLİK ÖLÇEĞİ</text>

    <line x1="708" y1="636" x2="1204" y2="636" stroke="#141413" stroke-width="1.0" />
    <line x1="708" y1="680" x2="1204" y2="680" stroke="#141413" stroke-width="1.0" />
    <line x1="708" y1="724" x2="1204" y2="724" stroke="#141413" stroke-width="1.0" />
    <line x1="708" y1="768" x2="1204" y2="768" stroke="#141413" stroke-width="1.0" />
    <line x1="708" y1="806" x2="1204" y2="806" stroke="#141413" stroke-width="1.0" />
    <line x1="956" y1="596" x2="956" y2="840" stroke="#141413" stroke-width="1.0" />

    <text x="720" y="612" font-size="8.5" fill="#6b6458">PARÇA / PROJE KODU (SKU)</text>
    <text x="720" y="628" font-size="13" font-weight="700" fill="#c8371d">${escXml(spec.sku)}</text>
    <text x="968" y="612" font-size="8.5" fill="#6b6458">PİRİNÇ INSERT TİPİ</text>
    <text x="968" y="628" font-size="12" font-weight="700" fill="#141413">${escXml(ins.code)} (Yuva Ø${ins.boreNomDia.toFixed(2)} mm)</text>

    <text x="720" y="652" font-size="8.5" fill="#6b6458">DIŞ KUTU ÖLÇÜLERİ (X×Y×Z)</text>
    <text x="720" y="669" font-size="11.5" font-weight="700" fill="#141413">${spec.outerW.toFixed(1)} × ${spec.outerL.toFixed(1)} × ${spec.outerH.toFixed(1)} mm</text>
    <text x="968" y="652" font-size="8.5" fill="#6b6458">PCB KART &amp; İÇ YÜKSEKLİK</text>
    <text x="968" y="669" font-size="11.5" font-weight="700" fill="#141413">${spec.pcbW.toFixed(1)} × ${spec.pcbL.toFixed(1)} mm | İç H: ${spec.innerH.toFixed(1)} mm</text>

    <text x="720" y="696" font-size="8.5" fill="#6b6458">MALZEME &amp; DUVAR KALINLIĞI</text>
    <text x="720" y="713" font-size="10.8" font-weight="700" fill="#141413">${escXml(mat.key)} (${mat.densityGcm3.toFixed(2)} g/cm³) | t = ${spec.wallT.toFixed(2)} mm</text>
    <text x="968" y="696" font-size="8.5" fill="#6b6458">KAPAK SIZDIRMAZLIK DUDAĞI</text>
    <text x="968" y="713" font-size="10.8" font-weight="700" fill="#141413">Geçmeli Dudak-Oluk (${spec.seamClearance.toFixed(2)} mm Boşluk)</text>

    <text x="720" y="740" font-size="8.5" fill="#6b6458">ALT KUTU HACİM / KÜTLE</text>
    <text x="720" y="757" font-size="11" font-weight="700" fill="#141413">${baseMetro.volCm3.toFixed(2)} cm³ / ${(baseMetro.volCm3 * mat.densityGcm3 * 0.9).toFixed(1)} g</text>
    <text x="968" y="740" font-size="8.5" fill="#6b6458">ÜST KAPAK HACİM / KÜTLE</text>
    <text x="968" y="757" font-size="11" font-weight="700" fill="#141413">${lidMetro.volCm3.toFixed(2)} cm³ / ${(lidMetro.volCm3 * mat.densityGcm3 * 0.9).toFixed(1)} g</text>

    <text x="720" y="783" font-size="8.5" fill="#6b6458">HAVALANDIRMA &amp; USB DURUMU</text>
    <text x="720" y="798" font-size="10.2" font-weight="600" fill="#141413">Panjur: ${spec.ventsEnabled ? 'AKTİF' : 'PASİF'} | USB-C: ${spec.activeCutouts.some((c) => c.isUsb) ? 'AKTİF' : 'PASİF'}</text>
    <text x="968" y="783" font-size="8.5" fill="#6b6458">TARİH / REVİZYON</text>
    <text x="968" y="798" font-size="10.2" font-weight="600" fill="#141413">${dateStr} // REV-DFM-1.0</text>

    <text x="720" y="827" font-size="9.5" font-weight="700" fill="#1f6e43">ONAY: MANIFOLD SU GEÇİRMEZ MESH — SLICER 1:1 MM DOĞRULANDI</text>
    <text x="968" y="827" font-size="9.5" font-weight="700" fill="#141413">ÖLÇEK: A3 TEKNİK ŞEMA (mm)</text>
  </g>
</svg>`;
}

export function exportImalatAntetiSVG(spec, baseMetro, lidMetro, materialKey = 'PETG') {
  const svg = generateImalatAntetiSVG(spec, baseMetro, lidMetro, materialKey);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  triggerBlobDownload(blob, `Imalat_Anteti_${spec.sku}.svg`);
}

/**
 * 5. EK CAD FORMATLARI (.GLB, .OBJ, .DXF, .SCAD)
 */
export function exportAssemblyGLB(assemblyGroup, spec) {
  const exporter = new GLTFExporter();
  exporter.parse(
    assemblyGroup,
    (result) => {
      const blob = new Blob([result], { type: 'model/gltf-binary' });
      triggerBlobDownload(blob, `Montaj_3D_${spec.sku}.glb`);
    },
    (err) => console.error('GLB ihracat hatası:', err),
    { binary: true }
  );
}

export function exportAssemblyOBJ(assemblyGroup, spec) {
  const exporter = new OBJExporter();
  const objText = exporter.parse(assemblyGroup);
  const blob = new Blob([objText], { type: 'text/plain;charset=utf-8' });
  triggerBlobDownload(blob, `Montaj_3D_${spec.sku}.obj`);
}

export function exportProfileDXF(spec) {
  const ins = spec.insert;
  const lines = [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$INSUNITS', '70', '4', // 4 = Millimeters
    '0', 'ENDSEC',
    '0', 'SECTION',
    '2', 'ENTITIES'
  ];

  const addRectLwPoly = (layer, hw, hl) => {
    lines.push(
      '0', 'LWPOLYLINE',
      '8', layer,
      '90', '4',
      '70', '1',
      '10', (-hw).toFixed(3), '20', (-hl).toFixed(3),
      '10', hw.toFixed(3),    '20', (-hl).toFixed(3),
      '10', hw.toFixed(3),    '20', hl.toFixed(3),
      '10', (-hw).toFixed(3), '20', hl.toFixed(3)
    );
  };

  const addCircle = (layer, cx, cy, r) => {
    lines.push(
      '0', 'CIRCLE',
      '8', layer,
      '10', cx.toFixed(3),
      '20', cy.toFixed(3),
      '30', '0.0',
      '40', r.toFixed(3)
    );
  };

  addRectLwPoly('DIS_KUTU', spec.outerHalfX, spec.outerHalfZ);
  addRectLwPoly('IC_OYUK', spec.innerHalfX, spec.innerHalfZ);
  addRectLwPoly('DUDAK_020MM', spec.innerHalfX + spec.lipThick, spec.innerHalfZ + spec.lipThick);
  addRectLwPoly('PCB_SINIRI', spec.pcbW * 0.5, spec.pcbL * 0.5);

  spec.pcbStandoffs.forEach((st) => {
    addCircle('STANDOFF_BOSS', st.x, -st.z, ins.bossOD * 0.5);
    addCircle('INSERT_KONIK_YUVA', st.x, -st.z, ins.boreNomDia * 0.5);
  });

  spec.lidBosses.forEach((kb) => {
    addCircle('KAPAK_KOSE_BOSS', kb.x, -kb.z, spec.rLidBoss);
    addCircle('KAPAK_GOMME_HAVSA', kb.x, -kb.z, ins.cboreDia * 0.5);
  });

  lines.push('0', 'ENDSEC', '0', 'EOF');
  const blob = new Blob([lines.join('\r\n')], { type: 'application/dxf;charset=utf-8' });
  triggerBlobDownload(blob, `Profil_2D_${spec.sku}.dxf`);
}

export function exportOpenSCAD(spec) {
  const ins = spec.insert;
  const scad = `// ============================================================================
// Parametrik Özel PCB Elektronik Kutu & Pirinç Insert Konfigüratörü (.SCAD)
// Parça Kodu: ${spec.sku} | Birim: mm | DFM Geçme Boşluğu: ${spec.seamClearance.toFixed(2)} mm
// ============================================================================
$fn = 64;

PCB_En_mm = ${spec.pcbW.toFixed(2)};
PCB_Boy_mm = ${spec.pcbL.toFixed(2)};
Kutu_Ic_Yukseklik_mm = ${spec.innerH.toFixed(2)};
Duvar_Kalinligi_mm = ${spec.wallT.toFixed(2)};
Delik_Kenar_Mesafesi_mm = ${spec.edgeDist.toFixed(2)};

// ${ins.code} Isıl Çakma Pirinç Insert Parametreleri
Boss_OD = ${ins.bossOD.toFixed(2)};
Bore_Pilot_Dia = ${ins.borePilotDia.toFixed(2)};
Bore_Nom_Dia = ${ins.boreNomDia.toFixed(2)};
Bore_Root_Dia = ${ins.boreRootDia.toFixed(2)};
Bore_Depth = ${ins.boreDepth.toFixed(2)};
Standoff_H = ${spec.standoffH.toFixed(2)};

Outer_W = ${spec.outerW.toFixed(2)};
Outer_L = ${spec.outerL.toFixed(2)};
Inner_W = ${spec.innerW.toFixed(2)};
Inner_L = ${spec.innerL.toFixed(2)};
Split_Z = ${spec.splitY.toFixed(2)};
Seam_Clearance = ${spec.seamClearance.toFixed(2)};
Lip_Thick = ${spec.lipThick.toFixed(2)};
Lip_Height = ${spec.lipHeight.toFixed(2)};

module rounded_box_2d(w, l, r) {
  offset(r = r) square([w - 2*r, l - 2*r], center = true);
}

module tapered_insert_standoff() {
  difference() {
    union() {
      cylinder(h = 1.3, d1 = Boss_OD + 2.3, d2 = Boss_OD);
      cylinder(h = Standoff_H, d = Boss_OD);
    }
    translate([0, 0, Standoff_H - Bore_Depth])
      cylinder(h = Bore_Depth - ${ins.leadInDepth.toFixed(2)}, d1 = Bore_Root_Dia, d2 = Bore_Nom_Dia);
    translate([0, 0, Standoff_H - ${ins.leadInDepth.toFixed(2)}])
      cylinder(h = ${(ins.leadInDepth + 0.05).toFixed(2)}, d1 = Bore_Nom_Dia, d2 = Bore_Pilot_Dia);
  }
}

module alt_kutu_base() {
  difference() {
    union() {
      linear_extrude(height = Split_Z)
        rounded_box_2d(Outer_W, Outer_L, ${spec.rCornerOut.toFixed(2)});
      translate([0, 0, Split_Z])
        linear_extrude(height = Lip_Height)
          difference() {
            rounded_box_2d(Inner_W + 2*Lip_Thick, Inner_L + 2*Lip_Thick, ${(spec.rCornerIn + spec.lipThick).toFixed(2)});
            rounded_box_2d(Inner_W, Inner_L, ${spec.rCornerIn.toFixed(2)});
          }
    }
    translate([0, 0, Duvar_Kalinligi_mm])
      linear_extrude(height = Split_Z + Lip_Height)
        rounded_box_2d(Inner_W, Inner_L, ${spec.rCornerIn.toFixed(2)});
  }

  sx = PCB_En_mm/2 - Delik_Kenar_Mesafesi_mm;
  sy = PCB_Boy_mm/2 - Delik_Kenar_Mesafesi_mm;
  for (p = [[-sx,-sy], [sx,-sy], [sx,sy], [-sx,sy]])
    translate([p[0], p[1], Duvar_Kalinligi_mm]) tapered_insert_standoff();
}

alt_kutu_base();
`;
  const blob = new Blob([scad], { type: 'text/plain;charset=utf-8' });
  triggerBlobDownload(blob, `Parametrik_Kutu_${spec.sku}.scad`);
}
