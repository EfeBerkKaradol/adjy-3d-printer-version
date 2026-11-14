import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  PRESET_CONFIGS,
  buildPlanterGeometry,
  buildDripTrayGeometry,
  computeFullAssemblyReport,
} from './geometry.js';
import {
  exportPlanterSTL,
  exportTraySTL,
  exportAssemblyOBJ,
  exportAssemblyGLB,
  exportProfileDXF,
  exportParametricSCAD,
  computeSMLFamilyReports,
  generateImalatAntetiSVG,
  exportImalatAntetiSVG,
  computeEcommerceProfitRows,
  exportEcommerceCSV,
} from './exporters.js';

// --- 1. APPLICATION STATE ---
const PARAM_KEYS = [
  'Saksi_Capi_mm',
  'Saksi_Yuksekligi_mm',
  'Doku_Kanat_Sayisi',
  'Kanat_Derinligi_mm',
  'Burulma_Acisi_Derece',
  'Cidar_Kalinligi_mm',
  'Kilit_Toleransi_mm',
  'Alt_Tabak_Yukseklik_mm',
];

const FINISH_PALETTES = {
  terracotta: { planter: 0xc85a3a, tray: 0x2b2b2e, roughP: 0.62, roughT: 0.52 },
  bone: { planter: 0xe5dfd3, tray: 0x353432, roughP: 0.58, roughT: 0.50 },
  sage: { planter: 0x5e7464, tray: 0xd8d2c5, roughP: 0.48, roughT: 0.56 },
  charcoal: { planter: 0x2b2c2f, tray: 0xc85a3a, roughP: 0.50, roughT: 0.58 },
};

const state = {
  params: { ...PRESET_CONFIGS.M },
  materialKey: 'PLA',
  finishKey: 'terracotta',
  assemblyMode: 'assembled', // 'assembled' | 'exploded' | 'sml' | 'planter' | 'tray'
  displayMode: 'shaded',     // 'shaded' | 'dfm' | 'blueprint' | 'xray' | 'wire'
  isOrtho: false,
  sectionEnabled: false,
  sectionAxis: 'X',
  sectionOffset: 0,
  theme: 'dark',
  econ: {
    salePriceOverride: 0,
    filamentKgPrice: 480,
    packagingCost: 22,
  },
};

let currentPlanter = null;
let currentTray = null;
let currentReport = null;
let currentSmlReports = [];

// --- 2. THREE.JS CAD WORKBENCH INITIALIZATION ---
const canvas = document.getElementById('webgl-canvas');
const stageEl = document.getElementById('canvas-stage');
const smlOverlayEl = document.getElementById('sml-overlay-container');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

// Procedural studio reflection environment (zero external HDRI dependency)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

// Perspective + True CAD Orthographic Cameras
const perspCam = new THREE.PerspectiveCamera(35, 1, 1, 4000);
perspCam.position.set(235, 185, 265);

const orthoCam = new THREE.OrthographicCamera(-200, 200, 150, -150, -2000, 4000);
orthoCam.position.copy(perspCam.position);

let activeCamera = perspCam;

const controls = new OrbitControls(activeCamera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 78, 0);
controls.maxDistance = 1400;
controls.minDistance = 60;

// Key, Fill & Rim Studio CAD Lighting
const hemiLight = new THREE.HemisphereLight(0xfffbf2, 0x282830, 0.55);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff6eb, 1.35);
keyLight.position.set(220, 380, 240);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 50;
keyLight.shadow.camera.far = 1200;
const dCam = 340;
keyLight.shadow.camera.left = -dCam;
keyLight.shadow.camera.right = dCam;
keyLight.shadow.camera.top = dCam;
keyLight.shadow.camera.bottom = -dCam;
keyLight.shadow.bias = -0.0004;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xdce8ff, 0.55);
rimLight.position.set(-240, 190, -210);
scene.add(rimLight);

// 220x220mm Standard 3D Printer Build Plate Calibration Grid
const buildPlateGroup = new THREE.Group();
scene.add(buildPlateGroup);

const shadowCatcher = new THREE.Mesh(
  new THREE.PlaneGeometry(1400, 1400),
  new THREE.ShadowMaterial({ opacity: 0.28 })
);
shadowCatcher.rotation.x = -Math.PI / 2;
shadowCatcher.position.y = -0.05;
shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

