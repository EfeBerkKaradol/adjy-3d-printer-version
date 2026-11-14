/**
 * PCB Elektronik Kutu & Isıl Çakma Pirinç Insert (Heat-Set Brass Insert) DFM CAD Motoru
 * Ölçek: 1 Three.js Birimi = 1.00 mm (PrusaSlicer / Bambu Studio / Fusion 360 / SolidWorks birebir uyumlu)
 * Eksen: Sahne içi Y-yukarı (X = En, Z = Boy, Y = Yükseklik); STL ihracatında Z-yukarı (Z >= 0)
 */

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const SEAM_CLEARANCE_MM = 0.20;

export const INSERT_SPECS = {
  'M2.5': {
    code: 'M2.5',
    label: 'M2.5 × 4.0 × Ø3.5 mm Tırtıllı Pirinç Insert',
    threadDia: 2.5,
    insertLen: 4.0,
    knurlOD: 3.5,
    borePilotDia: 3.55,
    boreNomDia: 3.30,
    boreRootDia: 3.15,
    boreDepth: 5.0,
    leadInDepth: 1.1,
    bossOD: 6.8,
    lidClearDia: 2.8,
    cboreDia: 5.4,
    cboreDepth: 2.2,
    insertMassG: 0.22,
    screwMassG: 0.45,
    insertUnitTL: 3.20,
    screwUnitTL: 1.40
  },
  'M3': {
    code: 'M3',
    label: 'M3 × 4.5 × Ø4.6 mm Tırtıllı Pirinç Insert',
    threadDia: 3.0,
    insertLen: 4.5,
    knurlOD: 4.6,
    borePilotDia: 4.55,
    boreNomDia: 4.20, // Standart DFM referansı: M3 için Ø4.20 mm konik yuva
    boreRootDia: 4.00,
    boreDepth: 5.8,
    leadInDepth: 1.3,
    bossOD: 8.0,
    lidClearDia: 3.4,
    cboreDia: 6.2,
    cboreDepth: 2.6,
    insertMassG: 0.38,
    screwMassG: 0.78,
    insertUnitTL: 3.80,
    screwUnitTL: 1.65
  },
  'M4': {
    code: 'M4',
    label: 'M4 × 6.0 × Ø6.0 mm Tırtıllı Pirinç Insert',
    threadDia: 4.0,
    insertLen: 6.0,
    knurlOD: 6.0,
    borePilotDia: 5.95,
    boreNomDia: 5.60,
    boreRootDia: 5.35,
    boreDepth: 7.2,
    leadInDepth: 1.5,
    bossOD: 10.4,
    lidClearDia: 4.5,
    cboreDia: 8.0,
    cboreDepth: 3.2,
    insertMassG: 0.84,
    screwMassG: 1.55,
    insertUnitTL: 5.10,
    screwUnitTL: 2.20
  }
};

export const MATERIAL_SPECS = {
  PETG: {
    key: 'PETG',
    label: 'PETG Endüstriyel (1.27 g/cm³)',
    densityGcm3: 1.27,
    costPerGramTL: 0.95,
    heatStakeTempC: 235
  },
  ABS: {
    key: 'ABS',
    label: 'ABS Teknik Muhafaza (1.04 g/cm³)',
    densityGcm3: 1.04,
    costPerGramTL: 0.90,
    heatStakeTempC: 245
  },
  ASA: {
    key: 'ASA',
    label: 'ASA Dış Ortam UV (1.07 g/cm³)',
    densityGcm3: 1.07,
    costPerGramTL: 1.15,
    heatStakeTempC: 250
  },
  PLA: {
    key: 'PLA',
    label: 'PLA+ Prototip (1.24 g/cm³)',
    densityGcm3: 1.24,
    costPerGramTL: 0.78,
    heatStakeTempC: 205
  },
  AL6061: {
    key: 'AL6061',
    label: 'Alüminyum 6061 CNC (2.70 g/cm³)',
    densityGcm3: 2.70,
    costPerGramTL: 4.60,
    heatStakeTempC: 0
  }
};

export const IO_PORT_PRESETS = {
  DC_JACK: {
    type: 'circle',
    label: 'DC Güç Soketi (Ø8.2mm)',
    width: 8.2,
    height: 8.2,
    cornerR: 4.1,
    zAbovePcb: 5.5,
    unitTL: 14.50
  },
  RJ45: {
    type: 'rect',
    label: 'RJ45 Ethernet (16.2×13.6mm)',
    width: 16.2,
    height: 13.6,
    cornerR: 0.8,
    zAbovePcb: 6.8,
    unitTL: 28.00
  },
  SMA_ANT: {
    type: 'circle',
    label: 'SMA Anten Konnektörü (Ø6.5mm)',
    width: 6.5,
    height: 6.5,
    cornerR: 3.25,
    zAbovePcb: 8.0,
    unitTL: 22.00
  },
  MICRO_SD: {
    type: 'stadium',
    label: 'MicroSD Kart Yuvası (13.0×2.4mm)',
    width: 13.0,
    height: 2.4,
    cornerR: 1.1,
    zAbovePcb: 1.6,
    unitTL: 16.00
  },
  CUSTOM_RECT: {
    type: 'rect',
    label: 'Özel Dikdörtgen Kesit',
    width: 12.0,
    height: 6.0,
    cornerR: 1.0,
    zAbovePcb: 4.5,
    unitTL: 10.00
  }
};

