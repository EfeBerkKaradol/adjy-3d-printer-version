import Image from "next/image";
import Link from "next/link";
import { PixelLink } from "@/components/ui/pixel-link";

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

          <div className="mt-8">
            <PixelLink href="/products" variant="solid">
              Ürünleri görün
            </PixelLink>
          </div>
        </div>

        {gorsel?.thumbnailUrl && (
          <Link
            href={`/products/${gorsel.slug}`}
            className="adjy-pixel-card group relative block aspect-[4/5] overflow-hidden bg-muted"
          >
            <Image
              src={gorsel.thumbnailUrl}
              alt={gorsel.name}
              fill
              sizes="(max-width: 1024px) 100vw, 42vw"
              className="object-cover"
              priority
            />
          </Link>
        )}
      </div>

      {/* Soyut vaat yerine sayılabilir dört şey */}
      <dl className="mt-14 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <div className="adjy-pixel-card p-4 sm:p-5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Katalogdaki ürün</dt>
          <dd className="mt-3 text-2xl font-semibold sm:text-3xl tabular-nums">{urunSayisi}</dd>
        </div>
        <div className="adjy-pixel-card p-4 sm:p-5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Ölçüsünü siz verirsiniz</dt>
          <dd className="mt-3 text-2xl font-semibold sm:text-3xl tabular-nums">{olcuSayisi}</dd>
        </div>
        <div className="adjy-pixel-card p-4 sm:p-5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Malzeme</dt>
          <dd className="mt-3 text-2xl font-semibold sm:text-3xl">3</dd>
          <dd className="mt-1 text-xs text-muted-foreground sm:text-sm">
            3D baskı · seramik · alçı
          </dd>
        </div>
        <div className="adjy-pixel-card p-4 sm:p-5">
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Üretim</dt>
          <dd className="mt-3 text-2xl font-semibold sm:text-3xl">Beşiktaş</dd>
          <dd className="mt-1 text-xs text-muted-foreground sm:text-sm">Kendi atölyemiz</dd>
        </div>
      </dl>
    </section>
  );
}
