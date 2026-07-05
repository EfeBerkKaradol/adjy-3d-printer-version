"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  PANEL_ATTACHMENTS,
  PANEL_BASE_HEIGHT_MM,
  type PanelAttachmentDef,
} from "./panelAttachments";

// ==========================================
// GLB/GLTF MODEL VIEWER
//
// URL'den GLB/GLTF model yukler ve sahneye ekler.
// Draco sikistirmali modelleri destekler.
// Parametrelere gore renk ve olcek degistirir.
// ==========================================

// Draco decoder'i useGLTF icin global olarak ayarla
useGLTF.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");

// Raf ürünleri: default parametre normalizasyonu için tanımlanır
const SHELF_TYPES = new Set(["meltingShelf", "hexShelf", "skadisPanel"]);

interface GLBModelViewerProps {
  url: string;
  parameters: Record<string, number | string>;
  productType?: string;
}

export function GLBModelViewer({ url, parameters, productType }: GLBModelViewerProps) {
  const { scene } = useGLTF(url);

  const color   = (parameters.color as string) || "#ffffff";
  const isShelf = !!productType && SHELF_TYPES.has(productType);

  // Her ürün tipine göre normalize edilmiş scale hesabı
  let scaleX: number, scaleY: number, scaleZ: number;

  if (productType === "meltingShelf") {
    // Genişlik (X) ve drip_length ile Y ölçeklenir; default: 235mm genişlik, 40mm damla uzunluğu
    scaleX = ((parameters.width       as number) || 235) / 235;
    scaleY = (((parameters.height     as number) || 120) / 120)
           * (((parameters.drip_length as number) || 40)  / 40);
    scaleZ = 1;
  } else if (productType === "hexShelf") {
    // default: 252mm genişlik, 192mm yükseklik
    scaleX = ((parameters.width  as number) || 252) / 252;
    scaleY = ((parameters.height as number) || 192) / 192;
    scaleZ = 1;
  } else if (productType === "skadisPanel") {
    // default: 240mm genişlik, 240mm yükseklik
    scaleX = ((parameters.width  as number) || 240) / 240;
    scaleY = ((parameters.height as number) || 240) / 240;
    scaleZ = 1;
  } else if (isShelf) {
    // Diğer raf tipleri için genel normalize
    scaleX = ((parameters.width  as number) || 235) / 235;
    scaleY = ((parameters.height as number) || 120) / 120;
    scaleZ = 1;
  } else if (productType === "fazilModel") {
    // default: 160mm genişlik (X), 90mm yükseklik (Y); derinlik sabit
    scaleX = ((parameters.width  as number) || 160) / 160;
    scaleY = ((parameters.height as number) || 90) / 90;
    scaleZ = 1;
  } else if (productType === "tabletStand") {
    // default: 140mm genişlik, 190mm yükseklik
    scaleX = ((parameters.width  as number) || 140) / 140;
    scaleY = ((parameters.height as number) || 190) / 190;
    scaleZ = 1;
  } else if (productType === "perforatedPanel") {
    // default: 250mm genişlik, 300mm yükseklik; panel kalınlığı sabit
    scaleX = ((parameters.width  as number) || 250) / 250;
    scaleY = ((parameters.height as number) || 300) / 300;
    scaleZ = 1;
  } else {
    scaleX = ((parameters.width  as number) || 100) / 100;
    scaleY = ((parameters.height as number) || 100) / 100;
    scaleZ = ((parameters.depth  as number) || 100) / 100;
  }

  // Scene'i klonla, materyal ata ve olcekle — her parametre degisikliginde guncelle
  const { clonedScene, modelDims } = useMemo(() => {
    const clone = scene.clone(true);

    // Materyalsiz mesh'lere varsayilan materyal ata + renk uygula
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.material || !(child.material instanceof THREE.MeshStandardMaterial)) {
          child.material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.1,
          });
        } else {
          const mat = (child.material as THREE.MeshStandardMaterial).clone();
          mat.color.set(color);
          child.material = mat;
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Z-up → Y-up rotasyonu
    const preBox  = new THREE.Box3().setFromObject(clone);
    const preSize = preBox.getSize(new THREE.Vector3());

    if (productType === "meltingShelf") {
      // GLB'de damlalar yukarı bakıyor → Y eksenini çevir (Z etrafında 180°)
      clone.rotation.z = Math.PI;
    } else if (productType === "hexShelf") {
      // GLB Z-up (Z=192mm yükseklik), model simetrik ortada → standart Z-up düzeltme
      clone.rotation.x = -Math.PI / 2;
    } else if (productType === "skadisPanel") {
      // GLB'de panel X eksenine dik duruyor (X=5mm thin) → panelin yüzü kameraya baksın
      clone.rotation.y = Math.PI / 2;
    } else {
      // Genel Z-up tespiti: model Z=0 tabanında duruyor (3D baskı yatağı convention)
      // minZ ≈ 0 ise model Z-up demektir → -π/2 X rotasyonu ile Y-up'a çevir
      const isZUp = preBox.min.z >= -preSize.z * 0.05;
      if (isZUp) {
        clone.rotation.x = -Math.PI / 2;
      }
    }
    clone.updateMatrixWorld(true);

    // Modeli sahneye sigdir ve ortala
    const box    = new THREE.Box3().setFromObject(clone);
    const size   = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      const s = 3.5 / maxDim;
      clone.scale.multiplyScalar(s);
      clone.updateMatrixWorld(true);

      // XZ'de merkezle, alt yüzeyi y=0'a oturt (baskı tablası konvansiyonu)
      const newBox    = new THREE.Box3().setFromObject(clone);
      const newCenter = newBox.getCenter(new THREE.Vector3());
      clone.position.x -= newCenter.x;
      clone.position.z -= newCenter.z;
      clone.position.y -= newBox.min.y;
      clone.updateMatrixWorld(true);
    }

    // Oturtulmuş modelin boyutları — eklenti yerleşiminde kullanılır
    const seatedBox  = new THREE.Box3().setFromObject(clone);
    const seatedSize = seatedBox.getSize(new THREE.Vector3());

    return {
      clonedScene: clone,
      modelDims: { w: seatedSize.x, h: seatedSize.y, frontZ: seatedBox.max.z },
    };
  }, [scene, color, productType]);

  // Panel eklentileri: "attachments" parametresi virgülle ayrılmış slug listesi taşır
  const attachmentIds =
    productType === "perforatedPanel" && typeof parameters.attachments === "string"
      ? (parameters.attachments as string).split(",").filter(Boolean)
      : [];

  return (
    <group>
      <group scale={[scaleX, scaleY, scaleZ]}>
        <primitive object={clonedScene} />
      </group>
      {attachmentIds.map((id) => {
        const def = PANEL_ATTACHMENTS.find((a) => a.id === id);
        if (!def) return null;
        return (
          <PanelAttachment
            key={id}
            def={def}
            panel={modelDims}
            scaleX={scaleX}
            scaleY={scaleY}
          />
        );
      })}
    </group>
  );
}

