"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, AdaptiveDpr, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import { ParametricModel } from "@/components/3d/ParametricModel";
import { PANEL_ATTACHMENTS } from "@/components/3d/panelAttachments";

// ==========================================
// BİR NESNENİN ÜÇ HÂLİ — SAHNE
//
// Tek bir nesnenin (delikli duvar paneli) scroll
// boyunca kesintisiz dönüşümü. Üç ayrı görsel değil,
// tek bir zaman çizelgesi:
//
//   parçalar → panel → modül takılı sistem
//   → patlatılmış görünüm → üretilmiş nesne
//
// Performans mimarisi:
// Scroll ilerlemesi bir MotionValue olarak gelir ve
// yalnızca useFrame içinde OKUNUR. Yani scroll sırasında
// tek bir React render'ı olmaz; nesnelerin matrisleri
// doğrudan mutasyona uğrar.
// ==========================================

/** Panelin gerçek parametreleri — konfigüratördekiyle aynı model */
const PANEL_PARAMS = {
  width: 240,
  height: 240,
  thickness: 5,
  cell_size: 25,
  border_width: 10,
  color: "#1D1D1B",
} as const;

/** 0..1 aralığında yumuşak geçiş */
function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ==========================================
// PARÇALAR — panelin delik ızgarasına oturan küpler
// Dağınık başlar, ilerleme arttıkça hedef ızgaraya
// çekilirler: "exploded assembly" hissi.
// ==========================================
function Particles({
  progress,
  count,
}: {
  progress: MotionValue<number>;
  count: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Hedef konumlar: panel yüzeyindeki düzenli ızgara.
  // Dağınık konumlar sabit bir tohumla üretilir ki her
  // render'da aynı yerden gelsinler (scroll geri alınca tutarlı).
  const { targets, scattered } = useMemo(() => {
    const targets: THREE.Vector3[] = [];
    const scattered: THREE.Vector3[] = [];
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const w = PANEL_PARAMS.width / 100;
    const h = PANEL_PARAMS.height / 100;

    let seed = 1337;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < count; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      targets.push(
        new THREE.Vector3(
          (c / (cols - 1) - 0.5) * w * 0.82,
          (r / (rows - 1) - 0.5) * h * 0.82,
          0
        )
      );
      // Küre içinde dağınık başlangıç
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const radius = 3.5 + rand() * 3.5;
      scattered.push(
        new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta) * 0.7,
          radius * Math.cos(phi)
        )
      );
    }
    return { targets, scattered };
  }, [count]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const p = progress.get();

    // 0.02 → 0.30 arasında toplanır, 0.30 → 0.36 arasında kaybolur
    const gather = smoothstep(0.02, 0.3, p);
    const fade = 1 - smoothstep(0.28, 0.36, p);

    for (let i = 0; i < targets.length; i++) {
      // Her parçacık hafif farklı zamanlamayla gelsin (dalga hissi)
      const stagger = (i % 17) / 17;
      const t = Math.min(1, Math.max(0, gather * 1.25 - stagger * 0.25));
      const ease = t * t * (3 - 2 * t);

      dummy.position.lerpVectors(scattered[i], targets[i], ease);
      const s = 0.055 * fade * (0.6 + ease * 0.4);
      dummy.scale.setScalar(Math.max(0.0001, s));
      dummy.rotation.set((1 - ease) * 3 + i, (1 - ease) * 2, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = fade > 0.01;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#1D1D1B" roughness={0.45} metalness={0.05} />
    </instancedMesh>
  );
}

// ==========================================
// PANEL — gerçek parametrik geometri
// Görünürlüğü ve patlatma ofseti ilerlemeye bağlı.
// ==========================================
function Panel({ progress }: { progress: MotionValue<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const p = progress.get();

    // Parçacıklar yerine oturdukça panel belirir
    const appear = smoothstep(0.26, 0.36, p);
    // Yapılandırma aşamasında genişler (gerçek konfigürasyon hissi)
    const widen = smoothstep(0.5, 0.68, p);
    // Üretim aşamasında katmanlarına ayrılır
    const explode = smoothstep(0.72, 0.86, p) * (1 - smoothstep(0.9, 0.98, p));

    g.visible = appear > 0.01;
    g.scale.setScalar(0.9 + appear * 0.1);
    g.scale.x *= 1 + widen * 0.28;
    g.position.z = -explode * 0.7;

    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat) return;
      mat.transparent = appear < 0.995;
      mat.opacity = appear;
      // Patlatma sırasında tel kafes: "henüz üretilmedi"
      mat.wireframe = explode > 0.45;
    });
  });

  return (
    <group ref={groupRef}>
      <ParametricModel parameters={PANEL_PARAMS} productType="skadisPanel" />
    </group>
  );
}

