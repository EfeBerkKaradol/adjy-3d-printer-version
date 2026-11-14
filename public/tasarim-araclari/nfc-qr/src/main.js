import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import { generateQrMatrix } from './qr-encoder.js';
import {
  computeSlicerPlan,
  buildPlaqueManifoldGeometry,
  buildStandFootManifoldGeometry,
  computeMeshMetrology,
  verifyWatertightManifold,
  buildBinaryStlBuffer
} from './cad-geometry.js';
import {
  computePlateNesting,
  computeB2BPricing,
  generateImalatAntetiSvg,
  generateB2BPricingCsv,
  generateProfileDxf,
  generateOpenScadScript
} from './nesting-b2b.js';

// ============================================================================
// 1. CURATED CUSTOMIZABLE DESIGN PRESETS & STATE
// ============================================================================
const PRESETS = {
  cafe_arch: {
    Urun_Tipi: 'Angled_Stand',
    Govde_Sekli: 'Kemer_Stand',
    En_Boy_Orani: '3:4',
    Kose_Radyus_mm: 7,
    Cerceve_Stili: 'Kabartma_Cerceve',
    Halka_Konumu: 'Yok',
    Yerlesim_Duzeni: 'Cift_Satir_Simetrik',
    QR_Baglanti_URL: 'https://menu.ornekfirma.com.tr/masa-12',
    Ust_Baslik_Metni: 'MENÜ & NFC',
    Alt_Metin: 'TELEFONU YAKLAŞTIR',
    Yazi_Fontu: 'Kalin_Tabela',
    Yazi_Hizalama: 'Orta',
    Sembol_Ikon: 'Kahve_Fincan',
    Ikon_Konumu: 'Baslik_Solu',
    QR_Olcek_Yuzde: 84,
    QR_Kaydir_X_mm: 0,
    QR_Kaydir_Y_mm: 0,
    Yazi_Boyut_Yuzde: 108,
    Yazi_Kaydir_X_mm: 0,
    Yazi_Kaydir_Y_mm: 0,
    Taban_En_Boy_mm: 85,
    Taban_Kalinligi_mm: 3.2,
    QR_Kabartma_mm: 1.0,
    Katman_Yuksekligi_mm: 0.20,
    NFC_Yuva_Capi_mm: 26,
    Siparis_Adedi: 100,
    Tabla_Boyutu_mm: 220,
    baseHex: '#17181C',
    embossHex: '#F4F1EA'
  },
  hotel_medallion: {
    Urun_Tipi: 'Angled_Stand',
    Govde_Sekli: 'Daire_Madalyon',
    En_Boy_Orani: '1:1',
    Kose_Radyus_mm: 10,
    Cerceve_Stili: 'Kabartma_Cerceve',
    Halka_Konumu: 'Yok',
    Yerlesim_Duzeni: 'Cift_Satir_Simetrik',
    QR_Baglanti_URL: 'WIFI:T:WPA;S:GrandHotel_VIP;P:Konuk2026!;;',
    Ust_Baslik_Metni: 'OTEL Wİ-Fİ',
    Alt_Metin: 'ODA & RESEPSİYON',
    Yazi_Fontu: 'Klasik_Serif',
    Yazi_Hizalama: 'Orta',
    Sembol_Ikon: 'WiFi_Sinyal',
    Ikon_Konumu: 'Baslik_Solu',
    QR_Olcek_Yuzde: 80,
    QR_Kaydir_X_mm: 0,
    QR_Kaydir_Y_mm: 0,
    Yazi_Boyut_Yuzde: 106,
    Yazi_Kaydir_X_mm: 0,
    Yazi_Kaydir_Y_mm: 0,
    Taban_En_Boy_mm: 98,
    Taban_Kalinligi_mm: 3.2,
    QR_Kabartma_mm: 1.0,
    Katman_Yuksekligi_mm: 0.20,
    NFC_Yuva_Capi_mm: 26,
    Siparis_Adedi: 200,
    Tabla_Boyutu_mm: 220,
    baseHex: '#142238',
    embossHex: '#E8C266'
  },
  landscape_split: {
    Urun_Tipi: 'Angled_Stand',
    Govde_Sekli: 'Yuvarlatilmis_Kare',
    En_Boy_Orani: '4:3',
    Kose_Radyus_mm: 8,
    Cerceve_Stili: 'Cift_Cizgi_Cerceve',
    Halka_Konumu: 'Yok',
    Yerlesim_Duzeni: 'Sol_QR_Sag_Metin',
    QR_Baglanti_URL: 'https://kart.teknolojias.com.tr/iletisim',
    Ust_Baslik_Metni: 'DİJİTAL KART',
    Alt_Metin: 'DOKUN VEYA OKUT',
    Yazi_Fontu: 'Kalin_Tabela',
    Yazi_Hizalama: 'Sol',
    Sembol_Ikon: 'NFC_Dalga',
    Ikon_Konumu: 'Ust_Merkez',
    QR_Olcek_Yuzde: 88,
    QR_Kaydir_X_mm: 0,
    QR_Kaydir_Y_mm: 0,
    Yazi_Boyut_Yuzde: 108,
    Yazi_Kaydir_X_mm: 0,
    Yazi_Kaydir_Y_mm: 0,
    Taban_En_Boy_mm: 86,
    Taban_Kalinligi_mm: 3.2,
    QR_Kabartma_mm: 1.0,
    Katman_Yuksekligi_mm: 0.20,
    NFC_Yuva_Capi_mm: 26,
    Siparis_Adedi: 150,
    Tabla_Boyutu_mm: 220,
    baseHex: '#18191D',
    embossHex: '#E04F33'
  },
  corner_keychain: {
    Urun_Tipi: 'Keychain',
    Govde_Sekli: 'Yuvarlatilmis_Kare',
    En_Boy_Orani: '1:1',
    Kose_Radyus_mm: 11,
    Cerceve_Stili: 'Duz_Cercevesiz',
    Halka_Konumu: 'Sol_Ust',
    Yerlesim_Duzeni: 'Ust_QR_Alt_Baslik',
    QR_Baglanti_URL: 'https://katalog.anadolusanayi.com.tr',
    Ust_Baslik_Metni: 'VIP KATALOG',
    Alt_Metin: '',
    Yazi_Fontu: 'Kalin_Tabela',
    Yazi_Hizalama: 'Orta',
    Sembol_Ikon: 'Yildiz_VIP',
    Ikon_Konumu: 'Baslik_Solu',
    QR_Olcek_Yuzde: 82,
    QR_Kaydir_X_mm: 0,
    QR_Kaydir_Y_mm: 0,
    Yazi_Boyut_Yuzde: 108,
    Yazi_Kaydir_X_mm: 0,
    Yazi_Kaydir_Y_mm: 0,
    Taban_En_Boy_mm: 66,
    Taban_Kalinligi_mm: 3.2,
    QR_Kabartma_mm: 1.0,
    Katman_Yuksekligi_mm: 0.20,
    NFC_Yuva_Capi_mm: 26,
    Siparis_Adedi: 500,
    Tabla_Boyutu_mm: 220,
    baseHex: '#162B24',
    embossHex: '#F3EFE6'
  },
  octagon_ind: {
    Urun_Tipi: 'Keychain',
    Govde_Sekli: 'Sekizgen_Plaka',
    En_Boy_Orani: '1:1',
    Kose_Radyus_mm: 6,
    Cerceve_Stili: 'Kabartma_Cerceve',
    Halka_Konumu: 'Ust_Orta',
    Yerlesim_Duzeni: 'Cift_Satir_Simetrik',
    QR_Baglanti_URL: 'https://servis.fabrika.com.tr/makine-04',
    Ust_Baslik_Metni: 'ENVANTER #04',
    Alt_Metin: 'BAKIM KAYDI',
    Yazi_Fontu: 'Teknik_Mono',
    Yazi_Hizalama: 'Orta',
    Sembol_Ikon: 'NFC_Dalga',
    Ikon_Konumu: 'Baslik_Solu',
    QR_Olcek_Yuzde: 80,
    QR_Kaydir_X_mm: 0,
    QR_Kaydir_Y_mm: 0,
    Yazi_Boyut_Yuzde: 108,
    Yazi_Kaydir_X_mm: 0,
    Yazi_Kaydir_Y_mm: 0,
    Taban_En_Boy_mm: 76,
    Taban_Kalinligi_mm: 3.4,
    QR_Kabartma_mm: 1.0,
    Katman_Yuksekligi_mm: 0.20,
    NFC_Yuva_Capi_mm: 26,
    Siparis_Adedi: 250,
    Tabla_Boyutu_mm: 220,
    baseHex: '#181A1F',
    embossHex: '#F4F1EA'
  },
  crest_social: {
    Urun_Tipi: 'Angled_Stand',
    Govde_Sekli: 'Kalkan_Rozet',
    En_Boy_Orani: '3:4',
    Kose_Radyus_mm: 6,
    Cerceve_Stili: 'Kabartma_Cerceve',
    Halka_Konumu: 'Yok',
    Yerlesim_Duzeni: 'Ust_Baslik_Alt_QR',
    QR_Baglanti_URL: 'https://instagram.com/ornekmarka',
    Ust_Baslik_Metni: 'BİZİ TAKİP ET',
    Alt_Metin: '@ORNEKMARKA',
    Yazi_Fontu: 'Yuvarlak_Soft',
    Yazi_Hizalama: 'Orta',
    Sembol_Ikon: 'Instagram_Kamera',
    Ikon_Konumu: 'Ust_Merkez',
    QR_Olcek_Yuzde: 82,
    QR_Kaydir_X_mm: 0,
    QR_Kaydir_Y_mm: 0,
    Yazi_Boyut_Yuzde: 106,
    Yazi_Kaydir_X_mm: 0,
    Yazi_Kaydir_Y_mm: 0,
    Taban_En_Boy_mm: 86,
    Taban_Kalinligi_mm: 3.2,
    QR_Kabartma_mm: 1.0,
    Katman_Yuksekligi_mm: 0.20,
    NFC_Yuva_Capi_mm: 26,
    Siparis_Adedi: 100,
    Tabla_Boyutu_mm: 220,
    baseHex: '#17181C',
    embossHex: '#F4F1EA'
  }
};