export const ENCLOSURE_PRESETS = {
  rpi_iot: {
    name: '01 / Endüstriyel IoT & SBC Kutusu (85×56mm)',
    PCB_En_mm: 85.0,
    PCB_Boy_mm: 56.0,
    Kutu_Ic_Yukseklik_mm: 32.0,
    Duvar_Kalinligi_mm: 2.4,
    Pirinc_Insert_Tipi: 'M3',
    Delik_Kenar_Mesafesi_mm: 3.5,
    Havalandirma_Izgarasi: true,
    USB_Konnektor_Deligi_Ekle: true,
    USB_Duvar: 'front',
    USB_Ofset_mm: 0.0,
    sidePorts: [
      { id: 'p1', preset: 'DC_JACK', wall: 'back', offsetMm: -18.0, width: 8.2, height: 8.2, zAbovePcb: 5.5, type: 'circle', label: 'DC Güç Ø8.2' },
      { id: 'p2', preset: 'SMA_ANT', wall: 'back', offsetMm: 18.0, width: 6.5, height: 6.5, zAbovePcb: 7.5, type: 'circle', label: 'SMA Anten Ø6.5' }
    ]
  },
  esp32_sensor: {
    name: '02 / ESP32-S3 Kompakt Sensör Düğümü (52×38mm)',
    PCB_En_mm: 52.0,
    PCB_Boy_mm: 38.0,
    Kutu_Ic_Yukseklik_mm: 24.0,
    Duvar_Kalinligi_mm: 2.4,
    Pirinc_Insert_Tipi: 'M2.5',
    Delik_Kenar_Mesafesi_mm: 3.2,
    Havalandirma_Izgarasi: true,
    USB_Konnektor_Deligi_Ekle: true,
    USB_Duvar: 'left',
    USB_Ofset_mm: 0.0,
    sidePorts: []
  },
  stm32_plc: {
    name: '03 / STM32 Otomasyon & Ethernet Denetleyici (120×80mm)',
    PCB_En_mm: 120.0,
    PCB_Boy_mm: 80.0,
    Kutu_Ic_Yukseklik_mm: 44.0,
    Duvar_Kalinligi_mm: 2.8,
    Pirinc_Insert_Tipi: 'M3',
    Delik_Kenar_Mesafesi_mm: 4.5,
    Havalandirma_Izgarasi: true,
    USB_Konnektor_Deligi_Ekle: true,
    USB_Duvar: 'front',
    USB_Ofset_mm: -28.0,
    sidePorts: [
      { id: 'p1', preset: 'RJ45', wall: 'front', offsetMm: 18.0, width: 16.2, height: 13.6, zAbovePcb: 6.8, type: 'rect', label: 'RJ45 Ethernet' },
      { id: 'p2', preset: 'DC_JACK', wall: 'back', offsetMm: -32.0, width: 8.2, height: 8.2, zAbovePcb: 5.5, type: 'circle', label: '24V DC Giriş' }
    ]
  },
  power_psu: {
    name: '04 / Güç Dağıtım & Röle Modülü M4 (150×105mm)',
    PCB_En_mm: 150.0,
    PCB_Boy_mm: 105.0,
    Kutu_Ic_Yukseklik_mm: 56.0,
    Duvar_Kalinligi_mm: 3.2,
    Pirinc_Insert_Tipi: 'M4',
    Delik_Kenar_Mesafesi_mm: 6.0,
    Havalandirma_Izgarasi: true,
    USB_Konnektor_Deligi_Ekle: false,
    USB_Duvar: 'front',
    USB_Ofset_mm: 0.0,
    sidePorts: [
      { id: 'p1', preset: 'DC_JACK', wall: 'front', offsetMm: -35.0, width: 8.2, height: 8.2, zAbovePcb: 6.5, type: 'circle', label: 'DC Giriş' },
      { id: 'p2', preset: 'CUSTOM_RECT', wall: 'back', offsetMm: 0.0, width: 28.0, height: 11.0, zAbovePcb: 8.0, type: 'rect', label: 'Klemens Çıkışı' }
    ]
  }
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * 1. Parametrik DFM & Koordinat Hesaplayıcı
 */
export function computeEnclosureSpec(rawParams) {
  const pcbW = clamp(Number(rawParams.PCB_En_mm) || 85, 30, 180);
  const pcbL = clamp(Number(rawParams.PCB_Boy_mm) || 56, 30, 180);
  const innerH = clamp(Number(rawParams.Kutu_Ic_Yukseklik_mm) || 32, 20, 80);
  const wallT = clamp(Number(rawParams.Duvar_Kalinligi_mm) || 2.4, 1.8, 4.8);
  const insertType = INSERT_SPECS[rawParams.Pirinc_Insert_Tipi] ? rawParams.Pirinc_Insert_Tipi : 'M3';
  const insert = INSERT_SPECS[insertType];

  const warnings = [];
  if (wallT < 2.0) {
    warnings.push('Duvar kalınlığı < 2.0mm: 0.4mm nozül ile dudak 2 çevre duvarına düşer (2.4mm önerilir).');
  }

  // PCB Standoff kenar mesafesi dinamik güvenlik sınırı
  const minBoardDim = Math.min(pcbW, pcbL);
  const maxSafeEdge = Math.max(2.5, minBoardDim * 0.5 - insert.bossOD * 0.5 - 1.2);
  const requestedEdge = clamp(Number(rawParams.Delik_Kenar_Mesafesi_mm) || 3.5, 2.5, 15.0);
  const edgeDist = Math.min(requestedEdge, maxSafeEdge);
  if (requestedEdge > maxSafeEdge + 0.05) {
    warnings.push(`Delik_Kenar_Mesafesi çakışmayı önlemek için ${edgeDist.toFixed(1)}mm değerine sınırlandı.`);
  }

  // Standoff yüksekliği: kör konik insert yuvasının tabanı delmemesi için min taban et payı >= 2.0mm
  const standoffH = clamp(Math.max(5.8, insert.boreDepth - wallT + 2.2), 5.0, Math.max(6.5, innerH * 0.30));
  const pcbThick = 1.6;
  const pcbBottomY = wallT + standoffH;
  const pcbTopY = pcbBottomY + pcbThick;

  // Köşe kapak vidalama kolonları: PCB köşesi ile silindirik boss arasında garantili >= 1.2mm boşluk
  const rLidBoss = insert.bossOD * 0.5;
  const cornerDelta = Math.round((0.72 * rLidBoss + 0.90) * 10) / 10;
  const lidBossX = pcbW * 0.5 + cornerDelta;
  const lidBossZ = pcbL * 0.5 + cornerDelta;

  // İç oyuk ve dış gövde eşmerkezli yuvarlatılmış dikdörtgen boyutları
  const innerHalfX = lidBossX + rLidBoss;
  const innerHalfZ = lidBossZ + rLidBoss;
  const outerHalfX = innerHalfX + wallT;
  const outerHalfZ = innerHalfZ + wallT;
  const rCornerIn = rLidBoss;
  const rCornerOut = rLidBoss + wallT;

  const innerW = innerHalfX * 2;
  const innerL = innerHalfZ * 2;
  const outerW = outerHalfX * 2;
  const outerL = outerHalfZ * 2;
  const outerH = innerH + wallT * 2;

  // Kapak - Alt Kutu ayrım düzlemi (splitY) ve 0.20mm geçmeli dudak-oluk (lip & groove)
  const lidInternalSkirt = clamp(Math.round(innerH * 0.20 * 10) / 10, 4.4, 8.5);
  const lidCeilingY = wallT + innerH;
  const lidTopY = outerH;
  const splitY = lidCeilingY - lidInternalSkirt;

  const seamClearance = SEAM_CLEARANCE_MM; // 0.20 mm
  const lipThick = Math.max(0.80, wallT * 0.5 - seamClearance * 0.5);
  const lipHeight = 2.20;
  const grooveInnerOffset = lipThick + seamClearance; // lipThick + 0.20 mm radyal boşluk
  const grooveHeight = lipHeight + seamClearance;    // lipHeight + 0.20 mm eksenel boşluk

  // PCB Standoff merkezleri (4 adet)
  const sx = pcbW * 0.5 - edgeDist;
  const sz = pcbL * 0.5 - edgeDist;
  const pcbStandoffs = [
    { id: 'S1', x: -sx, z: -sz, label: 'S1 (Ön-Sol)' },
    { id: 'S2', x:  sx, z: -sz, label: 'S2 (Ön-Sağ)' },
    { id: 'S3', x:  sx, z:  sz, label: 'S3 (Arka-Sağ)' },
    { id: 'S4', x: -sx, z:  sz, label: 'S4 (Arka-Sol)' }
  ];

  // Kapak Köşe Boss merkezleri (4 adet)
  const lidBosses = [
    { id: 'K1', x: -lidBossX, z: -lidBossZ, sx: -1, sz: -1, theta0: Math.PI * 0.5 },
    { id: 'K2', x:  lidBossX, z: -lidBossZ, sx:  1, sz: -1, theta0: 0 },
    { id: 'K3', x:  lidBossX, z:  lidBossZ, sx:  1, sz:  1, theta0: Math.PI * 1.5 },
    { id: 'K4', x: -lidBossX, z:  lidBossZ, sx: -1, sz:  1, theta0: Math.PI }
  ];

  // Yan duvar açıklıkları (USB-C + Özelleştirilebilir Yan G/Ç kesitleri)
  const wallSpans = {
    front: lidBossX * 2,
    back: lidBossX * 2,
    left: lidBossZ * 2,
    right: lidBossZ * 2
  };

  const activeCutouts = [];

  if (rawParams.USB_Konnektor_Deligi_Ekle) {
    const usbWall = ['front', 'back', 'left', 'right'].includes(rawParams.USB_Duvar) ? rawParams.USB_Duvar : 'front';
    const span = wallSpans[usbWall];
    const usbW = 9.4;
    const usbH = 3.6;
    const shroudW = 13.0;
    const shroudH = 7.0;
    const maxOff = Math.max(0, span * 0.5 - shroudW * 0.5 - 1.5);
    const usbOff = clamp(Number(rawParams.USB_Ofset_mm) || 0, -maxOff, maxOff);
    const usbCenterY = clamp(pcbTopY + usbH * 0.5 + 0.15, wallT + usbH * 0.5 + 1.0, splitY - shroudH * 0.5 - 1.0);

    activeCutouts.push({
      id: 'USB-C',
      isUsb: true,
      wall: usbWall,
      type: 'stadium',
      label: 'USB Type-C (9.4×3.6mm + Havşa)',
      offsetMm: usbOff,
      centerY: usbCenterY,
      width: usbW,
      height: usbH,
      cornerR: 1.7,
      shroudW,
      shroudH,
      shroudR: 2.4,
      unitTL: 18.50
    });
  }

  const rawSidePorts = Array.isArray(rawParams.sidePorts) ? rawParams.sidePorts : [];
  rawSidePorts.forEach((p, idx) => {
    const wall = ['front', 'back', 'left', 'right'].includes(p.wall) ? p.wall : 'back';
    const span = wallSpans[wall];
    const w = clamp(Number(p.width) || 8.2, 2.4, Math.max(4.0, span - 6.0));
    const h = clamp(Number(p.height) || 8.2, 2.0, Math.max(3.0, splitY - wallT - 3.2));
    const maxOff = Math.max(0, span * 0.5 - w * 0.5 - 1.6);
    const off = clamp(Number(p.offsetMm) || 0, -maxOff, maxOff);
    const desiredY = pcbTopY + (Number(p.zAbovePcb) || h * 0.5 + 1.0);
    const cy = clamp(desiredY, wallT + h * 0.5 + 1.2, splitY - h * 0.5 - 1.4);

    // Aynı duvardaki mevcut kesitlerle çakışma kontrolü
    const overlapsExisting = activeCutouts.some((existing) => {
      if (existing.wall !== wall) return false;
      const exW = existing.isUsb ? existing.shroudW : existing.width;
      const exH = existing.isUsb ? existing.shroudH : existing.height;
      return (
        Math.abs(existing.offsetMm - off) < (exW + w) * 0.5 + 1.6 &&
        Math.abs(existing.centerY - cy) < (exH + h) * 0.5 + 1.6
      );
    });

    if (overlapsExisting) {
      warnings.push(`Yan G/Ç #${idx + 1} (${p.label || 'Kesit'}) aynı duvardaki başka bir delikle çakıştığı için atlandı.`);
    } else {
      const pType = p.type === 'circle' ? 'circle' : p.type === 'stadium' ? 'stadium' : 'rect';
      activeCutouts.push({
        id: p.id || `IO-${idx + 1}`,
        isUsb: false,
        wall,
        type: pType,
        label: p.label || `G/Ç Kesit ${idx + 1}`,
        offsetMm: off,
        centerY: cy,
        width: w,
        height: pType === 'circle' ? w : h,
        cornerR: pType === 'circle' ? w * 0.5 : pType === 'stadium' ? Math.min(w, h) * 0.48 : 1.0,
        unitTL: Number(p.unitTL) || 15.0
      });
    }
  });

  // Havalandırma Panjurları (Yan 45° Panjur + Üst Kapak Izgarası)
  const ventsEnabled = Boolean(rawParams.Havalandirma_Izgarasi);
  const sideLouvers = [];
  const lidVentSlots = [];

  if (ventsEnabled) {
    // Sol ve Sağ duvarlara 45° eğimli desteksiz (self-supporting) panjur pencereleri
    ['left', 'right'].forEach((wall) => {
      const span = wallSpans[wall];
      const availH = splitY - (pcbTopY + 1.5) - 2.4;
      const louverW = clamp(span * 0.56, 12.0, 56.0);
      if (availH >= 6.8 && span >= 18.0) {
        const slotPitch = 3.2;
        const slotCount = clamp(Math.floor(availH / slotPitch), 2, 8);
        const winH = slotCount * slotPitch + 1.2;
        const winCenterY = splitY - 2.2 - winH * 0.5;

        // Bu duvarda çakışan G/Ç var mı kontrol et
        const blocked = activeCutouts.some((c) => {
          if (c.wall !== wall) return false;
          const cw = c.isUsb ? c.shroudW : c.width;
          const ch = c.isUsb ? c.shroudH : c.height;
          return (
            Math.abs(c.offsetMm) < (cw + louverW) * 0.5 + 2.0 &&
            Math.abs(c.centerY - winCenterY) < (ch + winH) * 0.5 + 2.0
          );
        });

        if (!blocked) {
          sideLouvers.push({
            wall,
            width: louverW,
            height: winH,
            centerY: winCenterY,
            slotCount,
            slotPitch
          });
        }
      }
    });

    // Üst Kapak çift sıra havalandırma ızgarası
    const safeVentSpanX = Math.max(0, pcbW - 14.0);
    const slotLenZ = clamp(pcbL * 0.28, 8.0, 26.0);
    if (safeVentSpanX >= 14.0 && pcbL >= 34.0) {
      const pitchX = 4.6;
      const slotW = 2.0;
      const countPerBank = clamp(Math.floor(safeVentSpanX / pitchX), 3, 22);
      const bankOffsetZ = Math.max(slotLenZ * 0.5 + 3.5, pcbL * 0.24);
      const totalSpanX = (countPerBank - 1) * pitchX;

      [-bankOffsetZ, bankOffsetZ].forEach((bz) => {
        if (Math.abs(bz) + slotLenZ * 0.5 < lidBossZ - 2.0) {
          for (let i = 0; i < countPerBank; i++) {
            const bx = -totalSpanX * 0.5 + i * pitchX;
            // Köşe vida havşalarından güvenli uzaklık kontrolü
            const nearCorner = lidBosses.some((kb) => {
              const dx = Math.max(0, Math.abs(bx - kb.x) - slotW * 0.5);
              const dz = Math.max(0, Math.abs(bz - kb.z) - slotLenZ * 0.5);
              return Math.hypot(dx, dz) < insert.cboreDia * 0.5 + 2.4;
            });
            if (!nearCorner) {
              lidVentSlots.push({ x: bx, z: bz, w: slotW, l: slotLenZ, r: 0.95 });
            }
          }
        }
      });
    }
  }

  const sku = `PK-${Math.round(pcbW)}x${Math.round(pcbL)}x${Math.round(innerH)}-${insertType}`;

  return {
    sku,
    pcbW,
    pcbL,
    pcbThick,
    pcbBottomY,
    pcbTopY,
    innerH,
    wallT,
    standoffH,
    edgeDist,
    insertType,
    insert,
    rLidBoss,
    cornerDelta,
    lidBossX,
    lidBossZ,
    innerHalfX,
    innerHalfZ,
    outerHalfX,
    outerHalfZ,
    rCornerIn,
    rCornerOut,
    innerW,
    innerL,
    outerW,
    outerL,
    outerH,
    lidInternalSkirt,
    lidCeilingY,
    lidTopY,
    splitY,
    seamClearance,
    lipThick,
    lipHeight,
    grooveInnerOffset,
    grooveHeight,
    pcbStandoffs,
    lidBosses,
    wallSpans,
    activeCutouts,
    ventsEnabled,
    sideLouvers,
    lidVentSlots,
    warnings
  };
}

/* ============================================================================
 * 2D ŞEKİL VE MANİFOLD KATMAN İNŞA YARDIMCILARI
 * Not: (u = x, v = -z) düzleminde CCW dış kontur + rotateX(-PI/2) => +Y ekstrüzyon
 * ========================================================================== */

function createRoundedRectShape(halfW, halfL, radius, ccw = true) {
  const r = Math.min(radius, halfW - 0.05, halfL - 0.05);
  const path = ccw ? new THREE.Shape() : new THREE.Path();

  if (ccw) {
    // (u, v) düzleminde saat yönünün tersi (CCW)
    path.moveTo(-halfW + r, -halfL);
    path.lineTo(halfW - r, -halfL);
    path.absarc(halfW - r, -halfL + r, r, -Math.PI * 0.5, 0, false);
    path.lineTo(halfW, halfL - r);
    path.absarc(halfW - r, halfL - r, r, 0, Math.PI * 0.5, false);
    path.lineTo(-halfW + r, halfL);
    path.absarc(-halfW + r, halfL - r, r, Math.PI * 0.5, Math.PI, false);
    path.lineTo(-halfW, -halfL + r);
    path.absarc(-halfW + r, -halfL + r, r, Math.PI, Math.PI * 1.5, false);
    path.closePath();
  } else {
    // Delik (Hole) için saat yönü (CW)
    path.moveTo(-halfW + r, -halfL);
    path.absarc(-halfW + r, -halfL + r, r, Math.PI * 1.5, Math.PI, true);
    path.lineTo(-halfW, halfL - r);
    path.absarc(-halfW + r, halfL - r, r, Math.PI, Math.PI * 0.5, true);
    path.lineTo(halfW - r, halfL);
    path.absarc(halfW - r, halfL - r, r, Math.PI * 0.5, 0, true);
    path.lineTo(halfW, -halfL + r);
    path.absarc(halfW - r, -halfL + r, r, 0, -Math.PI * 0.5, true);
    path.closePath();
  }
  return path;
}

function createSlotHole2D(uCenter, vCenter, w, h, rRaw) {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = Math.min(rRaw, hw - 0.02, hh - 0.02);
  const p = new THREE.Path();

  if (Math.abs(w - h) < 0.05 && Math.abs(r - hw) < 0.08) {
    p.absarc(uCenter, vCenter, hw, 0, Math.PI * 2, true);
    return p;
  }

  // CW delik yolu
  p.moveTo(uCenter - hw + r, vCenter - hh);
  p.absarc(uCenter - hw + r, vCenter - hh + r, r, Math.PI * 1.5, Math.PI, true);
  p.lineTo(uCenter - hw, vCenter + hh - r);
  p.absarc(uCenter - hw + r, vCenter + hh - r, r, Math.PI, Math.PI * 0.5, true);
  p.lineTo(uCenter + hw - r, vCenter + hh);
  p.absarc(uCenter + hw - r, vCenter + hh - r, r, Math.PI * 0.5, 0, true);
  p.lineTo(uCenter + hw, vCenter - hh + r);
  p.absarc(uCenter + hw - r, vCenter - hh + r, r, 0, -Math.PI * 0.5, true);
  p.closePath();
  return p;
}

function extrudeY(shape, yMin, yMax, curveSegments = 28) {
  const depth = yMax - yMin;
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments
  });
  geom.rotateX(-Math.PI * 0.5);
  geom.translate(0, yMin, 0);
  return cleanSubGeometry(geom);
}

