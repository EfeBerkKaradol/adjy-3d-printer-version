(function () {
  'use strict';

  const SOCKET_SPECS = {
    E27_40mm: {
      id: 'E27_40mm',
      label: 'E27 Standart Duy (Ø40.0 mm)',
      standard: 'IEC 60238 — E27',
      boreDiameterMm: 40.0,
      boreRadiusMm: 20.0,
      collarWallMm: 4.6,      // r_boss_tip = 24.6 mm (Ø49.2 mm clamping deck)
      collarHeightMm: 8.5,    // Reinforced socket boss height
      spiderThicknessMm: 4.5, // Radial spider & thermal plate axial thickness
      ventInnerGapMm: 0.9,
      ventRadialWidthMm: 4.4,
      ringRibWidthMm: 3.2,
      nutOuterDiameterMm: 56.0,
      maxLedWatt: 15,
      socketUnitCostTry: 48.0,
      bulbUnitCostTry: 65.0
    },
    E14_28mm: {
      id: 'E14_28mm',
      label: 'E14 İnce Duy (Ø28.0 mm)',
      standard: 'IEC 60238 — E14',
      boreDiameterMm: 28.0,
      boreRadiusMm: 14.0,
      collarWallMm: 4.5,      // r_boss_tip = 18.5 mm (Ø37.0 mm clamping deck)
      collarHeightMm: 8.0,
      spiderThicknessMm: 4.2,
      ventInnerGapMm: 0.9,
      ventRadialWidthMm: 4.2,
      ringRibWidthMm: 3.0,
      nutOuterDiameterMm: 43.0,
      maxLedWatt: 10,
      socketUnitCostTry: 42.0,
      bulbUnitCostTry: 55.0
    }
  };

  const PRESET_TEMPLATES = {
    klasik_e27: {
      name: '01 / Klasik Dalgalı Sarkıt (E27)',
      Avize_Capi_mm: 195,
      Avize_Yuksekligi_mm: 205,
      Dalga_Frekansi: 2.0,
      Burulma_Derecesi: 110,
      Kanat_Sayisi: 36,
      Cidar_Kalinligi_mm: 1.2,
      Duy_Tipi: 'E27_40mm',
      Isi_Tahliye_Delik_Sayisi: 8
    },
    kompakt_e14: {
      name: '02 / Kompakt E14 Başucu Sarkıt',
      Avize_Capi_mm: 148,
      Avize_Yuksekligi_mm: 165,
      Dalga_Frekansi: 1.5,
      Burulma_Derecesi: 75,
      Kanat_Sayisi: 24,
      Cidar_Kalinligi_mm: 1.2,
      Duy_Tipi: 'E14_28mm',
      Isi_Tahliye_Delik_Sayisi: 8
    },
    mimari_plise: {
      name: '03 / Mimari Sık Plise Avize (E27)',
      Avize_Capi_mm: 242,
      Avize_Yuksekligi_mm: 235,
      Dalga_Frekansi: 2.5,
      Burulma_Derecesi: 145,
      Kanat_Sayisi: 54,
      Cidar_Kalinligi_mm: 1.2,
      Duy_Tipi: 'E27_40mm',
      Isi_Tahliye_Delik_Sayisi: 10
    },
    minimal_silindir: {
      name: '04 / Akustik Minimal Fener (E27)',
      Avize_Capi_mm: 170,
      Avize_Yuksekligi_mm: 220,
      Dalga_Frekansi: 1.0,
      Burulma_Derecesi: 45,
      Kanat_Sayisi: 20,
      Cidar_Kalinligi_mm: 1.2,
      Duy_Tipi: 'E27_40mm',
      Isi_Tahliye_Delik_Sayisi: 8
    }
  };

  const MATERIALS_DB = {
    PLA_WARM: { name: 'PLA Mat Sıcak Beyaz (1.24 g/cm³)', density: 1.24, costPerKgTry: 680, tempLimitC: 58 },
    PETG_TRANSLUCENT: { name: 'PETG Yarı-Saydam Difüzör (1.27 g/cm³)', density: 1.27, costPerKgTry: 760, tempLimitC: 75 },
    ASA_ARCHITECTURAL: { name: 'ASA UV-Dayanıklı Fildişi (1.07 g/cm³)', density: 1.07, costPerKgTry: 940, tempLimitC: 92 },
    PLA_SILK_PEARL: { name: 'PLA İpek İnci Krem (1.25 g/cm³)', density: 1.25, costPerKgTry: 820, tempLimitC: 58 }
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function computeCollarDimensions(params) {
    const spec = SOCKET_SPECS[params.Duy_Tipi] || SOCKET_SPECS.E27_40mm;
    const D = clamp(Number(params.Avize_Capi_mm) || 195, 140, 250);
    const H = clamp(Number(params.Avize_Yuksekligi_mm) || 205, 150, 250);
    const tWall = clamp(Number(params.Cidar_Kalinligi_mm) || 1.2, 0.8, 3.0);
    const ventCount = Math.round(clamp(Number(params.Isi_Tahliye_Delik_Sayisi) || 8, 4, 16));
    const spiderCount = 6;

    const rBore = spec.boreRadiusMm;
    const rBossTip = rBore + spec.collarWallMm;
    const tSpider = spec.spiderThicknessMm;
    const hCollar = spec.collarHeightMm;
    const axialShoulder = hCollar - tSpider;
    const radialShoulder = axialShoulder * 0.86; // ~40.7° conical reinforcement shoulder (<=45°)
    const rBossBase = rBossTip + radialShoulder;

    const rVentIn = rBossBase + spec.ventInnerGapMm;
    const rVentOut = rVentIn + spec.ventRadialWidthMm;
    const rRingOut = rVentOut + spec.ringRibWidthMm;

    const crownRimThickness = Math.max(tWall + 1.2, 2.5);
    const minCrownIn = rRingOut + 13.5;
    const targetCrownOut = Math.max(minCrownIn + crownRimThickness, D * 0.375);
    const rCrownOut = Math.min(targetCrownOut, D * 0.465);
    const rCrownIn = rCrownOut - crownRimThickness;
    const rSpiderOut = rCrownIn - 2.6;
    const strutWidthMm = clamp(D * 0.031, 5.2, 7.2);

    return {
      spec,
      D,
      H,
      tWall,
      ventCount,
      spiderCount,
      strutWidthMm,
      rBore,
      rBossTip,
      rBossBase,
      tSpider,
      hCollar,
      rVentIn,
      rVentOut,
      rRingOut,
      rSpiderOut,
      rCrownIn,
      rCrownOut,
      crownRimThickness
    };
  }

  function computeShellProfile(params, collarDims, nz = 112) {
    const { D, H, tWall, tSpider, rCrownIn, rCrownOut } = collarDims;
    const waveFreq = clamp(Number(params.Dalga_Frekansi) || 2.0, 0.5, 5.0);
    const twistDeg = clamp(Number(params.Burulma_Derecesi) ?? 110, -360, 360);
    const finCount = Math.round(clamp(Number(params.Kanat_Sayisi) || 36, 18, 60));
    const autoSupportFree = params.Desteksiz_45_Kilidi !== false;

    const rTargetMax = D * 0.5;
    const dz = H / nz;

    const zArr = new Float64Array(nz + 1);
    const rBase = new Float64Array(nz + 1);
    const finAmp = new Float64Array(nz + 1);
    const phiArr = new Float64Array(nz + 1);
    const wallRadial = new Float64Array(nz + 1);

    const rawExcursion = new Float64Array(nz + 1);
    const rawFin = new Float64Array(nz + 1);

    const rampStart = tSpider;
    const rampEnd = tSpider + 18.0;

    let maxCombinedRaw = 1e-6;
    for (let i = 0; i <= nz; i++) {
      const z = i * dz;
      zArr[i] = z;
      const u = z / H;

      const bodyRamp = smoothstep(0.0, 0.24, u);
      const lowerTaper = 1.0 - 0.16 * smoothstep(0.72, 1.0, u);
      const waveOsc = 0.5 - 0.5 * Math.cos(2.0 * Math.PI * waveFreq * Math.max(0, (u - 0.04) / 0.96));
      const silhouette = bodyRamp * lowerTaper * (0.68 + 0.32 * waveOsc);

      const nominalFinRatio = clamp(3.6 / Math.sqrt(finCount / 24), 1.8, 4.4) / Math.max(12, rTargetMax - rCrownOut);
      const finEnv = smoothstep(rampStart, rampEnd, z) * (1.0 - 0.08 * smoothstep(0.88, 1.0, u));

      rawExcursion[i] = silhouette;
      rawFin[i] = finEnv * nominalFinRatio;
      if (rawExcursion[i] + rawFin[i] > maxCombinedRaw) {
        maxCombinedRaw = rawExcursion[i] + rawFin[i];
      }

      const twistEase = smoothstep(tSpider * 0.6, H, z);
      phiArr[i] = (twistDeg * Math.PI / 180.0) * twistEase;
    }

    const neededDeltaR = Math.max(3.0, rTargetMax - rCrownOut);
    const scaleFactor = neededDeltaR / maxCombinedRaw;

    for (let i = 0; i <= nz; i++) {
      rBase[i] = rCrownOut + rawExcursion[i] * scaleFactor;
      finAmp[i] = rawFin[i] * scaleFactor;
      if (zArr[i] <= tSpider + 1e-5) {
        finAmp[i] = 0.0;
        rBase[i] = rCrownOut;
      }
    }

    if (autoSupportFree) {
      const maxDrDz = 0.86; // ~40.7° slope limit (safe margin under 45.0°)
      for (let i = 1; i <= nz; i++) {
        const prevOuter = rBase[i - 1] + finAmp[i - 1];
        const curOuter = rBase[i] + finAmp[i];
        if (curOuter - prevOuter > maxDrDz * dz) {
          const excess = (curOuter - prevOuter) - maxDrDz * dz;
          rBase[i] -= excess * 0.82;
          finAmp[i] = Math.max(0, finAmp[i] - excess * 0.18);
        }
        const prevInner = rBase[i - 1] - finAmp[i - 1];
        const curInner = rBase[i] - finAmp[i];
        if (prevInner - curInner > maxDrDz * dz) {
          const excessIn = (prevInner - curInner) - maxDrDz * dz;
          rBase[i] += excessIn * 0.82;
          finAmp[i] = Math.max(0, finAmp[i] - excessIn * 0.18);
        }
      }

      const maxTanOverhang = 0.935; // ~43.1° strict bound on twisted fin flanks
      for (let i = 1; i <= nz; i++) {
        if (finAmp[i] <= 1e-4) continue;
        const dPhiDz = Math.abs(phiArr[i] - phiArr[i - 1]) / dz;
        const dRBaseDz = Math.abs(rBase[i] - rBase[i - 1]) / dz;
        const dAmpDz = Math.abs(finAmp[i] - finAmp[i - 1]) / dz;
        const R = rBase[i];

        for (let iter = 0; iter < 6; iter++) {
          const kA = finCount * finAmp[i];
          const flankTan = (R * (dRBaseDz + kA * dPhiDz)) / Math.sqrt(R * R + kA * kA);
          const crestTan = dRBaseDz + dAmpDz;
          const worstTan = Math.max(flankTan, crestTan);
          if (worstTan <= maxTanOverhang) break;
          finAmp[i] *= (maxTanOverhang / worstTan) * 0.97;
        }
      }

      let currentPeak = 0;
      for (let i = 0; i <= nz; i++) {
        if (rBase[i] + finAmp[i] > currentPeak) currentPeak = rBase[i] + finAmp[i];
      }
      if (Math.abs(currentPeak - rTargetMax) > 0.08 && currentPeak > rCrownOut + 1.0) {
        const adjust = (rTargetMax - rCrownOut) / (currentPeak - rCrownOut);
        for (let i = 1; i <= nz; i++) {
          const maxReachable = rCrownOut + maxDrDz * zArr[i];
          const scaledBase = rCrownOut + (rBase[i] - rCrownOut) * adjust;
          const scaledFin = finAmp[i] * Math.min(adjust, 1.15);
          if (scaledBase + scaledFin <= maxReachable) {
            rBase[i] = scaledBase;
            finAmp[i] = scaledFin;
          } else {
            const ratio = maxReachable / (scaledBase + scaledFin);
            rBase[i] = scaledBase * ratio;
            finAmp[i] = scaledFin * ratio;
          }
        }
      }

      // Final pass on twisted flank after radial peak normalization
      for (let i = 1; i <= nz; i++) {
        if (finAmp[i] <= 1e-4) continue;
        const dPhiDz = Math.abs(phiArr[i] - phiArr[i - 1]) / dz;
        const dRBaseDz = Math.abs(rBase[i] - rBase[i - 1]) / dz;
        const dAmpDz = Math.abs(finAmp[i] - finAmp[i - 1]) / dz;
        const R = rBase[i];
        for (let iter = 0; iter < 5; iter++) {
          const kA = finCount * finAmp[i];
          const flankTan = (R * (dRBaseDz + kA * dPhiDz)) / Math.sqrt(R * R + kA * kA);
          const crestTan = dRBaseDz + dAmpDz;
          const worstTan = Math.max(flankTan, crestTan);
          if (worstTan <= maxTanOverhang) break;
          finAmp[i] *= (maxTanOverhang / worstTan) * 0.97;
        }
      }
    }

    const crownRim = rCrownOut - rCrownIn;
    for (let i = 0; i <= nz; i++) {
      const z = zArr[i];
      if (z <= tSpider + 1e-5) {
        wallRadial[i] = crownRim;
      } else {
        const blend = smoothstep(tSpider, tSpider + 8.5, z);
        const slope = i > 0 ? (rBase[i] - rBase[i - 1]) / dz : 0;
        const normalComp = Math.sqrt(1.0 + slope * slope);
        const trueThinWall = tWall * normalComp;
        wallRadial[i] = lerp(crownRim, trueThinWall, blend);
      }
    }

    return { nz, dz, zArr, rBase, finAmp, phiArr, wallRadial, finCount };
  }

  function createArcSlotHole(THREE, rIn, rOut, thetaCenter, angularSpan, segs = 16) {
    const rMid = 0.5 * (rIn + rOut);
    const halfThick = 0.5 * (rOut - rIn);
    const capAngle = halfThick / rMid;
    const halfCoreSpan = Math.max(0.015, angularSpan * 0.5 - capAngle);

    const aStart = thetaCenter - halfCoreSpan;
    const aEnd = thetaCenter + halfCoreSpan;

    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const a = lerp(aEnd, aStart, i / segs);
      pts.push(new THREE.Vector2(rOut * Math.cos(a), rOut * Math.sin(a)));
    }
    const cx1 = rMid * Math.cos(aStart);
    const cy1 = rMid * Math.sin(aStart);
    const capSegs = 8;
    for (let i = 1; i < capSegs; i++) {
      const phi = aStart + (i / capSegs) * Math.PI;
      pts.push(new THREE.Vector2(cx1 + halfThick * Math.cos(phi), cy1 + halfThick * Math.sin(phi)));
    }
    for (let i = 0; i <= segs; i++) {
      const a = lerp(aStart, aEnd, i / segs);
      pts.push(new THREE.Vector2(rIn * Math.cos(a), rIn * Math.sin(a)));
    }
    const cx2 = rMid * Math.cos(aEnd);
    const cy2 = rMid * Math.sin(aEnd);
    for (let i = 1; i < capSegs; i++) {
      const phi = aEnd - Math.PI + (i / capSegs) * Math.PI;
      pts.push(new THREE.Vector2(cx2 + halfThick * Math.cos(phi), cy2 + halfThick * Math.sin(phi)));
    }

    if (THREE.ShapeUtils.isClockWise(pts) === false) {
      pts.reverse();
    }
    const path = new THREE.Path();
    path.setFromPoints(pts);
    path.closePath();
    return { path, points: pts };
  }

  function createSpiderWindowHole(THREE, rIn, rOut, thetaCenter, sectorStep, strutWidthMm, segs = 22) {
    const halfGapIn = (sectorStep * rIn - strutWidthMm) * 0.5 / rIn;
    const halfGapOut = (sectorStep * rOut - strutWidthMm) * 0.5 / rOut;
    if (halfGapIn <= 0.02 || halfGapOut <= 0.02) return null;

    const cornerFilletR = Math.min(1.6, (rOut - rIn) * 0.22);
    const rInEff = rIn + cornerFilletR * 0.25;
    const rOutEff = rOut - cornerFilletR * 0.25;

    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const a = thetaCenter + lerp(halfGapOut, -halfGapOut, i / segs);
      pts.push(new THREE.Vector2(rOutEff * Math.cos(a), rOutEff * Math.sin(a)));
    }
    for (let i = 0; i <= segs; i++) {
      const a = thetaCenter + lerp(-halfGapIn, halfGapIn, i / segs);
      pts.push(new THREE.Vector2(rInEff * Math.cos(a), rInEff * Math.sin(a)));
    }

    if (THREE.ShapeUtils.isClockWise(pts) === false) {
      pts.reverse();
    }
    const path = new THREE.Path();
    path.setFromPoints(pts);
    path.closePath();
    return { path, points: pts };
  }

  function fixZoneATopAndShellTopWinding(THREE, zoneAGeom, zoneCGeom, H) {
    const fixBuffer = (geom, isZoneA) => {
      const pos = geom.attributes.position;
      const thk = geom.attributes.aWallThickness;
      const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3();
      const ab = new THREE.Vector3(), ac = new THREE.Vector3(), n = new THREE.Vector3();

      for (let i = 0; i < pos.count; i += 3) {
        pA.fromBufferAttribute(pos, i);
        pB.fromBufferAttribute(pos, i + 1);
        pC.fromBufferAttribute(pos, i + 2);
        ab.subVectors(pB, pA);
        ac.subVectors(pC, pA);
        n.crossVectors(ab, ac);

        const ym = (pA.y + pB.y + pC.y) / 3;
        const xm = (pA.x + pB.x + pC.x) / 3;
        const zm = (pA.z + pB.z + pC.z) / 3;

        let flip = false;
        if (Math.abs(pA.y - H) < 1e-4 && Math.abs(pB.y - H) < 1e-4 && Math.abs(pC.y - H) < 1e-4) {
          if (n.y < 0) flip = true;
        } else if (isZoneA) {
          if (Math.abs(pA.y - pB.y) < 1e-4 && Math.abs(pB.y - pC.y) < 1e-4 && ym < H - 1.0) {
            if (n.y > 0) flip = true;
          } else {
            const rA = Math.hypot(pA.x, pA.z);
            const rB = Math.hypot(pB.x, pB.z);
            const rC = Math.hypot(pC.x, pC.z);
            const radialDot = n.x * xm + n.z * zm;
            if (Math.max(rA, rB, rC) - Math.min(rA, rB, rC) < 1e-3) {
              if (radialDot > 0) flip = true;
            } else {
              if (radialDot < 0) flip = true;
            }
          }
        }

        if (flip) {
          pos.setXYZ(i + 1, pC.x, pC.y, pC.z);
          pos.setXYZ(i + 2, pB.x, pB.y, pB.z);
          if (thk) {
            const t1 = thk.getX(i + 1);
            const t2 = thk.getX(i + 2);
            thk.setX(i + 1, t2);
            thk.setX(i + 2, t1);
          }
        }
      }
    };

    fixBuffer(zoneAGeom, true);
    fixBuffer(zoneCGeom, false);
  }

  function validateAndMeasureGeometry(THREE, geometry, totalHeightMm) {
    const index = geometry.index;
    const pos = geometry.attributes.position;
    const triCount = index ? index.count / 3 : pos.count / 3;

    let signedVolumeMm3 = 0;
    let totalAreaMm2 = 0;
    let safeAreaMm2 = 0;
    let violationAreaMm2 = 0;
    let maxOverhangDeg = 0;

    const vWorstAngle = new Float32Array(pos.count);

    const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), cross = new THREE.Vector3();

    for (let t = 0; t < triCount; t++) {
      const i0 = index ? index.getX(t * 3) : t * 3;
      const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;

      p1.fromBufferAttribute(pos, i0);
      p2.fromBufferAttribute(pos, i1);
      p3.fromBufferAttribute(pos, i2);

      signedVolumeMm3 += p1.dot(cross.crossVectors(p2, p3)) / 6.0;

      ab.subVectors(p2, p1);
      ac.subVectors(p3, p1);
      cross.crossVectors(ab, ac);
      const len = cross.length();
      if (len < 1e-9) continue;

      const area = len * 0.5;
      totalAreaMm2 += area;

      const ny = cross.y / len;
      const nzPrint = -ny; // Z_print = H - Y_three

      const onBuildPlate =
        Math.abs(totalHeightMm - p1.y) < 0.08 &&
        Math.abs(totalHeightMm - p2.y) < 0.08 &&
        Math.abs(totalHeightMm - p3.y) < 0.08;

      let overhangDeg = 0;
      if (!onBuildPlate && nzPrint < -1e-4) {
        overhangDeg = (Math.asin(clamp(-nzPrint, 0, 1)) * 180.0) / Math.PI;
      }

      if (overhangDeg > maxOverhangDeg) maxOverhangDeg = overhangDeg;
      if (overhangDeg <= 45.05) {
        safeAreaMm2 += area;
      } else {
        violationAreaMm2 += area;
      }

      if (overhangDeg > vWorstAngle[i0]) vWorstAngle[i0] = overhangDeg;
      if (overhangDeg > vWorstAngle[i1]) vWorstAngle[i1] = overhangDeg;
      if (overhangDeg > vWorstAngle[i2]) vWorstAngle[i2] = overhangDeg;
    }

    const colors = new Float32Array(pos.count * 3);
    const cSafe = new THREE.Color(0x2e9e6f);
    const cWarn = new THREE.Color(0xe69d35);
    const cDanger = new THREE.Color(0xd9381e);
    const tmpC = new THREE.Color();

    for (let v = 0; v < pos.count; v++) {
      const ang = vWorstAngle[v];
      if (ang <= 30.0) {
        tmpC.copy(cSafe).lerp(cWarn, (ang / 30.0) * 0.35);
      } else if (ang <= 45.05) {
        tmpC.copy(cSafe).lerp(cWarn, 0.35 + 0.65 * ((ang - 30.0) / 15.05));
      } else {
        tmpC.copy(cDanger);
      }
      colors[v * 3] = tmpC.r;
      colors[v * 3 + 1] = tmpC.g;
      colors[v * 3 + 2] = tmpC.b;
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const sizeX = bb.max.x - bb.min.x;
    const sizeY = bb.max.y - bb.min.y;
    const sizeZ = bb.max.z - bb.min.z;

    const volumeMm3 = Math.abs(signedVolumeMm3);
    const volCm3 = volumeMm3 / 1000.0;
    const areaCm2 = totalAreaMm2 / 100.0;
    const safeRatioPct = totalAreaMm2 > 0 ? (safeAreaMm2 / totalAreaMm2) * 100.0 : 100.0;

    return {
      bboxMm: { x: sizeX, y: sizeY, z: sizeZ },
      volumeMm3,
      volCm3,
      areaCm2,
      triangleCount: triCount,
      vertexCount: pos.count,
      maxOverhangDeg,
      safeRatioPct,
      violationAreaCm2: violationAreaMm2 / 100.0,
      isSupportFreePass: maxOverhangDeg <= 45.05
    };
  }

  function buildLampShadeGeometry(deps, params) {
    const { THREE, mergeGeometries, mergeVertices } = deps;
    const collar = computeCollarDimensions(params);
    const profile = computeShellProfile(params, collar, 112);

    const {
      H, tWall, ventCount, spiderCount, strutWidthMm,
      rBore, rBossTip, rBossBase, tSpider, hCollar,
      rVentIn, rVentOut, rRingOut, rSpiderOut, rCrownIn
    } = collar;
    const { nz, zArr, rBase, finAmp, phiArr, wallRadial, finCount } = profile;

    const nShell = Math.min(480, Math.max(240, finCount * 8));
    const nBoss = 128;

    const bossPositions = [];
    const bossThicknessAttr = [];

    function pushQuadRing(r0, z0, r1, z1, segs, thk0, thk1 = thk0) {
      const y0 = H - z0;
      const y1 = H - z1;
      for (let j = 0; j < segs; j++) {
        const a0 = (j / segs) * Math.PI * 2;
        const a1 = ((j + 1) / segs) * Math.PI * 2;
        const c0 = Math.cos(a0), s0 = Math.sin(a0);
        const c1 = Math.cos(a1), s1 = Math.sin(a1);

        const ax = r0 * c0, ay = y0, az = r0 * s0;
        const bx = r0 * c1, by = y0, bz = r0 * s1;
        const cx = r1 * c1, cy = y1, cz = r1 * s1;
        const dx = r1 * c0, dy = y1, dz = r1 * s0;

        bossPositions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        bossThicknessAttr.push(thk0, thk0, thk1);
        bossPositions.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
        bossThicknessAttr.push(thk0, thk1, thk1);
      }
    }

    const collarSolidThk = rBossBase - rBore;
    pushQuadRing(rBossBase, 0, rBore, 0, nBoss, tSpider, collarSolidThk);
    pushQuadRing(rBore, 0, rBore, hCollar, nBoss, collarSolidThk, collarSolidThk);
    pushQuadRing(rBore, hCollar, rBossTip, hCollar, nBoss, collarSolidThk, collarSolidThk);
    pushQuadRing(rBossTip, hCollar, rBossBase, tSpider, nBoss, collarSolidThk, tSpider);

    const zoneAGeom = new THREE.BufferGeometry();
    zoneAGeom.setAttribute('position', new THREE.Float32BufferAttribute(bossPositions, 3));
    zoneAGeom.setAttribute('aWallThickness', new THREE.Float32BufferAttribute(bossThicknessAttr, 1));

    // ZONE B: Spider Struts & LED Heat-Ventilation Ring
    const outerContour = [];
    for (let j = 0; j < nShell; j++) {
      const a = (j / nShell) * Math.PI * 2;
      outerContour.push(new THREE.Vector2(rCrownIn * Math.cos(a), rCrownIn * Math.sin(a)));
    }
    const spiderShape = new THREE.Shape(outerContour);

    const centerBossHolePts = [];
    for (let j = nBoss - 1; j >= 0; j--) {
      const a = (j / nBoss) * Math.PI * 2;
      centerBossHolePts.push(new THREE.Vector2(rBossBase * Math.cos(a), rBossBase * Math.sin(a)));
    }
    const centerBossHole = new THREE.Path(centerBossHolePts);
    centerBossHole.closePath();
    spiderShape.holes.push(centerBossHole);

    const ventSvgLoops = [];
    const ventPitchStep = (Math.PI * 2) / ventCount;
    const ventSlotSpan = ventPitchStep * 0.58;
    for (let k = 0; k < ventCount; k++) {
      const thetaC = k * ventPitchStep + ventPitchStep * 0.5;
      const slot = createArcSlotHole(THREE, rVentIn, rVentOut, thetaC, ventSlotSpan, 14);
      spiderShape.holes.push(slot.path);
      ventSvgLoops.push(slot.points);
    }

    const spiderSvgLoops = [];
    const spiderStep = (Math.PI * 2) / spiderCount;
    for (let k = 0; k < spiderCount; k++) {
      const thetaC = k * spiderStep + spiderStep * 0.5;
      const win = createSpiderWindowHole(THREE, rRingOut, rSpiderOut, thetaC, spiderStep, strutWidthMm, 22);
      if (win) {
        spiderShape.holes.push(win.path);
        spiderSvgLoops.push(win.points);
      }
    }

    const rawExtrude = new THREE.ExtrudeGeometry(spiderShape, {
      depth: tSpider,
      bevelEnabled: false,
      steps: 1
    });
    const nonIdxExtrude = rawExtrude.index ? rawExtrude.toNonIndexed() : rawExtrude;
    const extPos = nonIdxExtrude.attributes.position;

    const zoneBPositions = [];
    const zoneBThickness = [];
    const rBossTol = 0.05;
    const rCrownTol = 0.05;

    for (let i = 0; i < extPos.count; i += 3) {
      const x0 = extPos.getX(i), y0 = extPos.getY(i), z0 = extPos.getZ(i);
      const x1 = extPos.getX(i + 1), y1 = extPos.getY(i + 1), z1 = extPos.getZ(i + 1);
      const x2 = extPos.getX(i + 2), y2 = extPos.getY(i + 2), z2 = extPos.getZ(i + 2);

      const isSideWall = !(Math.abs(z0 - z1) < 1e-4 && Math.abs(z1 - z2) < 1e-4);
      if (isSideWall) {
        const d0 = Math.hypot(x0, y0);
        const d1 = Math.hypot(x1, y1);
        const d2 = Math.hypot(x2, y2);
        const onBossSeam =
          Math.abs(d0 - rBossBase) < rBossTol &&
          Math.abs(d1 - rBossBase) < rBossTol &&
          Math.abs(d2 - rBossBase) < rBossTol;
        const onCrownSeam =
          Math.abs(d0 - rCrownIn) < rCrownTol &&
          Math.abs(d1 - rCrownIn) < rCrownTol &&
          Math.abs(d2 - rCrownIn) < rCrownTol;
        if (onBossSeam || onCrownSeam) continue;
      }

      zoneBPositions.push(
        x0, H - z0, y0,
        x1, H - z1, y1,
        x2, H - z2, y2
      );
      zoneBThickness.push(tSpider, tSpider, tSpider);
    }
    rawExtrude.dispose();

    const zoneBGeom = new THREE.BufferGeometry();
    zoneBGeom.setAttribute('position', new THREE.Float32BufferAttribute(zoneBPositions, 3));
    zoneBGeom.setAttribute('aWallThickness', new THREE.Float32BufferAttribute(zoneBThickness, 1));

    // ZONE C: Sculpted Wave Diffuser Shell
    let spiderRingIdx = 1;
    let bestDist = Infinity;
    for (let i = 1; i < nz; i++) {
      const d = Math.abs(zArr[i] - tSpider);
      if (d < bestDist) {
        bestDist = d;
        spiderRingIdx = i;
      }
    }
    zArr[spiderRingIdx] = tSpider;
    rBase[spiderRingIdx] = collar.rCrownOut;
    finAmp[spiderRingIdx] = 0.0;
    wallRadial[spiderRingIdx] = collar.rCrownOut - rCrownIn;

    const cosTbl = new Float64Array(nShell);
    const sinTbl = new Float64Array(nShell);
    for (let j = 0; j < nShell; j++) {
      const a = (j / nShell) * Math.PI * 2;
      cosTbl[j] = Math.cos(a);
      sinTbl[j] = Math.sin(a);
    }

    const rOutGrid = new Float64Array((nz + 1) * nShell);
    const rInGrid = new Float64Array((nz + 1) * nShell);
    const thkGrid = new Float32Array((nz + 1) * nShell);

    for (let i = 0; i <= nz; i++) {
      const rb = rBase[i];
      const amp = finAmp[i];
      const phi = phiArr[i];
      const wRad = wallRadial[i];
      const ampIn = i <= spiderRingIdx ? 0.0 : Math.max(0.0, amp - 0.14 * tWall);

      for (let j = 0; j < nShell; j++) {
        const a = (j / nShell) * Math.PI * 2;
        const wave = Math.cos(finCount * (a - phi));
        const ro = rb + amp * wave;
        const ri = i <= spiderRingIdx ? rCrownIn : Math.max(rBore + 4.0, (rb - wRad) + ampIn * wave);
        const idx = i * nShell + j;
        rOutGrid[idx] = ro;
        rInGrid[idx] = ri;
        thkGrid[idx] = i <= spiderRingIdx ? tSpider : tWall;
      }
    }

    const shellPositions = [];
    const shellThickness = [];

    function pushShellTri(ax, ay, az, bx, by, bz, cx, cy, cz, thk) {
      shellPositions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
      shellThickness.push(thk, thk, thk);
    }

    // Top Crown Rim Annulus (y = H)
    for (let j = 0; j < nShell; j++) {
      const j1 = (j + 1) % nShell;
      const ro0 = rOutGrid[j];
      const ro1 = rOutGrid[j1];
      const ax = ro0 * cosTbl[j], ay = H, az = ro0 * sinTbl[j];
      const bx = ro1 * cosTbl[j1], by = H, bz = ro1 * sinTbl[j1];
      const cx = rCrownIn * cosTbl[j1], cy = H, cz = rCrownIn * sinTbl[j1];
      const dx = rCrownIn * cosTbl[j], dy = H, dz = rCrownIn * sinTbl[j];

      pushShellTri(ax, ay, az, bx, by, bz, cx, cy, cz, tSpider);
      pushShellTri(ax, ay, az, cx, cy, cz, dx, dy, dz, tSpider);
    }

    // Outer Sculpted Wave Wall
    for (let i = 0; i < nz; i++) {
      const y0 = H - zArr[i];
      const y1 = H - zArr[i + 1];
      const row0 = i * nShell;
      const row1 = (i + 1) * nShell;
      for (let j = 0; j < nShell; j++) {
        const j1 = (j + 1) % nShell;
        const ro00 = rOutGrid[row0 + j];
        const ro01 = rOutGrid[row0 + j1];
        const ro11 = rOutGrid[row1 + j1];
        const ro10 = rOutGrid[row1 + j];
        const th0 = thkGrid[row0 + j];
        const th1 = thkGrid[row1 + j];

        const ax = ro00 * cosTbl[j], ay = y0, az = ro00 * sinTbl[j];
        const bx = ro01 * cosTbl[j1], by = y0, bz = ro01 * sinTbl[j1];
        const cx = ro11 * cosTbl[j1], cy = y1, cz = ro11 * sinTbl[j1];
        const dx = ro10 * cosTbl[j], dy = y1, dz = ro10 * sinTbl[j];

        shellPositions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        shellThickness.push(th0, th0, th1);
        shellPositions.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
        shellThickness.push(th0, th1, th1);
      }
    }

    // Bottom Open Rim Cap (y = 0)
    {
      const rowN = nz * nShell;
      for (let j = 0; j < nShell; j++) {
        const j1 = (j + 1) % nShell;
        const ro0 = rOutGrid[rowN + j];
        const ro1 = rOutGrid[rowN + j1];
        const ri1 = rInGrid[rowN + j1];
        const ri0 = rInGrid[rowN + j];

        const ax = ro0 * cosTbl[j], ay = 0, az = ro0 * sinTbl[j];
        const bx = ro1 * cosTbl[j1], by = 0, bz = ro1 * sinTbl[j1];
        const cx = ri1 * cosTbl[j1], cy = 0, cz = ri1 * sinTbl[j1];
        const dx = ri0 * cosTbl[j], dy = 0, dz = ri0 * sinTbl[j];

        pushShellTri(ax, ay, az, bx, by, bz, cx, cy, cz, tWall);
        pushShellTri(ax, ay, az, cx, cy, cz, dx, dy, dz, tWall);
      }
    }

    // Inner Sculpted Wave Wall (z = H back up to z = tSpider)
    for (let i = nz; i > spiderRingIdx; i--) {
      const y0 = H - zArr[i];
      const y1 = H - zArr[i - 1];
      const row0 = i * nShell;
      const row1 = (i - 1) * nShell;
      for (let j = 0; j < nShell; j++) {
        const j1 = (j + 1) % nShell;
        const ri00 = rInGrid[row0 + j];
        const ri01 = rInGrid[row0 + j1];
        const ri11 = rInGrid[row1 + j1];
        const ri10 = rInGrid[row1 + j];
        const th0 = thkGrid[row0 + j];
        const th1 = thkGrid[row1 + j];

        const ax = ri00 * cosTbl[j], ay = y0, az = ri00 * sinTbl[j];
        const bx = ri01 * cosTbl[j1], by = y0, bz = ri01 * sinTbl[j1];
        const cx = ri11 * cosTbl[j1], cy = y1, cz = ri11 * sinTbl[j1];
        const dx = ri10 * cosTbl[j], dy = y1, dz = ri10 * sinTbl[j];

        shellPositions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
        shellThickness.push(th0, th0, th1);
        shellPositions.push(ax, ay, az, cx, cy, cz, dx, dy, dz);
        shellThickness.push(th0, th1, th1);
      }
    }

    const zoneCGeom = new THREE.BufferGeometry();
    zoneCGeom.setAttribute('position', new THREE.Float32BufferAttribute(shellPositions, 3));
    zoneCGeom.setAttribute('aWallThickness', new THREE.Float32BufferAttribute(shellThickness, 1));

    fixZoneATopAndShellTopWinding(THREE, zoneAGeom, zoneCGeom, H);

    const combinedNonIndexed = mergeGeometries([zoneAGeom, zoneBGeom, zoneCGeom], false);
    zoneAGeom.dispose();
    zoneBGeom.dispose();
    zoneCGeom.dispose();

    const welded = mergeVertices(combinedNonIndexed, 1e-3);
    combinedNonIndexed.dispose();
    welded.computeVertexNormals();
    welded.computeBoundingBox();

    const validation = validateAndMeasureGeometry(THREE, welded, H);

    return {
      geometry: welded,
      collar,
      profile,
      svgLoops: {
        ventSvgLoops,
        spiderSvgLoops
      },
      telemetry: validation
    };
  }

  function createSlicerReadyGeometry(geometry, totalHeightMm) {
    const clone = geometry.clone();
    clone.rotateX(-Math.PI / 2);
    clone.translate(0, 0, totalHeightMm);
    clone.computeVertexNormals();
    return clone;
  }

  window.AtelierCAD = Object.assign(window.AtelierCAD || {}, {
    SOCKET_SPECS,
    PRESET_TEMPLATES,
    MATERIALS_DB,
    computeCollarDimensions,
    computeShellProfile,
    buildLampShadeGeometry,
    createSlicerReadyGeometry
  });
})();
