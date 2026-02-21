import * as THREE from "three";

// ==========================================
// PARAMETRİK SAHNE OLUŞTURUCU
//
// ParametricModel.tsx'teki geometri uretim
// mantığının pure Three.js versiyonu.
// GLTFExporter icin React disinda sahne olusturur.
//
// ONEMLI: ParametricModel.tsx ile senkron tutulmalidir.
// ==========================================

export function buildParametricScene(
  parameters: Record<string, number | string>,
  productType: string
): THREE.Scene {
  const scene = new THREE.Scene();
  const color = (parameters.color as string) || "#FFFFFF";

  // Ambiyans isigi ekle (model-viewer'da daha iyi gorunsun)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  switch (productType) {
    case "vase":
      buildVase(scene, parameters, color);
      break;
    case "stand":
      buildStand(scene, parameters, color);
      break;
    case "keychain":
      buildKeychain(scene, parameters, color);
      break;
    case "lamp":
      buildLamp(scene, parameters, color);
      break;
    case "pencilHolder":
      buildPencilHolder(scene, parameters, color);
      break;
    case "bracelet":
      buildBracelet(scene, parameters, color);
      break;
    case "gear":
      buildGear(scene, parameters, color);
      break;
    default:
      buildVase(scene, parameters, color);
  }

  return scene;
}

// ==========================================
// VAZO
// Bkz: ParametricModel.tsx VaseModel
// ==========================================
function buildVase(
  scene: THREE.Scene,
  parameters: Record<string, number | string>,
  color: string
): void {
  const height = ((parameters.height as number) || 200) / 100;
  const width = ((parameters.width as number) || 100) / 100;
  const waveFrequency = (parameters.waveFrequency as number) || 4;

  const points: THREE.Vector2[] = [];
  const segments = 64;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const y = t * height - height / 2;

    const baseRadius = width * 0.3;
    const midRadius = width * 0.5;
    const topRadius = width * 0.4;

    let radius;
    if (t < 0.3) {
      radius = baseRadius + (midRadius - baseRadius) * (t / 0.3);
    } else if (t < 0.7) {
      const mt = (t - 0.3) / 0.4;
      radius = midRadius + (topRadius - midRadius) * mt * mt;
    } else {
      const tt = (t - 0.7) / 0.3;
      radius = topRadius - topRadius * 0.15 * Math.sin(tt * Math.PI);
    }

    const wave = Math.sin(t * Math.PI * waveFrequency) * (width * 0.06);
    radius += wave;

    points.push(new THREE.Vector2(Math.max(0.02, radius), y));
  }

  const geometry = new THREE.LatheGeometry(points, 48);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
}

// ==========================================
// TELEFON STANDI
// Bkz: ParametricModel.tsx StandModel
// ==========================================
function buildStand(
  scene: THREE.Scene,
  parameters: Record<string, number | string>,
  color: string
): void {
  const standWidth = ((parameters.width as number) || 80) / 100;
  const angle = ((parameters.angle as number) || 60) * (Math.PI / 180);
  const standHeight = ((parameters.height as number) || 100) / 100;

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.1,
  });
  const group = new THREE.Group();

  // Taban
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(standWidth, 0.08, standWidth * 0.8),
    mat
  );
  base.position.set(0, -0.5, 0);
  group.add(base);

  // Arka destek
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(standWidth * 0.9, standHeight, 0.06),
    mat
  );
  back.position.set(0, standHeight / 2 - 0.45, -standWidth * 0.3);
  back.rotation.set(angle - Math.PI / 2, 0, 0);
  group.add(back);

  // On dudak
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(standWidth * 0.9, 0.08, 0.06),
    mat
  );
  lip.position.set(0, -0.42, standWidth * 0.25);
  group.add(lip);

  scene.add(group);
}

// ==========================================
// ANAHTARLIK
// Bkz: ParametricModel.tsx KeychainModel
// ==========================================
function buildKeychain(
  scene: THREE.Scene,
  parameters: Record<string, number | string>,
  color: string
): void {
  const thickness = ((parameters.thickness as number) || 3) / 10;
  const diameter = ((parameters.diameter as number) || 40) / 100;

  const group = new THREE.Group();

  // Ana disk
  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(diameter, diameter, thickness, 32),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.25,
      metalness: 0.15,
    })
  );
  group.add(disk);

  // Halka deligi
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 16, 32),
    new THREE.MeshStandardMaterial({
      color: "#888888",
      roughness: 0.4,
      metalness: 0.6,
    })
  );
  ring.position.set(0, 0, diameter + 0.05);
  group.add(ring);

  scene.add(group);
}

// ==========================================
// GEOMETRIK MASA LAMBASI
// Bkz: ParametricModel.tsx LampModel
// ==========================================
function buildLamp(
  scene: THREE.Scene,
  parameters: Record<string, number | string>,
  color: string
): void {
  const diameter = ((parameters.diameter as number) || 150) / 100;
  const height = ((parameters.height as number) || 250) / 100;
  const patternDensity = (parameters.patternDensity as number) || 3;
  const detail = Math.max(0, Math.min(patternDensity - 1, 4));

  const group = new THREE.Group();

  // Taban
  const baseMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(diameter * 0.2, diameter * 0.25, 0.08, 32),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 })
  );
  baseMesh.position.set(0, -height / 2, 0);
  group.add(baseMesh);

  // Govde
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, height * 0.6, 8),
    new THREE.MeshStandardMaterial({
      color: "#666666",
      roughness: 0.5,
      metalness: 0.3,
    })
  );
  stem.position.set(0, -height * 0.1, 0);
  group.add(stem);

  // Abajur (wireframe yerine solid - GLTFExporter wireframe desteklemez)
  const shade = new THREE.Mesh(
    new THREE.IcosahedronGeometry(diameter * 0.45, detail),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.2,
      metalness: 0.05,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  shade.position.set(0, height * 0.25, 0);
  group.add(shade);

  // Ampul efekti
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 16, 16),
    new THREE.MeshStandardMaterial({
      color: "#FFF8E1",
      emissive: new THREE.Color("#FFF8E1"),
      emissiveIntensity: 0.8,
    })
  );
  bulb.position.set(0, height * 0.25, 0);
  group.add(bulb);

  scene.add(group);
}

