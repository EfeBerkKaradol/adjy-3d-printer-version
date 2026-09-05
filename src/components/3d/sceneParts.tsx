"use client";

import {
  Component,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import * as THREE from "three";

// ==========================================
// PAYLAŞILAN SAHNE PARÇALARI
//
// Hem konfigüratör sayfasındaki tam ModelViewer hem de
// ana sayfadaki hafif önizleme aynı kuralları kullanır:
// hangi ürün tipinde GLB, hangisinde prosedürel model
// gösterileceği ve modelin tablaya nasıl oturtulacağı.
//
// Daha önce bu mantık yalnızca ModelViewer içindeydi;
// ana sayfaya ikinci bir sahne eklenirken kopyalamak
// yerine buraya taşındı ki ikisi zamanla ayrışmasın.
// ==========================================

/**
 * Gerçek parametrik modeli olan ürün tipleri.
 * Bunlarda GLB yerine prosedürel geometri kullanılır:
 * parametre değişikliği anında geometriye yansır.
 */
export const PARAMETRIC_TYPES = new Set([
  "vase",
  "stand",
  "keychain",
  "lamp",
  "pencilHolder",
  "bracelet",
  "gear",
]);

/** GLB/GLTF dosyası mı? */
export function isValidGLBUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return url.endsWith(".glb") || url.endsWith(".gltf");
}

/**
 * Bu ürün için GLB mi yoksa prosedürel model mi kullanılmalı?
 * Tek karar noktası — iki sahne de bunu çağırır.
 */
export function shouldUseGLB(
  modelFileUrl: string | null | undefined,
  productType: string | undefined
): modelFileUrl is string {
  const hasParametric = !!productType && PARAMETRIC_TYPES.has(productType);
  return isValidGLBUrl(modelFileUrl) && !hasParametric;
}

// ==========================================
// GLB hata sınırı
// useGLTF yükleyemezse prosedürel modele düşer.
// ==========================================
interface GLBErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface GLBErrorBoundaryState {
  hasError: boolean;
}

export class GLBErrorBoundary extends Component<
  GLBErrorBoundaryProps,
  GLBErrorBoundaryState
> {
  constructor(props: GLBErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): GLBErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ==========================================
// Grounded: içeriğini XZ'de merkezleyip alt yüzeyini
// y=0'a (tabla seviyesi) oturtur. Parametrik modeller
// orijin merkezli üretildiği için bu düzeltme gerekir.
// ==========================================
export function Grounded({ children }: { children: ReactNode }) {
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
