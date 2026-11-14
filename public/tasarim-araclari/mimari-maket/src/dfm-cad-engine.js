import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Mimari Ölçekli Maket Kat Ayırıcı, Minimum Duvar Kalınlığı Denetleyicisi (DFM)
 * ve Köşe Pimli İstifleme CAD Motoru
 * Birim Standardı: 1 Three.js Dünya Birimi = 1.00 mm
 */

export const ARCHITECTURAL_PRESETS = {
  konut_200: {
    id: 'konut_200',
    shortTitle: '01 · Çağdaş Konut Bloğu',
    subSpec: '1:200 · 8 Kat · 24×36m',
    badge: 'BALKONLU',
    label: '01 · Çağdaş Konut Bloğu (1:200 · 8 Kat)',
    Bina_En_m: 24,
    Bina_Boy_m: 36,
    Kat_Sayisi: 8,
    Kat_Yuksekligi_m: 3.4,
    Balkon_Cikma_m: 1.5,
    Pencere_Orani_Yuzde: 45,
    Maket_Olcegi: 200,
    Min_Basilir_Duvar_mm: 1.2,
    Kat_Pim_Toleransi_mm: 0.20
  },
  kule_500: {
    id: 'kule_500',
    shortTitle: '02 · Gökdelen Ofis Kulesi',
    subSpec: '1:500 · 22 Kat · 32×32m',
    badge: 'AGRESİF DFM',
    label: '02 · Gökdelen Ofis Kulesi (1:500 · 22 Kat · Agresif DFM)',
    Bina_En_m: 32,
    Bina_Boy_m: 32,
    Kat_Sayisi: 22,
    Kat_Yuksekligi_m: 3.8,
    Balkon_Cikma_m: 0.0,
    Pencere_Orani_Yuzde: 66,
    Maket_Olcegi: 500,
    Min_Basilir_Duvar_mm: 1.2,
    Kat_Pim_Toleransi_mm: 0.20
  },
  pavyon_50: {
    id: 'pavyon_50',
    shortTitle: '03 · Müze & Kültür Pavyonu',
    subSpec: '1:50 · 4 Kat · 12×16m',
    badge: 'DETAY 1:50',
    label: '03 · Müze & Kültür Pavyonu (1:50 · 4 Kat · Detay Maketi)',
    Bina_En_m: 12,
    Bina_Boy_m: 16,
    Kat_Sayisi: 4,
    Kat_Yuksekligi_m: 4.0,
    Balkon_Cikma_m: 1.8,
    Pencere_Orani_Yuzde: 58,
    Maket_Olcegi: 50,
    Min_Basilir_Duvar_mm: 1.2,
    Kat_Pim_Toleransi_mm: 0.20
  },
  karma_100: {
    id: 'karma_100',
    shortTitle: '04 · Kentsel Karma Rezidans',
    subSpec: '1:100 · 10 Kat · 18×30m',
    badge: 'YARIŞMA 1:100',
    label: '04 · Kentsel Karma Yaşam Bloğu (1:100 · 10 Kat)',
    Bina_En_m: 18,
    Bina_Boy_m: 30,
    Kat_Sayisi: 10,
    Kat_Yuksekligi_m: 3.5,
    Balkon_Cikma_m: 1.4,
    Pencere_Orani_Yuzde: 50,
    Maket_Olcegi: 100,
    Min_Basilir_Duvar_mm: 1.2,
    Kat_Pim_Toleransi_mm: 0.20
  },
  apartman_200: {
    id: 'apartman_200',
    shortTitle: '05 · Köşe Parsel Apartmanı',
    subSpec: '1:200 · 5 Kat · 14×18m',
    badge: 'HIZLI ETÜT',
    label: '05 · Köşe Parsel Apartmanı (1:200 · 5 Kat · Kompakt)',
    Bina_En_m: 14,
    Bina_Boy_m: 18,
    Kat_Sayisi: 5,
    Kat_Yuksekligi_m: 3.2,
    Balkon_Cikma_m: 1.2,
    Pencere_Orani_Yuzde: 40,
    Maket_Olcegi: 200,
    Min_Basilir_Duvar_mm: 1.2,
    Kat_Pim_Toleransi_mm: 0.20
  },
  kampus_500: {
    id: 'kampus_500',
    shortTitle: '06 · Yatay Fakülte Kampüsü',
    subSpec: '1:500 · 4 Kat · 52×22m',
    badge: 'MASTERPLAN',
    label: '06 · Yatay Fakülte Kampüsü (1:500 · 4 Kat · Geniş Baza)',
    Bina_En_m: 52,
    Bina_Boy_m: 22,
    Kat_Sayisi: 4,
    Kat_Yuksekligi_m: 4.2,
    Balkon_Cikma_m: 0.8,
    Pencere_Orani_Yuzde: 55,
    Maket_Olcegi: 500,
    Min_Basilir_Duvar_mm: 1.2,
    Kat_Pim_Toleransi_mm: 0.20
  }
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function parseScaleDenominator(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const s = String(val || '200').trim();
  const parts = s.split(':');
  const parsed = Number(parts[parts.length - 1]);
  return [50, 100, 200, 500].includes(parsed) ? parsed : 200;
}

/**
 * Cephe açıklığında (iki köşe pim kolonu arasında) pencere boşluklarını ve
 * taşıyıcı dikmeleri (mullion) >= Min_Basilir_Duvar_mm kuralına göre çözer.
 */
function solveFacadeBays(clearSpanMm, windowRatio, targetBayMm, minWallMm) {
  if (clearSpanMm < minWallMm * 2.4) {
    return {
      bayCount: 0,
      piers: [[-clearSpanMm / 2, clearSpanMm / 2]],
      windows: [],
      pierWidthMm: clearSpanMm,
      windowWidthMm: 0,
      mullionClamped: true
    };
  }

  const r = clamp(windowRatio, 0.20, 0.70);
  const idealBays = Math.max(1, Math.round(clearSpanMm / Math.max(targetBayMm, minWallMm * 2.5)));
  let chosenN = idealBays;
  let mullionClamped = false;

  // N pencere + (N - 1) ara dikme modeli (uçlarda zaten geniş köşe pim kolonları var)
  while (chosenN > 1) {
    const rawTotalPier = clearSpanMm * (1 - r);
    const pierW = rawTotalPier / (chosenN - 1);
    const winW = (clearSpanMm - pierW * (chosenN - 1)) / chosenN;
    if (pierW >= minWallMm && winW >= minWallMm) {
      break;
    }
    chosenN -= 1;
    mullionClamped = true;
  }

  if (chosenN === 1) {
    // Tek pencere: kenarlarda opsiyonel omuz dikmeleri veya doğrudan köşe kolonları arası
    let winW = clearSpanMm * r;
    let shoulderW = (clearSpanMm - winW) * 0.5;
    if (shoulderW > 0.05 && shoulderW < minWallMm) {
      // İnce omuz dikmesi nozul atlamasın diye ya minWallMm'ye kelepçelenir ya da sıfırlanır
      if (clearSpanMm - 2 * minWallMm >= minWallMm * 1.2) {
        shoulderW = minWallMm;
        winW = clearSpanMm - 2 * shoulderW;
      } else {
        shoulderW = 0;
        winW = clearSpanMm;
      }
      mullionClamped = true;
    }
    const piers = [];
    if (shoulderW >= minWallMm - 1e-4) {
      piers.push([-clearSpanMm / 2, -clearSpanMm / 2 + shoulderW]);
      piers.push([clearSpanMm / 2 - shoulderW, clearSpanMm / 2]);
    }
    return {
      bayCount: 1,
      piers,
      windows: [[-winW / 2, winW / 2]],
      pierWidthMm: shoulderW > 0 ? shoulderW : minWallMm,
      windowWidthMm: winW,
      mullionClamped
    };
  }

  // N >= 2 için ara dikme kalınlığını minWallMm altına düşürme
  let pierW = (clearSpanMm * (1 - r)) / (chosenN - 1);
  if (pierW < minWallMm) {
    pierW = minWallMm;
    mullionClamped = true;
  }
  const winW = (clearSpanMm - pierW * (chosenN - 1)) / chosenN;

  const piers = [];
  const windows = [];
  let cursor = -clearSpanMm / 2;
  for (let i = 0; i < chosenN; i++) {
    const wStart = cursor;
    const wEnd = wStart + winW;
    windows.push([wStart, wEnd]);
    cursor = wEnd;
    if (i < chosenN - 1) {
      piers.push([cursor, cursor + pierW]);
      cursor += pierW;
    }
  }

  return {
    bayCount: chosenN,
    piers,
    windows,
    pierWidthMm: pierW,
    windowWidthMm: winW,
    mullionClamped
  };
}

/**
 * Gerçek dünya mimari ölçülerini Maket_Olcegi oranında küçültür,
 * 0.4mm FDM nozulun çevre (perimetre) atlamaması için tüm ince duvar/parapet/dikmeleri
 * >= Min_Basilir_Duvar_mm değerine kelepçeler ve 0.20mm toleranslı köşe pimlerini çözer.
 */
export function solveScaleDfmSpec(rawParams) {
  const scale = parseScaleDenominator(rawParams.Maket_Olcegi);
  const binaEnM = clamp(Number(rawParams.Bina_En_m) || 24, 10, 60);
  const binaBoyM = clamp(Number(rawParams.Bina_Boy_m) || 36, 10, 60);
  const katSayisi = Math.round(clamp(Number(rawParams.Kat_Sayisi) || 8, 3, 25));
  const katYuksekligiM = clamp(Number(rawParams.Kat_Yuksekligi_m) || 3.4, 3.0, 4.5);
  const balkonCikmaM = clamp(Number(rawParams.Balkon_Cikma_m) ?? 1.5, 0, 2.0);
  const pencereYuzde = clamp(Number(rawParams.Pencere_Orani_Yuzde) || 45, 20, 70);
  const minWallMm = clamp(Number(rawParams.Min_Basilir_Duvar_mm) || 1.2, 0.8, 3.0);
  const pimTolMm = clamp(Number(rawParams.Kat_Pim_Toleransi_mm) || 0.20, 0.05, 0.50);

  const nozzleMm = 0.40;
  const mToMm = 1000 / scale;

  // 1. Ana Kütle Ölçekleme (mm)
  const enMm = binaEnM * mToMm;
  const boyMm = binaBoyM * mToMm;
  const hamKatYukseklikMm = katYuksekligiM * mToMm;
  const katYukseklikMm = Math.max(hamKatYukseklikMm, minWallMm * 3.8);

  // 2. Gerçek Mimari Cidarlar -> Ham Ölçekli -> DFM Kelepçeli (>= Min_Basilir_Duvar_mm)
  const gercekDisDuvarM = 0.30;
  const gercekDosemeM = 0.30;
  const gercekParapetKalinlikM = 0.20;
  const gercekParapetBoyM = 1.05;
  const gercekBalkonParapetM = 0.16;

  const hamDuvarMm = gercekDisDuvarM * mToMm;
  const duvarMm = Math.max(hamDuvarMm, minWallMm);
  const duvarClamped = hamDuvarMm < minWallMm - 1e-4;

  const hamDosemeMm = gercekDosemeM * mToMm;
  const dosemeMm = Math.max(hamDosemeMm, minWallMm);
  const dosemeClamped = hamDosemeMm < minWallMm - 1e-4;

  const hamParapetMm = gercekParapetKalinlikM * mToMm;
  const parapetMm = Math.max(hamParapetMm, minWallMm);
  const parapetClamped = hamParapetMm < minWallMm - 1e-4;

  const hamParapetYukseklikMm = gercekParapetBoyM * mToMm;
  const parapetYukseklikMm = Math.max(hamParapetYukseklikMm, minWallMm * 1.5);

  const hamBalkonKorkulukMm = gercekBalkonParapetM * mToMm;
  const balkonKorkulukMm = Math.max(hamBalkonKorkulukMm, minWallMm);
  const balkonKorkulukClamped = hamBalkonKorkulukMm < minWallMm - 1e-4;

  // 3. Köşe Hizalama Pimleri & Dişi Yuvalar (0.20mm radyal boşluk)
  const nominalPinByScale = scale <= 50 ? 4.8 : scale <= 100 ? 4.0 : scale <= 200 ? 3.2 : 2.6;
  const minSpanMm = Math.min(enMm, boyMm);
  let pimCapMm = Math.max(nominalPinByScale, minWallMm * 2.0, 2.4);

  // Çok küçük tabanlarda (örn. 10m @ 1:500 = 20mm) köşe kolonlarının iç boşluğu kapatmaması için sınırla
  const maxBossAllowed = minSpanMm * 0.34;
  if (pimCapMm + 2 * pimTolMm + 2 * minWallMm > maxBossAllowed) {
    pimCapMm = Math.max(minWallMm * 1.8, maxBossAllowed - 2 * pimTolMm - 2 * minWallMm);
  }

  const yuvaCapMm = pimCapMm + 2 * pimTolMm; // Her yönde Kat_Pim_Toleransi_mm boşluk
  const bossBoyutMm = Math.max(yuvaCapMm + 2 * minWallMm, duvarMm + minWallMm);

  const pimYukseklikMm = clamp(katYukseklikMm * 0.28, 1.8, 3.8);
  const yuvaZBoslukMm = 0.30; // Pimin tepeye değip kat birleşimini aralık bırakmaması için eksenel pay
  const yuvaDerinlikMm = Math.min(pimYukseklikMm + yuvaZBoslukMm, katYukseklikMm - minWallMm * 1.2);

  const pinOffsetX = enMm * 0.5 - bossBoyutMm * 0.5;
  const pinOffsetZ = boyMm * 0.5 - bossBoyutMm * 0.5;
  const pinCoords = [
    { id: 'P1_SOL_ON', x: -pinOffsetX, z: +pinOffsetZ, label: 'Sol-Ön (GB)' },
    { id: 'P2_SAG_ON', x: +pinOffsetX, z: +pinOffsetZ, label: 'Sağ-Ön (GD)' },
    { id: 'P3_SAG_ARKA', x: +pinOffsetX, z: -pinOffsetZ, label: 'Sağ-Arka (KD)' },
    { id: 'P4_SOL_ARKA', x: -pinOffsetX, z: -pinOffsetZ, label: 'Sol-Arka (KB)' }
  ];

  // 4. Düşey Pencere Bandı (Denizlik + Lento >= Min_Basilir_Duvar_mm)
  const duvarSerbestYukseklik = Math.max(katYukseklikMm - dosemeMm, minWallMm * 2.6);
  const pencereOrani = pencereYuzde / 100;
  const duseyAciklikOrani = 0.42 + 0.36 * pencereOrani;
  let lentoMm = Math.max(duvarSerbestYukseklik * (1 - duseyAciklikOrani) * 0.48, minWallMm);
  let denizlikUstuMm = Math.max(duvarSerbestYukseklik * (1 - duseyAciklikOrani) * 0.52, minWallMm);

  if (dosemeMm + denizlikUstuMm + lentoMm + minWallMm > katYukseklikMm) {
    lentoMm = minWallMm;
    denizlikUstuMm = minWallMm;
  }
  const yWinBot = dosemeMm + denizlikUstuMm;
  const yWinTop = Math.max(yWinBot + minWallMm, katYukseklikMm - lentoMm);

  // 5. Yatay Cephe Dikmeleri & Pencere Açıklıkları
  const clearSpanX = Math.max(0, enMm - 2 * bossBoyutMm);
  const clearSpanZ = Math.max(0, boyMm - 2 * bossBoyutMm);
  const targetBayMm = 4.0 * mToMm;

  const baysX = solveFacadeBays(clearSpanX, pencereOrani, targetBayMm, minWallMm);
  const baysZ = solveFacadeBays(clearSpanZ, pencereOrani, targetBayMm, minWallMm);

  // 6. Balkon Çıkma DFM Analizi
  const hamBalkonMm = balkonCikmaM * mToMm;
  let balkonMod = 'YOK';
  let balkonCikmaMm = 0;
  let balkonKorkulukBoyMm = 0;
  let balkonClamped = false;

  if (balkonCikmaM > 0.001) {
    if (hamBalkonMm < minWallMm * 1.85) {
      // Çok küçük ölçeklerde (örn. 1:500) ince korkuluk ve mikro oluk birleşip dilimleyici hatası üretmesin diye dolu korniş/jülyet çıkma
      balkonMod = 'DOLU_CIKMA';
      balkonCikmaMm = Math.max(hamBalkonMm, minWallMm);
      balkonKorkulukBoyMm = Math.max(dosemeMm, minWallMm * 1.25);
      balkonClamped = true;
    } else {
      balkonMod = 'KORKULUKLU_TAVA';
      balkonCikmaMm = hamBalkonMm;
      balkonKorkulukBoyMm = Math.min(
        Math.max(gercekParapetBoyM * mToMm, dosemeMm + minWallMm),
        yWinBot + (yWinTop - yWinBot) * 0.25
      );
      balkonClamped = balkonKorkulukClamped;
    }
  }

  // Balkon genişliği: Ön ve arka cephede ritmik mimari konsollar
  const balkonGenislikX = clamp(enMm * 0.64, Math.min(enMm * 0.85, minWallMm * 4), enMm - bossBoyutMm * 0.6);

  // 7. Kademeli Vaziyet Bazası (3 Basamaklı Topografik Kaide)
  const bazaKademeYukseklikMm = clamp(Math.max(minWallMm * 1.6, 2.2), 1.8, 4.5);
  const bazaAdimMarjMm = clamp(Math.max(enMm, boyMm) * 0.055, Math.max(3.2, minWallMm * 2.5), 14.0);
  const bazaUstEnMm = enMm + 2 * bazaAdimMarjMm;
  const bazaUstBoyMm = boyMm + 2 * (balkonCikmaMm + bazaAdimMarjMm);
  const bazaToplamEnMm = bazaUstEnMm + 4 * bazaAdimMarjMm;
  const bazaToplamBoyMm = bazaUstBoyMm + 4 * bazaAdimMarjMm;
  const bazaToplamYukseklikMm = bazaKademeYukseklikMm * 3;

  // 8. Çatı & Parapet Kapağı Ölçüleri
  const catiPlakMm = Math.max(dosemeMm, yuvaDerinlikMm + minWallMm);
  const catiToplamYukseklikMm = catiPlakMm + parapetYukseklikMm;

  // 9. Toplam Maket Yüksekliği ve Tabla Kontrolü
  const toplamBinaGovdeYukseklikMm = katSayisi * katYukseklikMm + catiToplamYukseklikMm;
  const toplamMaketYukseklikMm = bazaToplamYukseklikMm + toplamBinaGovdeYukseklikMm;
  const perimeterCount = Math.floor((duvarMm + 1e-6) / nozzleMm);

  const clampedItems = [];
  if (duvarClamped) clampedItems.push(`Dış Duvar (${hamDuvarMm.toFixed(2)}→${duvarMm.toFixed(2)}mm)`);
  if (parapetClamped) clampedItems.push(`Çatı Parapeti (${hamParapetMm.toFixed(2)}→${parapetMm.toFixed(2)}mm)`);
  if (dosemeClamped) clampedItems.push(`Kat Döşemesi (${hamDosemeMm.toFixed(2)}→${dosemeMm.toFixed(2)}mm)`);
  if (balkonClamped) clampedItems.push(`Balkon Çıkma/Korkuluk (≥${minWallMm.toFixed(2)}mm)`);
  if (baysX.mullionClamped || baysZ.mullionClamped) clampedItems.push(`Pencere Dikmeleri (≥${minWallMm.toFixed(2)}mm)`);

  const maxFootprintMm = Math.max(bazaToplamEnMm, bazaToplamBoyMm);
  const bedStatus =
    maxFootprintMm <= 256
      ? { ok: true, label: 'STANDART 256×256MM TABLAYA UYGUN' }
      : maxFootprintMm <= 350
      ? { ok: true, label: 'GENİŞ 350×350MM TABLAYA UYGUN' }
      : { ok: false, label: '350MM ÜSTÜ — ÖLÇEK KÜÇÜLTME VEYA BÖLÜMLÜ BAZA ÖNERİLİR' };

  return {
    scale,
    scaleLabel: `1:${scale}`,
    binaEnM,
    binaBoyM,
    katSayisi,
    katYuksekligiM,
    balkonCikmaM,
    pencereYuzde,
    minWallMm,
    pimTolMm,
    nozzleMm,
    perimeterCount,

    enMm,
    boyMm,
    hamKatYukseklikMm,
    katYukseklikMm,

    hamDuvarMm,
    duvarMm,
    duvarClamped,

    hamDosemeMm,
    dosemeMm,
    dosemeClamped,

    hamParapetMm,
    parapetMm,
    parapetClamped,
    hamParapetYukseklikMm,
    parapetYukseklikMm,

    hamBalkonMm,
    balkonMod,
    balkonCikmaMm,
    balkonKorkulukMm,
    balkonKorkulukBoyMm,
    balkonGenislikX,
    balkonClamped,

    pimCapMm,
    yuvaCapMm,
    bossBoyutMm,
    pimYukseklikMm,
    yuvaDerinlikMm,
    yuvaZBoslukMm,
    pinOffsetX,
    pinOffsetZ,
    pinCoords,

    yWinBot,
    yWinTop,
    lentoMm,
    denizlikUstuMm,
    clearSpanX,
    clearSpanZ,
    baysX,
    baysZ,

    bazaKademeYukseklikMm,
    bazaAdimMarjMm,
    bazaUstEnMm,
    bazaUstBoyMm,
    bazaToplamEnMm,
    bazaToplamBoyMm,
    bazaToplamYukseklikMm,

    catiPlakMm,
    catiToplamYukseklikMm,
    toplamBinaGovdeYukseklikMm,
    toplamMaketYukseklikMm,

    clampedItems,
    bedStatus
  };
}

/* ============================================================================
 * TEMEL MANİFOLD PRİMİTİF YARDIMCILARI (Ayrık Hacim - Sıfır Çakışma)
 * ============================================================================ */

function makeBoxAt(cx, yMin, yMax, cz, sizeX, sizeZ) {
  const h = yMax - yMin;
  if (sizeX <= 1e-4 || sizeZ <= 1e-4 || h <= 1e-4) return null;
  const g = new THREE.BoxGeometry(sizeX, h, sizeZ);
  g.translate(cx, yMin + h * 0.5, cz);
  return g.toNonIndexed();
}

/**
 * Köşe pim kolonu: Alt kısmında [0, socketDepth] dairesel dişi yuva boşluğu bulunan kare kolon.
 */
function makeCornerSocketBoss(cx, cz, bossSize, totalHeight, socketDia, socketDepth) {
  const parts = [];
  const half = bossSize * 0.5;
  const holeR = socketDia * 0.5;

  if (socketDepth > 1e-4) {
    const bandH = Math.min(socketDepth, totalHeight);
    const shape = new THREE.Shape();
    shape.moveTo(-half, -half);
    shape.lineTo(+half, -half);
    shape.lineTo(+half, +half);
    shape.lineTo(-half, +half);
    shape.closePath();

    if (holeR > 0.1 && holeR < half - 0.15) {
      const hole = new THREE.Path();
      hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }

    const extrude = new THREE.ExtrudeGeometry(shape, {
      depth: bandH,
      bevelEnabled: false,
      curveSegments: 28
    });
    extrude.rotateX(-Math.PI / 2);
    extrude.translate(cx, 0, cz);
    parts.push(extrude.toNonIndexed());
  }

  if (totalHeight > socketDepth + 1e-4) {
    const upper = makeBoxAt(cx, Math.max(0, socketDepth), totalHeight, cz, bossSize, bossSize);
    if (upper) parts.push(upper);
  }

  return parts;
}

/**
 * Üst yüzeye oturan pahlı erkek hizalama pimi (silindir gövde + üst kılavuz pah konisi).
 */
function makeMaleAlignmentPin(cx, yBase, cz, pinDia, pinHeight) {
  const parts = [];
  const r = pinDia * 0.5;
  const chamferH = Math.min(0.45, pinHeight * 0.24);
  const bodyH = Math.max(0.2, pinHeight - chamferH);

  const body = new THREE.CylinderGeometry(r, r, bodyH, 28, 1);
  body.translate(cx, yBase + bodyH * 0.5, cz);
  parts.push(body.toNonIndexed());

  if (chamferH > 0.05) {
    const tipR = Math.max(r * 0.74, r - chamferH);
    const tip = new THREE.CylinderGeometry(tipR, r, chamferH, 28, 1);
    tip.translate(cx, yBase + bodyH + chamferH * 0.5, cz);
    parts.push(tip.toNonIndexed());
  }

  return parts;
}

function finalizeMergedGeometry(parts) {
  const valid = parts.filter(Boolean).map((g) => {
    const clean = g.index ? g.toNonIndexed() : g;
    // Yalnızca position ve normal özniteliklerini koruyarak BufferGeometryUtils uyumsuzluğunu önle
    const stripped = new THREE.BufferGeometry();
    stripped.setAttribute('position', clean.attributes.position);
    if (clean.attributes.normal) {
      stripped.setAttribute('normal', clean.attributes.normal);
    } else {
      stripped.computeVertexNormals();
    }
    return stripped;
  });

  const merged = BufferGeometryUtils.mergeGeometries(valid, false);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/* ============================================================================
 * 1. KADEMELİ VAZİYET BAZASI (00_Vaziyet_Bazasi)
 * ============================================================================ */

export function buildSteppedSitePlinthGeometry(spec) {
  const parts = [];
  const h = spec.bazaKademeYukseklikMm;
  const stepM = spec.bazaAdimMarjMm;

  // 3 kademeli topografik teras plakları (ayrık Y katmanları: [0,h], [h,2h], [2h,3h])
  for (let i = 0; i < 3; i++) {
    const expand = (2 - i) * 2 * stepM;
    const w = spec.bazaUstEnMm + expand;
    const d = spec.bazaUstBoyMm + expand;
    const tierBox = makeBoxAt(0, i * h, (i + 1) * h, 0, w, d);
    if (tierBox) parts.push(tierBox);
  }

  // Ön (Güney +Z) cephe yönlendirme indeks plakası (>= Min_Basilir_Duvar_mm kalınlıkta)
  const indexW = clamp(spec.enMm * 0.22, spec.minWallMm * 3, 24);
  const indexDepth = Math.max(spec.minWallMm, 1.4);
  const frontZ = spec.bazaToplamBoyMm * 0.5 + indexDepth * 0.5;
  const indexPlaque = makeBoxAt(0, 0, h * 0.75, frontZ, indexW, indexDepth);
  if (indexPlaque) parts.push(indexPlaque);

  // Üst kademe üzerinde Zemin Katı karşılayan 4 adet Erkek Köşe Hizalama Pimi
  const topY = spec.bazaToplamYukseklikMm;
  for (const pt of spec.pinCoords) {
    parts.push(...makeMaleAlignmentPin(pt.x, topY, pt.z, spec.pimCapMm, spec.pimYukseklikMm));
  }

  return finalizeMergedGeometry(parts);
}

/* ============================================================================
 * 2. ZEMİN KAT & NORMAL KAT (01_Zemin_Kat & Tip Katlar)
 * ============================================================================ */

export function buildFloorTierGeometry(spec, options = { isGroundFloor: false }) {
  const { isGroundFloor } = options;
  const parts = [];
  const halfX = spec.enMm * 0.5;
  const halfZ = spec.boyMm * 0.5;
  const boss = spec.bossBoyutMm;
  const wall = spec.duvarMm;
  const H = spec.katYukseklikMm;

  // A. 4 Köşe Hizalama Kolonu (Altta Dişi Yuva + Üstte Erkek Pim)
  for (const pt of spec.pinCoords) {
    parts.push(...makeCornerSocketBoss(pt.x, pt.z, boss, H, spec.yuvaCapMm, spec.yuvaDerinlikMm));
    parts.push(...makeMaleAlignmentPin(pt.x, H, pt.z, spec.pimCapMm, spec.pimYukseklikMm));
  }

  // B. İç Döşeme Plağı (Duvarlar ve köşe kolonlarıyla sıfır çakışmalı iç dikdörtgen + köşe cepleri)
  const innerCoreX = spec.enMm - 2 * boss;
  const innerCoreZ = spec.boyMm - 2 * boss;
  if (innerCoreX > 1e-3 && innerCoreZ > 1e-3) {
    parts.push(makeBoxAt(0, 0, spec.dosemeMm, 0, innerCoreX, innerCoreZ));
  }
  const recessDepth = boss - wall;
  if (recessDepth > 1e-3) {
    if (innerCoreX > 1e-3) {
      // Ön ve arka duvar önü döşeme şeritleri
      const zCenter = halfZ - wall - recessDepth * 0.5;
      parts.push(makeBoxAt(0, 0, spec.dosemeMm, +zCenter, innerCoreX, recessDepth));
      parts.push(makeBoxAt(0, 0, spec.dosemeMm, -zCenter, innerCoreX, recessDepth));
    }
    if (innerCoreZ > 1e-3) {
      // Sağ ve sol duvar önü döşeme şeritleri
      const xCenter = halfX - wall - recessDepth * 0.5;
      parts.push(makeBoxAt(+xCenter, 0, spec.dosemeMm, 0, recessDepth, innerCoreZ));
      parts.push(makeBoxAt(-xCenter, 0, spec.dosemeMm, 0, recessDepth, innerCoreZ));
    }
  }

  // C. 4 Cephe Duvarı (Köşe kolonları arasında net açıklıkta: Denizlik + Dikmeler + Lento)
  const zWallCenter = halfZ - wall * 0.5;
  const xWallCenter = halfX - wall * 0.5;

  // Arka Cephe (-Z)
  if (spec.clearSpanX > 1e-3) {
    parts.push(makeBoxAt(0, 0, spec.yWinBot, -zWallCenter, spec.clearSpanX, wall));
    parts.push(makeBoxAt(0, spec.yWinTop, H, -zWallCenter, spec.clearSpanX, wall));
    for (const [u0, u1] of spec.baysX.piers) {
      parts.push(makeBoxAt((u0 + u1) * 0.5, spec.yWinBot, spec.yWinTop, -zWallCenter, u1 - u0, wall));
    }
  }

  // Ön Cephe (+Z): Zemin katta merkezi ana giriş kapısı döşeme üstüne kadar iner + giriş saçağı eklenir
  if (spec.clearSpanX > 1e-3) {
    if (isGroundFloor) {
      const doorWidth = clamp(spec.clearSpanX * 0.28, spec.minWallMm * 2.0, spec.clearSpanX * 0.65);
      const sideSillW = (spec.clearSpanX - doorWidth) * 0.5;
      // Giriş kapısı altında yalnızca döşeme yüksekliği kadar eşik
      parts.push(makeBoxAt(0, 0, spec.dosemeMm, +zWallCenter, doorWidth, wall));
      if (sideSillW >= spec.minWallMm) {
        parts.push(makeBoxAt(-(doorWidth + sideSillW) * 0.5, 0, spec.yWinBot, +zWallCenter, sideSillW, wall));
        parts.push(makeBoxAt(+(doorWidth + sideSillW) * 0.5, 0, spec.yWinBot, +zWallCenter, sideSillW, wall));
      } else {
        parts.push(makeBoxAt(0, 0, spec.dosemeMm, +zWallCenter, spec.clearSpanX, wall));
      }
      parts.push(makeBoxAt(0, spec.yWinTop, H, +zWallCenter, spec.clearSpanX, wall));

      // Kapı yan dikmeleri (>= minWallMm)
      const portalPierW = Math.max(spec.minWallMm, wall);
      if (doorWidth + 2 * portalPierW <= spec.clearSpanX + 1e-3) {
        parts.push(makeBoxAt(-(doorWidth + portalPierW) * 0.5, spec.yWinBot, spec.yWinTop, +zWallCenter, portalPierW, wall));
        parts.push(makeBoxAt(+(doorWidth + portalPierW) * 0.5, spec.yWinBot, spec.yWinTop, +zWallCenter, portalPierW, wall));
      }

      // Mimari Giriş Markizi / Saçağı (Dışarı taşan >= minWallMm kalınlıkta konsol plak)
      const canopyProj = clamp(Math.max(spec.minWallMm * 1.8, 1800 / spec.scale), spec.minWallMm, spec.bazaAdimMarjMm * 0.85);
      const canopyThick = Math.max(spec.minWallMm, spec.dosemeMm * 0.85);
      const canopyW = Math.min(spec.enMm * 0.46, doorWidth + 2 * portalPierW + spec.minWallMm * 2);
      const canopyY0 = Math.max(spec.dosemeMm + spec.minWallMm, spec.yWinTop - canopyThick);
      parts.push(makeBoxAt(0, canopyY0, Math.min(H, canopyY0 + canopyThick), halfZ + canopyProj * 0.5, canopyW, canopyProj));
    } else {
      parts.push(makeBoxAt(0, 0, spec.yWinBot, +zWallCenter, spec.clearSpanX, wall));
      parts.push(makeBoxAt(0, spec.yWinTop, H, +zWallCenter, spec.clearSpanX, wall));
      for (const [u0, u1] of spec.baysX.piers) {
        parts.push(makeBoxAt((u0 + u1) * 0.5, spec.yWinBot, spec.yWinTop, +zWallCenter, u1 - u0, wall));
      }
    }
  }

  // Sağ (+X) ve Sol (-X) Yan Cepheler
  if (spec.clearSpanZ > 1e-3) {
    for (const sign of [-1, +1]) {
      const xc = sign * xWallCenter;
      parts.push(makeBoxAt(xc, 0, spec.yWinBot, 0, wall, spec.clearSpanZ));
      parts.push(makeBoxAt(xc, spec.yWinTop, H, 0, wall, spec.clearSpanZ));
      for (const [v0, v1] of spec.baysZ.piers) {
        parts.push(makeBoxAt(xc, spec.yWinBot, spec.yWinTop, (v0 + v1) * 0.5, wall, v1 - v0));
      }
    }
  }

  // D. Konsol Balkonlar (Yalnızca Normal Katlarda, Ön +Z ve Arka -Z Cephelerde)
  if (!isGroundFloor && spec.balkonMod !== 'YOK' && spec.balkonCikmaMm > 1e-3) {
    const bW = spec.balkonGenislikX;
    const bProj = spec.balkonCikmaMm;
    const tRail = spec.balkonKorkulukMm;

    for (const dirZ of [+1, -1]) {
      const deckZCenter = dirZ * (halfZ + bProj * 0.5);

      if (spec.balkonMod === 'DOLU_CIKMA') {
        // Mikro ölçekte (örn. 1:500) dolu jülyet/korniş çıkma (>= minWallMm)
        parts.push(makeBoxAt(0, 0, spec.balkonKorkulukBoyMm, deckZCenter, bW, bProj));
      } else {
        // Korkuluklu balkon tavası: Alt döşeme plağı + U-kesitli >= minWallMm parapet korkuluk
        parts.push(makeBoxAt(0, 0, spec.dosemeMm, deckZCenter, bW, bProj));
        const railY0 = spec.dosemeMm;
        const railY1 = spec.balkonKorkulukBoyMm;
        if (railY1 > railY0 + 1e-3) {
          // Ön boyuna korkuluk duvarı
          const frontRailZ = dirZ * (halfZ + bProj - tRail * 0.5);
          parts.push(makeBoxAt(0, railY0, railY1, frontRailZ, bW, tRail));

          // Yan korkuluk kolları (Ön korkulukla çakışmayan iç derinlik)
          const sideArmDepth = bProj - tRail;
          if (sideArmDepth > 1e-3 && bW > 2 * tRail + 1e-3) {
            const sideArmZ = dirZ * (halfZ + sideArmDepth * 0.5);
            const sideArmX = bW * 0.5 - tRail * 0.5;
            parts.push(makeBoxAt(-sideArmX, railY0, railY1, sideArmZ, tRail, sideArmDepth));
            parts.push(makeBoxAt(+sideArmX, railY0, railY1, sideArmZ, tRail, sideArmDepth));
          }
        }
      }
    }
  }

  return finalizeMergedGeometry(parts);
}

/* ============================================================================
 * 3. SÖKÜLEBİLİR ÇATI & PARAPET KAPAĞI (Cati_Parapet_Kapagi)
 * ============================================================================ */

export function buildRoofParapetCapGeometry(spec) {
  const parts = [];
  const halfX = spec.enMm * 0.5;
  const halfZ = spec.boyMm * 0.5;
  const boss = spec.bossBoyutMm;
  const tRoof = spec.catiPlakMm;
  const tParapet = spec.parapetMm;
  const hTotal = spec.catiToplamYukseklikMm;

  // 1. 4 Köşe Dişi Yuva Bloğu (Son katın erkek pimlerine oturur, çatı üstünü delmez)
  for (const pt of spec.pinCoords) {
    parts.push(...makeCornerSocketBoss(pt.x, pt.z, boss, tRoof, spec.yuvaCapMm, spec.yuvaDerinlikMm));
  }

  // 2. Çatı Teras Plağı (Köşe blokları dışında kalan alan - sıfır çakışma)
  const coreX = spec.enMm - 2 * boss;
  const coreZ = spec.boyMm - 2 * boss;
  if (coreX > 1e-3 && coreZ > 1e-3) {
    parts.push(makeBoxAt(0, 0, tRoof, 0, coreX, coreZ));
  }
  if (coreX > 1e-3) {
    const stripZ = halfZ - boss * 0.5;
    parts.push(makeBoxAt(0, 0, tRoof, +stripZ, coreX, boss));
    parts.push(makeBoxAt(0, 0, tRoof, -stripZ, coreX, boss));
  }
  if (coreZ > 1e-3) {
    const stripX = halfX - boss * 0.5;
    parts.push(makeBoxAt(+stripX, 0, tRoof, 0, boss, coreZ));
    parts.push(makeBoxAt(-stripX, 0, tRoof, 0, boss, coreZ));
  }

  // 3. DFM Kelepçeli Çatı Parapet Duvarları (>= Min_Basilir_Duvar_mm)
  // Ön ve arka tam boy parapet
  parts.push(makeBoxAt(0, tRoof, hTotal, +(halfZ - tParapet * 0.5), spec.enMm, tParapet));
  parts.push(makeBoxAt(0, tRoof, hTotal, -(halfZ - tParapet * 0.5), spec.enMm, tParapet));
  // Sağ ve sol parapet (köşelerle çakışmasın diye boyMm - 2*tParapet)
  const sideParapetLen = spec.boyMm - 2 * tParapet;
  if (sideParapetLen > 1e-3) {
    parts.push(makeBoxAt(+(halfX - tParapet * 0.5), tRoof, hTotal, 0, tParapet, sideParapetLen));
    parts.push(makeBoxAt(-(halfX - tParapet * 0.5), tRoof, hTotal, 0, tParapet, sideParapetLen));
  }

  // 4. Mimari Asansör / Merdiven Çatı Kulesi (Penthouse Core >= 2*minWallMm)
  const coreTowerW = clamp(spec.enMm * 0.26, spec.minWallMm * 2.5, Math.max(spec.minWallMm * 2.5, spec.enMm - 4 * tParapet));
  const coreTowerD = clamp(spec.boyMm * 0.22, spec.minWallMm * 2.5, Math.max(spec.minWallMm * 2.5, spec.boyMm - 4 * tParapet));
  const coreTowerH = Math.max(spec.parapetYukseklikMm * 1.45, spec.minWallMm * 2.0);
  if (coreTowerW < spec.enMm - 2.4 * tParapet && coreTowerD < spec.boyMm - 2.4 * tParapet) {
    parts.push(makeBoxAt(0, tRoof, tRoof + coreTowerH, 0, coreTowerW, coreTowerD));
  }

  return finalizeMergedGeometry(parts);
}

/* ============================================================================
 * 4. İŞARETLİ TETRAHEDRON HACMİ, YÜZEY ALANI VE KÜTLE METROLOJİSİ
 * ============================================================================ */

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

  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const size = new THREE.Vector3();
  bb.getSize(size);

  const absVolMm3 = Math.abs(volumeMm3);
  return {
    volumeMm3: absVolMm3,
    volCm3: absVolMm3 / 1000.0,
    areaMm2,
    areaCm2: areaMm2 / 100.0,
    triangleCount: Math.floor(pos.count / 3),
    bboxMm: { x: size.x, y: size.y, z: size.z }
  };
}

/**
 * Tüm katları, kademeli vaziyet bazasını, çatı parapet kapağını ve metroloji verilerini tek seferde üretir.
 * Tip normal katlar tek bir GPU BufferGeometry paylaşır (25 katta dahi <3ms üretim süresi).
 */
export function buildArchitecturalScaleModelAssembly(rawParams) {
  const t0 = performance.now();
  const spec = solveScaleDfmSpec(rawParams);

  const plinthGeom = buildSteppedSitePlinthGeometry(spec);
  const groundGeom = buildFloorTierGeometry(spec, { isGroundFloor: true });
  const typicalGeom = buildFloorTierGeometry(spec, { isGroundFloor: false });
  const roofCapGeom = buildRoofParapetCapGeometry(spec);

  const plinthMetro = computeMeshMetrology(plinthGeom);
  const groundMetro = computeMeshMetrology(groundGeom);
  const typicalMetro = computeMeshMetrology(typicalGeom);
  const roofMetro = computeMeshMetrology(roofCapGeom);

  const tiers = [];

  // Katman 0: Kademeli Vaziyet Bazası
  tiers.push({
    index: 0,
    code: '00_Vaziyet_Bazasi',
    stlFileName: `00_Kademeli_Vaziyet_Bazasi_1-${spec.scale}.stl`,
    titleTr: '00 · Kademeli Vaziyet Bazası',
    role: 'plinth',
    assembledY: 0,
    heightMm: spec.bazaToplamYukseklikMm,
    geometry: plinthGeom,
    metrology: plinthMetro,
    pinNote: `Üstte 4× Erkek Pim (Ø${spec.pimCapMm.toFixed(2)}mm)`
  });

  // Katman 1..Kat_Sayisi: Sökülebilir Bina Katları
  for (let k = 1; k <= spec.katSayisi; k++) {
    const isGround = k === 1;
    const padNum = String(k).padStart(2, '0');
    const titleTr = isGround
      ? `${padNum} · Zemin Kat (Giriş & Lobi)`
      : k === spec.katSayisi
      ? `${padNum} · ${k - 1}. Normal Kat (Son Kat)`
      : `${padNum} · ${k - 1}. Normal Kat`;

    const fileSlug = isGround ? `${padNum}_Zemin_Kat` : `${padNum}_Normal_Kat_${k - 1}`;

    tiers.push({
      index: k,
      floorNumber: k,
      code: fileSlug,
      stlFileName: `${fileSlug}_1-${spec.scale}.stl`,
      titleTr,
      role: isGround ? 'ground' : 'typical',
      assembledY: spec.bazaToplamYukseklikMm + (k - 1) * spec.katYukseklikMm,
      heightMm: spec.katYukseklikMm,
      geometry: isGround ? groundGeom : typicalGeom,
      metrology: isGround ? groundMetro : typicalMetro,
      pinNote: `Altta 4× Yuva (Ø${spec.yuvaCapMm.toFixed(2)}) · Üstte 4× Pim (Ø${spec.pimCapMm.toFixed(2)})`
    });
  }

  // Son Katman: Sökülebilir Çatı & Parapet Kapağı
  const roofIdx = spec.katSayisi + 1;
  const roofPad = String(roofIdx).padStart(2, '0');
  tiers.push({
    index: roofIdx,
    code: `${roofPad}_Cati_Parapet_Kapagi`,
    stlFileName: `${roofPad}_Cati_Parapet_Kapagi_1-${spec.scale}.stl`,
    titleTr: `${roofPad} · Çatı & Parapet Kapağı`,
    role: 'roof',
    assembledY: spec.bazaToplamYukseklikMm + spec.katSayisi * spec.katYukseklikMm,
    heightMm: spec.catiToplamYukseklikMm,
    geometry: roofCapGeom,
    metrology: roofMetro,
    pinNote: `Altta 4× Yuva (Ø${spec.yuvaCapMm.toFixed(2)}mm) · Parapet ${spec.parapetMm.toFixed(2)}mm`
  });

  // Toplam Metroloji
  const typicalCount = Math.max(0, spec.katSayisi - 1);
  const totalVolumeMm3 =
    plinthMetro.volumeMm3 +
    groundMetro.volumeMm3 +
    typicalMetro.volumeMm3 * typicalCount +
    roofMetro.volumeMm3;
  const totalAreaCm2 =
    plinthMetro.areaCm2 +
    groundMetro.areaCm2 +
    typicalMetro.areaCm2 * typicalCount +
    roofMetro.areaCm2;
  const totalTriangles =
    plinthMetro.triangleCount +
    groundMetro.triangleCount +
    typicalMetro.triangleCount * typicalCount +
    roofMetro.triangleCount;

  const buildMs = performance.now() - t0;

  return {
    spec,
    tiers,
    sharedGeometries: { plinthGeom, groundGeom, typicalGeom, roofCapGeom },
    totals: {
      tierCount: tiers.length,
      volumeMm3: totalVolumeMm3,
      volCm3: totalVolumeMm3 / 1000.0,
      areaCm2: totalAreaCm2,
      triangleCount: totalTriangles,
      bboxMm: {
        x: spec.bazaToplamEnMm,
        y: spec.toplamMaketYukseklikMm,
        z: spec.bazaToplamBoyMm
      }
    },
    buildMs
  };
}
