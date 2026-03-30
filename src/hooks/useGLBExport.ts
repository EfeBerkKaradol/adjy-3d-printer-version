"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { buildParametricScene } from "@/lib/ar/sceneBuilder";
import {
  exportSceneToGLB,
  exportSceneToUSDZ,
  revokeGLBUrl,
} from "@/lib/ar/glbExporter";
import type { ARExportResult } from "@/types/ar.types";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

interface UseGLBExportOptions {
  parameters: Record<string, number | string>;
  productType: string;
  modelFileUrl?: string | null;
}

/**
 * Parametrik 3D modeli hem GLB hem USDZ olarak export eder.
 * - GLB: Android Scene Viewer + model-viewer 3D preview icin
 * - USDZ: iOS AR Quick Look icin (zorunlu)
 */
export function useGLBExport({
  parameters,
  productType,
  modelFileUrl,
}: UseGLBExportOptions) {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [usdzUrl, setUsdzUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        revokeGLBUrl(blobUrlRef.current);
      }
    };
  }, []);

  const exportForAR = useCallback(async (): Promise<ARExportResult | null> => {
    setError(null);

    setIsExporting(true);
    try {
      // Onceki blob'u temizle
      if (blobUrlRef.current) {
        revokeGLBUrl(blobUrlRef.current);
      }

      let scene: THREE.Scene;

      // Harici GLB/GLTF dosyasi varsa yukle, yoksa parametrik sahne olustur
      if (
        modelFileUrl &&
        (modelFileUrl.endsWith(".glb") || modelFileUrl.endsWith(".gltf"))
      ) {
        console.log("[AR Export] Harici GLB yukleniyor:", modelFileUrl);
        scene = await loadGLBAsScene(modelFileUrl);
      } else {
        console.log("[AR Export] Parametrik sahne olusturuluyor:", productType);
        scene = buildParametricScene(parameters, productType);
      }

      // 1) GLB export
      console.log("[AR Export] GLB export...");
      const glbResult = await exportSceneToGLB(scene);
      console.log("[AR Export] GLB:", glbResult.sizeBytes, "bytes");
      blobUrlRef.current = glbResult.blobUrl;

      // 2) USDZ export (iOS icin)
      let usdzBlob: Blob | null = null;
      try {
        console.log("[AR Export] USDZ export (iOS icin)...");
        const usdzResult = await exportSceneToUSDZ(scene);
        usdzBlob = usdzResult.blob;
        console.log("[AR Export] USDZ:", usdzResult.sizeBytes, "bytes");
      } catch (usdzErr) {
        console.warn("[AR Export] USDZ export basarisiz (devam ediliyor):", usdzErr);
      }

      // 3) GLB'yi sunucuya yukle
      let serverGlbUrl: string | null = null;
      try {
        const uploadRes = await fetch("/api/ar", {
          method: "POST",
          headers: { "Content-Type": "model/gltf-binary" },
          body: glbResult.blob,
        });
        if (uploadRes.ok) {
          const json = await uploadRes.json();
          serverGlbUrl = `${window.location.origin}${json.url}`;
          console.log("[AR Export] GLB URL:", serverGlbUrl);
        }
      } catch (e) {
        console.warn("[AR Export] GLB upload basarisiz:", e);
      }

      // 4) USDZ'yi sunucuya yukle (varsa)
      let serverUsdzUrl: string | null = null;
      if (usdzBlob) {
        try {
          const uploadRes = await fetch("/api/ar", {
            method: "POST",
            headers: { "Content-Type": "model/vnd.usdz+zip" },
            body: usdzBlob,
          });
          if (uploadRes.ok) {
            const json = await uploadRes.json();
            serverUsdzUrl = `${window.location.origin}${json.url}`;
            console.log("[AR Export] USDZ URL:", serverUsdzUrl);
          }
        } catch (e) {
          console.warn("[AR Export] USDZ upload basarisiz:", e);
        }
      }

      const finalGlbUrl = serverGlbUrl || glbResult.blobUrl;
      setGlbUrl(finalGlbUrl);
      setUsdzUrl(serverUsdzUrl);

      return {
        glbUrl: finalGlbUrl,
        usdzUrl: serverUsdzUrl || undefined,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Model export basarisiz";
      console.error("[AR Export] Hata:", message);
      setError(message);
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [parameters, productType, modelFileUrl]);

  // Eski API uyumlulugu icin exportGLB alias
  const exportGLB = useCallback(async (): Promise<string | null> => {
    const result = await exportForAR();
    return result?.glbUrl || null;
  }, [exportForAR]);

  return { glbUrl, usdzUrl, isExporting, error, exportGLB, exportForAR };
}

/**
 * Harici GLB/GLTF dosyasini Three.js Scene olarak yukler.
 * Draco sikistirmali dosyalari da destekler.
 * USDZ export icin gerekli — iOS AR Quick Look sadece USDZ kabul eder.
 */
async function loadGLBAsScene(url: string): Promise<THREE.Scene> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();

    // Draco decoder ayarla
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.7/"
    );
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (gltf) => {
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        const model = gltf.scene;

        // Materyalsiz mesh'lere varsayilan materyal ata
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (
              !child.material ||
              !(child.material instanceof THREE.MeshStandardMaterial)
            ) {
              child.material = new THREE.MeshStandardMaterial({
                color: "#ffffff",
                roughness: 0.3,
                metalness: 0.1,
              });
            }
          }
        });

        // Z-up → Y-up donusumu
        const preBox = new THREE.Box3().setFromObject(model);
        const preSize = preBox.getSize(new THREE.Vector3());
        if (preSize.z > preSize.y * 1.2) {
          model.rotation.x = -Math.PI / 2;
          model.updateMatrixWorld(true);
        }

        scene.add(model);
        dracoLoader.dispose();
        resolve(scene);
      },
      undefined,
      (err: unknown) => {
        dracoLoader.dispose();
        const message = err instanceof Error ? err.message : String(err);
        reject(new Error(`GLB yukleme hatasi: ${message}`));
      }
    );
  });
}
