/**
 * ELEKTRO-KASA CAD // Ana 3B Sahne, DFM Telemetri ve Etkileşim Denetleyicisi
 * Standartlar: webgl-human-ux (PMREM RoomEnvironment, ACESFilmic, Exponential Damping)
 *              web-cad-modeler (1 birim = 1.00 mm, Persp/Orto, Kesit Düzlemi, Çoklu Format İhracat)
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  INSERT_SPECS,
  IO_PORT_PRESETS,
  ENCLOSURE_PRESETS,
  computeEnclosureSpec,
  buildBaseGeometry,
  buildLidGeometry,
  buildHardwareMeshes,
  computeMeshMetrology
} from './geometry-engine.js';

import {
  exportBaseSTL,
  exportLidSTL,
  calculateBOMSummary,
  exportBOMCSV,
  generateImalatAntetiSVG,
  exportImalatAntetiSVG,
  exportAssemblyGLB,
  exportAssemblyOBJ,
  exportProfileDXF,
  exportOpenSCAD
} from './exporters.js';

const damp = (current, target, lambda, dt) =>
  THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));

/* ============================================================================
 * 1. UYGULAMA DURUMU (STATE)
 * ========================================================================== */
const state = {
  params: structuredClone(ENCLOSURE_PRESETS.rpi_iot),
  materialKey: 'PETG',
  theme: 'dark',
  projection: 'persp', // 'persp' | 'ortho'
  displayMode: 'shaded', // 'shaded' | 'blueprint' | 'xray' | 'wireframe'
  explodeTarget: 0.28, // İlk açılışta montaj katmanlarını hafif aralık göstererek iç yapıyı sergile
  explodeCurrent: 0.0,
  visibility: {
    base: true,
    pcb: true,
    lid: true,
    hardware: true
  },
  section: {
    enabled: false,
    axis: 'z',
    offset: 0.0
  },
  currentSpec: null,
  baseGeometry: null,
  lidGeometry: null,
  baseMetro: null,
  lidMetro: null
};

/* ============================================================================
 * 2. THREE.JS WEBGL SAHNE & STÜDYO AYDINLATMA KURULUMU
 * ========================================================================== */
const canvas = document.querySelector('#webgl-canvas');
const viewportEl = document.querySelector('.viewport-stage');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

// Anahtar + Kenar Aydınlatması
const keyLight = new THREE.DirectionalLight(0xfff8ee, 1.45);
keyLight.position.set(110, 180, 120);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 20;
keyLight.shadow.camera.far = 500;
const dCam = 150;
keyLight.shadow.camera.left = -dCam;
keyLight.shadow.camera.right = dCam;
keyLight.shadow.camera.top = dCam;
keyLight.shadow.camera.bottom = -dCam;
keyLight.shadow.bias = -0.0004;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xdbe8ff, 0.65);
rimLight.position.set(-130, 90, -110);
scene.add(rimLight);

// Mühendislik Milimetrik Referans Izgarası (10mm ana kare, 200×200mm tabla)
const cadGrid = new THREE.GridHelper(240, 24, 0xe04f33, 0x2b2e36);
cadGrid.position.y = -0.08;
scene.add(cadGrid);

const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(320, 320),
  new THREE.ShadowMaterial({ opacity: 0.28 })
);
shadowPlane.rotation.x = -Math.PI * 0.5;
shadowPlane.position.y = -0.05;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// Kameralar (Perspektif FOV 35° + Gerçek Ortografik CAD)
const perspCamera = new THREE.PerspectiveCamera(35, 1, 1, 2500);
perspCamera.position.set(145, 120, 155);

const orthoCamera = new THREE.OrthographicCamera(-120, 120, 90, -90, -1000, 2500);
orthoCamera.position.copy(perspCamera.position);

let activeCamera = perspCamera;

