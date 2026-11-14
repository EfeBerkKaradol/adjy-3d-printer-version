import * as THREE from 'three';
import { extractCustomCavityLoop2D } from './custom-model.js';

/**
 * Endüstriyel Malzeme Kütüphanesi (Metroloji + B2B Maliyet Katsayıları)
 */
export const JIG_MATERIALS = {
  PETG_CF: {
    id: 'PETG_CF',
    name: 'PETG-CF Karbon Takviyeli (Mat Siyah — Lazer Yansımasız)',
    shortName: 'PETG-CF Mat Siyah',
    densityGcm3: 1.29,
    process: 'Endüstriyel FDM (0.20mm Katman, %35 Gyroid)',
    infillFactor: 0.52, // Kabuklar + %35 iç dolgu efektif kütle çarpanı
    costPerGramTry: 2.15,
    machineRateTryHr: 185,
    cm3PerHour: 26,
    setupFeeTry: 220,
    colorHex: 0x1e2126,
    roughness: 0.68,
    metalness: 0.12
  },
  PLA_MAT: {
    id: 'PLA_MAT',
    name: 'PLA-Pro Mat Antrasit (Hızlı Prototip / UV Baskı)',
    shortName: 'PLA-Pro Mat',
    densityGcm3: 1.24,
    process: 'Hızlı FDM (0.20mm Katman, %30 Grid)',
    infillFactor: 0.46,
    costPerGramTry: 1.35,
    machineRateTryHr: 150,
    cm3PerHour: 32,
    setupFeeTry: 180,
    colorHex: 0x2a2e35,
    roughness: 0.74,
    metalness: 0.05
  },
  ABS_ASA: {
    id: 'ABS_ASA',
    name: 'ASA / ABS Termal Dayanımlı (Yoğun Fiber Lazer Isısına Dirençli)',
    shortName: 'ASA Endüstriyel',
    densityGcm3: 1.07,
    process: 'Kapalı Kabin FDM (%40 Dolgu)',
    infillFactor: 0.56,
    costPerGramTry: 1.85,
    machineRateTryHr: 195,
    cm3PerHour: 24,
    setupFeeTry: 240,
    colorHex: 0x23262b,
    roughness: 0.58,
    metalness: 0.08
  },
  DELRIN_POM: {
    id: 'DELRIN_POM',
    name: 'POM-C (Delrin) Siyah Mühendislik Plastiği (3-Eksen CNC)',
    shortName: 'POM-C Delrin CNC',
    densityGcm3: 1.41,
    process: '3-Eksen Hassas CNC Dik İşleme (±0.03mm)',
    infillFactor: 1.0,
    costPerGramTry: 1.95,
    machineRateTryHr: 920,
    cm3PerHour: 85,
    setupFeeTry: 650,
    colorHex: 0x17191d,
    roughness: 0.38,
    metalness: 0.06
  },
  ALU_6061: {
    id: 'ALU_6061',
    name: 'Alüminyum 6061-T6 Siyah Sert Eloksal (Ağır Hizmet CNC Fikstür)',
    shortName: 'Al 6061-T6 Eloksal',
    densityGcm3: 2.70,
    process: '3-Eksen CNC + Mat Siyah Eloksal Kaplama (±0.02mm)',
    infillFactor: 1.0,
    costPerGramTry: 1.65,
    machineRateTryHr: 1350,
    cm3PerHour: 65,
    setupFeeTry: 950,
    colorHex: 0x22252a,
    roughness: 0.32,
    metalness: 0.72
  }
};

/**
 * Hazır Endüstriyel Fikstür Şablonları (Presets)
 */
