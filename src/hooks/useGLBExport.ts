"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ARExportResult } from "@/types/ar.types";

// Bu hook three.js'i statik olarak import ETMEZ. Sahne kurma ve
// GLB/USDZ export'u @/lib/ar/arExport icinde; o dosya (three.js,
// yukleyiciler ve exporter'larla birlikte ~175 KB gz) yalnizca
// kullanici AR dugmesine bastiginda indirilir. AR dugmesi her urun
// sayfasinda durdugu icin onceden hepsi sayfayla birlikte iniyordu.

interface UseGLBExportOptions {
  parameters: Record<string, number | string>;
  productType: string;
  modelFileUrl?: string | null;
}

/**
 * Parametrik 3D modeli hem GLB hem USDZ olarak export eder.
 * - GLB: Android Scene Viewer + model-viewer 3D preview icin
 * - USDZ: iOS AR Quick Look icin (zorunlu)
 */
export function useGLBExport({
  parameters,
  productType,
  modelFileUrl,
}: UseGLBExportOptions) {
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [usdzUrl, setUsdzUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  const exportForAR = useCallback(async (): Promise<ARExportResult | null> => {
    setError(null);

    setIsExporting(true);
    try {
      // Onceki blob'u temizle
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      // Agir kisim (three.js + exporter'lar) ilk tiklamada indirilir;
      // sonraki tiklamalarda tarayici ayni modulu yeniden kullanir.
      const { exportModelForAR } = await import("@/lib/ar/arExport");

      // 0-2) Sahneyi kur, gercek boyuta olcekle, GLB + USDZ export et
      const { glb: glbResult, usdzBlob } = await exportModelForAR({
        parameters,
        productType,
        modelFileUrl,
      });
      blobUrlRef.current = glbResult.blobUrl;

      // 3) GLB'yi sunucuya yukle
      let serverGlbUrl: string | null = null;
      try {
        const uploadRes = await fetch("/api/ar", {
          method: "POST",
          headers: { "Content-Type": "model/gltf-binary" },
          body: glbResult.blob,
        });
        if (uploadRes.ok) {
          const json = await uploadRes.json();
          serverGlbUrl = `${window.location.origin}${json.url}`;
          console.log("[AR Export] GLB URL:", serverGlbUrl);
        }
      } catch (e) {
        console.warn("[AR Export] GLB upload basarisiz:", e);
      }

      // 4) USDZ icin blob URL olustur (sunucuya yuklemek yerine)
      // Vercel serverless fonksiyon body limiti 4.5MB — USDZ dosyalari
      // genellikle bundan buyuk oldugu icin blob URL kullaniyoruz.
      let usdzBlobUrl: string | null = null;
      if (usdzBlob) {
        usdzBlobUrl = URL.createObjectURL(usdzBlob);
        console.log("[AR Export] USDZ blob URL olusturuldu:", usdzBlobUrl);
      }

      const finalGlbUrl = serverGlbUrl || glbResult.blobUrl;
      setGlbUrl(finalGlbUrl);
      setUsdzUrl(usdzBlobUrl);

      return {
        glbUrl: finalGlbUrl,
        usdzUrl: usdzBlobUrl || undefined,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Model export basarisiz";
      console.error("[AR Export] Hata:", message);
      setError(message);
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [parameters, productType, modelFileUrl]);

  // Eski API uyumlulugu icin exportGLB alias
  const exportGLB = useCallback(async (): Promise<string | null> => {
    const result = await exportForAR();
    return result?.glbUrl || null;
  }, [exportForAR]);

  return { glbUrl, usdzUrl, isExporting, error, exportGLB, exportForAR };
}
