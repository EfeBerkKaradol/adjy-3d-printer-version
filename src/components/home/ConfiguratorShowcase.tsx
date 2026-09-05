"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ParameterSlider } from "@/components/configure/ParameterSlider";
import { useMediaQuery } from "@/hooks/useClientState";
import { ArrowRight, RotateCcw } from "lucide-react";

// 3D sahne yalnızca bölüm görünüme girdiğinde indirilir:
// ana sayfanın ilk yükü three.js taşımaz.
const ConfigScene = dynamic(() => import("@/components/configure/ConfigScene"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-surface-2" />,
});

// ==========================================
// BÖLÜM — SENİNKİ YAP (ana sayfa konfigüratörü)
//
// Buradaki kaydırıcılar dekoratif değil: gerçek
// Parameter kayıtlarından beslenir ve değeri doğrudan
// 3D modele verirler.
//
//   kaydırıcı / sayı kutusu
//        ↓
//   configuration state  { productId, values }
//        ↓
//   ConfigScene → GLB ölçeği veya prosedürel geometri
//        ↓
//   nesnenin görünümü değişir
//
// Fiyat burada HESAPLANMAZ. Tek fiyat kaynağı
// konfigüratör sayfasıdır; burada uydurma bir tutar
// göstermek yerine seçilen ölçüler oraya taşınır.
// ==========================================

export interface ShowcaseParameter {
  id: string;
  name: string;
  displayName: string;
  type: string;
  minValue: number | null;
  maxValue: number | null;
  defaultValue: string;
  step: number | null;
  unit: string | null;
}

export interface ConfiguratorShowcaseProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  modelFileUrl: string | null;
  productType: string;
  materialType: string | null;
  category: { name: string };
  parameters: ShowcaseParameter[];
}

interface ConfiguratorShowcaseProps {
  products: ConfiguratorShowcaseProduct[];
}

/** Sürüklenebilir parametreler: aralığı gerçek ve varsayılanı sayısal olanlar */
function sliderParams(product: ConfiguratorShowcaseProduct) {
  return product.parameters
    .filter((p) => {
      if (p.type === "COLOR" || p.type === "TEXT" || p.type === "DROPDOWN") return false;
      const def = Number(p.defaultValue);
      return (
        p.minValue !== null &&
        p.maxValue !== null &&
        p.maxValue > p.minValue &&
        Number.isFinite(def)
      );
    })
    .slice(0, 3);
}

/**
 * Ürünün başlangıç konfigürasyonu.
 * Sürüklenebilir olmayan parametreler de (renk gibi) modele
 * geçmeli, yoksa nesne varsayılan rengiyle çizilmez.
 */
function buildDefaults(
  product: ConfiguratorShowcaseProduct
): Record<string, number | string> {
  const values: Record<string, number | string> = {};
  for (const p of product.parameters) {
    if (p.type === "COLOR" || p.type === "TEXT" || p.type === "DROPDOWN") {
      values[p.name] = p.defaultValue;
    } else {
      const n = Number(p.defaultValue);
      if (Number.isFinite(n)) values[p.name] = n;
    }
  }
  return values;
}