export const JIG_PRESETS = {
  metal_card: {
    label: 'ISO Metal Kartvizit / NFC Kart (54×85.6 mm)',
    Urun_Sekli: 'Rect_Card',
    Urun_En_mm: 54.0,
    Urun_Boy_mm: 85.6,
    Yuva_Derinligi_mm: 3.5,
    Yuva_Bosluk_Payi_mm: 0.25,
    Bosluk_Modu: 'toplam',
    Satir_Adedi: 2,
    Sutun_Adedi: 3,
    Lazer_Masa_Vida_Araligi_mm: 25,
    Parmak_Alma_Oyugu: true,
    Taban_Kalinligi_mm: 3.5,
    Ara_Duvar_mm: 8.0,
    Urun_Kalinligi_mm: 0.8,
    Malzeme_Kodu: 'PETG_CF'
  },
  laser_pen: {
    label: 'Promosyon Metal Kalem V-Yatak (Ø10.5×138 mm)',
    Urun_Sekli: 'Cylindrical_Pen',
    Urun_En_mm: 10.5,
    Urun_Boy_mm: 138.0,
    Yuva_Derinligi_mm: 5.5,
    Yuva_Bosluk_Payi_mm: 0.25,
    Bosluk_Modu: 'toplam',
    Satir_Adedi: 1,
    Sutun_Adedi: 6,
    Lazer_Masa_Vida_Araligi_mm: 25,
    Parmak_Alma_Oyugu: true,
    Taban_Kalinligi_mm: 4.0,
    Ara_Duvar_mm: 8.0,
    Urun_Kalinligi_mm: 10.5,
    Malzeme_Kodu: 'PETG_CF'
  },
  round_token: {
    label: 'Lazer Madalyon / Jeton / Coaster (Ø42 mm)',
    Urun_Sekli: 'Round_Token',
    Urun_En_mm: 42.0,
    Urun_Boy_mm: 42.0,
    Yuva_Derinligi_mm: 3.0,
    Yuva_Bosluk_Payi_mm: 0.25,
    Bosluk_Modu: 'toplam',
    Satir_Adedi: 3,
    Sutun_Adedi: 4,
    Lazer_Masa_Vida_Araligi_mm: 25,
    Parmak_Alma_Oyugu: true,
    Taban_Kalinligi_mm: 3.5,
    Ara_Duvar_mm: 8.0,
    Urun_Kalinligi_mm: 2.5,
    Malzeme_Kodu: 'ALU_6061'
  },
  industrial_tag: {
    label: 'Sanayi Tipi Anodize Makine Etiketi (70×35 mm)',
    Urun_Sekli: 'Rect_Card',
    Urun_En_mm: 70.0,
    Urun_Boy_mm: 35.0,
    Yuva_Derinligi_mm: 2.5,
    Yuva_Bosluk_Payi_mm: 0.25,
    Bosluk_Modu: 'toplam',
    Satir_Adedi: 4,
    Sutun_Adedi: 2,
    Lazer_Masa_Vida_Araligi_mm: 50,
    Parmak_Alma_Oyugu: true,
    Taban_Kalinligi_mm: 4.0,
    Ara_Duvar_mm: 9.0,
    Urun_Kalinligi_mm: 1.0,
    Malzeme_Kodu: 'DELRIN_POM'
  },
  uv_flask: {
    label: 'UV Silindirik Termos / Şişe V-Fikstür (Ø68×155 mm)',
    Urun_Sekli: 'Cylindrical_Pen',
    Urun_En_mm: 68.0,
    Urun_Boy_mm: 155.0,
    Yuva_Derinligi_mm: 12.0,
    Yuva_Bosluk_Payi_mm: 0.30,
    Bosluk_Modu: 'toplam',
    Satir_Adedi: 1,
    Sutun_Adedi: 3,
    Lazer_Masa_Vida_Araligi_mm: 50,
    Parmak_Alma_Oyugu: true,
    Taban_Kalinligi_mm: 5.0,
    Ara_Duvar_mm: 12.0,
    Urun_Kalinligi_mm: 68.0,
    Malzeme_Kodu: 'ABS_ASA'
  }
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const roundTo = (v, step = 0.001) => Math.round(v / step) * step;

/**
 * Parametrelerden tüm mühendislik ölçülerini, M6 optik masa vida koordinatlarını,
 * V-yatak teğetlik matematiğini ve yuva matrisini hesaplar.
 */
export function computeJigSpec(rawParams) {
  const customModel = rawParams.Urun_Sekli === 'Custom_Model' && rawParams.customModel ? rawParams.customModel : null;
  const customPocketMode = ['silhouette', 'v_groove', 'rect_box'].includes(rawParams.Custom_Pocket_Mode)
    ? rawParams.Custom_Pocket_Mode
    : 'silhouette';

  let shape = ['Rect_Card', 'Cylindrical_Pen', 'Round_Token'].includes(rawParams.Urun_Sekli)
    ? rawParams.Urun_Sekli
    : 'Rect_Card';

  if (customModel) {
    shape =
      customPocketMode === 'v_groove'
        ? 'Cylindrical_Pen'
        : customPocketMode === 'rect_box'
        ? 'Rect_Card'
        : 'Custom_Silhouette';
  }

  const urunEn = customModel
    ? clamp(customModel.sizeX, 4, 240)
    : clamp(Number(rawParams.Urun_En_mm) || 54, 10, 120);
  const urunBoyRaw = customModel
    ? clamp(customModel.sizeY, 4, 260)
    : clamp(Number(rawParams.Urun_Boy_mm) || 85.6, 20, 160);
  // Yuvarlak jetonda çap = Urun_En_mm (1:1 dairesel simetri)
  const urunBoy = shape === 'Round_Token' ? urunEn : urunBoyRaw;

  const yuvaDerinligi = clamp(Number(rawParams.Yuva_Derinligi_mm) || 3.5, 2, 15);
  const yuvaBoslukPayi = clamp(Number(rawParams.Yuva_Bosluk_Payi_mm) ?? 0.25, 0.05, 1.5);
  const boslukModu = rawParams.Bosluk_Modu === 'cevre' ? 'cevre' : 'toplam';
  const netBoslukDelta = boslukModu === 'cevre' ? yuvaBoslukPayi * 2.0 : yuvaBoslukPayi;

  const satirAdedi = Math.round(clamp(Number(rawParams.Satir_Adedi) || 2, 1, 6));
  const sutunAdedi = Math.round(clamp(Number(rawParams.Sutun_Adedi) || 3, 1, 6));
  const vidaAraligi = Number(rawParams.Lazer_Masa_Vida_Araligi_mm) === 50 ? 50 : 25;
  const parmakOyugu = Boolean(rawParams.Parmak_Alma_Oyugu);

  const tabanKalinligi = clamp(Number(rawParams.Taban_Kalinligi_mm) || 3.5, 2.5, 12.0);
  const araDuvarMin = clamp(Number(rawParams.Ara_Duvar_mm) || 8.0, 5.0, 30.0);
  const malzemeKodu = JIG_MATERIALS[rawParams.Malzeme_Kodu] ? rawParams.Malzeme_Kodu : 'PETG_CF';
  const material = JIG_MATERIALS[malzemeKodu];

  const urunKalinligi = customModel
    ? clamp(customModel.sizeZ, 0.3, 120.0)
    : shape === 'Cylindrical_Pen'
    ? urunEn
    : clamp(Number(rawParams.Urun_Kalinligi_mm) || (shape === 'Round_Token' ? 2.2 : 0.8), 0.3, 30.0);

  // Net negatif yuva ölçüleri (+Boşluk payı dahil)
  const pocketW = roundTo(urunEn + netBoslukDelta, 0.001);
  const pocketL = roundTo(urunBoy + netBoslukDelta, 0.001);

  // Plaka toplam Z yüksekliği (en az 6.0mm M6 DIN 912 havşa emniyeti için)
  const plateZ = roundTo(Math.max(6.0, yuvaDerinligi + tabanKalinligi), 0.01);
  const zFloor = roundTo(plateZ - yuvaDerinligi, 0.001);

  // Parmak alma oyuğu (Thumb-Scoop) geometrik parametreleri
  let scoopRadius = 0;
  let scoopExtY = 0; // -Y yönünde dışa taşma
  let scoopExtX = 0; // ±X yönünde dışa taşma (Silindirik kalem orta tutuş oyuğu)
  let scoopSubDepth = 0;

  if (parmakOyugu) {
    scoopSubDepth = roundTo(Math.min(0.85, Math.max(0.45, (plateZ - yuvaDerinligi - 1.4) * 0.4)), 0.01);
    if (shape === 'Custom_Silhouette') {
      scoopRadius = roundTo(clamp(Math.min(pocketW, pocketL) * 0.24, 3.8, 10.5), 0.05);
      scoopExtY = scoopRadius;
    } else if (shape === 'Rect_Card') {
      const cornerR = Math.min(1.6, pocketW * 0.08);
      scoopRadius = roundTo(clamp(pocketW * 0.23, 3.0, Math.min(10.5, pocketW * 0.5 - cornerR - 1.1)), 0.05);
      scoopExtY = scoopRadius;
    } else if (shape === 'Round_Token') {
      const rp = pocketW * 0.5;
      scoopRadius = roundTo(clamp(rp * 0.42, 4.2, 10.5), 0.05);
      scoopExtY = scoopRadius;
    } else if (shape === 'Cylindrical_Pen') {
      // Silindirik kalemde merkezden başparmak + işaret parmağı ile kavrama oyukları (±X yönünde simetrik)
      scoopExtX = roundTo(clamp(pocketW * 0.32, 3.8, 8.0), 0.05);
      scoopRadius = roundTo(clamp(pocketL * 0.18, 5.5, 13.0), 0.05);
    }
  }

  // Özel 3D/2D model silüet modunda Z halkalarını yalnızca 1 kez hesapla ve tüm yuvalarda paylaş!
  const entryChamfer = 0.25;
  let customLoops = null;
  if (shape === 'Custom_Silhouette' && customModel) {
    const radialClearance = netBoslukDelta * 0.5;
    const sdf = customModel.sdfData;
    const sR = parmakOyugu ? scoopRadius : 0;
    customLoops = {
      topChamfer: extractCustomCavityLoop2D(sdf, radialClearance + entryChamfer, sR * 1.0, 96),
      upperWall: extractCustomCavityLoop2D(sdf, radialClearance, sR * 0.96, 96),
      midWall: extractCustomCavityLoop2D(sdf, radialClearance, sR * 0.85, 96),
      floor: extractCustomCavityLoop2D(sdf, radialClearance, sR * 0.72, 96)
    };
  }
  let vGroove = null;
  let zWorkpieceBottom = zFloor;
  let zFocusTop = roundTo(zFloor + urunKalinligi, 0.01);

  if (shape === 'Cylindrical_Pen') {
    const wTrough = roundTo(clamp(pocketW * 0.14, 1.4, 4.0), 0.01);
    const availDepth = Math.max(0.5, yuvaDerinligi - entryChamfer);
    const max45Drop = (pocketW - wTrough) * 0.5;
    const vDrop = Math.min(availDepth, max45Drop);
    const zVStart = roundTo(zFloor + vDrop, 0.001);
    const halfWFloor = roundTo(pocketW * 0.5 - vDrop, 0.001);

    // Yarıçapı R olan silindirin 45° V-duvarlarına tam teğet oturduğu merkez Z kotası
    const rCyl = urunEn * 0.5;
    const xTan = rCyl * Math.SQRT1_2; // R * cos(45°)
    let zCylCenter;
    if (xTan >= halfWFloor && xTan <= pocketW * 0.5) {
      // 45° V-yüzeylerine tam teğet temas
      zCylCenter = zVStart - pocketW * 0.5 + rCyl * Math.SQRT2;
    } else if (xTan < halfWFloor) {
      // Çok sığ yuva + büyük çap durumunda alt V-köşelerine oturma
      zCylCenter = rCyl > halfWFloor
        ? zFloor + Math.sqrt(Math.max(0, rCyl * rCyl - halfWFloor * halfWFloor))
        : zFloor + rCyl;
    } else {
      // Üst omuzlara oturma (aşırı dar yuva emniyeti)
      const halfTop = pocketW * 0.5;
      zCylCenter = (plateZ - entryChamfer) + Math.sqrt(Math.max(0, rCyl * rCyl - halfTop * halfTop));
    }

    zWorkpieceBottom = roundTo(zCylCenter - rCyl, 0.01);
    zFocusTop = roundTo(zCylCenter + rCyl, 0.01);

    vGroove = {
      includedAngleDeg: 90,
      flankAngleDeg: 45,
      wTrough,
      vDrop: roundTo(vDrop, 0.01),
      zVStart,
      halfWFloor,
      zCylCenter: roundTo(zCylCenter, 0.01),
      rCyl
    };
  }

  // Tek bir yuvanın toplam zarf genişliği (oyuk payları dahil)
  const cellFootprintW = pocketW + 2 * scoopExtX + 0.5; // +0.5mm üst pah payı
  const cellFootprintL = pocketL + scoopExtY + 0.5;

  // Merkezden merkeze (Pitch) hatve — temiz 0.5mm katlarına yuvarlanır
  const pitchX = roundTo(Math.ceil((cellFootprintW + araDuvarMin) * 2) / 2, 0.5);
  const pitchY = roundTo(Math.ceil((cellFootprintL + araDuvarMin) * 2) / 2, 0.5);

  // Yuva dizisinin kapladığı toplam iç alan (asimetrik -Y parmak oyuğu dahil)
  const arraySpanX = (sutunAdedi - 1) * pitchX + cellFootprintW;
  const arraySpanY = (satirAdedi - 1) * pitchY + cellFootprintL;

  // M6 Optik Masa Vida Ağı (25mm veya 50mm tam katları)
  // Kenar vida merkezi mesafesi = 12.5 mm -> Ø11mm havşa dışı = 18.0mm -> en yakın yuvaya min 5.0mm et kalınlığı -> min iç sınır = 23.0mm
  const boltEdgeMargin = 12.5;
  const cboreOuterR = 5.5; // Ø11.0 mm DIN 912 M6 imbus başı havşası
  const m6ThroughR = 3.3;  // Ø6.6 mm ISO 273 M6 geçiş deliği
  const minClearWallToBolt = 5.0;
  const safeInset = boltEdgeMargin + cboreOuterR + minClearWallToBolt; // 23.0 mm

  // Bolt merkez açıklığı (boltSpanX, boltSpanY) Lazer_Masa_Vida_Araligi_mm'nin (25 veya 50) TAM KATI olmak zorundadır!
  const minPlateW = arraySpanX + 2 * safeInset;
  const minPlateH = arraySpanY + 2 * safeInset;

  const boltStepsX = Math.max(2, Math.ceil((minPlateW - 2 * boltEdgeMargin) / vidaAraligi));
  const boltStepsY = Math.max(2, Math.ceil((minPlateH - 2 * boltEdgeMargin) / vidaAraligi));

  const boltSpanX = boltStepsX * vidaAraligi;
  const boltSpanY = boltStepsY * vidaAraligi;

  const plateW = roundTo(boltSpanX + 2 * boltEdgeMargin, 0.01);
  const plateH = roundTo(boltSpanY + 2 * boltEdgeMargin, 0.01);

  // Dizi merkezleme: -Y yönündeki scoopExtY dikkate alınarak görsel ve mekanik tam simetri
  const firstCenterX = (plateW - (sutunAdedi - 1) * pitchX) * 0.5;
  const firstCenterY = (plateH - (satirAdedi - 1) * pitchY + scoopExtY) * 0.5;

  // Cavities (Satır A..F yukarıdan aşağıya, Sütun 1..6 soldan sağa)
  const cavities = [];
  const rowLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (let r = 0; r < satirAdedi; r++) {
    // r=0 üst satır (+Y), r=satirAdedi-1 alt satır (-Y) — operatör bakış yönüne uygun A1 sol-üst!
    const rowIdxFromBottom = satirAdedi - 1 - r;
    const cy = roundTo(firstCenterY + rowIdxFromBottom * pitchY, 0.001);
    for (let c = 0; c < sutunAdedi; c++) {
      const cx = roundTo(firstCenterX + c * pitchX, 0.001);
      const code = `${rowLetters[r] || 'R'}${c + 1}`;
      cavities.push({
        index: cavities.length + 1,
        row: r,
        col: c,
        code,
        cx,
        cy
      });
    }
  }

  // Çevresel M6 Optik Breadboard Bağlantı Delikleri (Köşeler + uzun kenarlarda ara bağlantı delikleri)
  const m6Holes = [];
  const addHole = (gx, gy, role) => {
    const hx = roundTo(boltEdgeMargin + gx * vidaAraligi, 0.001);
    const hy = roundTo(boltEdgeMargin + gy * vidaAraligi, 0.001);
    if (!m6Holes.some((h) => Math.abs(h.x - hx) < 0.1 && Math.abs(h.y - hy) < 0.1)) {
      m6Holes.push({
        id: `M6-${m6Holes.length + 1}`,
        x: hx,
        y: hy,
        gridX: gx,
        gridY: gy,
        offsetXmm: gx * vidaAraligi,
        offsetYmm: gy * vidaAraligi,
        role
      });
    }
  };

  // 4 Köşe Referans M6 Deliği (Sol-Alt M6-1 = Breadboard (0,0) Vida Referansı)
  addHole(0, 0, 'ORIGIN_REF');
  addHole(boltStepsX, 0, 'CORNER');
  addHole(boltStepsX, boltStepsY, 'CORNER');
  addHole(0, boltStepsY, 'CORNER');

  // Uzun kenarlarda (>125mm açıklık varsa) orta kilitleme M6 delikleri (rijitlik ve bel vermeyi önleme)
  const midStride = boltStepsX >= 4 ? Math.round(boltStepsX / 2) : 0;
  if (midStride > 0 && boltStepsX * vidaAraligi >= 125) {
    addHole(midStride, 0, 'EDGE_CLAMP');
    addHole(midStride, boltStepsY, 'EDGE_CLAMP');
  }
  const midStrideY = boltStepsY >= 4 ? Math.round(boltStepsY / 2) : 0;
  if (midStrideY > 0 && boltStepsY * vidaAraligi >= 125) {
    addHole(0, midStrideY, 'EDGE_CLAMP');
    addHole(boltStepsX, midStrideY, 'EDGE_CLAMP');
  }

  // M6 Havşa kademesi Z yüksekliği (altta en az 3.2mm sıkma omuzu bırakır)
  const cboreShoulderZ = roundTo(clamp(plateZ - 3.6, 3.0, plateZ - 2.2), 0.01);

  return {
    shape,
    customModel,
    customPocketMode,
    customLoops,
    shapeLabelTr: customModel
      ? `Özel Model (${customModel.fileName})`
      : shape === 'Rect_Card'
      ? 'Dikdörtgen Kart / Plaka'
      : shape === 'Cylindrical_Pen'
      ? 'Silindirik Kalem / V-Yatak'
      : 'Yuvarlak Jeton / Madalyon',
    urunEn,
    urunBoy,
    urunKalinligi,
    yuvaDerinligi,
    yuvaBoslukPayi,
    boslukModu,
    netBoslukDelta,
    pocketW,
    pocketL,
    satirAdedi,
    sutunAdedi,
    totalCavities: satirAdedi * sutunAdedi,
    vidaAraligi,
    parmakOyugu,
    tabanKalinligi,
    araDuvarMin,
    plateW,
    plateH,
    plateZ,
    zFloor,
    zWorkpieceBottom,
    zFocusTop,
    entryChamfer,
    scoopRadius,
    scoopExtX,
    scoopExtY,
    scoopSubDepth,
    vGroove,
    pitchX,
    pitchY,
    boltEdgeMargin,
    boltSpanX,
    boltSpanY,
    boltStepsX,
    boltStepsY,
    cboreOuterR,
    m6ThroughR,
    cboreShoulderZ,
    datumChamferMm: 6.5, // Sol-Alt (0,0) Lazer Sıfır Noktası Poka-Yoke 45° Pahı
    plateCornerR: 5.0,
    cavities,
    m6Holes,
    malzemeKodu,
    material
  };
}

/**
 * Plaka dış çevresi (CCW): Sol-Alt (0,0) köşesinde 45° Poka-Yoke Lazer Sıfır Pahı,
 * diğer 3 köşede R=5mm CNC köşe yuvarlatması.
 */
export function buildOuterPlateContour2D(spec, arcSegs = 8) {
  const W = spec.plateW;
  const H = spec.plateH;
  const R = spec.plateCornerR;
  const C = spec.datumChamferMm;
  const pts = [];

  // Sol-Alt (0,0) 45° referans pahı: (0, C) -> (C, 0)
  pts.push(new THREE.Vector2(C, 0));

  // Sağ-Alt köşe (W-R, R), açı -90° -> 0°
  for (let i = 0; i <= arcSegs; i++) {
    const a = -Math.PI * 0.5 + (i / arcSegs) * (Math.PI * 0.5);
    pts.push(new THREE.Vector2(W - R + Math.cos(a) * R, R + Math.sin(a) * R));
  }

  // Sağ-Üst köşe (W-R, H-R), açı 0° -> 90°
  for (let i = 0; i <= arcSegs; i++) {
    const a = (i / arcSegs) * (Math.PI * 0.5);
    pts.push(new THREE.Vector2(W - R + Math.cos(a) * R, H - R + Math.sin(a) * R));
  }

  // Sol-Üst köşe (R, H-R), açı 90° -> 180°
  for (let i = 0; i <= arcSegs; i++) {
    const a = Math.PI * 0.5 + (i / arcSegs) * (Math.PI * 0.5);
    pts.push(new THREE.Vector2(R + Math.cos(a) * R, H - R + Math.sin(a) * R));
  }

  // Sol kenardan (0, C) pah başlangıcına iniş
  pts.push(new THREE.Vector2(0, C));
  return pts;
}

function buildCircleLoop2D(cx, cy, radius, segs = 32) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(new THREE.Vector2(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius));
  }
  return pts;
}

