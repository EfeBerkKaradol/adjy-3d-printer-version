import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  MATERIALS,
  DESIGN_STYLES,
  PRESETS,
  deriveClampDimensions,
  buildCBodyWithHelicalJaw,
  buildTrapezoidalScrew,
  buildSwivelPad,
  computeMeshMetrology,
  computeStructuralAndCostMetrics
} from './geometry-engine.js';

import {
  exportPartSTL,
  exportOBJPlatter,
  exportGLBScene,
  exportProfileDXF,
  exportOpenSCAD,
  generateImalatAntetiSVG,
  exportImalatAntetiSVG,
  exportLoadAndCostCSV
} from './exporters.js';

// ============================================================================
// APPLICATION STATE
// ============================================================================
const PARAM_KEYS = [
  'Maks_Masa_Kalinligi_mm',
  'Kelepce_Et_Kalinligi_mm',
  'Aparat_Eni_mm',
  'Ic_Kose_Radyus_mm',
  'Basilir_Vida_Capi_mm',
  'Dis_Bosluk_Toleransi_mm',
  'Aski_Kolu_Uzunlugu_mm',
  'Alt_J_Derinlik_mm'
];

const state = {
  Tasarim_Stili: 'cift_katli_j_kanca',
  Maks_Masa_Kalinligi_mm: 42,
  Kelepce_Et_Kalinligi_mm: 10,
  Aparat_Eni_mm: 30,
  Ic_Kose_Radyus_mm: 6,
  Basilir_Vida_Capi_mm: 16,
  Dis_Bosluk_Toleransi_mm: 0.25,
  Aski_Kolu_Uzunlugu_mm: 65,
  Alt_J_Derinlik_mm: 58,

  Sikma_Pozisyonu_pct: 78,
  Malzeme: 'petg',
  Doluluk_Orani_pct: 40,
  Duvar_Sayisi: 4,
  Filament_Kg_Fiyati_TL: 680,

  viewMode: 'assembled',      // 'assembled' | 'printbed'
  projection: 'perspective',  // 'perspective' | 'orthographic'
  displayMode: 'shaded',      // 'shaded' | 'blueprint' | 'xray' | 'wireframe'
  clipAxis: 'none',           // 'none' | 'z' | 'x' | 'y'
  clipOffset: 0,
  showDeskPreview: true,
  exploded: false
};

// ============================================================================
// THREE.JS STUDIO & DUAL-CAMERA CAD VIEWPORT
// ============================================================================
const canvas = document.getElementById('webgl-canvas');
const stageEl = canvas.parentElement;

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
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
scene.environmentIntensity = 0.85;
pmrem.dispose();

// Multi-Point Industrial Product Photography Lighting
const hemiLight = new THREE.HemisphereLight(0xfffaf2, 0xc7bfb0, 0.58);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
keyLight.position.set(125, 175, 145);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 10;
keyLight.shadow.camera.far = 550;
const sBound = 165;
keyLight.shadow.camera.left = -sBound;
keyLight.shadow.camera.right = sBound;
keyLight.shadow.camera.top = sBound;
keyLight.shadow.camera.bottom = -sBound;
keyLight.shadow.bias = -0.0004;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xeef4ff, 0.85);
rimLight.position.set(-140, 80, -125);
scene.add(rimLight);

const underFill = new THREE.DirectionalLight(0xffe7d0, 0.45);
underFill.position.set(40, -130, 90);
scene.add(underFill);

// Perspective & Orthographic Cameras
const perspCamera = new THREE.PerspectiveCamera(35, 1, 1, 2200);
perspCamera.position.set(145, 72, 195);

const orthoFrustum = 165;
const orthoCamera = new THREE.OrthographicCamera(-orthoFrustum, orthoFrustum, orthoFrustum, -orthoFrustum, -1000, 2200);
orthoCamera.position.copy(perspCamera.position);

let activeCamera = perspCamera;

const controls = new OrbitControls(activeCamera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(16, -34, 0);
controls.update();

// ============================================================================
// CLIPPING PLANE & VISUAL HELPERS (PEI BUILD PLATE, GHOST DESK)
// ============================================================================
const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

const clipPlaneVisual = new THREE.Mesh(
  new THREE.PlaneGeometry(230, 230),
  new THREE.MeshBasicMaterial({
    color: 0xd9381e,
    transparent: true,
    opacity: 0.07,
    side: THREE.DoubleSide,
    depthWrite: false
  })
);
const clipPlaneBorder = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.PlaneGeometry(230, 230)),
  new THREE.LineBasicMaterial({ color: 0xd9381e, transparent: true, opacity: 0.55 })
);
clipPlaneVisual.add(clipPlaneBorder);
clipPlaneVisual.visible = false;
scene.add(clipPlaneVisual);