function buildCalibrationStage(isWideSml) {
  while (buildPlateGroup.children.length) {
    const ch = buildPlateGroup.children.pop();
    if (ch.geometry) ch.geometry.dispose();
    if (ch.material) ch.material.dispose();
  }
  const isDark = state.theme === 'dark';
  const majorColor = isDark ? 0x3b3a37 : 0xbdb7ab;
  const minorColor = isDark ? 0x1f1f24 : 0xdad4c8;
  const accentColor = 0xe0532c;

  if (!isWideSml) {
    // Exact 220 x 220 mm Standard Printer Bed Grid (22 divisions = 10mm per cell)
    const grid = new THREE.GridHelper(220, 22, majorColor, minorColor);
    buildPlateGroup.add(grid);

    // Crisp 220x220mm Outer Printer Bed Frame
    const pts = [
      new THREE.Vector3(-110, 0.1, -110),
      new THREE.Vector3(110, 0.1, -110),
      new THREE.Vector3(110, 0.1, 110),
      new THREE.Vector3(-110, 0.1, 110),
      new THREE.Vector3(-110, 0.1, -110),
    ];
    const borderGeom = new THREE.BufferGeometry().setFromPoints(pts);
    const borderLine = new THREE.Line(
      borderGeom,
      new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.55 })
    );
    buildPlateGroup.add(borderLine);
  } else {
    // Wide 660 x 280 mm calibration grid for S / M / L side-by-side lineup
    const grid = new THREE.GridHelper(680, 34, majorColor, minorColor);
    buildPlateGroup.add(grid);
  }
}

// Live Clipping Plane
const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

function updateClippingPlane() {
  if (!state.sectionEnabled) {
    activeMaterialsList.forEach((m) => {
      m.clippingPlanes = null;
      m.needsUpdate = true;
    });
    return;
  }
  const off = state.sectionOffset;
  if (state.sectionAxis === 'X') {
    clipPlane.normal.set(-1, 0, 0);
    clipPlane.constant = off;
  } else if (state.sectionAxis === 'Z') {
    clipPlane.normal.set(0, 0, -1);
    clipPlane.constant = off;
  } else {
    clipPlane.normal.set(0, -1, 0);
    clipPlane.constant = off + 90;
  }
  activeMaterialsList.forEach((m) => {
    m.clippingPlanes = [clipPlane];
    m.needsUpdate = true;
  });
}

// Scene Groups
const singleAssemblyGroup = new THREE.Group();
const planterRigGroup = new THREE.Group();
const trayRigGroup = new THREE.Group();
singleAssemblyGroup.add(planterRigGroup, trayRigGroup);
scene.add(singleAssemblyGroup);

const smlSceneGroup = new THREE.Group();
smlSceneGroup.visible = false;
scene.add(smlSceneGroup);

let planterMesh = null;
let planterEdgeLines = null;
let trayMesh = null;
let trayEdgeLines = null;
let activeMaterialsList = [];
let smlAnchors = [];

// Damped animation targets for Exploded Twist-Lock choreography
const anim = {
  curLiftY: 0,
  targetLiftY: 0,
  curTwistY: 0,
  targetTwistY: 0,
};

const damp = (cur, target, lambda, dt) =>
  THREE.MathUtils.lerp(cur, target, 1 - Math.exp(-lambda * dt));