/**
 * Her yuva tipi için sabit vertex sayılı (N), kendi kendini kesmeyen CCW 2D kontur üretici.
 * Farklı Z seviyelerinde (üst pah, omuz, taban) aynı N nokta sayısını koruyarak %100 su geçirmez (manifold)
 * quad-strip duvar örmeyi garanti eder.
 */
export function buildCavityContour2D(spec, cx, cy, opts = {}) {
  const wGrow = opts.wGrow || 0; // Pah genişlemesi veya V-yatak daralması (yarı-genişlik değil toplam genişlik farkı)
  const lGrow = opts.lGrow || 0;
  const scoopScale = opts.scoopScale ?? 1.0;

  if (spec.shape === 'Custom_Silhouette' && spec.customLoops) {
    let baseLoop = spec.customLoops.upperWall;
    if (wGrow > 0.05) {
      baseLoop = spec.customLoops.topChamfer;
    } else if (scoopScale < 0.78) {
      baseLoop = spec.customLoops.floor;
    } else if (scoopScale < 0.90) {
      baseLoop = spec.customLoops.midWall;
    }
    return baseLoop.map((p) => new THREE.Vector2(cx + p.x, cy + p.y));
  }

  if (spec.shape === 'Round_Token') {
    const segs = 72;
    const baseR = Math.max(0.8, spec.pocketW * 0.5 + wGrow * 0.5);
    const sExt = spec.parmakOyugu ? spec.scoopRadius * scoopScale : 0;
    const halfSpanRad = 0.52; // ~30°
    const targetAngle = Math.PI * 1.5; // -Y yönü (270°)
    const pts = [];

    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      let dAng = Math.abs(a - targetAngle);
      if (dAng > Math.PI) dAng = Math.PI * 2 - dAng;
      let r = baseR;
      if (sExt > 0 && dAng < halfSpanRad) {
        const u = dAng / halfSpanRad;
        const bell = Math.pow(0.5 * (1 + Math.cos(Math.PI * u)), 1.45);
        r += sExt * bell;
      }
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    return pts;
  }

  if (spec.shape === 'Cylindrical_Pen') {
    // Y-ekseni boyunca uzanan V-yatak konturu + isteğe bağlı ±X merkez kavrama oyukları
    const halfW = Math.max(0.65, spec.pocketW * 0.5 + wGrow * 0.5);
    const halfL = Math.max(2.0, spec.pocketL * 0.5 + lGrow * 0.5);
    const cr = Math.min(1.2, halfW * 0.45);
    const sideSamples = 25;
    const cornerSegs = 4;
    const sExtX = spec.parmakOyugu ? spec.scoopExtX * scoopScale : 0;
    const sSpanY = spec.scoopRadius; // Y boyunca kavrama oyuğu yarı-açıklığı

    const evalScallopX = (localY) => {
      if (sExtX <= 0 || Math.abs(localY) >= sSpanY) return 0;
      const u = Math.abs(localY) / sSpanY;
      return sExtX * Math.pow(0.5 * (1 + Math.cos(Math.PI * u)), 1.4);
    };

    const pts = [];
    // 1. Alt kenar: Sol-Alt -> Sağ-Alt (-halfL)
    for (let i = 0; i <= cornerSegs; i++) {
      const a = Math.PI + (i / cornerSegs) * (Math.PI * 0.5);
      pts.push(new THREE.Vector2(cx - halfW + cr + Math.cos(a) * cr, cy - halfL + cr + Math.sin(a) * cr));
    }
    for (let i = 0; i <= cornerSegs; i++) {
      const a = Math.PI * 1.5 + (i / cornerSegs) * (Math.PI * 0.5);
      pts.push(new THREE.Vector2(cx + halfW - cr + Math.cos(a) * cr, cy - halfL + cr + Math.sin(a) * cr));
    }

    // 2. Sağ duvar (+X): y = -halfL + cr -> +halfL - cr (orta kavrama oyuğu dahil)
    for (let i = 1; i < sideSamples; i++) {
      const t = i / sideSamples;
      const ly = -halfL + cr + t * (2 * (halfL - cr));
      const extraX = evalScallopX(ly);
      pts.push(new THREE.Vector2(cx + halfW + extraX, cy + ly));
    }

    // 3. Üst kenar: Sağ-Üst -> Sol-Üst (+halfL)
    for (let i = 0; i <= cornerSegs; i++) {
      const a = (i / cornerSegs) * (Math.PI * 0.5);
      pts.push(new THREE.Vector2(cx + halfW - cr + Math.cos(a) * cr, cy + halfL - cr + Math.sin(a) * cr));
    }
    for (let i = 0; i <= cornerSegs; i++) {
      const a = Math.PI * 0.5 + (i / cornerSegs) * (Math.PI * 0.5);
      pts.push(new THREE.Vector2(cx - halfW + cr + Math.cos(a) * cr, cy + halfL - cr + Math.sin(a) * cr));
    }

    // 4. Sol duvar (-X): y = +halfL - cr -> -halfL + cr (simetrik orta kavrama oyuğu dahil)
    for (let i = 1; i < sideSamples; i++) {
      const t = i / sideSamples;
      const ly = halfL - cr - t * (2 * (halfL - cr));
      const extraX = evalScallopX(ly);
      pts.push(new THREE.Vector2(cx - halfW - extraX, cy + ly));
    }

    return pts;
  }

  // Shape === 'Rect_Card': Dikdörtgen negatif ürün yuvası + (-Y) kenarında ergonomik Parmak Alma Oyuğu
  const halfW = Math.max(2.0, spec.pocketW * 0.5 + wGrow * 0.5);
  const halfL = Math.max(2.0, spec.pocketL * 0.5 + lGrow * 0.5);
  const cr = Math.min(1.5, halfW * 0.12, halfL * 0.12);
  const cornerSegs = 6;
  const bottomSamples = 29;
  const sR = spec.parmakOyugu ? spec.scoopRadius * scoopScale : 0;
  const sSpanX = spec.parmakOyugu ? Math.min(halfW - cr - 0.6, spec.scoopRadius * 1.12) : 0;

  const pts = [];

  // Sol-Alt köşe (180° -> 270°)
  for (let i = 0; i <= cornerSegs; i++) {
    const a = Math.PI + (i / cornerSegs) * (Math.PI * 0.5);
    pts.push(new THREE.Vector2(cx - halfW + cr + Math.cos(a) * cr, cy - halfL + cr + Math.sin(a) * cr));
  }

  // Alt kenar (-Y) boyunca soldan sağa tarama (Parmak Alma Oyuğu yumuşak çan eğrisi / yarım daire geçişi)
  for (let i = 1; i < bottomSamples; i++) {
    const t = i / bottomSamples;
    const lx = (-halfW + cr) + t * (2 * (halfW - cr));
    let dropY = 0;
    if (sR > 0 && Math.abs(lx) < sSpanX) {
      const u = lx / sSpanX;
      // Yarım daire + teğet yumuşatma zarfı
      const circ = Math.sqrt(Math.max(0, 1 - u * u));
      const smoothWindow = 0.5 * (1 + Math.cos(Math.PI * u));
      dropY = sR * (0.72 * circ + 0.28 * smoothWindow);
    }
    pts.push(new THREE.Vector2(cx + lx, cy - halfL - dropY));
  }

  // Sağ-Alt köşe (270° -> 360°)
  for (let i = 0; i <= cornerSegs; i++) {
    const a = Math.PI * 1.5 + (i / cornerSegs) * (Math.PI * 0.5);
    pts.push(new THREE.Vector2(cx + halfW - cr + Math.cos(a) * cr, cy - halfL + cr + Math.sin(a) * cr));
  }

  // Sağ-Üst köşe (0° -> 90°)
  for (let i = 0; i <= cornerSegs; i++) {
    const a = (i / cornerSegs) * (Math.PI * 0.5);
    pts.push(new THREE.Vector2(cx + halfW - cr + Math.cos(a) * cr, cy + halfL - cr + Math.sin(a) * cr));
  }

  // Sol-Üst köşe (90° -> 180°)
  for (let i = 0; i <= cornerSegs; i++) {
    const a = Math.PI * 0.5 + (i / cornerSegs) * (Math.PI * 0.5);
    pts.push(new THREE.Vector2(cx - halfW + cr + Math.cos(a) * cr, cy + halfL - cr + Math.sin(a) * cr));
  }

  return pts;
}