/**
 * Su Geçirmez (0 Açık Kenar) Konik Delikli / Kademeli Havşalı Kolon İnşacısı
 * Hem konik pirinç insert yuvalı PCB standoff'ları hem de köşe kolonlarını inşa eder.
 *
 * @param {Array<{du:number, dv:number}>} unitDirs - Merkez etrafında CCW birim yönler (u=x, v=-z)
 * @param {Array<{y:number, outerRadii:number[]|number, holeR:number}>} levels - Aşağıdan yukarıya katmanlar
 * @param {number} cx - Dünya X merkezi
 * @param {number} cz - Dünya Z merkezi
 * @param {boolean} throughHole - Delik alttan üste tam açık mı (örn. kapak vida deliği) yoksa kör delik mi?
 */
function buildLoftedHollowColumn(unitDirs, levels, cx, cz, throughHole = false) {
  const M = unitDirs.length;
  const positions = [];

  const pushTri = (ax, ay, az, bx, by, bz, ccx, ccy, ccz) => {
    positions.push(ax, ay, az, bx, by, bz, ccx, ccy, ccz);
  };

  const getOuterPt = (lvl, i) => {
    const r = Array.isArray(lvl.outerRadii) ? lvl.outerRadii[i] : lvl.outerRadii;
    return [cx + unitDirs[i].du * r, lvl.y, cz - unitDirs[i].dv * r];
  };

  const getInnerPt = (lvl, i) => {
    const r = lvl.holeR;
    return [cx + unitDirs[i].du * r, lvl.y, cz - unitDirs[i].dv * r];
  };

  // 1. Alt Kapak (Bottom Cap, normal = -Y)
  const botLvl = levels[0];
  if (throughHole && botLvl.holeR > 0) {
    for (let i = 0; i < M; i++) {
      const ni = (i + 1) % M;
      const o0 = getOuterPt(botLvl, i);
      const o1 = getOuterPt(botLvl, ni);
      const h0 = getInnerPt(botLvl, i);
      const h1 = getInnerPt(botLvl, ni);
      pushTri(...h0, ...o1, ...o0);
      pushTri(...h0, ...h1, ...o1);
    }
  } else {
    for (let i = 0; i < M; i++) {
      const ni = (i + 1) % M;
      const o0 = getOuterPt(botLvl, i);
      const o1 = getOuterPt(botLvl, ni);
      pushTri(cx, botLvl.y, cz, ...o1, ...o0);
    }
  }

  // 2. Dış Yan Duvarlar (Outer Side Walls, normal = dışarı)
  for (let k = 0; k < levels.length - 1; k++) {
    const l0 = levels[k];
    const l1 = levels[k + 1];
    // Aynı Y'de dış yarıçap kademesi varsa yatay omuz halkası ör
    for (let i = 0; i < M; i++) {
      const ni = (i + 1) % M;
      const a = getOuterPt(l0, i);
      const b = getOuterPt(l0, ni);
      const c = getOuterPt(l1, ni);
      const d = getOuterPt(l1, i);
      const samePt = (
        Math.abs(a[0] - d[0]) < 1e-6 &&
        Math.abs(a[1] - d[1]) < 1e-6 &&
        Math.abs(a[2] - d[2]) < 1e-6 &&
        Math.abs(b[0] - c[0]) < 1e-6 &&
        Math.abs(b[1] - c[1]) < 1e-6 &&
        Math.abs(b[2] - c[2]) < 1e-6
      );
      if (!samePt) {
        pushTri(...a, ...b, ...c);
        pushTri(...a, ...c, ...d);
      }
    }
  }

  // 3. Üst Halkasal Kapak (Top Annular Cap, normal = +Y)
  const topLvl = levels[levels.length - 1];
  if (topLvl.holeR > 0) {
    for (let i = 0; i < M; i++) {
      const ni = (i + 1) % M;
      const o0 = getOuterPt(topLvl, i);
      const o1 = getOuterPt(topLvl, ni);
      const h0 = getInnerPt(topLvl, i);
      const h1 = getInnerPt(topLvl, ni);
      pushTri(...h0, ...o0, ...o1);
      pushTri(...h0, ...o1, ...h1);
    }
  } else {
    for (let i = 0; i < M; i++) {
      const ni = (i + 1) % M;
      const o0 = getOuterPt(topLvl, i);
      const o1 = getOuterPt(topLvl, ni);
      pushTri(cx, topLvl.y, cz, ...o0, ...o1);
    }
  }

  // 4. İç Konik / Kademeli Delik Duvarı + Kör Delik Tabanı
  let boreStartIdx = 0;
  if (!throughHole) {
    boreStartIdx = levels.findIndex((l) => l.holeR > 0);
    if (boreStartIdx >= 0) {
      const floorLvl = levels[boreStartIdx];
      // Kör delik taban kapağı (normal = +Y yukarı bakar)
      for (let i = 0; i < M; i++) {
        const ni = (i + 1) % M;
        const h0 = getInnerPt(floorLvl, i);
        const h1 = getInnerPt(floorLvl, ni);
        pushTri(cx, floorLvl.y, cz, ...h0, ...h1);
      }
    }
  }

  if (boreStartIdx >= 0) {
    for (let k = boreStartIdx; k < levels.length - 1; k++) {
      const l0 = levels[k];
      const l1 = levels[k + 1];
      if (l0.holeR <= 0 && l1.holeR <= 0) continue;
      for (let i = 0; i < M; i++) {
        const ni = (i + 1) % M;
        const a = getInnerPt(l0, i);
        const b = getInnerPt(l0, ni);
        const c = getInnerPt(l1, ni);
        const d = getInnerPt(l1, i);
        const sameInner = (
          Math.abs(a[0] - d[0]) < 1e-6 &&
          Math.abs(a[1] - d[1]) < 1e-6 &&
          Math.abs(a[2] - d[2]) < 1e-6
        );
        if (!sameInner) {
          // İç yüzey normali merkeze (veya kademede +Y yukarı) bakar
          pushTri(...a, ...c, ...b);
          pushTri(...a, ...d, ...c);
        }
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return cleanSubGeometry(geom);
}

function makeCircularUnitDirs(segments = 48) {
  const dirs = [];
  for (let i = 0; i < segments; i++) {
    const th = (i / segments) * Math.PI * 2;
    dirs.push({ du: Math.cos(th), dv: Math.sin(th) });
  }
  return dirs;
}

/**
 * Köşe kolonu için 90° dış duvar yayı (rCornerOut) + 270° iç boss yayı (rBoss) konturu
 */
function makeCornerColumnProfile(theta0, rCornerOut, rBossInner) {
  const dirs = [];
  const radii = [];
  const outerArcSegs = 16;
  const innerArcSegs = 36;

  // theta0 boyunca içten dışa radyal adım için aynı açıda 2 nokta yerine
  // çok küçük açısal epsilon (1e-4 rad) kullanarak sıfır dejenere üçgen garantile
  const eps = 0.0004;

  // 1. Dış 90° köşe yayı: theta0 -> theta0 + PI/2
  for (let i = 0; i <= outerArcSegs; i++) {
    const t = i / outerArcSegs;
    const th = theta0 + eps + t * (Math.PI * 0.5 - 2 * eps);
    dirs.push({ du: Math.cos(th), dv: Math.sin(th) });
    radii.push(rCornerOut);
  }

  // 2. İç 270° boss yayı: theta0 + PI/2 -> theta0 + 2*PI
  for (let i = 0; i <= innerArcSegs; i++) {
    const t = i / innerArcSegs;
    const th = theta0 + Math.PI * 0.5 + eps + t * (Math.PI * 1.5 - 2 * eps);
    dirs.push({ du: Math.cos(th), dv: Math.sin(th) });
    radii.push(rBossInner);
  }

  return { dirs, radii };
}

/**
 * Düz Yan Duvar Paneli (G/Ç delikleri + USB dış havşa cebi + 45° eğimli panjur kanatları)
 */
function buildStraightWallWithFeatures(wallName, spec) {
  const { wallT, splitY, lidBossX, lidBossZ, innerHalfX, innerHalfZ, activeCutouts, sideLouvers } = spec;
  const isZWall = wallName === 'front' || wallName === 'back';
  const span = isZWall ? lidBossX * 2 : lidBossZ * 2;
  const wallH = splitY - wallT;

  const cutouts = activeCutouts.filter((c) => c.wall === wallName);
  const louver = sideLouvers.find((l) => l.wall === wallName);
  const hasUsb = cutouts.some((c) => c.isUsb);

  const parts = [];

  // Duvar yerel koordinatında: u ∈ [-span/2, +span/2], v ∈ [0, wallH] (v = y - wallT), z ∈ [0, thickness] (dıştan içe)
  const makeWallLayer = (zStart, zEnd, useUsbShroud) => {
    const shape = new THREE.Shape();
    const hw = span * 0.5;
    shape.moveTo(-hw, 0);
    shape.lineTo(hw, 0);
    shape.lineTo(hw, wallH);
    shape.lineTo(-hw, wallH);
    shape.closePath();

    cutouts.forEach((c) => {
      const w = c.isUsb && useUsbShroud ? c.shroudW : c.width;
      const h = c.isUsb && useUsbShroud ? c.shroudH : c.height;
      const r = c.isUsb && useUsbShroud ? c.shroudR : c.cornerR;
      const vc = c.centerY - wallT;
      shape.holes.push(createSlotHole2D(c.offsetMm, vc, w, h, r));
    });

    if (louver) {
      const vc = louver.centerY - wallT;
      shape.holes.push(createSlotHole2D(0, vc, louver.width, louver.height, 1.2));
    }

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: zEnd - zStart,
      bevelEnabled: false,
      steps: 1,
      curveSegments: 24
    });
    geom.translate(0, wallT, zStart);
    return cleanSubGeometry(geom);
  };

  if (hasUsb) {
    const outerShroudDepth = Math.min(1.15, wallT * 0.46);
    parts.push(makeWallLayer(0, outerShroudDepth, true));
    parts.push(makeWallLayer(outerShroudDepth, wallT, false));
  } else {
    parts.push(makeWallLayer(0, wallT, false));
  }

  // 45° Eğimli Havalandırma Panjur Kanatları (Desteksiz FDM baskıya uygun eğimli paralelkenar kanatlar)
  if (louver) {
    const bladeThick = 1.15;
    const slopeRise = Math.min(wallT * 0.78, 1.85); // Dıştan içe doğru yukarı ~38°-42° eğim
    const winBottomY = louver.centerY - louver.height * 0.5;

    for (let i = 0; i < louver.slotCount; i++) {
      const yOuter = winBottomY + 0.5 + i * louver.slotPitch;
      if (yOuter + slopeRise + bladeThick > louver.centerY + louver.height * 0.5 - 0.15) continue;

      // Kesit (z_depth, y) düzleminde paralelkenar, u = [-louver.width/2 .. +louver.width/2] boyunca ekstrüde
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0, yOuter);
      bladeShape.lineTo(wallT, yOuter + slopeRise);
      bladeShape.lineTo(wallT, yOuter + slopeRise + bladeThick);
      bladeShape.lineTo(0, yOuter + bladeThick);
      bladeShape.closePath();

      const bladeGeom = new THREE.ExtrudeGeometry(bladeShape, {
        depth: louver.width + 0.4,
        bevelEnabled: false,
        steps: 1
      });
      // Extrude +Z (uzunluk) -> X eksenine çevir, bladeShape X -> duvar kalınlığı +Z
      bladeGeom.rotateY(Math.PI * 0.5);
      // rotateY(+90°): x' = z_extrude, y' = y, z' = -x_shape => x_shape ∈ [0, wallT] -> z' ∈ [-wallT, 0]
      // Düzeltme: z' ∈ [0, wallT] olması için translate( -louverW/2, 0, wallT ) yerine simetrik yapalım:
      const correctedBlade = new THREE.Shape();
      correctedBlade.moveTo(0, yOuter);
      correctedBlade.lineTo(-wallT, yOuter + slopeRise);
      correctedBlade.lineTo(-wallT, yOuter + slopeRise + bladeThick);
      correctedBlade.lineTo(0, yOuter + bladeThick);
      correctedBlade.closePath();
      bladeGeom.dispose();

      const bGeom = new THREE.ExtrudeGeometry(correctedBlade, {
        depth: louver.width + 0.2,
        bevelEnabled: false,
        steps: 1
      });
      // Ters sarım oluşmaması için CW yerine CCW kontrolü:
      // (0, y0) -> (0, y0+t) -> (-wallT, y0+rise+t) -> (-wallT, y0+rise) CCW'dir!
      bGeom.dispose();

      const ccwBlade = new THREE.Shape();
      ccwBlade.moveTo(0, yOuter);
      ccwBlade.lineTo(0, yOuter + bladeThick);
      ccwBlade.lineTo(-wallT, yOuter + slopeRise + bladeThick);
      ccwBlade.lineTo(-wallT, yOuter + slopeRise);
      ccwBlade.closePath();

      const finGeom = new THREE.ExtrudeGeometry(ccwBlade, {
        depth: louver.width + 0.2,
        bevelEnabled: false,
        steps: 1
      });
      finGeom.rotateY(Math.PI * 0.5);
      // rotateY(+90): x' = z_ext (0..W), y' = y, z' = -x_shape (0..+wallT)
      finGeom.translate(-(louver.width + 0.2) * 0.5, 0, 0);
      parts.push(cleanSubGeometry(finGeom));
    }
  }

  const wallMerged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());

  // Yerel duvar koordinatını (z=0 dış yüzey, z=wallT iç yüzey) dünya koordinatına taşı
  if (wallName === 'front') {
    // Ön duvar (-Z): dış yüzey z = -(innerHalfZ + wallT), içe doğru +Z
    wallMerged.translate(0, 0, -(innerHalfZ + wallT));
  } else if (wallName === 'back') {
    // Arka duvar (+Z): dış yüzey z = +(innerHalfZ + wallT), içe doğru -Z (180° Y dönüşü)
    wallMerged.rotateY(Math.PI);
    wallMerged.translate(0, 0, innerHalfZ + wallT);
  } else if (wallName === 'left') {
    // Sol duvar (-X): dış yüzey x = -(innerHalfX + wallT), içe doğru +X (+90° Y dönüşü)
    wallMerged.rotateY(Math.PI * 0.5);
    wallMerged.translate(-(innerHalfX + wallT), 0, 0);
  } else if (wallName === 'right') {
    // Sağ duvar (+X): dış yüzey x = +(innerHalfX + wallT), içe doğru -X (-90° Y dönüşü)
    wallMerged.rotateY(-Math.PI * 0.5);
    wallMerged.translate(innerHalfX + wallT, 0, 0);
  }

  return wallMerged;
}

