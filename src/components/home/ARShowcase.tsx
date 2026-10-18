import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Ruler, Smartphone } from "lucide-react";
import { ProductARButton } from "@/components/ar/ProductARButton";
import { formatCmValue } from "@/lib/units";

// ==========================================
// ODANDA GÖR
//
// AR, ürün sayfasının içinde bir düğme olarak duruyordu; onu
// açmadan kimse böyle bir şey olduğunu bilmiyordu. Oysa
// "bu raf benim duvarıma sığar mı?" sorusunu cevaplayan tek
// özellik bu.
//
// Bölüm özelliği anlatmıyor, çalıştırıyor: gerçek bir ürün,
// gerçek ölçüsüyle, buradan telefonun kamerasına açılıyor.
// ==========================================

export interface ARProduct {
  id: string;
  name: string;
  slug: string;
  thumbnailUrl: string | null;
  modelFileUrl: string | null;
  widthMm: number | null;
  depthMm: number | null;
  heightMm: number | null;
  category: { name: string };
  defaultParameters: Record<string, number | string>;
}

export function ARShowcase({ product }: { product: ARProduct | null }) {
  if (!product) return null;

  const eksenler = [product.widthMm, product.depthMm, product.heightMm].filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  const olcu =
    eksenler.length >= 2
      ? `${eksenler.map((v) => formatCmValue(v)).join(" × ")} cm`
      : null;

  return (
    <section className="border-t border-border/60">
      <div className="adjy-container grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div className="order-2 lg:order-1">
          <p className="adjy-eyebrow mb-5">Artırılmış gerçeklik</p>
          <h2 className="adjy-display text-[clamp(1.7rem,3.4vw,2.6rem)] leading-[1.1]">
            Almadan önce
            <br />
            kendi odanda gör.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            Ürünü telefonunuzun kamerasıyla masanın üstüne, rafın yanına ya da
            pencerenin önüne koyun. Ekranda gördüğünüz boy, kargodan çıkacak
            boyun aynısıdır — ölçeklenmiş bir önizleme değil.
          </p>

          <dl className="mt-8 grid max-w-md gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="flex gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <dt className="text-sm font-medium">Uygulama yok</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Telefonun tarayıcısında açılır, uygulama kurmanız gerekmez.
                </dd>
              </div>
            </div>
            <div className="flex gap-3">
              <Ruler className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div>
                <dt className="text-sm font-medium">Gerçek ölçekte</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Ölçüyü değiştirdiğinizde odadaki görüntü de onunla büyür.
                </dd>
              </div>
            </div>
          </dl>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ProductARButton
              productId={product.id}
              productName={product.name}
              productSlug={product.slug}
              modelFileUrl={product.modelFileUrl}
              defaultParameters={product.defaultParameters}
            />
            <Link
              href={`/products/${product.slug}`}
              className="group inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
            >
              Bu ürünü inceleyin
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
            {product.thumbnailUrl && (
              <Image
                src={product.thumbnailUrl}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            )}
            <div className="absolute inset-x-4 bottom-4 rounded-xl bg-background/90 p-4 backdrop-blur">
              <p className="adjy-eyebrow">{product.category.name}</p>
              <p className="mt-1.5 text-sm font-medium leading-snug">{product.name}</p>
              {olcu && (
                <p className="mt-1 text-sm tabular-nums text-muted-foreground">{olcu}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
