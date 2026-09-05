"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, AdaptiveDpr } from "@react-three/drei";
import { GLBModelViewer } from "@/components/3d/GLBModelViewer";

// ==========================================
// FOTOĞRAFSIZ ÜRÜN İÇİN 3D ÖNİZLEME
//
// Katalogdaki her ürünün GLB modeli var; fotoğrafı
// olmayan ürünlerde gri bir yer tutucu göstermek yerine
// ürünün kendi modeli döndürülebilir biçimde gösterilir.
// Fotoğraf eklendiğinde bu bileşen devreden çıkar.
//
// Yalnızca fotoğrafın gerçekten olmadığı ürünlerde
// mount edilir; üç.js maliyeti tüm katalog için ödenmez.
// ==========================================

interface ProductModelPreviewProps {
  url: string;
  productType: string;
  parameters: Record<string, number | string>;
}

export default function ProductModelPreview({
  url,
  productType,
  parameters,
}: ProductModelPreviewProps) {
  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.5, 4.6], fov: 40 }}
        gl={{ antialias: true }}
      >
        <AdaptiveDpr pixelated />
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 6, 5]} intensity={1.5} />
        <directionalLight position={[-5, 2, -3]} intensity={0.4} />

        <Suspense fallback={null}>
          <GLBModelViewer url={url} parameters={parameters} productType={productType} />
        </Suspense>

        <ContactShadows
          position={[0, -1.3, 0]}
          opacity={0.25}
          scale={8}
          blur={2.5}
          far={4}
          resolution={512}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.9}
        />
      </Canvas>

      <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur-sm">
        3D model · sürükleyerek çevir
      </span>
    </div>
  );
}
