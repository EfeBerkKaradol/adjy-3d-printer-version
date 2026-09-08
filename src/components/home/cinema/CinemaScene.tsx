"use client";

import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { JHook, ModuleBody, PerforatedPanel } from "./parts";
import { MATERIAL, MODULES, PANEL, hookAnchors } from "./panelSystem";
import {
  attachAmount,
  cameraAt,
  CAMERA_FOV,
  cameraDistanceScale,
  compositionBias,
  explodeScale,
  hookDemoTransform,
  settleRotation,
} from "./timeline";

// ==========================================
// SAHNE
//
// Kare başına React state'i güncellenmez — bütün hareket
// useFrame içinde doğrudan nesnelerin transform'larına
// yazılır. Böylece ağaç yeniden render edilmeden 60 fps
// akar.
//
// Kaydırma değeri hafifçe sönümlenir (zaman sabiti ~70ms):
// görüntüyü yumuşatacak kadar var, girdiden kopmayacak
// kadar kısa. Kullanıcı durduğunda kare olduğu yerde kalır.
// ==========================================

interface CinemaSceneProps {
  progress: RefObject<number>;
  isMobile: boolean;
  /** Hareket azaltmada sahne bu tek karede sabit durur */
  frozenAt?: number;
}

/** Modülün levha önündeki oturma derinliği */
function restZ(depth: number) {
  return PANEL.thickness / 2 + depth / 2;
}

export function CinemaScene({ progress, isMobile, frozenAt }: CinemaSceneProps) {
  const moduleRefs = useRef<Array<THREE.Group | null>>([]);
  const hookDemoRef = useRef<THREE.Group>(null);
  const smoothed = useRef(frozenAt ?? 0);
  const lookAt = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    // Kamera kare durumundan alınır: hook'tan dönen nesneyi
    // doğrudan değiştirmek yerine sahnenin kendi referansı.
    const camera = state.camera as THREE.PerspectiveCamera;

    const p =
      frozenAt !== undefined
        ? frozenAt
        : (smoothed.current = THREE.MathUtils.damp(
            smoothed.current,
            progress.current,
            14,
            Math.min(delta, 0.1)
          ));

    // ---- Kamera ----
    // Görüş açısı Canvas'ta yalnızca kurulum anında okunuyor;
    // kullanıcı pencereyi mobil eşiğinin öbür tarafına
    // geçirdiğinde kadrajın da güncellenmesi için burada tutulur.
    const wantFov = isMobile ? CAMERA_FOV.mobile : CAMERA_FOV.desktop;
    if (camera.fov !== wantFov) {
      camera.fov = wantFov;
      camera.updateProjectionMatrix();
    }

    const cam = cameraAt(p);
    const k = cameraDistanceScale(isMobile);
    const bias = compositionBias(p, isMobile);
    camera.position.set(cam.pos[0] * k + bias, cam.pos[1] * k, cam.pos[2] * k);
    lookAt.current.set(cam.target[0] + bias, cam.target[1], cam.target[2]);
    camera.lookAt(lookAt.current);

    // ---- Modüller ----
    const spread = explodeScale(p);
    for (let i = 0; i < MODULES.length; i += 1) {
      const group = moduleRefs.current[i];
      if (!group) continue;
      const mod = MODULES[i];
      const a = attachAmount(mod, p);
      const off = (1 - a) * spread;

      group.position.set(
        mod.x + mod.explode[0] * off,
        mod.y + mod.explode[1] * off,
        restZ(mod.d) + mod.explode[2] * off
      );
      const rot = settleRotation(mod, a);
      group.rotation.set(rot[0], rot[1], rot[2]);
    }

    // ---- J-kanca gösterimi ----
    const hook = hookDemoRef.current;
    if (hook) {
      const h = hookDemoTransform(p);
      hook.visible = h.visible;
      hook.position.set(h.x, h.y, h.z);
      hook.rotation.set(0, 0, h.rotZ);
    }
  });

  return (
    <group>
      {/* Arka düzlem: oda değil, yalnızca ürünü ayıran nötr yüzey.
          Beyaz ürün beyaz zeminde kaybolmasın diye biraz koyu. */}
      <mesh position={[0, 0, -2.3]} receiveShadow>
        <planeGeometry args={[40, 26]} />
        <meshStandardMaterial color="#C7C2B7" roughness={1} metalness={0} />
      </mesh>

      {/* Anahtar ışık — gölgeyi bu üretir */}
      <directionalLight
        position={[-4.2, 5.0, 6.0]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-4.5, 4.5, 4.5, -4.5, 0.1, 24]} />
      </directionalLight>
      {/* Dolgu: gölgeleri boğmadan açar */}
      <directionalLight position={[5.2, 1.6, 4.2]} intensity={0.75} />
      {/* Kenar ışığı: beyaz ürünü açık zeminden ayırır */}
      <directionalLight position={[-3.5, 0.8, -3.2]} intensity={0.65} />
      <hemisphereLight args={["#FFFFFF", "#B8B2A6", 0.5]} />
      <ambientLight intensity={0.24} />

      {/* Levha ve üzerindeki sabit bağlantı noktaları.
          Modüller uzaklaşırken kancalar levhada kalır —
          sistemin nereden tutunduğu böyle görünür. */}
      <group>
        <PerforatedPanel />
        {MODULES.map((mod) =>
          hookAnchors(mod).map(([hx, hy], i) => (
            <group key={`${mod.id}-${i}`} position={[hx, hy, 0]}>
              <JHook scale={0.6} />
            </group>
          ))
        )}
      </group>

      {/* Mekanizmayı anlatan tek kanca */}
      <group ref={hookDemoRef} visible={false}>
        <JHook scale={1.35} />
      </group>

      {/* Modüller */}
      {MODULES.map((mod, i) => (
        <group
          key={mod.id}
          ref={(el) => {
            moduleRefs.current[i] = el;
          }}
          position={[mod.x, mod.y, restZ(mod.d)]}
        >
          <ModuleBody mod={mod} />
        </group>
      ))}

      {/* Levhanın duvara oturduğunu belirten ince gölge kaidesi */}
      <mesh position={[0, -PANEL.height / 2 - 0.02, -0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 1.6]} />
        <meshStandardMaterial color={MATERIAL.bodyShade} roughness={1} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