const state = {
  ...PRESETS.cafe_arch,
  Malzeme_Tipi: 'PLA',
  layoutMode: 'split',
  displayMode: 'shaded',
  cameraProj: 'persp',
  partPose: 'assembled',
  platePreview: 'full',
  clipAxis: 'none',
  clipOffset: 2.0,
  nudgeTarget: 'qr', // 'qr' | 'txt'
  theme: 'dark'
};

let latestBuild = null;

// ============================================================================
// 2. SHARED SINGLE-RENDERER DUAL-SCISSOR THREE.JS CAD STUDIO
// ============================================================================
const sharedCanvas = document.getElementById('webgl-shared-canvas');
const vpPartEl = document.getElementById('vp-part');
const vpPlateEl = document.getElementById('vp-plate');

const renderer = new THREE.WebGLRenderer({
  canvas: sharedCanvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: false
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;

const pmrem = new THREE.PMREMGenerator(renderer);
const studioEnvTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

const scenePart = new THREE.Scene();
scenePart.environment = studioEnvTex;

const scenePlate = new THREE.Scene();
scenePlate.environment = studioEnvTex;

function setupLights(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x333640, 0.75);
  hemi.position.set(0, 0, 200);
  scene.add(hemi);

  const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.35);
  keyLight.position.set(120, -160, 220);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xdce6ff, 0.65);
  rimLight.position.set(-150, 140, 120);
  scene.add(rimLight);
}
setupLights(scenePart);
setupLights(scenePlate);

function createCadCameraPair(domEl, initPos, targetZ = 15) {
  const persp = new THREE.PerspectiveCamera(35, 1, 1, 3000);
  persp.up.set(0, 0, 1);
  persp.position.copy(initPos);

  const ortho = new THREE.OrthographicCamera(-120, 120, 120, -120, -1000, 3000);
  ortho.up.set(0, 0, 1);
  ortho.position.copy(initPos);

  const controls = new OrbitControls(persp, domEl);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, targetZ);
  controls.maxDistance = 1200;
  controls.minDistance = 25;
  controls.update();

  return { persp, ortho, active: persp, controls };
}

const camRigPart = createCadCameraPair(vpPartEl, new THREE.Vector3(115, -160, 118), 26);
const camRigPlate = createCadCameraPair(vpPlateEl, new THREE.Vector3(175, -245, 235), 0);

const activeClipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 1000);

const matBase = new THREE.MeshStandardMaterial({
  color: new THREE.Color(state.baseHex),
  roughness: 0.68,
  metalness: 0.06,
  envMapIntensity: 0.45,
  side: THREE.DoubleSide
});

const matEmboss = new THREE.MeshStandardMaterial({
  color: new THREE.Color(state.embossHex),
  roughness: 0.34,
  metalness: 0.04,
  envMapIntensity: 0.68,
  side: THREE.DoubleSide
});

const matEdgeLine = new THREE.LineBasicMaterial({
  color: 0x8e929c,
  transparent: true,
  opacity: 0.15
});

const partRootGroup = new THREE.Group();
scenePart.add(partRootGroup);

const partRefGridGroup = new THREE.Group();
scenePart.add(partRefGridGroup);

const plateRootGroup = new THREE.Group();
scenePlate.add(plateRootGroup);

const plateBedGroup = new THREE.Group();
scenePlate.add(plateBedGroup);

function buildPartReferenceGrid() {
  partRefGridGroup.clear();
  const grid = new THREE.GridHelper(160, 16, 0x5c606b, 0x2a2d34);
  grid.rotation.x = Math.PI * 0.5;
  grid.material.transparent = true;
  grid.material.opacity = 0.45;
  partRefGridGroup.add(grid);
}
buildPartReferenceGrid();

function updateMaterialDisplayModes() {
  const isClip = state.clipAxis !== 'none';
  if (isClip) {
    if (state.clipAxis === 'z') activeClipPlane.set(new THREE.Vector3(0, 0, -1), state.clipOffset);
    else if (state.clipAxis === 'x') activeClipPlane.set(new THREE.Vector3(-1, 0, 0), state.clipOffset);
    else if (state.clipAxis === 'y') activeClipPlane.set(new THREE.Vector3(0, -1, 0), state.clipOffset);
  }

  const clipArr = isClip ? [activeClipPlane] : [];
  matBase.clippingPlanes = clipArr;
  matEmboss.clippingPlanes = clipArr;
  matEdgeLine.clippingPlanes = clipArr;

  matBase.wireframe = false;
  matEmboss.wireframe = false;
  matBase.transparent = false;
  matBase.opacity = 1.0;
  matBase.depthWrite = true;
  matEmboss.transparent = false;
  matEmboss.opacity = 1.0;

  if (state.displayMode === 'blueprint') {
    matBase.color.set('#0e2a47');
    matEmboss.color.set('#d8ecff');
    matBase.roughness = 0.85;
    matEmboss.roughness = 0.7;
    matEdgeLine.color.set('#62b6ff');
    matEdgeLine.opacity = 0.75;
  } else if (state.displayMode === 'xray') {
    matBase.color.set(state.baseHex);
    matEmboss.color.set(state.embossHex);
    matBase.transparent = true;
    matBase.opacity = 0.28;
    matBase.depthWrite = false;
    matEmboss.transparent = true;
    matEmboss.opacity = 0.82;
    matEdgeLine.color.set('#d89b38');
    matEdgeLine.opacity = 0.35;
  } else if (state.displayMode === 'wireframe') {
    matBase.color.set(state.baseHex);
    matEmboss.color.set(state.embossHex);
    matBase.wireframe = true;
    matEmboss.wireframe = true;
    matEdgeLine.opacity = 0.0;
  } else {
    matBase.color.set(state.baseHex);
    matEmboss.color.set(state.embossHex);
    matBase.roughness = 0.68;
    matEmboss.roughness = 0.34;
    matEdgeLine.color.set(state.theme === 'light' ? '#33353a' : '#8e929c');
    matEdgeLine.opacity = 0.15;
  }

  matBase.needsUpdate = true;
  matEmboss.needsUpdate = true;
}

function createVirtualNfcTagVisual(nfcDiaMm) {
  const group = new THREE.Group();
  const tagR = Math.max(6, (nfcDiaMm - 1.2) * 0.5);

  const subGeom = new THREE.CylinderGeometry(tagR, tagR, 0.35, 48);
  subGeom.rotateX(Math.PI * 0.5);
  const subMat = new THREE.MeshStandardMaterial({ color: 0xfaf6eb, roughness: 0.35, metalness: 0.05 });
  group.add(new THREE.Mesh(subGeom, subMat));

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd98a2b,
    emissive: 0x4a2800,
    roughness: 0.25,
    metalness: 0.88
  });
  for (let i = 0; i < 3; i++) {
    const rOuter = tagR - 1.1 - i * 1.45;
    if (rOuter <= 3) break;
    const ringGeom = new THREE.RingGeometry(rOuter - 0.75, rOuter, 48);
    const ringTop = new THREE.Mesh(ringGeom, copperMat);
    ringTop.position.z = 0.20;
    group.add(ringTop);
  }

  const chipGeom = new THREE.BoxGeometry(2.8, 2.2, 0.32);
  const chipMat = new THREE.MeshStandardMaterial({ color: 0x1e2024, metalness: 0.6, roughness: 0.2 });
  const chip = new THREE.Mesh(chipGeom, chipMat);
  chip.position.z = 0.25;
  group.add(chip);

  return group;
}