// ==========================================
// PANEL EKLENTİSİ
// Seçilen eklenti GLB'sini panel yüzeyine, kayıttaki
// orana göre konumlandırır. Boyut gerçek mm oranıyla
// hesaplanır; panel slider'la büyütülse de eklenti
// gerçek boyutunda kalır, sadece konumu ölçeklenir.
// ==========================================
interface PanelAttachmentProps {
  def: PanelAttachmentDef;
  panel: { w: number; h: number; frontZ: number };
  scaleX: number;
  scaleY: number;
}

function PanelAttachment({ def, panel, scaleX, scaleY }: PanelAttachmentProps) {
  const { scene } = useGLTF(def.url);

  const prepared = useMemo(() => {
    const clone = scene.clone(true);

    // Ana viewer ile aynı materyal mantığı: mevcut PBR materyali klonla,
    // sadece rengi değiştir (trimesh çıktısı GLB'lerde doku/ayarlar korunur)
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.material || !(child.material instanceof THREE.MeshStandardMaterial)) {
          child.material = new THREE.MeshStandardMaterial({
            color: "#f2f2f2",
            roughness: 0.3,
            metalness: 0.1,
          });
        } else {
          const mat = (child.material as THREE.MeshStandardMaterial).clone();
          mat.color.set("#f2f2f2");
          child.material = mat;
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Ana viewer'daki gibi koşullu Z-up tespiti: bazı GLB'ler (ör. trimesh
    // çıktısı) zaten Y-up gelir, onlara flip uygulanmaz. rotationY her iki
    // durumda da dik eksen etrafında döndürür.
    const preBox  = new THREE.Box3().setFromObject(clone);
    const preSize = preBox.getSize(new THREE.Vector3());
    const isZUp = preBox.min.z >= -preSize.z * 0.05;
    if (isZUp) {
      clone.rotation.set(-Math.PI / 2, 0, def.rotationY ?? 0);
    } else {
      clone.rotation.y = def.rotationY ?? 0;
    }
    clone.updateMatrixWorld(true);

    // Gerçek boyut: panel baz yüksekliği (300mm) üzerinden mm → sahne birimi
    const box  = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const heightUnits = def.heightMm * (panel.h / PANEL_BASE_HEIGHT_MM);
    const s = size.y > 0 ? heightUnits / size.y : 1;
    clone.scale.multiplyScalar(s);
    clone.updateMatrixWorld(true);

    // X/Y'de merkezle, arka yüzeyi z=0'a getir (panel yüzüne dayanır)
    const b2 = new THREE.Box3().setFromObject(clone);
    const c2 = b2.getCenter(new THREE.Vector3());
    clone.position.x -= c2.x;
    clone.position.y -= c2.y;
    clone.position.z -= b2.min.z;

    return clone;
  }, [scene, def, panel.h]);

  // Konum dış group'ta: primitive'e position verilirse useMemo'daki
  // merkezleme çevirileri ezilir.
  return (
    <group
      position={[
        def.xFrac * panel.w * scaleX,
        (0.5 + def.yFrac) * panel.h * scaleY,
        panel.frontZ + 0.005,
      ]}
    >
      <primitive object={prepared} />
    </group>
  );
}
