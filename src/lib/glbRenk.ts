import * as THREE from "three";

/**
 * GLB'deki renkleri korumalı mıyız?
 *
 * Tek renk basılan ürünlerde model, müşterinin seçtiği filament rengine
 * boyanır. Çok renkli basılan ürünlerin (ör. yeşil-kırmızı-altın süsler)
 * GLB'sinde her renk ayrı bir malzemedir; onları tek renge boyamak ürünü
 * olduğundan farklı gösterir. Bu yüzden renk seçilmemişse ve modelde en az
 * iki farklı malzeme rengi varsa GLB'nin kendi renkleri kullanılır.
 */
export function glbRenkleriniKoru(root: THREE.Object3D, secilenRenk?: string | null): boolean {
  if (secilenRenk) return false;
  const renkler = new Set<string>();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of mats) {
      if (m instanceof THREE.MeshStandardMaterial) renkler.add(m.color.getHexString());
    }
  });
  return renkler.size >= 2;
}