function rebuildPlateBedVisual(bedSizeMm, edgeMarginMm) {
  plateBedGroup.clear();

  const bedGeom = new THREE.BoxGeometry(bedSizeMm, bedSizeMm, 2.0);
  bedGeom.translate(0, 0, -1.02);
  const bedMat = new THREE.MeshStandardMaterial({
    color: state.theme === 'light' ? 0xd2cec4 : 0x181a1f,
    roughness: 0.72,
    metalness: 0.22
  });
  plateBedGroup.add(new THREE.Mesh(bedGeom, bedMat));

  const divisions = Math.max(4, Math.round(bedSizeMm / 10));
  const grid = new THREE.GridHelper(bedSizeMm, divisions, 0x5d6270, 0x2c303a);
  grid.rotation.x = Math.PI * 0.5;
  grid.position.z = 0.02;
  plateBedGroup.add(grid);

  const halfSafe = bedSizeMm * 0.5 - edgeMarginMm;
  const safePts = [
    new THREE.Vector3(-halfSafe, -halfSafe, 0.06),
    new THREE.Vector3(halfSafe, -halfSafe, 0.06),
    new THREE.Vector3(halfSafe, halfSafe, 0.06),
    new THREE.Vector3(-halfSafe, halfSafe, 0.06),
    new THREE.Vector3(-halfSafe, -halfSafe, 0.06)
  ];
  const safeGeom = new THREE.BufferGeometry().setFromPoints(safePts);
  plateBedGroup.add(new THREE.Line(
    safeGeom,
    new THREE.LineBasicMaterial({ color: 0xe04f33, transparent: true, opacity: 0.65 })
  ));
}

function disposeGroupGeometries(group) {
  group.traverse((obj) => {
    if (obj.geometry && !obj.userData.sharedGeom) {
      obj.geometry.dispose();
    }
  });
  group.clear();
}

// ============================================================================
// 3. REBUILD CAD GEOMETRY, NESTING, SLICER Z-PLAN & B2B TELEMETRY
// ============================================================================
function render2DQrPreview(qrData) {
  const canvas = document.getElementById('qr-2d-preview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const qz = 2;
  const totalMods = qrData.size + qz * 2;
  const pxSize = 108;
  canvas.width = pxSize;
  canvas.height = pxSize;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, pxSize, pxSize);
  const scale = pxSize / totalMods;
  ctx.fillStyle = '#0B0C0E';
  for (let r = 0; r < qrData.size; r++) {
    for (let c = 0; c < qrData.size; c++) {
      if (qrData.get(r, c)) {
        ctx.fillRect((c + qz) * scale, (r + qz) * scale, Math.ceil(scale), Math.ceil(scale));
      }
    }
  }
}

function rebuildAll() {
  if (latestBuild) {
    latestBuild.plaqueGeom.dispose();
    if (latestBuild.footGeom) latestBuild.footGeom.dispose();
    if (latestBuild.plaqueEdgesGeom) latestBuild.plaqueEdgesGeom.dispose();
    if (latestBuild.footEdgesGeom) latestBuild.footEdgesGeom.dispose();
  }
  disposeGroupGeometries(partRootGroup);
  disposeGroupGeometries(plateRootGroup);

  const qrData = generateQrMatrix(state.QR_Baglanti_URL);
  render2DQrPreview(qrData);

  const slicerPlan = computeSlicerPlan(state);
  const { geometry: plaqueGeom, meta: plaqueMeta } = buildPlaqueManifoldGeometry(state, qrData, slicerPlan);
  const plaqueMetrology = computeMeshMetrology(plaqueGeom);
  const manifoldCheck = verifyWatertightManifold(plaqueGeom);

  const isStand = state.Urun_Tipi === 'Angled_Stand';
  let footGeom = null;
  let footMeta = null;
  let footMetrology = null;
  let footManifold = { isWatertight: true, boundaryEdges: 0, nonManifoldEdges: 0 };

  if (isStand) {
    const footRes = buildStandFootManifoldGeometry(state, slicerPlan);
    footGeom = footRes.geometry;
    footMeta = footRes.footMeta;
    footMetrology = computeMeshMetrology(footGeom);
    footManifold = verifyWatertightManifold(footGeom);
  }

  plaqueGeom.userData.sharedGeom = true;
  if (footGeom) footGeom.userData.sharedGeom = true;

  const plaqueEdgesGeom = new THREE.EdgesGeometry(plaqueGeom, 42);
  plaqueEdgesGeom.userData.sharedGeom = true;
  const footEdgesGeom = footGeom ? new THREE.EdgesGeometry(footGeom, 42) : null;
  if (footEdgesGeom) footEdgesGeom.userData.sharedGeom = true;

  const nesting = computePlateNesting(state, plaqueMeta, footMeta);
  const pricing = computeB2BPricing(state, plaqueMetrology, footMetrology, slicerPlan, nesting);

  latestBuild = {
    qrData,
    slicerPlan,
    plaqueGeom,
    plaqueEdgesGeom,
    plaqueMeta,
    plaqueMetrology,
    manifoldCheck: {
      isWatertight: manifoldCheck.isWatertight && footManifold.isWatertight,
      boundaryEdges: manifoldCheck.boundaryEdges + footManifold.boundaryEdges,
      nonManifoldEdges: manifoldCheck.nonManifoldEdges + footManifold.nonManifoldEdges,
      uniqueVertices: manifoldCheck.uniqueVertices,
      totalEdges: manifoldCheck.totalEdges
    },
    footGeom,
    footEdgesGeom,
    footMeta,
    footMetrology,
    nesting,
    pricing
  };

  const clipSlider = document.getElementById('rng-clip-offset');
  if (state.clipAxis === 'z') {
    const maxZ = (isStand && state.partPose === 'assembled') ? plaqueMeta.plaqueLengthMm + 16 : slicerPlan.totalHeightMm + 2;
    clipSlider.min = '0';
    clipSlider.max = maxZ.toFixed(2);
    clipSlider.step = '0.05';
  } else if (state.clipAxis !== 'none') {
    const halfSpan = Math.max(plaqueMeta.plaqueWidthMm, plaqueMeta.plaqueLengthMm) * 0.65;
    clipSlider.min = (-halfSpan).toFixed(1);
    clipSlider.max = halfSpan.toFixed(1);
    clipSlider.step = '0.5';
  }

  updateMaterialDisplayModes();
  populateScenePart();
  populateScenePlate();
  updateHudAndDom();
}