// Print Bed Group (256 × 256 mm PEI Build Plate at Y = 0)
const printBedGroup = new THREE.Group();
const bedPlateGeom = new THREE.PlaneGeometry(256, 256);
bedPlateGeom.rotateX(-Math.PI * 0.5);
const bedPlateMat = new THREE.MeshStandardMaterial({
  color: 0xdad3c3,
  roughness: 0.84,
  metalness: 0.06,
  transparent: true,
  opacity: 0.76
});
const bedPlateMesh = new THREE.Mesh(bedPlateGeom, bedPlateMat);
bedPlateMesh.position.y = -0.15;
bedPlateMesh.receiveShadow = true;
printBedGroup.add(bedPlateMesh);

const bedGrid = new THREE.GridHelper(256, 16, 0x141413, 0x9b9485);
bedGrid.position.y = 0.02;
bedGrid.material.transparent = true;
bedGrid.material.opacity = 0.42;
printBedGroup.add(bedGrid);
printBedGroup.visible = false;
scene.add(printBedGroup);

// Assembled Reference Grid
const studioGrid = new THREE.GridHelper(260, 26, 0x8d877a, 0xc7c0b1);
studioGrid.position.y = -110;
studioGrid.material.transparent = true;
studioGrid.material.opacity = 0.35;
scene.add(studioGrid);

// Ghost Desk Preview Mesh (Translucent Architectural Oak Slab)
const ghostDeskGroup = new THREE.Group();
const ghostDeskMat = new THREE.MeshPhysicalMaterial({
  color: 0xc8a97e,
  roughness: 0.52,
  metalness: 0.0,
  transparent: true,
  opacity: 0.35,
  depthWrite: false
});
const ghostDeskEdgeMat = new THREE.LineBasicMaterial({
  color: 0x6e5636,
  transparent: true,
  opacity: 0.52
});
let ghostDeskMesh = null;
let ghostDeskEdges = null;
scene.add(ghostDeskGroup);

// ============================================================================
// PART WRAPPERS & TACTILE INDUSTRIAL MATERIALS
// ============================================================================
const assemblyRoot = new THREE.Group();
scene.add(assemblyRoot);

const bodyWrapper = new THREE.Group();
const screwWrapper = new THREE.Group();
const padWrapper = new THREE.Group();
assemblyRoot.add(bodyWrapper, screwWrapper, padWrapper);

let layerFlowLines = null;

const targetPoses = {
  bodyPos: new THREE.Vector3(),
  bodyQuat: new THREE.Quaternion(),
  screwPos: new THREE.Vector3(),
  screwQuat: new THREE.Quaternion(),
  padPos: new THREE.Vector3(),
  padQuat: new THREE.Quaternion(),
  camTarget: new THREE.Vector3(16, -34, 0)
};

let currentGeometries = { body: null, screw: null, pad: null };
let currentMeshes = { body: null, screw: null, pad: null };
let currentEdges = { body: null, screw: null, pad: null };
let currentDim = null;
let currentMetrology = null;
let currentMetrics = null;
let poseInitialized = false;

const matBody = new THREE.MeshPhysicalMaterial({
  color: 0x242629,
  roughness: 0.36,
  metalness: 0.12,
  clearcoat: 0.15,
  clearcoatRoughness: 0.38,
  side: THREE.DoubleSide
});
const matScrew = new THREE.MeshPhysicalMaterial({
  color: 0xd9381e,
  roughness: 0.32,
  metalness: 0.10,
  clearcoat: 0.18,
  clearcoatRoughness: 0.32,
  side: THREE.DoubleSide
});
const matPad = new THREE.MeshPhysicalMaterial({
  color: 0x454a50,
  roughness: 0.38,
  metalness: 0.16,
  clearcoat: 0.12,
  clearcoatRoughness: 0.4,
  side: THREE.DoubleSide
});

const edgeLineMat = new THREE.LineBasicMaterial({
  color: 0x141413,
  transparent: true,
  opacity: 0.20
});

