"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  FileWarning,
  Loader2,
  Scale,
  Clock,
  Ruler,
  Box,
  Layers,
  Percent,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  MAX_MODEL_DIMENSION_MM,
  MATERIALS,
  LAYER_HEIGHTS,
  INFILL_OPTIONS,
  FILAMENT_COLORS,
  QUANTITY_DISCOUNTS,
  analyzeMeshPositions,
  estimatePrint,
  calculatePrintPrice,
  formatPrintTime,
  formatTRY,
  type MeshStats,
} from "@/lib/slicer";
import { prepareGeometry } from "./StlViewer";

// Canvas SSR'da çalışmaz — yalnızca istemcide yüklenir
const StlViewer = dynamic(
  () => import("./StlViewer").then((m) => m.StlViewer),
  { ssr: false }
);

// ==========================================
// 3D BASKI FİYAT HESAPLAYICI
//
// STL yükle → mesh analizi (hacim/alan) → malzeme, kalite,
// doluluk, adet seç → gram + süre + fiyat tahmini.
// Kurallar: yalnızca .stl, en fazla 90MB, en büyük boyut 300mm.
// ==========================================

interface ModelData {
  fileName: string;
  fileSizeMB: number;
  geometry: THREE.BufferGeometry;
  dimensions: { x: number; y: number; z: number };
  maxDimension: number;
  stats: MeshStats;
}

