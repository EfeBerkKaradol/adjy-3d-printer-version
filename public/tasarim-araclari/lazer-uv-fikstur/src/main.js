import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  JIG_PRESETS,
  computeJigSpec,
  buildJigManifoldGeometry,
  computeMetrologyAndQuote,
  buildLoadedWorkpiecesGroup,
  buildOpticalBreadboardGroup
} from './jig-engine.js';
import {
  generateJigSVG,
  generateBinarySTL,
  generateB2BQuoteCSV,
  generateDXF,
  generateOpenSCAD,
  triggerDownload
} from './exporters.js';
import {
  parseUploadedModelFile,
  buildNormalizedCustomModelState,
  createDemoCustomKeychainModel
} from './custom-model.js';

// ============================================================================
// UYGULAMA DURUMU (STATE)
// ============================================================================
const state = {
  ...JIG_PRESETS.metal_card,
  customModel: null,
  Custom_Pocket_Mode: 'silhouette', // 'silhouette' | 'v_groove' | 'rect_box'
  displayMode: 'shaded', // 'shaded' | 'blueprint' | 'xray' | 'wire'
  camProjection: 'persp', // 'persp' | 'ortho'
  svgMode: 'dual',        // 'dual' | 'lightburn_1to1'
  showLoadedParts: true,
  showBreadboard: true,
  showFocusPlane: false,
  explodeMm: 0,
  clipAxis: 'none',       // 'none' | 'x' | 'y' | 'z'
  clipOffset: 0,
  darkTheme: true
};

let currentSpec = null;
let currentGeometry = null;
let currentMetrology = null;

// ============================================================================
// THREE.JS CAD VIEWPORT KURULUMU (1 BİRİM = 1.00 MM)
// ============================================================================
const canvas = document.getElementById('webglCanvas');
const threeContainer = document.getElementById('threeContainer');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();

// Prosedürel Stüdyo Yansımaları (Harici HDRI bağımlılığı olmadan)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

// Kalibre Atölye Işıklandırması
const hemiLight = new THREE.HemisphereLight(0xf5f3ef, 0x1d2028, 0.65);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.45);
keyLight.position.set(180, 320, 210);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 20;
keyLight.shadow.camera.far = 900;
const dCam = 280;
keyLight.shadow.camera.left = -dCam;
keyLight.shadow.camera.right = dCam;
keyLight.shadow.camera.top = dCam;
keyLight.shadow.camera.bottom = -dCam;
keyLight.shadow.bias = -0.0005;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x8bb4ff, 0.55);
rimLight.position.set(-220, 160, -190);
scene.add(rimLight);

// Kameralar: Perspektif 35° & Ortografik CAD
const perspCamera = new THREE.PerspectiveCamera(35, 1, 1, 4000);
perspCamera.position.set(210, 215, 250);

const orthoCamera = new THREE.OrthographicCamera(-200, 200, 150, -150, -2000, 4000);
orthoCamera.position.copy(perspCamera.position);

let activeCamera = perspCamera;
const controls = new OrbitControls(activeCamera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 4, 0);
controls.maxDistance = 1600;
controls.minDistance = 35;

// Yumuşak Kamera Geçiş Hedefi (Damped Camera Rig)
let camAnim = null;
const damp = (cur, tgt, lambda, dt) => THREE.MathUtils.lerp(cur, tgt, 1 - Math.exp(-lambda * dt));

// Canlı Kesit Düzlemi (Clipping Plane)
const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

// Sahne Grupları
const rootCadGroup = new THREE.Group();
scene.add(rootCadGroup);

let jigMesh = null;
let jigEdges = null;
let workpiecesGroup = null;
let breadboardGroup = null;
let focusPlaneGroup = null;

