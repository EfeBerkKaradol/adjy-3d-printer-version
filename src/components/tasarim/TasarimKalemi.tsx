"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Paperclip, SquareArrowOutUpRight } from "lucide-react";
import {
  secimlerMetni,
  secimleriTemizle,
  skudanArac,
  tasarimDosyalari,
} from "@/lib/tasarim/order";
import { aracBul } from "@/lib/tasarim/catalog";
import { uretimEkraniAdresi } from "@/lib/tasarim/adresler";
import { TasarimIndirici } from "./TasarimIndirici";

// ==========================================
// SİPARİŞ DETAYINDA TASARIM KALEMİ
//
// Sipariş kaleminin altında, yalnızca tasarım aracıyla kurulan
// ürünlerde görünür. Atölyenin ihtiyaç duyduğu üç şey burada:
//
//   - müşterinin seçtiği her şey, okunur metin olarak;
//   - "İndir": STL ve imalat dosyaları, sayfadan ayrılmadan,
//     müşterinin adı ve sipariş numarasıyla açılan klasöre iner;
//   - "Üretim paneli": isteğe bağlı. Araç müşterinin ayarlarıyla
//     açılır; modeli incelemek ya da tek tek dosya almak için.
// ==========================================

interface Props {
  orderId: string;
  itemId: string;
  sku: string | null;
  customParams: Record<string, unknown> | null;
  /** Kalemin adedi ve birim fiyatı — sipariş bilgisi dosyasına yazılır */
  adet: number;
  birimFiyat: number;
  siparis: {
    no: string;
    musteri: string;
    eposta: string;
    telefon: string | null;
    not: string | null;
    tarih: string;
  };
  /** Siparişte birden çok tasarım ürünü varsa dosyaların gireceği alt klasör */
  altKlasor: string | null;
}

export function TasarimKalemi({
  orderId,
  itemId,
  sku,
  customParams,
  adet,
  birimFiyat,
  siparis,
  altKlasor,
}: Props) {
  const [kopyalandi, setKopyalandi] = useState(false);

  const arac =
    aracBul(
      typeof customParams?.tasarimAraci === "string" ? customParams.tasarimAraci : null
    ) ?? skudanArac(sku);
  if (!arac) return null;

  const secimler = secimleriTemizle(customParams?.secimler);
  const durum =
    customParams && typeof customParams.durum === "object" && customParams.durum !== null
      ? (customParams.durum as Record<string, unknown>)
      : null;
  const dosyalar = tasarimDosyalari(durum);
  const hamOlcum =
    customParams && typeof customParams.olcum === "object" && customParams.olcum !== null
      ? (customParams.olcum as { kutleG?: number; sureSaat?: number })
      : null;
  const olcum = {
    kutleG: Number(hamOlcum?.kutleG) || null,
    sureSaat: Number(hamOlcum?.sureSaat) || null,
  };

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(secimlerMetni(secimler));
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1800);
    } catch {
      /* pano izni yoksa metin ekranda zaten seçilebilir */
    }
  }

  return (
    <div className="mt-3 rounded-lg bg-muted/40 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Müşterinin tasarımı
        </p>
        <div className="flex items-center gap-1">
          {secimler.length > 0 && (
            <button
              type="button"
              onClick={kopyala}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {kopyalandi ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden />
              )}
              {kopyalandi ? "Kopyalandı" : "Metni kopyala"}
            </button>
          )}
          <Link
            href={uretimEkraniAdresi(orderId, itemId)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <SquareArrowOutUpRight className="h-3.5 w-3.5" aria-hidden />
            Üretim paneli
          </Link>
        </div>
      </div>

      {secimler.length === 0 ? (
        <p className="mt-2.5 text-sm text-muted-foreground">
          Müşteri ürünü değiştirmeden ekledi; varsayılan yapılandırma basılacak.
        </p>
      ) : (
        <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          {secimler.map((s) => (
            <div key={s.ad} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{s.ad}</dt>
              <dd className="break-words text-right font-medium tabular-nums">
                {s.deger}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {(dosyalar.length > 0 || olcum.kutleG || olcum.sureSaat) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          {olcum.kutleG ? <span>{olcum.kutleG} g filament</span> : null}
          {olcum.sureSaat ? <span>{olcum.sureSaat} saat baskı</span> : null}
          {dosyalar.map((d) =>
            d.url ? (
              <a
                key={d.url}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline underline-offset-2"
              >
                <Paperclip className="h-3.5 w-3.5" aria-hidden />
                {d.ad}
              </a>
            ) : null
          )}
        </div>
      )}

      <div className="mt-3 border-t-2 border-dashed border-foreground/25 pt-3">
        <TasarimIndirici
          arac={arac}
          siparis={{ id: orderId, ...siparis }}
          kalem={{ id: itemId, adet, birimFiyat, secimler, dosyalar, durum, olcum }}
          altKlasor={altKlasor}
        />
      </div>
    </div>
  );
}
