"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, AdaptiveDpr } from "@react-three/drei";
import * as THREE from "three";
import { ParametricModel } from "@/components/3d/ParametricModel";

// ==========================================
// HERO 3D NESNESİ
//
// Konfigüratörün kullandığı ParametricModel'in ta kendisi —
// hero için ayrı, sahte bir model üretilmedi. Scroll ilerledikçe
// gerçek parametreler değişir, geometri yeniden hesaplanır.
//
// Performans notları:
//  - OrbitControls / Environment / Grid yok; yalnızca iki ışık
//    ve tek bir temas gölgesi.
//  - Görünür değilken frameloop durur (frameloop="never").
//  - dpr 1.5 ile sınırlı; AdaptiveDpr kare düşerse indirir.
//  - Genişlik değeri çağıran tarafta kuantalanır, yani geometri
//    her karede değil, yalnızca eşik aşıldığında yeniden kurulur.
// ==========================================

interface HeroObjectProps {
  parameters: Record<string, number | string>;
  productType: string;
  /** Hedef Y rotasyonu (radyan) — sahne buna yumuşak yaklaşır */
  targetRotation: number;
  /** Görünür değilse render döngüsü durur */
  active: boolean;
}

function Rig({
  targetRotation,
  children,
}: {
  targetRotation: number;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    // Kritik sönümleme yerine basit üstel yaklaşma — kare hızından bağımsız
    const t = 1 - Math.pow(0.0015, delta);
    group.current.rotation.y += (targetRotation - group.current.rotation.y) * t;
  });

  return <group ref={group}>{children}</group>;
}

export default function HeroObject({
  parameters,
  productType,
  targetRotation,
  active,
}: HeroObjectProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      // Kamera sabit: nesne büyüdükçe gerçekten büyük görünsün.
      // z=5.6, en geniş konfigürasyon (400 mm ≈ 4 birim) kadrajı taşırmaz.
      camera={{ position: [0, 0.45, 5.6], fov: 38 }}
      // Dekoratif sahne: ekran okuyucular için içerik taşımaz
      aria-hidden="true"
    >
      <AdaptiveDpr pixelated />

      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 5]} intensity={1.6} castShadow={false} />
      <directionalLight position={[-5, 2, -3]} intensity={0.45} />

      <Rig targetRotation={targetRotation}>
        <ParametricModel parameters={parameters} productType={productType} />
      </Rig>

      <ContactShadows
        position={[0, -1.35, 0]}
        opacity={0.28}
        scale={9}
        blur={2.6}
        far={4}
        resolution={512}
      />
    </Canvas>
  );
}
