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
import { Suspense, Component, useRef, useLayoutEffect, type ReactNode } from "react";
import * as THREE from "three";
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

// ==========================================
// Grounded: içeriğini XZ'de merkezleyip alt yüzeyini
// y=0'a (tabla seviyesi) oturtur. Parametrik modeller
// orijin merkezli üretildiği için bu düzeltme gerekir.
// ==========================================
function Grounded({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.position.set(0, 0, 0);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(group);
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      group.position.set(-center.x, -box.min.y, -center.z);
    }
  });

  return <group ref={ref}>{children}</group>;
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
                <GLBModelViewer url={modelFileUrl} parameters={parameters} productType={productType} />
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
            target={[0, 1.2, 0]}
            enablePan
            minDistance={2.5}
            maxDistance={14}
            maxPolarAngle={Math.PI / 2.05}
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
