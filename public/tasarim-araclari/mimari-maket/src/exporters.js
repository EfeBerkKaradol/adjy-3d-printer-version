import * as THREE from 'three';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * 2D "Imalat_Anteti" Mimari Maket Montaj Paftası (.SVG),
 * B2B Mimari Maket Atölyesi Teklif & Metraj Tablosu (.CSV),
 * Kat Bazlı Z-Yukarı İkili (Binary) .STL ve Çoklu CAD (.OBJ, .GLB, .DXF, .SCAD) İhracatçıları
 */

export const STUDIO_MATERIALS = {
  PLA_ARCH_WHITE: {
    label: 'Mat Alçı Beyazı Mimari PLA',
    densityGcm3: 1.24,
    costPerKgTl: 720,
    nozzleTemp: '205°C / 60°C',
    isPolymer: true
  },
  PETG_TECH: {
    label: 'Yarı-Mat Teknik PETG',
    densityGcm3: 1.27,
    costPerKgTl: 790,
    nozzleTemp: '235°C / 75°C',
    isPolymer: true
  },
  ASA_MUSEUM: {
    label: 'UV Dayanımlı Müze Fildişi ASA',
    densityGcm3: 1.07,
    costPerKgTl: 980,
    nozzleTemp: '255°C / 95°C',
    isPolymer: true
  },
  ABS_PRO: {
    label: 'Endüstriyel Mat ABS',
    densityGcm3: 1.04,
    costPerKgTl: 760,
    nozzleTemp: '245°C / 95°C',
    isPolymer: true
  },
  AL_6061: {
    label: 'Alüminyum 6061 (CNC Referans)',
    densityGcm3: 2.70,
    costPerKgTl: 420,
    nozzleTemp: 'CNC Talaşlı',
    isPolymer: false
  },
  SS_304: {
    label: 'Paslanmaz Çelik 304 (Referans)',
    densityGcm3: 8.00,
    costPerKgTl: 380,
    nozzleTemp: 'Metal Referans',
    isPolymer: false
  },
  BRASS_C360: {
    label: 'Pirinç C360 (Sergi Maketi Ref.)',
    densityGcm3: 8.50,
    costPerKgTl: 690,
    nozzleTemp: 'CNC / Döküm Ref.',
    isPolymer: false
  }
};