const controls = new OrbitControls(activeCamera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(0, 22, 0);
controls.maxDistance = 850;
controls.minDistance = 28;

// Kamera yumuşak geçiş hedefi
const camRig = {
  animating: false,
  targetPos: new THREE.Vector3(145, 120, 155),
  targetLook: new THREE.Vector3(0, 22, 0)
};

controls.addEventListener('start', () => {
  camRig.animating = false;
});

/* ============================================================================
 * 3. KESİT DÜZLEMİ VE PBR CAD MALZEMELERİ
 * ========================================================================== */
const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

const materials = {
  basePlastic: new THREE.MeshStandardMaterial({
    color: 0x262930,
    roughness: 0.42,
    metalness: 0.08,
    side: THREE.DoubleSide
  }),
  lidPlastic: new THREE.MeshStandardMaterial({
    color: 0x363b45,
    roughness: 0.38,
    metalness: 0.10,
    side: THREE.DoubleSide
  }),
  pcbFr4: new THREE.MeshStandardMaterial({
    color: 0x165b38,
    roughness: 0.36,
    metalness: 0.12,
    side: THREE.DoubleSide
  }),
  copperGold: new THREE.MeshStandardMaterial({
    color: 0xe6b64c,
    roughness: 0.22,
    metalness: 0.90,
    side: THREE.DoubleSide
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xd8a93b,
    roughness: 0.24,
    metalness: 0.92,
    side: THREE.DoubleSide
  }),
  stainless: new THREE.MeshStandardMaterial({
    color: 0xcfd4dc,
    roughness: 0.26,
    metalness: 0.88,
    side: THREE.DoubleSide
  }),
  blackOxide: new THREE.MeshStandardMaterial({
    color: 0x1c1e22,
    roughness: 0.32,
    metalness: 0.82,
    side: THREE.DoubleSide
  }),
  icChip: new THREE.MeshStandardMaterial({
    color: 0x18191c,
    roughness: 0.48,
    metalness: 0.18,
    side: THREE.DoubleSide
  }),
  edgeLine: new THREE.LineBasicMaterial({
    color: 0x9aa3b2,
    transparent: true,
    opacity: 0.48
  })
};

const allClipMaterials = Object.values(materials);

function syncClippingPlanes() {
  const planes = state.section.enabled ? [clipPlane] : [];
  const off = state.section.offset;

  if (state.section.axis === 'x') {
    clipPlane.normal.set(-1, 0, 0);
    clipPlane.constant = off;
  } else if (state.section.axis === 'y') {
    clipPlane.normal.set(0, -1, 0);
    clipPlane.constant = off;
  } else {
    // Z ekseninde ön tarafı (-Z) kesip iç detayı karşıdan göster: z >= off => +z - off >= 0
    clipPlane.normal.set(0, 0, 1);
    clipPlane.constant = -off;
  }

  allClipMaterials.forEach((m) => {
    m.clippingPlanes = planes;
    m.needsUpdate = true;
  });
}

function applyDisplayMode() {
  const mode = state.displayMode;
  const isPaper = state.theme === 'paper';

  // Varsayılanları sıfırla
  materials.basePlastic.wireframe = mode === 'wireframe';
  materials.lidPlastic.wireframe = mode === 'wireframe';
  materials.pcbFr4.wireframe = mode === 'wireframe';

  if (mode === 'shaded') {
    materials.basePlastic.color.setHex(isPaper ? 0x2c3038 : 0x262930);
    materials.lidPlastic.color.setHex(isPaper ? 0x424854 : 0x363b45);
    materials.basePlastic.transparent = false;
    materials.lidPlastic.transparent = false;
    materials.basePlastic.opacity = 1.0;
    materials.lidPlastic.opacity = 1.0;
    materials.basePlastic.depthWrite = true;
    materials.lidPlastic.depthWrite = true;
    materials.edgeLine.color.setHex(isPaper ? 0x111214 : 0xaab2c0);
    materials.edgeLine.opacity = isPaper ? 0.45 : 0.42;
  } else if (mode === 'blueprint') {
    materials.basePlastic.color.setHex(isPaper ? 0xf6f3eb : 0x0e1c2f);
    materials.lidPlastic.color.setHex(isPaper ? 0xede8dc : 0x12243b);
    materials.basePlastic.transparent = false;
    materials.lidPlastic.transparent = false;
    materials.basePlastic.opacity = 1.0;
    materials.lidPlastic.opacity = 1.0;
    materials.basePlastic.depthWrite = true;
    materials.lidPlastic.depthWrite = true;
    materials.edgeLine.color.setHex(isPaper ? 0xc8371d : 0x6dd3ff);
    materials.edgeLine.opacity = 0.92;
  } else if (mode === 'xray') {
    materials.basePlastic.color.setHex(0x3a526b);
    materials.lidPlastic.color.setHex(0x4c6b8a);
    materials.basePlastic.transparent = true;
    materials.lidPlastic.transparent = true;
    materials.basePlastic.opacity = 0.30;
    materials.lidPlastic.opacity = 0.26;
    materials.basePlastic.depthWrite = false;
    materials.lidPlastic.depthWrite = false;
    materials.edgeLine.color.setHex(0xe04f33);
    materials.edgeLine.opacity = 0.72;
  } else if (mode === 'wireframe') {
    materials.basePlastic.color.setHex(0xd4a843);
    materials.lidPlastic.color.setHex(0xe04f33);
    materials.basePlastic.transparent = false;
    materials.lidPlastic.transparent = false;
    materials.basePlastic.depthWrite = true;
    materials.lidPlastic.depthWrite = true;
    materials.edgeLine.opacity = 0.0;
  }

  materials.basePlastic.needsUpdate = true;
  materials.lidPlastic.needsUpdate = true;
  materials.edgeLine.needsUpdate = true;
}

/* ============================================================================
 * 4. MONTAJ AĞACI & PARAMETRİK YENİDEN İNŞA
 * ========================================================================== */
const assemblyRoot = new THREE.Group();
assemblyRoot.name = 'PCB_Kutu_Montaji';
scene.add(assemblyRoot);

const baseContainer = new THREE.Group();
const lidContainer = new THREE.Group();
const hardwareContainer = new THREE.Group();
assemblyRoot.add(baseContainer, lidContainer, hardwareContainer);

let dynamicGroups = {
  pcbGroup: null,
  pcbInsertsGroup: null,
  lidInsertsGroup: null,
  pcbScrewsGroup: null,
  lidScrewsGroup: null
};

function clearGroup(group) {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child.children && child.children.length > 0) {
      clearGroup(child);
    }
    if (child.geometry) {
      child.geometry.dispose();
    }
  }
}

