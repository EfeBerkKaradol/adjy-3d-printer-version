import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "ADJY; 3D baskı, seramik ve alçı dekoratif ürünler üretir. Ölçüsünü değiştirebildiğin nesneler, kendi atölyemizden.",
};

// ==========================================
// HAKKIMIZDA
//
// Sayfa yalnızca 3D baskıdan söz ediyordu; ADJY seramik ve
// alçı dekoratif ürünler de üretiyor. Metin bu yüzden
// malzemeye değil, yapılan işe göre yazıldı — teknoloji
// değişse bile doğru kalır.
//
// Tipografi ve hitap sitenin geri kalanıyla aynı: sola
// hizalı editoryal düzen, "sen" dili.
// ==========================================

const REASONS = [
  {
    title: "Ölçüsü sana göre",
    body: "Çoğu nesnenin ölçüsünü kendi alanına göre değiştirip ürettirebilirsin.",
  },
  {
    title: "Almadan önce gör",
    body: "Nesneyi telefonunla kendi odanda, gerçek ölçüsünde görüntüleyebilirsin.",
  },
  {
    title: "Birden fazla malzeme",
    body: "3D baskı (PLA, PETG, ABS), seramik ve alçı — işe uygun olanı seçiyoruz.",
  },
  {
    title: "Kendi atölyemiz",
    body: "Üretim bizde olduğu için tek parçalık siparişi de aynı özenle yapıyoruz.",
  },
];

const STEPS = [
  { n: "01", title: "Seç ya da kur", body: "Hazır bir nesneyi al ya da ölçüsünü kendin belirle." },
  { n: "02", title: "Üretim", body: "Nesneye göre 3D baskı, seramik ya da alçı ile üretiyoruz." },
  { n: "03", title: "Kontrol", body: "Her parça elden geçer, kusurlu olan yola çıkmaz." },
  { n: "04", title: "Teslimat", body: "Kırılabilir parçalar ayrı korumayla paketlenir." },
];

export default function AboutPage() {
  return (
    <div className="adjy-container adjy-section">
      <header className="max-w-2xl">
        <p className="adjy-eyebrow mb-5">Hakkımızda</p>
        <h1 className="adjy-display text-[clamp(1.9rem,4.2vw,3rem)]">
          Tasarımı nesneye çeviriyoruz.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          ADJY; 3D baskı, seramik ve alçı ile dekoratif ve işlevsel nesneler üretir.
          Çoğunu hazır alabilir, bir kısmının ölçüsünü kendi alanına göre
          değiştirip ürettirebilirsin.
        </p>
      </header>

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-xl font-medium tracking-tight">Neden ADJY?</h2>
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {REASONS.map((r) => (
            <div key={r.title} className="bg-background p-6">
              <h3 className="text-[15px] font-medium tracking-tight">{r.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-xl font-medium tracking-tight">Nasıl üretiyoruz?</h2>
        <ol className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="bg-background p-6">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{s.n}</span>
              <h3 className="mt-6 text-[15px] font-medium tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 border-t border-border pt-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h2 className="text-xl font-medium tracking-tight">Aklında bir şey mi var?</h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Kendi modelini ürettirebilir ya da bir fotoğraftan yeni bir nesne
              oluşturabilirsin.
            </p>
          </div>
          <Link
            href="/uret"
            className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
          >
            Üret
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </div>
      </section>
    </div>
  );
}
