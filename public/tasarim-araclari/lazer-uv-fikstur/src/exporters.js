import { buildOuterPlateContour2D, buildCavityContour2D } from './jig-engine.js';

const fmt = (n, d = 3) => Number(n).toFixed(d);
const escXml = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Nokta dizisini SVG <path d="M ... L ... Z"> dizgesine çevirir.
 * CAD (X, Y) -> SVG (ox + X, oy + (plateH - Y)) dönüşümü ile (0,0) Sol-Alt Lazer Orijini korunur.
 */
function pointsToSvgPath(pts, plateH, ox = 0, oy = 0) {
  if (!pts.length) return '';
  const segs = pts.map((p, idx) => {
    const sx = ox + p.x;
    const sy = oy + (plateH - p.y);
    return `${idx === 0 ? 'M' : 'L'}${fmt(sx, 3)} ${fmt(sy, 3)}`;
  });
  return `${segs.join(' ')} Z`;
}

/**
 * Çift Amaçlı 2D "Imalat_Anteti" & 1:1 LightBurn Hizalama Vektör Şablonu (.SVG) Üreticisi.
 *
 * LightBurn Resmi Katman Renk Paleti:
 * - C00 (#000000 / Koyu Tema Önizlemede #ECE8E1): Fikstür Dış Kesim / Referans Sınırı
 * - C01 (#0000FF / Önizlemede #3B82F6): 1:1 Net Ürün Markalama Sınırı (Tasarım Hizalama Çerçevesi)
 * - C02 (#FF0000 / Önizlemede #EF4444): Negatif Yuva Kesimi (+Boşluk Payı + Parmak Alma Oyuğu)
 * - C03 (#00B800 / LightBurn #00FF00): M6 Optik Masa Bağlantı Delikleri (25mm / 50mm Grid)
 * - T1  (#FF8000): Merkez Nişangah Artıları, V-Yatak Ekseni & (0,0) Lazer Sıfır Noktası
 * - T2  (#00B8D4 / LightBurn #00E5FF): Yuva Matris Kodları (A1..F6), Ölçülendirme & İmalat Anteti
 */