function cleanSubGeometry(geom) {
  let g = geom;
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.normal) g.deleteAttribute('normal');
  g = mergeVertices(g, 1e-4);
  g.computeVertexNormals();
  return g;
}

function finalizeCADGeometry(geoms) {
  const nonIndexedList = geoms.map((g) => {
    const ni = g.index ? g.toNonIndexed() : g.clone();
    if (ni.attributes.uv) ni.deleteAttribute('uv');
    ni.computeVertexNormals();
    return ni;
  });
  const merged = mergeGeometries(nonIndexedList, false);
  nonIndexedList.forEach((g) => g.dispose());
  geoms.forEach((g) => g.dispose());
  return merged;
}

/**
 * 2. ALT KUTU (BASE) KATMANLI MANİFOLD İNŞASI
 */
export function buildBaseGeometry(spec) {
  const {
    wallT,
    standoffH,
    splitY,
    outerHalfX,
    outerHalfZ,
    innerHalfX,
    innerHalfZ,
    rCornerOut,
    rCornerIn,
    rLidBoss,
    lipThick,
    lipHeight,
    insert,
    pcbStandoffs,
    lidBosses
  } = spec;

  const baseParts = [];

  // A. Alt Taban Plakası (0.5mm alt dış pah ile fil ayağı / elephant-foot önleyici DFM!)
  const chamferB = Math.min(0.5, wallT * 0.25);
  const botFloorDirs = [];
  const botOuterR = [];
  const botChamferR = [];
  // Taban plakasını alt pah + düz gövde olarak inşa edelim:
  const floorLower = extrudeY(
    createRoundedRectShape(outerHalfX - chamferB * 0.5, outerHalfZ - chamferB * 0.5, rCornerOut - chamferB * 0.5, true),
    0,
    chamferB,
    32
  );
  const floorUpper = extrudeY(
    createRoundedRectShape(outerHalfX, outerHalfZ, rCornerOut, true),
    chamferB,
    wallT,
    32
  );
  baseParts.push(floorLower, floorUpper);

  // B. 4× Konik Isıl Çakma Pirinç Insert Yuvalı PCB Standoff'ları
  const circDirs = makeCircularUnitDirs(44);
  const rBoss = insert.bossOD * 0.5;
  const rFlare = rBoss + 1.15; // Taban kesme gerilmesi destek radyüsü (gusset flare)
  const rPilot = insert.borePilotDia * 0.5;
  const rNom = insert.boreNomDia * 0.5;
  const rRoot = insert.boreRootDia * 0.5;
  const rRelief = Math.max(1.0, rRoot - 0.12);

  const standTopY = wallT + standoffH;
  const standBoreFloorY = standTopY - insert.boreDepth;
  const standRootY = standBoreFloorY + 0.9;
  const standLeadY = standTopY - insert.leadInDepth;

  const standoffLevels = [
    { y: wallT, outerRadii: rFlare, holeR: 0 },
    { y: Math.min(standBoreFloorY, wallT + 1.3), outerRadii: rBoss, holeR: 0 },
    { y: standBoreFloorY, outerRadii: rBoss, holeR: 0 },
    { y: standBoreFloorY, outerRadii: rBoss, holeR: rRelief },
    { y: standRootY, outerRadii: rBoss, holeR: rRoot },
    { y: standLeadY, outerRadii: rBoss, holeR: rNom },
    { y: standTopY - 0.25, outerRadii: rBoss, holeR: rPilot - 0.08 },
    { y: standTopY, outerRadii: rBoss - 0.25, holeR: rPilot }
  ];

  pcbStandoffs.forEach((st) => {
    baseParts.push(buildLoftedHollowColumn(circDirs, standoffLevels, st.x, st.z, false));
  });

  // C. 4× Düz Yan Duvar Panelleri (USB-C havşalı delik + Yan G/Ç kesitleri + 45° Panjur kanatları)
  ['front', 'back', 'left', 'right'].forEach((wName) => {
    baseParts.push(buildStraightWallWithFeatures(wName, spec));
  });

  // D. 4× Köşe Kolonları + Konik Pirinç Insert Yuvaları (Kapak vidalama kolonları)
  const colBoreFloorY = splitY - insert.boreDepth;
  const colRootY = colBoreFloorY + 0.9;
  const colLeadY = splitY - insert.leadInDepth;

  lidBosses.forEach((kb) => {
    const { dirs, radii } = makeCornerColumnProfile(kb.theta0, rCornerOut, rLidBoss);
    const colLevels = [
      { y: wallT, outerRadii: radii, holeR: 0 },
      { y: colBoreFloorY, outerRadii: radii, holeR: 0 },
      { y: colBoreFloorY, outerRadii: radii, holeR: rRelief },
      { y: colRootY, outerRadii: radii, holeR: rRoot },
      { y: colLeadY, outerRadii: radii, holeR: rNom },
      { y: splitY, outerRadii: radii, holeR: rPilot }
    ];
    baseParts.push(buildLoftedHollowColumn(dirs, colLevels, kb.x, kb.z, false));
  });

  // E. 360° Geçmeli İç Dudak (Interlocking Lip: splitY -> splitY + lipHeight, 0.3mm üst kılavuz pahlı)
  const lipBevel = 0.30;
  const lipOuterHX = innerHalfX + lipThick;
  const lipOuterHZ = innerHalfZ + lipThick;
  const lipOuterR = rCornerIn + lipThick;

  const lipMainShape = createRoundedRectShape(lipOuterHX, lipOuterHZ, lipOuterR, true);
  lipMainShape.holes.push(createRoundedRectShape(innerHalfX, innerHalfZ, rCornerIn, false));
  baseParts.push(extrudeY(lipMainShape, splitY, splitY + lipHeight - lipBevel, 32));

  const lipTipShape = createRoundedRectShape(lipOuterHX - 0.22, lipOuterHZ - 0.22, lipOuterR - 0.22, true);
  lipTipShape.holes.push(createRoundedRectShape(innerHalfX, innerHalfZ, rCornerIn, false));
  baseParts.push(extrudeY(lipTipShape, splitY + lipHeight - lipBevel, splitY + lipHeight, 32));

  return {
    geometry: finalizeCADGeometry(baseParts),
    subShellCount: baseParts.length
  };
}

