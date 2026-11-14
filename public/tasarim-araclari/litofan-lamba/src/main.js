import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import {
  loadPresetPhotoCanvas,
  loadImageFileToCanvas,
  buildLuminanceGrid,
  renderFallbackCanvas
} from './image-processor.js';

import {
  buildLithophaneLampAssembly,
  createCreasedDisplayGeometry
} from './lithophane-cad.js';

import {
  computeCanliMetrajTablosu,
  formatHoursTr,
  generateImalatAntetiSVG,
  exportWatertightBinarySTL,
  exportImalatAntetiSVG,
  exportCanliMetrajCSV,
  exportParametricSCAD,
  triggerDownloadBlob
} from './antet-bom-exporters.js';

// ============================================================================
// APPLICATION STATE
// ============================================================================
const state = {
  params: {
    Form_Tipi: 'Cylinder',
    Capi_veya_En_mm: 120,
    Yukseklik_mm: 150,
    Min_Cidar_mm: 0.80,
    Maks_Cidar_mm: 3.20,
    Cerceve_Kalinlik_mm: 3.0,
    Taban_Gecme_Toleransi_mm: 0.20,
    Ic_Isik_Test_Slider: 82
  },
  kelvin: 2700,
  wrapMode: 'framed_window',
  invertImage: false,
  imageContrast: 1.12,
  smoothPasses: 1,
  materialKey: 'PLA_WHITE',
  meshQuality: 'high',
  renderMode: 'optical',
  studioPreset: 'studio_softbox',
  assemblyMode: 'assembled',
  cameraMode: 'persp',
  showGrid: false,
  sectionEnabled: false,
  sectionOffset: 0,

  sourceCanvas: null,
  imageName: '01 · Galata Kulesi & Boğaz Vapuru (S/B)',
  luminanceGrid: null,
  assembly: null,
  bomData: null,
  latestSvgMarkup: '',
  latestRenderBlob: null
};

const KELVIN_COLORS = {
  2700: new THREE.Color(0xffb454),
  4000: new THREE.Color(0xfff1da),
  2200: new THREE.Color(0xff8924)
};

// ============================================================================
// PROCEDURAL PBR STUDIO SLATE TEXTURE & INFINITY CYCLORAMA STAGE
// ============================================================================
function createProceduralSlateTextures() {
  const size = 512;
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = size;
  diffCanvas.height = size;
  const dctx = diffCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext('2d');

  const dImg = dctx.createImageData(size, size);
  const bImg = bctx.createImageData(size, size);

  // Isotropic fine micro-grain matte basalt / studio plaster (zero periodic sine stripes!)
  let seed = 48271;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const fineGrain = (rand() - 0.5) * 7.0;
      const subtleCloud =
        Math.sin(x * 0.0122 + y * 0.0122) * 1.8 +
        Math.cos(x * 0.0245 - y * 0.0184) * 1.4;
      const baseVal = 34 + fineGrain * 0.42 + subtleCloud;

      dImg.data[idx] = Math.max(18, Math.min(58, Math.round(baseVal)));
      dImg.data[idx + 1] = Math.max(19, Math.min(60, Math.round(baseVal + 1)));
      dImg.data[idx + 2] = Math.max(22, Math.min(66, Math.round(baseVal + 3)));
      dImg.data[idx + 3] = 255;

      const bVal = Math.max(0, Math.min(255, Math.round(128 + fineGrain * 2.2)));
      bImg.data[idx] = bVal;
      bImg.data[idx + 1] = bVal;
      bImg.data[idx + 2] = bVal;
      bImg.data[idx + 3] = 255;
    }
  }

  dctx.putImageData(dImg, 0, 0);
  bctx.putImageData(bImg, 0, 0);

  const colorTex = new THREE.CanvasTexture(diffCanvas);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(4, 4);
  colorTex.colorSpace = THREE.SRGBColorSpace;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(4, 4);

  return { colorTex, bumpTex };
}

/**
 * Builds a seamless curved L-sweep Studio Infinity Cyclorama (tabletop + 190mm cove fillet + backdrop wall)
 * so directional & spotlight shadows sweep naturally across the floor and backdrop without hard horizon seams.
 */
