"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
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
  ShoppingCart,
  Check,
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
import { ParameterPanel } from "@/components/3d/ParameterPanel";
import { useCartStore } from "@/store/cartStore";
import { CUSTOM_PRINT_PRODUCT_ID } from "@/lib/customPrint";
import { ARModal } from "@/components/ar/ARModal";
import { exportSceneToGLB, exportSceneToUSDZ } from "@/lib/ar/glbExporter";

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

  // Boyut özelleştirmesi (mm, STL eksenlerinde) — model yüklenince doldurulur
  const [dimValues, setDimValues] = useState<Record<string, number | string>>({});

  // Sepet + sipariş akışı
  const addItem = useCartStore((s) => s.addItem);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  // AR görüntüleme
  const [arOpen, setArOpen] = useState(false);
  const [arGlbUrl, setArGlbUrl] = useState<string | null>(null);
  const [arUsdzUrl, setArUsdzUrl] = useState<string | null>(null);
  const [arExporting, setArExporting] = useState(false);

  const selectedColor =
    FILAMENT_COLORS.find((c) => c.id === colorId) ?? FILAMENT_COLORS[0];

  // Yüklenen modelin boyutlarından jenerik özelleştirme parametreleri üret
  // (ürün özelleştirme sayfasındaki ParameterPanel ile aynı bileşen)
  const dimensionParams = useMemo(() => {
    if (!model) return [];
    const make = (name: string, displayName: string, dim: number, sortOrder: number) => ({
      id: `dim-${name}`,
      name,
      displayName,
      type: "SLIDER",
      minValue: Math.max(1, Math.round(dim * 0.5)),
      maxValue: Math.min(MAX_MODEL_DIMENSION_MM, Math.round(dim * 2)),
      defaultValue: String(Math.round(dim)),
      step: 1,
      unit: "mm",
      affectsPrice: true,
      priceFormula: null,
      affectsGeometry: true,
      sortOrder,
    });
    return [
      make("width",  "Genişlik (X)",  model.dimensions.x, 1),
      make("depth",  "Derinlik (Y)",  model.dimensions.y, 2),
      make("height", "Yükseklik (Z)", model.dimensions.z, 3),
    ];
  }, [model]);

  const resetDimensions = useCallback(() => {
    setDimValues((prev) => {
      if (!model) return prev;
      return {
        width:  Math.round(model.dimensions.x),
        depth:  Math.round(model.dimensions.y),
        height: Math.round(model.dimensions.z),
      };
    });
  }, [model]);

  // Ölçek katsayıları (STL eksenlerinde): hedef boyut / orijinal boyut
  const dimScale = useMemo(() => {
    if (!model) return { sx: 1, sy: 1, sz: 1 };
    const s = (val: number | string | undefined, dim: number) => {
      const n = Number(val);
      return n > 0 && dim > 0 ? n / dim : 1;
    };
    return {
      sx: s(dimValues.width,  model.dimensions.x),
      sy: s(dimValues.depth,  model.dimensions.y),
      sz: s(dimValues.height, model.dimensions.z),
    };
  }, [model, dimValues]);

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
      // Boyut özelleştirmesini modelin gerçek ölçüleriyle başlat
      setDimValues({
        width:  Math.round(dimensions.x),
        depth:  Math.round(dimensions.y),
        height: Math.round(dimensions.z),
      });
      // Sipariş akışı için orijinal dosyayı sakla; önceki yükleme önbelleğini sıfırla
      setModelFile(file);
      setUploadedUrl(null);
      setCartError(null);
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
    setDimValues({});
    setModelFile(null);
    setUploadedUrl(null);
    setCartError(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  // Tahmin + fiyat — boyut özelleştirmesi hacim/alan/yüksekliği ölçekler
  const result = useMemo(() => {
    if (!model) return null;
    const { sx, sy, sz } = dimScale;
    const estimate = estimatePrint({
      volumeMm3: model.stats.volumeMm3 * sx * sy * sz,
      // Yüzey alanı eksen çiftlerinin ortalamasıyla yaklaşık ölçeklenir
      areaMm2: model.stats.areaMm2 * ((sx * sy + sx * sz + sy * sz) / 3),
      heightMm: model.dimensions.z * sz,
      infillPercent: infill,
      layerHeight,
      materialId,
    });
    const price = calculatePrintPrice(estimate, {
      materialId,
      quantity,
      layerHeight,
      infillPercent: infill,
      colorId,
    });
    return { estimate, price };
  }, [model, dimScale, infill, layerHeight, materialId, quantity, colorId]);

  const clampQuantity = (q: number) =>
    Math.max(1, Math.min(99999, Math.floor(q) || 1));

  // STL'i (bir kez) Cloudinary'ye yükle — imza sunucudan, dosya doğrudan gider
  const ensureUploaded = useCallback(async (): Promise<string> => {
    if (uploadedUrl) return uploadedUrl;
    if (!modelFile) throw new Error("Model dosyası bulunamadı");

    const sigRes = await fetch("/api/upload-model", { method: "POST" });
    if (!sigRes.ok) throw new Error("Yükleme imzası alınamadı");
    const sig = await sigRes.json();

    const fd = new FormData();
    fd.append("file", modelFile);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);

    const upRes = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`,
      { method: "POST", body: fd }
    );
    if (!upRes.ok) throw new Error("Dosya yüklenemedi, lütfen tekrar deneyin");
    const up = await upRes.json();
    setUploadedUrl(up.secure_url);
    return up.secure_url;
  }, [uploadedUrl, modelFile]);

  // Sepete ekle: dosyayı yükle + tüm özelleştirmeleri sipariş parametresi yap
  const handleAddToCart = useCallback(async () => {
    if (!model || !result) return;
    setAddingToCart(true);
    setCartError(null);
    try {
      const fileUrl = await ensureUploaded();
      const { sx, sy, sz } = dimScale;
      const material = MATERIALS.find((m) => m.id === materialId) ?? MATERIALS[0];

      const params = {
        isCustomUpload: true as const,
        fileName: model.fileName,
        fileUrl,
        volumeMm3: model.stats.volumeMm3 * sx * sy * sz,
        areaMm2: model.stats.areaMm2 * ((sx * sy + sx * sz + sy * sz) / 3),
        heightMm: model.dimensions.z * sz,
        materialId,
        materialName: material.name,
        colorId,
        colorName: selectedColor.name,
        layerHeight,
        infillPercent: infill,
        dimensions: {
          x: Math.round(model.dimensions.x * sx),
          y: Math.round(model.dimensions.y * sy),
          z: Math.round(model.dimensions.z * sz),
        },
        originalDimensions: {
          x: Number(model.dimensions.x.toFixed(1)),
          y: Number(model.dimensions.y.toFixed(1)),
          z: Number(model.dimensions.z.toFixed(1)),
        },
      };

      addItem({
        product: {
          id: CUSTOM_PRINT_PRODUCT_ID,
          name: `Özel Baskı — ${model.fileName}`,
          basePrice: 0,
          thumbnailUrl: null,
        },
        customization: { id: null, parameters: params },
        quantity,
        calculatedPrice: result.price.unitPriceGross,
      });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch (e) {
      setCartError(e instanceof Error ? e.message : "Sepete eklenemedi");
    } finally {
      setAddingToCart(false);
    }
  }, [model, result, ensureUploaded, dimScale, materialId, colorId, selectedColor, layerHeight, infill, quantity, addItem]);

  // AR: yüklenen geometriden gerçek boyutlu (metre) GLB/USDZ üret
  const handleAR = useCallback(async () => {
    if (!model) return;
    setArExporting(true);
    setCartError(null);
    try {
      const scene = new THREE.Scene();
      const mesh = new THREE.Mesh(
        model.geometry,
        new THREE.MeshStandardMaterial({
          color: selectedColor.hex,
          roughness: 0.45,
          metalness: 0.05,
        })
      );
      // mm → metre + boyut özelleştirmesi (sahne eksenleri: x=X, y=Z, z=Y)
      mesh.scale.set(
        dimScale.sx * 0.001,
        dimScale.sz * 0.001,
        dimScale.sy * 0.001
      );
      scene.add(mesh);

      const glb = await exportSceneToGLB(scene);
      let usdzUrl: string | null = null;
      try {
        const usdz = await exportSceneToUSDZ(scene);
        usdzUrl = usdz.blobUrl;
      } catch {
        // USDZ üretilemezse iOS Quick Look devre dışı kalır, GLB yeterli
      }
      setArGlbUrl(glb.blobUrl);
      setArUsdzUrl(usdzUrl);
      setArOpen(true);
    } catch {
      setCartError("AR görünümü oluşturulamadı");
    } finally {
      setArExporting(false);
    }
  }, [model, selectedColor, dimScale]);

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
            <StlViewer
              geometry={model.geometry}
              color={selectedColor.hex}
              // Sahne eksenleri: x=STL X, y=STL Z (yükseklik), z=STL Y (derinlik)
              scale={[dimScale.sx, dimScale.sz, dimScale.sy]}
            />
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
        {/* 3D Özelleştirme — ürün sayfasındaki jenerik ParameterPanel ile */}
        {model && dimensionParams.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <ParameterPanel
                parameters={dimensionParams}
                values={dimValues}
                onChange={(name, value) =>
                  setDimValues((prev) => ({ ...prev, [name]: value }))
                }
                onReset={resetDimensions}
              />
            </CardContent>
          </Card>
        )}

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

                <Separator />

                {/* Sepete ekle + AR */}
                <div className="space-y-2">
                  <Button
                    size="lg"
                    className="w-full gap-2 text-base"
                    onClick={handleAddToCart}
                    disabled={addingToCart || addedToCart}
                  >
                    {addedToCart ? (
                      <>
                        <Check className="h-5 w-5" />
                        Sepete Eklendi
                      </>
                    ) : addingToCart ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Dosya yükleniyor...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5" />
                        Sepete Ekle
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleAR}
                    disabled={arExporting}
                  >
                    {arExporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Hazırlanıyor...
                      </>
                    ) : (
                      "AR'da Görüntüle"
                    )}
                  </Button>
                  {cartError && (
                    <p className="text-xs text-destructive">{cartError}</p>
                  )}
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

      {/* AR Modal — yüklenen model, özelleştirilmiş gerçek boyutlarıyla */}
      {arGlbUrl && model && (
        <ARModal
          isOpen={arOpen}
          onClose={() => setArOpen(false)}
          glbUrl={arGlbUrl}
          usdzUrl={arUsdzUrl}
          productName={model.fileName}
          dimensions={{
            widthMm: Math.round(model.dimensions.x * dimScale.sx),
            heightMm: Math.round(model.dimensions.z * dimScale.sz),
            depthMm: Math.round(model.dimensions.y * dimScale.sy),
          }}
        />
      )}
    </div>
  );
}