// ============================================================================
// BELLEK TEMİZLEME (GPU MEMORY DISCIPLINE)
// ============================================================================
function disposeObject3D(obj) {
  if (!obj) return;
  obj.traverse((child) => {
    if (child.geometry && !child.userData?.keepGeometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

// ============================================================================
// CAD GÖRÜNÜM MODU MALZEME UYGULAYICI
// ============================================================================
function createJigMaterial(spec, activeClipPlanes) {
  const mode = state.displayMode;
  if (mode === 'blueprint') {
    return new THREE.MeshBasicMaterial({
      color: state.darkTheme ? 0x0d1b2e : 0x1e3a5f,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      clippingPlanes: activeClipPlanes
    });
  }
  if (mode === 'xray') {
    return new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      side: THREE.DoubleSide,
      clippingPlanes: activeClipPlanes
    });
  }
  if (mode === 'wire') {
    return new THREE.MeshBasicMaterial({
      color: state.darkTheme ? 0xe04f33 : 0xd43c1e,
      wireframe: true,
      clippingPlanes: activeClipPlanes
    });
  }

  // 'shaded' — Fiziksel malzeme + çift taraflı kesit görünümü
  return new THREE.MeshStandardMaterial({
    color: spec.material.colorHex,
    roughness: spec.material.roughness,
    metalness: spec.material.metalness,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    clippingPlanes: activeClipPlanes
  });
}

function buildFocusPlaneVisual(spec) {
  const grp = new THREE.Group();
  const planeGeo = new THREE.PlaneGeometry(spec.plateW + 16, spec.plateH + 16);
  planeGeo.rotateX(-Math.PI * 0.5);

  const planeMat = new THREE.MeshBasicMaterial({
    color: 0xe04f33,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(planeGeo, planeMat);
  mesh.position.y = spec.zFocusTop;
  grp.add(mesh);

  const borderGeo = new THREE.EdgesGeometry(planeGeo);
  const borderMat = new THREE.LineBasicMaterial({ color: 0xff6b4a });
  const border = new THREE.LineSegments(borderGeo, borderMat);
  border.position.y = spec.zFocusTop;
  grp.add(border);

  return grp;
}

// ============================================================================
// KESİT DÜZLEMİ GÜNCELLEME
// ============================================================================
function getActiveClipPlanes() {
  if (state.clipAxis === 'none') return [];
  const off = Number(state.clipOffset) || 0;
  if (state.clipAxis === 'x') {
    clipPlane.set(new THREE.Vector3(-1, 0, 0), off);
  } else if (state.clipAxis === 'y') {
    // CAD Y ekseni = Three.js -Z ekseni (V-yatak enine kesiti için mükemmel!)
    clipPlane.set(new THREE.Vector3(0, 0, 1), off);
  } else if (state.clipAxis === 'z') {
    // CAD Z ekseni = Three.js Y ekseni
    clipPlane.set(new THREE.Vector3(0, -1, 0), Math.max(0.2, (currentSpec ? currentSpec.plateZ * 0.5 : 4) + off * 0.1));
  }
  return [clipPlane];
}

// ============================================================================
// ANA PARAMETRİK YENİDEN İNŞA DÖNGÜSÜ (3D + METROLOJİ + 2D SVG + B2B TEKLİF)
// ============================================================================
function rebuildAll() {
  const spec = computeJigSpec(state);
  currentSpec = spec;

  // Önceki 3D nesneleri temizle
  while (rootCadGroup.children.length > 0) {
    const ch = rootCadGroup.children[0];
    rootCadGroup.remove(ch);
    disposeObject3D(ch);
  }

  const activeClips = getActiveClipPlanes();

  // 1. %100 Su Geçirmez Manifold Fikstür Geometrisi
  const geom = buildJigManifoldGeometry(spec);
  currentGeometry = geom;

  const jigMat = createJigMaterial(spec, activeClips);
  jigMesh = new THREE.Mesh(geom, jigMat);
  jigMesh.castShadow = state.displayMode === 'shaded';
  jigMesh.receiveShadow = state.displayMode === 'shaded';
  rootCadGroup.add(jigMesh);

  // CAD Keskin Kenar Çizgileri (EdgesGeometry threshold = 22°)
  if (state.displayMode !== 'wire') {
    const edgeGeom = new THREE.EdgesGeometry(geom, 22);
    const edgeColor =
      state.displayMode === 'blueprint'
        ? 0x38bdf8
        : state.displayMode === 'xray'
        ? 0x93c5fd
        : state.darkTheme
        ? 0x6c7380
        : 0x1e2229;
    const edgeMat = new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: state.displayMode === 'blueprint' ? 0.95 : 0.58,
      clippingPlanes: activeClips
    });
    jigEdges = new THREE.LineSegments(edgeGeom, edgeMat);
    rootCadGroup.add(jigEdges);
  }

  // 2. Yüklü 3D Ürünler (Kart / Kalem / Jeton)
  workpiecesGroup = buildLoadedWorkpiecesGroup(spec, activeClips);
  workpiecesGroup.visible = state.showLoadedParts;
  workpiecesGroup.position.y = state.explodeMm;
  rootCadGroup.add(workpiecesGroup);

  // 3. M6 Optik Lazer Masası & DIN 912 Civatalar
  breadboardGroup = buildOpticalBreadboardGroup(spec);
  breadboardGroup.visible = state.showBreadboard;
  rootCadGroup.add(breadboardGroup);

  // 4. Lazer / UV Odak Düzlemi
  focusPlaneGroup = buildFocusPlaneVisual(spec);
  focusPlaneGroup.visible = state.showFocusPlane;
  rootCadGroup.add(focusPlaneGroup);

  // 5. Kesin Hacim, Kütle ve B2B Maliyet Hesabı
  currentMetrology = computeMetrologyAndQuote(geom, spec);

  // 6. UI, Metroloji ve 2D SVG Güncellemesi
  updateUITelemetry(spec, currentMetrology);
  update2DSvgPreview();
}

// ============================================================================
// TELEMETRİ, B2B TABLO VE KONTROL ETİKETLERİNİ GÜNCELLEME
// ============================================================================
function updateUITelemetry(spec, met) {
  // Şekle göre dinamik açıklama etiketleri
  const lblEn = document.getElementById('lblUrunEn');
  const lblBoy = document.getElementById('lblUrunBoy');
  const fieldBoy = document.getElementById('fieldUrunBoy');
  const fieldKal = document.getElementById('fieldUrunKalinlik');

  if (spec.customModel) {
    lblEn.innerHTML = 'Urun_En_mm <small>(Özel Model X Ölçüsü)</small>';
    lblBoy.innerHTML = 'Urun_Boy_mm <small>(Orantılı Model Y)</small>';
    fieldBoy.style.opacity = '0.55';
    fieldBoy.style.pointerEvents = 'none';
    fieldKal.style.display = 'none';
  } else if (spec.shape === 'Cylindrical_Pen') {
    lblEn.innerHTML = 'Urun_En_mm <small>(Kalem/Mil Çapı Ø)</small>';
    lblBoy.innerHTML = 'Urun_Boy_mm <small>(Silindir Boyu Y)</small>';
    fieldBoy.style.opacity = '1';
    fieldBoy.style.pointerEvents = 'auto';
    fieldKal.style.display = 'none';
  } else if (spec.shape === 'Round_Token') {
    lblEn.innerHTML = 'Urun_En_mm <small>(Jeton Çapı Ø)</small>';
    lblBoy.innerHTML = 'Urun_Boy_mm <small>(Dairesel Simetrik = Ø)</small>';
    fieldBoy.style.opacity = '0.5';
    fieldBoy.style.pointerEvents = 'none';
    fieldKal.style.display = 'flex';
  } else {
    lblEn.innerHTML = 'Urun_En_mm <small>(Kart Eni X)</small>';
    lblBoy.innerHTML = 'Urun_Boy_mm <small>(Kart Boyu Y)</small>';
    fieldBoy.style.opacity = '1';
    fieldBoy.style.pointerEvents = 'auto';
    fieldKal.style.display = 'flex';
  }

  // Üst bar özetleri
  document.getElementById('hudCapacity').textContent = `${spec.totalCavities} YUVA (${spec.satirAdedi}×${spec.sutunAdedi})`;
  document.getElementById('hudPlateDim').textContent = `${spec.plateW.toFixed(1)} × ${spec.plateH.toFixed(1)} × ${spec.plateZ.toFixed(1)} mm`;
  document.getElementById('hudFocusZ').textContent = `${spec.zFocusTop.toFixed(2)} mm`;

  // Yuva net ölçü notu
  const pocketText =
    spec.shape === 'Round_Token'
      ? `Net Yuva: Ø${spec.pocketW.toFixed(2)} mm (+${spec.netBoslukDelta.toFixed(2)}mm)`
      : `Net Yuva: ${spec.pocketW.toFixed(2)} × ${spec.pocketL.toFixed(2)} mm`;
  document.getElementById('liveNetPocketLabel').textContent = pocketText;

  // Sağ üst sahne etiketi
  document.getElementById('hudVGrooveNote').textContent = spec.customModel
    ? `ÖZEL SİLÜET KALIP: ${spec.customModel.fileName.toUpperCase()} // Z-ODAK ${spec.zFocusTop.toFixed(2)} MM`
    : spec.shape === 'Cylindrical_Pen'
    ? `90° V-YATAK MERKEZLEME // Z-ODAK ${spec.zFocusTop.toFixed(2)} MM`
    : `POKAYOKE (0,0) PAHI // M6 ${spec.vidaAraligi}MM TAM KATI`;

  document.getElementById('manifoldBadge').textContent =
    `MANIFOLD MESH (${met.triangleCount.toLocaleString('tr-TR')} ÜÇGEN) // 1:1 MM`;

  // Sağ Panel: CAD Metroloji Kutuları
  document.getElementById('metBBox').textContent = `${spec.plateW.toFixed(1)}×${spec.plateH.toFixed(1)}×${spec.plateZ.toFixed(1)} mm`;
  document.getElementById('metPocketNet').textContent =
    spec.shape === 'Round_Token'
      ? `Ø${spec.pocketW.toFixed(2)} × ${spec.yuvaDerinligi.toFixed(1)} mm`
      : `${spec.pocketW.toFixed(2)}×${spec.pocketL.toFixed(2)} mm`;
  document.getElementById('metPitch').textContent = `${spec.pitchX.toFixed(1)} × ${spec.pitchY.toFixed(1)} mm`;
  document.getElementById('metM6Info').textContent = `${spec.vidaAraligi}mm Grid (${spec.m6Holes.length}×M6)`;
  document.getElementById('metFocusZ').textContent = `Z = ${spec.zFocusTop.toFixed(2)} mm`;
  document.getElementById('metVolArea').textContent = `${met.volumeCm3.toFixed(1)} cm³ / ${met.areaCm2.toFixed(0)} cm²`;
  document.getElementById('metMass').textContent = `${met.effectiveMassG.toFixed(1)} g (${spec.material.shortName.split(' ')[0]})`;
  document.getElementById('metThroughput').textContent = `~${met.partsPerHour} Adet / Saat`;

  // B2B Teklif & Maliyet
  document.getElementById('metCycleTime').textContent = `~${met.cycleMinutes} dk İşleme`;
  document.getElementById('quoteUnitTry').textContent = `${met.unitQuoteTry.toLocaleString('tr-TR')} ₺`;
  document.getElementById('quoteUnitUsd').textContent = `(~$${met.unitQuoteUsd.toFixed(1)})`;
  document.getElementById('quoteHwTag').textContent = `+${spec.m6Holes.length}×M6 Civata Dahil`;

  document.getElementById('cbRaw').textContent = `${met.rawMaterialCostTry.toLocaleString('tr-TR')} ₺`;
  document.getElementById('cbMach').textContent = `${met.machineCostTry.toLocaleString('tr-TR')} ₺`;
  document.getElementById('cbHw').textContent = `${met.hardwareCostTry.toLocaleString('tr-TR')} ₺`;
  document.getElementById('cbSetup').textContent = `${met.setupFeeTry.toLocaleString('tr-TR')} ₺`;

  const tbody = document.getElementById('tierTableBody');
  tbody.innerHTML = met.tiers
    .map(
      (t) => `
      <tr>
        <td>${t.qty === 25 ? '25+ Adet' : `${t.qty} Adet`}</td>
        <td>%${t.discountPct}</td>
        <td><strong>${t.unitTry.toLocaleString('tr-TR')} ₺</strong></td>
        <td>${t.totalTry.toLocaleString('tr-TR')} ₺</td>
      </tr>`
    )
    .join('');
}

// ============================================================================
// 2D CANLI İMALAT ANTETİ & LIGHTBURN SVG ÖNİZLEME (PAN & ZOOM DESTEKLİ)
// ============================================================================
const svgMount = document.getElementById('svgCanvasMount');
const svgPanContainer = document.getElementById('svgPanContainer');
let svgZoom = 1.0;
let svgPanX = 0;
let svgPanY = 0;

function applySvgTransform() {
  svgMount.style.transform = `translate(${svgPanX}px, ${svgPanY}px) scale(${svgZoom})`;
  document.getElementById('lblSvgZoom').textContent = `${Math.round(svgZoom * 100)}%`;
}

function update2DSvgPreview() {
  if (!currentSpec || !currentMetrology) return;
  const svgMarkup = generateJigSVG(currentSpec, currentMetrology, {
    mode: state.svgMode,
    darkPreview: state.darkTheme && state.svgMode === 'dual'
  });
  svgMount.innerHTML = svgMarkup;

  // Saf 1:1 LightBurn önizlemesinde koyu sahne kontrastı için beyaz kağıt zemini uygula
  const svgEl = svgMount.querySelector('svg');
  if (svgEl && state.svgMode === 'lightburn_1to1') {
    svgEl.style.background = '#ffffff';
    svgEl.style.padding = '8px';
  }
}

// 2D Pan & Tekerlek Zoom Etkileşimi
let isDraggingSvg = false;
let dragStartX = 0;
let dragStartY = 0;

svgPanContainer.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  isDraggingSvg = true;
  dragStartX = e.clientX - svgPanX;
  dragStartY = e.clientY - svgPanY;
  svgPanContainer.setPointerCapture(e.pointerId);
});

