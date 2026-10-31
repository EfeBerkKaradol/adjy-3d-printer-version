import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ODALAR, odaBul, odaModelleri } from "@/lib/furniture/catalog";
import { ModelSematik } from "@/components/furniture/ModelSematik";
import { mobilyaFiyati, fiyatiYuvarla } from "@/lib/furniture/pricing";
import { varsayilanYapilandirma } from "@/lib/furniture/catalog";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// ODA SAYFASI
//
// Odayı seçen kişi artık ne aradığını biliyor; burada tek iş
// ürün tipini göstermek. Her kartta varsayılan kurulumun
// fiyatı yazıyor — "fiyatlar ... TL'den başlar" demek yerine
// gerçekten kurulabilir bir yapılandırmanın fiyatı.
// ==========================================

export function generateStaticParams() {
  return ODALAR.map((o) => ({ oda: o.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ oda: string }>;
}): Promise<Metadata> {
  const { oda } = await params;
  const o = odaBul(oda);
  if (!o) return {};
  const modeller = odaModelleri(oda);
  return {
    title: `${o.ad} Mobilyası`,
    description: `${o.ad} için ölçüye özel ${modeller
      .map((m) => m.ad.toLowerCase())
      .join(", ")}. Ölçüyü, sütunu ve gözleri siz belirleyin.`,
    alternates: { canonical: `/mobilya/${oda}` },
  };
}

export default async function OdaPage({
  params,
}: {
  params: Promise<{ oda: string }>;
}) {
  const { oda } = await params;
  const o = odaBul(oda);
  if (!o) notFound();
  const modeller = odaModelleri(oda);

  return (
    <div className="adjy-container py-12 lg:py-16">
      <Link
        href="/mobilya"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Mobilya
      </Link>

      <h1 className="adjy-display mt-5 text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.08]">
        {o.ad}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
        {o.aciklama}. Bir ürün seçin, ölçüsünü kendi odanıza göre kurun.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modeller.map((m) => {
          const fiyat = fiyatiYuvarla(
            mobilyaFiyati(varsayilanYapilandirma(m), {
              iscilikCarpani: m.iscilikCarpani,
            }).toplam
          );
          const v = m.varsayilan;
          return (
            <li key={m.id}>
              <Link
                href={`/mobilya/${oda}/${m.slug}`}
                className="group flex h-full flex-col rounded-2xl border border-border p-5 transition-colors hover:border-foreground/40 hover:bg-muted/40"
              >
                <ModelSematik
                  model={m}
                  className="h-40 w-full text-foreground/70 transition-colors group-hover:text-foreground"
                />
                <h2 className="mt-4 text-[17px] font-medium tracking-tight">
                  {m.ad}
                </h2>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {m.ozet}
                </p>
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-sm font-medium tabular-nums">
                    {formatTRY(fiyat)}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    {v.genislik / 10} × {v.yukseklik / 10} × {v.derinlik / 10} cm,{" "}
                    {v.sutun} sütun × {v.sira} sıra kurulumunda
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
