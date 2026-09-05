"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls, AdaptiveDpr } from "@react-three/drei";
import { ParametricModel } from "@/components/3d/ParametricModel";
import { GLBModelViewer } from "@/components/3d/GLBModelViewer";
import { GLBErrorBoundary, Grounded, shouldUseGLB } from "@/components/3d/sceneParts";

// ==========================================
// HAFİF KONFİGÜRASYON SAHNESİ
//
// Konfigüratör sayfasındaki ModelViewer'ın ana sayfa
// için inceltilmiş hâli: aynı GLB/prosedürel seçim
// kuralları (sceneParts) ama HDR ortam, ızgara ve
// yakınlaştırma yok.
//
// Parametreler doğrudan modele gider:
//   slider → configuration state → bu sahne → geometri/ölçek
// Yani kaydırıcı yalnızca rakamı değil nesneyi değiştirir.
//
// Performans:
//  - Görünür değilken render döngüsü durur.
//  - dpr 1.5 ile sınırlı, AdaptiveDpr kare düşerse indirir.
//  - Döndürme yalnızca fare ile; dokunmada sayfa kaydırması
//    çalınmasın diye devre dışı.
// ==========================================

interface ConfigSceneProps {
  parameters: Record<string, number | string>;
  productType: string;
  modelFileUrl: string | null;
  /** Görünür değilse render döngüsü durur */
  active: boolean;
  /** Fareyle döndürmeye izin ver (masaüstü) */
  allowRotate: boolean;
}

export default function ConfigScene({
  parameters,
  productType,
  modelFileUrl,
  active,
  allowRotate,
}: ConfigSceneProps) {
  const useGLB = shouldUseGLB(modelFileUrl, productType);

  const parametricModel = (
    <ParametricModel parameters={parameters} productType={productType} />
  );

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [4.2, 3.1, 4.2], fov: 42 }}
      aria-hidden="true"
    >
      <AdaptiveDpr pixelated />

      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} />

      <Suspense fallback={null}>
        <Grounded>
          {useGLB ? (
            <GLBErrorBoundary fallback={parametricModel}>
              <GLBModelViewer
                url={modelFileUrl as string}
                parameters={parameters}
                productType={productType}
              />
            </GLBErrorBoundary>
          ) : (
            parametricModel
          )}
        </Grounded>
      </Suspense>

      <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={11} blur={2.4} far={4} />

      {allowRotate && (
        <OrbitControls
          target={[0, 1.3, 0]}
          enablePan={false}
          enableZoom={false}
          // Dokunma olayları alınmaz: mobilde sayfa normal kayar
          enableRotate
          maxPolarAngle={Math.PI / 2.05}
        />
      )}
    </Canvas>
  );
}