function populateScenePart() {
  disposeGroupGeometries(partRootGroup);
  if (!latestBuild) return;

  const { plaqueGeom, plaqueEdgesGeom, plaqueMeta, footGeom, footEdgesGeom, footMeta, slicerPlan } = latestBuild;
  const isStand = state.Urun_Tipi === 'Angled_Stand';
  const pose = state.partPose;

  const plaqueAssembly = new THREE.Group();
  const plaqueMesh = new THREE.Mesh(plaqueGeom, [matBase, matEmboss]);
  plaqueMesh.userData.sharedGeom = true;
  plaqueMesh.geometry.userData.sharedGeom = true;
  plaqueAssembly.add(plaqueMesh);

  const plaqueLines = new THREE.LineSegments(plaqueEdgesGeom, matEdgeLine);
  plaqueAssembly.add(plaqueLines);

  const nfcTagObj = createVirtualNfcTagVisual(plaqueMeta.nfcDiaMm);
  const zNfcMid = 0.5 * (slicerPlan.zNfcBottom + slicerPlan.zNfcTop);
  nfcTagObj.position.set(
    plaqueMeta.nfcCenterX,
    plaqueMeta.nfcCenterY,
    pose === 'exploded' ? -16.0 : zNfcMid
  );
  plaqueAssembly.add(nfcTagObj);

  if (pose === 'exploded') {
    const ringGeom = new THREE.RingGeometry(plaqueMeta.nfcDiaMm * 0.48, plaqueMeta.nfcDiaMm * 0.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd89b38, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.position.set(plaqueMeta.nfcCenterX, plaqueMeta.nfcCenterY, -0.15);
    plaqueAssembly.add(ringMesh);
  }

  if (isStand && footGeom && footMeta && pose === 'assembled') {
    const uprightBasis = new THREE.Matrix4().set(
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 1
    );
    const footSpreadX = plaqueMeta.footSpreadX;
    for (const side of [-1, 1]) {
      const footHolder = new THREE.Group();
      const fMesh = new THREE.Mesh(footGeom, matBase);
      const fEdges = new THREE.LineSegments(footEdgesGeom, matEdgeLine);
      footHolder.add(fMesh, fEdges);
      footHolder.applyMatrix4(uprightBasis);
      footHolder.position.set(
        side * footSpreadX - footMeta.thicknessZ * 0.5,
        0,
        -footMeta.baseYOffset
      );
      partRootGroup.add(footHolder);
    }

    const tiltRad = (68 * Math.PI) / 180;
    const wySlotFront = footMeta.slotAnchorLocalX;
    const wzSlotFront = footMeta.slotAnchorLocalY - footMeta.baseYOffset;

    const yBotContact = plaqueMeta.bottomYAtFoot;
    const rimT = footMeta.plaqueOuterRimT;
    const localFrontBottomY = yBotContact * Math.cos(tiltRad) - rimT * Math.sin(tiltRad);
    const localFrontBottomZ = yBotContact * Math.sin(tiltRad) + rimT * Math.cos(tiltRad);

    plaqueAssembly.rotation.x = tiltRad;
    plaqueAssembly.position.set(
      0,
      wySlotFront - localFrontBottomY,
      wzSlotFront - localFrontBottomZ
    );
    partRootGroup.add(plaqueAssembly);
  } else {
    plaqueAssembly.position.set(0, 0, pose === 'exploded' ? 20 : 0);
    partRootGroup.add(plaqueAssembly);

    if (isStand && footGeom && footMeta) {
      const footOffsetY = plaqueMeta.bboxMinY - footMeta.heightY * 0.5 - 8;
      for (const side of [-1, 1]) {
        const footHolder = new THREE.Group();
        const fMesh = new THREE.Mesh(footGeom, matBase);
        const fEdges = new THREE.LineSegments(footEdgesGeom, matEdgeLine);
        footHolder.add(fMesh, fEdges);
        footHolder.position.set(
          side * (footMeta.widthX * 0.5 + 4),
          pose === 'exploded' ? footOffsetY - 10 : footOffsetY,
          0
        );
        partRootGroup.add(footHolder);
      }
    }

    const hx = plaqueMeta.plaqueWidthMm * 0.55;
    const hy = plaqueMeta.plaqueLengthMm * 0.55;
    const addLaserOutline = (zHeight, hexColor) => {
      const pts = [
        new THREE.Vector3(-hx, -hy, zHeight),
        new THREE.Vector3(hx, -hy, zHeight),
        new THREE.Vector3(hx, hy, zHeight),
        new THREE.Vector3(-hx, hy, zHeight),
        new THREE.Vector3(-hx, -hy, zHeight)
      ];
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: hexColor, transparent: true, opacity: 0.75 }));
      if (pose === 'exploded') l.position.z = 20;
      partRootGroup.add(l);
    };
    addLaserOutline(slicerPlan.nfcPauseBedZ, 0xd89b38);
    addLaserOutline(slicerPlan.m600PauseBedZ, 0xe04f33);
  }
}