// ==========================================
// MODULER KALEM KUTUSU
// Bkz: ParametricModel.tsx PencilHolderModel
// ==========================================
function buildPencilHolder(
  scene: THREE.Scene,
  parameters: Record<string, number | string>,
  color: string
): void {
  const compartments = Number((parameters.compartments as number) || 3);
  const height = ((parameters.height as number) || 100) / 100;

  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const group = new THREE.Group();

  // Taban plaka
  const basePlate = new THREE.Mesh(
    new THREE.BoxGeometry(compartments * 0.32, 0.06, 0.35),
    mat
  );
  basePlate.position.set(0, -height / 2, 0);
  group.add(basePlate);

  // Bolmeler
  const totalWidth = compartments * 0.3;
  for (let i = 0; i < compartments; i++) {
    const x = (i - (compartments - 1) / 2) * 0.3;
    const heightVariation =
      1 - Math.abs(i - (compartments - 1) / 2) * 0.08;
    const radius = Math.min(0.14, (totalWidth / compartments) * 0.45);
    const h = height * heightVariation;

    // Dis silindir
    const outer = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.05, h, 24),
      mat
    );
    outer.position.set(x, h / 2 - height / 2 + 0.03, 0);
    group.add(outer);

    // Ic bosluk
    const inner = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.85, radius * 0.9, h - 0.04, 24),
      new THREE.MeshStandardMaterial({
        color: "#1a1a1a",
        roughness: 0.8,
        side: THREE.BackSide,
      })
    );
    inner.position.set(x, h / 2 - height / 2 + 0.06, 0);
    group.add(inner);
  }

  scene.add(group);
}

// ==========================================
// BILEKLIK
// Bkz: ParametricModel.tsx BraceletModel
// ==========================================
function buildBracelet(
  scene: THREE.Scene,
  parameters: Record<string, number | string>,
  color: string
): void {
  const diameter = ((parameters.diameter as number) || 65) / 100;
  const bandWidth = ((parameters.bandWidth as number) || 15) / 100;

  const tubeRadius = bandWidth / 2;
  const torusRadius = diameter / 2;

  const group = new THREE.Group();

  const bracelet = new THREE.Mesh(
    new THREE.TorusGeometry(torusRadius, tubeRadius, 24, 48),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.1,
    })
  );
  bracelet.rotation.set(Math.PI / 2, 0, 0);
  group.add(bracelet);

  scene.add(group);
}

// ==========================================
// PARAMETRIK DISLI CARK
// Bkz: ParametricModel.tsx GearModel
// ==========================================
function buildGear(
  scene: THREE.Scene,
  parameters: Record<string, number | string>,
  color: string
): void {
  const teethCount = Number((parameters.teethCount as number) || 24);
  const modulePar = Number((parameters.module as number) || 1);
  const thickness = ((parameters.thickness as number) || 5) / 10;

  const pitchRadius = (teethCount * modulePar) / 20;
  const outerRadius = pitchRadius + modulePar * 0.06;
  const innerRadius = pitchRadius - modulePar * 0.07;
  const holeRadius = pitchRadius * 0.25;

  const shape = new THREE.Shape();
  const toothAngle = (Math.PI * 2) / teethCount;
  const toothWidth = toothAngle * 0.35;

  for (let i = 0; i < teethCount; i++) {
    const angle = i * toothAngle;
    const rootStart = angle + toothWidth;
    const rootEnd = angle + toothAngle - toothWidth;
    const tipStart = angle;
    const tipEnd = angle + toothWidth;

    if (i === 0) {
      shape.moveTo(
        Math.cos(tipStart) * outerRadius,
        Math.sin(tipStart) * outerRadius
      );
    }

    shape.lineTo(
      Math.cos(tipEnd) * outerRadius,
      Math.sin(tipEnd) * outerRadius
    );
    shape.lineTo(
      Math.cos(rootStart) * innerRadius,
      Math.sin(rootStart) * innerRadius
    );
    shape.lineTo(
      Math.cos(rootEnd) * innerRadius,
      Math.sin(rootEnd) * innerRadius
    );

    const nextTipStart = (i + 1) * toothAngle;
    shape.lineTo(
      Math.cos(nextTipStart) * outerRadius,
      Math.sin(nextTipStart) * outerRadius
    );
  }

  shape.closePath();

  // Merkez deligi
  const holePath = new THREE.Path();
  const holeSegments = 32;
  for (let i = 0; i <= holeSegments; i++) {
    const a = (i / holeSegments) * Math.PI * 2;
    const x = Math.cos(a) * holeRadius;
    const y = Math.sin(a) * holeRadius;
    if (i === 0) holePath.moveTo(x, y);
    else holePath.lineTo(x, y);
  }
  shape.holes.push(holePath);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  geometry.center();

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: color || "#888888",
      roughness: 0.4,
      metalness: 0.5,
    })
  );
  mesh.rotation.set(Math.PI / 2, 0, 0);
  scene.add(mesh);
}
