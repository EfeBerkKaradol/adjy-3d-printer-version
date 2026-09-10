"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { ArrowRight, Check, Loader2, Ruler, ScanLine, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ARModal } from "@/components/ar/ARModal";
import { exportSceneToGLB, exportSceneToUSDZ } from "@/lib/ar/glbExporter";
import { useCartStore } from "@/store/cartStore";
import { CUSTOM_PRINT_PRODUCT_ID } from "@/lib/customPrint";
import { FILAMENT_COLORS, MATERIALS, formatTRY } from "@/lib/slicer";
import { cmToMm, formatDimensions } from "@/lib/units";
import type { GeneratedModel, PhotoAnalysis } from "../types";
import { buildGeometry, measure, paramValue } from "../services/geometry";
import { priceGeneratedModel } from "../services/pricing";
import { checkManufacturability } from "../services/manufacturability";
import { track } from "../services/analytics";
import { GeneratedModelViewer } from "./GeneratedModelViewer";
import { ParameterEditor } from "./ParameterEditor";
import { MaterialSelector, type PrintOptions } from "./MaterialSelector";
import { PriceSummary } from "./PriceSummary";
import { ManufacturabilityStatus } from "./ManufacturabilityStatus";

// ==========================================
// SONUÇ ÇALIŞMA ALANI
//
// Solda model, sağda kararlar. Ölçü değişince geometri
// yeniden kurulur; hacim, ağırlık, süre ve fiyat aynı anda
// yeniden hesaplanır. AR'a ve sepete giden model de ekrandaki
// modelin ta kendisidir — ayrı bir kopya tutulmaz.
// ==========================================

/**
 * Başlangıç seçenekleri. Renk bilerek beyaz: model açık
 * zeminde kahraman görsel, siyahla açılınca hem biçim
 * okunmuyor hem de sayfanın dili bozuluyordu.
 */
const DEFAULT_OPTIONS: PrintOptions = {
  materialId: "pla",
  colorId: FILAMENT_COLORS.find((c) => c.id === "beyaz")?.id ?? FILAMENT_COLORS[0].id,
  layerHeight: 0.2,
  infillPercent: 20,
};

interface ResultWorkspaceProps {
  analysis: PhotoAnalysis;
  model: GeneratedModel;
  onRestart: () => void;
}

