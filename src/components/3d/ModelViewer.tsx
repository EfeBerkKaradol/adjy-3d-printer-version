"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Grid,
  AdaptiveDpr,
  AdaptiveEvents,
} from "@react-three/drei";
import { Suspense, useState } from "react";
import { useCoarsePointer } from "@/hooks/useCoarsePointer";
import { ParametricModel } from "./ParametricModel";
import { GLBModelViewer } from "./GLBModelViewer";
import { GLBErrorBoundary, Grounded, shouldUseGLB } from "./sceneParts";
import { Loader2, Hand, X } from "lucide-react";

// ==========================================
// 3D MODEL VIEWER
//
// React Three Fiber Canvas ile 3D sahne oluşturur.
// modelFileUrl varsa ve erişilebilirse GLB dosyasini yukler,
// yoksa / hata olursa parametrik model render eder (fallback).
// ==========================================

interface ModelViewerProps {
  parameters: Record<string, number | string>;
  productType?: string;
  modelFileUrl?: string | null;
  /** Parametrelerin varsayılan değerleri — ölçek bunlara göre hesaplanır */
  defaults?: Record<string, number>;
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Model yukleniyor...</p>
      </div>
    </div>
  );
}

// Dokunmatik ekranda tuval, sayfayı kaydırmak isteyen parmağı yakalayıp modeli
// döndürüyordu (OrbitControls dokunuşları tümüyle alır). Orada tuvalin üstünde
// ince bir katman durur: kaydırma sayfaya geçer, döndürmek için bir kez dokunulur.
export function ModelViewer({ parameters, productType, modelFileUrl, defaults }: ModelViewerProps) {
  const useGLB = shouldUseGLB(modelFileUrl, productType);
  const dokunmatik = useCoarsePointer();
  const [etkin, setEtkin] = useState(false);
  const kilitli = dokunmatik && !etkin;

  const parametricFallback = (
    <ParametricModel parameters={parameters} productType={productType} />
  );

  return (
    <div className="relative w-full aspect-square bg-gradient-to-b from-muted/30 to-muted/60 rounded-2xl overflow-hidden border border-border/30">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [5, 3.8, 5], fov: 45 }}
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          {/* Performans */}
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />

          {/* Aydınlatma — StlViewer ile aynı stüdyo düzeni */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-5, 5, -5]} intensity={0.3} />

          {/* Ortam */}
          <Environment preset="studio" />

          {/* 3D Model — tablaya oturmuş, dik ve sabit */}
          <Grounded>
            {useGLB ? (
              <GLBErrorBoundary fallback={parametricFallback}>
                <GLBModelViewer url={modelFileUrl} parameters={parameters} productType={productType} defaults={defaults} />
              </GLBErrorBoundary>
            ) : (
              parametricFallback
            )}
          </Grounded>

          {/* Baskı tablası ızgarası */}
          <Grid
            position={[0, -0.01, 0]}
            args={[10, 10]}
            cellSize={0.35}
            cellThickness={0.6}
            cellColor="#6b7280"
            sectionSize={1.75}
            sectionThickness={1.1}
            sectionColor="#9ca3af"
            fadeDistance={28}
            fadeStrength={1}
            infiniteGrid={false}
          />
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={12} blur={2.2} far={4} />

          {/* Kontroller */}
          <OrbitControls
            enabled={!kilitli}
            target={[0, 1.2, 0]}
            enablePan={!dokunmatik}
            minDistance={2.5}
            maxDistance={14}
            maxPolarAngle={Math.PI / 2.05}
          />
        </Canvas>
      </Suspense>

      {/* Dokunmatik: kaydırma sayfaya geçer; döndürmek için dokun */}
      {kilitli && (
        <button
          type="button"
          onClick={() => setEtkin(true)}
          className="absolute inset-0 z-10 flex items-end justify-center bg-transparent pb-4"
          style={{ touchAction: "pan-y" }}
          aria-label="3D modeli döndürmek için dokun"
        >
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-background/90 px-4 text-sm shadow-sm backdrop-blur">
            <Hand className="h-4 w-4" aria-hidden />
            Döndürmek için dokun
          </span>
        </button>
      )}
      {dokunmatik && etkin && (
        <button
          type="button"
          onClick={() => setEtkin(false)}
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur"
          aria-label="Döndürmeyi bitir"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      )}

      {/* Kontrol ipucu (fare) */}
      {!dokunmatik && (
        <div className="absolute bottom-3 left-3 text-xs text-muted-foreground/60 select-none pointer-events-none">
          Sürükle: döndür · Tekerlek: yakınlaştır
        </div>
      )}
    </div>
  );
}