let rebuildPending = false;

function scheduleRebuild() {
  if (rebuildPending) return;
  rebuildPending = true;
  requestAnimationFrame(() => {
    rebuildPending = false;
    rebuildAssemblyNow();
  });
}

function rebuildAssemblyNow() {
  const spec = computeEnclosureSpec(state.params);
  state.currentSpec = spec;

  if (state.baseGeometry) state.baseGeometry.dispose();
  if (state.lidGeometry) state.lidGeometry.dispose();
  clearGroup(baseContainer);
  clearGroup(lidContainer);
  clearGroup(hardwareContainer);

  // 1. Alt Kutu (Base) + Kenar Çizgileri
  const baseRes = buildBaseGeometry(spec);
  state.baseGeometry = baseRes.geometry;
  const baseMesh = new THREE.Mesh(state.baseGeometry, materials.basePlastic);
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  baseMesh.name = 'Alt_Kutu_Base';
  baseContainer.add(baseMesh);

  const baseEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(state.baseGeometry, 24),
    materials.edgeLine
  );
  baseContainer.add(baseEdges);

  // 2. Üst Kapak (Lid) + Kenar Çizgileri
  const lidRes = buildLidGeometry(spec);
  state.lidGeometry = lidRes.geometry;
  const lidMesh = new THREE.Mesh(state.lidGeometry, materials.lidPlastic);
  lidMesh.castShadow = true;
  lidMesh.receiveShadow = true;
  lidMesh.name = 'Ust_Kapak_Lid';
  lidContainer.add(lidMesh);

  const lidEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(state.lidGeometry, 24),
    materials.edgeLine
  );
  lidContainer.add(lidEdges);

  // 3. PCB + Tırtıllı Pirinç Insertler + Vidalar
  dynamicGroups = buildHardwareMeshes(spec, materials);
  hardwareContainer.add(
    dynamicGroups.pcbInsertsGroup,
    dynamicGroups.pcbGroup,
    dynamicGroups.pcbScrewsGroup,
    dynamicGroups.lidInsertsGroup,
    dynamicGroups.lidScrewsGroup
  );

  // 4. Görünürlük bayrakları ve kesit senkronizasyonu
  syncVisibility();
  syncClippingPlanes();
  applyExplodeOffsets(state.explodeCurrent);

  // 5. Metroloji, BOM ve Canlı 2B İmalat Anteti Güncellemesi
  state.baseMetro = computeMeshMetrology(state.baseGeometry);
  state.lidMetro = computeMeshMetrology(state.lidGeometry);
  updateTelemetryAndBlueprint();
}

function syncVisibility() {
  baseContainer.visible = state.visibility.base;
  lidContainer.visible = state.visibility.lid;
  if (dynamicGroups.pcbGroup) {
    dynamicGroups.pcbGroup.visible = state.visibility.pcb;
  }
  if (dynamicGroups.pcbInsertsGroup) {
    const hw = state.visibility.hardware;
    dynamicGroups.pcbInsertsGroup.visible = hw;
    dynamicGroups.lidInsertsGroup.visible = hw;
    dynamicGroups.pcbScrewsGroup.visible = hw;
    dynamicGroups.lidScrewsGroup.visible = hw;
  }
}

function applyExplodeOffsets(factor) {
  const hScale = state.currentSpec ? Math.max(1.0, state.currentSpec.innerH / 32.0) : 1.0;
  baseContainer.position.y = 0;
  if (dynamicGroups.pcbInsertsGroup) dynamicGroups.pcbInsertsGroup.position.y = factor * 15 * hScale;
  if (dynamicGroups.pcbGroup) dynamicGroups.pcbGroup.position.y = factor * 32 * hScale;
  if (dynamicGroups.pcbScrewsGroup) dynamicGroups.pcbScrewsGroup.position.y = factor * 48 * hScale;
  if (dynamicGroups.lidInsertsGroup) dynamicGroups.lidInsertsGroup.position.y = factor * 20 * hScale;
  lidContainer.position.y = factor * 66 * hScale;
  if (dynamicGroups.lidScrewsGroup) dynamicGroups.lidScrewsGroup.position.y = factor * 92 * hScale;
}