svgPanContainer.addEventListener('pointermove', (e) => {
  if (!isDraggingSvg) return;
  svgPanX = e.clientX - dragStartX;
  svgPanY = e.clientY - dragStartY;
  applySvgTransform();
});

svgPanContainer.addEventListener('pointerup', () => {
  isDraggingSvg = false;
});

svgPanContainer.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    svgZoom = Math.max(0.35, Math.min(6.0, svgZoom * factor));
    applySvgTransform();
  },
  { passive: false }
);

document.getElementById('btnSvgZoomIn').addEventListener('click', () => {
  svgZoom = Math.min(6.0, svgZoom * 1.2);
  applySvgTransform();
});
document.getElementById('btnSvgZoomOut').addEventListener('click', () => {
  svgZoom = Math.max(0.35, svgZoom / 1.2);
  applySvgTransform();
});
document.getElementById('btnSvgReset').addEventListener('click', () => {
  svgZoom = 1.0;
  svgPanX = 0;
  svgPanY = 0;
  applySvgTransform();
});

// ============================================================================
// STANDART CAD KAMERA AÇILARI & PROJEKSİYON GEÇİŞİ
// ============================================================================
function updateCameraFrustum() {
  const rect = threeContainer.getBoundingClientRect();
  const w = Math.max(10, rect.width);
  const h = Math.max(10, rect.height);
  renderer.setSize(w, h, false);

  const aspect = w / h;
  perspCamera.aspect = aspect;
  perspCamera.updateProjectionMatrix();

  const span = currentSpec ? Math.max(currentSpec.plateW, currentSpec.plateH) * 0.78 : 180;
  orthoCamera.left = -span * aspect;
  orthoCamera.right = span * aspect;
  orthoCamera.top = span;
  orthoCamera.bottom = -span;
  orthoCamera.updateProjectionMatrix();
}

