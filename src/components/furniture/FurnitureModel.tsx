"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { malzemeBul } from "@/lib/furniture/materials";
import { gozlerinYerlesimi, panelleriUret } from "@/lib/furniture/panels";
import { tabanBul } from "@/lib/furniture/hardware";
import { MODELLER } from "@/lib/furniture/catalog";
import type { GozAnahtari, MobilyaYapilandirma } from "@/lib/furniture/types";
import { ahsapDokusu, siluetDokusu } from "./wood";

// ==========================================
// MOBİLYA MODELİ
//
// Kesim listesindeki her panel burada bir kutu olarak çizilir.
// Ayrı bir "3D model" yok — ekranda gördüğünüz şey doğrudan
// atölyeye gidecek parça listesi. Bir panel listeden çıkarsa
// ekrandan da kaybolur; ikisi ayrışamaz.
//
// Ölçüler kütüphanede mm, sahnede metre. Dönüşüm tek yerde.
// ==========================================

const MM = 0.001;

interface Props {
  cfg: MobilyaYapilandirma;
  /** Göz seçimi açıkken tıklanabilir alanlar çizilir */
  gozSecimi: boolean;
  seciliGoz: GozAnahtari | null;
  onGozSec: (anahtar: GozAnahtari) => void;
  /** İnsan silueti ölçek hissi verir */
  siluet: boolean;
}