/* ============================================================================
 * 5. TELEMETRİ HUD, UYARILAR VE 2B İMALAT ANTETİ GÜNCELLEMESİ
 * ========================================================================== */
function updateTelemetryAndBlueprint() {
  const spec = state.currentSpec;
  const bMet = state.baseMetro;
  const lMet = state.lidMetro;
  if (!spec || !bMet || !lMet) return;

  const ins = spec.insert;
  const bom = calculateBOMSummary(spec, bMet, lMet, state.materialKey);

  // Üst çubuk & Viewport rozetleri
  document.querySelector('#sku-pill').textContent = spec.sku;
  document.querySelector('#insert-bore-badge').textContent = `Yuva Ø${ins.boreNomDia.toFixed(2)} mm`;

  const statusPill = document.querySelector('#dfm-status-pill');
  const statusTxt = document.querySelector('#dfm-status-text');
  if (spec.warnings.length > 0) {
    statusPill.classList.add('warn');
    statusTxt.textContent = `DFM UYARI (${spec.warnings.length}) · Ø${ins.boreNomDia.toFixed(2)}mm`;
  } else {
    statusPill.classList.remove('warn');
    statusTxt.textContent = `DFM ONAYLI · 0.20mm DUDAK · Ø${ins.boreNomDia.toFixed(2)}mm YUVA`;
  }

  document.querySelector('#vt-outer').textContent =
    `${spec.outerW.toFixed(1)} × ${spec.outerL.toFixed(1)} × ${spec.outerH.toFixed(1)} mm`;
  document.querySelector('#vt-insert').textContent =
    `${ins.code} · Ø${ins.borePilotDia.toFixed(2)} → Ø${ins.boreNomDia.toFixed(2)} → Ø${ins.boreRootDia.toFixed(2)} mm`;
  document.querySelector('#vt-seam').textContent =
    `${spec.seamClearance.toFixed(2)} mm Boşluk (Dudak ${spec.lipThick.toFixed(2)}×${spec.lipHeight.toFixed(1)} mm)`;

  // Metroloji kartları
  document.querySelector('#m-base-vol').textContent =
    `${bMet.volCm3.toFixed(2)} cm³ · ${bom.baseMassG.toFixed(1)} g`;
  document.querySelector('#m-lid-vol').textContent =
    `${lMet.volCm3.toFixed(2)} cm³ · ${bom.lidMassG.toFixed(1)} g`;
  document.querySelector('#m-area-tri').textContent =
    `${(bMet.areaCm2 + lMet.areaCm2).toFixed(1)} cm² · ${(bMet.triangleCount + lMet.triangleCount).toLocaleString('tr-TR')}`;
  document.querySelector('#m-bom-cost').textContent =
    `${bom.totalCostTL.toFixed(2)} ₺ ($${bom.totalCostUSD.toFixed(2)})`;

  // Teknik tablo
  const pitchX = Math.abs(spec.pcbStandoffs[1].x - spec.pcbStandoffs[0].x);
  const pitchZ = Math.abs(spec.pcbStandoffs[2].z - spec.pcbStandoffs[1].z);
  document.querySelector('#st-pitch').textContent = `${pitchX.toFixed(1)} × ${pitchZ.toFixed(1)} mm`;
  document.querySelector('#st-height-od').textContent = `${spec.standoffH.toFixed(1)} mm / Ø${ins.bossOD.toFixed(1)} mm`;
  document.querySelector('#st-bore-spec').textContent = `Ø${ins.borePilotDia.toFixed(2)} → Ø${ins.boreNomDia.toFixed(2)} mm`;
  document.querySelector('#st-cbore-spec').textContent = `Ø${ins.cboreDia.toFixed(1)} × ${ins.cboreDepth.toFixed(1)} mm`;
  document.querySelector('#st-lip-spec').textContent = `${spec.seamClearance.toFixed(2)} mm Geçme Payı`;

  // Uyarı kutusu
  const warnBox = document.querySelector('#dfm-warnings-box');
  if (spec.warnings.length > 0) {
    warnBox.classList.remove('hidden');
    warnBox.innerHTML = spec.warnings.map((w) => `<div>• ${w}</div>`).join('');
  } else {
    warnBox.classList.add('hidden');
    warnBox.innerHTML = '';
  }

  // Canlı 2B İmalat Anteti SVG Önizleme
  const svgMarkup = generateImalatAntetiSVG(spec, bMet, lMet, state.materialKey);
  document.querySelector('#blueprint-thumb').innerHTML = svgMarkup;
  const modalEl = document.querySelector('#blueprint-modal');
  if (!modalEl.classList.contains('hidden')) {
    document.querySelector('#modal-svg-stage').innerHTML = svgMarkup;
  }
}

/* ============================================================================
 * 6. SOL PANEL TÜRKÇE KONTROL BAĞLANTILARI & YAN G/Ç EDİTÖRÜ
 * ========================================================================== */