/**
 * %100 Su Geçirmez (Manifold) CAD BufferGeometry Üreticisi.
 * İç koordinatlar CAD (X, Y, Z) [mm] sisteminde hesaplanır ve
 * Three.js sahne merkezine (x = X - plateW/2, y = Z, z = -(Y - plateH/2)) sağ-el kuralı korunarak aktarılır.
 */
export function buildJigManifoldGeometry(spec) {
  const positions = [];
  const halfPW = spec.plateW * 0.5;
  const halfPH = spec.plateH * 0.5;

  // CAD (X, Y, Z) -> Three.js (x, y, z) dönüşümü (det = +1, sarım yönü korunur!)
  const pushTriCAD = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
    positions.push(
      ax - halfPW, az, -(ay - halfPH),
      bx - halfPW, bz, -(by - halfPH),
      cx - halfPW, cz, -(cy - halfPH)
    );
  };

  // Yatay (Z = sabit) yüzey üçgenlerini istenen +Z veya -Z normal yönünü garanti ederek ekler
  const pushTriangulatedCap = (outerPts, holeLoops, zConst, normalUp = true) => {
    const allPts = [...outerPts];
    for (const h of holeLoops) {
      for (const p of h) allPts.push(p);
    }
    const tris = THREE.ShapeUtils.triangulateShape(outerPts, holeLoops);
    for (let i = 0; i < tris.length; i++) {
      const [ia, ib, ic] = tris[i];
      const A = allPts[ia];
      const B = allPts[ib];
      const C = allPts[ic];
      const crossZ = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
      if ((normalUp && crossZ >= 0) || (!normalUp && crossZ < 0)) {
        pushTriCAD(A.x, A.y, zConst, B.x, B.y, zConst, C.x, C.y, zConst);
      } else {
        pushTriCAD(A.x, A.y, zConst, C.x, C.y, zConst, B.x, B.y, zConst);
      }
    }
  };

  /**
   * İki kapalı CCW 2D halka arasında quad-strip örer.
   * inwardNormal = false -> Dış duvar (plaka dış yan yüzeyi, normal dışarı bakar)
   * inwardNormal = true  -> İç oyuk / delik duvarı (normal oyuk boşluğuna bakar)
   */
  const stitchLoops = (upperPts, zUpper, lowerPts, zLower, inwardNormal = true) => {
    const n = upperPts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const u0 = upperPts[i];
      const u1 = upperPts[j];
      const l0 = lowerPts[i];
      const l1 = lowerPts[j];

      if (inwardNormal) {
        pushTriCAD(u0.x, u0.y, zUpper, u1.x, u1.y, zUpper, l1.x, l1.y, zLower);
        pushTriCAD(u0.x, u0.y, zUpper, l1.x, l1.y, zLower, l0.x, l0.y, zLower);
      } else {
        pushTriCAD(l0.x, l0.y, zLower, l1.x, l1.y, zLower, u1.x, u1.y, zUpper);
        pushTriCAD(l0.x, l0.y, zLower, u1.x, u1.y, zUpper, u0.x, u0.y, zUpper);
      }
    }
  };

  // 1. Dış plaka konturu
  const outerContour = buildOuterPlateContour2D(spec, 8);

  // 2. M6 Havşa (Üst Ø11.0mm) ve Geçiş Deliği (Alt Ø6.6mm) halkaları
  const boltSegs = 28;
  const topHoleLoops = [];
  const bottomHoleLoops = [];
  const boltData = spec.m6Holes.map((hole) => {
    const cboreLoop = buildCircleLoop2D(hole.x, hole.y, spec.cboreOuterR, boltSegs);
    const shaftLoop = buildCircleLoop2D(hole.x, hole.y, spec.m6ThroughR, boltSegs);
    topHoleLoops.push(cboreLoop);
    bottomHoleLoops.push(shaftLoop);
    return { hole, cboreLoop, shaftLoop };
  });

  // 3. Her ürün yuvasının üst konturu (Z = plateZ, +0.25mm giriş pahı ile)
  const cavityBuildItems = spec.cavities.map((cav) => {
    const topChamferLoop = buildCavityContour2D(spec, cav.cx, cav.cy, {
      wGrow: spec.entryChamfer * 2,
      lGrow: spec.entryChamfer * 2,
      scoopScale: 1.0
    });
    topHoleLoops.push(topChamferLoop);
    return { cav, topChamferLoop };
  });

  // 4. ÜST YÜZEY (Z = plateZ, +Z normal) ve ALT YÜZEY (Z = 0, -Z normal)
  pushTriangulatedCap(outerContour, topHoleLoops, spec.plateZ, true);
  pushTriangulatedCap(outerContour, bottomHoleLoops, 0, false);

  // 5. DIŞ ÇEVRE YAN DUVARI (Z = plateZ -> Z = 0, dışa bakan normal)
  stitchLoops(outerContour, spec.plateZ, outerContour, 0, false);

  // 6. M6 DIN 912 HAVŞALI BAĞLANTI DELİKLERİ (Üst havşa -> Omuz -> Alt geçiş şaftı)
  for (const b of boltData) {
    // Ø11.0mm Havşa yan duvarı
    stitchLoops(b.cboreLoop, spec.plateZ, b.cboreLoop, spec.cboreShoulderZ, true);
    // Havşa oturma omuzu (Z = cboreShoulderZ, +Z yukarı bakan halka)
    stitchLoops(b.shaftLoop, spec.cboreShoulderZ, b.cboreLoop, spec.cboreShoulderZ, true);
    // Ø6.6mm Geçiş deliği yan duvarı
    stitchLoops(b.shaftLoop, spec.cboreShoulderZ, b.shaftLoop, 0, true);
  }

  // 7. ÜRÜN YUVALARI (Negatif toleranslı cep + V-Yatak + Parmak Alma Oyuğu + Alt Parmak Kaldırma Havuzu)
  const zAfterChamfer = spec.plateZ - spec.entryChamfer;

  for (const item of cavityBuildItems) {
    const { cav, topChamferLoop } = item;

    if (spec.shape === 'Cylindrical_Pen') {
      const vg = spec.vGroove;
      const rimLoop = buildCavityContour2D(spec, cav.cx, cav.cy, {
        wGrow: 0,
        lGrow: 0,
        scoopScale: 0.95
      });
      // Giriş pahı: plateZ -> zAfterChamfer
      stitchLoops(topChamferLoop, spec.plateZ, rimLoop, zAfterChamfer, true);

      // Eğer dikey kılavuz duvarı varsa (zAfterChamfer -> vg.zVStart)
      let vTopLoop = rimLoop;
      if (zAfterChamfer - vg.zVStart > 0.02) {
        const shoulderLoop = buildCavityContour2D(spec, cav.cx, cav.cy, {
          wGrow: 0,
          lGrow: 0,
          scoopScale: 0.55
        });
        stitchLoops(rimLoop, zAfterChamfer, shoulderLoop, vg.zVStart, true);
        vTopLoop = shoulderLoop;
      }

      // 45° Hassas V-Yatak Yan Yamaçları (vg.zVStart -> spec.zFloor)
      // Orta noktalarda kademeli halka ile pürüzsüz parmak oyuğu geçişi
      const midZ = (vg.zVStart + spec.zFloor) * 0.5;
      const midLoop = buildCavityContour2D(spec, cav.cx, cav.cy, {
        wGrow: -vg.vDrop,
        lGrow: -0.2,
        scoopScale: 0.22
      });
      const floorLoop = buildCavityContour2D(spec, cav.cx, cav.cy, {
        wGrow: -vg.vDrop * 2.0,
        lGrow: -0.4,
        scoopScale: 0.0
      });

      stitchLoops(vTopLoop, vg.zVStart, midLoop, midZ, true);
      stitchLoops(midLoop, midZ, floorLoop, spec.zFloor, true);

      // V-Yatak dip tahliye kanalı kapağı
      pushTriangulatedCap(floorLoop, [], spec.zFloor, true);
    } else {
      // Rect_Card ve Round_Token: Dikey hassas kayıt duvarları + kavisli parmak oyuğu rampası
      const upperWallLoop = buildCavityContour2D(spec, cav.cx, cav.cy, {
        wGrow: 0,
        lGrow: 0,
        scoopScale: 0.96
      });
      stitchLoops(topChamferLoop, spec.plateZ, upperWallLoop, zAfterChamfer, true);

      const midWallZ = (zAfterChamfer + spec.zFloor) * 0.5;
      const midWallLoop = buildCavityContour2D(spec, cav.cx, cav.cy, {
        wGrow: 0,
        lGrow: 0,
        scoopScale: 0.85
      });
      const floorLoop = buildCavityContour2D(spec, cav.cx, cav.cy, {
        wGrow: 0,
        lGrow: 0,
        scoopScale: 0.70
      });

      stitchLoops(upperWallLoop, zAfterChamfer, midWallLoop, midWallZ, true);
      stitchLoops(midWallLoop, midWallZ, floorLoop, spec.zFloor, true);

      if (spec.parmakOyugu && spec.scoopSubDepth > 0.05) {
        // Kart / jeton / özel model kenarının altına parmak ucunun girmesini sağlayan alt parmak kaldırma havuzu
        let wellCenterX = cav.cx;
        let wellCenterY;
        let wellR;
        if (spec.shape === 'Custom_Silhouette' && spec.customModel) {
          wellCenterX = cav.cx + spec.customModel.sdfData.scoopAnchorX;
          wellCenterY = cav.cy + spec.customModel.sdfData.scoopAnchorY;
          wellR = Math.min(spec.scoopRadius * 0.42, Math.min(spec.pocketW, spec.pocketL) * 0.20);
        } else if (spec.shape === 'Round_Token') {
          const rp = spec.pocketW * 0.5;
          wellCenterY = cav.cy - rp * 0.64;
          wellR = Math.min(rp * 0.32, spec.scoopRadius * 0.44);
        } else {
          wellCenterY = cav.cy - spec.pocketL * 0.5 + spec.scoopRadius * 0.12;
          wellR = Math.min(spec.pocketW * 0.26, spec.scoopRadius * 0.52);
        }

        const wellTopLoop = buildCircleLoop2D(wellCenterX, wellCenterY, wellR, 24);
        const wellBotLoop = buildCircleLoop2D(wellCenterX, wellCenterY, wellR * 0.78, 24);
        const zWellFloor = spec.zFloor - spec.scoopSubDepth;

        pushTriangulatedCap(floorLoop, [wellTopLoop], spec.zFloor, true);
        stitchLoops(wellTopLoop, spec.zFloor, wellBotLoop, zWellFloor, true);
        pushTriangulatedCap(wellBotLoop, [], zWellFloor, true);
      } else {
        pushTriangulatedCap(floorLoop, [], spec.zFloor, true);
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  return geom;
}

/**
 * İşaretli dörtyüzlü (Signed Tetrahedron) integrali ile kesin CAD Hacim, Yüzey Alanı ve B2B Maliyet Hesabı
 */
export function computeMetrologyAndQuote(geometry, spec) {
  const pos = geometry.attributes.position;
  let signedVolMm3 = 0;
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

    signedVolMm3 += p1.dot(cross.crossVectors(p2, p3)) / 6.0;
    ab.subVectors(p2, p1);
    ac.subVectors(p3, p1);
    areaMm2 += cross.crossVectors(ab, ac).length() * 0.5;
  }

  const volumeMm3 = Math.abs(signedVolMm3);
  const volumeCm3 = volumeMm3 / 1000.0;
  const areaCm2 = areaMm2 / 100.0;
  const triangleCount = pos.count / 3;

  // Tüm referans malzemeler için kütle tablosu
  const massByMaterial = {};
  for (const [key, mat] of Object.entries(JIG_MATERIALS)) {
    const solidMassG = volumeCm3 * mat.densityGcm3;
    const effectiveMassG = solidMassG * mat.infillFactor;
    massByMaterial[key] = {
      solidMassG: roundTo(solidMassG, 0.1),
      effectiveMassG: roundTo(effectiveMassG, 0.1)
    };
  }

  // Aktif seçili malzeme üzerinden B2B İmalat & Teklif Hesabı
  const mat = spec.material;
  const activeMass = massByMaterial[spec.malzemeKodu];
  const isCNC = mat.infillFactor >= 0.99;
  // CNC'de ham kütük hacmi üzerinden talaş maliyeti hesabı; 3D baskıda efektif filament kütlesi
  const billetVolCm3 = (spec.plateW * spec.plateH * (spec.plateZ + 2)) / 1000.0;
  const billableMassG = isCNC
    ? billetVolCm3 * mat.densityGcm3
    : activeMass.effectiveMassG * 1.06; // %6 destek/purge payı

  const rawMaterialCostTry = billableMassG * mat.costPerGramTry;
  const removedOrPrintedCm3 = isCNC ? Math.max(12, billetVolCm3 - volumeCm3) : volumeCm3 * mat.infillFactor;
  const cycleHours = Math.max(0.35, removedOrPrintedCm3 / mat.cm3PerHour + spec.totalCavities * 0.035);
  const machineCostTry = cycleHours * mat.machineRateTryHr;
  const hardwareCostTry = spec.m6Holes.length * 14.5; // M6x16 DIN 912 paslanmaz civata + pul kiti
  const camLightburnPrepTry = mat.setupFeeTry;

  const baseProductionUnitTry = rawMaterialCostTry + machineCostTry + hardwareCostTry;
  const marginMultiplier = 1.38; // %38 B2B mühendislik & kalite kontrol marjı

  const calcTierUnit = (qty, discount) => {
    const amortizedSetup = camLightburnPrepTry / qty;
    return Math.round((baseProductionUnitTry * marginMultiplier + amortizedSetup) * (1 - discount));
  };

  const usdRate = 36.5; // Referans gösterge kuru
  const tiers = [
    { qty: 1, label: '1 Adet (Prototip + LightBurn Kurulum)', discountPct: 0, unitTry: calcTierUnit(1, 0) },
    { qty: 5, label: '5 Adet (Atölye İstasyon Seti)', discountPct: 12, unitTry: calcTierUnit(5, 0.12) },
    { qty: 10, label: '10 Adet (Vardiyalı Seri Üretim)', discountPct: 20, unitTry: calcTierUnit(10, 0.20) },
    { qty: 25, label: '25+ Adet (Kurumsal Bayi / OEM)', discountPct: 28, unitTry: calcTierUnit(25, 0.28) }
  ].map((t) => ({
    ...t,
    totalTry: t.unitTry * t.qty,
    unitUsd: roundTo(t.unitTry / usdRate, 0.5)
  }));

  // Operatör çevrim verimliliği (saatlik markalanabilir parça tahmini)
  const unloadSecPerPart = spec.parmakOyugu ? 1.4 : 3.6;
  const markSecPerPart = spec.shape === 'Cylindrical_Pen' ? 4.5 : 3.8;
  const batchCycleSec = 6 + spec.totalCavities * (unloadSecPerPart + markSecPerPart);
  const partsPerHour = Math.round((3600 / batchCycleSec) * spec.totalCavities);

  return {
    volumeMm3: Math.round(volumeMm3),
    volumeCm3: roundTo(volumeCm3, 0.01),
    areaCm2: roundTo(areaCm2, 0.1),
    triangleCount,
    solidMassG: activeMass.solidMassG,
    effectiveMassG: activeMass.effectiveMassG,
    massByMaterial,
    cycleHours: roundTo(cycleHours, 0.05),
    cycleMinutes: Math.round(cycleHours * 60),
    rawMaterialCostTry: Math.round(rawMaterialCostTry),
    machineCostTry: Math.round(machineCostTry),
    hardwareCostTry: Math.round(hardwareCostTry),
    setupFeeTry: Math.round(camLightburnPrepTry),
    unitQuoteTry: tiers[0].unitTry,
    unitQuoteUsd: tiers[0].unitUsd,
    tiers,
    partsPerHour,
    batchCycleSec: Math.round(batchCycleSec)
  };
}

/**
 * 3D Yüklü Ürün (Loaded Workpiece) Üreticisi:
 * Lazer kazıma / UV baskı simülasyon dokusu ile her yuvaya tam oturan 3D ürünleri oluşturur.
 */
function createLaserMarkTexture(spec, code) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Eloksallı koyu metal / fırçalı yüzey tabanı
  ctx.fillStyle = spec.shape === 'Cylindrical_Pen' ? '#1a365d' : spec.shape === 'Round_Token' ? '#2c2518' : '#191c22';
  ctx.fillRect(0, 0, 256, 256);

  // İnce fırça izleri
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  for (let y = 4; y < 256; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  // Lazer markalama çerçevesi ve hedef artısı (Altın / Beyaz kazıma kontrastı)
  const strokeCol = spec.shape === 'Round_Token' ? '#f3c669' : '#ece8e1';
  ctx.strokeStyle = strokeCol;
  ctx.fillStyle = strokeCol;
  ctx.lineWidth = 3;

  if (spec.shape === 'Round_Token') {
    ctx.beginPath();
    ctx.arc(128, 128, 98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.arc(128, 128, 82, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.strokeRect(22, 22, 212, 212);
  }

  // Merkez hizalama nişangahı
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(108, 128);
  ctx.lineTo(148, 128);
  ctx.moveTo(128, 108);
  ctx.lineTo(128, 148);
  ctx.stroke();

  ctx.font = '700 34px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(code, 128, 86);

  ctx.font = '600 17px "JetBrains Mono", monospace';
  ctx.fillStyle = '#ff7b54';
  ctx.fillText('LAZER / UV OK', 128, 186);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function buildLoadedWorkpiecesGroup(spec, clippingPlanes = []) {
  const group = new THREE.Group();
  group.name = 'LoadedWorkpieces';
  const halfPW = spec.plateW * 0.5;
  const halfPH = spec.plateH * 0.5;

  for (const cav of spec.cavities) {
    const partGroup = new THREE.Group();
    const tx = cav.cx - halfPW;
    const tz = -(cav.cy - halfPH);
    const tex = createLaserMarkTexture(spec, cav.code);

    const topMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.34,
      metalness: 0.72,
      clippingPlanes
    });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: spec.shape === 'Cylindrical_Pen' ? 0x1e3f6e : spec.shape === 'Round_Token' ? 0xb58938 : 0x262a33,
      roughness: 0.35,
      metalness: 0.78,
      clippingPlanes
    });

    if (spec.customModel) {
      // Kullanıcının yüklediği gerçek 3D/2D modelin her yuvaya yerleştirilmesi
      const customMat = new THREE.MeshStandardMaterial({
        color: 0xd98a3c,
        roughness: 0.30,
        metalness: 0.76,
        side: THREE.DoubleSide,
        clippingPlanes
      });
      const customMesh = new THREE.Mesh(spec.customModel.viewGeometry, customMat);
      customMesh.userData.keepGeometry = true; // Paylaşımlı özel model geometrisini dispose etme!

      const baseZ =
        spec.shape === 'Cylindrical_Pen' && spec.vGroove
          ? spec.vGroove.zCylCenter - spec.customModel.sizeZ * 0.5
          : spec.zFloor + 0.03;

      customMesh.position.set(tx, baseZ, tz);
      customMesh.castShadow = true;
      customMesh.receiveShadow = true;
      partGroup.add(customMesh);

      // Lazer hizalama nişangah rozeti (modelin tepe Z noktasında)
      const badgeSize = Math.max(8, Math.min(18, Math.min(spec.urunEn, spec.urunBoy) * 0.38));
      const badgeGeo = new THREE.PlaneGeometry(badgeSize, badgeSize);
      badgeGeo.rotateX(-Math.PI * 0.5);
      const badgeMat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.88,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        clippingPlanes
      });
      const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
      badgeMesh.position.set(tx, baseZ + spec.customModel.sizeZ + 0.06, tz);
      partGroup.add(badgeMesh);
    } else if (spec.shape === 'Rect_Card') {
      const h = spec.urunKalinligi;
      const boxGeo = new THREE.BoxGeometry(spec.urunEn, h, spec.urunBoy);
      const materials = [bodyMat, bodyMat, topMat, bodyMat, bodyMat, bodyMat];
      const mesh = new THREE.Mesh(boxGeo, materials);
      mesh.position.set(tx, spec.zFloor + h * 0.5 + 0.02, tz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      partGroup.add(mesh);
    } else if (spec.shape === 'Round_Token') {
      const h = spec.urunKalinligi;
      const r = spec.urunEn * 0.5;
      const cylGeo = new THREE.CylinderGeometry(r, r, h, 48);
      const materials = [bodyMat, topMat, bodyMat];
      const mesh = new THREE.Mesh(cylGeo, materials);
      mesh.position.set(tx, spec.zFloor + h * 0.5 + 0.02, tz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      partGroup.add(mesh);
    } else if (spec.shape === 'Cylindrical_Pen') {
      const r = spec.urunEn * 0.5;
      const bodyLen = spec.urunBoy * 0.86;
      const tipLen = spec.urunBoy * 0.14;
      const zCenter = spec.vGroove.zCylCenter;

      // Ana silindirik gövde (Z ekseni = CAD Y ekseni boyunca yatay uzanır)
      const cylGeo = new THREE.CylinderGeometry(r, r, bodyLen, 40);
      cylGeo.rotateX(Math.PI * 0.5);
      const bodyMesh = new THREE.Mesh(cylGeo, bodyMat);
      bodyMesh.position.set(tx, zCenter, tz - tipLen * 0.5);
      partGroup.add(bodyMesh);

      // Kalem/silindir konik uç detayı (+Z = CAD -Y yönü)
      const coneGeo = new THREE.CylinderGeometry(r * 0.22, r, tipLen, 32);
      coneGeo.rotateX(Math.PI * 0.5);
      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xd8dde6,
        roughness: 0.22,
        metalness: 0.9,
        clippingPlanes
      });
      const tipMesh = new THREE.Mesh(coneGeo, chromeMat);
      tipMesh.position.set(tx, zCenter, tz + bodyLen * 0.5);
      partGroup.add(tipMesh);

      // Üst lazer markalama şeridi (odak tepe çizgisi Z_focus üzerinde)
      const stripW = Math.min(r * 1.1, 14);
      const stripL = Math.min(bodyLen * 0.72, 65);
      const stripGeo = new THREE.PlaneGeometry(stripW, stripL);
      stripGeo.rotateX(-Math.PI * 0.5);
      const stripMat = new THREE.MeshBasicMaterial({
        map: tex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        clippingPlanes
      });
      const stripMesh = new THREE.Mesh(stripGeo, stripMat);
      stripMesh.position.set(tx, zCenter + r + 0.04, tz - tipLen * 0.25);
      partGroup.add(stripMesh);
    }

    partGroup.userData = { cavityCode: cav.code };
    group.add(partGroup);
  }

  return group;
}