function applyDisplayAndClippingState() {
  const activePlanes = state.clipAxis === 'none' ? [] : [clipPlane];
  if (state.clipAxis === 'z') {
    clipPlane.set(new THREE.Vector3(0, 0, -1), state.clipOffset);
    clipPlaneVisual.rotation.set(0, 0, 0);
    clipPlaneVisual.position.set(14, -30, state.clipOffset);
  } else if (state.clipAxis === 'x') {
    clipPlane.set(new THREE.Vector3(-1, 0, 0), state.clipOffset);
    clipPlaneVisual.rotation.set(0, Math.PI * 0.5, 0);
    clipPlaneVisual.position.set(state.clipOffset, -30, 0);
  } else if (state.clipAxis === 'y') {
    clipPlane.set(new THREE.Vector3(0, -1, 0), state.clipOffset);
    clipPlaneVisual.rotation.set(Math.PI * 0.5, 0, 0);
    clipPlaneVisual.position.set(14, state.clipOffset, 0);
  }
  clipPlaneVisual.visible = state.clipAxis !== 'none';

  const matInfo = MATERIALS[state.Malzeme] || MATERIALS.petg;
  const baseBodyColor = matInfo.colorHex;
  const isMetal = state.Malzeme === 'alu6061' || state.Malzeme === 'ss304';

  [
    { mat: matBody, baseHex: baseBodyColor },
    { mat: matScrew, baseHex: 0xd9381e },
    { mat: matPad, baseHex: 0x4b5057 }
  ].forEach(({ mat, baseHex }) => {
    mat.clippingPlanes = activePlanes;
    mat.clipShadows = true;

    if (state.displayMode === 'blueprint') {
      mat.color.setHex(0xf6f3ec);
      mat.roughness = 0.96;
      mat.metalness = 0.0;
      mat.clearcoat = 0.0;
      mat.transparent = false;
      mat.opacity = 1.0;
      mat.depthWrite = true;
      mat.wireframe = false;
    } else if (state.displayMode === 'xray') {
      mat.color.setHex(baseHex);
      mat.roughness = 0.32;
      mat.metalness = 0.1;
      mat.clearcoat = 0.0;
      mat.transparent = true;
      mat.opacity = 0.34;
      mat.depthWrite = false;
      mat.wireframe = false;
    } else if (state.displayMode === 'wireframe') {
      mat.color.setHex(0x141413);
      mat.clearcoat = 0.0;
      mat.transparent = false;
      mat.opacity = 1.0;
      mat.depthWrite = true;
      mat.wireframe = true;
    } else {
      mat.color.setHex(baseHex);
      mat.roughness = isMetal ? 0.24 : 0.35;
      mat.metalness = isMetal ? 0.80 : 0.12;
      mat.clearcoat = isMetal ? 0.05 : 0.15;
      mat.transparent = false;
      mat.opacity = 1.0;
      mat.depthWrite = true;
      mat.wireframe = false;
    }
    mat.needsUpdate = true;
  });

  edgeLineMat.clippingPlanes = activePlanes;
  edgeLineMat.opacity = state.displayMode === 'blueprint' ? 0.92 : state.displayMode === 'wireframe' ? 0.0 : 0.20;
  Object.values(currentEdges).forEach((edgeObj) => {
    if (edgeObj) edgeObj.visible = state.displayMode !== 'wireframe';
  });
}

// ============================================================================
// GEOMETRY REBUILD & EXACT HELICAL PHASE-LOCKING
// ============================================================================
function disposeMeshPair(wrapper, key) {
  if (currentMeshes[key]) {
    wrapper.remove(currentMeshes[key]);
    currentMeshes[key] = null;
  }
  if (currentEdges[key]) {
    wrapper.remove(currentEdges[key]);
    currentEdges[key].geometry.dispose();
    currentEdges[key] = null;
  }
  if (currentGeometries[key]) {
    currentGeometries[key].dispose();
    currentGeometries[key] = null;
  }
}

function buildLayerFlowIndicator(dim, bodyGeom) {
  if (layerFlowLines) {
    bodyWrapper.remove(layerFlowLines);
    layerFlowLines.geometry.dispose();
    layerFlowLines.material.dispose();
    layerFlowLines = null;
  }

  // Trace actual inset perimeter contour on top face in Print Bed Mode so continuous XY fiber loops are visible around R6 & J-Hook!
  const outerPts = bodyGeom.userData && bodyGeom.userData.outerPts;
  if (!outerPts || outerPts.length < 4) return;

  const zFace = -dim.width * 0.5 - 0.15;
  const pts = outerPts.map((p) => new THREE.Vector3(p.x, p.y, zFace));
  pts.push(pts[0].clone());

  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({ color: 0x1f6e43, transparent: true, opacity: 0.85 });
  layerFlowLines = new THREE.Line(g, m);
  layerFlowLines.visible = state.viewMode === 'printbed';
  bodyWrapper.add(layerFlowLines);
}

function rebuildGhostDesk(dim, padTopY) {
  if (ghostDeskMesh) {
    ghostDeskGroup.remove(ghostDeskMesh);
    ghostDeskMesh.geometry.dispose();
    ghostDeskMesh = null;
  }
  if (ghostDeskEdges) {
    ghostDeskGroup.remove(ghostDeskEdges);
    ghostDeskEdges.geometry.dispose();
    ghostDeskEdges = null;
  }

  const effectiveDeskT = Math.max(12, Math.min(dim.maxDesk, -padTopY));
  const deskDepth = dim.jawReach + 36;
  const deskWidth = Math.max(dim.width + 60, 96);

  const g = new THREE.BoxGeometry(deskDepth, effectiveDeskT, deskWidth);
  g.translate(-deskDepth * 0.5 - 0.15, -effectiveDeskT * 0.5 - 0.08, 0);

  ghostDeskMesh = new THREE.Mesh(g, ghostDeskMat);
  ghostDeskEdges = new THREE.LineSegments(new THREE.EdgesGeometry(g), ghostDeskEdgeMat);
  ghostDeskGroup.add(ghostDeskMesh, ghostDeskEdges);

  ghostDeskGroup.visible = state.viewMode === 'assembled' && state.showDeskPreview && !state.exploded;
}

