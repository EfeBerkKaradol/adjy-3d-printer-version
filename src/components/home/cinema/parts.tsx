"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { MATERIAL, PANEL, SLOT, slotGrid, type PanelModule } from "./panelSystem";

// ==========================================
// ÜRÜN PARÇALARI — GERÇEK GEOMETRİ
//
// Her parça gerçek hacim: levha ekstrüzyonla delinir,
// kutuların içi boştur, kancanın levhanın arkasına geçen
// tırnağı vardır. Hiçbiri görsel taklidi değil.
// ==========================================

/**
 * Yuvarlatılmış köşeli dikdörtgen.
 * Hem dış hat hem de yuvalar bunu kullanır: tek bir sarım
 * yönü, kendini kesmeyen yol — üçgenleme bu yüzden bozulmaz.
 */
function roundedRect(
  shape: THREE.Shape | THREE.Path,
  w: number,
  h: number,
  r: number,
  cx = 0,
  cy = 0
) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + h - r);
  shape.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + h);
  shape.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  shape.closePath();
}

/** Dikey yuva — uçları yuvarlatılmış delik */
function slotPath(cx: number, cy: number, w: number, h: number) {
  const p = new THREE.Path();
  roundedRect(p, w, h, w * 0.48, cx, cy);
  return p;
}

/** Delikli taşıyıcı levha */
export function PerforatedPanel() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    roundedRect(shape, PANEL.width, PANEL.height, PANEL.cornerRadius);
    for (const [x, y] of slotGrid()) {
      shape.holes.push(slotPath(x, y, SLOT.width, SLOT.height));
    }
    // Bevel kapalı: delikli bir ekstrüzyonda köşe kırma
    // üçgenlemeyi bozup yüzeyde yırtık üretiyor.
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: PANEL.thickness,
      bevelEnabled: false,
      curveSegments: 3,
    });
    geo.translate(0, 0, -PANEL.thickness / 2);
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={MATERIAL.panel} roughness={0.68} metalness={0.02} />
    </mesh>
  );
}

/**
 * J-KANCA — sistemin bağlantı elemanı.
 *
 * Tırnak yuvadan geçer, parça aşağı indirilince arkadaki
 * dudak levhaya kilitlenir. Asıl mekanizma bu; modüller
 * levhaya değil, bu kancaya asılır.
 */
export function JHook({ scale = 1 }: { scale?: number }) {
  const t = SLOT.width * 0.86;
  return (
    <group scale={scale}>
      {/* Levhanın önünde kalan gövde */}
      <RoundedBox
        args={[SLOT.width * 2.1, SLOT.height * 1.15, 0.05]}
        radius={0.012}
        smoothness={2}
        position={[0, 0, 0.06]}
        castShadow
      >
        <meshStandardMaterial color={MATERIAL.hardware} roughness={0.5} metalness={0.05} />
      </RoundedBox>

      {/* Yuvadan geçen tırnak */}
      <mesh position={[0, SLOT.height * 0.22, 0.005]} castShadow>
        <boxGeometry args={[t, SLOT.height * 0.42, PANEL.thickness + 0.09]} />
        <meshStandardMaterial color={MATERIAL.hardware} roughness={0.5} metalness={0.05} />
      </mesh>

      {/* Levhanın arkasına düşen kilit dudağı */}
      <mesh position={[0, SLOT.height * 0.02, -PANEL.thickness / 2 - 0.035]} castShadow>
        <boxGeometry args={[t, SLOT.height * 0.5, 0.028]} />
        <meshStandardMaterial color={MATERIAL.hardware} roughness={0.5} metalness={0.05} />
      </mesh>
    </group>
  );
}

function Plate({
  w,
  h,
  d,
  position,
  rotation,
}: {
  w: number;
  h: number;
  d: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <RoundedBox
      args={[w, h, d]}
      radius={Math.min(w, h, d) * 0.22}
      smoothness={2}
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={MATERIAL.body} roughness={0.55} metalness={0.02} />
    </RoundedBox>
  );
}