export function generateJigSVG(spec, metrology, opts = {}) {
  const mode = opts.mode === 'lightburn_1to1' ? 'lightburn_1to1' : 'dual';
  const forScreenDark = Boolean(opts.darkPreview);

  // İndirilen dosyada %100 resmi LightBurn RGB hex kodları kullanılır
  const colC00 = forScreenDark ? '#ECE8E1' : '#000000';
  const colC01 = forScreenDark ? '#4DA3FF' : '#0000FF';
  const colC02 = forScreenDark ? '#FF5252' : '#FF0000';
  const colC03 = forScreenDark ? '#2CE66F' : '#00CC00';
  const colC03Export = forScreenDark ? colC03 : '#00FF00';
  const colT1 = '#FF8000';
  const colT2 = forScreenDark ? '#29D8FF' : '#00B8D4';
  const colInk = forScreenDark ? '#ECE8E1' : '#121316';
  const colMuted = forScreenDark ? '#8E949E' : '#525866';
  const colGridLine = forScreenDark ? 'rgba(236,232,225,0.16)' : '#CBD2D9';
  const colBg = forScreenDark ? '#0D0F13' : '#FFFFFF';
  const colPanelBg = forScreenDark ? '#13161C' : '#F8F9FA';

  const W = spec.plateW;
  const H = spec.plateH;

  // Saf 1:1 LightBurn modunda viewBox tam olarak 0 0 PlateW PlateH (mm) olur!
  const padLeft = mode === 'dual' ? 28 : 0;
  const padTop = mode === 'dual' ? 26 : 0;
  const padRight = mode === 'dual' ? 88 : 0; // Sağda Kesit A-A detayı için alan
  const antetH = mode === 'dual' ? 66 : 0;   // Altta ISO Türkçe İmalat Anteti alanı
  const padBottom = mode === 'dual' ? 24 + antetH : 0;

  const totalW = round3(W + padLeft + padRight);
  const totalH = round3(H + padTop + padBottom);
  const ox = padLeft;
  const oy = padTop;

  const outerPts = buildOuterPlateContour2D(spec, 10);
  const outerPathD = pointsToSvgPath(outerPts, H, ox, oy);

  // Yuvalar: C02 Negatif Yuva + C01 Net Ürün Sınırı + T1 Merkez Artısı + T2 Kod
  const c02Paths = [];
  const c01Shapes = [];
  const t1Marks = [];
  const t2Labels = [];

  const crossR = Math.min(4.5, spec.urunEn * 0.18);

  for (const cav of spec.cavities) {
    const sx = ox + cav.cx;
    const sy = oy + (H - cav.cy);

    // C02: Negatif yuva + parmak alma oyuğu gerçek kesim konturu (Z = zAfterChamfer net kayıt duvarı)
    const cavPts = buildCavityContour2D(spec, cav.cx, cav.cy, { wGrow: 0, lGrow: 0, scoopScale: 1.0 });
    c02Paths.push(`<path d="${pointsToSvgPath(cavPts, H, ox, oy)}" />`);

    // C01: 1:1 Net Ürün Markalama Sınırı (Özel Model Silüeti veya Standart Geometri)
    if (spec.customModel && spec.customModel.zeroProductSilhouette2D) {
      const prodPts = spec.customModel.zeroProductSilhouette2D.map((p) => ({
        x: cav.cx + p.x,
        y: cav.cy + p.y
      }));
      c01Shapes.push(`<path d="${pointsToSvgPath(prodPts, H, ox, oy)}" />`);
    } else if (spec.shape === 'Round_Token') {
      const rProd = spec.urunEn * 0.5;
      c01Shapes.push(`<circle cx="${fmt(sx)}" cy="${fmt(sy)}" r="${fmt(rProd)}" />`);
    } else {
      const rx = spec.shape === 'Cylindrical_Pen' ? 0.6 : Math.min(1.2, spec.urunEn * 0.05);
      c01Shapes.push(
        `<rect x="${fmt(sx - spec.urunEn * 0.5)}" y="${fmt(sy - spec.urunBoy * 0.5)}" width="${fmt(spec.urunEn)}" height="${fmt(spec.urunBoy)}" rx="${fmt(rx)}" />`
      );
    }

    // T1: Merkez nişangah artısı + V-yatak merkez ekseni (Cylindrical_Pen ise)
    t1Marks.push(
      `<line x1="${fmt(sx - crossR)}" y1="${fmt(sy)}" x2="${fmt(sx + crossR)}" y2="${fmt(sy)}" />`,
      `<line x1="${fmt(sx)}" y1="${fmt(sy - crossR)}" x2="${fmt(sx)}" y2="${fmt(sy + crossR)}" />`
    );
    if (spec.shape === 'Cylindrical_Pen') {
      t1Marks.push(
        `<line x1="${fmt(sx)}" y1="${fmt(sy - spec.pocketL * 0.48)}" x2="${fmt(sx)}" y2="${fmt(sy + spec.pocketL * 0.48)}" stroke-dasharray="3,2" />`
      );
    }

    // T2: Yuva matris etiketi (A1..F6)
    const fontSz = Math.max(2.6, Math.min(4.6, spec.urunEn * 0.14));
    const labelOffsetY = Math.min(spec.urunBoy * 0.28, crossR + fontSz + 1.8);
    t2Labels.push(
      `<text x="${fmt(sx)}" y="${fmt(sy - labelOffsetY)}" text-anchor="middle" font-size="${fmt(fontSz, 2)}">${escXml(cav.code)}</text>`
    );
  }

  // C03: M6 Optik Breadboard Bağlantı Delikleri
  const c03Shapes = [];
  for (const h of spec.m6Holes) {
    const hx = ox + h.x;
    const hy = oy + (H - h.y);
    // Ø6.6mm geçiş deliği (düz çizgi) + Ø11.0mm imbus havşası (kesikli çizgi)
    c03Shapes.push(
      `<circle cx="${fmt(hx)}" cy="${fmt(hy)}" r="${fmt(spec.m6ThroughR)}" />`,
      `<circle cx="${fmt(hx)}" cy="${fmt(hy)}" r="${fmt(spec.cboreOuterR)}" stroke-dasharray="1.8,1.2" />`
    );
    t1Marks.push(
      `<line x1="${fmt(hx - 4.5)}" y1="${fmt(hy)}" x2="${fmt(hx + 4.5)}" y2="${fmt(hy)}" />`,
      `<line x1="${fmt(hx)}" y1="${fmt(hy - 4.5)}" x2="${fmt(hx)}" y2="${fmt(hy + 4.5)}" />`
    );
  }

  // Sol-Alt (0,0) Lazer Sıfır Noktası Hedefi (T1)
  const originSvgX = ox;
  const originSvgY = oy + H;
  t1Marks.push(
    `<circle cx="${fmt(originSvgX)}" cy="${fmt(originSvgY)}" r="3.2" />`,
    `<line x1="${fmt(originSvgX - 5)}" y1="${fmt(originSvgY)}" x2="${fmt(originSvgX + 5)}" y2="${fmt(originSvgY)}" />`,
    `<line x1="${fmt(originSvgX)}" y1="${fmt(originSvgY - 5)}" x2="${fmt(originSvgX)}" y2="${fmt(originSvgY + 5)}" />`
  );

  // Eğer saf 1:1 LightBurn şablonu isteniyorsa yalnızca katmanlı vektör gruplarını döndür
  if (mode === 'lightburn_1to1') {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- 1:1 LIGHTBURN HIZALAMA SABLONU | OLCEK: 1 BIRIM = 1.000 MM | ORIJIN: SOL-ALT (0,0) -->
<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(W)}mm" height="${fmt(H)}mm" viewBox="0 0 ${fmt(W)} ${fmt(H)}">
  <g id="C00_FIKSTUR_DIS_KESIM" fill="none" stroke="#000000" stroke-width="0.25">
    <path d="${outerPathD}" />
  </g>
  <g id="C03_M6_BREADBOARD_DELIKLERI" fill="none" stroke="#00FF00" stroke-width="0.20">
    ${c03Shapes.join('\n    ')}
  </g>
  <g id="C02_NEGATIF_YUVA_VE_PARMAK_OYUGU" fill="none" stroke="#FF0000" stroke-width="0.22">
    ${c02Paths.join('\n    ')}
  </g>
  <g id="C01_NET_URUN_MARKALAMA_ALANI" fill="none" stroke="#0000FF" stroke-width="0.20">
    ${c01Shapes.join('\n    ')}
  </g>
  <g id="T1_MERKEZ_AKS_VE_SIFIR_NOKTASI" fill="none" stroke="#FF8000" stroke-width="0.18">
    ${t1Marks.join('\n    ')}
  </g>
  <g id="T2_YUVA_KODLARI" fill="#00E5FF" stroke="none" font-family="JetBrains Mono, Consolas, monospace" font-weight="700">
    ${t2Labels.join('\n    ')}
  </g>
</svg>`;
  }

  // DUAL MODE: 1:1 LightBurn Şablonu + Ölçülendirme Okları + Kesit A-A + ISO Türkçe İMALAT ANTETİ
  const dimElements = [];
  const drawDimH = (x1, x2, yLine, yRef, label) => {
    dimElements.push(
      `<line x1="${fmt(x1)}" y1="${fmt(yRef)}" x2="${fmt(x1)}" y2="${fmt(yLine - 2)}" stroke="${colMuted}" stroke-width="0.2" stroke-dasharray="1.5,1" />`,
      `<line x1="${fmt(x2)}" y1="${fmt(yRef)}" x2="${fmt(x2)}" y2="${fmt(yLine - 2)}" stroke="${colMuted}" stroke-width="0.2" stroke-dasharray="1.5,1" />`,
      `<line x1="${fmt(x1)}" y1="${fmt(yLine)}" x2="${fmt(x2)}" y2="${fmt(yLine)}" stroke="${colT2}" stroke-width="0.3" />`,
      `<polygon points="${fmt(x1)},${fmt(yLine)} ${fmt(x1 + 2.2)},${fmt(yLine - 0.8)} ${fmt(x1 + 2.2)},${fmt(yLine + 0.8)}" fill="${colT2}" />`,
      `<polygon points="${fmt(x2)},${fmt(yLine)} ${fmt(x2 - 2.2)},${fmt(yLine - 0.8)} ${fmt(x2 - 2.2)},${fmt(yLine + 0.8)}" fill="${colT2}" />`,
      `<text x="${fmt((x1 + x2) * 0.5)}" y="${fmt(yLine - 1.6)}" text-anchor="middle" fill="${colInk}" font-size="3.3" font-weight="700">${escXml(label)}</text>`
    );
  };

  const drawDimV = (y1, y2, xLine, xRef, label) => {
    const ym = (y1 + y2) * 0.5;
    dimElements.push(
      `<line x1="${fmt(xRef)}" y1="${fmt(y1)}" x2="${fmt(xLine - 2)}" y2="${fmt(y1)}" stroke="${colMuted}" stroke-width="0.2" stroke-dasharray="1.5,1" />`,
      `<line x1="${fmt(xRef)}" y1="${fmt(y2)}" x2="${fmt(xLine - 2)}" y2="${fmt(y2)}" stroke="${colMuted}" stroke-width="0.2" stroke-dasharray="1.5,1" />`,
      `<line x1="${fmt(xLine)}" y1="${fmt(y1)}" x2="${fmt(xLine)}" y2="${fmt(y2)}" stroke="${colT2}" stroke-width="0.3" />`,
      `<polygon points="${fmt(xLine)},${fmt(y1)} ${fmt(xLine - 0.8)},${fmt(y1 + 2.2)} ${fmt(xLine + 0.8)},${fmt(y1 + 2.2)}" fill="${colT2}" />`,
      `<polygon points="${fmt(xLine)},${fmt(y2)} ${fmt(xLine - 0.8)},${fmt(y2 - 2.2)} ${fmt(xLine + 0.8)},${fmt(y2 - 2.2)}" fill="${colT2}" />`,
      `<text x="${fmt(xLine - 2.2)}" y="${fmt(ym)}" text-anchor="middle" transform="rotate(-90 ${fmt(xLine - 2.2)} ${fmt(ym)})" fill="${colInk}" font-size="3.3" font-weight="700">${escXml(label)}</text>`
    );
  };

  // Üst plaka toplam X ölçüsü + M6 vida açıklığı ölçüsü
  drawDimH(ox, ox + W, oy - 14, oy, `PLAKA EN = ${fmt(W, 1)} mm`);
  drawDimH(
    ox + spec.boltEdgeMargin,
    ox + W - spec.boltEdgeMargin,
    oy - 6.5,
    oy + spec.boltEdgeMargin,
    `M6 VİDA AKS = ${fmt(spec.boltSpanX, 1)} mm (${spec.boltStepsX}×${spec.vidaAraligi}mm)`
  );

  // Sol plaka toplam Y ölçüsü + M6 Y vida açıklığı
  drawDimV(oy, oy + H, ox - 15, ox, `PLAKA BOY = ${fmt(H, 1)} mm`);
  drawDimV(
    oy + spec.boltEdgeMargin,
    oy + H - spec.boltEdgeMargin,
    ox - 7,
    ox + spec.boltEdgeMargin,
    `M6 AKS = ${fmt(spec.boltSpanY, 1)} mm (${spec.boltStepsY}×${spec.vidaAraligi}mm)`
  );

  // Sol-alt (0,0) referans etiketi
  dimElements.push(
    `<text x="${fmt(originSvgX + 4)}" y="${fmt(originSvgY + 7.2)}" fill="${colT1}" font-size="3.1" font-weight="700">LAZER (0,0) ORİJİN &amp; 45° POKAYOKE PAHI</text>`
  );

  // Sağ Yan Panel: KESİT A-A Şematik Detayı ve LightBurn Renk Anahtarı
  const secX = ox + W + 10;
  const secW = padRight - 16;
  const secY = oy;
  const secBoxH = Math.max(92, H);

  // Kesit A-A çizimi (Ölçeklendirilmiş şematik yuva + ürün + M6 havşa kesiti)
  const diagCx = secX + secW * 0.5;
  const diagBaseY = secY + 46;
  const zScale = Math.min(2.2, 24 / spec.plateZ);
  const pHpx = spec.plateZ * zScale;
  const dPx = spec.yuvaDerinligi * zScale;
  const blockHalfW = secW * 0.42;
  const cavHalfPx = secW * 0.22;

  let sectionPocketPath = '';
  let sectionPartSvg = '';
  if (spec.shape === 'Cylindrical_Pen') {
    const troughHalfPx = Math.max(3, cavHalfPx * 0.25);
    sectionPocketPath = `M${fmt(diagCx - blockHalfW)} ${fmt(diagBaseY - pHpx)} L${fmt(diagCx - cavHalfPx)} ${fmt(diagBaseY - pHpx)} L${fmt(diagCx - troughHalfPx)} ${fmt(diagBaseY - pHpx + dPx)} L${fmt(diagCx + troughHalfPx)} ${fmt(diagBaseY - pHpx + dPx)} L${fmt(diagCx + cavHalfPx)} ${fmt(diagBaseY - pHpx)} L${fmt(diagCx + blockHalfW)} ${fmt(diagBaseY - pHpx)} L${fmt(diagCx + blockHalfW)} ${fmt(diagBaseY)} L${fmt(diagCx - blockHalfW)} ${fmt(diagBaseY)} Z`;
    const rPx = cavHalfPx * 0.78;
    const cylCy = diagBaseY - pHpx + dPx - rPx * 0.35;
    sectionPartSvg = `<circle cx="${fmt(diagCx)}" cy="${fmt(cylCy)}" r="${fmt(rPx)}" fill="rgba(59,130,246,0.22)" stroke="${colC01}" stroke-width="0.45" />`;
  } else {
    sectionPocketPath = `M${fmt(diagCx - blockHalfW)} ${fmt(diagBaseY - pHpx)} L${fmt(diagCx - cavHalfPx)} ${fmt(diagBaseY - pHpx)} L${fmt(diagCx - cavHalfPx)} ${fmt(diagBaseY - pHpx + dPx)} L${fmt(diagCx + cavHalfPx)} ${fmt(diagBaseY - pHpx + dPx)} L${fmt(diagCx + cavHalfPx)} ${fmt(diagBaseY - pHpx)} L${fmt(diagCx + blockHalfW)} ${fmt(diagBaseY - pHpx)} L${fmt(diagCx + blockHalfW)} ${fmt(diagBaseY)} L${fmt(diagCx - blockHalfW)} ${fmt(diagBaseY)} Z`;
    const partHpx = Math.max(2.2, Math.min(pHpx * 0.7, spec.urunKalinligi * zScale));
    sectionPartSvg = `<rect x="${fmt(diagCx - cavHalfPx + 1.1)}" y="${fmt(diagBaseY - pHpx + dPx - partHpx)}" width="${fmt((cavHalfPx - 1.1) * 2)}" height="${fmt(partHpx)}" fill="rgba(59,130,246,0.22)" stroke="${colC01}" stroke-width="0.45" />`;
  }

  // ISO Türkçe İMALAT ANTETİ (Alt Başlık Bloğu)
  const antetX = 6;
  const antetW = totalW - 12;
  const antetY = oy + H + 16;
  const antetInnerH = antetH - 6;
  const dateStr = new Date().toISOString().slice(0, 10);
  const partCode = `JIG-${spec.customModel ? 'OZL' : spec.shape === 'Rect_Card' ? 'KRT' : spec.shape === 'Cylindrical_Pen' ? 'VKL' : 'JTN'}-${spec.satirAdedi}X${spec.sutunAdedi}-M6G${spec.vidaAraligi}`;

  const c1 = antetX + antetW * 0.28;
  const c2 = antetX + antetW * 0.56;
  const c3 = antetX + antetW * 0.80;
  const r1 = antetY + antetInnerH * 0.34;
  const r2 = antetY + antetInnerH * 0.67;

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- CIFT AMACLI IMALAT ANTETI & 1:1 LIGHTBURN VEKTOR SABLONU | 1 BIRIM = 1.000 MM -->
<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(totalW)}mm" height="${fmt(totalH)}mm" viewBox="0 0 ${fmt(totalW)} ${fmt(totalH)}" font-family="JetBrains Mono, Consolas, Arial, sans-serif">
  <rect x="0" y="0" width="${fmt(totalW)}" height="${fmt(totalH)}" fill="${colBg}" />
  <rect x="3" y="3" width="${fmt(totalW - 6)}" height="${fmt(totalH - 6)}" fill="none" stroke="${colGridLine}" stroke-width="0.35" />

  <!-- 1:1 GERÇEK ÖLÇEKLİ LIGHTBURN HİZALAMA KATMANLARI -->
  <g id="LIGHTBURN_1TO1_TEMPLATE">
    <g id="C00_FIKSTUR_DIS_KESIM" fill="${forScreenDark ? 'rgba(255,255,255,0.02)' : '#FAFAFA'}" stroke="${colC00}" stroke-width="0.40">
      <path d="${outerPathD}" />
    </g>
    <g id="C03_M6_BREADBOARD_DELIKLERI" fill="none" stroke="${colC03Export}" stroke-width="0.28">
      ${c03Shapes.join('\n      ')}
    </g>
    <g id="C02_NEGATIF_YUVA_KESIM" fill="${forScreenDark ? 'rgba(239,68,68,0.06)' : 'rgba(255,0,0,0.03)'}" stroke="${colC02}" stroke-width="0.30">
      ${c02Paths.join('\n      ')}
    </g>
    <g id="C01_NET_URUN_SINIRI" fill="none" stroke="${colC01}" stroke-width="0.26">
      ${c01Shapes.join('\n      ')}
    </g>
    <g id="T1_MERKEZ_VE_ORIJIN" fill="none" stroke="${colT1}" stroke-width="0.22">
      ${t1Marks.join('\n      ')}
    </g>
    <g id="T2_YUVA_KODLARI" fill="${colT2}" font-weight="700">
      ${t2Labels.join('\n      ')}
    </g>
  </g>

  <!-- MÜHENDİSLİK ÖLÇÜLENDİRME VE KESİT DETAYI (T2) -->
  <g id="T2_TEKNIK_OLCULENDIRME">
    ${dimElements.join('\n    ')}

    <!-- SAĞ YAN KESİT & LIGHTBURN REHBER KUTUSU -->
    <rect x="${fmt(secX)}" y="${fmt(secY)}" width="${fmt(secW)}" height="${fmt(Math.min(secBoxH, H))}" fill="${colPanelBg}" stroke="${colGridLine}" stroke-width="0.3" rx="1.5" />
    <text x="${fmt(diagCx)}" y="${fmt(secY + 6.5)}" text-anchor="middle" fill="${colInk}" font-size="3.3" font-weight="700">KESİT A-A (${spec.shape === 'Cylindrical_Pen' ? '90° V-YATAK' : 'NEGATİF YUVA'})</text>
    <path d="${sectionPocketPath}" fill="${forScreenDark ? '#232832' : '#E2E8F0'}" stroke="${colInk}" stroke-width="0.4" />
    ${sectionPartSvg}
    <line x1="${fmt(diagCx - blockHalfW - 3)}" y1="${fmt(diagBaseY)}" x2="${fmt(diagCx + blockHalfW + 3)}" y2="${fmt(diagBaseY)}" stroke="${colT1}" stroke-width="0.3" stroke-dasharray="2,1" />
    <text x="${fmt(diagCx)}" y="${fmt(diagBaseY + 4.5)}" text-anchor="middle" fill="${colMuted}" font-size="2.5">Z=0.00 OPTİK MASA YÜZEYİ</text>
    <text x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 11)}" fill="${colInk}" font-size="2.7">• Plaka Z: ${fmt(spec.plateZ, 2)} mm (Taban ${fmt(spec.tabanKalinligi, 1)}mm)</text>
    <text x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 15.5)}" fill="${colInk}" font-size="2.7">• Yuva Derinlik: ${fmt(spec.yuvaDerinligi, 2)} mm</text>
    <text x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 20.0)}" fill="${colC02}" font-size="2.7" font-weight="700">• Boşluk Payı: +${fmt(spec.netBoslukDelta, 2)} mm</text>
    <text x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 24.5)}" fill="${colT1}" font-size="2.7" font-weight="700">• Lazer Z-Odak: ${fmt(spec.zFocusTop, 2)} mm</text>

    <!-- LIGHTBURN RENK KATMAN LEJANTI -->
    <line x1="${fmt(secX + 3)}" y1="${fmt(diagBaseY + 29)}" x2="${fmt(secX + secW - 3)}" y2="${fmt(diagBaseY + 29)}" stroke="${colGridLine}" stroke-width="0.25" />
    <text x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 34)}" fill="${colInk}" font-size="2.8" font-weight="700">LIGHTBURN KATMAN EŞLEŞMESİ:</text>
    <rect x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 36.5)}" width="3" height="3" fill="${colC00}" />
    <text x="${fmt(secX + 9)}" y="${fmt(diagBaseY + 39)}" fill="${colMuted}" font-size="2.5">C00 Siyah: Fikstür Dış Kesim</text>
    <rect x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 41.2)}" width="3" height="3" fill="${colC01}" />
    <text x="${fmt(secX + 9)}" y="${fmt(diagBaseY + 43.7)}" fill="${colMuted}" font-size="2.5">C01 Mavi: Net Ürün Baskı Sınırı</text>
    <rect x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 45.9)}" width="3" height="3" fill="${colC02}" />
    <text x="${fmt(secX + 9)}" y="${fmt(diagBaseY + 48.4)}" fill="${colMuted}" font-size="2.5">C02 Kırmızı: Yuva + Parmak Oyuğu</text>
    <rect x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 50.6)}" width="3" height="3" fill="${colC03Export}" />
    <text x="${fmt(secX + 9)}" y="${fmt(diagBaseY + 53.1)}" fill="${colMuted}" font-size="2.5">C03 Yeşil: M6 (${spec.vidaAraligi}mm) Bağlantı</text>
    <rect x="${fmt(secX + 4)}" y="${fmt(diagBaseY + 55.3)}" width="3" height="3" fill="${colT1}" />
    <text x="${fmt(secX + 9)}" y="${fmt(diagBaseY + 57.8)}" fill="${colMuted}" font-size="2.5">T1 Turuncu: Merkez &amp; (0,0) Nişangah</text>
  </g>

  <!-- ISO / DIN TÜRKÇE İMALAT ANTETİ (TITLE BLOCK) -->
  <g id="IMALAT_ANTETI">
    <rect x="${fmt(antetX)}" y="${fmt(antetY)}" width="${fmt(antetW)}" height="${fmt(antetInnerH)}" fill="${colPanelBg}" stroke="${colInk}" stroke-width="0.45" />
    <line x1="${fmt(antetX)}" y1="${fmt(r1)}" x2="${fmt(antetX + antetW)}" y2="${fmt(r1)}" stroke="${colGridLine}" stroke-width="0.3" />
    <line x1="${fmt(antetX)}" y1="${fmt(r2)}" x2="${fmt(antetX + antetW)}" y2="${fmt(r2)}" stroke="${colGridLine}" stroke-width="0.3" />
    <line x1="${fmt(c1)}" y1="${fmt(antetY)}" x2="${fmt(c1)}" y2="${fmt(antetY + antetInnerH)}" stroke="${colGridLine}" stroke-width="0.3" />
    <line x1="${fmt(c2)}" y1="${fmt(antetY)}" x2="${fmt(c2)}" y2="${fmt(antetY + antetInnerH)}" stroke="${colGridLine}" stroke-width="0.3" />
    <line x1="${fmt(c3)}" y1="${fmt(antetY)}" x2="${fmt(c3)}" y2="${fmt(antetY + antetInnerH)}" stroke="${colGridLine}" stroke-width="0.3" />

    <!-- Satır 1 -->
    <text x="${fmt(antetX + 3)}" y="${fmt(antetY + 5)}" fill="${colMuted}" font-size="2.4">İMALAT ANTETİ // PROJE ADI</text>
    <text x="${fmt(antetX + 3)}" y="${fmt(antetY + 11.5)}" fill="${colInk}" font-size="3.6" font-weight="700">LAZER &amp; UV ÇOKLU HİZALAMA FİKSTÜRÜ</text>
    <text x="${fmt(antetX + 3)}" y="${fmt(antetY + 16.5)}" fill="${colT1}" font-size="2.7" font-weight="700">KOD: ${escXml(partCode)}</text>

    <text x="${fmt(c1 + 3)}" y="${fmt(antetY + 5)}" fill="${colMuted}" font-size="2.4">ÜRÜN ŞEKLİ &amp; NOMİNAL ÖLÇÜ</text>
    <text x="${fmt(c1 + 3)}" y="${fmt(antetY + 11.5)}" fill="${colInk}" font-size="3.3" font-weight="700">${escXml(spec.shapeLabelTr)}</text>
    <text x="${fmt(c1 + 3)}" y="${fmt(antetY + 16.5)}" fill="${colC01}" font-size="2.8">${spec.shape === 'Round_Token' ? `Ø${fmt(spec.urunEn, 2)} mm` : `${fmt(spec.urunEn, 2)} × ${fmt(spec.urunBoy, 2)} mm`} (Z=${fmt(spec.urunKalinligi, 2)}mm)</text>

    <text x="${fmt(c2 + 3)}" y="${fmt(antetY + 5)}" fill="${colMuted}" font-size="2.4">NEGATİF YUVA ÖLÇÜSÜ &amp; BOŞLUK</text>
    <text x="${fmt(c2 + 3)}" y="${fmt(antetY + 11.5)}" fill="${colC02}" font-size="3.3" font-weight="700">${spec.shape === 'Round_Token' ? `Ø${fmt(spec.pocketW, 2)} mm` : `${fmt(spec.pocketW, 2)} × ${fmt(spec.pocketL, 2)} mm`}</text>
    <text x="${fmt(c2 + 3)}" y="${fmt(antetY + 16.5)}" fill="${colInk}" font-size="2.7">Pay: +${fmt(spec.netBoslukDelta, 2)} mm | Derinlik: ${fmt(spec.yuvaDerinligi, 2)} mm</text>

    <text x="${fmt(c3 + 3)}" y="${fmt(antetY + 5)}" fill="${colMuted}" font-size="2.4">ÖLÇEK / BİRİM / TARİH</text>
    <text x="${fmt(c3 + 3)}" y="${fmt(antetY + 11.5)}" fill="${colInk}" font-size="3.5" font-weight="700">1 : 1 (TAM ÖLÇEK MM)</text>
    <text x="${fmt(c3 + 3)}" y="${fmt(antetY + 16.5)}" fill="${colMuted}" font-size="2.7">ISO 2768-mK | ${dateStr}</text>

    <!-- Satır 2 -->
    <text x="${fmt(antetX + 3)}" y="${fmt(r1 + 5)}" fill="${colMuted}" font-size="2.4">MATRİS DİZİLİM &amp; HATVE (PITCH)</text>
    <text x="${fmt(antetX + 3)}" y="${fmt(r1 + 11.5)}" fill="${colInk}" font-size="3.2" font-weight="700">${spec.satirAdedi} Satır × ${spec.sutunAdedi} Sütun = ${spec.totalCavities} Yuva</text>
    <text x="${fmt(antetX + 3)}" y="${fmt(r1 + 16.5)}" fill="${colMuted}" font-size="2.7">Pitch X: ${fmt(spec.pitchX, 2)} mm | Pitch Y: ${fmt(spec.pitchY, 2)} mm</text>

    <text x="${fmt(c1 + 3)}" y="${fmt(r1 + 5)}" fill="${colMuted}" font-size="2.4">OPTİK BREADBOARD BAĞLANTI</text>
    <text x="${fmt(c1 + 3)}" y="${fmt(r1 + 11.5)}" fill="${colC03}" font-size="3.2" font-weight="700">M6 Vida Aralığı: ${spec.vidaAraligi} mm (${spec.m6Holes.length} Delik)</text>
    <text x="${fmt(c1 + 3)}" y="${fmt(r1 + 16.5)}" fill="${colMuted}" font-size="2.7">Ø6.6 Geçiş + Ø11.0 DIN 912 İmbus Havşa</text>

    <text x="${fmt(c2 + 3)}" y="${fmt(r1 + 5)}" fill="${colMuted}" font-size="2.4">ERGONOMİ &amp; YÜKLEME DETAYI</text>
    <text x="${fmt(c2 + 3)}" y="${fmt(r1 + 11.5)}" fill="${colInk}" font-size="3.1" font-weight="700">Parmak Alma Oyuğu: ${spec.parmakOyugu ? `AKTİF (R=${fmt(spec.scoopRadius, 1)}mm)` : 'KAPALI'}</text>
    <text x="${fmt(c2 + 3)}" y="${fmt(r1 + 16.5)}" fill="${colMuted}" font-size="2.7">${spec.shape === 'Cylindrical_Pen' ? '90° V-Yatak Otomatik Merkezleme' : 'Alt Parmak Kaldırma Havuzu Dahil'}</text>

    <text x="${fmt(c3 + 3)}" y="${fmt(r1 + 5)}" fill="${colMuted}" font-size="2.4">GALVO LAZER / UV Z-ODAK</text>
    <text x="${fmt(c3 + 3)}" y="${fmt(r1 + 11.5)}" fill="${colT1}" font-size="3.4" font-weight="700">Z_Odak = ${fmt(spec.zFocusTop, 2)} mm</text>
    <text x="${fmt(c3 + 3)}" y="${fmt(r1 + 16.5)}" fill="${colMuted}" font-size="2.6">Masadan Üst Baskı Yüzeyine</text>

    <!-- Satır 3 -->
    <text x="${fmt(antetX + 3)}" y="${fmt(r2 + 5)}" fill="${colMuted}" font-size="2.4">MALZEME &amp; PROSES</text>
    <text x="${fmt(antetX + 3)}" y="${fmt(r2 + 11.5)}" fill="${colInk}" font-size="3.0" font-weight="700">${escXml(spec.material.shortName)} (${fmt(spec.material.densityGcm3, 2)} g/cm³)</text>
    <text x="${fmt(antetX + 3)}" y="${fmt(r2 + 16)}" fill="${colMuted}" font-size="2.5">${escXml(spec.material.process)}</text>

    <text x="${fmt(c1 + 3)}" y="${fmt(r2 + 5)}" fill="${colMuted}" font-size="2.4">DIŞ ZARF &amp; NET HACİM</text>
    <text x="${fmt(c1 + 3)}" y="${fmt(r2 + 11.5)}" fill="${colInk}" font-size="3.1" font-weight="700">${fmt(spec.plateW, 1)} × ${fmt(spec.plateH, 1)} × ${fmt(spec.plateZ, 1)} mm</text>
    <text x="${fmt(c1 + 3)}" y="${fmt(r2 + 16)}" fill="${colMuted}" font-size="2.6">Hacim: ${fmt(metrology.volumeCm3, 2)} cm³ | Kütle: ${fmt(metrology.effectiveMassG, 1)} g</text>

    <text x="${fmt(c2 + 3)}" y="${fmt(r2 + 5)}" fill="${colMuted}" font-size="2.4">ÜRETİM VERİMLİLİĞİ</text>
    <text x="${fmt(c2 + 3)}" y="${fmt(r2 + 11.5)}" fill="${colInk}" font-size="3.1" font-weight="700">~${metrology.partsPerHour} Parça / Saat</text>
    <text x="${fmt(c2 + 3)}" y="${fmt(r2 + 16)}" fill="${colMuted}" font-size="2.6">Parti Çevrimi: ${metrology.batchCycleSec} sn / ${spec.totalCavities} Adet</text>

    <text x="${fmt(c3 + 3)}" y="${fmt(r2 + 5)}" fill="${colMuted}" font-size="2.4">B2B BİRİM TEKLİF (1 AD.)</text>
    <text x="${fmt(c3 + 3)}" y="${fmt(r2 + 11.5)}" fill="${colC03}" font-size="3.5" font-weight="700">${metrology.unitQuoteTry.toLocaleString('tr-TR')} TL</text>
    <text x="${fmt(c3 + 3)}" y="${fmt(r2 + 16)}" fill="${colMuted}" font-size="2.6">(~${fmt(metrology.unitQuoteUsd, 1)} USD + KDV)</text>
  </g>
</svg>`;
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

/**
 * İkili (Binary) .STL İhracatçısı (1 Birim = 1.000 mm, Z-Yukarı 1. Bölge [0..PlateW]x[0..PlateH]x[0..PlateZ]).
 * Dilimleyicilerde (Bambu Studio, PrusaSlicer, Cura) ve SolidWorks/Fusion 360'ta tam 1:1 mm tabla üstü açılır.
 */
export function generateBinarySTL(geometry, spec) {
  const pos = geometry.attributes.position;
  const triCount = pos.count / 3;
  const buffer = new ArrayBuffer(84 + triCount * 50);
  const view = new DataView(buffer);

  // 80 byte ASCII başlık
  const headerText = `LAZER_UV_JIG_${spec.plateW}x${spec.plateH}x${spec.plateZ}MM_1TO1_METRIC`;
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < headerText.length ? headerText.charCodeAt(i) : 32);
  }
  view.setUint32(80, triCount, true);

  const halfPW = spec.plateW * 0.5;
  const halfPH = spec.plateH * 0.5;

  // Three.js (x, y, z) -> CAD Z-Up (X = x + halfPW, Y = -z + halfPH, Z = y)
  const toCAD = (idx) => [
    pos.getX(idx) + halfPW,
    -pos.getZ(idx) + halfPH,
    pos.getY(idx)
  ];

  let offset = 84;
  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const A = toCAD(i0);
    const B = toCAD(i0 + 1);
    const C = toCAD(i0 + 2);

    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;

    view.setFloat32(offset, nx, true); offset += 4;
    view.setFloat32(offset, ny, true); offset += 4;
    view.setFloat32(offset, nz, true); offset += 4;

    for (const P of [A, B, C]) {
      view.setFloat32(offset, P[0], true); offset += 4;
      view.setFloat32(offset, P[1], true); offset += 4;
      view.setFloat32(offset, P[2], true); offset += 4;
    }

    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer;
}