// --- 3. MATERIAL & DISPLAY MODE FACTORY ---
function createPartMaterials(isPlanter) {
  const pal = FINISH_PALETTES[state.finishKey] || FINISH_PALETTES.terracotta;
  const baseHex = isPlanter ? pal.planter : pal.tray;
  const rough = isPlanter ? pal.roughP : pal.roughT;
  const clips = state.sectionEnabled ? [clipPlane] : null;

  let meshMat;
  let edgeMat = null;

  if (state.displayMode === 'shaded') {
    meshMat = new THREE.MeshStandardMaterial({
      color: baseHex,
      roughness: rough,
      metalness: 0.06,
      side: THREE.DoubleSide,
      clippingPlanes: clips,
      clipShadows: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    edgeMat = new THREE.LineBasicMaterial({
      color: state.theme === 'dark' ? 0x151518 : 0x22201d,
      transparent: true,
      opacity: 0.36,
      clippingPlanes: clips,
    });
  } else if (state.displayMode === 'dfm') {
    meshMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.48,
      metalness: 0.04,
      side: THREE.DoubleSide,
      clippingPlanes: clips,
    });
    edgeMat = new THREE.LineBasicMaterial({
      color: 0x0b0b0d,
      transparent: true,
      opacity: 0.28,
      clippingPlanes: clips,
    });
  } else if (state.displayMode === 'blueprint') {
    meshMat = new THREE.MeshBasicMaterial({
      color: isPlanter ? 0x10355e : 0x0b2542,
      side: THREE.DoubleSide,
      clippingPlanes: clips,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    edgeMat = new THREE.LineBasicMaterial({
      color: isPlanter ? 0xd9f0ff : 0x7fc4fd,
      transparent: true,
      opacity: 0.85,
      clippingPlanes: clips,
    });
  } else if (state.displayMode === 'xray') {
    meshMat = new THREE.MeshPhysicalMaterial({
      color: isPlanter ? baseHex : 0x5aa9e6,
      roughness: 0.25,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      side: THREE.DoubleSide,
      clippingPlanes: clips,
    });
    edgeMat = new THREE.LineBasicMaterial({
      color: isPlanter ? 0xf2ede4 : 0x5aa9e6,
      transparent: true,
      opacity: 0.65,
      clippingPlanes: clips,
    });
  } else {
    // wireframe
    meshMat = new THREE.MeshBasicMaterial({
      color: isPlanter ? 0xe0532c : 0x7ca5c8,
      wireframe: true,
      clippingPlanes: clips,
    });
  }

  activeMaterialsList.push(meshMat);
  if (edgeMat) activeMaterialsList.push(edgeMat);
  return { meshMat, edgeMat };
}

function disposeGroupMeshes(group) {
  while (group.children.length) {
    const obj = group.children.pop();
    if (obj.children && obj.children.length) disposeGroupMeshes(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  }
}

// --- 4. GEOMETRY REBUILD & SCENE SYNC ---
function rebuildAll() {
  activeMaterialsList = [];

  // Dispose previous geometries cleanly
  if (currentPlanter) {
    currentPlanter.manifoldGeom.dispose();
    currentPlanter.displayGeom.dispose();
  }
  if (currentTray) {
    currentTray.manifoldGeom.dispose();
    currentTray.displayGeom.dispose();
  }
  disposeGroupMeshes(planterRigGroup);
  disposeGroupMeshes(trayRigGroup);

  // Build exact 1:1 mm watertight CAD geometries
  currentPlanter = buildPlanterGeometry(state.params);
  currentTray = buildDripTrayGeometry(state.params);
  currentReport = computeFullAssemblyReport(currentPlanter, currentTray, state.materialKey);
  currentSmlReports = computeSMLFamilyReports(state.params, state.materialKey);

  // Create Planter mesh + crisp CAD feature edges
  const pMats = createPartMaterials(true);
  planterMesh = new THREE.Mesh(currentPlanter.displayGeom.clone(), pMats.meshMat);
  planterMesh.castShadow = true;
  planterMesh.receiveShadow = true;
  planterRigGroup.add(planterMesh);

  if (pMats.edgeMat) {
    const pEdges = new THREE.EdgesGeometry(currentPlanter.manifoldGeom, 26);
    planterEdgeLines = new THREE.LineSegments(pEdges, pMats.edgeMat);
    planterRigGroup.add(planterEdgeLines);
  }

  // Create Drip Tray mesh + crisp CAD feature edges
  const tMats = createPartMaterials(false);
  trayMesh = new THREE.Mesh(currentTray.displayGeom.clone(), tMats.meshMat);
  trayMesh.castShadow = true;
  trayMesh.receiveShadow = true;
  trayRigGroup.add(trayMesh);

  if (tMats.edgeMat) {
    const tEdges = new THREE.EdgesGeometry(currentTray.manifoldGeom, 24);
    trayEdgeLines = new THREE.LineSegments(tEdges, tMats.edgeMat);
    trayRigGroup.add(trayEdgeLines);
  }

  // Rebuild 3D S/M/L Lineup if in 'sml' mode
  if (state.assemblyMode === 'sml') {
    rebuildSmlLineup3D();
  }

  syncAssemblyVisibilityAndTargets();
  updateClippingPlane();
  updateAllUIReadouts();
}

function rebuildSmlLineup3D() {
  disposeGroupMeshes(smlSceneGroup);
  smlAnchors = [];
  smlOverlayEl.innerHTML = '';

  const xPositions = [-175, 0, 210];
  const sizeKeys = ['S', 'M', 'L'];

  sizeKeys.forEach((sizeKey, idx) => {
    const base = PRESET_CONFIGS[sizeKey];
    const cfg = {
      ...state.params,
      Saksi_Capi_mm: base.Saksi_Capi_mm,
      Saksi_Yuksekligi_mm: base.Saksi_Yuksekligi_mm,
      Alt_Tabak_Yukseklik_mm: base.Alt_Tabak_Yukseklik_mm,
    };

    const pRes = buildPlanterGeometry(cfg);
    const tRes = buildDripTrayGeometry(cfg);
    const rep = computeFullAssemblyReport(pRes, tRes, state.materialKey);

    const subGroup = new THREE.Group();
    subGroup.position.x = xPositions[idx];

    const pMats = createPartMaterials(true);
    const mPlanter = new THREE.Mesh(pRes.displayGeom, pMats.meshMat);
    mPlanter.position.y = rep.dims.yTraySeat;
    mPlanter.castShadow = true;
    mPlanter.receiveShadow = true;
    subGroup.add(mPlanter);

    if (pMats.edgeMat) {
      const eP = new THREE.LineSegments(new THREE.EdgesGeometry(pRes.manifoldGeom, 28), pMats.edgeMat);
      eP.position.y = rep.dims.yTraySeat;
      subGroup.add(eP);
    }

    const tMats = createPartMaterials(false);
    const mTray = new THREE.Mesh(tRes.displayGeom, tMats.meshMat);
    mTray.castShadow = true;
    mTray.receiveShadow = true;
    subGroup.add(mTray);

    if (tMats.edgeMat) {
      const eT = new THREE.LineSegments(new THREE.EdgesGeometry(tRes.manifoldGeom, 26), tMats.edgeMat);
      subGroup.add(eT);
    }

    pRes.manifoldGeom.dispose();
    tRes.manifoldGeom.dispose();
    smlSceneGroup.add(subGroup);

    // Create interactive HTML floating CAD badge
    const tag = document.createElement('div');
    tag.className = 'sml-tag';
    tag.innerHTML = `
      <strong>BOY ${sizeKey} // Ø${Math.round(rep.dims.D)}×${Math.round(rep.dims.H)} mm</strong>
      <span>Toprak: ${rep.soilVolUsableL.toFixed(2)} L | ${rep.shippingDesi.toFixed(2)} Desi | ${Math.round(rep.totalPrintMassG)} g</span>
    `;
    tag.title = `${sizeKey} şablonunu editöre yüklemek için tıklayın`;
    tag.addEventListener('click', () => applyPreset(sizeKey, true));
    smlOverlayEl.appendChild(tag);

    smlAnchors.push({
      el: tag,
      worldPos: new THREE.Vector3(xPositions[idx], rep.assembledHeightMm + 14, 0),
    });
  });
}

function syncAssemblyVisibilityAndTargets() {
  const d = currentReport.dims;
  const isSml = state.assemblyMode === 'sml';

  singleAssemblyGroup.visible = !isSml;
  smlSceneGroup.visible = isSml;
  smlOverlayEl.classList.toggle('hidden', !isSml);
  buildCalibrationStage(isSml);

  if (!isSml) {
    planterRigGroup.visible = state.assemblyMode !== 'tray';
    trayRigGroup.visible = state.assemblyMode !== 'planter';

    if (state.assemblyMode === 'assembled') {
      anim.targetLiftY = d.yTraySeat;
      anim.targetTwistY = 0;
    } else if (state.assemblyMode === 'exploded') {
      // Untwist 30 deg (-pi/6) to unlock 3-lug bayonet and lift +36mm above tray!
      anim.targetLiftY = d.hTray + 32;
      anim.targetTwistY = -Math.PI / 6;
    } else if (state.assemblyMode === 'planter') {
      anim.targetLiftY = 0;
      anim.targetTwistY = 0;
    }
  }
}

// --- 5. UI TELEMETRY, S/M/L TABLE & E-COMMERCE TABLE UPDATES ---
function updateAllUIReadouts() {
  const r = currentReport;
  const d = r.dims;

  // Header Badges
  const dfmText = document.getElementById('hud-dfm-text');
  const dfmDot = document.querySelector('#hud-dfm-badge .dot');
  dfmText.textContent = `DFM ≤45° ONAYLI (MAKS ${d.peakOverhangDeg.toFixed(1)}°)`;
  dfmDot.className = 'dot pass';

  const manifoldEl = document.getElementById('hud-manifold-badge');
  manifoldEl.textContent = r.allWatertight
    ? `MANIFOLD: SU GEÇİRMEZ (0 AÇIK KENAR)`
    : `MANIFOLD KONTROL`;

  document.getElementById('hud-sku-badge').textContent = `SKU: ${r.skuCode}`;

  // Twist DFM Clamp Note
  const twistNote = document.getElementById('twist-dfm-note');
  if (d.dfmClamped) {
    twistNote.className = 'dfm-clamp-note mono clamped';
    twistNote.textContent = `DFM Sınırı Aktif: ${d.twistReqDeg.toFixed(0)}° ➜ ${d.twistEffDeg.toFixed(1)}° (Sarkma ${d.peakOverhangDeg.toFixed(1)}° ≤ 45°)`;
  } else {
    twistNote.className = 'dfm-clamp-note mono';
    twistNote.textContent = `Aktif: ${d.twistEffDeg.toFixed(1)}° // Maks Sarkma: ${d.peakOverhangDeg.toFixed(1)}° ≤ 45° (Desteksiz)`;
  }

  // Viewport HUD
  document.getElementById('vp-dim-readout').textContent =
    `MONTAJ ZARFI: Ø${d.D.toFixed(1)} × ${r.assembledHeightMm.toFixed(1)} mm (Saksı: ${d.H.toFixed(0)} mm + Tabak: ${d.hTray.toFixed(0)} mm)`;
  document.getElementById('vp-lock-readout').textContent =
    `BURGU KİLİT: 3-TIRNAK BAYONET (${d.tol.toFixed(2)} mm BOŞLUK | 30° KİLİTLEME)`;
  document.getElementById('vp-drain-readout').textContent =
    `SU TAHLİYE: ${d.bottomThickness.toFixed(1)}mm TABAN + 6×Ø${(d.drainHoleR * 2).toFixed(1)}mm HUNİ + ${r.waterReservoirMl.toFixed(0)}mL HAZNE`;

  // Export Button Filenames
  document.getElementById('sub-stl-planter').textContent =
    `Saksi_${Math.round(d.D)}x${Math.round(d.H)}mm_K${d.N}.stl`;
  document.getElementById('sub-stl-tray').textContent =
    `Alt_Tabak_${Math.round(d.D)}mm_Tol${d.tol.toFixed(2)}mm.stl`;

  // KPI Cards
  document.getElementById('kpi-soil-l').textContent = `${r.soilVolUsableL.toFixed(2)} L`;
  document.getElementById('kpi-soil-sub').textContent =
    `Silme: ${r.soilVolBrimL.toFixed(2)} L | Su Haznesi: ${r.waterReservoirMl.toFixed(0)} mL`;

  document.getElementById('kpi-desi').textContent = `${r.shippingDesi.toFixed(2)} Desi`;
  document.getElementById('kpi-box-cm').textContent =
    `Kutu: ${r.boxCm.w.toFixed(1)} × ${r.boxCm.l.toFixed(1)} × ${r.boxCm.h.toFixed(1)} cm`;

  document.getElementById('kpi-mass').textContent = `${Math.round(r.totalPrintMassG)} g`;
  document.getElementById('kpi-mass-split').textContent =
    `Saksı: ${Math.round(r.planter.printMassG)}g | Tabak: ${Math.round(r.tray.printMassG)}g (~${r.estPrintHours.toFixed(1)} sa)`;

  document.getElementById('kpi-overhang').textContent = `${d.peakOverhangDeg.toFixed(1)}° ≤ 45°`;
  document.getElementById('kpi-triangles').textContent =
    `${(r.planter.triangleCount + r.tray.triangleCount).toLocaleString('tr-TR')} üçgen | Su Geçirmez`;

  // S / M / L Family Table
  const smlTbody = document.getElementById('sml-summary-tbody');
  smlTbody.innerHTML = currentSmlReports
    .map(
      (item) => `
      <tr class="clickable-row" data-sml-load="${item.sizeKey}" title="${item.sizeKey} boyutunu yükle">
        <td><strong>${item.sizeKey}</strong></td>
        <td>Ø${Math.round(item.report.dims.D)}×${Math.round(item.report.dims.H)}</td>
        <td>${item.report.soilVolUsableL.toFixed(2)} L</td>
        <td>${item.report.shippingDesi.toFixed(2)} Desi</td>
        <td>${Math.round(item.report.totalPrintMassG)} g</td>
      </tr>`
    )
    .join('');

  smlTbody.querySelectorAll('tr[data-sml-load]').forEach((row) => {
    row.addEventListener('click', () => applyPreset(row.dataset.smlLoad, false));
  });

  updateEcommerceTableUI();
}

function updateEcommerceTableUI() {
  if (!currentReport) return;
  const econRes = computeEcommerceProfitRows(currentReport, state.econ);

  const saleInput = document.getElementById('inp-sale-price');
  if (!state.econ.salePriceOverride) {
    saleInput.placeholder = `Oto: ${econRes.autoSuggestedSaleTl} ₺`;
  }

  document.getElementById('econ-cogs-summary').textContent =
    `Satış: ${econRes.salePriceTl.toFixed(0)} ₺ | Üretim (COGS): ${econRes.totalUnitCogsTl.toFixed(1)} ₺ | Kargo: ${econRes.shippingTl.toFixed(0)} ₺`;

  const tbody = document.getElementById('econ-tbody');
  tbody.innerHTML = econRes.rows
    .map((row) => {
      const cls = row.netProfitTl >= 0 ? 'profit-pos' : 'profit-neg';
      const shortName = row.channelName.replace(' Pazaryeri', '').replace(' (ikas/Shopify + iyzico)', '');
      return `
        <tr>
          <td>${shortName}</td>
          <td>%${row.commPct.toFixed(1)}</td>
          <td class="${cls}">${row.netProfitTl.toFixed(1)} ₺</td>
          <td class="${cls}">%${row.profitMarginPct.toFixed(1)}</td>
        </tr>`;
    })
    .join('');
}

// --- 6. CAMERA VIEWS & RESIZE ---
function syncOrthoFrustum() {
  const w = stageEl.clientWidth || 800;
  const h = stageEl.clientHeight || 600;
  const aspect = w / h;
  const dist = activeCamera.position.distanceTo(controls.target);
  const halfH = Math.max(80, dist * Math.tan(THREE.MathUtils.degToRad(perspCam.fov * 0.5)));
  orthoCam.left = -halfH * aspect;
  orthoCam.right = halfH * aspect;
  orthoCam.top = halfH;
  orthoCam.bottom = -halfH;
  orthoCam.updateProjectionMatrix();
}

function handleResize() {
  const w = stageEl.clientWidth;
  const h = stageEl.clientHeight;
  if (w <= 0 || h <= 0) return;
  renderer.setSize(w, h, false);
  perspCam.aspect = w / h;
  perspCam.updateProjectionMatrix();
  syncOrthoFrustum();
}

window.addEventListener('resize', handleResize);

function setStandardView(viewName) {
  const hMid = currentReport ? currentReport.assembledHeightMm * 0.48 : 80;
  const dist = state.assemblyMode === 'sml' ? 680 : Math.max(290, (currentReport?.dims.D || 140) * 2.35);
  controls.target.set(0, state.assemblyMode === 'sml' ? 85 : hMid, 0);

  if (viewName === 'iso') activeCamera.position.set(dist * 0.72, hMid + dist * 0.52, dist * 0.82);
  else if (viewName === 'front') activeCamera.position.set(0, hMid, dist * 1.15);
  else if (viewName === 'right') activeCamera.position.set(dist * 1.15, hMid, 0);
  else if (viewName === 'top') activeCamera.position.set(0, dist * 1.35, 0.01);
  else if (viewName === 'bottom') activeCamera.position.set(0, -dist * 1.15, 0.01);

  if (state.isOrtho) syncOrthoFrustum();
  controls.update();
}

// --- 7. DOM EVENT WIRING ---
function syncInputsFromState() {
  PARAM_KEYS.forEach((key) => {
    const numEl = document.getElementById(`num-${key}`);
    const rngEl = document.getElementById(`rng-${key}`);
    if (numEl) numEl.value = state.params[key];
    if (rngEl) rngEl.value = state.params[key];
  });
}

function applyPreset(presetKey, exitSmlMode = false) {
  const preset = PRESET_CONFIGS[presetKey];
  if (!preset) return;
  PARAM_KEYS.forEach((k) => {
    if (preset[k] !== undefined) state.params[k] = preset[k];
  });
  if (exitSmlMode && state.assemblyMode === 'sml') {
    state.assemblyMode = 'assembled';
    document.querySelectorAll('#assembly-mode-group .seg-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.asm === 'assembled');
    });
  }
  document.querySelectorAll('.preset-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.preset === presetKey);
  });
  syncInputsFromState();
  rebuildAll();
  setStandardView('iso');
}

// Debounced geometry rebuild for ultra-responsive slider scrubbing
let rebuildRaf = 0;
function scheduleRebuild() {
  if (rebuildRaf) cancelAnimationFrame(rebuildRaf);
  rebuildRaf = requestAnimationFrame(() => {
    rebuildRaf = 0;
    rebuildAll();
  });
}

PARAM_KEYS.forEach((key) => {
  const numEl = document.getElementById(`num-${key}`);
  const rngEl = document.getElementById(`rng-${key}`);

  rngEl.addEventListener('input', () => {
    state.params[key] = Number(rngEl.value);
    numEl.value = rngEl.value;
    scheduleRebuild();
  });

  numEl.addEventListener('change', () => {
    const min = Number(rngEl.min);
    const max = Number(rngEl.max);
    const val = Math.max(min, Math.min(max, Number(numEl.value) || min));
    state.params[key] = val;
    numEl.value = val;
    rngEl.value = val;
    scheduleRebuild();
  });
});

document.querySelectorAll('.preset-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset, false));
});