function updatePoseTargets() {
  if (!currentDim || !currentGeometries.screw || !currentGeometries.pad) return;
  const dim = currentDim;

  const clampFrac = THREE.MathUtils.clamp(state.Sikma_Pozisyonu_pct / 100, 0, 1);
  const yPadRetracted = dim.yJawTop + dim.padBaseH + dim.padSocketH + 1.2;
  const yPadMax = -dim.minClampedDesk;
  const padTopY = THREE.MathUtils.lerp(yPadRetracted, yPadMax, clampFrac);

  rebuildGhostDesk(dim, padTopY);

  if (state.viewMode === 'printbed') {
    printBedGroup.visible = true;
    studioGrid.visible = false;
    if (layerFlowLines) layerFlowLines.visible = true;

    // 1. C-Body + J-Hook flat on its side at Y_world = 0
    targetPoses.bodyQuat.setFromEuler(new THREE.Euler(Math.PI * 0.5, 0, 0));
    targetPoses.bodyPos.set(-22, dim.width * 0.5, 28);

    // 2. 60° Trapezoidal Screw knob-down at Y_world = 0
    targetPoses.screwQuat.setFromEuler(new THREE.Euler(0, 0, 0));
    targetPoses.screwPos.set(dim.wallT + dim.armLen + 28, 0, -24);

    // 3. Swivel Pad flat face-down at Y_world = 0
    targetPoses.padQuat.setFromEuler(new THREE.Euler(Math.PI, 0, 0));
    targetPoses.padPos.set(dim.wallT + dim.armLen + 28, 0, 26);

    targetPoses.camTarget.set(16, 12, 6);
  } else {
    printBedGroup.visible = false;
    studioGrid.visible = true;
    if (layerFlowLines) layerFlowLines.visible = false;

    const explodePadOffset = state.exploded ? 12.0 : 0.0;
    const explodeScrewDrop = state.exploded ? -32.0 : 0.0;

    targetPoses.bodyQuat.identity();
    targetPoses.bodyPos.set(0, 0, 0);

    targetPoses.padQuat.identity();
    targetPoses.padPos.set(dim.xScrew, padTopY + explodePadOffset, 0);

    const ySocketCenter = currentGeometries.pad.userData.ySocketCenter;
    const yBallCenter = currentGeometries.screw.userData.yBallCenter;
    const yThreadStart = currentGeometries.screw.userData.yThreadStart;

    const screwWorldY = padTopY + ySocketCenter - yBallCenter + explodeScrewDrop;
    const screwRotY = (Math.PI * 2 * (screwWorldY + yThreadStart)) / dim.pitch;

    targetPoses.screwQuat.setFromEuler(new THREE.Euler(0, screwRotY, 0));
    targetPoses.screwPos.set(dim.xScrew, screwWorldY, 0);

    targetPoses.camTarget.set(16, dim.yJawTop * 0.52, 0);
  }

  if (!poseInitialized) {
    bodyWrapper.position.copy(targetPoses.bodyPos);
    bodyWrapper.quaternion.copy(targetPoses.bodyQuat);
    screwWrapper.position.copy(targetPoses.screwPos);
    screwWrapper.quaternion.copy(targetPoses.screwQuat);
    padWrapper.position.copy(targetPoses.padPos);
    padWrapper.quaternion.copy(targetPoses.padQuat);
    controls.target.copy(targetPoses.camTarget);
    poseInitialized = true;
  }
}

function rebuildAllCADGeometry() {
  currentDim = deriveClampDimensions(state);

  disposeMeshPair(bodyWrapper, 'body');
  disposeMeshPair(screwWrapper, 'screw');
  disposeMeshPair(padWrapper, 'pad');

  currentGeometries.body = buildCBodyWithHelicalJaw(state);
  currentGeometries.screw = buildTrapezoidalScrew(state);
  currentGeometries.pad = buildSwivelPad(state);

  const pairs = [
    { key: 'body', wrapper: bodyWrapper, mat: matBody },
    { key: 'screw', wrapper: screwWrapper, mat: matScrew },
    { key: 'pad', wrapper: padWrapper, mat: matPad }
  ];

  pairs.forEach(({ key, wrapper, mat }) => {
    const geom = currentGeometries[key];
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    wrapper.add(mesh);
    currentMeshes[key] = mesh;

    const edgesGeom = new THREE.EdgesGeometry(geom, 32);
    const edges = new THREE.LineSegments(edgesGeom, edgeLineMat);
    wrapper.add(edges);
    currentEdges[key] = edges;
  });

  buildLayerFlowIndicator(currentDim, currentGeometries.body);

  const bodyBB = currentGeometries.body.boundingBox;
  studioGrid.position.y = Math.min(currentDim.yJawBot - 32, bodyBB.min.y - 24);

  currentMetrology = {
    body: computeMeshMetrology(currentGeometries.body),
    screw: computeMeshMetrology(currentGeometries.screw),
    pad: computeMeshMetrology(currentGeometries.pad)
  };

  // Toggle visibility of J-hook specific UI rows when single upper cradle is selected
  const hasJ = currentDim.hasLowerJ;
  document.getElementById('row-Alt_J_Derinlik_mm').hidden = !hasJ;
  document.getElementById('tel-jhook-row').hidden = !hasJ;

  refreshEngineeringReadouts();
  applyDisplayAndClippingState();
  updatePoseTargets();
}

