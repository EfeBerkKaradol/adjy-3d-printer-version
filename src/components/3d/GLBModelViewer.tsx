"use client";

import { useRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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
  const groupRef = useRef<THREE.Group>(null);
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
  } else {
    scaleX = ((parameters.width  as number) || 100) / 100;
    scaleY = ((parameters.height as number) || 100) / 100;
    scaleZ = ((parameters.depth  as number) || 100) / 100;
  }

  // Scene'i klonla, materyal ata ve olcekle — her parametre degisikliginde guncelle
  const clonedScene = useMemo(() => {
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

      const newBox    = new THREE.Box3().setFromObject(clone);
      const newCenter = newBox.getCenter(new THREE.Vector3());
      clone.position.sub(newCenter);
    }

    return clone;
  }, [scene, color, productType]);

  // Yavas donus animasyonu
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef} scale={[scaleX, scaleY, scaleZ]}>
      <primitive object={clonedScene} />
    </group>
  );
}