function setCameraView(viewName) {
  if (!currentSpec) return;
  const dist = Math.max(currentSpec.plateW, currentSpec.plateH) * 1.38 + 60;
  const tgt = new THREE.Vector3(0, currentSpec.plateZ * 0.5, 0);
  let pos = new THREE.Vector3();

  switch (viewName) {
    case 'top':
      pos.set(0, dist * 1.15, 0.01);
      break;
    case 'front':
      pos.set(0, currentSpec.plateZ * 0.5 + 8, dist * 1.1);
      break;
    case 'right':
      pos.set(dist * 1.1, currentSpec.plateZ * 0.5 + 8, 0);
      break;
    case 'bottom':
      pos.set(0, -dist * 1.15, 0.01);
      break;
    case 'iso':
    default:
      pos.set(dist * 0.78, dist * 0.76, dist * 0.88);
      break;
  }

  camAnim = { pos, tgt };
}

function switchCameraProjection(proj) {
  if (state.camProjection === proj) return;
  state.camProjection = proj;
  const prevCam = activeCamera;
  activeCamera = proj === 'ortho' ? orthoCamera : perspCamera;
  activeCamera.position.copy(prevCam.position);
  activeCamera.quaternion.copy(prevCam.quaternion);
  controls.object = activeCamera;
  updateCameraFrustum();
  controls.update();
}