/**
 * B2B Fikstür Teklif, Maliyet & Yuva Koordinat Matrisi (.CSV) Üreticisi (UTF-8 BOM — Türkçe Excel Uyumlu)
 */
export function generateB2BQuoteCSV(spec, metrology) {
  const partCode = `JIG-${spec.customModel ? 'OZL' : spec.shape === 'Rect_Card' ? 'KRT' : spec.shape === 'Cylindrical_Pen' ? 'VKL' : 'JTN'}-${spec.satirAdedi}X${spec.sutunAdedi}-M6G${spec.vidaAraligi}`;
  const nowStr = new Date().toLocaleString('tr-TR');

  const rows = [
    ['B2B LAZER MARKALAMA & UV BASKI FİKSTÜR TEKLİF VE TEKNİK ŞARTNAME FORMU'],
    ['Belge Tarihi', nowStr],
    ['Parça Kodu', partCode],
    [],
    ['1. PARAMETRİK FİKSTÜR KONTROLLERİ', 'DEĞER', 'BİRİM / AÇIKLAMA'],
    ['Urun_Sekli', spec.shape, spec.shapeLabelTr],
    ['Urun_En_mm', fmt(spec.urunEn, 2), 'mm'],
    ['Urun_Boy_mm', fmt(spec.urunBoy, 2), 'mm'],
    ['Urun_Kalinligi_mm', fmt(spec.urunKalinligi, 2), 'mm'],
    ['Yuva_Derinligi_mm', fmt(spec.yuvaDerinligi, 2), 'mm'],
    ['Yuva_Bosluk_Payi_mm', `+${fmt(spec.yuvaBoslukPayi, 2)}`, `Net Yuva Farkı: +${fmt(spec.netBoslukDelta, 2)} mm (${spec.boslukModu})`],
    ['Satir_Adedi', spec.satirAdedi, 'Satır (Y)'],
    ['Sutun_Adedi', spec.sutunAdedi, 'Sütun (X)'],
    ['Toplam_Yuva_Kapasitesi', spec.totalCavities, 'Adet / Çevrim'],
    ['Lazer_Masa_Vida_Araligi_mm', spec.vidaAraligi, `M6 Optik Breadboard (${spec.m6Holes.length} Adet Havşalı M6 Delik)`],
    ['Parmak_Alma_Oyugu', spec.parmakOyugu ? 'AKTİF' : 'KAPALI', spec.parmakOyugu ? `R=${fmt(spec.scoopRadius, 1)}mm Ergonomik Boşaltma` : 'Standart Düz Kenar'],
    [],
    ['2. CAD METROLOJİ & GALVO/UV HİZALAMA VERİLERİ', 'DEĞER', 'BİRİM'],
    ['Plaka_Dis_En_X', fmt(spec.plateW, 2), 'mm'],
    ['Plaka_Dis_Boy_Y', fmt(spec.plateH, 2), 'mm'],
    ['Plaka_Toplam_Yukseklik_Z', fmt(spec.plateZ, 2), 'mm'],
    ['Net_Yuva_En_X', fmt(spec.pocketW, 2), 'mm'],
    ['Net_Yuva_Boy_Y', fmt(spec.pocketL, 2), 'mm'],
    ['Merkez_Hatve_Pitch_X', fmt(spec.pitchX, 2), 'mm'],
    ['Merkez_Hatve_Pitch_Y', fmt(spec.pitchY, 2), 'mm'],
    ['Lazer_UV_Odak_Yuksekligi_Z', fmt(spec.zFocusTop, 2), 'mm (Optik Masa Z=0 Yüzeyinden)'],
    ['Secili_Malzeme', spec.material.name, `${fmt(spec.material.densityGcm3, 2)} g/cm³`],
    ['Net_CAD_Hacmi', fmt(metrology.volumeCm3, 2), 'cm³'],
    ['Efektif_Parca_Kutlesi', fmt(metrology.effectiveMassG, 1), 'g'],
    ['Tahmini_Imalat_Suresi', metrology.cycleMinutes, 'dakika'],
    ['Tahmini_Baski_Verimliligi', metrology.partsPerHour, 'Adet / Saat'],
    [],
    ['3. BİRİM MALİYET KIRILIMI (1 ADET BAZ)', 'TUTAR (TL)', 'NOT'],
    ['Hammadde Maliyeti', metrology.rawMaterialCostTry, spec.material.shortName],
    ['Makine / İşleme Maliyeti', metrology.machineCostTry, `${fmt(metrology.cycleHours, 2)} Saat İşleme`],
    ['M6 Paslanmaz Civata & Pul Donanımı', metrology.hardwareCostTry, `${spec.m6Holes.length}x DIN 912 M6x16`],
    ['CAM & 1:1 LightBurn Şablon Kurulumu', metrology.setupFeeTry, 'Tek Seferlik Mühendislik Hazırlığı'],
    [],
    ['4. B2B ADET BAZLI TEKLİF TABLOSU', 'İSKONTO (%)', 'BİRİM FİYAT (TL)', 'TOPLAM TUTAR (TL)', 'BİRİM FİYAT (USD)'],
    ...metrology.tiers.map((t) => [
      t.label,
      `%${t.discountPct}`,
      t.unitTry,
      t.totalTry,
      fmt(t.unitUsd, 2)
    ]),
    [],
    ['5. YUVA MERKEZ KOORDİNAT TABLOSU (SOL-ALT 0,0 REFERANSLI)', 'X_MERKEZ_MM', 'Y_MERKEZ_MM', 'LIGHTBURN_SVG_Y_MM'],
    ...spec.cavities.map((c) => [
      c.code,
      fmt(c.cx, 3),
      fmt(c.cy, 3),
      fmt(spec.plateH - c.cy, 3)
    ])
  ];

  const csvBody = rows
    .map((r) =>
      r
        .map((cell) => {
          const str = String(cell ?? '');
          return str.includes(';') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(';')
    )
    .join('\r\n');

  return '\uFEFF' + csvBody;
}

/**
 * 1:1 AutoCAD / CNC / Lazer .DXF İhracatçısı (mm birimli, katmanlı LWPOLYLINE & CIRCLE)
 */
export function generateDXF(spec) {
  const lines = [
    '0', 'SECTION', '2', 'HEADER',
    '9', '$INSUNITS', '70', '4', // 4 = Millimeters
    '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES'
  ];

  const addClosedPoly = (pts, layer, colorAci) => {
    lines.push('0', 'LWPOLYLINE', '8', layer, '62', String(colorAci), '90', String(pts.length), '70', '1');
    for (const p of pts) {
      lines.push('10', fmt(p.x, 4), '20', fmt(p.y, 4));
    }
  };

  const addCircle = (cx, cy, r, layer, colorAci) => {
    lines.push('0', 'CIRCLE', '8', layer, '62', String(colorAci), '10', fmt(cx, 4), '20', fmt(cy, 4), '30', '0.0', '40', fmt(r, 4));
  };

  // Dış plaka (ACI 7 = Beyaz/Siyah)
  addClosedPoly(buildOuterPlateContour2D(spec, 10), 'C00_DIS_PLAKA', 7);

  // M6 bağlantı delikleri (ACI 3 = Yeşil)
  for (const h of spec.m6Holes) {
    addCircle(h.x, h.y, spec.m6ThroughR, 'C03_M6_GECIS', 3);
    addCircle(h.x, h.y, spec.cboreOuterR, 'C03_M6_HAVSA', 3);
  }

  // Yuvalar ve Net Ürün Sınırları
  for (const cav of spec.cavities) {
    const cavPts = buildCavityContour2D(spec, cav.cx, cav.cy, { wGrow: 0, lGrow: 0, scoopScale: 1.0 });
    addClosedPoly(cavPts, 'C02_NEGATIF_YUVA', 1); // ACI 1 = Kırmızı

    if (spec.customModel && spec.customModel.zeroProductSilhouette2D) {
      const prodPts = spec.customModel.zeroProductSilhouette2D.map((p) => ({
        x: cav.cx + p.x,
        y: cav.cy + p.y
      }));
      addClosedPoly(prodPts, 'C01_URUN_SINIRI', 5); // ACI 5 = Mavi
    } else if (spec.shape === 'Round_Token') {
      addCircle(cav.cx, cav.cy, spec.urunEn * 0.5, 'C01_URUN_SINIRI', 5); // ACI 5 = Mavi
    } else {
      const hw = spec.urunEn * 0.5;
      const hl = spec.urunBoy * 0.5;
      addClosedPoly(
        [
          { x: cav.cx - hw, y: cav.cy - hl },
          { x: cav.cx + hw, y: cav.cy - hl },
          { x: cav.cx + hw, y: cav.cy + hl },
          { x: cav.cx - hw, y: cav.cy + hl }
        ],
        'C01_URUN_SINIRI',
        5
      );
    }
  }

  lines.push('0', 'ENDSEC', '0', 'EOF');
  return lines.join('\r\n');
}

/**
 * Parametrik OpenSCAD (.SCAD) Kaynak Kodu İhracatçısı
 */
export function generateOpenSCAD(spec) {
  return `// ============================================================================
// LAZER MARKALAMA & UV BASKI COKLU HIZALAMA FIKSTURU (PARAMETRIK OPENSCAD)
// Olcek: 1 Birim = 1.00 mm | Urun Sekli: ${spec.shape} (${spec.shapeLabelTr})
// ============================================================================
$fn = 64;

Urun_Sekli = "${spec.shape}";
Urun_En_mm = ${fmt(spec.urunEn, 2)};
Urun_Boy_mm = ${fmt(spec.urunBoy, 2)};
Yuva_Derinligi_mm = ${fmt(spec.yuvaDerinligi, 2)};
Net_Bosluk_Payi_mm = ${fmt(spec.netBoslukDelta, 2)};
Satir_Adedi = ${spec.satirAdedi};
Sutun_Adedi = ${spec.sutunAdedi};
Lazer_Masa_Vida_Araligi_mm = ${spec.vidaAraligi};
Parmak_Alma_Oyugu = ${spec.parmakOyugu ? 'true' : 'false'};

Plate_W = ${fmt(spec.plateW, 2)};
Plate_H = ${fmt(spec.plateH, 2)};
Plate_Z = ${fmt(spec.plateZ, 2)};
Pocket_W = ${fmt(spec.pocketW, 3)};
Pocket_L = ${fmt(spec.pocketL, 3)};
Z_Floor = ${fmt(spec.zFloor, 3)};
Scoop_R = ${fmt(spec.scoopRadius, 2)};

Cavity_Centers = [
${spec.cavities.map((c) => `  [${fmt(c.cx, 3)}, ${fmt(c.cy, 3)}] // ${c.code}`).join(',\n')}
];

M6_Holes = [
${spec.m6Holes.map((h) => `  [${fmt(h.x, 3)}, ${fmt(h.y, 3)}] // ${h.id}`).join(',\n')}
];

module outer_plate_2d() {
  difference() {
    offset(r = 5) offset(delta = -5) square([Plate_W, Plate_H]);
    polygon([[0,0], [${fmt(spec.datumChamferMm, 1)}, 0], [0, ${fmt(spec.datumChamferMm, 1)}]]);
  }
}

module single_cavity(cx, cy) {
  translate([cx, cy, Z_Floor]) {
    if (Urun_Sekli == "Custom_Silhouette") {
      linear_extrude(height = Yuva_Derinligi_mm + 1)
        polygon(points = [
${(spec.customLoops ? spec.customLoops.upperWall : []).map((p) => `          [${fmt(p.x, 3)}, ${fmt(p.y, 3)}]`).join(',\n')}
        ]);
    } else if (Urun_Sekli == "Round_Token") {
      cylinder(h = Yuva_Derinligi_mm + 1, d = Pocket_W);
      if (Parmak_Alma_Oyugu)
        translate([0, -Pocket_W/2, -${fmt(spec.scoopSubDepth, 2)}])
          cylinder(h = Yuva_Derinligi_mm + 2, r = Scoop_R);
    } else if (Urun_Sekli == "Cylindrical_Pen") {
      // 90 Derece V-Yatak Profili
      rotate([90, 0, 0])
        linear_extrude(height = Pocket_L, center = true)
          polygon([
            [-Pocket_W/2, Yuva_Derinligi_mm + 1],
            [-Pocket_W/2, ${fmt(spec.vGroove ? spec.vGroove.vDrop : 2, 2)}],
            [-${fmt(spec.vGroove ? spec.vGroove.halfWFloor : 1, 2)}, 0],
            [${fmt(spec.vGroove ? spec.vGroove.halfWFloor : 1, 2)}, 0],
            [Pocket_W/2, ${fmt(spec.vGroove ? spec.vGroove.vDrop : 2, 2)}],
            [Pocket_W/2, Yuva_Derinligi_mm + 1]
          ]);
      if (Parmak_Alma_Oyugu) {
        translate([Pocket_W/2, 0, 1.5]) cylinder(h = Yuva_Derinligi_mm + 1, r = ${fmt(spec.scoopExtX + 2, 2)});
        translate([-Pocket_W/2, 0, 1.5]) cylinder(h = Yuva_Derinligi_mm + 1, r = ${fmt(spec.scoopExtX + 2, 2)});
      }
    } else {
      translate([-Pocket_W/2, -Pocket_L/2, 0])
        cube([Pocket_W, Pocket_L, Yuva_Derinligi_mm + 1]);
      if (Parmak_Alma_Oyugu)
        translate([0, -Pocket_L/2, -${fmt(spec.scoopSubDepth, 2)}])
          cylinder(h = Yuva_Derinligi_mm + 2, r = Scoop_R);
    }
  }
}

difference() {
  linear_extrude(height = Plate_Z) outer_plate_2d();

  for (p = Cavity_Centers) single_cavity(p[0], p[1]);

  for (h = M6_Holes) {
    translate([h[0], h[1], -0.5]) cylinder(h = Plate_Z + 1, d = 6.6);
    translate([h[0], h[1], ${fmt(spec.cboreShoulderZ, 2)}]) cylinder(h = Plate_Z, d = 11.0);
  }
}
`;
}

/**
 * Tarayıcı tarafında anlık dosya indirme yardımcı fonksiyonu
 */
export function triggerDownload(content, filename, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