export function ConfiguratorShowcase({ products }: ConfiguratorShowcaseProps) {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const sectionRef = useRef<HTMLDivElement>(null);

  const usable = useMemo(
    () => products.filter((p) => sliderParams(p).length > 0).slice(0, 4),
    [products]
  );

  // Tek merkezi konfigürasyon state'i. Ürün değişince değerler
  // olay içinde sıfırlanır — effect'te setState yok, eski ürünün
  // ölçüleri yenisine sızmaz.
  const [config, setConfig] = useState(() => ({
    productId: usable[0]?.id ?? "",
    values: usable[0] ? buildDefaults(usable[0]) : {},
  }));

  // Sahne görünene kadar three.js indirilmez; görünürken render eder
  const [inView, setInView] = useState(false);
  const [everSeen, setEverSeen] = useState(false);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        // Bir kez görüldüyse sahne monte kalır; her scroll'da
        // yeniden yüklenip yanıp sönmesin
        if (entry.isIntersecting) setEverSeen(true);
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const product = usable.find((p) => p.id === config.productId) ?? usable[0];

  // Prosedürel modellerde geometri her değerde yeniden kurulur.
  // Etiket anında güncellenirken sahne bir adım geriden gelsin ki
  // sürükleme akıcı kalsın.
  const deferredValues = useDeferredValue(config.values);

  const sliders = useMemo(() => (product ? sliderParams(product) : []), [product]);

  const customizeHref = useMemo(() => {
    if (!product) return "/configure";
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(config.values)) {
      if (typeof value === "number") qs.set(key, String(value));
    }
    const query = qs.toString();
    return `/configure/${product.id}${query ? `?${query}` : ""}`;
  }, [product, config.values]);

  if (!product) return null;

  function selectProduct(next: ConfiguratorShowcaseProduct) {
    // Ürün değişince konfigürasyon tamamen yenilenir
    setConfig({ productId: next.id, values: buildDefaults(next) });
  }

  function setValue(name: string, value: number) {
    setConfig((prev) => ({ ...prev, values: { ...prev.values, [name]: value } }));
  }

  function resetValues() {
    setConfig({ productId: product.id, values: buildDefaults(product) });
  }

  const isDirty = sliders.some(
    (p) => config.values[p.name] !== Number(p.defaultValue)
  );

  // Seçilen ölçüler tek satırda: 320 × 240 mm
  const dimensionSummary = sliders
    .map((p) => config.values[p.name])
    .filter((v) => typeof v === "number")
    .join(" × ");
  const summaryUnit = sliders[0]?.unit ?? "mm";

  return (
    <div ref={sectionRef} className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Canlı nesne */}
      <div className="relative aspect-square overflow-hidden bg-surface-2 lg:aspect-auto lg:min-h-[520px]">
        {everSeen ? (
          <ConfigScene
            parameters={deferredValues}
            productType={product.productType}
            modelFileUrl={product.modelFileUrl}
            active={inView}
            allowRotate={isDesktop}
          />
        ) : (
          <div className="h-full w-full" aria-hidden />
        )}

        <div className="pointer-events-none absolute left-4 top-4">
          <Badge variant="customizable" className="bg-background/90 backdrop-blur-sm">
            Canlı 3D · kaydırıcıyla değişir
          </Badge>
        </div>

        {dimensionSummary && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2">
            <span className="bg-background/90 px-3 py-1.5 font-mono text-sm tabular-nums backdrop-blur-sm">
              {dimensionSummary} {summaryUnit}
            </span>
          </div>
        )}

        {isDesktop && (
          <span className="pointer-events-none absolute bottom-4 right-4 text-[11px] text-muted-foreground">
            Sürükle: döndür
          </span>
        )}
      </div>

      {/* Kontroller */}
      <div className="flex flex-col justify-center">
        {/* Ürün geçişi */}
        {usable.length > 1 && (
          <div
            role="tablist"
            aria-label="Yapılandırılabilir nesneler"
            className="mb-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-4"
          >
            {usable.map((p, i) => {
              const active = p.id === product.id;
              return (
                <button
                  key={p.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => selectProduct(p)}
                  className={`relative flex items-baseline gap-2 pb-1 text-sm transition-colors ${
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="font-mono text-[11px] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="max-w-[10rem] truncate">{p.name}</span>
                  {active && (
                    <motion.span
                      layoutId={reduceMotion ? undefined : "config-tab"}
                      className="absolute -bottom-[17px] left-0 h-px w-full bg-foreground"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Ürün bilgisi — geçişte yumuşak değişim */}
        {/* key ile anında değişir, sadece giriş animasyonu oynar:
            çıkışı beklemediği için içerik hiçbir koşulda bayat kalmaz */}
        <div>
          <motion.div
            key={product.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="adjy-eyebrow">{product.category.name}</p>
            <h3 className="mt-3 text-2xl font-medium tracking-tight md:text-3xl">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-3 line-clamp-2 text-[15px] leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}
          </motion.div>
        </div>

        {/* Parametreler */}
        <div className="mt-9 flex flex-col gap-8">
          {sliders.map((param) => (
            <ParameterSlider
              key={param.id}
              label={param.displayName}
              value={Number(config.values[param.name] ?? param.defaultValue)}
              min={param.minValue as number}
              max={param.maxValue as number}
              step={param.step && param.step > 0 ? param.step : 1}
              unit={param.unit}
              onChange={(v) => setValue(param.name, v)}
            />
          ))}
        </div>

        {product.materialType && (
          <div className="mt-8 flex items-baseline justify-between border-t border-border pt-5">
            <span className="adjy-eyebrow">Malzeme</span>
            <span className="text-sm font-medium">{product.materialType}</span>
          </div>
        )}

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link href={customizeHref}>
              Bu ölçülerle devam et
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>

          {isDirty && (
            <button
              type="button"
              onClick={resetValues}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Varsayılana dön
            </button>
          )}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Seçtiğin ölçüler konfigüratöre taşınır; fiyat, ağırlık ve baskı süresi
          orada hesaplanır.
        </p>
      </div>
    </div>
  );
}