/**
 * 3. ÜST KAPAK (LID) KATMANLI MANİFOLD İNŞASI
 * 0.20mm Boşluklu Karşılık Oluğu + Gömme İmbus Vida Havşaları (Counterbores) + Havalandırma Izgarası
 */
export function buildLidGeometry(spec) {
  const {
    wallT,
    splitY,
    lidCeilingY,
    lidTopY,
    innerHalfX,
    innerHalfZ,
    outerHalfX,
    outerHalfZ,
    rCornerIn,
    rCornerOut,
    rLidBoss,
    grooveInnerOffset,
    grooveHeight,
    seamClearance,
    insert,
    lidBosses,
    lidVentSlots
  } = spec;

  const lidParts = [];

  // A. Alt Karşılık Oluğu Eteği (splitY -> splitY + grooveHeight):
  // İç sınır = innerHalf + lipThick + 0.20mm (radyal 0.20mm tam geçme boşluğu!)
  const grooveHX = innerHalfX + grooveInnerOffset;
  const grooveHZ = innerHalfZ + grooveInnerOffset;
  const grooveR = rCornerIn + grooveInnerOffset;

  const grooveRing = createRoundedRectShape(outerHalfX, outerHalfZ, rCornerOut, true);
  grooveRing.holes.push(createRoundedRectShape(grooveHX, grooveHZ, grooveR, false));
  lidParts.push(extrudeY(grooveRing, splitY, splitY + grooveHeight, 32));

  // B. Üst Kapak Ana Yan Duvar Eteği (splitY + grooveHeight -> lidCeilingY)
  if (lidCeilingY > splitY + grooveHeight + 0.05) {
    const upperSkirt = createRoundedRectShape(outerHalfX, outerHalfZ, rCornerOut, true);
    upperSkirt.holes.push(createRoundedRectShape(innerHalfX, innerHalfZ, rCornerIn, false));
    lidParts.push(extrudeY(upperSkirt, splitY + grooveHeight, lidCeilingY, 32));
  }

  // C. Üst Kapak Tavan Plakası (lidCeilingY -> lidTopY)
  // Köşe vida havşaları + opsiyonel üst havalandırma ızgarası delikleriyle birlikte
  const topChamfer = Math.min(0.45, wallT * 0.22);
  const rCbore = insert.cboreDia * 0.5;
  const rClear = insert.lidClearDia * 0.5;
  const cboreSeatY = lidTopY - insert.cboreDepth;

  // Tavan plakasını köşe kolonlarıyla çakışmayacak şekilde tam plaka + 4 vida havşa deliği ile ekstrüde et,
  // altında ise 4 köşe vida boss manşonunu (splitY + 0.10 -> lidCeilingY) ekle!
  const addTopPlateSlice = (y0, y1, holeRadius, inset = 0) => {
    if (y1 - y0 <= 0.02) return;
    const plate = createRoundedRectShape(outerHalfX - inset, outerHalfZ - inset, rCornerOut - inset, true);

    // 4 Köşe vida geçiş veya gömme havşa (counterbore) delikleri
    lidBosses.forEach((kb) => {
      const hPath = new THREE.Path();
      hPath.absarc(kb.x, -kb.z, holeRadius, 0, Math.PI * 2, true);
      plate.holes.push(hPath);
    });

    // Üst havalandırma ızgarası delikleri
    lidVentSlots.forEach((slot) => {
      plate.holes.push(createSlotHole2D(slot.x, -slot.z, slot.w, slot.l, slot.r));
    });

    lidParts.push(extrudeY(plate, y0, y1, 32));
  };

  if (cboreSeatY > lidCeilingY) {
    // Havşa tabanı tavan plakasının içinde kalıyor (standart durum)
    addTopPlateSlice(lidCeilingY, cboreSeatY, rClear, 0);
    addTopPlateSlice(cboreSeatY, lidTopY - topChamfer, rCbore, 0);
    addTopPlateSlice(lidTopY - topChamfer, lidTopY, rCbore, topChamfer * 0.7);
  } else {
    // İnce duvarda havşa tavan plakasını tam geçip alt köşe boss manşonunun içine oturur
    addTopPlateSlice(lidCeilingY, lidTopY - topChamfer, rCbore, 0);
    addTopPlateSlice(lidTopY - topChamfer, lidTopY, rCbore, topChamfer * 0.7);
  }

  // D. 4× Kapak İç Köşe Destek Boss Manşonları (splitY + 0.15 -> lidCeilingY)
  // Base iç dudağına değmemesi için dış yarıçap = rLidBoss - seamClearance (0.20mm boşluk!)
  const sleeveDirs = makeCircularUnitDirs(40);
  const rSleeveOuter = Math.max(rCbore + 0.65, rLidBoss - seamClearance);
  const sleeveBotY = splitY + 0.15;

  lidBosses.forEach((kb) => {
    let sleeveLevels;
    if (cboreSeatY < lidCeilingY) {
      sleeveLevels = [
        { y: sleeveBotY, outerRadii: rSleeveOuter, holeR: rClear },
        { y: cboreSeatY, outerRadii: rSleeveOuter, holeR: rClear },
        { y: cboreSeatY, outerRadii: rSleeveOuter, holeR: rCbore },
        { y: lidCeilingY, outerRadii: rSleeveOuter, holeR: rCbore }
      ];
    } else {
      sleeveLevels = [
        { y: sleeveBotY, outerRadii: rSleeveOuter, holeR: rClear },
        { y: lidCeilingY, outerRadii: rSleeveOuter, holeR: rClear }
      ];
    }
    lidParts.push(buildLoftedHollowColumn(sleeveDirs, sleeveLevels, kb.x, kb.z, true));
  });

  return {
    geometry: finalizeCADGeometry(lidParts),
    subShellCount: lidParts.length
  };
}

