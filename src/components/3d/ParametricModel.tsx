"use client";

import { useMemo, useRef, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ==========================================
// PARAMETRİK 3D MODEL
//
// Parametrelere göre gerçek zamanlı geometri üretir.
// Her parametre değişikliğinde geometri yeniden hesaplanır.
//
// Desteklenen ürün tipleri:
//   - vase (vazo): Yükseklik, genişlik, dalga frekansı
//   - stand (telefon standı): Genişlik, açı, yükseklik
//   - keychain (anahtarlık): Kalınlık, çap
//   - lamp (masa lambası): Çap, yükseklik, desen yoğunluğu
//   - pencilHolder (kalem kutusu): Bölme sayısı, yükseklik
//   - bracelet (bileklik): Çap, bant genişliği
//   - gear (dişli çark): Diş sayısı, modül, kalınlık
// ==========================================

interface ParametricModelProps {
  parameters: Record<string, number | string>;
  productType?: string;
}

type ModelProps = {
  parameters: Record<string, number | string>;
  color: string;
};

export function ParametricModel({ parameters, productType }: ParametricModelProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Yavaş dönüş animasyonu
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  // Renk
  const color = (parameters.color as string) || "#FFFFFF";

  // Ürün tipine göre geometri seç
  switch (productType) {
    case "vase":
      return <VaseModel ref={meshRef} parameters={parameters} color={color} />;
    case "stand":
      return <StandModel ref={meshRef} parameters={parameters} color={color} />;
    case "keychain":
      return <KeychainModel ref={meshRef} parameters={parameters} color={color} />;
    case "lamp":
      return <LampModel ref={meshRef} parameters={parameters} color={color} />;
    case "pencilHolder":
      return <PencilHolderModel ref={meshRef} parameters={parameters} color={color} />;
    case "bracelet":
      return <BraceletModel ref={meshRef} parameters={parameters} color={color} />;
    case "gear":
      return <GearModel ref={meshRef} parameters={parameters} color={color} />;
    case "meltingShelf":
      return <MeltingShelfModel ref={meshRef} parameters={parameters} color={color} />;
    case "hexShelf":
      return <HexShelfModel ref={meshRef} parameters={parameters} color={color} />;
    case "skadisPanel":
      return <SKADISPanelModel ref={meshRef} parameters={parameters} color={color} />;
    default:
      return <VaseModel ref={meshRef} parameters={parameters} color={color} />;
  }
}

// ==========================================
// VAZO MODELİ
// Lathe geometri ile parametrik vazo
// ==========================================
const VaseModel = forwardRef<THREE.Mesh, ModelProps>(
  function VaseModel({ parameters, color }, ref) {
    const height = ((parameters.height as number) || 200) / 100;
    const width = ((parameters.width as number) || 100) / 100;
    const waveFrequency = (parameters.waveFrequency as number) || 4;

    const geometry = useMemo(() => {
      const points: THREE.Vector2[] = [];
      const segments = 64;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = t * height - height / 2;

        const baseRadius = width * 0.3;
        const midRadius = width * 0.5;
        const topRadius = width * 0.4;

        let radius;
        if (t < 0.3) {
          radius = baseRadius + (midRadius - baseRadius) * (t / 0.3);
        } else if (t < 0.7) {
          const mt = (t - 0.3) / 0.4;
          radius = midRadius + (topRadius - midRadius) * mt * mt;
        } else {
          const tt = (t - 0.7) / 0.3;
          radius = topRadius - topRadius * 0.15 * Math.sin(tt * Math.PI);
        }

        const wave = Math.sin(t * Math.PI * waveFrequency) * (width * 0.06);
        radius += wave;

        points.push(new THREE.Vector2(Math.max(0.02, radius), y));
      }

      return new THREE.LatheGeometry(points, 48);
    }, [height, width, waveFrequency]);

    return (
      <mesh ref={ref} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }
);

// ==========================================
// TELEFON STANDI MODELİ
// ==========================================
const StandModel = forwardRef<THREE.Mesh, ModelProps>(
  function StandModel({ parameters, color }, ref) {
    const standWidth = ((parameters.width as number) || 80) / 100;
    const angle = ((parameters.angle as number) || 60) * (Math.PI / 180);
    const standHeight = ((parameters.height as number) || 100) / 100;

    return (
      <group ref={ref as React.Ref<THREE.Group>}>
        {/* Taban */}
        <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[standWidth, 0.08, standWidth * 0.8]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Arka destek */}
        <mesh
          position={[0, standHeight / 2 - 0.45, -standWidth * 0.3]}
          rotation={[angle - Math.PI / 2, 0, 0]}
          castShadow
        >
          <boxGeometry args={[standWidth * 0.9, standHeight, 0.06]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Ön dudak */}
        <mesh position={[0, -0.42, standWidth * 0.25]} castShadow>
          <boxGeometry args={[standWidth * 0.9, 0.08, 0.06]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </mesh>
      </group>
    );
  }
);

// ==========================================
// ANAHTARLIK MODELİ
// ==========================================
const KeychainModel = forwardRef<THREE.Mesh, ModelProps>(
  function KeychainModel({ parameters, color }, ref) {
    const thickness = ((parameters.thickness as number) || 3) / 10;
    const diameter = ((parameters.diameter as number) || 40) / 100;

    return (
      <group ref={ref as React.Ref<THREE.Group>}>
        {/* Ana disk */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[diameter, diameter, thickness, 32]} />
          <meshStandardMaterial color={color} roughness={0.25} metalness={0.15} />
        </mesh>
        {/* Halka deliği */}
        <mesh position={[0, 0, diameter + 0.05]}>
          <torusGeometry args={[0.08, 0.02, 16, 32]} />
          <meshStandardMaterial color="#888888" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
    );
  }
);

// ==========================================
// GEOMETRİK MASA LAMBASI MODELİ
// Silindirik gövde + geometrik kafes abajur
// ==========================================
const LampModel = forwardRef<THREE.Mesh, ModelProps>(
  function LampModel({ parameters, color }, ref) {
    const diameter = ((parameters.diameter as number) || 150) / 100;
    const height = ((parameters.height as number) || 250) / 100;
    const patternDensity = (parameters.patternDensity as number) || 3;

    // Abajur geometrisi: patternDensity icosahedron detayını belirler
    const detail = Math.max(0, Math.min(patternDensity - 1, 4));

    return (
      <group ref={ref as React.Ref<THREE.Group>}>
        {/* Taban */}
        <mesh position={[0, -height / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[diameter * 0.2, diameter * 0.25, 0.08, 32]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Gövde - ince silindir */}
        <mesh position={[0, -height * 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, height * 0.6, 8]} />
          <meshStandardMaterial color="#666666" roughness={0.5} metalness={0.3} />
        </mesh>

        {/* Abajur - geometrik kafes */}
        <mesh position={[0, height * 0.25, 0]} castShadow receiveShadow>
          <icosahedronGeometry args={[diameter * 0.45, detail]} />
          <meshStandardMaterial
            color={color}
            roughness={0.2}
            metalness={0.05}
            wireframe={patternDensity <= 2}
            side={THREE.DoubleSide}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Abajur kenarları (wireframe overlay) */}
        {patternDensity > 2 && (
          <mesh position={[0, height * 0.25, 0]}>
            <icosahedronGeometry args={[diameter * 0.451, detail]} />
            <meshBasicMaterial color="#000000" wireframe opacity={0.15} transparent />
          </mesh>
        )}

        {/* Ampul efekti (iç ışık) */}
        <mesh position={[0, height * 0.25, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial
            color="#FFF8E1"
            emissive="#FFF8E1"
            emissiveIntensity={0.8}
          />
        </mesh>
      </group>
    );
  }
);

// ==========================================
// MODÜLER KALEM KUTUSU MODELİ
// Dinamik bölme sayısına göre silindirik bölmeler
// ==========================================
const PencilHolderModel = forwardRef<THREE.Mesh, ModelProps>(
  function PencilHolderModel({ parameters, color }, ref) {
    const compartments = Number((parameters.compartments as number) || 3);
    const height = ((parameters.height as number) || 100) / 100;

    const compartmentData = useMemo(() => {
      const data: Array<{ x: number; z: number; radius: number; h: number }> = [];
      const totalWidth = compartments * 0.3;

      for (let i = 0; i < compartments; i++) {
        // Bölmeleri yan yana sırayla diz, hafif yükseklik farkı
        const x = (i - (compartments - 1) / 2) * 0.3;
        const heightVariation = 1 - Math.abs(i - (compartments - 1) / 2) * 0.08;
        data.push({
          x,
          z: 0,
          radius: Math.min(0.14, (totalWidth / compartments) * 0.45),
          h: height * heightVariation,
        });
      }
      return data;
    }, [compartments, height]);

    return (
      <group ref={ref as React.Ref<THREE.Group>}>
        {/* Taban plaka */}
        <mesh position={[0, -height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[compartments * 0.32, 0.06, 0.35]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Bölmeler */}
        {compartmentData.map((comp, i) => (
          <group key={i}>
            {/* Dış silindir */}
            <mesh
              position={[comp.x, comp.h / 2 - height / 2 + 0.03, comp.z]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[comp.radius, comp.radius * 1.05, comp.h, 24]} />
              <meshStandardMaterial
                color={color}
                roughness={0.3}
                metalness={0.1}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* İç boşluk (biraz daha küçük, koyu renk) */}
            <mesh
              position={[comp.x, comp.h / 2 - height / 2 + 0.06, comp.z]}
            >
              <cylinderGeometry args={[comp.radius * 0.85, comp.radius * 0.9, comp.h - 0.04, 24]} />
              <meshStandardMaterial
                color="#1a1a1a"
                roughness={0.8}
                side={THREE.BackSide}
              />
            </mesh>
          </group>
        ))}
      </group>
    );
  }
);

// ==========================================
// BİLEKLİK MODELİ
// Torus geometri ile parametrik bileklik
// ==========================================
const BraceletModel = forwardRef<THREE.Mesh, ModelProps>(
  function BraceletModel({ parameters, color }, ref) {
    const diameter = ((parameters.diameter as number) || 65) / 100; // bilek çapı
    const bandWidth = ((parameters.bandWidth as number) || 15) / 100; // bant genişliği

    const tubeRadius = bandWidth / 2;
    const torusRadius = diameter / 2;

    return (
      <group ref={ref as React.Ref<THREE.Group>}>
        {/* Ana bileklik halkası */}
        <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[torusRadius, tubeRadius, 24, 48]} />
          <meshStandardMaterial
            color={color}
            roughness={0.35}
            metalness={0.1}
          />
        </mesh>

        {/* Kenar çizgisi detayı (üst) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[torusRadius, tubeRadius * 1.01, 24, 48]} />
          <meshBasicMaterial color="#000000" wireframe opacity={0.05} transparent />
        </mesh>
      </group>
    );
  }
);

// ==========================================
// ERİYEN DUVAR RAFI MODELİ
// Dikdörtgen raf + parametrik damlalar
// Tüm geometriler useMemo ile — R3F'de args güncellemesi garantili
// ==========================================
const MeltingShelfModel = forwardRef<THREE.Mesh, ModelProps>(
  function MeltingShelfModel({ parameters, color }, ref) {
    const width  = Number(parameters.width  || 235) / 100;
    const height = Number(parameters.height || 120) / 100;
    const depth  = Number(parameters.depth  || 104) / 100;

    // Damla sayısı genişlikten otomatik: ~33.5mm'de 1 damla (235mm → 7 damla)
    const dripCount = Math.max(2, Math.round((width * 100) / 33.5));

    // Raf yüksekliği %60, damla boyu %40 (toplam height'ı paylaşırlar)
    const boardH  = Math.max(0.10, height * 0.60);
    const dripLen = Math.max(0.12, height * 0.40);

    // Damla kalınlığı aralığa orantılı (sıkışınca incelir, seyreldikçe kalınlaşır)
    const spacing   = width / dripCount;
    const dripThick = spacing * 0.36;

    // ─── Raf gövdesi ──────────────────────────────────────────────
    const shelfGeo = useMemo(
      () => new THREE.BoxGeometry(width, boardH, depth),
      [width, boardH, depth]
    );

    // ─── Organik LatheGeometry damlalar ───────────────────────────
    // Profil: üstten geniş → smooth-step boyun → sinüs blob ucu
    const dripData = useMemo(() => {
      const buildDrip = (topR: number, len: number): THREE.LatheGeometry => {
        const pts: THREE.Vector2[] = [];
        const N     = 16;
        const neckR = topR * 0.22;
        const blobR = topR * 0.46;
        for (let j = 0; j <= N; j++) {
          const t  = j / N;
          let r: number;
          if (t < 0.58) {
            const s  = t / 0.58;
            const ss = s * s * (3 - 2 * s);           // smooth-step
            r = topR + (neckR - topR) * ss - topR * 0.07 * Math.sin(s * Math.PI);
          } else {
            const s = (t - 0.58) / 0.42;
            r = neckR + (blobR - neckR) * Math.sin(s * Math.PI);
          }
          pts.push(new THREE.Vector2(Math.max(0.001, r), -t * len));
        }
        return new THREE.LatheGeometry(pts, 14);
      };

      const list: Array<{ x: number; len: number; geo: THREE.LatheGeometry }> = [];
      for (let i = 0; i < dripCount; i++) {
        const t      = dripCount === 1 ? 0.5 : i / (dripCount - 1);
        const x      = (t - 0.5) * width * 0.88;
        const seed   = i + 1;
        // Sabit seed ile tutarlı varyasyon — her damla biraz farklı boy/kalınlık
        const lenVar = 0.62 + 0.38 * Math.abs(Math.sin(seed * 2.31 + 0.7));
        const thkVar = 0.78 + 0.22 * Math.abs(Math.cos(seed * 1.87 + 0.3));
        const len    = dripLen   * lenVar;
        const topR   = dripThick * thkVar / 1.5;
        list.push({ x, len, geo: buildDrip(topR, len) });
      }
      return list;
    }, [dripCount, width, dripLen, dripThick]);

    // Dikey ortalama: modelin merkezi y=0'da olsun
    const maxDripLen = dripData.reduce((m, d) => Math.max(m, d.len), 0);
    const yOffset    = maxDripLen / 2;

    return (
      <group ref={ref as React.Ref<THREE.Group>} position={[0, yOffset, 0]}>
        {/* Raf gövdesi */}
        <mesh geometry={shelfGeo} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.30} metalness={0.05} />
        </mesh>

        {/* Damlalar */}
        {dripData.map((d, i) => (
          <mesh
            key={i}
            geometry={d.geo}
            position={[d.x, -boardH / 2, 0]}
            castShadow
          >
            <meshStandardMaterial color={color} roughness={0.30} metalness={0.05} />
          </mesh>
        ))}
      </group>
    );
  }
);

// ==========================================
// DEKORATİF KÜP/HEX DUVAR RAFI MODELİ
// ExtrudeGeometry ile altıgen çerçeve + iç raflar
// ==========================================
const HexShelfModel = forwardRef<THREE.Mesh, ModelProps>(
  function HexShelfModel({ parameters, color }, ref) {
    const width      = Number(parameters.width          || 252) / 100;
    const height     = Number(parameters.height         || 192) / 100;
    const depth      = Number(parameters.depth          || 100) / 100;
    const sections   = Math.round(Number(parameters.shelf_sections || 3));
    const frameThick = Number(parameters.frame_thickness || 10) / 100;

    const hexR = Math.min(width, height) / 2 * 0.92;

    const frameGeo = useMemo(() => {
      // Düz-üstlü altıgen (flat-top): köşe açısı = 30° + 60° * i
      const buildHex = (r: number) => {
        const pts: [number, number][] = [];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          pts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
        return pts;
      };

      const outer = new THREE.Shape();
      buildHex(hexR).forEach(([x, y], i) =>
        i === 0 ? outer.moveTo(x, y) : outer.lineTo(x, y)
      );
      outer.closePath();

      const innerR = Math.max(0.01, hexR - frameThick);
      const inner = new THREE.Path();
      // Delik için ters saat yönü
      buildHex(innerR).reverse().forEach(([x, y], i) =>
        i === 0 ? inner.moveTo(x, y) : inner.lineTo(x, y)
      );
      inner.closePath();
      outer.holes.push(inner);

      const geo = new THREE.ExtrudeGeometry(outer, {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.004,
        bevelSize: 0.004,
        bevelSegments: 1,
      });
      geo.translate(0, 0, -depth / 2); // Z'de ortala
      return geo;
    }, [hexR, frameThick, depth]);

    // İç yatay raflar — geometriler useMemo içinde üretilir, args değişince yeniden oluşur
    const innerShelves = useMemo(() => {
      const innerR = hexR - frameThick;
      const span   = innerR * 1.55; // flat-top hex iç yüksekliği ≈ √3/2 * 2R
      const list: Array<{ y: number; geo: THREE.BoxGeometry }> = [];
      for (let i = 1; i < sections; i++) {
        const y = ((i / sections) - 0.5) * span;
        const relY = Math.abs(y) / (innerR * 0.87);
        const chord = innerR * 1.72 * Math.max(0.25, 1 - relY * 0.6);
        list.push({ y, geo: new THREE.BoxGeometry(chord, frameThick, depth * 0.90) });
      }
      return list;
    }, [hexR, frameThick, sections, depth]);

    return (
      <group ref={ref as React.Ref<THREE.Group>}>
        {/* Altıgen çerçeve */}
        <mesh geometry={frameGeo} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.25} metalness={0.05} />
        </mesh>

        {/* İç raflar */}
        {innerShelves.map((s, i) => (
          <mesh key={i} geometry={s.geo} position={[0, s.y, 0]} castShadow>
            <meshStandardMaterial color={color} roughness={0.25} metalness={0.05} />
          </mesh>
        ))}
      </group>
    );
  }
);