/** İçi boş kap — kalemlik ve kutu bundan türer */
function OpenBox({ w, h, d }: { w: number; h: number; d: number }) {
  const wall = 0.035;
  return (
    <group>
      {/* Sırt — levhaya bakan yüz */}
      <Plate w={w} h={h} d={wall} position={[0, 0, -d / 2 + wall / 2]} />
      {/* Taban */}
      <Plate w={w} h={wall} d={d} position={[0, -h / 2 + wall / 2, 0]} />
      {/* Ön */}
      <Plate w={w} h={h * 0.92} d={wall} position={[0, -h * 0.04, d / 2 - wall / 2]} />
      {/* Yanlar */}
      <Plate w={wall} h={h * 0.96} d={d} position={[-w / 2 + wall / 2, -h * 0.02, 0]} />
      <Plate w={wall} h={h * 0.96} d={d} position={[w / 2 - wall / 2, -h * 0.02, 0]} />
    </group>
  );
}

/** Raf — sırt, zemin ve öndeki tutma dudağı */
function ShelfBody({ w, h, d }: { w: number; h: number; d: number }) {
  const wall = 0.035;
  return (
    <group>
      <Plate w={w} h={h} d={wall} position={[0, 0, -d / 2 + wall / 2]} />
      <Plate w={w} h={wall} d={d} position={[0, -h / 2 + wall / 2, 0]} />
      <Plate w={w} h={h * 0.5} d={wall} position={[0, -h * 0.25, d / 2 - wall / 2]} />
    </group>
  );
}

/** Telefon tutucu — sırt, zemin ve eğik dayama */
function PhoneBody({ w, h, d }: { w: number; h: number; d: number }) {
  const wall = 0.035;
  return (
    <group>
      <Plate w={w} h={h} d={wall} position={[0, 0, -d / 2 + wall / 2]} />
      <Plate w={w} h={wall} d={d * 0.9} position={[0, -h / 2 + wall / 2, 0.01]} />
      {/* Telefonun yaslandığı dudak */}
      <Plate w={w} h={h * 0.3} d={wall} position={[0, -h * 0.34, d / 2 - wall / 2]} />
      {/* Yandan destek */}
      <Plate
        w={wall}
        h={h * 0.78}
        d={d * 0.8}
        position={[-w / 2 + wall / 2, -h * 0.06, 0]}
        rotation={[0.12, 0, 0]}
      />
      <Plate
        w={wall}
        h={h * 0.78}
        d={d * 0.8}
        position={[w / 2 - wall / 2, -h * 0.06, 0]}
        rotation={[0.12, 0, 0]}
      />
    </group>
  );
}

/** Askı kanca — anahtar, kablo gibi şeyler için */
function HookBody({ h, d }: { h: number; d: number }) {
  const r = 0.026;
  return (
    <group>
      <Plate w={0.13} h={h * 0.7} d={0.04} position={[0, 0, 0.02]} />
      <mesh position={[0, -h * 0.3, d * 0.32]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[r, r, d * 0.62, 10]} />
        <meshStandardMaterial color={MATERIAL.body} roughness={0.55} metalness={0.02} />
      </mesh>
      <mesh position={[0, -h * 0.16, d * 0.62]} castShadow>
        <cylinderGeometry args={[r, r, h * 0.3, 10]} />
        <meshStandardMaterial color={MATERIAL.body} roughness={0.55} metalness={0.02} />
      </mesh>
    </group>
  );
}

/** Bir modülün gövdesi — türüne göre */
export function ModuleBody({ mod }: { mod: PanelModule }) {
  switch (mod.kind) {
    case "cup":
    case "bin":
      return <OpenBox w={mod.w} h={mod.h} d={mod.d} />;
    case "shelf":
    case "tray":
      return <ShelfBody w={mod.w} h={mod.h} d={mod.d} />;
    case "phone":
      return <PhoneBody w={mod.w} h={mod.h} d={mod.d} />;
    case "hook":
      return <HookBody h={mod.h} d={mod.d} />;
  }
}