/**
 * 4. GÖRSEL MONTAJ BİLEŞENLERİ (Özel PCB + Tırtıllı Pirinç Insertler + Vidalar)
 * Not: Bu bileşenler yalnızca 3B patlatılmış montaj sahnesi ve GLB içindir; plastik STL'lere dahil edilmez.
 */
export function buildHardwareMeshes(spec, materials) {
  const {
    pcbW,
    pcbL,
    pcbThick,
    pcbBottomY,
    pcbTopY,
    standoffH,
    wallT,
    splitY,
    lidTopY,
    innerHalfX,
    innerHalfZ,
    insert,
    pcbStandoffs,
    lidBosses,
    activeCutouts
  } = spec;

  // A. FR4 PCB Kartı + Bakır Pad Halkaları + Üst SMD Konnektörler
  const pcbGroup = new THREE.Group();
  pcbGroup.name = 'PCB_Tertibati';

  const pcbShape = createRoundedRectShape(pcbW * 0.5, pcbL * 0.5, 1.8, true);
  pcbStandoffs.forEach((st) => {
    const hp = new THREE.Path();
    hp.absarc(st.x, -st.z, insert.lidClearDia * 0.5, 0, Math.PI * 2, true);
    pcbShape.holes.push(hp);
  });
  const pcbGeom = extrudeY(pcbShape, pcbBottomY, pcbTopY, 24);
  pcbGroup.add(new THREE.Mesh(pcbGeom, materials.pcbFr4));

  // Altın kaplama (ENIG) vida oturma pad halkaları
  pcbStandoffs.forEach((st) => {
    const padShape = new THREE.Shape();
    padShape.absarc(0, 0, insert.bossOD * 0.46, 0, Math.PI * 2, false);
    const padHole = new THREE.Path();
    padHole.absarc(0, 0, insert.lidClearDia * 0.52, 0, Math.PI * 2, true);
    padShape.holes.push(padHole);
    const padGeom = extrudeY(padShape, pcbTopY, pcbTopY + 0.08, 24);
    padGeom.translate(st.x, 0, st.z);
    pcbGroup.add(new THREE.Mesh(padGeom, materials.copperGold));
  });

  // Merkez MCU entegre çip maketi (görsel referans)
  const mcuSize = clamp(Math.min(pcbW, pcbL) * 0.22, 7, 16);
  const mcuGeom = new THREE.BoxGeometry(mcuSize, 1.4, mcuSize);
  mcuGeom.translate(0, pcbTopY + 0.7, 0);
  pcbGroup.add(new THREE.Mesh(mcuGeom, materials.icChip));

  // Yan G/Ç ve USB-C konnektör 3B maketleri (kesitlerle hizalı)
  activeCutouts.forEach((c) => {
    const connW = c.isUsb ? 8.9 : Math.max(4, c.width - 0.8);
    const connH = c.isUsb ? 3.2 : Math.max(2.2, c.height - 0.8);
    const connDepth = c.isUsb ? 7.4 : 9.0;
    const cGeom = new THREE.BoxGeometry(connW, connH, connDepth);

    const mesh = new THREE.Mesh(cGeom, c.isUsb ? materials.stainless : materials.icChip);
    const yPos = c.centerY;

    if (c.wall === 'front') {
      mesh.position.set(c.offsetMm, yPos, -pcbL * 0.5 + connDepth * 0.35);
    } else if (c.wall === 'back') {
      mesh.position.set(c.offsetMm, yPos, pcbL * 0.5 - connDepth * 0.35);
    } else if (c.wall === 'left') {
      mesh.rotation.y = Math.PI * 0.5;
      mesh.position.set(-pcbW * 0.5 + connDepth * 0.35, yPos, c.offsetMm);
    } else if (c.wall === 'right') {
      mesh.rotation.y = Math.PI * 0.5;
      mesh.position.set(pcbW * 0.5 - connDepth * 0.35, yPos, c.offsetMm);
    }
    pcbGroup.add(mesh);
  });

  // B. Tırtıllı Pirinç Insertler (4× PCB Standoff + 4× Kapak Köşe)
  const pcbInsertsGroup = new THREE.Group();
  pcbInsertsGroup.name = 'PCB_Pirinc_Insertler';
  const lidInsertsGroup = new THREE.Group();
  lidInsertsGroup.name = 'Kapak_Kose_Pirinc_Insertler';

  const insertDirs = makeCircularUnitDirs(28);
  const rKnurl = insert.knurlOD * 0.5;
  const rWaist = insert.boreNomDia * 0.49;
  const rThread = insert.threadDia * 0.5;
  const iLen = insert.insertLen;

  const makeBrassInsertGeom = (topY) => {
    const lvls = [
      { y: topY - iLen, outerRadii: rWaist, holeR: rThread },
      { y: topY - iLen * 0.72, outerRadii: rKnurl, holeR: rThread },
      { y: topY - iLen * 0.52, outerRadii: rWaist, holeR: rThread },
      { y: topY - iLen * 0.18, outerRadii: rKnurl, holeR: rThread },
      { y: topY, outerRadii: rKnurl - 0.1, holeR: rThread }
    ];
    return buildLoftedHollowColumn(insertDirs, lvls, 0, 0, true);
  };

  const baseInsertProto = makeBrassInsertGeom(0);

  pcbStandoffs.forEach((st) => {
    const m = new THREE.Mesh(baseInsertProto, materials.brass);
    m.position.set(st.x, wallT + standoffH + 0.04, st.z);
    pcbInsertsGroup.add(m);
  });

  lidBosses.forEach((kb) => {
    const m = new THREE.Mesh(baseInsertProto, materials.brass);
    m.position.set(kb.x, splitY + 0.04, kb.z);
    lidInsertsGroup.add(m);
  });

  // C. Montaj Vidaları (4× PCB Vidası + 4× Kapak İmbus Vidası)
  const pcbScrewsGroup = new THREE.Group();
  pcbScrewsGroup.name = 'PCB_Vidalari';
  const lidScrewsGroup = new THREE.Group();
  lidScrewsGroup.name = 'Kapak_Imbus_Vidalari';

  const screwDirs = makeCircularUnitDirs(24);
  const makeCapScrewGeom = (headR, headH, shaftR, shaftLen) => {
    const hexR = headR * 0.52;
    const lvls = [
      { y: -shaftLen, outerRadii: shaftR * 0.85, holeR: 0 },
      { y: 0, outerRadii: shaftR, holeR: 0 },
      { y: 0, outerRadii: headR, holeR: 0 },
      { y: headH * 0.45, outerRadii: headR, holeR: 0 },
      { y: headH * 0.45, outerRadii: headR, holeR: hexR },
      { y: headH, outerRadii: headR * 0.96, holeR: hexR }
    ];
    return buildLoftedHollowColumn(screwDirs, lvls, 0, 0, false);
  };

  const pcbScrewGeom = makeCapScrewGeom(insert.cboreDia * 0.44, 1.8, insert.threadDia * 0.48, 5.0);
  pcbStandoffs.forEach((st) => {
    const s = new THREE.Mesh(pcbScrewGeom, materials.stainless);
    s.position.set(st.x, pcbTopY + 0.08, st.z);
    pcbScrewsGroup.add(s);
  });

  const lidShaftLen = Math.max(8.0, lidTopY - splitY + 2.5);
  const lidScrewGeom = makeCapScrewGeom(
    insert.cboreDia * 0.45,
    insert.cboreDepth * 0.88,
    insert.threadDia * 0.48,
    lidShaftLen
  );
  lidBosses.forEach((kb) => {
    const s = new THREE.Mesh(lidScrewGeom, materials.blackOxide);
    s.position.set(kb.x, lidTopY - insert.cboreDepth + 0.05, kb.z);
    lidScrewsGroup.add(s);
  });

  return {
    pcbGroup,
    pcbInsertsGroup,
    lidInsertsGroup,
    pcbScrewsGroup,
    lidScrewsGroup
  };
}

/**
 * 5. İMZALI DÖRTYÜZLÜ (SIGNED TETRAHEDRON) HACİM & ALAN METROLOJİ MOTORU
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

  return {
    volumeMm3: Math.abs(volumeMm3),
    volCm3: Math.abs(volumeMm3) / 1000.0,
    areaMm2,
    areaCm2: areaMm2 / 100.0,
    triangleCount: Math.round(pos.count / 3),
    bboxMm: { x: size.x, y: size.y, z: size.z }
  };
}