// ==========================================
// SKADİS VORONOI PANEL MODELİ
// ExtrudeGeometry ile organik delikli panel + kanca sıraları
// ==========================================
const SKADISPanelModel = forwardRef<THREE.Mesh, ModelProps>(
  function SKADISPanelModel({ parameters, color }, ref) {
    const width     = Number(parameters.width        || 240) / 100;
    const height    = Number(parameters.height       || 240) / 100;
    const thick     = Number(parameters.thickness    ||   5) / 100;
    const cellSize  = Math.max(0.05, Number(parameters.cell_size    || 25) / 100);
    const hookRows  = Math.round(Number(parameters.hook_rows  ||  3));
    const borderW   = Number(parameters.border_width || 10) / 100;

    const panelGeo = useMemo(() => {
      const hw = width / 2, hh = height / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-hw, -hh);
      shape.lineTo( hw, -hh);
      shape.lineTo( hw,  hh);
      shape.lineTo(-hw,  hh);
      shape.closePath();

      // Voronoi benzeri delikler: jitterli ızgara
      const innerW = width  - borderW * 2;
      const innerH = height - borderW * 2;
      const cols   = Math.max(1, Math.floor(innerW / cellSize));
      const rows_h = Math.max(1, Math.floor(innerH / cellSize));
      const cellW  = innerW / cols;
      const cellH  = innerH / rows_h;
      const holeR  = Math.min(cellW, cellH) * 0.38;
      const MAX_HOLES = 180; // performans sınırı
      let count = 0;

      outer: for (let r = 0; r < rows_h; r++) {
        for (let c = 0; c < cols; c++) {
          if (count >= MAX_HOLES) break outer;
          const seed = r * 200 + c;
          const jx = Math.sin(seed * 7.31 + 0.7) * cellW * 0.18;
          const jy = Math.cos(seed * 5.17 + 1.3) * cellH * 0.18;
          const cx = -innerW / 2 + (c + 0.5) * cellW + jx;
          const cy = -innerH / 2 + (r + 0.5) * cellH + jy;
          const rVar = holeR * (0.82 + Math.sin(seed * 3.71) * 0.18);
          const hole = new THREE.Path();
          hole.absarc(cx, cy, rVar, 0, Math.PI * 2, false);
          shape.holes.push(hole);
          count++;
        }
      }

      const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
      geo.translate(0, 0, -thick / 2);
      return geo;
    }, [width, height, thick, cellSize, borderW]);

    // Kanca konumları + geometriler — useMemo ile üretilir
    const hookR = thick * 1.3;
    const hooks = useMemo(() => {
      if (hookRows <= 0) return [];
      const innerW    = width  - borderW * 2;
      const innerH    = height - borderW * 2;
      const perRow    = Math.max(1, Math.floor(innerW / (cellSize * 1.5)));
      const rowSpacing = innerH / (hookRows + 1);
      const list: Array<{ x: number; y: number; geo: THREE.TorusGeometry }> = [];
      const r = thick * 1.3;
      for (let row = 0; row < hookRows; row++) {
        const y = -innerH / 2 + rowSpacing * (row + 1);
        for (let c = 0; c < perRow; c++) {
          const x = -innerW / 2 + (innerW / perRow) * (c + 0.5);
          list.push({ x, y, geo: new THREE.TorusGeometry(r, thick * 0.22, 8, 12, Math.PI * 1.25) });
        }
      }
      return list;
    }, [width, height, hookRows, cellSize, borderW, thick]);

    return (
      <group ref={ref as React.Ref<THREE.Group>}>
        {/* Panel */}
        <mesh geometry={panelGeo} castShadow receiveShadow>
          <meshStandardMaterial
            color={color}
            roughness={0.25}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* Kancalar – yarım torus */}
        {hooks.map((h, i) => (
          <mesh
            key={i}
            geometry={h.geo}
            position={[h.x, h.y, thick / 2 + hookR * 0.4]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <meshStandardMaterial color={color} roughness={0.30} metalness={0.05} />
          </mesh>
        ))}
      </group>
    );
  }
);

