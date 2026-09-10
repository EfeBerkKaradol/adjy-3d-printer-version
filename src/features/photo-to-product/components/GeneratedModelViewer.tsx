"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Expand, RotateCcw } from "lucide-react";

// ==========================================
// 3D GÖRÜNTÜLEYİCİ
//
// Geometri mm biriminde gelir; sahne onu kadraja sığacak
// şekilde ölçekler. Kadraj yalnızca yeni bir model geldiğinde
// yeniden kurulur — ölçü her oynadığında kamera zıplasaydı
// karşılaştırma yapmak imkânsız olurdu.
// ==========================================

interface ViewerProps {
  geometry: THREE.BufferGeometry;
  color: string;
  /** Değiştiğinde kadraj yeniden kurulur */
  fitKey: string;
}

function Fitter({ geometry, fitKey }: { geometry: THREE.BufferGeometry; fitKey: string }) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    geometry.computeBoundingSphere();
    const r = geometry.boundingSphere?.radius ?? 100;
    const d = r * 2.9;
    // Yalnızca konum değiştirilir; near/far Canvas üzerinde
    // sabit verildi. Model mm biriminde olduğu için tek bir
    // aralık bütün ölçüleri karşılıyor.
    camera.position.set(d * 0.55, d * 0.42, d * 0.82);
    camera.lookAt(0, 0, 0);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
    // fitKey kasıtlı bağımlılık: parametre değişimlerinde değil,
    // yalnızca yeni modelde yeniden kadrajlanır.
  }, [fitKey, camera, geometry]);

  return <OrbitControls ref={controls} makeDefault enablePan enableDamping dampingFactor={0.08} />;
}

export function GeneratedModelViewer({ geometry, color, fitKey }: ViewerProps) {
  const holder = useRef<HTMLDivElement>(null);
  const [resetToken, setResetToken] = useState(0);

  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.04 }),
    [color]
  );

  const radius = useMemo(() => {
    geometry.computeBoundingSphere();
    return geometry.boundingSphere?.radius ?? 100;
  }, [geometry]);

  return (
    <div ref={holder} className="relative h-full w-full bg-surface-2">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 38, position: [120, 90, 180], near: 0.5, far: 8000 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.5} />
        <hemisphereLight args={["#ffffff", "#cbc6bb", 0.7]} />
        <directionalLight
          position={[radius * 1.6, radius * 2.4, radius * 2]}
          intensity={2.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-radius * 2, radius * 0.6, -radius]} intensity={0.5} />

        <mesh geometry={geometry} material={material} castShadow receiveShadow />

        <ContactShadows
          position={[0, -radius * 0.72, 0]}
          scale={radius * 4}
          opacity={0.32}
          blur={2.4}
          far={radius * 2}
        />

        <Fitter geometry={geometry} fitKey={`${fitKey}-${resetToken}`} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
        <span className="rounded bg-background/85 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur-sm">
          Sürükle: döndür · Kaydır: yakınlaştır
        </span>
        <div className="pointer-events-auto flex gap-1.5">
          <button
            type="button"
            onClick={() => setResetToken((v) => v + 1)}
            aria-label="Görünümü sıfırla"
            className="rounded bg-background/85 p-2 backdrop-blur-sm transition-colors hover:bg-background"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Tam ekran"
            onClick={() => {
              const el = holder.current;
              if (!el) return;
              if (document.fullscreenElement) void document.exitFullscreen();
              else void el.requestFullscreen?.();
            }}
            className="rounded bg-background/85 p-2 backdrop-blur-sm transition-colors hover:bg-background"
          >
            <Expand className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
