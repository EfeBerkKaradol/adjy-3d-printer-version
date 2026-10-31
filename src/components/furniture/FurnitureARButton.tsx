"use client";

import { useCallback, useState } from "react";
import * as THREE from "three";
import { Loader2, Smartphone } from "lucide-react";
import { ARModal } from "@/components/ar/ARModal";
import { exportSceneToGLB } from "@/lib/ar/glbExporter";
import { panelleriUret } from "@/lib/furniture/panels";
import { malzemeBul } from "@/lib/furniture/materials";
import type { MobilyaYapilandirma } from "@/lib/furniture/types";

// ==========================================
// ODANDA GÖR
//
// ADJY'nin kuruluş fikri buydu: müşteri tasarımcıya gitmeden,
// istediği ölçüdeki mobilyayı kendi duvarında görsün. Mağaza
// tarafında bu hazır bir dosyayla yapılıyordu; burada hazır
// dosya yok — model az önce kaydırıcıyla kuruldu.
//
// O yüzden GLB dosyası tarayıcıda, o anki yapılandırmadan
// üretiliyor. Telefonda duvara koyduğunuz şey, sepete
// atacağınız şeyin ta kendisi.
// ==========================================

export function FurnitureARButton({
  cfg,
  ad,
}: {
  cfg: MobilyaYapilandirma;
  ad: string;
}) {
  const [hazirlaniyor, setHazirlaniyor] = useState(false);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [acik, setAcik] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const uret = useCallback(async () => {
    setHazirlaniyor(true);
    setHata(null);
    try {
      const sahne = new THREE.Scene();
      const govde = malzemeBul(cfg.govdeMalzeme);
      const on = malzemeBul(cfg.onMalzeme);

      // Malzeme başına tek örnek — her panele ayrı malzeme
      // vermek GLB'yi gereksiz şişiriyor.
      const malzemeler = new Map<string, THREE.MeshStandardMaterial>();
      const malzemeAl = (hex: string, puruz: number) => {
        const anahtar = `${hex}-${puruz}`;
        let m = malzemeler.get(anahtar);
        if (!m) {
          m = new THREE.MeshStandardMaterial({
            color: new THREE.Color(hex),
            roughness: puruz,
            metalness: 0,
          });
          malzemeler.set(anahtar, m);
        }
        return m;
      };

      for (const p of panelleriUret(cfg)) {
        if (!p.gorunur) continue;
        const m = p.malzemeRolu === "on" ? on : govde;
        const hex =
          p.malzemeRolu === "arka"
            ? `#${new THREE.Color(m.hex).multiplyScalar(0.82).getHexString()}`
            : m.hex;
        const kutu = new THREE.Mesh(
          new THREE.BoxGeometry(p.w / 1000, p.h / 1000, p.d / 1000),
          malzemeAl(hex, m.tur === "masif" ? 0.62 : 0.78)
        );
        kutu.position.set(p.x / 1000, p.y / 1000, p.z / 1000);
        sahne.add(kutu);
      }

      const sonuc = await exportSceneToGLB(sahne);
      setGlbUrl(sonuc.blobUrl);
      setAcik(true);
    } catch {
      setHata("Model hazırlanamadı. Sayfayı yenileyip tekrar deneyin.");
    } finally {
      setHazirlaniyor(false);
    }
  }, [cfg]);

  return (
    <>
      <button
        type="button"
        onClick={() => void uret()}
        disabled={hazirlaniyor}
        className="inline-flex h-full min-h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
      >
        {hazirlaniyor ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Smartphone className="h-4 w-4" aria-hidden />
        )}
        {hazirlaniyor ? "Hazırlanıyor" : "Odanda gör"}
      </button>
      {hata && <p className="mt-2 text-xs text-destructive">{hata}</p>}

      {glbUrl && (
        <ARModal
          isOpen={acik}
          onClose={() => setAcik(false)}
          glbUrl={glbUrl}
          productName={ad}
          dimensions={{
            widthMm: cfg.genislik,
            heightMm: cfg.yukseklik,
            depthMm: cfg.derinlik,
          }}
        />
      )}
    </>
  );
}