// ============================================================================
// FORM & KONTROL BAĞLANTILARI (SENKRONİZE RANGE + NUMBER)
// ============================================================================
const syncedParams = [
  'Urun_En_mm',
  'Urun_Boy_mm',
  'Urun_Kalinligi_mm',
  'Yuva_Derinligi_mm',
  'Yuva_Bosluk_Payi_mm',
  'Satir_Adedi',
  'Sutun_Adedi',
  'Taban_Kalinligi_mm',
  'Ara_Duvar_mm'
];

function syncInputsFromState() {
  for (const key of syncedParams) {
    const numEl = document.getElementById(`num_${key}`);
    const rngEl = document.getElementById(`rng_${key}`);
    if (numEl && state[key] !== undefined) numEl.value = state[key];
    if (rngEl && state[key] !== undefined) rngEl.value = state[key];
  }

  document.querySelectorAll('.seg-btn[data-shape]').forEach((b) => {
    b.classList.toggle('active', b.dataset.shape === state.Urun_Sekli);
  });

  document.querySelectorAll('.mini-pill[data-clearmode]').forEach((b) => {
    b.classList.toggle('active', b.dataset.clearmode === state.Bosluk_Modu);
  });

  document.querySelectorAll('.pitch-btn[data-grid]').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.grid) === Number(state.Lazer_Masa_Vida_Araligi_mm));
  });

  document.getElementById('chk_Parmak_Alma_Oyugu').checked = Boolean(state.Parmak_Alma_Oyugu);
  document.getElementById('sel_Malzeme').value = state.Malzeme_Kodu;

  // Özel model paneli görünürlüğü ve bilgileri
  const cmPanel = document.getElementById('customModelActivePanel');
  if (state.customModel && state.Urun_Sekli === 'Custom_Model') {
    cmPanel.hidden = false;
    document.getElementById('cmFileName').textContent = state.customModel.fileName;
    document.getElementById('cmMeasDim').textContent =
      `${state.customModel.sizeX.toFixed(1)} × ${state.customModel.sizeY.toFixed(1)} × ${state.customModel.sizeZ.toFixed(1)} mm (${state.customModel.triangleCount} üçgen)`;
    document.getElementById('selCustomUnitScale').value = String(state.customModel.unitScale);
    document.querySelectorAll('.cm-mode-pills .mini-pill[data-cmpocket]').forEach((b) => {
      b.classList.toggle('active', b.dataset.cmpocket === state.Custom_Pocket_Mode);
    });
  } else {
    cmPanel.hidden = true;
  }
}

function disposeCustomModelState(cm) {
  if (!cm) return;
  if (cm.cadGeometry) cm.cadGeometry.dispose();
  if (cm.viewGeometry) cm.viewGeometry.dispose();
}

function activateCustomModelState(newCm, adjustDepth = true) {
  if (state.customModel && state.customModel !== newCm) {
    disposeCustomModelState(state.customModel);
  }
  state.customModel = newCm;
  state.Urun_Sekli = 'Custom_Model';
  state.Urun_En_mm = Number(newCm.sizeX.toFixed(1));
  state.Urun_Boy_mm = Number(newCm.sizeY.toFixed(1));
  state.Urun_Kalinligi_mm = Number(newCm.sizeZ.toFixed(1));
  if (adjustDepth) {
    state.Yuva_Derinligi_mm = Math.max(2.0, Math.min(15.0, Math.round(newCm.sizeZ * 0.8 * 2) / 2));
  }
  document.getElementById('customModelError').hidden = true;
  document.getElementById('presetSelect').value = 'custom';
  syncInputsFromState();
  rebuildAll();
  setCameraView('iso');
}

async function handleCustomFileImport(file) {
  if (!file) return;
  const errEl = document.getElementById('customModelError');
  errEl.hidden = true;
  try {
    const cm = await parseUploadedModelFile(file, state.Urun_Kalinligi_mm || 2.5);
    activateCustomModelState(cm, true);
  } catch (err) {
    errEl.textContent = err?.message || 'Model yüklenirken hata oluştu.';
    errEl.hidden = false;
  }
}