// ==========================================
// MODÜL — panele takılan gerçek eklenti
// Kayıtta tanımlı xFrac/yFrac konumuna oturur.
// ==========================================
function AttachedModule({ progress }: { progress: MotionValue<number> }) {
  const def = PANEL_ATTACHMENTS[0];
  const { scene } = useGLTF(def.url);
  const groupRef = useRef<THREE.Group>(null);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      // Eklentinin gerçek yüksekliği panel ölçeğine oturtulur
      const target = (def.heightMm / 100) * 0.75;
      clone.scale.multiplyScalar(target / maxDim);
    }
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: "#2A2A28",
          roughness: 0.4,
          metalness: 0.05,
        });
      }
    });
    return clone;
  }, [scene, def.heightMm]);

  const target = useMemo(
    () =>
      new THREE.Vector3(
        def.xFrac * (PANEL_PARAMS.width / 100),
        def.yFrac * (PANEL_PARAMS.height / 100),
        0.35
      ),
    [def.xFrac, def.yFrac]
  );

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const p = progress.get();

    // 0.42 → 0.60 arasında panele yaklaşıp yerine oturur
    const snap = smoothstep(0.42, 0.6, p);
    const explode = smoothstep(0.72, 0.86, p) * (1 - smoothstep(0.9, 0.98, p));

    g.visible = snap > 0.01;
    g.position.set(
      target.x + (1 - snap) * 2.2,
      target.y + (1 - snap) * 1.1,
      target.z + (1 - snap) * 2.4 + explode * 1.6
    );
    g.rotation.y = (1 - snap) * 1.2 + (def.rotationY ?? 0);
    g.scale.setScalar(0.7 + snap * 0.3);

    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.transparent = snap < 0.995;
        mat.opacity = snap;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

// ==========================================
// KAMERA — ilerlemeye bağlı, yavaş ve mekanik
// ==========================================
function CameraRig({ progress }: { progress: MotionValue<number> }) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const p = progress.get();

    // Uzak/frontal → yaklaş → hafif perspektif → geri çekil → hero
    const approach = smoothstep(0.05, 0.32, p);
    const perspective = smoothstep(0.35, 0.66, p);
    const pullBack = smoothstep(0.7, 0.88, p);
    const heroOrbit = smoothstep(0.88, 1, p);

    const x = perspective * 2.4 + heroOrbit * 1.1;
    const y = 0.4 + perspective * 0.7 + pullBack * 0.5;
    const z = 8.2 - approach * 2.6 + pullBack * 2.2 - heroOrbit * 0.8;

    desired.set(x, y, z);
    // Kare hızından bağımsız yumuşatma — ani dönüş yok
    const t = 1 - Math.pow(0.0025, delta);
    camera.position.lerp(desired, t);
    camera.lookAt(target);
  });

  return null;
}

interface ObjectStorySceneProps {
  progress: MotionValue<number>;
  active: boolean;
  /** Mobilde daha az parçacık */
  particleCount: number;
}

export default function ObjectStoryScene({
  progress,
  active,
  particleCount,
}: ObjectStorySceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.4, 8.2], fov: 40 }}
      aria-hidden="true"
    >
      <AdaptiveDpr pixelated />

      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 7, 6]} intensity={1.5} />
      <directionalLight position={[-6, 2, -4]} intensity={0.35} />

      <CameraRig progress={progress} />
      <Particles progress={progress} count={particleCount} />
      <Panel progress={progress} />
      <AttachedModule progress={progress} />

      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.22}
        scale={12}
        blur={2.8}
        far={5}
        resolution={512}
      />
    </Canvas>
  );
}

useGLTF.preload(PANEL_ATTACHMENTS[0].url);