function createStudioCycloramaGeometry() {
  const width = 1500;
  const segX = 48;
  const profileYZ = [];

  // Front table edge z = +460 -> z = -150 at y = 0
  const flatSteps = 22;
  for (let i = 0; i <= flatSteps; i++) {
    const z = 460 - (i / flatSteps) * 610;
    profileYZ.push([0, z]);
  }
  // Smooth studio cove curve (radius 210mm from z=-150..z=-360, y=0..210)
  const coveSteps = 18;
  const R = 210;
  for (let i = 1; i <= coveSteps; i++) {
    const ang = (i / coveSteps) * (Math.PI * 0.5);
    const y = R - R * Math.cos(ang);
    const z = -150 - R * Math.sin(ang);
    profileYZ.push([y, z]);
  }
  // Vertical backdrop wall up to y = 760
  const wallSteps = 12;
  for (let i = 1; i <= wallSteps; i++) {
    const y = 210 + (i / wallSteps) * 550;
    profileYZ.push([y, -360]);
  }

  const rows = profileYZ.length;
  const cols = segX + 1;
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const indices = [];

  for (let r = 0; r < rows; r++) {
    const [py, pz] = profileYZ[r];
    const vCoord = r / (rows - 1);
    for (let c = 0; c < cols; c++) {
      const uCoord = c / segX;
      const px = (uCoord - 0.5) * width;
      const idx = r * cols + c;
      positions[idx * 3] = px;
      positions[idx * 3 + 1] = py;
      positions[idx * 3 + 2] = pz;
      uvs[idx * 2] = uCoord * 3.5;
      uvs[idx * 2 + 1] = vCoord * 3.5;
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < segX; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = (r + 1) * cols + c;
      const e = d + 1;
      indices.push(a, b, e, a, e, d);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  return geom;
}

// ============================================================================
// THREE.JS RENDERER, CAMERAS & POST-PROCESSING COMPOSER (MSAA + BLOOM)
// ============================================================================
const container = document.getElementById('webgl-container');
const canvas = document.getElementById('webgl-canvas');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0d11);
scene.fog = new THREE.FogExp2(0x0c0d11, 0.00075);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

// Cameras (1 unit = 1.00 mm) — Framed to showcase both front Galata relief AND long diagonal cast shadow!
const perspCamera = new THREE.PerspectiveCamera(33, 1, 1, 3200);
perspCamera.position.set(115, 152, 395);

const orthoCamera = new THREE.OrthographicCamera(-160, 160, 160, -160, -1500, 3200);
orthoCamera.position.copy(perspCamera.position);

let activeCamera = perspCamera;

const controls = new OrbitControls(activeCamera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(22, 74, -8);
controls.maxDistance = 960;
controls.minDistance = 42;
controls.maxPolarAngle = Math.PI * 0.492; // Keep camera above studio tabletop

// Multisampled Post-Processing Pipeline (RenderPass -> UnrealBloomPass -> OutputPass)
const renderTarget = new THREE.WebGLRenderTarget(800, 600, {
  type: THREE.HalfFloatType,
  samples: 4
});
const composer = new EffectComposer(renderer, renderTarget);
const renderPass = new RenderPass(scene, activeCamera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(800, 600), 0.24, 0.58, 0.84);
composer.addPass(bloomPass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);

// ============================================================================
// MULTI-SHADOW STUDIO LIGHTING RIG
// ============================================================================
const hemiLight = new THREE.HemisphereLight(0xdce4f5, 0x1a1816, 0.42);
scene.add(hemiLight);

// 1) Primary Shadow-Casting Studio Softbox Key Spotlight (casts diagonal tabletop + relief shadows!)
const keySpotLight = new THREE.SpotLight(0xfff8ed, 3.2, 1200, 0.58, 0.72, 1.05);
keySpotLight.position.set(-205, 268, 210);
keySpotLight.target.position.set(15, 58, -20);
keySpotLight.castShadow = true;
keySpotLight.shadow.mapSize.set(2048, 2048);
keySpotLight.shadow.camera.near = 95;
keySpotLight.shadow.camera.far = 820;
keySpotLight.shadow.bias = -0.00016;
keySpotLight.shadow.normalBias = 0.035;
keySpotLight.shadow.radius = 3.8;
scene.add(keySpotLight);
scene.add(keySpotLight.target);

// 2) Cool Architectural Rim / Hair Backlight (separates dark base & crown edge from backdrop)
const rimDirLight = new THREE.DirectionalLight(0x9cb4dc, 0.75);
rimDirLight.position.set(220, 185, -195);
scene.add(rimDirLight);

// 3) Shadow-Casting Interior E14 Warm LED PointLight (casts 360° base umbra & top-opening backdrop wash!)
const interiorPointLight = new THREE.PointLight(0xffb454, 3.6, 720, 1.28);
interiorPointLight.position.set(0, 88, 0);
interiorPointLight.castShadow = true;
interiorPointLight.shadow.mapSize.set(1024, 1024);
interiorPointLight.shadow.camera.near = 8;
interiorPointLight.shadow.camera.far = 680;
interiorPointLight.shadow.bias = -0.0004;
interiorPointLight.shadow.radius = 4.2;
scene.add(interiorPointLight);

// ============================================================================
// STUDIO STAGE: CYCLORAMA + CONTACT AO & PHOTO-CAUSTIC GOBO TABLE LAYER
// ============================================================================
const floorGroup = new THREE.Group();
scene.add(floorGroup);

const { colorTex: slateColorTex, bumpTex: slateBumpTex } = createProceduralSlateTextures();
const studioCycloramaMat = new THREE.MeshStandardMaterial({
  map: slateColorTex,
  bumpMap: slateBumpTex,
  bumpScale: 0.06,
  roughness: 0.88,
  metalness: 0.02,
  envMapIntensity: 0.04 // Minimal IBL wash on floor so cast SpotLight shadows stay deep & crisp!
});

const cycloramaMesh = new THREE.Mesh(createStudioCycloramaGeometry(), studioCycloramaMat);
cycloramaMesh.position.y = -0.05;
cycloramaMesh.receiveShadow = true;
floorGroup.add(cycloramaMesh);

// Azimuthal 256x1 Beer-Lambert Photo Transmission Lookup Texture for Tabletop Caustic Glow & Shadow Rays
const AZIMUTH_BINS = 256;
const azimuthData = new Uint8Array(AZIMUTH_BINS * 4);
for (let i = 0; i < AZIMUTH_BINS; i++) {
  azimuthData[i * 4] = 180;
  azimuthData[i * 4 + 1] = 180;
  azimuthData[i * 4 + 2] = 180;
  azimuthData[i * 4 + 3] = 255;
}
const azimuthTransTex = new THREE.DataTexture(azimuthData, AZIMUTH_BINS, 1, THREE.RGBAFormat);
azimuthTransTex.wrapS = THREE.RepeatWrapping;
azimuthTransTex.minFilter = THREE.LinearFilter;
azimuthTransTex.magFilter = THREE.LinearFilter;
azimuthTransTex.needsUpdate = true;

// Premultiplied Contact AO + Base Umbra + Azimuthal Lithophane Caustic Glow Shader Plane
// Blending: C_out = C_table * (1.0 - alpha) + rgb  -> Simultaneously darkens contact shadow AND projects warm photo caustics!
const tableOpticsUniforms = {
  uAzimuthTex: { value: azimuthTransTex },
  uFootRef: { value: 64.8 },
  uFormCode: { value: 0 }, // 0=Cylinder, 1=Curved_Panel, 2=Hexagon
  uBacklight: { value: 0.82 },
  uLedColor: { value: KELVIN_COLORS[2700].clone() },
  uLiftY: { value: 0.0 }
};

const tableOpticsMat = new THREE.ShaderMaterial({
  uniforms: tableOpticsUniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.OneFactor,
  blendDst: THREE.OneMinusSrcAlphaFactor,
  vertexShader: `
    varying vec2 vWorldXZ;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldXZ = wp.xz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    varying vec2 vWorldXZ;
    uniform sampler2D uAzimuthTex;
    uniform float uFootRef;
    uniform int uFormCode;
    uniform float uBacklight;
    uniform vec3 uLedColor;
    uniform float uLiftY;

    float hexSec(float th) {
      float a = mod(th + 3.14159265, 6.2831853) - 3.14159265;
      float secCenter = floor((a + 0.52359878) / 1.04719755) * 1.04719755;
      float psi = clamp(a - secCenter, -0.52359878, 0.52359878);
      return 1.0 / cos(psi);
    }

    void main() {
      float r = length(vWorldXZ);
      float th = atan(vWorldXZ.x, vWorldXZ.y); // -PI..+PI, 0 at +Z front

      float rBound = uFootRef;
      if (uFormCode == 2) {
        rBound = uFootRef * hexSec(th);
      } else if (uFormCode == 1) {
        float rearBlend = smoothstep(1.18, 1.85, abs(th));
        rBound = mix(uFootRef, max(35.0, uFootRef * 0.62), rearBlend);
      }

      float d = r - rBound;

      // 1) Natural Grounding Crevice Contact AO (tight under lip, never looking like an artificial ring)
      float tightCrevice = exp(-max(0.0, d) / (2.4 + uLiftY * 0.28)) * 0.72;
      float softAmbientSkirt = exp(-max(0.0, d) / (16.0 + uLiftY * 0.6)) * 0.24;
      float insideFoot = d < 0.0 ? 0.90 : 0.0;
      float contactAO = clamp(max(insideFoot, tightCrevice + softAmbientSkirt * 0.55), 0.0, 0.90);

      // Subtle base shadow transition into warm transmitted light pool
      float baseShadowRing = (1.0 - smoothstep(0.5, 9.0, d)) * uBacklight * 0.22;
      float totalShadowAlpha = clamp(contactAO + baseShadowRing, 0.0, 0.91);

      // 2) Azimuthal Photo-Driven Transmitted Warm Golden Light Pool & Radial Gobo Shadow Streaks
      float u = (th + 3.14159265) / 6.2831853;
      float t0 = texture2D(uAzimuthTex, vec2(u, 0.5)).r;
      float t1 = texture2D(uAzimuthTex, vec2(u + 0.018, 0.5)).r;
      float t2 = texture2D(uAzimuthTex, vec2(u - 0.018, 0.5)).r;
      float t3 = texture2D(uAzimuthTex, vec2(u + 0.042, 0.5)).r;
      float t4 = texture2D(uAzimuthTex, vec2(u - 0.042, 0.5)).r;
      float azTrans = (t0 * 0.34 + (t1 + t2) * 0.22 + (t3 + t4) * 0.11);

      float umbraReveal = smoothstep(1.5, 18.0, d);
      float radialFalloff = exp(-max(0.0, d) / 118.0) / (1.0 + 0.00012 * r * r);
      float edgeFade = 1.0 - smoothstep(260.0, 355.0, r);

      vec3 warmCaustic = uLedColor * vec3(1.06, 0.72, 0.34) * azTrans * umbraReveal * radialFalloff * edgeFade * uBacklight * 0.78;

      gl_FragColor = vec4(warmCaustic, totalShadowAlpha * edgeFade);
    }
  `
});

const tableOpticsMesh = new THREE.Mesh(new THREE.PlaneGeometry(740, 740), tableOpticsMat);
tableOpticsMesh.rotation.x = -Math.PI / 2;
tableOpticsMesh.position.y = 0.03;
tableOpticsMesh.renderOrder = 1;
floorGroup.add(tableOpticsMesh);

const cadGrid = new THREE.GridHelper(300, 30, 0xe04f33, 0x2a2e39);
cadGrid.position.y = 0.06;
cadGrid.material.opacity = 0.36;
cadGrid.material.transparent = true;
cadGrid.visible = false; // Hidden in photorealistic studio mode so shadows look 100% pure!
floorGroup.add(cadGrid);

const rootAssemblyGroup = new THREE.Group();
scene.add(rootAssemblyGroup);

const lithoMeshGroup = new THREE.Group();
const baseMeshGroup = new THREE.Group();
const hardwareRefGroup = new THREE.Group();
rootAssemblyGroup.add(baseMeshGroup, lithoMeshGroup, hardwareRefGroup);

// ============================================================================
// BEER-LAMBERT SUBSURFACE + 0.12MM FDM LAYER + RELIEF SELF-SHADOW SHADER
// ============================================================================
const lithoOpticalUniforms = {
  uBacklight: { value: 0.82 },
  uLedColor: { value: KELVIN_COLORS[2700].clone() },
  uMinThick: { value: 0.80 },
  uMaxThick: { value: 3.20 },
  uMidY: { value: 75.0 }
};

const lithoOpticalMaterial = new THREE.MeshStandardMaterial({
  color: 0xf4efe4,
  roughness: 0.54,
  metalness: 0.0,
  envMapIntensity: 0.22,
  side: THREE.DoubleSide
});

lithoOpticalMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uBacklight = lithoOpticalUniforms.uBacklight;
  shader.uniforms.uLedColor = lithoOpticalUniforms.uLedColor;
  shader.uniforms.uMinThick = lithoOpticalUniforms.uMinThick;
  shader.uniforms.uMaxThick = lithoOpticalUniforms.uMaxThick;
  shader.uniforms.uMidY = lithoOpticalUniforms.uMidY;

  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
       attribute float aThickness;
       varying float vThickness;
       varying vec3 vLithoPos;`
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vThickness = aThickness;
       vLithoPos = position;`
    );

  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
       varying float vThickness;
       varying vec3 vLithoPos;
       uniform float uBacklight;
       uniform vec3 uLedColor;
       uniform float uMinThick;
       uniform float uMaxThick;
       uniform float uMidY;`
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float spanT_c = max(0.15, uMaxThick - uMinThick);
       float normT_c = clamp((vThickness - uMinThick) / spanT_c, 0.0, 1.0);
       float fdmLayer_c = 0.974 + 0.026 * sin(vLithoPos.y * 39.27);
       vec3 unlitPla = diffuseColor.rgb * fdmLayer_c;
       // Thick relief zones absorb interior light and catch external raking spotlight shadows
       vec3 backlitAlbedo = mix(vec3(0.40, 0.32, 0.22), vec3(0.052, 0.036, 0.026), pow(normT_c, 0.72)) * fdmLayer_c;
       diffuseColor.rgb = mix(unlitPla, backlitAlbedo, clamp(uBacklight * 1.12, 0.0, 1.0));`
    )
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float spanT = max(0.15, uMaxThick - uMinThick);
       float normT = clamp((vThickness - uMinThick) / spanT, 0.0, 1.0);
       float fdmLayer = 0.976 + 0.024 * sin(vLithoPos.y * 39.27);
       float beer = exp(-3.18 * normT);
       float dy = (vLithoPos.y - uMidY) / max(42.0, uMidY);
       float radialBulb = 1.0 - 0.12 * clamp(dy * dy, 0.0, 1.3);
       float transmitted = beer * radialBulb * fdmLayer * uBacklight;
       vec3 hiColor = mix(vec3(1.0, 0.96, 0.86), uLedColor * 1.16, 0.62);
       vec3 midColor = uLedColor * vec3(0.96, 0.56, 0.20);
       vec3 loColor = uLedColor * vec3(0.54, 0.17, 0.04);
       vec3 subsurfaceHue = normT < 0.45
         ? mix(hiColor, midColor, normT / 0.45)
         : mix(midColor, loColor, (normT - 0.45) / 0.55);
       totalEmissiveRadiance += subsurfaceHue * transmitted * 2.12;`
    );
};

const baseCadMaterial = new THREE.MeshStandardMaterial({
  color: 0x1d1f26,
  roughness: 0.34,
  metalness: 0.28,
  side: THREE.DoubleSide
});

const cadShadedLithoMat = new THREE.MeshStandardMaterial({
  color: 0xe8e4da,
  roughness: 0.38,
  metalness: 0.05,
  side: THREE.DoubleSide
});

const xrayLithoMat = new THREE.MeshPhysicalMaterial({
  color: 0x62d2a2,
  transparent: true,
  opacity: 0.36,
  roughness: 0.15,
  depthWrite: false,
  side: THREE.DoubleSide
});

const xrayBaseMat = new THREE.MeshPhysicalMaterial({
  color: 0xf2a93b,
  transparent: true,
  opacity: 0.45,
  roughness: 0.2,
  depthWrite: false,
  side: THREE.DoubleSide
});

const wireLithoMat = new THREE.MeshBasicMaterial({ color: 0xe04f33, wireframe: true });
const wireBaseMat = new THREE.MeshBasicMaterial({ color: 0x8c8f96, wireframe: true });

const edgeLineMat = new THREE.LineBasicMaterial({ color: 0x111216, transparent: true, opacity: 0.52 });
const baseEdgeLineMat = new THREE.LineBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.26 });

const cobFilamentMat = new THREE.MeshStandardMaterial({
  color: 0xfff8e6,
  emissive: 0xffaa33,
  emissiveIntensity: 4.5,
  roughness: 0.15
});

const bulbGlassMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.28,
  roughness: 0.08,
  metalness: 0.05,
  transmission: 0.65
});

function rebuildHardwareReference(spec) {
  while (hardwareRefGroup.children.length > 0) {
    const ch = hardwareRefGroup.children.pop();
    if (ch.geometry) ch.geometry.dispose();
  }

  const activePlanes = state.sectionEnabled ? [clipPlane] : [];
  const phenolicMat = new THREE.MeshStandardMaterial({
    color: 0x17181d,
    roughness: 0.42,
    metalness: 0.28,
    clippingPlanes: activePlanes
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xd4a84f,
    roughness: 0.28,
    metalness: 0.85,
    clippingPlanes: activePlanes
  });
  cobFilamentMat.clippingPlanes = activePlanes;
  bulbGlassMat.clippingPlanes = activePlanes;

  const socketGeom = new THREE.CylinderGeometry(13.9, 13.9, 36, 48);
  socketGeom.translate(0, 25.2, 0);
  hardwareRefGroup.add(new THREE.Mesh(socketGeom, phenolicMat));

  const nutGeom = new THREE.CylinderGeometry(18.1, 18.1, 4.4, 24);
  nutGeom.translate(0, 17.2, 0);
  hardwareRefGroup.add(new THREE.Mesh(nutGeom, phenolicMat));

  const bulbBaseY = Math.max(44, spec.grooveFloorYMm + spec.heightMm * 0.26);
  const screwGeom = new THREE.CylinderGeometry(7.0, 6.6, 15, 32);
  screwGeom.translate(0, bulbBaseY, 0);
  hardwareRefGroup.add(new THREE.Mesh(screwGeom, brassMat));

  const bulbCenterY = bulbBaseY + 28;
  const glassGeom = new THREE.SphereGeometry(16.5, 36, 28);
  glassGeom.scale(1, 1.62, 1);
  glassGeom.translate(0, bulbCenterY, 0);
  hardwareRefGroup.add(new THREE.Mesh(glassGeom, bulbGlassMat));

  for (let f = 0; f < 4; f++) {
    const ang = (f / 4) * Math.PI * 2 + Math.PI / 4;
    const filGeom = new THREE.CylinderGeometry(0.65, 0.65, 22, 8);
    filGeom.translate(Math.cos(ang) * 4.2, bulbCenterY - 1, Math.sin(ang) * 4.2);
    hardwareRefGroup.add(new THREE.Mesh(filGeom, cobFilamentMat));
  }

  interiorPointLight.position.set(0, bulbCenterY, 0);

  const rearR = spec.outerBoundingDepthMm * 0.5 + 48;
  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 8.2, 0),
    new THREE.Vector3(0, 4.2, -12),
    new THREE.Vector3(0, 3.4, -rearR * 0.55),
    new THREE.Vector3(0, 2.8, -rearR)
  ]);
  const cordGeom = new THREE.TubeGeometry(cordCurve, 36, 2.75, 14, false);
  const cordMesh = new THREE.Mesh(cordGeom, phenolicMat);
  cordMesh.castShadow = true;
  cordMesh.receiveShadow = true;
  hardwareRefGroup.add(cordMesh);
}

/**
 * Updates the 256-bin azimuthal Beer-Lambert table caustic texture directly from the active luminanceGrid!
 */
function updateAzimuthalCausticTexture() {
  if (!state.luminanceGrid || !state.assembly) return;
  const { luminance, cols, rows } = state.luminanceGrid;
  const { spec } = state.assembly;
  const isPanel = spec.formType === 'Curved_Panel';
  const halfArc = spec.panelArcRad * 0.5;

  for (let b = 0; b < AZIMUTH_BINS; b++) {
    const theta = -Math.PI + ((b + 0.5) / AZIMUTH_BINS) * Math.PI * 2;
    let avgTrans = 0.0;

    if (isPanel) {
      if (Math.abs(theta) <= halfArc) {
        const u = (theta + halfArc) / spec.panelArcRad;
        const c = Math.min(cols - 1, Math.max(0, Math.floor(u * cols)));
        let sum = 0;
        for (let r = Math.floor(rows * 0.15); r < Math.floor(rows * 0.85); r += 2) {
          const lum = luminance[r * cols + c];
          sum += Math.exp(-2.6 * (1.0 - lum));
        }
        avgTrans = sum / Math.max(1, Math.floor(rows * 0.35));
      } else {
        // Behind open Curved_Panel, direct warm bulb wash spills onto studio floor!
        avgTrans = 0.72;
      }
    } else {
      const u = (theta + Math.PI) / (Math.PI * 2);
      const c = Math.min(cols - 1, Math.max(0, Math.floor(u * cols)));
      let sum = 0;
      let count = 0;
      for (let r = Math.floor(rows * 0.15); r < Math.floor(rows * 0.85); r += 2) {
        const lum = luminance[r * cols + c];
        sum += Math.exp(-2.8 * (1.0 - lum));
        count++;
      }
      avgTrans = (sum / Math.max(1, count)) * 1.25;
    }

    const byteVal = Math.max(8, Math.min(255, Math.round(avgTrans * 255)));
    azimuthData[b * 4] = byteVal;
    azimuthData[b * 4 + 1] = byteVal;
    azimuthData[b * 4 + 2] = byteVal;
    azimuthData[b * 4 + 3] = 255;
  }

  azimuthTransTex.needsUpdate = true;

  const footRef = spec.grooveOuterRefMm + spec.outerBaseLipMm;
  tableOpticsUniforms.uFootRef.value = footRef;
  tableOpticsUniforms.uFormCode.value =
    spec.formType === 'Curved_Panel' ? 1 : spec.formType === 'Hexagon' ? 2 : 0;
}

// ============================================================================
// CORE REBUILD PIPELINE
// ============================================================================
let lithoDisplayMesh = null;
let lithoEdgesMesh = null;
let baseDisplayMesh = null;
let baseEdgesMesh = null;

function disposeGroupMeshes(group) {
  while (group.children.length > 0) {
    const obj = group.children.pop();
    if (obj.geometry) obj.geometry.dispose();
  }
}

function applyRenderAndAssemblyModes() {
  if (!state.assembly || !lithoDisplayMesh || !baseDisplayMesh) return;

  const { spec } = state.assembly;
  const activePlanes = state.sectionEnabled ? [clipPlane] : [];

  [
    lithoOpticalMaterial,
    baseCadMaterial,
    cadShadedLithoMat,
    xrayLithoMat,
    xrayBaseMat,
    wireLithoMat,
    wireBaseMat,
    edgeLineMat,
    baseEdgeLineMat,
    cobFilamentMat,
    bulbGlassMat
  ].forEach((m) => {
    m.clippingPlanes = activePlanes;
    m.needsUpdate = true;
  });

  if (state.renderMode === 'optical') {
    lithoDisplayMesh.material = lithoOpticalMaterial;
    baseDisplayMesh.material = baseCadMaterial;
    if (lithoEdgesMesh) lithoEdgesMesh.visible = false;
    if (baseEdgesMesh) baseEdgesMesh.visible = false; // Pure photorealistic bevel speculars on base!
    cadGrid.visible = state.showGrid;
    tableOpticsMesh.visible = true;
  } else if (state.renderMode === 'cad_edges') {
    lithoDisplayMesh.material = cadShadedLithoMat;
    baseDisplayMesh.material = baseCadMaterial;
    if (!lithoEdgesMesh && state.assembly) {
      const lithoEdgesGeom = new THREE.EdgesGeometry(state.assembly.lithophaneGeom, 36);
      lithoEdgesMesh = new THREE.LineSegments(lithoEdgesGeom, edgeLineMat);
      lithoMeshGroup.add(lithoEdgesMesh);
    }
    if (lithoEdgesMesh) lithoEdgesMesh.visible = true;
    if (baseEdgesMesh) baseEdgesMesh.visible = true;
    cadGrid.visible = true;
    tableOpticsMesh.visible = true;
  } else if (state.renderMode === 'xray') {
    lithoDisplayMesh.material = xrayLithoMat;
    baseDisplayMesh.material = xrayBaseMat;
    if (lithoEdgesMesh) lithoEdgesMesh.visible = false;
    if (baseEdgesMesh) baseEdgesMesh.visible = true;
    cadGrid.visible = true;
    tableOpticsMesh.visible = false;
  } else {
    lithoDisplayMesh.material = wireLithoMat;
    baseDisplayMesh.material = wireBaseMat;
    if (lithoEdgesMesh) lithoEdgesMesh.visible = false;
    if (baseEdgesMesh) baseEdgesMesh.visible = false;
    cadGrid.visible = true;
    tableOpticsMesh.visible = false;
  }

  const seatY = spec.grooveFloorYMm;
  if (state.assemblyMode === 'assembled') {
    lithoMeshGroup.visible = true;
    baseMeshGroup.visible = true;
    hardwareRefGroup.visible = true;
    lithoMeshGroup.position.y = seatY;
    tableOpticsUniforms.uLiftY.value = 0.0;
  } else if (state.assemblyMode === 'exploded') {
    lithoMeshGroup.visible = true;
    baseMeshGroup.visible = true;
    hardwareRefGroup.visible = true;
    lithoMeshGroup.position.y = seatY + 42;
    tableOpticsUniforms.uLiftY.value = 8.0;
  } else if (state.assemblyMode === 'litho_only') {
    lithoMeshGroup.visible = true;
    baseMeshGroup.visible = false;
    hardwareRefGroup.visible = false;
    lithoMeshGroup.position.y = 0;
    tableOpticsUniforms.uLiftY.value = 0.0;
  } else if (state.assemblyMode === 'base_only') {
    lithoMeshGroup.visible = false;
    baseMeshGroup.visible = true;
    hardwareRefGroup.visible = false;
    tableOpticsUniforms.uLiftY.value = 0.0;
  }

  updateBacklightSimulation();
}

function updateBacklightSimulation() {
  const pct = state.params.Ic_Isik_Test_Slider / 100;
  const col = KELVIN_COLORS[state.kelvin] || KELVIN_COLORS[2700];
  const isOptical = state.renderMode === 'optical';

  lithoOpticalUniforms.uBacklight.value = isOptical ? pct : 0.0;
  lithoOpticalUniforms.uLedColor.value.copy(col);
  lithoOpticalUniforms.uMinThick.value = state.params.Min_Cidar_mm;
  lithoOpticalUniforms.uMaxThick.value = state.params.Maks_Cidar_mm;
  if (state.assembly) {
    lithoOpticalUniforms.uMidY.value = state.assembly.spec.heightMm * 0.46;
  }

  tableOpticsUniforms.uBacklight.value = isOptical ? pct : 0.0;
  tableOpticsUniforms.uLedColor.value.copy(col);

  // Studio Lighting & Shadow Rig Presets
  // Note: SpotLight in Three.js r170 uses physical candela intensity (~80,000 - 240,000 cd at distance 350mm
  // unless decay=0! Setting decay=0 gives exact predictable linear studio lighting intensity 1.0..3.5!)
  keySpotLight.decay = 0;
  interiorPointLight.decay = 0;

  if (state.studioPreset === 'dramatic_raking') {
    // Low grazing architectural side-light: bold rounded silhouette shadow across right tabletop!
    keySpotLight.position.set(-240, 255, 155);
    keySpotLight.target.position.set(35, 55, -25);
    keySpotLight.angle = 0.92;
    keySpotLight.penumbra = 0.85;
    keySpotLight.shadow.radius = 3.2;
    keySpotLight.intensity = isOptical ? 4.2 - pct * 0.55 : 4.5;
    hemiLight.intensity = isOptical ? 0.08 : 0.35;
    rimDirLight.intensity = 0.24;
  } else if (state.studioPreset === 'night_ambient') {
    // Cozy dark nightstand mood: soft moonlit shadow + rich warm 2700K golden lamp pool & bloom
    keySpotLight.position.set(-205, 285, 195);
    keySpotLight.target.position.set(25, 55, -20);
    keySpotLight.angle = 0.92;
    keySpotLight.penumbra = 0.92;
    keySpotLight.shadow.radius = 5.0;
    keySpotLight.intensity = isOptical ? Math.max(1.35, 2.6 - pct * 1.05) : 3.5;
    hemiLight.intensity = isOptical ? 0.06 : 0.35;
    rimDirLight.intensity = 0.16;
  } else {
    // Default: Wide Studio Softbox casting complete, soft-edged rounded lamp shadow across right tabletop!
    keySpotLight.position.set(-215, 288, 185);
    keySpotLight.target.position.set(30, 58, -22);
    keySpotLight.angle = 0.90;
    keySpotLight.penumbra = 0.88;
    keySpotLight.shadow.radius = 4.4;
    keySpotLight.intensity = isOptical ? 3.75 - pct * 0.45 : 4.1;
    hemiLight.intensity = isOptical ? 0.09 : 0.38;
    rimDirLight.intensity = 0.22;
  }
  keySpotLight.target.updateMatrixWorld();

  lithoOpticalMaterial.envMapIntensity = isOptical ? Math.max(0.14, 0.78 - pct * 0.62) : 0.82;
  interiorPointLight.color.copy(col);
  interiorPointLight.intensity = isOptical ? pct * 1.85 : 0.15;
  cobFilamentMat.emissive.copy(col);
  cobFilamentMat.emissiveIntensity = isOptical ? 0.4 + pct * 5.2 : 0.25;

  bloomPass.strength = isOptical ? 0.08 + pct * 0.22 : 0.04;
  renderer.toneMappingExposure = isOptical ? 1.04 : 1.08;
}

function rebuildLuminanceFromSource() {
  if (!state.sourceCanvas) return;

  const form = state.params.Form_Tipi;
  const span = state.params.Capi_veya_En_mm;
  const h = state.params.Yukseklik_mm;

  const circumferenceOrArcMm = form === 'Curved_Panel' ? span * 1.18 : Math.PI * span;
  const targetAspect = Math.max(0.5, Math.min(3.8, circumferenceOrArcMm / h));

  const cols = state.meshQuality === 'ultra' ? 468 : state.meshQuality === 'fast' ? 240 : 360;
  const rows = state.meshQuality === 'ultra' ? 312 : state.meshQuality === 'fast' ? 160 : 240;

  const previewCanvas = document.getElementById('luminance-preview-canvas');
  state.luminanceGrid = buildLuminanceGrid(state.sourceCanvas, {
    cols,
    rows,
    contrast: state.imageContrast,
    sharpenAmount: state.smoothPasses === 0 ? 0.82 : state.smoothPasses === 1 ? 0.56 : 0.28,
    smoothingPasses: state.smoothPasses,
    invert: state.invertImage,
    wrapHorizontal: form !== 'Curved_Panel',
    wrapMode: state.wrapMode,
    targetAspect,
    previewCanvas
  });

  document.getElementById('active-photo-stats').textContent =
    `Ağ: ${cols}×${rows} · USM + ≤52° DFM Eğim Korumalı`;
}

function rebuildFullCadAssembly() {
  const t0 = performance.now();

  if (!state.luminanceGrid) {
    rebuildLuminanceFromSource();
  }

  disposeGroupMeshes(lithoMeshGroup);
  disposeGroupMeshes(baseMeshGroup);
  lithoEdgesMesh = null;
  baseEdgesMesh = null;
  if (state.assembly) {
    state.assembly.lithophaneGeom.dispose();
    state.assembly.baseGeom.dispose();
  }

  const assembly = buildLithophaneLampAssembly(state.params, state.luminanceGrid, state.meshQuality);
  state.assembly = assembly;

  lithoDisplayMesh = new THREE.Mesh(assembly.lithophaneGeom, lithoOpticalMaterial);
  lithoDisplayMesh.castShadow = true;
  lithoDisplayMesh.receiveShadow = true;
  lithoMeshGroup.add(lithoDisplayMesh);

  const creasedBase = createCreasedDisplayGeometry(assembly.baseGeom, 32);
  baseDisplayMesh = new THREE.Mesh(creasedBase, baseCadMaterial);
  baseDisplayMesh.castShadow = true;
  baseDisplayMesh.receiveShadow = true;
  baseMeshGroup.add(baseDisplayMesh);

  const baseEdgesGeom = new THREE.EdgesGeometry(assembly.baseGeom, 25);
  baseEdgesMesh = new THREE.LineSegments(baseEdgesGeom, baseEdgeLineMat);
  baseMeshGroup.add(baseEdgesMesh);

  rebuildHardwareReference(assembly.spec);
  updateAzimuthalCausticTexture();
  applyRenderAndAssemblyModes();

  state.bomData = computeCanliMetrajTablosu(assembly, state.params, state.materialKey);
  state.latestSvgMarkup = generateImalatAntetiSVG(assembly, state.params, state.bomData, state.imageName);

  const elapsedMs = Math.round(performance.now() - t0);
  updateTelemetryAndDOM(elapsedMs);
}

function updateTelemetryAndDOM(elapsedMs) {
  const { spec, lithoManifold, baseManifold } = state.assembly;
  const { rows, totals } = state.bomData;

  document.getElementById('build-ms-tag').textContent = `${elapsedMs} ms · ≤52° DFM`;

  const manifoldBadge = document.getElementById('manifold-badge');
  const allManifold = lithoManifold.isWatertight && baseManifold.isWatertight;
  manifoldBadge.textContent = allManifold
    ? 'DFM & 2-MANIFOLD ONAYLI (0 AÇIK KENAR)'
    : `KONTROL: ${lithoManifold.boundaryEdges + baseManifold.boundaryEdges} KENAR`;
  manifoldBadge.className = `manifold-badge ${allManifold ? 'ok' : 'warn'}`;

  document.getElementById('hud-wall-range').textContent =
    `${spec.minWallMm.toFixed(2)} – ${spec.maxWallMm.toFixed(2)} mm`;
  document.getElementById('hud-groove-spec').textContent =
    `${spec.grooveTotalWidthMm.toFixed(2)} mm (±${spec.clearanceMm.toFixed(2)})`;
  document.getElementById('hud-filament-time').textContent =
    `${totals.totalFilamentG.toFixed(0)} g · ${formatHoursTr(totals.totalPrintHours)}`;
  document.getElementById('hud-total-cost').textContent =
    `${totals.totalCostTl.toFixed(2)} TL`;

  document.getElementById('hud-bbox').textContent =
    `${spec.outerBoundingWidthMm.toFixed(1)} × ${spec.outerBoundingDepthMm.toFixed(1)} × ${spec.assembledTotalHeightMm.toFixed(1)} mm`;
  document.getElementById('hud-e14-cord').textContent =
    `Ø${spec.e14BoreDiameterMm.toFixed(1)} Duy + Buat ${spec.wiringCavityHeightMm.toFixed(1)}mm / Kablo (-Z)`;
  document.getElementById('hud-triangles').textContent =
    `${totals.totalTriangles.toLocaleString('tr-TR')} üçgen`;

  document.getElementById('antet-svg-stage').innerHTML = state.latestSvgMarkup;

  const modal = document.getElementById('antet-modal');
  if (!modal.classList.contains('hidden')) {
    document.getElementById('antet-modal-body').innerHTML = state.latestSvgMarkup;
  }

  const tbody = document.getElementById('bom-tbody');
  tbody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td class="bom-code">${r.kod}</td>
        <td>
          <strong>${r.parcaAdi}</strong>
          <span class="bom-part-sub">${r.malzeme}</span>
        </td>
        <td>${r.olcuMm}</td>
        <td class="num">${r.hacimCm3 > 0 ? r.hacimCm3.toFixed(1) + ' cm³' : '—'}</td>
        <td class="num">${r.kutleG.toFixed(1)} g</td>
        <td class="num">${formatHoursTr(r.sureSaat)}</td>
        <td class="num">${r.maliyetTl.toFixed(2)} TL</td>
      </tr>`
    )
    .join('');

  const tfoot = document.getElementById('bom-tfoot');
  tfoot.innerHTML = `
    <tr>
      <td colspan="3">TOPLAM SET METRAJI (HD LİTOFAN + SNAP-FIT E14 TABAN + DONANIM)</td>
      <td class="num">${totals.totalVolCm3.toFixed(1)} cm³</td>
      <td class="num">${totals.totalMassG.toFixed(1)} g</td>
      <td class="num">${formatHoursTr(totals.totalPrintHours)}</td>
      <td class="num" style="color:#E04F33;">${totals.totalCostTl.toFixed(2)} TL</td>
    </tr>`;
}