function bindRangeAndNumber(rangeId, numId, paramKey) {
  const rng = document.querySelector(rangeId);
  const num = document.querySelector(numId);

  rng.addEventListener('input', () => {
    const val = parseFloat(rng.value);
    num.value = val;
    state.params[paramKey] = val;
    scheduleRebuild();
  });

  num.addEventListener('change', () => {
    const min = parseFloat(rng.min);
    const max = parseFloat(rng.max);
    const val = Math.min(max, Math.max(min, parseFloat(num.value) || min));
    num.value = val;
    rng.value = val;
    state.params[paramKey] = val;
    scheduleRebuild();
  });
}

function renderSidePortsUI() {
  const container = document.querySelector('#io-ports-list');
  container.innerHTML = '';

  state.params.sidePorts.forEach((port, idx) => {
    const card = document.createElement('div');
    card.className = 'io-card';
    card.innerHTML = `
      <div class="io-card-top">
        <span class="io-card-title">#${idx + 1} ${port.label}</span>
        <button type="button" class="io-del-btn" data-del="${idx}">SİL ×</button>
      </div>
      <div class="io-card-grid">
        <div>
          <span class="tiny-label">DUVAR</span>
          <select data-field="wall" data-idx="${idx}">
            <option value="front" ${port.wall === 'front' ? 'selected' : ''}>Ön (-Y)</option>
            <option value="back" ${port.wall === 'back' ? 'selected' : ''}>Arka (+Y)</option>
            <option value="left" ${port.wall === 'left' ? 'selected' : ''}>Sol (-X)</option>
            <option value="right" ${port.wall === 'right' ? 'selected' : ''}>Sağ (+X)</option>
          </select>
        </div>
        <div>
          <span class="tiny-label">OFSET</span>
          <input type="number" step="0.5" value="${port.offsetMm}" data-field="offsetMm" data-idx="${idx}" />
        </div>
        <div>
          <span class="tiny-label">${port.type === 'circle' ? 'ÇAP Ø' : 'EN'}</span>
          <input type="number" step="0.2" min="2.4" max="80" value="${port.width}" data-field="width" data-idx="${idx}" />
        </div>
        <div>
          <span class="tiny-label">BOY</span>
          <input type="number" step="0.2" min="2.0" max="50" value="${port.height}" data-field="height" data-idx="${idx}" ${port.type === 'circle' ? 'disabled' : ''} />
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.del);
      state.params.sidePorts.splice(i, 1);
      renderSidePortsUI();
      scheduleRebuild();
    });
  });

  container.querySelectorAll('[data-field]').forEach((inp) => {
    inp.addEventListener('change', () => {
      const i = Number(inp.dataset.idx);
      const field = inp.dataset.field;
      const target = state.params.sidePorts[i];
      if (!target) return;
      if (field === 'wall') {
        target.wall = inp.value;
      } else {
        const v = parseFloat(inp.value) || 0;
        target[field] = v;
        if (field === 'width' && target.type === 'circle') {
          target.height = v;
        }
      }
      scheduleRebuild();
    });
  });
}

function syncInputsFromParams() {
  const p = state.params;
  const setPair = (rId, nId, v) => {
    document.querySelector(rId).value = v;
    document.querySelector(nId).value = v;
  };
  setPair('#rng-pcb-en', '#num-pcb-en', p.PCB_En_mm);
  setPair('#rng-pcb-boy', '#num-pcb-boy', p.PCB_Boy_mm);
  setPair('#rng-ic-yukseklik', '#num-ic-yukseklik', p.Kutu_Ic_Yukseklik_mm);
  setPair('#rng-duvar', '#num-duvar', p.Duvar_Kalinligi_mm);
  setPair('#rng-kenar-mesafe', '#num-kenar-mesafe', p.Delik_Kenar_Mesafesi_mm);

  document.querySelectorAll('#insert-type-group .seg-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.insert === p.Pirinc_Insert_Tipi);
  });

  document.querySelector('#chk-havalandirma').checked = Boolean(p.Havalandirma_Izgarasi);
  document.querySelector('#chk-usb').checked = Boolean(p.USB_Konnektor_Deligi_Ekle);
  document.querySelector('#usb-config-box').classList.toggle('hidden', !p.USB_Konnektor_Deligi_Ekle);
  document.querySelector('#sel-usb-wall').value = p.USB_Duvar || 'front';
  document.querySelector('#num-usb-offset').value = p.USB_Ofset_mm || 0;

  renderSidePortsUI();
}

function initUIListeners() {
  bindRangeAndNumber('#rng-pcb-en', '#num-pcb-en', 'PCB_En_mm');
  bindRangeAndNumber('#rng-pcb-boy', '#num-pcb-boy', 'PCB_Boy_mm');
  bindRangeAndNumber('#rng-ic-yukseklik', '#num-ic-yukseklik', 'Kutu_Ic_Yukseklik_mm');
  bindRangeAndNumber('#rng-duvar', '#num-duvar', 'Duvar_Kalinligi_mm');
  bindRangeAndNumber('#rng-kenar-mesafe', '#num-kenar-mesafe', 'Delik_Kenar_Mesafesi_mm');

  document.querySelector('#btn-reset-wall').addEventListener('click', () => {
    state.params.Duvar_Kalinligi_mm = 2.4;
    syncInputsFromParams();
    scheduleRebuild();
  });

  // Pirinç Insert Tipi Seçici (M2.5 / M3 / M4)
  document.querySelectorAll('#insert-type-group .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.params.Pirinc_Insert_Tipi = btn.dataset.insert;
      syncInputsFromParams();
      scheduleRebuild();
    });
  });

  // Havalandırma & USB Toggle
  document.querySelector('#chk-havalandirma').addEventListener('change', (e) => {
    state.params.Havalandirma_Izgarasi = e.target.checked;
    scheduleRebuild();
  });

  document.querySelector('#chk-usb').addEventListener('change', (e) => {
    state.params.USB_Konnektor_Deligi_Ekle = e.target.checked;
    document.querySelector('#usb-config-box').classList.toggle('hidden', !e.target.checked);
    scheduleRebuild();
  });

  document.querySelector('#sel-usb-wall').addEventListener('change', (e) => {
    state.params.USB_Duvar = e.target.value;
    scheduleRebuild();
  });

  document.querySelector('#num-usb-offset').addEventListener('change', (e) => {
    state.params.USB_Ofset_mm = parseFloat(e.target.value) || 0;
    scheduleRebuild();
  });

  // Yeni Yan G/Ç Ekleme
  document.querySelector('#btn-add-io').addEventListener('click', () => {
    const presetKey = document.querySelector('#sel-io-preset').value;
    const preset = IO_PORT_PRESETS[presetKey] || IO_PORT_PRESETS.DC_JACK;
    const count = state.params.sidePorts.length;
    const defaultWalls = ['back', 'right', 'left', 'front'];
    state.params.sidePorts.push({
      id: `IO-${count + 1}`,
      preset: presetKey,
      type: preset.type,
      label: preset.label.split(' (')[0],
      wall: defaultWalls[count % defaultWalls.length],
      offsetMm: count % 2 === 0 ? -14.0 : 14.0,
      width: preset.width,
      height: preset.height,
      zAbovePcb: preset.zAbovePcb,
      unitTL: preset.unitTL
    });
    renderSidePortsUI();
    scheduleRebuild();
  });

  // Şablon (Preset) Seçici
  document.querySelector('#preset-select').addEventListener('change', (e) => {
    const chosen = ENCLOSURE_PRESETS[e.target.value];
    if (!chosen) return;
    state.params = structuredClone(chosen);
    syncInputsFromParams();
    scheduleRebuild();
  });

  // Malzeme Seçici
  document.querySelector('#sel-material').addEventListener('change', (e) => {
    state.materialKey = e.target.value;
    updateTelemetryAndBlueprint();
  });

  // Tema Değiştirici (Obsidyen / Arşiv Kağıdı)
  document.querySelector('#btn-theme-toggle').addEventListener('click', (e) => {
    state.theme = state.theme === 'dark' ? 'paper' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    e.currentTarget.textContent = state.theme === 'dark' ? 'TEMA: OBSİDYEN' : 'TEMA: ARŞİV KAĞIDI';
    cadGrid.material.opacity = state.theme === 'dark' ? 1.0 : 0.45;
    applyDisplayMode();
  });

  // Kamera Projeksiyonu (Perspektif / Ortografik)
  document.querySelector('#btn-proj-persp').addEventListener('click', () => setCameraProjection('persp'));
  document.querySelector('#btn-proj-ortho').addEventListener('click', () => setCameraProjection('ortho'));

  // Standart CAD Bakış Açıları
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => setCADView(btn.dataset.view));
  });

  // Görünüm Modları
  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.displayMode = btn.dataset.mode;
      document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b === btn));
      applyDisplayMode();
    });
  });

  // Patlatılmış Montaj Kontrolü
  const explodeRng = document.querySelector('#rng-explode');
  const explodePct = document.querySelector('#explode-pct');
  const explodeBtn = document.querySelector('#btn-toggle-explode');

  explodeRng.value = Math.round(state.explodeTarget * 100);
  explodePct.textContent = `${Math.round(state.explodeTarget * 100)}%`;

  explodeRng.addEventListener('input', () => {
    const v = Number(explodeRng.value) / 100;
    state.explodeTarget = v;
    explodePct.textContent = `${Math.round(v * 100)}%`;
    explodeBtn.textContent = v > 0.5 ? 'BİRLEŞTİR' : 'PATLAT';
  });

  explodeBtn.addEventListener('click', () => {
    const next = state.explodeTarget > 0.45 ? 0.0 : 1.0;
    state.explodeTarget = next;
    explodeRng.value = Math.round(next * 100);
    explodePct.textContent = `${Math.round(next * 100)}%`;
    explodeBtn.textContent = next > 0.5 ? 'BİRLEŞTİR' : 'PATLAT';
  });

  // Parça Görünürlük Butonları
  document.querySelectorAll('.vis-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const part = pill.dataset.part;
      state.visibility[part] = !state.visibility[part];
      pill.classList.toggle('active', state.visibility[part]);
      syncVisibility();
    });
  });

  // Canlı Kesit Düzlemi Kontrolleri
  const secChk = document.querySelector('#chk-section');
  const secRng = document.querySelector('#rng-section');
  const secVal = document.querySelector('#section-mm-val');

  secChk.addEventListener('change', () => {
    state.section.enabled = secChk.checked;
    syncClippingPlanes();
  });

  document.querySelectorAll('[data-sec-axis]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.section.axis = btn.dataset.secAxis;
      document.querySelectorAll('[data-sec-axis]').forEach((b) => b.classList.toggle('active', b === btn));
      syncClippingPlanes();
    });
  });

  secRng.addEventListener('input', () => {
    state.section.offset = parseFloat(secRng.value);
    secVal.textContent = `${state.section.offset.toFixed(1)} mm`;
    if (!state.section.enabled) {
      state.section.enabled = true;
      secChk.checked = true;
    }
    syncClippingPlanes();
  });

  // Tek Tık "INSERT & DUDAK KESİTİ" İnceleme Ön Ayarı
  document.querySelector('#btn-inspect-insert').addEventListener('click', () => {
    if (!state.currentSpec) return;
    const frontStandoffZ = state.currentSpec.pcbStandoffs[0].z; // -sz
    state.explodeTarget = 0.04; // Geçmeli dudak-oluk boşluğunu net görmek için neredeyse kapalı
    explodeRng.value = 4;
    explodePct.textContent = '4%';
    explodeBtn.textContent = 'PATLAT';

    state.section.enabled = true;
    state.section.axis = 'z';
    state.section.offset = frontStandoffZ;
    secChk.checked = true;
    secRng.value = frontStandoffZ;
    secVal.textContent = `${frontStandoffZ.toFixed(1)} mm`;
    document.querySelectorAll('[data-sec-axis]').forEach((b) =>
      b.classList.toggle('active', b.dataset.secAxis === 'z')
    );
    syncClippingPlanes();

    // Kamerayı konik insert yuvası ve 0.20mm dudak kesitine odakla
    camRig.targetLook.set(state.currentSpec.pcbStandoffs[1].x * 0.5, state.currentSpec.splitY * 0.55, frontStandoffZ);
    camRig.targetPos.set(state.currentSpec.pcbStandoffs[1].x * 0.4, state.currentSpec.splitY * 0.85, frontStandoffZ - 85);
    camRig.animating = true;
  });

  // Tam Ekran 2B İmalat Anteti Modalı
  const openModal = () => {
    const modal = document.querySelector('#blueprint-modal');
    modal.classList.remove('hidden');
    document.querySelector('#modal-svg-stage').innerHTML = generateImalatAntetiSVG(
      state.currentSpec,
      state.baseMetro,
      state.lidMetro,
      state.materialKey
    );
  };
  const closeModal = () => document.querySelector('#blueprint-modal').classList.add('hidden');

  document.querySelector('#btn-open-blueprint').addEventListener('click', openModal);
  document.querySelector('#blueprint-thumb').addEventListener('click', openModal);
  document.querySelector('#btn-close-blueprint').addEventListener('click', closeModal);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // İhracat (Download) Butonları
  document.querySelector('#btn-dl-base-stl').addEventListener('click', () => {
    if (state.baseGeometry && state.currentSpec) exportBaseSTL(state.baseGeometry, state.currentSpec);
  });

  document.querySelector('#btn-dl-lid-stl').addEventListener('click', () => {
    if (state.lidGeometry && state.currentSpec) exportLidSTL(state.lidGeometry, state.currentSpec);
  });

  const dlSvg = () => {
    if (state.currentSpec) {
      exportImalatAntetiSVG(state.currentSpec, state.baseMetro, state.lidMetro, state.materialKey);
    }
  };
  document.querySelector('#btn-dl-svg').addEventListener('click', dlSvg);
  document.querySelector('#btn-modal-dl-svg').addEventListener('click', dlSvg);

  document.querySelector('#btn-dl-csv').addEventListener('click', () => {
    if (state.currentSpec) {
      exportBOMCSV(state.currentSpec, state.baseMetro, state.lidMetro, state.materialKey);
    }
  });

  document.querySelector('#btn-dl-glb').addEventListener('click', () => {
    if (state.currentSpec) exportAssemblyGLB(assemblyRoot, state.currentSpec);
  });

  document.querySelector('#btn-dl-obj').addEventListener('click', () => {
    if (state.currentSpec) exportAssemblyOBJ(assemblyRoot, state.currentSpec);
  });

  document.querySelector('#btn-dl-dxf').addEventListener('click', () => {
    if (state.currentSpec) exportProfileDXF(state.currentSpec);
  });

  document.querySelector('#btn-dl-scad').addEventListener('click', () => {
    if (state.currentSpec) exportOpenSCAD(state.currentSpec);
  });
}

/* ============================================================================
 * 7. KAMERA PROJEKSİYONU, BAKIŞ AÇILARI & EKRAN BOYUTLANDIRMA
 * ========================================================================== */
function updateOrthoFrustum() {
  const rect = viewportEl.getBoundingClientRect();
  const aspect = Math.max(0.2, rect.width / Math.max(1, rect.height));
  const halfH = 95;
  orthoCamera.left = -halfH * aspect;
  orthoCamera.right = halfH * aspect;
  orthoCamera.top = halfH;
  orthoCamera.bottom = -halfH;
  orthoCamera.updateProjectionMatrix();
}

function setCameraProjection(mode) {
  if (state.projection === mode) return;
  state.projection = mode;

  const prevCam = activeCamera;
  activeCamera = mode === 'ortho' ? orthoCamera : perspCamera;
  activeCamera.position.copy(prevCam.position);
  activeCamera.quaternion.copy(prevCam.quaternion);
  updateOrthoFrustum();

  controls.object = activeCamera;
  controls.update();

  document.querySelector('#btn-proj-persp').classList.toggle('active', mode === 'persp');
  document.querySelector('#btn-proj-ortho').classList.toggle('active', mode === 'ortho');
}

function setCADView(view) {
  const spec = state.currentSpec;
  const dist = spec ? Math.max(spec.outerW, spec.outerL, spec.outerH) * 2.05 : 190;
  const midY = spec ? spec.outerH * 0.5 + state.explodeTarget * 35 : 22;

  camRig.targetLook.set(0, midY, 0);
  if (view === 'iso') {
    camRig.targetPos.set(dist * 0.78, midY + dist * 0.62, dist * 0.82);
  } else if (view === 'top') {
    camRig.targetPos.set(0, midY + dist * 1.25, 0.01);
  } else if (view === 'front') {
    camRig.targetPos.set(0, midY, -dist * 1.2);
  } else if (view === 'right') {
    camRig.targetPos.set(dist * 1.2, midY, 0);
  } else if (view === 'bottom') {
    camRig.targetPos.set(0, midY - dist * 1.25, 0.01);
  }
  camRig.animating = true;
}

function handleResize() {
  const rect = viewportEl.getBoundingClientRect();
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  renderer.setSize(w, h, false);
  perspCamera.aspect = w / h;
  perspCamera.updateProjectionMatrix();
  updateOrthoFrustum();
}

window.addEventListener('resize', handleResize);
new ResizeObserver(handleResize).observe(viewportEl);

/* ============================================================================
 * 8. KARE HIZINDAN BAĞIMSIZ ANİMASYON DÖNGÜSÜ (RENDER LOOP)
 * ========================================================================== */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  // Patlatılmış montaj üstel sönümleme (Exponential Damping)
  if (Math.abs(state.explodeCurrent - state.explodeTarget) > 0.0005) {
    state.explodeCurrent = damp(state.explodeCurrent, state.explodeTarget, 9.5, dt);
    applyExplodeOffsets(state.explodeCurrent);
  }

  // Standart CAD açı geçiş sönümlemesi
  if (camRig.animating) {
    activeCamera.position.x = damp(activeCamera.position.x, camRig.targetPos.x, 8.0, dt);
    activeCamera.position.y = damp(activeCamera.position.y, camRig.targetPos.y, 8.0, dt);
    activeCamera.position.z = damp(activeCamera.position.z, camRig.targetPos.z, 8.0, dt);

    controls.target.x = damp(controls.target.x, camRig.targetLook.x, 8.0, dt);
    controls.target.y = damp(controls.target.y, camRig.targetLook.y, 8.0, dt);
    controls.target.z = damp(controls.target.z, camRig.targetLook.z, 8.0, dt);

    if (activeCamera.position.distanceTo(camRig.targetPos) < 0.25) {
      camRig.animating = false;
    }
  }

  controls.update();
  renderer.render(scene, activeCamera);
}

/* ============================================================================
 * 9. BAŞLATMA
 * ========================================================================== */
handleResize();
syncInputsFromParams();
applyDisplayMode();
initUIListeners();
rebuildAssemblyNow();
animate();


/* ADJY köprüsü: yan G/Ç kesitleri form alanı değil, bir liste. Sipariş
   kaydına girebilmesi için dışarı açılır. */
window.__ADJY_PCB = {
  portlar: () => structuredClone(state.params.sidePorts),
  portlariYaz: (portlar) => {
    if (!Array.isArray(portlar)) return;
    state.params.sidePorts = structuredClone(portlar);
    renderSidePortsUI();
    scheduleRebuild();
  }
};