function populateScenePlate() {
  disposeGroupGeometries(plateRootGroup);
  if (!latestBuild) return;

  const { plaqueGeom, plaqueMeta, footGeom, slicerPlan, nesting } = latestBuild;
  rebuildPlateBedVisual(nesting.bedSizeMm, nesting.edgeMarginMm);

  const countToShow = state.platePreview === 'last'
    ? nesting.lastPlateCount
    : nesting.maxPerPlate;

  const activePlaques = nesting.plaques.slice(0, countToShow);
  const activeFeet = state.Urun_Tipi === 'Angled_Stand'
    ? nesting.feet.slice(0, countToShow * 2)
    : [];

  if (activePlaques.length > 0) {
    const instPlaque = new THREE.InstancedMesh(plaqueGeom, [matBase, matEmboss], activePlaques.length);
    instPlaque.userData.sharedGeom = true;
    const dummy = new THREE.Object3D();

    activePlaques.forEach((p, idx) => {
      dummy.position.set(p.originX, p.originY, 0);
      dummy.rotation.set(0, 0, (p.rotZDeg * Math.PI) / 180);
      dummy.updateMatrix();
      instPlaque.setMatrixAt(idx, dummy.matrix);

      const nfcRingG = new THREE.RingGeometry(plaqueMeta.nfcDiaMm * 0.46, plaqueMeta.nfcDiaMm * 0.50, 36);
      const nfcRingM = new THREE.MeshBasicMaterial({
        color: 0xd89b38,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(nfcRingG, nfcRingM);
      ring.position.set(p.nfcWorldX, p.nfcWorldY, slicerPlan.totalHeightMm + 0.12);
      plateRootGroup.add(ring);
    });
    instPlaque.instanceMatrix.needsUpdate = true;
    plateRootGroup.add(instPlaque);
  }

  if (footGeom && activeFeet.length > 0) {
    const instFeet = new THREE.InstancedMesh(footGeom, matBase, activeFeet.length);
    instFeet.userData.sharedGeom = true;
    const dummy = new THREE.Object3D();
    activeFeet.forEach((f, idx) => {
      dummy.position.set(f.cx, f.cy, 0);
      dummy.rotation.set(0, 0, (f.rotZDeg * Math.PI) / 180);
      dummy.updateMatrix();
      instFeet.setMatrixAt(idx, dummy.matrix);
    });
    instFeet.instanceMatrix.needsUpdate = true;
    plateRootGroup.add(instFeet);
  }
}

// ============================================================================
// 4. HUD, Z-PAUSE TIMELINE & B2B PRICING DOM UPDATES
// ============================================================================
function updateHudAndDom() {
  if (!latestBuild) return;
  const { qrData, slicerPlan, plaqueMeta, plaqueMetrology, manifoldCheck, nesting, pricing } = latestBuild;
  const q = pricing.activeQuote;

  const mBadge = document.getElementById('manifold-badge');
  if (manifoldCheck.isWatertight) {
    mBadge.textContent = `MANIFOLD: 0 AÇIK KENAR (100% SU GEÇİRMEZ)`;
    mBadge.className = 'manifold-badge ok';
  } else {
    mBadge.textContent = `KENAR KONTROL: ${manifoldCheck.boundaryEdges} AÇIK`;
    mBadge.className = 'manifold-badge warn';
  }

  document.getElementById('hud-nfc-pause').textContent =
    `KATMAN #${slicerPlan.nfcPauseLayer} · Z=${slicerPlan.nfcPauseBedZ.toFixed(2)}mm`;
  document.getElementById('hud-m600-pause').textContent =
    `KATMAN #${slicerPlan.m600PauseLayer} · Z=${slicerPlan.m600PauseBedZ.toFixed(2)}mm`;
  document.getElementById('hud-plate-cap').textContent =
    `${nesting.maxPerPlate} ADET / ${nesting.totalPlates} TABLA`;
  document.getElementById('hud-b2b-price').textContent =
    `${q.unitSaleNetTry.toFixed(2)} TL · Top: ${Math.round(q.totalNetTry).toLocaleString('tr-TR')} TL`;

  document.getElementById('qr-meta-tag').textContent =
    `V${qrData.version}-${qrData.ecLevel} · ${qrData.size}×${qrData.size} (${plaqueMeta.modulePitchMm.toFixed(2)}mm)`;

  const typeText = state.Urun_Tipi === 'Angled_Stand' ? '68° Stand' : 'Anahtarlık';
  document.getElementById('vp-part-subtitle').textContent =
    `${typeText} · ${plaqueMeta.shapeType.replace('_', ' ')} (${state.En_Boy_Orani}) · QR Adım: ${plaqueMeta.modulePitchMm.toFixed(2)}mm`;
  document.getElementById('vp-part-dims').textContent =
    `${plaqueMeta.plaqueWidthMm.toFixed(1)} × ${plaqueMeta.plaqueLengthMm.toFixed(1)} × ${slicerPlan.totalHeightMm.toFixed(2)} mm`;
  document.getElementById('vp-part-vol').textContent =
    `Hacim: ${pricing.unitVolCm3.toFixed(2)} cm³ · Kütle: ${pricing.unitMassG.toFixed(2)} g`;

  document.getElementById('vp-plate-title').textContent =
    `[ GÖRÜNÜM B / ${nesting.bedSizeMm}×${nesting.bedSizeMm}mm ÇOKLU ÜRETİM TABLASI ]`;
  const shownCount = state.platePreview === 'last' ? nesting.lastPlateCount : nesting.maxPerPlate;
  document.getElementById('vp-plate-subtitle').textContent =
    state.platePreview === 'last'
      ? `Son Parti Tablası (${shownCount} Adet) · Toplam ${nesting.totalPlates} Tabla`
      : `Maksimum Otomatik Dizilim (${shownCount} Adet) · 3.0mm Nozzle Boşluğu`;
  document.getElementById('vp-plate-stats').textContent =
    `${nesting.maxPerPlate} Adet / Tabla · %${nesting.bedUtilizationPct} Alan Verimi`;
  document.getElementById('vp-plate-time').textContent =
    `Tam Tabla Süresi: ~${pricing.fullPlatePrintMin} dk`;

  document.getElementById('z-lbl-emboss').textContent =
    `Katman ${slicerPlan.m600PauseLayer}–${slicerPlan.totalLayers}`;
  document.getElementById('z-sub-emboss').textContent =
    `Z = ${slicerPlan.actualBaseMm.toFixed(2)} → ${slicerPlan.totalHeightMm.toFixed(2)} mm (${slicerPlan.embossLayers} Katman · 2. Renk)`;

  document.getElementById('z-callout-m600').textContent =
    `Katman #${slicerPlan.m600PauseLayer} Başlangıcı (Z = ${slicerPlan.m600PauseBedZ.toFixed(2)} mm)`;
  document.getElementById('z-ruler-m600').textContent =
    `Slicer Cetveli: ${slicerPlan.m600PauseSlicerRulerZ.toFixed(2)} mm · Stand ayakları bu katmandan önce biter`;

  document.getElementById('z-lbl-bridge').textContent =
    `Katman ${slicerPlan.nfcPauseLayer}–${slicerPlan.baseLayers}`;
  document.getElementById('z-sub-bridge').textContent =
    `Z = ${slicerPlan.zNfcTop.toFixed(2)} → ${slicerPlan.actualBaseMm.toFixed(2)} mm (${slicerPlan.topBridgeLayers} Katman Üst Köprü)`;

  document.getElementById('z-callout-nfc').textContent =
    `Katman #${slicerPlan.nfcPauseLayer} Başlangıcı (Z = ${slicerPlan.nfcPauseBedZ.toFixed(2)} mm)`;
  document.getElementById('z-ruler-nfc').textContent =
    `Slicer Cetveli: ${slicerPlan.nfcPauseSlicerRulerZ.toFixed(2)} mm · Ø${plaqueMeta.nfcDiaMm.toFixed(1)}×${slicerPlan.pocketHeightMm.toFixed(2)}mm yuvaya NFC bırakın`;

  document.getElementById('z-lbl-pocket').textContent =
    `Katman ${slicerPlan.bottomFloorLayers + 1}–${slicerPlan.bottomFloorLayers + slicerPlan.pocketLayers}`;
  document.getElementById('z-sub-pocket').textContent =
    `Z = ${slicerPlan.zNfcBottom.toFixed(2)} → ${slicerPlan.zNfcTop.toFixed(2)} mm (Ø${plaqueMeta.nfcDiaMm.toFixed(1)} × ${slicerPlan.pocketHeightMm.toFixed(2)} mm Cep)`;

  document.getElementById('z-lbl-floor').textContent =
    `Katman 1–${slicerPlan.bottomFloorLayers}`;
  document.getElementById('z-sub-floor').textContent =
    `Z = 0.00 → ${slicerPlan.zNfcBottom.toFixed(2)} mm (${slicerPlan.bottomFloorLayers} Katman Alt Kabuk)`;

  document.getElementById('m-vol-mass').textContent =
    `${pricing.unitVolCm3.toFixed(2)} cm³ / ${pricing.unitMassG.toFixed(2)} g`;
  document.getElementById('m-fil-split').textContent =
    `Taban ${pricing.baseMassG}g + QR ${pricing.embossMassG}g`;
  document.getElementById('m-tris').textContent =
    `${plaqueMetrology.triangleCount.toLocaleString('tr-TR')} Üçgen · 0 Açık`;
  document.getElementById('m-plates').textContent =
    `${nesting.maxPerPlate} Adet/Tabla × ${nesting.totalPlates} Tabla`;
  document.getElementById('m-hours').textContent =
    `${q.totalPrintHours} Saat (${q.totalFilamentKg} kg)`;
  document.getElementById('m-raw-cost').textContent =
    `${q.unitRawCostTry.toFixed(2)} TL (NFC: ${q.nfcTagUnitCostTry.toFixed(2)} TL)`;
  document.getElementById('m-unit-sale').textContent =
    `${q.unitSaleNetTry.toFixed(2)} TL (${q.discountLabel})`;
  document.getElementById('m-grand-total').textContent =
    `${q.grandTotalTry.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL`;

  document.getElementById('lbl-dl-plate-sub').textContent =
    `${nesting.bedSizeMm}×${nesting.bedSizeMm}mm Çoklu Üretim STL (${nesting.maxPerPlate} Adet)`;

  const tiersEl = document.getElementById('b2b-tiers-grid');
  tiersEl.innerHTML = '';
  for (const t of pricing.tiers) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tier-cell';
    if (t.qty === state.Siparis_Adedi) {
      btn.style.borderColor = 'var(--accent-emerald)';
    }
    btn.innerHTML = `<span class="t-qty">${t.qty} ADET</span><span class="t-prc">${t.unitSaleNetTry.toFixed(2)} TL</span>`;
    btn.addEventListener('click', () => {
      state.Siparis_Adedi = t.qty;
      document.getElementById('rng-siparis-adedi').value = Math.min(1000, t.qty);
      document.getElementById('num-siparis-adedi').value = t.qty;
      rebuildAll();
    });
    tiersEl.appendChild(btn);
  }
}

// ============================================================================
// 5. CAMERA PROJECTION, VIEWS & RENDER LOOP
// ============================================================================
function syncOrthoFrustum(rig, width, height) {
  const aspect = Math.max(0.2, width / Math.max(1, height));
  const dist = rig.persp.position.distanceTo(rig.controls.target);
  const halfH = dist * Math.tan(THREE.MathUtils.degToRad(rig.persp.fov * 0.5));
  const halfW = halfH * aspect;
  rig.ortho.left = -halfW;
  rig.ortho.right = halfW;
  rig.ortho.top = halfH;
  rig.ortho.bottom = -halfH;
  rig.ortho.position.copy(rig.persp.position);
  rig.ortho.quaternion.copy(rig.persp.quaternion);
  rig.ortho.updateProjectionMatrix();
}

function setStandardCadView(viewName) {
  const applyToRig = (rig, radius, zCenter) => {
    rig.controls.target.set(0, 0, zCenter);
    if (viewName === 'iso') {
      rig.persp.position.set(radius * 0.78, -radius * 1.05, radius * 0.82 + zCenter);
    } else if (viewName === 'top') {
      rig.persp.position.set(0, -0.05, radius * 1.65 + zCenter);
    } else if (viewName === 'front') {
      rig.persp.position.set(0, -radius * 1.55, zCenter + 4);
    } else if (viewName === 'right') {
      rig.persp.position.set(radius * 1.55, 0, zCenter + 4);
    }
    rig.controls.update();
  };

  const pSpan = latestBuild ? Math.max(latestBuild.plaqueMeta.plaqueWidthMm, latestBuild.plaqueMeta.plaqueLengthMm) * 1.45 : 135;
  const pZ = (state.Urun_Tipi === 'Angled_Stand' && state.partPose === 'assembled') ? 28 : 4;
  applyToRig(camRigPart, pSpan, pZ);

  const bedSpan = latestBuild ? latestBuild.nesting.bedSizeMm * 1.15 : 260;
  applyToRig(camRigPlate, bedSpan, 0);
}

function renderViewportPane(paneEl, scene, rig, bgHex) {
  if (paneEl.offsetParent === null) return;
  const stageRect = sharedCanvas.getBoundingClientRect();
  const rect = paneEl.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return;

  const left = Math.round(rect.left - stageRect.left);
  const bottom = Math.round(stageRect.bottom - rect.bottom);
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  renderer.setViewport(left, bottom, width, height);
  renderer.setScissor(left, bottom, width, height);
  renderer.setClearColor(bgHex, 1);

  rig.controls.update();
  if (state.cameraProj === 'ortho') {
    syncOrthoFrustum(rig, width, height);
    renderer.render(scene, rig.ortho);
  } else {
    rig.persp.aspect = width / height;
    rig.persp.updateProjectionMatrix();
    renderer.render(scene, rig.persp);
  }
}

function animate() {
  requestAnimationFrame(animate);

  const stageRect = sharedCanvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(stageRect.width));
  const h = Math.max(1, Math.round(stageRect.height));
  if (sharedCanvas.width !== Math.round(w * renderer.getPixelRatio()) ||
      sharedCanvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
  }

  renderer.setScissorTest(true);
  const bgPart = state.displayMode === 'blueprint'
    ? 0x07182b
    : (state.theme === 'light' ? 0xe4e0d6 : 0x0c0d10);
  const bgPlate = state.displayMode === 'blueprint'
    ? 0x061424
    : (state.theme === 'light' ? 0xdedad0 : 0x090a0d);

  renderViewportPane(vpPartEl, scenePart, camRigPart, bgPart);
  renderViewportPane(vpPlateEl, scenePlate, camRigPlate, bgPlate);
  renderer.setScissorTest(false);
}