// ==========================================
// PARAMETRİK DİŞLİ ÇARK MODELİ
// ExtrudeGeometry ile diş profili
// ==========================================
const GearModel = forwardRef<THREE.Mesh, ModelProps>(
  function GearModel({ parameters, color }, ref) {
    const teethCount = Number((parameters.teethCount as number) || 24);
    const modulePar = Number((parameters.module as number) || 1);
    const thickness = ((parameters.thickness as number) || 5) / 10;

    const geometry = useMemo(() => {
      const pitchRadius = (teethCount * modulePar) / 20; // ölçeği küçült
      const outerRadius = pitchRadius + modulePar * 0.06;
      const innerRadius = pitchRadius - modulePar * 0.07;
      const holeRadius = pitchRadius * 0.25;

      const shape = new THREE.Shape();
      const toothAngle = (Math.PI * 2) / teethCount;
      const toothWidth = toothAngle * 0.35;

      // Dişli profili çiz
      for (let i = 0; i < teethCount; i++) {
        const angle = i * toothAngle;

        // Diş kökü (inner)
        const rootStart = angle + toothWidth;
        const rootEnd = angle + toothAngle - toothWidth;

        // Diş tepesi (outer)
        const tipStart = angle;
        const tipEnd = angle + toothWidth;

        if (i === 0) {
          shape.moveTo(
            Math.cos(tipStart) * outerRadius,
            Math.sin(tipStart) * outerRadius
          );
        }

        // Diş tepesi
        shape.lineTo(
          Math.cos(tipEnd) * outerRadius,
          Math.sin(tipEnd) * outerRadius
        );

        // Diş kökü geçişi
        shape.lineTo(
          Math.cos(rootStart) * innerRadius,
          Math.sin(rootStart) * innerRadius
        );

        // Kök boyunca
        shape.lineTo(
          Math.cos(rootEnd) * innerRadius,
          Math.sin(rootEnd) * innerRadius
        );

        // Sonraki diş tepesine
        const nextTipStart = (i + 1) * toothAngle;
        shape.lineTo(
          Math.cos(nextTipStart) * outerRadius,
          Math.sin(nextTipStart) * outerRadius
        );
      }

      shape.closePath();

      // Merkez deliği
      const holePath = new THREE.Path();
      const holeSegments = 32;
      for (let i = 0; i <= holeSegments; i++) {
        const angle = (i / holeSegments) * Math.PI * 2;
        const x = Math.cos(angle) * holeRadius;
        const y = Math.sin(angle) * holeRadius;
        if (i === 0) holePath.moveTo(x, y);
        else holePath.lineTo(x, y);
      }
      shape.holes.push(holePath);

      const extrudeSettings = {
        depth: thickness,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01,
        bevelSegments: 2,
      };

      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.center();
      return geo;
    }, [teethCount, modulePar, thickness]);

    return (
      <mesh
        ref={ref}
        geometry={geometry}
        castShadow
        receiveShadow
        rotation={[Math.PI / 2, 0, 0]}
      >
        <meshStandardMaterial
          color={color || "#888888"}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>
    );
  }
);
