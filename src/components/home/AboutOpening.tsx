import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

// ==========================================
// HAKKIMIZDA AÇILIŞI
//
// Sayfa, kaydırmaya bağlı uzun bir 3D anlatıyla açılıyordu.
// Etkileyiciydi ama burada yanlış işi yapıyordu: bizi merak
// eden biri kaydırmayı kendi yönetmek ister, sayfanın onu
// sürüklemesini değil.
//
// Türkçe kaynakların hepsinde aynı kural var: ilk paragraf ne
// ürettiğini, kime ürettiğini ve hangi sorunu çözdüğünü
// söylemeli. Burada tek cümlede söylenir, hemen altında da
// soyut bir vaat değil sayılabilir dört şey durur.
// ==========================================

export interface AcilisGorsel {
  name: string;
  slug: string;
  thumbnailUrl: string | null;
}

interface Props {
  gorsel: AcilisGorsel | null;
  urunSayisi: number;
  olcuSayisi: number;
}

export function AboutOpening({ gorsel, urunSayisi, olcuSayisi }: Props) {
  return (
    <section className="adjy-container pb-14 pt-10 lg:pb-20 lg:pt-16">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
        <div>
          <p className="adjy-eyebrow mb-6">Hakkımızda</p>
          <h1 className="adjy-display text-[clamp(2.1rem,4.8vw,3.6rem)] leading-[1.04]">
            Ürünü alana göre üretiyoruz,
            <br />
            <span className="text-muted-foreground">alanı ürüne göre değil.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed">
            ADJY, evler ve çalışma masaları için dekoratif ve işlevsel ürünler
            üretir: vazo, saksı, aydınlatma, masa düzeni ve figürler. Çoğunun
            ölçüsünü siz belirlersiniz — rafınıza iki santim uzun gelen bir
            ürünü almak zorunda kalmayın diye.
          </p>

          <Link
            href="/products"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Ürünleri görün
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>

        {gorsel?.thumbnailUrl && (
          <Link
            href={`/products/${gorsel.slug}`}
            className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-muted"
          >
            <Image
              src={gorsel.thumbnailUrl}
              alt={gorsel.name}
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              priority
            />
          </Link>
        )}
      </div>

      {/* Soyut vaat yerine sayılabilir dört şey */}
      <dl className="mt-14 grid gap-x-10 gap-y-8 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-sm text-muted-foreground">Katalogdaki ürün</dt>
          <dd className="mt-2 text-3xl font-medium tabular-nums">{urunSayisi}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Ölçüsünü siz verirsiniz</dt>
          <dd className="mt-2 text-3xl font-medium tabular-nums">{olcuSayisi}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Malzeme</dt>
          <dd className="mt-2 text-3xl font-medium">3</dd>
          <dd className="mt-1 text-sm text-muted-foreground">
            3D baskı · seramik · alçı
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Üretim</dt>
          <dd className="mt-2 text-3xl font-medium">Beşiktaş</dd>
          <dd className="mt-1 text-sm text-muted-foreground">Kendi atölyemiz</dd>
        </div>
      </dl>
    </section>
  );
}
