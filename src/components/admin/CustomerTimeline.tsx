import Link from "next/link";
import { Eye, MessageSquare, Package, PencilLine } from "lucide-react";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// MÜŞTERİ ZAMAN ÇİZELGESİ
//
// Sipariş, ziyaret, mesaj ve not ayrı listelerde duruyordu;
// "ne oldu da bu kişi aradı?" sorusunu cevaplamak için dört
// ayrı yere bakmak gerekiyordu.
//
// Hepsi tek bir akışta, tarihe göre: sipariş verdi, üç gün
// sonra şu sayfaya baktı, sonra yazdı. CRM'in asıl işi bu.
//
// Ziyaretler aynı gün içinde toplanır — on sayfa gezen biri
// akışı doldurmasın, "bugün 10 sayfa gezdi" yeter.
// ==========================================

export type OlayTuru = "order" | "visit" | "message" | "note";

export interface Olay {
  id: string;
  tur: OlayTuru;
  tarih: Date;
  baslik: string;
  ayrinti?: string | null;
  href?: string | null;
  tutar?: number | null;
}

const BICIM: Record<OlayTuru, { icon: typeof Package; label: string; className: string }> = {
  order: { icon: Package, label: "Sipariş", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  message: { icon: MessageSquare, label: "Mesaj", className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  note: { icon: PencilLine, label: "Not", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  visit: { icon: Eye, label: "Ziyaret", className: "bg-muted text-muted-foreground" },
};

export function CustomerTimeline({ olaylar }: { olaylar: Olay[] }) {
  if (olaylar.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Henüz bir hareket yok.
      </p>
    );
  }

  return (
    <ol className="mt-4 space-y-0">
      {olaylar.map((o, i) => {
        const b = BICIM[o.tur];
        const Icon = b.icon;
        const sonuncu = i === olaylar.length - 1;

        const govde = (
          <div className="min-w-0 flex-1 pb-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm font-medium leading-snug">{o.baslik}</p>
              <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {o.tarih.toLocaleString("tr-TR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
            {o.ayrinti && (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {o.ayrinti}
              </p>
            )}
            {o.tutar != null && (
              <p className="mt-1 text-sm tabular-nums">{formatTRY(o.tutar)}</p>
            )}
          </div>
        );

        return (
          <li key={`${o.tur}-${o.id}`} className="relative flex gap-4">
            {/* Dikey çizgi: olayların aynı akışa ait olduğunu gösterir */}
            {!sonuncu && (
              <span
                aria-hidden
                className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-border"
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${b.className}`}
              title={b.label}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="sr-only">{b.label}</span>
            </span>
            {o.href ? (
              <Link href={o.href} className="min-w-0 flex-1 transition-opacity hover:opacity-70">
                {govde}
              </Link>
            ) : (
              govde
            )}
          </li>
        );
      })}
    </ol>
  );
}
