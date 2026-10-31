"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { AdaptiveDpr, ContactShadows, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { FurnitureModel } from "./FurnitureModel";
import type { GozAnahtari, MobilyaYapilandirma } from "@/lib/furniture/types";

// ==========================================
// MOBİLYA SAHNESİ
//
// Ürün sayfası yok, sahne var. Woodcoder'da olduğu gibi
// müşteri doğrudan ürünün karşısına oturuyor ve ölçüyü orada
// değiştiriyor.
//
// Kamera ölçü değiştikçe kendini toparlar: 60 santimlik kutu
// rafla 240 santimlik kitaplık aynı uzaklıktan bakılamaz.
// Toparlarken bakış YÖNÜ korunur — müşteri modeli çevirdiyse
// kaydırıcıyı her oynattığında kamerası başa dönmez.
// ==========================================

interface Props {
  cfg: MobilyaYapilandirma;
  gozSecimi: boolean;
  seciliGoz: GozAnahtari | null;
  onGozSec: (anahtar: GozAnahtari) => void;
  siluet: boolean;
  /** Arka planı sayfayla aynı tutmak için */
  className?: string;
}

function KameraUydur({ cfg }: { cfg: MobilyaYapilandirma }) {
  const { camera } = useThree();
  const kontrol = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    const kon = kontrol.current;
    const g = cfg.genislik / 1000;
    const y = cfg.yukseklik / 1000;
    const d = cfg.derinlik / 1000;

    // En büyük ölçüye göre bir uzaklık: ürün kareye sığsın,
    // ama ekranı da boş bırakmasın.
    const uzaklik = Math.max(g, y, d) * 1.75 + 1.1;
    const merkez = new THREE.Vector3(0, y / 2, 0);

    // Bakış yönü korunur: müşteri modeli çevirdiyse
    // kaydırıcıyı her oynattığında kamerası başa dönmesin.
    const yon = camera.position
      .clone()
      .sub(kon ? kon.target : new THREE.Vector3(0, y / 2, 0));
    if (yon.lengthSq() < 0.001) yon.set(0.9, 0.5, 1);
    yon.normalize().multiplyScalar(uzaklik);

    camera.position.copy(merkez.clone().add(yon));
    if (kon) {
      kon.target.copy(merkez);
      kon.update();
    }
  }, [cfg.genislik, cfg.yukseklik, cfg.derinlik, camera]);

  return (
    <OrbitControls
      ref={kontrol}
      makeDefault
      enablePan={false}
      minPolarAngle={Math.PI * 0.08}
      maxPolarAngle={Math.PI * 0.52}
      minDistance={0.8}
      maxDistance={12}
      enableDamping
      dampingFactor={0.08}
    />
  );
}

export function FurnitureScene({
  cfg,
  gozSecimi,
  seciliGoz,
  onGozSec,
  siluet,
  className,
}: Props) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [2.4, 1.4, 2.8], fov: 42 }}
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <AdaptiveDpr pixelated />
        <Suspense fallback={null}>
          {/* Aydınlatma tamamen yerel.
              drei'nin Environment bileşeni hazır bir HDR'ı
              üçüncü taraf bir CDN'den indiriyor; o istek
              takıldığında Suspense çözülmüyor ve sahne hiç
              çizilmiyordu. Mobilyanın görünürlüğü başkasının
              sunucusuna bağlı olamaz. */}
          <hemisphereLight args={["#ffffff", "#b9b4ab", 0.75]} />
          <ambientLight intensity={0.35} />
          <directionalLight
            position={[3.2, 5.4, 3.6]}
            intensity={1.25}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-4}
            shadow-camera-right={4}
            shadow-camera-top={4}
            shadow-camera-bottom={-4}
          />
          <directionalLight position={[-3.4, 2.6, -2.2]} intensity={0.42} />
          <directionalLight position={[0, 1.2, 4.5]} intensity={0.28} />

          <FurnitureModel
            cfg={cfg}
            gozSecimi={gozSecimi}
            seciliGoz={seciliGoz}
            onGozSec={onGozSec}
            siluet={siluet}
          />

          {/* Zemine düşen gölge: mobilya havada durmasın */}
          <ContactShadows
            position={[0, 0.001, 0]}
            opacity={0.33}
            scale={Math.max(cfg.genislik, cfg.derinlik) / 1000 + 2.4}
            blur={2.4}
            far={2.2}
          />

          <KameraUydur cfg={cfg} />
        </Suspense>
      </Canvas>
    </div>
  );
}