document.getElementById('btn-reset-params').addEventListener('click', () => applyPreset('M', true));

// Material & Swatches
document.getElementById('sel-material').addEventListener('change', (e) => {
  state.materialKey = e.target.value;
  rebuildAll();
});

document.querySelectorAll('#swatch-group .swatch').forEach((sw) => {
  sw.addEventListener('click', () => {
    state.finishKey = sw.dataset.finish;
    document.querySelectorAll('#swatch-group .swatch').forEach((b) => b.classList.remove('active'));
    sw.classList.add('active');
    rebuildAll();
  });
});

// Assembly Mode Switcher
document.querySelectorAll('#assembly-mode-group .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.assemblyMode = btn.dataset.asm;
    document.querySelectorAll('#assembly-mode-group .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    if (state.assemblyMode === 'sml') {
      rebuildSmlLineup3D();
      syncAssemblyVisibilityAndTargets();
      setStandardView('iso');
    } else {
      syncAssemblyVisibilityAndTargets();
      if (state.assemblyMode === 'tray') setStandardView('iso');
    }
  });
});

// Display Mode Switcher
document.querySelectorAll('#display-mode-group .seg-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.displayMode = btn.dataset.disp;
    document.querySelectorAll('#display-mode-group .seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    rebuildAll();
  });
});

