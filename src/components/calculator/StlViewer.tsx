"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Grid,
  AdaptiveDpr,
  AdaptiveEvents,
} from "@react-three/drei";
import * as THREE from "three";

// ==========================================
// STL GÖRÜNTÜLEYICI
//
// Yüklenen STL geometrisini baskı tablası üzerinde gösterir.
// Model her zaman düz durur: STL'ler Z-up konvansiyonunda
// geldiği için sahnede -90° X rotasyonu ile Y-up'a çevrilir,
// XZ'de merkezlenir ve tabana (y=0) oturtulur.
// Bu hazırlık prepareGeometry() içinde, yükleme anında yapılır.
// ==========================================

/**
 * STLLoader çıktısını sahneye hazır hale getirir:
 * Z-up → Y-up çevirir, merkezler, tabana oturtur.
 * Döndürülen boyutlar orijinal STL eksenlerindedir (X, Y, Z mm).
 */
export function prepareGeometry(geometry: THREE.BufferGeometry): {
  geometry: THREE.BufferGeometry;
  dimensions: { x: number; y: number; z: number };
  maxDimension: number;
} {
  // STL'de yükseklik Z ekseni; three.js sahnesinde Y yukarıdır.
  // Boyutları önce orijinal eksenlerde ölç, sonra döndür.
  geometry.computeBoundingBox();
  const rawSize = new THREE.Vector3();
  geometry.boundingBox!.getSize(rawSize);
  const dimensions = { x: rawSize.x, y: rawSize.y, z: rawSize.z };

  // Z-up → Y-up: model tablaya düz oturur, yamuk/ters durmaz
  geometry.rotateX(-Math.PI / 2);

  // XZ'de merkezle, alt yüzeyi y=0'a (tabla seviyesi) indir
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const center = new THREE.Vector3();
  box.getCenter(center);
  geometry.translate(-center.x, -box.min.y, -center.z);

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  return {
    geometry,
    dimensions,
    maxDimension: Math.max(rawSize.x, rawSize.y, rawSize.z),
  };
}

interface StlViewerProps {
  geometry: THREE.BufferGeometry;
  color: string;
  /** Sahne eksenlerinde ölçek [x, y, z] — boyut özelleştirmesi için (varsayılan 1,1,1) */
  scale?: [number, number, number];
}

export function StlViewer({ geometry, color, scale = [1, 1, 1] }: StlViewerProps) {
  // Kamera mesafesini (ölçeklenmiş) model boyutuna göre ayarla
  const { cameraPos, targetY, controlsDist } = useMemo(() => {
    geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    geometry.boundingBox!.getSize(size);
    size.x *= scale[0];
    size.y *= scale[1];
    size.z *= scale[2];
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const dist = maxDim * 1.9;
    return {
      cameraPos: [dist * 0.85, dist * 0.65, dist * 0.85] as [number, number, number],
      targetY: size.y / 2,
      controlsDist: { min: maxDim * 0.6, max: maxDim * 5 },
    };
  }, [geometry, scale]);

  return (
    <Canvas
      key={geometry.uuid}
      camera={{ position: cameraPos, fov: 45, near: 0.1, far: 5000 }}
      shadows
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
    >
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      {/* Aydınlatma — ModelViewer ile aynı stüdyo düzeni */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[cameraPos[0], cameraPos[1] * 1.6, cameraPos[2]]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-cameraPos[0], cameraPos[1], -cameraPos[2]]} intensity={0.3} />
      <Environment preset="studio" />

      {/* Model — tablaya düz oturmuş halde (taban y=0'da, ölçek bunu korur) */}
      <mesh geometry={geometry} scale={scale} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} />
      </mesh>

      {/* Baskı tablası ızgarası (300×300mm servis alanı) */}
      <Grid
        position={[0, -0.01, 0]}
        args={[320, 320]}
        cellSize={10}
        cellThickness={0.6}
        cellColor="#6b7280"
        sectionSize={50}
        sectionThickness={1.1}
        sectionColor="#9ca3af"
        fadeDistance={900}
        fadeStrength={1}
        infiniteGrid={false}
      />
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={340} blur={2.2} far={60} />

      <OrbitControls
        target={[0, targetY, 0]}
        enablePan
        minDistance={controlsDist.min}
        maxDistance={controlsDist.max}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
