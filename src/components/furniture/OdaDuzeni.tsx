import Link from "next/link";
import { ModelGorseli } from "./ModelGorseli";
import { OdaSeridi } from "./OdaSeridi";
import { ODALAR, type MobilyaModeli } from "@/lib/furniture/catalog";
import { varsayilanYapilandirma } from "@/lib/furniture/catalog";
import { fiyatiYuvarla, mobilyaFiyati } from "@/lib/furniture/pricing";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// ODA BAZLI DÜZEN
//
// Solda odalar, sağda o odanın ürünleri. Woodcoder'ın
// kurgusu bu ve işe yarıyor: insan önce nerede oturduğunu
// söylüyor, sonra ne lazım olduğunu seçiyor. Arama çubuğuna
// "140 cm kitaplık" yazmıyor.
//
// Kartlarda fiyat var ve bu fiyat gerçek bir kurulumun
// fiyatı — "fiyatlar ... TL'den başlar" demiyoruz, kartta
// yazan ölçüde gerçekten o kadar.
// ==========================================

export function OdaDuzeni({
  aktifOda,
  modeller,
  baslik,
  aciklama,
}: {
  /** null ise bütün katalog gösterilir */
  aktifOda: string | null;
  modeller: MobilyaModeli[];
  baslik: string;
  aciklama: string;
}) {
  return (
    <div className="adjy-container py-10 lg:py-14">
      <div className="lg:grid lg:grid-cols-[13.5rem_1fr] lg:gap-10">
        {/* ---------- ODALAR ---------- */}
        <nav aria-label="Odalar" className="lg:sticky lg:top-24 lg:self-start">
          <p className="adjy-eyebrow mb-3">Oda</p>
          <OdaSeridi>
            <li className="shrink-0">
              <Link
                href="/mobilya"
                aria-current={aktifOda === null ? "page" : undefined}
                className={`block whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm transition-colors lg:w-full ${
                  aktifOda === null
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Tümü
              </Link>
            </li>
            {ODALAR.map((o) => (
              <li key={o.id} className="shrink-0">
                <Link
                  href={`/mobilya/${o.id}`}
                  aria-current={aktifOda === o.id ? "page" : undefined}
                  className={`block whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm transition-colors lg:w-full ${
                    aktifOda === o.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {o.ad}
                </Link>
              </li>
            ))}
          </OdaSeridi>
        </nav>

        {/* ---------- ÜRÜNLER ---------- */}
        <div className="mt-8 lg:mt-0">
          <h1 className="adjy-display text-[clamp(1.6rem,3.4vw,2.4rem)] leading-[1.1]">
            {baslik}
          </h1>
          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {aciklama}
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {modeller.map((m) => {
              const fiyat = fiyatiYuvarla(
                mobilyaFiyati(varsayilanYapilandirma(m), {
                  iscilikCarpani: m.iscilikCarpani,
                }).toplam
              );
              const v = m.varsayilan;
              const oda = aktifOda ?? m.odalar[0];
              return (
                <li key={m.id}>
                  <Link
                    href={`/mobilya/${oda}/${m.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-border transition-colors hover:border-foreground/40"
                  >
                    {/* Beyaz zemin: ürün kartta tek başına dursun */}
                    <div className="bg-white dark:bg-neutral-100">
                      <ModelGorseli
                        model={m}
                        className="h-32 w-full sm:h-40"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-3.5">
                      <h2 className="text-[15px] font-medium leading-snug tracking-tight">
                        {m.ad}
                      </h2>
                      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                        {m.ozet}
                      </p>
                      <p className="mt-2.5 text-sm font-medium tabular-nums">
                        {formatTRY(fiyat)}
                      </p>
                      <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                        {v.genislik / 10} × {v.yukseklik / 10} × {v.derinlik / 10} cm
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