// ============================================================================
// TELEMETRY, STRENGTH & DFM UI SYNCHRONIZATION
// ============================================================================
function refreshEngineeringReadouts() {
  if (!currentMetrology) return;
  currentMetrics = computeStructuralAndCostMetrics(state, currentMetrology);
  const m = currentMetrics;
  const dim = m.dim;

  const badgeEl = document.getElementById('dfm-status-badge');
  const fixBtn = document.getElementById('btn-auto-fix-dfm');
  if (dim.widthWarning) {
    badgeEl.className = 'status-badge warn';
    badgeEl.textContent = `UYARI: VİDA ÇAPI APARAT ENİNİ ZORLUYOR (ETKİN Ø${dim.screwD.toFixed(1)}mm)`;
    fixBtn.hidden = false;
  } else if (dim.innerR < 3.5) {
    badgeEl.className = 'status-badge warn';
    badgeEl.textContent = `DİKKAT: DÜŞÜK İÇ RADYUS (R${dim.innerR.toFixed(1)}) — Kt=${m.kt.toFixed(2)}`;
    fixBtn.hidden = false;
  } else {
    badgeEl.className = 'status-badge pass';
    badgeEl.textContent = `%100 DESTEKSİZ FDM — 45° PAH + R${dim.innerR.toFixed(1)} KORUMALI`;
    fixBtn.hidden = true;
  }

  document.getElementById('hud-mode-tag').textContent =
    state.viewMode === 'printbed'
      ? '[ BASKI TABLASI MODU (Z=0) // YATAY LİF YÖNÜ ]'
      : '[ MONTAJ GÖRÜNÜMÜ // 1:1 MM ]';
  document.getElementById('hud-arch-tag').textContent = m.styleInfo.shortTag;
  document.getElementById('hud-thread-spec').textContent =
    `${dim.threadDesignation} — +${dim.clearance.toFixed(2)}mm Boşluk`;

  const bannerEl = document.getElementById('orientation-banner');
  if (state.viewMode === 'printbed') {
    bannerEl.innerHTML =
      `<strong>BASKI TABLASI AKTİF (Z=0):</strong> ${m.styleInfo.shortTag} yan yüzeyi tablaya yatırıldı; çevre filament lifleri R${dim.innerR.toFixed(1)} boğaz ve J-kancayı kesintisiz dönerek delaminasyonu önler (<strong>+%${m.orientationGainPct.toFixed(0)} dayanım</strong>).`;
  } else {
    bannerEl.innerHTML =
      `<strong>MÜHENDİSLİK ÖZETİ:</strong> 45° CNC çevre pahları + R${dim.innerR.toFixed(1)} radyus gerilmeyi <strong>-%${m.stressReductionPct.toFixed(0)}</strong> azaltır. Alt çenedeki +${dim.clearance.toFixed(2)}mm helisel yuva, 60° vidayı sıkışmadan kavrar.`;
  }

  document.getElementById('val-safe-load').textContent =
    `${m.safeLoadFlatKg.toFixed(1)} kg (${m.safeLoadFlatN.toFixed(0)} N)`;
  document.getElementById('val-yield-load').textContent =
    `Akma Sınırı: ${m.yieldLoadFlatKg.toFixed(1)} kg (SF ${m.safetyFactor.toFixed(1)})`;
  document.getElementById('val-delam-gain').textContent =
    `+%${m.orientationGainPct.toFixed(0)}`;
  document.getElementById('val-upright-load').textContent =
    `Dikey Baskı Sınırı: ${m.safeLoadUprightKg.toFixed(1)} kg`;

  document.getElementById('val-jhook-load').textContent =
    `${m.jHookSafeKg.toFixed(1)} kg (Eşmerkezli J)`;
  document.getElementById('val-kt-factor').textContent =
    `${m.kt.toFixed(2)} (-%${m.stressReductionPct.toFixed(0)} gerilme)`;
  document.getElementById('val-thread-profile').textContent =
    `Tr${Math.round(dim.screwD)}×${dim.pitch.toFixed(1)} (60°) | +${dim.clearance.toFixed(2)}mm`;
  document.getElementById('val-clamp-force').textContent =
    `${m.maxClampingForceN.toFixed(0)} N (${m.engagedThreadTurns.toFixed(1)} diş)`;
  document.getElementById('val-tip-deflection').textContent =
    `${m.tipDeflectionMm.toFixed(2)} mm`;

  const bb = m.parts.body.bbox;
  document.getElementById('val-bbox').textContent =
    `${bb.x.toFixed(1)} × ${bb.y.toFixed(1)} × ${bb.z.toFixed(1)} mm`;
  document.getElementById('val-body-mass').textContent =
    `${m.parts.body.printedMassG.toFixed(1)} g (${m.parts.body.volCm3.toFixed(1)} cm³)`;
  document.getElementById('val-screw-mass').textContent =
    `${m.parts.screw.printedMassG.toFixed(1)} g (${m.parts.screw.volCm3.toFixed(1)} cm³)`;
  document.getElementById('val-pad-mass').textContent =
    `${m.parts.pad.printedMassG.toFixed(1)} g (${m.parts.pad.volCm3.toFixed(1)} cm³)`;
  document.getElementById('val-total-cost').textContent =
    `${m.parts.total.printedMassG.toFixed(1)} g · ${m.parts.total.printMinutes} dk · ${m.parts.total.totalCostTL.toFixed(2)} ₺`;

  const modalEl = document.getElementById('antet-modal');
  if (!modalEl.hidden) {
    document.getElementById('antet-svg-container').innerHTML = generateImalatAntetiSVG(state, currentMetrics);
  }
}