// ============================================================================
// 6. DOWNLOAD & EXPORT HANDLERS
// ============================================================================
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function slugBaseName() {
  const t = state.Urun_Tipi === 'Angled_Stand' ? 'Stand' : 'Anahtarlik';
  return `NFC_QR_${t}_${state.Govde_Sekli}_${state.Taban_En_Boy_mm}mm`;
}

function exportUnitWatertightStl() {
  if (!latestBuild) return;
  const { plaqueGeom, plaqueMeta, footGeom, footMeta } = latestBuild;
  const parts = [{ geometry: plaqueGeom, matrix: null }];

  if (state.Urun_Tipi === 'Angled_Stand' && footGeom && footMeta) {
    const footY = plaqueMeta.bboxMinY - footMeta.heightY * 0.5 - 5.0;
    for (const side of [-1, 1]) {
      const m = new THREE.Matrix4().makeTranslation(side * (footMeta.widthX * 0.5 + 3.0), footY, 0);
      parts.push({ geometry: footGeom, matrix: m });
    }
  }

  const stlBuf = buildBinaryStlBuffer(parts);
  triggerDownload(new Blob([stlBuf], { type: 'application/octet-stream' }), `${slugBaseName()}_Tekil_Uretim.stl`);
}

function exportFullPlateStl() {
  if (!latestBuild) return;
  const { plaqueGeom, footGeom, nesting } = latestBuild;
  const parts = [];

  for (const p of nesting.plaques) {
    const m = new THREE.Matrix4()
      .makeTranslation(p.originX, p.originY, 0)
      .multiply(new THREE.Matrix4().makeRotationZ((p.rotZDeg * Math.PI) / 180));
    parts.push({ geometry: plaqueGeom, matrix: m });
  }

  if (state.Urun_Tipi === 'Angled_Stand' && footGeom) {
    for (const f of nesting.feet) {
      const m = new THREE.Matrix4()
        .makeTranslation(f.cx, f.cy, 0)
        .multiply(new THREE.Matrix4().makeRotationZ((f.rotZDeg * Math.PI) / 180));
      parts.push({ geometry: footGeom, matrix: m });
    }
  }

  const stlBuf = buildBinaryStlBuffer(parts);
  triggerDownload(
    new Blob([stlBuf], { type: 'application/octet-stream' }),
    `${slugBaseName()}_Tabla_${nesting.bedSizeMm}mm_${nesting.maxPerPlate}Adet.stl`
  );
}

function exportAntetSvg() {
  if (!latestBuild) return;
  const svg = generateImalatAntetiSvg(
    state,
    latestBuild.qrData,
    latestBuild.plaqueMeta,
    latestBuild.slicerPlan,
    latestBuild.nesting,
    latestBuild.pricing
  );
  triggerDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `Imalat_Anteti_${slugBaseName()}.svg`);
}

function exportB2BCsv() {
  if (!latestBuild) return;
  const csv = generateB2BPricingCsv(
    state,
    latestBuild.qrData,
    latestBuild.slicerPlan,
    latestBuild.nesting,
    latestBuild.pricing
  );
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `B2B_Maliyet_Teklifi_${slugBaseName()}_${state.Siparis_Adedi}Adet.csv`);
}

function exportObjFile() {
  if (!latestBuild) return;
  const exporter = new OBJExporter();
  const mesh = new THREE.Mesh(latestBuild.plaqueGeom);
  const objText = exporter.parse(mesh);
  triggerDownload(new Blob([objText], { type: 'text/plain;charset=utf-8' }), `${slugBaseName()}.obj`);
}

function exportGlbFile() {
  if (!latestBuild) return;
  const exporter = new GLTFExporter();
  exporter.parse(
    partRootGroup,
    (result) => {
      if (result instanceof ArrayBuffer) {
        triggerDownload(new Blob([result], { type: 'model/gltf-binary' }), `${slugBaseName()}.glb`);
      }
    },
    () => {},
    { binary: true }
  );
}

function exportDxfFile() {
  if (!latestBuild) return;
  const dxf = generateProfileDxf(latestBuild.plaqueMeta, latestBuild.qrData);
  triggerDownload(new Blob([dxf], { type: 'application/dxf;charset=utf-8' }), `${slugBaseName()}_2D.dxf`);
}

function exportScadFile() {
  if (!latestBuild) return;
  const scad = generateOpenScadScript(state, latestBuild.qrData, latestBuild.plaqueMeta, latestBuild.slicerPlan);
  triggerDownload(new Blob([scad], { type: 'text/plain;charset=utf-8' }), `${slugBaseName()}.scad`);
}

// ============================================================================
// 7. UI EVENT WIRING (3-TAB STUDIO, SHAPE CARDS, TYPOGRAPHY & QUICK D-PAD)
// ============================================================================
function bindSyncedSliderNumber(rangeId, numId, stateKey, isFloat = false) {
  const rng = document.getElementById(rangeId);
  const num = document.getElementById(numId);
  if (!rng || !num) return;

  const applyVal = (raw, fromRange) => {
    let v = isFloat ? parseFloat(raw) : parseInt(raw, 10);
    if (Number.isNaN(v)) return;
    const min = parseFloat(num.min);
    const max = parseFloat(num.max);
    v = Math.max(min, Math.min(max, v));
    state[stateKey] = v;
    if (fromRange) {
      if (stateKey === 'Katman_Yuksekligi_mm') num.value = v.toFixed(2);
      else if (isFloat) num.value = v.toFixed(1);
      else num.value = String(v);
    } else {
      rng.value = String(Math.min(parseFloat(rng.max), Math.max(parseFloat(rng.min), v)));
    }
    rebuildAll();
  };

  rng.addEventListener('input', () => applyVal(rng.value, true));
  num.addEventListener('change', () => applyVal(num.value, false));
}

function syncDomInputsFromState() {
  document.getElementById('inp-urun-tipi').value = state.Urun_Tipi;
  document.querySelectorAll('#seg-urun-tipi .seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.val === state.Urun_Tipi);
  });

  document.getElementById('inp-qr-url').value = state.QR_Baglanti_URL;
  document.getElementById('inp-ust-baslik').value = state.Ust_Baslik_Metni;
  document.getElementById('inp-ust-baslik-2').value = state.Ust_Baslik_Metni;
  document.getElementById('inp-alt-metin').value = state.Alt_Metin || '';

  // Shape cards & aspect
  document.querySelectorAll('#shape-selector-grid .shape-card').forEach((c) => {
    c.classList.toggle('active', c.dataset.shape === state.Govde_Sekli);
  });
  document.getElementById('grp-corner-radius').style.opacity =
    state.Govde_Sekli === 'Yuvarlatilmis_Kare' ? '1' : '0.45';

  document.querySelectorAll('#seg-aspect .seg-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.aspect === state.En_Boy_Orani);
  });

  document.getElementById('sel-border-style').value = state.Cerceve_Stili;
  document.getElementById('sel-lug-pos').value = state.Halka_Konumu;
  document.getElementById('sel-layout').value = state.Yerlesim_Duzeni;
  document.getElementById('sel-font').value = state.Yazi_Fontu;
  document.getElementById('sel-align').value = state.Yazi_Hizalama;
  document.getElementById('sel-icon').value = state.Sembol_Ikon;
  document.getElementById('sel-icon-pos').value = state.Ikon_Konumu;

  document.getElementById('clr-custom-base').value = state.baseHex;
  document.getElementById('clr-custom-emboss').value = state.embossHex;

  const pairs = [
    ['rng-taban-en-boy', 'num-taban-en-boy', state.Taban_En_Boy_mm],
    ['rng-taban-kalinlik', 'num-taban-kalinlik', state.Taban_Kalinligi_mm.toFixed(1)],
    ['rng-qr-kabartma', 'num-qr-kabartma', state.QR_Kabartma_mm.toFixed(1)],
    ['rng-katman-yukseklik', 'num-katman-yukseklik', state.Katman_Yuksekligi_mm.toFixed(2)],
    ['rng-nfc-cap', 'num-nfc-cap', state.NFC_Yuva_Capi_mm],
    ['rng-siparis-adedi', 'num-siparis-adedi', state.Siparis_Adedi],
    ['rng-tabla-boyutu', 'num-tabla-boyutu', state.Tabla_Boyutu_mm],
    ['rng-kose-radyus', 'num-kose-radyus', state.Kose_Radyus_mm],
    ['rng-qr-scale', 'num-qr-scale', state.QR_Olcek_Yuzde],
    ['rng-qr-off-x', 'num-qr-off-x', state.QR_Kaydir_X_mm],
    ['rng-qr-off-y', 'num-qr-off-y', state.QR_Kaydir_Y_mm],
    ['rng-txt-scale', 'num-txt-scale', state.Yazi_Boyut_Yuzde],
    ['rng-txt-off-x', 'num-txt-off-x', state.Yazi_Kaydir_X_mm],
    ['rng-txt-off-y', 'num-txt-off-y', state.Yazi_Kaydir_Y_mm]
  ];
  for (const [rId, nId, val] of pairs) {
    const rEl = document.getElementById(rId);
    const nEl = document.getElementById(nId);
    if (rEl && nEl) {
      rEl.value = val;
      nEl.value = val;
    }
  }

  document.querySelectorAll('.quick-beds .mini-chip').forEach((c) => {
    c.classList.toggle('active', Number(c.dataset.bed) === Number(state.Tabla_Boyutu_mm));
  });
}

