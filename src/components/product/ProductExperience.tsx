"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, Loader2, ShoppingCart } from "lucide-react";
import { ProductStage } from "./ProductStage";
import { ProductOptions, type SecenekParametre } from "./ProductOptions";
import { ProductARButton } from "@/components/ar/ProductARButton";
import { useCartStore } from "@/store/cartStore";
import { calculatePrice } from "@/lib/priceCalculator";
import { formatCmValue } from "@/lib/units";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// ÜRÜN SAYFASI — GÖRSEL VE SEÇENEKLER
//
// Sayfa üç ayrı düğme sunuyordu: "Ölçüleri özelleştir",
// "Sepete Ekle", "3D Önizleme". Hangisinin asıl eylem olduğu
// belli değildi ve ölçü değiştirmek başka bir sayfaya gidiyordu.
//
// Artık tek eylem var: sepete ekle. Ölçü ve renk sayfanın
// kendisinde, açık hâlde; fiyat seçimle birlikte değişiyor ve
// sepete giden de ekranda yazan fiyat oluyor.
//
// Döküm ürünlerde özel ölçü yeni bir kalıp gerektirir. O
// maliyet ayrı bir satır olarak yazılır — fiyatın neden
// sıçradığı açıklanmadan bırakılmaz.
// ==========================================

export interface ExperienceProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  thumbnailUrl: string | null;
  images: string[];
  modelFileUrl: string | null;
  productType: string;
  stockQty: number;
  customMouldFee: number | null;
  parameters: (SecenekParametre & {
    affectsPrice: boolean;
    priceFormula: string | null;
  })[];
}

export function ProductExperience({ product }: { product: ExperienceProduct }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [eklendi, setEklendi] = useState(false);
  const [ekleniyor, setEkleniyor] = useState(false);

  const varsayilanlar = useMemo(() => {
    const v: Record<string, number | string> = {};
    for (const p of product.parameters) {
      const sayi = Number(p.defaultValue);
      v[p.name] =
        Number.isFinite(sayi) && p.defaultValue.trim() !== "" ? sayi : p.defaultValue;
    }
    return v;
  }, [product.parameters]);

  const [values, setValues] = useState<Record<string, number | string>>(varsayilanlar);

  /** ModelViewer ölçeği parametrenin kendi varsayılanına göre hesaplar */
  const sayisalVarsayilanlar = useMemo(() => {
    const v: Record<string, number> = {};
    for (const [ad, deger] of Object.entries(varsayilanlar)) {
      if (typeof deger === "number" && deger > 0) v[ad] = deger;
    }
    return v;
  }, [varsayilanlar]);

  const fiyatParametreleri = product.parameters.map((p) => ({
    name: p.name,
    defaultValue: p.defaultValue,
    affectsPrice: p.affectsPrice,
    priceFormula: p.priceFormula,
  }));

  const fiyat = calculatePrice(product.basePrice, fiyatParametreleri, values, {
    mouldFee: product.customMouldFee,
  });

  // Kalıp farkı ayrı gösterilir: ölçü değişince fiyatın neden
  // sıçradığı yazmıyorsa müşteri hata sanıyor.
  const kalipsizFiyat = calculatePrice(product.basePrice, fiyatParametreleri, values);
  const kalipFarki = Math.max(0, fiyat - kalipsizFiyat);

  const olcuDegisti = product.parameters.some((p) => {
    const d = Number(p.defaultValue);
    const v = Number(values[p.name]);
    return Number.isFinite(d) && Number.isFinite(v) && Math.abs(v - d) > 0.01;
  });

  const secilenOlcu = ["width", "depth", "height"]
    .map((ad) => values[ad])
    .filter((v): v is number => typeof v === "number" && v > 0);

  function sepeteEkle() {
    setEkleniyor(true);
    addItem({
      product: {
        id: product.id,
        name: product.name,
        basePrice: fiyat,
        thumbnailUrl: product.thumbnailUrl,
      },
      customization: { id: null, parameters: values },
      quantity: 1,
      calculatedPrice: fiyat,
    });
    setEklendi(true);
    setEkleniyor(false);
    setTimeout(() => setEklendi(false), 2200);
    router.refresh();
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <ProductStage
        name={product.name}
        images={product.images}
        modelFileUrl={product.modelFileUrl}
        productType={product.productType}
        parameters={values}
        defaults={sayisalVarsayilanlar}
      />

      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-3xl font-medium tabular-nums">{formatTRY(fiyat)}</p>
          {olcuDegisti && (
            <p className="text-sm text-muted-foreground">
              standart ölçüde {formatTRY(product.basePrice)}
            </p>
          )}
        </div>
        {secilenOlcu.length >= 2 && (
          <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">
            {secilenOlcu.map((v) => formatCmValue(v)).join(" × ")} cm
          </p>
        )}

        <div className="mt-8 border-t border-border pt-8">
          <ProductOptions
            parameters={product.parameters}
            values={values}
            onChange={(ad, deger) => setValues((v) => ({ ...v, [ad]: deger }))}
          />
        </div>

        {kalipFarki > 0 && (
          <div className="mt-7 flex gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="text-sm leading-relaxed">
              <p className="font-medium">
                Özel ölçü kalıp ücreti: {formatTRY(kalipFarki)}
              </p>
              <p className="mt-1 text-muted-foreground">
                Bu ürün silikon kalıptan dökülüyor. Standart ölçünün kalıbı
                hazır; seçtiğiniz ölçü için yeni bir kalıp çıkarılması gerekiyor
                ve bu bir kerelik maliyet siparişe ekleniyor. Standart ölçüye
                dönerseniz ücret kalkar.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={sepeteEkle}
            disabled={ekleniyor || product.stockQty <= 0}
            className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-foreground text-base font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {ekleniyor ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : eklendi ? (
              <>
                <Check className="h-5 w-5" aria-hidden />
                Sepete eklendi
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" aria-hidden />
                Sepete ekle — {formatTRY(fiyat)}
              </>
            )}
          </button>

          {product.modelFileUrl && (
            <ProductARButton
              productId={product.id}
              productName={product.name}
              productSlug={product.slug}
              modelFileUrl={product.modelFileUrl}
              defaultParameters={values}
            />
          )}
        </div>

        <p className="mt-5 text-sm text-muted-foreground">
          Sipariş sonrası üretilir · 500 TL üzeri ücretsiz kargo · 14 gün cayma
          hakkı
        </p>
      </div>
    </div>
  );
}
