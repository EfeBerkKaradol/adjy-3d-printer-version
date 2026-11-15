import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { buildParametricScene } from "./sceneBuilder";
import { exportSceneToGLB, exportSceneToUSDZ } from "./glbExporter";
import { extractDimensions } from "./realSizeCalibration";
import type { GLBExportResult } from "@/types/ar.types";

// ==========================================
// AR EXPORT — AGIR KISIM
//
// three.js, GLTF/Draco yukleyicileri ve GLB/USDZ exporter'lari
// burada. Bu dosya yalnizca useGLBExport icinden, "AR'da Gor"
// dugmesine basildiginda dinamik import() ile yuklenir.
//
// Onceden hook bunlari dogrudan import ediyordu; AR dugmesi her
// urun sayfasinda durdugu icin three.js (~175 KB gz) kimse
// dugmeye basmadan sayfayla birlikte iniyordu.
//
// Bu dosyayi statik olarak import ETMEYIN — butun kazanc kaybolur.
// ==========================================

interface ExportModelOptions {
  parameters: Record<string, number | string>;
  productType: string;
  modelFileUrl?: string | null;
}

/**
 * Sahneyi kurar (harici GLB ya da parametrik), gercek boyuta
 * olcekler ve GLB + USDZ olarak export eder.
 * USDZ basarisiz olursa null doner; GLB ile devam edilir.
 */
export async function exportModelForAR({
  parameters,
  productType,
  modelFileUrl,
}: ExportModelOptions): Promise<{ glb: GLBExportResult; usdzBlob: Blob | null }> {
  let scene: THREE.Scene;

  // Harici GLB/GLTF dosyasi varsa yukle, yoksa parametrik sahne olustur
  if (
    modelFileUrl &&
    (modelFileUrl.endsWith(".glb") || modelFileUrl.endsWith(".gltf"))
  ) {
    console.log("[AR Export] Harici GLB yukleniyor:", modelFileUrl);
    const color = (parameters.color as string) || undefined;
    scene = await loadGLBAsScene(modelFileUrl, color);
  } else {
    console.log("[AR Export] Parametrik sahne olusturuluyor:", productType);
    scene = buildParametricScene(parameters, productType);
  }

  // 0) Modeli gercek boyutlarina (metre) olcekle
  // AR platformlari (iOS AR Quick Look, Android Scene Viewer) 1 birim = 1 metre bekler
  scaleToRealWorldSize(scene, parameters, productType);

  // 1) GLB export
  console.log("[AR Export] GLB export...");
  const glb = await exportSceneToGLB(scene);
  console.log("[AR Export] GLB:", glb.sizeBytes, "bytes");

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

  return { glb, usdzBlob };
}

/**
 * Sahneyi gercek dunya boyutlarina (metre cinsinden) olcekler.
 * AR platformlari 1 birim = 1 metre olarak yorumlar.
 * Model ne kadar buyuk/kucuk olursa olsun, urunun gercek mm boyutlarina
 * gore metre cinsine cevirip olcekler.
 */
function scaleToRealWorldSize(
  scene: THREE.Scene,
  parameters: Record<string, number | string>,
  productType: string
): void {
  const dims = extractDimensions(parameters, productType);

  // Hedef boyutlar metre cinsinden
  const targetW = dims.widthMm / 1000;
  const targetH = dims.heightMm / 1000;
  const targetD = dims.depthMm / 1000;

  // Isiklari haric tutarak sadece mesh'lerin bounding box'ini hesapla
  const box = new THREE.Box3();
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.updateWorldMatrix(true, false);
      const meshBox = new THREE.Box3().setFromObject(child);
      box.union(meshBox);
    }
  });

  if (box.isEmpty()) return;

  const currentSize = box.getSize(new THREE.Vector3());
  if (currentSize.x === 0 || currentSize.y === 0 || currentSize.z === 0) return;

  // Her eksen icin olcek faktoru hesapla, en buyuk boyuta gore uniform scale
  const scaleX = targetW / currentSize.x;
  const scaleY = targetH / currentSize.y;
  const scaleZ = targetD / currentSize.z;

  // Uniform scale: en kucuk faktoru kullan (modelin oranlarini bozma)
  const uniformScale = Math.min(scaleX, scaleY, scaleZ);

  console.log(
    `[AR Export] Gercek boyut olcekleme: ${currentSize.x.toFixed(3)}x${currentSize.y.toFixed(3)}x${currentSize.z.toFixed(3)} → ` +
    `${targetW.toFixed(3)}x${targetH.toFixed(3)}x${targetD.toFixed(3)}m (scale: ${uniformScale.toFixed(4)})`
  );

  // Scene'deki tum ust-duzey nesneleri olcekle (isiklar dahil ama onlara etkisiz)
  scene.children.forEach((child) => {
    if (child instanceof THREE.Light) return;
    child.scale.multiplyScalar(uniformScale);
    child.updateMatrixWorld(true);
  });
}

/**
 * Harici GLB/GLTF dosyasini Three.js Scene olarak yukler.
 * Draco sikistirmali dosyalari da destekler.
 * USDZ export icin gerekli — iOS AR Quick Look sadece USDZ kabul eder.
 */
async function loadGLBAsScene(url: string, color?: string): Promise<THREE.Scene> {
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

        // Materyalsiz mesh'lere varsayilan materyal ata + secilen rengi uygula
        const meshColor = color || "#ffffff";
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (
              !child.material ||
              !(child.material instanceof THREE.MeshStandardMaterial)
            ) {
              child.material = new THREE.MeshStandardMaterial({
                color: meshColor,
                roughness: 0.3,
                metalness: 0.1,
              });
            } else {
              const mat = (child.material as THREE.MeshStandardMaterial).clone();
              mat.color.set(meshColor);
              child.material = mat;
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