// ============================================================================
// HIGH-RESOLUTION (2560x1600) PHOTOREALISTIC STUDIO RENDER CAPTURE
// ============================================================================
function capturePhotorealisticStudioRender() {
  const renderW = 2560;
  const renderH = 1600;

  const prevGrid = cadGrid.visible;
  const prevMode = state.renderMode;
  if (prevMode !== 'optical') {
    state.renderMode = 'optical';
    document.getElementById('sel-render-mode').value = 'optical';
    applyRenderAndAssemblyModes();
  }
  cadGrid.visible = false;

  // Resize offscreen/canvas temporarily to 2560x1600 (16:10 cinema studio frame)
  const prevPixelRatio = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(renderW, renderH, false);
  composer.setSize(renderW, renderH);
  bloomPass.resolution.set(renderW, renderH);

  const aspect = renderW / renderH;
  perspCamera.aspect = aspect;
  perspCamera.updateProjectionMatrix();
  const frustumHalfH = 135;
  orthoCamera.left = -frustumHalfH * aspect;
  orthoCamera.right = frustumHalfH * aspect;
  orthoCamera.top = frustumHalfH;
  orthoCamera.bottom = -frustumHalfH;
  orthoCamera.updateProjectionMatrix();

  composer.render();

  // Composite subtle optical studio vignette + discreet bottom-right Leica technical spec stamp onto output canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = renderW;
  outCanvas.height = renderH;
  const octx = outCanvas.getContext('2d');
  octx.drawImage(canvas, 0, 0, renderW, renderH);

  const vig = octx.createRadialGradient(
    renderW * 0.5, renderH * 0.48, renderW * 0.28,
    renderW * 0.5, renderH * 0.5, renderW * 0.68
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4,5,8,0.42)');
  octx.fillStyle = vig;
  octx.fillRect(0, 0, renderW, renderH);

  // Discreet architectural studio caption bar at bottom right
  octx.font = '600 18px "JetBrains Mono", monospace';
  octx.fillStyle = 'rgba(236, 232, 225, 0.52)';
  octx.textAlign = 'right';
  const specTxt = `3B LİTOFAN STÜDYO RENDER · ${state.params.Form_Tipi.toUpperCase()} ${state.params.Capi_veya_En_mm}×${state.params.Yukseklik_mm}mm · CİDAR ${state.params.Min_Cidar_mm.toFixed(2)}–${state.params.Maks_Cidar_mm.toFixed(2)}mm · ${state.kelvin}K LED`;
  octx.fillText(specTxt, renderW - 42, renderH - 34);

  const dataUrl = outCanvas.toDataURL('image/png');
  document.getElementById('render-shot-img').src = dataUrl;
  document.getElementById('render-modal').classList.remove('hidden');

  outCanvas.toBlob((blob) => {
    if (blob) {
      state.latestRenderBlob = blob;
      triggerDownloadBlob(blob, `Litofan_Gercekci_Studyo_Render_${state.params.Form_Tipi}.png`);
    }
  }, 'image/png');

  // Restore interactive viewport dimensions immediately
  cadGrid.visible = prevGrid;
  renderer.setPixelRatio(prevPixelRatio);
  handleResize();
  composer.render();
}