for (const key of syncedParams) {
  const numEl = document.getElementById(`num_${key}`);
  const rngEl = document.getElementById(`rng_${key}`);
  const onChangeVal = (val) => {
    const parsed = Number(val);
    if (Number.isNaN(parsed)) return;
    state[key] = parsed;

    // Özel model yüklüyken Urun_En_mm değiştirilirse modeli XY'de orantılı yeniden ölçeklendir
    if (key === 'Urun_En_mm' && state.Urun_Sekli === 'Custom_Model' && state.customModel && parsed >= 4) {
      const baseUnscaledX = state.customModel.sizeX / (state.customModel.customScaleXY || 1);
      const newScaleXY = parsed / Math.max(0.1, baseUnscaledX);
      const updatedCm = buildNormalizedCustomModelState(state.customModel.rawRecord, {
        rotXDeg: state.customModel.rotXDeg,
        rotYDeg: state.customModel.rotYDeg,
        rotZDeg: state.customModel.rotZDeg,
        unitScale: state.customModel.unitScale,
        customScaleXY: newScaleXY
      });
      disposeCustomModelState(state.customModel);
      state.customModel = updatedCm;
      state.Urun_Boy_mm = Number(updatedCm.sizeY.toFixed(1));
      document.getElementById('num_Urun_Boy_mm').value = state.Urun_Boy_mm;
      document.getElementById('rng_Urun_Boy_mm').value = state.Urun_Boy_mm;
      document.getElementById('cmMeasDim').textContent =
        `${updatedCm.sizeX.toFixed(1)} × ${updatedCm.sizeY.toFixed(1)} × ${updatedCm.sizeZ.toFixed(1)} mm (${updatedCm.triangleCount} üçgen)`;
    } else if (key === 'Urun_En_mm' && state.Urun_Sekli === 'Round_Token') {
      state.Urun_Boy_mm = parsed;
      document.getElementById('num_Urun_Boy_mm').value = parsed;
      document.getElementById('rng_Urun_Boy_mm').value = parsed;
    }
    if (numEl && document.activeElement !== numEl) numEl.value = parsed;
    if (rngEl && document.activeElement !== rngEl) rngEl.value = parsed;
    document.getElementById('presetSelect').value = 'custom';
    rebuildAll();
  };

  if (rngEl) rngEl.addEventListener('input', (e) => onChangeVal(e.target.value));
  if (numEl) numEl.addEventListener('input', (e) => onChangeVal(e.target.value));
}

// Ürün şekli seçimi
document.querySelectorAll('.seg-btn[data-shape]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetShape = btn.dataset.shape;
    if (targetShape === 'Custom_Model' && !state.customModel) {
      // Henüz dosya seçilmediyse örnek özel 3D modeli yükle
      const demoCm = createDemoCustomKeychainModel();
      activateCustomModelState(demoCm, true);
      return;
    }
    state.Urun_Sekli = targetShape;
    if (state.Urun_Sekli === 'Round_Token') {
      state.Urun_Boy_mm = state.Urun_En_mm;
    } else if (state.Urun_Sekli === 'Cylindrical_Pen' && state.Urun_En_mm > 45 && state.Urun_Boy_mm < 90) {
      state.Urun_En_mm = 11.0;
      state.Urun_Boy_mm = 138.0;
    }
    document.getElementById('presetSelect').value = 'custom';
    syncInputsFromState();
    rebuildAll();
  });
});

// ============================================================================
// KENDİ MODELİNİ YÜKLEME, SÜRÜKLE-BIRAK & EKSEN DÖNDÜRME BAĞLANTILARI
// ============================================================================
const fileInputEl = document.getElementById('fileCustomModel');
const dropZoneEl = document.getElementById('dropZoneModel');

document.getElementById('btnUploadModelTop').addEventListener('click', () => fileInputEl.click());
dropZoneEl.addEventListener('click', () => fileInputEl.click());
dropZoneEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInputEl.click();
  }
});

fileInputEl.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handleCustomFileImport(file);
  fileInputEl.value = '';
});

// Sol panel dropzone sürükle-bırak
['dragenter', 'dragover'].forEach((evt) => {
  dropZoneEl.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZoneEl.classList.add('drag-over');
  });
});
['dragleave', 'drop'].forEach((evt) => {
  dropZoneEl.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZoneEl.classList.remove('drag-over');
  });
});
dropZoneEl.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) handleCustomFileImport(file);
});

// 3D Sahne üzerine doğrudan sürükle-bırak desteği
['dragenter', 'dragover'].forEach((evt) => {
  threeContainer.addEventListener(evt, (e) => {
    e.preventDefault();
    threeContainer.classList.add('drag-over-stage');
  });
});
['dragleave', 'drop'].forEach((evt) => {
  threeContainer.addEventListener(evt, (e) => {
    e.preventDefault();
    threeContainer.classList.remove('drag-over-stage');
  });
});
threeContainer.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) handleCustomFileImport(file);
});

// Örnek Özel 3D Parça (NFC Anahtarlık) Butonu
document.getElementById('btnLoadDemoCustom').addEventListener('click', () => {
  const demoCm = createDemoCustomKeychainModel();
  activateCustomModelState(demoCm, true);
});

// Özel Modeli Kaldır Butonu
document.getElementById('btnClearCustomModel').addEventListener('click', () => {
  if (state.customModel) {
    disposeCustomModelState(state.customModel);
    if (state.customModel.rawRecord?.rawCadGeometry) {
      state.customModel.rawRecord.rawCadGeometry.dispose();
    }
    state.customModel = null;
  }
  state.Urun_Sekli = 'Rect_Card';
  state.Urun_En_mm = 54.0;
  state.Urun_Boy_mm = 85.6;
  state.Urun_Kalinligi_mm = 0.8;
  syncInputsFromState();
  rebuildAll();
});

// Özel Model Yuva Kesim Kipi (Silüet / V-Yatak / Dikdörtgen Cep)
document.querySelectorAll('.cm-mode-pills .mini-pill[data-cmpocket]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.Custom_Pocket_Mode = btn.dataset.cmpocket;
    syncInputsFromState();
    rebuildAll();
  });
});

