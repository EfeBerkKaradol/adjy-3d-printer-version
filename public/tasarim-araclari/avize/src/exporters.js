(function () {
  'use strict';

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function fileSlug(params) {
    const duy = params.Duy_Tipi === 'E14_28mm' ? 'E14_28mm' : 'E27_40mm';
    const d = Math.round(params.Avize_Capi_mm);
    const h = Math.round(params.Avize_Yuksekligi_mm);
    const k = Math.round(params.Kanat_Sayisi);
    return `Parametrik_Avize_${duy}_D${d}xH${h}_K${k}`;
  }

  function computeBOMAndPricing(params, telemetry, materialKey = 'PLA_WARM') {
    const { MATERIALS_DB, SOCKET_SPECS } = window.AtelierCAD;
    const mat = MATERIALS_DB[materialKey] || MATERIALS_DB.PLA_WARM;
    const spec = SOCKET_SPECS[params.Duy_Tipi] || SOCKET_SPECS.E27_40mm;

    const netMassG = telemetry.volCm3 * mat.density;
    const grossMassG = netMassG * 1.05;
    const filamentCostTry = (grossMassG / 1000.0) * mat.costPerKgTry;

    const printHours = Math.max(0.8, telemetry.volCm3 / 11.5 + (params.Avize_Yuksekligi_mm / 220.0) * 0.45);
    const machineRatePerHrTry = 38.0;
    const machineCostTry = printHours * machineRatePerHrTry;

    const socketKitCostTry = spec.socketUnitCostTry;
    const ledBulbCostTry = spec.bulbUnitCostTry;
    const packagingLaborTry = 36.0;

    const bomTotalTry =
      filamentCostTry +
      machineCostTry +
      socketKitCostTry +
      ledBulbCostTry +
      packagingLaborTry;

    const wholesalePriceTry = bomTotalTry * 1.65;
    const retailExVatTry = bomTotalTry * 2.45;
    const vatRate = 0.20;
    const retailIncVatTry = retailExVatTry * (1 + vatRate);

    const items = [
      {
        code: 'BOM-01',
        name: `3D Baskı Difüzör & Entegre ${spec.id} Duy Bileziği`,
        spec: `${mat.name} | Net: ${netMassG.toFixed(1)}g (+%5 fire = ${grossMassG.toFixed(1)}g) | %0 Destek Atığı`,
        qty: `${grossMassG.toFixed(1)}`,
        unit: 'g',
        unitCost: mat.costPerKgTry / 1000,
        totalCost: filamentCostTry
      },
      {
        code: 'BOM-02',
        name: 'FDM Katmanlı İmalat Makine & Enerji Süresi',
        spec: `0.20mm Katman | Cidar ${Number(params.Cidar_Kalinligi_mm).toFixed(1)}mm | Desteksiz Ters Baskı`,
        qty: printHours.toFixed(2),
        unit: 'saat',
        unitCost: machineRatePerHrTry,
        totalCost: machineCostTry
      },
      {
        code: 'BOM-03',
        name: `${spec.standard} Çift Bilezikli Sarkıt Duy & Rozans Seti`,
        spec: `Ø${spec.boreDiameterMm.toFixed(0)}mm Montaj | 1.5m Örgülü Tekstil Kablo + Tavan Rozansı (CE)`,
        qty: '1',
        unit: 'set',
        unitCost: socketKitCostTry,
        totalCost: socketKitCostTry
      },
      {
        code: 'BOM-04',
        name: `Sıcak Beyaz LED Ampul (2700K — Maks. ${spec.maxLedWatt}W LED)`,
        spec: `${params.Duy_Tipi === 'E14_28mm' ? 'E14 5W 470lm Mum' : 'E27 8W 806lm A60'} Sıcak Filament LED`,
        qty: '1',
        unit: 'adet',
        unitCost: ledBulbCostTry,
        totalCost: ledBulbCostTry
      },
      {
        code: 'BOM-05',
        name: 'Kalite Kontrol, Duy Geçme Testi & Kraft Kutu Ambalaj',
        spec: 'Kumpas Ø geçiş kontrolü + darbe emici oluklu kutu + montaj kılavuzu',
        qty: '1',
        unit: 'paket',
        unitCost: packagingLaborTry,
        totalCost: packagingLaborTry
      }
    ];

    return {
      material: mat,
      spec,
      netMassG,
      grossMassG,
      printHours,
      filamentCostTry,
      machineCostTry,
      socketKitCostTry,
      ledBulbCostTry,
      packagingLaborTry,
      bomTotalTry,
      wholesalePriceTry,
      retailExVatTry,
      retailIncVatTry,
      vatRate,
      items
    };
  }

  function generateImalatAntetiSVG(params, collar, profile, svgLoops, telemetry, materialKey = 'PLA_WARM') {
    const { MATERIALS_DB } = window.AtelierCAD;
    const mat = MATERIALS_DB[materialKey] || MATERIALS_DB.PLA_WARM;
    const spec = collar.spec;
    const W = 1200;
    const H_SVG = 848;

    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const scaleTop = Math.min(1.85, 215 / (collar.D * 0.52));
    const scaleSec = Math.min(1.85, 225 / Math.max(collar.D * 0.52, collar.H * 0.56));

    const cxTop = 305;
    const cyTop = 395;
    const cxSec = 845;
    const topYSec = 155;

    const loopToPath = (pts, sc) => {
      if (!pts || !pts.length) return '';
      let d = `M ${(cxTop + pts[0].x * sc).toFixed(2)} ${(cyTop + pts[0].y * sc).toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${(cxTop + pts[i].x * sc).toFixed(2)} ${(cyTop + pts[i].y * sc).toFixed(2)}`;
      }
      return d + ' Z';
    };

    let peakIdx = 0;
    let peakR = 0;
    for (let i = 0; i <= profile.nz; i++) {
      if (profile.rBase[i] + profile.finAmp[i] > peakR) {
        peakR = profile.rBase[i] + profile.finAmp[i];
        peakIdx = i;
      }
    }
    const outerWavePts = [];
    const segWave = Math.max(240, profile.finCount * 8);
    for (let j = 0; j < segWave; j++) {
      const a = (j / segWave) * Math.PI * 2;
      const r = profile.rBase[peakIdx] + profile.finAmp[peakIdx] * Math.cos(profile.finCount * a);
      outerWavePts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
    const outerWaveSvgPath = loopToPath(outerWavePts, scaleTop);

    const ventPathsSvg = svgLoops.ventSvgLoops
      .map((pts) => `<path d="${loopToPath(pts, scaleTop)}" fill="#F6F3EC" stroke="#141413" stroke-width="1.25"/>`)
      .join('\n      ');

    const spiderPathsSvg = svgLoops.spiderSvgLoops
      .map((pts) => `<path d="${loopToPath(pts, scaleTop)}" fill="#F6F3EC" stroke="#141413" stroke-width="1.35"/>`)
      .join('\n      ');

    const buildHalfSectionPolygon = (sign) => {
      const pts = [];
      pts.push([cxSec + sign * collar.rBore * scaleSec, topYSec]);
      pts.push([cxSec + sign * collar.rCrownOut * scaleSec, topYSec]);
      for (let i = 1; i <= profile.nz; i++) {
        const ro = profile.rBase[i] + profile.finAmp[i] * 0.7;
        pts.push([cxSec + sign * ro * scaleSec, topYSec + profile.zArr[i] * scaleSec]);
      }
      for (let i = profile.nz; i >= 1; i--) {
        if (profile.zArr[i] <= collar.tSpider + 1e-4) break;
        const ri = (profile.rBase[i] - profile.wallRadial[i]) + Math.max(0, profile.finAmp[i] - 0.14 * collar.tWall) * 0.7;
        pts.push([cxSec + sign * ri * scaleSec, topYSec + profile.zArr[i] * scaleSec]);
      }
      pts.push([cxSec + sign * collar.rCrownIn * scaleSec, topYSec + collar.tSpider * scaleSec]);
      pts.push([cxSec + sign * collar.rBossBase * scaleSec, topYSec + collar.tSpider * scaleSec]);
      pts.push([cxSec + sign * collar.rBossTip * scaleSec, topYSec + collar.hCollar * scaleSec]);
      pts.push([cxSec + sign * collar.rBore * scaleSec, topYSec + collar.hCollar * scaleSec]);
      return 'M ' + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L ') + ' Z';
    };

    const rightSecPath = buildHalfSectionPolygon(+1);
    const leftSecPath = buildHalfSectionPolygon(-1);

    let innerBackLines = '';
    for (let k = -3; k <= 3; k++) {
      const xFrac = k / 4;
      let dLine = '';
      for (let i = 0; i <= profile.nz; i += 2) {
        const z = profile.zArr[i];
        if (z < collar.tSpider) continue;
        const rIn = profile.rBase[i] - profile.wallRadial[i];
        const x = cxSec + xFrac * rIn * scaleSec;
        const y = topYSec + z * scaleSec;
        dLine += (dLine ? ' L ' : 'M ') + `${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      if (dLine) {
        innerBackLines += `<path d="${dLine}" fill="none" stroke="#9A968C" stroke-width="0.65" stroke-dasharray="3 3"/>`;
      }
    }

    const rBorePx = (collar.rBore * scaleTop).toFixed(2);
    const rBossTipPx = (collar.rBossTip * scaleTop).toFixed(2);
    const rBossBasePx = (collar.rBossBase * scaleTop).toFixed(2);
    const rNutPx = ((spec.nutOuterDiameterMm * 0.5) * scaleTop).toFixed(2);
    const rCrownInPx = (collar.rCrownIn * scaleTop).toFixed(2);
    const rCrownOutPx = (collar.rCrownOut * scaleTop).toFixed(2);
    const maxOuterPx = (collar.D * 0.5 * scaleTop).toFixed(2);

    const bottomYSec = topYSec + collar.H * scaleSec;
    const passText = telemetry.isSupportFreePass
      ? `ONAYLI (${telemetry.maxOverhangDeg.toFixed(1)}° <= 45.0°)`
      : `UYARI (${telemetry.maxOverhangDeg.toFixed(1)}° > 45.0°)`;
    const passColor = telemetry.isSupportFreePass ? '#1B6B46' : '#C62817';
    const todayStr = new Date().toISOString().slice(0, 10);

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H_SVG}" width="${W}mm" height="${H_SVG}mm">
  <defs>
    <pattern id="isoHatch" width="7" height="7" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#1E1E1C" stroke-width="0.9"/>
    </pattern>
    <marker id="arrowEnd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#D9381E"/>
    </marker>
    <marker id="arrowInk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#141413"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H_SVG}" fill="#F6F3EC"/>
  <rect x="18" y="18" width="${W - 36}" height="${H_SVG - 36}" fill="none" stroke="#141413" stroke-width="2"/>
  <rect x="26" y="26" width="${W - 52}" height="${H_SVG - 52}" fill="none" stroke="#141413" stroke-width="0.8"/>

  <line x1="26" y1="68" x2="${W - 26}" y2="68" stroke="#141413" stroke-width="1"/>
  <text x="42" y="52" font-family="'JetBrains Mono', monospace" font-size="13" font-weight="700" fill="#141413" letter-spacing="1.5">
    TEKNİK İMALAT RESMİ — DESTEKSİZ (&lt;=45°) PARAMETRİK AVİZE &amp; STANDART ${esc(spec.id)} DUY BİLEZİĞİ
  </text>
  <text x="${W - 42}" y="52" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="11" fill="#D9381E" font-weight="700">
    BİRİM: mm | TOLERANS: ISO 2768-mK | BASKI: DESTEKSİZ TERS TABLA (Z=0)
  </text>

  <line x1="600" y1="68" x2="600" y2="672" stroke="#141413" stroke-width="0.75" stroke-dasharray="6 4"/>

  <text x="44" y="98" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#141413">
    [ 01 ] ÜST GÖRÜNÜŞ — DUY GEÇME &amp; RADYAL ÖRÜMCEK BİLEZİK DETAYI
  </text>
  <text x="44" y="114" font-family="'JetBrains Mono', monospace" font-size="10" fill="#57554F">
    ${esc(spec.standard)} | İç Çap Ø${spec.boreDiameterMm.toFixed(1)} +0.2/0 mm | ${collar.ventCount}x LED Isı Tahliye Kanalı | ${collar.spiderCount}x Radyal Örümcek Kol
  </text>

  <g id="top-plan-view">
    <path d="${outerWaveSvgPath}" fill="#EAE5DA" stroke="#5C5A54" stroke-width="1.1"/>
    <circle cx="${cxTop}" cy="${cyTop}" r="${rCrownOutPx}" fill="#DED8CA" stroke="#141413" stroke-width="1.6"/>
    <circle cx="${cxTop}" cy="${cyTop}" r="${rCrownInPx}" fill="#E6E1D5" stroke="#141413" stroke-width="1.1"/>
    ${spiderPathsSvg}
    ${ventPathsSvg}
    <circle cx="${cxTop}" cy="${cyTop}" r="${rBossBasePx}" fill="none" stroke="#141413" stroke-width="1.0" stroke-dasharray="4 2"/>
    <circle cx="${cxTop}" cy="${cyTop}" r="${rBossTipPx}" fill="#D6CFC0" stroke="#141413" stroke-width="1.4"/>
    <circle cx="${cxTop}" cy="${cyTop}" r="${rNutPx}" fill="none" stroke="#D9381E" stroke-width="1.0" stroke-dasharray="5 3"/>
    <circle cx="${cxTop}" cy="${cyTop}" r="${rBorePx}" fill="#F6F3EC" stroke="#141413" stroke-width="2.2"/>

    <line x1="${cxTop - Number(maxOuterPx) - 24}" y1="${cyTop}" x2="${cxTop + Number(maxOuterPx) + 24}" y2="${cyTop}" stroke="#D9381E" stroke-width="0.9" stroke-dasharray="14 4 3 4"/>
    <line x1="${cxTop}" y1="${cyTop - Number(maxOuterPx) - 24}" x2="${cxTop}" y2="${cyTop + Number(maxOuterPx) + 24}" stroke="#57554F" stroke-width="0.8" stroke-dasharray="14 4 3 4"/>
    <text x="${cxTop - Number(maxOuterPx) - 34}" y="${cyTop - 5}" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#D9381E">A</text>
    <text x="${cxTop + Number(maxOuterPx) + 26}" y="${cyTop - 5}" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#D9381E">A</text>

    <line x1="${cxTop - Number(rBorePx)}" y1="${cyTop}" x2="${cxTop + Number(rBorePx)}" y2="${cyTop}" stroke="#D9381E" stroke-width="1.4" marker-start="url(#arrowEnd)" marker-end="url(#arrowEnd)"/>
    <line x1="${cxTop + Number(rBorePx) * 0.7}" y1="${cyTop - Number(rBorePx) * 0.7}" x2="${cxTop + Number(maxOuterPx) + 18}" y2="${cyTop - Number(maxOuterPx) - 8}" stroke="#D9381E" stroke-width="1.1"/>
    <text x="${cxTop + Number(maxOuterPx) - 55}" y="${cyTop - Number(maxOuterPx) - 14}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#D9381E">
      Ø${spec.boreDiameterMm.toFixed(1)} +0.2/0 (${esc(spec.id)})
    </text>

    <line x1="${cxTop - Number(maxOuterPx)}" y1="${cyTop + Number(maxOuterPx) + 34}" x2="${cxTop + Number(maxOuterPx)}" y2="${cyTop + Number(maxOuterPx) + 34}" stroke="#141413" stroke-width="1.2" marker-start="url(#arrowInk)" marker-end="url(#arrowInk)"/>
    <line x1="${cxTop - Number(maxOuterPx)}" y1="${cyTop}" x2="${cxTop - Number(maxOuterPx)}" y2="${cyTop + Number(maxOuterPx) + 40}" stroke="#141413" stroke-width="0.6" opacity="0.5"/>
    <line x1="${cxTop + Number(maxOuterPx)}" y1="${cyTop}" x2="${cxTop + Number(maxOuterPx)}" y2="${cyTop + Number(maxOuterPx) + 40}" stroke="#141413" stroke-width="0.6" opacity="0.5"/>
    <text x="${cxTop}" y="${cyTop + Number(maxOuterPx) + 50}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#141413">
      Avize_Capi_mm = Ø${Number(params.Avize_Capi_mm).toFixed(1)} mm (Üst Taç Ø${(collar.rCrownOut * 2).toFixed(1)} mm)
    </text>
  </g>

  <text x="622" y="98" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#141413">
    [ 02 ] KESİT A-A — CİDAR (${Number(params.Cidar_Kalinligi_mm).toFixed(1)} mm), TAKVİYELİ DUY &amp; &lt;=45° KONTROLÜ
  </text>
  <text x="622" y="114" font-family="'JetBrains Mono', monospace" font-size="10" fill="#57554F">
    Cidar: ${Number(params.Cidar_Kalinligi_mm).toFixed(2)} mm | Duy Boğaz Yüksekliği: ${collar.hCollar.toFixed(1)} mm | Örümcek Kol Kalınlığı: ${collar.tSpider.toFixed(1)} mm
  </text>

  <g id="section-aa-view">
    <line x1="${cxSec - 210}" y1="${topYSec}" x2="${cxSec + 210}" y2="${topYSec}" stroke="#1B6B46" stroke-width="1.2" stroke-dasharray="7 3"/>
    <text x="${cxSec - 208}" y="${topYSec - 7}" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="700" fill="#1B6B46">
      3D BASKI TABLASI REFERANS DÜZLEMİ (Z_print = 0.0 mm — DESTEKSİZ)
    </text>

    ${innerBackLines}

    <rect x="${(cxSec - (collar.rBore - 0.4) * scaleSec).toFixed(1)}" y="${(topYSec - 22).toFixed(1)}" width="${((collar.rBore - 0.4) * 2 * scaleSec).toFixed(1)}" height="${(22 + collar.hCollar * scaleSec + 18).toFixed(1)}" fill="none" stroke="#8A6524" stroke-width="1.0" stroke-dasharray="4 3"/>
    <circle cx="${cxSec}" cy="${(topYSec + (collar.hCollar + 44) * scaleSec).toFixed(1)}" r="${(28 * scaleSec).toFixed(1)}" fill="rgba(232,168,76,0.10)" stroke="#B87D1E" stroke-width="1.0" stroke-dasharray="4 3"/>
    <text x="${cxSec}" y="${(topYSec + (collar.hCollar + 45) * scaleSec).toFixed(1)}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" fill="#8A6524">
      LED AMPUL (2700K)
    </text>

    <path d="${leftSecPath}" fill="url(#isoHatch)" stroke="#141413" stroke-width="1.5"/>
    <path d="${rightSecPath}" fill="url(#isoHatch)" stroke="#141413" stroke-width="1.5"/>

    <rect x="${(cxSec + collar.rVentIn * scaleSec).toFixed(1)}" y="${topYSec.toFixed(1)}" width="${((collar.rVentOut - collar.rVentIn) * scaleSec).toFixed(1)}" height="${(collar.tSpider * scaleSec).toFixed(1)}" fill="#F6F3EC" stroke="#D9381E" stroke-width="0.9" stroke-dasharray="2 2"/>
    <rect x="${(cxSec - collar.rVentOut * scaleSec).toFixed(1)}" y="${topYSec.toFixed(1)}" width="${((collar.rVentOut - collar.rVentIn) * scaleSec).toFixed(1)}" height="${(collar.tSpider * scaleSec).toFixed(1)}" fill="#F6F3EC" stroke="#D9381E" stroke-width="0.9" stroke-dasharray="2 2"/>

    <line x1="${cxSec}" y1="${topYSec - 30}" x2="${cxSec}" y2="${bottomYSec + 24}" stroke="#D9381E" stroke-width="0.9" stroke-dasharray="14 4 3 4"/>

    <line x1="${cxSec + 188}" y1="${topYSec}" x2="${cxSec + 188}" y2="${bottomYSec.toFixed(1)}" stroke="#141413" stroke-width="1.2" marker-start="url(#arrowInk)" marker-end="url(#arrowInk)"/>
    <line x1="${cxSec + collar.rCrownOut * scaleSec}" y1="${topYSec}" x2="${cxSec + 195}" y2="${topYSec}" stroke="#141413" stroke-width="0.6" opacity="0.5"/>
    <line x1="${cxSec + 60}" y1="${bottomYSec.toFixed(1)}" x2="${cxSec + 195}" y2="${bottomYSec.toFixed(1)}" stroke="#141413" stroke-width="0.6" opacity="0.5"/>
    <text x="${cxSec + 202}" y="${((topYSec + bottomYSec) * 0.5).toFixed(1)}" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#141413" transform="rotate(90 ${cxSec + 202} ${((topYSec + bottomYSec) * 0.5).toFixed(1)})" text-anchor="middle">
      H = ${Number(params.Avize_Yuksekligi_mm).toFixed(1)} mm
    </text>

    <text x="622" y="${(bottomYSec + 44).toFixed(1)}" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="${passColor}">
      BASKI KONTROLÜ: MAKS. YÜZEY SARKMASI = ${telemetry.maxOverhangDeg.toFixed(1)}° — ${esc(passText)}
    </text>
    <text x="622" y="${(bottomYSec + 60).toFixed(1)}" font-family="'JetBrains Mono', monospace" font-size="10" fill="#45433E">
      Kanat: ${params.Kanat_Sayisi} Adet | Burulma: ${params.Burulma_Derecesi}° | Dalga Frekansı: ${Number(params.Dalga_Frekansi).toFixed(1)} | Cidar: ${Number(params.Cidar_Kalinligi_mm).toFixed(2)} mm
    </text>
  </g>

  <g id="imalat-anteti-block">
    <rect x="26" y="672" width="${W - 52}" height="150" fill="#EFECE3" stroke="#141413" stroke-width="1.4"/>
    <line x1="26" y1="710" x2="${W - 26}" y2="710" stroke="#141413" stroke-width="1"/>
    <line x1="26" y1="748" x2="${W - 26}" y2="748" stroke="#141413" stroke-width="1"/>
    <line x1="26" y1="786" x2="${W - 26}" y2="786" stroke="#141413" stroke-width="1"/>

    <line x1="390" y1="672" x2="390" y2="822" stroke="#141413" stroke-width="1"/>
    <line x1="790" y1="672" x2="790" y2="822" stroke="#141413" stroke-width="1"/>
    <line x1="1000" y1="672" x2="1000" y2="822" stroke="#141413" stroke-width="1"/>

    <text x="40" y="695" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="700" fill="#141413">İMALAT ANTETİ — PARAMETRİK AVİZE</text>
    <text x="404" y="695" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#D9381E">DUY TİPİ: ${esc(spec.label)}</text>
    <text x="804" y="695" font-family="'JetBrains Mono', monospace" font-size="11" fill="#141413">HACİM: ${telemetry.volCm3.toFixed(2)} cm³</text>
    <text x="1012" y="695" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700" fill="#141413">REV: A-01</text>

    <text x="40" y="733" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#141413">MALZEME: ${esc(mat.name)}</text>
    <text x="404" y="733" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#141413">DIŞ ÖLÇÜ: Ø${Number(params.Avize_Capi_mm).toFixed(1)} × ${Number(params.Avize_Yuksekligi_mm).toFixed(1)} mm</text>
    <text x="804" y="733" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#141413">NET AĞIRLIK: ${(telemetry.volCm3 * mat.density).toFixed(1)} g</text>
    <text x="1012" y="733" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#141413">BİRİM: mm</text>

    <text x="40" y="771" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#141413">KANAT / BURULMA: ${params.Kanat_Sayisi} Kanat / ${params.Burulma_Derecesi}°</text>
    <text x="404" y="771" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#141413">CİDAR / DALGA: ${Number(params.Cidar_Kalinligi_mm).toFixed(2)} mm / ${Number(params.Dalga_Frekansi).toFixed(1)}x</text>
    <text x="804" y="771" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#141413">ISI TAHLİYE: ${collar.ventCount} Delik + 6 Kol</text>
    <text x="1012" y="771" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#141413">TARİH: ${todayStr}</text>

    <text x="40" y="809" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="${passColor}">DESTEKSİZ BASKI: ${esc(passText)}</text>
    <text x="404" y="809" font-family="'JetBrains Mono', monospace" font-size="10" fill="#45433E">NOT: Yalnızca LED ampul (maks. ${spec.maxLedWatt}W) ile kullanınız.</text>
    <text x="804" y="809" font-family="'JetBrains Mono', monospace" font-size="10.5" fill="#141413">ALAN: ${telemetry.areaCm2.toFixed(1)} cm²</text>
    <text x="1012" y="809" font-family="'JetBrains Mono', monospace" font-size="10.5" font-weight="700" fill="#141413">ATELIER CAD</text>
  </g>
</svg>`;
  }

  function downloadImalatAntetiSVG(params, collar, profile, svgLoops, telemetry, materialKey) {
    const svg = generateImalatAntetiSVG(params, collar, profile, svgLoops, telemetry, materialKey);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(blob, `Imalat_Anteti_${fileSlug(params)}.svg`);
  }

  function downloadBOMAndPricingCSV(params, telemetry, materialKey) {
    const bom = computeBOMAndPricing(params, telemetry, materialKey);
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;

    const lines = [
      ['KALEM_KODU', 'KALEM_ADI', 'TEKNIK_ACIKLAMA', 'MIKTAR', 'BIRIM', 'BIRIM_MALIYET_TRY', 'TOPLAM_TUTAR_TRY'].map(q).join(';')
    ];

    for (const row of bom.items) {
      lines.push([
        row.code,
        row.name,
        row.spec,
        row.qty,
        row.unit,
        row.unitCost.toFixed(2),
        row.totalCost.toFixed(2)
      ].map(q).join(';'));
    }

    lines.push('');
    lines.push(['OZET_KALEMI', 'DEGER', 'BIRIM / NOT', '', '', '', ''].map(q).join(';'));
    lines.push(['Avize_Capi_mm', Number(params.Avize_Capi_mm).toFixed(1), 'mm', '', '', '', ''].map(q).join(';'));
    lines.push(['Avize_Yuksekligi_mm', Number(params.Avize_Yuksekligi_mm).toFixed(1), 'mm', '', '', '', ''].map(q).join(';'));
    lines.push(['Duy_Tipi', params.Duy_Tipi, bom.spec.standard, '', '', '', ''].map(q).join(';'));
    lines.push(['Kanat_Sayisi / Burulma_Derecesi', `${params.Kanat_Sayisi} / ${params.Burulma_Derecesi}`, 'adet / derece', '', '', '', ''].map(q).join(';'));
    lines.push(['Cidar_Kalinligi_mm / Isi_Tahliye_Delik_Sayisi', `${Number(params.Cidar_Kalinligi_mm).toFixed(2)} / ${params.Isi_Tahliye_Delik_Sayisi}`, 'mm / delik', '', '', '', ''].map(q).join(';'));
    lines.push(['Maks_Sarkma_Acisi', telemetry.maxOverhangDeg.toFixed(1), telemetry.isSupportFreePass ? '<=45° Desteksiz Onayli' : '>45° Uyari', '', '', '', ''].map(q).join(';'));
    lines.push(['Toplam_BOM_Imalat_Maliyeti', bom.bomTotalTry.toFixed(2), 'TRY (TL)', '', '', '', ''].map(q).join(';'));
    lines.push(['Toptan_Satis_Fiyati_KDV_Haric (1.65x)', bom.wholesalePriceTry.toFixed(2), 'TRY (TL)', '', '', '', ''].map(q).join(';'));
    lines.push(['Perakende_Satis_Fiyati_KDV_Haric (2.45x)', bom.retailExVatTry.toFixed(2), 'TRY (TL)', '', '', '', ''].map(q).join(';'));
    lines.push(['Onerilen_Perakende_Satis_Fiyati_KDV_Dahil (%20)', bom.retailIncVatTry.toFixed(2), 'TRY (TL)', '', '', '', ''].map(q).join(';'));

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `BOM_ve_Perakende_Maliyet_${fileSlug(params)}.csv`);
  }

  function downloadBinarySTL(deps, geometry, params) {
    const { THREE, STLExporter } = deps;
    const slicerGeom = window.AtelierCAD.createSlicerReadyGeometry(geometry, Number(params.Avize_Yuksekligi_mm));
    const mesh = new THREE.Mesh(slicerGeom);
    const exporter = new STLExporter();
    const buffer = exporter.parse(mesh, { binary: true });
    slicerGeom.dispose();
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    triggerDownload(blob, `${fileSlug(params)}_Desteksiz_1to1mm.stl`);
  }

  function downloadWavefrontOBJ(deps, geometry, params) {
    const { THREE, OBJExporter } = deps;
    const slicerGeom = window.AtelierCAD.createSlicerReadyGeometry(geometry, Number(params.Avize_Yuksekligi_mm));
    const mesh = new THREE.Mesh(slicerGeom);
    const exporter = new OBJExporter();
    const text = exporter.parse(mesh);
    slicerGeom.dispose();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${fileSlug(params)}.obj`);
  }

  function downloadBinaryGLB(deps, geometry, params) {
    const { THREE, GLTFExporter } = deps;
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0xf3eee3, roughness: 0.42, metalness: 0.0 })
    );
    const exporter = new GLTFExporter();
    exporter.parse(
      mesh,
      (result) => {
        const blob = new Blob([result], { type: 'model/gltf-binary' });
        triggerDownload(blob, `${fileSlug(params)}.glb`);
      },
      (err) => console.error('GLB Export Error:', err),
      { binary: true }
    );
  }

  function downloadCollarDXF(params, collar, svgLoops) {
    const lines = ['0', 'SECTION', '2', 'ENTITIES'];

    const addCircle = (r, layer) => {
      lines.push('0', 'CIRCLE', '8', layer, '10', '0.0', '20', '0.0', '30', '0.0', '40', r.toFixed(4));
    };

    const addPolyLoop = (pts, layer) => {
      if (!pts || pts.length < 3) return;
      lines.push('0', 'LWPOLYLINE', '8', layer, '90', String(pts.length), '70', '1');
      for (const p of pts) {
        lines.push('10', p.x.toFixed(4), '20', p.y.toFixed(4));
      }
    };

    addCircle(collar.rBore, 'DUY_DELIGI');
    addCircle(collar.rBossTip, 'DUY_TAKVIYE_BILEZIGI');
    addCircle(collar.rCrownIn, 'UST_TAC_IC');
    addCircle(collar.rCrownOut, 'UST_TAC_DIS');
    addCircle(collar.D * 0.5, 'MAKS_AVIZE_CAPI_REFERANS');

    for (const pts of svgLoops.ventSvgLoops) addPolyLoop(pts, 'ISI_TAHLIYE_DELIKLERI');
    for (const pts of svgLoops.spiderSvgLoops) addPolyLoop(pts, 'ORUMCEK_KOLLAR');

    lines.push('0', 'ENDSEC', '0', 'EOF');
    const blob = new Blob([lines.join('\r\n')], { type: 'application/dxf' });
    triggerDownload(blob, `Duy_Bilezigi_2D_${fileSlug(params)}.dxf`);
  }

  function downloadParametricSCAD(params, collar) {
    const scad = `// ============================================================================
// Desteksiz Parametrik Avize & Standart E27/E14 Duy Bileziği (OpenSCAD Kaynağı)
// Birim: 1.0 mm | Ters Baskı Yönü (Üst Taç Z = 0 Düzleminde <=45° Desteksiz)
// ============================================================================

Avize_Capi_mm            = ${Number(params.Avize_Capi_mm).toFixed(1)};
Avize_Yuksekligi_mm      = ${Number(params.Avize_Yuksekligi_mm).toFixed(1)};
Dalga_Frekansi           = ${Number(params.Dalga_Frekansi).toFixed(2)};
Burulma_Derecesi         = ${Number(params.Burulma_Derecesi).toFixed(1)};
Kanat_Sayisi             = ${Math.round(params.Kanat_Sayisi)};
Cidar_Kalinligi_mm       = ${Number(params.Cidar_Kalinligi_mm).toFixed(2)};
Duy_Ic_Cap_mm            = ${collar.spec.boreDiameterMm.toFixed(1)}; // ${params.Duy_Tipi}
Isi_Tahliye_Delik_Sayisi = ${Math.round(params.Isi_Tahliye_Delik_Sayisi)};

$fn = 144;

module duy_ve_orumcek_bilezik() {
  r_bore      = Duy_Ic_Cap_mm / 2;
  r_boss_tip  = ${collar.rBossTip.toFixed(2)};
  r_boss_base = ${collar.rBossBase.toFixed(2)};
  t_spider    = ${collar.tSpider.toFixed(2)};
  h_collar    = ${collar.hCollar.toFixed(2)};
  r_crown_out = ${collar.rCrownOut.toFixed(2)};

  difference() {
    union() {
      cylinder(h = t_spider, r = r_crown_out);
      translate([0, 0, t_spider])
        cylinder(h = h_collar - t_spider, r1 = r_boss_base, r2 = r_boss_tip);
    }
    translate([0, 0, -0.5])
      cylinder(h = h_collar + 1.0, r = r_bore);

    for (i = [0 : Isi_Tahliye_Delik_Sayisi - 1]) {
      rotate([0, 0, i * 360 / Isi_Tahliye_Delik_Sayisi])
        translate([${((collar.rVentIn + collar.rVentOut) * 0.5).toFixed(2)}, 0, -0.5])
          cylinder(h = t_spider + 1.0, d = ${(collar.rVentOut - collar.rVentIn).toFixed(2)});
    }

    for (k = [0 : 5]) {
      rotate([0, 0, k * 60 + 30])
        translate([${((collar.rRingOut + collar.rSpiderOut) * 0.5).toFixed(2)}, 0, -0.5])
          cylinder(h = t_spider + 1.0, d = ${(collar.rSpiderOut - collar.rRingOut).toFixed(2)});
    }
  }
}

module dalgali_difuzor_govde(katman = 72) {
  dz = Avize_Yuksekligi_mm / katman;
  for (i = [0 : katman - 1]) {
    z0 = i * dz;
    u  = z0 / Avize_Yuksekligi_mm;
    r_m = ${collar.rCrownOut.toFixed(2)} + (Avize_Capi_mm / 2 - ${collar.rCrownOut.toFixed(2)}) * sin(min(90, u * 150)) * (0.82 + 0.18 * sin(u * 360 * Dalga_Frekansi));
    translate([0, 0, z0])
      linear_extrude(height = dz + 0.05, twist = -Burulma_Derecesi / katman)
        difference() {
          circle(r = r_m);
          circle(r = max(Duy_Ic_Cap_mm / 2 + 4, r_m - Cidar_Kalinligi_mm));
        }
  }
}

union() {
  duy_ve_orumcek_bilezik();
  dalgali_difuzor_govde();
}
`;
    const blob = new Blob([scad], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `${fileSlug(params)}.scad`);
  }

  window.AtelierCAD = Object.assign(window.AtelierCAD || {}, {
    computeBOMAndPricing,
    generateImalatAntetiSVG,
    downloadImalatAntetiSVG,
    downloadBOMAndPricingCSV,
    downloadBinarySTL,
    downloadWavefrontOBJ,
    downloadBinaryGLB,
    downloadCollarDXF,
    downloadParametricSCAD
  });
})();
