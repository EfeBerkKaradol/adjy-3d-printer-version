import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  ARCHITECTURAL_PRESETS,
  buildArchitecturalScaleModelAssembly,
  parseScaleDenominator
} from './dfm-cad-engine.js';

import {
  parseUploaded3DModelFile,
  createDemoCustomBuildingModel,
  buildCustomModelAssembly
} from './custom-model-slicer.js';

import {
  computeB2BStudioQuote,
  exportB2BStudioQuoteCSV,
  generateImalatAntetiSVG,
  exportImalatAntetiSVG,
  exportSingleTierSTL,
  exportAllTiersSequentialSTL,
  exportFullAssemblySTL,
  exportAssemblyOBJ,
  exportAssemblyGLB,
  exportFloorPlanDXF,
  exportParametricSCAD
} from './exporters.js';

/* ============================================================================
 * UYGULAMA DURUMU (STATE)
 * ============================================================================ */

const state = {
  activePresetKey: 'konut_200',
  params: { ...ARCHITECTURAL_PRESETS.konut_200 },
  theme: 'dark',
  cameraType: 'persp', // 'persp' | 'ortho'
  displayMode: 'shaded', // 'shaded' | 'blueprint' | 'xray' | 'wire'
  appearance: 'plaster', // 'plaster' | 'basswood' | 'monolith'
  showPinAxes: true,

  explodePct: 38,
  selectedTierIndex: null, // null = tümü, 0..N+1 = seçili kat
  isolateSelectedOnly: false,

  clipAxis: 'none', // 'none' | 'x' | 'y' | 'z'
  clipOffsetMm: 0,

  materialKey: 'PLA_ARCH_WHITE',
  finishKey: 'YARISMA',

  customModel: null, // { rawGeometry, fileName, format, zUp, unitMode, rotX, rotY, rotZ }

  assembly: null,
  quote: null,
  latestSvgMarkup: ''
};

const PALETTES = {
  plaster: {
    plinth: 0xded7c8,
    ground: 0xf4f1ea,
    typical: 0xfaf8f4,
    roof: 0xeae4d7,
    edge: 0x22211f,
    selectedEmissive: 0x3b120a
  },
  basswood: {
    plinth: 0x6e5641,
    ground: 0xdfc198,
    typical: 0xe7cca6,
    roof: 0xd6b588,
    edge: 0x362719,
    selectedEmissive: 0x3d1908
  },
  monolith: {
    plinth: 0x8b8e94,
    ground: 0x2f3238,
    typical: 0x383b42,
    roof: 0x26282d,
    edge: 0xd0d4dc,
    selectedEmissive: 0x45160c
  }
};

/* ============================================================================
 * THREE.JS SAHNE, KAMERA VE STÜDYO AYDINLATMA KURULUMU
 * ============================================================================ */

const canvas = document.getElementById('webgl-canvas');
const canvasWrap = document.getElementById('canvas-wrap');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.94;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0e12);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

// Kalibre Edilmiş Mimari Maket Stüdyo Işıklandırması (Aşırı Parlama Önleyici)
const hemiLight = new THREE.HemisphereLight(0xfffaf0, 0x3b3d45, 0.34);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff6e8, 0.98);
keyLight.position.set(240, 420, 280);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0004;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x9fb8d4, 0.28);
fillLight.position.set(-220, 180, -200);
scene.add(fillLight);

// Kameralar (Perspektif 35° & Ortografik CAD)
const perspCamera = new THREE.PerspectiveCamera(35, 1, 1, 15000);
perspCamera.position.set(290, 250, 340);

const orthoCamera = new THREE.OrthographicCamera(-200, 200, 200, -200, -5000, 15000);
orthoCamera.position.copy(perspCamera.position);

let activeCamera = perspCamera;

const controls = new OrbitControls(activeCamera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 75, 0);

// Kesit Düzlemi
const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

// Sahne Grupları
const modelRootGroup = new THREE.Group();
scene.add(modelRootGroup);

const pinGuideGroup = new THREE.Group();
scene.add(pinGuideGroup);

let cadGridHelper = null;
let tierNodes = []; // [{ tier, group, mesh, edges, currentY, targetY }]
let activeEdgesGeometries = [];
let activeMaterials = [];

// Kamera yumuşak geçiş hedefi
let camAnim = null;

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/* ============================================================================
 * MALZEME VE GÖRÜNÜM GÜNCELLEYİCİ
 * ============================================================================ */

function getActiveClippingPlanes() {
  return state.clipAxis === 'none' ? [] : [clipPlane];
}

function updateClipPlaneEquation() {
  if (state.clipAxis === 'none') return;
  const off = state.clipOffsetMm;
  if (state.clipAxis === 'x') clipPlane.set(new THREE.Vector3(-1, 0, 0), off);
  else if (state.clipAxis === 'y') clipPlane.set(new THREE.Vector3(0, -1, 0), off);
  else if (state.clipAxis === 'z') clipPlane.set(new THREE.Vector3(0, 0, -1), off);
}

function createTierMaterial(role, isSelected) {
  const pal = PALETTES[state.appearance] || PALETTES.plaster;
  const clippingPlanes = getActiveClippingPlanes();

  if (state.displayMode === 'blueprint') {
    return new THREE.MeshBasicMaterial({
      color: state.theme === 'dark' ? 0x13161c : 0xfaf8f3,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      clippingPlanes
    });
  }

  if (state.displayMode === 'wire') {
    return new THREE.MeshBasicMaterial({
      color: isSelected ? 0xd9381e : pal.edge,
      wireframe: true,
      clippingPlanes
    });
  }

  const baseHex =
    role === 'plinth' ? pal.plinth : role === 'ground' ? pal.ground : role === 'roof' ? pal.roof : pal.typical;

  const isXray = state.displayMode === 'xray';

  return new THREE.MeshStandardMaterial({
    color: baseHex,
    roughness: state.appearance === 'basswood' ? 0.68 : 0.80,
    metalness: 0.04,
    envMapIntensity: 0.32,
    emissive: isSelected ? pal.selectedEmissive : 0x000000,
    emissiveIntensity: isSelected ? 0.65 : 0.0,
    transparent: isXray,
    opacity: isXray ? 0.36 : 1.0,
    depthWrite: !isXray,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    clippingPlanes
  });
}

