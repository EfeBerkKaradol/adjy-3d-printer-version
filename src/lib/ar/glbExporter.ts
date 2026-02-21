import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";
import type { GLBExportResult, USDZExportResult } from "@/types/ar.types";

/**
 * Three.js sahnesini GLB binary formatina export eder.
 */
export async function exportSceneToGLB(
  scene: THREE.Scene
): Promise<GLBExportResult> {
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        const blob = new Blob([result as ArrayBuffer], {
          type: "model/gltf-binary",
        });
        const blobUrl = URL.createObjectURL(blob);
        resolve({
          blob,
          blobUrl,
          sizeBytes: blob.size,
        });
      },
      (error) => {
        reject(new Error(`GLB export basarisiz: ${error}`));
      },
      { binary: true }
    );
  });
}

/**
 * Three.js sahnesini USDZ formatina export eder.
 * iOS AR Quick Look icin gerekli.
 * quickLookCompatible: true ile Apple Quick Look uyumlu USDZ uretir.
 */
export async function exportSceneToUSDZ(
  scene: THREE.Scene
): Promise<USDZExportResult> {
  const exporter = new USDZExporter();

  const arrayBuffer = await exporter.parseAsync(scene, {
    quickLookCompatible: true,
  });

  const blob = new Blob([arrayBuffer], {
    type: "model/vnd.usdz+zip",
  });
  const blobUrl = URL.createObjectURL(blob);
  return {
    blob,
    blobUrl,
    sizeBytes: blob.size,
  };
}

export function revokeGLBUrl(blobUrl: string): void {
  URL.revokeObjectURL(blobUrl);
}