export const STUDIO_FINISH_TIERS = {
  ETUT: {
    label: 'Konsept Etüt Maketi (Ham 0.20mm Baskı + Pim Kontrol)',
    flowMm3s: 11.5,
    machineRateTlHr: 135,
    laborPerTierTl: 55,
    studioMargin: 1.28
  },
  YARISMA: {
    label: 'Mimari Yarışma & Jüri Sunum (0.16mm + Tesviye + Mat Boya)',
    flowMm3s: 8.2,
    machineRateTlHr: 165,
    laborPerTierTl: 120,
    studioMargin: 1.38
  },
  MUZE_LANSMAN: {
    label: 'Satış Ofisi & Müze Sergi (0.12mm Hassas + Akrilik Cam + Astar)',
    flowMm3s: 5.8,
    machineRateTlHr: 195,
    laborPerTierTl: 230,
    studioMargin: 1.48
  }
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function fmt(n, d = 2) {
  return Number(n || 0).toFixed(d);
}

function fmtTr(n, d = 2) {
  return fmt(n, d).replace('.', ',');
}

function escXml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function triggerDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ============================================================================
 * 1. B2B MİMARİ STÜDYO TEKLİF & METRAJ HESAPLAYICI + .CSV İHRACATI
 * ============================================================================ */

export function computeB2BStudioQuote(assembly, materialKey = 'PLA_ARCH_WHITE', finishKey = 'YARISMA') {
  const mat = STUDIO_MATERIALS[materialKey] || STUDIO_MATERIALS.PLA_ARCH_WHITE;
  const fin = STUDIO_FINISH_TIERS[finishKey] || STUDIO_FINISH_TIERS.YARISMA;
  const { spec, tiers } = assembly;

  // 3 perimetre (3x0.4mm = 1.2mm) ince mimari kabuklarda efektif doluluk ~%76, bazada %45
  const wasteFactor = 1.06; // %6 purge/brim fire payı

  const tierMetrics = tiers.map((t) => {
    const fillFactor = mat.isPolymer ? (t.role === 'plinth' ? 0.46 : 0.78) : 1.0;
    const netMassG = t.metrology.volCm3 * mat.densityGcm3 * fillFactor;
    const grossMassG = netMassG * (mat.isPolymer ? wasteFactor : 1.0);
    const printHours = (t.metrology.volumeMm3 * fillFactor) / (fin.flowMm3s * 3600);
    const matCostTl = (grossMassG / 1000) * mat.costPerKgTl;
    const machCostTl = printHours * fin.machineRateTlHr;
    const laborTl = fin.laborPerTierTl * (t.role === 'plinth' ? 1.4 : 1.0);
    const unitB2BPriceTl = (matCostTl + machCostTl + laborTl) * fin.studioMargin;

    return {
      ...t,
      fillFactor,
      netMassG,
      grossMassG,
      printHours,
      matCostTl,
      machCostTl,
      laborTl,
      unitB2BPriceTl
    };
  });

  // B2B Özet Satırları (Gruplanmış Kalemler: Baza, Zemin, Tip Normal Katlar, Çatı, Montaj/Kalite)
  const plinthRow = tierMetrics.find((t) => t.role === 'plinth');
  const groundRow = tierMetrics.find((t) => t.role === 'ground');
  const typicalRows = tierMetrics.filter((t) => t.role === 'typical');
  const roofRow = tierMetrics.find((t) => t.role === 'roof');

  const quoteLines = [];

  if (plinthRow) {
    quoteLines.push({
      kalemKodu: 'MK-00',
      aciklama: 'Kademeli Vaziyet Bazası (3 Teraslı + 4× Erkek Köşe Pimi)',
      adet: 1,
      boyutMm: `${fmt(spec.bazaToplamEnMm, 1)} × ${fmt(spec.bazaToplamBoyMm, 1)} × ${fmt(spec.bazaToplamYukseklikMm, 1)} mm`,
      birimAgirlikG: plinthRow.grossMassG,
      toplamAgirlikG: plinthRow.grossMassG,
      toplamSureSaat: plinthRow.printHours,
      birimFiyatTl: plinthRow.unitB2BPriceTl,
      toplamTutarTl: plinthRow.unitB2BPriceTl,
      dfmNotu: `Pim Ø${fmt(spec.pimCapMm, 2)}mm · Taban Düz`
    });
  }

  if (groundRow) {
    quoteLines.push({
      kalemKodu: 'MK-01',
      aciklama: 'Zemin Kat — Giriş Lobisi & Saçaklı Ön Cephe Modülü',
      adet: 1,
      boyutMm: `${fmt(spec.enMm, 1)} × ${fmt(spec.boyMm, 1)} × ${fmt(spec.katYukseklikMm, 1)} mm`,
      birimAgirlikG: groundRow.grossMassG,
      toplamAgirlikG: groundRow.grossMassG,
      toplamSureSaat: groundRow.printHours,
      birimFiyatTl: groundRow.unitB2BPriceTl,
      toplamTutarTl: groundRow.unitB2BPriceTl,
      dfmNotu: `Cidar ${fmt(spec.duvarMm, 2)}mm · Yuva Ø${fmt(spec.yuvaCapMm, 2)}mm`
    });
  }

  if (typicalRows.length > 0) {
    const qty = typicalRows.length;
    const sumMassG = typicalRows.reduce((s, r) => s + r.grossMassG, 0);
    const sumHours = typicalRows.reduce((s, r) => s + r.printHours, 0);
    const sumPriceTl = typicalRows.reduce((s, r) => s + r.unitB2BPriceTl, 0);
    const spanX = spec.enMm;
    const spanZ = spec.boyMm + 2 * spec.balkonCikmaMm;
    quoteLines.push({
      kalemKodu: 'MK-02',
      aciklama: spec.isCustomModel
        ? `Özel Model Sökülebilir Ara Kat Modülleri (${qty} Kat Dilimi)`
        : `Sökülebilir Tip Normal Kat Modülleri (1..${qty}. Normal Katlar)`,
      adet: qty,
      boyutMm: `${fmt(spanX, 1)} × ${fmt(spanZ, 1)} × ${fmt(spec.katYukseklikMm, 1)} mm`,
      birimAgirlikG: sumMassG / qty,
      toplamAgirlikG: sumMassG,
      toplamSureSaat: sumHours,
      birimFiyatTl: sumPriceTl / qty,
      toplamTutarTl: sumPriceTl,
      dfmNotu: `±${fmt(spec.pimTolMm, 2)}mm Köşe Pim Boşluğu · ${spec.perimeterCount} Perimetre`
    });
  }

  if (roofRow) {
    quoteLines.push({
      kalemKodu: 'MK-03',
      aciklama: 'Sökülebilir Çatı Terası, Asansör Kulesi & DFM Parapet Kapağı',
      adet: 1,
      boyutMm: `${fmt(spec.enMm, 1)} × ${fmt(spec.boyMm, 1)} × ${fmt(spec.catiToplamYukseklikMm, 1)} mm`,
      birimAgirlikG: roofRow.grossMassG,
      toplamAgirlikG: roofRow.grossMassG,
      toplamSureSaat: roofRow.printHours,
      birimFiyatTl: roofRow.unitB2BPriceTl,
      toplamTutarTl: roofRow.unitB2BPriceTl,
      dfmNotu: `Parapet ${fmt(spec.parapetMm, 2)}mm (Min ≥${fmt(spec.minWallMm, 2)}mm)`
    });
  }

  // B2B Mühendislik Hazırlık, Dilimleme & Kalite Kontrol Paket Kalemi
  const cadPrepFeeTl = 480 + spec.katSayisi * 22;
  quoteLines.push({
    kalemKodu: 'B2B-DFM',
    aciklama: 'CAD Ölçekleme, DFM Nozul Doğrulama, Pim Kalibrasyon & Paketleme',
    adet: 1,
    boyutMm: `${spec.scaleLabel} Ölçek · ${tiers.length} Parça İstif Testi`,
    birimAgirlikG: 0,
    toplamAgirlikG: 0,
    toplamSureSaat: 0.75,
    birimFiyatTl: cadPrepFeeTl,
    toplamTutarTl: cadPrepFeeTl,
    dfmNotu: 'İmalat Anteti (.SVG) Dahil'
  });

  const totalGrossMassG = tierMetrics.reduce((s, r) => s + r.grossMassG, 0);
  const totalNetMassG = tierMetrics.reduce((s, r) => s + r.netMassG, 0);
  const totalPrintHours = tierMetrics.reduce((s, r) => s + r.printHours, 0);
  const subtotalTl = quoteLines.reduce((s, r) => s + r.toplamTutarTl, 0);
  const vatTl = subtotalTl * 0.20;
  const grandTotalTl = subtotalTl + vatTl;

  // Tüm referans malzemeler için hızlı kütle karşılaştırması (web-cad-modeler standardı)
  const totalSolidVolCm3 = assembly.totals.volCm3;
  const referenceMassesG = {
    PLA: totalSolidVolCm3 * 1.24,
    PETG: totalSolidVolCm3 * 1.27,
    ABS: totalSolidVolCm3 * 1.04,
    Al6061: totalSolidVolCm3 * 2.70,
    SS304: totalSolidVolCm3 * 8.00,
    Brass: totalSolidVolCm3 * 8.50
  };

  return {
    material: mat,
    materialKey,
    finish: fin,
    finishKey,
    tierMetrics,
    quoteLines,
    referenceMassesG,
    summary: {
      partCount: tiers.length,
      totalNetMassG,
      totalGrossMassG,
      totalPrintHours,
      subtotalTl,
      vatTl,
      grandTotalTl,
      leadTimeDays: Math.max(2, Math.ceil(totalPrintHours / 14) + 1)
    }
  };
}

export function exportB2BStudioQuoteCSV(quote, spec, filename) {
  const sep = ';';
  const today = new Date().toISOString().slice(0, 10);
  const outName = filename || `B2B_Mimari_Maket_Teklifi_1-${spec.scale}_${spec.katSayisi}Kat.csv`;

  const lines = [
    ['DOKUMAN_TIPI', '"B2B MIMARI OLCEKLI MAKET IMALAT VE METRAJ TEKLIFI"', 'TARIH', today, 'OLCEK', `"${spec.scaleLabel}"`].join(sep),
    [
      'GERCEK_BINA_OLCUSU',
      `"${fmtTr(spec.binaEnM, 1)}m x ${fmtTr(spec.binaBoyM, 1)}m (${spec.katSayisi} Kat, h=${fmtTr(spec.katYuksekligiM, 2)}m)"`,
      'MAKET_NET_OTURUM_MM',
      `"${fmtTr(spec.enMm, 1)} x ${fmtTr(spec.boyMm, 1)} mm (Baza: ${fmtTr(spec.bazaToplamEnMm, 1)} x ${fmtTr(spec.bazaToplamBoyMm, 1)} mm)"`,
      'DFM_MIN_DUVAR_MM',
      `"${fmtTr(spec.minWallMm, 2)} mm (${spec.perimeterCount}x 0.4mm Nozul)"`
    ].join(sep),
    [
      'MALZEME',
      `"${quote.material.label}"`,
      'SUNUM_SINIFI',
      `"${quote.finish.label}"`,
      'PIM_TOLERANSI_MM',
      `"Radyal +${fmtTr(spec.pimTolMm, 2)} mm (Pim Ø${fmtTr(spec.pimCapMm, 2)} / Yuva Ø${fmtTr(spec.yuvaCapMm, 2)} mm)"`
    ].join(sep),
    '',
    [
      'KALEM_KODU',
      'PARCA_VE_IMALAT_TANIMI',
      'ADET',
      'MAKET_BOYUTLARI_MM',
      'BIRIM_BRUT_AGIRLIK_G',
      'TOPLAM_AGIRLIK_G',
      'BASKI_VE_ISLEM_SAAT',
      'BIRIM_FIYAT_TL',
      'SATIR_TOPLAMI_TL',
      'DFM_KALITE_NOTU'
    ].join(sep)
  ];

  for (const row of quote.quoteLines) {
    lines.push(
      [
        row.kalemKodu,
        `"${row.aciklama.replace(/"/g, '""')}"`,
        row.adet,
        `"${row.boyutMm.replace(/"/g, '""')}"`,
        fmtTr(row.birimAgirlikG, 2),
        fmtTr(row.toplamAgirlikG, 2),
        fmtTr(row.toplamSureSaat, 2),
        fmtTr(row.birimFiyatTl, 2),
        fmtTr(row.toplamTutarTl, 2),
        `"${row.dfmNotu.replace(/"/g, '""')}"`
      ].join(sep)
    );
  }

  lines.push('');
  lines.push(['', '"KAT BAZLI DETAYLI STL PARCA LISTESI"', '', '', '', '', '', '', '', ''].join(sep));
  for (const tm of quote.tierMetrics) {
    lines.push(
      [
        tm.code,
        `"${tm.titleTr}"`,
        1,
        `"${fmtTr(tm.metrology.bboxMm.x, 1)} x ${fmtTr(tm.metrology.bboxMm.z, 1)} x ${fmtTr(tm.metrology.bboxMm.y, 1)} mm"`,
        fmtTr(tm.grossMassG, 2),
        fmtTr(tm.grossMassG, 2),
        fmtTr(tm.printHours, 2),
        fmtTr(tm.unitB2BPriceTl, 2),
        fmtTr(tm.unitB2BPriceTl, 2),
        `"STL: ${tm.stlFileName}"`
      ].join(sep)
    );
  }

  lines.push('');
  lines.push(['ARA_TOPLAM_KDV_HARIC_TL', '', quote.summary.partCount, '"Toplam Parca"', '', fmtTr(quote.summary.totalGrossMassG, 1), fmtTr(quote.summary.totalPrintHours, 2), '', fmtTr(quote.summary.subtotalTl, 2), `"Tahmini Teslim: ${quote.summary.leadTimeDays} Is Gunu"`].join(sep));
  lines.push(['KDV_YUZDE_20_TL', '', '', '', '', '', '', '', fmtTr(quote.summary.vatTl, 2), ''].join(sep));
  lines.push(['GENEL_TOPLAM_KDV_DAHIL_TL', '', '', '', '', '', '', '', fmtTr(quote.summary.grandTotalTl, 2), '"B2B Atolye Resmi Teklif Ozeti"'].join(sep));

  const utf8Bom = '\uFEFF';
  triggerDownloadBlob(new Blob([utf8Bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), outName);
}

/* ============================================================================
 * 2. 2B "Imalat_Anteti" MİMARİ MAKET MONTAJ PAFTASI (.SVG) ÜRETİCİ
 * ============================================================================ */

export function generateImalatAntetiSVG(assembly, quote) {
  const { spec, tiers } = assembly;
  const W = 1180;
  const H = 835;
  const today = new Date().toISOString().slice(0, 10);

  // ---- BÖLGE 1 (SOL ÜST): TİP KAT PLANI & PİM AKSLARI ----
  const planBox = { x: 42, y: 66, w: 530, h: 430 };
  const planCenterX = planBox.x + planBox.w * 0.5;
  const planCenterY = planBox.y + planBox.h * 0.52;

  const totalPlanSpanX = spec.bazaToplamEnMm;
  const totalPlanSpanZ = spec.bazaToplamBoyMm;
  const planScale = Math.min((planBox.w - 130) / totalPlanSpanX, (planBox.h - 125) / totalPlanSpanZ);

  const bW = spec.enMm * planScale;
  const bD = spec.boyMm * planScale;
  const bazaW = spec.bazaToplamEnMm * planScale;
  const bazaD = spec.bazaToplamBoyMm * planScale;
  const wallPx = Math.max(2.2, spec.duvarMm * planScale);
  const bossPx = Math.max(6, spec.bossBoyutMm * planScale);
  const balW = spec.balkonGenislikX * planScale;
  const balP = spec.balkonCikmaMm * planScale;

  const pinSvgItems = spec.pinCoords
    .map((pt, idx) => {
      const px = planCenterX + pt.x * planScale;
      const py = planCenterY + pt.z * planScale;
      const rPin = Math.max(2.6, (spec.pimCapMm * 0.5) * planScale);
      const rSoc = Math.max(rPin + 1.6, (spec.yuvaCapMm * 0.5) * planScale);
      const bx = px - bossPx * 0.5;
      const by = py - bossPx * 0.5;
      return `
        <rect x="${fmt(bx, 1)}" y="${fmt(by, 1)}" width="${fmt(bossPx, 1)}" height="${fmt(bossPx, 1)}" fill="#EAE4D7" stroke="#181816" stroke-width="1.1"/>
        <circle cx="${fmt(px, 1)}" cy="${fmt(py, 1)}" r="${fmt(rSoc, 1)}" fill="#FFFFFF" stroke="#1F5E5B" stroke-width="1.2" stroke-dasharray="2.5 1.5"/>
        <circle cx="${fmt(px, 1)}" cy="${fmt(py, 1)}" r="${fmt(rPin, 1)}" fill="#D9381E" fill-opacity="0.22" stroke="#D9381E" stroke-width="1.4"/>
        <line x1="${fmt(px - rSoc - 4, 1)}" y1="${fmt(py, 1)}" x2="${fmt(px + rSoc + 4, 1)}" y2="${fmt(py, 1)}" stroke="#D9381E" stroke-width="0.7"/>
        <line x1="${fmt(px, 1)}" y1="${fmt(py - rSoc - 4, 1)}" x2="${fmt(px, 1)}" y2="${fmt(py + rSoc + 4, 1)}" stroke="#D9381E" stroke-width="0.7"/>
        <text x="${fmt(px + (pt.x >= 0 ? 8 : -26), 1)}" y="${fmt(py + (pt.z >= 0 ? 14 : -7), 1)}" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700" fill="#D9381E">P${idx + 1}</text>
      `;
    })
    .join('');

  // Pencere boşluğu işaretleri (Ön & Arka cephe üzerinde)
  const winTicksSvg = spec.baysX.windows
    .map(([w0, w1]) => {
      const x0 = planCenterX + w0 * planScale;
      const ww = (w1 - w0) * planScale;
      return `
        <rect x="${fmt(x0, 1)}" y="${fmt(planCenterY - bD * 0.5 - 0.6, 1)}" width="${fmt(ww, 1)}" height="${fmt(wallPx + 1.2, 1)}" fill="#D9EEF3" stroke="#1F5E5B" stroke-width="0.8"/>
        <rect x="${fmt(x0, 1)}" y="${fmt(planCenterY + bD * 0.5 - wallPx - 0.6, 1)}" width="${fmt(ww, 1)}" height="${fmt(wallPx + 1.2, 1)}" fill="#D9EEF3" stroke="#1F5E5B" stroke-width="0.8"/>
      `;
    })
    .join('');

  const balconyPlanSvg =
    spec.balkonMod !== 'YOK' && balP > 0.5
      ? `
        <rect x="${fmt(planCenterX - balW * 0.5, 1)}" y="${fmt(planCenterY + bD * 0.5, 1)}" width="${fmt(balW, 1)}" height="${fmt(balP, 1)}" fill="#F4EFE4" stroke="#181816" stroke-width="1.1"/>
        <rect x="${fmt(planCenterX - balW * 0.5, 1)}" y="${fmt(planCenterY - bD * 0.5 - balP, 1)}" width="${fmt(balW, 1)}" height="${fmt(balP, 1)}" fill="#F4EFE4" stroke="#181816" stroke-width="1.1"/>
      `
      : '';

  // ---- BÖLGE 2 (SAĞ ÜST): PATLATILMIŞ KAT İSTİFLEME KESİTİ ----
  const secBox = { x: 590, y: 66, w: 548, h: 430 };
  const secCx = secBox.x + secBox.w * 0.48;

  // Çok katlı binalarda (örn. 25 kat) şemaya sığması için tüm katları ölçekli istifle
  const explodeDrawGapMm = Math.max(spec.pimYukseklikMm * 1.65, spec.katYukseklikMm * 0.42);
  const totalExplodedDrawHeightMm =
    spec.toplamMaketYukseklikMm + (tiers.length - 1) * explodeDrawGapMm;
  const secScaleX = (secBox.w - 190) / spec.bazaToplamEnMm;
  const secScaleY = (secBox.h - 86) / totalExplodedDrawHeightMm;
  const secScale = Math.min(secScaleX, secScaleY);

  const secBaseY = secBox.y + secBox.h - 32;
  let curDrawMmY = 0;
  const pinAxisLeftX = secCx - spec.pinOffsetX * secScale;
  const pinAxisRightX = secCx + spec.pinOffsetX * secScale;

  // Etiket çakışmasını önlemek için yüksek kat sayısında seçili katları etiketle
  const labelStride = spec.katSayisi > 14 ? 3 : spec.katSayisi > 8 ? 2 : 1;

  const sectionTiersSvg = tiers
    .map((tier, idx) => {
      const yBottomPx = secBaseY - curDrawMmY * secScale;
      const hPx = Math.max(4.2, tier.heightMm * secScale);
      const yTopPx = yBottomPx - hPx;
      curDrawMmY += tier.heightMm + explodeDrawGapMm;

      if (tier.role === 'plinth') {
        const sH = hPx / 3;
        const w1 = spec.bazaToplamEnMm * secScale;
        const w2 = (spec.bazaUstEnMm + 2 * spec.bazaAdimMarjMm) * secScale;
        const w3 = spec.bazaUstEnMm * secScale;
        const pH = Math.max(3, spec.pimYukseklikMm * secScale);
        const pW = Math.max(2.5, spec.pimCapMm * secScale);
        return `
          <rect x="${fmt(secCx - w1 * 0.5, 1)}" y="${fmt(yBottomPx - sH, 1)}" width="${fmt(w1, 1)}" height="${fmt(sH, 1)}" fill="#DCD5C7" stroke="#181816" stroke-width="1.1"/>
          <rect x="${fmt(secCx - w2 * 0.5, 1)}" y="${fmt(yBottomPx - 2 * sH, 1)}" width="${fmt(w2, 1)}" height="${fmt(sH, 1)}" fill="#E4DECF" stroke="#181816" stroke-width="1.1"/>
          <rect x="${fmt(secCx - w3 * 0.5, 1)}" y="${fmt(yTopPx, 1)}" width="${fmt(w3, 1)}" height="${fmt(sH, 1)}" fill="#ECE7DC" stroke="#181816" stroke-width="1.2"/>
          <rect x="${fmt(pinAxisLeftX - pW * 0.5, 1)}" y="${fmt(yTopPx - pH, 1)}" width="${fmt(pW, 1)}" height="${fmt(pH, 1)}" fill="#D9381E"/>
          <rect x="${fmt(pinAxisRightX - pW * 0.5, 1)}" y="${fmt(yTopPx - pH, 1)}" width="${fmt(pW, 1)}" height="${fmt(pH, 1)}" fill="#D9381E"/>
          <text x="${fmt(secCx + w1 * 0.5 + 10, 1)}" y="${fmt(yBottomPx - hPx * 0.35, 1)}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#181816">00 · BAZA (${fmt(tier.heightMm, 1)}mm)</text>
        `;
      }

      const fW = (tier.sliceWidthMm || spec.enMm) * secScale;
      const pH = Math.max(2.6, spec.pimYukseklikMm * secScale);
      const pW = Math.max(2.4, spec.pimCapMm * secScale);
      const showPins = tier.role !== 'roof' && (!tier.topPinCoords || tier.topPinCoords.length > 0);
      const pLeftX =
        tier.topPinCoords && tier.topPinCoords.length >= 2
          ? secCx + tier.topPinCoords[0].x * secScale
          : pinAxisLeftX;
      const pRightX =
        tier.topPinCoords && tier.topPinCoords.length >= 2
          ? secCx + tier.topPinCoords[1].x * secScale
          : pinAxisRightX;

      const showLabel =
        tier.role === 'ground' ||
        tier.role === 'roof' ||
        tier.floorNumber === spec.katSayisi ||
        tier.floorNumber % labelStride === 0;

      const fillCol = tier.role === 'roof' ? '#E5DFD2' : tier.role === 'ground' ? '#F5F2EB' : '#FFFFFF';
      return `
        <rect x="${fmt(secCx - fW * 0.5, 1)}" y="${fmt(yTopPx, 1)}" width="${fmt(fW, 1)}" height="${fmt(hPx, 1)}" fill="${fillCol}" stroke="#181816" stroke-width="1.1"/>
        ${
          showPins
            ? `<rect x="${fmt(pLeftX - pW * 0.5, 1)}" y="${fmt(yTopPx - pH, 1)}" width="${fmt(pW, 1)}" height="${fmt(pH, 1)}" fill="#D9381E"/>
               <rect x="${fmt(pRightX - pW * 0.5, 1)}" y="${fmt(yTopPx - pH, 1)}" width="${fmt(pW, 1)}" height="${fmt(pH, 1)}" fill="#D9381E"/>`
            : ''
        }
        ${
          showLabel
            ? `<line x1="${fmt(secCx + fW * 0.5 + 2, 1)}" y1="${fmt(yTopPx + hPx * 0.5, 1)}" x2="${fmt(secCx + fW * 0.5 + 14, 1)}" y2="${fmt(yTopPx + hPx * 0.5, 1)}" stroke="#181816" stroke-width="0.6"/>
               <text x="${fmt(secCx + fW * 0.5 + 17, 1)}" y="${fmt(yTopPx + hPx * 0.5 + 3, 1)}" font-family="JetBrains Mono, monospace" font-size="8" fill="#181816">${escXml(tier.code)}</text>`
            : ''
        }
      `;
    })
    .join('');

  // ---- BÖLGE 3 (SOL ALT): DETAY A (5:1 KÖŞE PİM & 0.20MM TOLERANS KESİTİ) + DFM DENETİM TABLOSU ----
  const detBox = { x: 42, y: 512, w: 530, h: 282 };
  const dCx = detBox.x + 142;
  const dCy = detBox.y + 168;
  const mag = 16; // Büyütülmüş şematik ölçek (px/mm)
  const dPinW = clamp(spec.pimCapMm * mag, 34, 66);
  const dGapPx = Math.max(4.5, spec.pimTolMm * mag * 2.2);
  const dSocW = dPinW + 2 * dGapPx;
  const dBossW = dSocW + 2 * Math.max(18, spec.minWallMm * mag);
  const dPinH = 48;
  const dSocH = 56;

  // ---- BÖLGE 4 (SAĞ ALT): RESMİ TÜRKÇE MİMARİ "İMALAT ANTETİ" ----
  const antetBox = { x: 590, y: 512, w: 548, h: 282 };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5DFD3" stroke-width="0.6"/>
    </pattern>
    <pattern id="hatch45" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#8C8577" stroke-width="0.9"/>
    </pattern>
  </defs>

  <!-- PAFTA ARKA PLAN VE DIŞ ÇERÇEVE (ISO A3 YATAY) -->
  <rect x="0" y="0" width="${W}" height="${H}" fill="#FAF8F3"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="url(#cadGrid)" stroke="#181816" stroke-width="2"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="#181816" stroke-width="0.8"/>

  <!-- ÜST BAŞLIK BANDI -->
  <rect x="24" y="24" width="${W - 48}" height="30" fill="#181816"/>
  <text x="38" y="43" font-family="Space Grotesk, sans-serif" font-size="12.5" font-weight="700" fill="#FAF8F3" letter-spacing="1.2">İMALAT ANTETİ — MİMARİ ÖLÇEKLİ MAKET KAT AYIRMA, DFM DUVAR &amp; KÖŞE PİM MONTAJ PAFTASI</text>
  <text x="${W - 38}" y="43" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="11" font-weight="600" fill="#F2B8A2">ÖLÇEK ${spec.scaleLabel} · BİRİM: MM · DFM ≥${fmt(spec.minWallMm, 2)}MM</text>

  <!-- ==================== BÖLGE 1: TİP KAT PLANI ==================== -->
  <rect x="${planBox.x}" y="${planBox.y}" width="${planBox.w}" height="${planBox.h}" fill="#FFFFFF" fill-opacity="0.82" stroke="#181816" stroke-width="1"/>
  <text x="${planBox.x + 12}" y="${planBox.y + 20}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#181816">[ 01 / ÖLÇEKLİ KAT PLANI &amp; KÖŞE HİZALAMA PİM AKSLARI ]</text>

  <!-- Kademeli Baza İzdüşümü -->
  <rect x="${fmt(planCenterX - bazaW * 0.5, 1)}" y="${fmt(planCenterY - bazaD * 0.5, 1)}" width="${fmt(bazaW, 1)}" height="${fmt(bazaD, 1)}" fill="#F3EFE6" stroke="#9C9588" stroke-width="1" stroke-dasharray="5 3"/>

  <!-- Balkon Konsolları -->
  ${balconyPlanSvg}

  <!-- Dış Bina Kabuğu ve İç Boşluk (DFM Kelepçeli Duvar Cidarlı) -->
  ${
    spec.isCustomModel && spec.customContour2D && spec.customContour2D.length >= 3
      ? `<polygon points="${spec.customContour2D.map((p) => `${fmt(planCenterX + p.x * planScale, 1)},${fmt(planCenterY + p.z * planScale, 1)}`).join(' ')}" fill="url(#hatch45)" stroke="#181816" stroke-width="1.6"/>
         <polygon points="${spec.customContour2D.map((p) => {
           const len = Math.hypot(p.x, p.z) || 1;
           const s = Math.max(0.2, (len - spec.duvarMm) / len);
           return `${fmt(planCenterX + p.x * s * planScale, 1)},${fmt(planCenterY + p.z * s * planScale, 1)}`;
         }).join(' ')}" fill="#FFFFFF" stroke="#181816" stroke-width="1"/>`
      : `<rect x="${fmt(planCenterX - bW * 0.5, 1)}" y="${fmt(planCenterY - bD * 0.5, 1)}" width="${fmt(bW, 1)}" height="${fmt(bD, 1)}" fill="url(#hatch45)" stroke="#181816" stroke-width="1.6"/>
         <rect x="${fmt(planCenterX - bW * 0.5 + wallPx, 1)}" y="${fmt(planCenterY - bD * 0.5 + wallPx, 1)}" width="${fmt(Math.max(4, bW - 2 * wallPx), 1)}" height="${fmt(Math.max(4, bD - 2 * wallPx), 1)}" fill="#FFFFFF" stroke="#181816" stroke-width="1"/>`
  }

  <!-- Pencere Boşlukları & 4 Köşe Pim Kolonu -->
  ${winTicksSvg}
  ${pinSvgItems}

  <!-- Plan Ölçü Çizgileri -->
  <line x1="${fmt(planCenterX - bW * 0.5, 1)}" y1="${fmt(planCenterY - bD * 0.5 - balP - 18, 1)}" x2="${fmt(planCenterX + bW * 0.5, 1)}" y2="${fmt(planCenterY - bD * 0.5 - balP - 18, 1)}" stroke="#181816" stroke-width="1"/>
  <text x="${fmt(planCenterX, 1)}" y="${fmt(planCenterY - bD * 0.5 - balP - 23, 1)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#181816">EN: ${fmt(spec.enMm, 1)} mm (Gerçek: ${fmt(spec.binaEnM, 1)} m)</text>

  <line x1="${fmt(planCenterX - bW * 0.5 - 20, 1)}" y1="${fmt(planCenterY - bD * 0.5, 1)}" x2="${fmt(planCenterX - bW * 0.5 - 20, 1)}" y2="${fmt(planCenterY + bD * 0.5, 1)}" stroke="#181816" stroke-width="1"/>
  <text x="${fmt(planCenterX - bW * 0.5 - 26, 1)}" y="${fmt(planCenterY, 1)}" text-anchor="middle" transform="rotate(-90 ${fmt(planCenterX - bW * 0.5 - 26, 1)} ${fmt(planCenterY, 1)})" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#181816">BOY: ${fmt(spec.boyMm, 1)} mm (${fmt(spec.binaBoyM, 1)} m)</text>

  <text x="${fmt(planCenterX, 1)}" y="${fmt(planBox.y + planBox.h - 12, 1)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="#1F5E5B">▼ ÖN CEPHE (GÜNEY +Z · YÖNLENDİRME ÇENTİKLİ BAZA) · PİM AKSI X=±${fmt(spec.pinOffsetX, 1)} / Z=±${fmt(spec.pinOffsetZ, 1)} mm</text>

  <!-- ==================== BÖLGE 2: PATLATILMIŞ İSTİFLEME KESİTİ ==================== -->
  <rect x="${secBox.x}" y="${secBox.y}" width="${secBox.w}" height="${secBox.h}" fill="#FFFFFF" fill-opacity="0.82" stroke="#181816" stroke-width="1"/>
  <text x="${secBox.x + 12}" y="${secBox.y + 20}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#181816">[ 02 / PATLATILMIŞ KAT İSTİFLEME &amp; SÖKÜLEBİLİR İNCELEME ŞEMASI ]</text>

  <!-- Düşey Köşe Pim Hizalama Aksları -->
  <line x1="${fmt(pinAxisLeftX, 1)}" y1="${secBox.y + 34}" x2="${fmt(pinAxisLeftX, 1)}" y2="${secBaseY}" stroke="#D9381E" stroke-width="0.9" stroke-dasharray="4 3"/>
  <line x1="${fmt(pinAxisRightX, 1)}" y1="${secBox.y + 34}" x2="${fmt(pinAxisRightX, 1)}" y2="${secBaseY}" stroke="#D9381E" stroke-width="0.9" stroke-dasharray="4 3"/>

  ${sectionTiersSvg}

  <text x="${secBox.x + 14}" y="${secBox.y + secBox.h - 10}" font-family="JetBrains Mono, monospace" font-size="8.8" fill="#47453F">Toplam İstifli Maket Yüksekliği: ${fmt(spec.toplamMaketYukseklikMm, 1)} mm (${tiers.length} Bağımsız Baskı Modülü)</text>

  <!-- ==================== BÖLGE 3: DETAY A (5:1 PİM TOLERANS KESİTİ) ==================== -->
  <rect x="${detBox.x}" y="${detBox.y}" width="${detBox.w}" height="${detBox.h}" fill="#FFFFFF" fill-opacity="0.9" stroke="#181816" stroke-width="1"/>
  <text x="${detBox.x + 12}" y="${detBox.y + 20}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#181816">[ 03 / DETAY A (5:1) — KÖŞE PİM &amp; DFM NOZUL CİDAR KESİTİ ]</text>

  <!-- Alt Kat Kolonu + Erkek Pim -->
  <rect x="${fmt(dCx - dBossW * 0.5, 1)}" y="${fmt(dCy + 14, 1)}" width="${fmt(dBossW, 1)}" height="58" fill="#EAE4D7" stroke="#181816" stroke-width="1.3"/>
  <rect x="${fmt(dCx - dPinW * 0.5, 1)}" y="${fmt(dCy + 14 - dPinH, 1)}" width="${fmt(dPinW, 1)}" height="${fmt(dPinH, 1)}" fill="#F6C8BC" stroke="#D9381E" stroke-width="1.5"/>

  <!-- Üst Kat Kolonu + Dişi Yuva (0.20mm Radyal Boşluk Gösterimi) -->
  <path d="M ${fmt(dCx - dBossW * 0.5, 1)} ${fmt(dCy + 6, 1)}
           L ${fmt(dCx - dBossW * 0.5, 1)} ${fmt(dCy - 78, 1)}
           L ${fmt(dCx + dBossW * 0.5, 1)} ${fmt(dCy - 78, 1)}
           L ${fmt(dCx + dBossW * 0.5, 1)} ${fmt(dCy + 6, 1)}
           L ${fmt(dCx + dSocW * 0.5, 1)} ${fmt(dCy + 6, 1)}
           L ${fmt(dCx + dSocW * 0.5, 1)} ${fmt(dCy + 6 - dSocH, 1)}
           L ${fmt(dCx - dSocW * 0.5, 1)} ${fmt(dCy + 6 - dSocH, 1)}
           L ${fmt(dCx - dSocW * 0.5, 1)} ${fmt(dCy + 6, 1)} Z"
        fill="url(#hatch45)" stroke="#181816" stroke-width="1.3"/>

  <text x="${fmt(dCx, 1)}" y="${fmt(dCy - 2, 1)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700" fill="#D9381E">Ø${fmt(spec.pimCapMm, 2)} PİM</text>
  <text x="${fmt(dCx, 1)}" y="${fmt(dCy - 60, 1)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="8" fill="#1F5E5B">Ø${fmt(spec.yuvaCapMm, 2)} YUVA</text>
  <text x="${fmt(dCx, 1)}" y="${fmt(detBox.y + detBox.h - 14, 1)}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="8.5" font-weight="700" fill="#181816">RADYAL BOŞLUK: +${fmt(spec.pimTolMm, 2)} mm (Her Yönde)</text>

  <!-- Sağ Yarı: DFM Cidar Kelepçeleme Özeti -->
  <line x1="${detBox.x + 275}" y1="${detBox.y + 32}" x2="${detBox.x + 275}" y2="${detBox.y + detBox.h - 12}" stroke="#D2CBBF" stroke-width="1"/>
  <text x="${detBox.x + 290}" y="${detBox.y + 46}" font-family="Space Grotesk, sans-serif" font-size="11" font-weight="700" fill="#181816">0.4MM NOZUL DFM KONTROL TABLOSU</text>

  <text x="${detBox.x + 290}" y="${detBox.y + 72}" font-family="JetBrains Mono, monospace" font-size="9" fill="#3A3833">• Dış Duvar (0.30m): ${fmt(spec.hamDuvarMm, 2)}mm → <tspan font-weight="700" fill="#1F5E5B">${fmt(spec.duvarMm, 2)} mm</tspan></text>
  <text x="${detBox.x + 290}" y="${detBox.y + 94}" font-family="JetBrains Mono, monospace" font-size="9" fill="#3A3833">• Çatı Parapeti (0.20m): ${fmt(spec.hamParapetMm, 2)}mm → <tspan font-weight="700" fill="#1F5E5B">${fmt(spec.parapetMm, 2)} mm</tspan></text>
  <text x="${detBox.x + 290}" y="${detBox.y + 116}" font-family="JetBrains Mono, monospace" font-size="9" fill="#3A3833">• Kat Döşemesi (0.30m): ${fmt(spec.hamDosemeMm, 2)}mm → <tspan font-weight="700" fill="#1F5E5B">${fmt(spec.dosemeMm, 2)} mm</tspan></text>
  <text x="${detBox.x + 290}" y="${detBox.y + 138}" font-family="JetBrains Mono, monospace" font-size="9" fill="#3A3833">• Pencere Dikmesi Min: <tspan font-weight="700" fill="#1F5E5B">≥ ${fmt(spec.minWallMm, 2)} mm</tspan> (${spec.baysX.bayCount}×${spec.baysZ.bayCount} Aks)</text>
  <text x="${detBox.x + 290}" y="${detBox.y + 160}" font-family="JetBrains Mono, monospace" font-size="9" fill="#3A3833">• Nozul Çevre Turu: <tspan font-weight="700" fill="#D9381E">${spec.perimeterCount} Perimetre (0.40mm)</tspan></text>
  <text x="${detBox.x + 290}" y="${detBox.y + 182}" font-family="JetBrains Mono, monospace" font-size="9" fill="#3A3833">• Pim Eksenel Z-Payı: +${fmt(spec.yuvaZBoslukMm, 2)} mm (Tam Öpüşme)</text>
  <text x="${detBox.x + 290}" y="${detBox.y + 204}" font-family="JetBrains Mono, monospace" font-size="9" fill="#3A3833">• Desteksiz Baskı: TÜM KATLAR Z=0 DÜZ TABAN</text>

  <rect x="${detBox.x + 290}" y="${detBox.y + 224}" width="224" height="36" rx="2" fill="#1F5E5B" fill-opacity="0.1" stroke="#1F5E5B" stroke-width="1"/>
  <text x="${detBox.x + 402}" y="${detBox.y + 246}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="#1F5E5B">✓ PERİMETRE ATLAMA RİSKİ: 0 (DFM ONAYLI)</text>

  <!-- ==================== BÖLGE 4: TS EN ISO 7200 TÜRKÇE İMALAT ANTETİ ==================== -->
  <rect x="${antetBox.x}" y="${antetBox.y}" width="${antetBox.w}" height="${antetBox.h}" fill="#FFFFFF" stroke="#181816" stroke-width="1.6"/>
  <rect x="${antetBox.x}" y="${antetBox.y}" width="${antetBox.w}" height="34" fill="#181816"/>
  <text x="${antetBox.x + 14}" y="${antetBox.y + 22}" font-family="Space Grotesk, sans-serif" font-size="12" font-weight="700" fill="#FAF8F3" letter-spacing="1">İMALAT ANTETİ · MİMARİ MAKET ÜRETİM &amp; MONTAJ KARTI</text>
  <text x="${antetBox.x + antetBox.w - 14}" y="${antetBox.y + 22}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" fill="#F2B8A2">PAFTA NO: MM-${spec.scale}-${spec.katSayisi}K</text>

  <!-- Antet Hücre Çizgileri -->
  <line x1="${antetBox.x}" y1="${antetBox.y + 84}" x2="${antetBox.x + antetBox.w}" y2="${antetBox.y + 84}" stroke="#181816" stroke-width="0.9"/>
  <line x1="${antetBox.x}" y1="${antetBox.y + 134}" x2="${antetBox.x + antetBox.w}" y2="${antetBox.y + 134}" stroke="#181816" stroke-width="0.9"/>
  <line x1="${antetBox.x}" y1="${antetBox.y + 184}" x2="${antetBox.x + antetBox.w}" y2="${antetBox.y + 184}" stroke="#181816" stroke-width="0.9"/>
  <line x1="${antetBox.x}" y1="${antetBox.y + 234}" x2="${antetBox.x + antetBox.w}" y2="${antetBox.y + 234}" stroke="#181816" stroke-width="0.9"/>
  <line x1="${antetBox.x + 274}" y1="${antetBox.y + 34}" x2="${antetBox.x + 274}" y2="${antetBox.y + antetBox.h}" stroke="#181816" stroke-width="0.9"/>

  <text x="${antetBox.x + 12}" y="${antetBox.y + 52}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">GERÇEK BİNA KÜTLESİ</text>
  <text x="${antetBox.x + 12}" y="${antetBox.y + 72}" font-family="Space Grotesk, sans-serif" font-size="13" font-weight="700" fill="#181816">${fmt(spec.binaEnM, 1)}m × ${fmt(spec.binaBoyM, 1)}m · ${spec.katSayisi} Kat (h=${fmt(spec.katYuksekligiM, 2)}m)</text>

  <text x="${antetBox.x + 286}" y="${antetBox.y + 52}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">MAKET ÖLÇEĞİ &amp; NET OTURUM</text>
  <text x="${antetBox.x + 286}" y="${antetBox.y + 72}" font-family="Space Grotesk, sans-serif" font-size="13" font-weight="700" fill="#D9381E">${spec.scaleLabel} · ${fmt(spec.enMm, 1)} × ${fmt(spec.boyMm, 1)} × ${fmt(spec.toplamMaketYukseklikMm, 1)} mm</text>

  <text x="${antetBox.x + 12}" y="${antetBox.y + 102}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">MİN. BASILIR DUVAR / BALKON</text>
  <text x="${antetBox.x + 12}" y="${antetBox.y + 122}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#181816">Min_Basilir_Duvar: ${fmt(spec.minWallMm, 2)} mm · Balkon: ${fmt(spec.balkonCikmaM, 1)}m (${fmt(spec.balkonCikmaMm, 1)}mm)</text>

  <text x="${antetBox.x + 286}" y="${antetBox.y + 102}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">KÖŞE İSTİFLEME PİM SİSTEMİ</text>
  <text x="${antetBox.x + 286}" y="${antetBox.y + 122}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#181816">Ø${fmt(spec.pimCapMm, 2)} / Ø${fmt(spec.yuvaCapMm, 2)} mm (Tol: +${fmt(spec.pimTolMm, 2)} mm)</text>

  <text x="${antetBox.x + 12}" y="${antetBox.y + 152}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">MALZEME &amp; TOPLAM FİLAMENT</text>
  <text x="${antetBox.x + 12}" y="${antetBox.y + 172}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#181816">${escXml(quote.material.label.slice(0, 24))} · ${fmt(quote.summary.totalGrossMassG, 1)} g</text>

  <text x="${antetBox.x + 286}" y="${antetBox.y + 152}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">PARÇA ADEDİ &amp; BASKI SÜRESİ</text>
  <text x="${antetBox.x + 286}" y="${antetBox.y + 172}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#181816">${tiers.length} Modül (1 Baza + ${spec.katSayisi} Kat + 1 Çatı) · ${fmt(quote.summary.totalPrintHours, 1)} sa</text>

  <text x="${antetBox.x + 12}" y="${antetBox.y + 202}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">CEPHE PENCERE ORANI &amp; BAZA</text>
  <text x="${antetBox.x + 12}" y="${antetBox.y + 222}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="700" fill="#181816">%${spec.pencereYuzde} Boşluk · Baza: ${fmt(spec.bazaToplamEnMm, 1)}×${fmt(spec.bazaToplamBoyMm, 1)} mm</text>

  <text x="${antetBox.x + 286}" y="${antetBox.y + 202}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">B2B ATÖLYE TEKLİF ÖZETİ (KDV HARİÇ)</text>
  <text x="${antetBox.x + 286}" y="${antetBox.y + 222}" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="#1F5E5B">${fmt(quote.summary.subtotalTl, 2)} TL (+KDV: ${fmt(quote.summary.grandTotalTl, 2)} TL)</text>

  <text x="${antetBox.x + 12}" y="${antetBox.y + 252}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">TARİH / STANDART</text>
  <text x="${antetBox.x + 12}" y="${antetBox.y + 270}" font-family="JetBrains Mono, monospace" font-size="10.5" font-weight="700" fill="#181816">${today} · TS EN ISO 7200 / 1B=1MM</text>

  <text x="${antetBox.x + 286}" y="${antetBox.y + 252}" font-family="JetBrains Mono, monospace" font-size="8.5" fill="#6E6A61">ONAY &amp; TABLA DURUMU</text>
  <text x="${antetBox.x + 286}" y="${antetBox.y + 270}" font-family="JetBrains Mono, monospace" font-size="9.5" font-weight="700" fill="${spec.bedStatus.ok ? '#1F5E5B' : '#D9381E'}">${escXml(spec.bedStatus.label.slice(0, 34))}</text>
</svg>`;
}

export function exportImalatAntetiSVG(svgMarkup, spec) {
  const filename = `Imalat_Anteti_1-${spec.scale}_${spec.katSayisi}Kat.svg`;
  triggerDownloadBlob(new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

/* ============================================================================
 * 3. Z-YUKARI İKİLİ (BINARY) .STL VE ÇOKLU CAD FORMAT İHRACATÇILARI
 * ============================================================================ */

/**
 * Three.js Y-yukarı geometriyi Z-yukarı (dilimleyici tablasına Z=0 düz oturan)
 * IEEE-754 ikili (Binary) .STL dosyasına dönüştürür.
 */
export function geometryToZUpBinarySTLBuffer(geometry) {
  const cloned = geometry.index ? geometry.toNonIndexed().clone() : geometry.clone();
  cloned.rotateX(Math.PI / 2); // (x, y, z) -> (x, -z, +y): y=0 alt yüzey Z=0 baskı tablasına tam oturur

  const pos = cloned.attributes.position;
  const triCount = Math.floor(pos.count / 3);
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);

  // 80 bayt ASCII başlık
  const headerStr = 'MIMARI_MAKET_CAD_MM_Z_UP_DFM_1_2MM';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 32);
  }
  view.setUint32(80, triCount, true);

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const norm = new THREE.Vector3();

  let offset = 84;
  for (let i = 0; i < pos.count; i += 3) {
    vA.fromBufferAttribute(pos, i);
    vB.fromBufferAttribute(pos, i + 1);
    vC.fromBufferAttribute(pos, i + 2);

    ab.subVectors(vB, vA);
    ac.subVectors(vC, vA);
    norm.crossVectors(ab, ac).normalize();

    view.setFloat32(offset, norm.x, true);
    view.setFloat32(offset + 4, norm.y, true);
    view.setFloat32(offset + 8, norm.z, true);

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

  cloned.dispose();
  return buffer;
}

export function exportSingleTierSTL(tier) {
  const buf = geometryToZUpBinarySTLBuffer(tier.geometry);
  triggerDownloadBlob(new Blob([buf], { type: 'application/octet-stream' }), tier.stlFileName);
}

/**
 * Tüm katları tarayıcı indirme engelleyicisine takılmadan sırayla ayrı .STL dosyaları olarak indirir.
 */
export function exportAllTiersSequentialSTL(assembly, onProgress) {
  const { tiers } = assembly;
  tiers.forEach((tier, idx) => {
    setTimeout(() => {
      exportSingleTierSTL(tier);
      if (onProgress) onProgress(idx + 1, tiers.length, tier);
    }, idx * 260);
  });
}

/**
 * Tüm katları Z=0 baskı düzleminde yan yana dizilmiş veya istiflenmiş tek .STL olarak indirir.
 */
export function exportFullAssemblySTL(assembly, mode = 'stacked') {
  const { spec, tiers } = assembly;
  const parts = [];
  const cols = Math.ceil(Math.sqrt(tiers.length));
  const cellX = spec.bazaToplamEnMm + 12;
  const cellZ = spec.bazaToplamBoyMm + 12;

  tiers.forEach((tier, idx) => {
    const g = tier.geometry.clone();
    if (mode === 'plate') {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      g.translate((col - (cols - 1) * 0.5) * cellX, 0, (row - Math.floor(tiers.length / cols) * 0.5) * cellZ);
    } else {
      g.translate(0, tier.assembledY, 0);
    }
    parts.push(g);
  });

  const merged = BufferGeometryUtils.mergeGeometries(parts, false);
  const buf = geometryToZUpBinarySTLBuffer(merged);
  parts.forEach((p) => p.dispose());
  merged.dispose();

  const suffix = mode === 'plate' ? 'Tabla_Dizilimi' : 'Tam_Istif';
  triggerDownloadBlob(
    new Blob([buf], { type: 'application/octet-stream' }),
    `Mimari_Maket_${suffix}_1-${spec.scale}_${spec.katSayisi}Kat.stl`
  );
}

export function exportAssemblyOBJ(sceneGroup, spec) {
  const exporter = new OBJExporter();
  const text = exporter.parse(sceneGroup);
  triggerDownloadBlob(
    new Blob([text], { type: 'text/plain;charset=utf-8' }),
    `Mimari_Maket_1-${spec.scale}_${spec.katSayisi}Kat.obj`
  );
}

export function exportAssemblyGLB(sceneGroup, spec) {
  const exporter = new GLTFExporter();
  exporter.parse(
    sceneGroup,
    (result) => {
      if (result instanceof ArrayBuffer) {
        triggerDownloadBlob(
          new Blob([result], { type: 'model/gltf-binary' }),
          `Mimari_Maket_1-${spec.scale}_${spec.katSayisi}Kat.glb`
        );
      }
    },
    (err) => console.error('GLB ihracat hatasi:', err),
    { binary: true }
  );
}

/**
 * AutoCAD R12/2000 uyumlu 2B Kat Planı + Köşe Pim Koordinatları .DXF İhracatı (mm)
 */
export function exportFloorPlanDXF(spec) {
  const lines = ['0', 'SECTION', '2', 'ENTITIES'];

  function addRect(cx, cy, w, h, layer) {
    const x0 = cx - w * 0.5;
    const x1 = cx + w * 0.5;
    const y0 = cy - h * 0.5;
    const y1 = cy + h * 0.5;
    const pts = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
      [x0, y0]
    ];
    for (let i = 0; i < 4; i++) {
      lines.push(
        '0',
        'LINE',
        '8',
        layer,
        '10',
        fmt(pts[i][0], 3),
        '20',
        fmt(pts[i][1], 3),
        '30',
        '0.0',
        '11',
        fmt(pts[i + 1][0], 3),
        '21',
        fmt(pts[i + 1][1], 3),
        '31',
        '0.0'
      );
    }
  }

  function addCircle(cx, cy, r, layer) {
    lines.push('0', 'CIRCLE', '8', layer, '10', fmt(cx, 3), '20', fmt(cy, 3), '30', '0.0', '40', fmt(r, 3));
  }

  addRect(0, 0, spec.bazaToplamEnMm, spec.bazaToplamBoyMm, 'VAZIYET_BAZASI');
  if (spec.isCustomModel && spec.customContour2D && spec.customContour2D.length >= 3) {
    const c = spec.customContour2D;
    for (let i = 0; i < c.length; i++) {
      const a = c[i];
      const b = c[(i + 1) % c.length];
      lines.push(
        '0', 'LINE', '8', 'DIS_CEPHE_KABUGU',
        '10', fmt(a.x, 3), '20', fmt(a.z, 3), '30', '0.0',
        '11', fmt(b.x, 3), '21', fmt(b.z, 3), '31', '0.0'
      );
    }
  } else {
    addRect(0, 0, spec.enMm, spec.boyMm, 'DIS_CEPHE_KABUGU');
    addRect(0, 0, spec.enMm - 2 * spec.duvarMm, spec.boyMm - 2 * spec.duvarMm, 'DFM_IC_DUVAR');
  }

  if (spec.balkonCikmaMm > 0) {
    addRect(0, +(spec.boyMm * 0.5 + spec.balkonCikmaMm * 0.5), spec.balkonGenislikX, spec.balkonCikmaMm, 'BALKON_CIKMA');
    addRect(0, -(spec.boyMm * 0.5 + spec.balkonCikmaMm * 0.5), spec.balkonGenislikX, spec.balkonCikmaMm, 'BALKON_CIKMA');
  }

  for (const pt of spec.pinCoords) {
    addRect(pt.x, pt.z, spec.bossBoyutMm, spec.bossBoyutMm, 'KOSE_PIM_KOLONU');
    addCircle(pt.x, pt.z, spec.pimCapMm * 0.5, 'ERKEK_PIM');
    addCircle(pt.x, pt.z, spec.yuvaCapMm * 0.5, 'DISI_YUVA_TOLERANS');
  }

  lines.push('0', 'ENDSEC', '0', 'EOF');
  triggerDownloadBlob(
    new Blob([lines.join('\r\n')], { type: 'application/dxf;charset=utf-8' }),
    `Mimari_Kat_Plani_1-${spec.scale}.dxf`
  );
}

/**
 * Mevcut parametrelere birebir bağlı OpenSCAD (.scad) parametrik kaynak kodu ihracatı
 */
export function exportParametricSCAD(spec) {
  const scad = `// Mimari Ölçekli Maket Kat Ayırıcı & DFM Duvar Kelepçeli OpenSCAD Betiği
// Ölçek: ${spec.scaleLabel} | Birim: mm | 0.4mm Nozul DFM Korumalı
$fn = 48;

Bina_En_m = ${spec.binaEnM};
Bina_Boy_m = ${spec.binaBoyM};
Kat_Sayisi = ${spec.katSayisi};
Kat_Yuksekligi_m = ${spec.katYuksekligiM};
Balkon_Cikma_m = ${spec.balkonCikmaM};
Maket_Olcegi = ${spec.scale};
Min_Basilir_Duvar_mm = ${spec.minWallMm};
Kat_Pim_Toleransi_mm = ${spec.pimTolMm};

en_mm = Bina_En_m * 1000 / Maket_Olcegi;
boy_mm = Bina_Boy_m * 1000 / Maket_Olcegi;
kat_h = max(Kat_Yuksekligi_m * 1000 / Maket_Olcegi, Min_Basilir_Duvar_mm * 3.8);
duvar_mm = max(300 / Maket_Olcegi, Min_Basilir_Duvar_mm);
doseme_mm = max(300 / Maket_Olcegi, Min_Basilir_Duvar_mm);
pim_cap = ${fmt(spec.pimCapMm, 2)};
yuva_cap = pim_cap + 2 * Kat_Pim_Toleransi_mm;
boss_w = ${fmt(spec.bossBoyutMm, 2)};
pim_h = ${fmt(spec.pimYukseklikMm, 2)};
yuva_h = ${fmt(spec.yuvaDerinlikMm, 2)};

module kose_koordinatlari() {
  ox = en_mm / 2 - boss_w / 2;
  oy = boy_mm / 2 - boss_w / 2;
  for (sx = [-1, 1], sy = [-1, 1])
    translate([sx * ox, sy * oy, 0]) children();
}

module tip_kat_modulu() {
  difference() {
    union() {
      // Dış kabuk + döşeme
      difference() {
        cube([en_mm, boy_mm, kat_h], center = true);
        translate([0, 0, doseme_mm])
          cube([en_mm - 2 * duvar_mm, boy_mm - 2 * duvar_mm, kat_h], center = true);
      }
      // 4 Köşe hizalama kolonu ve üst erkek pimler
      translate([0, 0, -kat_h / 2]) kose_koordinatlari() {
        translate([-boss_w / 2, -boss_w / 2, 0]) cube([boss_w, boss_w, kat_h]);
        translate([0, 0, kat_h]) cylinder(d = pim_cap, h = pim_h);
      }
    }
    // Alt 4× Dişi Pim Yuvası (0.20mm radyal toleranslı)
    translate([0, 0, -kat_h / 2 - 0.05]) kose_koordinatlari()
      cylinder(d = yuva_cap, h = yuva_h + 0.05);
  }
}

translate([0, 0, kat_h / 2]) tip_kat_modulu();
`;

  triggerDownloadBlob(
    new Blob([scad], { type: 'text/plain;charset=utf-8' }),
    `Mimari_Maket_Parametrik_1-${spec.scale}.scad`
  );
}