function refreshMaterialsAndVisibility() {
  activeMaterials.forEach((m) => m.dispose());
  activeMaterials = [];

  const pal = PALETTES[state.appearance] || PALETTES.plaster;
  const clippingPlanes = getActiveClippingPlanes();

  const edgeColor =
    state.displayMode === 'blueprint'
      ? state.theme === 'dark'
        ? 0x5cc8ff
        : 0x183b59
      : pal.edge;

  for (const node of tierNodes) {
    const isSel = state.selectedTierIndex === node.tier.index;
    const visible = !state.isolateSelectedOnly || state.selectedTierIndex === null || isSel;
    node.group.visible = visible;

    const mat = createTierMaterial(node.tier.role, isSel);
    activeMaterials.push(mat);
    node.mesh.material = mat;

    if (node.edges) {
      node.edges.visible = state.displayMode !== 'wire';
      const eMat = new THREE.LineBasicMaterial({
        color: isSel ? 0xe04f33 : edgeColor,
        transparent: true,
        opacity: state.displayMode === 'blueprint' ? 0.94 : 0.72,
        clippingPlanes
      });
      activeMaterials.push(eMat);
      node.edges.material = eMat;
    }

    // Pim vurgulama halkaları
    if (node.pinHighlightGroup) {
      node.pinHighlightGroup.visible = state.showPinAxes && visible;
      const pinMat = new THREE.MeshStandardMaterial({
        color: 0xe04f33,
        roughness: 0.38,
        metalness: 0.15,
        envMapIntensity: 0.4,
        clippingPlanes
      });
      activeMaterials.push(pinMat);
      node.pinHighlightGroup.traverse((ch) => {
        if (ch.isMesh) ch.material = pinMat;
      });
    }
  }

  pinGuideGroup.visible = state.showPinAxes && !state.isolateSelectedOnly;
  updateTargetTierHeights();
  updateFloatingMetrologyHUD();
}

/* ============================================================================
 * KAT YÜKSEKLİK HEDEFLERİ (PATLATMA + TIKLANAN KATI İNCELEME AÇILIMI)
 * ============================================================================ */

function updateTargetTierHeights() {
  if (!state.assembly) return;
  const { spec } = state.assembly;
  const pct = state.explodePct / 100;
  // Her kat arasındaki patlatma boşluğu: pimin boyunun en az 2.2 katı ile kat yüksekliğinin 1.35 katı arası
  const baseExplodeGap = pct * Math.max(spec.katYukseklikMm * 1.35, spec.pimYukseklikMm * 3.4);
  const inspectLiftGap = Math.max(spec.katYukseklikMm * 1.8, 26);

  for (const node of tierNodes) {
    const idx = node.tier.index;
    let targetY = node.tier.assembledY + idx * baseExplodeGap;

    // Bir kat seçildiyse ve tekil izolasyon kapalıysa, üstteki tüm katları fiziksel maket gibi yukarı kaldır!
    if (state.selectedTierIndex !== null && !state.isolateSelectedOnly && idx > state.selectedTierIndex) {
      targetY += inspectLiftGap;
    }
    if (state.isolateSelectedOnly && state.selectedTierIndex === idx) {
      targetY = 12;
    }

    node.targetY = targetY;
  }
}

/* ============================================================================
 * 3B MİMARİ MAKET SAHNESİNİ YENİDEN İNŞA ET
 * ============================================================================ */

function disposeCurrentSceneMeshes() {
  while (modelRootGroup.children.length > 0) {
    modelRootGroup.remove(modelRootGroup.children[0]);
  }
  while (pinGuideGroup.children.length > 0) {
    const c = pinGuideGroup.children[0];
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
    pinGuideGroup.remove(c);
  }

  activeEdgesGeometries.forEach((eg) => eg.dispose());
  activeEdgesGeometries = [];

  activeMaterials.forEach((m) => m.dispose());
  activeMaterials = [];

  if (state.assembly && state.assembly.sharedGeometries) {
    Object.values(state.assembly.sharedGeometries).forEach((g) => g.dispose());
  }
  if (state.assembly && state.assembly.disposableGeometries) {
    state.assembly.disposableGeometries.forEach((g) => g.dispose());
  }

  tierNodes = [];
}

function rebuildGridHelper(spec) {
  if (cadGridHelper) {
    scene.remove(cadGridHelper);
    cadGridHelper.geometry.dispose();
    cadGridHelper.material.dispose();
  }
  const span = Math.max(260, Math.ceil(Math.max(spec.bazaToplamEnMm, spec.bazaToplamBoyMm) * 2.0 / 20) * 20);
  const divisions = Math.min(60, Math.max(16, Math.round(span / 10)));
  const c1 = state.theme === 'dark' ? 0x2c303a : 0xbab3a4;
  const c2 = state.theme === 'dark' ? 0x1a1c22 : 0xd8d2c5;
  cadGridHelper = new THREE.GridHelper(span, divisions, c1, c2);
  cadGridHelper.position.y = -0.15;
  scene.add(cadGridHelper);

  // Gölge kamerası sınırlarını ölçeğe uydur
  const shBound = Math.max(150, span * 0.55);
  keyLight.shadow.camera.left = -shBound;
  keyLight.shadow.camera.right = shBound;
  keyLight.shadow.camera.top = shBound * 1.4;
  keyLight.shadow.camera.bottom = -shBound * 0.6;
  keyLight.shadow.camera.near = 10;
  keyLight.shadow.camera.far = Math.max(1500, spec.toplamMaketYukseklikMm * 6);
  keyLight.shadow.camera.updateProjectionMatrix();
}

