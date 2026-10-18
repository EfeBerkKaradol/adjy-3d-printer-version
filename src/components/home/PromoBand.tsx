import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatCmValue } from "@/lib/units";

// ==========================================
// ARA BANT
//
// İyi mağazalarda ürün ızgaraları art arda dizilmez; araya
// nefes aldıran, bir şey anlatan geniş bir bant girer. Burada
// anlatılan şey bizi ayıran özellik: ölçüyü müşteri seçiyor.
//
// Soyut bir vaat değil, gerçek bir nesnenin gerçek aralığı
// yazıyor — "13,5 cm'den 21,6 cm'e" gibi.
// ==========================================

interface Props {
  product: {
    name: string;
    slug: string;
    thumbnailUrl: string | null;
    minMm: number;
    maxMm: number;
  } | null;
  /** Ölçüsü değiştirilebilen ürün sayısı */
  count: number;
}

export function PromoBand({ product, count }: Props) {
  if (!product) return null;

  return (
    <section className="border-y border-border/60 bg-muted/30">
      <div className="adjy-container grid items-center gap-8 py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div className="order-2 lg:order-1">
          <p className="adjy-eyebrow mb-5">Ölçüsü sana göre</p>
          <h2 className="adjy-display text-[clamp(1.7rem,3.4vw,2.6rem)] leading-[1.1]">
            Rafına göre değil,
            <br />
            rafın ölçüsüne göre.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            {count} nesnenin enini ve boyunu sen belirliyorsun. Kaydırıcıyı
            çektiğinde model de fiyat da anında değişir — ürettirmeden önce ne
            alacağını ve ne ödeyeceğini görürsün.
          </p>

          <div className="mt-6 inline-flex items-baseline gap-3 rounded-full border border-border bg-background px-5 py-2.5">
            <span className="text-sm text-muted-foreground">{product.name}</span>
            <span className="text-sm font-medium tabular-nums">
              {formatCmValue(product.minMm)} – {formatCmValue(product.maxMm)} cm
            </span>
          </div>

          <div className="mt-8">
            <Link
              href="/configure"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Ölçüsünü sen seç
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </div>
        </div>

        <Link
          href={`/configure`}
          className="group order-1 block overflow-hidden rounded-2xl bg-background lg:order-2"
        >
          <div className="relative aspect-[5/4]">
            {product.thumbnailUrl && (
              <Image
                src={product.thumbnailUrl}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-contain p-8 transition-transform duration-700 group-hover:scale-[1.03]"
              />
            )}
          </div>
        </Link>
      </div>
    </section>
  );
}
