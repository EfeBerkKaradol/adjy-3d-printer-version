"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  PresentationControls,
  AdaptiveDpr,
  AdaptiveEvents,
} from "@react-three/drei";
import { Suspense, Component, type ReactNode } from "react";
import { ParametricModel } from "./ParametricModel";
import { GLBModelViewer } from "./GLBModelViewer";
import { Loader2 } from "lucide-react";

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

// GLB dosyasi gecerli mi kontrol et
function isValidGLBUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return url.endsWith(".glb") || url.endsWith(".gltf");
}

// ==========================================
// GLB ErrorBoundary
// useGLTF hata verirse parametrik modele fallback yap
// ==========================================
interface GLBErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface GLBErrorBoundaryState {
  hasError: boolean;
}

class GLBErrorBoundary extends Component<GLBErrorBoundaryProps, GLBErrorBoundaryState> {
  constructor(props: GLBErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GLBErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Gerçek parametrik modeli olan ürün tipleri — bu tipler için GLB yerine
// prosedürel model kullanılır (parametre değişiklikleri anında yansır).
const PARAMETRIC_TYPES = new Set([
  "vase", "stand", "keychain", "lamp", "pencilHolder",
  "bracelet", "gear",
]);

export function ModelViewer({ parameters, productType, modelFileUrl }: ModelViewerProps) {
  const hasParametricModel = !!productType && PARAMETRIC_TYPES.has(productType);
  const useGLB = isValidGLBUrl(modelFileUrl) && !hasParametricModel;

  const parametricFallback = (
    <ParametricModel parameters={parameters} productType={productType} />
  );

  return (
    <div className="relative w-full aspect-square bg-gradient-to-b from-muted/30 to-muted/60 rounded-2xl overflow-hidden border border-border/30">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          camera={{ position: [0, 2, 5], fov: 45 }}
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
        >
          {/* Performans */}
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />

          {/* Aydınlatma */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-3, 4, -3]} intensity={0.3} />

          {/* Ortam */}
          <Environment preset="studio" />

          {/* 3D Model */}
          <PresentationControls
            global
            zoom={0.8}
            rotation={[0, -Math.PI / 6, 0]}
            polar={[-Math.PI / 4, Math.PI / 4]}
            azimuth={[-Math.PI / 4, Math.PI / 4]}
          >
            {useGLB ? (
              <GLBErrorBoundary fallback={parametricFallback}>
                <GLBModelViewer url={modelFileUrl} parameters={parameters} productType={productType} />
              </GLBErrorBoundary>
            ) : (
              parametricFallback
            )}
          </PresentationControls>

          {/* Zemin gölgesi */}
          <ContactShadows
            position={[0, -1.5, 0]}
            opacity={0.4}
            scale={8}
            blur={2}
          />

          {/* Kontroller */}
          <OrbitControls
            enablePan={false}
            minDistance={3}
            maxDistance={10}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </Suspense>

      {/* Kontrol ipucu */}
      <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/50 select-none pointer-events-none">
        Surukle: Dondur · Scroll: Zoom
      </div>
    </div>
  );
}
