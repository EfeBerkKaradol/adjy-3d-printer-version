"use client";

import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";

// ==========================================
// KONUM HARİTASI
//
// Harita Google'dan geliyor; sayfa açılır açılmaz yüklenseydi
// ziyaretçi daha hiçbir şeye tıklamadan üçüncü tarafa veri
// gitmiş olurdu. Bu yüzden önce adres ve bir düğme durur,
// harita ancak istenince yüklenir.
//
// Haritaya ihtiyacı olmayan da kaybetmez: "Google Haritalar'da
// aç" bağlantısı her hâlükârda yol tarifine götürür.
// ==========================================

interface Props {
  /** Tek satır adres */
  address: string;
  /** Google Haritalar'a giden bağlantı */
  href: string | null;
  /** Gömülü harita adresi */
  embedUrl: string | null;
}

export function LocationMap({ address, href, embedUrl }: Props) {
  const [yuklendi, setYuklendi] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="relative aspect-[16/10] bg-muted">
        {yuklendi && embedUrl ? (
          <iframe
            src={embedUrl}
            title={`ADJY konumu: ${address}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            {/* Harita yerine sade bir zemin: yüklenmeden önce de
                sayfada bir boşluk değil, bir yer görünsün. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <MapPin className="relative h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="relative max-w-xs text-sm leading-relaxed text-muted-foreground">
              {address}
            </p>
            {embedUrl && (
              <button
                type="button"
                onClick={() => setYuklendi(true)}
                className="relative rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Haritayı göster
              </button>
            )}
          </div>
        )}
      </div>

      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
        >
          Google Haritalar&apos;da aç
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        </a>
      )}
    </div>
  );
}
