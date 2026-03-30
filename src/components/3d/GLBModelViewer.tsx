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

interface GLBModelViewerProps {
  url: string;
  parameters: Record<string, number | string>;
}

export function GLBModelViewer({ url, parameters }: GLBModelViewerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  const color = (parameters.color as string) || "#ffffff";
  const scaleX = ((parameters.width as number) || 100) / 100;
  const scaleY = ((parameters.height as number) || 100) / 100;

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

    // Z-up → Y-up donusumu (3MF/STL modeller icin)
    // Modelin en buyuk boyutunun Z mi kontrol et
    const preBox = new THREE.Box3().setFromObject(clone);
    const preSize = preBox.getSize(new THREE.Vector3());
    if (preSize.z > preSize.y * 1.2) {
      // Z-up model → X ekseninde -90° dondur
      clone.rotation.x = -Math.PI / 2;
      clone.updateMatrixWorld(true);
    }

    // Modeli sahneye sigdir ve ortala
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 3.5;

    if (maxDim > 0) {
      const s = targetSize / maxDim;
      clone.scale.multiplyScalar(s);
      clone.updateMatrixWorld(true);

      // Yeniden center hesapla scale sonrasi
      const newBox = new THREE.Box3().setFromObject(clone);
      const newCenter = newBox.getCenter(new THREE.Vector3());
      clone.position.sub(newCenter);
    }

    return clone;
  }, [scene, color]);

  // Yavas donus animasyonu
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef} scale={[scaleX, scaleY, scaleX]}>
      <primitive object={clonedScene} />
    </group>
  );
}