function rebuildModelAndOutputs() {
  const prevHeightsByCode = new Map(tierNodes.map((n) => [n.tier.code, n.currentY]));
  disposeCurrentSceneMeshes();

  const assembly = state.customModel
    ? buildCustomModelAssembly(state.customModel, state.params)
    : buildArchitecturalScaleModelAssembly(state.params);

  state.assembly = assembly;
  const { spec, tiers, sharedGeometries } = assembly;

  if (state.selectedTierIndex !== null && state.selectedTierIndex >= tiers.length) {
    state.selectedTierIndex = null;
    state.isolateSelectedOnly = false;
  }

  // Paylaşımlı kenar çizgisi (parametrik modda) veya kat bazlı kenar çizgisi (özel 3B modelde)
  let sharedEdges = null;
  if (sharedGeometries) {
    sharedEdges = {
      plinth: new THREE.EdgesGeometry(sharedGeometries.plinthGeom, 22),
      ground: new THREE.EdgesGeometry(sharedGeometries.groundGeom, 22),
      typical: new THREE.EdgesGeometry(sharedGeometries.typicalGeom, 22),
      roof: new THREE.EdgesGeometry(sharedGeometries.roofCapGeom, 22)
    };
    activeEdgesGeometries.push(...Object.values(sharedEdges));
  }

  // Köşe pimi vurgulama halkası geometrisi (paylaşımlı)
  const pinRingGeom = new THREE.CylinderGeometry(
    spec.pimCapMm * 0.51,
    spec.pimCapMm * 0.51,
    spec.pimYukseklikMm * 0.92,
    24
  );
  activeEdgesGeometries.push(pinRingGeom);

  for (const tier of tiers) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(tier.geometry);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.tierIndex = tier.index;
    group.add(mesh);

    let tierEdgeGeom = sharedEdges ? sharedEdges[tier.role] : new THREE.EdgesGeometry(tier.geometry, 24);
    if (!sharedEdges) activeEdgesGeometries.push(tierEdgeGeom);
    const edges = new THREE.LineSegments(tierEdgeGeom);
    group.add(edges);

    // Üst erkek pimlerin görsel vermilyon kılıfı (kullanıcı pimleri anında seçebilsin diye)
    const pinPts = tier.topPinCoords !== undefined ? tier.topPinCoords : spec.pinCoords;
    let pinHighlightGroup = null;
    if (tier.role !== 'roof' && pinPts && pinPts.length > 0) {
      pinHighlightGroup = new THREE.Group();
      const pinTopBaseY = tier.heightMm + spec.pimYukseklikMm * 0.46;
      for (const pt of pinPts) {
        const pm = new THREE.Mesh(pinRingGeom);
        pm.position.set(pt.x, pinTopBaseY, pt.z);
        pm.userData.tierIndex = tier.index;
        pinHighlightGroup.add(pm);
      }
      group.add(pinHighlightGroup);
    }

    const startY = prevHeightsByCode.has(tier.code) ? prevHeightsByCode.get(tier.code) : tier.assembledY;
    group.position.y = startY;
    modelRootGroup.add(group);

    tierNodes.push({
      tier,
      group,
      mesh,
      edges,
      pinHighlightGroup,
      currentY: startY,
      targetY: tier.assembledY
    });
  }

  // 4 Köşe boyunca düşey kesikli hizalama eksen çizgileri (kademeli özel modellerde üst kule pimlerini de kapsar)
  const maxAxisTop =
    spec.toplamMaketYukseklikMm +
    tiers.length * Math.max(spec.katYukseklikMm * 1.35, spec.pimYukseklikMm * 3.4) +
    20;
  const seenPinAxes = new Set();
  for (const tier of tiers) {
    const ptsList = tier.topPinCoords !== undefined ? tier.topPinCoords : spec.pinCoords;
    if (!ptsList) continue;
    for (const pt of ptsList) {
      const key = `${pt.x.toFixed(1)}_${pt.z.toFixed(1)}`;
      if (seenPinAxes.has(key)) continue;
      seenPinAxes.add(key);
      const pts = [new THREE.Vector3(pt.x, tier.assembledY, pt.z), new THREE.Vector3(pt.x, maxAxisTop, pt.z)];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0xd9381e,
        dashSize: 3.5,
        gapSize: 2.5,
        transparent: true,
        opacity: 0.62
      });
      const line = new THREE.Line(lineGeom, lineMat);
      line.computeLineDistances();
      pinGuideGroup.add(line);
    }
  }

  rebuildGridHelper(spec);
  updateClipSliderBounds(spec);
  updateClipPlaneEquation();
  refreshMaterialsAndVisibility();
  refreshAllDOMPanels();
}

/* ============================================================================
 * DOM PANELLERİNİ GÜNCELLEME (HUD, DFM DENETİM, STL LİSTESİ, ANTET SVG, B2B CSV)
 * ============================================================================ */

