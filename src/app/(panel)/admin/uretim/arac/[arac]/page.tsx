import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { aracBul } from "@/lib/tasarim/catalog";
import { UretimEkrani } from "@/components/tasarim/UretimEkrani";
import { otomatikIndirmeOku } from "@/lib/tasarim/adresler";

// ==========================================
// ATÖLYE — SERBEST KURULUM
//
// Tasarım aracı siparişe bağlı olmadan, üretici kipinde açılır:
// atölye modeli kendisi ayarlar (müşterinin görmediği tolerans,
// kesit, üretim ölçüleri dâhil) ve STL ile imalat dosyalarını
// indirir. Numune, stok ya da telefonla alınan sipariş için.
//
// Yetki: (panel) yerleşimi rolü veritabanından doğrular; aracın
// üretici kipini sunan /admin/uretim-araci da middleware'in
// arkasında.
// ==========================================

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ arac: string }>;
}): Promise<Metadata> {
  const { arac: id } = await params;
  const arac = aracBul(id);
  return { title: arac ? `${arac.ad} — Atölye` : "Atölye" };
}

export default async function AtolyeAracPage({
  params,
  searchParams,
}: {
  params: Promise<{ arac: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { arac: id } = await params;
  const otomatikIndir = otomatikIndirmeOku(await searchParams);
  const arac = aracBul(id);
  if (!arac) notFound();

  const simdi = new Date();
  const damga = simdi.toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");

  return (
    <UretimEkrani
      serbest
      otomatikIndir={otomatikIndir}
      arac={arac}
      siparis={{
        id: "",
        // Klasöre kaydette klasör adı: "Atölye - SAKSI-20261121-1430"
        no: `${arac.id.toUpperCase()}-${damga}`,
        durum: "ATOLYE",
        odeme: "-",
        not: null,
        tarih: simdi.toISOString(),
        musteri: "Atölye",
        eposta: "-",
        telefon: null,
      }}
      kalem={{
        id: "",
        urunAdi: arac.ad,
        adet: 1,
        birimFiyat: 0,
        secimler: [],
        dosyalar: [],
        durum: null,
        olcum: { kutleG: null, sureSaat: null },
      }}
    />
  );
}