// Camera Projection & Views
document.getElementById('btn-cam-proj').addEventListener('click', (e) => {
  state.isOrtho = !state.isOrtho;
  const prevPos = activeCamera.position.clone();
  activeCamera = state.isOrtho ? orthoCam : perspCam;
  activeCamera.position.copy(prevPos);
  controls.object = activeCamera;
  if (state.isOrtho) syncOrthoFrustum();
  controls.update();
  e.currentTarget.textContent = state.isOrtho ? 'ORTOGRAFİK' : 'PERSPEKTİF';
  e.currentTarget.classList.toggle('active', state.isOrtho);
});

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => setStandardView(btn.dataset.view));
});

// Cross-Section Controls
const chkSection = document.getElementById('chk-section');
const rngSection = document.getElementById('rng-section-offset');
const selSectionAxis = document.getElementById('sel-section-axis');
const lblSectionVal = document.getElementById('lbl-section-val');

chkSection.addEventListener('change', () => {
  state.sectionEnabled = chkSection.checked;
  rngSection.disabled = !state.sectionEnabled;
  updateClippingPlane();
});

selSectionAxis.addEventListener('change', () => {
  state.sectionAxis = selSectionAxis.value;
  updateClippingPlane();
});

rngSection.addEventListener('input', () => {
  state.sectionOffset = Number(rngSection.value);
  lblSectionVal.textContent = `${state.sectionOffset.toFixed(1)} mm`;
  updateClippingPlane();
});