function initUiListeners() {
  // Left Studio 3-Tab Switcher
  document.querySelectorAll('.studio-tabs .st-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.studio-tabs .st-tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));
      tabBtn.classList.add('active');
      document.getElementById(tabBtn.dataset.tab).classList.add('active');
    });
  });

  // Core & Customization Sliders
  bindSyncedSliderNumber('rng-taban-en-boy', 'num-taban-en-boy', 'Taban_En_Boy_mm', false);
  bindSyncedSliderNumber('rng-taban-kalinlik', 'num-taban-kalinlik', 'Taban_Kalinligi_mm', true);
  bindSyncedSliderNumber('rng-qr-kabartma', 'num-qr-kabartma', 'QR_Kabartma_mm', true);
  bindSyncedSliderNumber('rng-katman-yukseklik', 'num-katman-yukseklik', 'Katman_Yuksekligi_mm', true);
  bindSyncedSliderNumber('rng-nfc-cap', 'num-nfc-cap', 'NFC_Yuva_Capi_mm', true);
  bindSyncedSliderNumber('rng-siparis-adedi', 'num-siparis-adedi', 'Siparis_Adedi', false);
  bindSyncedSliderNumber('rng-tabla-boyutu', 'num-tabla-boyutu', 'Tabla_Boyutu_mm', false);
  bindSyncedSliderNumber('rng-kose-radyus', 'num-kose-radyus', 'Kose_Radyus_mm', true);
  bindSyncedSliderNumber('rng-qr-scale', 'num-qr-scale', 'QR_Olcek_Yuzde', false);
  bindSyncedSliderNumber('rng-qr-off-x', 'num-qr-off-x', 'QR_Kaydir_X_mm', true);
  bindSyncedSliderNumber('rng-qr-off-y', 'num-qr-off-y', 'QR_Kaydir_Y_mm', true);
  bindSyncedSliderNumber('rng-txt-scale', 'num-txt-scale', 'Yazi_Boyut_Yuzde', false);
  bindSyncedSliderNumber('rng-txt-off-x', 'num-txt-off-x', 'Yazi_Kaydir_X_mm', true);
  bindSyncedSliderNumber('rng-txt-off-y', 'num-txt-off-y', 'Yazi_Kaydir_Y_mm', true);

  // Urun_Tipi Toggle
  document.querySelectorAll('#seg-urun-tipi .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.Urun_Tipi = btn.dataset.val;
      if (state.Urun_Tipi === 'Keychain' && state.Halka_Konumu === 'Yok') {
        state.Halka_Konumu = 'Ust_Orta';
      } else if (state.Urun_Tipi === 'Angled_Stand') {
        state.Halka_Konumu = 'Yok';
      }
      syncDomInputsFromState();
      rebuildAll();
    });
  });

  // Shape Selector Cards
  document.querySelectorAll('#shape-selector-grid .shape-card').forEach((card) => {
    card.addEventListener('click', () => {
      state.Govde_Sekli = card.dataset.shape;
      syncDomInputsFromState();
      rebuildAll();
    });
  });

  // Aspect Ratio
  document.querySelectorAll('#seg-aspect .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.En_Boy_Orani = btn.dataset.aspect;
      syncDomInputsFromState();
      rebuildAll();
    });
  });

  // Select Dropdowns (Border, Keyhole, Layout, Font, Align, Icon, IconPos)
  const selectMap = [
    ['sel-border-style', 'Cerceve_Stili'],
    ['sel-lug-pos', 'Halka_Konumu'],
    ['sel-layout', 'Yerlesim_Duzeni'],
    ['sel-font', 'Yazi_Fontu'],
    ['sel-align', 'Yazi_Hizalama'],
    ['sel-icon', 'Sembol_Ikon'],
    ['sel-icon-pos', 'Ikon_Konumu']
  ];
  for (const [id, key] of selectMap) {
    document.getElementById(id).addEventListener('change', (e) => {
      state[key] = e.target.value;
      rebuildAll();
    });
  }

  // Live Text / URL Debounced Rebuild (keeping Tab 1 & Tab 3 title inputs synced)
  let textTimer = null;
  const scheduleTextRebuild = () => {
    clearTimeout(textTimer);
    textTimer = setTimeout(() => rebuildAll(), 80);
  };
  document.getElementById('inp-qr-url').addEventListener('input', (e) => {
    state.QR_Baglanti_URL = e.target.value;
    scheduleTextRebuild();
  });
  document.getElementById('inp-ust-baslik').addEventListener('input', (e) => {
    state.Ust_Baslik_Metni = e.target.value;
    document.getElementById('inp-ust-baslik-2').value = e.target.value;
    scheduleTextRebuild();
  });
  document.getElementById('inp-ust-baslik-2').addEventListener('input', (e) => {
    state.Ust_Baslik_Metni = e.target.value;
    document.getElementById('inp-ust-baslik').value = e.target.value;
    scheduleTextRebuild();
  });
  document.getElementById('inp-alt-metin').addEventListener('input', (e) => {
    state.Alt_Metin = e.target.value;
    scheduleTextRebuild();
  });

  // Reset Position Offsets Button
  document.getElementById('btn-reset-offsets').addEventListener('click', () => {
    state.QR_Olcek_Yuzde = 88;
    state.QR_Kaydir_X_mm = 0;
    state.QR_Kaydir_Y_mm = 0;
    state.Yazi_Boyut_Yuzde = 100;
    state.Yazi_Kaydir_X_mm = 0;
    state.Yazi_Kaydir_Y_mm = 0;
    syncDomInputsFromState();
    rebuildAll();
  });

  // Floating On-Viewport Quick Nudge D-Pad
  document.querySelectorAll('.nudge-target').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nudge-target').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.nudgeTarget = btn.dataset.ntarget;
    });
  });

  document.querySelectorAll('.nudge-pad button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.ndir;
      const step = 2.0;
      const xKey = state.nudgeTarget === 'qr' ? 'QR_Kaydir_X_mm' : 'Yazi_Kaydir_X_mm';
      const yKey = state.nudgeTarget === 'qr' ? 'QR_Kaydir_Y_mm' : 'Yazi_Kaydir_Y_mm';
      const lim = state.nudgeTarget === 'qr' ? 30 : 25;

      if (dir === 'center') {
        state[xKey] = 0;
        state[yKey] = 0;
      } else if (dir === 'left') {
        state[xKey] = Math.max(-lim, state[xKey] - step);
      } else if (dir === 'right') {
        state[xKey] = Math.min(lim, state[xKey] + step);
      } else if (dir === 'up') {
        state[yKey] = Math.min(lim, state[yKey] + step);
      } else if (dir === 'down') {
        state[yKey] = Math.max(-lim, state[yKey] - step);
      }
      syncDomInputsFromState();
      rebuildAll();
    });
  });

  // Quick Bed Size Chips
  document.querySelectorAll('.quick-beds .mini-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.Tabla_Boyutu_mm = Number(chip.dataset.bed);
      syncDomInputsFromState();
      rebuildAll();
    });
  });

  // Presets
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = PRESETS[btn.dataset.preset];
      if (!p) return;
      document.querySelectorAll('.preset-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      Object.assign(state, p);
      state.partPose = 'assembled';
      document.querySelectorAll('#vp-part .pose-btn').forEach((b) => b.classList.remove('active'));
      document.getElementById('btn-pose-assembled').classList.add('active');
      syncDomInputsFromState();
      rebuildAll();
    });
  });

  // Material, Color Swatches & Custom Color Pickers
  document.getElementById('sel-material').addEventListener('change', (e) => {
    state.Malzeme_Tipi = e.target.value;
    rebuildAll();
  });

  document.querySelectorAll('#color-pair-swatches .swatch-pair').forEach((sw) => {
    sw.addEventListener('click', () => {
      document.querySelectorAll('#color-pair-swatches .swatch-pair').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      state.baseHex = sw.dataset.base;
      state.embossHex = sw.dataset.emboss;
      document.getElementById('clr-custom-base').value = state.baseHex;
      document.getElementById('clr-custom-emboss').value = state.embossHex;
      updateMaterialDisplayModes();
    });
  });

  document.getElementById('clr-custom-base').addEventListener('input', (e) => {
    state.baseHex = e.target.value;
    document.querySelectorAll('#color-pair-swatches .swatch-pair').forEach((s) => s.classList.remove('active'));
    updateMaterialDisplayModes();
  });
  document.getElementById('clr-custom-emboss').addEventListener('input', (e) => {
    state.embossHex = e.target.value;
    document.querySelectorAll('#color-pair-swatches .swatch-pair').forEach((s) => s.classList.remove('active'));
    updateMaterialDisplayModes();
  });

  // Layout Split / Part / Plate
  const stageEl = document.getElementById('viewports-stage');
  document.querySelectorAll('[data-layout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-layout]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.layoutMode = btn.dataset.layout;
      stageEl.className = `viewports-stage layout-${state.layoutMode}`;
    });
  });

  // Display Modes
  document.querySelectorAll('[data-display]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-display]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.displayMode = btn.dataset.display;
      updateMaterialDisplayModes();
    });
  });

  // Camera Projection & Views
  const projBtn = document.getElementById('btn-cam-proj');
  projBtn.addEventListener('click', () => {
    state.cameraProj = state.cameraProj === 'persp' ? 'ortho' : 'persp';
    projBtn.textContent = state.cameraProj === 'persp' ? 'PERSPEKTİF' : 'ORTOGRAFİK';
    projBtn.classList.toggle('active', state.cameraProj === 'ortho');
  });

  document.querySelectorAll('[data-camview]').forEach((btn) => {
    btn.addEventListener('click', () => setStandardCadView(btn.dataset.camview));
  });

  // Part Pose Toggles
  const setPose = (pose, btnId) => {
    state.partPose = pose;
    document.querySelectorAll('#vp-part .pose-btn').forEach((b) => b.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    populateScenePart();
  };
  document.getElementById('btn-pose-assembled').addEventListener('click', () => setPose('assembled', 'btn-pose-assembled'));
  document.getElementById('btn-pose-flat').addEventListener('click', () => setPose('flat', 'btn-pose-flat'));
  document.getElementById('btn-pose-exploded').addEventListener('click', () => setPose('exploded', 'btn-pose-exploded'));

  // Plate Preview Toggles
  document.getElementById('btn-plate-full').addEventListener('click', () => {
    state.platePreview = 'full';
    document.getElementById('btn-plate-full').classList.add('active');
    document.getElementById('btn-plate-order').classList.remove('active');
    populateScenePlate();
    updateHudAndDom();
  });
  document.getElementById('btn-plate-order').addEventListener('click', () => {
    state.platePreview = 'last';
    document.getElementById('btn-plate-order').classList.add('active');
    document.getElementById('btn-plate-full').classList.remove('active');
    populateScenePlate();
    updateHudAndDom();
  });

  // Cross-Section Clipping Controls
  const clipSel = document.getElementById('sel-clip-axis');
  const clipRng = document.getElementById('rng-clip-offset');
  const clipLbl = document.getElementById('lbl-clip-val');

  const syncClipUi = () => {
    if (state.clipAxis === 'none') {
      clipRng.disabled = true;
      clipLbl.textContent = 'KAPALI';
    } else {
      clipRng.disabled = false;
      clipLbl.textContent = `${state.clipAxis.toUpperCase()} = ${Number(state.clipOffset).toFixed(2)} mm`;
    }
    updateMaterialDisplayModes();
  };

  clipSel.addEventListener('change', () => {
    state.clipAxis = clipSel.value;
    if (state.clipAxis === 'z') {
      if (state.partPose === 'assembled' && state.Urun_Tipi === 'Angled_Stand') {
        setPose('flat', 'btn-pose-flat');
      }
      state.clipOffset = latestBuild ? latestBuild.slicerPlan.nfcPauseBedZ : 2.0;
      clipRng.min = '0';
      clipRng.max = latestBuild ? (latestBuild.slicerPlan.totalHeightMm + 0.5).toFixed(2) : '5';
      clipRng.step = '0.05';
      clipRng.value = String(state.clipOffset);
    } else if (state.clipAxis !== 'none') {
      state.clipOffset = 0;
      const span = latestBuild ? Math.max(latestBuild.plaqueMeta.plaqueWidthMm, latestBuild.plaqueMeta.plaqueLengthMm) * 0.6 : 50;
      clipRng.min = (-span).toFixed(1);
      clipRng.max = span.toFixed(1);
      clipRng.step = '0.5';
      clipRng.value = '0';
    }
    syncClipUi();
  });

  clipRng.addEventListener('input', () => {
    state.clipOffset = parseFloat(clipRng.value);
    syncClipUi();
  });

  document.getElementById('btn-jump-nfc').addEventListener('click', () => {
    if (!latestBuild) return;
    setPose('flat', 'btn-pose-flat');
    state.clipAxis = 'z';
    clipSel.value = 'z';
    const midNfc = +(0.5 * (latestBuild.slicerPlan.zNfcBottom + latestBuild.slicerPlan.zNfcTop)).toFixed(2);
    state.clipOffset = midNfc;
    clipRng.min = '0';
    clipRng.max = (latestBuild.slicerPlan.totalHeightMm + 0.5).toFixed(2);
    clipRng.step = '0.05';
    clipRng.value = String(midNfc);
    syncClipUi();
  });

  document.getElementById('btn-jump-m600').addEventListener('click', () => {
    if (!latestBuild) return;
    setPose('flat', 'btn-pose-flat');
    state.clipAxis = 'z';
    clipSel.value = 'z';
    const zM600 = latestBuild.slicerPlan.m600PauseBedZ;
    state.clipOffset = zM600;
    clipRng.min = '0';
    clipRng.max = (latestBuild.slicerPlan.totalHeightMm + 0.5).toFixed(2);
    clipRng.step = '0.05';
    clipRng.value = String(zM600);
    syncClipUi();
  });

  // Theme Toggle
  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    updateMaterialDisplayModes();
    if (latestBuild) rebuildPlateBedVisual(latestBuild.nesting.bedSizeMm, latestBuild.nesting.edgeMarginMm);
  });

  // Antet Modal Preview
  const modalEl = document.getElementById('antet-modal');
  const openAntetModal = () => {
    if (!latestBuild) return;
    const svg = generateImalatAntetiSvg(
      state,
      latestBuild.qrData,
      latestBuild.plaqueMeta,
      latestBuild.slicerPlan,
      latestBuild.nesting,
      latestBuild.pricing
    );
    document.getElementById('antet-svg-container').innerHTML = svg;
    modalEl.classList.remove('hidden');
  };
  document.getElementById('btn-preview-antet').addEventListener('click', openAntetModal);
  document.getElementById('btn-modal-close').addEventListener('click', () => modalEl.classList.add('hidden'));
  document.getElementById('btn-modal-dl-svg').addEventListener('click', exportAntetSvg);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') modalEl.classList.add('hidden');
  });

  // Exports
  document.getElementById('btn-export-stl').addEventListener('click', exportUnitWatertightStl);
  document.getElementById('btn-dl-stl-unit').addEventListener('click', exportUnitWatertightStl);
  document.getElementById('btn-dl-stl-plate').addEventListener('click', exportFullPlateStl);
  document.getElementById('btn-dl-antet-svg').addEventListener('click', exportAntetSvg);
  document.getElementById('btn-dl-b2b-csv').addEventListener('click', exportB2BCsv);
  document.getElementById('btn-dl-obj').addEventListener('click', exportObjFile);
  document.getElementById('btn-dl-glb').addEventListener('click', exportGlbFile);
  document.getElementById('btn-dl-dxf').addEventListener('click', exportDxfFile);
  document.getElementById('btn-dl-scad').addEventListener('click', exportScadFile);
}

// ============================================================================
// 8. BOOTSTRAP
// ============================================================================
syncDomInputsFromState();
initUiListeners();
rebuildAll();
animate();