export function FurnitureModel({
  cfg,
  gozSecimi,
  seciliGoz,
  onGozSec,
  siluet,
}: Props) {
  const paneller = useMemo(() => panelleriUret(cfg), [cfg]);
  const gozler = useMemo(() => gozlerinYerlesimi(cfg), [cfg]);
  const masaMi = MODELLER.find((m) => m.id === cfg.modelId)?.tur === "masa";
  const taban = tabanBul(cfg.taban);

  const govde = malzemeBul(cfg.govdeMalzeme);
  const on = malzemeBul(cfg.onMalzeme);

  const govdeDoku = useMemo(() => ahsapDokusu(govde), [govde]);
  const onDoku = useMemo(() => ahsapDokusu(on), [on]);
  const siluetDoku = useMemo(() => (siluet ? siluetDokusu() : null), [siluet]);

  // Arka panel biraz daha koyu görünür: gövdenin içinde kalır,
  // ışık almaz. Ayrı bir malzeme değil, aynı malzemenin gölgesi.
  const arkaRenk = useMemo(
    () => new THREE.Color(govde.hex).multiplyScalar(0.82),
    [govde.hex]
  );

  return (
    <group>
      {/* --- Paneller --- */}
      {paneller
        .filter((p) => p.gorunur)
        .map((p) => {
          const onYuzey = p.malzemeRolu === "on";
          const arka = p.malzemeRolu === "arka";
          const malzeme = onYuzey ? on : govde;
          const doku = onYuzey ? onDoku : govdeDoku;
          const vurgulu = seciliGoz !== null && p.goz === seciliGoz;
          // Satın alınan ayak levha değil: dokusu yok, kendi
          // rengiyle çizilir.
          if (p.levhaDisi) {
            return (
              <mesh
                key={p.id}
                position={[p.x * MM, p.y * MM, p.z * MM]}
                castShadow
              >
                <boxGeometry args={[p.w * MM, p.h * MM, p.d * MM]} />
                <meshStandardMaterial
                  color={p.renkIpucu ?? malzeme.hex}
                  roughness={p.renkIpucu ? 0.45 : 0.6}
                  metalness={p.renkIpucu ? 0.5 : 0}
                />
              </mesh>
            );
          }
          return (
            <mesh
              key={p.id}
              position={[p.x * MM, p.y * MM, p.z * MM]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[p.w * MM, p.h * MM, p.d * MM]} />
              <meshStandardMaterial
                map={arka ? null : doku}
                color={arka ? arkaRenk : vurgulu ? "#b9d9b5" : "#ffffff"}
                roughness={malzeme.tur === "masif" ? 0.62 : 0.78}
                metalness={0}
              />
            </mesh>
          );
        })}

      {/* --- Dolap ayakları ve tekerlekler ---
          Masa ayakları panel listesinden geliyor; burası
          yalnızca gövdeyi yerden kaldıran dolap tabanı. */}
      {!masaMi && !taban.panelli && taban.yukseklik > 10 && (
        <Ayaklar cfg={cfg} yukseklik={taban.yukseklik} tekerlek={cfg.taban === "tekerlek"} />
      )}

      {/* --- Kulplar --- */}
      {!masaMi && <Kulplar cfg={cfg} />}

      {/* --- Göz seçimi: tıklanabilir saydam kutular --- */}
      {gozSecimi &&
        gozler.map((g) => (
          <mesh
            key={`goz-${g.anahtar}`}
            position={[g.x * MM, g.y * MM, (g.z + g.d / 2) * MM]}
            onClick={(e) => {
              e.stopPropagation();
              onGozSec(g.anahtar);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
          >
            <boxGeometry args={[g.w * MM, g.h * MM, 0.012]} />
            <meshBasicMaterial
              color={seciliGoz === g.anahtar ? "#4ade80" : "#ffffff"}
              transparent
              opacity={seciliGoz === g.anahtar ? 0.3 : 0.04}
              depthWrite={false}
            />
          </mesh>
        ))}

      {/* --- 180 cm insan silueti --- */}
      {siluetDoku && (
        <mesh
          position={[(-cfg.genislik / 2 - 420) * MM, 0.9, 0]}
          renderOrder={-1}
        >
          <planeGeometry args={[0.9, 1.8]} />
          <meshBasicMaterial
            map={siluetDoku}
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/** Ayak ya da tekerlek — dört köşeye, gövdenin biraz içine */
function Ayaklar({
  cfg,
  yukseklik,
  tekerlek,
}: {
  cfg: MobilyaYapilandirma;
  yukseklik: number;
  tekerlek: boolean;
}) {
  const ic = 60;
  const noktalar: [number, number][] = [
    [-cfg.genislik / 2 + ic, -cfg.derinlik / 2 + ic],
    [cfg.genislik / 2 - ic, -cfg.derinlik / 2 + ic],
    [-cfg.genislik / 2 + ic, cfg.derinlik / 2 - ic],
    [cfg.genislik / 2 - ic, cfg.derinlik / 2 - ic],
  ];
  const yaricap = tekerlek ? 24 : 20;
  return (
    <>
      {noktalar.map(([x, z], i) => (
        <mesh
          key={i}
          position={[x * MM, (yukseklik / 2) * MM, z * MM]}
          castShadow
        >
          <cylinderGeometry
            args={[
              yaricap * MM,
              (tekerlek ? yaricap : yaricap * 0.7) * MM,
              yukseklik * MM,
              14,
            ]}
          />
          <meshStandardMaterial
            color={tekerlek ? "#2b2f33" : "#8a6a44"}
            roughness={tekerlek ? 0.5 : 0.65}
            metalness={tekerlek ? 0.3 : 0}
          />
        </mesh>
      ))}
    </>
  );
}

/** Kapak ve çekmecelerin kulpları */
function Kulplar({ cfg }: { cfg: MobilyaYapilandirma }) {
  if (cfg.kulp === "gizli") return null;
  const gozler = gozlerinYerlesimi(cfg);
  const renk =
    cfg.kulp === "cubuk-pirinc"
      ? "#b08d57"
      : cfg.kulp === "deri"
        ? "#6b4a2f"
        : "#232629";

  return (
    <>
      {gozler.map((g) => {
        const icerik = cfg.gozler[g.anahtar];
        if (!icerik || icerik === "bos") return null;
        // Kapakta kulp yan kenara yakın, çekmecede ortada
        const x = icerik === "cekmece" ? g.x : g.x + g.w / 2 - 70;
        const y = icerik === "cekmece" ? g.y : g.y;
        const z = cfg.derinlik / 2 + 16;
        return (
          <mesh
            key={`kulp-${g.anahtar}`}
            position={[x * MM, y * MM, z * MM]}
            rotation={[0, 0, icerik === "cekmece" ? Math.PI / 2 : 0]}
            castShadow
          >
            <cylinderGeometry args={[0.006, 0.006, 0.128, 10]} />
            <meshStandardMaterial
              color={renk}
              roughness={cfg.kulp === "deri" ? 0.8 : 0.35}
              metalness={cfg.kulp === "deri" ? 0 : 0.7}
            />
          </mesh>
        );
      })}
    </>
  );
}
