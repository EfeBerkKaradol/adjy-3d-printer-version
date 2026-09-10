// ==========================================
// GEOMETRİ KURULUMU
//
// Model bir dosya olarak saklanmaz; parametrelerden her
// seferinde yeniden kurulur. Bir ölçü değiştiğinde ekrandaki
// biçim de, hacim de, dolayısıyla fiyat da gerçekten değişir.
// ==========================================

import * as THREE from "three";
import type { GeneratedModel, ModelParameter } from "../types";

/** Parametre listesinden değer okumak için küçük yardımcı */
export function paramValue(parameters: ModelParameter[], id: string, fallback = 0): number {
  return parameters.find((p) => p.id === id)?.value ?? fallback;
}

export function hasParam(parameters: ModelParameter[], id: string): boolean {
  return parameters.some((p) => p.id === id);
}

/**
 * Profili uçlardan biçimlendirir.
 *
 * Ağız ve taban çapı değiştiğinde objenin ortası korunmalı,
 * yalnızca uçlar açılıp kapanmalı. Ağırlık uçlara doğru
 * kareyle arttığı için gövde olduğu gibi kalır.
 */
function shapedRadii(model: GeneratedModel, samples: number): number[] {
  const profile = model.profile;
  const maxHalf = Math.max(...profile, 0.001);
  const first = profile[0] / maxHalf;
  const last = profile[profile.length - 1] / maxHalf;

  const mouth = hasParam(model.parameters, "mouth")
    ? paramValue(model.parameters, "mouth") / 100
    : last;
  const base = hasParam(model.parameters, "base")
    ? paramValue(model.parameters, "base") / 100
    : first;

  const topGain = last > 0.01 ? mouth / last - 1 : mouth > 0 ? 1 : 0;
  const botGain = first > 0.01 ? base / first - 1 : base > 0 ? 1 : 0;

  const out: number[] = [];
  for (let i = 0; i < samples; i += 1) {
    const t = i / (samples - 1);
    const src = profile[Math.round(t * (profile.length - 1))] / maxHalf;
    const gain = 1 + (1 - t) * (1 - t) * botGain + t * t * topGain;
    out.push(Math.max(0.02, src * gain));
  }
  return out;
}

/** Kendi ekseninde döndürülmüş katı gövde */
function buildRevolve(model: GeneratedModel): THREE.BufferGeometry {
  const height = paramValue(model.parameters, "height", model.dimensions.heightMm);
  const width = paramValue(model.parameters, "width", model.dimensions.widthMm);
  const rMax = width / 2;
  const samples = 64;
  const radii = shapedRadii(model, samples);

  const wall = hasParam(model.parameters, "wall")
    ? paramValue(model.parameters, "wall")
    : 0;

  const points: THREE.Vector2[] = [];

  if (wall > 0) {
    // İçi boş kap: dış yüzey yukarı, iç yüzey aşağı çizilir.
    // Böylece kapalı bir katı oluşur ve hacim gerçekten azalır.
    points.push(new THREE.Vector2(0, 0));
    for (let i = 0; i < samples; i += 1) {
      points.push(new THREE.Vector2(radii[i] * rMax, (i / (samples - 1)) * height));
    }
    for (let i = samples - 1; i >= 0; i -= 1) {
      const inner = Math.max(0.01, radii[i] * rMax - wall);
      const y = Math.min(height - wall, (i / (samples - 1)) * height);
      points.push(new THREE.Vector2(inner, Math.max(wall, y)));
    }
    points.push(new THREE.Vector2(0, wall));
  } else {
    points.push(new THREE.Vector2(0, 0));
    for (let i = 0; i < samples; i += 1) {
      points.push(new THREE.Vector2(radii[i] * rMax, (i / (samples - 1)) * height));
    }
    points.push(new THREE.Vector2(0, height));
  }

  const geo = new THREE.LatheGeometry(points, 64);
  geo.translate(0, -height / 2, 0);
  geo.computeVertexNormals();
  return geo;
}

/** Dış hattın kalınlaştırılmasıyla oluşan gövde */
function buildExtrude(model: GeneratedModel): THREE.BufferGeometry {
  const height = paramValue(model.parameters, "height", model.dimensions.heightMm);
  const width = paramValue(model.parameters, "width", model.dimensions.widthMm);
  const depth = paramValue(model.parameters, "depth", model.dimensions.depthMm);
  const samples = 56;
  const radii = shapedRadii(model, samples);

  const shape = new THREE.Shape();
  for (let i = 0; i < samples; i += 1) {
    const x = radii[i] * (width / 2);
    const y = (i / (samples - 1)) * height - height / 2;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let i = samples - 1; i >= 0; i -= 1) {
    const x = -radii[i] * (width / 2);
    const y = (i / (samples - 1)) * height - height / 2;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 6,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Modelin o anki parametreleriyle geometrisi (mm biriminde) */
export function buildGeometry(model: GeneratedModel): THREE.BufferGeometry {
  return model.kind === "revolve" ? buildRevolve(model) : buildExtrude(model);
}

/**
 * Hacim ölçümü indekssiz üçgen dizisi bekliyor; Lathe ve
 * Extrude indeksli üretiyor. Ölçümden önce açılır.
 */
export function positionsFor(geometry: THREE.BufferGeometry): Float32Array {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  return flat.getAttribute("position").array as Float32Array;
}

/** Modelin gerçek dış ölçüleri — parametreler uygulandıktan sonra */
export function measure(model: GeneratedModel, geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  if (!bb) return model.dimensions;
  return {
    widthMm: Math.round(bb.max.x - bb.min.x),
    heightMm: Math.round(bb.max.y - bb.min.y),
    depthMm: Math.round(bb.max.z - bb.min.z),
  };
}