// ============================================================================
// UI EVENT WIRING
// ============================================================================
let rebuildTimer = null;
function scheduleCadRebuild(rebuildImage = false) {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    if (rebuildImage) rebuildLuminanceFromSource();
    rebuildFullCadAssembly();
  }, 40);
}

function bindSyncedSlider(paramName, minVal, maxVal, rebuildImg = false, customHandler = null) {
  const rng = document.getElementById(paramName);
  const num = document.getElementById(`${paramName}_num`);
  if (!rng || !num) return;

  const applyVal = (raw) => {
    let val = parseFloat(raw);
    if (Number.isNaN(val)) return;
    val = Math.max(minVal, Math.min(maxVal, val));

    if (paramName === 'Min_Cidar_mm' && val > state.params.Maks_Cidar_mm - 0.25) {
      val = Math.max(minVal, +(state.params.Maks_Cidar_mm - 0.25).toFixed(2));
    }
    if (paramName === 'Maks_Cidar_mm' && val < state.params.Min_Cidar_mm + 0.25) {
      val = Math.min(maxVal, +(state.params.Min_Cidar_mm + 0.25).toFixed(2));
    }

    state.params[paramName] = val;
    rng.value = val;
    num.value = paramName.includes('Cidar') || paramName.includes('Tolerans') ? val.toFixed(2) : val;

    if (customHandler) {
      customHandler(val);
    } else {
      scheduleCadRebuild(rebuildImg);
    }
  };

  rng.addEventListener('input', (e) => applyVal(e.target.value));
  num.addEventListener('change', (e) => applyVal(e.target.value));
}