function refreshAllDOMPanels() {
  const { spec, tiers, buildMs } = state.assembly;
  const quote = computeB2BStudioQuote(state.assembly, state.materialKey, state.finishKey);
  state.quote = quote;

  // 1. Üst Telemetri & Yapım Süresi
  document.getElementById('build-ms-tag').textContent = `${buildMs.toFixed(1)} ms`;
  document.getElementById('hud-net-dims').textContent = `${spec.enMm.toFixed(1)} × ${spec.boyMm.toFixed(1)} × ${spec.toplamMaketYukseklikMm.toFixed(1)} mm`;
  document.getElementById('hud-wall-clamp').textContent = `${spec.duvarMm.toFixed(2)} / ${spec.parapetMm.toFixed(2)} mm (${spec.perimeterCount}×0.4)`;
  document.getElementById('hud-pin-spec').textContent = `Ø${spec.pimCapMm.toFixed(2)} / Ø${spec.yuvaCapMm.toFixed(2)} (+${spec.pimTolMm.toFixed(2)})`;
  document.getElementById('hud-b2b-price').textContent = `${quote.summary.subtotalTl.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL`;

  const dfmBadge = document.getElementById('dfm-status-badge');
  if (spec.minWallMm >= 1.2) {
    dfmBadge.className = 'dfm-badge ok';
    dfmBadge.textContent = `DFM ≥${spec.minWallMm.toFixed(2)}MM · ${spec.perimeterCount} PERİMETRE ONAYLI`;
  } else {
    dfmBadge.className = 'dfm-badge warn';
    dfmBadge.textContent = `DİKKAT: ${spec.minWallMm.toFixed(2)}MM (<1.20MM İNCE DUVAR)`;
  }

  // 2. Özel 3B Model Aktiflik Durumu & Kontrol Kartı Ölçekli Rozetleri
  const customActivePanel = document.getElementById('custom-model-active-panel');
  const isCustom = Boolean(state.customModel && spec.isCustomModel);
  if (customActivePanel) {
    customActivePanel.classList.toggle('hidden', !isCustom);
    if (isCustom) {
      document.getElementById('cap-filename').textContent = state.customModel.fileName;
      document.getElementById('cap-detected-info').textContent =
        `${spec.detectedUnitLabel} · ${spec.binaEnM.toFixed(1)}×${spec.binaBoyM.toFixed(1)}×${spec.gercekToplamYukseklikM.toFixed(1)} m`;
      document.getElementById('chk-custom-zup').checked = Boolean(state.customModel.zUp);
      document.getElementById('custom-unit-select').value = state.customModel.unitMode || 'auto';
    }
  }

  // Özel model yüklüyken yalnız parametrik kutu ebatlarını soluklaştır; Ölçek, Kat_Sayisi, Min_Basilir_Duvar ve Pim_Toleransi aktif kalsın
  const PARAM_ONLY_INPUT_IDS = ['Bina_En_m', 'Bina_Boy_m', 'Kat_Yuksekligi_m', 'Balkon_Cikma_m', 'Pencere_Orani_Yuzde'];
  for (const inputId of PARAM_ONLY_INPUT_IDS) {
    const el = document.getElementById(inputId);
    const card = el ? el.closest('.ctrl-group') : null;
    if (card) card.classList.toggle('disabled-in-custom', isCustom);
  }

  if (isCustom) {
    document.querySelectorAll('.example-card[data-example]').forEach((card) => card.classList.remove('active'));
  }

  document.getElementById('scaled-en-tag').textContent = `${spec.enMm.toFixed(1)} mm`;
  document.getElementById('scaled-boy-tag').textContent = `${spec.boyMm.toFixed(1)} mm`;
  document.getElementById('scaled-tiers-tag').textContent = `${tiers.length} Modül`;
  document.getElementById('scaled-kat-h-tag').textContent = `${spec.katYukseklikMm.toFixed(1)} mm`;
  document.getElementById('scaled-balkon-tag').textContent = isCustom
    ? 'Özel Kabuk'
    : spec.balkonMod === 'YOK'
    ? 'Yok (0 mm)'
    : spec.balkonMod === 'DOLU_CIKMA'
    ? `${spec.balkonCikmaMm.toFixed(1)} mm (Dolu)`
    : `${spec.balkonCikmaMm.toFixed(1)} mm`;
  document.getElementById('scaled-win-tag').textContent = isCustom
    ? '3B Mesh'
    : `${spec.baysX.bayCount}×${spec.baysZ.bayCount} Aks`;

  // 3. DFM Mühendislik Denetim Listesi
  const auditUl = document.getElementById('dfm-audit-list');
  if (isCustom) {
    auditUl.innerHTML = `
      <li>Yüklü 3B Model: <b>${spec.binaEnM.toFixed(1)} × ${spec.binaBoyM.toFixed(1)} × ${spec.gercekToplamYukseklikM.toFixed(1)} m</b> (${spec.detectedUnitLabel})</li>
      <li>Kat Dilimleme (${spec.katSayisi} Kat): Kat başı <b>${spec.katYukseklikMm.toFixed(2)}mm</b> (Gerçek: ${spec.katYuksekligiM.toFixed(2)}m)</li>
      <li>DFM İç Kabuk &amp; Döşeme: <b>${spec.duvarMm.toFixed(2)}mm</b> ${spec.duvarClamped ? '⚡[≥1.2MM KELEPÇELİ]' : '[DOĞAL]'} (${spec.perimeterCount}×0.4mm tur)</li>
      <li>Kademe-Uyumlu 4× Pim / Yuva: <b>Ø${spec.pimCapMm.toFixed(2)}mm</b> / <b>Ø${spec.yuvaCapMm.toFixed(2)}mm</b> (+${spec.pimTolMm.toFixed(2)}mm)</li>
      <li>Kademeli Vaziyet Bazası: <b>${spec.bazaToplamEnMm.toFixed(1)} × ${spec.bazaToplamBoyMm.toFixed(1)} × ${spec.bazaToplamYukseklikMm.toFixed(1)} mm</b></li>
    `;
  } else {
    auditUl.innerHTML = `
      <li>Dış Cidar (0.30m): <b>${spec.hamDuvarMm.toFixed(2)}mm</b> → <b>${spec.duvarMm.toFixed(2)}mm</b> ${spec.duvarClamped ? '⚡[KELEPÇELENDİ]' : '[DOĞAL]'}</li>
      <li>Çatı Parapeti (0.20m): <b>${spec.hamParapetMm.toFixed(2)}mm</b> → <b>${spec.parapetMm.toFixed(2)}mm</b> ${spec.parapetClamped ? '⚡[KELEPÇELENDİ]' : '[DOĞAL]'}</li>
      <li>Kat Döşemesi (0.30m): <b>${spec.hamDosemeMm.toFixed(2)}mm</b> → <b>${spec.dosemeMm.toFixed(2)}mm</b></li>
      <li>Pencere Dikmeleri: En az <b>${Math.min(spec.baysX.pierWidthMm, spec.baysZ.pierWidthMm).toFixed(2)}mm</b> (Nozul: ${spec.perimeterCount} tur)</li>
      <li>4× Köşe Pim / Yuva: <b>Ø${spec.pimCapMm.toFixed(2)}mm</b> / <b>Ø${spec.yuvaCapMm.toFixed(2)}mm</b> (Boşluk: +${spec.pimTolMm.toFixed(2)}mm)</li>
      <li>Kademeli Vaziyet Bazası: <b>${spec.bazaToplamEnMm.toFixed(1)} × ${spec.bazaToplamBoyMm.toFixed(1)} × ${spec.bazaToplamYukseklikMm.toFixed(1)} mm</b></li>
    `;
  }

  const bedBanner = document.getElementById('bed-status-banner');
  bedBanner.className = `bed-banner ${spec.bedStatus.ok ? 'ok' : 'warn'}`;
  bedBanner.textContent = spec.bedStatus.label;

  // 4. Kat İnceleme Seçici (Dock)
  const inspSel = document.getElementById('inspect-tier-select');
  const prevVal = state.selectedTierIndex === null ? 'all' : String(state.selectedTierIndex);
  inspSel.innerHTML = `<option value="all">Tüm Katlar (Serbest İstif)</option>` +
    tiers
      .map(
        (t) =>
          `<option value="${t.index}" ${String(t.index) === prevVal ? 'selected' : ''}>${t.titleTr}</option>`
      )
      .join('');

  // 5. Kat Bazlı .STL Listesi
  const stlListEl = document.getElementById('per-floor-stl-list');
  stlListEl.innerHTML = '';
  quote.tierMetrics.forEach((tm) => {
    const row = document.createElement('div');
    row.className = `stl-tier-item ${state.selectedTierIndex === tm.index ? 'selected' : ''}`;
    row.innerHTML = `
      <div class="stl-tier-meta">
        <strong>${tm.titleTr}</strong>
        <span>${tm.metrology.bboxMm.x.toFixed(1)}×${tm.metrology.bboxMm.z.toFixed(1)}×${tm.metrology.bboxMm.y.toFixed(1)} mm · ${tm.grossMassG.toFixed(1)} g · ${(tm.printHours * 60).toFixed(0)} dk</span>
        <span>${tm.pinNote}</span>
      </div>
      <div class="stl-tier-btns">
        <button type="button" class="btn-ghost small" data-focus-tier="${tm.index}">İncele</button>
        <button type="button" class="btn-primary small" data-stl-tier="${tm.index}">.STL</button>
      </div>
    `;
    stlListEl.appendChild(row);
  });

  // 6. Canlı 2B "Imalat_Anteti" (.SVG)
  const svgMarkup = generateImalatAntetiSVG(state.assembly, quote);
  state.latestSvgMarkup = svgMarkup;
  document.getElementById('svg-preview-container').innerHTML = svgMarkup;
  if (!document.getElementById('svg-modal').classList.contains('hidden')) {
    document.getElementById('svg-modal-body').innerHTML = svgMarkup;
  }
  document.getElementById('antet-pin-coords').textContent = `X=±${spec.pinOffsetX.toFixed(1)} / Z=±${spec.pinOffsetZ.toFixed(1)} mm`;
  document.getElementById('antet-pin-fit').textContent = `Ø${spec.pimCapMm.toFixed(2)} / Ø${spec.yuvaCapMm.toFixed(2)} mm (+${spec.pimTolMm.toFixed(2)})`;
  document.getElementById('antet-wall-dfm').textContent = `${spec.duvarMm.toFixed(2)} / ${spec.parapetMm.toFixed(2)} mm (Min ${spec.minWallMm.toFixed(2)})`;

  // 7. B2B Stüdyo Teklif Tablosu
  const tbody = document.getElementById('quote-tbody');
  tbody.innerHTML = quote.quoteLines
    .map(
      (line) => `
      <tr>
        <td><strong>${line.kalemKodu}</strong></td>
        <td>${line.aciklama}<br/><small style="color:var(--ink-muted)">${line.boyutMm}</small></td>
        <td>${line.adet}</td>
        <td>${line.toplamAgirlikG > 0 ? `${line.toplamAgirlikG.toFixed(0)} g` : '—'}</td>
        <td>${line.toplamSureSaat.toFixed(1)} sa</td>
        <td><strong>${line.toplamTutarTl.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL</strong></td>
      </tr>
    `
    )
    .join('');

  document.getElementById('qs-mass').textContent = `${quote.summary.totalGrossMassG.toFixed(1)} g (Net: ${quote.summary.totalNetMassG.toFixed(1)} g)`;
  document.getElementById('qs-hours').textContent = `${quote.summary.totalPrintHours.toFixed(1)} saat`;
  document.getElementById('qs-lead').textContent = `${quote.summary.leadTimeDays} iş günü`;
  document.getElementById('qs-sub').textContent = `${quote.summary.subtotalTl.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
  document.getElementById('qs-vat').textContent = `${quote.summary.vatTl.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
  document.getElementById('qs-grand').textContent = `${quote.summary.grandTotalTl.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;

  const rm = quote.referenceMassesG;
  document.getElementById('qs-ref-metals').textContent =
    `Tam Dolu Kütle Ref: PLA ${rm.PLA.toFixed(0)}g · PETG ${rm.PETG.toFixed(0)}g · Al6061 ${(rm.Al6061 / 1000).toFixed(2)}kg · Çelik304 ${(rm.SS304 / 1000).toFixed(2)}kg`;

  updateFloatingMetrologyHUD();
}

function updateFloatingMetrologyHUD() {
  if (!state.assembly) return;
  const inspectorBox = document.getElementById('tier-Floating-Inspector');

  if (state.selectedTierIndex !== null && state.assembly.tiers[state.selectedTierIndex]) {
    const t = state.assembly.tiers[state.selectedTierIndex];
    const m = t.metrology;
    const plaG = m.volCm3 * 1.24 * (t.role === 'plinth' ? 0.46 : 0.78);

    document.getElementById('fm-active-label').textContent = `SEÇİLİ MODÜL: ${t.titleTr.toUpperCase()}`;
    document.getElementById('fm-bbox').textContent = `${m.bboxMm.x.toFixed(1)} × ${m.bboxMm.z.toFixed(1)} × ${m.bboxMm.y.toFixed(1)} mm`;
    document.getElementById('fm-vol').textContent = `${m.volCm3.toFixed(2)} cm³ (${m.volumeMm3.toFixed(0)} mm³)`;
    document.getElementById('fm-area').textContent = `${m.areaCm2.toFixed(1)} cm²`;
    document.getElementById('fm-tri-mass').textContent = `${m.triangleCount.toLocaleString('tr-TR')} Δ · ~${plaG.toFixed(1)} g PLA`;

    inspectorBox.classList.remove('hidden');
    document.getElementById('insp-tier-name').textContent = t.titleTr;
    document.getElementById('btn-insp-isolate').textContent = state.isolateSelectedOnly ? 'İstife Dön' : 'Yalnız Bu Kat';
  } else {
    const tot = state.assembly.totals;
    const plaTotalG = state.quote ? state.quote.summary.totalGrossMassG : tot.volCm3 * 1.24 * 0.72;

    document.getElementById('fm-active-label').textContent = `TÜM MAKET İSTİFİ (${tot.tierCount} MODÜL · BAZA DAHİL)`;
    document.getElementById('fm-bbox').textContent = `${tot.bboxMm.x.toFixed(1)} × ${tot.bboxMm.z.toFixed(1)} × ${tot.bboxMm.y.toFixed(1)} mm`;
    document.getElementById('fm-vol').textContent = `${tot.volCm3.toFixed(2)} cm³ (${tot.volumeMm3.toFixed(0)} mm³)`;
    document.getElementById('fm-area').textContent = `${tot.areaCm2.toFixed(1)} cm²`;
    document.getElementById('fm-tri-mass').textContent = `${tot.triangleCount.toLocaleString('tr-TR')} Δ · ~${plaTotalG.toFixed(1)} g PLA`;

    inspectorBox.classList.add('hidden');
  }
}

/* ============================================================================
 * KAMERA YÖNLERİ, ORTOGRAFİK GEÇİŞ VE KESİT KONTROLLERİ
 * ============================================================================ */

function syncOrthoFrustum() {
  const rect = canvasWrap.getBoundingClientRect();
  const aspect = Math.max(0.2, rect.width / Math.max(1, rect.height));
  const dist = perspCamera.position.distanceTo(controls.target);
  const halfH = Math.max(30, dist * Math.tan(THREE.MathUtils.degToRad(perspCamera.fov * 0.5)));
  const halfW = halfH * aspect;

  orthoCamera.left = -halfW;
  orthoCamera.right = halfW;
  orthoCamera.top = halfH;
  orthoCamera.bottom = -halfH;
  orthoCamera.updateProjectionMatrix();
}

function setCameraProjection(type) {
  if (state.cameraType === type) return;
  const prevCam = activeCamera;
  state.cameraType = type;

  if (type === 'ortho') {
    orthoCamera.position.copy(prevCam.position);
    orthoCamera.quaternion.copy(prevCam.quaternion);
    orthoCamera.zoom = 1;
    syncOrthoFrustum();
    activeCamera = orthoCamera;
  } else {
    perspCamera.position.copy(prevCam.position);
    perspCamera.quaternion.copy(prevCam.quaternion);
    perspCamera.updateProjectionMatrix();
    activeCamera = perspCamera;
  }

  controls.object = activeCamera;
  controls.update();

  document.getElementById('btn-cam-persp').classList.toggle('active', type === 'persp');
  document.getElementById('btn-cam-ortho').classList.toggle('active', type === 'ortho');
}

function flyToCadView(viewName, instant = false) {
  if (!state.assembly) return;
  const { spec, tiers } = state.assembly;
  const pct = state.explodePct / 100;
  const baseExplodeGap = pct * Math.max(spec.katYukseklikMm * 1.35, spec.pimYukseklikMm * 3.4);
  const fullStackHeight = spec.toplamMaketYukseklikMm + Math.max(0, tiers.length - 1) * baseExplodeGap;

  const span = Math.max(spec.bazaToplamEnMm, spec.bazaToplamBoyMm, fullStackHeight * 0.95);
  const dist = span * 1.85;
  const centerY =
    state.selectedTierIndex !== null && tierNodes[state.selectedTierIndex]
      ? tierNodes[state.selectedTierIndex].targetY + tierNodes[state.selectedTierIndex].tier.heightMm * 0.5
      : fullStackHeight * 0.46;

  const target = new THREE.Vector3(0, centerY, 0);
  const pos = new THREE.Vector3();

  if (viewName === 'top') pos.set(0, centerY + dist * 1.25, 0.01);
  else if (viewName === 'bottom') pos.set(0, centerY - dist * 1.2, 0.01);
  else if (viewName === 'front') pos.set(0, centerY, dist * 1.25);
  else if (viewName === 'right') pos.set(dist * 1.25, centerY, 0);
  else pos.set(dist * 0.88, centerY + dist * 0.62, dist * 0.96);

  if (instant) {
    activeCamera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
    if (state.cameraType === 'ortho') syncOrthoFrustum();
    camAnim = null;
  } else {
    camAnim = { pos, target };
  }
}

function updateClipSliderBounds(spec) {
  const clipSlider = document.getElementById('clip-offset-range');
  const maxHalf =
    state.clipAxis === 'y'
      ? Math.ceil(spec.toplamMaketYukseklikMm * 2.3)
      : Math.ceil(Math.max(spec.bazaToplamEnMm, spec.bazaToplamBoyMm) * 0.62);

  if (state.clipAxis === 'y') {
    clipSlider.min = '0';
    clipSlider.max = String(maxHalf);
  } else {
    clipSlider.min = String(-maxHalf);
    clipSlider.max = String(maxHalf);
  }
}

/* ============================================================================
 * ETKİLEŞİM VE KONTROL BAĞLANTILARI
 * ============================================================================ */

const PARAM_KEYS = [
  'Bina_En_m',
  'Bina_Boy_m',
  'Kat_Sayisi',
  'Kat_Yuksekligi_m',
  'Balkon_Cikma_m',
  'Pencere_Orani_Yuzde',
  'Min_Basilir_Duvar_mm',
  'Kat_Pim_Toleransi_mm'
];

function syncInputsFromState() {
  for (const key of PARAM_KEYS) {
    const numEl = document.getElementById(key);
    const rngEl = document.getElementById(`${key}_range`);
    if (numEl) numEl.value = state.params[key];
    if (rngEl) rngEl.value = state.params[key];
  }
  const sc = String(parseScaleDenominator(state.params.Maket_Olcegi));
  document.getElementById('Maket_Olcegi').value = sc;
  document.querySelectorAll('.scale-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.scale === sc);
  });
}

function bindControls() {
  // Sayısal + Kaydırıcı çift yönlü senkronizasyon
  for (const key of PARAM_KEYS) {
    const numEl = document.getElementById(key);
    const rngEl = document.getElementById(`${key}_range`);

    const onUpdate = (valStr) => {
      const v = Number(valStr);
      if (!Number.isFinite(v)) return;
      state.params[key] = v;
      if (numEl && document.activeElement !== numEl) numEl.value = v;
      if (rngEl && document.activeElement !== rngEl) rngEl.value = v;
      rebuildModelAndOutputs();
    };

    if (rngEl) rngEl.addEventListener('input', (e) => onUpdate(e.target.value));
    if (numEl) numEl.addEventListener('change', (e) => onUpdate(e.target.value));
  }

  // Maket_Olcegi seçici ve butonları
  const setScale = (scaleVal) => {
    const sc = parseScaleDenominator(scaleVal);
    state.params.Maket_Olcegi = sc;
    syncInputsFromState();
    rebuildModelAndOutputs();
    flyToCadView('iso');
  };

  document.getElementById('Maket_Olcegi').addEventListener('change', (e) => setScale(e.target.value));
  document.querySelectorAll('.scale-btn').forEach((btn) => {
    btn.addEventListener('click', () => setScale(btn.dataset.scale));
  });

  // Özel 3B Model Yükleme, Sürükle-Bırak, Eksen Kalibrasyonu ve Demo Model
  const fileInput = document.getElementById('custom-model-file-input');
  const dropzone = document.getElementById('custom-model-dropzone');

  const clearCustomModelState = () => {
    if (state.customModel && state.customModel.rawGeometry) {
      state.customModel.rawGeometry.dispose();
    }
    state.customModel = null;
  };

  const activateLoadedCustomModel = (parsed) => {
    clearCustomModelState();
    const unitSel = document.getElementById('custom-unit-select');
    state.customModel = {
      rawGeometry: parsed.geometry,
      fileName: parsed.fileName,
      format: parsed.format,
      defaultZUp: Boolean(parsed.defaultZUp),
      zUp: Boolean(parsed.defaultZUp),
      unitMode: unitSel ? unitSel.value : 'auto',
      rotX: 0,
      rotY: 0,
      rotZ: 0
    };
    state.selectedTierIndex = null;
    state.isolateSelectedOnly = false;
    rebuildModelAndOutputs();
    flyToCadView('iso', false);
  };

  const handleCustomFileUpload = async (file) => {
    if (!file) return;
    const titleEl = dropzone.querySelector('strong');
    const origText = titleEl ? titleEl.textContent : '';
    try {
      if (titleEl) titleEl.textContent = `YÜKLENİYOR: ${file.name}...`;
      const parsed = await parseUploaded3DModelFile(file);
      activateLoadedCustomModel(parsed);
    } catch (err) {
      console.error('Özel 3B model yükleme hatası:', err);
      window.alert(`3B Model Yüklenemedi:\n${err.message || err}`);
    } finally {
      if (titleEl) titleEl.textContent = origText || '+ 3B BİNA DOSYASI SEÇ VEYA SÜRÜKLE';
    }
  };

  document.getElementById('btn-top-upload').addEventListener('click', () => {
    const scrollBox = document.querySelector('.controls-scroll');
    if (scrollBox) scrollBox.scrollTo({ top: 0, behavior: 'smooth' });
    fileInput.click();
  });

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleCustomFileUpload(f);
    e.target.value = '';
  });

  // Hem sol yükleme kutusuna hem de 3B sahne tuvaline dosya sürükleyip bırakma desteği
  for (const targetEl of [dropzone, canvasWrap]) {
    targetEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    targetEl.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    targetEl.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleCustomFileUpload(f);
    });
  }

  document.getElementById('btn-load-demo-custom').addEventListener('click', () => {
    activateLoadedCustomModel(createDemoCustomBuildingModel());
  });

  // Hazır Mimari Örnekler (Üst Görsel Vitrin Kartları + Sol Seçici Senkron)
  const applyExamplePreset = (presetKey) => {
    const preset = ARCHITECTURAL_PRESETS[presetKey];
    if (!preset) return;
    clearCustomModelState();
    state.activePresetKey = presetKey;
    state.params = { ...preset };
    state.selectedTierIndex = null;
    state.isolateSelectedOnly = false;

    const presetSel = document.getElementById('preset-select');
    if (presetSel) presetSel.value = presetKey;
    document.querySelectorAll('.example-card[data-example]').forEach((card) => {
      card.classList.toggle('active', card.dataset.example === presetKey);
    });

    syncInputsFromState();
    rebuildModelAndOutputs();
    flyToCadView('iso', false);
  };

  document.getElementById('btn-clear-custom-model').addEventListener('click', () => {
    applyExamplePreset(state.activePresetKey || 'konut_200');
  });

  document.getElementById('custom-unit-select').addEventListener('change', (e) => {
    if (!state.customModel) return;
    state.customModel.unitMode = e.target.value;
    rebuildModelAndOutputs();
    flyToCadView('iso', false);
  });

  document.getElementById('chk-custom-zup').addEventListener('change', (e) => {
    if (!state.customModel) return;
    state.customModel.zUp = e.target.checked;
    rebuildModelAndOutputs();
    flyToCadView('iso', false);
  });

  document.querySelectorAll('[data-crot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!state.customModel) return;
      const op = btn.dataset.crot;
      if (op === 'x') state.customModel.rotX = (state.customModel.rotX + 1) % 4;
      else if (op === 'y') state.customModel.rotY = (state.customModel.rotY + 1) % 4;
      else if (op === 'z') state.customModel.rotZ = (state.customModel.rotZ + 1) % 4;
      else if (op === 'reset') {
        state.customModel.rotX = 0;
        state.customModel.rotY = 0;
        state.customModel.rotZ = 0;
        state.customModel.zUp = Boolean(state.customModel.defaultZUp);
      }
      rebuildModelAndOutputs();
      flyToCadView('iso', false);
    });
  });

  document.getElementById('preset-select').addEventListener('change', (e) => {
    applyExamplePreset(e.target.value);
  });

  document.querySelectorAll('.example-card[data-example]').forEach((card) => {
    card.addEventListener('click', () => applyExamplePreset(card.dataset.example));
  });

  // DFM Hızlı Sıfırlama Rozetleri
  document.getElementById('btn-reset-wall').addEventListener('click', () => {
    state.params.Min_Basilir_Duvar_mm = 1.20;
    syncInputsFromState();
    rebuildModelAndOutputs();
  });

  document.getElementById('btn-reset-tol').addEventListener('click', () => {
    state.params.Kat_Pim_Toleransi_mm = 0.20;
    syncInputsFromState();
    rebuildModelAndOutputs();
  });

  // Tema Değiştirici (Arşiv Kâğıdı / Koyu Atölye)
  document.getElementById('btn-theme-toggle').addEventListener('click', (e) => {
    state.theme = state.theme === 'paper' ? 'dark' : 'paper';
    document.documentElement.setAttribute('data-theme', state.theme);
    e.currentTarget.textContent = state.theme === 'paper' ? 'KOYU ATÖLYE' : 'ARŞİV KÂĞIDI';
    scene.background = new THREE.Color(state.theme === 'dark' ? 0x0d0e12 : 0xcfc8b8);
    rebuildGridHelper(state.assembly.spec);
    refreshMaterialsAndVisibility();
  });

  // Kamera & Görünüm Araç Çubuğu
  document.getElementById('btn-cam-persp').addEventListener('click', () => setCameraProjection('persp'));
  document.getElementById('btn-cam-ortho').addEventListener('click', () => setCameraProjection('ortho'));

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => flyToCadView(btn.dataset.view));
  });

  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.displayMode = btn.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      refreshMaterialsAndVisibility();
    });
  });

  document.getElementById('finish-appearance-select').addEventListener('change', (e) => {
    state.appearance = e.target.value;
    refreshMaterialsAndVisibility();
  });

  document.getElementById('chk-pin-axes').addEventListener('change', (e) => {
    state.showPinAxes = e.target.checked;
    refreshMaterialsAndVisibility();
  });

  // Patlatma (Explode) Kaydırıcısı ve Butonu
  const explodeRange = document.getElementById('explode-range');
  const explodeLbl = document.getElementById('explode-pct-lbl');
  const explodeBtn = document.getElementById('btn-toggle-explode');

  const applyExplode = (pct) => {
    state.explodePct = pct;
    explodeRange.value = pct;
    explodeLbl.textContent = `%${pct}`;
    explodeBtn.textContent = pct > 15 ? 'KATLARI İSTİFLE' : 'KATLARI PATLAT';
    updateTargetTierHeights();
  };

  explodeRange.addEventListener('input', (e) => applyExplode(Number(e.target.value)));
  explodeBtn.addEventListener('click', () => applyExplode(state.explodePct > 15 ? 0 : 58));

  // Kat İnceleme Seçimi
  document.getElementById('inspect-tier-select').addEventListener('change', (e) => {
    const val = e.target.value;
    state.selectedTierIndex = val === 'all' ? null : Number(val);
    if (state.selectedTierIndex === null) state.isolateSelectedOnly = false;
    refreshMaterialsAndVisibility();
    refreshAllDOMPanels();
  });

  document.getElementById('btn-insp-isolate').addEventListener('click', () => {
    if (state.selectedTierIndex === null) return;
    state.isolateSelectedOnly = !state.isolateSelectedOnly;
    refreshMaterialsAndVisibility();
  });

  document.getElementById('btn-insp-download').addEventListener('click', () => {
    if (state.selectedTierIndex === null || !state.assembly) return;
    exportSingleTierSTL(state.assembly.tiers[state.selectedTierIndex]);
  });

  document.getElementById('btn-insp-clear').addEventListener('click', () => {
    state.selectedTierIndex = null;
    state.isolateSelectedOnly = false;
    document.getElementById('inspect-tier-select').value = 'all';
    refreshMaterialsAndVisibility();
    refreshAllDOMPanels();
  });

  // Kesit Düzlemi Kontrolleri + Köşe Pim Aksı Kesiti
  const clipSlider = document.getElementById('clip-offset-range');
  const clipLbl = document.getElementById('clip-offset-lbl');

  const activateClip = (axis, customOffset = null) => {
    state.clipAxis = axis;
    document.querySelectorAll('[data-clip]').forEach((b) => b.classList.toggle('active', b.dataset.clip === axis));
    document.getElementById('btn-clip-pin-axis').classList.remove('active');

    if (axis === 'none') {
      clipSlider.disabled = true;
      clipLbl.textContent = 'Kapalı';
    } else {
      clipSlider.disabled = false;
      updateClipSliderBounds(state.assembly.spec);
      const nextOff =
        customOffset !== null
          ? customOffset
          : axis === 'y'
          ? state.assembly.spec.toplamMaketYukseklikMm * 0.45
          : 0;
      state.clipOffsetMm = nextOff;
      clipSlider.value = nextOff;
      clipLbl.textContent = `${nextOff.toFixed(1)} mm`;
      updateClipPlaneEquation();
    }
    refreshMaterialsAndVisibility();
  };

  document.querySelectorAll('[data-clip]').forEach((btn) => {
    btn.addEventListener('click', () => activateClip(btn.dataset.clip));
  });

  document.getElementById('btn-clip-pin-axis').addEventListener('click', (e) => {
    const pinX = state.assembly.spec.pinOffsetX;
    activateClip('x', pinX);
    e.currentTarget.classList.add('active');
    document.querySelectorAll('[data-clip]').forEach((b) => b.classList.remove('active'));
  });

  clipSlider.addEventListener('input', (e) => {
    state.clipOffsetMm = Number(e.target.value);
    clipLbl.textContent = `${state.clipOffsetMm.toFixed(1)} mm`;
    updateClipPlaneEquation();
  });

  // Sağ Sütun Sekmeleri
  document.querySelectorAll('.out-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const target = tabBtn.dataset.tab;
      document.querySelectorAll('.out-tab').forEach((b) => b.classList.toggle('active', b === tabBtn));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      document.getElementById(`tab-panel-${target}`).classList.add('active');
    });
  });

  // Kat Bazlı STL Tıklama Delegasyonu
  document.getElementById('per-floor-stl-list').addEventListener('click', (e) => {
    const stlBtn = e.target.closest('[data-stl-tier]');
    if (stlBtn) {
      const idx = Number(stlBtn.dataset.stlTier);
      exportSingleTierSTL(state.assembly.tiers[idx]);
      return;
    }
    const focusBtn = e.target.closest('[data-focus-tier]');
    if (focusBtn) {
      const idx = Number(focusBtn.dataset.focusTier);
      state.selectedTierIndex = idx;
      refreshMaterialsAndVisibility();
      refreshAllDOMPanels();
    }
  });

  // Tüm İhracat Butonları (.STL, .SVG, .CSV, .OBJ, .GLB, .DXF, .SCAD)
  document.getElementById('btn-download-all-stl').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const orig = btn.textContent;
    exportAllTiersSequentialSTL(state.assembly, (cur, tot) => {
      btn.textContent = `İNDİRİLİYOR (${cur}/${tot})...`;
      if (cur === tot) setTimeout(() => (btn.textContent = orig), 1200);
    });
  });

  document.getElementById('btn-exp-plate-stl').addEventListener('click', () => exportFullAssemblySTL(state.assembly, 'plate'));
  document.getElementById('btn-exp-stacked-stl').addEventListener('click', () => exportFullAssemblySTL(state.assembly, 'stacked'));
  document.getElementById('btn-exp-obj').addEventListener('click', () => exportAssemblyOBJ(modelRootGroup, state.assembly.spec));
  document.getElementById('btn-exp-glb').addEventListener('click', () => exportAssemblyGLB(modelRootGroup, state.assembly.spec));
  document.getElementById('btn-exp-dxf').addEventListener('click', () => exportFloorPlanDXF(state.assembly.spec));
  document.getElementById('btn-exp-scad').addEventListener('click', () => exportParametricSCAD(state.assembly.spec));

  const triggerSvgDownload = () => exportImalatAntetiSVG(state.latestSvgMarkup, state.assembly.spec);
  document.getElementById('btn-top-svg').addEventListener('click', triggerSvgDownload);
  document.getElementById('btn-download-svg').addEventListener('click', triggerSvgDownload);
  document.getElementById('btn-modal-download-svg').addEventListener('click', triggerSvgDownload);

  const triggerCsvDownload = () => exportB2BStudioQuoteCSV(state.quote, state.assembly.spec);
  document.getElementById('btn-top-csv').addEventListener('click', triggerCsvDownload);
  document.getElementById('btn-download-csv').addEventListener('click', triggerCsvDownload);

  // B2B Malzeme & İşçilik Seçicileri
  document.getElementById('quote-material-select').addEventListener('change', (e) => {
    state.materialKey = e.target.value;
    refreshAllDOMPanels();
  });
  document.getElementById('quote-finish-select').addEventListener('change', (e) => {
    state.finishKey = e.target.value;
    refreshAllDOMPanels();
  });

  // Tam Ekran SVG Modalı
  const svgModal = document.getElementById('svg-modal');
  const openModal = () => {
    document.getElementById('svg-modal-body').innerHTML = state.latestSvgMarkup;
    svgModal.classList.remove('hidden');
  };
  const closeModal = () => svgModal.classList.add('hidden');

  document.getElementById('btn-zoom-svg').addEventListener('click', openModal);
  document.getElementById('svg-preview-container').addEventListener('click', openModal);
  document.getElementById('btn-modal-close').addEventListener('click', closeModal);
  svgModal.addEventListener('click', (e) => {
    if (e.target === svgModal) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // 3B Tuvalde Kata Tıklayarak Seçme / Üst Katları Kaldırma (Raycaster)
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downPos = { x: 0, y: 0 };

  canvas.addEventListener('pointerdown', (e) => {
    downPos = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointerup', (e) => {
    if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) return; // Sürükleme ise seçme
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(pointer, activeCamera);
    const pickables = tierNodes.filter((n) => n.group.visible).map((n) => n.mesh);
    const hits = raycaster.intersectObjects(pickables, false);

    if (hits.length > 0) {
      const hitIdx = hits[0].object.userData.tierIndex;
      state.selectedTierIndex = state.selectedTierIndex === hitIdx ? null : hitIdx;
      if (state.selectedTierIndex === null) state.isolateSelectedOnly = false;
    } else if (!state.isolateSelectedOnly) {
      state.selectedTierIndex = null;
    }
    refreshMaterialsAndVisibility();
    refreshAllDOMPanels();
  });
}

/* ============================================================================
 * BOYUTLANDIRMA VE ANİMASYON DÖNGÜSÜ (60–120 FPS DAMPED RIG)
 * ============================================================================ */

function handleResize() {
  const rect = canvasWrap.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  renderer.setSize(w, h, false);

  perspCamera.aspect = w / h;
  perspCamera.updateProjectionMatrix();
  if (state.cameraType === 'ortho') syncOrthoFrustum();
}

const resizeObs = new ResizeObserver(handleResize);
resizeObs.observe(canvasWrap);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Katların patlatma ve inceleme yüksekliklerini üstel sönümleme ile güncelle
  for (const node of tierNodes) {
    if (Math.abs(node.currentY - node.targetY) > 0.01) {
      node.currentY = damp(node.currentY, node.targetY, 11, dt);
      node.group.position.y = node.currentY;
    }
  }

  // Kamera yön geçişi animasyonu
  if (camAnim) {
    activeCamera.position.x = damp(activeCamera.position.x, camAnim.pos.x, 8, dt);
    activeCamera.position.y = damp(activeCamera.position.y, camAnim.pos.y, 8, dt);
    activeCamera.position.z = damp(activeCamera.position.z, camAnim.pos.z, 8, dt);
    controls.target.x = damp(controls.target.x, camAnim.target.x, 8, dt);
    controls.target.y = damp(controls.target.y, camAnim.target.y, 8, dt);
    controls.target.z = damp(controls.target.z, camAnim.target.z, 8, dt);
    if (state.cameraType === 'ortho') syncOrthoFrustum();
    if (activeCamera.position.distanceTo(camAnim.pos) < 0.8) camAnim = null;
  }

  controls.update();
  renderer.render(scene, activeCamera);
}

// Başlat
syncInputsFromState();
bindControls();
rebuildModelAndOutputs();
handleResize();
flyToCadView('iso', true);
document.getElementById('btn-toggle-explode').textContent = 'KATLARI İSTİFLE';
animate();


/* ADJY köprüsü: yüklenen özel modelin dönüşü form alanlarında durmuyor;
   sipariş kaydına girebilmesi için durum salt-okunur olarak dışarı açılır. */
window.__ADJY_MIMARI = { durum: () => state };