// Theme Toggle (Obsidian Dark / Warm Archival Paper)
document.getElementById('btn-theme-toggle').addEventListener('click', (e) => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  e.currentTarget.textContent = state.theme === 'dark' ? 'TEMA: OBSİDYEN' : 'TEMA: ARŞİV KAĞIDI';
  rebuildAll();
});

// E-Commerce Inputs
document.getElementById('inp-sale-price').addEventListener('input', (e) => {
  state.econ.salePriceOverride = Number(e.target.value) || 0;
  updateEcommerceTableUI();
});
document.getElementById('inp-filament-kg').addEventListener('input', (e) => {
  state.econ.filamentKgPrice = Number(e.target.value) || 480;
  updateEcommerceTableUI();
});
document.getElementById('inp-pack-cost').addEventListener('input', (e) => {
  state.econ.packagingCost = Number(e.target.value) || 22;
  updateEcommerceTableUI();
});

// Exporters: Separate Planter & Tray .STL, Imalat_Anteti .SVG, E-Commerce .CSV + Bonus Formats
document.getElementById('btn-stl-planter').addEventListener('click', () => {
  if (currentPlanter && currentReport) exportPlanterSTL(currentPlanter.manifoldGeom, currentReport);
});

document.getElementById('btn-stl-tray').addEventListener('click', () => {
  if (currentTray && currentReport) exportTraySTL(currentTray.manifoldGeom, currentReport);
});