bindSyncedSlider('Capi_veya_En_mm', 80, 200, true);
bindSyncedSlider('Yukseklik_mm', 100, 220, true);
bindSyncedSlider('Min_Cidar_mm', 0.40, 1.80, false);
bindSyncedSlider('Maks_Cidar_mm', 1.80, 4.80, false);
bindSyncedSlider('Cerceve_Kalinlik_mm', 1.6, 6.0, false);
bindSyncedSlider('Taban_Gecme_Toleransi_mm', 0.05, 0.50, false);
bindSyncedSlider('Ic_Isik_Test_Slider', 0, 100, false, () => {
  updateBacklightSimulation();
});

document.querySelectorAll('.seg-btn[data-form]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn[data-form]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const form = btn.dataset.form;
    state.params.Form_Tipi = form;
    document.getElementById('Form_Tipi').value = form;
    scheduleCadRebuild(true);
  });
});

document.querySelectorAll('.k-pill[data-kelvin]').forEach((pill) => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.k-pill[data-kelvin]').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    state.kelvin = Number(pill.dataset.kelvin);
    updateBacklightSimulation();
  });
});

const fileInput = document.getElementById('Fotograf_Yukle');
const dropzone = document.getElementById('photo-dropzone');

async function handleUploadedPhotoFile(file) {
  if (!file) return;
  try {
    const res = await loadImageFileToCanvas(file, 1600);
    state.sourceCanvas = res.canvas;
    state.imageName = res.name;
    document.getElementById('active-photo-name').textContent = res.name;
    rebuildLuminanceFromSource();
    rebuildFullCadAssembly();
  } catch (err) {
    alert(err.message);
  }
}

