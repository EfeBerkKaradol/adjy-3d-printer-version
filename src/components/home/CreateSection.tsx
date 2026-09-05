import Link from "next/link";
import { Reveal } from "./Reveal";
import { Button } from "@/components/ui/button";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE_MB,
  MAX_MODEL_DIMENSION_MM,
} from "@/lib/slicer";
import { ArrowRight, Upload } from "lucide-react";

// ==========================================
// ÜRET — KENDİ MODELİNİ ÜRETTİR
//
// ADJY'nin üçüncü iş hattı; mağaza ve yapılandırma
// ile eşit ağırlıkta kendi bölümü var. Bir önceki
// sürümde "Dijitalden fiziksele"nin altına şerit
// olarak gömülmüştü — ikincil bir eylem gibi
// göründüğü için geri çıkarıldı.
//
// Dosya kısıtları uygulamanın gerçek sabitlerinden
// okunur; hesaplayıcı değişirse burası da değişir.
// ==========================================

export function CreateSection() {
  return (
    <section
      className="border-y border-border bg-surface-2"
      aria-label="Kendi modelini ürettir"
    >
      <div className="adjy-container adjy-section">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20">
          <Reveal>
            <p className="adjy-eyebrow mb-5">Üret</p>
            <h2 className="adjy-display text-[clamp(2rem,4.2vw,3.25rem)]">
              Kendi modelin mi var?
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Katalogla sınırlı değilsin. Kendi 3D modelini yükle, ADJY üretsin.
              Dosyan otomatik analiz edilir; malzeme, baskı kalitesi ve adedi
              seçtiğin anda fiyatını görürsün.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/3d-baski-fiyati-hesapla">
                  <Upload className="h-4 w-4" aria-hidden />
                  Üretim teklifi al
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/faq">
                  Nasıl çalışır
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </Reveal>

          {/* Dosya kabul koşulları — teklif almadan önce bilinmesi gerekenler */}
          <Reveal index={1} className="flex flex-col justify-center">
            <dl className="divide-y divide-border border-y border-border">
              <div className="flex items-baseline justify-between gap-6 py-5">
                <dt className="text-sm text-muted-foreground">Desteklenen format</dt>
                <dd className="font-mono text-sm">{ACCEPTED_EXTENSIONS.join(", ")}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 py-5">
                <dt className="text-sm text-muted-foreground">En büyük dosya</dt>
                <dd className="font-mono text-sm tabular-nums">{MAX_FILE_SIZE_MB} MB</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 py-5">
                <dt className="text-sm text-muted-foreground">Maksimum kenar</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {MAX_MODEL_DIMENSION_MM} mm
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Dosyan bu sınırların dışındaysa e-posta ile teklif alabilirsin —
              yükleme ekranında bağlantısı var.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
