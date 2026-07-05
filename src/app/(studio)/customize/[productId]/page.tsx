"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ParameterPanel } from "@/components/3d/ParameterPanel";
import { calculatePrice, calculatePriceChange } from "@/lib/priceCalculator";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { PANEL_ATTACHMENTS } from "@/components/3d/panelAttachments";
import {
  Loader2,
  ShoppingCart,
  Check,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ARButton } from "@/components/ar/ARButton";
import { ARModal } from "@/components/ar/ARModal";
import { extractDimensions } from "@/lib/ar/realSizeCalibration";

// ModelViewer'ı SSR olmadan yükle (Three.js browser-only)
const ModelViewer = dynamic(
  () => import("@/components/3d/ModelViewer").then((mod) => mod.ModelViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-square bg-muted/30 rounded-2xl flex items-center justify-center border border-border/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

// ==========================================
// 3D ÖZELLEŞTİRME SAYFASI
//
// Sol: 3D Model Viewer (Three.js)
// Sağ: Parametre paneli + Fiyat + Sepete ekle
// ==========================================

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  modelFileUrl: string | null;
  category: { id: string; name: string; slug: string };
  parameters: Array<{
    id: string;
    name: string;
    displayName: string;
    type: string;
    minValue: number | null;
    maxValue: number | null;
    defaultValue: string;
    step: number | null;
    unit: string | null;
    affectsPrice: boolean;
    priceFormula: string | null;
    affectsGeometry: boolean;
    sortOrder: number;
    validationRules?: { options?: string[]; maxLength?: number; minLength?: number } | null;
  }>;
}

// Slug → ürün tipi eşleştirme
function getProductType(slug: string): string {
  if (slug.includes("eriyen"))  return "meltingShelf";
  if (slug.includes("kup") || slug.includes("cubic") || slug.includes("hex")) return "hexShelf";
  if (slug.includes("skadis"))  return "skadisPanel";
  if (slug.includes("kose-rafi") || slug.includes("kose_rafi")) return "cornerShelf";
  if (slug.includes("depolama-kutusu") || slug.includes("storage-basket")) return "storageBasket";
  if (slug.includes("rafa-raf") || slug.includes("shelf-for-shelf")) return "shelfForShelf";
  if (slug.includes("kase") || slug.includes("bowl")) return "ribbedBowl";
  if (slug.includes("dekoratif-depolama") || slug.includes("tabagi") || slug.includes("tabak")) return "decorativeStorage";
  if (slug.includes("tablet"))  return "tabletStand";   // "stand" kontrolünden önce gelmeli
  if (slug.includes("delikli") || slug.includes("panel")) return "perforatedPanel";
  if (slug.includes("vazo"))    return "vase";
  if (slug.includes("stand") || slug.includes("telefon")) return "stand";
  if (slug.includes("anahtarlik")) return "keychain";
  if (slug.includes("lamba") || slug.includes("lamp")) return "lamp";
  if (slug.includes("kalem") || slug.includes("pencil")) return "pencilHolder";
  if (slug.includes("bileklik") || slug.includes("bracelet")) return "bracelet";
  if (slug.includes("disli") || slug.includes("gear")) return "gear";
  if (slug.includes("ejderha") || slug.includes("figur")) return "figure";
  if (slug.includes("fazil")) return "fazilModel";
  return "vase";
}

export default function CustomizePage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, number | string>>({});
  const [added, setAdded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [arModalOpen, setArModalOpen] = useState(false);
  const [arGlbUrl, setArGlbUrl] = useState<string | null>(null);
  const [arUsdzUrl, setArUsdzUrl] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const { data: session } = useSession();

  // Ürünü API'den çek
  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${productId}?byId=true`);
        if (!res.ok) throw new Error("Urun bulunamadi");
        const json = await res.json();
        const data = json.product || json;
        setProduct(data);

        // Varsayılan parametre değerlerini set et
        const defaults: Record<string, number | string> = {};
        for (const param of data.parameters) {
          if (param.type === "COLOR" || param.type === "TEXT" || param.type === "DROPDOWN") {
            defaults[param.name] = param.defaultValue;
          } else {
            defaults[param.name] = Number(param.defaultValue);
          }
        }
        setParamValues(defaults);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata olustu");
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  // Parametre değişikliği
  const handleParamChange = useCallback((name: string, value: number | string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Panel eklentileri: "attachments" parametresinde virgülle ayrılmış slug listesi
  const selectedAttachments =
    typeof paramValues.attachments === "string" && paramValues.attachments
      ? (paramValues.attachments as string).split(",")
      : [];

  const toggleAttachment = useCallback((id: string, checked: boolean) => {
    setParamValues((prev) => {
      const current =
        typeof prev.attachments === "string" && prev.attachments
          ? (prev.attachments as string).split(",")
          : [];
      const set = new Set(current);
      if (checked) set.add(id);
      else set.delete(id);
      return { ...prev, attachments: Array.from(set).join(",") };
    });
  }, []);

  // Parametreleri sıfırla
  const handleReset = useCallback(() => {
    if (!product) return;
    const defaults: Record<string, number | string> = {};
    for (const param of product.parameters) {
      if (param.type === "COLOR" || param.type === "TEXT" || param.type === "DROPDOWN") {
        defaults[param.name] = param.defaultValue;
      } else {
        defaults[param.name] = Number(param.defaultValue);
      }
    }
    setParamValues(defaults);
  }, [product]);

  // Customization'i DB'ye kaydet
  const saveCustomization = useCallback(async (): Promise<string | null> => {
    if (!product || !session?.user) return null;
    try {
      const res = await fetch("/api/customizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          parameters: paramValues,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.id;
    } catch {
      return null;
    }
  }, [product, paramValues, session]);

  // Sepete ekle
  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    const currentPrice = calculatePrice(
      Number(product.basePrice),
      product.parameters,
      paramValues
    );

    // Logged-in ise customization'ı DB'ye kaydet
    let customizationId: string | null = null;
    if (session?.user) {
      customizationId = await saveCustomization();
    }

    addItem({
      product: {
        id: product.id,
        name: product.name,
        basePrice: Number(product.basePrice),
        thumbnailUrl: product.thumbnailUrl,
      },
      customization: {
        id: customizationId, // null = guest, DB kaydı yok
        parameters: paramValues,
      },
      quantity: 1,
      calculatedPrice: currentPrice,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }, [product, paramValues, addItem, session, saveCustomization]);

  // Tasarimi kaydet (sepete eklemeden)
  const handleSaveDesign = useCallback(async () => {
    if (!product || !session?.user) return;
    setSaving(true);
    const id = await saveCustomization();
    setSaving(false);
    if (id) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [product, session, saveCustomization]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Urun yukleniyor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="text-muted-foreground mb-4">{error || "Urun bulunamadi"}</p>
          <Button asChild variant="outline">
            <Link href="/products">Urunlere Don</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Fiyat hesapla
  const basePrice = Number(product.basePrice);
  const currentPrice = calculatePrice(basePrice, product.parameters, paramValues);
  const priceChange = calculatePriceChange(basePrice, currentPrice);
  const productType = getProductType(product.slug);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-16 z-40">
        <div className="container mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-base">{product.name}</h1>
              <p className="text-xs text-muted-foreground">3D Ozellestirme</p>
            </div>
          </div>

          {/* Fiyat */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">
                  {currentPrice.toFixed(2)} TL
                </span>
                {priceChange.direction !== "same" && (
                  <Badge
                    variant="outline"
                    className={`text-xs gap-1 ${
                      priceChange.direction === "up"
                        ? "text-orange-500 border-orange-500/30"
                        : "text-green-500 border-green-500/30"
                    }`}
                  >
                    {priceChange.direction === "up" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {priceChange.direction === "up" ? "+" : ""}
                    {priceChange.percentage}%
                  </Badge>
                )}
              </div>
              {priceChange.direction !== "same" && (
                <p className="text-[10px] text-muted-foreground">
                  Baz fiyat: {basePrice.toFixed(2)} TL
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ana İçerik */}
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Sol: 3D Viewer (3/5) */}
          <div className="lg:col-span-3">
            <ModelViewer
              parameters={paramValues}
              productType={productType}
              modelFileUrl={product.modelFileUrl}
            />
          </div>

          {/* Sağ: Parametreler + Aksiyonlar (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Parametre Paneli */}
            <div className="border border-border/40 rounded-xl p-5 bg-card">
              <ParameterPanel
                parameters={product.parameters}
                values={paramValues}
                onChange={handleParamChange}
                onReset={handleReset}
              />
            </div>

            {/* Panel Eklentileri — sadece delikli panelde gösterilir */}
            {productType === "perforatedPanel" && PANEL_ATTACHMENTS.length > 0 && (
              <div className="border border-border/40 rounded-xl p-5 bg-card space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Panel Eklentileri</h3>
                  <p className="text-xs text-muted-foreground">
                    İşaretlediğin eklentiler 3D önizlemede panel üzerinde gösterilir
                    ve siparişinle birlikte kaydedilir. Her eklenti ayrı ürün olarak
                    da satılmaktadır.
                  </p>
                </div>
                <div className="space-y-2">
                  {PANEL_ATTACHMENTS.map((att) => (
                    <label
                      key={att.id}
                      className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedAttachments.includes(att.id)}
                        onCheckedChange={(checked) =>
                          toggleAttachment(att.id, checked === true)
                        }
                      />
                      <span className="text-sm font-medium">{att.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Sepete Ekle */}
            <div className="border border-border/40 rounded-xl p-5 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toplam Fiyat</span>
                <span className="text-2xl font-bold text-primary">
                  {currentPrice.toFixed(2)} TL
                </span>
              </div>

              <Separator />

              <Button
                size="lg"
                className="w-full text-base gap-2"
                onClick={handleAddToCart}
                disabled={added}
              >
                {added ? (
                  <>
                    <Check className="h-5 w-5" />
                    Sepete Eklendi
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    Ozellesmis Urunu Sepete Ekle
                  </>
                )}
              </Button>

              {session?.user && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleSaveDesign}
                  disabled={saving || saved}
                >
                  {saved ? (
                    <>
                      <Check className="h-4 w-4" />
                      Tasarim Kaydedildi
                    </>
                  ) : saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Tasarimimi Kaydet
                    </>
                  )}
                </Button>
              )}

              <Separator />

              <ARButton
                parameters={paramValues}
                productType={productType}
                modelFileUrl={product.modelFileUrl}
                productName={product.name}
                onActivateAR={(glbUrl, usdzUrl) => {
                  setArGlbUrl(glbUrl);
                  setArUsdzUrl(usdzUrl || null);
                  setArModalOpen(true);
                }}
              />

              <p className="text-[11px] text-muted-foreground text-center">
                Ozellestirme parametreleri siparisinizle birlikte kaydedilir
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* AR Modal */}
      {arGlbUrl && (
        <ARModal
          isOpen={arModalOpen}
          onClose={() => setArModalOpen(false)}
          glbUrl={arGlbUrl}
          usdzUrl={arUsdzUrl}
          productName={product.name}
          dimensions={extractDimensions(paramValues, productType)}
        />
      )}
    </div>
  );
}