fileInput.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (file) handleUploadedPhotoFile(file);
});

['dragenter', 'dragover'].forEach((evName) => {
  dropzone.addEventListener(evName, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach((evName) => {
  dropzone.addEventListener(evName, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});
dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) handleUploadedPhotoFile(file);
});

document.getElementById('preset-specimen-select').addEventListener('change', async (e) => {
  const presetId = e.target.value;
  const opt = e.target.selectedOptions[0];
  const res = await loadPresetPhotoCanvas(presetId, 1440);
  state.sourceCanvas = res.canvas;
  state.imageName = opt ? opt.textContent : res.name;
  document.getElementById('active-photo-name').textContent = state.imageName;
  rebuildLuminanceFromSource();
  rebuildFullCadAssembly();
});

document.getElementById('sel-wrap-mode').addEventListener('change', (e) => {
  state.wrapMode = e.target.value;
  scheduleCadRebuild(true);
});

document.getElementById('chk-invert-image').addEventListener('change', (e) => {
  state.invertImage = e.target.checked;
  scheduleCadRebuild(true);
});

document.getElementById('inp-image-contrast').addEventListener('change', (e) => {
  state.imageContrast = Math.max(0.5, Math.min(2.0, parseFloat(e.target.value) || 1.12));
  scheduleCadRebuild(true);
});

document.getElementById('sel-smooth-pass').addEventListener('change', (e) => {
  state.smoothPasses = Number(e.target.value);
  scheduleCadRebuild(true);
});

document.getElementById('sel-material').addEventListener('change', (e) => {
  state.materialKey = e.target.value;
  if (state.assembly) {
    state.bomData = computeCanliMetrajTablosu(state.assembly, state.params, state.materialKey);
    state.latestSvgMarkup = generateImalatAntetiSVG(state.assembly, state.params, state.bomData, state.imageName);
    updateTelemetryAndDOM(1);
  }
});

document.getElementById('sel-mesh-quality').addEventListener('change', (e) => {
  state.meshQuality = e.target.value;
  scheduleCadRebuild(true);
});

document.getElementById('sel-render-mode').addEventListener('change', (e) => {
  state.renderMode = e.target.value;
  applyRenderAndAssemblyModes();
});

document.getElementById('sel-studio-lighting').addEventListener('change', (e) => {
  state.studioPreset = e.target.value;
  updateBacklightSimulation();
});

document.getElementById('sel-assembly-mode').addEventListener('change', (e) => {
  state.assemblyMode = e.target.value;
  applyRenderAndAssemblyModes();
});

document.getElementById('chk-show-grid').addEventListener('change', (e) => {
  state.showGrid = e.target.checked;
  cadGrid.visible = state.renderMode === 'optical' ? state.showGrid : true;
});

document.getElementById('chk-section-cut').addEventListener('change', (e) => {
  state.sectionEnabled = e.target.checked;
  const rng = document.getElementById('rng-section-offset');
  rng.disabled = !state.sectionEnabled;
  clipPlane.constant = state.sectionOffset;
  applyRenderAndAssemblyModes();
});

document.getElementById('rng-section-offset').addEventListener('input', (e) => {
  state.sectionOffset = parseFloat(e.target.value);
  clipPlane.constant = state.sectionOffset;
});

function setCameraProjection(mode) {
  state.cameraMode = mode;
  document.getElementById('btn-proj-persp').classList.toggle('active', mode === 'persp');
  document.getElementById('btn-proj-ortho').classList.toggle('active', mode === 'ortho');

  const prevCam = activeCamera;
  activeCamera = mode === 'ortho' ? orthoCamera : perspCamera;
  activeCamera.position.copy(prevCam.position);
  activeCamera.quaternion.copy(prevCam.quaternion);
  controls.object = activeCamera;
  renderPass.camera = activeCamera;
  handleResize();
  controls.update();
}

document.getElementById('btn-proj-persp').addEventListener('click', () => setCameraProjection('persp'));
document.getElementById('btn-proj-ortho').addEventListener('click', () => setCameraProjection('ortho'));

document.querySelectorAll('.vp-btn[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    const midY = state.assembly ? state.assembly.spec.assembledTotalHeightMm * 0.48 : 80;
    const dist = state.assembly ? Math.max(265, state.assembly.spec.assembledTotalHeightMm * 1.98) : 330;

    if (view === 'iso') {
      activeCamera.position.set(dist * 0.56, midY + dist * 0.28, dist * 0.96);
      controls.target.set(8, midY, 0);
    } else if (view === 'front') {
      activeCamera.position.set(0, midY, dist * 1.15);
      controls.target.set(0, midY, 0);
    } else if (view === 'right') {
      activeCamera.position.set(dist * 1.15, midY, 0);
      controls.target.set(0, midY, 0);
    } else if (view === 'top') {
      activeCamera.position.set(0, dist * 1.35, 0.01);
      controls.target.set(0, 0, 0);
    } else if (view === 'joint') {
      if (!state.sectionEnabled) {
        state.sectionEnabled = true;
        document.getElementById('chk-section-cut').checked = true;
        document.getElementById('rng-section-offset').disabled = false;
        clipPlane.constant = 0;
        applyRenderAndAssemblyModes();
      }
      activeCamera.position.set(108, 30, 118);
      controls.target.set(0, 15, 0);
    }
    controls.update();
  });
});