export function PriceCalculator() {
  const [model, setModel] = useState<ModelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seçenekler
  const [materialId, setMaterialId] = useState(MATERIALS[0].id);
  const [colorId, setColorId] = useState(FILAMENT_COLORS[0].id);
  const [layerHeight, setLayerHeight] = useState(0.6);
  const [infill, setInfill] = useState(20);
  const [quantity, setQuantity] = useState(1);

  const selectedColor =
    FILAMENT_COLORS.find((c) => c.id === colorId) ?? FILAMENT_COLORS[0];

  const handleFile = useCallback(async (file: File) => {
    setError(null);

    const lowerName = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      setError("Yalnızca STL dosyaları kabul edilmektedir.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setError(
        `Dosya boyutu ${sizeMB}MB. En fazla ${MAX_FILE_SIZE_MB}MB boyutunda dosya yükleyebilirsiniz.`
      );
      return;
    }

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const { STLLoader } = await import(
        "three/examples/jsm/loaders/STLLoader.js"
      );
      const rawGeometry = new STLLoader().parse(buffer);

      // Analiz, döndürmeden önce ham STL koordinatlarında yapılır
      const positions = rawGeometry.getAttribute("position").array;
      const stats = analyzeMeshPositions(positions);

      const { geometry, dimensions, maxDimension } = prepareGeometry(rawGeometry);

      if (maxDimension > MAX_MODEL_DIMENSION_MM) {
        geometry.dispose();
        setError(
          `Modelinizin en büyük boyutu ${maxDimension.toFixed(2)}mm. ` +
            `Şu anda ${MAX_MODEL_DIMENSION_MM}mm'ye kadar hizmet verebilmekteyiz.`
        );
        return;
      }

      if (stats.volumeMm3 <= 0) {
        geometry.dispose();
        setError("Model hacmi hesaplanamadı. Dosya bozuk veya boş olabilir.");
        return;
      }

      setModel((prev) => {
        prev?.geometry.dispose();
        return {
          fileName: file.name,
          fileSizeMB: file.size / (1024 * 1024),
          geometry,
          dimensions,
          maxDimension,
          stats,
        };
      });
    } catch (err) {
      console.error("STL yükleme hatası:", err);
      setError("Dosya okunamadı. Geçerli bir STL dosyası olduğundan emin olun.");
    } finally {
      setLoading(false);
    }
  }, []);

  const resetModel = () => {
    setModel((prev) => {
      prev?.geometry.dispose();
      return null;
    });
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Tahmin + fiyat
  const result = useMemo(() => {
    if (!model) return null;
    const estimate = estimatePrint({
      volumeMm3: model.stats.volumeMm3,
      areaMm2: model.stats.areaMm2,
      heightMm: model.dimensions.z,
      infillPercent: infill,
      layerHeight,
      materialId,
    });
    const price = calculatePrintPrice(estimate, materialId, quantity);
    return { estimate, price };
  }, [model, infill, layerHeight, materialId, quantity]);

  const clampQuantity = (q: number) =>
    Math.max(1, Math.min(99999, Math.floor(q) || 1));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      {/* ============ SOL: YÜKLEME + 3D ÖNİZLEME ============ */}
      <div className="space-y-4">
        {!model ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${
              dragging
                ? "border-foreground bg-muted/60"
                : "border-border bg-gradient-to-b from-muted/30 to-muted/60 hover:border-foreground/40"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".stl"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {loading ? (
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Model analiz ediliyor...
                </p>
              </div>
            ) : (
              <div className="px-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <UploadCloud className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="mb-1 text-lg font-medium">
                  STL dosyanızı bu alana sürükleyin
                </p>
                <p className="mb-4 text-sm text-muted-foreground">
                  veya dosya seçmek için tıklayın
                </p>
                <Button variant="outline" size="sm" className="pointer-events-none">
                  Dosya Seçin
                </Button>
                <p className="mt-4 text-xs text-muted-foreground">
                  Yalnızca .stl · En fazla {MAX_FILE_SIZE_MB}MB · Maks.{" "}
                  {MAX_MODEL_DIMENSION_MM}mm
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-b from-muted/30 to-muted/60">
            <StlViewer geometry={model.geometry} color={selectedColor.hex} />
            <div className="pointer-events-none absolute bottom-3 left-3 select-none text-[10px] text-muted-foreground/50">
              Sürükle: Döndür · Sağ tık: Kaydır · Scroll: Zoom
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetModel}
              className="absolute right-3 top-3 gap-1.5 bg-background/70 backdrop-blur-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Yeni Model
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Dosya yüklenemedi</p>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {/* Model bilgileri */}
        {model && (
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
              <div className="flex items-center gap-2.5">
                <Ruler className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Boyutlar</p>
                  <p className="truncate text-sm font-medium">
                    {model.dimensions.x.toFixed(1)} × {model.dimensions.y.toFixed(1)} ×{" "}
                    {model.dimensions.z.toFixed(1)} mm
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Box className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Hacim</p>
                  <p className="text-sm font-medium">
                    {(model.stats.volumeMm3 / 1000).toFixed(2)} cm³
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Üçgen</p>
                  <p className="text-sm font-medium">
                    {model.stats.triangleCount.toLocaleString("tr-TR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <UploadCloud className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Dosya</p>
                  <p className="truncate text-sm font-medium" title={model.fileName}>
                    {model.fileSizeMB.toFixed(1)} MB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ============ SAĞ: SEÇENEKLER + FİYAT ============ */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Baskı Seçenekleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Malzeme */}
            <div className="space-y-2">
              <Label>Malzeme</Label>
              <Select value={materialId} onValueChange={setMaterialId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIALS.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="font-medium">{m.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {m.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Renk */}
            <div className="space-y-2">
              <Label>
                Renk{" "}
                <span className="font-normal text-muted-foreground">
                  — {selectedColor.name}
                </span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {FILAMENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.name}
                    onClick={() => setColorId(c.id)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      colorId === c.id
                        ? "border-foreground ring-2 ring-foreground/20"
                        : "border-border"
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Baskı kalitesi */}
            <div className="space-y-2">
              <Label>Baskı Kalitesi</Label>
              <div className="grid grid-cols-3 gap-2">
                {LAYER_HEIGHTS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLayerHeight(l.value)}
                    className={`rounded-lg border px-2 py-2.5 text-center transition-colors ${
                      layerHeight === l.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/40"
                    }`}
                  >
                    <p className="text-sm font-semibold">{l.value}mm</p>
                    <p
                      className={`text-xs ${
                        layerHeight === l.value
                          ? "text-background/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {l.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Doluluk */}
            <div className="space-y-2">
              <Label>Doluluk Oranı</Label>
              <Select
                value={String(infill)}
                onValueChange={(v) => setInfill(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INFILL_OPTIONS.map((o) => (
                    <SelectItem key={o} value={String(o)}>
                      %{o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Adet */}
            <div className="space-y-2">
              <Label>Adet</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => clampQuantity(q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(clampQuantity(Number(e.target.value)))}
                  className="w-24 text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => clampQuantity(q + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                {result && result.price.discountRate > 0 && (
                  <Badge variant="secondary" className="ml-1 gap-1">
                    <Percent className="h-3 w-3" />%
                    {Math.round(result.price.discountRate * 100)} indirim
                  </Badge>
                )}
              </div>
            </div>

            {/* İndirim tablosu */}
            <Accordion type="single" collapsible>
              <AccordionItem value="discounts" className="border-none">
                <AccordionTrigger className="py-2 text-sm text-muted-foreground hover:no-underline">
                  Adet bazlı indirim tablosu
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    {QUANTITY_DISCOUNTS.map((t) => (
                      <div
                        key={t.minQty}
                        className="flex justify-between text-muted-foreground"
                      >
                        <span>
                          {t.maxQty === null
                            ? `${t.minQty}+ adet`
                            : `${t.minQty}-${t.maxQty} adet`}
                        </span>
                        <span className="font-medium text-foreground">
                          %{Math.round(t.rate * 100)}
                        </span>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Sonuç paneli */}
        <Card className={model ? "" : "opacity-60"}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Tahmini Sonuç</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <Scale className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />
                    <p className="text-2xl font-bold tabular-nums">
                      {result.estimate.weightGrams.toFixed(1)}
                      <span className="ml-0.5 text-sm font-medium text-muted-foreground">
                        g
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">Filament</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-4 text-center">
                    <Clock className="mx-auto mb-1.5 h-5 w-5 text-muted-foreground" />
                    <p className="text-2xl font-bold tabular-nums">
                      {formatPrintTime(result.estimate.printTimeMinutes)}
                    </p>
                    <p className="text-xs text-muted-foreground">Baskı Süresi</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Birim Fiyat (KDV Hariç)
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatTRY(result.price.unitPriceNet)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Birim KDV (%20)</span>
                    <span className="font-medium tabular-nums">
                      {formatTRY(result.price.unitVat)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Birim Fiyat (KDV Dahil)
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatTRY(result.price.unitPriceGross)}
                    </span>
                  </div>
                  {result.price.discountRate > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-500">
                      <span>Adet İndirimi</span>
                      <span className="font-medium">
                        %{Math.round(result.price.discountRate * 100)}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex items-baseline justify-between">
                  <span className="font-medium">
                    Toplam ({quantity.toLocaleString("tr-TR")} adet)
                  </span>
                  <span className="text-2xl font-bold tabular-nums">
                    {formatTRY(result.price.totalGross)}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Değerler tahminidir; kesin gramaj ve fiyat, dilimleme sonrası
                  sipariş onayında netleşir. Kargo ücreti sipariş tutarına ve
                  teslimat adresine göre değişiklik gösterebilir.
                </p>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Fiyat tahmini için önce bir STL dosyası yükleyin.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