const svgModal = document.getElementById('svg-modal');
const svgPreviewContainer = document.getElementById('svg-preview-container');

document.getElementById('btn-svg-preview').addEventListener('click', () => {
  if (!currentReport) return;
  svgPreviewContainer.innerHTML = generateImalatAntetiSVG(currentReport, currentSmlReports);
  svgModal.classList.remove('hidden');
});

document.getElementById('btn-modal-download-svg').addEventListener('click', () => {
  if (currentReport) exportImalatAntetiSVG(currentReport, currentSmlReports);
});

document.getElementById('btn-modal-close').addEventListener('click', () => {
  svgModal.classList.add('hidden');
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') svgModal.classList.add('hidden');
});

document.getElementById('btn-csv-export').addEventListener('click', () => {
  if (currentReport) exportEcommerceCSV(currentReport, currentSmlReports, state.econ);
});

document.getElementById('btn-exp-obj').addEventListener('click', () => {
  if (currentPlanter && currentTray && currentReport) {
    exportAssemblyOBJ(currentPlanter.manifoldGeom, currentTray.manifoldGeom, currentReport);
  }
});

document.getElementById('btn-exp-glb').addEventListener('click', () => {
  if (planterMesh && trayMesh && currentReport) {
    exportAssemblyGLB(planterMesh, trayMesh, currentReport);
  }
});