// ============================================================================
// CAMERA VIEWS & PROJECTION SWITCHING
// ============================================================================
function updateViewportSize() {
  const w = stageEl.clientWidth || window.innerWidth;
  const h = stageEl.clientHeight || window.innerHeight;
  const aspect = w / Math.max(1, h);

  renderer.setSize(w, h);

  perspCamera.aspect = aspect;
  perspCamera.updateProjectionMatrix();

  orthoCamera.left = -orthoFrustum * aspect;
  orthoCamera.right = orthoFrustum * aspect;
  orthoCamera.top = orthoFrustum;
  orthoCamera.bottom = -orthoFrustum;
  orthoCamera.updateProjectionMatrix();
}

function setStandardCADView(viewName) {
  const t = targetPoses.camTarget.clone();
  const dist = 235;
  const pos = new THREE.Vector3();

  if (viewName === 'front') pos.set(t.x, t.y, t.z + dist);
  else if (viewName === 'right') pos.set(t.x + dist, t.y, t.z);
  else if (viewName === 'top') pos.set(t.x, t.y + dist, t.z + 0.01);
  else if (viewName === 'bottom') pos.set(t.x, t.y - dist, t.z + 0.01);
  else pos.set(t.x + 140, t.y + 88, t.z + 185);

  activeCamera.position.copy(pos);
  controls.target.copy(t);
  controls.update();
}

function switchCameraProjection(proj) {
  if (state.projection === proj) return;
  state.projection = proj;
  const prevCam = activeCamera;
  activeCamera = proj === 'orthographic' ? orthoCamera : perspCamera;
  activeCamera.position.copy(prevCam.position);
  activeCamera.quaternion.copy(prevCam.quaternion);
  controls.object = activeCamera;
  controls.update();
}

// ============================================================================
// UI EVENT BINDINGS
// ============================================================================
function syncInputsFromState() {
  document.querySelectorAll('.arch-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.style === state.Tasarim_Stili);
  });

  PARAM_KEYS.forEach((key) => {
    const rng = document.getElementById(`rng-${key}`);
    const num = document.getElementById(`num-${key}`);
    if (rng) rng.value = state[key];
    if (num) num.value = state[key];
  });
  document.getElementById('rng-Sikma_Pozisyonu_pct').value = state.Sikma_Pozisyonu_pct;
  document.getElementById('num-Sikma_Pozisyonu_pct').value = state.Sikma_Pozisyonu_pct;
  document.getElementById('sel-material').value = state.Malzeme;
  document.getElementById('num-Doluluk_Orani_pct').value = state.Doluluk_Orani_pct;
  document.getElementById('num-Filament_Kg_Fiyati_TL').value = state.Filament_Kg_Fiyati_TL;
  document.getElementById('chk-desk-preview').checked = state.showDeskPreview;
  document.getElementById('chk-exploded').checked = state.exploded;
}

// Architecture Style Cards
document.querySelectorAll('.arch-card').forEach((card) => {
  card.addEventListener('click', () => {
    const st = card.dataset.style;
    if (!DESIGN_STYLES[st]) return;
    state.Tasarim_Stili = st;
    syncInputsFromState();
    rebuildAllCADGeometry();
  });
});

// Parametric Sliders + Number Inputs
PARAM_KEYS.forEach((key) => {
  const rng = document.getElementById(`rng-${key}`);
  const num = document.getElementById(`num-${key}`);

  const handleParamChange = (val) => {
    const parsed = parseFloat(val);
    if (Number.isNaN(parsed)) return;
    state[key] = parsed;
    if (rng) rng.value = parsed;
    if (num) num.value = parsed;
    rebuildAllCADGeometry();
  };

  rng.addEventListener('input', (e) => handleParamChange(e.target.value));
  num.addEventListener('change', (e) => handleParamChange(e.target.value));
});

