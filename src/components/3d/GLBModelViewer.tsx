"use client";

import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ==========================================
// GLB/GLTF MODEL VIEWER
//
// URL'den GLB/GLTF model yukler ve sahneye ekler.
// Parametrelere gore renk ve olcek degistirir.
// ==========================================

interface GLBModelViewerProps {
  url: string;
  parameters: Record<string, number | string>;
}

export function GLBModelViewer({ url, parameters }: GLBModelViewerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  const color = (parameters.color as string) || "";
  const scaleX = ((parameters.width as number) || 100) / 100;
  const scaleY = ((parameters.height as number) || 100) / 100;

  // Yavas donus animasyonu
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  // Renk degisikligini modeldeki tum mesh'lere uygula
  useEffect(() => {
    if (!color) return;
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.color) {
          mat.color.set(color);
        }
      }
    });
  }, [scene, color]);

  // Modeli sahneye sigdir
  useEffect(() => {
    if (!scene) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 2;
    if (maxDim > 0) {
      const s = targetSize / maxDim;
      scene.scale.setScalar(s);
    }
    const center = box.getCenter(new THREE.Vector3());
    scene.position.sub(center.multiplyScalar(scene.scale.x));
  }, [scene]);

  return (
    <group ref={groupRef} scale={[scaleX, scaleY, scaleX]}>
      <primitive object={scene.clone()} castShadow receiveShadow />
    </group>
  );
}