export function ResultWorkspace({ analysis, model, onRestart }: ResultWorkspaceProps) {
  const [parameters, setParameters] = useState(model.parameters);
  const [options, setOptions] = useState<PrintOptions>(DEFAULT_OPTIONS);
  const [quantity, setQuantity] = useState(1);

  const [knownOpen, setKnownOpen] = useState(false);
  const [knownHeight, setKnownHeight] = useState("");

  const [arOpen, setArOpen] = useState(false);
  const [arBusy, setArBusy] = useState(false);
  const [arGlb, setArGlb] = useState<string | null>(null);
  const [arUsdz, setArUsdz] = useState<string | null>(null);

  const [cartBusy, setCartBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "busy" | "done" | "auth">("idle");
  const [error, setError] = useState<string | null>(null);

  const addItem = useCartStore((s) => s.addItem);

  const current: GeneratedModel = useMemo(
    () => ({ ...model, parameters }),
    [model, parameters]
  );

  const geometry = useMemo(() => buildGeometry(current), [current]);
  const dimensions = useMemo(() => measure(current, geometry), [current, geometry]);

  const pricing = useMemo(
    () => priceGeneratedModel(geometry, { ...options, quantity }),
    [geometry, options, quantity]
  );

  const manufacturability = useMemo(
    () => checkManufacturability(dimensions, pricing.volumeMm3, pricing.areaMm2),
    [dimensions, pricing.volumeMm3, pricing.areaMm2]
  );

  const colorHex =
    FILAMENT_COLORS.find((c) => c.id === options.colorId)?.hex ?? model.color;

  const setParam = useCallback((id: string, value: number) => {
    setParameters((prev) => prev.map((p) => (p.id === id ? { ...p, value } : p)));
    track("parameter_changed", { id, value });
  }, []);

  const resetParams = useCallback(() => {
    setParameters(model.parameters.map((p) => ({ ...p, value: p.defaultValue })));
  }, [model.parameters]);

  /**
   * Kullanıcı gerçek bir ölçü biliyorsa diğer ölçüler ona göre
   * orantılanır: tek fotoğraftan mutlak boyut çıkmaz, ama bir
   * kenar bilindiğinde geri kalanı oranla doğrulanabilir.
   */
  const applyKnownHeight = useCallback(() => {
    // Kullanıcı cm girer; içeride her şey mm
    const target = cmToMm(Number(knownHeight.replace(",", ".")));
    if (!Number.isFinite(target) || target <= 0) return;
    const currentHeight = paramValue(parameters, "height", 1);
    const factor = target / currentHeight;
    setParameters((prev) =>
      prev.map((p) =>
        p.unit === "cm" || p.unit === "mm"
          ? {
              ...p,
              value: Math.min(p.max, Math.max(p.min, Math.round(p.value * factor * 10) / 10)),
            }
          : p
      )
    );
    setKnownOpen(false);
  }, [knownHeight, parameters]);

  /** Ekrandaki geometriden gerçek boyutlu sahne — AR ve STL ortak kullanır */
  const buildScene = useCallback(() => {
    const scene = new THREE.Scene();
    const mesh = new THREE.Mesh(
      geometry.clone(),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5, metalness: 0.05 })
    );
    return { scene, mesh };
  }, [geometry, colorHex]);

  const handleAR = useCallback(async () => {
    setArBusy(true);
    setError(null);
    try {
      const { scene, mesh } = buildScene();
      // mm → metre: AR sahnesi gerçek ölçüde açılmalı
      mesh.scale.setScalar(0.001);
      scene.add(mesh);
      const glb = await exportSceneToGLB(scene);
      setArGlb(glb.blobUrl);
      try {
        const usdz = await exportSceneToUSDZ(scene);
        setArUsdz(usdz.blobUrl);
      } catch {
        setArUsdz(null);
      }
      setArOpen(true);
      track("ar_opened", { ...dimensions });
    } catch {
      setError("Bu cihazda AR görünümü hazırlanamadı. 3D görünümden devam edebilirsin.");
    } finally {
      setArBusy(false);
    }
  }, [buildScene, dimensions]);

  /** Üretim için STL üretip Cloudinary'ye yükler (yüklenen modellerle aynı yol) */
  const uploadStl = useCallback(async (): Promise<string> => {
    const { scene, mesh } = buildScene();
    scene.add(mesh);
    // İkili STL: exporter DataView döndürür, Blob'a ham tampon verilir
    const stl = new STLExporter().parse(scene, { binary: true }) as unknown as DataView;
    const bytes = new Uint8Array(stl.buffer.slice(0) as ArrayBuffer);
    const blob = new Blob([bytes], { type: "model/stl" });
    const file = new File([blob], "adjy-fotograftan-model.stl", { type: "model/stl" });

    const sigRes = await fetch("/api/upload-model", { method: "POST" });
    if (!sigRes.ok) throw new Error("Yükleme hazırlanamadı");
    const sig = await sigRes.json();

    const fd = new FormData();
    fd.append("file", file);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);

    const up = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`, {
      method: "POST",
      body: fd,
    });
    if (!up.ok) throw new Error("Model yüklenemedi");
    const json = await up.json();
    return json.secure_url as string;
  }, [buildScene]);

  const handleAddToCart = useCallback(async () => {
    setCartBusy(true);
    setError(null);
    try {
      const fileUrl = await uploadStl();
      const material = MATERIALS.find((m) => m.id === options.materialId) ?? MATERIALS[0];
      const color = FILAMENT_COLORS.find((c) => c.id === options.colorId) ?? FILAMENT_COLORS[0];

      // Sipariş tarafı bu alanlardan fiyatı sunucuda yeniden
      // hesaplar; yüklenen STL akışıyla birebir aynı sözleşme.
      addItem({
        product: {
          id: CUSTOM_PRINT_PRODUCT_ID,
          name: "Fotoğraftan Üretim",
          basePrice: 0,
          thumbnailUrl: null,
        },
        customization: {
          id: null,
          parameters: {
            isCustomUpload: true,
            fileName: "adjy-fotograftan-model.stl",
            fileUrl,
            volumeMm3: pricing.volumeMm3,
            areaMm2: pricing.areaMm2,
            heightMm: pricing.heightMm,
            materialId: material.id,
            materialName: material.name,
            colorId: color.id,
            colorName: color.name,
            layerHeight: options.layerHeight,
            infillPercent: options.infillPercent,
            dimensions: {
              x: dimensions.widthMm,
              y: dimensions.depthMm,
              z: dimensions.heightMm,
            },
            originalDimensions: {
              x: model.dimensions.widthMm,
              y: model.dimensions.depthMm,
              z: model.dimensions.heightMm,
            },
            createdFrom: "photo",
          },
        },
        quantity,
        calculatedPrice: pricing.price.unitPriceGross,
      });

      track("add_to_cart", { price: pricing.price.unitPriceGross, quantity });
      setAdded(true);
      setTimeout(() => setAdded(false), 2600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sepete eklenemedi");
    } finally {
      setCartBusy(false);
    }
  }, [uploadStl, options, pricing, dimensions, model.dimensions, quantity, addItem]);

  const handleSave = useCallback(async () => {
    setSaveState("busy");
    setError(null);
    try {
      const res = await fetch("/api/generated-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Fotoğraftan model",
          kind: current.kind,
          profile: current.profile,
          outline: current.outline.slice(0, 512),
          parameters,
          dimensions,
          materialId: options.materialId,
          colorId: options.colorId,
          estimatedWeightGrams: pricing.estimate.weightGrams,
          estimatedPrintMinutes: pricing.estimate.printTimeMinutes,
          priceGross: pricing.price.unitPriceGross,
          previewImage: analysis.previewDataUrl,
        }),
      });
      if (res.status === 401) {
        setSaveState("auth");
        return;
      }
      if (!res.ok) throw new Error("Model kaydedilemedi");
      track("generated_product_saved");
      setSaveState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Model kaydedilemedi");
      setSaveState("idle");
    }
  }, [current, parameters, dimensions, options, pricing, analysis.previewDataUrl]);

  const blocked = manufacturability.level === "unsuitable";

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      {/* Model */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="aspect-square overflow-hidden rounded-lg border border-border lg:aspect-[4/5]">
          <GeneratedModelViewer
            geometry={geometry}
            color={colorHex}
            fitKey={`${model.kind}-${model.dimensions.heightMm}`}
          />
        </div>

        {/* Dönüşüm: kaynak fotoğraf → model → senin ölçün */}
        <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={analysis.previewDataUrl}
            alt="Kaynak fotoğraf"
            className="h-12 w-12 rounded object-cover"
          />
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>ADJY 3D modeli</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="text-foreground">
            {formatDimensions(dimensions.widthMm, dimensions.depthMm, dimensions.heightMm)}
          </span>
        </div>
      </div>

      {/* Kararlar */}
      <div className="space-y-7">
        <div>
          <h2 className="adjy-display text-[clamp(1.5rem,3vw,2rem)]">Modelin hazır.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Ölçüler fotoğraftan tahmin edildi. İstediğin gibi değiştirebilirsin.
          </p>
        </div>

        {/* Bilinen ölçü — tek fotoğraftan mutlak boyut çıkmaz */}
        <div className="rounded-md bg-surface-2 p-4">
          {!knownOpen ? (
            <button
              type="button"
              onClick={() => setKnownOpen(true)}
              className="inline-flex items-center gap-2 text-sm transition-colors hover:text-muted-foreground"
            >
              <Ruler className="h-4 w-4" aria-hidden />
              Gerçek bir ölçüsünü biliyor musun?
            </button>
          ) : (
            <div>
              <label htmlFor="known-height" className="text-sm">
                Objenin gerçek yüksekliği
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="known-height"
                  type="number"
                  min={1}
                  max={30}
                  step={0.1}
                  value={knownHeight}
                  onChange={(e) => setKnownHeight(e.target.value)}
                  placeholder="18"
                  className="w-28 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums outline-none focus:border-foreground"
                />
                <span className="self-center text-sm text-muted-foreground">cm</span>
                <Button type="button" size="sm" onClick={applyKnownHeight}>
                  Uygula
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setKnownOpen(false)}
                >
                  Vazgeç
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Diğer ölçüler bu orana göre güncellenir.
              </p>
            </div>
          )}
        </div>

        <ParameterEditor parameters={parameters} onChange={setParam} onReset={resetParams} />

        <MaterialSelector
          value={options}
          onChange={(next) => {
            if (next.materialId !== options.materialId) track("material_changed", { id: next.materialId });
            setOptions(next);
          }}
        />

        <div className="flex items-center gap-3">
          <label htmlFor="qty" className="text-sm">
            Adet
          </label>
          <input
            id="qty"
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(999, Number(e.target.value) || 1)))}
            className="w-20 rounded-md border border-border bg-background px-3 py-1.5 text-sm tabular-nums outline-none focus:border-foreground"
          />
        </div>

        <PriceSummary pricing={pricing} quantity={quantity} />
        <ManufacturabilityStatus result={manufacturability} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2.5">
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={blocked || cartBusy}
            onClick={handleAddToCart}
          >
            {cartBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : added ? (
              <Check className="mr-2 h-4 w-4" aria-hidden />
            ) : (
              <ShoppingBag className="mr-2 h-4 w-4" aria-hidden />
            )}
            {added ? "Sepete eklendi" : `Sepete Ekle · ${formatTRY(pricing.price.totalGross)}`}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            disabled={arBusy || blocked}
            onClick={handleAR}
          >
            {arBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ScanLine className="mr-2 h-4 w-4" aria-hidden />
            )}
            Odanda Gör
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              disabled={saveState === "busy" || saveState === "done"}
              onClick={handleSave}
            >
              {saveState === "busy" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {saveState === "done" ? "Kaydedildi" : "Modeli Kaydet"}
            </Button>
            <Button type="button" variant="ghost" className="flex-1" onClick={onRestart}>
              Yeni fotoğraf
            </Button>
          </div>

          {saveState === "auth" && (
            <p className="text-sm text-muted-foreground">
              Modeli kaydetmek için{" "}
              <Link href="/login" className="underline underline-offset-4">
                giriş yap
              </Link>
              .
            </p>
          )}
          {saveState === "done" && (
            <p className="text-sm text-muted-foreground">
              <Link href="/profile/models" className="underline underline-offset-4">
                Modellerim
              </Link>{" "}
              sayfasından tekrar açabilirsin.
            </p>
          )}
        </div>
      </div>

      {arGlb && (
        <ARModal
          isOpen={arOpen}
          onClose={() => setArOpen(false)}
          glbUrl={arGlb}
          usdzUrl={arUsdz}
          productName="Fotoğraftan model"
          dimensions={{
            widthMm: dimensions.widthMm,
            heightMm: dimensions.heightMm,
            depthMm: dimensions.depthMm,
          }}
        />
      )}
    </div>
  );
}