// Özel Model 90° Eksen Döndürme Butonları
document.querySelectorAll('button[data-cmrot]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!state.customModel) return;
    const cm = state.customModel;
    const axis = btn.dataset.cmrot;
    const nextTransform = {
      rotXDeg: axis === 'reset' ? 0 : axis === 'x' ? (cm.rotXDeg + 90) % 360 : cm.rotXDeg,
      rotYDeg: axis === 'reset' ? 0 : axis === 'y' ? (cm.rotYDeg + 90) % 360 : cm.rotYDeg,
      rotZDeg: axis === 'reset' ? 0 : axis === 'z' ? (cm.rotZDeg + 90) % 360 : cm.rotZDeg,
      unitScale: cm.unitScale,
      customScaleXY: axis === 'reset' ? 1.0 : cm.customScaleXY
    };
    const updated = buildNormalizedCustomModelState(cm.rawRecord, nextTransform);
    activateCustomModelState(updated, false);
  });
});

// Özel Model Birim Çarpanı (mm / cm / m / inç)
document.getElementById('selCustomUnitScale').addEventListener('change', (e) => {
  if (!state.customModel) return;
  const cm = state.customModel;
  const updated = buildNormalizedCustomModelState(cm.rawRecord, {
    rotXDeg: cm.rotXDeg,
    rotYDeg: cm.rotYDeg,
    rotZDeg: cm.rotZDeg,
    unitScale: Number(e.target.value) || 1,
    customScaleXY: 1.0
  });
  activateCustomModelState(updated, true);
});

// Boşluk modu (Toplam +Δ / Çevre +2Δ)
document.querySelectorAll('.mini-pill[data-clearmode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.Bosluk_Modu = btn.dataset.clearmode;
    syncInputsFromState();
    rebuildAll();
  });
});

// Lazer_Masa_Vida_Araligi_mm (25mm / 50mm M6)
document.querySelectorAll('.pitch-btn[data-grid]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.Lazer_Masa_Vida_Araligi_mm = Number(btn.dataset.grid);
    document.getElementById('presetSelect').value = 'custom';
    syncInputsFromState();
    rebuildAll();
  });
});

// Parmak_Alma_Oyugu
document.getElementById('chk_Parmak_Alma_Oyugu').addEventListener('change', (e) => {
  state.Parmak_Alma_Oyugu = e.target.checked;
  document.getElementById('presetSelect').value = 'custom';
  rebuildAll();
});

// Malzeme seçimi
document.getElementById('sel_Malzeme').addEventListener('change', (e) => {
  state.Malzeme_Kodu = e.target.value;
  rebuildAll();
});

// Hazır Şablonlar (Presets)
document.getElementById('presetSelect').addEventListener('change', (e) => {
  const p = JIG_PRESETS[e.target.value];
  if (!p) return;
  Object.assign(state, p);
  syncInputsFromState();
  rebuildAll();
  setCameraView('iso');
});

// Sahne Düzeni Sekmeleri (Split / 3D / 2D)
document.querySelectorAll('.ws-tab[data-layout]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ws-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const container = document.getElementById('stageSplitContainer');
    container.className = `stage-split-container layout-${tab.dataset.layout}`;
    requestAnimationFrame(() => {
      updateCameraFrustum();
    });
  });
});

// Kamera Projeksiyonu & Açıları
document.querySelectorAll('.vp-btn[data-camproj]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.vp-btn[data-camproj]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    switchCameraProjection(btn.dataset.camproj);
  });
});

document.querySelectorAll('.vp-btn[data-camview]').forEach((btn) => {
  btn.addEventListener('click', () => {
    setCameraView(btn.dataset.camview);
  });
});

// CAD Görünüm Modu
document.querySelectorAll('.vp-btn[data-display]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.vp-btn[data-display]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.displayMode = btn.dataset.display;
    rebuildAll();
  });
});

// 2D SVG Şablon Kipi Seçimi
document.querySelectorAll('.vp-btn[data-svgmode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.vp-btn[data-svgmode]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.svgMode = btn.dataset.svgmode;
    update2DSvgPreview();
  });
});

// Sahne içi görünürlük kutuları & Çıkarma / Kesit sürgüleri
document.getElementById('chkShowLoadedParts').addEventListener('change', (e) => {
  state.showLoadedParts = e.target.checked;
  if (workpiecesGroup) workpiecesGroup.visible = state.showLoadedParts;
});

document.getElementById('chkShowBreadboard').addEventListener('change', (e) => {
  state.showBreadboard = e.target.checked;
  if (breadboardGroup) breadboardGroup.visible = state.showBreadboard;
});

document.getElementById('chkShowFocusPlane').addEventListener('change', (e) => {
  state.showFocusPlane = e.target.checked;
  if (focusPlaneGroup) focusPlaneGroup.visible = state.showFocusPlane;
});

document.getElementById('rngExplode').addEventListener('input', (e) => {
  state.explodeMm = Number(e.target.value);
  document.getElementById('lblExplodeMm').textContent = `${state.explodeMm.toFixed(1)} mm`;
  if (workpiecesGroup) workpiecesGroup.position.y = state.explodeMm;
});