// ============================================================================
// EXPORTERS (.PNG STUDIO RENDER, .STL LITHOPHANE, .STL BASE, .SVG, .CSV, .SCAD)
// ============================================================================
document.getElementById('btn-studio-render').addEventListener('click', capturePhotorealisticStudioRender);
document.getElementById('btn-render-dl-png').addEventListener('click', () => {
  if (state.latestRenderBlob) {
    triggerDownloadBlob(state.latestRenderBlob, `Litofan_Gercekci_Studyo_Render_${state.params.Form_Tipi}.png`);
  } else {
    capturePhotorealisticStudioRender();
  }
});
document.getElementById('btn-render-close').addEventListener('click', () => {
  document.getElementById('render-modal').classList.add('hidden');
});

function downloadLithophaneSTL() {
  if (!state.assembly) return;
  const { spec, lithophaneGeom } = state.assembly;
  const fname = `Litofan_Govde_DFM_${spec.formType}_${spec.spanMm}x${spec.heightMm}mm.stl`;
  exportWatertightBinarySTL(lithophaneGeom, fname, `LITOFAN_GOVDE_DFM_${spec.formType}_1MM`);
}

function downloadSnapFitBaseSTL() {
  if (!state.assembly) return;
  const { spec, baseGeom } = state.assembly;
  const fname = `SnapFit_E14_Taban_DFM_${spec.formType}_Tol${spec.clearanceMm.toFixed(2)}mm.stl`;
  exportWatertightBinarySTL(baseGeom, fname, `SNAPFIT_TABAN_DFM_${spec.formType}_1MM`);
}