['rng-Sikma_Pozisyonu_pct', 'num-Sikma_Pozisyonu_pct'].forEach((id) => {
  document.getElementById(id).addEventListener('input', (e) => {
    const v = THREE.MathUtils.clamp(parseFloat(e.target.value) || 0, 0, 100);
    state.Sikma_Pozisyonu_pct = v;
    document.getElementById('rng-Sikma_Pozisyonu_pct').value = v;
    document.getElementById('num-Sikma_Pozisyonu_pct').value = v;
    updatePoseTargets();
  });
});

// Presets
document.getElementById('preset-selector').addEventListener('change', (e) => {
  const p = PRESETS[e.target.value];
  if (!p) return;
  state.Tasarim_Stili = p.Tasarim_Stili;
  PARAM_KEYS.forEach((k) => {
    if (p[k] !== undefined) state[k] = p[k];
  });
  syncInputsFromState();
  rebuildAllCADGeometry();
});

// Mode Switch
document.querySelectorAll('[data-mode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.viewMode = btn.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
    if (state.viewMode === 'printbed' && state.clipAxis === 'z') {
      setClipAxis('none');
    }
    ghostDeskGroup.visible = state.viewMode === 'assembled' && state.showDeskPreview && !state.exploded;
    refreshEngineeringReadouts();
    updatePoseTargets();
  });
});

document.querySelectorAll('[data-proj]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-proj]').forEach((b) => b.classList.toggle('active', b === btn));
    switchCameraProjection(btn.dataset.proj);
  });
});

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => setStandardCADView(btn.dataset.view));
});

document.querySelectorAll('[data-display]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.displayMode = btn.dataset.display;
    document.querySelectorAll('[data-display]').forEach((b) => b.classList.toggle('active', b === btn));
    applyDisplayAndClippingState();
  });
});

function setClipAxis(axis, offsetVal = 0) {
  state.clipAxis = axis;
  state.clipOffset = offsetVal;
  document.querySelectorAll('[data-clip]').forEach((b) => b.classList.toggle('active', b.dataset.clip === axis));
  const wrap = document.getElementById('clip-slider-wrap');
  wrap.hidden = axis === 'none';
  document.getElementById('rng-clip-offset').value = offsetVal;
  document.getElementById('val-clip-offset').textContent = `${offsetVal.toFixed(1)} mm`;
  applyDisplayAndClippingState();
}

document.querySelectorAll('[data-clip]').forEach((btn) => {
  btn.addEventListener('click', () => setClipAxis(btn.dataset.clip, 0));
});

document.getElementById('rng-clip-offset').addEventListener('input', (e) => {
  state.clipOffset = parseFloat(e.target.value) || 0;
  document.getElementById('val-clip-offset').textContent = `${state.clipOffset.toFixed(1)} mm`;
  applyDisplayAndClippingState();
});

document.getElementById('btn-inspect-thread-section').addEventListener('click', () => {
  if (state.viewMode !== 'assembled') {
    document.querySelector('[data-mode="assembled"]').click();
  }
  setClipAxis('z', 0);
  const dim = currentDim;
  const focusY = dim.yJawTop + 2;
  controls.target.set(dim.xScrew + 6, focusY, 0);
  activeCamera.position.set(dim.xScrew + 12, focusY + 6, 98);
  controls.update();
});

document.getElementById('btn-auto-fix-dfm').addEventListener('click', () => {
  if (state.Ic_Kose_Radyus_mm < 6) state.Ic_Kose_Radyus_mm = 6;
  const neededWidth = Math.ceil(state.Basilir_Vida_Capi_mm + 8 + state.Dis_Bosluk_Toleransi_mm * 2);
  if (state.Aparat_Eni_mm < neededWidth) {
    state.Aparat_Eni_mm = Math.min(50, neededWidth);
  }
  syncInputsFromState();
  rebuildAllCADGeometry();
});

document.getElementById('chk-desk-preview').addEventListener('change', (e) => {
  state.showDeskPreview = e.target.checked;
  updatePoseTargets();
});

document.getElementById('chk-exploded').addEventListener('change', (e) => {
  state.exploded = e.target.checked;
  updatePoseTargets();
});

document.getElementById('sel-material').addEventListener('change', (e) => {
  state.Malzeme = e.target.value;
  const mat = MATERIALS[state.Malzeme];
  if (mat) {
    state.Filament_Kg_Fiyati_TL = mat.defaultPriceTL;
    document.getElementById('num-Filament_Kg_Fiyati_TL').value = mat.defaultPriceTL;
  }
  applyDisplayAndClippingState();
  refreshEngineeringReadouts();
});

document.getElementById('num-Doluluk_Orani_pct').addEventListener('change', (e) => {
  state.Doluluk_Orani_pct = THREE.MathUtils.clamp(parseFloat(e.target.value) || 40, 15, 100);
  e.target.value = state.Doluluk_Orani_pct;
  refreshEngineeringReadouts();
});