document.getElementById('selClipAxis').addEventListener('change', (e) => {
  state.clipAxis = e.target.value;
  const rng = document.getElementById('rngClipOffset');
  rng.disabled = state.clipAxis === 'none';
  rebuildAll();
});

document.getElementById('rngClipOffset').addEventListener('input', (e) => {
  state.clipOffset = Number(e.target.value);
  getActiveClipPlanes();
});

// Tema Değiştirici (Kalibre Koyu Atölye <-> Arşiv Kağıdı)
document.getElementById('btnThemeToggle').addEventListener('click', () => {
  state.darkTheme = !state.darkTheme;
  document.documentElement.setAttribute('data-theme', state.darkTheme ? 'dark' : 'light');
  rebuildAll();
});

// ============================================================================
// İHRACAT AKSİYONLARI (.SVG, .STL, .CSV, .DXF, .SCAD)
// ============================================================================
function getBaseFileSlug() {
  const s = currentSpec;
  return `fikstur_${s.shape.toLowerCase()}_${Math.round(s.urunEn)}x${Math.round(s.urunBoy)}_${s.satirAdedi}x${s.sutunAdedi}_m6g${s.vidaAraligi}`;
}

function handleExportSTL() {
  if (!currentGeometry || !currentSpec) return;
  const bin = generateBinarySTL(currentGeometry, currentSpec);
  triggerDownload(bin, `${getBaseFileSlug()}_1to1mm.stl`, 'application/octet-stream');
}

function handleExportPureLightBurnSVG() {
  if (!currentSpec || !currentMetrology) return;
  const svg = generateJigSVG(currentSpec, currentMetrology, { mode: 'lightburn_1to1', darkPreview: false });
  triggerDownload(svg, `${getBaseFileSlug()}_lightburn_1to1.svg`, 'image/svg+xml;charset=utf-8');
}

function handleExportDualAntetSVG() {
  if (!currentSpec || !currentMetrology) return;
  const svg = generateJigSVG(currentSpec, currentMetrology, { mode: 'dual', darkPreview: false });
  triggerDownload(svg, `${getBaseFileSlug()}_imalat_anteti_lightburn.svg`, 'image/svg+xml;charset=utf-8');
}

function handleExportQuoteCSV() {
  if (!currentSpec || !currentMetrology) return;
  const csv = generateB2BQuoteCSV(currentSpec, currentMetrology);
  triggerDownload(csv, `${getBaseFileSlug()}_b2b_teklif.csv`, 'text/csv;charset=utf-8');
}

function handleExportDXF() {
  if (!currentSpec) return;
  const dxf = generateDXF(currentSpec);
  triggerDownload(dxf, `${getBaseFileSlug()}_1to1mm.dxf`, 'application/dxf;charset=utf-8');
}

function handleExportSCAD() {
  if (!currentSpec) return;
  const scad = generateOpenSCAD(currentSpec);
  triggerDownload(scad, `${getBaseFileSlug()}.scad`, 'text/plain;charset=utf-8');
}

document.getElementById('btnExportSTL').addEventListener('click', handleExportSTL);
document.getElementById('btnExportSTLTop').addEventListener('click', handleExportSTL);
document.getElementById('btnExportPureLB').addEventListener('click', handleExportPureLightBurnSVG);
document.getElementById('btnExportLightBurnTop').addEventListener('click', handleExportPureLightBurnSVG);
document.getElementById('btnExportDualSVG').addEventListener('click', handleExportDualAntetSVG);
document.getElementById('btnExportCSV').addEventListener('click', handleExportQuoteCSV);
document.getElementById('btnExportDXF').addEventListener('click', handleExportDXF);
document.getElementById('btnExportSCAD').addEventListener('click', handleExportSCAD);

// ============================================================================
// PENCERE BOYUTLANDIRMA & ANİMASYON DÖNGÜSÜ
// ============================================================================
const resizeObs = new ResizeObserver(() => {
  updateCameraFrustum();
});
resizeObs.observe(threeContainer);

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (camAnim) {
    activeCamera.position.x = damp(activeCamera.position.x, camAnim.pos.x, 8.5, dt);
    activeCamera.position.y = damp(activeCamera.position.y, camAnim.pos.y, 8.5, dt);
    activeCamera.position.z = damp(activeCamera.position.z, camAnim.pos.z, 8.5, dt);
    controls.target.x = damp(controls.target.x, camAnim.tgt.x, 8.5, dt);
    controls.target.y = damp(controls.target.y, camAnim.tgt.y, 8.5, dt);
    controls.target.z = damp(controls.target.z, camAnim.tgt.z, 8.5, dt);

    if (activeCamera.position.distanceTo(camAnim.pos) < 0.4) {
      activeCamera.position.copy(camAnim.pos);
      controls.target.copy(camAnim.tgt);
      camAnim = null;
    }
  }

  controls.update();
  renderer.render(scene, activeCamera);
}

// İlk Başlatma
syncInputsFromState();
rebuildAll();
updateCameraFrustum();
setCameraView('iso');
animate();


/* ADJY köprüsü: yüklenen özel modelin dönüşü form alanlarında durmuyor;
   sipariş kaydına girebilmesi için durum salt-okunur olarak dışarı açılır. */
window.__ADJY_LAZER = { durum: () => state };