function downloadAntetSVG() {
  if (!state.latestSvgMarkup) return;
  exportImalatAntetiSVG(state.latestSvgMarkup, `Imalat_Anteti_${state.params.Form_Tipi}.svg`);
}

function downloadMetrajCSV() {
  if (!state.bomData) return;
  exportCanliMetrajCSV(state.bomData, state.params, `Canli_Metraj_Tablosu_${state.params.Form_Tipi}.csv`);
}

document.getElementById('btn-top-litho-stl').addEventListener('click', downloadLithophaneSTL);
document.getElementById('btn-dl-litho-stl').addEventListener('click', downloadLithophaneSTL);

document.getElementById('btn-top-base-stl').addEventListener('click', downloadSnapFitBaseSTL);
document.getElementById('btn-dl-base-stl').addEventListener('click', downloadSnapFitBaseSTL);

document.getElementById('btn-export-svg').addEventListener('click', downloadAntetSVG);
document.getElementById('btn-dl-antet-svg').addEventListener('click', downloadAntetSVG);
document.getElementById('btn-modal-dl-svg').addEventListener('click', downloadAntetSVG);

document.getElementById('btn-export-csv').addEventListener('click', downloadMetrajCSV);
document.getElementById('btn-dl-metraj-csv').addEventListener('click', downloadMetrajCSV);

document.getElementById('btn-dl-scad').addEventListener('click', () => {
  if (state.assembly) {
    exportParametricSCAD(state.assembly.spec, `SnapFit_Taban_${state.params.Form_Tipi}.scad`);
  }
});

const antetModal = document.getElementById('antet-modal');
function openAntetModal() {
  document.getElementById('antet-modal-body').innerHTML = state.latestSvgMarkup;
  antetModal.classList.remove('hidden');
}
function closeAntetModal() {
  antetModal.classList.add('hidden');
}

document.getElementById('btn-zoom-antet').addEventListener('click', openAntetModal);
document.getElementById('antet-svg-stage').addEventListener('click', openAntetModal);
document.getElementById('btn-modal-close').addEventListener('click', closeAntetModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAntetModal();
    document.getElementById('render-modal').classList.add('hidden');
  }
});

// ============================================================================
// RESIZE & RENDER LOOP
// ============================================================================
function handleResize() {
  const w = Math.max(100, container.clientWidth);
  const h = Math.max(100, container.clientHeight);
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloomPass.resolution.set(w, h);

  const aspect = w / h;
  perspCamera.aspect = aspect;
  perspCamera.updateProjectionMatrix();

  const frustumHalfH = 135;
  orthoCamera.left = -frustumHalfH * aspect;
  orthoCamera.right = frustumHalfH * aspect;
  orthoCamera.top = frustumHalfH;
  orthoCamera.bottom = -frustumHalfH;
  orthoCamera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(() => handleResize());
resizeObserver.observe(container);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  composer.render();
}

// ============================================================================
// ASYNC BOOTSTRAP WITH REAL PHOTOGRAPHIC SPECIMEN
// ============================================================================
async function initStudio() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('studio_only') === '1') {
    document.body.classList.add('studio-shot-only');
  }
  const initialPreset = urlParams.get('preset') || 'galata_bosphorus';
  if (urlParams.get('lighting')) {
    state.studioPreset = urlParams.get('lighting');
  }

  handleResize();
  animate();
  try {
    const initialPhoto = await loadPresetPhotoCanvas(initialPreset, 1440);
    state.sourceCanvas = initialPhoto.canvas;
    state.imageName = initialPhoto.name;
  } catch {
    state.sourceCanvas = renderFallbackCanvas(960, 640);
  }
  rebuildLuminanceFromSource();
  rebuildFullCadAssembly();
}

initStudio();
