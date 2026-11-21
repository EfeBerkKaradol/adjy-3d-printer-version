"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Info, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import { ProductStage } from "./ProductStage";
import { ProductOptions, type SecenekParametre } from "./ProductOptions";
import { ProductARButton } from "@/components/ar/ProductARButton";
import { useCartStore } from "@/store/cartStore";
import { calculatePrice } from "@/lib/priceCalculator";
import { formatCmValue } from "@/lib/units";
import { formatTRY } from "@/lib/slicer";
import { WishlistButton } from "./WishlistButton";

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

/** Adet seçicinin üst sınırı */
const EN_COK_ADET = 20;

export function ProductExperience({
  product,
  ust,
  alt,
}: {
  product: ExperienceProduct;
  /** Sağ sütunun başı: kategori, ad, puan, açıklama (sunucuda çizilir) */
  ust?: ReactNode;
  /** Satın alma kutusunun altı: teknik künye ve ayrıntılar */
  alt?: ReactNode;
}) {
  const router = useRouter();
  const [adet, setAdet] = useState(1);
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
      quantity: adet,
      calculatedPrice: fiyat,
    });
    setEklendi(true);
    setEkleniyor(false);
    setTimeout(() => setEklendi(false), 2200);
    router.refresh();
  }

  const stokYok = product.stockQty <= 0;
  const enCok = Math.max(1, Math.min(EN_COK_ADET, product.stockQty));

  // Masaüstünde görsel solda sabit kalır, sağ sütun kayar. Telefonda
  // sıra: ad → görsel → fiyat ve sepet (ad görselden önce okunur).
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] lg:gap-x-14 xl:gap-x-20">
      {ust && <div className="lg:col-start-2 lg:row-start-1">{ust}</div>}

      <div className="lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
        <ProductStage
          name={product.name}
          images={product.images}
          modelFileUrl={product.modelFileUrl}
          productType={product.productType}
          parameters={values}
          defaults={sayisalVarsayilanlar}
        />
      </div>

      <div className="lg:col-start-2">
        {/* Satın alma kutusu */}
        <div className="rounded-2xl border border-foreground/15 bg-muted/30 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[2rem] font-semibold leading-none tracking-tight tabular-nums">
              {formatTRY(fiyat * adet)}
            </p>
            <p className="text-xs text-muted-foreground">
              {adet > 1 ? `${adet} × ${formatTRY(fiyat)} · ` : ""}KDV dahil
            </p>
          </div>
          {olcuDegisti && (
            <p className="mt-2 text-sm text-muted-foreground">
              standart ölçüde {formatTRY(product.basePrice)}
            </p>
          )}
          {secilenOlcu.length >= 2 && (
            <p className="mt-1.5 text-sm tabular-nums text-muted-foreground">
              {secilenOlcu.map((v) => formatCmValue(v)).join(" × ")} cm
            </p>
          )}

          {product.parameters.length > 0 && (
            <div className="mt-6 border-t border-dashed border-foreground/25 pt-6">
              <ProductOptions
                parameters={product.parameters}
                values={values}
                onChange={(ad, deger) => setValues((v) => ({ ...v, [ad]: deger }))}
              />
            </div>
          )}

          {kalipFarki > 0 && (
            <div className="mt-6 flex gap-3 rounded-xl adjy-pixel-frame bg-muted/40 p-4">
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

          <div className="mt-6 flex gap-2 sm:gap-2.5">
            {/* Adet */}
            <div
              className="flex h-14 shrink-0 items-center rounded-xl border border-foreground/20 bg-background"
              role="group"
              aria-label="Adet"
            >
              <button
                type="button"
                onClick={() => setAdet((a) => Math.max(1, a - 1))}
                disabled={adet <= 1}
                className="flex h-full w-9 items-center justify-center rounded-l-xl sm:w-11 transition-colors hover:bg-muted disabled:opacity-35"
                aria-label="Bir azalt"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <span className="w-7 text-center text-base font-medium tabular-nums" aria-live="polite">
                {adet}
              </span>
              <button
                type="button"
                onClick={() => setAdet((a) => Math.min(enCok, a + 1))}
                disabled={adet >= enCok}
                className="flex h-full w-9 items-center justify-center rounded-r-xl sm:w-11 transition-colors hover:bg-muted disabled:opacity-35"
                aria-label="Bir artır"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <button
              type="button"
              onClick={sepeteEkle}
              disabled={ekleniyor || stokYok}
              data-sepete-ekle
              className="inline-flex h-14 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-foreground px-3 text-[15px] sm:px-4 sm:text-base font-medium text-background transition-[opacity,transform] hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              {ekleniyor ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : eklendi ? (
                <>
                  <Check className="h-5 w-5" aria-hidden />
                  Sepete eklendi
                </>
              ) : stokYok ? (
                "Şu an temin edilemiyor"
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" aria-hidden />
                  Sepete ekle
                </>
              )}
            </button>

            <WishlistButton
              productId={product.id}
              variant="duz"
              className="h-14 w-12 shrink-0 rounded-xl border sm:w-14 border-foreground/20 bg-background hover:bg-muted"
            />
          </div>

          {product.modelFileUrl && (
            <div className="mt-3">
              <ProductARButton
                productId={product.id}
                productName={product.name}
                productSlug={product.slug}
                modelFileUrl={product.modelFileUrl}
                defaultParameters={values}
              />
            </div>
          )}
        </div>

        {alt}
      </div>
    </div>
  );
}