document.getElementById('btn-exp-dxf').addEventListener('click', () => {
  if (currentReport) exportProfileDXF(currentReport);
});

document.getElementById('btn-exp-scad').addEventListener('click', () => {
  if (currentReport) exportParametricSCAD(currentReport);
});

// --- 8. RENDER LOOP ---
const clock = new THREE.Clock();
const projVec = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Smooth exponential damping for twist-lock assembly/explosion choreography
  anim.curLiftY = damp(anim.curLiftY, anim.targetLiftY, 8.5, dt);
  anim.curTwistY = damp(anim.curTwistY, anim.targetTwistY, 8.5, dt);

  planterRigGroup.position.y = anim.curLiftY;
  planterRigGroup.rotation.y = anim.curTwistY;

  controls.update();
  if (state.isOrtho) syncOrthoFrustum();

  // Project 3D S/M/L badges onto screen coordinates
  if (state.assemblyMode === 'sml' && smlAnchors.length) {
    const w = stageEl.clientWidth;
    const h = stageEl.clientHeight;
    smlAnchors.forEach((a) => {
      projVec.copy(a.worldPos).project(activeCamera);
      const sx = (projVec.x * 0.5 + 0.5) * w;
      const sy = (-projVec.y * 0.5 + 0.5) * h;
      a.el.style.left = `${sx}px`;
      a.el.style.top = `${sy}px`;
      a.el.style.display = projVec.z > 1 ? 'none' : 'block';
    });
  }

  renderer.render(scene, activeCamera);
}

// Boot
syncInputsFromState();
handleResize();
rebuildAll();
anim.curLiftY = anim.targetLiftY;
setStandardView('iso');
animate();