/**
 * M6 Optik Lazer Masası (Breadboard) + DIN 912 M6 İmbus Civatalar + (0,0) L-Dayama Referansı
 * (Yalnızca 3D görsel doğrulama sahnesi içindir; STL ihracatına dahil edilmez.)
 */
export function buildOpticalBreadboardGroup(spec) {
  const group = new THREE.Group();
  group.name = 'OpticalBreadboardStage';

  const halfPW = spec.plateW * 0.5;
  const halfPH = spec.plateH * 0.5;
  const margin = 45;
  const tableW = spec.plateW + margin * 2;
  const tableH = spec.plateH + margin * 2;
  const tableThick = 10;

  // Siyah eloksallı optik lazer tablası
  const tableGeo = new THREE.BoxGeometry(tableW, tableThick, tableH);
  const tableMat = new THREE.MeshStandardMaterial({
    color: 0x101216,
    roughness: 0.62,
    metalness: 0.55
  });
  const tableMesh = new THREE.Mesh(tableGeo, tableMat);
  tableMesh.position.set(0, -tableThick * 0.5 - 0.05, 0);
  tableMesh.receiveShadow = true;
  group.add(tableMesh);

  // Tabla üzerindeki tüm 25mm / 50mm M6 dişli delik matrisi (InstancedMesh ile yüksek performans)
  const pitch = spec.vidaAraligi;
  const minGX = -1;
  const maxGX = spec.boltStepsX + 1;
  const minGY = -1;
  const maxGY = spec.boltStepsY + 1;
  const holePositions = [];

  for (let gx = minGX; gx <= maxGX; gx++) {
    for (let gy = minGY; gy <= maxGY; gy++) {
      const cadX = spec.boltEdgeMargin + gx * pitch;
      const cadY = spec.boltEdgeMargin + gy * pitch;
      const sx = cadX - halfPW;
      const sz = -(cadY - halfPH);
      if (Math.abs(sx) < tableW * 0.5 - 8 && Math.abs(sz) < tableH * 0.5 - 8) {
        holePositions.push([sx, sz]);
      }
    }
  }

  const ringGeo = new THREE.RingGeometry(2.6, 3.6, 20);
  ringGeo.rotateX(-Math.PI * 0.5);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x3b414d, side: THREE.DoubleSide });
  const instRings = new THREE.InstancedMesh(ringGeo, ringMat, holePositions.length);
  const dummy = new THREE.Object3D();
  holePositions.forEach(([sx, sz], idx) => {
    dummy.position.set(sx, 0.02, sz);
    dummy.updateMatrix();
    instRings.setMatrixAt(idx, dummy.matrix);
  });
  group.add(instRings);

  // Fikstürü tablaya sabitleyen M6 DIN 912 İmbus Civatalar (Havşa içinde sıfır çıkıntılı!)
  const boltMat = new THREE.MeshStandardMaterial({
    color: 0xbac2cf,
    roughness: 0.28,
    metalness: 0.88
  });
  const hexMat = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.6,
    metalness: 0.5
  });

  const headH = Math.min(3.4, spec.plateZ - spec.cboreShoulderZ - 0.25);
  const headGeo = new THREE.CylinderGeometry(4.9, 4.9, headH, 28);
  const hexGeo = new THREE.CylinderGeometry(2.6, 2.6, 0.4, 6);

  for (const h of spec.m6Holes) {
    const sx = h.x - halfPW;
    const sz = -(h.y - halfPH);
    const headMesh = new THREE.Mesh(headGeo, boltMat);
    headMesh.position.set(sx, spec.cboreShoulderZ + headH * 0.5, sz);
    group.add(headMesh);

    const hexSocket = new THREE.Mesh(hexGeo, hexMat);
    hexSocket.position.set(sx, spec.cboreShoulderZ + headH - 0.15, sz);
    group.add(hexSocket);
  }

  // Sol-Alt (0,0) Lazer Sıfır Noktası Kırmızı Eloksallı L-Dayama Cetveli
  const stopMat = new THREE.MeshStandardMaterial({
    color: 0xd94628,
    roughness: 0.38,
    metalness: 0.65
  });
  const stopThick = 6;
  const stopH = Math.min(spec.plateZ * 0.7, 5.5);
  const armLen = 46;

  const armX = new THREE.Mesh(new THREE.BoxGeometry(armLen, stopH, stopThick), stopMat);
  armX.position.set(-halfPW + armLen * 0.5 + 8, stopH * 0.5, halfPH + stopThick * 0.5 + 0.3);
  group.add(armX);

  const armY = new THREE.Mesh(new THREE.BoxGeometry(stopThick, stopH, armLen), stopMat);
  armY.position.set(-halfPW - stopThick * 0.5 - 0.3, stopH * 0.5, halfPH - armLen * 0.5 - 8);
  group.add(armY);

  return group;
}