document.getElementById('num-Filament_Kg_Fiyati_TL').addEventListener('change', (e) => {
  state.Filament_Kg_Fiyati_TL = Math.max(50, parseFloat(e.target.value) || 680);
  e.target.value = state.Filament_Kg_Fiyati_TL;
  refreshEngineeringReadouts();
});

document.getElementById('btn-reset-defaults').addEventListener('click', () => {
  Object.assign(state, PRESETS.cift_j_istasyon, {
    Sikma_Pozisyonu_pct: 78,
    Malzeme: 'petg',
    Doluluk_Orani_pct: 40,
    Filament_Kg_Fiyati_TL: 680,
    exploded: false,
    showDeskPreview: true
  });
  document.getElementById('preset-selector').value = 'cift_j_istasyon';
  syncInputsFromState();
  setClipAxis('none');
  rebuildAllCADGeometry();
});

// Exporters
document.getElementById('btn-stl-body').addEventListener('click', () =>
  exportPartSTL('body', currentGeometries, currentDim, assemblyRoot)
);
document.getElementById('btn-stl-screw').addEventListener('click', () =>
  exportPartSTL('screw', currentGeometries, currentDim, assemblyRoot)
);
document.getElementById('btn-stl-pad').addEventListener('click', () =>
  exportPartSTL('pad', currentGeometries, currentDim, assemblyRoot)
);
document.getElementById('btn-stl-platter').addEventListener('click', () =>
  exportPartSTL('platter', currentGeometries, currentDim, assemblyRoot)
);
document.getElementById('btn-stl-assembled').addEventListener('click', () =>
  exportPartSTL('assembled', currentGeometries, currentDim, assemblyRoot)
);

document.getElementById('btn-export-obj').addEventListener('click', () =>
  exportOBJPlatter(currentGeometries, currentDim)
);
document.getElementById('btn-export-glb').addEventListener('click', () =>
  exportGLBScene(assemblyRoot, currentDim)
);
document.getElementById('btn-export-dxf').addEventListener('click', () =>
  exportProfileDXF(currentDim)
);
document.getElementById('btn-export-scad').addEventListener('click', () =>
  exportOpenSCAD(state, currentDim)
);

const antetModal = document.getElementById('antet-modal');
document.getElementById('btn-preview-antet').addEventListener('click', () => {
  document.getElementById('antet-svg-container').innerHTML = generateImalatAntetiSVG(state, currentMetrics);
  antetModal.hidden = false;
});
document.getElementById('btn-close-antet').addEventListener('click', () => {
  antetModal.hidden = true;
});
antetModal.addEventListener('click', (e) => {
  if (e.target === antetModal) antetModal.hidden = true;
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !antetModal.hidden) antetModal.hidden = true;
});

document.getElementById('btn-export-svg').addEventListener('click', () =>
  exportImalatAntetiSVG(state, currentMetrics)
);
document.getElementById('btn-modal-download-svg').addEventListener('click', () =>
  exportImalatAntetiSVG(state, currentMetrics)
);

document.getElementById('btn-export-csv').addEventListener('click', () =>
  exportLoadAndCostCSV(state, currentMetrics, computeStructuralAndCostMetrics, currentMetrology)
);

// ============================================================================
// FRAME-RATE INDEPENDENT DAMPED RENDER LOOP
// ============================================================================
const clock = new THREE.Clock();
let fpsFrames = 0;
let fpsAccum = 0;
const fpsChip = document.getElementById('hud-fps');

function dampVec3(current, target, lambda, dt) {
  const alpha = 1 - Math.exp(-lambda * dt);
  current.lerp(target, alpha);
}

function dampQuat(current, target, lambda, dt) {
  const alpha = 1 - Math.exp(-lambda * dt);
  current.slerp(target, alpha);
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  dampVec3(bodyWrapper.position, targetPoses.bodyPos, 9.0, dt);
  dampQuat(bodyWrapper.quaternion, targetPoses.bodyQuat, 9.0, dt);

  dampVec3(screwWrapper.position, targetPoses.screwPos, 10.0, dt);
  dampQuat(screwWrapper.quaternion, targetPoses.screwQuat, 10.0, dt);

  dampVec3(padWrapper.position, targetPoses.padPos, 10.0, dt);
  dampQuat(padWrapper.quaternion, targetPoses.padQuat, 10.0, dt);

  controls.update();
  renderer.render(scene, activeCamera);

  fpsFrames++;
  fpsAccum += dt;
  if (fpsAccum >= 0.5) {
    fpsChip.textContent = `${Math.round(fpsFrames / fpsAccum)} FPS`;
    fpsFrames = 0;
    fpsAccum = 0;
  }
}

window.addEventListener('resize', updateViewportSize);

updateViewportSize();
syncInputsFromState();
rebuildAllCADGeometry();
animate();
